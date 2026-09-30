// PostgREST client for the Reddit Agent's own AiroBase project, using the SECRET
// key (server-side only — never import this into a client component). Same shape
// as the Casa Libre portals' lib/db so the patterns carry over.
import 'server-only';

const URL = process.env.AIROBASE_URL;            // …/rest/v1
const KEY = process.env.AIROBASE_SECRET_KEY;

function headers(extra = {}) {
  return { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...extra };
}

async function handle(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const e = new Error(data?.message || `PostgREST ${res.status}`);
    e.status = res.status; e.code = data?.code; e.details = data?.details;
    throw e;
  }
  return data;
}

export async function select(table, query = '') {
  const res = await fetch(`${URL}/${table}${query ? `?${query}` : ''}`, { headers: headers(), cache: 'no-store' });
  return handle(res);
}

// Rows + exact total (for pagination / counters).
export async function selectWithCount(table, query = '') {
  const res = await fetch(`${URL}/${table}${query ? `?${query}` : ''}`, { headers: headers({ Prefer: 'count=exact' }), cache: 'no-store' });
  const rows = await handle(res);
  const cr = res.headers.get('content-range') || '';
  const count = cr.includes('/') ? Number(cr.split('/')[1]) : rows?.length || 0;
  return { rows: rows || [], count };
}

export async function insert(table, rows, { upsert = false, ignoreDuplicates = false, onConflict = null } = {}) {
  const prefer = ['return=representation'];
  if (upsert) prefer.unshift('resolution=merge-duplicates');
  else if (ignoreDuplicates) prefer.unshift('resolution=ignore-duplicates');
  const qs = onConflict ? `?on_conflict=${onConflict}` : '';
  const res = await fetch(`${URL}/${table}${qs}`, { method: 'POST', headers: headers({ Prefer: prefer.join(',') }), body: JSON.stringify(rows) });
  return handle(res);
}

export async function update(table, filter, patch) {
  const res = await fetch(`${URL}/${table}?${filter}`, { method: 'PATCH', headers: headers({ Prefer: 'return=representation' }), body: JSON.stringify(patch) });
  return handle(res);
}

export async function remove(table, filter) {
  const res = await fetch(`${URL}/${table}?${filter}`, { method: 'DELETE', headers: headers({ Prefer: 'return=minimal' }) });
  return handle(res);
}

export const q = (v) => encodeURIComponent(String(v));
