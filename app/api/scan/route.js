// POST → fetch new posts from the Reddit API (read-only) and save the relevant ones.
//   Needs REDDIT_CLIENT_ID/SECRET (Reddit blocks anonymous access from servers).
// Also callable by a scheduler with Authorization: Bearer <CRON_SECRET>.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { sweep } from '@/lib/reddit';
import { toPostRow, savePosts } from '@/lib/posts';
import { getSettings } from '@/lib/settings';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req) {
  const cron = process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  let userId = null;
  if (!cron) {
    const { user, error } = await requireUser();
    if (error) return error;
    userId = user.id;
  }
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET) {
    return Response.json({ error: 'reddit_api_not_configured', hint: 'Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (reddit.com/prefs/apps → script app).' }, { status: 503 });
  }
  const s = await getSettings();
  const { posts, errors, authMode, queries } = await sweep({ keywords: s.keywords, subreddits: s.subreddits, timeWindow: s.scan.timeWindow, limitPerQuery: s.scan.limitPerQuery });
  const rows = posts
    .map((p) => toPostRow(p, { keywords: s.keywords, minRelevance: s.scan.minRelevance }))
    .filter(Boolean)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, s.scan.maxPostsPerScan);
  const added = await savePosts(db, rows);
  await logActivity(userId, 'scan.run', { meta: { fetched: posts.length, relevant: rows.length, added, errors: errors.length, authMode, queries } });
  return Response.json({ fetched: posts.length, relevant: rows.length, added, errors: errors.slice(0, 5), authMode });
}
