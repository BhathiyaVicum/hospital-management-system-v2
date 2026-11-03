import { query } from '../config/database.js';

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function listDoctors({ search = '', specialty = '', location = '', limit, offset }) {
  const values = [];
  const filters = [`d.is_accepting_appointments = TRUE`, `d.approval_status = 'approved'`, `u.is_active = TRUE`, `u.email_verified_at IS NOT NULL`];
  if (search) {
    values.push(`%${escapeLike(search)}%`);
    filters.push(`(u.name ILIKE $${values.length} OR EXISTS (
      SELECT 1 FROM doctor_specialties ds JOIN specialties s ON s.id = ds.specialty_id
      WHERE ds.doctor_id = d.id AND s.name ILIKE $${values.length}
    ))`);
  }
  if (specialty) {
    values.push(`%${escapeLike(specialty)}%`);
    filters.push(`EXISTS (
      SELECT 1 FROM doctor_specialties ds JOIN specialties s ON s.id = ds.specialty_id
      WHERE ds.doctor_id = d.id AND (s.name ILIKE $${values.length} OR s.slug ILIKE $${values.length})
    )`);
  }
  if (location) {
    values.push(`%${escapeLike(location)}%`);
    filters.push(`(clinic.city ILIKE $${values.length} OR clinic.name ILIKE $${values.length})`);
  }
  const whereClause = filters.join(' AND ');
  const count = await query(
    `SELECT count(*)::int AS total
     FROM doctors d JOIN users u ON u.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     WHERE ${whereClause}`,
    values,
  );
  const pageValues = [...values, limit, offset];
  const results = await query(
    `SELECT d.id, u.name, d.professional_title AS title, d.bio, d.years_of_experience,
            d.consultation_fee, d.currency, d.profile_image_url AS image,
            clinic.name AS clinic, clinic.city AS location,
            d.rating, d.review_count AS reviews,
            COALESCE(json_agg(DISTINCT jsonb_build_object('name', s.name, 'slug', s.slug))
              FILTER (WHERE s.id IS NOT NULL), '[]') AS specialties
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
     LEFT JOIN specialties s ON s.id = ds.specialty_id
     WHERE ${whereClause}
     GROUP BY d.id, u.id, clinic.id
     ORDER BY d.rating DESC, u.name ASC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return { doctors: results.rows, total: count.rows[0].total };
}

export async function getDoctorById(doctorId) {
  const result = await query(
    `SELECT d.id, u.name, d.professional_title AS title, d.bio, d.years_of_experience,
            d.consultation_fee, d.currency, d.profile_image_url AS image,
            clinic.name AS clinic, clinic.city AS location,
            d.rating, d.review_count AS reviews, d.time_zone, d.education, d.languages,
            COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.id IS NOT NULL), '{}') AS specialties
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
     LEFT JOIN doctor_specialties ds ON ds.doctor_id = d.id
     LEFT JOIN specialties s ON s.id = ds.specialty_id
     WHERE d.id = $1 AND d.is_accepting_appointments = TRUE
       AND d.approval_status = 'approved' AND u.is_active = TRUE AND u.email_verified_at IS NOT NULL
     GROUP BY d.id, u.id, clinic.id`,
    [doctorId],
  );
  return result.rows[0] || null;
}

export async function listSpecialties() {
  const result = await query(
    `SELECT s.id, s.name, s.slug, s.description, count(d.id)::int AS "doctorCount"
     FROM specialties s
     LEFT JOIN doctor_specialties ds ON ds.specialty_id = s.id
     LEFT JOIN doctors d ON d.id = ds.doctor_id
       AND d.approval_status = 'approved' AND d.is_accepting_appointments = TRUE
     GROUP BY s.id
     ORDER BY s.name`,
  );
  return result.rows;
}

export async function listClinics() {
  const result = await query(
    `SELECT id, name, city, address, phone
     FROM clinics WHERE is_active = TRUE ORDER BY name`,
  );
  return result.rows;
}

export async function getAvailabilitySlots(doctorId, executeQuery = query) {
  const result = await executeQuery(
    `WITH doctor_info AS (
       SELECT d.id, d.time_zone
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE d.id = $1 AND d.approval_status = 'approved'
         AND d.is_accepting_appointments = TRUE AND u.is_active = TRUE
     ),
     days AS (
       SELECT di.id, di.time_zone,
              ((now() AT TIME ZONE di.time_zone)::date + series.day_offset)::date AS local_date
       FROM doctor_info di
       CROSS JOIN generate_series(0, 59) AS series(day_offset)
     ),
     regular_slots AS (
       SELECT days.id AS doctor_id, days.time_zone,
              (slot.local_start AT TIME ZONE days.time_zone) AS starts_at,
              ((slot.local_start + availability.slot_duration_minutes * interval '1 minute')
                AT TIME ZONE days.time_zone) AS ends_at
       FROM days
       JOIN doctor_availability availability
         ON availability.doctor_id = days.id
        AND availability.is_available = TRUE
        AND availability.day_of_week = EXTRACT(DOW FROM days.local_date)
       CROSS JOIN LATERAL generate_series(
         days.local_date + availability.start_time,
         days.local_date + availability.end_time
           - availability.slot_duration_minutes * interval '1 minute',
         availability.slot_duration_minutes * interval '1 minute'
       ) AS slot(local_start)
       WHERE NOT EXISTS (
         SELECT 1 FROM doctor_availability_exceptions exception
         WHERE exception.doctor_id = days.id AND exception.available_on = days.local_date
       )
     ),
     exception_slots AS (
       SELECT days.id AS doctor_id, days.time_zone,
              (slot.local_start AT TIME ZONE days.time_zone) AS starts_at,
              ((slot.local_start + exception.slot_duration_minutes * interval '1 minute')
                AT TIME ZONE days.time_zone) AS ends_at
       FROM days
       JOIN doctor_availability_exceptions exception
         ON exception.doctor_id = days.id
        AND exception.available_on = days.local_date
        AND exception.is_available = TRUE
       CROSS JOIN LATERAL generate_series(
         days.local_date + exception.start_time,
         days.local_date + exception.end_time
           - COALESCE(exception.slot_duration_minutes, 30) * interval '1 minute',
         COALESCE(exception.slot_duration_minutes, 30) * interval '1 minute'
       ) AS slot(local_start)
     ),
     all_slots AS (
       SELECT * FROM regular_slots
       UNION ALL
       SELECT * FROM exception_slots
     )
     SELECT DISTINCT to_char(all_slots.starts_at AT TIME ZONE all_slots.time_zone, 'YYYY-MM-DD') AS date,
            to_char(all_slots.starts_at AT TIME ZONE all_slots.time_zone, 'Dy, Mon FMDD') AS day,
            to_char(all_slots.starts_at AT TIME ZONE all_slots.time_zone, 'HH12:MI AM') AS time,
            all_slots.starts_at AS "startAt",
            all_slots.ends_at AS "endAt",
            TRUE AS available
     FROM all_slots
     WHERE all_slots.starts_at > now()
       AND NOT EXISTS (
         SELECT 1 FROM appointments appointment
         WHERE appointment.doctor_id = all_slots.doctor_id
           AND appointment.status <> 'cancelled'
           AND appointment.scheduled_start < all_slots.ends_at
           AND appointment.scheduled_end > all_slots.starts_at
       )
     ORDER BY "startAt"`,
    [doctorId],
  );
  return result.rows.map((slot) => ({
    ...slot,
    id: new Date(slot.startAt).toISOString(),
  }));
}
