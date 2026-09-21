'use client';

import { useEffect, useMemo, useState } from 'react';
import PostCard from '@/components/PostCard';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'approved', label: 'Approved' },
  { key: 'dismissed', label: 'Dismissed' },
];

function Stat({ label, value, hint }) {
  return (
    <div className="card px-4 py-3 flex-1 min-w-[7rem]">
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
      {hint && <div className="text-[0.65rem] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState(null);
  // F5Bot import panel
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  async function loadPosts() {
    setLoading(true);
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' });
      const json = await res.json();
      setPosts(json.posts || []);
      setMeta(json.meta || {});
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    setError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDraft: true }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'scan failed');
      setScanResult(json);
      await loadPosts();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setScanning(false);
    }
  }

  async function runImport() {
    if (!importText.trim()) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, autoDraft: true }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'import failed');
      setImportResult(json);
      setImportText('');
      await loadPosts();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setImporting(false);
    }
  }

  function onCardChange(updated) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const counts = useMemo(() => {
    const c = { all: posts.length, new: 0, approved: 0, dismissed: 0, drafts: 0 };
    for (const p of posts) {
      c[p.status] = (c[p.status] || 0) + 1;
      if (p.draft?.text) c.drafts++;
    }
    return c;
  }, [posts]);

  const visible = useMemo(() => {
    if (tab === 'all') return posts;
    return posts.filter((p) => p.status === tab);
  }, [posts, tab]);

  const lastScan = meta.lastScan ? new Date(meta.lastScan).toLocaleString() : '—';

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center text-base font-bold shrink-0 shadow-sm">
            CL
          </div>
          <div>
            <div className="text-[0.68rem] uppercase tracking-[0.2em] text-muted">Casa Libre · research ops</div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">Reddit Listening Queue</h1>
          </div>
        </div>
        <p className="text-sm text-muted mt-3 max-w-2xl leading-relaxed">
          Paraguay real-estate threads — buying, renting, selling, moving — each with a{' '}
          <strong>genuinely-helpful, human-sounding reply</strong> that weaves in Casa Libre naturally.
          Review, edit the draft, then <strong>post manually</strong>. This tool discovers &amp; drafts
          only — it never posts to Reddit.
        </p>
      </header>

      {/* action bar */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" onClick={runScan} disabled={scanning}>
          {scanning ? (
            <>
              <span className="spin">◌</span> Scanning &amp; drafting…
            </>
          ) : (
            <>⟳ Run scan (fetch ~6 + draft)</>
          )}
        </button>
        <button className="btn btn-ghost" onClick={loadPosts} disabled={loading || scanning}>
          Refresh
        </button>
        <button
          className="btn btn-accent"
          onClick={() => setShowImport((s) => !s)}
          title="Paste an F5Bot alert email"
        >
          ✉ Import from F5Bot
        </button>
        <div className="text-xs text-muted ml-auto">
          Last scan: {lastScan}
          <span className="mx-2">·</span>
          Reddit reads are free &amp; read-only
        </div>
      </div>

      {/* F5Bot import panel */}
      {showImport && (
        <div className="card p-4 mb-5">
          <div className="font-semibold mb-1">Import from F5Bot email</div>
          <p className="text-xs text-muted mb-3">
            Open the F5Bot alert email and <strong>copy its whole body</strong>, then paste it below.
            The app finds the Reddit threads, scores &amp; tags them, and drafts a Casa Libre reply for
            each. You can also paste a single thread’s title + text directly.
          </p>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={7}
            placeholder={'Paste the F5Bot email here…\n\ne.g.\n"paraguay real estate"\nBuying an apartment in Asunción as a foreigner? — https://www.reddit.com/r/Paraguay/comments/abc123/...'}
            className="w-full text-sm p-3 rounded-lg border border-line bg-paper/60 focus:outline-none focus:ring-2 focus:ring-terracotta/40 resize-y"
          />
          <div className="mt-2 flex items-center gap-2">
            <button className="btn btn-primary" onClick={runImport} disabled={importing || !importText.trim()}>
              {importing ? (
                <>
                  <span className="spin">◌</span> Importing &amp; drafting…
                </>
              ) : (
                <>Import &amp; draft</>
              )}
            </button>
            <button className="btn btn-ghost" onClick={() => { setImportText(''); setImportResult(null); }} disabled={importing}>
              Clear
            </button>
            <span className="ml-auto text-[0.68rem] text-muted">Free — no Reddit API, no account needed.</span>
          </div>
          {importResult && (
            <div className="mt-3 text-sm text-good">
              ✓ Imported {importResult.parsed} thread(s) · {importResult.added} new · drafted {importResult.drafted}.
            </div>
          )}
        </div>
      )}

      {/* scan result banner */}
      {scanResult && (
        <div className="card p-3 mb-5 text-sm" style={{ borderColor: '#3F7A54' }}>
          <span className="font-semibold text-good">Scan complete.</span>{' '}
          Searched {scanResult.queries} queries ({scanResult.authMode}), found {scanResult.found},
          {' '}
          {scanResult.relevant} relevant, kept top {scanResult.kept}, drafted {scanResult.drafted}.
          {scanResult.errors?.length ? (
            <span className="text-warn"> · {scanResult.errors.length} query error(s)</span>
          ) : null}
        </div>
      )}

      {error && (
        <div className="card p-3 mb-5 text-sm" style={{ borderColor: '#8a2b4a', color: '#8a2b4a' }}>
          {error}
        </div>
      )}

      {/* stats */}
      <div className="flex flex-wrap gap-3 mb-5">
        <Stat label="In queue" value={counts.all} />
        <Stat label="New" value={counts.new} />
        <Stat label="Drafted" value={counts.drafts} />
        <Stat label="Approved" value={counts.approved} />
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-line">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key
                ? 'border-terracotta text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
            <span className="ml-1 text-xs text-muted">{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* list */}
      {loading ? (
        <div className="text-center text-muted py-16">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          {counts.all === 0 ? (
            <>
              <div className="text-lg font-semibold text-ink mb-1">No posts yet</div>
              Click <strong>Run scan</strong> to fetch ~6 real Paraguay real-estate threads from
              Reddit and draft replies for them.
            </>
          ) : (
            <>Nothing in “{tab}”.</>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((p) => (
            <PostCard key={p.id} post={p} onChange={onCardChange} />
          ))}
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-muted">
        GREEN zone: discovery + drafting only. A human reviews &amp; posts from a real account.
      </footer>
    </main>
  );
}
