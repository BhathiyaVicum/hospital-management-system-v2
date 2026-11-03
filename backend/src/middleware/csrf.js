import { randomBytes, timingSafeEqual } from 'crypto';

export const CSRF_COOKIE = 'mediconnect_csrf';

function csrfCookieOptions(env) {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  };
}

export function issueCsrfToken(req, res) {
  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions(req.env));
  return res.json({ csrfToken: token });
}

export function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length) {
    return res.status(403).json({ message: 'CSRF validation failed. Refresh the page and try again.' });
  }

  const matches = timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!matches) return res.status(403).json({ message: 'CSRF validation failed. Refresh the page and try again.' });
  return next();
}
