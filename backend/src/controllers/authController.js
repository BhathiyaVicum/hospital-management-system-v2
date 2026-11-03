import * as authService from '../services/authService.js';
import { cookieOptions, RESET_COOKIE, SESSION_COOKIE } from '../middleware/authenticate.js';
import { CSRF_COOKIE } from '../middleware/csrf.js';
import { randomBytes } from 'crypto';

export function csrf(req, res) {
  const csrfToken = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure: req.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
  return res.json({ csrfToken });
}

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  return res.status(201).json(result);
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body, req);
  res.cookie(SESSION_COOKIE, result.token, cookieOptions(req.env, result.expiresAt));
  return res.json({ user: result.user });
}

export async function me(req, res) {
  const { id, name, email, role, email_verified_at: emailVerifiedAt } = req.user;
  return res.json({
    user: {
      id, name, email, role, emailVerified: Boolean(emailVerifiedAt),
      mustChangePassword: req.user.must_change_password,
    },
  });
}

export async function logout(req, res) {
  await authService.recordLogout(req.user, req);
  await authService.logout(req.user.session_id);
  res.clearCookie(SESSION_COOKIE, cookieOptions(req.env, new Date(0)));
  res.clearCookie(RESET_COOKIE, cookieOptions(req.env, new Date(0)));
  return res.json({ message: 'Logout successful.' });
}

export async function changePassword(req, res) {
  await authService.changePassword(req.user, req.validated.body, req);
  return res.json({ message: 'Password changed successfully.' });
}

export async function verifyEmail(req, res) {
  const { email, token } = req.validated.body;
  const user = await authService.verifyEmail(email, token);
  return res.json({ message: 'Email verified successfully.', user });
}

export async function resendVerification(req, res) {
  const result = await authService.resendVerification(req.validated.body.email);
  return res.json(result);
}

export async function forgotPassword(req, res) {
  const result = await authService.requestPasswordReset(req.validated.body.email);
  return res.json(result);
}

export async function resendResetCode(req, res) {
  const result = await authService.resendPasswordResetCode(req.validated.body.email);
  return res.json(result);
}

export async function verifyResetCode(req, res) {
  const { email, code } = req.validated.body;
  const resetToken = await authService.verifyPasswordResetCode(email, code);
  res.cookie(RESET_COOKIE, resetToken, cookieOptions(req.env, new Date(Date.now() + 10 * 60 * 1000)));
  return res.json({ message: 'Code verified. You can now set a new password.' });
}

export async function resetPassword(req, res) {
  const resetToken = req.cookies?.[RESET_COOKIE];
  if (!resetToken) return res.status(400).json({ message: 'Verify the reset code before setting a new password.' });
  await authService.resetPassword(resetToken, req.validated.body.newPassword);
  res.clearCookie(RESET_COOKIE, cookieOptions(req.env, new Date(0)));
  return res.json({ message: 'Password updated successfully.' });
}
