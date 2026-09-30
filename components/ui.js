'use client';
// Small shared UI pieces (Casa Libre ink/paper style). No emojis — icons are inline SVG.
import { useEffect } from 'react';

export const INTENT = {
  buying: { label: 'Buying', cls: 'bg-[#E8F0E9] text-good' },
  renting: { label: 'Renting', cls: 'bg-[#E9EEF6] text-[#2F5A8A]' },
  selling: { label: 'Selling', cls: 'bg-[#F6ECE6] text-terracotta' },
  moving: { label: 'Moving', cls: 'bg-[#F4EFE2] text-warn' },
  market: { label: 'Market', cls: 'bg-hatch1 text-ink' },
  general: { label: 'General', cls: 'bg-hatch1 text-muted' },
};
export const STATUS = {
  new: { label: 'New', cls: 'bg-ink text-paper' },
  drafted: { label: 'Drafted', cls: 'bg-[#E9EEF6] text-[#2F5A8A]' },
  approved: { label: 'Approved', cls: 'bg-[#E8F0E9] text-good' },
  posted: { label: 'Posted', cls: 'bg-good text-paper' },
  dismissed: { label: 'Dismissed', cls: 'bg-hatch1 text-muted' },
};

export function Pill({ kind, value }) {
  const map = kind === 'intent' ? INTENT : STATUS;
  const v = map[value] || { label: value, cls: 'bg-hatch1 text-muted' };
  return <span className={`pill ${v.cls}`}>{v.label}</span>;
}

export function Relevance({ value }) {
  const n = Number(value) || 0;
  const tone = n >= 75 ? 'bg-good' : n >= 45 ? 'bg-warn' : 'bg-muted/50';
  return (
    <span className="inline-flex items-center gap-2" title={`Relevance ${n}/100`}>
      <span className="w-14 h-1.5 rounded-full bg-hatch1 overflow-hidden"><span className={`block h-full ${tone}`} style={{ width: `${n}%` }} /></span>
      <span className="font-mono text-[11.5px] text-muted tabular-nums">{n}</span>
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] bg-ink/40" onMouseDown={onClose}>
      <div className={`card-ink w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6 max-h-[84vh] overflow-y-auto`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-[20px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-1" aria-label="Close"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-[16px] font-bold">{title}</div>
      {children && <div className="mt-1.5 text-[14px] text-muted max-w-md mx-auto">{children}</div>}
    </div>
  );
}

export function ErrorLine({ error }) {
  if (!error) return null;
  return <div className="mt-3 rounded-xl border border-terracotta/40 bg-[#FBEFEA] px-3.5 py-2.5 text-[13px] text-terracotta">{error}</div>;
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin ${className}`} aria-hidden="true" />;
}

const PATHS = {
  inbox: 'M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  x: 'M18 6 6 18M6 6l12 12',
  ext: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  radar: 'M12 12 19 5M21 12a9 9 0 1 1-9-9M16.5 12A4.5 4.5 0 1 1 12 7.5',
  mail: 'M4 4h16v16H4zM4 6l8 7 8-7',
  check: 'M5 12.5 9.5 17 19 7.5',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  back: 'M15 18l-6-6 6-6',
};
export function Icon({ name, size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] || ''} />
    </svg>
  );
}
