import { query, withTransaction } from '../config/database.js';

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function addFilter(filters, values, sql, value) {
  values.push(value);
  filters.push(sql.replaceAll('?', `$${values.length}`));
}

function pageValues(filters, values, limit, offset) {
  return {
    where: filters.length ? `WHERE ${filters.join(' AND ')}` : '',
    values: [...values, limit, offset],
  };
}

export async function getDashboard() {
  const [counts, appointmentsByStatus, appointmentTrend, patientTrend, specialties, supportStatuses] = await Promise.all([
    query(
      `SELECT
         (SELECT count(*)::int FROM patients) AS patients,
         (SELECT count(*)::int FROM doctors) AS doctors,
         (SELECT count(*)::int FROM clinics) AS clinics,
         (SELECT count(*)::int FROM healthcare_services) AS services,
         (SELECT count(*)::int FROM users WHERE role = 'staff') AS staff,
         (SELECT count(*)::int FROM users WHERE role = 'receptionist') AS receptionists,
         (SELECT count(*)::int FROM appointments) AS appointments,
         (SELECT count(*)::int FROM appointments WHERE scheduled_start >= date_trunc('day', now())
           AND scheduled_start < date_trunc('day', now()) + interval '1 day') AS today_appointments,
         (SELECT count(*)::int FROM appointments WHERE status = 'confirmed' AND scheduled_start >= now()) AS upcoming_appointments,
         (SELECT count(*)::int FROM appointments WHERE status = 'cancelled') AS cancelled_appointments,
         (SELECT count(*)::int FROM support_tickets) AS support_tickets,
         (SELECT count(*)::int FROM support_tickets WHERE status IN ('open', 'in_progress', 'waiting_for_patient')) AS open_support_tickets`,
    ),
    query(
      `SELECT status, count(*)::int AS count
       FROM appointments GROUP BY status ORDER BY status`,
    ),
    query(
      `SELECT to_char(days.day, 'YYYY-MM-DD') AS date, count(appointments.id)::int AS count
       FROM generate_series(current_date - 29, current_date, interval '1 day') days(day)
       LEFT JOIN appointments ON appointments.scheduled_start >= days.day
         AND appointments.scheduled_start < days.day + interval '1 day'
       GROUP BY days.day ORDER BY days.day`,
    ),
    query(
      `SELECT to_char(days.day, 'YYYY-MM-DD') AS date, count(users.id)::int AS count
       FROM generate_series(current_date - 29, current_date, interval '1 day') days(day)
       LEFT JOIN users ON users.created_at >= days.day AND users.created_at < days.day + interval '1 day'
         AND users.role = 'patient'
       GROUP BY days.day ORDER BY days.day`,
    ),
    query(
      `SELECT specialty.name, count(DISTINCT doctor.id)::int AS count
       FROM specialties specialty
       LEFT JOIN doctors doctor ON doctor.primary_specialty_id = specialty.id
       GROUP BY specialty.id ORDER BY count DESC, specialty.name LIMIT 8`,
    ),
    query(
      `SELECT status, count(*)::int AS count FROM support_tickets
       GROUP BY status ORDER BY status`,
    ),
  ]);
  return {
    stats: counts.rows[0],
    appointmentStatuses: appointmentsByStatus.rows,
    appointmentTrend: appointmentTrend.rows,
    patientTrend: patientTrend.rows,
    doctorsBySpecialty: specialties.rows,
    supportStatuses: supportStatuses.rows,
  };
}

