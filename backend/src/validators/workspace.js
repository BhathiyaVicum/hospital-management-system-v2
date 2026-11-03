import { z } from 'zod';

const uuid = z.string().uuid();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const duration = z.coerce.number().int().min(10).max(240);
const page = {
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
};
const dateRange = {
  from: z.string().date().optional(),
  to: z.string().date().optional(),
};

function orderedDates(value, context) {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({ code: 'custom', path: ['from'], message: 'The start date must be on or before the end date.' });
  }
}

export const workspaceAppointmentListSchema = z.object({
  query: z.object({
    ...dateRange,
    status: z.enum(['', 'scheduled', 'arrived', 'checked_in', 'waiting', 'in_consultation', 'completed', 'no_show']).optional().default(''),
    clinicId: uuid.optional().default(''),
    ...page,
  }).superRefine(orderedDates),
});
export const doctorAppointmentListSchema = workspaceAppointmentListSchema;
export const receptionistAppointmentListSchema = workspaceAppointmentListSchema;

export const doctorProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(32).optional().default(''),
    title: z.string().trim().min(1).max(120),
    bio: z.string().trim().max(5000).default(''),
    yearsOfExperience: z.number().int().min(0).max(80).nullable().default(null),
    education: z.string().trim().max(2000).default(''),
    languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    timeZone: z.string().trim().min(1).max(80),
    image: z.string().url().max(2048).nullable().default(null),
  }).strict(),
});
export const receptionistProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(32).optional().default(''),
  }).strict(),
});

export const workspaceAppointmentIdSchema = z.object({
  params: z.object({ appointmentId: uuid }),
});
export const receptionistAppointmentIdSchema = workspaceAppointmentIdSchema;

export const doctorWorkflowSchema = z.object({
  params: z.object({ appointmentId: uuid }),
  body: z.object({
    workflowStatus: z.enum(['in_consultation', 'completed', 'no_show']),
  }).strict(),
});

export const consultationSchema = z.object({
  params: z.object({ appointmentId: uuid }),
  body: z.object({
    clinicalNotes: z.string().max(20000).default(''),
    assessment: z.string().max(5000).default(''),
    treatmentPlan: z.string().max(10000).default(''),
    followUpNotes: z.string().max(5000).default(''),
  }).strict(),
});

export const doctorScheduleListSchema = z.object({
  query: z.object({
    from: z.string().date().default(() => new Date().toISOString().slice(0, 10)),
    to: z.string().date().default(() => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)),
  }).superRefine(orderedDates),
});

const weeklySchedule = {
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  slotDurationMinutes: duration,
  isAvailable: z.boolean(),
};
export const doctorWeeklyScheduleSchema = z.object({
  body: z.object(weeklySchedule).strict().refine((value) => value.endTime > value.startTime, {
    message: 'The end time must be after the start time.',
    path: ['endTime'],
  }),
});
export const doctorWeeklyScheduleUpdateSchema = z.object({
  params: z.object({ availabilityId: uuid }),
  body: z.object(weeklySchedule).strict().refine((value) => value.endTime > value.startTime, {
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
    if (!value.startTime) context.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required.' });
    if (!value.endTime) context.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required.' });
    if (!value.slotDurationMinutes) context.addIssue({ code: 'custom', path: ['slotDurationMinutes'], message: 'Slot duration is required.' });
    if (value.startTime && value.endTime && value.endTime <= value.startTime) {
      context.addIssue({ code: 'custom', path: ['endTime'], message: 'The end time must be after the start time.' });
    }
  } else if (value.startTime || value.endTime || value.slotDurationMinutes !== undefined) {
    context.addIssue({ code: 'custom', path: ['isAvailable'], message: 'Unavailable dates cannot include time slots.' });
  }
}
export const doctorExceptionSchema = z.object({
  body: z.object({ availableOn: z.string().date(), ...exceptionFields }).strict().superRefine(validateException),
});
export const doctorExceptionUpdateSchema = z.object({
  params: z.object({ exceptionId: uuid }),
  body: z.object(exceptionFields).strict().superRefine(validateException),
});
export const doctorExceptionIdSchema = z.object({
  params: z.object({ exceptionId: uuid }),
});

export const receptionistPatientSearchSchema = z.object({
  query: z.object({ search: z.string().trim().max(120).optional().default(''), ...page }),
});
export const receptionistPatientCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z.string().trim().max(32).optional().default(''),
    clinicId: uuid,
  }).strict(),
});
export const receptionistPatientLinkSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email().max(254),
    clinicId: uuid,
  }).strict(),
});
export const receptionistPatientUpdateSchema = z.object({
  params: z.object({ patientId: uuid }),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().max(32).optional().default(''),
  }).strict(),
});
export const receptionistClinicQuerySchema = z.object({
  query: z.object({ clinicId: uuid }),
});
export const receptionistDoctorSlotsSchema = z.object({
  params: z.object({ doctorId: uuid }),
  query: z.object({ clinicId: uuid, date: z.string().date() }),
});
export const receptionistCreateAppointmentSchema = z.object({
  body: z.object({
    patientId: uuid,
    doctorId: uuid,
    clinicId: uuid,
    scheduledStart: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(1000).optional().default(''),
    isWalkIn: z.boolean().default(false),
    walkInReason: z.string().trim().min(1).max(500).optional(),
  }).strict().refine((value) => !value.isWalkIn || Boolean(value.walkInReason), {
    message: 'A reason is required for a walk-in appointment.',
    path: ['walkInReason'],
  }),
});
export const receptionistRescheduleSchema = z.object({
  params: z.object({ appointmentId: uuid }),
  body: z.object({ scheduledStart: z.string().datetime({ offset: true }) }).strict(),
});
export const receptionistWorkflowSchema = z.object({
  params: z.object({ appointmentId: uuid }),
  body: z.object({ workflowStatus: z.enum(['arrived', 'checked_in', 'waiting', 'no_show']) }).strict(),
});
