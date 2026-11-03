import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import { getDoctorWorkspaceAppointments, getDoctorWorkspaceDashboard } from '../services/api';

const cardClass = 'rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200';

export default function DoctorDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDoctorWorkspaceDashboard(),
      getDoctorWorkspaceAppointments({ from: new Date().toISOString().slice(0, 10), limit: 6 }),
    ]).then(([summary, upcoming]) => {
      if (!active) return;
      setDashboard(summary.data);
      setAppointments(upcoming.data || []);
    }).catch((requestError) => {
      if (active) setError(requestError.message || 'Unable to load your clinical workspace.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <WorkspaceLayout role="doctor">
      <PortalHeading
        eyebrow="Doctor workspace"
        title="Good day, Doctor"
        description="Review your upcoming patients, manage consultations, and keep your availability current."
        actions={<Link to="/doctor/appointments" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary">Open appointments</Link>}
      />
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="py-12 text-center text-on-surface-variant">Loading your workspace...</p> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Today’s appointments', dashboard?.todayAppointments, 'event'],
              ['Upcoming appointments', dashboard?.upcomingAppointments, 'calendar_month'],
              ['Patients waiting', dashboard?.awaitingPatients, 'groups'],
              ['In consultation', dashboard?.inConsultation, 'stethoscope'],
            ].map(([label, value, icon]) => (
              <article key={label} className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-on-surface-variant">{label}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container/20 text-primary">
                    <span className="material-symbols-outlined">{icon}</span>
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold">{value ?? 0}</p>
              </article>
            ))}
          </div>
          <section className={`${cardClass} mt-6`}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Your schedule</h2><p className="mt-1 text-sm text-on-surface-variant">Upcoming appointments across your assigned clinic.</p></div>
              <Link to="/doctor/schedules" className="text-sm font-semibold text-primary hover:underline">Manage availability</Link>
            </div>
            {appointments.length ? (
              <div className="divide-y divide-slate-100">
                {appointments.map((appointment) => (
                  <Link key={appointment.id} to="/doctor/appointments" className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0"><p className="font-semibold">{appointment.patientName}</p><p className="mt-1 text-sm text-on-surface-variant">{appointment.clinicName || 'Clinic'} · {appointment.workflowStatus.replaceAll('_', ' ')}</p></div>
                    <time className="shrink-0 text-sm font-medium text-primary">{new Date(appointment.scheduledStart).toLocaleString()}</time>
                  </Link>
                ))}
              </div>
            ) : <p className="rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">No appointments scheduled in this date range.</p>}
          </section>
        </>
      )}
    </WorkspaceLayout>
  );
}
