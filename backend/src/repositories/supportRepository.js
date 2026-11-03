import { query, withTransaction } from '../config/database.js';

const ticketSelect = `
  SELECT t.id, t.ticket_number AS "ticketNumber", t.patient_id AS "patientId",
         t.assigned_staff_id AS "assignedStaffId", t.appointment_id AS "appointmentId",
         t.category, t.priority, t.subject, t.status, t.resolved_at AS "resolvedAt",
         t.closed_at AS "closedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
         patient_user.name AS "patientName", assigned_user.name AS "assignedStaffName",
         appointment.scheduled_start AS "appointmentStart",
         doctor_user.name AS "appointmentDoctorName",
         count(*) OVER()::int AS "totalCount"
  FROM support_tickets t
  JOIN patients patient ON patient.id = t.patient_id
  JOIN users patient_user ON patient_user.id = patient.user_id
  LEFT JOIN users assigned_user ON assigned_user.id = t.assigned_staff_id
  LEFT JOIN appointments appointment ON appointment.id = t.appointment_id
  LEFT JOIN doctors doctor ON doctor.id = appointment.doctor_id
  LEFT JOIN users doctor_user ON doctor_user.id = doctor.user_id
`;

function buildTicketFilters({ patientId, status, category, search, staffView }, values) {
  const filters = [];
  if (patientId) {
    values.push(patientId);
    filters.push(`t.patient_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`t.status = $${values.length}`);
  }
  if (category) {
    values.push(category);
    filters.push(`t.category = $${values.length}`);
  }
  if (search) {
    values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    filters.push(`(t.ticket_number ILIKE $${values.length} OR t.subject ILIKE $${values.length} OR patient_user.name ILIKE $${values.length})`);
  }
  if (staffView) filters.push(`(t.assigned_staff_id IS NULL OR t.assigned_staff_id = $${values.push(staffView)})`);
  return filters.length ? `WHERE ${filters.join(' AND ')}` : '';
}

function ticketMessageQuery(whereClause) {
  return `
    SELECT t.id, t.ticket_number AS "ticketNumber", t.patient_id AS "patientId",
           t.assigned_staff_id AS "assignedStaffId", t.appointment_id AS "appointmentId",
           t.category, t.priority, t.subject, t.status, t.resolved_at AS "resolvedAt",
           t.closed_at AS "closedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
           patient_user.name AS "patientName", assigned_user.name AS "assignedStaffName",
           appointment.scheduled_start AS "appointmentStart",
           doctor_user.name AS "appointmentDoctorName"
    FROM support_tickets t
    JOIN patients patient ON patient.id = t.patient_id
    JOIN users patient_user ON patient_user.id = patient.user_id
    LEFT JOIN users assigned_user ON assigned_user.id = t.assigned_staff_id
    LEFT JOIN appointments appointment ON appointment.id = t.appointment_id
    LEFT JOIN doctors doctor ON doctor.id = appointment.doctor_id
    LEFT JOIN users doctor_user ON doctor_user.id = doctor.user_id
    ${whereClause}
  `;
}

async function getMessages(client, ticketId) {
  const result = await client.query(
    `SELECT message.id, message.message, message.created_at AS "createdAt",
            sender.id AS "senderId", sender.name AS "senderName", sender.role AS "senderRole"
     FROM support_ticket_messages message
     JOIN users sender ON sender.id = message.sender_user_id
     WHERE message.ticket_id = $1
     ORDER BY message.created_at, message.id`,
    [ticketId],
  );
  return result.rows;
}

async function ticketWithMessages(client, ticket, includePatientEmail = false) {
  if (!ticket) return null;
  const messages = await getMessages(client, ticket.id);
  if (includePatientEmail) {
    const email = await client.query(
      `SELECT u.email AS "patientEmail"
       FROM patients p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [ticket.patientId],
    );
    return { ...ticket, ...email.rows[0], messages };
  }
  return { ...ticket, messages };
}

export async function createPatientTicket({ patientId, userId, category, priority, subject, message, appointmentId }) {
  return withTransaction(async (client) => {
    if (appointmentId) {
      const appointment = await client.query(
        'SELECT id FROM appointments WHERE id = $1 AND patient_id = $2',
        [appointmentId, patientId],
      );
      if (!appointment.rowCount) return { invalidAppointment: true };
    }

    const reference = await client.query(
      `SELECT 'MC-' || to_char(current_date, 'YYYY') || '-' ||
              lpad(nextval('support_ticket_number_seq')::text, 6, '0') AS number`,
    );
    const created = await client.query(
      `INSERT INTO support_tickets
         (ticket_number, patient_id, appointment_id, category, priority, subject)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, ticket_number AS "ticketNumber", patient_id AS "patientId",
                 category, priority, subject, status, created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [reference.rows[0].number, patientId, appointmentId || null, category, priority, subject],
    );
    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_user_id, message)
       VALUES ($1, $2, $3)`,
      [created.rows[0].id, userId, message],
    );
    return { ticket: await ticketWithMessages(client, created.rows[0]) };
  });
}

export async function listTickets(filters, staffView = null) {
  const values = [];
  const whereClause = buildTicketFilters({ ...filters, staffView }, values);
  const count = await query(
    `SELECT count(*)::int AS total
     FROM support_tickets t
     JOIN patients patient ON patient.id = t.patient_id
     JOIN users patient_user ON patient_user.id = patient.user_id
     ${whereClause}`,
    values,
  );
  const pageValues = [...values, filters.limit, filters.offset];
  const result = await query(
    `${ticketSelect}
     ${whereClause}
     ORDER BY t.updated_at DESC, t.id
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  const tickets = await Promise.all(result.rows.map(async (ticket) => {
    const latest = await query(
      `SELECT message, created_at AS "createdAt"
       FROM support_ticket_messages
       WHERE ticket_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
      [ticket.id],
    );
    return { ...ticket, latestMessage: latest.rows[0] || null };
  }));
  return { tickets, total: count.rows[0].total };
}

