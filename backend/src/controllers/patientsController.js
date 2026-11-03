import * as patientsService from '../services/patientsService.js';

export async function getMe(req, res) {
  const profile = await patientsService.getProfile(req.user.id, req.user.patient_id);
  return res.json({ data: profile });
}

export async function updateMe(req, res) {
  const profile = await patientsService.updateProfile(req.user.id, req.user.patient_id, req.validated.body);
  return res.json({ data: profile });
}

export async function dashboard(req, res) {
  const data = await patientsService.getDashboard(req.user.id, req.user.patient_id);
  return res.json({ data });
}
