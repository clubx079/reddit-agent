// PATCH { body?, status?: 'approved'|'rejected'|'draft' }
//   Editing marks the draft as human-edited; approving also moves the post to 'approved'.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { mentionsCasaLibre } from '@/lib/knowledge';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const patch = { updated_at: now };
  if (typeof b.body === 'string') {
    const body = b.body.trim();
    if (!body) return Response.json({ error: 'empty_draft' }, { status: 400 });
    patch.body = body.slice(0, 10000);
    patch.edited_by = user.id;
    patch.mention_included = mentionsCasaLibre(body);
  }
  if (b.status !== undefined) {
    if (!['draft', 'approved', 'rejected'].includes(b.status)) return Response.json({ error: 'invalid_status' }, { status: 400 });
    patch.status = b.status;
    if (b.status === 'approved') { patch.approved_by = user.id; patch.approved_at = now; }
  }
  const [draft] = await db.update('ra_drafts', `id=eq.${db.q(params.id)}`, patch);
  if (!draft) return Response.json({ error: 'not_found' }, { status: 404 });
  if (b.status === 'approved') await db.update('ra_posts', `id=eq.${draft.post_id}&status=in.(new,drafted)`, { status: 'approved', updated_at: now });
  await logActivity(user.id, b.status ? `draft.${b.status}` : 'draft.edited', { entity: 'draft', entityId: draft.id, meta: { post_id: draft.post_id } });
  return Response.json({ draft });
}
