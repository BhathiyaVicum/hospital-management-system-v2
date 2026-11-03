import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppointmentBookingCard from '../components/booking/AppointmentBookingCard';
import { bookAppointment, getAvailability, getDoctor } from '../services/api';

export default function DoctorProfileBookingPage() {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewSlot, setReviewSlot] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setStatus('');
      try {
        const [doctorResponse, availabilityResponse] = await Promise.all([
          getDoctor(doctorId),
          getAvailability(doctorId),
        ]);

        if (active) {
          setDoctor(doctorResponse.data);
          setSlots(availabilityResponse.data?.slots || []);
        }
      } catch (error) {
        if (active) setStatus(error.message || 'Unable to load doctor profile.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [doctorId]);

  const handleBooking = (slot) => {
    setReviewSlot(slot);
    setReason('');
    setStatus('');
  };

  const confirmBooking = async () => {
    if (!reviewSlot) return;
    setSubmitting(true);
    setStatus('');

    try {
      const response = await bookAppointment({
        doctorId,
        scheduledStart: reviewSlot.startAt,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      navigate(`/appointments/${response.data.id}/confirmed`);
    } catch (error) {
      if (error.status === 401) {
        navigate('/login', { state: { message: 'Sign in with your patient account to book this appointment.' } });
        return;
      }
      setStatus(error.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading appointment details...</div>;
  }

  if (!doctor) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <p role="alert" className="text-red-700">{status || 'Doctor profile not found.'}</p>
        <Link to="/doctors" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">Browse doctors</Link>
      </div>
    );
  }

  return (
    <div className="bg-surface pb-16">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/specialists" className="hover:text-primary">Specialists</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-on-surface">{doctor.name}</span>
        </nav>

        <div className="rounded-3xl bg-surface-container-lowest p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {doctor.image ? (
                <img src={doctor.image} alt={doctor.name} className="h-32 w-32 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-surface-container text-primary" aria-hidden="true">
                  <span className="material-symbols-outlined text-5xl">person</span>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{doctor.specialties?.[0] || 'Medical professional'}</div>
                <h1 className="mt-2 text-3xl font-semibold text-on-surface">{doctor.name}</h1>
                <div className="mt-1 text-primary">{doctor.title}</div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base text-amber-500">star</span>
                    {doctor.rating}
                  </span>
                  <span>{doctor.reviews} patient reviews</span>
                  <span>{doctor.experience}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container p-4 text-center sm:min-w-[220px]">
              <div className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Consultation fee</div>
              <div className="mt-2 text-3xl font-semibold text-on-surface">{doctor.consultationFee}</div>
              <div className="mt-1 text-sm text-on-surface-variant">per visit</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-start gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)] lg:gap-8 lg:px-8">
        <article className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">info</span>
            <h2 className="text-2xl font-semibold text-on-surface">Professional overview</h2>
          </div>
          <p className="text-base leading-relaxed text-on-surface-variant">{doctor.bio}</p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Languages</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {doctor.languages.map((language) => (
                  <span key={language} className="rounded-full bg-surface-container px-3 py-1 text-sm text-on-surface-variant">{language}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Clinic</h3>
              <p className="mt-3 text-sm text-on-surface-variant">{doctor.clinic}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Education</h3>
              <p className="mt-3 text-sm text-on-surface-variant">{doctor.education}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Specialties</h3>
              <p className="mt-3 text-sm text-on-surface-variant">{doctor.specialties.join(', ')}</p>
            </div>
          </div>
        </article>

        <AppointmentBookingCard
          doctor={doctor}
          slots={slots}
          status={status}
          submitting={submitting}
          onBook={handleBooking}
        />
      </section>

      {reviewSlot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="booking-review-title" className="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Final step</p><h2 id="booking-review-title" className="mt-1 text-2xl font-semibold text-on-surface">Review Appointment</h2></div>
              <button type="button" onClick={() => setReviewSlot(null)} disabled={submitting} aria-label="Close appointment review" className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-60"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="mt-5 rounded-xl bg-surface-container-low p-4">
              <p className="font-semibold text-on-surface">{doctor.name}</p>
              <p className="mt-1 text-sm text-on-surface-variant">{doctor.clinic}</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-on-surface"><span className="material-symbols-outlined text-lg text-primary">calendar_month</span>{new Date(reviewSlot.startAt).toLocaleString(undefined, { timeZone: doctor.time_zone || 'Asia/Colombo', dateStyle: 'full', timeStyle: 'short' })}</p>
              <p className="mt-2 text-sm text-on-surface-variant">Consultation fee: {doctor.consultationFee}</p>
            </div>
            <label className="mt-4 block"><span className="mb-1.5 block text-sm font-medium text-on-surface">Reason for visit <span className="font-normal text-on-surface-variant">(optional)</span></span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} placeholder="Share a brief reason for your visit" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">Confirming will reserve this time for your patient account. The appointment is confirmed only after the clinic schedule accepts the booking.</p>
            {status && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{status}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setReviewSlot(null)} disabled={submitting} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60">Back to times</button>
              <button type="button" onClick={confirmBooking} disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60">{submitting ? 'Confirming...' : 'Confirm Booking'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
