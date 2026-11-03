import * as doctorsService from '../services/doctorsService.js';

export async function list(req, res) {
  return res.json(await doctorsService.listDoctors(req.validated.query));
}

export async function getById(req, res) {
  const doctor = await doctorsService.getDoctor(req.validated.params.doctorId);
  if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });
  return res.json({ data: doctor });
}

export async function availability(req, res) {
  const result = await doctorsService.getAvailability(req.validated.params.doctorId);
  if (!result) return res.status(404).json({ message: 'Doctor not found.' });
  return res.json({ data: result });
}

export async function specialties(req, res) {
  return res.json({ data: await doctorsService.listSpecialties() });
}

export async function clinics(req, res) {
  return res.json({ data: await doctorsService.listClinics() });
}
