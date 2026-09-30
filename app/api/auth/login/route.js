import { verifyLogin, setSessionCookie } from '@/lib/auth';
import * as db from '@/lib/db';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const user = await verifyLogin(email, password).catch(() => null);
  if (!user) return Response.json({ error: 'invalid_credentials' }, { status: 401 });
  setSessionCookie(user);
  await db.update('ra_users', `id=eq.${user.id}`, { last_login_at: new Date().toISOString() }).catch(() => {});
  await logActivity(user.id, 'login', { entity: 'user', entityId: user.id });
  return Response.json({ user });
}
