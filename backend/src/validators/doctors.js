import { z } from 'zod';

export const doctorListSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    specialty: z.string().trim().max(80).optional(),
    location: z.string().trim().max(120).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  }),
});

export const doctorIdSchema = z.object({ params: z.object({ doctorId: z.string().uuid() }) });
