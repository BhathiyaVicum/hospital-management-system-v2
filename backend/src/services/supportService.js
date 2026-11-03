import * as supportRepository from '../repositories/supportRepository.js';
import { recordActivity } from './auditService.js';

function requirePatientId(patientId) {
  if (patientId) return;
  const error = new Error('A patient account is required to access support tickets.');
  error.status = 403;
  throw error;
}

function notFound() {
  const error = new Error('Support ticket not found.');
  error.status = 404;
  return error;
}

export async function createPatientTicket(user, payload) {
  requirePatientId(user.patient_id);
  const result = await supportRepository.createPatientTicket({
    patientId: user.patient_id,
    userId: user.id,
    ...payload,
  });
  if (result.invalidAppointment) {
    const error = new Error('The linked appointment was not found.');
    error.status = 400;
    throw error;
  }
  return result.ticket;
}

export async function listPatientTickets(patientId, filters) {
  requirePatientId(patientId);
  return supportRepository.listTickets({ ...filters, patientId });
}

export async function getPatientTicket(patientId, ticketId) {
  requirePatientId(patientId);
  const ticket = await supportRepository.getPatientTicket(patientId, ticketId);
  if (!ticket) throw notFound();
  return ticket;
}

export async function replyAsPatient(user, ticketId, message) {
  requirePatientId(user.patient_id);
  const result = await supportRepository.addTicketMessage({
    ticketId, userId: user.id, role: 'patient', patientId: user.patient_id, message,
  });
  if (!result) throw notFound();
  if (result.closed) {
    const error = new Error('This ticket is closed and cannot receive further replies.');
    error.status = 409;
    throw error;
  }
  return result.ticket;
}

export async function getStaffDashboard() {
  return supportRepository.getStaffDashboard();
}

export async function listStaffTickets(filters, staffId) {
  return supportRepository.listTickets(filters, staffId);
}

export async function getStaffTicket(ticketId) {
  const ticket = await supportRepository.getStaffTicket(ticketId);
  if (!ticket) throw notFound();
  return ticket;
}

export async function replyAsStaff(user, ticketId, message, request) {
  const result = await supportRepository.addTicketMessage({
    ticketId, userId: user.id, role: 'staff', message,
  });
  if (!result) throw notFound();
  if (result.closed) {
    const error = new Error('This ticket cannot receive further replies.');
    error.status = 409;
    throw error;
  }
  await recordActivity({
    actor: { id: user.id, role: user.role },
    eventType: 'support.ticket.replied',
    request,
    details: { ticketId },
  });
  return result.ticket;
}

export async function setTicketStatus(ticketId, status, user = null, request = null) {
  const result = await supportRepository.updateTicketStatus(ticketId, status);
  if (!result) throw notFound();
  if (result.invalidTransition) {
    const error = new Error(`Ticket status cannot transition from ${result.currentStatus} to ${status}.`);
    error.status = 409;
    throw error;
  }
  if (user) {
    await recordActivity({
      actor: { id: user.id, role: user.role },
      eventType: 'support.ticket.status_changed',
      request,
      details: { ticketId, status },
    });
  }
  return result.ticket;
}

export async function assignTicket(ticketId, staffId, user = null, request = null) {
  const result = await supportRepository.updateTicketAssignment(ticketId, staffId);
  if (!result) throw notFound();
  if (result.invalidStaff) {
    const error = new Error('The selected support staff account is not active.');
    error.status = 400;
    throw error;
  }
  if (user) {
    await recordActivity({
      actor: { id: user.id, role: user.role },
      targetUserId: staffId,
      eventType: 'support.ticket.assigned',
      request,
      details: { ticketId },
    });
  }
  return result.ticket;
}

export async function listStaff() {
  return supportRepository.listAvailableStaff();
}
