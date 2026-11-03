import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    scheduledStart: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(1000).optional(),
  }),
});

export const rescheduleAppointmentSchema = z.object({
  params: z.object({ appointmentId: z.string().uuid() }),
  body: z.object({ scheduledStart: z.string().datetime({ offset: true }) }),
});

export const appointmentIdSchema = z.object({
  params: z.object({ appointmentId: z.string().uuid() }),
});

export const listAppointmentsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
    view: z.enum(['all', 'upcoming', 'past', 'cancelled']).default('all'),
    search: z.string().trim().max(120).optional(),
    clinic: z.string().trim().max(120).optional(),
    date: z.string().date().optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  }),
});
