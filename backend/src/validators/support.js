import { z } from 'zod';

const ticketId = z.string().uuid();
const message = z.string().trim().min(1).max(5000);
const ticketStatuses = ['open', 'in_progress', 'waiting_for_patient', 'resolved', 'closed'];

export const createTicketSchema = z.object({
  body: z.object({
    category: z.enum(['feedback', 'complaint', 'inquiry']),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    subject: z.string().trim().min(1).max(160),
    message,
    appointmentId: ticketId.optional(),
  }).strict(),
});

export const ticketListSchema = z.object({
  query: z.object({
    status: z.enum(ticketStatuses).optional(),
    category: z.enum(['feedback', 'complaint', 'inquiry']).optional(),
    search: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  }),
});

export const ticketIdSchema = z.object({
  params: z.object({ ticketId }),
});

export const createTicketMessageSchema = z.object({
  params: z.object({ ticketId }),
  body: z.object({ message }).strict(),
});

export const updateTicketStatusSchema = z.object({
  params: z.object({ ticketId }),
  body: z.object({ status: z.enum(ticketStatuses) }).strict(),
});

export const updateTicketAssignmentSchema = z.object({
  params: z.object({ ticketId }),
  body: z.object({ assignedStaffId: ticketId.nullable() }).strict(),
});
