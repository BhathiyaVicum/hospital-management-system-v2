import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const SESSION_COOKIE = 'mediconnect_session';
export const RESET_COOKIE = 'mediconnect_reset';

export function cookieOptions(env, expires) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires,
  };
}

export async function authenticate(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ message: 'Authentication is required.' });

  try {
    const claims = jwt.verify(token, req.env.JWT_SECRET);
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.email_verified_at, u.is_active,
              u.must_change_password,
              s.id AS session_id, p.id AS patient_id
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL
         AND s.expires_at > now() AND u.is_active = TRUE`,
      [claims.sid, claims.sub],
    );

    if (!result.rowCount) return res.status(401).json({ message: 'Session is invalid or expired.' });
    req.user = result.rows[0];
    const allowedDuringPasswordChange = [
      '/api/auth/me',
      '/api/auth/logout',
      '/api/auth/change-password',
    ].includes(req.originalUrl.split('?')[0]);
    if (req.user.must_change_password && !allowedDuringPasswordChange) {
      return res.status(403).json({
        message: 'Change your temporary password before continuing.',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    }
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session is invalid or expired.' });
    }
    return next(error);
  }
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user.email_verified_at) {
    return res.status(403).json({ message: 'Verify your email address before continuing.' });
  }
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    return next();
  };
}
