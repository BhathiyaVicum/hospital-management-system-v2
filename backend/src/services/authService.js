import { createHmac, createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import * as authRepository from '../repositories/authRepository.js';
import { recordActivity } from './auditService.js';
import { sendPasswordResetCode, sendVerificationEmail } from './emailService.js';

const GENERIC_RESET_MESSAGE = 'If an account exists for this email, password reset instructions will be sent.';
const GENERIC_VERIFICATION_MESSAGE = 'If the account can be verified, a verification link will be sent.';
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const otpHash = (email, code, secret) => createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');

function durationMilliseconds(duration) {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) throw new Error('JWT_EXPIRES_IN must be a duration such as 15m or 1h.');
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return Number(match[1]) * units[match[2]];
}

export async function register({ name, email, password, phone }) {
  const rawToken = randomBytes(32).toString('hex');
  const user = await authRepository.registerPatient({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    phone,
    verificationTokenHash: tokenHash(rawToken),
    verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  try {
    await sendVerificationEmail(email, rawToken);
  } catch (error) {
    await authRepository.removeUnverifiedPatient(user.id);
    throw error;
  }
  return { message: 'Registration created. Check your email to verify your account.' };
}

export async function login({ email, password }, request) {
  const env = getEnv();
  const user = await authRepository.findUserByEmail(email);
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
    await recordActivity({
      actor: user ? { id: user.id, role: user.role } : null,
      targetUserId: user?.id || null,
      attemptedEmail: email,
      eventType: 'login.failed',
      success: false,
      request,
    });
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }
  if (!user.email_verified_at) {
    await recordActivity({
      actor: { id: user.id, role: user.role },
      targetUserId: user.id,
      attemptedEmail: email,
      eventType: 'login.failed',
      success: false,
      request,
      details: { reason: 'email_not_verified' },
    });
    const error = new Error('Verify your email address before signing in.');
    error.status = 403;
    throw error;
  }

  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + durationMilliseconds(env.JWT_EXPIRES_IN));
  await authRepository.createSession(user.id, sessionId, expiresAt);
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    attemptedEmail: email,
    eventType: 'login.succeeded',
    request,
  });
  const token = jwt.sign(
    { sub: user.id, sid: sessionId, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  return {
    token,
    expiresAt,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      mustChangePassword: user.must_change_password,
    },
  };
}

export async function verifyEmail(email, token) {
  const user = await authRepository.consumeEmailVerificationToken(email, tokenHash(token));
  if (!user) {
    const error = new Error('This verification link is invalid, expired, or already used.');
    error.status = 400;
    throw error;
  }
  return user;
}

export async function resendVerification(email) {
  const rawToken = randomBytes(32).toString('hex');
  const userId = await authRepository.replaceVerificationToken(
    email,
    tokenHash(rawToken),
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  if (userId) await sendVerificationEmail(email, rawToken);
  return { message: GENERIC_VERIFICATION_MESSAGE };
}

export async function logout(sessionId) {
  if (sessionId) await authRepository.revokeSession(sessionId);
}

export async function recordLogout(user, request) {
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'logout',
    request,
  });
}

export async function changePassword(user, { currentPassword, newPassword }, request) {
  const account = await authRepository.findUserByEmail(user.email);
  if (!account || !(await bcrypt.compare(currentPassword, account.password_hash))) {
    await recordActivity({
      actor: { id: user.id, role: user.role },
      targetUserId: user.id,
      eventType: 'password.change.failed',
      success: false,
      request,
    });
    const error = new Error('Current password is incorrect.');
    error.status = 400;
    throw error;
  }
  const changed = await authRepository.changePassword(user.id, user.session_id, await bcrypt.hash(newPassword, 12));
  if (!changed) {
    const error = new Error('Your account is no longer active.');
    error.status = 403;
    throw error;
  }
  await recordActivity({
    actor: { id: user.id, role: user.role },
    targetUserId: user.id,
    eventType: 'password.changed',
    request,
  });
}

export async function requestPasswordReset(email) {
  const env = getEnv();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const hashed = otpHash(email, code, env.OTP_HASH_SECRET);
  const result = await authRepository.createPasswordReset(
    email,
    hashed,
    new Date(Date.now() + 10 * 60 * 1000),
  );
  if (result.sent) {
    try {
      await sendPasswordResetCode(email, code);
    } catch (error) {
      await authRepository.invalidatePasswordReset(hashed);
      throw error;
    }
  }
  return { message: GENERIC_RESET_MESSAGE };
}

export async function resendPasswordResetCode(email) {
  const env = getEnv();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const hashed = otpHash(email, code, env.OTP_HASH_SECRET);
  const result = await authRepository.resendPasswordReset(
    email,
    hashed,
    new Date(Date.now() + 10 * 60 * 1000),
  );
  if (result.sent) {
    try {
      await sendPasswordResetCode(email, code);
    } catch (error) {
      await authRepository.invalidatePasswordReset(hashed);
      throw error;
    }
  }
  return { message: GENERIC_RESET_MESSAGE };
}

export async function verifyPasswordResetCode(email, code) {
  const env = getEnv();
  const expectedHash = otpHash(email, code, env.OTP_HASH_SECRET);
  const resetToken = randomBytes(32).toString('hex');
  const resetTokenHash = tokenHash(resetToken);
  const result = await authRepository.verifyPasswordResetCode(
    email,
    expectedHash,
    resetTokenHash,
    new Date(Date.now() + 10 * 60 * 1000),
  );
  if (!result.valid) {
    const error = new Error('The reset code is invalid, expired, or has reached its attempt limit.');
    error.status = 400;
    throw error;
  }
  return resetToken;
}

export async function resetPassword(resetToken, newPassword) {
  const changed = await authRepository.updatePasswordWithResetToken(
    tokenHash(resetToken),
    await bcrypt.hash(newPassword, 12),
  );
  if (!changed) {
    const error = new Error('The reset session is invalid, expired, or already used.');
    error.status = 400;
    throw error;
  }
}
