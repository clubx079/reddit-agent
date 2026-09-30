// Generate a reply draft for one post from the knowledge base.
//   mentionMode: 'auto' (knowledge-base ratio rules decide) | 'yes' | 'no'
// LLM (Groq → OpenAI) first; if none is configured or it fails and the settings
// allow it, a knowledge-base template reply is used so the team is never stuck.
import 'server-only';
import * as db from './db';
import { getSettings } from './settings';
import { complete } from './llm';
import { selectKnowledge, buildPrompt, allowMention, mentionsCasaLibre } from './knowledge';
import { logActivity } from './activity';

const OPENERS = {
  en: {
    buying: 'Good news first: as a foreigner you can buy with basically the same rights as a local. The parts that trip people up:',
    renting: 'A few things worth knowing before you sign anything:',
    selling: 'Selling is very doable; there are just a few boxes to tick first:',
    moving: 'Housing-wise, here is the lay of the land:',
    market: 'On prices, the honest short version:',
    general: 'Quick rundown from the real-estate side:',
  },
  es: {
    buying: 'Primero lo bueno: como extranjero podés comprar con prácticamente los mismos derechos que un local. Lo que hay que cuidar:',
    renting: 'Algunas cosas que conviene saber antes de firmar:',
    selling: 'Vender es bastante simple; solo hay que tener algunas cosas en orden primero:',
    moving: 'En cuanto a vivienda, esto es lo principal:',
    market: 'Sobre precios, la versión corta:',
    general: 'Te cuento lo principal desde el lado inmobiliario:',
  },
};

export function templateReply(post, entries, { mention }) {
  const lang = post.language === 'es' ? 'es' : 'en';
  const faq = entries.find((e) => e.kind === 'faq' && e.intent === post.intent) || entries.find((e) => e.kind === 'faq');
  const lines = [OPENERS[lang][post.intent] || OPENERS[lang].general, '', faq ? faq.content : ''];
  const m = mention && entries.find((e) => e.kind === 'mention' && e.intent === post.intent && (!e.language || e.language === lang));
  if (m) lines.push('', m.content);
  return lines.join('\n').trim();
}

export async function generateDraft(postId, { user, mentionMode = 'auto' } = {}) {
  const [post] = await db.select('ra_posts', `select=*&id=eq.${db.q(postId)}&limit=1`);
  if (!post) return { error: 'post_not_found' };
  const settings = await getSettings();
  const kb = await db.select('ra_knowledge', 'select=id,kind,title,content,intent,language,priority,active&active=eq.true');

  // Mention decision: explicit, or ratio-based over the last 50 drafts.
  let mention = mentionMode === 'yes';
  if (mentionMode === 'auto') {
    const recent = await db.select('ra_drafts', 'select=mention_included&order=created_at.desc&limit=50');
    mention = allowMention({
      intent: post.intent, subreddit: post.subreddit,
      recentDrafts: recent.length, recentMentions: recent.filter((d) => d.mention_included).length,
      targetRatio: settings.mention.targetRatio,
    });
  }

  const entries = selectKnowledge(kb, { intent: post.intent, language: post.language, mention });
  let body, provider, model, usage = {}, llmError = null;

  if (settings.llm.provider !== 'template') {
    try {
      const { system, user: userMsg } = buildPrompt(post, entries, { mention, trackedUrl: settings.mention.trackedUrl });
      const r = await complete(
        { system, user: userMsg, temperature: settings.llm.temperature, maxTokens: settings.llm.maxTokens },
        { prefer: settings.llm.provider, model: settings.llm.model },
      );
      ({ text: body, provider, model, usage } = r);
    } catch (e) {
      llmError = String(e.message || e).slice(0, 300);
    }
  }
  if (!body) {
    if (settings.llm.provider !== 'template' && !settings.llm.fallbackToTemplate) return { error: 'llm_failed', detail: llmError };
    body = templateReply(post, entries, { mention });
    provider = 'template'; model = null;
  }

  const [draft] = await db.insert('ra_drafts', [{
    post_id: post.id, body, provider, model,
    mention_included: mentionsCasaLibre(body),
    knowledge_ids: entries.map((e) => e.id),
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    created_by: user?.id || null,
  }]);
  if (post.status === 'new') await db.update('ra_posts', `id=eq.${post.id}`, { status: 'drafted', updated_at: new Date().toISOString() });
  await logActivity(user?.id, 'draft.generated', { entity: 'post', entityId: post.id, meta: { provider, model, mention: draft.mention_included, llmError } });
  return { draft, llmError };
}
