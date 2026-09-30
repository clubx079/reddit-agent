'use client';
import { useEffect, useState } from 'react';
import { PageHeader, useUser } from '@/components/Shell';
import { api, timeAgo } from '@/lib/client';
import { Modal, ErrorLine, Spinner, Icon, Empty, INTENT } from '@/components/ui';

const KINDS = {
  rule: { label: 'Hard rules', hint: 'The AI must always follow these.' },
  banned: { label: 'Never say / never do', hint: 'Words and moves that are off-limits.' },
  tone: { label: 'Tone', hint: 'How replies should sound.' },
  fact: { label: 'Facts', hint: 'True statements the AI may use.' },
  faq: { label: 'Topic knowledge', hint: 'Detailed answers per intent (buying, renting…).' },
  mention: { label: 'Casa Libre mentions', hint: 'How to mention Casa Libre, when a mention is allowed.' },
};
const BLANK = { kind: 'fact', title: '', content: '', intent: '', language: '', priority: 50, active: true };

export default function Knowledge() {
  const me = useUser();
  const admin = me.role === 'admin';
  const [entries, setEntries] = useState(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState(null);   // entry being edited (or BLANK for new)
  const [filter, setFilter] = useState('');

  const load = () => api('/api/knowledge').then((j) => setEntries(j.entries)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const toggle = async (e) => { try { await api(`/api/knowledge/${e.id}`, { method: 'PATCH', body: { active: !e.active } }); load(); } catch (x) { setErr(x.message); } };
  const shown = (entries || []).filter((e) => !filter || `${e.title} ${e.content}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <PageHeader eyebrow="What the AI knows" title="Knowledge base">
        {admin && <button className="btn-ink" onClick={() => setEdit({ ...BLANK })}><Icon name="plus" />Add entry</button>}
      </PageHeader>
      <p className="text-[14px] text-muted max-w-2xl -mt-3 mb-6">Every draft is written from these entries. Rules and facts always apply; topic knowledge and mentions are picked by the post’s intent and language. Switch an entry off to stop the AI from using it.{!admin && ' Only admins can change entries.'}</p>
      <div className="relative max-w-sm mb-6"><Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" /><input className="input !pl-10" placeholder="Search entries" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
      <ErrorLine error={err} />
      {!entries && <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading…</div>}
      {entries && !entries.length && <Empty title="The knowledge base is empty">Add rules and facts so the AI can write good replies.</Empty>}
      <div className="space-y-8">
        {Object.entries(KINDS).map(([kind, meta]) => {
          const items = shown.filter((e) => e.kind === kind);
          if (!items.length) return null;
          return (
            <section key={kind}>
              <div className="flex items-baseline gap-3 mb-3"><h2 className="text-[18px] font-bold tracking-tight">{meta.label}</h2><span className="text-[13px] text-muted">{meta.hint}</span></div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((e) => (
                  <article key={e.id} className={`card p-4 flex flex-col ${e.active ? '' : 'opacity-55'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[14.5px] font-bold leading-snug">{e.title}</h3>
                      <span className="font-mono text-[11px] text-muted shrink-0" title="Priority">P{e.priority}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] text-ink/75 leading-relaxed line-clamp-5 whitespace-pre-wrap">{e.content}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                      {e.intent && <span className={`pill ${INTENT[e.intent]?.cls}`}>{INTENT[e.intent]?.label}</span>}
                      {e.language && <span className="pill bg-hatch1 text-muted">{e.language.toUpperCase()}</span>}
                      {!e.active && <span className="pill bg-hatch1 text-muted">Off</span>}
                      <span className="text-muted ml-auto">updated {timeAgo(e.updated_at)}</span>
                    </div>
                    {admin && (
                      <div className="mt-3 pt-3 border-t border-line flex gap-2">
                        <button className="btn-ghost !px-2.5 !py-1 text-[12.5px]" onClick={() => setEdit(e)}>Edit</button>
                        <button className="btn-ghost !px-2.5 !py-1 text-[12.5px]" onClick={() => toggle(e)}>{e.active ? 'Switch off' : 'Switch on'}</button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {edit && <EntryModal entry={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}

function EntryModal({ entry, onClose, onSaved }) {
  const isNew = !entry.id;
  const [f, setF] = useState({ ...entry, intent: entry.intent || '', language: entry.language || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    setBusy(true); setErr('');
    const body = { kind: f.kind, title: f.title, content: f.content, intent: f.intent || null, language: f.language || null, priority: Number(f.priority), active: f.active };
    try { await api(isNew ? '/api/knowledge' : `/api/knowledge/${entry.id}`, { method: isNew ? 'POST' : 'PATCH', body }); onSaved(); }
    catch (e) { setErr(e.message); setBusy(false); }
  };
  const del = async () => {
    if (!confirm('Delete this entry? The AI will stop using it.')) return;
    try { await api(`/api/knowledge/${entry.id}`, { method: 'DELETE' }); onSaved(); } catch (e) { setErr(e.message); }
  };
  return (
    <Modal open onClose={onClose} title={isNew ? 'New knowledge entry' : 'Edit entry'} wide>
      <div className="grid sm:grid-cols-3 gap-3">
        <div><label className="label">Type</label><select className="input" value={f.kind} onChange={set('kind')}>{Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="label">Intent</label><select className="input" value={f.intent} onChange={set('intent')}><option value="">Any</option>{Object.entries(INTENT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
        <div><label className="label">Language</label><select className="input" value={f.language} onChange={set('language')}><option value="">Any</option><option value="en">English</option><option value="es">Spanish</option></select></div>
      </div>
      <label className="label mt-4">Title</label>
      <input className="input" value={f.title} onChange={set('title')} placeholder="e.g. Renting in Asunción" />
      <label className="label mt-4">Content</label>
      <textarea className="input min-h-[200px] leading-relaxed" value={f.content} onChange={set('content')} placeholder="What the AI should know or follow." />
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div><label className="label">Priority (0–100)</label><input type="number" min="0" max="100" className="input !w-28" value={f.priority} onChange={set('priority')} /></div>
        <label className="flex items-center gap-2 text-[14px] pb-2.5"><input type="checkbox" className="accent-ink w-4 h-4" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Active</label>
      </div>
      <ErrorLine error={err} />
      <div className="mt-5 flex items-center gap-2">
        {!isNew && <button className="btn-danger" onClick={del}>Delete</button>}
        <div className="ml-auto flex gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-ink" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Save'}</button></div>
      </div>
    </Modal>
  );
}
