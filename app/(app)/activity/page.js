'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/Shell';
import { api, timeAgo } from '@/lib/client';
import { ErrorLine, Spinner, Empty } from '@/components/ui';

const LABEL = {
  'login': 'signed in', 'password.changed': 'changed their password',
  'invite.sent': 'invited', 'invite.revoked': 'revoked an invite', 'invite.accepted': 'joined the team',
  'user.updated': 'updated a member', 'draft.generated': 'generated a draft', 'draft.edited': 'edited a draft',
  'draft.approved': 'approved a draft', 'draft.rejected': 'rejected a draft',
  'post.posted': 'marked a post as posted', 'post.dismissed': 'dismissed a post', 'post.drafted': 'restored a post', 'post.new': 'restored a post',
  'post.updated': 'updated a post', 'post.added_manually': 'added a post',
  'knowledge.created': 'added knowledge', 'knowledge.updated': 'edited knowledge', 'knowledge.deleted': 'deleted knowledge',
  'settings.updated': 'changed settings', 'scan.run': 'scanned Reddit', 'f5bot.ingested': 'imported an F5Bot alert', 'seed.demo': 'loaded demo data',
};

function detail(a) {
  const m = a.meta || {};
  if (a.action === 'invite.sent') return `${m.email} as ${m.role}${m.emailed ? '' : ' (email not sent)'}`;
  if (a.action === 'scan.run') return `${m.fetched ?? 0} checked, ${m.added ?? 0} new`;
  if (a.action === 'f5bot.ingested') return `${m.added ?? 0} new posts`;
  if (a.action === 'draft.generated') return `${m.provider}${m.mention ? ', mentions Casa Libre' : ''}`;
  if (a.action.startsWith('knowledge.') && m.title) return m.title;
  if (a.action === 'settings.updated') return m.key;
  return '';
}

export default function Activity() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/activity').then((j) => setRows(j.activity)).catch((e) => setErr(e.message)); }, []);
  return (
    <>
      <PageHeader eyebrow="Audit log" title="Activity" />
      <ErrorLine error={err} />
      {!rows && !err && <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading…</div>}
      {rows && !rows.length && <Empty title="No activity yet" />}
      {rows && rows.length > 0 && (
        <div className="card divide-y divide-line">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-5 py-3 text-[14px]">
              <span className="font-medium">{a.actor}</span>
              <span className="text-ink/75">{LABEL[a.action] || a.action}</span>
              {detail(a) && <span className="text-muted">· {detail(a)}</span>}
              {a.entity === 'post' && a.entity_id && <Link href={`/posts/${a.entity_id}`} className="text-[13px] underline decoration-ink/30 underline-offset-2">open post</Link>}
              <span className="ml-auto font-mono text-[11.5px] text-muted">{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
