import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { getPatientDashboard } from '../services/api';

function formatAppointmentDate(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Colombo',
  }).format(new Date(value));
}

function displayName(profile) {
  return profile?.name?.trim().split(/\s+/)[0] || 'there';
}

export default function PatientDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPatientDashboard()
      .then(({ data }) => {
        if (active) setDashboard(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading your care dashboard...</div>;
  if (error) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error}</div>;
  if (!dashboard) return null;

  const { profile, appointments, support } = dashboard;
  const upcoming = appointments.upcoming[0];

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PortalHeading
          eyebrow="Patient portal"
          title={`Good day, ${displayName(profile)}`}
          description="Manage your appointments, care preferences, and support requests from one place."
          actions={(
            <>
              <Link to="/doctors" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container">
                <span className="material-symbols-outlined text-lg">add</span>Book an Appointment
              </Link>
              <Link to="/support" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container">
                <span className="material-symbols-outlined text-lg">support_agent</span>Get Help
              </Link>
            </>
          )}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,0.8fr)]">
          <section className="overflow-hidden rounded-3xl bg-primary p-6 text-on-primary shadow-md sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-on-primary/80">{upcoming ? 'Your next appointment' : 'Your care at a glance'}</p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">
                  {upcoming ? `Visit with ${upcoming.doctorName}` : 'Your next step starts here'}
                </h2>
                {upcoming ? (
                  <>
                    <p className="mt-3 text-sm text-on-primary/85">{formatAppointmentDate(upcoming.scheduledStart, upcoming.timeZone)}</p>
                    <p className="mt-1 text-sm text-on-primary/85">{[upcoming.clinicName, upcoming.clinicCity].filter(Boolean).join(' · ') || 'Clinic details not listed'}</p>
                    <div className="mt-4"><StatusBadge status={upcoming.status} /></div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-on-primary/85">Find a doctor and choose an appointment time that works for you.</p>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-center">
                <span className="material-symbols-outlined text-7xl text-on-primary/90">event_available</span>
              </div>
            </div>
            {upcoming && (
              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/20 pt-5">
                <Link to={`/appointments/${upcoming.id}`} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary hover:bg-surface-container-low">View appointment</Link>
                <Link to="/appointments" className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-white/10">All appointments</Link>
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-surface-container-lowest p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-on-surface">Your care record</h2>
              <Link to="/profile" aria-label="View patient profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/15 text-primary">
                <span className="material-symbols-outlined">person</span>
              </Link>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{profile.name}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Upcoming', appointments.summary.upcoming, 'calendar_month'],
                ['Past visits', appointments.summary.past, 'history'],
                ['Cancelled', appointments.summary.cancelled, 'event_busy'],
                ['Support requests', support.total, 'support_agent'],
              ].map(([label, count, icon]) => (
                <div key={label} className="rounded-xl bg-surface-container-low p-3">
                  <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
                  <div className="mt-1 text-xl font-semibold text-on-surface">{count}</div>
                  <div className="text-xs text-on-surface-variant">{label}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Quick access</p>
              <h2 className="mt-1 text-2xl font-semibold text-on-surface">What would you like to do?</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Find a Doctor', 'Search specialties and clinic locations', 'search', '/doctors'],
              ['My Appointments', 'See upcoming and past visits', 'calendar_month', '/appointments'],
              ['Patient Profile', 'Update your contact and care details', 'account_circle', '/profile'],
              ['Support Center', 'Send a request or follow up', 'support_agent', '/support'],
            ].map(([title, detail, icon, to]) => (
              <Link key={to} to={to} className="group rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/15 text-primary">
                  <span className="material-symbols-outlined">{icon}</span>
                </span>
                <h3 className="mt-4 font-semibold text-on-surface group-hover:text-primary">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Appointments</p>
              <h2 className="mt-1 text-2xl font-semibold text-on-surface">Upcoming visits</h2>
            </div>
            <Link to="/appointments" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>
          {appointments.upcoming.length ? (
            <div className="divide-y divide-slate-100">
              {appointments.upcoming.map((appointment) => (
                <Link key={appointment.id} to={`/appointments/${appointment.id}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {appointment.doctorImage ? (
                      <img src={appointment.doctorImage} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-primary"><span className="material-symbols-outlined">person</span></span>
                    )}
                    <div>
                      <h3 className="font-semibold text-on-surface">{appointment.doctorName}</h3>
                      <p className="text-sm text-on-surface-variant">{[appointment.clinicName, appointment.clinicCity].filter(Boolean).join(' · ') || 'Clinic details not listed'}</p>
                    </div>
                  </div>
                  <div className="text-sm text-on-surface-variant">{formatAppointmentDate(appointment.scheduledStart, appointment.timeZone)}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-container-low p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-primary">event_note</span>
              <p className="mt-2 font-semibold text-on-surface">No upcoming appointments</p>
              <p className="mt-1 text-sm text-on-surface-variant">Appointments you book will appear here.</p>
              <Link to="/doctors" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Find a doctor</Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
