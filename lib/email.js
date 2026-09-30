// Transactional email via Resend's REST API (no SDK). Sender = RESEND_FROM
// (default "Casa Libre <noreply@casa-libre.com>"). Returns { ok } or { error } —
// callers always also show the invite link in the UI, so a failed email never
// blocks inviting someone.
import 'server-only';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function sendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { error: 'email_not_configured' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.RESEND_FROM || 'Casa Libre <noreply@casa-libre.com>', to: [to], subject, html, text }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { error: j.message || `resend_${res.status}` };
    return { ok: true, id: j.id };
  } catch (e) {
    return { error: `network: ${e.message}` };
  }
}

export function inviteEmail({ inviterName, role, link }) {
  const who = inviterName ? esc(inviterName) : 'The Casa Libre team';
  const subject = 'You’re invited to the Casa Libre Reddit Agent';
  const text = `${inviterName || 'The Casa Libre team'} invited you to join the Casa Libre Reddit Agent as ${role}.\n\nCreate your password here (link valid for 7 days):\n${link}\n\nIf you weren't expecting this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#F9F4EE;font-family:Helvetica,Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1.5px solid #111;border-radius:18px;padding:32px">
      <tr><td style="font-size:22px;font-weight:700;letter-spacing:-0.02em">casa-libre</td></tr>
      <tr><td style="padding-top:20px;font-size:18px;font-weight:700">You’re invited to the Reddit Agent</td></tr>
      <tr><td style="padding-top:10px;font-size:15px;line-height:1.5;color:#444">${who} invited you to join the Casa Libre Reddit Agent as <b>${esc(role)}</b>. Create your password to get started.</td></tr>
      <tr><td style="padding-top:24px"><a href="${esc(link)}" style="display:inline-block;background:#111;color:#F9F4EE;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">Create my password</a></td></tr>
      <tr><td style="padding-top:22px;font-size:12px;color:#888;line-height:1.5">This link is valid for 7 days. If the button doesn’t work, paste this into your browser:<br>${esc(link)}</td></tr>
    </table></td></tr></table></body></html>`;
  return { subject, html, text };
}
