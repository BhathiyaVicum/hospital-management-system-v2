import * as doctorsRepository from '../repositories/doctorsRepository.js';

function formatFee(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
}

function presentDoctor(doctor) {
  const { consultation_fee: fee, currency, years_of_experience: years, ...fields } = doctor;
  return {
    ...fields,
    experience: years === null || years === undefined ? 'Experience not listed' : `${years} years`,
    consultationFee: formatFee(fee, currency),
    specialties: (doctor.specialties || []).map((specialty) => (
      typeof specialty === 'string' ? specialty : specialty.name
    )),
  };
}

export async function listDoctors(filters) {
  const result = await doctorsRepository.listDoctors(filters);
  return {
    data: result.doctors.map((doctor) => presentDoctor({
      ...doctor,
      currency: doctor.currency || 'USD',
    })),
    pagination: {
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    },
  };
}

export async function getDoctor(doctorId) {
  const doctor = await doctorsRepository.getDoctorById(doctorId);
  if (!doctor) return null;
  const slots = await doctorsRepository.getAvailabilitySlots(doctorId);
  return {
    ...presentDoctor(doctor),
    languages: doctor.languages || [],
    education: doctor.education || '',
    nextAvailable: slots[0]?.day ? `${slots[0].day} · ${slots[0].time}` : 'No upcoming appointments',
  };
}

export async function listSpecialties() {
  return doctorsRepository.listSpecialties();
}

export async function listClinics() {
  return doctorsRepository.listClinics();
}

export async function getAvailability(doctorId) {
  const doctor = await doctorsRepository.getDoctorById(doctorId);
  if (!doctor) return null;
  return {
    doctorId,
    doctorName: doctor.name,
    timeZone: doctor.time_zone,
    slots: await doctorsRepository.getAvailabilitySlots(doctorId),
  };
}
