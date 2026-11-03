import * as patientsRepository from '../repositories/patientsRepository.js';

function presentProfile(profile) {
  const nameParts = profile.name.trim().split(/\s+/);
  return {
    ...profile,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' '),
  };
}

function requirePatientId(patientId) {
  if (patientId) return;
  const error = new Error('A patient account is required to access this resource.');
  error.status = 403;
  throw error;
}

export async function getProfile(userId, patientId) {
  requirePatientId(patientId);
  const profile = await patientsRepository.getPatientProfile(userId);
  if (!profile) {
    const error = new Error('Patient profile not found.');
    error.status = 404;
    throw error;
  }
  return presentProfile(profile);
}

export async function updateProfile(userId, patientId, payload) {
  requirePatientId(patientId);
  if (payload.preferredClinicId) {
    const clinics = await patientsRepository.listPatientClinics();
    if (!clinics.some((clinic) => clinic.id === payload.preferredClinicId)) {
      const error = new Error('Select an active clinic.');
      error.status = 400;
      throw error;
    }
  }
  const profile = await patientsRepository.updatePatientProfile(userId, payload);
  if (!profile) {
    const error = new Error('Patient profile not found.');
    error.status = 404;
    throw error;
  }
  return presentProfile(profile);
}

export async function getDashboard(userId, patientId) {
  requirePatientId(patientId);
  const dashboard = await patientsRepository.getPatientDashboard(userId, patientId);
  if (!dashboard.profile) {
    const error = new Error('Patient profile not found.');
    error.status = 404;
    throw error;
  }
  return dashboard;
}
