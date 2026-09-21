// POST /api/ingest  { text, autoDraft?, max? }
// Ingest a pasted F5Bot alert email: parse → score/classify → upsert → draft.
// F5Bot already keyword-matched, so we DON'T drop hits by minScore — every parsed
// thread is kept; we only add score/intent for display + drafting.
import { NextResponse } from 'next/server';
import { parseF5botEmail } from '@/lib/f5bot';
import { scorePost } from '@/lib/relevance';
import { generateDraft } from '@/lib/draft';
import { loadStore, upsertPosts, updatePost, getConfig } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || '');
    if (text.trim().length < 8) {
      return NextResponse.json({ ok: false, error: 'Paste the F5Bot alert email first.' }, { status: 400 });
    }
    const autoDraft = body.autoDraft !== false; // default true
    const config = await getConfig();
    const max = Math.max(1, Math.min(body.max || config.maxPosts || 6, 12)); // draft-cost ceiling

    // 1) Parse the pasted email into posts.
    const parsed = parseF5botEmail(text);
    if (!parsed.length) {
      return NextResponse.json({ ok: false, error: 'No Reddit threads found in that text.' }, { status: 400 });
    }

    // 2) Score + classify (keep ALL — F5Bot already matched the keyword). Merge the
    //    keyword parsed from the email with any our own matcher found.
    const scored = parsed
      .map((p) => {
        const s = scorePost(p, config.keywords);
        return {
          ...p,
          ...s,
          matchedKeywords: Array.from(new Set([...(p.matchedKeywords || []), ...(s.matchedKeywords || [])])),
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    // 3) Upsert (preserves human edits/status on threads already in the queue).
    const upsertResult = await upsertPosts(scored);

    // 4) Draft the fresh, undrafted ones (capped for cost).
    const drafted = [];
    if (autoDraft) {
      const store = await loadStore();
      const toDraft = scored
        .map((k) => store.posts[k.id])
        .filter((p) => p && !p.draft && p.status !== 'dismissed')
        .slice(0, max);
      // Promotion mode: weave a natural Casa Libre mention into every draft. It's
      // written to read human + genuinely useful, and a person still reviews each
      // one and can toggle the mention off per card before posting.
      for (let i = 0; i < toDraft.length; i++) {
        const p = toDraft[i];
        const mention = true;
        const draft = await generateDraft(p, p.intent, { mention });
        await updatePost(p.id, { draft, mention });
        drafted.push({ id: p.id, model: draft.model, mention });
      }
    }

    return NextResponse.json({
      ok: true,
      source: 'f5bot',
      parsed: parsed.length,
      ...upsertResult,
      drafted: drafted.length,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 500 });
  }
}
