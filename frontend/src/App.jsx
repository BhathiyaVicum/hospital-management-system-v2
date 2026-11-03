import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import FindDoctorPage from './pages/FindDoctorPage';
import SpecialistDirectoryPage from './pages/SpecialistDirectoryPage';
import DoctorProfileBookingPage from './pages/DoctorProfileBookingPage';
import SignInPage from './pages/SignInPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import RequireAuth from './components/auth/RequireAuth';
import PatientDashboardPage from './pages/PatientDashboardPage';
import PatientAppointmentsPage from './pages/PatientAppointmentsPage';
import AppointmentDetailsPage from './pages/AppointmentDetailsPage';
import AppointmentConfirmationPage from './pages/AppointmentConfirmationPage';
import RescheduleAppointmentPage from './pages/RescheduleAppointmentPage';
import PatientProfilePage from './pages/PatientProfilePage';
import PatientSupportPage from './pages/PatientSupportPage';
import PatientTicketDetailsPage from './pages/PatientTicketDetailsPage';
import StaffSupportPage from './pages/StaffSupportPage';
import StaffTicketDetailsPage from './pages/StaffTicketDetailsPage';
import BookAppointmentPage from './pages/BookAppointmentPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminRecordsPage = lazy(() => import('./pages/AdminRecordsPage'));
const AdminAppointmentsPage = lazy(() => import('./pages/AdminAppointmentsPage'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage'));
const AdminActivityLogsPage = lazy(() => import('./pages/AdminActivityLogsPage'));
const AdminSupportPage = lazy(() => import('./pages/AdminSupportPage'));
const AdminSchedulesPage = lazy(() => import('./pages/AdminSchedulesPage'));
const DoctorDashboardPage = lazy(() => import('./pages/DoctorDashboardPage'));
const DoctorAppointmentsPage = lazy(() => import('./pages/DoctorAppointmentsPage'));
const DoctorSchedulePage = lazy(() => import('./pages/DoctorSchedulePage'));
const ReceptionistDashboardPage = lazy(() => import('./pages/ReceptionistDashboardPage'));
const ReceptionistAppointmentsPage = lazy(() => import('./pages/ReceptionistAppointmentsPage'));
const ReceptionistPatientsPage = lazy(() => import('./pages/ReceptionistPatientsPage'));
const WorkspaceProfilePage = lazy(() => import('./pages/WorkspaceProfilePage'));

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleExpiredSession = () => {
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: {
            from: location,
            message: 'Your session has expired or is no longer active. Please sign in again.',
          },
        });
      }
    };
    window.addEventListener('auth:session-expired', handleExpiredSession);
    return () => window.removeEventListener('auth:session-expired', handleExpiredSession);
  }, [location, navigate]);

  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-on-surface-variant">Loading workspace...</div>}>
     <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/doctors" element={<FindDoctorPage />} />
          <Route path="/specialists" element={<SpecialistDirectoryPage />} />
          <Route path="/doctors/:doctorId" element={<DoctorProfileBookingPage />} />
          <Route path="/doctors/:doctorId/book" element={<RequireAuth roles={['patient']}><BookAppointmentPage /></RequireAuth>} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/change-password" element={<RequireAuth roles={['patient', 'doctor', 'staff', 'receptionist', 'admin']}><ChangePasswordPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth roles={['admin']}><Navigate to="/admin/dashboard" replace /></RequireAuth>} />
          <Route path="/admin/dashboard" element={<RequireAuth roles={['admin']}><AdminDashboardPage /></RequireAuth>} />
          <Route path="/admin/patients" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="patients" /></RequireAuth>} />
          <Route path="/admin/patients/:recordId" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="patients" /></RequireAuth>} />
          <Route path="/admin/doctors" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="doctors" /></RequireAuth>} />
          <Route path="/admin/doctors/:recordId" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="doctors" /></RequireAuth>} />
          <Route path="/admin/schedules" element={<RequireAuth roles={['admin']}><AdminSchedulesPage /></RequireAuth>} />
          <Route path="/admin/clinics" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="clinics" /></RequireAuth>} />
          <Route path="/admin/services" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="services" /></RequireAuth>} />
          <Route path="/admin/staff" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="staff" /></RequireAuth>} />
          <Route path="/admin/receptionists" element={<RequireAuth roles={['admin']}><AdminRecordsPage resource="receptionists" /></RequireAuth>} />
          <Route path="/admin/support" element={<RequireAuth roles={['admin']}><AdminSupportPage /></RequireAuth>} />
          <Route path="/admin/appointments" element={<RequireAuth roles={['admin']}><AdminAppointmentsPage /></RequireAuth>} />
          <Route path="/admin/reports" element={<RequireAuth roles={['admin']}><AdminReportsPage /></RequireAuth>} />
          <Route path="/admin/activity-logs" element={<RequireAuth roles={['admin']}><AdminActivityLogsPage /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth roles={['patient']}><PatientDashboardPage /></RequireAuth>} />
          <Route path="/appointments" element={<RequireAuth roles={['patient']}><PatientAppointmentsPage /></RequireAuth>} />
          <Route path="/appointments/:appointmentId" element={<RequireAuth roles={['patient']}><AppointmentDetailsPage /></RequireAuth>} />
          <Route path="/appointments/:appointmentId/confirmed" element={<RequireAuth roles={['patient']}><AppointmentConfirmationPage /></RequireAuth>} />
          <Route path="/appointments/:appointmentId/reschedule" element={<RequireAuth roles={['patient']}><RescheduleAppointmentPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth roles={['patient']}><PatientProfilePage /></RequireAuth>} />
          <Route path="/support" element={<RequireAuth roles={['patient']}><PatientSupportPage /></RequireAuth>} />
          <Route path="/support/tickets/:ticketId" element={<RequireAuth roles={['patient']}><PatientTicketDetailsPage /></RequireAuth>} />
          <Route path="/staff/support" element={<RequireAuth roles={['staff']}><StaffSupportPage /></RequireAuth>} />
          <Route path="/staff/support/tickets/:ticketId" element={<RequireAuth roles={['staff']}><StaffTicketDetailsPage /></RequireAuth>} />
          <Route path="/doctor" element={<RequireAuth roles={['doctor']}><Navigate to="/doctor/dashboard" replace /></RequireAuth>} />
          <Route path="/doctor/dashboard" element={<RequireAuth roles={['doctor']}><DoctorDashboardPage /></RequireAuth>} />
          <Route path="/doctor/appointments" element={<RequireAuth roles={['doctor']}><DoctorAppointmentsPage /></RequireAuth>} />
          <Route path="/doctor/schedules" element={<RequireAuth roles={['doctor']}><DoctorSchedulePage /></RequireAuth>} />
          <Route path="/doctor/profile" element={<RequireAuth roles={['doctor']}><WorkspaceProfilePage role="doctor" /></RequireAuth>} />
          <Route path="/receptionist" element={<RequireAuth roles={['receptionist']}><Navigate to="/receptionist/dashboard" replace /></RequireAuth>} />
          <Route path="/receptionist/dashboard" element={<RequireAuth roles={['receptionist']}><ReceptionistDashboardPage /></RequireAuth>} />
          <Route path="/receptionist/appointments" element={<RequireAuth roles={['receptionist']}><ReceptionistAppointmentsPage /></RequireAuth>} />
          <Route path="/receptionist/patients" element={<RequireAuth roles={['receptionist']}><ReceptionistPatientsPage /></RequireAuth>} />
          <Route path="/receptionist/profile" element={<RequireAuth roles={['receptionist']}><WorkspaceProfilePage role="receptionist" /></RequireAuth>} />
        </Routes>
     </AppLayout>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
