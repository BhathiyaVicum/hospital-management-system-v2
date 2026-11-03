import { query, withTransaction } from '../config/database.js';

export async function listSchedules({ doctorId, from, to }) {
  const doctorFilter = doctorId ? 'WHERE account.is_active = TRUE AND d.id = $1' : 'WHERE account.is_active = TRUE';
  const doctorValues = doctorId ? [doctorId] : [];
  const weekly = await query(
    `SELECT availability.id, availability.doctor_id AS "doctorId",
            account.name AS "doctorName", availability.day_of_week AS "dayOfWeek",
            to_char(availability.start_time, 'HH24:MI') AS "startTime",
            to_char(availability.end_time, 'HH24:MI') AS "endTime",
            availability.slot_duration_minutes AS "slotDurationMinutes",
            availability.is_available AS "isAvailable"
     FROM doctor_availability availability
     JOIN doctors d ON d.id = availability.doctor_id
     JOIN users account ON account.id = d.user_id
     ${doctorFilter}
     ORDER BY account.name, availability.day_of_week, availability.start_time`,
    doctorValues,
  );
  const exceptionFilters = ['account.is_active = TRUE', 'exception.available_on >= $1::date', 'exception.available_on <= $2::date'];
  const exceptionValues = [from, to];
  if (doctorId) {
    exceptionValues.push(doctorId);
    exceptionFilters.push(`d.id = $${exceptionValues.length}`);
  }
  const exceptions = await query(
    `SELECT exception.id, exception.doctor_id AS "doctorId", account.name AS "doctorName",
            exception.available_on AS "availableOn",
            to_char(exception.start_time, 'HH24:MI') AS "startTime",
            to_char(exception.end_time, 'HH24:MI') AS "endTime",
            exception.slot_duration_minutes AS "slotDurationMinutes",
            exception.is_available AS "isAvailable",
            (SELECT count(*)::int FROM appointments appointment
             WHERE appointment.doctor_id = exception.doctor_id
               AND appointment.status = 'confirmed'
               AND appointment.scheduled_start >= now()
               AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = exception.available_on
            ) AS "affectedAppointments"
     FROM doctor_availability_exceptions exception
     JOIN doctors d ON d.id = exception.doctor_id
     JOIN users account ON account.id = d.user_id
     WHERE ${exceptionFilters.join(' AND ')}
     ORDER BY exception.available_on, account.name`,
    exceptionValues,
  );
  return { weekly: weekly.rows, exceptions: exceptions.rows };
}

export async function listScheduleDoctors() {
  const result = await query(
    `SELECT d.id, account.name, d.time_zone AS "timeZone"
     FROM doctors d JOIN users account ON account.id = d.user_id
     WHERE account.is_active = TRUE ORDER BY account.name`,
  );
  return result.rows;
}

export async function createWeeklySchedule(payload) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [payload.doctorId, String(payload.dayOfWeek)]);
    if (payload.isAvailable) {
      const overlap = await client.query(
        `SELECT 1 FROM doctor_availability
         WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = TRUE
           AND start_time < $4::time AND end_time > $3::time
         LIMIT 1`,
        [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime],
      );
      if (overlap.rowCount) throw Object.assign(new Error('This schedule overlaps another active time window for the doctor.'), { status: 409 });
    }
    const result = await client.query(
      `INSERT INTO doctor_availability
         (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
       VALUES ($1, $2, $3::time, $4::time, $5, $6)
       RETURNING id, doctor_id AS "doctorId", day_of_week AS "dayOfWeek",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, payload.slotDurationMinutes, payload.isAvailable],
    );
    return result.rows[0];
  });
}

export async function updateWeeklySchedule(availabilityId, payload, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const current = await client.query(
      'SELECT id FROM doctor_availability WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2) FOR UPDATE',
      [availabilityId, authorizedDoctorId],
    );
    if (!current.rowCount) return null;
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [payload.doctorId, String(payload.dayOfWeek)]);
    if (payload.isAvailable) {
      const overlap = await client.query(
        `SELECT 1 FROM doctor_availability
         WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = TRUE AND id <> $5
           AND start_time < $4::time AND end_time > $3::time
         LIMIT 1`,
        [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, availabilityId],
      );
      if (overlap.rowCount) throw Object.assign(new Error('This schedule overlaps another active time window for the doctor.'), { status: 409 });
    }
    const result = await client.query(
      `UPDATE doctor_availability
       SET doctor_id = $2, day_of_week = $3, start_time = $4::time, end_time = $5::time,
           slot_duration_minutes = $6, is_available = $7
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", day_of_week AS "dayOfWeek",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [availabilityId, payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, payload.slotDurationMinutes, payload.isAvailable],
    );
    return result.rows[0];
  });
}

