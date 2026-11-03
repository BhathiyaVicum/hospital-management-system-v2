import { query, withTransaction } from '../config/database.js';
import { getAvailabilitySlots } from './doctorsRepository.js';
import { createAppointment as bookAppointment } from './appointmentsRepository.js';

export async function listAssignedClinics(userId) {
  const result = await query(
    `SELECT clinic.id, clinic.name, clinic.city, clinic.address, clinic.phone
     FROM receptionist_clinics assignment
     JOIN clinics clinic ON clinic.id = assignment.clinic_id
     WHERE assignment.receptionist_user_id = $1 AND clinic.is_active = TRUE
     ORDER BY clinic.name`,
    [userId],
  );
  return result.rows;
}

export async function getProfile(userId) {
  const result = await query(
    `SELECT name, email, profile_phone AS phone FROM users
     WHERE id = $1 AND role = 'receptionist'`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function updateProfile(userId, { name, phone }) {
  const result = await query(
    `UPDATE users SET name = $2, profile_phone = $3
     WHERE id = $1 AND role = 'receptionist'
     RETURNING name, email, profile_phone AS phone`,
    [userId, name, phone || null],
  );
  return result.rows[0] || null;
}

export async function getDashboard(clinicIds) {
  const result = await query(
    `SELECT
       count(*) FILTER (WHERE (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date
         = (now() AT TIME ZONE doctor.time_zone)::date
         AND appointment.status = 'confirmed')::int AS "todayAppointments",
       count(*) FILTER (WHERE appointment.status = 'confirmed'
         AND appointment.scheduled_start > now())::int AS "upcomingAppointments",
       count(*) FILTER (WHERE appointment.workflow_status IN ('arrived', 'checked_in', 'waiting'))::int
         AS "arrivalsToProcess",
       count(*) FILTER (WHERE appointment.is_walk_in = TRUE
         AND appointment.created_at >= now() - interval '7 days')::int AS "recentWalkIns"
     FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id
     WHERE doctor.clinic_id = ANY($1::uuid[])`,
    [clinicIds],
  );
  return result.rows[0];
}

export async function searchPatients(clinicIds, search, { limit, offset }) {
  const terms = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  const values = [clinicIds, terms];
  const base = `FROM patients patient
     JOIN users patient_user ON patient_user.id = patient.user_id
     JOIN patient_clinics patient_clinic ON patient_clinic.patient_id = patient.id
     WHERE patient_clinic.clinic_id = ANY($1::uuid[])
       AND patient_user.is_active = TRUE
       AND (patient_user.name ILIKE $2 OR patient_user.email ILIKE $2 OR COALESCE(patient.phone, '') ILIKE $2)`;
  const count = await query(`SELECT count(DISTINCT patient.id)::int AS total ${base}`, values);
  const result = await query(
    `SELECT DISTINCT patient.id, patient_user.name, patient_user.email,
       patient.phone, patient.updated_at AS "updatedAt"
     ${base}
     ORDER BY patient_user.name
     LIMIT $3 OFFSET $4`,
    [...values, limit, offset],
  );
  return { patients: result.rows, total: count.rows[0].total };
}

export async function linkPatientByEmail(email, clinicId, actorUserId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT patient.id, patient_user.id AS "userId", patient_user.name,
              patient_user.email, patient.phone
       FROM users patient_user
       JOIN patients patient ON patient.user_id = patient_user.id
       WHERE patient_user.email = $1 AND patient_user.role = 'patient'
         AND patient_user.is_active = TRUE
       FOR UPDATE OF patient_user`,
      [email],
    );
    if (!result.rowCount) return null;
    await client.query(
      `INSERT INTO patient_clinics (patient_id, clinic_id, created_by_user_id)
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [result.rows[0].id, clinicId, actorUserId],
    );
    return result.rows[0];
  });
}

