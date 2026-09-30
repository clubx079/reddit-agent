// GET → settings + which integrations are configured · PUT { key, value } (admins)
import { requireUser } from '@/lib/auth';
import { getSettings, saveSetting } from '@/lib/settings';
import { availableProviders } from '@/lib/llm';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireUser();
  if (error) return error;
  return Response.json({
    settings: await getSettings(),
    integrations: {
      llmProviders: availableProviders(),
      redditApi: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
      email: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.RESEND_FROM || 'Casa Libre <noreply@casa-libre.com>',
    },
  });
}

export async function PUT(req) {
  const { user, error } = await requireUser({ admin: true });
  if (error) return error;
  const { key, value } = await req.json().catch(() => ({}));
  const r = await saveSetting(key, value, user.id);
  if (r.error) return Response.json(r, { status: 400 });
  await logActivity(user.id, 'settings.updated', { entity: 'settings', meta: { key } });
  return Response.json(r);
}
