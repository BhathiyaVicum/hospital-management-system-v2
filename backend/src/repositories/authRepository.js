import { query, withTransaction } from '../config/database.js';
import { timingSafeEqual } from 'crypto';

function hashesMatch(first, second) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

export async function registerPatient({
  name, email, passwordHash, phone, verificationTokenHash, verificationExpiresAt, clinicId = null, createdByUserId = null,
}) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'patient')
       RETURNING id, name, email, role, email_verified_at`,
      [name, email, passwordHash],
    );
    const patient = await client.query(
      'INSERT INTO patients (user_id, phone) VALUES ($1, $2) RETURNING id',
      [user.rows[0].id, phone || null],
    );
    if (clinicId) {
      await client.query(
        `INSERT INTO patient_clinics (patient_id, clinic_id, created_by_user_id)
         VALUES ($1, $2, $3)`,
        [patient.rows[0].id, clinicId, createdByUserId],
      );
    }
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.rows[0].id, verificationTokenHash, verificationExpiresAt],
    );
    return { ...user.rows[0], patient_id: patient.rows[0].id };
  });
}

export async function removeUnverifiedPatient(userId) {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM patients WHERE user_id = $1', [userId]);
    await client.query(
      `DELETE FROM users
       WHERE id = $1 AND role = 'patient' AND email_verified_at IS NULL`,
      [userId],
    );
  });
}

export async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password_hash, role, email_verified_at, is_active,
            must_change_password
     FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] || null;
}

export async function changePassword(userId, sessionId, passwordHash) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE users SET password_hash=$2, must_change_password=FALSE
       WHERE id=$1 AND is_active=TRUE RETURNING id`,
      [userId, passwordHash],
    );
    if (!result.rowCount) return false;
    await client.query(
      'UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL AND id <> $2',
      [userId, sessionId],
    );
    return true;
  });
}

export async function createSession(userId, sessionId, expiresAt, absoluteExpiresAt) {
  await query(
    `INSERT INTO auth_sessions (id, user_id, expires_at, absolute_expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, expiresAt, absoluteExpiresAt],
  );
}

export async function revokeSession(sessionId) {
  await query(
    'UPDATE auth_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [sessionId],
  );
}

export async function consumeEmailVerificationToken(email, tokenHash) {
  return withTransaction(async (client) => {
    const token = await client.query(
      `UPDATE email_verification_tokens
       SET consumed_at = now()
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
         AND user_id = (SELECT id FROM users WHERE email = $2 AND email_verified_at IS NULL)
       RETURNING user_id`,
      [tokenHash, email],
    );
    if (!token.rowCount) return null;

    const user = await client.query(
      `UPDATE users SET email_verified_at = now()
       WHERE id = $1 AND email_verified_at IS NULL
       RETURNING id, name, email, role, email_verified_at`,
      [token.rows[0].user_id],
    );
    return user.rows[0] || null;
  });
}

export async function replaceVerificationToken(email, tokenHash, expiresAt) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `SELECT id, email_verified_at FROM users
       WHERE email = $1 AND role = 'patient' AND is_active = TRUE FOR UPDATE`,
      [email],
    );
    if (!user.rowCount || user.rows[0].email_verified_at) return null;

    await client.query(
      `UPDATE email_verification_tokens SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.rows[0].id],
    );
    await client.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.rows[0].id, tokenHash, expiresAt],
    );
    return user.rows[0].id;
  });
}

