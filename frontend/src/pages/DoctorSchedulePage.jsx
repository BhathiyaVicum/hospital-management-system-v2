import { useEffect, useMemo, useRef, useState } from 'react';
import PortalHeading from '../components/common/PortalHeading';
import WorkspaceLayout from '../components/workspace/WorkspaceLayout';
import { getDoctorScheduleCalendar, saveDoctorDateSchedule } from '../services/api';

const inputClass = 'mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm';
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateFromKey(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function formatTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return dateFromKey(value).toLocaleDateString(undefined, options);
}

function getDayIndicators(day) {
  return {
    hasAvailability: Boolean(day?.slots.some((slot) => slot.enabled)),
    hasBookings: Boolean(day?.slots.some((slot) => slot.booked)),
  };
}

function emptyEditor(day) {
  return {
    startTime: day?.startTime || '09:00',
    endTime: day?.endTime || '17:00',
    slotDurationMinutes: day?.slotDurationMinutes || 30,
    slots: (day?.slots || []).map((slot) => ({
      ...slot,
      selected: slot.enabled || slot.booked,
    })),
    generated: Boolean(day?.slots?.length),
  };
}

// Build slots from start/end/duration. Pure function — no state.
function buildSlots(startTime, endTime, durationMinutes, existingDay, selectedDate, localToday) {
  if (!startTime || !endTime || endTime <= startTime) return [];
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) return [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const starts = [];
  for (let minute = start; minute + duration <= end; minute += duration) {
    starts.push(minutesToTime(minute));
  }
  const existing = new Map((existingDay?.slots || []).map((slot) => [slot.time, slot]));
  const isToday = selectedDate === (existingDay?.localToday || localToday);
  return starts.map((time) => {
    const previous = existing.get(time);
    const slotEndTime = minutesToTime(timeToMinutes(time) + duration);
    const isPast = previous?.isPast || (isToday && time <= (existingDay?.localTime || '00:00'));
    return {
      time,
      endTime: slotEndTime,
      startAt: previous?.startAt || '',
      endAt: previous?.endAt || '',
      booked: previous?.booked || false,
      isPast: Boolean(isPast),
      selected: previous ? previous.enabled || previous.booked : !isPast,
    };
  });
}

