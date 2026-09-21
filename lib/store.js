// Local JSON persistence. No database — this is a local-only tool.
// Store shape: { config, posts: { [id]: Post }, meta: { lastScan, ... } }.
import { promises as fs } from 'fs';
import path from 'path';
import { DEFAULT_CONFIG } from './config';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyStore() {
  return { config: { ...DEFAULT_CONFIG }, posts: {}, meta: { lastScan: null } };
}

export async function loadStore() {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // Backfill any missing config keys added in later versions.
    parsed.config = { ...DEFAULT_CONFIG, ...(parsed.config || {}) };
    parsed.posts = parsed.posts || {};
    parsed.meta = parsed.meta || { lastScan: null };
    return parsed;
  } catch (e) {
    if (e.code === 'ENOENT') return emptyStore();
    throw e;
  }
}

export async function saveStore(store) {
  await ensureDir();
  const tmp = STORE_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tmp, STORE_FILE); // atomic-ish write
}

export async function getConfig() {
  const store = await loadStore();
  return store.config;
}

export async function setConfig(patch) {
  const store = await loadStore();
  store.config = { ...store.config, ...patch };
  await saveStore(store);
  return store.config;
}

// Merge freshly-scanned matches into the store without clobbering human edits.
// Existing posts keep their status, edited draft and mention toggle; only the
// scan-derived fields (score, freshness) are refreshed.
export async function upsertPosts(matches) {
  const store = await loadStore();
  let added = 0;
  let updated = 0;
  for (const m of matches) {
    const existing = store.posts[m.id];
    if (existing) {
      store.posts[m.id] = {
        ...existing,
        score: m.score,
        intent: m.intent,
        matchedKeywords: m.matchedKeywords,
        lastSeen: m.fetchedAt,
      };
      updated++;
    } else {
      store.posts[m.id] = {
        ...m,
        status: 'new', // new | approved | dismissed
        draft: null, // { text, mention, model, generatedAt }
        mention: false,
        addedAt: m.fetchedAt,
        lastSeen: m.fetchedAt,
      };
      added++;
    }
  }
  store.meta.lastScan = new Date().toISOString();
  await saveStore(store);
  return { added, updated, total: Object.keys(store.posts).length };
}

export async function getPosts() {
  const store = await loadStore();
  return Object.values(store.posts);
}

export async function getPost(id) {
  const store = await loadStore();
  return store.posts[id] || null;
}

export async function updatePost(id, patch) {
  const store = await loadStore();
  if (!store.posts[id]) return null;
  store.posts[id] = { ...store.posts[id], ...patch };
  await saveStore(store);
  return store.posts[id];
}

export async function getMeta() {
  const store = await loadStore();
  return store.meta;
}
