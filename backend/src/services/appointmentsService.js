import * as appointmentsRepository from '../repositories/appointmentsRepository.js';

export async function bookAppointment(patientId, payload) {
  if (!patientId) {
    const error = new Error('A patient account is required to book an appointment.');
    error.status = 403;
    throw error;
  }
  const result = await appointmentsRepository.createAppointment({
    patientId,
    doctorId: payload.doctorId,
    scheduledStart: payload.scheduledStart,
    reason: payload.reason,
  });
  if (result.unavailable) {
    const error = new Error('The selected appointment time is unavailable. Choose another date or time.');
    error.status = 409;
    throw error;
  }
  return result.appointment;
}

export async function listAppointments(patientId, filters) {
  if (!patientId) {
    const error = new Error('A patient account is required to view appointments.');
    error.status = 403;
    throw error;
  }
  return appointmentsRepository.listPatientAppointments(patientId, filters);
}

export async function getAppointment(patientId, appointmentId) {
  if (!patientId) {
    const error = new Error('A patient account is required to view appointments.');
    error.status = 403;
    throw error;
  }
  const appointment = await appointmentsRepository.getPatientAppointment(patientId, appointmentId);
  if (!appointment) {
    const error = new Error('Appointment not found.');
    error.status = 404;
    throw error;
  }
  return appointment;
}

export async function cancelAppointment(patientId, appointmentId, userId) {
  if (!patientId) {
    const error = new Error('A patient account is required to cancel appointments.');
    error.status = 403;
    throw error;
  }
  const appointment = await appointmentsRepository.cancelPatientAppointment(patientId, appointmentId, userId);
  if (!appointment) {
    const error = new Error('Appointment not found or it can no longer be cancelled.');
    error.status = 409;
    throw error;
  }
  return appointment;
}

export async function rescheduleAppointment(patientId, appointmentId, scheduledStart) {
  if (!patientId) {
    const error = new Error('A patient account is required to reschedule appointments.');
    error.status = 403;
    throw error;
  }
  const result = await appointmentsRepository.reschedulePatientAppointment(patientId, appointmentId, scheduledStart);
  if (result.unavailable) {
    const error = new Error('The appointment cannot be rescheduled to that time.');
    error.status = 409;
    throw error;
  }
  return result.appointment;
}
