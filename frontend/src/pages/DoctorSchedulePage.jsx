import { useCallback, useEffect, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import {
  createDoctorScheduleException,
  createDoctorWeeklySchedule,
  deleteDoctorScheduleException,
  getDoctorWorkspaceSchedules,
  updateDoctorWeeklySchedule,
} from '../services/api';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const inputClass = 'mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm';
const initialWeekly = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, isAvailable: true };

function today() { return new Date().toISOString().slice(0, 10); }
function futureDate() { return new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10); }

export default function DoctorSchedulePage() {
  const [schedule, setSchedule] = useState({ weekly: [], exceptions: [] });
  const [newWeekly, setNewWeekly] = useState(initialWeekly);
  const [exception, setException] = useState({ availableOn: '', isAvailable: false });
  const [editing, setEditing] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getDoctorWorkspaceSchedules({ from: today(), to: futureDate() });
      setSchedule(data);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your schedule.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveWeekly = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createDoctorWeeklySchedule(newWeekly);
      setNewWeekly(initialWeekly);
      setNotice('Weekly availability added.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save weekly availability.');
    } finally {
      setSaving(false);
    }
  };

  const updateWeekly = async (row) => {
    setSaving(true);
    setError('');
    try {
      await updateDoctorWeeklySchedule(row.id, editing[row.id] || row);
      setNotice('Weekly availability updated.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to update weekly availability.');
    } finally {
      setSaving(false);
    }
  };

  const saveException = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = exception.isAvailable
      ? exception
      : { availableOn: exception.availableOn, isAvailable: false };
    try {
      await createDoctorScheduleException(payload);
      setException({ availableOn: '', isAvailable: false });
      setNotice('Date-specific availability saved.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to save date exception.');
    } finally {
      setSaving(false);
    }
  };

  const removeException = async (id) => {
    setSaving(true);
    setError('');
    try {
      await deleteDoctorScheduleException(id);
      setNotice('Date exception removed.');
      await load();
    } catch (requestError) {
      setError(requestError.message || 'Unable to remove date exception.');
    } finally {
      setSaving(false);
    }
  };

  const weeklyField = (row, key, label, type = 'text') => (
    <label className="text-xs font-medium text-on-surface-variant">{label}
      <input type={type} value={editing[row.id]?.[key] ?? row[key]} onChange={(event) => setEditing({
        ...editing,
        [row.id]: { ...row, ...(editing[row.id] || {}), [key]: type === 'number' ? Number(event.target.value) : event.target.value },
      })} className={inputClass} />
    </label>
  );

  return (
    <WorkspaceLayout role="doctor">
      <PortalHeading eyebrow="Doctor workspace · availability" title="My schedule" description="Maintain recurring weekly hours and date-specific openings or closures. Patient booking uses these same availability rules." />
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <h2 className="text-lg font-semibold">Weekly availability</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Use inactive entries to pause a recurring window without deleting schedule history.</p>
          <div className="mt-4 space-y-3">
            {schedule.weekly.map((row) => (
              <article key={row.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-3">
                <label className="text-xs font-medium text-on-surface-variant">Weekday
                  <select value={editing[row.id]?.dayOfWeek ?? row.dayOfWeek} onChange={(event) => setEditing({ ...editing, [row.id]: { ...row, ...(editing[row.id] || {}), dayOfWeek: Number(event.target.value) } })} className={inputClass}>
                    {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </label>
                {weeklyField(row, 'startTime', 'Start time', 'time')}
                {weeklyField(row, 'endTime', 'End time', 'time')}
                {weeklyField(row, 'slotDurationMinutes', 'Slot duration (minutes)', 'number')}
                <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={editing[row.id]?.isAvailable ?? row.isAvailable} onChange={(event) => setEditing({ ...editing, [row.id]: { ...row, ...(editing[row.id] || {}), isAvailable: event.target.checked } })} />Accept bookings</label>
                <button type="button" disabled={saving} onClick={() => updateWeekly(row)} className="min-h-10 self-end rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-60">Save</button>
              </article>
            ))}
            {!schedule.weekly.length && <p className="rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">No weekly schedule has been configured yet.</p>}
          </div>
          <form onSubmit={saveWeekly} className="mt-5 rounded-xl bg-surface-container-low p-4">
            <h3 className="font-semibold">Add weekly time window</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-xs font-medium">Weekday<select value={newWeekly.dayOfWeek} onChange={(event) => setNewWeekly({ ...newWeekly, dayOfWeek: Number(event.target.value) })} className={inputClass}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="text-xs font-medium">Start<input type="time" value={newWeekly.startTime} onChange={(event) => setNewWeekly({ ...newWeekly, startTime: event.target.value })} className={inputClass} required /></label>
              <label className="text-xs font-medium">End<input type="time" value={newWeekly.endTime} onChange={(event) => setNewWeekly({ ...newWeekly, endTime: event.target.value })} className={inputClass} required /></label>
              <label className="text-xs font-medium">Slot length<input type="number" min="10" max="240" value={newWeekly.slotDurationMinutes} onChange={(event) => setNewWeekly({ ...newWeekly, slotDurationMinutes: Number(event.target.value) })} className={inputClass} required /></label>
              <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={newWeekly.isAvailable} onChange={(event) => setNewWeekly({ ...newWeekly, isAvailable: event.target.checked })} />Accept bookings</label>
            </div>
            <button type="submit" disabled={saving} className="mt-4 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">{saving ? 'Saving...' : 'Add time window'}</button>
          </form>
        </section>

        <section className="space-y-5">
          <form onSubmit={saveException} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="text-lg font-semibold">Date-specific availability</h2>
            <p className="mt-1 text-sm text-on-surface-variant">An exception replaces the weekly schedule for its selected date.</p>
            <label className="mt-4 block text-sm font-medium">Date<input type="date" min={today()} value={exception.availableOn} onChange={(event) => setException({ ...exception, availableOn: event.target.value })} className={inputClass} required /></label>
            <label className="mt-4 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={exception.isAvailable} onChange={(event) => setException({ ...exception, isAvailable: event.target.checked, ...(event.target.checked ? { startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 } : {}) })} />Open for appointments on this date</label>
            {exception.isAvailable && <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-medium">Start<input type="time" value={exception.startTime || ''} onChange={(event) => setException({ ...exception, startTime: event.target.value })} className={inputClass} required /></label><label className="text-xs font-medium">End<input type="time" value={exception.endTime || ''} onChange={(event) => setException({ ...exception, endTime: event.target.value })} className={inputClass} required /></label><label className="col-span-2 text-xs font-medium">Slot length<input type="number" min="10" max="240" value={exception.slotDurationMinutes || 30} onChange={(event) => setException({ ...exception, slotDurationMinutes: Number(event.target.value) })} className={inputClass} /></label></div>}
            <button type="submit" disabled={saving || !exception.availableOn} className="mt-4 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-60">Save date exception</button>
          </form>
          <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <h2 className="text-lg font-semibold">Upcoming exceptions</h2>
            <div className="mt-3 space-y-2">
              {schedule.exceptions.map((item) => <article key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3"><div><p className="font-medium">{new Date(`${item.availableOn}T00:00:00`).toLocaleDateString()}</p><p className="text-sm text-on-surface-variant">{item.isAvailable ? `${item.startTime}–${item.endTime}` : 'Unavailable'}{item.affectedAppointments ? ` · ${item.affectedAppointments} appointments affected` : ''}</p></div><button type="button" disabled={saving} onClick={() => removeException(item.id)} className="min-h-10 shrink-0 rounded-lg px-3 text-sm font-semibold text-error hover:bg-red-50">Remove</button></article>)}
              {!schedule.exceptions.length && <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">No upcoming date exceptions.</p>}
            </div>
          </div>
        </section>
      </div>
    </WorkspaceLayout>
  );
}
