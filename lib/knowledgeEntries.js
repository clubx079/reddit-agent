// Validation for knowledge-base entries (shared by the knowledge API routes).
import { KINDS, INTENTS } from './knowledge';

export function cleanEntry(b, { partial = false } = {}) {
  const out = {};
  if (!partial || b.kind !== undefined) { if (!KINDS.includes(b.kind)) return { error: 'invalid_kind' }; out.kind = b.kind; }
  if (!partial || b.title !== undefined) { const t = String(b.title || '').trim(); if (!t) return { error: 'title_required' }; out.title = t.slice(0, 160); }
  if (!partial || b.content !== undefined) { const c = String(b.content || '').trim(); if (!c) return { error: 'content_required' }; out.content = c.slice(0, 6000); }
  if (b.intent !== undefined) { if (b.intent && !INTENTS.includes(b.intent)) return { error: 'invalid_intent' }; out.intent = b.intent || null; }
  if (b.language !== undefined) { if (b.language && !['en', 'es'].includes(b.language)) return { error: 'invalid_language' }; out.language = b.language || null; }
  if (b.priority !== undefined) out.priority = Math.min(100, Math.max(0, Math.round(Number(b.priority)) || 0));
  if (b.active !== undefined) out.active = !!b.active;
  return { entry: out };
}
