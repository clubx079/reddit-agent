// POST /api/draft  { id, mention? }  → (re)generate a draft for ONE post.
// One draft per call — keeps API cost explicit and controllable.
import { NextResponse } from 'next/server';
import { generateDraft } from '@/lib/draft';
import { getPost, updatePost } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const post = await getPost(body.id);
    if (!post) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });

    const mention = typeof body.mention === 'boolean' ? body.mention : !!post.mention;
    const draft = await generateDraft(post, post.intent, { mention });
    const updated = await updatePost(post.id, { draft, mention });
    return NextResponse.json({ ok: true, post: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
