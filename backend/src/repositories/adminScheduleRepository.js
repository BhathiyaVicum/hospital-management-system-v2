import { query, withTransaction } from '../config/database.js';

function minutesSinceMidnight(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isCoveredByWindow(appointment, window) {
  const start = minutesSinceMidnight(appointment.startTime);
  const end = minutesSinceMidnight(appointment.endTime);
  const windowStart = minutesSinceMidnight(window.startTime);
  const windowEnd = minutesSinceMidnight(window.endTime);
  return window.isAvailable
    && end - start === Number(window.slotDurationMinutes)
    && start >= windowStart
    && start + Number(window.slotDurationMinutes) <= windowEnd
    && (start - windowStart) % Number(window.slotDurationMinutes) === 0;
}

async function appointmentsForDate(client, doctorId, date) {
  const result = await client.query(
    `SELECT to_char(appointment.scheduled_start AT TIME ZONE doctor.time_zone, 'HH24:MI') AS "startTime",
            to_char(appointment.scheduled_end AT TIME ZONE doctor.time_zone, 'HH24:MI') AS "endTime"
     FROM appointments appointment
     JOIN doctors doctor ON doctor.id = appointment.doctor_id
     WHERE appointment.doctor_id = $1 AND appointment.status <> 'cancelled'
       AND appointment.scheduled_end > now()
       AND (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date = $2::date`,
    [doctorId, date],
  );
  return result.rows;
}

async function assertAppointmentsFitWindows(client, doctorId, date, windows) {
  const appointments = await appointmentsForDate(client, doctorId, date);
  if (appointments.some((appointment) => !windows.some((window) => isCoveredByWindow(appointment, window)))) {
    throw Object.assign(
      new Error('These changes conflict with an existing appointment. Booked times must remain enabled and unchanged.'),
      { status: 409 },
    );
  }
}

function weeklyDayOfWeek(date) {
  return new Date(`${String(date).slice(0, 10)}T00:00:00Z`).getUTCDay();
}

async function weeklyWindows(client, doctorId, dayOfWeek, excludedAvailabilityId = null) {
  const result = await client.query(
    `SELECT to_char(start_time, 'HH24:MI') AS "startTime",
            to_char(end_time, 'HH24:MI') AS "endTime",
            slot_duration_minutes AS "slotDurationMinutes",
            is_available AS "isAvailable"
     FROM doctor_availability
     WHERE doctor_id = $1 AND day_of_week = $2
       AND ($3::uuid IS NULL OR id <> $3)`,
    [doctorId, dayOfWeek, excludedAvailabilityId],
  );
  return result.rows;
}

export async function listSchedules({ doctorId, from, to }) {
  const doctorFilter = doctorId ? 'WHERE account.is_active = TRUE AND d.id = $1' : 'WHERE account.is_active = TRUE';
  const doctorValues = doctorId ? [doctorId] : [];
  const weekly = await query(
    `SELECT availability.id, availability.doctor_id AS "doctorId",
            account.name AS "doctorName", availability.day_of_week AS "dayOfWeek",
            to_char(availability.start_time, 'HH24:MI') AS "startTime",
            to_char(availability.end_time, 'HH24:MI') AS "endTime",
            availability.slot_duration_minutes AS "slotDurationMinutes",
            availability.is_available AS "isAvailable"
     FROM doctor_availability availability
     JOIN doctors d ON d.id = availability.doctor_id
     JOIN users account ON account.id = d.user_id
     ${doctorFilter}
     ORDER BY account.name, availability.day_of_week, availability.start_time`,
    doctorValues,
  );
  const exceptionFilters = ['account.is_active = TRUE', 'exception.available_on >= $1::date', 'exception.available_on <= $2::date'];
  const exceptionValues = [from, to];
  if (doctorId) {
    exceptionValues.push(doctorId);
    exceptionFilters.push(`d.id = $${exceptionValues.length}`);
  }
  const exceptions = await query(
    `SELECT exception.id, exception.doctor_id AS "doctorId", account.name AS "doctorName",
            exception.available_on AS "availableOn",
            to_char(exception.start_time, 'HH24:MI') AS "startTime",
            to_char(exception.end_time, 'HH24:MI') AS "endTime",
            exception.slot_duration_minutes AS "slotDurationMinutes",
            exception.is_available AS "isAvailable",
            (SELECT count(*)::int FROM appointments appointment
             WHERE appointment.doctor_id = exception.doctor_id
               AND appointment.status = 'confirmed'
               AND appointment.scheduled_start >= now()
               AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = exception.available_on
            ) AS "affectedAppointments"
     FROM doctor_availability_exceptions exception
     JOIN doctors d ON d.id = exception.doctor_id
     JOIN users account ON account.id = d.user_id
     WHERE ${exceptionFilters.join(' AND ')}
     ORDER BY exception.available_on, account.name`,
    exceptionValues,
  );
  return { weekly: weekly.rows, exceptions: exceptions.rows };
}

export async function getDoctorCalendar({ doctorId, from, to }) {
  const result = await query(
    `WITH doctor_info AS (
      SELECT d.id, d.time_zone,
             (now() AT TIME ZONE d.time_zone)::date AS local_today,
             to_char(now() AT TIME ZONE d.time_zone, 'HH24:MI') AS local_time
       FROM doctors d
       WHERE d.id = $1
     ),
     days AS (
       SELECT doctor_info.id AS doctor_id, doctor_info.time_zone,
              doctor_info.local_today, doctor_info.local_time,
              series.local_date::date AS local_date
       FROM doctor_info
       CROSS JOIN generate_series($2::date, $3::date, interval '1 day') AS series(local_date)
     ),
     exceptions AS (
       SELECT DISTINCT ON (exception.available_on) exception.*
       FROM doctor_availability_exceptions exception
       WHERE exception.doctor_id = $1
         AND exception.available_on BETWEEN $2::date AND $3::date
       ORDER BY exception.available_on, exception.created_at DESC, exception.id DESC
     ),
     date_schedules AS (
       SELECT doctor_id, available_on, start_time, end_time, slot_duration_minutes
       FROM doctor_availability_date_schedules
       WHERE doctor_id = $1 AND available_on BETWEEN $2::date AND $3::date
     ),
     explicit_settings AS (
       SELECT doctor_id, available_on, start_time, end_time, slot_duration_minutes
       FROM date_schedules
     ),
     windows AS (
       SELECT days.doctor_id, days.time_zone, days.local_date,
              exception.start_time, exception.end_time, exception.slot_duration_minutes
       FROM days
       JOIN exceptions exception ON exception.available_on = days.local_date
       WHERE exception.is_available = TRUE
         AND NOT EXISTS (
           SELECT 1 FROM date_schedules date_schedule
           WHERE date_schedule.doctor_id = days.doctor_id
             AND date_schedule.available_on = days.local_date
         )
       UNION ALL
       SELECT days.doctor_id, days.time_zone, days.local_date,
              availability.start_time, availability.end_time, availability.slot_duration_minutes
       FROM days
       JOIN doctor_availability availability
         ON availability.doctor_id = days.doctor_id
        AND availability.day_of_week = EXTRACT(DOW FROM days.local_date)
        AND availability.is_available = TRUE
       WHERE NOT EXISTS (
         SELECT 1 FROM exceptions exception WHERE exception.available_on = days.local_date
       )
       AND NOT EXISTS (
         SELECT 1 FROM date_schedules date_schedule
         WHERE date_schedule.doctor_id = days.doctor_id
           AND date_schedule.available_on = days.local_date
       )
     ),
     settings AS (
       SELECT days.doctor_id, days.local_date, days.local_today, days.local_time,
              (date_schedules.doctor_id IS NOT NULL OR exceptions.id IS NOT NULL) AS has_exception,
              (date_schedules.doctor_id IS NOT NULL) AS has_date_schedule,
              (date_schedules.doctor_id IS NOT NULL OR exceptions.id IS NOT NULL
                OR count(windows.local_date) > 0) AS is_configured,
              COALESCE(explicit_settings.start_time, min(windows.start_time)) AS start_time,
              COALESCE(explicit_settings.end_time, max(windows.end_time)) AS end_time,
              COALESCE(explicit_settings.slot_duration_minutes, min(windows.slot_duration_minutes)::int) AS slot_duration_minutes
       FROM days
       LEFT JOIN exceptions ON exceptions.available_on = days.local_date
       LEFT JOIN date_schedules ON date_schedules.available_on = days.local_date
       LEFT JOIN explicit_settings ON explicit_settings.available_on = days.local_date
       LEFT JOIN windows ON windows.local_date = days.local_date
       GROUP BY days.doctor_id, days.local_date, days.local_today, days.local_time,
                exceptions.id, date_schedules.doctor_id,
                explicit_settings.start_time, explicit_settings.end_time,
                explicit_settings.slot_duration_minutes
     ),
     generated_slots AS (
       SELECT windows.doctor_id, windows.time_zone, windows.local_date,
              slot.local_start,
              slot.local_start + windows.slot_duration_minutes * interval '1 minute' AS local_end,
              (slot.local_start AT TIME ZONE windows.time_zone) AS starts_at,
              ((slot.local_start + windows.slot_duration_minutes * interval '1 minute')
                AT TIME ZONE windows.time_zone) AS ends_at,
              TRUE AS enabled
       FROM windows
       CROSS JOIN LATERAL generate_series(
         windows.local_date + windows.start_time,
         windows.local_date + windows.end_time
           - windows.slot_duration_minutes * interval '1 minute',
         windows.slot_duration_minutes * interval '1 minute'
       ) AS slot(local_start)
     ),
     explicit_slots AS (
       SELECT date_schedule.doctor_id, days.time_zone, date_schedule.available_on AS local_date,
              date_schedule.available_on + date_slot.start_time AS local_start,
              date_schedule.available_on + date_slot.end_time AS local_end,
              ((date_schedule.available_on + date_slot.start_time) AT TIME ZONE days.time_zone) AS starts_at,
              ((date_schedule.available_on + date_slot.end_time) AT TIME ZONE days.time_zone) AS ends_at,
              date_slot.is_available AS enabled
       FROM date_schedules date_schedule
       JOIN days ON days.doctor_id = date_schedule.doctor_id
                AND days.local_date = date_schedule.available_on
       JOIN doctor_availability_date_slots date_slot
         ON date_slot.doctor_id = date_schedule.doctor_id
        AND date_slot.available_on = date_schedule.available_on
     ),
     slots AS (
       SELECT * FROM generated_slots
       UNION ALL
       SELECT * FROM explicit_slots
     )
     SELECT settings.local_date::text AS date,
            settings.local_today::text AS "localToday",
     settings.local_time AS "localTime",
            settings.has_exception AS "hasException",
            settings.has_date_schedule AS "hasDateSchedule",
            settings.is_configured AS "isConfigured",
            to_char(settings.start_time, 'HH24:MI') AS "startTime",
            to_char(settings.end_time, 'HH24:MI') AS "endTime",
            settings.slot_duration_minutes AS "slotDurationMinutes",
            slots.starts_at AS "startAt",
            slots.ends_at AS "endAt",
            to_char(slots.local_start, 'HH24:MI') AS time,
            to_char(slots.local_end, 'HH24:MI') AS "slotEndTime",
            slots.enabled AS enabled,
            (slots.starts_at <= now()) AS "isPast",
            EXISTS (
              SELECT 1 FROM appointments appointment
              WHERE appointment.doctor_id = settings.doctor_id
                AND appointment.status <> 'cancelled'
                AND appointment.scheduled_start < slots.ends_at
                AND appointment.scheduled_end > slots.starts_at
            ) AS booked
     FROM settings
     LEFT JOIN slots
       ON slots.doctor_id = settings.doctor_id AND slots.local_date = settings.local_date
     ORDER BY settings.local_date, slots.local_start`,
    [doctorId, from, to],
  );
  const days = new Map();
  for (const row of result.rows) {
    let day = days.get(row.date);
    if (!day) {
      day = {
        date: row.date,
        localToday: row.localToday,
        localTime: row.localTime,
        hasException: row.hasException,
        isConfigured: row.isConfigured,
        startTime: row.startTime,
        endTime: row.endTime,
        slotDurationMinutes: row.slotDurationMinutes,
        hasDateSchedule: row.hasDateSchedule,
        slots: [],
      };
      days.set(row.date, day);
    }
    if (row.startAt) {
      day.slots.push({
        time: row.time,
        startAt: row.startAt,
        endAt: row.endAt,
        endTime: row.slotEndTime,
        enabled: row.enabled,
        booked: row.booked,
        isPast: row.isPast,
      });
    }
  }
  const calendarDays = [...days.values()];
  const upcoming = calendarDays
    .filter((day) => day.date >= day.localToday)
    .map((day) => ({
      date: day.date,
      availableSlots: day.slots.filter((slot) => slot.enabled && !slot.booked && !slot.isPast).length,
      bookedSlots: day.slots.filter((slot) => slot.booked).length,
    }));
  const workingDays = upcoming.filter((day) => day.availableSlots > 0);
  return {
    days: calendarDays,
    summary: {
      availableSlots: upcoming.reduce((total, day) => total + day.availableSlots, 0),
      bookedSlots: upcoming.reduce((total, day) => total + day.bookedSlots, 0),
      upcomingWorkingDays: workingDays.length,
      nextAvailableDate: workingDays[0]?.date || null,
    },
  };
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function saveDoctorDateSchedule({ doctorId, date, startTime, endTime, slotDurationMinutes, slots }) {
  return withTransaction(async (client) => {
    const doctorResult = await client.query(
      `SELECT id, time_zone, (now() AT TIME ZONE time_zone)::date AS local_today
       FROM doctors WHERE id = $1 FOR UPDATE`,
      [doctorId],
    );
    if (!doctorResult.rowCount) return null;
    // const localToday = String(doctorResult.rows[0].local_today).slice(0, 10);
    // if (date < localToday) {
    //   throw Object.assign(new Error('Availability cannot be changed for a past date.'), { status: 400 });
    // }
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [doctorId, date]);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const duration = Number(slotDurationMinutes);
    const sortedSlots = [...slots].sort((left, right) => left.startTime.localeCompare(right.startTime));
    for (let index = 0; index < sortedSlots.length; index += 1) {
      const slot = sortedSlots[index];
      const slotStart = timeToMinutes(slot.startTime);
      const slotEnd = timeToMinutes(slot.endTime);
      if (slot.startTime >= slot.endTime
        || slotStart < startMinutes
        || slotEnd > endMinutes
        || slotEnd - slotStart !== duration
        || (slotStart - startMinutes) % duration !== 0
        || (index > 0 && sortedSlots[index - 1].endTime > slot.startTime)) {
        throw Object.assign(
          new Error('Slots must match the appointment duration, fit within working hours, align with the start time, and cannot overlap.'),
          { status: 400 },
        );
      }
    }

    const bookedAppointments = await appointmentsForDate(client, doctorId, date);
    for (const appointment of bookedAppointments) {
      const matchingSlot = sortedSlots.find((slot) => (
        slot.startTime === appointment.startTime
        && slot.endTime === appointment.endTime
        && slot.isAvailable
      ));
      if (!matchingSlot) {
        throw Object.assign(
          new Error('These changes conflict with an existing appointment. Booked times must remain enabled and unchanged.'),
          { status: 409 },
        );
      }
    }

    await client.query(
      `INSERT INTO doctor_availability_date_schedules
         (doctor_id, available_on, start_time, end_time, slot_duration_minutes)
       VALUES ($1, $2::date, $3::time, $4::time, $5)
       ON CONFLICT (doctor_id, available_on) DO UPDATE
       SET start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           slot_duration_minutes = EXCLUDED.slot_duration_minutes,
           updated_at = now()`,
      [doctorId, date, startTime, endTime, slotDurationMinutes],
    );
    await client.query(
      `DELETE FROM doctor_availability_date_slots
       WHERE doctor_id = $1 AND available_on = $2::date`,
      [doctorId, date],
    );
    if (sortedSlots.length) {
      await client.query(
        `INSERT INTO doctor_availability_date_slots
           (doctor_id, available_on, start_time, end_time, is_available)
         SELECT $1, $2::date, slot.start_time::time, slot.end_time::time, slot.is_available
         FROM unnest($3::text[], $4::text[], $5::boolean[])
           AS slot(start_time, end_time, is_available)`,
        [
          doctorId,
          date,
          sortedSlots.map((slot) => slot.startTime),
          sortedSlots.map((slot) => slot.endTime),
          sortedSlots.map((slot) => slot.isAvailable),
        ],
      );
    }
    return {
      date,
      slotCount: sortedSlots.length,
      availableSlotCount: sortedSlots.filter((slot) => slot.isAvailable).length,
    };
  });
}

export async function listScheduleDoctors() {
  const result = await query(
    `SELECT d.id, account.name, d.time_zone AS "timeZone"
     FROM doctors d JOIN users account ON account.id = d.user_id
     WHERE account.is_active = TRUE ORDER BY account.name`,
  );
  return result.rows;
}

export async function createWeeklySchedule(payload) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [payload.doctorId, String(payload.dayOfWeek)]);
    if (payload.isAvailable) {
      const overlap = await client.query(
        `SELECT 1 FROM doctor_availability
         WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = TRUE
           AND start_time < $4::time AND end_time > $3::time
         LIMIT 1`,
        [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime],
      );
      if (overlap.rowCount) throw Object.assign(new Error('This schedule overlaps another active time window for the doctor.'), { status: 409 });
    }
    const result = await client.query(
      `INSERT INTO doctor_availability
         (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_available)
       VALUES ($1, $2, $3::time, $4::time, $5, $6)
       RETURNING id, doctor_id AS "doctorId", day_of_week AS "dayOfWeek",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, payload.slotDurationMinutes, payload.isAvailable],
    );
    return result.rows[0];
  });
}

export async function updateWeeklySchedule(availabilityId, payload, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const current = await client.query(
      `SELECT id, doctor_id AS "doctorId", day_of_week AS "dayOfWeek",
              to_char(start_time, 'HH24:MI') AS "startTime",
              to_char(end_time, 'HH24:MI') AS "endTime",
              slot_duration_minutes AS "slotDurationMinutes",
              is_available AS "isAvailable"
       FROM doctor_availability
       WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2) FOR UPDATE`,
      [availabilityId, authorizedDoctorId],
    );
    if (!current.rowCount) return null;
    await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [current.rows[0].doctorId]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [payload.doctorId, String(payload.dayOfWeek)]);
    if (current.rows[0].dayOfWeek !== payload.dayOfWeek) {
      await client.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [payload.doctorId, String(current.rows[0].dayOfWeek)],
      );
    }

    const affectedDays = [...new Set([current.rows[0].dayOfWeek, payload.dayOfWeek])];
    const appointments = await client.query(
      `SELECT (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date::text AS date,
              EXTRACT(DOW FROM appointment.scheduled_start AT TIME ZONE doctor.time_zone)::int AS "dayOfWeek",
              to_char(appointment.scheduled_start AT TIME ZONE doctor.time_zone, 'HH24:MI') AS "startTime",
              to_char(appointment.scheduled_end AT TIME ZONE doctor.time_zone, 'HH24:MI') AS "endTime"
       FROM appointments appointment
       JOIN doctors doctor ON doctor.id = appointment.doctor_id
       WHERE appointment.doctor_id = $1 AND appointment.status <> 'cancelled'
         AND appointment.scheduled_end > now()
         AND EXTRACT(DOW FROM appointment.scheduled_start AT TIME ZONE doctor.time_zone)::int = ANY($2::int[])
         AND NOT EXISTS (
           SELECT 1 FROM doctor_availability_exceptions exception
           WHERE exception.doctor_id = appointment.doctor_id
             AND exception.available_on = (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date
         )
         AND NOT EXISTS (
           SELECT 1 FROM doctor_availability_date_schedules date_schedule
           WHERE date_schedule.doctor_id = appointment.doctor_id
             AND date_schedule.available_on = (appointment.scheduled_start AT TIME ZONE doctor.time_zone)::date
         )`,
      [current.rows[0].doctorId, affectedDays],
    );
    const windowsByDay = new Map();
    for (const dayOfWeek of affectedDays) {
      windowsByDay.set(
        dayOfWeek,
        await weeklyWindows(client, current.rows[0].doctorId, dayOfWeek, availabilityId),
      );
    }
    const previousWindow = {
      ...current.rows[0],
      isAvailable: current.rows[0].isAvailable,
    };
    const updatedWindow = {
      startTime: payload.startTime,
      endTime: payload.endTime,
      slotDurationMinutes: payload.slotDurationMinutes,
      isAvailable: payload.isAvailable,
    };
    const conflicts = appointments.rows.some((appointment) => {
      const dayOfWeek = Number(appointment.dayOfWeek);
      const otherWindows = windowsByDay.get(dayOfWeek) || [];
      const previousWindows = [...otherWindows, ...(dayOfWeek === current.rows[0].dayOfWeek ? [previousWindow] : [])];
      const updatedWindows = [...otherWindows, ...(dayOfWeek === payload.dayOfWeek ? [updatedWindow] : [])];
      const wasCovered = previousWindows.some((window) => isCoveredByWindow(appointment, window));
      return wasCovered && !updatedWindows.some((window) => isCoveredByWindow(appointment, window));
    });
    if (conflicts) {
      throw Object.assign(
        new Error('This change would remove or alter availability for an existing appointment.'),
        { status: 409 },
      );
    }
    if (payload.isAvailable) {
      const overlap = await client.query(
        `SELECT 1 FROM doctor_availability
         WHERE doctor_id = $1 AND day_of_week = $2 AND is_available = TRUE AND id <> $5
           AND start_time < $4::time AND end_time > $3::time
         LIMIT 1`,
        [payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, availabilityId],
      );
      if (overlap.rowCount) throw Object.assign(new Error('This schedule overlaps another active time window for the doctor.'), { status: 409 });
    }
    const result = await client.query(
      `UPDATE doctor_availability
       SET doctor_id = $2, day_of_week = $3, start_time = $4::time, end_time = $5::time,
           slot_duration_minutes = $6, is_available = $7
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", day_of_week AS "dayOfWeek",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [availabilityId, payload.doctorId, payload.dayOfWeek, payload.startTime, payload.endTime, payload.slotDurationMinutes, payload.isAvailable],
    );
    return result.rows[0];
  });
}

