'use client';
// Small fetch helper for client components: JSON in/out, throws a readable Error.
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/api/auth')) window.location.href = '/login';
  if (!res.ok) {
    const e = new Error(ERRORS[data.error] || data.hint || data.error || `Request failed (${res.status})`);
    e.code = data.error; e.data = data;
    throw e;
  }
  return data;
}

// Human-readable messages for API error codes.
export const ERRORS = {
  invalid_credentials: 'Wrong email or password.',
  invalid_email: 'Enter a valid email address.',
  already_member: 'That person is already on the team.',
  invite_invalid_or_expired: 'This invite link is no longer valid. Ask an admin for a new one.',
  password_too_short: 'Use at least 8 characters.',
  wrong_current_password: 'Your current password is wrong.',
  cannot_change_yourself: 'You can’t change your own role or status.',
  last_admin: 'The team needs at least one active admin.',
  forbidden: 'Only admins can do that.',
  need_reddit_post_link: 'Paste the link to a Reddit post (…/r/<sub>/comments/<id>/…).',
  title_required: 'Add the post title.',
  no_reddit_links_found: 'No Reddit links found in that text.',
  reddit_api_not_configured: 'Reddit API keys aren’t set up yet.',
  llm_failed: 'The AI couldn’t write a draft right now. Try again.',
  not_a_reddit_link: 'That isn’t a Reddit link.',
  empty_draft: 'The draft is empty.',
};

export function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
