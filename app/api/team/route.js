// GET  → { users, invites }        (any signed-in member can see the team)
// POST { email, role } → invite    (admins only). Always returns the invite link so
// it can be shared by hand if the email doesn't arrive.
import { requireUser } from '@/lib/auth';
import * as db from '@/lib/db';
import { createInvite } from '@/lib/invites';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  const [users, invites] = await Promise.all([
    db.select('ra_users', 'select=id,email,full_name,role,status,created_at,last_login_at&order=created_at.asc'),
    db.select('ra_invites', `select=id,email,role,expires_at,created_at,invited_by&accepted_at=is.null&revoked_at=is.null&expires_at=gt.${new Date().toISOString()}&order=created_at.desc`),
  ]);
  return Response.json({ users, invites });
}

export async function POST(req) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  const { email, role } = await req.json().catch(() => ({}));
  const r = await createInvite({ email, role, inviter: user });
  if (r.error) return Response.json(r, { status: 400 });
  await logActivity(user.id, 'invite.sent', { entity: 'invite', entityId: r.invite.id, meta: { email: r.invite.email, role: r.invite.role, emailed: !!r.email.ok, emailError: r.email.error || null } });
  return Response.json({ invite: { id: r.invite.id, email: r.invite.email, role: r.invite.role, expires_at: r.invite.expires_at }, link: r.link, emailed: !!r.email.ok, emailError: r.email.error || null });
}
