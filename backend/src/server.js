import 'dotenv/config';
import { getEnv } from './config/env.js';
import { closePool, pool } from './config/database.js';
import { createApp } from './app.js';

async function startServer() {
  const env = getEnv();
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    console.error(`Database connection failed (${error.code || 'connection error'}). Verify DATABASE_URL, the PostgreSQL service, and database permissions.`);
    process.exitCode = 1;
    await closePool();
    return;
  }

  const server = createApp({ env }).listen(env.PORT, () => {
    console.log(`Hospital MS API listening on port ${env.PORT}; PostgreSQL is connected.`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server and PostgreSQL pool.`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
