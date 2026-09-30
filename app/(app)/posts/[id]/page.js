'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, timeAgo } from '@/lib/client';
import { useUser } from '@/components/Shell';
import { Pill, Relevance, ErrorLine, Spinner, Icon, Modal } from '@/components/ui';

const MENTION = [['auto', 'Auto'], ['yes', 'Include Casa Libre'], ['no', 'No mention']];

export default function PostPage({ params }) {
  const me = useUser();
  const [data, setData] = useState(null);
  const [team, setTeam] = useState([]);
  const [kb, setKb] = useState([]);
  const [err, setErr] = useState('');
  const [mention, setMention] = useState('auto');
  const [gen, setGen] = useState({ busy: false, note: '' });
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [postedOpen, setPostedOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/posts/${params.id}`);
      setData(d);
      const cur = d.drafts.find((x) => x.status !== 'rejected');
      setText(cur ? cur.body : '');
    } catch (e) { setErr(e.message); }
  }, [params.id]);

  useEffect(() => {
    load();
    api('/api/team').then((t) => setTeam(t.users.filter((u) => u.status === 'active'))).catch(() => {});
    api('/api/knowledge').then((k) => setKb(k.entries)).catch(() => {});
  }, [load]);

  const post = data?.post;
  const drafts = data?.drafts || [];
  const current = drafts.find((x) => x.status !== 'rejected');
  const dirty = current && text.trim() !== current.body.trim();
  const kbById = useMemo(() => Object.fromEntries(kb.map((e) => [e.id, e])), [kb]);

  const patchPost = async (body) => { try { await api(`/api/posts/${post.id}`, { method: 'PATCH', body }); await load(); } catch (e) { setErr(e.message); } };
  const generate = async () => {
    setGen({ busy: true, note: '' }); setErr('');
    try {
      const r = await api(`/api/posts/${post.id}/draft`, { method: 'POST', body: { mention } });
      setGen({ busy: false, note: r.llmError ? 'The AI was unavailable, so this draft was built from the knowledge base templates.' : '' });
      await load();
    } catch (e) { setGen({ busy: false, note: '' }); setErr(e.message); }
  };
  const saveDraft = async (status) => {
    setSaving(true); setErr('');
    try {
      const body = {};
      if (dirty) body.body = text;
      if (status) body.status = status;
      if (Object.keys(body).length) await api(`/api/drafts/${current.id}`, { method: 'PATCH', body });
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };
  const copyAndOpen = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
    if (post.permalink) window.open(post.permalink, '_blank', 'noopener');
  };

  if (err && !data) return <ErrorLine error={err} />;
  if (!post) return <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading…</div>;

  return (
    <>
      <Link href="/" className="btn-ghost -ml-3 mb-3"><Icon name="back" />Inbox</Link>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-start">
        {/* ---- the Reddit post ---- */}
        <section className="card p-6">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <span className="font-mono text-ink">r/{post.subreddit}</span>
            {post.author && <><span>·</span><span>u/{post.author}</span></>}
            <span>·</span><span>{timeAgo(post.created_utc || post.fetched_at)}</span>
            {post.source === 'demo' && <span className="pill border border-dashed border-muted/50 text-muted !py-0">demo data</span>}
          </div>
          <h1 className="mt-2 text-[22px] font-bold leading-snug tracking-tight">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Pill kind="status" value={post.status} /><Pill kind="intent" value={post.intent} /><Relevance value={post.relevance} />
            {post.language === 'es' && <span className="pill bg-hatch1 text-muted">Spanish</span>}
            {post.num_comments != null && <span className="text-[12.5px] text-muted">{post.num_comments} comments · {post.reddit_score ?? 0} upvotes</span>}
          </div>
          {post.body ? <div className="mt-5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink/85">{post.body}</div> : <div className="mt-5 text-[14px] text-muted">No text in this post, just the title.</div>}
          {post.permalink && <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="btn-line mt-6"><Icon name="ext" />Open on Reddit</a>}

          <div className="mt-6 pt-5 border-t border-line grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Assigned to</label>
              <select className="input" value={post.assigned_to || ''} onChange={(e) => patchPost({ assigned_to: e.target.value || null })}>
                <option value="">Nobody</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}{u.id === me.id ? ' (me)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Triage</label>
              {post.status === 'dismissed'
                ? <button onClick={() => patchPost({ status: drafts.length ? 'drafted' : 'new' })} className="btn-line w-full">Restore to inbox</button>
                : <button onClick={() => patchPost({ status: 'dismissed' })} className="btn-line w-full">Dismiss (not relevant)</button>}
            </div>
          </div>
          {post.posted_at && (
            <div className="mt-5 rounded-xl bg-[#E8F0E9] px-4 py-3 text-[13.5px] text-good">
              Posted on Reddit {timeAgo(post.posted_at)}.{post.our_comment_url && <> <a className="underline" href={post.our_comment_url} target="_blank" rel="noopener noreferrer">View our comment</a></>}
            </div>
          )}
        </section>

        {/* ---- the reply draft ---- */}
        <section className="card-ink p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Reply draft</div>
              <div className="text-[13px] text-muted mt-0.5">Written from the knowledge base. Edit freely, then copy it to Reddit.</div>
            </div>
            <div className="flex rounded-full border-[1.5px] border-ink p-0.5 bg-card">
              {MENTION.map(([k, l]) => (
                <button key={k} onClick={() => setMention(k)} className={`rounded-full px-3 py-1 text-[12px] font-medium ${mention === k ? 'bg-ink text-paper' : 'text-ink/70'}`}>{l}</button>
              ))}
            </div>
          </div>

          {!current && (
            <div className="mt-6 rounded-xl border-[1.5px] border-dashed border-line p-8 text-center">
              <div className="text-[15px] font-medium">No draft yet</div>
              <div className="text-[13px] text-muted mt-1">The AI reads the post and the knowledge base, then writes a reply for you to review.</div>
              <button onClick={generate} disabled={gen.busy} className="btn-ink mt-4">{gen.busy ? <><Spinner />Writing…</> : <><Icon name="spark" />Generate draft</>}</button>
            </div>
          )}

          {current && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="pill bg-hatch1 text-muted font-mono">{current.provider}{current.model ? ` · ${current.model}` : ''}</span>
                {current.mention_included ? <span className="pill bg-[#F6ECE6] text-terracotta">Mentions Casa Libre</span> : <span className="pill bg-hatch1 text-muted">No mention</span>}
                <Pill kind="status" value={current.status === 'approved' ? 'approved' : 'drafted'} />
                {current.edited_by && <span className="pill bg-hatch1 text-muted">Edited</span>}
              </div>
              <textarea className="input mt-3 min-h-[320px] text-[14.5px] leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="mt-1 text-right font-mono text-[11px] text-muted">{text.length} characters</div>
              {gen.note && <div className="mt-2 text-[12.5px] text-warn">{gen.note}</div>}
              <ErrorLine error={err} />
              <div className="mt-4 flex flex-wrap gap-2">
                {dirty && <button onClick={() => saveDraft()} disabled={saving} className="btn-line">{saving ? <Spinner /> : 'Save edits'}</button>}
                {current.status !== 'approved'
                  ? <button onClick={() => saveDraft('approved')} disabled={saving} className="btn-ink"><Icon name="check" />Approve</button>
                  : <span className="pill bg-[#E8F0E9] text-good self-center">Approved</span>}
                <button onClick={copyAndOpen} className="btn-line"><Icon name="copy" />{copied ? 'Copied' : 'Copy & open thread'}</button>
                {post.status !== 'posted' && <button onClick={() => setPostedOpen(true)} className="btn-line">Mark as posted</button>}
                <button onClick={generate} disabled={gen.busy} className="btn-ghost ml-auto">{gen.busy ? <Spinner /> : <Icon name="spark" />}Regenerate</button>
              </div>
              {current.knowledge_ids?.length > 0 && (
                <details className="mt-5 text-[13px]">
                  <summary className="cursor-pointer text-muted hover:text-ink">Knowledge used ({current.knowledge_ids.length})</summary>
                  <ul className="mt-2 flex flex-wrap gap-1.5">{current.knowledge_ids.map((id) => kbById[id] && <li key={id} className="pill bg-hatch1 text-ink/75">{kbById[id].title}</li>)}</ul>
                </details>
              )}
            </>
          )}

          {drafts.length > 1 && (
            <details className="mt-5 text-[13px]">
              <summary className="cursor-pointer text-muted hover:text-ink">Earlier versions ({drafts.length - 1})</summary>
              <div className="mt-3 space-y-3">
                {drafts.filter((d) => d.id !== current?.id).map((d) => (
                  <div key={d.id} className="rounded-xl border border-line p-3">
                    <div className="flex justify-between text-[11.5px] text-muted font-mono"><span>{d.provider}{d.mention_included ? ' · mention' : ''}</span><span>{timeAgo(d.created_at)}</span></div>
                    <div className="mt-1.5 whitespace-pre-wrap text-[13px] text-ink/75 line-clamp-4">{d.body}</div>
                    <button className="btn-ghost !px-2 !py-1 mt-1 text-[12px]" onClick={() => setText(d.body)}>Use this text</button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      </div>
      <PostedModal open={postedOpen} onClose={() => setPostedOpen(false)} onSave={async (url) => { await patchPost({ status: 'posted', our_comment_url: url }); setPostedOpen(false); }} />
    </>
  );
}

function PostedModal({ open, onClose, onSave }) {
  const [url, setUrl] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Mark as posted">
      <p className="text-[13.5px] text-muted">Did you post the reply on Reddit? Paste the link to your comment to keep track (optional).</p>
      <label className="label mt-4">Link to our comment</label>
      <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.reddit.com/r/…/comments/…/comment/…" />
      <div className="mt-5 flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-ink" onClick={() => onSave(url.trim())}>Mark as posted</button></div>
    </Modal>
  );
}
