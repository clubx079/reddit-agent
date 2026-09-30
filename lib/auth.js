// Team auth: email + bcrypt password, stateless HMAC-signed session cookie
// (ra_session, 7 days). Every request re-reads the user row, so disabling a member
// or changing their role takes effect immediately.
import 'server-only';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import * as db from './db';

export const COOKIE = 'ra_session';
const MAX_AGE = 60 * 60 * 24 * 7;

const secret = () => process.env.SESSION_SECRET || 'insecure-dev-secret';
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url');

export function makeToken(user) {
  const p = b64(JSON.stringify({ uid: user.id, exp: Date.now() + MAX_AGE * 1000 }));
  return `${p}.${sign(p)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [p, sig] = token.split('.');
  const expected = sign(p);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

export function setSessionCookie(user) {
  cookies().set(COOKIE, makeToken(user), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_AGE,
  });
}
export function clearSessionCookie() {
  cookies().set(COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 });
}

const PUBLIC_FIELDS = 'id,email,full_name,role,status,created_at,last_login_at';

// The signed-in, ACTIVE user — or null.
export async function currentUser() {
  const s = verifyToken(cookies().get(COOKIE)?.value);
  if (!s) return null;
  const rows = await db.select('ra_users', `select=${PUBLIC_FIELDS}&id=eq.${db.q(s.uid)}&limit=1`);
  const u = rows?.[0];
  return u && u.status === 'active' ? u : null;
}

// For API routes: returns { user } or { error: Response }.
export async function requireUser({ admin = false } = {}) {
  const user = await currentUser();
  if (!user) return { error: Response.json({ error: 'unauthorized' }, { status: 401 }) };
  if (admin && user.role !== 'admin') return { error: Response.json({ error: 'forbidden' }, { status: 403 }) };
  return { user };
}

export async function verifyLogin(email, password) {
  const e = String(email || '').trim().toLowerCase();
  if (!e || !password) return null;
  const rows = await db.select('ra_users', `select=${PUBLIC_FIELDS},password_hash&email=eq.${db.q(e)}&limit=1`);
  const u = rows?.[0];
  if (!u || u.status !== 'active' || !u.password_hash) return null;
  if (!(await bcrypt.compare(String(password), u.password_hash))) return null;
  delete u.password_hash;
  return u;
}

export const hashPassword = (pw) => bcrypt.hash(String(pw), 10);
export const PASSWORD_MIN = 8;
