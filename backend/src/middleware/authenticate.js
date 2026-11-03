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
              s.id AS session_id, s.expires_at AS session_expires_at,
              s.absolute_expires_at, p.id AS patient_id
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL
         AND s.expires_at > now() AND s.absolute_expires_at > now()
         AND u.is_active = TRUE`,
      [claims.sid, claims.sub],
    );

    if (!result.rowCount) return res.status(401).json({ message: 'Session is invalid or expired.' });
    req.user = result.rows[0];
    const now = Date.now();
    const idleTimeout = req.env.SESSION_IDLE_TIMEOUT_SECONDS * 1000;
    const expiresAt = new Date(req.user.session_expires_at).getTime();
    if (expiresAt - now <= idleTimeout / 2) {
      const absoluteExpiresAt = new Date(req.user.absolute_expires_at).getTime();
      const renewedExpiry = await query(
        `UPDATE auth_sessions
         SET expires_at = LEAST($2::timestamptz, absolute_expires_at)
         WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()
           AND absolute_expires_at > now()
         RETURNING expires_at`,
        [req.user.session_id, new Date(now + idleTimeout)],
      );
      if (!renewedExpiry.rowCount) return res.status(401).json({ message: 'Session is invalid or expired.' });
      const refreshedExpiresAt = new Date(renewedExpiry.rows[0].expires_at);
      const tokenExpiresIn = Math.max(1, Math.floor((Math.min(refreshedExpiresAt.getTime(), absoluteExpiresAt) - now) / 1000));
      const refreshedToken = jwt.sign(
        { sub: req.user.id, sid: req.user.session_id, role: req.user.role },
        req.env.JWT_SECRET,
        { expiresIn: tokenExpiresIn },
      );
      res.cookie(SESSION_COOKIE, refreshedToken, cookieOptions(req.env, refreshedExpiresAt));
    }
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
