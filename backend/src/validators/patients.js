import { z } from 'zod';

const optionalText = (max) => z.string().trim().max(max).nullable().optional();

export const updatePatientProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: optionalText(32),
    dateOfBirth: z.string().date().refine((value) => value <= new Date().toISOString().slice(0, 10), 'Date of birth cannot be in the future.').nullable().optional(),
    gender: z.enum(['female', 'male', 'non_binary', 'prefer_not_to_state']).nullable().optional(),
    homeAddress: optionalText(500),
    emergencyContactName: optionalText(120),
    emergencyContactRelationship: z.enum([
      'spouse', 'adult_child', 'parent_guardian', 'sibling', 'healthcare_proxy', 'other',
    ]).nullable().optional(),
    emergencyContactPhone: optionalText(32),
    preferredClinicId: z.string().uuid().nullable().optional(),
    preferredConsultationMode: z.enum(['in_clinic', 'telehealth']).nullable().optional(),
    preferredLanguage: optionalText(80),
    wheelchairAccessible: z.boolean().optional(),
  }).strict(),
});
