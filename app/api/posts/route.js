// GET /api/posts  → all posts in the queue + meta (sorted newest-scored first).
import { NextResponse } from 'next/server';
import { getPosts, getMeta } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const posts = await getPosts();
  const meta = await getMeta();
  posts.sort((a, b) => (b.score || 0) - (a.score || 0));
  return NextResponse.json({ posts, meta, count: posts.length });
}
