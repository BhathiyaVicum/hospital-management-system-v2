import { getEnv } from './env.js';

export function corsOptions(env = getEnv()) {
  const { FRONTEND_URL } = env;
  return {
    origin(origin, callback) {
      if (!origin || origin === FRONTEND_URL) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  };
}
