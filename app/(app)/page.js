'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/Shell';
import { api, timeAgo } from '@/lib/client';
import { Pill, Relevance, Empty, Modal, ErrorLine, Spinner, Icon, INTENT } from '@/components/ui';

const TABS = [['new', 'New'], ['drafted', 'Drafted'], ['approved', 'Approved'], ['posted', 'Posted'], ['dismissed', 'Dismissed'], ['all', 'All']];

export default function Inbox() {
  const [status, setStatus] = useState('new');
  const [intent, setIntent] = useState('');
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null);   // 'f5bot' | 'manual'
  const [scan, setScan] = useState({ busy: false, msg: '' });

  const load = useCallback(async () => {
    setErr('');
    const p = new URLSearchParams({ status });
    if (intent) p.set('intent', intent);
    if (q.trim()) p.set('q', q.trim());
    if (mine) p.set('assigned', 'me');
    try { setData(await api(`/api/posts?${p}`)); } catch (e) { setErr(e.message); }
  }, [status, intent, q, mine]);

  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const runScan = async () => {
    setScan({ busy: true, msg: '' });
    try {
      const r = await api('/api/scan', { method: 'POST' });
      setScan({ busy: false, msg: `Scanned Reddit: ${r.fetched} posts checked, ${r.relevant} relevant, ${r.added} new.` });
      load();
    } catch (e) { setScan({ busy: false, msg: e.message }); }
  };

  const counts = data?.counts || {};
  return (
    <>
      <PageHeader eyebrow="Listening" title="Inbox">
        <button onClick={() => setModal('manual')} className="btn-line"><Icon name="plus" />Add post</button>
        <button onClick={() => setModal('f5bot')} className="btn-line"><Icon name="mail" />Paste F5Bot alert</button>
        <button onClick={runScan} disabled={scan.busy} className="btn-ink">{scan.busy ? <Spinner /> : <Icon name="radar" />}Scan Reddit</button>
      </PageHeader>
      {scan.msg && <div className="card px-4 py-3 mb-4 text-[13.5px] flex justify-between gap-3"><span>{scan.msg}</span><button className="text-muted hover:text-ink" onClick={() => setScan({ busy: false, msg: '' })}><Icon name="x" /></button></div>}

      {/* status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium border-[1.5px] transition-colors ${status === k ? 'bg-ink text-paper border-ink' : 'bg-card border-line text-ink/70 hover:border-ink'}`}>
            {label}<span className={`ml-1.5 font-mono text-[11.5px] ${status === k ? 'text-paper/70' : 'text-muted'}`}>{counts[k] ?? '·'}</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !pl-10" placeholder="Search titles, text, subreddits" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={intent} onChange={(e) => setIntent(e.target.value)}>
          <option value="">All intents</option>
          {Object.entries(INTENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <label className="btn-line cursor-pointer select-none"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-ink" />Assigned to me</label>
      </div>

      <ErrorLine error={err} />
      {!data && !err && <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading posts…</div>}
      {data && !data.posts.length && (
        <Empty title="Nothing here">
          {status === 'new' ? 'No new posts. Scan Reddit, paste an F5Bot alert, or add a post you found.' : 'No posts with this status yet.'}
        </Empty>
      )}
      {data && data.posts.length > 0 && (
        <div className="card divide-y divide-line overflow-hidden">
          {data.posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 px-4 sm:px-5 py-4 hover:bg-paper/60 transition-colors">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <span className="font-mono">r/{p.subreddit}</span>
                  <span>·</span><span>{timeAgo(p.created_utc || p.fetched_at)}</span>
                  {p.source === 'demo' && <span className="pill border border-dashed border-muted/50 text-muted !py-0">demo</span>}
                  {p.language === 'es' && <span className="pill bg-hatch1 text-muted !py-0">ES</span>}
                </div>
                <div className="mt-1 text-[15px] font-medium leading-snug line-clamp-2">{p.title}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Pill kind="intent" value={p.intent} />
                <Relevance value={p.relevance} />
                {status === 'all' && <Pill kind="status" value={p.status} />}
              </div>
            </Link>
          ))}
        </div>
      )}

      <F5botModal open={modal === 'f5bot'} onClose={() => setModal(null)} onDone={load} />
      <ManualModal open={modal === 'manual'} onClose={() => setModal(null)} />
    </>
  );
}

function F5botModal({ open, onClose, onDone }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const submit = async () => {
    setBusy(true); setErr(''); setMsg('');
    try { const r = await api('/api/ingest', { method: 'POST', body: { text } }); setMsg(`${r.parsed} Reddit links found, ${r.added} new posts added.`); setText(''); onDone(); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="Paste an F5Bot alert" wide>
      <p className="text-[13.5px] text-muted mb-3">Copy the whole F5Bot alert email and paste it here. Every Reddit link in it lands in the inbox.</p>
      <textarea className="input min-h-[220px] font-mono text-[12.5px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the email text…" />
      <ErrorLine error={err} />
      {msg && <div className="mt-3 text-[13.5px] text-good">{msg}</div>}
      <div className="mt-4 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Close</button><button className="btn-ink" onClick={submit} disabled={busy || !text.trim()}>{busy ? <Spinner /> : 'Add posts'}</button></div>
    </Modal>
  );
}

function ManualModal({ open, onClose }) {
  const [f, setF] = useState({ url: '', title: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try { const r = await api('/api/posts/manual', { method: 'POST', body: f }); window.location.href = `/posts/${r.id}`; }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add a post">
      <label className="label">Reddit post link</label>
      <input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://www.reddit.com/r/Paraguay/comments/…" />
      <label className="label mt-4">Title</label>
      <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className="label mt-4">Post text (optional, helps the draft)</label>
      <textarea className="input min-h-[120px]" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
      <ErrorLine error={err} />
      <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-ink" onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Add and open'}</button></div>
    </Modal>
  );
}