export async function getPatientTicket(patientId, ticketId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      ticketMessageQuery('WHERE t.id = $1 AND t.patient_id = $2'),
      [ticketId, patientId],
    );
    return ticketWithMessages(client, result.rows[0]);
  });
}

export async function getStaffTicket(ticketId) {
  return withTransaction(async (client) => {
    const result = await client.query(ticketMessageQuery('WHERE t.id = $1'), [ticketId]);
    return ticketWithMessages(client, result.rows[0], true);
  });
}

export async function addTicketMessage({ ticketId, userId, role, patientId, message }) {
  return withTransaction(async (client) => {
    const ticketResult = await client.query(
      `SELECT id, patient_id AS "patientId", status
       FROM support_tickets WHERE id = $1 FOR UPDATE`,
      [ticketId],
    );
    const ticket = ticketResult.rows[0];
    if (!ticket || (role === 'patient' && ticket.patientId !== patientId)) return null;
    if (ticket.status === 'closed') return { closed: true };
    if (role === 'patient' && !['open', 'in_progress', 'waiting_for_patient', 'resolved'].includes(ticket.status)) {
      return { closed: true };
    }
    if (role === 'staff' && ticket.status === 'resolved') return { closed: true };

    await client.query(
      `INSERT INTO support_ticket_messages (ticket_id, sender_user_id, message)
       VALUES ($1, $2, $3)`,
      [ticketId, userId, message],
    );
    if (role === 'patient' && ['waiting_for_patient', 'resolved'].includes(ticket.status)) {
      await client.query(
        `UPDATE support_tickets SET status = 'in_progress', resolved_at = NULL
         WHERE id = $1`,
        [ticketId],
      );
    } else if (role === 'staff') {
      await client.query(
        `UPDATE support_tickets SET status = 'waiting_for_patient'
         WHERE id = $1`,
        [ticketId],
      );
    } else {
      await client.query('UPDATE support_tickets SET updated_at = now() WHERE id = $1', [ticketId]);
    }

    const updated = await client.query(ticketMessageQuery('WHERE t.id = $1'), [ticketId]);
    return { ticket: await ticketWithMessages(client, updated.rows[0], role === 'staff') };
  });
}

export async function updateTicketStatus(ticketId, status) {
  return withTransaction(async (client) => {
    const currentResult = await client.query(
      'SELECT status FROM support_tickets WHERE id = $1 FOR UPDATE',
      [ticketId],
    );
    if (!currentResult.rowCount) return null;
    const currentStatus = currentResult.rows[0].status;
    const transitions = {
      open: ['in_progress', 'waiting_for_patient', 'resolved', 'closed'],
      in_progress: ['open', 'waiting_for_patient', 'resolved', 'closed'],
      waiting_for_patient: ['in_progress', 'resolved', 'closed'],
      resolved: ['in_progress', 'closed'],
      closed: [],
    };
    if (currentStatus !== status && !transitions[currentStatus].includes(status)) {
      return { invalidTransition: true, currentStatus };
    }
    const updated = await client.query(
      `UPDATE support_tickets
       SET status = $2,
           resolved_at = CASE WHEN $2 = 'resolved' THEN COALESCE(resolved_at, now()) ELSE NULL END,
           closed_at = CASE WHEN $2 = 'closed' THEN COALESCE(closed_at, now()) ELSE NULL END
       WHERE id = $1
       RETURNING id`,
      [ticketId, status],
    );
    const ticket = await client.query(ticketMessageQuery('WHERE t.id = $1'), [updated.rows[0].id]);
    return { ticket: await ticketWithMessages(client, ticket.rows[0], true) };
  });
}

export async function updateTicketAssignment(ticketId, assignedStaffId) {
  return withTransaction(async (client) => {
    if (assignedStaffId) {
      const staff = await client.query(
        `SELECT id FROM users WHERE id = $1 AND role = 'staff' AND is_active = TRUE`,
        [assignedStaffId],
      );
      if (!staff.rowCount) return { invalidStaff: true };
    }
    const updated = await client.query(
      `UPDATE support_tickets SET assigned_staff_id = $2 WHERE id = $1 RETURNING id`,
      [ticketId, assignedStaffId],
    );
    if (!updated.rowCount) return null;
    const ticket = await client.query(ticketMessageQuery('WHERE t.id = $1'), [ticketId]);
    return { ticket: await ticketWithMessages(client, ticket.rows[0], true) };
  });
}

export async function getStaffDashboard() {
  const [counts, recent] = await Promise.all([
    query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'open')::int AS open,
              count(*) FILTER (WHERE status = 'in_progress')::int AS "inProgress",
              count(*) FILTER (WHERE status = 'waiting_for_patient')::int AS "waitingForPatient",
              count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
              count(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM support_tickets`,
    ),
    listTickets({ limit: 6, offset: 0 }),
  ]);
  return { stats: counts.rows[0], recent: recent.tickets };
}

export async function listAvailableStaff() {
  const result = await query(
    `SELECT id, name FROM users WHERE role = 'staff' AND is_active = TRUE ORDER BY name`,
  );
  return result.rows;
}
