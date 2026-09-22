// AI drafting. Writes a genuine, helpful Reddit reply grounded in the Casa Libre
// FAQ. Uses Claude when ANTHROPIC_API_KEY is set; otherwise a strong FAQ-template
// drafter so the app is fully functional with no key.
//
// The Casa Libre mention is ALWAYS a separate, clearly-flagged addition — never
// baked silently into the helpful body — so the human stays in control of the
// ~9:1 rule from the strategy brief.
import { FAQ, mentionLine } from './faq';
import { CASA_LIBRE } from './config';

const MODEL = process.env.DRAFT_MODEL || 'claude-sonnet-5';

function faqFor(intent) {
  return FAQ[intent] || FAQ.general;
}

// Deterministic, genuinely useful reply built from the FAQ. Used as the no-key
// path AND as the fallback if the API call fails.

// A short, human opener per intent so the reply reads like a real person on
// Reddit rather than a canned FAQ dump. No false personal claims (we never say
// "I'm an agent" / "I bought here") — just a natural, helpful lead-in.
const OPENERS = {
  buying: 'Good news first: as a foreigner you can buy here with basically the same rights as a local. The bits that actually trip people up:',
  renting: 'A few things worth knowing before you sign anything in Asunción:',
  selling: "Selling here isn’t complicated, there are just a few boxes to tick first:",
  moving: "Solid choice — Paraguay’s one of the easier places to land. Housing-wise, here’s the lay of the land:",
  market: 'On prices, the honest short version:',
  general: 'Happy to help with the Paraguay side — quick rundown:',
};

export function templateDraft(post, intent, { mention }) {
  const f = faqFor(intent);
  const lines = [];
  lines.push(OPENERS[intent] || OPENERS.general);
  lines.push('');
  lines.push(f.answer);
  if (f.tips && f.tips.length) {
    lines.push('');
    for (const t of f.tips.slice(0, 3)) lines.push(`- ${t}`);
  }
  if (mention) {
    lines.push('');
    lines.push(mentionLine(intent));
  }
  return lines.join('\n');
}

async function claudeDraft(post, intent, { mention }) {
  const key = process.env.ANTHROPIC_API_KEY;
  const f = faqFor(intent);
  const system = [
    'You are drafting a reply for a Reddit thread on behalf of someone who genuinely knows the Paraguay real-estate market.',
    'Rules:',
    '- Be genuinely helpful and specific. Answer the actual question first.',
    '- Sound like a real, knowledgeable person on Reddit — plain, warm, no marketing tone, no hype, no emojis, no hashtags.',
    '- Ground your facts in the provided knowledge. Do not invent laws, prices or statistics.',
    '- Keep it concise: 2-4 short paragraphs or a few bullet points.',
    mention
      ? `- You MAY include ONE brief, non-salesy mention of ${CASA_LIBRE.name} (${CASA_LIBRE.trackedUrl}) as a useful resource, only if it fits naturally. Put it in its own final sentence.`
      + `
- If you mention it, write it as a markdown link exactly like [casa-libre.com.py](${CASA_LIBRE.trackedUrl}) — the visible text stays the plain domain, the href keeps the /r/ path. Never link the bare domain.`
      : `- Do NOT mention ${CASA_LIBRE.name} or any specific company or website. Purely helpful advice.`,
    '- Do not claim to be an official, an agent, or a lawyer. No legal/financial guarantees.',
    'Return ONLY the reply text, ready to paste. No preamble.',
  ].join('\n');

  const knowledge = [
    `Topic: ${f.title}`,
    `Core facts: ${f.answer}`,
    `Useful specifics: ${(f.tips || []).join(' | ')}`,
  ].join('\n');

  const user = [
    `Subreddit: r/${post.subreddit}`,
    `Post title: ${post.title}`,
    post.selftext ? `Post body: ${post.selftext.slice(0, 1500)}` : '(no body text)',
    '',
    'Knowledge to ground your reply:',
    knowledge,
    '',
    'Write the reply now.',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = (json.content || []).map((b) => b.text || '').join('').trim();
  if (!text) throw new Error('Empty draft from model');
  return text;
}

// Public entry: returns { text, mention, model, generatedAt }.
export async function generateDraft(post, intent, { mention = false } = {}) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  if (hasKey) {
    try {
      const text = await claudeDraft(post, intent, { mention });
      return { text, mention, model: MODEL, generatedAt: new Date().toISOString() };
    } catch (e) {
      // Graceful fallback to the template so the queue never blocks on API issues.
      const text = templateDraft(post, intent, { mention });
      return { text, mention, model: `template (fallback: ${String(e.message || e).slice(0, 80)})`, generatedAt: new Date().toISOString() };
    }
  }
  const text = templateDraft(post, intent, { mention });
  return { text, mention, model: 'template', generatedAt: new Date().toISOString() };
}