export default function DoctorSchedulePage() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [browserToday] = useState(() => dateKey(new Date()));
  const [calendar, setCalendar] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [editor, setEditor] = useState(() => emptyEditor(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const preferredDate = useRef('');

  const monthStart = dateKey(month);
  const monthEnd = dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));

  useEffect(() => {
    let active = true;
    setLoading(true);
    getDoctorScheduleCalendar({ from: monthStart, to: monthEnd })
      .then(({ data }) => {
        if (!active) return;
        setCalendar(data);
        const preferred = preferredDate.current;
        preferredDate.current = '';
        const dateToSelect = data.days.some((day) => day.date === preferred && day.date >= day.localToday)
          ? preferred
          : '';
        setSelectedDate(dateToSelect);
        setEditor(emptyEditor(dateToSelect ? data.days.find((day) => day.date === dateToSelect) : null));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.message || 'Unable to load your availability calendar.');
        setCalendar(null);
        setSelectedDate('');
        setEditor(emptyEditor(null));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [monthStart, monthEnd, refreshVersion]);

  const daysByDate = useMemo(
    () => new Map((calendar?.days || []).map((day) => [day.date, day])),
    [calendar],
  );
  const selectedDay = daysByDate.get(selectedDate);
  const localToday = calendar?.days[0]?.localToday || browserToday;

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  }, [month]);

  // Whenever hours or duration change AND a date is selected, rebuild the slots
  // automatically so the Save button is always usable without an extra click.
  useEffect(() => {
    if (!selectedDate) return;
    const nextSlots = buildSlots(
      editor.startTime,
      editor.endTime,
      editor.slotDurationMinutes,
      selectedDay,
      selectedDate,
      localToday,
    );
    setEditor((current) => ({
      ...current,
      slots: nextSlots,
      generated: nextSlots.length > 0,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.startTime, editor.endTime, editor.slotDurationMinutes, selectedDate]);

  const changeMonth = (amount) => {
    setNotice('');
    setError('');
    setLoading(true);
    setSelectedDate('');
    setEditor(emptyEditor(null));
    preferredDate.current = '';
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectDate = (date) => {
    const day = daysByDate.get(date);
    if (date < (day?.localToday || localToday)) return;
    setSelectedDate(date);
    setEditor(emptyEditor(day));
    setNotice('');
    setError('');
  };

  const clearSelection = () => {
    setSelectedDate('');
    setEditor(emptyEditor(null));
    setNotice('');
    setError('');
  };

  const updateHours = (key, value) => {
    setEditor((current) => ({ ...current, [key]: value }));
    setError('');
    setNotice('');
  };

  const toggleSlot = (time) => {
    setEditor((current) => ({
      ...current,
      slots: current.slots.map((slot) => (
        slot.time === time && !slot.booked && !slot.isPast
          ? { ...slot, selected: !slot.selected }
          : slot
      )),
    }));
    setError('');
    setNotice('');
  };

  const cancelChanges = () => {
    setEditor(emptyEditor(selectedDay));
    setError('');
    setNotice('');
  };

  const saveChanges = async () => {
    if (!selectedDate) {
      setError('Select a date first.');
      return;
    }
    if (!editor.slots.length) {
      setError('No slots to save. Check the start/end time and duration.');
      return;
    }

    const payload = {
      startTime: editor.startTime,
      endTime: editor.endTime,
      slotDurationMinutes: Number(editor.slotDurationMinutes),
      slots: editor.slots.map((slot) => ({
        startTime: slot.time,
        endTime: slot.endTime,
        isAvailable: slot.selected || slot.booked,
      })),
    };

    console.log('[saveDoctorDateSchedule] date =', selectedDate, 'payload =', payload);

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Save request timed out. Check the backend.')), 15000),
      );
      const request = saveDoctorDateSchedule(selectedDate, payload);
      await Promise.race([request, timeout]);
      setNotice('Availability saved. Patient booking has been updated.');
      preferredDate.current = selectedDate;
      setRefreshVersion((version) => version + 1);
    } catch (requestError) {
      console.error('[saveDoctorDateSchedule] failed:', requestError);
      setError(requestError.message || 'Unable to save availability changes.');
    } finally {
      setSaving(false);
    }
  };

  const selectedSlotCount = editor.slots.filter((slot) => slot.selected && !slot.isPast).length;
  const bookedSlotCount = editor.slots.filter((slot) => slot.booked).length;
  const metrics = [
    ['Available slots', calendar?.summary.availableSlots ?? '—', 'event_available'],
    ['Booked slots', calendar?.summary.bookedSlots ?? '—', 'event_busy'],
    ['Upcoming working days', calendar?.summary.upcomingWorkingDays ?? '—', 'calendar_month'],
    ['Next available date', calendar?.summary.nextAvailableDate ? formatDate(calendar.summary.nextAvailableDate, { day: 'numeric', month: 'short' }) : 'None', 'schedule'],
  ];

  return (
    <WorkspaceLayout role="doctor">
      <PortalHeading
        eyebrow="Doctor workspace · availability"
        title="My schedule"
        description="Select a date to create or update appointment slots. Existing bookings are protected automatically."
      />

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section aria-label="Availability overview" className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map(([label, value, icon]) => (
          <article key={label} className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-on-surface-variant sm:text-sm">{label}</p>
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">{icon}</span>
            </div>
            <p className="mt-2 truncate text-xl font-semibold text-on-surface sm:text-2xl">{value}</p>
          </article>
        ))}
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Availability calendar</h2>
              <p className="mt-0.5 text-sm text-on-surface-variant">Choose a future date to manage its slots.</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} disabled={loading || saving} className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-50">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <p className="min-w-28 text-center text-sm font-semibold sm:min-w-36">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
              <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} disabled={loading || saving} className="flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container disabled:opacity-50">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-100 pb-2 text-center text-xs font-semibold text-on-surface-variant">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>

          {loading ? (
            <p role="status" className="py-16 text-center text-sm text-on-surface-variant">Loading your calendar...</p>
          ) : calendar ? (
            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((dateNumber, index) => {
                if (!dateNumber) return <span key={`empty-${index}`} aria-hidden="true" className="min-h-16 sm:min-h-20" />;
                const date = dateKey(new Date(month.getFullYear(), month.getMonth(), dateNumber));
                const day = daysByDate.get(date);
                const past = date < (day?.localToday || localToday);
                const indicators = getDayIndicators(day);
                const isSelected = selectedDate === date;
                const todayDate = date === (day?.localToday || localToday);
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={past || saving}
                    aria-label={`${formatDate(date)}${past ? ', past date' : ''}${indicators.hasAvailability ? ', has availability' : ''}${indicators.hasBookings ? ', has bookings' : ''}`}
                    aria-pressed={isSelected}
                    aria-current={todayDate ? 'date' : undefined}
                    onClick={() => selectDate(date)}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-1 transition sm:min-h-20 sm:gap-1.5 ${
                      isSelected ? 'border-primary bg-primary text-on-primary shadow-sm'
                        : past ? 'cursor-not-allowed border-transparent bg-slate-50 text-slate-300'
                          : 'border-transparent bg-surface-container-low text-on-surface hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${todayDate && !isSelected ? 'text-primary' : ''}`}>{dateNumber}</span>
                    <span className="flex h-1.5 items-center gap-1">
                      {indicators.hasAvailability && <i className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-on-primary' : 'bg-emerald-500'}`} />}
                      {indicators.hasBookings && <i className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-on-primary/70' : 'bg-amber-500'}`} />}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-on-surface-variant">Your calendar could not be loaded.</p>
          )}

          <div aria-label="Calendar legend" className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-on-surface-variant">
            {[
              ['bg-emerald-500', 'Availability'],
              ['bg-amber-500', 'Bookings'],
            ].map(([color, label]) => <span key={label} className="inline-flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}
          </div>
        </section>

        <section className="min-w-0 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
          {!selectedDate ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">event_available</span>
              <p className="mt-3 font-semibold">Select a future date</p>
              <p className="mt-1 text-sm text-on-surface-variant">Daily availability and appointment slots will appear here.</p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Selected date</p>
                  <h2 className="mt-1 text-xl font-semibold">{formatDate(selectedDate)}</h2>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container disabled:opacity-60"
                >
                  Clear selection
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium text-on-surface-variant">Start time
                  <input type="time" value={editor.startTime} disabled={saving} onChange={(event) => updateHours('startTime', event.target.value)} className={inputClass} />
                </label>
                <label className="text-xs font-medium text-on-surface-variant">End time
                  <input type="time" value={editor.endTime} disabled={saving} onChange={(event) => updateHours('endTime', event.target.value)} className={inputClass} />
                </label>
                <label className="text-xs font-medium text-on-surface-variant">Appointment duration (minutes)
                  <input type="number" min="10" max="240" step="1" value={editor.slotDurationMinutes} disabled={saving} onChange={(event) => updateHours('slotDurationMinutes', Number(event.target.value))} className={inputClass} />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Appointment slots</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">Slots are auto-generated from the working hours. Select open times.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                    {selectedSlotCount} selected{bookedSlotCount ? ` · ${bookedSlotCount} booked` : ''}
                  </span>
                </div>

                {editor.slots.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {editor.slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={saving || slot.booked || slot.isPast}
                        aria-pressed={slot.selected}
                        aria-label={`${formatTime(slot.time)}, ${slot.booked ? 'booked' : slot.isPast ? 'past' : slot.selected ? 'available' : 'unavailable'}`}
                        onClick={() => toggleSlot(slot.time)}
                        className={`min-h-12 rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed ${
                          slot.booked ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                            : slot.isPast ? 'border-slate-200 bg-slate-100 text-slate-400'
                              : slot.selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-sm font-semibold">{formatTime(slot.time)}</span>
                        <span className="mt-0.5 block text-[11px]">{slot.booked ? 'Booked · protected' : slot.isPast ? 'Past' : slot.selected ? 'Available' : 'Unavailable'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                    No slots fit within these working hours. Check that the end time is later than the start time and the duration is between 10 and 240 minutes.
                  </p>
                )}
              </div>

              {bookedSlotCount > 0 && <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs leading-relaxed text-indigo-800">Booked times are protected. Changing working hours or duration in a way that affects a booking will be rejected.</p>}

              <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={cancelChanges} disabled={saving} className="min-h-10 rounded-lg px-4 text-sm font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-60">Cancel</button>
                <button type="button" onClick={saveChanges} disabled={saving} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </>
          )}
        </section>
      </div>
    </WorkspaceLayout>
  );
}