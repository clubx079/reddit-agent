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
    'Follow the knowledge base below exactly. Use ONLY facts stated in it. If it does not cover something, give general guidance or say less — never invent.',
    'NEVER name any website, portal, marketplace, app, company, agency, newspaper, university or Facebook group (no InfoCasas, MercadoLibre, OLX, Clasipar, Airbnb, etc.). Refer to them generically: "local property portals", "real estate agencies", "Facebook groups".',
    'Only name neighbourhoods and cities that appear in the knowledge base. Do not state prices, fees or timelines that are not in it.',
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

// Other property sites / marketplaces / classifieds the AI must never name.
const OTHER_SITES = /\b(info\s?casas|mercado\s?libre|olx|clasipar|abc\s?color|zonaprop|properati|idealista|remax|re\/max|century\s?21|zillow|airbnb|booking\.com|encuentra24|trovit|lamudi|inmuebles24|hola\s?casa)\b/i;
const OTHER_DOMAINS = /\b(?![\w.-]*casa-libre\.)[a-z0-9-]+\.(com|com\.py|com\.bo|com\.uy|com\.ve|net|org|py|bo|uy|ve)\b/i;
const BANNED = /(sin intermediarios|no middlem[ae]n|\bthe largest\b|\bthe best\b|#1\b|\bguaranteed?\b|\bcheapest\b|\bDM me\b|check my profile|we at casa libre|I work (at|for))/i;
const QUOTED_GROUP = /(facebook|fb) groups? (like|such as|called|e\.g\.)|[“"][^”"]{3,40}[”"] (group|grupo)/i;

// Rule check on a finished draft → list of problems (empty = OK).
export function checkDraft(text, { mention = false } = {}) {
  const t = String(text || '');
  const problems = [];
  if (!mention && mentionsCasaLibre(t)) problems.push('mentions Casa Libre although a mention is not allowed in this reply');
  if (mention && /casalibre\.com|casa-libre\.com(?!\.)/i.test(t)) problems.push('uses the wrong Casa Libre domain — use the country site link given, e.g. [casa-libre.com.py](https://casa-libre.com.py/r/rda)');
  const site = t.match(OTHER_SITES); if (site) problems.push(`names another property site or company ("${site[0]}")`);
  const dom = t.replace(/\]\([^)]*\)/g, ']').replace(/(uy\.)?casa-?libre\.[a-z.]+/gi, '').match(OTHER_DOMAINS);
  if (dom) problems.push(`names a website ("${dom[0]}")`);
  const ban = t.match(BANNED); if (ban) problems.push(`uses a banned phrase ("${ban[0]}")`);
  if (QUOTED_GROUP.test(t)) problems.push('names specific Facebook groups');
  return problems;
}

// Should this draft be allowed to mention Casa Libre? Keeps the long-run ratio near
// the target (e.g. 0.12 ≈ 1 in 8) and only for intents where listings help.
export function allowMention({ intent, subreddit, recentDrafts = 0, recentMentions = 0, targetRatio = 0.12 }) {
  if (!['buying', 'renting', 'selling'].includes(intent)) return false;
  if (['expats', 'iwantout', 'digitalnomad'].includes(String(subreddit || '').toLowerCase())) return false;
  const ratio = recentDrafts ? recentMentions / recentDrafts : 0;
  return ratio < targetRatio;
}
