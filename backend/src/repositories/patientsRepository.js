import { query, withTransaction } from '../config/database.js';

const PROFILE_SELECT = `
  SELECT u.id AS "userId", u.name, u.email, p.id AS "patientId", p.phone,
         p.date_of_birth AS "dateOfBirth", p.gender, p.blood_type AS "bloodType",
         p.home_address AS "homeAddress",
         p.emergency_contact_name AS "emergencyContactName",
         p.emergency_contact_relationship AS "emergencyContactRelationship",
         p.emergency_contact_phone AS "emergencyContactPhone",
         p.preferred_clinic_id AS "preferredClinicId",
         clinic.name AS "preferredClinicName",
         p.preferred_consultation_mode AS "preferredConsultationMode",
         p.preferred_language AS "preferredLanguage",
         p.wheelchair_accessible AS "wheelchairAccessible"
  FROM users u
  JOIN patients p ON p.user_id = u.id
  LEFT JOIN clinics clinic ON clinic.id = p.preferred_clinic_id
`;

export async function getPatientProfile(userId) {
  const result = await query(`${PROFILE_SELECT} WHERE u.id = $1 AND u.role = 'patient'`, [userId]);
  return result.rows[0] || null;
}

export async function updatePatientProfile(userId, profile) {
  return withTransaction(async (client) => {
    const updatedUser = await client.query(
      `UPDATE users SET name = $1
       WHERE id = $2 AND role = 'patient'
       RETURNING id`,
      [`${profile.firstName} ${profile.lastName}`.trim(), userId],
    );
    if (!updatedUser.rowCount) return null;

    await client.query(
      `UPDATE patients SET
         phone = $1, date_of_birth = $2, gender = $3, home_address = $4,
         emergency_contact_name = $5, emergency_contact_relationship = $6,
         emergency_contact_phone = $7, preferred_clinic_id = $8,
         preferred_consultation_mode = $9, preferred_language = $10,
         wheelchair_accessible = $11
       WHERE user_id = $12`,
      [
        profile.phone || null,
        profile.dateOfBirth || null,
        profile.gender || null,
        profile.homeAddress || null,
        profile.emergencyContactName || null,
        profile.emergencyContactRelationship || null,
        profile.emergencyContactPhone || null,
        profile.preferredClinicId || null,
        profile.preferredConsultationMode || null,
        profile.preferredLanguage || null,
        profile.wheelchairAccessible ?? false,
        userId,
      ],
    );

    const result = await client.query(`${PROFILE_SELECT} WHERE u.id = $1 AND u.role = 'patient'`, [userId]);
    return result.rows[0] || null;
  });
}

export async function getPatientDashboard(userId, patientId) {
  const [profile, appointmentSummary, upcomingAppointments, ticketSummary] = await Promise.all([
    getPatientProfile(userId),
    query(
      `SELECT count(*) FILTER (WHERE status = 'confirmed' AND scheduled_start >= now())::int AS upcoming,
              count(*) FILTER (WHERE status <> 'cancelled' AND (status = 'completed' OR scheduled_start < now()))::int AS past,
              count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
       FROM appointments WHERE patient_id = $1`,
      [patientId],
    ),
    query(
      `SELECT a.id, a.scheduled_start AS "scheduledStart", a.scheduled_end AS "scheduledEnd",
              a.status, a.reason, a.consultation_fee_snapshot AS "consultationFee",
              d.id AS "doctorId", u.name AS "doctorName", d.professional_title AS "doctorTitle",
              d.profile_image_url AS "doctorImage", clinic.name AS "clinicName",
              clinic.city AS "clinicCity", d.time_zone AS "timeZone"
       FROM appointments a
       JOIN doctors d ON d.id = a.doctor_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN clinics clinic ON clinic.id = d.clinic_id
       WHERE a.patient_id = $1 AND a.status = 'confirmed' AND a.scheduled_start >= now()
       ORDER BY a.scheduled_start
       LIMIT 3`,
      [patientId],
    ),
    query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('open', 'in_progress', 'waiting_for_patient'))::int AS active
       FROM support_tickets WHERE patient_id = $1`,
      [patientId],
    ),
  ]);
  return {
    profile,
    appointments: {
      summary: appointmentSummary.rows[0],
      upcoming: upcomingAppointments.rows,
    },
    support: ticketSummary.rows[0],
  };
}

export async function listPatientClinics() {
  const result = await query(
    `SELECT id, name, city FROM clinics WHERE is_active = TRUE ORDER BY name`,
  );
  return result.rows;
}
