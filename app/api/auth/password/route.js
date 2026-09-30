// POST { currentPassword, newPassword } — change your own password.
import { requireUser, verifyLogin, hashPassword, PASSWORD_MIN } from '@/lib/auth';
import * as db from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!newPassword || String(newPassword).length < PASSWORD_MIN) return Response.json({ error: 'password_too_short' }, { status: 400 });
  if (!(await verifyLogin(user.email, currentPassword))) return Response.json({ error: 'wrong_current_password' }, { status: 400 });
  await db.update('ra_users', `id=eq.${user.id}`, { password_hash: await hashPassword(newPassword) });
  await logActivity(user.id, 'password.changed', { entity: 'user', entityId: user.id });
  return Response.json({ ok: true });
}