export async function saveScheduleException(payload) {
  return withTransaction(async (client) => {
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [payload.doctorId, payload.availableOn],
    );
    const existing = await client.query(
      `SELECT id FROM doctor_availability_exceptions
       WHERE doctor_id = $1 AND available_on = $2::date
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [payload.doctorId, payload.availableOn],
    );
    const values = [
      payload.doctorId,
      payload.availableOn,
      payload.isAvailable ? payload.startTime : null,
      payload.isAvailable ? payload.endTime : null,
      payload.isAvailable ? payload.slotDurationMinutes : null,
      payload.isAvailable,
    ];
    const result = existing.rowCount
      ? await client.query(
        `UPDATE doctor_availability_exceptions
         SET start_time = $2::time, end_time = $3::time,
             slot_duration_minutes = $4, is_available = $5
         WHERE id = $1
         RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
           to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
           slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
        [existing.rows[0].id, ...values.slice(2)],
      )
      : await client.query(
        `INSERT INTO doctor_availability_exceptions
           (doctor_id, available_on, start_time, end_time, slot_duration_minutes, is_available)
         VALUES ($1, $2::date, $3::time, $4::time, $5, $6)
         RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
           to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
           slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
        values,
      );
    const impact = await client.query(
      `SELECT count(*)::int AS count
       FROM appointments appointment
       JOIN doctors d ON d.id = appointment.doctor_id
       WHERE appointment.doctor_id = $1
         AND appointment.status = 'confirmed'
         AND appointment.scheduled_start >= now()
         AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = $2::date`,
      [payload.doctorId, payload.availableOn],
    );
    return { ...result.rows[0], affectedAppointments: impact.rows[0].count };
  });
}

export async function updateScheduleException(exceptionId, payload, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const identity = await client.query(
      `SELECT doctor_id AS "doctorId", available_on AS "availableOn"
       FROM doctor_availability_exceptions
       WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2)`,
      [exceptionId, authorizedDoctorId],
    );
    if (!identity.rowCount) return null;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [identity.rows[0].doctorId, identity.rows[0].availableOn],
    );
    const existing = await client.query(
      'SELECT id FROM doctor_availability_exceptions WHERE id = $1 FOR UPDATE',
      [exceptionId],
    );
    if (!existing.rowCount) return null;
    const result = await client.query(
      `UPDATE doctor_availability_exceptions
       SET start_time = $2::time, end_time = $3::time,
           slot_duration_minutes = $4, is_available = $5
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [
        exceptionId,
        payload.isAvailable ? payload.startTime : null,
        payload.isAvailable ? payload.endTime : null,
        payload.isAvailable ? payload.slotDurationMinutes : null,
        payload.isAvailable,
      ],
    );
    const impact = await client.query(
      `SELECT count(*)::int AS count
       FROM appointments appointment
       JOIN doctors d ON d.id = appointment.doctor_id
       WHERE appointment.doctor_id = $1
         AND appointment.status = 'confirmed'
         AND appointment.scheduled_start >= now()
         AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = $2::date`,
      [result.rows[0].doctorId, result.rows[0].availableOn],
    );
    return { ...result.rows[0], affectedAppointments: impact.rows[0].count };
  });
}

export async function deleteScheduleException(exceptionId, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const identity = await client.query(
      `SELECT doctor_id AS "doctorId", available_on AS "availableOn"
       FROM doctor_availability_exceptions
       WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2)`,
      [exceptionId, authorizedDoctorId],
    );
    if (!identity.rowCount) return null;
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [identity.rows[0].doctorId, identity.rows[0].availableOn],
    );
    const result = await client.query(
      `DELETE FROM doctor_availability_exceptions
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn"`,
      [exceptionId],
    );
    return result.rows[0] || null;
  });
}
