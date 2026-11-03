import * as supportService from '../services/supportService.js';

export async function createPatientTicket(req, res) {
  const data = await supportService.createPatientTicket(req.user, req.validated.body);
  return res.status(201).json({ data });
}

export async function listPatientTickets(req, res) {
  const result = await supportService.listPatientTickets(req.user.patient_id, req.validated.query);
  return res.json({ data: result.tickets, pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset } });
}

export async function getPatientTicket(req, res) {
  const data = await supportService.getPatientTicket(req.user.patient_id, req.validated.params.ticketId);
  return res.json({ data });
}

export async function replyAsPatient(req, res) {
  const data = await supportService.replyAsPatient(req.user, req.validated.params.ticketId, req.validated.body.message);
  return res.json({ data });
}

export async function getStaffDashboard(req, res) {
  const data = await supportService.getStaffDashboard();
  return res.json({ data });
}

export async function listStaffTickets(req, res) {
  const result = await supportService.listStaffTickets(req.validated.query, req.user.id);
  return res.json({ data: result.tickets, pagination: { total: result.total, limit: req.validated.query.limit, offset: req.validated.query.offset } });
}

export async function getStaffTicket(req, res) {
  const data = await supportService.getStaffTicket(req.validated.params.ticketId);
  return res.json({ data });
}

export async function replyAsStaff(req, res) {
  const data = await supportService.replyAsStaff(req.user, req.validated.params.ticketId, req.validated.body.message, req);
  return res.json({ data });
}

export async function updateTicketStatus(req, res) {
  const data = await supportService.setTicketStatus(req.validated.params.ticketId, req.validated.body.status, req.user, req);
  return res.json({ data });
}

export async function updateTicketAssignment(req, res) {
  const data = await supportService.assignTicket(
    req.validated.params.ticketId,
    req.validated.body.assignedStaffId,
    req.user,
    req,
  );
  return res.json({ data });
}

export async function listStaff(req, res) {
  return res.json({ data: await supportService.listStaff() });
}
