// Knowledge base → LLM prompt. Pure functions (no DB) so they're unit-testable;
// the draft route loads active rows and passes them in.
//
// Selection: every active rule / tone / banned / fact entry, plus the faq + mention
// entries that match the post's intent (or are general), language-matched when the
// entry has a language. Ordered by priority (highest first).

export const KINDS = ['rule', 'fact', 'faq', 'tone', 'mention', 'banned'];
export const INTENTS = ['buying', 'renting', 'selling', 'moving', 'market', 'general'];

export function selectKnowledge(entries, { intent = 'general', language = 'en', mention = false } = {}) {
  return (entries || [])
    .filter((e) => e.active !== false)
    .filter((e) => (e.kind === 'mention' ? mention : true))
    .filter((e) => (e.kind === 'faq' || e.kind === 'mention') ? (!e.intent || e.intent === intent || e.intent === 'general') : true)
    .filter((e) => !e.language || e.language === language)
    .sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));
}

const SECTION = { rule: 'HARD RULES (always follow)', banned: 'NEVER DO / NEVER SAY', tone: 'TONE', fact: 'FACTS YOU MAY USE', faq: 'TOPIC KNOWLEDGE', mention: 'IF (AND ONLY IF) YOU MENTION CASA LIBRE' };
const ORDER = ['rule', 'banned', 'tone', 'fact', 'faq', 'mention'];

export function buildPrompt(post, entries, { mention = false, trackedUrl } = {}) {
  const lang = post.language === 'es' ? 'es' : 'en';
  const sections = ORDER.map((kind) => {
    const items = entries.filter((e) => e.kind === kind);
    if (!items.length) return '';
    return `## ${SECTION[kind]}\n${items.map((e) => `- ${e.title}: ${e.content}`).join('\n')}`;
  }).filter(Boolean).join('\n\n');

  const system = [
    'You draft replies to Reddit posts about real estate in South America, for a human to review and post.',
    'Follow the knowledge base below exactly. If the knowledge base does not cover something, say less rather than invent.',
    mention
      ? `A short Casa Libre mention IS allowed in this reply if it genuinely helps the person — at most one sentence, at the end, as a markdown link${trackedUrl ? ` using ${trackedUrl}` : ''}.`
      : 'Do NOT mention Casa Libre or any company, website or app in this reply.',
    `Write the reply in ${lang === 'es' ? 'Spanish' : 'English'}.`,
    'Return ONLY the reply text, ready to paste into Reddit (markdown allowed). No preamble, no quotes, no sign-off.',
    '',
    sections,
  ].join('\n');

  const user = [
    `Subreddit: r/${post.subreddit}`,
    `Title: ${post.title}`,
    post.body ? `Post:\n${String(post.body).slice(0, 2500)}` : '(no body text)',
    `Detected intent: ${post.intent || 'general'}`,
    '',
    'Write the reply now.',
  ].join('\n');

  return { system, user };
}

// Heuristic: does a finished draft mention Casa Libre?
export const mentionsCasaLibre = (text) => /casa[\s-]?libre/i.test(String(text || ''));

// Should this draft be allowed to mention Casa Libre? Keeps the long-run ratio near
// the target (e.g. 0.12 ≈ 1 in 8) and only for intents where listings help.
export function allowMention({ intent, subreddit, recentDrafts = 0, recentMentions = 0, targetRatio = 0.12 }) {
  if (!['buying', 'renting', 'selling'].includes(intent)) return false;
  if (['expats', 'iwantout', 'digitalnomad'].includes(String(subreddit || '').toLowerCase())) return false;
  const ratio = recentDrafts ? recentMentions / recentDrafts : 0;
  return ratio < targetRatio;
}
