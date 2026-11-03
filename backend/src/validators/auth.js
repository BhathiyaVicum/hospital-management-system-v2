import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(12).max(128);

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    email,
    password,
    phone: z.string().trim().max(32).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1).max(128),
  }),
});

export const emailSchema = z.object({ body: z.object({ email }) });

export const verifyEmailSchema = z.object({
  body: z.object({
    email,
    token: z.string().min(32).max(256),
  }),
});

export const resetCodeSchema = z.object({
  body: z.object({
    email,
    code: z.string().regex(/^\d{6}$/),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({ newPassword: password }),
});

export const changePasswordSchema = z.object({
  body: z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),
});
