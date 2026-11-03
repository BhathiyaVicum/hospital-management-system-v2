import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PortalHeading from '../components/common/PortalHeading';
import AppointmentBookingCard from '../components/booking/AppointmentBookingCard';
import { getAppointment, getAvailability, getDoctor, rescheduleAppointment } from '../services/api';

export default function RescheduleAppointmentPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: currentAppointment } = await getAppointment(appointmentId);
        if (currentAppointment.status !== 'confirmed' || new Date(currentAppointment.scheduled_start) <= new Date()) {
          throw new Error('This appointment is not eligible for rescheduling.');
        }
        const [doctorResponse, availabilityResponse] = await Promise.all([
          getDoctor(currentAppointment.doctor_id),
          getAvailability(currentAppointment.doctor_id),
        ]);
        if (!active) return;
        setAppointment(currentAppointment);
        setDoctor(doctorResponse.data);
        setSlots(availabilityResponse.data?.slots || []);
      } catch (error) {
        if (active) setMessage(error.message || 'Unable to load rescheduling options.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [appointmentId]);

  const handleReschedule = async (slot) => {
    setSubmitting(true);
    setMessage('');
    try {
      await rescheduleAppointment(appointmentId, { scheduledStart: slot.startAt });
      navigate(`/appointments/${appointmentId}`, { replace: true, state: { message: 'Your appointment has been rescheduled.' } });
    } catch (error) {
      setMessage(error.message || 'Unable to reschedule this appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-on-surface-variant">Loading current availability...</div>;

  return (
    <div className="bg-surface pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 text-sm text-on-surface-variant"><Link to={`/appointments/${appointmentId}`} className="hover:text-primary">Appointment details</Link><span className="px-2">/</span><span className="text-on-surface">Reschedule</span></div>
        <PortalHeading eyebrow="Appointment management" title="Choose a new time" description="Select an available date and time for your visit. Your current booking remains until the new time is confirmed." />
        {message && <p role="alert" className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{message}</p>}
        {!doctor ? (
          <Link to="/appointments" className="text-sm font-semibold text-primary hover:underline">Back to My Appointments</Link>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
            <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-on-surface">Current appointment</h2>
              <p className="mt-2 text-on-surface">{appointment.doctor_name}</p>
              <p className="text-sm text-on-surface-variant">{new Date(appointment.scheduled_start).toLocaleString(undefined, { timeZone: appointment.time_zone || 'Asia/Colombo' })}</p>
            </section>
            <AppointmentBookingCard doctor={doctor} slots={slots} status="" submitting={submitting} onBook={handleReschedule} submitLabel="Confirm new time" />
          </div>
        )}
      </div>
    </div>
  );
}
