// POST /api/scan
// Runs a Reddit sweep (free, read-only), scores + filters matches, keeps only the
// top-N most relevant (cost control), upserts them, and — if autoDraft — generates
// real drafts for at most `max` fresh posts.
import { NextResponse } from 'next/server';
import { sweep } from '@/lib/reddit';
import { scorePost } from '@/lib/relevance';
import { generateDraft } from '@/lib/draft';
import { loadStore, upsertPosts, updatePost, getConfig } from '@/lib/store';
import { CASA_LIBRE } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const autoDraft = body.autoDraft !== false; // default true
    const config = await getConfig();
    const max = Math.max(1, Math.min(body.max || config.maxPosts || 6, 12)); // hard ceiling 12

    // 1) Sweep Reddit (free public JSON; OAuth only if creds present).
    const { posts, errors, authMode, queries } = await sweep(config);

    // 2) Score + filter.
    const scored = posts
      .map((p) => ({ ...p, ...scorePost(p, config.keywords) }))
      .filter((p) => p.relevant && p.score >= (config.minScore || 0))
      .sort((a, b) => b.score - a.score);

    // 3) COST CONTROL: keep only the top-N.
    const kept = scored.slice(0, max);

    // 4) Upsert (preserves human edits/status on existing posts).
    const upsertResult = await upsertPosts(kept);

    // 5) Optionally draft — only fresh posts with no draft yet, capped at `max`.
    const drafted = [];
    if (autoDraft) {
      const store = await loadStore();
      const toDraft = kept
        .map((k) => store.posts[k.id])
        .filter((p) => p && !p.draft && p.status !== 'dismissed')
        .slice(0, max);

      // ~9:1 rule: enable a Casa Libre mention on at most one draft per batch,
      // and only when the intent is a natural fit.
      const mentionIdx = toDraft.findIndex((p) =>
        ['buying', 'selling', 'market', 'renting'].includes(p.intent)
      );

      for (let i = 0; i < toDraft.length; i++) {
        const p = toDraft[i];
        const mention = i === mentionIdx; // at most one
        const draft = await generateDraft(p, p.intent, { mention });
        await updatePost(p.id, { draft, mention });
        drafted.push({ id: p.id, model: draft.model, mention });
      }
    }

    return NextResponse.json({
      ok: true,
      authMode,
      queries,
      found: posts.length,
      relevant: scored.length,
      kept: kept.length,
      ...upsertResult,
      drafted: drafted.length,
      draftDetails: drafted,
      mentionRatio: CASA_LIBRE.mentionRatio,
      errors: errors.slice(0, 5),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
