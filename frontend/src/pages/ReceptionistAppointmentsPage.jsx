import { useCallback, useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import {
  cancelReceptionistAppointment,
  createReceptionistAppointment,
  getReceptionistAppointment,
  getReceptionistAppointments,
  getReceptionistClinics,
  getReceptionistDoctorSlots,
  getReceptionistDoctors,
  getReceptionistPatients,
  linkReceptionistPatient,
  registerReceptionistPatient,
  rescheduleReceptionistAppointment,
  updateReceptionistAppointmentWorkflow,
} from '../services/api';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const today = () => new Date().toISOString().slice(0, 10);

export default function ReceptionistAppointmentsPage() {
  const [clinics, setClinics] = useState([]);
  const [clinicId, setClinicId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(today());
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [reason, setReason] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInReason, setWalkInReason] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [reschedule, setReschedule] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState(today());
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [detail, setDetail] = useState(null);
  const [newPatient, setNewPatient] = useState(false);
  const [newPatientValues, setNewPatientValues] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAppointments = useCallback(async () => {
    const { data } = await getReceptionistAppointments({ clinicId, status: statusFilter, limit: 100 });
    setAppointments(data || []);
  }, [clinicId, statusFilter]);

  useEffect(() => {
    let active = true;
    getReceptionistClinics().then(({ data }) => {
      if (!active) return;
      setClinics(data || []);
      if (data?.length) setClinicId(data[0].id);
    }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load assigned clinics.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clinicId) { setDoctors([]); return; }
    let active = true;
    getReceptionistDoctors(clinicId).then(({ data }) => {
      if (active) {
        setDoctors(data || []);
        setDoctorId('');
      }
    }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load clinic doctors.'); });
    return () => { active = false; };
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    loadAppointments().catch((requestError) => {
      if (active) setError(requestError.message || 'Unable to load clinic appointments.');
    });
    return () => { active = false; };
  }, [clinicId, loadAppointments]);

  useEffect(() => {
    if (!patientSearch.trim()) { setPatients([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      getReceptionistPatients({ search: patientSearch.trim(), limit: 10 }).then(({ data }) => {
        if (active) setPatients(data || []);
      }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to search patients.'); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [patientSearch]);

  useEffect(() => {
    setSlots([]);
    setSlotId('');
    if (!clinicId || !doctorId || !appointmentDate) return;
    let active = true;
    getReceptionistDoctorSlots(doctorId, clinicId, appointmentDate).then(({ data }) => {
      if (active) setSlots(data || []);
    }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load appointment times.'); });
    return () => { active = false; };
  }, [clinicId, doctorId, appointmentDate]);

  useEffect(() => {
    setRescheduleSlots([]);
    if (!reschedule || !rescheduleDate) return;
    let active = true;
    getReceptionistDoctorSlots(reschedule.doctorId, reschedule.clinicId, rescheduleDate).then(({ data }) => {
      if (active) setRescheduleSlots(data || []);
    }).catch((requestError) => { if (active) setError(requestError.message || 'Unable to load rescheduling times.'); });
    return () => { active = false; };
  }, [reschedule, rescheduleDate]);

  const refresh = async () => {
    setError('');
    await loadAppointments();
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    if (!selectedPatient || !slotId) return;
    const slot = slots.find((item) => item.id === slotId);
    if (!slot) return;
    setSaving(true);
    setError('');
    try {
      await createReceptionistAppointment({
        patientId: selectedPatient.id,
        doctorId,
        clinicId,
        scheduledStart: slot.startAt,
        reason,
        isWalkIn,
        ...(isWalkIn ? { walkInReason } : {}),
      });
      setNotice(isWalkIn ? 'Walk-in appointment scheduled and recorded.' : 'Appointment booked.');
      setSelectedPatient(null);
      setPatientSearch('');
      setSlotId('');
      setReason('');
      setIsWalkIn(false);
      setWalkInReason('');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Unable to book this appointment.');
    } finally {
      setSaving(false);
    }
  };

  const changeWorkflow = async (appointment, workflowStatus) => {
    setSaving(true);
    setError('');
    try {
      await updateReceptionistAppointmentWorkflow(appointment.id, workflowStatus);
      setNotice(`Appointment updated to ${workflowStatus.replaceAll('_', ' ')}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update appointment workflow.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (appointment) => {
    if (!window.confirm(`Cancel the appointment for ${appointment.patientName}?`)) return;
    setSaving(true);
    setError('');
    try {
      await cancelReceptionistAppointment(appointment.id);
      setNotice('Appointment cancelled.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Unable to cancel appointment.');
    } finally {
      setSaving(false);
    }
  };

  const openDetails = async (appointment) => {
    setError('');
    try {
      const { data } = await getReceptionistAppointment(appointment.id);
      setDetail(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load appointment history.');
    }
  };

  const saveReschedule = async (appointment, startAt) => {
    setSaving(true);
    setError('');
    try {
      await rescheduleReceptionistAppointment(appointment.id, { scheduledStart: startAt });
      setReschedule(null);
      setNotice('Appointment rescheduled.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Unable to reschedule appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkspaceLayout role="receptionist">
      <PortalHeading eyebrow="Reception workspace · scheduling" title="Appointments & check-in" description="Book and update clinic appointments, process arrivals, and record walk-ins. All schedule changes use the doctor’s current availability." />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <p className="py-12 text-center text-on-surface-variant">Loading your clinics...</p> : clinics.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-5 text-sm text-amber-800">No clinic locations are assigned to your account. Contact an administrator to request access.</p>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="text-lg font-semibold">Book an appointment</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Choose a clinic patient, doctor, date, and available time.</p>
            <form onSubmit={submitBooking} className="mt-4 space-y-4">
              <label className="block text-sm font-medium">Clinic<select value={clinicId} onChange={(event) => { setClinicId(event.target.value); setSelectedPatient(null); }} className={inputClass} required>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name} · {clinic.city}</option>)}</select></label>
              {!newPatient ? (
                <div>
                  <label className="block text-sm font-medium">Patient search<input value={patientSearch} onChange={(event) => { setPatientSearch(event.target.value); setSelectedPatient(null); }} placeholder="Name, email, or phone" className={inputClass} /></label>
                  {selectedPatient ? <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 p-3 text-sm"><span><strong>{selectedPatient.name}</strong><br />{selectedPatient.email}</span><button type="button" onClick={() => setSelectedPatient(null)} className="font-semibold text-primary">Change</button></div>
                    : patients.length > 0 && <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200">{patients.map((patient) => <button key={patient.id} type="button" onClick={() => { setSelectedPatient(patient); setPatientSearch(patient.name); setPatients([]); }} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-surface-container-low"><span className="font-semibold">{patient.name}</span><span className="block text-on-surface-variant">{patient.email} · {patient.phone || 'No phone'}</span></button>)}</div>}
                  {!selectedPatient && patientSearch.includes('@') && <button type="button" disabled={saving} onClick={async () => {
                    setSaving(true); setError('');
                    try {
                      const { data } = await linkReceptionistPatient({ email: patientSearch.trim(), clinicId });
                      setSelectedPatient(data);
                      setPatientSearch(data.name);
                      setPatients([]);
                      setNotice('Existing patient linked to this clinic.');
                    } catch (requestError) { setError(requestError.message || 'Unable to link patient to this clinic.'); }
                    finally { setSaving(false); }
                  }} className="mt-2 min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-primary disabled:opacity-60">Find exact email in patient accounts</button>}
                  <button type="button" onClick={() => { setNewPatient(true); setSelectedPatient(null); }} className="mt-2 text-sm font-semibold text-primary hover:underline">Register a new patient</button>
                </div>
              ) : (
                <div className="rounded-xl bg-surface-container-low p-3">
                  <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">New patient</p><button type="button" onClick={() => setNewPatient(false)} className="text-sm font-semibold text-primary">Search existing</button></div>
                  <div className="space-y-2">
                    <input aria-label="Patient name" placeholder="Full name" value={newPatientValues.name} onChange={(event) => setNewPatientValues({ ...newPatientValues, name: event.target.value })} className={inputClass} required />
                    <input aria-label="Patient email" type="email" placeholder="Email address" value={newPatientValues.email} onChange={(event) => setNewPatientValues({ ...newPatientValues, email: event.target.value })} className={inputClass} required />
                    <input aria-label="Patient phone" placeholder="Phone number" value={newPatientValues.phone} onChange={(event) => setNewPatientValues({ ...newPatientValues, phone: event.target.value })} className={inputClass} />
                    <button type="button" disabled={saving} onClick={async () => {
                      setSaving(true); setError('');
                      try {
                        const { data } = await registerReceptionistPatient({ ...newPatientValues, clinicId });
                        setSelectedPatient({ id: data.patientId, name: data.name, email: data.email });
                        setPatientSearch(data.name);
                        setNewPatient(false);
                        setNewPatientValues({ name: '', email: '', phone: '' });
                        setNotice(data.message);
                      } catch (requestError) { setError(requestError.message || 'Unable to register patient.'); }
                      finally { setSaving(false); }
                    }} className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-60">Register patient</button>
                  </div>
                </div>
              )}
              <label className="block text-sm font-medium">Doctor<select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} className={inputClass} required><option value="">Select a doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.title}</option>)}</select></label>
              <label className="block text-sm font-medium">Appointment date<input type="date" min={today()} value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} className={inputClass} required /></label>
              <label className="block text-sm font-medium">Available time<select value={slotId} onChange={(event) => setSlotId(event.target.value)} className={inputClass} required><option value="">Select an available time</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.time}</option>)}</select></label>
              {!slots.length && doctorId && <p className="text-xs text-on-surface-variant">No open times are available for this doctor on the selected date.</p>}
              <label className="block text-sm font-medium">Visit reason (optional)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={3} className={`${inputClass} h-auto`} /></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={isWalkIn} onChange={(event) => setIsWalkIn(event.target.checked)} />Record as a walk-in</label>
              {isWalkIn && <label className="block text-sm font-medium">Walk-in reason<textarea value={walkInReason} onChange={(event) => setWalkInReason(event.target.value)} maxLength={500} rows={2} className={`${inputClass} h-auto`} required /></label>}
              <button type="submit" disabled={saving || !selectedPatient || !slotId} className="min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : isWalkIn ? 'Schedule walk-in' : 'Book appointment'}</button>
              {isWalkIn && <p className="text-xs text-on-surface-variant">Walk-ins are assigned a currently open doctor time to preserve the same scheduling and overlap protections.</p>}
            </form>
          </section>

          <section className="min-w-0 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Clinic appointments</h2><p className="mt-1 text-sm text-on-surface-variant">{appointments.length} displayed · changes are recorded with the acting account</p></div><label className="text-xs font-medium">Workflow<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="ml-2 min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All</option>{['scheduled', 'arrived', 'checked_in', 'waiting', 'in_consultation', 'completed', 'no_show'].map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label></div>
            {appointments.length ? <div className="space-y-3">
              {appointments.map((appointment) => (
                <article key={appointment.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><p className="font-semibold">{appointment.patientName}</p><p className="mt-1 break-all text-sm text-on-surface-variant">{appointment.patientEmail} · {appointment.patientPhone || 'No phone'}</p><p className="mt-1 text-sm text-on-surface-variant">{appointment.doctorName} · {appointment.clinicName}</p><p className="mt-1 text-sm font-medium">{new Date(appointment.scheduledStart).toLocaleString()}</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold capitalize">{appointment.workflowStatus.replaceAll('_', ' ')}</span><span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold">{appointment.status}</span>{appointment.isWalkIn && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Walk-in</span>}</div></div>
                    <button type="button" onClick={() => openDetails(appointment)} className="min-h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-primary">History</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {appointment.workflowStatus === 'scheduled' && <button type="button" disabled={saving} onClick={() => changeWorkflow(appointment, 'arrived')} className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary">Mark arrived</button>}
                    {appointment.workflowStatus === 'arrived' && <button type="button" disabled={saving} onClick={() => changeWorkflow(appointment, 'checked_in')} className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary">Check in</button>}
                    {appointment.workflowStatus === 'checked_in' && <button type="button" disabled={saving} onClick={() => changeWorkflow(appointment, 'waiting')} className="min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary">Mark waiting</button>}
                    {['scheduled', 'arrived', 'checked_in', 'waiting'].includes(appointment.workflowStatus) && <button type="button" disabled={saving} onClick={() => changeWorkflow(appointment, 'no_show')} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Mark no-show</button>}
                    {appointment.status === 'confirmed' && <><button type="button" disabled={saving} onClick={() => { setReschedule(appointment); setRescheduleDate(today()); }} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold">Reschedule</button><button type="button" disabled={saving} onClick={() => cancel(appointment)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-error hover:bg-red-50">Cancel</button></>}
                  </div>
                </article>
              ))}
            </div> : <p className="rounded-xl bg-surface-container-low p-8 text-center text-sm text-on-surface-variant">No appointments found for this clinic and workflow filter.</p>}
          </section>
        </div>
      )}

      {reschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
          <section role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between"><div><h2 id="reschedule-title" className="text-lg font-semibold">Reschedule appointment</h2><p className="mt-1 text-sm text-on-surface-variant">{reschedule.patientName} · {reschedule.doctorName}</p></div><button type="button" onClick={() => setReschedule(null)} aria-label="Close reschedule dialog" className="h-10 w-10 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
            <label className="mt-4 block text-sm font-medium">New date<input type="date" min={today()} value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} className={inputClass} /></label>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{rescheduleSlots.map((slot) => <button key={slot.id} type="button" disabled={saving} onClick={() => saveReschedule(reschedule, slot.startAt)} className="min-h-10 rounded-lg bg-surface-container px-2 text-sm font-semibold hover:bg-primary-fixed disabled:opacity-60">{slot.time}</button>)}</div>
            {!rescheduleSlots.length && <p className="mt-3 text-sm text-on-surface-variant">No times are available on this date.</p>}
            <button type="button" onClick={() => setReschedule(null)} className="mt-5 min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Close</button>
          </section>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="appointment-history-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between"><div><h2 id="appointment-history-title" className="text-lg font-semibold">Appointment history</h2><p className="mt-1 text-sm text-on-surface-variant">{detail.patientName} · {detail.doctorName}</p></div><button type="button" onClick={() => setDetail(null)} aria-label="Close history" className="h-10 w-10 rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
            <div className="mt-4 space-y-2">{(detail.history || []).map((item) => <article key={`${item.eventType}-${item.changedAt}`} className="rounded-xl bg-surface-container-low p-3"><p className="font-semibold capitalize">{item.eventType.replaceAll('_', ' ')}</p><p className="mt-1 text-sm">{new Date(item.scheduledStart).toLocaleString()} · {item.status} · {item.workflowStatus.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-on-surface-variant">{new Date(item.changedAt).toLocaleString()} · {item.actorName || 'System'}</p></article>)}</div>
            <h3 className="mt-5 font-semibold">Patient flow history</h3>
            <div className="mt-2 space-y-2">{(detail.workflowHistory || []).map((item, index) => <article key={`${item.changedAt}-${index}`} className="rounded-xl bg-surface-container-low p-3 text-sm"><span className="capitalize">{item.previousStatus ? `${item.previousStatus.replaceAll('_', ' ')} → ` : ''}{item.newStatus.replaceAll('_', ' ')}</span><span className="block mt-1 text-xs text-on-surface-variant">{new Date(item.changedAt).toLocaleString()} · {item.actorName || 'System'}</span></article>)}</div>
            {detail.isWalkIn && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"><strong>Walk-in reason:</strong> {detail.walkInReason}</p>}
            <button type="button" onClick={() => setDetail(null)} className="mt-5 min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Close</button>
          </section>
        </div>
      )}
    </WorkspaceLayout>
  );
}
