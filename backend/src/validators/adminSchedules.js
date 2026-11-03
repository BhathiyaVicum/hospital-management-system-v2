import { z } from 'zod';

const uuid = z.string().uuid();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const duration = z.coerce.number().int().min(10).max(240);
const today = new Date().toISOString().slice(0, 10);
const defaultTo = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

export const schedulesListSchema = z.object({
  query: z.object({
    doctorId: uuid.optional().default(''),
    from: z.string().date().default(today),
    to: z.string().date().default(defaultTo),
  }).refine((value) => value.from <= value.to, {
    message: 'The start date must be on or before the end date.',
  }).refine((value) => (new Date(`${value.to}T00:00:00Z`) - new Date(`${value.from}T00:00:00Z`)) / 86400000 <= 365, {
    message: 'Schedule date ranges cannot exceed one year.',
  }),
});

const weeklyFields = {
  doctorId: uuid,
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  slotDurationMinutes: duration,
  isAvailable: z.boolean(),
};

export const createWeeklyScheduleSchema = z.object({
  body: z.object({ ...weeklyFields, isAvailable: z.boolean().default(true) }).strict()
    .refine((value) => value.endTime > value.startTime, {
      message: 'The end time must be after the start time.',
      path: ['endTime'],
    }),
});

export const updateWeeklyScheduleSchema = z.object({
  params: z.object({ availabilityId: uuid }),
  body: z.object(weeklyFields).strict().refine((value) => value.endTime > value.startTime, {
    message: 'The end time must be after the start time.',
    path: ['endTime'],
  }),
});

const exceptionFields = {
  isAvailable: z.boolean(),
  startTime: time.optional(),
  endTime: time.optional(),
  slotDurationMinutes: duration.optional(),
};

function validateException(value, context) {
  if (value.isAvailable) {
    if (!value.startTime) context.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required for an available date.' });
    if (!value.endTime) context.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required for an available date.' });
    if (!value.slotDurationMinutes) context.addIssue({ code: 'custom', path: ['slotDurationMinutes'], message: 'Slot duration is required for an available date.' });
    if (value.startTime && value.endTime && value.endTime <= value.startTime) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'The end time must be after the start time.' });
    }
  } else if (value.startTime || value.endTime || value.slotDurationMinutes !== undefined) {
    context.addIssue({ code: 'custom', path: ['isAvailable'], message: 'Unavailable dates cannot include time slots.' });
  }
}

export const createScheduleExceptionSchema = z.object({
  body: z.object({
    doctorId: uuid,
    availableOn: z.string().date(),
    ...exceptionFields,
  }).strict().superRefine(validateException),
});

export const updateScheduleExceptionSchema = z.object({
  params: z.object({ exceptionId: uuid }),
  body: z.object(exceptionFields).strict().superRefine(validateException),
});
