import * as authService from './authService.js';
import * as appointmentRepository from '../repositories/appointmentsRepository.js';
import * as doctorRepository from '../repositories/doctorWorkspaceRepository.js';
import * as receptionistRepository from '../repositories/receptionistRepository.js';
import * as scheduleRepository from '../repositories/adminScheduleRepository.js';
import { recordActivity } from './auditService.js';

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function doctorIdFor(userId) {
  const doctorId = await doctorRepository.getDoctorId(userId);
  if (!doctorId) throw httpError('The signed-in account is not linked to a doctor profile.', 404);
  return doctorId;
}

export async function doctorDashboard(userId) {
  return doctorRepository.getDashboard(await doctorIdFor(userId));
}

export async function doctorProfile(userId) {
  const profile = await doctorRepository.getProfile(userId);
  if (!profile) throw httpError('Doctor profile not found.', 404);
  return profile;
}

export async function updateDoctorProfile(user, values, request) {
  const profile = await doctorRepository.updateProfile(user.id, values);
  if (!profile) throw httpError('Doctor profile not found.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'doctor.profile.updated',
    request,
  });
  return profile;
}

export async function doctorAppointments(userId, filters) {
  if (!['', 'scheduled', 'arrived', 'checked_in', 'waiting', 'in_consultation', 'completed', 'no_show'].includes(filters.status)) {
    throw httpError('Invalid appointment workflow status.', 400);
  }
  return doctorRepository.listAppointments(await doctorIdFor(userId), filters);
}

export async function doctorAppointment(userId, appointmentId) {
  const appointment = await doctorRepository.getAppointment(await doctorIdFor(userId), appointmentId);
  if (!appointment) throw httpError('Appointment not found.', 404);
  return appointment;
}

export async function updateDoctorWorkflow(user, appointmentId, workflowStatus, request) {
  const result = await doctorRepository.updateWorkflow(
    await doctorIdFor(user.id),
    appointmentId,
    workflowStatus,
    user.id,
  );
  if (result.notFound) throw httpError('Appointment not found.', 404);
  if (result.invalidTransition) {
    throw httpError(`Cannot change an appointment from ${result.currentStatus} to ${workflowStatus}.`, 409);
  }
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'doctor.appointment.workflow_changed',
    request,
    details: { appointmentId, workflowStatus },
  });
  return result.appointment;
}

export async function doctorConsultation(userId, appointmentId) {
  const doctorId = await doctorIdFor(userId);
  const appointment = await doctorRepository.getAppointment(doctorId, appointmentId);
  if (!appointment) throw httpError('Appointment not found.', 404);
  return {
    consultation: await doctorRepository.getConsultation(doctorId, appointmentId),
    revisions: await doctorRepository.listConsultationRevisions(doctorId, appointmentId),
  };
}

export async function saveDoctorConsultation(user, appointmentId, values, request) {
  const result = await doctorRepository.saveConsultation(
    await doctorIdFor(user.id),
    appointmentId,
    values,
  );
  if (!result) throw httpError('Consultation notes can only be saved for your in-progress or completed appointments.', 409);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'doctor.consultation.saved',
    request,
    details: { appointmentId },
  });
  return result;
}

export async function doctorSchedules(userId, range) {
  const doctorId = await doctorIdFor(userId);
  return scheduleRepository.listSchedules({ doctorId, ...range });
}

export async function createDoctorWeeklySchedule(user, values, request) {
  const doctorId = await doctorIdFor(user.id);
  const result = await scheduleRepository.createWeeklySchedule({ ...values, doctorId });
  await recordActivity({
    actor: { id: user.id, role: user.role }, targetUserId: user.id,
    eventType: 'doctor.schedule.created', request, details: { availabilityId: result.id },
  });
  return result;
}

export async function updateDoctorWeeklySchedule(user, availabilityId, values, request) {
  const doctorId = await doctorIdFor(user.id);
  const result = await scheduleRepository.updateWeeklySchedule(
    availabilityId,
    { ...values, doctorId },
    doctorId,
  );
  if (!result) throw httpError('The weekly availability entry was not found.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role }, targetUserId: user.id,
    eventType: 'doctor.schedule.updated', request, details: { availabilityId },
  });
  return result;
}

