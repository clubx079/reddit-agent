'use client';

import { useState } from 'react';

const INTENT_LABELS = {
  buying: 'Buying',
  renting: 'Renting',
  selling: 'Selling',
  moving: 'Moving / Expat',
  market: 'Market / Prices',
  general: 'General',
};

const INTENT_COLORS = {
  buying: '#2f6f4f',
  renting: '#2b5f8a',
  selling: '#8a5a2b',
  moving: '#6b4a8a',
  market: '#8a2b4a',
  general: '#6B6459',
};

function timeAgo(utcSeconds) {
  if (!utcSeconds) return '';
  const s = Math.floor(Date.now() / 1000 - utcSeconds);
  const d = Math.floor(s / 86400);
  if (d > 60) return `${Math.floor(d / 30)}mo ago`;
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(s / 3600);
  if (h > 0) return `${h}h ago`;
  return `${Math.max(1, Math.floor(s / 60))}m ago`;
}

export default function PostCard({ post, onChange }) {
  const [draftText, setDraftText] = useState(post.draft?.text || '');
  const [mention, setMention] = useState(!!post.mention);
  const [busy, setBusy] = useState(null); // 'draft' | 'save' | null
  const [copied, setCopied] = useState(false);
  const [showBody, setShowBody] = useState(false);

  const hasDraft = !!post.draft?.text;
  const scoreColor = post.score >= 60 ? '#3F7A54' : post.score >= 40 ? '#B7791F' : '#6B6459';

  async function patch(body) {
    const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.ok && onChange) onChange(json.post);
    return json.post;
  }

  async function regenerate() {
    setBusy('draft');
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, mention }),
      });
      const json = await res.json();
      if (json.ok) {
        setDraftText(json.post.draft?.text || '');
        if (onChange) onChange(json.post);
      }
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit() {
    setBusy('save');
    try {
      await patch({ draftText });
    } finally {
      setBusy(null);
    }
  }

  async function copyDraft(openThread) {
    try {
      await navigator.clipboard.writeText(draftText || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      /* clipboard may be blocked; ignore */
    }
    if (openThread && post.permalink) window.open(post.permalink, '_blank', 'noopener');
  }

  const intentColor = INTENT_COLORS[post.intent] || '#6B6459';
  const cardStyle = {
    borderLeft: `4px solid ${intentColor}`,
    ...(post.status === 'approved' ? { boxShadow: '0 0 0 1.5px #3F7A54 inset' } : {}),
    ...(post.status === 'dismissed' ? { opacity: 0.5 } : {}),
  };

  return (
    <div className="card p-5" style={cardStyle}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-2 mb-2.5">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[0.72rem] font-semibold border"
          style={{ background: intentColor + '18', color: intentColor, borderColor: intentColor + '55' }}
        >
          {INTENT_LABELS[post.intent] || 'General'}
        </span>
        <span className="pill" title="relevance score" style={{ color: scoreColor, borderColor: scoreColor + '55' }}>
          ● {post.score}
        </span>
        <span className="pill">r/{post.subreddit}</span>
        {post.source === 'f5bot' && (
          <span className="pill" style={{ color: '#C05F3C', borderColor: '#C05F3C55' }}>via F5Bot</span>
        )}
        <span className="text-xs text-muted">
          {post.author ? `u/${post.author} · ` : ''}
          {timeAgo(post.createdUtc)}
        </span>
        {post.status === 'approved' && (
          <span className="pill" style={{ color: '#3F7A54', borderColor: '#3F7A54' }}>✓ approved</span>
        )}
        {post.status === 'dismissed' && <span className="pill">dismissed</span>}
        <span className="ml-auto text-xs text-muted">↑{post.ups} · 💬{post.numComments}</span>
      </div>

      {/* title + link */}
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="block font-semibold text-[1.05rem] leading-snug hover:underline"
      >
        {post.title}
      </a>

      {post.selftext ? (
        <div className="mt-1">
          <button
            onClick={() => setShowBody((s) => !s)}
            className="text-xs text-muted hover:text-ink underline"
          >
            {showBody ? 'Hide post text' : 'Show post text'}
          </button>
          {showBody && (
            <p className="mt-1 text-sm text-muted whitespace-pre-wrap max-h-52 overflow-auto">
              {post.selftext}
            </p>
          )}
        </div>
      ) : null}

      {post.matchedKeywords?.length ? (
        <div className="mt-2 text-xs text-muted">
          matched: {post.matchedKeywords.join(', ')}
        </div>
      ) : null}

      {/* draft */}
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Suggested reply
          </span>
          {mention && (
            <span
              className="inline-flex items-center rounded-full px-2 py-[2px] text-[0.68rem] font-semibold"
              style={{ background: '#3F7A5418', color: '#3F7A54' }}
            >
              mentions Casa Libre
            </span>
          )}
          {post.draft?.model && (
            <span className="text-[0.68rem] text-muted">
              · {String(post.draft.model).startsWith('template') ? 'template' : post.draft.model}
            </span>
          )}
          {post.draft?.edited && <span className="text-[0.68rem] text-terracotta">· edited</span>}
          {draftText && <span className="ml-auto text-[0.68rem] text-muted">{draftText.length} chars</span>}
        </div>

        {hasDraft || draftText ? (
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={Math.min(14, Math.max(5, Math.ceil((draftText?.length || 0) / 60)))}
            className="w-full text-sm p-3 rounded-lg border border-line bg-paper/60 focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
            placeholder="No draft yet — click Generate draft."
          />
        ) : (
          <div className="text-sm text-muted italic p-3 border border-dashed border-line rounded-lg">
            No draft yet.
          </div>
        )}

        {/* draft controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="pill cursor-pointer select-none">
            <input
              type="checkbox"
              checked={mention}
              onChange={(e) => setMention(e.target.checked)}
              className="accent-terracotta"
            />
            mention Casa Libre
          </label>

          <button className="btn btn-ghost" onClick={regenerate} disabled={busy === 'draft'}>
            {busy === 'draft' ? <span className="spin">◌</span> : '↻'}{' '}
            {hasDraft ? 'Regenerate' : 'Generate draft'}
          </button>

          <button
            className="btn btn-ghost"
            onClick={saveEdit}
            disabled={busy === 'save' || draftText === (post.draft?.text || '')}
          >
            {busy === 'save' ? 'Saving…' : 'Save edit'}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost" onClick={() => copyDraft(false)} disabled={!draftText}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button className="btn btn-accent" onClick={() => copyDraft(true)} disabled={!draftText}>
              Copy &amp; open thread ↗
            </button>
          </div>
        </div>
      </div>

      {/* status actions */}
      <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
        <button
          className="btn btn-primary"
          onClick={() => patch({ status: 'approved' })}
          disabled={post.status === 'approved'}
        >
          ✓ Approve
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => patch({ status: post.status === 'dismissed' ? 'new' : 'dismissed' })}
        >
          {post.status === 'dismissed' ? 'Restore' : 'Dismiss'}
        </button>
        <span className="ml-auto text-[0.68rem] text-muted">
          Human posts manually — this tool never posts to Reddit.
        </span>
      </div>
    </div>
  );
}
