// GET   → { post, drafts, knowledge (titles of entries used) }
// PATCH { status?, assigned_to?, our_comment_url? } → updated post
//   status 'posted' stamps posted_at/posted_by — a human posted the reply on Reddit.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';
const STATUSES = ['new', 'drafted', 'approved', 'posted', 'dismissed'];

export async function GET(_req, { params }) {
  const { error } = await requireUser();
  if (error) return error;
  const [post] = await db.select('ra_posts', `select=*&id=eq.${db.q(params.id)}&limit=1`);
  if (!post) return Response.json({ error: 'not_found' }, { status: 404 });
  const drafts = await db.select('ra_drafts', `select=*&post_id=eq.${post.id}&order=created_at.desc`);
  return Response.json({ post, drafts });
}

export async function PATCH(req, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return Response.json({ error: 'invalid_status' }, { status: 400 });
    patch.status = b.status;
    if (b.status === 'posted') { patch.posted_at = new Date().toISOString(); patch.posted_by = user.id; }
  }
  if (b.assigned_to !== undefined) patch.assigned_to = b.assigned_to || null;
  if (b.our_comment_url !== undefined) {
    const u = String(b.our_comment_url || '').trim();
    if (u && !/^https:\/\/(www\.|old\.)?reddit\.com\//.test(u)) return Response.json({ error: 'not_a_reddit_link' }, { status: 400 });
    patch.our_comment_url = u || null;
  }
  const [post] = await db.update('ra_posts', `id=eq.${db.q(params.id)}`, patch);
  if (!post) return Response.json({ error: 'not_found' }, { status: 404 });
  await logActivity(user.id, b.status ? `post.${b.status}` : 'post.updated', { entity: 'post', entityId: post.id, meta: { ...b } });
  return Response.json({ post });
}
