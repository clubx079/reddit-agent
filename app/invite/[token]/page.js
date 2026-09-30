'use client';
import { useEffect, useState } from 'react';
import Brand from '@/components/Brand';
import { api } from '@/lib/client';
import { ErrorLine, Spinner } from '@/components/ui';

export default function AcceptInvite({ params }) {
  const [invite, setInvite] = useState(null);
  const [state, setState] = useState('loading');   // loading | ready | invalid
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/api/invites/${params.token}`).then((j) => { setInvite(j); setState('ready'); }).catch(() => setState('invalid'));
  }, [params.token]);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw.length < 8) return setErr('Use at least 8 characters.');
    if (pw !== pw2) return setErr('The passwords don’t match.');
    setBusy(true);
    try {
      await api(`/api/invites/${params.token}`, { method: 'POST', body: { fullName: name, password: pw } });
      window.location.href = '/';
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card-ink w-full max-w-[420px] p-8">
        <Brand size="lg" />
        {state === 'loading' && <div className="mt-8 text-muted flex items-center gap-2"><Spinner /> Checking your invite…</div>}
        {state === 'invalid' && (
          <>
            <h1 className="mt-8 text-[22px] font-bold tracking-tight">This invite isn’t valid</h1>
            <p className="text-[14px] text-muted mt-2">It may have expired (links last 7 days), been replaced by a newer invite, or already been used. Ask an admin to send a new one.</p>
            <a href="/login" className="btn-line mt-6">Go to sign in</a>
          </>
        )}
        {state === 'ready' && (
          <form onSubmit={submit}>
            <h1 className="mt-8 text-[22px] font-bold tracking-tight">Join the team</h1>
            <p className="text-[14px] text-muted mt-1">You were invited as <b className="text-ink">{invite.role}</b> with <b className="text-ink">{invite.email}</b>. Create your password to get started.</p>
            <label className="label mt-6" htmlFor="name">Your name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ana Giménez" />
            <label className="label mt-4" htmlFor="pw">Password</label>
            <input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" required />
            <label className="label mt-4" htmlFor="pw2">Repeat password</label>
            <input id="pw2" type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
            <ErrorLine error={err} />
            <button className="btn-ink w-full mt-6 !py-3" disabled={busy}>{busy ? <Spinner /> : 'Create account'}</button>
          </form>
        )}
      </div>
    </main>
  );
}
