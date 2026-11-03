import * as workspaceService from '../services/workspaceService.js';

function actor(req) {
  return { id: req.user.id, role: req.user.role };
}

export async function doctorDashboard(req, res) {
  return res.json({ data: await workspaceService.doctorDashboard(req.user.id) });
}

export async function doctorProfile(req, res) {
  return res.json({ data: await workspaceService.doctorProfile(req.user.id) });
}

export async function updateDoctorProfile(req, res) {
  return res.json({
    data: await workspaceService.updateDoctorProfile(actor(req), req.validated.body, req),
  });
}

export async function doctorAppointments(req, res) {
  const result = await workspaceService.doctorAppointments(req.user.id, req.validated.query);
  return res.json({
    data: result.appointments,
    pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset },
  });
}

export async function doctorAppointment(req, res) {
  return res.json({
    data: await workspaceService.doctorAppointment(req.user.id, req.validated.params.appointmentId),
  });
}

export async function doctorWorkflow(req, res) {
  return res.json({
    data: await workspaceService.updateDoctorWorkflow(
      actor(req), req.validated.params.appointmentId, req.validated.body.workflowStatus, req,
    ),
  });
}

export async function doctorConsultation(req, res) {
  return res.json({
    data: await workspaceService.doctorConsultation(req.user.id, req.validated.params.appointmentId),
  });
}

export async function saveDoctorConsultation(req, res) {
  return res.json({
    data: await workspaceService.saveDoctorConsultation(
      actor(req), req.validated.params.appointmentId, req.validated.body, req,
    ),
  });
}

export async function doctorSchedules(req, res) {
  return res.json({ data: await workspaceService.doctorSchedules(req.user.id, req.validated.query) });
}

export async function doctorCalendar(req, res) {
  return res.json({ data: await workspaceService.doctorCalendar(req.user.id, req.validated.query) });
}

export async function saveDoctorDateSchedule(req, res) {
  return res.json({
    data: await workspaceService.saveDoctorDateSchedule(
      actor(req), req.validated.params.date, req.validated.body, req,
    ),
  });
}

export async function createDoctorWeeklySchedule(req, res) {
  return res.status(201).json({
    data: await workspaceService.createDoctorWeeklySchedule(actor(req), req.validated.body, req),
  });
}

export async function updateDoctorWeeklySchedule(req, res) {
  return res.json({
    data: await workspaceService.updateDoctorWeeklySchedule(
      actor(req), req.validated.params.availabilityId, req.validated.body, req,
    ),
  });
}

export async function createDoctorException(req, res) {
  return res.status(201).json({
    data: await workspaceService.createDoctorException(actor(req), req.validated.body, req),
  });
}

export async function updateDoctorException(req, res) {
  return res.json({
    data: await workspaceService.updateDoctorException(
      actor(req), req.validated.params.exceptionId, req.validated.body, req,
    ),
  });
}

export async function deleteDoctorException(req, res) {
  return res.json({
    data: await workspaceService.deleteDoctorException(actor(req), req.validated.params.exceptionId, req),
  });
}

export async function receptionistClinics(req, res) {
  return res.json({ data: await workspaceService.receptionistClinics(req.user.id) });
}

export async function receptionistProfile(req, res) {
  return res.json({ data: await workspaceService.receptionistProfile(req.user.id) });
}

export async function updateReceptionistProfile(req, res) {
  return res.json({
    data: await workspaceService.updateReceptionistProfile(actor(req), req.validated.body, req),
  });
}

export async function receptionistDashboard(req, res) {
  return res.json({ data: await workspaceService.receptionistDashboard(req.user.id) });
}

export async function receptionistPatients(req, res) {
  const result = await workspaceService.receptionistPatients(
    req.user.id, req.validated.query.search, req.validated.query,
  );
  return res.json({
    data: result.patients,
    pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset },
  });
}

export async function registerReceptionistPatient(req, res) {
  return res.status(201).json({
    data: await workspaceService.registerReceptionistPatient(actor(req), req.validated.body, req),
  });
}

export async function linkReceptionistPatient(req, res) {
  return res.json({
    data: await workspaceService.linkReceptionistPatient(actor(req), req.validated.body, req),
  });
}

export async function updateReceptionistPatient(req, res) {
  return res.json({
    data: await workspaceService.updateReceptionistPatient(
      actor(req), req.validated.params.patientId, req.validated.body, req,
    ),
  });
}

export async function receptionistDoctors(req, res) {
  return res.json({ data: await workspaceService.receptionistDoctors(req.user.id, req.validated.query.clinicId) });
}

export async function receptionistDoctorSlots(req, res) {
  const { doctorId } = req.validated.params;
  const { clinicId, date } = req.validated.query;
  return res.json({
    data: await workspaceService.receptionistDoctorSlots(req.user.id, clinicId, doctorId, date),
  });
}

export async function receptionistAppointments(req, res) {
  const result = await workspaceService.receptionistAppointments(req.user.id, req.validated.query);
  return res.json({
    data: result.appointments,
    pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset },
  });
}

export async function receptionistAppointment(req, res) {
  return res.json({
    data: await workspaceService.receptionistAppointment(req.user.id, req.validated.params.appointmentId),
  });
}

export async function bookReceptionistAppointment(req, res) {
  return res.status(201).json({
    data: await workspaceService.bookReceptionistAppointment(actor(req), req.validated.body, req),
  });
}

export async function rescheduleReceptionistAppointment(req, res) {
  return res.json({
    data: await workspaceService.rescheduleReceptionistAppointment(
      actor(req), req.validated.params.appointmentId, req.validated.body.scheduledStart, req,
    ),
  });
}

export async function cancelReceptionistAppointment(req, res) {
  return res.json({
    data: await workspaceService.cancelReceptionistAppointment(actor(req), req.validated.params.appointmentId, req),
  });
}

export async function updateReceptionistWorkflow(req, res) {
  return res.json({
    data: await workspaceService.updateReceptionistWorkflow(
      actor(req), req.validated.params.appointmentId, req.validated.body.workflowStatus, req,
    ),
  });
}
