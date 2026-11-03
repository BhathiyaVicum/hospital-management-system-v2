import { useEffect, useMemo, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import {
  AdminEmptyState,
  AdminNotice,
  AdminSection,
  AdminStatus,
} from '../components/admin/AdminComponents';
import {
  createAdminScheduleException,
  createAdminWeeklySchedule,
  deleteAdminScheduleException,
  getAdminScheduleDoctors,
  getAdminSchedules,
  updateAdminScheduleException,
  updateAdminWeeklySchedule,
} from '../services/api';

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-on-surface outline-none focus:border-primary';
const today = new Date().toISOString().slice(0, 10);
const defaultRangeEnd = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

function ScheduleDialog({ mode, record, doctors, onClose, onSave, onRemove, saving }) {
  const isWeekly = mode === 'weekly';
  const [values, setValues] = useState(() => isWeekly ? {
    doctorId: record?.doctorId || doctors[0]?.id || '',
    dayOfWeek: record?.dayOfWeek ?? 1,
    startTime: record?.startTime || '09:00',
    endTime: record?.endTime || '17:00',
    slotDurationMinutes: record?.slotDurationMinutes || 30,
    isAvailable: record?.isAvailable ?? true,
  } : {
    doctorId: record?.doctorId || doctors[0]?.id || '',
    availableOn: record?.availableOn ? String(record.availableOn).slice(0, 10) : today,
    isAvailable: record?.isAvailable ?? false,
    startTime: record?.startTime || '09:00',
    endTime: record?.endTime || '12:00',
    slotDurationMinutes: record?.slotDurationMinutes || 30,
  });
  const [error, setError] = useState('');
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const payload = isWeekly
      ? { ...values, dayOfWeek: Number(values.dayOfWeek), slotDurationMinutes: Number(values.slotDurationMinutes) }
      : {
        doctorId: values.doctorId,
        availableOn: values.availableOn,
        isAvailable: values.isAvailable,
        ...(values.isAvailable ? {
          startTime: values.startTime,
          endTime: values.endTime,
          slotDurationMinutes: Number(values.slotDurationMinutes),
        } : {}),
      };
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || 'Unable to save schedule changes.');
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove this date exception and restore the doctor's recurring schedule for this date? Existing appointments will remain unchanged.")) return;
    setError('');
    try {
      await onRemove(record.id);
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove the date exception.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{isWeekly ? 'Recurring availability' : 'Date exception'}</p>
            <h2 id="schedule-dialog-title" className="mt-1 text-xl font-semibold">{record ? 'Edit schedule' : 'Add schedule'}</h2>
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">Doctor
            <select required disabled={Boolean(record && !isWeekly)} value={values.doctorId} onChange={(event) => update('doctorId', event.target.value)} className={inputClass}>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
            </select>
          </label>
          {isWeekly ? (
            <label className="block text-sm font-medium">Weekday
              <select value={values.dayOfWeek} onChange={(event) => update('dayOfWeek', event.target.value)} className={inputClass}>
                {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
          ) : (
            <label className="block text-sm font-medium">Date
              <input type="date" required min={record ? undefined : today} disabled={Boolean(record)} value={values.availableOn} onChange={(event) => update('availableOn', event.target.value)} className={inputClass} />
            </label>
          )}
          <label className="flex min-h-11 items-center gap-3 rounded-lg bg-surface-container-low px-3 text-sm font-medium">
              <input type="checkbox" checked={values.isAvailable} onChange={(event) => update('isAvailable', event.target.checked)} className="h-4 w-4 accent-primary" />
              {isWeekly ? 'Weekly hours are active' : 'Offer appointments on this date'}
            </label>
          {(isWeekly || values.isAvailable) && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">Start time<input type="time" required value={values.startTime} onChange={(event) => update('startTime', event.target.value)} className={inputClass} /></label>
              <label className="block text-sm font-medium">End time<input type="time" required value={values.endTime} onChange={(event) => update('endTime', event.target.value)} className={inputClass} /></label>
              <label className="block text-sm font-medium">Slot minutes<input type="number" min="10" max="240" step="1" required value={values.slotDurationMinutes} onChange={(event) => update('slotDurationMinutes', event.target.value)} className={inputClass} /></label>
            </div>
          )}
          {!isWeekly && !values.isAvailable && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">This closes the doctor's schedule for the selected date. Existing appointments will remain unchanged and are listed as affected appointments.</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            {!isWeekly && record && <button type="button" onClick={remove} disabled={saving} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 sm:mr-auto">Remove exception</button>}
            <button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold">Cancel</button>
            <button type="submit" disabled={saving || !doctors.length} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : 'Save schedule'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

export default function AdminSchedulesPage() {
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [weekly, setWeekly] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(defaultRangeEnd);
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getAdminSchedules({ doctorId, from, to })
      .then(({ data }) => {
        if (!active) return;
        setWeekly(data.weekly || []);
        setExceptions(data.exceptions || []);
        setError('');
      })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load schedules.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [doctorId, from, to, refreshKey]);

  useEffect(() => {
    let active = true;
    getAdminScheduleDoctors()
      .then(({ data }) => { if (active) setDoctors(data || []); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Unable to load doctor list.'); });
    return () => { active = false; };
  }, []);

  const doctorName = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor.name])), [doctors]);
  const doctorTimeZone = useMemo(() => new Map(doctors.map((doctor) => [doctor.id, doctor.timeZone])), [doctors]);

  const save = async (payload) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      let response;
      if (modal.mode === 'weekly') {
        response = modal.record
          ? await updateAdminWeeklySchedule(modal.record.id, payload)
          : await createAdminWeeklySchedule(payload);
      } else {
        response = modal.record
          ? await updateAdminScheduleException(modal.record.id, payload)
          : await createAdminScheduleException(payload);
      }
      setModal(null);
      if (typeof response.data?.affectedAppointments === 'number' && response.data.affectedAppointments > 0) {
        setNotice(`Schedule saved. ${response.data.affectedAppointments} existing appointment(s) are on this date; they were not changed.`);
      } else {
        setNotice('Schedule saved successfully.');
      }
      setLoading(true);
      setRefreshKey((current) => current + 1);
    } finally { setSaving(false); }
  };

  const removeException = async (exceptionId) => {
    setSaving(true);
    setError('');
    try {
      await deleteAdminScheduleException(exceptionId);
      setModal(null);
      setNotice('Date exception removed. Existing appointment bookings were not changed.');
      setLoading(true);
      setRefreshKey((current) => current + 1);
    } finally { setSaving(false); }
  };

  return (
    <>
      <PortalHeading eyebrow="Providers & network" title="Doctor Schedules" description="Manage recurring weekly availability and date-specific schedule exceptions." />
      {error && <AdminNotice>{error}</AdminNotice>}
      {notice && <AdminNotice type="success">{notice}</AdminNotice>}
      <AdminSection title="Date exceptions" description="Review closures and additional appointment dates. Existing bookings are never automatically cancelled or rescheduled." className="mb-6">
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
          <label className="text-xs font-semibold text-on-surface-variant">From<input type="date" value={from} max={to} onChange={(event) => { setLoading(true); setFrom(event.target.value); }} className={inputClass} /></label>
          <label className="text-xs font-semibold text-on-surface-variant">To<input type="date" value={to} min={from} onChange={(event) => { setLoading(true); setTo(event.target.value); }} className={inputClass} /></label>
          <label className="text-xs font-semibold text-on-surface-variant">Doctor<select value={doctorId} onChange={(event) => { setLoading(true); setDoctorId(event.target.value); }} className={inputClass}><option value="">All active doctors</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
          <button type="button" onClick={() => setModal({ mode: 'exception', record: null })} disabled={!doctors.length} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">Add exception</button>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-on-surface-variant">Loading schedule data...</p> : exceptions.length ? (
          <div className="grid gap-3">
            {exceptions.map((exception) => (
              <article key={exception.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{displayDate(exception.availableOn)}</h3><AdminStatus active={exception.isAvailable} label={exception.isAvailable ? 'Extra availability' : 'Closed'} /></div>
                  <p className="mt-1 text-sm text-on-surface-variant">{doctorName.get(exception.doctorId) || exception.doctorName}{exception.isAvailable ? ` · ${exception.startTime}–${exception.endTime}, ${exception.slotDurationMinutes}-minute slots (${doctorTimeZone.get(exception.doctorId) || 'doctor local time'})` : ' · No slots offered'}</p>
                  {exception.affectedAppointments > 0 && <p className="mt-1 text-xs font-medium text-amber-700">{exception.affectedAppointments} existing confirmed appointment(s) on this date</p>}
                </div>
                <button type="button" onClick={() => setModal({ mode: 'exception', record: exception })} className="min-h-10 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-primary">Edit</button>
              </article>
            ))}
          </div>
        ) : <AdminEmptyState title="No date exceptions" description="There are no closures or additional appointment dates in this range." icon="event_busy" />}
      </AdminSection>

      <AdminSection
        title="Weekly availability"
        description="These recurring hours define the standard appointment windows for each doctor."
        actions={<button type="button" onClick={() => setModal({ mode: 'weekly', record: null })} disabled={!doctors.length} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">Add weekly hours</button>}
      >
        {loading ? <p className="py-8 text-center text-sm text-on-surface-variant">Loading weekly hours...</p> : weekly.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {weekly.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{entry.doctorName || doctorName.get(entry.doctorId)}</p><p className="mt-1 text-sm text-on-surface-variant">{weekDays[entry.dayOfWeek]} · {entry.startTime}–{entry.endTime}</p><p className="mt-1 text-xs text-on-surface-variant">{entry.slotDurationMinutes}-minute appointment slots · {doctorTimeZone.get(entry.doctorId) || 'doctor local time'}</p></div>
                  <AdminStatus active={entry.isAvailable} />
                </div>
                <button type="button" onClick={() => setModal({ mode: 'weekly', record: entry })} className="mt-4 min-h-10 w-full rounded-lg border border-slate-200 text-sm font-semibold text-primary">Edit availability</button>
              </article>
            ))}
          </div>
        ) : <AdminEmptyState title="No recurring hours configured" description="Add a weekly availability window for an active doctor." icon="calendar_clock" />}
      </AdminSection>
      {modal && <ScheduleDialog key={`${modal.mode}-${modal.record?.id || 'new'}`} mode={modal.mode} record={modal.record} doctors={doctors} onClose={() => setModal(null)} onSave={save} onRemove={removeException} saving={saving} />}
    </>
  );
}
