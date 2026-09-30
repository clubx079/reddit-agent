// PATCH (any field, incl. active on/off) · DELETE — admins.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { cleanEntry } from '@/lib/knowledgeEntries';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  const r = cleanEntry(await req.json().catch(() => ({})), { partial: true });
  if (r.error) return Response.json(r, { status: 400 });
  const [entry] = await db.update('ra_knowledge', `id=eq.${db.q(params.id)}`, { ...r.entry, updated_by: user.id, updated_at: new Date().toISOString() });
  if (!entry) return Response.json({ error: 'not_found' }, { status: 404 });
  await logActivity(user.id, 'knowledge.updated', { entity: 'knowledge', entityId: entry.id, meta: { title: entry.title } });
  return Response.json({ entry });
}

export async function DELETE(_req, { params }) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  await db.remove('ra_knowledge', `id=eq.${db.q(params.id)}`);
  await logActivity(user.id, 'knowledge.deleted', { entity: 'knowledge', entityId: params.id });
  return Response.json({ ok: true });
}
