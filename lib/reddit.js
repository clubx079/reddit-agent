// Reddit discovery client.
//
// DEFAULT: Reddit's FREE public JSON endpoints (no auth, read-only). This is
// pure listening — nothing is ever posted — so it carries zero ban risk, exactly
// the "GREEN zone" from the strategy brief.
//
// OPTIONAL: if REDDIT_CLIENT_ID/SECRET are set, we obtain an app-only OAuth token
// to raise rate limits. Still read-only search; still never posts.

const UA = process.env.REDDIT_USER_AGENT || 'casa-libre-listener/1.0';

let cachedToken = null; // { token, expiresAt }

async function getAppToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) return cachedToken.token;

  const body = new URLSearchParams({ grant_type: 'client_credentials' });
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    body,
  });
  if (!res.ok) return null;
  const json = await res.json();
  cachedToken = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.token;
}

function base(token) {
  return token ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
}

async function fetchJson(url, token) {
  const headers = { 'User-Agent': UA, Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reddit ${res.status} for ${url} :: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function normalizeChild(c) {
  const d = c.data || {};
  return {
    id: d.name || `t3_${d.id}`, // fullname, stable
    title: d.title || '',
    selftext: d.selftext || '',
    subreddit: d.subreddit || '',
    author: d.author || '',
    permalink: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url || '',
    url: d.url || '',
    numComments: d.num_comments || 0,
    ups: d.ups || 0,
    createdUtc: d.created_utc || 0,
    over18: !!d.over_18,
    fetchedAt: new Date().toISOString(),
  };
}

// One search query. `subreddit` null => global search.
async function search({ query, subreddit, sort = 'new', time = 'year', limit = 25, token }) {
  const b = base(token);
  const params = new URLSearchParams({
    q: query,
    sort,
    t: time,
    limit: String(limit),
    type: 'link',
    raw_json: '1',
  });
  let url;
  if (subreddit) {
    params.set('restrict_sr', '1');
    url = `${b}/r/${encodeURIComponent(subreddit)}/search.json?${params}`;
  } else {
    url = `${b}/search.json?${params}`;
  }
  const json = await fetchJson(url, token);
  const children = (json && json.data && json.data.children) || [];
  return children.filter((c) => c.kind === 't3').map(normalizeChild);
}

// Small delay between requests to be polite to the public endpoints.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run the full sweep: every keyword globally + within each configured subreddit.
// Dedupes by post id. Returns raw normalized posts (scoring happens in the API route).
export async function sweep(config, { onProgress } = {}) {
  const token = await getAppToken();
  const seen = new Map();
  const errors = [];
  const queries = [];

  for (const kw of config.keywords) {
    queries.push({ query: kw, subreddit: null }); // global
  }
  for (const sub of config.subreddits) {
    // One combined query per subreddit keeps request count sane.
    queries.push({ query: config.keywords.join(' OR '), subreddit: sub });
  }

  let done = 0;
  for (const q of queries) {
    try {
      const posts = await search({
        query: q.query,
        subreddit: q.subreddit,
        time: config.timeWindow,
        limit: config.limitPerQuery,
        token,
      });
      for (const p of posts) {
        if (p.over18) continue;
        if (!seen.has(p.id)) seen.set(p.id, p);
      }
    } catch (e) {
      errors.push(String(e.message || e));
    }
    done++;
    if (onProgress) onProgress(done, queries.length);
    await sleep(token ? 250 : 700); // gentler on the public endpoints
  }

  return { posts: Array.from(seen.values()), errors, authMode: token ? 'oauth' : 'public', queries: queries.length };
}
