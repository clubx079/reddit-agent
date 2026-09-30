// GET ?status=new|drafted|approved|posted|dismissed|all&intent=&q=&assigned=me&page=
//   → { posts, count, counts: { new, drafted, … } }
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';

export const dynamic = 'force-dynamic';
const STATUSES = ['new', 'drafted', 'approved', 'posted', 'dismissed'];
const PAGE = 25;

export async function GET(req) {
  const { user, error } = await requireUser();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status') || 'new';
  const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
  const parts = ['select=id,reddit_id,subreddit,title,author,permalink,created_utc,reddit_score,num_comments,source,relevance,intent,language,status,assigned_to,fetched_at,posted_at'];
  if (STATUSES.includes(status)) parts.push(`status=eq.${status}`);
  if (sp.get('intent')) parts.push(`intent=eq.${db.q(sp.get('intent'))}`);
  if (sp.get('assigned') === 'me') parts.push(`assigned_to=eq.${user.id}`);
  const term = (sp.get('q') || '').trim().replace(/[(),*]/g, ' ').slice(0, 60);
  if (term) parts.push(`or=(title.ilike.*${db.q(term)}*,body.ilike.*${db.q(term)}*,subreddit.ilike.*${db.q(term)}*)`);
  parts.push('order=relevance.desc,fetched_at.desc', `limit=${PAGE}`, `offset=${(page - 1) * PAGE}`);
  const [{ rows, count }, all] = await Promise.all([
    db.selectWithCount('ra_posts', parts.join('&')),
    db.select('ra_posts', 'select=status'),
  ]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((p) => p.status === s).length]));
  counts.all = all.length;
  return Response.json({ posts: rows, count, counts, page, pageSize: PAGE });
}
