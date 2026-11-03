import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(900).max(86400).default(28800),
  SESSION_ABSOLUTE_TIMEOUT_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  OTP_HASH_SECRET: z.string().min(32, 'OTP_HASH_SECRET must be at least 32 characters'),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default(''),
  DEV_EMAIL_LOGS: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

export function getEnv() {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid backend environment configuration: ${details}`);
  }
  return parsed.data;
}

/**
 * Decides how to deliver emails.
 *
 * Priority:
 *   1. In development, DEV_EMAIL_LOGS=true  → log to terminal (never sends)
 *   2. RESEND_API_KEY + EMAIL_FROM present   → real Resend delivery
 *   3. In development, nothing configured    → log to terminal (safe default)
 *   4. Production with nothing configured    → throw
 */
export function assertEmailConfiguration(env = getEnv()) {
  // 1. Explicit dev override — highest priority
  if (env.NODE_ENV === 'development' && env.DEV_EMAIL_LOGS) {
    return 'development';
  }

  // 2. Real Resend if configured
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    return 'resend';
  }

  // 3. Any non-production env with nothing set → safe fallback
  if (env.NODE_ENV !== 'production') {
    return 'development';
  }

  // 4. Production, nothing configured → refuse to boot silently
  throw new Error(
    'Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM, or enable DEV_EMAIL_LOGS in development.'
  );
}