export async function createPasswordReset(email, otpHash, otpExpiresAt) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `SELECT id FROM users
       WHERE email = $1 AND is_active = TRUE AND email_verified_at IS NOT NULL
       FOR UPDATE`,
      [email],
    );
    if (!user.rowCount) return { sent: false };

    const userId = user.rows[0].id;
    const sentRecently = await client.query(
      `SELECT count(*)::int AS sends
       FROM password_reset_requests
       WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
      [userId],
    );
    if (sentRecently.rows[0].sends >= 5) return { sent: false, throttled: true };
    const latest = await client.query(
      `SELECT id, send_count, last_sent_at
       FROM password_reset_requests
       WHERE user_id = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [userId],
    );
    if (latest.rowCount) {
      const request = latest.rows[0];
      if (Date.now() - new Date(request.last_sent_at).getTime() < 60_000 || request.send_count >= 5) {
        return { sent: false, throttled: true };
      }
      await client.query(
        `UPDATE password_reset_requests SET consumed_at = now()
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [userId],
      );
    }

    await client.query(
      `INSERT INTO password_reset_requests (user_id, otp_hash, otp_expires_at, send_count)
       VALUES ($1, $2, $3, $4)`,
      [userId, otpHash, otpExpiresAt, latest.rowCount ? latest.rows[0].send_count + 1 : 1],
    );
    return { sent: true };
  });
}

export async function resendPasswordReset(email, otpHash, otpExpiresAt) {
  return withTransaction(async (client) => {
    const user = await client.query(
      `SELECT id FROM users
       WHERE email = $1 AND is_active = TRUE AND email_verified_at IS NOT NULL
       FOR UPDATE`,
      [email],
    );
    if (!user.rowCount) return { sent: false };

    const latest = await client.query(
      `SELECT id, otp_attempts, send_count, last_sent_at
       FROM password_reset_requests
       WHERE user_id = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
      [user.rows[0].id],
    );
    if (!latest.rowCount) return { sent: false };

    const request = latest.rows[0];
    const sentRecently = await client.query(
      `SELECT count(*)::int AS sends
       FROM password_reset_requests
       WHERE user_id = $1 AND created_at > now() - interval '1 hour'`,
      [user.rows[0].id],
    );
    if (
      Date.now() - new Date(request.last_sent_at).getTime() < 60_000
      || request.send_count >= 5
      || sentRecently.rows[0].sends >= 5
      || request.otp_attempts >= 5
    ) return { sent: false, throttled: true };

    await client.query(
      `UPDATE password_reset_requests
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.rows[0].id],
    );
    await client.query(
      `INSERT INTO password_reset_requests (user_id, otp_hash, otp_expires_at, send_count)
       VALUES ($1, $2, $3, $4)`,
      [user.rows[0].id, otpHash, otpExpiresAt, request.send_count + 1],
    );
    return { sent: true };
  });
}

export async function invalidatePasswordReset(otpHash) {
  await query(
    `UPDATE password_reset_requests SET consumed_at = now()
     WHERE otp_hash = $1 AND consumed_at IS NULL`,
    [otpHash],
  );
}

export async function verifyPasswordResetCode(email, otpHash, resetTokenHash, expiresAt) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT r.id, r.otp_hash, r.otp_expires_at, r.otp_attempts, u.id AS user_id
       FROM users u
       JOIN LATERAL (
         SELECT * FROM password_reset_requests
         WHERE user_id = u.id AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1
       ) r ON TRUE
       WHERE u.email = $1 AND u.is_active = TRUE
       FOR UPDATE OF r`,
      [email],
    );
    if (!result.rowCount) return { valid: false };

    const request = result.rows[0];
    if (request.otp_attempts >= 5 || new Date(request.otp_expires_at) <= new Date()) {
      return { valid: false };
    }
    if (!hashesMatch(request.otp_hash, otpHash)) {
      await client.query(
        'UPDATE password_reset_requests SET otp_attempts = otp_attempts + 1 WHERE id = $1',
        [request.id],
      );
      return { valid: false };
    }

    await client.query(
      `UPDATE password_reset_requests
       SET verified_at = now(), reset_token_hash = $2, reset_token_expires_at = $3
       WHERE id = $1`,
      [request.id, resetTokenHash, expiresAt],
    );
    return { valid: true };
  });
}

export async function updatePasswordWithResetToken(resetTokenHash, passwordHash) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT id, user_id FROM password_reset_requests
       WHERE reset_token_hash = $1 AND verified_at IS NOT NULL
         AND reset_token_expires_at > now() AND consumed_at IS NULL
       FOR UPDATE`,
      [resetTokenHash],
    );
    if (!result.rowCount) return false;

    const request = result.rows[0];
    await client.query('UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2', [passwordHash, request.user_id]);
    await client.query(
      'UPDATE password_reset_requests SET consumed_at = now() WHERE id = $1',
      [request.id],
    );
    await client.query(
      'UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [request.user_id],
    );
    return true;
  });
}
