// PATCH { role?, status? } → change a member (admins). You can't demote or disable
// yourself, and the last active admin can't be removed.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  if (params.id === user.id) return Response.json({ error: 'cannot_change_yourself' }, { status: 400 });
  const b = await req.json().catch(() => ({}));
  const patch = {};
  if (b.role !== undefined) { if (!['admin', 'member'].includes(b.role)) return Response.json({ error: 'invalid_role' }, { status: 400 }); patch.role = b.role; }
  if (b.status !== undefined) { if (!['active', 'disabled'].includes(b.status)) return Response.json({ error: 'invalid_status' }, { status: 400 }); patch.status = b.status; }
  if (!Object.keys(patch).length) return Response.json({ error: 'nothing_to_update' }, { status: 400 });
  const [target] = await db.select('ra_users', `select=id,role,status&id=eq.${db.q(params.id)}&limit=1`);
  if (!target) return Response.json({ error: 'not_found' }, { status: 404 });
  if (target.role === 'admin' && (patch.role === 'member' || patch.status === 'disabled')) {
    const admins = await db.select('ra_users', 'select=id&role=eq.admin&status=eq.active');
    if (admins.length <= 1) return Response.json({ error: 'last_admin' }, { status: 400 });
  }
  const [updated] = await db.update('ra_users', `id=eq.${db.q(params.id)}`, patch);
  await logActivity(user.id, 'user.updated', { entity: 'user', entityId: params.id, meta: patch });
  return Response.json({ user: { id: updated.id, role: updated.role, status: updated.status } });
}
