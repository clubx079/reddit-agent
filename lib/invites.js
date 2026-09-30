// Team invitations. The emailed token is random; only its sha256 is stored, so a
// database leak can't be turned into working invite links.
import 'server-only';
import crypto from 'crypto';
import * as db from './db';
import { hashPassword, PASSWORD_MIN } from './auth';
import { sendEmail, inviteEmail } from './email';

const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const appUrl = () => (process.env.APP_URL || 'http://localhost:3030').replace(/\/$/, '');

// Admin invites someone. Returns { invite, link, email: {ok|error} } or { error }.
export async function createInvite({ email, role = 'member', inviter }) {
  const e = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { error: 'invalid_email' };
  if (!['admin', 'member'].includes(role)) return { error: 'invalid_role' };
  const existing = await db.select('ra_users', `select=id,status&email=eq.${db.q(e)}&limit=1`);
  if (existing?.[0]?.status === 'active') return { error: 'already_member' };
  // Revoke older pending invites for the same address so only the newest link works.
  await db.update('ra_invites', `email=eq.${db.q(e)}&accepted_at=is.null&revoked_at=is.null`, { revoked_at: new Date().toISOString() });
  const token = crypto.randomBytes(24).toString('base64url');
  const [invite] = await db.insert('ra_invites', [{ email: e, role, token_hash: sha(token), invited_by: inviter?.id || null }]);
  const link = `${appUrl()}/invite/${token}`;
  const mail = await sendEmail({ to: e, ...inviteEmail({ inviterName: inviter?.full_name || inviter?.email, role, link }) });
  return { invite, link, email: mail };
}

// Look up a pending, unexpired invite by its raw token.
export async function findInvite(token) {
  if (!token || String(token).length < 20) return null;
  const rows = await db.select('ra_invites', `select=id,email,role,expires_at,accepted_at,revoked_at&token_hash=eq.${sha(token)}&limit=1`);
  const inv = rows?.[0];
  if (!inv || inv.accepted_at || inv.revoked_at || new Date(inv.expires_at) < new Date()) return null;
  return inv;
}

// The invitee sets their name + password → active member. Returns { user } or { error }.
export async function acceptInvite(token, { fullName, password }) {
  const inv = await findInvite(token);
  if (!inv) return { error: 'invite_invalid_or_expired' };
  if (!password || String(password).length < PASSWORD_MIN) return { error: 'password_too_short' };
  const name = String(fullName || '').trim().slice(0, 80) || null;
  const password_hash = await hashPassword(password);
  const existing = await db.select('ra_users', `select=id&email=eq.${db.q(inv.email)}&limit=1`);
  let user;
  if (existing?.[0]) {
    [user] = await db.update('ra_users', `id=eq.${existing[0].id}`, { full_name: name, password_hash, role: inv.role, status: 'active' });
  } else {
    [user] = await db.insert('ra_users', [{ email: inv.email, full_name: name, password_hash, role: inv.role, status: 'active' }]);
  }
  await db.update('ra_invites', `id=eq.${inv.id}`, { accepted_at: new Date().toISOString() });
  delete user.password_hash;
  return { user };
}
