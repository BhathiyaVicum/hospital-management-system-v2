import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import StatusBadge from '../components/common/StatusBadge';
import { cancelAppointment, getAppointment } from '../services/api';

function formatDate(value, timeZone, options = {}) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timeZone || 'Asia/Colombo',
    ...options,
  }).format(new Date(value));
}

function downloadCalendarEvent(appointment) {
  const start = new Date(appointment.scheduled_start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(appointment.scheduled_end).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MediConnect//Patient Portal//EN',
    'BEGIN:VEVENT',
    `UID:${appointment.id}@mediconnect`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:Appointment with ${appointment.doctor_name}`,
    `LOCATION:${[appointment.clinic_name, appointment.clinic_address, appointment.clinic_city].filter(Boolean).join(', ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-${appointment.id}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AppointmentDetailsPage() {
  const { appointmentId } = useParams();
  const location = useLocation();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(Boolean(location.state?.confirmCancel));
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState(location.state?.message || '');

  const loadAppointment = useCallback(async () => {
    const response = await getAppointment(appointmentId);
    setAppointment(response.data);
  }, [appointmentId]);

  useEffect(() => {
    let active = true;
    getAppointment(appointmentId)
      .then(({ data }) => { if (active) setAppointment(data); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load appointment details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [appointmentId]);

  const handleCancel = async () => {
    setCancelling(true);
    setMessage('');
    try {
      await cancelAppointment(appointmentId);
      await loadAppointment();
      setDialogOpen(false);
      setMessage('Your appointment has been cancelled.');
    } catch (requestError) {
      setMessage(requestError.message || 'Unable to cancel this appointment.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading appointment details...</div>;
  if (error || !appointment) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error || 'Appointment not found.'}</div>;

  const upcoming = appointment.can_cancel;
  const durationMinutes = Math.round((new Date(appointment.scheduled_end) - new Date(appointment.scheduled_start)) / 60000);

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
          <Link to="/dashboard" className="hover:text-primary">Dashboard</Link><span>/</span>
          <Link to="/appointments" className="hover:text-primary">My Appointments</Link><span>/</span>
          <span className="font-medium text-on-surface">Appointment details</span>
        </div>
        <PortalHeading
          eyebrow={`Appointment reference · ${appointment.id}`}
          title="Appointment Details"
          description="Review your visit information and manage your appointment."
          actions={(
            <>
              {upcoming && <Link to={`/appointments/${appointment.id}/reschedule`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container"><span className="material-symbols-outlined text-lg">event_repeat</span>Reschedule</Link>}
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container"><span className="material-symbols-outlined text-lg">print</span>Print</button>
            </>
          )}
        />

        {message && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-primary">event_note</span><span className="text-sm font-semibold text-on-surface">Appointment status</span><StatusBadge status={appointment.status} /></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => downloadCalendarEvent(appointment)} className="rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-container">Add to Calendar</button>
            {upcoming && <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg px-3 py-2 text-sm font-semibold text-error hover:bg-error-container/40">Cancel Appointment</button>}
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {appointment.doctor_image ? (
                  <img src={appointment.doctor_image} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container text-primary"><span className="material-symbols-outlined text-4xl">person</span></span>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your clinician</p>
                  <h2 className="mt-1 text-xl font-semibold text-on-surface">{appointment.doctor_name}</h2>
                  <p className="text-sm text-on-surface-variant">{appointment.doctor_title}</p>
                </div>
                <Link to={`/doctors/${appointment.doctor_id}`} className="sm:ml-auto text-sm font-semibold text-primary hover:underline">View profile</Link>
              </div>
            </section>

            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-semibold text-on-surface">Visit information</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Date &amp; time</p><p className="mt-2 font-semibold text-on-surface">{formatDate(appointment.scheduled_start, appointment.time_zone)}</p><p className="text-sm text-on-surface-variant">{formatDate(appointment.scheduled_start, appointment.time_zone, { hour: 'numeric', minute: '2-digit' })}</p></div>
                <div className="rounded-xl bg-surface-container-low p-4"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Duration</p><p className="mt-2 font-semibold text-on-surface">{durationMinutes} minutes</p></div>
                <div className="rounded-xl bg-surface-container-low p-4 sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Visit reason</p><p className="mt-2 text-sm text-on-surface">{appointment.reason || 'No visit reason provided.'}</p></div>
              </div>
            </section>

            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-semibold text-on-surface">Clinic location</h2>
              <p className="mt-3 font-medium text-on-surface">{appointment.clinic_name || 'Clinic details not listed'}</p>
              <p className="text-sm text-on-surface-variant">{[appointment.clinic_address, appointment.clinic_city].filter(Boolean).join(', ')}</p>
              {appointment.clinic_phone && <a href={`tel:${appointment.clinic_phone}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><span className="material-symbols-outlined text-lg">call</span>{appointment.clinic_phone}</a>}
              {appointment.clinic_address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([appointment.clinic_address, appointment.clinic_city].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer" className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold text-primary"><span className="material-symbols-outlined text-lg">directions</span>Get directions</a>}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-on-surface">Appointment timeline</h2>
              <div className="mt-4 space-y-4">
                {[
                  ['Appointment booked', appointment.created_at],
                  ['Scheduled visit', appointment.scheduled_start],
                  ...(appointment.cancelled_at ? [['Appointment cancelled', appointment.cancelled_at]] : []),
                ].map(([label, date]) => (
                  <div key={label} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div><p className="text-sm font-medium text-on-surface">{label}</p><p className="text-xs text-on-surface-variant">{formatDate(date, appointment.time_zone, { hour: 'numeric', minute: '2-digit' })}</p></div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <span className="material-symbols-outlined text-2xl text-primary">support_agent</span>
              <h2 className="mt-2 font-semibold text-on-surface">Need help with this visit?</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Send a support request and include this appointment in your message.</p>
              <Link to="/support" state={{ appointmentId: appointment.id }} className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Contact support</Link>
            </section>
          </aside>
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-2xl">
            <span className="material-symbols-outlined text-3xl text-error">event_busy</span>
            <h2 id="cancel-title" className="mt-3 text-xl font-semibold text-on-surface">Cancel appointment?</h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">This will cancel your scheduled visit with {appointment.doctor_name} on {formatDate(appointment.scheduled_start, appointment.time_zone)}. Appointments can be cancelled until their scheduled start time.</p>
            {message && <p role="alert" className="mt-3 text-sm text-error">{message}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDialogOpen(false)} disabled={cancelling} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60">Keep Appointment</button>
              <button type="button" onClick={handleCancel} disabled={cancelling} className="rounded-lg bg-error px-4 py-2.5 text-sm font-semibold text-on-error disabled:opacity-60">{cancelling ? 'Cancelling...' : 'Confirm Cancellation'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