export async function listPatients({ search = '', status = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, `(u.name ILIKE ? OR u.email ILIKE ? OR p.phone ILIKE ?)`, `%${escapeLike(search)}%`);
  if (status === 'active' || status === 'inactive') {
    addFilter(filters, values, `u.is_active = ?`, status === 'active');
  }
  const { where, values: paged } = pageValues(filters, values, limit, offset);
  const [rows, count] = await Promise.all([
    query(
      `SELECT u.id, p.id AS "patientId", u.name, u.email, p.phone, u.is_active AS "isActive",
              u.created_at AS "createdAt", u.updated_at AS "updatedAt"
       FROM users u JOIN patients p ON p.user_id = u.id ${where}
       ORDER BY u.created_at DESC LIMIT $${paged.length - 1} OFFSET $${paged.length}`,
      paged,
    ),
    query(`SELECT count(*)::int AS total FROM users u JOIN patients p ON p.user_id = u.id ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function getPatient(patientId) {
  const [profile, appointments, tickets] = await Promise.all([
    query(
      `SELECT u.id, p.id AS "patientId", u.name, u.email, u.is_active AS "isActive",
              u.created_at AS "createdAt", u.updated_at AS "updatedAt",
              p.phone, p.date_of_birth AS "dateOfBirth", p.gender, p.blood_type AS "bloodType",
              p.home_address AS "homeAddress", p.emergency_contact_name AS "emergencyContactName",
              p.emergency_contact_phone AS "emergencyContactPhone"
       FROM patients p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [patientId],
    ),
    query(
      `SELECT a.id, a.scheduled_start AS "scheduledStart", a.status,
              doctor_user.name AS "doctorName", clinic.name AS "clinicName"
       FROM appointments a JOIN doctors d ON d.id = a.doctor_id
       JOIN users doctor_user ON doctor_user.id = d.user_id
       LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
       WHERE a.patient_id = $1 ORDER BY a.scheduled_start DESC LIMIT 50`,
      [patientId],
    ),
    query(
      `SELECT id, ticket_number AS "ticketNumber", category, subject, status, created_at AS "createdAt"
       FROM support_tickets WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [patientId],
    ),
  ]);
  return profile.rows[0] ? { ...profile.rows[0], appointments: appointments.rows, tickets: tickets.rows } : null;
}

export async function updatePatient(patientId, { name, email, phone, homeAddress, isActive }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users u SET name = $2, email = $3, is_active = $4
       FROM patients p WHERE p.id = $1 AND p.user_id = u.id
       RETURNING u.id, p.id AS "patientId", u.name, u.email, p.phone,
                 u.is_active AS "isActive", u.created_at AS "createdAt", u.updated_at AS "updatedAt"`,
      [patientId, name, email, isActive],
    );
    if (!result.rowCount) return null;
    await client.query('UPDATE patients SET phone = $2, home_address = $3 WHERE id = $1', [patientId, phone || null, homeAddress || null]);
    if (!isActive) await client.query('UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [result.rows[0].id]);
    return result.rows[0];
  });
}

export async function getLookups() {
  const [clinics, specialties, doctors] = await Promise.all([
    query(`SELECT id, name FROM clinics WHERE is_active = TRUE ORDER BY name`),
    query(`SELECT id, name FROM specialties ORDER BY name`),
    query(`SELECT d.id, u.name FROM doctors d JOIN users u ON u.id=d.user_id
           WHERE u.is_active=TRUE ORDER BY u.name`),
  ]);
  return { clinics: clinics.rows, specialties: specialties.rows, doctors: doctors.rows };
}

export async function validateReferences({ clinicId, specialtyIds = [], clinicIds = [], doctorIds = [] }) {
  if (clinicId) {
    const result = await query('SELECT 1 FROM clinics WHERE id=$1 AND is_active=TRUE', [clinicId]);
    if (!result.rowCount) return false;
  }
  if (specialtyIds.length) {
    const result = await query('SELECT count(*)::int AS count FROM specialties WHERE id=ANY($1::uuid[])', [specialtyIds]);
    if (result.rows[0].count !== new Set(specialtyIds).size) return false;
  }
  if (clinicIds.length) {
    const result = await query('SELECT count(*)::int AS count FROM clinics WHERE id=ANY($1::uuid[]) AND is_active=TRUE', [clinicIds]);
    if (result.rows[0].count !== new Set(clinicIds).size) return false;
  }
  if (doctorIds.length) {
    const result = await query(
      `SELECT count(*)::int AS count FROM doctors d JOIN users u ON u.id=d.user_id
       WHERE d.id=ANY($1::uuid[]) AND u.is_active=TRUE`,
      [doctorIds],
    );
    if (result.rows[0].count !== new Set(doctorIds).size) return false;
  }
  return true;
}

const DOCTOR_SELECT = `SELECT d.id, u.id AS "userId", u.name, u.email, u.is_active AS "isActive",
  d.clinic_id AS "clinicId", d.professional_title AS title, d.bio, d.years_of_experience AS "yearsOfExperience",
  d.consultation_fee AS "consultationFee", d.currency, d.profile_image_url AS "image",
  d.time_zone AS "timeZone", d.education, d.languages, d.is_accepting_appointments AS "acceptingAppointments",
  d.approval_status AS "approvalStatus", d.created_at AS "createdAt",
  d.primary_specialty_id AS "primarySpecialtyId",
  COALESCE(array_agg(DISTINCT specialty.name) FILTER (WHERE specialty.id IS NOT NULL), '{}') AS specialties
  FROM doctors d JOIN users u ON u.id = d.user_id
  LEFT JOIN specialties specialty ON specialty.id = d.primary_specialty_id`;

export async function listDoctors({ search = '', specialtyId = '', clinicId = '', status = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, `(u.name ILIKE ? OR u.email ILIKE ? OR d.professional_title ILIKE ?)`,
    `%${escapeLike(search)}%`);
  if (specialtyId) addFilter(filters, values, `d.primary_specialty_id = ?`, specialtyId);
  if (clinicId) addFilter(filters, values, `d.clinic_id = ?`, clinicId);
  if (status === 'active' || status === 'inactive') addFilter(filters, values, `u.is_active = ?`, status === 'active');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const offsetParam = values.length + 2;
  const [rows, count] = await Promise.all([
    query(`${DOCTOR_SELECT} ${where} GROUP BY d.id, u.id
      ORDER BY u.name LIMIT $${offsetParam - 1} OFFSET $${offsetParam}`, [...values, limit, offset]),
    query(`SELECT count(*)::int AS total FROM doctors d JOIN users u ON u.id = d.user_id ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function getDoctor(doctorId) {
  const result = await query(`${DOCTOR_SELECT} WHERE d.id = $1 GROUP BY d.id, u.id`, [doctorId]);
  if (!result.rows[0]) return null;
  const [availability, appointments] = await Promise.all([
    query(
      `SELECT id, day_of_week AS "dayOfWeek", start_time AS "startTime", end_time AS "endTime",
              slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"
       FROM doctor_availability WHERE doctor_id = $1 ORDER BY day_of_week, start_time`,
      [doctorId],
    ),
    query('SELECT count(*)::int AS count FROM appointments WHERE doctor_id = $1', [doctorId]),
  ]);
  return { ...result.rows[0], availability: availability.rows, appointmentCount: appointments.rows[0].count };
}

export async function createDoctor(payload) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at, must_change_password)
       VALUES ($1, $2, $3, 'doctor', now(), TRUE) RETURNING id`,
      [payload.name, payload.email, payload.passwordHash],
    );
    const doctor = await client.query(
      `INSERT INTO doctors
         (user_id, clinic_id, professional_title, bio, years_of_experience, consultation_fee,
          primary_specialty_id,
          currency, profile_image_url, time_zone, education, languages, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'approved')
       RETURNING id`,
      [user.rows[0].id, payload.clinicId || null, payload.title, payload.bio || '',
        payload.yearsOfExperience ?? null, payload.consultationFee, payload.primarySpecialtyId, payload.currency,
        payload.image || null, payload.timeZone, payload.education || '', payload.languages || []],
    );
    await client.query(
      'INSERT INTO doctor_specialties (doctor_id, specialty_id) VALUES ($1, $2)',
      [doctor.rows[0].id, payload.primarySpecialtyId],
    );
    return { ...doctor.rows[0], userId: user.rows[0].id };
  });
}

export async function updateDoctor(doctorId, payload) {
  return withTransaction(async (client) => {
    const doctor = await client.query('SELECT user_id FROM doctors WHERE id = $1 FOR UPDATE', [doctorId]);
    if (!doctor.rowCount) return null;
    await client.query(
      'UPDATE users SET name = $1, email = $2, is_active = $3 WHERE id = $4',
      [payload.name, payload.email, payload.isActive, doctor.rows[0].user_id],
    );
    await client.query(
      `UPDATE doctors SET clinic_id = $2, professional_title = $3, bio = $4,
       years_of_experience = $5, consultation_fee = $6, currency = $7, profile_image_url = $8,
       time_zone = $9, education = $10, languages = $11, is_accepting_appointments = $12,
       primary_specialty_id = $13
       WHERE id = $1`,
      [doctorId, payload.clinicId || null, payload.title, payload.bio || '',
        payload.yearsOfExperience ?? null, payload.consultationFee, payload.currency,
        payload.image || null, payload.timeZone, payload.education || '', payload.languages || [],
        payload.acceptingAppointments, payload.primarySpecialtyId],
    );
    if (!payload.isActive) {
      await client.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [doctor.rows[0].user_id]);
    }
    await client.query('DELETE FROM doctor_specialties WHERE doctor_id = $1', [doctorId]);
    await client.query(
      'INSERT INTO doctor_specialties (doctor_id, specialty_id) VALUES ($1, $2)',
      [doctorId, payload.primarySpecialtyId],
    );
    return { id: doctorId };
  });
}

