// GET → latest 100 activity entries with the actor's name.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const [rows, users] = await Promise.all([
    db.select('ra_activity', 'select=*&order=created_at.desc&limit=100'),
    db.select('ra_users', 'select=id,email,full_name'),
  ]);
  const byId = Object.fromEntries(users.map((u) => [u.id, u.full_name || u.email]));
  return Response.json({ activity: rows.map((a) => ({ ...a, actor: a.actor_id ? byId[a.actor_id] || 'Former member' : 'System' })) });
}
