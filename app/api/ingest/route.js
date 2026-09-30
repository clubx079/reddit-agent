// POST { text } → paste an F5Bot alert email; its Reddit hits land as posts.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { parseF5botEmail } from '@/lib/f5bot';
import { toPostRow, savePosts } from '@/lib/posts';
import { getSettings } from '@/lib/settings';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { text } = await req.json().catch(() => ({}));
  const parsed = parseF5botEmail(text);
  if (!parsed.length) return Response.json({ error: 'no_reddit_links_found' }, { status: 400 });
  const { keywords } = await getSettings();
  const rows = parsed.map((p) => toPostRow(p, { keywords, source: 'f5bot', minRelevance: 0 }) || toPostRow(p, { keywords, source: 'manual' })).filter(Boolean)
    .map((r) => ({ ...r, source: 'f5bot' }));
  const added = await savePosts(db, rows);
  await logActivity(user.id, 'f5bot.ingested', { meta: { parsed: parsed.length, added } });
  return Response.json({ parsed: parsed.length, added });
}
