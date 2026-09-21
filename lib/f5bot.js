// Parse a pasted F5Bot alert email into post objects the pipeline can score + draft.
//
// F5Bot emails group hits by keyword and, per hit, list a subreddit, a title/snippet
// and a Reddit permalink. Copy-pasting an HTML email to plain text yields varied
// layouts, so this parser is deliberately tolerant: it ANCHORS on Reddit URLs and
// pulls the nearest title text, tracking the current keyword group as it goes.
//
// (F5Bot only ever reports NEW posts/comments, so we stamp createdUtc = now — that
// keeps the relevance recency bonus working.)

const URL_RE = /(https?:\/\/(?:www\.|old\.|np\.)?reddit\.com\/r\/([A-Za-z0-9_]+)\/comments\/([A-Za-z0-9]+)[^\s)>\]]*)/i;
const SHORT_RE = /(https?:\/\/redd\.it\/([A-Za-z0-9]+))/i;
const KEYWORD_RE = /["“']([^"”']{2,60})["”']/; // a quoted keyword header line

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function clean(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

export function parseF5botEmail(text) {
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/);
  const out = [];
  const seen = new Set();
  let currentKeyword = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) continue;

    const hasUrl = URL_RE.test(line) || SHORT_RE.test(line);

    // A quoted phrase on its own short line is the keyword group header.
    if (!hasUrl) {
      const kw = t.match(KEYWORD_RE);
      if (kw && t.length < 80) currentKeyword = kw[1];
    }
    if (!hasUrl) continue;

    const m = line.match(URL_RE) || line.match(SHORT_RE);
    if (!m) continue;
    const url = m[1];
    let sub = '';
    let pid = '';
    const rm = url.match(URL_RE);
    if (rm) { sub = rm[2]; pid = rm[3]; }
    else { const sm = url.match(SHORT_RE); if (sm) pid = sm[2]; }
    const id = pid ? 't3_' + pid : 'f5_' + djb2(url);
    if (seen.has(id)) continue;
    seen.add(id);

    // Title = the same-line text before the URL; else the nearest preceding text line.
    let title = clean(line.replace(url, '').replace(/[-–—:>|•]+\s*$/, '').replace(/^\s*[-–—:>|•]+/, ''));
    if (!title || title.length < 4) {
      for (let j = i - 1; j >= 0 && j >= i - 3; j--) {
        const prev = clean(lines[j]);
        if (!prev) continue;
        if (URL_RE.test(prev) || SHORT_RE.test(prev)) break;
        if (KEYWORD_RE.test(prev) && prev.length < 80) continue; // skip keyword header
        title = prev;
        break;
      }
    }
    // Snippet = the next non-empty, non-URL line (often the matched text).
    let snippet = '';
    for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
      const nx = clean(lines[j]);
      if (!nx) continue;
      if (URL_RE.test(nx) || SHORT_RE.test(nx)) break;
      if (KEYWORD_RE.test(nx) && nx.length < 80) break;
      snippet = nx;
      break;
    }

    out.push({
      id,
      title: title || (sub ? 'Post in r/' + sub : 'Reddit thread'),
      selftext: snippet || '',
      subreddit: sub || 'reddit',
      author: '',
      permalink: url.replace(/^http:/, 'https:'),
      url,
      numComments: 0,
      ups: 0,
      createdUtc: Math.floor(Date.now() / 1000),
      over18: false,
      source: 'f5bot',
      matchedKeywords: currentKeyword ? [currentKeyword] : [],
      fetchedAt: new Date().toISOString(),
    });
  }

  // Fallback: no URLs found but there IS text → treat the whole paste as one thread,
  // so a user can paste a single Reddit post's title + body directly.
  if (out.length === 0 && clean(raw).length > 8) {
    const firstUrl = (raw.match(URL_RE) || raw.match(SHORT_RE) || [])[1] || '';
    const firstLine = clean(lines.find((l) => clean(l)) || '');
    out.push({
      id: 'f5_' + djb2(raw.slice(0, 200)),
      title: firstLine.slice(0, 140) || 'Pasted thread',
      selftext: clean(raw).slice(0, 1500),
      subreddit: 'reddit',
      author: '',
      permalink: firstUrl,
      url: firstUrl,
      numComments: 0,
      ups: 0,
      createdUtc: Math.floor(Date.now() / 1000),
      over18: false,
      source: 'f5bot',
      matchedKeywords: [],
      fetchedAt: new Date().toISOString(),
    });
  }

  return out;
}
