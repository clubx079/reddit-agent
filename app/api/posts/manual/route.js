// POST { url, title, body, subreddit } → add a post by hand (e.g. found while browsing).
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { toPostRow, savePosts } from '@/lib/posts';
import { getSettings } from '@/lib/settings';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';
const URL_RE = /^https:\/\/(?:www\.|old\.)?reddit\.com\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)/;

export async function POST(req) {
  const { user, error } = await requireUser();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const m = String(b.url || '').trim().match(URL_RE);
  if (!m) return Response.json({ error: 'need_reddit_post_link' }, { status: 400 });
  if (!String(b.title || '').trim()) return Response.json({ error: 'title_required' }, { status: 400 });
  const { keywords } = await getSettings();
  const row = toPostRow({ id: m[2], subreddit: m[1], title: b.title, selftext: b.body || '', permalink: m[0] + '/', createdUtc: Math.floor(Date.now() / 1000) }, { keywords, source: 'manual' });
  const added = await savePosts(db, [row]);
  const [post] = await db.select('ra_posts', `select=id&reddit_id=eq.${db.q(row.reddit_id)}&limit=1`);
  await logActivity(user.id, 'post.added_manually', { entity: 'post', entityId: post?.id, meta: { url: m[0] } });
  return Response.json({ id: post?.id, added: added > 0 });
}
