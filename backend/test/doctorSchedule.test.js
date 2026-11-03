import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { saveDoctorDateSchedule } from '../src/repositories/adminScheduleRepository.js';
import { doctorCalendarSchema, doctorDateScheduleSchema } from '../src/validators/workspace.js';

const app = createApp({
  env: {
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:5173',
    JWT_SECRET: 'test-jwt-secret-that-is-long-enough-for-the-test-suite',
    SESSION_IDLE_TIMEOUT_SECONDS: 900,
    SESSION_ABSOLUTE_TIMEOUT_DAYS: 7,
    OTP_HASH_SECRET: 'test-otp-secret-that-is-long-enough-for-the-test-suite',
  },
  healthCheck: async () => {},
});

test('doctor availability calendar validates ranges and generated slot selections', () => {
  assert.equal(doctorCalendarSchema.safeParse({
    query: { from: '2026-11-01', to: '2026-11-30' },
  }).success, true);
  assert.equal(doctorCalendarSchema.safeParse({
    query: { from: '2026-11-30', to: '2026-11-01' },
  }).success, false);
  assert.equal(doctorCalendarSchema.safeParse({
    query: { from: '2026-11-01', to: '2027-01-15' },
  }).success, false);
  assert.equal(doctorDateScheduleSchema.safeParse({
    params: { date: '2026-11-12' },
    body: {
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 30,
      slots: [
        { startTime: '09:00', endTime: '09:30', isAvailable: true },
        { startTime: '09:30', endTime: '10:00', isAvailable: false },
        { startTime: '10:00', endTime: '10:30', isAvailable: true },
      ],
    },
  }).success, true);
  assert.equal(doctorDateScheduleSchema.safeParse({
    params: { date: '2026-11-12' },
    body: {
      startTime: '13:00',
      endTime: '09:00',
      slotDurationMinutes: 30,
      slots: [],
    },
  }).success, false);
});

test('doctor calendar and date schedule endpoints require an authenticated doctor', async () => {
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const csrfResponse = await fetch(`http://127.0.0.1:${port}/api/auth/csrf`);
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.get('set-cookie').split(';')[0];
    for (const [path, method] of [
      ['/api/doctor/schedules/calendar?from=2026-11-01&to=2026-11-30', 'GET'],
      ['/api/doctor/schedules/dates/2026-11-12', 'PUT'],
    ]) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: method === 'PUT' ? {
          'Content-Type': 'application/json',
          Cookie: csrfCookie,
          'X-CSRF-Token': csrfToken,
        } : {},
        body: method === 'PUT' ? JSON.stringify({}) : undefined,
      });
      assert.equal(response.status, 401, `${method} ${path} should require authentication`);
      assert.equal((await response.json()).message, 'Authentication is required.');
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('doctor date schedules reject invalid slot duration, alignment, and overlap before writing', async () => {
  const originalConnect = pool.connect.bind(pool);
  const today = new Date().toISOString().slice(0, 10);
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pastDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let writeCount = 0;
  let bookedAppointments = [];
  pool.connect = async () => ({
    async query(sql) {
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) return { rowCount: 0, rows: [] };
      if (sql.includes('SELECT id, time_zone')) {
        return { rowCount: 1, rows: [{ local_today: today }] };
      }
      if (sql.includes('pg_advisory_xact_lock')) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('FROM appointments appointment')) {
        return { rowCount: bookedAppointments.length, rows: bookedAppointments };
      }
      if (sql.includes('INSERT INTO doctor_availability_date_schedules')
        || sql.includes('DELETE FROM doctor_availability_date_slots')
        || sql.includes('INSERT INTO doctor_availability_date_slots')) {
        writeCount += 1;
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {},
  });

  const schedule = (slots, scheduleDate = date) => saveDoctorDateSchedule({
    doctorId: 'b6fbb5fd-b47e-42df-8728-c5e6636f3a90',
    date: scheduleDate,
    startTime: '09:00',
    endTime: '11:00',
    slotDurationMinutes: 30,
    slots,
  });

  try {
    await assert.rejects(schedule([], pastDate), (error) => error.status === 400);
    for (const slots of [
      [{ startTime: '09:00', endTime: '09:20', isAvailable: true }],
      [{ startTime: '09:10', endTime: '09:40', isAvailable: true }],
      [
        { startTime: '09:00', endTime: '09:30', isAvailable: true },
        { startTime: '09:20', endTime: '09:50', isAvailable: true },
      ],
    ]) {
      await assert.rejects(schedule(slots), (error) => error.status === 400);
    }
    assert.equal(writeCount, 0);

    bookedAppointments = [{ startTime: '09:00', endTime: '09:30' }];
    await assert.rejects(
      schedule([{ startTime: '09:00', endTime: '09:30', isAvailable: false }]),
      (error) => error.status === 409,
    );
    assert.equal(writeCount, 0);

    await schedule([
      { startTime: '09:00', endTime: '09:30', isAvailable: true },
      { startTime: '09:30', endTime: '10:00', isAvailable: false },
    ]);
    assert.equal(writeCount, 3);
  } finally {
    pool.connect = originalConnect;
  }
});
