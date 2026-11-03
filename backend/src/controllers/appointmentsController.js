import * as appointmentsService from '../services/appointmentsService.js';

export async function create(req, res) {
  const appointment = await appointmentsService.bookAppointment(req.user.patient_id, req.validated.body);
  return res.status(201).json({ data: appointment });
}

export async function list(req, res) {
  const result = await appointmentsService.listAppointments(req.user.patient_id, req.validated.query);
  return res.json({
    data: result.appointments,
    pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset },
  });
}

export async function getById(req, res) {
  const data = await appointmentsService.getAppointment(req.user.patient_id, req.validated.params.appointmentId);
  return res.json({ data });
}

export async function cancel(req, res) {
  const data = await appointmentsService.cancelAppointment(
    req.user.patient_id,
    req.validated.params.appointmentId,
    req.user.id,
  );
  return res.json({ data });
}

export async function reschedule(req, res) {
  const data = await appointmentsService.rescheduleAppointment(
    req.user.patient_id,
    req.validated.params.appointmentId,
    req.validated.body.scheduledStart,
  );
  return res.json({ data });
}
