// Turning fetched Reddit posts (lib/reddit.js sweep / F5Bot / manual) into ra_posts
// rows. Pure helpers + one DB writer.
import { scorePost } from './relevance';

// Tiny language guess — good enough to pick the reply language.
const ES = /\b(el|la|los|las|que|de|en|para|busco|alquiler|departamento|casa|dónde|donde|cuánto|cuanto|barrio|vivir|comprar|vender|gracias|hola)\b/gi;
const EN = /\b(the|and|for|with|looking|rent|apartment|house|where|how|much|buy|sell|moving|thanks|hello)\b/gi;
export function detectLanguage(text) {
  const t = String(text || '');
  return (t.match(ES) || []).length > (t.match(EN) || []).length ? 'es' : 'en';
}

// reddit.js post shape → ra_posts row (or null if not relevant enough).
export function toPostRow(p, { keywords = [], minRelevance = 0, source = 'reddit_api' } = {}) {
  const s = scorePost(p, keywords);
  if (source !== 'manual' && (!s.relevant || s.score < minRelevance)) return null;
  const redditId = String(p.id || '').replace(/^t3_/, '') || null;
  if (!redditId) return null;
  return {
    reddit_id: redditId,
    subreddit: p.subreddit || 'unknown',
    title: String(p.title || '').slice(0, 400),
    body: p.selftext ? String(p.selftext).slice(0, 8000) : null,
    author: p.author || null,
    permalink: p.permalink || null,
    created_utc: p.createdUtc ? new Date(p.createdUtc * 1000).toISOString() : null,
    reddit_score: Number.isFinite(p.ups) ? p.ups : null,
    num_comments: Number.isFinite(p.numComments) ? p.numComments : null,
    source,
    matched_keyword: s.matchedKeywords?.[0] || p.keyword || null,
    relevance: s.score,
    intent: s.intent,
    language: detectLanguage(`${p.title} ${p.selftext || ''}`),
  };
}

// Insert new posts; already-known reddit_ids are skipped (never overwritten, so
// a status a human set is kept). Returns how many were new.
export async function savePosts(db, rows) {
  if (!rows.length) return 0;
  const saved = await db.insert('ra_posts', rows, { ignoreDuplicates: true, onConflict: 'reddit_id' });
  return Array.isArray(saved) ? saved.length : 0;
}
