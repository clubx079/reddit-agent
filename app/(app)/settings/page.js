'use client';
import { useEffect, useState } from 'react';
import { PageHeader, useUser } from '@/components/Shell';
import { api } from '@/lib/client';
import { ErrorLine, Spinner } from '@/components/ui';

export default function Settings() {
  const me = useUser();
  const admin = me.role === 'admin';
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api('/api/settings').then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  if (!d) return <>{err ? <ErrorLine error={err} /> : <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading…</div>}</>;
  const s = d.settings, i = d.integrations;

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />
      {!admin && <p className="text-[14px] text-muted -mt-3 mb-6">Only admins can change settings.</p>}

      <section className="card p-5 mb-6">
        <h2 className="text-[16px] font-bold">Connections</h2>
        <div className="mt-3 grid sm:grid-cols-3 gap-3">
          <Status ok={i.llmProviders.length > 0} label="AI drafting" detail={i.llmProviders.length ? `Using ${i.llmProviders.join(' + ')}` : 'No AI key — template drafts only'} />
          <Status ok={i.redditApi} label="Reddit API" detail={i.redditApi ? 'Connected (read-only)' : 'Not connected — add REDDIT_CLIENT_ID / SECRET'} />
          <Status ok={i.email} label="Invite emails" detail={i.email ? `From ${i.emailFrom}` : 'Not configured — share invite links by hand'} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListSetting title="Keywords" hint="Phrases searched on Reddit. One per line." k="keywords" value={s.keywords} admin={admin} onSaved={load} />
        <ListSetting title="Subreddits" hint="Searched directly, plus a site-wide search. One per line, without r/." k="subreddits" value={s.subreddits} admin={admin} onSaved={load} />
        <ObjSetting title="Scanning" k="scan" value={s.scan} admin={admin} onSaved={load} fields={[
          ['timeWindow', 'How far back', 'select', ['hour', 'day', 'week', 'month', 'year']],
          ['limitPerQuery', 'Results per search', 'number'],
          ['minRelevance', 'Minimum relevance (0–100)', 'number'],
          ['maxPostsPerScan', 'Max new posts per scan', 'number'],
        ]} />
        <ObjSetting title="AI drafting" k="llm" value={s.llm} admin={admin} onSaved={load} fields={[
          ['provider', 'Provider', 'select', ['groq', 'openai', 'template']],
          ['model', 'Model', 'text'],
          ['temperature', 'Creativity (0–1.2)', 'number'],
          ['maxTokens', 'Max reply length (tokens)', 'number'],
          ['fallbackToTemplate', 'Use templates if the AI fails', 'bool'],
        ]} />
        <ObjSetting title="Casa Libre mentions" k="mention" value={s.mention} admin={admin} onSaved={load} fields={[
          ['targetRatio', 'Share of replies that may mention Casa Libre (0.12 ≈ 1 in 8)', 'number'],
          ['trackedUrl', 'Tracked link used in mentions', 'text'],
        ]} />
      </div>
    </>
  );
}

function Status({ ok, label, detail }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center gap-2 text-[14px] font-medium"><span className={`w-2 h-2 rounded-full ${ok ? 'bg-good' : 'bg-warn'}`} />{label}</div>
      <div className="text-[12.5px] text-muted mt-1">{detail}</div>
    </div>
  );
}

function useSave(k, onSaved) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const save = async (value) => {
    setBusy(true); setErr(''); setMsg('');
    try { await api('/api/settings', { method: 'PUT', body: { key: k, value } }); setMsg('Saved'); onSaved(); setTimeout(() => setMsg(''), 2000); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return { busy, msg, err, save };
}

function ListSetting({ title, hint, k, value, admin, onSaved }) {
  const [text, setText] = useState(value.join('\n'));
  const { busy, msg, err, save } = useSave(k, onSaved);
  return (
    <section className="card p-5">
      <h2 className="text-[16px] font-bold">{title}</h2>
      <p className="text-[13px] text-muted mt-0.5">{hint}</p>
      <textarea className="input mt-3 min-h-[220px] font-mono text-[13px]" value={text} onChange={(e) => setText(e.target.value)} disabled={!admin} />
      <ErrorLine error={err} />
      {admin && <div className="mt-3 flex items-center gap-3"><button className="btn-ink" disabled={busy} onClick={() => save(text.split('\n'))}>{busy ? <Spinner /> : 'Save'}</button><span className="text-[13px] text-good">{msg}</span></div>}
    </section>
  );
}

function ObjSetting({ title, k, value, fields, admin, onSaved }) {
  const [v, setV] = useState(value);
  const { busy, msg, err, save } = useSave(k, onSaved);
  return (
    <section className="card p-5">
      <h2 className="text-[16px] font-bold">{title}</h2>
      <div className="mt-3 space-y-3">
        {fields.map(([f, label, type, options]) => (
          <div key={f}>
            {type === 'bool'
              ? <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" className="accent-ink w-4 h-4" checked={!!v[f]} disabled={!admin} onChange={(e) => setV({ ...v, [f]: e.target.checked })} />{label}</label>
              : <>
                  <label className="label">{label}</label>
                  {type === 'select'
                    ? <select className="input" value={v[f]} disabled={!admin} onChange={(e) => setV({ ...v, [f]: e.target.value })}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
                    : <input className="input" type={type === 'number' ? 'number' : 'text'} step={type === 'number' ? 'any' : undefined} value={v[f] ?? ''} disabled={!admin} onChange={(e) => setV({ ...v, [f]: type === 'number' ? e.target.value : e.target.value })} />}
                </>}
          </div>
        ))}
      </div>
      <ErrorLine error={err} />
      {admin && <div className="mt-4 flex items-center gap-3"><button className="btn-ink" disabled={busy} onClick={() => save(v)}>{busy ? <Spinner /> : 'Save'}</button><span className="text-[13px] text-good">{msg}</span></div>}
    </section>
  );
}
