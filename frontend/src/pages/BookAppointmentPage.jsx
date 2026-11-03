import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppointmentBookingCard from '../components/booking/AppointmentBookingCard';
import PortalHeading from '../components/common/PortalHeading';
import { bookAppointment, getAvailability, getDoctor, getPatientProfile } from '../services/api';

function formatSlot(slot, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: timeZone || 'Asia/Colombo',
  }).format(new Date(slot.startAt));
}

export default function BookAppointmentPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [patient, setPatient] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getDoctor(doctorId), getAvailability(doctorId), getPatientProfile()])
      .then(([doctorResponse, availabilityResponse, patientResponse]) => {
        if (!active) return;
        setDoctor(doctorResponse.data);
        setSlots(availabilityResponse.data?.slots || []);
        setPatient(patientResponse.data);
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load appointment details.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [doctorId]);

  const confirmBooking = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await bookAppointment({
        doctorId,
        scheduledStart: selectedSlot.startAt,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      navigate(`/appointments/${data.id}/confirmed`);
    } catch (requestError) {
      setError(requestError.message || 'Unable to book this appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading booking options...</div>;
  if (error && !doctor) return <div role="alert" className="mx-auto max-w-7xl px-4 py-12 text-red-700">{error}</div>;
  if (!doctor || !patient) return null;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 text-sm text-on-surface-variant"><Link to="/doctors" className="hover:text-primary">Find a Doctor</Link><span className="px-2">/</span><Link to={`/doctors/${doctor.id}`} className="hover:text-primary">{doctor.name}</Link><span className="px-2">/</span><span className="text-on-surface">Book an Appointment</span></div>
        <div className="mb-7 flex items-center justify-between gap-4 overflow-x-auto pb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant sm:justify-center sm:gap-8">
          {[
            ['1', 'Select doctor', true],
            ['2', 'Date & time', true],
            ['3', 'Review', false],
            ['4', 'Confirmation', false],
          ].map(([number, label, active], index) => (
            <div key={number} className="flex shrink-0 items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>{number}</span>
              <span className={active ? 'text-primary' : ''}>{label}</span>
              {index < 3 && <span className="hidden text-slate-300 sm:inline">—</span>}
            </div>
          ))}
        </div>

        <PortalHeading eyebrow="Appointment booking" title="Choose a date and time" description="Select an available appointment slot and review your visit details before confirming." />
        {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {doctor.image ? <img src={doctor.image} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container text-primary"><span className="material-symbols-outlined text-3xl">person</span></span>}
                <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{doctor.specialties?.[0] || 'Medical professional'}</p><h2 className="mt-1 text-lg font-semibold text-on-surface">{doctor.name}</h2><p className="text-sm text-on-surface-variant">{doctor.title}</p></div>
                <div className="sm:text-right"><p className="text-xs text-on-surface-variant">Consultation fee</p><p className="font-semibold text-on-surface">{doctor.consultationFee}</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <p className="flex items-center gap-2 text-on-surface-variant"><span className="material-symbols-outlined text-lg text-primary">location_on</span>{[doctor.clinic, doctor.location].filter(Boolean).join(' · ') || 'Clinic details not listed'}</p>
                <Link to={`/doctors/${doctor.id}`} className="font-semibold text-primary hover:underline">Change doctor or clinic</Link>
              </div>
            </section>

            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
              <h2 className="text-lg font-semibold text-on-surface">Patient information</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-surface-container-low p-3"><p className="text-xs text-on-surface-variant">Patient</p><p className="mt-1 font-medium text-on-surface">{patient.name}</p></div>
                <div className="rounded-xl bg-surface-container-low p-3"><p className="text-xs text-on-surface-variant">Contact email</p><p className="mt-1 break-all font-medium text-on-surface">{patient.email}</p></div>
              </div>
              <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-on-surface">Reason for visit <span className="font-normal text-on-surface-variant">(optional)</span></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Share a brief reason for your visit" className="w-full rounded-lg border border-slate-200 bg-surface-container-lowest px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
              <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-xs leading-relaxed text-on-surface-variant">Appointment availability is confirmed when you submit your request. The clinic's local time zone is used for scheduling.</p>
            </section>
          </div>

          <AppointmentBookingCard
            doctor={doctor}
            slots={slots}
            status=""
            submitting={false}
            submitLabel="Continue to review"
            onBook={setSelectedSlot}
          />
        </div>

        {selectedSlot && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
            <section role="dialog" aria-modal="true" aria-labelledby="review-booking-title" className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-5 shadow-2xl sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Review step</p>
              <h2 id="review-booking-title" className="mt-1 text-2xl font-semibold text-on-surface">Review Appointment</h2>
              <dl className="mt-5 space-y-3 rounded-xl bg-surface-container-low p-4 text-sm">
                <div><dt className="text-xs text-on-surface-variant">Doctor</dt><dd className="mt-0.5 font-semibold text-on-surface">{doctor.name}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Date &amp; time</dt><dd className="mt-0.5 font-semibold text-on-surface">{formatSlot(selectedSlot, doctor.time_zone)}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Location</dt><dd className="mt-0.5 font-semibold text-on-surface">{doctor.clinic || 'Clinic details not listed'}</dd></div>
                <div><dt className="text-xs text-on-surface-variant">Patient</dt><dd className="mt-0.5 font-semibold text-on-surface">{patient.name}</dd></div>
                {reason.trim() && <div><dt className="text-xs text-on-surface-variant">Visit reason</dt><dd className="mt-0.5 text-on-surface">{reason}</dd></div>}
                <div><dt className="text-xs text-on-surface-variant">Fee</dt><dd className="mt-0.5 font-semibold text-on-surface">{doctor.consultationFee}</dd></div>
              </dl>
              {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={submitting} onClick={() => setSelectedSlot(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60">Change selection</button>
                <button type="button" disabled={submitting} onClick={confirmBooking} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{submitting ? 'Confirming...' : 'Confirm Booking'}</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
