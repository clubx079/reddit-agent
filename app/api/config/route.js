// GET /api/config → current listening config.
// PUT /api/config → update keywords/subreddits/limits.
import { NextResponse } from 'next/server';
import { getConfig, setConfig } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = await getConfig();
  return NextResponse.json({ config });
}

export async function PUT(req) {
  const body = await req.json().catch(() => ({}));
  const patch = {};
  if (Array.isArray(body.keywords)) patch.keywords = body.keywords.map(String).filter(Boolean);
  if (Array.isArray(body.subreddits)) patch.subreddits = body.subreddits.map(String).filter(Boolean);
  if (typeof body.timeWindow === 'string') patch.timeWindow = body.timeWindow;
  if (Number.isFinite(body.limitPerQuery)) patch.limitPerQuery = Math.min(Math.max(5, body.limitPerQuery), 50);
  if (Number.isFinite(body.minScore)) patch.minScore = Math.min(Math.max(0, body.minScore), 100);
  if (Number.isFinite(body.maxPosts)) patch.maxPosts = Math.min(Math.max(1, body.maxPosts), 12);
  const config = await setConfig(patch);
  return NextResponse.json({ ok: true, config });
}
