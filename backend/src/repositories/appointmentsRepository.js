import { query, withTransaction } from '../config/database.js';
import { getAvailabilitySlots } from './doctorsRepository.js';

export async function createAppointment({ patientId, doctorId, scheduledStart, reason }) {
  return withTransaction(async (client) => {
    const doctor = await client.query(
      `SELECT d.consultation_fee, d.id
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND d.approval_status = 'approved'
         AND d.is_accepting_appointments = TRUE AND u.is_active = TRUE
       FOR UPDATE OF d`,
      [doctorId],
    );
    if (!doctor.rowCount) return { unavailable: true };

    const slots = await getAvailabilitySlots(doctorId, client.query.bind(client));
    const selectedSlot = slots.find((slot) => new Date(slot.startAt).getTime() === new Date(scheduledStart).getTime());
    if (!selectedSlot) return { unavailable: true };

    const inserted = await client.query(
      `INSERT INTO appointments
         (patient_id, doctor_id, scheduled_start, scheduled_end, status, reason, consultation_fee_snapshot)
       VALUES ($1, $2, $3, $4, 'confirmed', $5, $6)
       RETURNING id, doctor_id, scheduled_start, scheduled_end, status, reason, consultation_fee_snapshot, created_at`,
      [patientId, doctorId, selectedSlot.startAt, selectedSlot.endAt, reason || null, doctor.rows[0].consultation_fee],
    );
    return { appointment: inserted.rows[0] };
  });
}

export async function listPatientAppointments(patientId, {
  limit, offset, view = 'all', search = '', clinic = '', date = '', sort = 'newest',
}) {
  const values = [patientId];
  const filters = ['a.patient_id = $1'];
  if (view === 'upcoming') {
    filters.push(`a.status = 'confirmed' AND a.scheduled_start >= now()`);
  } else if (view === 'past') {
    filters.push(`a.status <> 'cancelled' AND (a.status = 'completed' OR a.scheduled_start < now())`);
  } else if (view === 'cancelled') {
    filters.push(`a.status = 'cancelled'`);
  }
  if (search) {
    values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    filters.push(`(doctor_user.name ILIKE $${values.length} OR clinic.name ILIKE $${values.length})`);
  }
  if (clinic) {
    values.push(`%${clinic.replace(/[\\%_]/g, '\\$&')}%`);
    filters.push(`(clinic.name ILIKE $${values.length} OR clinic.city ILIKE $${values.length})`);
  }
  if (date) {
    values.push(date);
    filters.push(`(a.scheduled_start AT TIME ZONE COALESCE(d.time_zone, 'Asia/Colombo'))::date = $${values.length}::date`);
  }
  const whereClause = filters.join(' AND ');
  const count = await query(
    `SELECT count(*)::int AS total
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users doctor_user ON doctor_user.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     WHERE ${whereClause}`,
    values,
  );
  const pageValues = [...values, limit, offset];
  const result = await query(
    `SELECT a.id, a.scheduled_start, a.scheduled_end, a.status, a.reason,
            a.consultation_fee_snapshot, a.cancelled_at,
            (a.status = 'confirmed' AND a.scheduled_start > now()) AS can_cancel,
            doctor_user.name AS doctor_name, d.professional_title AS doctor_title,
            d.profile_image_url AS doctor_image, d.time_zone,
            clinic.name AS clinic_name, clinic.city AS clinic_city, clinic.address AS clinic_address,
            d.id AS doctor_id
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users doctor_user ON doctor_user.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     WHERE ${whereClause}
     ORDER BY a.scheduled_start ${sort === 'oldest' ? 'ASC' : 'DESC'}
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return { appointments: result.rows, total: count.rows[0].total };
}

export async function getPatientAppointment(patientId, appointmentId) {
  const result = await query(
    `SELECT a.id, a.scheduled_start, a.scheduled_end, a.status, a.reason,
            a.consultation_fee_snapshot, a.created_at, a.cancelled_at,
            (a.status = 'confirmed' AND a.scheduled_start > now()) AS can_cancel,
            doctor_user.name AS doctor_name, d.professional_title AS doctor_title,
            d.profile_image_url AS doctor_image, d.time_zone,
            clinic.name AS clinic_name, clinic.city AS clinic_city, clinic.address AS clinic_address,
            clinic.phone AS clinic_phone, d.id AS doctor_id
     FROM appointments a
     JOIN doctors d ON d.id = a.doctor_id
     JOIN users doctor_user ON doctor_user.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     WHERE a.patient_id = $1 AND a.id = $2`,
    [patientId, appointmentId],
  );
  return result.rows[0] || null;
}

export async function cancelPatientAppointment(patientId, appointmentId, userId) {
  const result = await query(
    `UPDATE appointments
     SET status = 'cancelled', cancelled_at = now(), cancellation_actor_user_id = $3
     WHERE patient_id = $1 AND id = $2 AND status = 'confirmed'
       AND scheduled_start > now()
     RETURNING id, status`,
    [patientId, appointmentId, userId],
  );
  return result.rows[0] || null;
}

export async function reschedulePatientAppointment(patientId, appointmentId, scheduledStart) {
  return withTransaction(async (client) => {
    const appointment = await client.query(
      `SELECT a.id, a.doctor_id
       FROM appointments a
       WHERE a.patient_id = $1 AND a.id = $2 AND a.status = 'confirmed'
         AND a.scheduled_start > now()
       FOR UPDATE`,
      [patientId, appointmentId],
    );
    if (!appointment.rowCount) return { unavailable: true };

    await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [appointment.rows[0].doctor_id]);
    const slots = await getAvailabilitySlots(appointment.rows[0].doctor_id, client.query.bind(client));
    const selectedSlot = slots.find((slot) => new Date(slot.startAt).getTime() === new Date(scheduledStart).getTime());
    if (!selectedSlot) return { unavailable: true };

    const updated = await client.query(
      `UPDATE appointments
       SET scheduled_start = $1, scheduled_end = $2
       WHERE id = $3 AND patient_id = $4
       RETURNING id, doctor_id, scheduled_start, scheduled_end, status, reason, consultation_fee_snapshot`,
      [selectedSlot.startAt, selectedSlot.endAt, appointmentId, patientId],
    );
    return { appointment: updated.rows[0] };
  });
}