export async function listClinics({ search = '', status = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, `(c.name ILIKE ? OR c.city ILIKE ? OR c.address ILIKE ?)`, `%${escapeLike(search)}%`);
  if (status === 'active' || status === 'inactive') addFilter(filters, values, 'c.is_active = ?', status === 'active');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const p = values.length + 2;
  const [rows, count] = await Promise.all([
    query(
      `SELECT c.id, c.name, c.city, c.address, c.phone, c.is_active AS "isActive",
              c.created_at AS "createdAt", count(DISTINCT d.id)::int AS "doctorCount",
              count(DISTINCT a.id)::int AS "appointmentCount"
       FROM clinics c LEFT JOIN doctors d ON d.clinic_id = c.id
       LEFT JOIN appointments a ON a.doctor_id = d.id ${where}
       GROUP BY c.id ORDER BY c.name LIMIT $${p - 1} OFFSET $${p}`,
      [...values, limit, offset],
    ),
    query(`SELECT count(*)::int AS total FROM clinics c ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function saveClinic(id, payload) {
  if (id) {
    const result = await query(
      `UPDATE clinics SET name=$2, city=$3, address=$4, phone=$5, is_active=$6
       WHERE id=$1 RETURNING id, name, city, address, phone, is_active AS "isActive"`,
      [id, payload.name, payload.city, payload.address, payload.phone, payload.isActive],
    );
    return result.rows[0] || null;
  }
  const result = await query(
    `INSERT INTO clinics (name, city, address, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, city, address, phone, is_active AS "isActive"`,
    [payload.name, payload.city, payload.address, payload.phone],
  );
  return result.rows[0];
}

export async function listServices({ search = '', status = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, '(s.name ILIKE ? OR s.slug ILIKE ?)', `%${escapeLike(search)}%`);
  if (status === 'active' || status === 'inactive') addFilter(filters, values, 's.is_active = ?', status === 'active');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const p = values.length + 2;
  const [rows, count] = await Promise.all([
    query(
      `SELECT s.id, s.name, s.slug, s.description, s.duration_minutes AS "durationMinutes",
              s.fee, s.currency, s.is_active AS "isActive",
              COALESCE(array_agg(DISTINCT cs.clinic_id) FILTER (WHERE cs.clinic_id IS NOT NULL), '{}') AS "clinicIds",
              COALESCE(array_agg(DISTINCT ds.doctor_id) FILTER (WHERE ds.doctor_id IS NOT NULL), '{}') AS "doctorIds"
       FROM healthcare_services s LEFT JOIN clinic_services cs ON cs.service_id = s.id
       LEFT JOIN doctor_services ds ON ds.service_id = s.id ${where}
       GROUP BY s.id ORDER BY s.name LIMIT $${p - 1} OFFSET $${p}`,
      [...values, limit, offset],
    ),
    query(`SELECT count(*)::int AS total FROM healthcare_services s ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function saveService(id, payload) {
  return withTransaction(async (client) => {
    const service = id
      ? await client.query(
        `UPDATE healthcare_services SET name=$2, slug=$3, description=$4, duration_minutes=$5,
         fee=$6, currency=$7, is_active=$8 WHERE id=$1 RETURNING id`,
        [id, payload.name, payload.slug, payload.description, payload.durationMinutes, payload.fee, payload.currency, payload.isActive],
      )
      : await client.query(
        `INSERT INTO healthcare_services (name, slug, description, duration_minutes, fee, currency)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [payload.name, payload.slug, payload.description, payload.durationMinutes, payload.fee, payload.currency],
      );
    if (!service.rowCount) return null;
    const serviceId = service.rows[0].id;
    await client.query('DELETE FROM clinic_services WHERE service_id = $1', [serviceId]);
    await client.query('DELETE FROM doctor_services WHERE service_id = $1', [serviceId]);
    for (const clinicId of payload.clinicIds) await client.query('INSERT INTO clinic_services VALUES ($1, $2)', [clinicId, serviceId]);
    for (const doctorId of payload.doctorIds) await client.query('INSERT INTO doctor_services VALUES ($1, $2)', [doctorId, serviceId]);
    return { id: serviceId };
  });
}

export async function listAccounts(role, { search = '', status = '', limit, offset }) {
  const filters = ['u.role = $1'];
  const values = [role];
  if (search) addFilter(filters, values, '(u.name ILIKE ? OR u.email ILIKE ?)', `%${escapeLike(search)}%`);
  if (status === 'active' || status === 'inactive') addFilter(filters, values, 'u.is_active = ?', status === 'active');
  const where = `WHERE ${filters.join(' AND ')}`;
  const p = values.length + 2;
  const [rows, count] = await Promise.all([
    query(
      `SELECT u.id, u.name, u.email, u.is_active AS "isActive", u.created_at AS "createdAt",
              u.updated_at AS "updatedAt",
              count(DISTINCT t.id)::int AS "assignedTickets",
              count(DISTINCT t.id) FILTER (WHERE t.status IN ('open','in_progress','waiting_for_patient'))::int AS "activeTickets",
              COALESCE(array_agg(DISTINCT receptionist_clinic.clinic_id)
                FILTER (WHERE receptionist_clinic.clinic_id IS NOT NULL), '{}') AS "clinicIds"
       FROM users u LEFT JOIN support_tickets t ON t.assigned_staff_id = u.id
       LEFT JOIN receptionist_clinics receptionist_clinic ON receptionist_clinic.receptionist_user_id = u.id
       ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${p - 1} OFFSET $${p}`,
      [...values, limit, offset],
    ),
    query(`SELECT count(*)::int AS total FROM users u ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function createAccount({ name, email, role, passwordHash, clinicIds = [] }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO users (name, email, role, password_hash, email_verified_at, must_change_password)
       VALUES ($1, $2, $3, $4, now(), TRUE)
       RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
      [name, email, role, passwordHash],
    );
    if (role === 'receptionist') {
      for (const clinicId of clinicIds) {
        await client.query(
          'INSERT INTO receptionist_clinics (receptionist_user_id, clinic_id) VALUES ($1, $2)',
          [result.rows[0].id, clinicId],
        );
      }
    }
    return result.rows[0];
  });
}

export async function updateAccount(id, role, { name, email, isActive, clinicIds = [] }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users SET name=$3, email=$4, is_active=$5
       WHERE id=$1 AND role=$2
       RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, role, name, email, isActive],
    );
    if (result.rowCount && !isActive) {
      await client.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [id]);
    }
    if (result.rowCount && role === 'receptionist') {
      await client.query('DELETE FROM receptionist_clinics WHERE receptionist_user_id = $1', [id]);
      for (const clinicId of clinicIds) {
        await client.query(
          'INSERT INTO receptionist_clinics (receptionist_user_id, clinic_id) VALUES ($1, $2)',
          [id, clinicId],
        );
      }
    }
    return result.rows[0] || null;
  });
}

export async function listAppointments({ search = '', status = '', doctorId = '', patientId = '', clinicId = '', from = '', to = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, '(patient_user.name ILIKE ? OR patient_user.email ILIKE ? OR doctor_user.name ILIKE ? OR clinic.name ILIKE ?)',
    `%${escapeLike(search)}%`);
  if (status) addFilter(filters, values, 'a.status = ?', status);
  if (doctorId) addFilter(filters, values, 'a.doctor_id = ?', doctorId);
  if (patientId) addFilter(filters, values, 'a.patient_id = ?', patientId);
  if (clinicId) addFilter(filters, values, 'd.clinic_id = ?', clinicId);
  if (from) addFilter(filters, values, 'a.scheduled_start >= ?::date', from);
  if (to) addFilter(filters, values, 'a.scheduled_start < (?::date + interval \'1 day\')', to);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const joins = `FROM appointments a JOIN patients p ON p.id=a.patient_id
    JOIN users patient_user ON patient_user.id=p.user_id
    JOIN doctors d ON d.id=a.doctor_id JOIN users doctor_user ON doctor_user.id=d.user_id
    LEFT JOIN clinics clinic ON clinic.id=d.clinic_id`;
  const p = values.length + 2;
  const [rows, count] = await Promise.all([
    query(
      `SELECT a.id, a.scheduled_start AS "scheduledStart", a.scheduled_end AS "scheduledEnd",
              a.status, a.created_at AS "createdAt", a.cancelled_at AS "cancelledAt",
              patient_user.id AS "patientUserId", patient_user.name AS "patientName", patient_user.email AS "patientEmail",
              p.id AS "patientId", doctor_user.name AS "doctorName", d.id AS "doctorId",
              clinic.name AS "clinicName", clinic.id AS "clinicId"
       ${joins} ${where} ORDER BY a.scheduled_start DESC LIMIT $${p - 1} OFFSET $${p}`,
      [...values, limit, offset],
    ),
    query(`SELECT count(*)::int AS total ${joins} ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}

export async function getAppointment(appointmentId) {
  const result = await query(
    `SELECT a.id, a.scheduled_start AS "scheduledStart", a.scheduled_end AS "scheduledEnd",
            a.status, a.reason, a.consultation_fee_snapshot AS "fee", a.created_at AS "createdAt",
            a.cancelled_at AS "cancelledAt", cancel_actor.name AS "cancelledBy",
            patient_user.name AS "patientName", patient_user.email AS "patientEmail",
            patient.id AS "patientId", doctor_user.name AS "doctorName", doctor.id AS "doctorId",
            doctor_user.email AS "doctorEmail", clinic.name AS "clinicName", clinic.id AS "clinicId"
     FROM appointments a JOIN patients patient ON patient.id=a.patient_id
     JOIN users patient_user ON patient_user.id=patient.user_id
     JOIN doctors doctor ON doctor.id=a.doctor_id JOIN users doctor_user ON doctor_user.id=doctor.user_id
     LEFT JOIN clinics clinic ON clinic.id=doctor.clinic_id
     LEFT JOIN users cancel_actor ON cancel_actor.id=a.cancellation_actor_user_id
     WHERE a.id=$1`,
    [appointmentId],
  );
  return result.rows[0] || null;
}

export async function getReports({ from, to }) {
  const [patientCount, doctorCount, clinicActivity, appointmentStatuses, appointmentTrend, supportCategories, supportStatus, staffWorkload, staffCounts] = await Promise.all([
    query(
      `SELECT count(*)::int AS total,
       count(*) FILTER (WHERE u.is_active)::int AS active,
       count(*) FILTER (WHERE NOT u.is_active)::int AS inactive,
       count(*) FILTER (WHERE u.created_at >= $1::date AND u.created_at < $2::date + interval '1 day')::int AS registrations
       FROM patients p JOIN users u ON u.id=p.user_id`,
      [from, to],
    ),
    query(
      `SELECT specialty.name, count(DISTINCT d.id)::int AS doctors,
       count(DISTINCT d.id) FILTER (WHERE u.is_active)::int AS active,
       count(DISTINCT d.id) FILTER (WHERE NOT u.is_active)::int AS inactive
       FROM specialties specialty
       LEFT JOIN doctors d ON d.primary_specialty_id=specialty.id LEFT JOIN users u ON u.id=d.user_id
       GROUP BY specialty.id ORDER BY doctors DESC, specialty.name`,
    ),
    query(
      `SELECT c.id, c.name, count(DISTINCT d.id)::int AS "doctorCount",
       count(DISTINCT a.id)::int AS "appointmentCount"
       FROM clinics c LEFT JOIN doctors d ON d.clinic_id=c.id
       LEFT JOIN appointments a ON a.doctor_id=d.id AND a.scheduled_start >= $1::date AND a.scheduled_start < $2::date + interval '1 day'
       GROUP BY c.id ORDER BY "appointmentCount" DESC, c.name`,
      [from, to],
    ),
    query(`SELECT status, count(*)::int AS count FROM appointments WHERE scheduled_start >= $1::date AND scheduled_start < $2::date + interval '1 day' GROUP BY status`, [from, to]),
    query(
      `SELECT to_char(days.day, 'YYYY-MM-DD') AS date, count(appointments.id)::int AS count
       FROM generate_series($1::date, $2::date, interval '1 day') days(day)
       LEFT JOIN appointments ON appointments.scheduled_start >= days.day
         AND appointments.scheduled_start < days.day + interval '1 day'
       GROUP BY days.day ORDER BY days.day`,
      [from, to],
    ),
    query(`SELECT category, count(*)::int AS count FROM support_tickets WHERE created_at >= $1::date AND created_at < $2::date + interval '1 day' GROUP BY category`, [from, to]),
    query(`SELECT status, count(*)::int AS count FROM support_tickets WHERE created_at >= $1::date AND created_at < $2::date + interval '1 day' GROUP BY status`, [from, to]),
    query(
      `SELECT u.id, u.name, u.email, count(t.id)::int AS "assignedTickets",
       count(t.id) FILTER (WHERE t.status IN ('open','in_progress','waiting_for_patient'))::int AS active,
       count(t.id) FILTER (WHERE t.resolved_at IS NOT NULL AND t.resolved_at >= $1::date
         AND t.resolved_at < $2::date + interval '1 day')::int AS resolved
       FROM users u LEFT JOIN support_tickets t ON t.assigned_staff_id=u.id
       WHERE u.role='staff' GROUP BY u.id ORDER BY "assignedTickets" DESC, u.name`,
      [from, to],
    ),
    query(
      `SELECT
        (SELECT count(*)::int FROM users WHERE role='staff') AS staff,
        (SELECT count(*)::int FROM users WHERE role='staff' AND is_active) AS "activeStaff",
        (SELECT count(*)::int FROM users WHERE role='receptionist') AS receptionists,
        (SELECT count(*)::int FROM users WHERE role='receptionist' AND is_active) AS "activeReceptionists",
        (SELECT count(*)::int FROM clinics) AS clinics,
        (SELECT count(*)::int FROM healthcare_services) AS services`,
    ),
  ]);
  return {
    patients: patientCount.rows[0],
    accountCounts: staffCounts.rows[0],
    doctorsBySpecialty: doctorCount.rows,
    clinics: clinicActivity.rows,
    appointmentsByStatus: appointmentStatuses.rows,
    appointmentTrend: appointmentTrend.rows,
    supportByCategory: supportCategories.rows,
    supportByStatus: supportStatus.rows,
    staffWorkload: staffWorkload.rows,
  };
}

export async function listActivityLogs({ search = '', role = '', eventType = '', success = '', from = '', to = '', limit, offset }) {
  const filters = [];
  const values = [];
  if (search) addFilter(filters, values, '(COALESCE(actor.name, logs.attempted_email, \'\') ILIKE ? OR COALESCE(logs.attempted_email, \'\') ILIKE ?)', `%${escapeLike(search)}%`);
  if (role) addFilter(filters, values, 'logs.actor_role = ?', role);
  if (eventType) addFilter(filters, values, 'logs.event_type = ?', eventType);
  if (success !== '') addFilter(filters, values, 'logs.success = ?', success === 'true');
  if (from) addFilter(filters, values, 'logs.occurred_at >= ?::date', from);
  if (to) addFilter(filters, values, 'logs.occurred_at < (?::date + interval \'1 day\')', to);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const joins = 'FROM admin_activity_logs logs LEFT JOIN users actor ON actor.id=logs.actor_user_id';
  const p = values.length + 2;
  const [rows, count] = await Promise.all([
    query(
      `SELECT logs.id, logs.actor_user_id AS "actorUserId", actor.name AS "actorName",
              logs.actor_role AS "actorRole", logs.target_user_id AS "targetUserId",
              logs.attempted_email AS "attemptedEmail", logs.event_type AS "eventType",
              logs.success, logs.occurred_at AS "occurredAt", logs.ip_address AS "ipAddress",
              logs.user_agent AS "userAgent", logs.details
       ${joins} ${where} ORDER BY logs.occurred_at DESC
       LIMIT $${p - 1} OFFSET $${p}`,
      [...values, limit, offset],
    ),
    query(`SELECT count(*)::int AS total ${joins} ${where}`, values),
  ]);
  return { records: rows.rows, total: count.rows[0].total };
}