export async function registerPatient({ name, email, passwordHash, phone, verificationTokenHash, verificationExpiresAt, clinicId, actorUserId }) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'patient')
       RETURNING id, name, email, role`,
      [name, email, passwordHash],
    );
    const patient = await client.query(
      'INSERT INTO patients (user_id, phone) VALUES ($1, $2) RETURNING id',
      [user.rows[0].id, phone || null],
    );
    await client.query(
      `INSERT INTO patient_clinics (patient_id, clinic_id, created_by_user_id)
       VALUES ($1, $2, $3)`,
      [patient.rows[0].id, clinicId, actorUserId],
    );
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.rows[0].id, verificationTokenHash, verificationExpiresAt],
    );
    return { ...user.rows[0], patient_id: patient.rows[0].id };
  });
}

export async function removeUnverifiedPatient(userId) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM patients WHERE user_id = $1', [userId]);
    await client.query(
      `DELETE FROM users
       WHERE id = $1 AND role = 'patient' AND email_verified_at IS NULL`,
      [userId],
    );
  });
}

export async function updatePatientContact(patientId, clinicIds, { name, phone }) {
  return withTransaction(async (client) => {
    const patient = await client.query(
      `SELECT patient.id, patient.user_id
       FROM patients patient
       WHERE patient.id = $1 AND EXISTS (
         SELECT 1 FROM patient_clinics link
         WHERE link.patient_id = patient.id AND link.clinic_id = ANY($2::uuid[])
       ) AND EXISTS (SELECT 1 FROM users active_user WHERE active_user.id = patient.user_id AND active_user.is_active = TRUE)
       FOR UPDATE`,
      [patientId, clinicIds],
    );
    if (!patient.rowCount) return null;
    await client.query('UPDATE users SET name = $1 WHERE id = $2', [name, patient.rows[0].user_id]);
    const updated = await client.query(
      `UPDATE patients SET phone = $1
       WHERE id = $2 RETURNING id, phone, updated_at AS "updatedAt"`,
      [phone || null, patientId],
    );
    return { ...updated.rows[0], name };
  });
}

export async function listAppointments(clinicIds, { from, to, status, clinicId, limit, offset }) {
  const filters = ['doctor.clinic_id = ANY($1::uuid[])'];
  const values = [clinicIds];
  if (clinicId) {
    values.push(clinicId);
    filters.push(`doctor.clinic_id = $${values.length}`);
  }
  if (from) {
    values.push(from);
    filters.push(`(appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date >= $${values.length}::date`);
  }
  if (to) {
    values.push(to);
    filters.push(`(appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date <= $${values.length}::date`);
  }
  if (status) {
    values.push(status);
    filters.push(`appointment.workflow_status = $${values.length}`);
  }
  const where = filters.join(' AND ');
  const base = `FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id
     JOIN users doctor_user ON doctor_user.id = doctor.user_id
     JOIN patients patient ON patient.id = appointment.patient_id
     JOIN users patient_user ON patient_user.id = patient.user_id
     JOIN clinics clinic ON clinic.id = doctor.clinic_id
     WHERE ${where}`;
  const count = await query(`SELECT count(*)::int AS total ${base}`, values);
  const pageValues = [...values, limit, offset];
  const result = await query(
    `SELECT appointment.id, appointment.scheduled_start AS "scheduledStart",
       appointment.scheduled_end AS "scheduledEnd", appointment.status,
       appointment.workflow_status AS "workflowStatus", appointment.reason,
       appointment.is_walk_in AS "isWalkIn",
       doctor.id AS "doctorId", doctor_user.name AS "doctorName", doctor.time_zone AS "timeZone",
       patient.id AS "patientId", patient_user.name AS "patientName", patient_user.email AS "patientEmail",
       patient.phone AS "patientPhone",
       clinic.id AS "clinicId", clinic.name AS "clinicName"
     ${base}
     ORDER BY appointment.scheduled_start DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return { appointments: result.rows, total: count.rows[0].total };
}

export async function getAppointment(clinicIds, appointmentId) {
  const result = await query(
    `SELECT appointment.id, appointment.scheduled_start AS "scheduledStart",
       appointment.scheduled_end AS "scheduledEnd", appointment.status,
       appointment.workflow_status AS "workflowStatus", appointment.reason,
       appointment.is_walk_in AS "isWalkIn", appointment.walk_in_reason AS "walkInReason",
       doctor.id AS "doctorId", doctor_user.name AS "doctorName", doctor.time_zone AS "timeZone",
       patient.id AS "patientId", patient_user.name AS "patientName", patient_user.email AS "patientEmail",
       patient.phone AS "patientPhone",
       clinic.id AS "clinicId", clinic.name AS "clinicName",
       (SELECT COALESCE(json_agg(jsonb_build_object(
         'eventType', history.event_type, 'scheduledStart', history.scheduled_start,
         'scheduledEnd', history.scheduled_end, 'status', history.status,
         'workflowStatus', history.workflow_status, 'changedAt', history.changed_at,
         'actorName', actor.name
       ) ORDER BY history.changed_at DESC), '[]'::json)
        FROM appointment_history history LEFT JOIN users actor ON actor.id = history.actor_user_id
        WHERE history.appointment_id = appointment.id) AS history,
       (SELECT COALESCE(json_agg(jsonb_build_object(
         'previousStatus', workflow_history.previous_status, 'newStatus', workflow_history.new_status,
         'changedAt', workflow_history.changed_at, 'actorName', workflow_actor.name
       ) ORDER BY workflow_history.changed_at DESC), '[]'::json)
        FROM appointment_workflow_history workflow_history
        LEFT JOIN users workflow_actor ON workflow_actor.id = workflow_history.actor_user_id
        WHERE workflow_history.appointment_id = appointment.id) AS "workflowHistory"
     FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id
     JOIN users doctor_user ON doctor_user.id = doctor.user_id
     JOIN patients patient ON patient.id = appointment.patient_id
     JOIN users patient_user ON patient_user.id = patient.user_id
     JOIN clinics clinic ON clinic.id = doctor.clinic_id
     WHERE doctor.clinic_id = ANY($1::uuid[]) AND appointment.id = $2`,
    [clinicIds, appointmentId],
  );
  return result.rows[0] || null;
}

export async function listDoctors(clinicIds, clinicId) {
  const result = await query(
    `SELECT doctor.id, account.name, doctor.professional_title AS title,
       doctor.consultation_fee AS "consultationFee", doctor.currency, doctor.time_zone AS "timeZone"
     FROM doctors doctor
     JOIN users account ON account.id = doctor.user_id
     JOIN clinics clinic ON clinic.id = doctor.clinic_id AND clinic.is_active = TRUE
     WHERE doctor.clinic_id = ANY($1::uuid[]) AND doctor.clinic_id = $2
       AND doctor.approval_status = 'approved' AND doctor.is_accepting_appointments = TRUE
       AND account.is_active = TRUE
     ORDER BY account.name`,
    [clinicIds, clinicId],
  );
  return result.rows;
}

export async function getDoctorSlots(clinicIds, clinicId, doctorId) {
  const doctor = await query(
    `SELECT 1 FROM doctors doctor
     JOIN clinics clinic ON clinic.id = doctor.clinic_id AND clinic.is_active = TRUE
     WHERE doctor.id = $1 AND doctor.clinic_id = $2
       AND doctor.clinic_id = ANY($3::uuid[]) AND doctor.approval_status = 'approved'
       AND doctor.is_accepting_appointments = TRUE`,
    [doctorId, clinicId, clinicIds],
  );
  if (!doctor.rowCount) return null;
  return getAvailabilitySlots(doctorId);
}

export async function updateWorkflow(clinicIds, appointmentId, nextStatus, actorUserId) {
  const transitions = {
    scheduled: new Set(['arrived', 'no_show']),
    arrived: new Set(['checked_in', 'no_show']),
    checked_in: new Set(['waiting', 'no_show']),
    waiting: new Set(['no_show']),
  };
  return withTransaction(async (client) => {
    const current = await client.query(
      `SELECT appointment.id, appointment.workflow_status AS "workflowStatus"
       FROM appointments appointment
       JOIN doctors doctor ON doctor.id = appointment.doctor_id
       WHERE appointment.id = $1 AND appointment.status = 'confirmed'
         AND doctor.clinic_id = ANY($2::uuid[])
       FOR UPDATE OF appointment`,
      [appointmentId, clinicIds],
    );
    if (!current.rowCount) return { notFound: true };
    const previousStatus = current.rows[0].workflowStatus;
    if (!transitions[previousStatus]?.has(nextStatus)) {
      return { invalidTransition: true, currentStatus: previousStatus };
    }
    const updated = await client.query(
      `UPDATE appointments
       SET workflow_status = $1, workflow_updated_at = now(),
           workflow_updated_by_user_id = $2, updated_by_user_id = $2
       WHERE id = $3
       RETURNING id, status, workflow_status AS "workflowStatus"`,
      [nextStatus, actorUserId, appointmentId],
    );
    await client.query(
      `INSERT INTO appointment_workflow_history
        (appointment_id, previous_status, new_status, actor_user_id)
       VALUES ($1, $2, $3, $4)`,
      [appointmentId, previousStatus, nextStatus, actorUserId],
    );
    return { appointment: updated.rows[0] };
  });
}

export async function createAppointment({ patientId, doctorId, clinicId, scheduledStart, reason, createdByUserId, isWalkIn, walkInReason, clinicIds }) {
  return bookAppointment({
    patientId, doctorId, clinicId, scheduledStart, reason, createdByUserId,
    isWalkIn, walkInReason, allowedClinicIds: clinicIds,
  });
}
