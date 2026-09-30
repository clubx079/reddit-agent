// POST { mention: 'auto'|'yes'|'no' } → generate a new draft from the knowledge base.
import { requireUser } from '@/lib/auth';
import { generateDraft } from '@/lib/drafting';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  const mentionMode = ['auto', 'yes', 'no'].includes(b.mention) ? b.mention : 'auto';
  const r = await generateDraft(params.id, { user, mentionMode });
  if (r.error) return Response.json(r, { status: r.error === 'post_not_found' ? 404 : 502 });
  return Response.json(r);
}
