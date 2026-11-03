import * as scheduleRepository from '../repositories/adminScheduleRepository.js';
import { recordActivity } from './auditService.js';

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function validateDoctor(doctorId) {
  const doctors = await scheduleRepository.listScheduleDoctors();
  if (!doctors.some((doctor) => doctor.id === doctorId)) {
    throw httpError('An active doctor must be selected.', 400);
  }
}

export async function listSchedules(filters) {
  return scheduleRepository.listSchedules(filters);
}

export async function listScheduleDoctors() {
  return scheduleRepository.listScheduleDoctors();
}

export async function createWeekly(payload, actor, request) {
  await validateDoctor(payload.doctorId);
  const schedule = await scheduleRepository.createWeeklySchedule(payload);
  await recordActivity({
    actor, request, eventType: 'doctor.schedule.created',
    details: { availabilityId: schedule.id, doctorId: schedule.doctorId, dayOfWeek: schedule.dayOfWeek },
  });
  return schedule;
}

export async function updateWeekly(availabilityId, payload, actor, request) {
  await validateDoctor(payload.doctorId);
  const schedule = await scheduleRepository.updateWeeklySchedule(availabilityId, payload);
  if (!schedule) throw httpError('The weekly availability entry was not found.', 404);
  await recordActivity({
    actor, request, eventType: 'doctor.schedule.updated',
    details: { availabilityId: schedule.id, doctorId: schedule.doctorId, dayOfWeek: schedule.dayOfWeek },
  });
  return schedule;
}

export async function createException(payload, actor, request) {
  await validateDoctor(payload.doctorId);
  const exception = await scheduleRepository.saveScheduleException(payload);
  await recordActivity({
    actor, request, eventType: 'doctor.schedule_exception.saved',
    details: {
      exceptionId: exception.id,
      doctorId: exception.doctorId,
      availableOn: exception.availableOn,
      isAvailable: exception.isAvailable,
    },
  });
  return exception;
}

export async function updateException(exceptionId, payload, actor, request) {
  const exception = await scheduleRepository.updateScheduleException(exceptionId, payload);
  if (!exception) throw httpError('The schedule exception was not found.', 404);
  await recordActivity({
    actor, request, eventType: 'doctor.schedule_exception.updated',
    details: {
      exceptionId: exception.id,
      doctorId: exception.doctorId,
      availableOn: exception.availableOn,
      isAvailable: exception.isAvailable,
    },
  });
  return exception;
}

export async function deleteException(exceptionId, actor, request) {
  const exception = await scheduleRepository.deleteScheduleException(exceptionId);
  if (!exception) throw httpError('The schedule exception was not found.', 404);
  await recordActivity({
    actor, request, eventType: 'doctor.schedule_exception.removed',
    details: {
      exceptionId: exception.id,
      doctorId: exception.doctorId,
      availableOn: exception.availableOn,
    },
  });
  return exception;
}
