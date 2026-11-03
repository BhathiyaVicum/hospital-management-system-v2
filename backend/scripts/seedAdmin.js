import bcrypt from 'bcryptjs';
import { closePool, withTransaction } from '../src/config/database.js';

async function seedAdmin() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development administrator seed is disabled in production.');
  }
  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const initialPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!email || !initialPassword) {
    throw new Error('Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in the local backend environment.');
  }
  if (initialPassword.length < 12 || initialPassword.length > 128) {
    throw new Error('ADMIN_SEED_PASSWORD must be between 12 and 128 characters.');
  }

  const passwordHash = await bcrypt.hash(initialPassword, 12);
  process.env.ADMIN_SEED_PASSWORD = '';
  await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);
    const existing = await client.query('SELECT id, role FROM users WHERE email=$1 FOR UPDATE', [email]);
    if (existing.rowCount) {
      if (existing.rows[0].role !== 'admin') {
        throw new Error('The configured seed email belongs to an account that is not an administrator.');
      }
      return;
    }
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, email_verified_at, must_change_password)
       VALUES ('MediConnect Administrator', $1, $2, 'admin', now(), TRUE)`,
      [email, passwordHash],
    );
  });
  console.log('Development administrator provisioning completed.');
}

try {
  await seedAdmin();
} finally {
  process.env.ADMIN_SEED_PASSWORD = '';
  await closePool();
}
