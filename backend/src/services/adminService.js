import bcrypt from 'bcryptjs';
import * as adminRepository from '../repositories/adminRepository.js';
import { recordActivity } from './auditService.js';

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function notFound() {
  return httpError('The requested record was not found.', 404);
}

async function validateReferences(references) {
  if (!await adminRepository.validateReferences(references)) {
    throw httpError('One or more selected clinics, specialties, or doctors are not active or do not exist.', 400);
  }
}

export async function getDashboard() {
  return adminRepository.getDashboard();
}

export async function listPatients(filters) {
  return adminRepository.listPatients(filters);
}

export async function getPatient(patientId) {
  const patient = await adminRepository.getPatient(patientId);
  if (!patient) throw notFound();
  return patient;
}

export async function updatePatient(patientId, payload, actor, request) {
  const patient = await adminRepository.updatePatient(patientId, payload);
  if (!patient) throw notFound();
  await recordActivity({
    actor,
    targetUserId: patient.id,
    eventType: 'patient.updated',
    request,
    details: { patientId: patient.patientId, isActive: patient.isActive },
  });
  return patient;
}

export async function listDoctors(filters) {
  return adminRepository.listDoctors(filters);
}

export async function getDoctor(doctorId) {
  const doctor = await adminRepository.getDoctor(doctorId);
  if (!doctor) throw notFound();
  return doctor;
}

export async function createDoctor(payload, actor, request) {
  await validateReferences({ clinicId: payload.clinicId, specialtyIds: payload.specialtyIds });
  const doctor = await adminRepository.createDoctor({
    ...payload,
    passwordHash: await bcrypt.hash(payload.password, 12),
  });
  await recordActivity({
    actor, targetUserId: doctor.userId, eventType: 'doctor.created', request,
    details: { doctorId: doctor.id },
  });
  return { id: doctor.id };
}

export async function updateDoctor(doctorId, payload, actor, request) {
  await validateReferences({ clinicId: payload.clinicId, specialtyIds: payload.specialtyIds });
  const doctor = await adminRepository.updateDoctor(doctorId, payload);
  if (!doctor) throw notFound();
  const detail = await adminRepository.getDoctor(doctorId);
  await recordActivity({
    actor, targetUserId: detail.userId, eventType: 'doctor.updated', request,
    details: { doctorId, isActive: payload.isActive, acceptingAppointments: payload.acceptingAppointments },
  });
  return detail;
}

export async function listClinics(filters) {
  return adminRepository.listClinics(filters);
}

export async function saveClinic(clinicId, payload, actor, request) {
  const clinic = await adminRepository.saveClinic(clinicId, payload);
  if (!clinic) throw notFound();
  await recordActivity({
    actor, eventType: clinicId ? 'clinic.updated' : 'clinic.created', request,
    details: { clinicId: clinic.id, isActive: clinic.isActive },
  });
  return clinic;
}

export async function listServices(filters) {
  return adminRepository.listServices(filters);
}

export async function saveService(serviceId, payload, actor, request) {
  await validateReferences({ clinicIds: payload.clinicIds, doctorIds: payload.doctorIds });
  const service = await adminRepository.saveService(serviceId, payload);
  if (!service) throw notFound();
  await recordActivity({
    actor, eventType: serviceId ? 'service.updated' : 'service.created', request,
    details: { serviceId: service.id, isActive: payload.isActive ?? true },
  });
  return service;
}

export async function listAccounts(role, filters) {
  return adminRepository.listAccounts(role, filters);
}

export async function createAccount(role, payload, actor, request) {
  const account = await adminRepository.createAccount({
    ...payload,
    role,
    passwordHash: await bcrypt.hash(payload.password, 12),
  });
  await recordActivity({
    actor, targetUserId: account.id, request,
    eventType: `${role}.created`,
    details: { role },
  });
  return account;
}

export async function updateAccount(role, userId, payload, actor, request) {
  if (actor.id === userId && !payload.isActive) {
    throw httpError('You cannot deactivate your own administrator account.', 409);
  }
  const account = await adminRepository.updateAccount(userId, role, payload);
  if (!account) throw notFound();
  await recordActivity({
    actor, targetUserId: account.id, request,
    eventType: `${role}.updated`,
    details: { role, isActive: account.isActive },
  });
  return account;
}

export async function listAppointments(filters) {
  return adminRepository.listAppointments(filters);
}

export async function getAppointment(appointmentId) {
  const appointment = await adminRepository.getAppointment(appointmentId);
  if (!appointment) throw notFound();
  return appointment;
}

export async function getReports(filters) {
  return adminRepository.getReports(filters);
}

export async function listActivityLogs(filters) {
  return adminRepository.listActivityLogs(filters);
}

export async function getLookups() {
  return adminRepository.getLookups();
}
