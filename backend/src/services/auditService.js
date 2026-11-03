import { query } from '../config/database.js';

export async function recordActivity({
  actor = null,
  targetUserId = null,
  attemptedEmail = null,
  eventType,
  success = true,
  request = null,
  details = {},
}) {
  await query(
    `INSERT INTO admin_activity_logs
       (actor_user_id, actor_role, target_user_id, attempted_email, event_type,
        success, ip_address, user_agent, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      actor?.id || null,
      actor?.role || null,
      targetUserId,
      attemptedEmail,
      eventType,
      success,
      request?.ip || null,
      request?.get('user-agent') || null,
      JSON.stringify(details),
    ],
  );
}
