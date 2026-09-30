// Audit log (ra_activity). Never throws — logging must not break an action.
import 'server-only';
import * as db from './db';

export async function logActivity(actorId, action, { entity = null, entityId = null, meta = {} } = {}) {
  try {
    await db.insert('ra_activity', [{ actor_id: actorId || null, action, entity, entity_id: entityId, meta }]);
  } catch { /* ignore */ }
}
