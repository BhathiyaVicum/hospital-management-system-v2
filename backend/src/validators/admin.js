import { z } from 'zod';

const uuid = z.string().uuid();
const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(128);
const name = z.string().trim().min(1).max(120);
const page = {
  search: z.string().trim().max(120).optional().default(''),
  status: z.enum(['', 'active', 'inactive']).optional().default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(10000).default(0),
};

export const resourceListSchema = z.object({
  query: z.object({
    ...page,
    specialtyId: uuid.optional().default(''),
    clinicId: uuid.optional().default(''),
  }),
});
export const patientParamsSchema = z.object({ params: z.object({ patientId: uuid }) });
export const appointmentParamsSchema = z.object({ params: z.object({ appointmentId: uuid }) });
export const doctorParamsSchema = z.object({ params: z.object({ doctorId: uuid }) });
export const clinicParamsSchema = z.object({ params: z.object({ clinicId: uuid }) });
export const serviceParamsSchema = z.object({ params: z.object({ serviceId: uuid }) });
export const accountParamsSchema = z.object({ params: z.object({ userId: uuid }) });

export const patientListSchema = z.object({ query: z.object(page) });
export const patientUpdateSchema = z.object({
  params: z.object({ patientId: uuid }),
  body: z.object({
    name,
    email,
    phone: z.string().trim().max(32).nullable().optional(),
    homeAddress: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean(),
  }).strict(),
});

export const doctorListSchema = z.object({
  query: z.object({
    ...page,
    specialtyId: uuid.optional().default(''),
    clinicId: uuid.optional().default(''),
  }),
});
const doctorFields = {
  name,
  email,
  title: z.string().trim().min(1).max(120),
  bio: z.string().trim().max(5000).optional().default(''),
  yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
  consultationFee: z.number().min(0).max(99999999).finite(),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  image: z.string().url().max(2048).nullable().optional(),
  clinicId: uuid.nullable().optional(),
  timeZone: z.string().trim().min(1).max(80).default('Asia/Colombo'),
  education: z.string().trim().max(2000).optional().default(''),
  languages: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  specialtyIds: z.array(uuid).max(20),
};
export const createDoctorSchema = z.object({
  body: z.object({ ...doctorFields, password }).strict(),
});
export const updateDoctorSchema = z.object({
  params: z.object({ doctorId: uuid }),
  body: z.object({
    ...doctorFields,
    isActive: z.boolean(),
    acceptingAppointments: z.boolean(),
  }).strict(),
});

export const clinicListSchema = z.object({ query: z.object(page) });
const clinicFields = {
  name: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(120),
  address: z.string().trim().max(500).default(''),
  phone: z.string().trim().max(32).default(''),
};
export const createClinicSchema = z.object({ body: z.object(clinicFields).strict() });
export const updateClinicSchema = z.object({
  params: z.object({ clinicId: uuid }),
  body: z.object({ ...clinicFields, isActive: z.boolean() }).strict(),
});

export const serviceListSchema = z.object({ query: z.object(page) });
const serviceFields = {
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  description: z.string().trim().max(3000).default(''),
  durationMinutes: z.number().int().min(10).max(480).default(30),
  fee: z.number().min(0).max(99999999).finite(),
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  clinicIds: z.array(uuid).max(100).default([]),
  doctorIds: z.array(uuid).max(500).default([]),
};
export const createServiceSchema = z.object({ body: z.object(serviceFields).strict() });
export const updateServiceSchema = z.object({
  params: z.object({ serviceId: uuid }),
  body: z.object({ ...serviceFields, isActive: z.boolean() }).strict(),
});

export const accountListSchema = z.object({ query: z.object(page) });
export const createAccountSchema = z.object({ body: z.object({ name, email, password }).strict() });
export const updateAccountSchema = z.object({
  params: z.object({ userId: uuid }),
  body: z.object({ name, email, isActive: z.boolean() }).strict(),
});

export const appointmentListSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120).optional().default(''),
    status: z.enum(['', 'confirmed', 'cancelled', 'completed']).optional().default(''),
    doctorId: uuid.optional().default(''),
    patientId: uuid.optional().default(''),
    clinicId: uuid.optional().default(''),
    from: z.string().date().optional().default(''),
    to: z.string().date().optional().default(''),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  }).refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'The start date must be on or before the end date.',
  }),
});

export const reportsSchema = z.object({
  query: z.object({
    from: z.string().date().default(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)),
    to: z.string().date().default(() => new Date().toISOString().slice(0, 10)),
  }).refine((value) => value.from <= value.to, { message: 'The start date must be on or before the end date.' })
    .refine((value) => (new Date(`${value.to}T00:00:00Z`) - new Date(`${value.from}T00:00:00Z`)) / 86400000 <= 365, {
      message: 'Report date ranges cannot exceed one year.',
    }),
});

export const activityListSchema = z.object({
  query: z.object({
    search: z.string().trim().max(120).optional().default(''),
    role: z.enum(['', 'patient', 'doctor', 'staff', 'receptionist', 'admin']).optional().default(''),
    eventType: z.string().trim().max(100).optional().default(''),
    success: z.enum(['', 'true', 'false']).optional().default(''),
    from: z.string().date().optional().default(''),
    to: z.string().date().optional().default(''),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).max(10000).default(0),
  }).refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: 'The start date must be on or before the end date.',
  }),
});
