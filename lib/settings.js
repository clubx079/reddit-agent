// App settings (ra_settings key → jsonb) with safe defaults when a key is missing.
import 'server-only';
import * as db from './db';
import { DEFAULT_CONFIG } from './config';

export const DEFAULTS = {
  keywords: DEFAULT_CONFIG.keywords,
  subreddits: DEFAULT_CONFIG.subreddits,
  scan: { timeWindow: 'week', limitPerQuery: 15, minRelevance: 25, maxPostsPerScan: 12 },
  llm: { provider: 'groq', model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', temperature: 0.6, maxTokens: 900, fallbackToTemplate: true },
  mention: {
    targetRatio: 0.12,
    trackedUrl: 'https://casa-libre.com.py/r/rda',
    countrySites: { Paraguay: 'https://casa-libre.com.py', Bolivia: 'https://casa-libre.com.bo', Uruguay: 'https://uy.casa-libre.com', Venezuela: 'https://casa-libre.com.ve' },
  },
};
export const KEYS = Object.keys(DEFAULTS);

export async function getSettings() {
  const out = structuredClone(DEFAULTS);
  try {
    const rows = await db.select('ra_settings', 'select=key,value');
    for (const r of rows || []) {
      if (!KEYS.includes(r.key)) continue;
      out[r.key] = Array.isArray(DEFAULTS[r.key]) ? r.value : { ...DEFAULTS[r.key], ...r.value };
    }
  } catch { /* table missing → defaults */ }
  return out;
}

// Validate + save one key. Returns { value } or { error }.
export async function saveSetting(key, value, userId) {
  if (!KEYS.includes(key)) return { error: 'unknown_setting' };
  let v = value;
  if (key === 'keywords' || key === 'subreddits') {
    if (!Array.isArray(v)) return { error: 'must_be_list' };
    v = [...new Set(v.map((s) => String(s).trim().replace(/^r\//i, '')).filter(Boolean))].slice(0, 80);
    if (!v.length) return { error: 'list_empty' };
  } else {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { error: 'must_be_object' };
    v = { ...DEFAULTS[key], ...v };
    if (key === 'scan') {
      v.limitPerQuery = clamp(v.limitPerQuery, 5, 50);
      v.minRelevance = clamp(v.minRelevance, 0, 100);
      v.maxPostsPerScan = clamp(v.maxPostsPerScan, 1, 50);
      if (!['hour', 'day', 'week', 'month', 'year'].includes(v.timeWindow)) v.timeWindow = 'week';
    }
    if (key === 'llm') {
      if (!['groq', 'openai', 'template'].includes(v.provider)) v.provider = 'groq';
      v.temperature = Math.min(1.2, Math.max(0, Number(v.temperature) || 0.6));
      v.maxTokens = clamp(v.maxTokens, 150, 1500);
    }
    if (key === 'mention') v.targetRatio = Math.min(0.5, Math.max(0, Number(v.targetRatio) || 0));
  }
  await db.insert('ra_settings', [{ key, value: v, updated_by: userId, updated_at: new Date().toISOString() }], { upsert: true, onConflict: 'key' });
  return { value: v };
}

function clamp(n, lo, hi) { const x = Math.round(Number(n)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : lo; }
