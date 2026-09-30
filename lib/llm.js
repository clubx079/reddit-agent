// Chat completion through Groq (OpenAI-compatible API) with OpenAI as a fallback.
// Returns { text, provider, model, usage } or throws. Server-side only.
import 'server-only';

const PROVIDERS = {
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: () => process.env.GROQ_API_KEY, model: () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', key: () => process.env.OPENAI_API_KEY, model: () => process.env.OPENAI_MODEL || 'gpt-4o-mini' },
};

export const availableProviders = () => Object.keys(PROVIDERS).filter((p) => !!PROVIDERS[p].key());

async function call(provider, { system, user, model, temperature = 0.6, maxTokens = 700 }) {
  const p = PROVIDERS[provider];
  const m = model || p.model();
  const res = await fetch(p.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: m,
      temperature,
      max_tokens: maxTokens,
      // gpt-oss / qwen are reasoning models: keep the thinking short so the tokens go to the reply
      ...(/gpt-oss|qwen/i.test(m) ? { reasoning_effort: 'low' } : {}),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${j.error?.message || JSON.stringify(j).slice(0, 200)}`);
  const text = j.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${provider}: empty response`);
  return { text, provider, model: m, usage: j.usage || {} };
}

// Try the preferred provider, then any other configured one.
export async function complete(opts, { prefer = 'groq', model } = {}) {
  const order = [prefer, ...Object.keys(PROVIDERS).filter((p) => p !== prefer)].filter((p) => PROVIDERS[p] && PROVIDERS[p].key());
  let lastErr = new Error('no_llm_configured');
  for (const provider of order) {
    try {
      return await call(provider, { ...opts, model: provider === prefer ? model : undefined });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}
