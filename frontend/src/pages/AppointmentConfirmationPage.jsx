import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import { getAppointment } from '../services/api';

function appointmentDate(value, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: timeZone || 'Asia/Colombo',
  }).format(new Date(value));
}

export default function AppointmentConfirmationPage() {
  const { appointmentId } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getAppointment(appointmentId)
      .then(({ data }) => { if (active) setAppointment(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load your booking confirmation.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointmentId]);

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(appointment.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Your browser did not allow copying the appointment reference.');
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading booking confirmation...</div>;
  if (error || !appointment) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error || 'Appointment not found.'}</div>;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant sm:gap-6">
          <span className="text-primary">1 · Choose a doctor</span><span aria-hidden="true">—</span><span className="text-primary">2 · Select a time</span><span aria-hidden="true">—</span><span className="text-primary">3 · Confirm</span>
        </div>
        <section className="overflow-hidden rounded-3xl bg-surface-container-lowest shadow-md ring-1 ring-slate-200">
          <div className="bg-primary px-6 py-10 text-center text-on-primary sm:px-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15"><span className="material-symbols-outlined text-4xl">check_circle</span></span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-on-primary/80">Booking confirmed</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Your appointment is booked</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-on-primary/85">Your appointment has been saved. Keep the reference below for your records.</p>
            <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5">
              <span className="font-mono text-sm">{appointment.id}</span>
              <button type="button" onClick={copyReference} aria-label="Copy booking reference" className="rounded p-1 hover:bg-white/15"><span className="material-symbols-outlined text-lg">{copied ? 'check' : 'content_copy'}</span></button>
              {copied && <span role="status" className="text-xs">Copied</span>}
            </div>
          </div>
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <PortalHeading eyebrow="Visit summary" title="Appointment details" />
              <div className="rounded-2xl bg-surface-container-low p-5">
                <div className="flex items-center gap-4">
                  {appointment.doctor_image ? <img src={appointment.doctor_image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container text-primary"><span className="material-symbols-outlined text-3xl">person</span></span>}
                  <div><h2 className="font-semibold text-on-surface">{appointment.doctor_name}</h2><p className="text-sm text-on-surface-variant">{appointment.doctor_title}</p></div>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Date &amp; time</dt><dd className="mt-1 text-sm font-medium text-on-surface">{appointmentDate(appointment.scheduled_start, appointment.time_zone)}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Clinic</dt><dd className="mt-1 text-sm font-medium text-on-surface">{[appointment.clinic_name, appointment.clinic_city].filter(Boolean).join(', ') || 'Clinic details not listed'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase text-on-surface-variant">Visit reason</dt><dd className="mt-1 text-sm text-on-surface">{appointment.reason || 'Not specified'}</dd></div>
                </dl>
              </div>
            </div>
            <aside className="rounded-2xl bg-surface-container-low p-5">
              <span className="material-symbols-outlined text-2xl text-primary">event_available</span>
              <h2 className="mt-2 text-lg font-semibold text-on-surface">What’s next?</h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">You can review your visit details or return to your dashboard at any time.</p>
              <div className="mt-5 grid gap-2">
                <Link to={`/appointments/${appointment.id}`} className="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-on-primary">View Appointment</Link>
                <Link to="/appointments" className="rounded-lg border border-slate-200 bg-surface-container-lowest px-4 py-2.5 text-center text-sm font-semibold text-on-surface">My Appointments</Link>
                <Link to="/dashboard" className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-primary hover:bg-surface-container">Return to Dashboard</Link>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