export async function saveScheduleException(payload) {
  return withTransaction(async (client) => {
    await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [payload.doctorId]);
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [payload.doctorId, payload.availableOn],
    );
    await assertAppointmentsFitWindows(
      client,
      payload.doctorId,
      payload.availableOn,
      payload.isAvailable ? [{
        startTime: payload.startTime,
        endTime: payload.endTime,
        slotDurationMinutes: payload.slotDurationMinutes,
        isAvailable: true,
      }] : [],
    );
    const existing = await client.query(
      `SELECT id FROM doctor_availability_exceptions
       WHERE doctor_id = $1 AND available_on = $2::date
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [payload.doctorId, payload.availableOn],
    );
    const values = [
      payload.doctorId,
      payload.availableOn,
      payload.isAvailable ? payload.startTime : null,
      payload.isAvailable ? payload.endTime : null,
      payload.isAvailable ? payload.slotDurationMinutes : null,
      payload.isAvailable,
    ];
    const result = existing.rowCount
      ? await client.query(
        `UPDATE doctor_availability_exceptions
         SET start_time = $2::time, end_time = $3::time,
             slot_duration_minutes = $4, is_available = $5
         WHERE id = $1
         RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
           to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
           slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
        [existing.rows[0].id, ...values.slice(2)],
      )
      : await client.query(
        `INSERT INTO doctor_availability_exceptions
           (doctor_id, available_on, start_time, end_time, slot_duration_minutes, is_available)
         VALUES ($1, $2::date, $3::time, $4::time, $5, $6)
         RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
           to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
           slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
        values,
      );
    const impact = await client.query(
      `SELECT count(*)::int AS count
       FROM appointments appointment
       JOIN doctors d ON d.id = appointment.doctor_id
       WHERE appointment.doctor_id = $1
         AND appointment.status = 'confirmed'
         AND appointment.scheduled_start >= now()
         AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = $2::date`,
      [payload.doctorId, payload.availableOn],
    );
    return { ...result.rows[0], affectedAppointments: impact.rows[0].count };
  });
}

export async function updateScheduleException(exceptionId, payload, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const identity = await client.query(
      `SELECT doctor_id AS "doctorId", available_on AS "availableOn"
       FROM doctor_availability_exceptions
       WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2)`,
      [exceptionId, authorizedDoctorId],
    );
    if (!identity.rowCount) return null;
    await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [identity.rows[0].doctorId]);
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [identity.rows[0].doctorId, identity.rows[0].availableOn],
    );
    const existing = await client.query(
      'SELECT id FROM doctor_availability_exceptions WHERE id = $1 FOR UPDATE',
      [exceptionId],
    );
    if (!existing.rowCount) return null;
    await assertAppointmentsFitWindows(
      client,
      identity.rows[0].doctorId,
      identity.rows[0].availableOn,
      payload.isAvailable ? [{
        startTime: payload.startTime,
        endTime: payload.endTime,
        slotDurationMinutes: payload.slotDurationMinutes,
        isAvailable: true,
      }] : [],
    );
    const result = await client.query(
      `UPDATE doctor_availability_exceptions
       SET start_time = $2::time, end_time = $3::time,
           slot_duration_minutes = $4, is_available = $5
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn",
         to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime",
         slot_duration_minutes AS "slotDurationMinutes", is_available AS "isAvailable"`,
      [
        exceptionId,
        payload.isAvailable ? payload.startTime : null,
        payload.isAvailable ? payload.endTime : null,
        payload.isAvailable ? payload.slotDurationMinutes : null,
        payload.isAvailable,
      ],
    );
    const impact = await client.query(
      `SELECT count(*)::int AS count
       FROM appointments appointment
       JOIN doctors d ON d.id = appointment.doctor_id
       WHERE appointment.doctor_id = $1
         AND appointment.status = 'confirmed'
         AND appointment.scheduled_start >= now()
         AND (appointment.scheduled_start AT TIME ZONE d.time_zone)::date = $2::date`,
      [result.rows[0].doctorId, result.rows[0].availableOn],
    );
    return { ...result.rows[0], affectedAppointments: impact.rows[0].count };
  });
}

export async function deleteScheduleException(exceptionId, authorizedDoctorId = null) {
  return withTransaction(async (client) => {
    const identity = await client.query(
      `SELECT doctor_id AS "doctorId", available_on AS "availableOn"
       FROM doctor_availability_exceptions
       WHERE id = $1 AND ($2::uuid IS NULL OR doctor_id = $2)`,
      [exceptionId, authorizedDoctorId],
    );
    if (!identity.rowCount) return null;
    await client.query('SELECT id FROM doctors WHERE id = $1 FOR UPDATE', [identity.rows[0].doctorId]);
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [identity.rows[0].doctorId, identity.rows[0].availableOn],
    );
    const fallbackException = await client.query(
      `SELECT is_available AS "isAvailable",
              to_char(start_time, 'HH24:MI') AS "startTime",
              to_char(end_time, 'HH24:MI') AS "endTime",
              slot_duration_minutes AS "slotDurationMinutes"
       FROM doctor_availability_exceptions
       WHERE doctor_id = $1 AND available_on = $2::date AND id <> $3
       ORDER BY created_at DESC, id DESC LIMIT 1`,
      [identity.rows[0].doctorId, identity.rows[0].availableOn, exceptionId],
    );
    const fallbackWindows = fallbackException.rowCount
      ? (fallbackException.rows[0].isAvailable ? [{ ...fallbackException.rows[0], isAvailable: true }] : [])
      : await weeklyWindows(
        client,
        identity.rows[0].doctorId,
        weeklyDayOfWeek(identity.rows[0].availableOn),
      );
    await assertAppointmentsFitWindows(
      client,
      identity.rows[0].doctorId,
      identity.rows[0].availableOn,
      fallbackWindows,
    );
    const result = await client.query(
      `DELETE FROM doctor_availability_exceptions
       WHERE id = $1
       RETURNING id, doctor_id AS "doctorId", available_on AS "availableOn"`,
      [exceptionId],
    );
    return result.rows[0] || null;
  });
}