export async function createDoctorException(user, values, request) {
  const doctorId = await doctorIdFor(user.id);
  const result = await scheduleRepository.saveScheduleException({ ...values, doctorId });
  await recordActivity({
    actor: { id: user.id, role: user.role }, targetUserId: user.id,
    eventType: 'doctor.schedule_exception.saved', request, details: { exceptionId: result.id },
  });
  return result;
}

export async function updateDoctorException(user, exceptionId, values, request) {
  const doctorId = await doctorIdFor(user.id);
  const result = await scheduleRepository.updateScheduleException(exceptionId, values, doctorId);
  if (!result) throw httpError('The schedule exception was not found.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role }, targetUserId: user.id,
    eventType: 'doctor.schedule_exception.updated', request, details: { exceptionId },
  });
  return result;
}

export async function deleteDoctorException(user, exceptionId, request) {
  const doctorId = await doctorIdFor(user.id);
  const result = await scheduleRepository.deleteScheduleException(exceptionId, doctorId);
  if (!result) throw httpError('The schedule exception was not found.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role }, targetUserId: user.id,
    eventType: 'doctor.schedule_exception.removed', request, details: { exceptionId },
  });
  return result;
}

async function assignedClinicIds(userId) {
  const clinics = await receptionistRepository.listAssignedClinics(userId);
  if (!clinics.length) throw httpError('No active clinic locations are assigned to this receptionist account.', 403);
  return clinics.map((clinic) => clinic.id);
}

export async function receptionistClinics(userId) {
  return receptionistRepository.listAssignedClinics(userId);
}

export async function receptionistProfile(userId) {
  const profile = await receptionistRepository.getProfile(userId);
  if (!profile) throw httpError('Receptionist profile not found.', 404);
  return profile;
}

export async function updateReceptionistProfile(user, values, request) {
  const profile = await receptionistRepository.updateProfile(user.id, values);
  if (!profile) throw httpError('Receptionist profile not found.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'receptionist.profile.updated',
    request,
  });
  return profile;
}

export async function receptionistDashboard(userId) {
  const clinics = await receptionistRepository.listAssignedClinics(userId);
  const clinicIds = clinics.map((clinic) => clinic.id);
  return {
    counts: await receptionistRepository.getDashboard(clinicIds),
    clinics,
  };
}

export async function receptionistPatients(userId, search, pagination) {
  return receptionistRepository.searchPatients(await assignedClinicIds(userId), search, pagination);
}

export async function registerReceptionistPatient(user, values, request) {
  const clinicIds = await assignedClinicIds(user.id);
  if (!clinicIds.includes(values.clinicId)) throw httpError('This clinic is not assigned to your account.', 403);
  try {
    return await authService.registerPatientAtClinic({
      ...values,
      actor: { id: user.id, role: user.role },
      request,
    });
  } catch (error) {
    if (error.code === '23505') throw httpError('A patient account already uses this email address.', 409);
    throw error;
  }
}

export async function linkReceptionistPatient(user, { email, clinicId }, request) {
  const clinicIds = await assignedClinicIds(user.id);
  if (!clinicIds.includes(clinicId)) throw httpError('This clinic is not assigned to your account.', 403);
  const patient = await receptionistRepository.linkPatientByEmail(email, clinicId, user.id);
  if (!patient) throw httpError('No active patient account was found for that email address.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: patient.userId,
    eventType: 'receptionist.patient.linked_to_clinic',
    request,
    details: { patientId: patient.id, clinicId },
  });
  return patient;
}

export async function updateReceptionistPatient(user, patientId, values, request) {
  const result = await receptionistRepository.updatePatientContact(
    patientId,
    await assignedClinicIds(user.id),
    values,
  );
  if (!result) throw httpError('Patient not found at your assigned clinics.', 404);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    eventType: 'receptionist.patient.contact_updated',
    request,
    details: { patientId },
  });
  return result;
}

