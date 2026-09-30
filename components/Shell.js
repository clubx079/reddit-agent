'use client';
import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Brand from './Brand';
import { Icon } from './ui';
import { api } from '@/lib/client';

const UserCtx = createContext(null);
export const useUser = () => useContext(UserCtx);

const NAV = [
  { href: '/', label: 'Inbox', icon: 'inbox', match: (p) => p === '/' || p.startsWith('/posts') },
  { href: '/knowledge', label: 'Knowledge base', icon: 'book' },
  { href: '/team', label: 'Team', icon: 'users' },
  { href: '/activity', label: 'Activity', icon: 'pulse' },
  { href: '/settings', label: 'Settings', icon: 'gear' },
];

export default function Shell({ user, children }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }).catch(() => {}); window.location.href = '/login'; };
  const initial = (user.full_name || user.email).trim().charAt(0).toUpperCase();

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.match ? n.match(path) : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${active ? 'bg-ink text-paper' : 'text-ink/75 hover:bg-hatch1 hover:text-ink'}`}>
            <Icon name={n.icon} size={17} />{n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <UserCtx.Provider value={user}>
      <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
        {/* sidebar (desktop) */}
        <aside className="hidden lg:flex flex-col border-r border-line bg-paper px-4 py-6 sticky top-0 h-screen">
          <div className="px-2"><Brand /></div>
          <div className="mt-8">{nav}</div>
          <div className="mt-auto">
            <div className="rounded-xl border border-line bg-card p-3 text-[12.5px] text-muted leading-snug">
              Read + draft only. The agent never posts; a person copies the reply to Reddit.
            </div>
            <Link href="/account" className="mt-3 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-hatch1">
              <span className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-bold">{initial}</span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium truncate">{user.full_name || user.email}</span>
                <span className="block text-[11.5px] text-muted font-mono uppercase tracking-wide">{user.role}</span>
              </span>
            </Link>
            <button onClick={logout} className="btn-ghost w-full justify-start mt-1"><Icon name="logout" />Sign out</button>
          </div>
        </aside>

        {/* top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 backdrop-blur px-4 py-3">
          <Brand />
          <button onClick={() => setOpen((v) => !v)} className="btn-line !px-3" aria-label="Menu">Menu</button>
        </header>
        {open && (
          <div className="lg:hidden border-b border-line bg-paper px-4 py-3">
            {nav}
            <div className="mt-2 flex gap-2"><Link href="/account" onClick={() => setOpen(false)} className="btn-line">Account</Link><button onClick={logout} className="btn-ghost">Sign out</button></div>
          </div>
        )}

        <main className="min-w-0 px-4 sm:px-8 py-6 sm:py-8 max-w-[1280px]">{children}</main>
      </div>
    </UserCtx.Provider>
  );
}

export function PageHeader({ eyebrow, title, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="text-[30px] sm:text-[34px] font-bold tracking-[-0.03em] leading-tight mt-1">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
