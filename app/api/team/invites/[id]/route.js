// DELETE → revoke a pending invite (admins).
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function DELETE(_req, { params }) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  await db.update('ra_invites', `id=eq.${db.q(params.id)}&accepted_at=is.null`, { revoked_at: new Date().toISOString() });
  await logActivity(user.id, 'invite.revoked', { entity: 'invite', entityId: params.id });
  return Response.json({ ok: true });
}
