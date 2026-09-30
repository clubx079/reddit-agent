// GET → all knowledge entries · POST { kind, title, content, intent?, language?, priority? } (admins)
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { cleanEntry } from '@/lib/knowledgeEntries';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  return Response.json({ entries: await db.select('ra_knowledge', 'select=*&order=kind.asc,priority.desc,title.asc') });
}

export async function POST(req) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  const r = cleanEntry(await req.json().catch(() => ({})));
  if (r.error) return Response.json(r, { status: 400 });
  const [entry] = await db.insert('ra_knowledge', [{ ...r.entry, created_by: user.id, updated_by: user.id }]);
  await logActivity(user.id, 'knowledge.created', { entity: 'knowledge', entityId: entry.id, meta: { title: entry.title } });
  return Response.json({ entry });
}
