import { useMemo, useState } from 'react';

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isSameMonth(first, second) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function getTimePeriod(time) {
  const hour = Number(time.slice(0, 2)) % 12 + (time.endsWith('PM') ? 12 : 0);
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export default function AppointmentBookingCard({ doctor, slots, status, submitting = false, onBook, submitLabel = 'Continue to review' }) {
  const firstAvailableSlot = slots.find((slot) => slot.available);
  const [selectedDate, setSelectedDate] = useState(firstAvailableSlot?.date || '');
  const [selectedSlotId, setSelectedSlotId] = useState(firstAvailableSlot?.id || '');
  const [visibleMonth, setVisibleMonth] = useState(() => (
    firstAvailableSlot ? dateFromKey(firstAvailableSlot.date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  ));

  const availableSlotsByDate = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      if (!slot.available) continue;
      const dailySlots = map.get(slot.date) || [];
      dailySlots.push(slot);
      map.set(slot.date, dailySlots);
    }
    return map;
  }, [slots]);

  const availableDates = useMemo(() => [...availableSlotsByDate.keys()].sort(), [availableSlotsByDate]);
  const activeDate = availableSlotsByDate.has(selectedDate) ? selectedDate : firstAvailableSlot?.date || '';
  const selectedDateSlots = availableSlotsByDate.get(activeDate) || [];
  const activeSlotId = selectedDateSlots.some((slot) => slot.id === selectedSlotId)
    ? selectedSlotId
    : selectedDateSlots[0]?.id || '';
  const earliestDate = availableDates[0] ? dateFromKey(availableDates[0]) : startOfToday();
  const latestDate = availableDates.length ? dateFromKey(availableDates[availableDates.length - 1]) : startOfToday();
  const firstVisibleMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  const lastVisibleMonth = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
  const selectedSlot = selectedDateSlots.find((slot) => slot.id === activeSlotId);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const calendarDays = [
    ...Array(leadingDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const changeMonth = (amount) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectDate = (key) => {
    const dateSlots = availableSlotsByDate.get(key) || [];
    if (!dateSlots.length) return;
    setSelectedDate(key);
    setSelectedSlotId(dateSlots[0].id);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedSlot) onBook(selectedSlot);
  };

  const selectedDateLabel = activeDate
    ? dateFromKey(activeDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : '';
  const groupedSlots = ['Morning', 'Afternoon', 'Evening']
    .map((period) => ({ period, slots: selectedDateSlots.filter((slot) => getTimePeriod(slot.time) === period) }))
    .filter((group) => group.slots.length);

  return (
    <aside className="h-fit rounded-2xl bg-surface-container-lowest p-5 shadow-md sm:p-6 lg:sticky lg:top-24">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-on-surface">Book an Appointment</h3>
          <p className="mt-1 text-xs text-on-surface-variant">Direct scheduling with {doctor.name}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
          <span className="material-symbols-outlined">event_available</span>
        </span>
      </div>

      <div className="mb-5">
        <span className="mb-2 block text-sm font-semibold text-on-surface">Visit Type</span>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container p-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary">domain</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-on-surface">In-Clinic</span>
              <span className="block truncate text-xs text-on-surface-variant">{doctor.clinic}</span>
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-on-surface">{doctor.consultationFee}</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-on-surface">Select Date</span>
          <div className="flex items-center gap-1">
            <span className="mr-1 text-xs font-medium text-on-surface">
              {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              disabled={isSameMonth(visibleMonth, firstVisibleMonth) || visibleMonth < firstVisibleMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              disabled={isSameMonth(visibleMonth, lastVisibleMonth) || visibleMonth > lastVisibleMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-on-surface-variant">
          {weekdays.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;

            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
            const key = dateKey(date);
            const isAvailable = Boolean(availableSlotsByDate.get(key)?.length);
            const isPast = date < startOfToday();
            const isSelected = activeDate === key;
            const selectable = isAvailable && !isPast;

            return (
              <button
                key={key}
                type="button"
                disabled={!selectable}
                onClick={() => selectDate(key)}
                aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                aria-pressed={isSelected}
                className={`relative flex h-10 min-w-0 flex-col items-center justify-center rounded-lg text-sm transition ${
                  isSelected
                    ? 'bg-primary font-semibold text-on-primary shadow-sm'
                    : selectable
                      ? 'text-on-surface hover:bg-surface-container-high'
                      : 'cursor-not-allowed text-slate-300'
                }`}
              >
                {day}
                {selectable && (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>
        {!slots.length && <p className="mt-3 text-sm text-on-surface-variant">No upcoming appointment dates are available.</p>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-on-surface">
              {selectedDateLabel ? `Available Slots: ${selectedDateLabel}` : 'Available Slots'}
            </span>
            {selectedDateSlots.length > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {selectedDateSlots.length} Open
              </span>
            )}
          </div>

          {groupedSlots.length ? (
            <div className="space-y-4">
              {groupedSlots.map(({ period, slots: periodSlots }) => (
                <div key={period}>
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">
                      {period === 'Morning' ? 'wb_sunny' : period === 'Afternoon' ? 'partly_cloudy_day' : 'bedtime'}
                    </span>
                    {period}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {periodSlots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        aria-pressed={activeSlotId === slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`min-h-10 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
                          activeSlotId === slot.id
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container text-on-surface hover:bg-primary-fixed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
              {slots.length ? 'Select a highlighted date to see available times.' : 'No appointment times are available right now.'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!selectedSlot || submitting}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Please wait...' : submitLabel}
        </button>
      </form>

      {status && (
        <p role="status" className="mt-4 rounded-xl bg-surface-container p-3 text-sm text-on-surface-variant">
          {status}
        </p>
      )}
    </aside>
  );
}
