'use client';
import { useState } from 'react';
import { PageHeader, useUser } from '@/components/Shell';
import { api } from '@/lib/client';
import { ErrorLine, Spinner } from '@/components/ui';

export default function Account() {
  const me = useUser();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', repeat: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(false);
    if (f.newPassword !== f.repeat) return setErr('The new passwords don’t match.');
    setBusy(true);
    try { await api('/api/auth/password', { method: 'POST', body: { currentPassword: f.currentPassword, newPassword: f.newPassword } }); setOk(true); setF({ currentPassword: '', newPassword: '', repeat: '' }); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <>
      <PageHeader eyebrow="You" title="Account" />
      <div className="grid gap-6 lg:grid-cols-2 max-w-4xl">
        <section className="card p-5">
          <h2 className="text-[16px] font-bold">Profile</h2>
          <dl className="mt-3 space-y-2 text-[14px]">
            <div className="flex justify-between gap-4"><dt className="text-muted">Name</dt><dd>{me.full_name || '—'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd>{me.email}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted">Role</dt><dd className="capitalize">{me.role}</dd></div>
          </dl>
        </section>
        <form onSubmit={submit} className="card p-5">
          <h2 className="text-[16px] font-bold">Change password</h2>
          <label className="label mt-4">Current password</label>
          <input type="password" className="input" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required />
          <label className="label mt-3">New password</label>
          <input type="password" className="input" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} placeholder="At least 8 characters" required />
          <label className="label mt-3">Repeat new password</label>
          <input type="password" className="input" autoComplete="new-password" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })} required />
          <ErrorLine error={err} />
          {ok && <div className="mt-3 text-[13.5px] text-good">Password changed.</div>}
          <button className="btn-ink mt-4" disabled={busy}>{busy ? <Spinner /> : 'Change password'}</button>
        </form>
      </div>
    </>
  );
}
