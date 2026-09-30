'use client';
import { useEffect, useState } from 'react';
import { PageHeader, useUser } from '@/components/Shell';
import { api, timeAgo } from '@/lib/client';
import { ErrorLine, Spinner, Icon, Modal } from '@/components/ui';

export default function Team() {
  const me = useUser();
  const admin = me.role === 'admin';
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [result, setResult] = useState(null);   // last invite result (link + email status)

  const load = () => api('/api/team').then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const updateUser = async (u, patch) => { setErr(''); try { await api(`/api/team/users/${u.id}`, { method: 'PATCH', body: patch }); load(); } catch (e) { setErr(e.message); } };
  const revoke = async (inv) => { if (!confirm(`Revoke the invite for ${inv.email}?`)) return; try { await api(`/api/team/invites/${inv.id}`, { method: 'DELETE' }); load(); } catch (e) { setErr(e.message); } };

  return (
    <>
      <PageHeader eyebrow="People" title="Team">
        {admin && <button className="btn-ink" onClick={() => { setResult(null); setInviteOpen(true); }}><Icon name="mail" />Invite member</button>}
      </PageHeader>
      <ErrorLine error={err} />
      {result && (
        <div className="card-ink p-5 mb-6">
          <div className="font-bold">Invite created for {result.invite.email}</div>
          <div className="text-[13.5px] mt-1 text-muted">
            {result.emailed ? 'We emailed them the link. You can also share it yourself:' : `The email couldn’t be sent (${result.emailError}). Share this link with them directly:`}
          </div>
          <CopyField value={result.link} />
          <div className="text-[12px] text-muted mt-2">The link works once and expires in 7 days.</div>
        </div>
      )}
      {!data && !err && <div className="text-muted flex items-center gap-2 py-10 justify-center"><Spinner />Loading…</div>}
      {data && (
        <>
          <div className="card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-line eyebrow"><span>Member</span><span>Role</span><span>Last sign-in</span><span>Status</span></div>
            {data.users.map((u) => {
              const self = u.id === me.id;
              return (
                <div key={u.id} className="grid sm:grid-cols-[1.6fr_1fr_1fr_1fr] gap-2 sm:gap-4 items-center px-5 py-4 border-b border-line last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center font-bold">{(u.full_name || u.email).charAt(0).toUpperCase()}</span>
                    <div className="min-w-0"><div className="text-[14px] font-medium truncate">{u.full_name || '—'}{self && <span className="text-muted font-normal"> (you)</span>}</div><div className="text-[12.5px] text-muted truncate">{u.email}</div></div>
                  </div>
                  <div>{admin && !self
                    ? <select className="input !py-1.5 !w-auto" value={u.role} onChange={(e) => updateUser(u, { role: e.target.value })}><option value="member">Member</option><option value="admin">Admin</option></select>
                    : <span className="pill bg-hatch1 capitalize">{u.role}</span>}</div>
                  <div className="text-[13px] text-muted">{u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}</div>
                  <div>{admin && !self
                    ? <button className={u.status === 'active' ? 'btn-ghost !px-2.5 !py-1 text-[12.5px]' : 'btn-line !px-2.5 !py-1 text-[12.5px]'} onClick={() => updateUser(u, { status: u.status === 'active' ? 'disabled' : 'active' })}>{u.status === 'active' ? 'Disable' : 'Re-enable'}</button>
                    : <span className={`pill ${u.status === 'active' ? 'bg-[#E8F0E9] text-good' : 'bg-hatch1 text-muted'} capitalize`}>{u.status}</span>}</div>
                </div>
              );
            })}
          </div>

          <h2 className="text-[18px] font-bold tracking-tight mt-10 mb-3">Pending invites</h2>
          {!data.invites.length ? <div className="text-[14px] text-muted">No pending invites.</div> : (
            <div className="card divide-y divide-line">
              {data.invites.map((inv) => (
                <div key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1"><div className="text-[14px] font-medium">{inv.email}</div><div className="text-[12.5px] text-muted">Invited {timeAgo(inv.created_at)} as {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</div></div>
                  {admin && <button className="btn-ghost !px-2.5 !py-1 text-[12.5px]" onClick={() => revoke(inv)}>Revoke</button>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={(r) => { setInviteOpen(false); setResult(r); load(); }} />
    </>
  );
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex gap-2">
      <input readOnly className="input font-mono text-[12.5px]" value={value} onFocus={(e) => e.target.select()} />
      <button className="btn-line shrink-0" onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}><Icon name="copy" />{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

function InviteModal({ open, onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('/api/team', { method: 'POST', body: { email, role } }); setEmail(''); onDone(r); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title="Invite a team member">
      <form onSubmit={submit}>
        <p className="text-[13.5px] text-muted">They get an email with a link to create their password.</p>
        <label className="label mt-4">Email</label>
        <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoFocus />
        <label className="label mt-4">Role</label>
        <div className="grid grid-cols-2 gap-2">
          {[['member', 'Member', 'Reviews posts and drafts'], ['admin', 'Admin', 'Also manages team, knowledge and settings']].map(([k, l, d]) => (
            <button type="button" key={k} onClick={() => setRole(k)} className={`text-left rounded-xl border-[1.5px] p-3 ${role === k ? 'border-ink bg-hatch1' : 'border-line bg-card'}`}>
              <div className="text-[14px] font-bold">{l}</div><div className="text-[12px] text-muted mt-0.5">{d}</div>
            </button>
          ))}
        </div>
        <ErrorLine error={err} />
        <div className="mt-5 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-ink" disabled={busy}>{busy ? <Spinner /> : 'Send invite'}</button></div>
      </form>
    </Modal>
  );
}
