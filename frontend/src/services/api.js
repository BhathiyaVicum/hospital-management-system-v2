const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function readPayload(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function request(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrfResponse = await fetch(`${API_BASE_URL}/auth/csrf`, { credentials: 'include' });
    const csrfPayload = await readPayload(csrfResponse);
    if (!csrfResponse.ok) {
      throw new Error(typeof csrfPayload === 'string' ? csrfPayload : csrfPayload?.message || 'Unable to initialize request security.');
    }
    headers['X-CSRF-Token'] = csrfPayload.csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && !['/auth/login', '/auth/me'].includes(endpoint)) {
    window.dispatchEvent(new CustomEvent('auth:session-expired'));
  }
  const payload = await readPayload(response);

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed.';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function getDoctors(filters = '') {
  const params = new URLSearchParams();
  if (typeof filters === 'string') {
    if (filters) params.set('specialty', filters);
  } else {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
  }
  return request(`/doctors${params.size ? `?${params.toString()}` : ''}`);
}

export function getDoctor(id) {
  return request(`/doctors/${encodeURIComponent(id)}`);
}

export function getSpecialties() {
  return request('/specialties');
}

export function getClinics() {
  return request('/clinics');
}

export function registerUser(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginUser(payload) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function logoutUser() {
  return request('/auth/logout', { method: 'POST' });
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function changePassword(payload) {
  return request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function getAdminDashboard() {
  return request('/admin/dashboard');
}

export function getAdminLookups() {
  return request('/admin/lookups');
}

function adminList(resource, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return request(`/admin/${resource}${params.size ? `?${params.toString()}` : ''}`);
}

export function getAdminPatients(filters) { return adminList('patients', filters); }
export function getAdminPatient(id) { return request(`/admin/patients/${encodeURIComponent(id)}`); }
export function updateAdminPatient(id, payload) {
  return request(`/admin/patients/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminDoctors(filters) { return adminList('doctors', filters); }
export function getAdminDoctor(id) { return request(`/admin/doctors/${encodeURIComponent(id)}`); }
export function createAdminDoctor(payload) {
  return request('/admin/doctors', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminDoctor(id, payload) {
  return request(`/admin/doctors/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminClinics(filters) { return adminList('clinics', filters); }
export function createAdminClinic(payload) {
  return request('/admin/clinics', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminClinic(id, payload) {
  return request(`/admin/clinics/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminServices(filters) { return adminList('services', filters); }
export function createAdminService(payload) {
  return request('/admin/services', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminService(id, payload) {
  return request(`/admin/services/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminStaff(filters) { return adminList('staff', filters); }
export function createAdminStaff(payload) {
  return request('/admin/staff', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminStaff(id, payload) {
  return request(`/admin/staff/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminReceptionists(filters) { return adminList('receptionists', filters); }
export function createAdminReceptionist(payload) {
  return request('/admin/receptionists', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminReceptionist(id, payload) {
  return request(`/admin/receptionists/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getAdminAppointments(filters) { return adminList('appointments', filters); }
export function getAdminAppointment(id) { return request(`/admin/appointments/${encodeURIComponent(id)}`); }
export function getAdminReports(filters) { return adminList('reports', filters); }
export function getAdminActivityLogs(filters) { return adminList('activity-logs', filters); }
export function getAdminSupportTickets(filters) { return adminList('support/tickets', filters); }
export function getAdminSupportTicket(id) { return request(`/admin/support/tickets/${encodeURIComponent(id)}`); }
export function getAdminSupportStaff() { return request('/admin/support/staff'); }
export function replyToAdminSupportTicket(id, message) {
  return request(`/admin/support/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
}
export function updateAdminSupportTicketStatus(id, status) {
  return request(`/admin/support/tickets/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export function assignAdminSupportTicket(id, assignedStaffId) {
  return request(`/admin/support/tickets/${encodeURIComponent(id)}/assignment`, { method: 'PATCH', body: JSON.stringify({ assignedStaffId }) });
}
export function getAdminScheduleDoctors() { return request('/admin/schedules/doctors'); }
export function getAdminSchedules(filters = {}) { return adminList('schedules', filters); }
export function createAdminWeeklySchedule(payload) {
  return request('/admin/schedules/weekly', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminWeeklySchedule(id, payload) {
  return request(`/admin/schedules/weekly/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function createAdminScheduleException(payload) {
  return request('/admin/schedules/exceptions', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateAdminScheduleException(id, payload) {
  return request(`/admin/schedules/exceptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function deleteAdminScheduleException(id) {
  return request(`/admin/schedules/exceptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

function workspaceList(path, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  });
  return request(`${path}${params.size ? `?${params.toString()}` : ''}`);
}

export function getDoctorWorkspaceDashboard() { return request('/doctor/dashboard'); }
export function getDoctorWorkspaceProfile() { return request('/doctor/profile'); }
export function updateDoctorWorkspaceProfile(payload) {
  return request('/doctor/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getDoctorWorkspaceAppointments(filters = {}) { return workspaceList('/doctor/appointments', filters); }
export function getDoctorWorkspaceAppointment(id) { return request(`/doctor/appointments/${encodeURIComponent(id)}`); }
export function updateDoctorAppointmentWorkflow(id, workflowStatus) {
  return request(`/doctor/appointments/${encodeURIComponent(id)}/workflow`, {
    method: 'PATCH', body: JSON.stringify({ workflowStatus }),
  });
}
export function getDoctorConsultation(id) { return request(`/doctor/appointments/${encodeURIComponent(id)}/consultation`); }
export function saveDoctorConsultation(id, payload) {
  return request(`/doctor/appointments/${encodeURIComponent(id)}/consultation`, { method: 'PUT', body: JSON.stringify(payload) });
}
export function getDoctorWorkspaceSchedules(filters = {}) { return workspaceList('/doctor/schedules', filters); }
export function getDoctorScheduleCalendar(filters = {}) { return workspaceList('/doctor/schedules/calendar', filters); }
export function saveDoctorDateSchedule(date, payload) {
  return request(`/doctor/schedules/dates/${encodeURIComponent(date)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
export function createDoctorWeeklySchedule(payload) {
  return request('/doctor/schedules/weekly', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateDoctorWeeklySchedule(id, payload) {
  return request(`/doctor/schedules/weekly/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function createDoctorScheduleException(payload) {
  return request('/doctor/schedules/exceptions', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateDoctorScheduleException(id, payload) {
  return request(`/doctor/schedules/exceptions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function deleteDoctorScheduleException(id) {
  return request(`/doctor/schedules/exceptions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getReceptionistDashboard() { return request('/receptionist/dashboard'); }
export function getReceptionistProfile() { return request('/receptionist/profile'); }
export function updateReceptionistProfile(payload) {
  return request('/receptionist/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getReceptionistClinics() { return request('/receptionist/clinics'); }
export function getReceptionistPatients(filters = {}) { return workspaceList('/receptionist/patients', filters); }
export function registerReceptionistPatient(payload) {
  return request('/receptionist/patients', { method: 'POST', body: JSON.stringify(payload) });
}
export function linkReceptionistPatient(payload) {
  return request('/receptionist/patients/link', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateReceptionistPatient(id, payload) {
  return request(`/receptionist/patients/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function getReceptionistDoctors(clinicId) {
  return workspaceList('/receptionist/doctors', { clinicId });
}
export function getReceptionistDoctorSlots(doctorId, clinicId, date) {
  return workspaceList(`/receptionist/doctors/${encodeURIComponent(doctorId)}/slots`, { clinicId, date });
}
export function getReceptionistAppointments(filters = {}) { return workspaceList('/receptionist/appointments', filters); }
export function getReceptionistAppointment(id) { return request(`/receptionist/appointments/${encodeURIComponent(id)}`); }
export function createReceptionistAppointment(payload) {
  return request('/receptionist/appointments', { method: 'POST', body: JSON.stringify(payload) });
}
export function rescheduleReceptionistAppointment(id, payload) {
  return request(`/receptionist/appointments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) });
}
export function cancelReceptionistAppointment(id) {
  return request(`/receptionist/appointments/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
}
export function updateReceptionistAppointmentWorkflow(id, workflowStatus) {
  return request(`/receptionist/appointments/${encodeURIComponent(id)}/workflow`, {
    method: 'PATCH', body: JSON.stringify({ workflowStatus }),
  });
}

export function getPatientProfile() {
  return request('/patients/me');
}

export function updatePatientProfile(payload) {
  return request('/patients/me', { method: 'PATCH', body: JSON.stringify(payload) });
}

export function getPatientDashboard() {
  return request('/patients/me/dashboard');
}

export function forgotPassword(payload) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function verifyResetCode(payload) {
  return request('/auth/verify-reset-code', { method: 'POST', body: JSON.stringify(payload) });
}

export function resendResetCode(payload) {
  return request('/auth/resend-reset-code', { method: 'POST', body: JSON.stringify(payload) });
}

export function resetPassword(payload) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) });
}

export function verifyEmail(payload) {
  return request('/auth/verify-email', { method: 'POST', body: JSON.stringify(payload) });
}

export function resendVerification(payload) {
  return request('/auth/resend-verification', { method: 'POST', body: JSON.stringify(payload) });
}

export function getAvailability(doctorId) {
  return request(`/doctors/${encodeURIComponent(doctorId)}/availability`);
}

export function bookAppointment(payload) {
  return request('/appointments', { method: 'POST', body: JSON.stringify(payload) });
}

export function getMyAppointments(filters = {}) {
  const params = new URLSearchParams(filters);
  return request(`/appointments${params.size ? `?${params.toString()}` : ''}`);
}

export function getAppointment(appointmentId) {
  return request(`/appointments/${encodeURIComponent(appointmentId)}`);
}

export function cancelAppointment(appointmentId) {
  return request(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, { method: 'PATCH' });
}

export function rescheduleAppointment(appointmentId, payload) {
  return request(`/appointments/${encodeURIComponent(appointmentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getPatientTickets(filters = {}) {
  const params = new URLSearchParams(filters);
  return request(`/support/tickets${params.size ? `?${params.toString()}` : ''}`);
}

export function createPatientTicket(payload) {
  return request('/support/tickets', { method: 'POST', body: JSON.stringify(payload) });
}

export function getPatientTicket(ticketId) {
  return request(`/support/tickets/${encodeURIComponent(ticketId)}`);
}

export function replyToPatientTicket(ticketId, message) {
  return request(`/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function getStaffSupportDashboard() {
  return request('/staff/support/dashboard');
}

export function getStaffTickets(filters = {}) {
  const params = new URLSearchParams(filters);
  return request(`/staff/support/tickets${params.size ? `?${params.toString()}` : ''}`);
}

export function getStaffTicket(ticketId) {
  return request(`/staff/support/tickets/${encodeURIComponent(ticketId)}`);
}

export function replyToStaffTicket(ticketId, message) {
  return request(`/staff/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function updateStaffTicketStatus(ticketId, status) {
  return request(`/staff/support/tickets/${encodeURIComponent(ticketId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateStaffTicketAssignment(ticketId, assignedStaffId) {
  return request(`/staff/support/tickets/${encodeURIComponent(ticketId)}/assignment`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedStaffId }),
  });
}

export function getSupportStaff() {
  return request('/staff/support/staff');
}

export default {
  getDoctors,
  getDoctor,
  getSpecialties,
  getClinics,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getPatientProfile,
  updatePatientProfile,
  getPatientDashboard,
  forgotPassword,
  verifyResetCode,
  resendResetCode,
  resetPassword,
  verifyEmail,
  resendVerification,
  getAvailability,
  bookAppointment,
  getMyAppointments,
  getAppointment,
  cancelAppointment,
  rescheduleAppointment,
  getPatientTickets,
  createPatientTicket,
  getPatientTicket,
  replyToPatientTicket,
  getStaffSupportDashboard,
  getStaffTickets,
  getStaffTicket,
  replyToStaffTicket,
  updateStaffTicketStatus,
  updateStaffTicketAssignment,
  getSupportStaff,
};
