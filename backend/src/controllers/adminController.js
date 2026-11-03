import * as adminService from '../services/adminService.js';
import * as adminScheduleService from '../services/adminScheduleService.js';
import * as supportService from '../services/supportService.js';

function actor(req) {
  return { id: req.user.id, role: req.user.role };
}

function sendList(res, result, req) {
  return res.json({
    data: result.records,
    pagination: {
      total: result.total,
      limit: req.validated.query.limit,
      offset: req.validated.query.offset,
    },
  });
}

export async function dashboard(req, res) {
  return res.json({ data: await adminService.getDashboard() });
}

export async function lookups(req, res) {
  return res.json({ data: await adminService.getLookups() });
}

export async function patients(req, res) {
  return sendList(res, await adminService.listPatients(req.validated.query), req);
}

export async function patient(req, res) {
  return res.json({ data: await adminService.getPatient(req.validated.params.patientId) });
}

export async function updatePatient(req, res) {
  return res.json({ data: await adminService.updatePatient(req.validated.params.patientId, req.validated.body, actor(req), req) });
}

export async function doctors(req, res) {
  return sendList(res, await adminService.listDoctors(req.validated.query), req);
}

export async function doctor(req, res) {
  return res.json({ data: await adminService.getDoctor(req.validated.params.doctorId) });
}

export async function createDoctor(req, res) {
  return res.status(201).json({ data: await adminService.createDoctor(req.validated.body, actor(req), req) });
}

export async function updateDoctor(req, res) {
  return res.json({ data: await adminService.updateDoctor(req.validated.params.doctorId, req.validated.body, actor(req), req) });
}

export async function clinics(req, res) {
  return sendList(res, await adminService.listClinics(req.validated.query), req);
}

export async function createClinic(req, res) {
  return res.status(201).json({ data: await adminService.saveClinic(null, { ...req.validated.body, isActive: true }, actor(req), req) });
}

export async function updateClinic(req, res) {
  return res.json({ data: await adminService.saveClinic(req.validated.params.clinicId, req.validated.body, actor(req), req) });
}

export async function services(req, res) {
  return sendList(res, await adminService.listServices(req.validated.query), req);
}

export async function createService(req, res) {
  return res.status(201).json({ data: await adminService.saveService(null, { ...req.validated.body, isActive: true }, actor(req), req) });
}

export async function updateService(req, res) {
  return res.json({ data: await adminService.saveService(req.validated.params.serviceId, req.validated.body, actor(req), req) });
}

export async function staff(req, res) {
  return sendList(res, await adminService.listAccounts('staff', req.validated.query), req);
}

export async function createStaff(req, res) {
  return res.status(201).json({ data: await adminService.createAccount('staff', req.validated.body, actor(req), req) });
}

export async function updateStaff(req, res) {
  return res.json({ data: await adminService.updateAccount('staff', req.validated.params.userId, req.validated.body, actor(req), req) });
}

export async function receptionists(req, res) {
  return sendList(res, await adminService.listAccounts('receptionist', req.validated.query), req);
}

export async function createReceptionist(req, res) {
  return res.status(201).json({ data: await adminService.createAccount('receptionist', req.validated.body, actor(req), req) });
}

export async function updateReceptionist(req, res) {
  return res.json({ data: await adminService.updateAccount('receptionist', req.validated.params.userId, req.validated.body, actor(req), req) });
}

export async function appointments(req, res) {
  return sendList(res, await adminService.listAppointments(req.validated.query), req);
}

export async function appointment(req, res) {
  return res.json({ data: await adminService.getAppointment(req.validated.params.appointmentId) });
}

export async function reports(req, res) {
  return res.json({ data: await adminService.getReports(req.validated.query) });
}

export async function activityLogs(req, res) {
  return sendList(res, await adminService.listActivityLogs(req.validated.query), req);
}

export async function supportTickets(req, res) {
  const result = await supportService.listStaffTickets(req.validated.query, null);
  return res.json({
    data: result.tickets,
    pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset },
  });
}

export async function supportTicket(req, res) {
  return res.json({ data: await supportService.getStaffTicket(req.validated.params.ticketId) });
}

export async function replySupportTicket(req, res) {
  const data = await supportService.replyAsStaff(req.user, req.validated.params.ticketId, req.validated.body.message, req);
  return res.json({ data });
}

export async function updateSupportTicketStatus(req, res) {
  const data = await supportService.setTicketStatus(req.validated.params.ticketId, req.validated.body.status, req.user, req);
  return res.json({ data });
}

export async function assignSupportTicket(req, res) {
  const data = await supportService.assignTicket(
    req.validated.params.ticketId,
    req.validated.body.assignedStaffId,
    req.user,
    req,
  );
  return res.json({ data });
}

export async function supportStaff(req, res) {
  return res.json({ data: await supportService.listStaff() });
}

export async function schedules(req, res) {
  return res.json({ data: await adminScheduleService.listSchedules(req.validated.query) });
}

export async function scheduleDoctors(req, res) {
  return res.json({ data: await adminScheduleService.listScheduleDoctors() });
}

export async function createWeeklySchedule(req, res) {
  return res.status(201).json({
    data: await adminScheduleService.createWeekly(req.validated.body, actor(req), req),
  });
}

export async function updateWeeklySchedule(req, res) {
  return res.json({
    data: await adminScheduleService.updateWeekly(
      req.validated.params.availabilityId,
      req.validated.body,
      actor(req),
      req,
    ),
  });
}

export async function createScheduleException(req, res) {
  return res.status(201).json({
    data: await adminScheduleService.createException(req.validated.body, actor(req), req),
  });
}

export async function updateScheduleException(req, res) {
  return res.json({
    data: await adminScheduleService.updateException(
      req.validated.params.exceptionId,
      req.validated.body,
      actor(req),
      req,
    ),
  });
}

export async function deleteScheduleException(req, res) {
  return res.json({
    data: await adminScheduleService.deleteException(req.validated.params.exceptionId, actor(req), req),
  });
}
