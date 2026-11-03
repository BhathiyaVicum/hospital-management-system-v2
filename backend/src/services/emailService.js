import { Resend } from 'resend';
import { assertEmailConfiguration, getEnv } from '../config/env.js';

async function deliver({ to, subject, text }) {
  const env = getEnv();
  const provider = assertEmailConfiguration(env);

  if (provider === 'development') {
    console.info(
      '\n─────────── DEV EMAIL ───────────\n' +
      `To:      ${to}\n` +
      `Subject: ${subject}\n\n` +
      `${text}\n` +
      '────────────────────────────────────\n'
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });

  if (error || !data?.id) {
    const deliveryError = new Error('Email delivery failed. Please try again later.');
    deliveryError.status = 503;
    throw deliveryError;
  }
}

/**
 * Sends a verification email.
 * Returns { verificationUrl } — the URL is always returned, but the
 * frontend should ONLY display it when NODE_ENV is development.
 */
export async function sendVerificationEmail(to, token) {
  const { FRONTEND_URL } = getEnv();
  const verificationUrl = new URL('/verify-email', FRONTEND_URL);
  verificationUrl.searchParams.set('email', to);
  verificationUrl.searchParams.set('token', token);

  await deliver({
    to,
    subject: 'Verify your MediConnect email address',
    text: `Use this link within 24 hours to verify your MediConnect account:\n${verificationUrl.toString()}`,
  });

  return { verificationUrl: verificationUrl.toString() };
}

/**
 * Sends a 6-digit reset code.
 * Returns { code } — the frontend should only display it in development.
 */
export async function sendPasswordResetCode(to, code) {
  await deliver({
    to,
    subject: 'Your MediConnect password reset code',
    text: `Your six-digit password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this message.`,
  });

  return { code };
}