export async function receptionistDoctors(userId, clinicId) {
  const clinicIds = await assignedClinicIds(userId);
  if (!clinicIds.includes(clinicId)) throw httpError('This clinic is not assigned to your account.', 403);
  return receptionistRepository.listDoctors(clinicIds, clinicId);
}

export async function receptionistDoctorSlots(userId, clinicId, doctorId, date) {
  const clinicIds = await assignedClinicIds(userId);
  if (!clinicIds.includes(clinicId)) throw httpError('This clinic is not assigned to your account.', 403);
  const slots = await receptionistRepository.getDoctorSlots(clinicIds, clinicId, doctorId);
  if (!slots) throw httpError('Doctor not found at this clinic.', 404);
  return slots.filter((slot) => slot.date === date);
}

export async function receptionistAppointments(userId, filters) {
  const clinicIds = await assignedClinicIds(userId);
  if (filters.clinicId && !clinicIds.includes(filters.clinicId)) {
    throw httpError('This clinic is not assigned to your account.', 403);
  }
  if (!['', 'scheduled', 'arrived', 'checked_in', 'waiting', 'in_consultation', 'completed', 'no_show'].includes(filters.status)) {
    throw httpError('Invalid appointment workflow status.', 400);
  }
  return receptionistRepository.listAppointments(clinicIds, filters);
}

export async function receptionistAppointment(userId, appointmentId) {
  const appointment = await receptionistRepository.getAppointment(
    await assignedClinicIds(userId),
    appointmentId,
  );
  if (!appointment) throw httpError('Appointment not found at your assigned clinics.', 404);
  return appointment;
}

export async function bookReceptionistAppointment(user, values, request) {
  const clinicIds = await assignedClinicIds(user.id);
  if (!clinicIds.includes(values.clinicId)) throw httpError('This clinic is not assigned to your account.', 403);
  const result = await receptionistRepository.createAppointment({
    ...values,
    createdByUserId: user.id,
    clinicIds,
  });
  if (result.unavailable) throw httpError('The patient, clinic, doctor, or selected time is no longer available.', 409);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: values.patientId,
    eventType: values.isWalkIn ? 'receptionist.walk_in.booked' : 'receptionist.appointment.booked',
    request,
    details: { appointmentId: result.appointment.id, clinicId: values.clinicId, doctorId: values.doctorId },
  });
  return result.appointment;
}

export async function rescheduleReceptionistAppointment(user, appointmentId, scheduledStart, request) {
  const result = await appointmentRepository.rescheduleClinicAppointment({
    appointmentId,
    scheduledStart,
    userId: user.id,
    allowedClinicIds: await assignedClinicIds(user.id),
  });
  if (result.unavailable) throw httpError('The appointment cannot be rescheduled to that time.', 409);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    eventType: 'receptionist.appointment.rescheduled',
    request,
    details: { appointmentId },
  });
  return result.appointment;
}

export async function cancelReceptionistAppointment(user, appointmentId, request) {
  const result = await appointmentRepository.cancelClinicAppointment(
    appointmentId,
    user.id,
    await assignedClinicIds(user.id),
  );
  if (!result) throw httpError('Appointment not found or it can no longer be cancelled.', 409);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    eventType: 'receptionist.appointment.cancelled',
    request,
    details: { appointmentId },
  });
  return result;
}

export async function updateReceptionistWorkflow(user, appointmentId, workflowStatus, request) {
  const result = await receptionistRepository.updateWorkflow(
    await assignedClinicIds(user.id),
    appointmentId,
    workflowStatus,
    user.id,
  );
  if (result.notFound) throw httpError('Appointment not found at your assigned clinics.', 404);
  if (result.invalidTransition) {
    throw httpError(`Cannot change an appointment from ${result.currentStatus} to ${workflowStatus}.`, 409);
  }
  await recordActivity({
    actor: { id: user.id, role: user.role },
    eventType: 'receptionist.appointment.workflow_changed',
    request,
    details: { appointmentId, workflowStatus },
  });
  return result.appointment;
}
