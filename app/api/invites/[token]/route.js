// GET  → { email, role } if the invite link is valid
// POST { fullName, password } → accept: creates the account and signs in.
import { findInvite, acceptInvite } from '@/lib/invites';
import { setSessionCookie } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const inv = await findInvite(params.token).catch(() => null);
  if (!inv) return Response.json({ error: 'invite_invalid_or_expired' }, { status: 404 });
  return Response.json({ email: inv.email, role: inv.role });
}

export async function POST(req, { params }) {
  const b = await req.json().catch(() => ({}));
  const r = await acceptInvite(params.token, b);
  if (r.error) return Response.json(r, { status: 400 });
  setSessionCookie(r.user);
  await logActivity(r.user.id, 'invite.accepted', { entity: 'user', entityId: r.user.id });
  return Response.json({ user: r.user });
}
