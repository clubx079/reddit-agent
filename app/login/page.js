'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Brand from '@/components/Brand';
import { api } from '@/lib/client';
import { ErrorLine, Spinner } from '@/components/ui';

function LoginForm() {
  const next = useSearchParams().get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      window.location.href = next.startsWith('/') ? next : '/';
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="card-ink w-full max-w-[400px] p-8">
      <Brand size="lg" />
      <h1 className="mt-8 text-[22px] font-bold tracking-tight">Sign in</h1>
      <p className="text-[14px] text-muted mt-1">Team access only. Ask an admin for an invite.</p>
      <label className="label mt-6" htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
      <label className="label mt-4" htmlFor="password">Password</label>
      <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <ErrorLine error={err} />
      <button className="btn-ink w-full mt-6 !py-3" disabled={busy}>{busy ? <Spinner /> : 'Sign in'}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={null}><LoginForm /></Suspense>
    </main>
  );
}
