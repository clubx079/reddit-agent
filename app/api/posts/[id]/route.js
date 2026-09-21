// PATCH /api/posts/:id  → update status, edited draft text, or mention toggle.
import { NextResponse } from 'next/server';
import { updatePost, getPost } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const patch = {};

  if (typeof body.status === 'string' && ['new', 'approved', 'dismissed'].includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.mention === 'boolean') patch.mention = body.mention;

  // Allow editing the draft text in place (human edit before posting).
  if (typeof body.draftText === 'string') {
    const existing = await getPost(id);
    patch.draft = {
      ...(existing && existing.draft ? existing.draft : {}),
      text: body.draftText,
      edited: true,
      editedAt: new Date().toISOString(),
    };
  }

  const updated = await updatePost(id, patch);
  if (!updated) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, post: updated });
}
