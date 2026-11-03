import { query, withTransaction } from '../config/database.js';

export async function getDoctorId(userId) {
  const result = await query(
    `SELECT id FROM doctors WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0]?.id || null;
}

export async function getProfile(userId) {
  const result = await query(
    `SELECT account.name, account.email, account.profile_phone AS phone,
            doctor.professional_title AS title, doctor.bio, doctor.years_of_experience AS "yearsOfExperience",
            doctor.education, doctor.languages, doctor.time_zone AS "timeZone",
            doctor.profile_image_url AS "image"
     FROM doctors doctor JOIN users account ON account.id = doctor.user_id
     WHERE account.id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

export async function updateProfile(userId, values) {
  return withTransaction(async (client) => {
    const doctor = await client.query('SELECT id FROM doctors WHERE user_id = $1 FOR UPDATE', [userId]);
    if (!doctor.rowCount) return null;
    await client.query(
      'UPDATE users SET name = $1, profile_phone = $2 WHERE id = $3',
      [values.name, values.phone || null, userId],
    );
    const result = await client.query(
      `UPDATE doctors SET professional_title = $2, bio = $3, years_of_experience = $4,
       education = $5, languages = $6, time_zone = $7, profile_image_url = $8
       WHERE user_id = $1
       RETURNING professional_title AS title, bio, years_of_experience AS "yearsOfExperience",
         education, languages, time_zone AS "timeZone", profile_image_url AS "image"`,
      [
        userId, values.title, values.bio, values.yearsOfExperience,
        values.education, values.languages, values.timeZone, values.image || null,
      ],
    );
    return result.rows[0];
  });
}

export async function getDashboard(doctorId) {
  const result = await query(
    `SELECT
       count(*) FILTER (WHERE (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date
         = (now() AT TIME ZONE doctor.time_zone)::date
         AND status = 'confirmed')::int AS "todayAppointments",
       count(*) FILTER (WHERE scheduled_start > now() AND status = 'confirmed')::int AS "upcomingAppointments",
       count(*) FILTER (WHERE workflow_status IN ('arrived', 'checked_in', 'waiting'))::int AS "awaitingPatients",
       count(*) FILTER (WHERE workflow_status = 'in_consultation')::int AS "inConsultation"
     FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id
     WHERE appointment.doctor_id = $1`,
    [doctorId],
  );
  return result.rows[0];
}

const appointmentSelect = `
  SELECT appointment.id, appointment.scheduled_start AS "scheduledStart",
         appointment.scheduled_end AS "scheduledEnd", appointment.status,
         appointment.workflow_status AS "workflowStatus", appointment.reason,
         appointment.is_walk_in AS "isWalkIn",
         patient_user.id AS "patientUserId", patient_user.name AS "patientName",
         patient_user.email AS "patientEmail", patient.phone AS "patientPhone",
         clinic.name AS "clinicName", clinic.city AS "clinicCity",
         doctor.time_zone AS "timeZone"
  FROM appointments appointment
  JOIN patients patient ON patient.id = appointment.patient_id
  JOIN users patient_user ON patient_user.id = patient.user_id
  JOIN doctors doctor ON doctor.id = appointment.doctor_id
  LEFT JOIN clinics clinic ON clinic.id = doctor.clinic_id`;

const appointmentDetailSelect = appointmentSelect.replace(
  '  FROM appointments appointment',
  `  ,(SELECT COALESCE(json_agg(jsonb_build_object(
       'eventType', history.event_type, 'scheduledStart', history.scheduled_start,
       'scheduledEnd', history.scheduled_end, 'status', history.status,
       'workflowStatus', history.workflow_status, 'changedAt', history.changed_at,
       'actorName', actor.name
     ) ORDER BY history.changed_at DESC), '[]'::json)
      FROM appointment_history history LEFT JOIN users actor ON actor.id = history.actor_user_id
      WHERE history.appointment_id = appointment.id) AS history
  FROM appointments appointment`,
);

export async function listAppointments(doctorId, { from, to, status, limit, offset }) {
  const filters = ['appointment.doctor_id = $1'];
  const values = [doctorId];
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
  const count = await query(
    `SELECT count(*)::int AS total FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id WHERE ${where}`,
    values,
  );
  const pageValues = [...values, limit, offset];
  const result = await query(
    `${appointmentSelect}
     WHERE ${where}
     ORDER BY appointment.scheduled_start DESC
     LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`,
    pageValues,
  );
  return { appointments: result.rows, total: count.rows[0].total };
}

export async function getAppointment(doctorId, appointmentId) {
  const result = await query(
    `${appointmentDetailSelect}
     WHERE appointment.doctor_id = $1 AND appointment.id = $2`,
    [doctorId, appointmentId],
  );
  return result.rows[0] || null;
}

const workflowTransitions = {
  scheduled: new Set(['in_consultation', 'no_show']),
  arrived: new Set(['in_consultation', 'no_show']),
  checked_in: new Set(['in_consultation', 'no_show']),
  waiting: new Set(['in_consultation', 'no_show']),
  in_consultation: new Set(['completed']),
  completed: new Set(),
  no_show: new Set(),
};

export async function updateWorkflow(doctorId, appointmentId, nextStatus, actorUserId) {
  return withTransaction(async (client) => {
    const current = await client.query(
      `SELECT id, workflow_status AS "workflowStatus", status
       FROM appointments
       WHERE id = $1 AND doctor_id = $2 AND status = 'confirmed'
       FOR UPDATE`,
      [appointmentId, doctorId],
    );
    if (!current.rowCount) return { notFound: true };
    const previousStatus = current.rows[0].workflowStatus;
    if (!workflowTransitions[previousStatus]?.has(nextStatus)) {
      return { invalidTransition: true, currentStatus: previousStatus };
    }
    const result = await client.query(
      `UPDATE appointments
       SET workflow_status = $1, workflow_updated_at = now(),
           workflow_updated_by_user_id = $2, updated_by_user_id = $2,
           status = CASE WHEN $1 = 'completed' THEN 'completed' ELSE status END
       WHERE id = $3
       RETURNING id, status, workflow_status AS "workflowStatus", workflow_updated_at AS "updatedAt"`,
      [nextStatus, actorUserId, appointmentId],
    );
    await client.query(
      `INSERT INTO appointment_workflow_history
        (appointment_id, previous_status, new_status, actor_user_id)
       VALUES ($1, $2, $3, $4)`,
      [appointmentId, previousStatus, nextStatus, actorUserId],
    );
    return { appointment: result.rows[0] };
  });
}

export async function getConsultation(doctorId, appointmentId) {
  const result = await query(
    `SELECT consultation.id, consultation.clinical_notes AS "clinicalNotes",
            consultation.assessment, consultation.treatment_plan AS "treatmentPlan",
            consultation.follow_up_notes AS "followUpNotes",
            consultation.created_at AS "createdAt", consultation.updated_at AS "updatedAt"
     FROM consultations consultation
     JOIN appointments appointment ON appointment.id = consultation.appointment_id
     WHERE appointment.doctor_id = $1 AND appointment.id = $2`,
    [doctorId, appointmentId],
  );
  return result.rows[0] || null;
}

export async function saveConsultation(doctorId, appointmentId, values) {
  return withTransaction(async (client) => {
    const appointment = await client.query(
      `SELECT id, patient_id FROM appointments
       WHERE id = $1 AND doctor_id = $2 AND status IN ('confirmed', 'completed')
         AND workflow_status IN ('in_consultation', 'completed')
       FOR UPDATE`,
      [appointmentId, doctorId],
    );
    if (!appointment.rowCount) return null;
    const previous = await client.query(
      `SELECT id, clinical_notes, assessment, treatment_plan, follow_up_notes
       FROM consultations WHERE appointment_id = $1 FOR UPDATE`,
      [appointmentId],
    );
    if (previous.rowCount) {
      await client.query(
        `INSERT INTO consultation_revisions
          (consultation_id, doctor_id, clinical_notes, assessment, treatment_plan, follow_up_notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          previous.rows[0].id,
          doctorId,
          previous.rows[0].clinical_notes,
          previous.rows[0].assessment,
          previous.rows[0].treatment_plan,
          previous.rows[0].follow_up_notes,
        ],
      );
    }
    const result = await client.query(
      `INSERT INTO consultations
        (appointment_id, doctor_id, patient_id, clinical_notes, assessment, treatment_plan, follow_up_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (appointment_id) DO UPDATE SET
         clinical_notes = EXCLUDED.clinical_notes,
         assessment = EXCLUDED.assessment,
         treatment_plan = EXCLUDED.treatment_plan,
         follow_up_notes = EXCLUDED.follow_up_notes
       RETURNING id, clinical_notes AS "clinicalNotes", assessment,
         treatment_plan AS "treatmentPlan", follow_up_notes AS "followUpNotes",
         created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        appointmentId,
        doctorId,
        appointment.rows[0].patient_id,
        values.clinicalNotes,
        values.assessment,
        values.treatmentPlan,
        values.followUpNotes,
      ],
    );
    return result.rows[0];
  });
}

export async function listConsultationRevisions(doctorId, appointmentId) {
  const result = await query(
    `SELECT revision.id, revision.clinical_notes AS "clinicalNotes",
            revision.assessment, revision.treatment_plan AS "treatmentPlan",
            revision.follow_up_notes AS "followUpNotes", revision.revised_at AS "revisedAt"
     FROM consultation_revisions revision
     JOIN consultations consultation ON consultation.id = revision.consultation_id
     JOIN appointments appointment ON appointment.id = consultation.appointment_id
     WHERE appointment.doctor_id = $1 AND appointment.id = $2
     ORDER BY revision.revised_at DESC`,
    [doctorId, appointmentId],
  );
  return result.rows;
}
