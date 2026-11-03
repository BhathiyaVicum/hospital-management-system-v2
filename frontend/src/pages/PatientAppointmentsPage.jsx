import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { getMyAppointments } from '../services/api';

const appointmentTabs = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past Visits'],
  ['cancelled', 'Cancelled'],
];

function formatAppointmentDate(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timeZone || 'Asia/Colombo',
  }).format(new Date(value));
}

export default function PatientAppointmentsPage() {
  const [view, setView] = useState('upcoming');
  const [filters, setFilters] = useState({ search: '', clinic: '', date: '', sort: 'newest' });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMyAppointments({ view, ...filters, limit: 100 })
      .then(({ data }) => {
        if (active) {
          setAppointments(data || []);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your appointments.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [view, filters]);

  const resetFilters = () => setFilters({ search: '', clinic: '', date: '', sort: 'newest' });

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PortalHeading
          eyebrow="Patient portal"
          title="My Appointments"
          description="Review your upcoming visits and keep track of your care history."
          actions={<Link to="/doctors" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><span className="material-symbols-outlined text-lg">add</span>Book an Appointment</Link>}
        />

        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-container p-1">
          {appointmentTabs.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setView(value)} aria-pressed={view === value} className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${view === value ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {label}
            </button>
          ))}
        </div>

        <section className="mb-6 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <label className="md:col-span-4">
              <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Search doctor or clinic</span>
              <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Doctor or clinic name" className="h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="md:col-span-3">
              <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Clinic / location</span>
              <input value={filters.clinic} onChange={(event) => setFilters((current) => ({ ...current, clinic: event.target.value }))} placeholder="Clinic or city" className="h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Appointment date</span>
              <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30" />
            </label>
            <label className="md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Sort by</span>
              <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))} className="h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/30">
                <option value="newest">Most recent</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <button type="button" onClick={resetFilters} className="h-11 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-surface-container md:col-span-1">Reset</button>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)]">
          <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-on-surface">{appointmentTabs.find(([value]) => value === view)?.[1]}</h2>
              <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">{appointments.length} visits</span>
            </div>
            {loading ? (
              <div className="py-12 text-center text-sm text-on-surface-variant">Loading appointments...</div>
            ) : error ? (
              <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
            ) : appointments.length ? (
              <div className="space-y-4">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {appointment.doctor_image ? (
                        <img src={appointment.doctor_image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container text-primary"><span className="material-symbols-outlined text-3xl">person</span></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-on-surface">{appointment.doctor_name}</h3>
                            <p className="text-sm text-primary">{appointment.doctor_title}</p>
                          </div>
                          <StatusBadge status={appointment.status} />
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-on-surface-variant sm:grid-cols-2">
                          <p className="flex items-center gap-2"><span className="material-symbols-outlined text-lg text-primary">calendar_month</span>{formatAppointmentDate(appointment.scheduled_start, appointment.time_zone)}</p>
                          <p className="flex items-center gap-2"><span className="material-symbols-outlined text-lg text-primary">location_on</span>{[appointment.clinic_name, appointment.clinic_city].filter(Boolean).join(' · ') || 'Clinic details not listed'}</p>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                          <Link to={`/appointments/${appointment.id}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container">View Details</Link>
                          {appointment.can_cancel && (
                            <>
                              <Link to={`/appointments/${appointment.id}/reschedule`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container">Reschedule</Link>
                              <Link to={`/appointments/${appointment.id}`} state={{ confirmCancel: true }} className="rounded-lg px-4 py-2 text-sm font-semibold text-error hover:bg-error-container/40">Cancel Visit</Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-low px-5 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-primary">event_note</span>
                <h3 className="mt-3 font-semibold text-on-surface">No {view === 'upcoming' ? 'upcoming' : view} appointments found</h3>
                <p className="mt-1 text-sm text-on-surface-variant">Your appointment history will appear here.</p>
                {view === 'upcoming' && <Link to="/doctors" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary">Find a doctor</Link>}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container/15 text-primary"><span className="material-symbols-outlined">support_agent</span></span>
              <h2 className="mt-4 text-lg font-semibold text-on-surface">Need assistance?</h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Contact the support team if you have a question about a visit or need help managing an appointment.</p>
              <Link to="/support" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Go to Support Center</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
