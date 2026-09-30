import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectKnowledge, buildPrompt, allowMention, mentionsCasaLibre, checkDraft } from '../lib/knowledge.js';

test('rule checker catches competitors, sites, banned phrases and forbidden mentions', () => {
  assert.deepEqual(checkDraft('Compare several listings in the same barrio and check who pays expensas.'), []);
  assert.match(checkDraft('Try InfoCasas or MercadoLibre.').join(' '), /another property site/);
  assert.match(checkDraft('Look on olx for rentals').join(' '), /another property site/);
  assert.match(checkDraft('see example-portal.com.py for more').join(' '), /names a website/);
  assert.match(checkDraft('Casa Libre has listings', { mention: false }).join(' '), /not allowed/);
  assert.deepEqual(checkDraft('Browse [casa-libre.com.py](https://casa-libre.com.py/r/rda) for rentals.', { mention: true }), []);
  assert.match(checkDraft('Try CasaLibre.com', { mention: true }).join(' '), /wrong Casa Libre domain/);
  assert.match(checkDraft('It is sin intermediarios').join(' '), /banned phrase/);
  assert.match(checkDraft('Join Facebook groups like "Expats in Asunción".').join(' '), /Facebook groups/);
});

const KB = [
  { id: 'r1', kind: 'rule', title: 'Answer first', content: 'Answer the question.', priority: 100, active: true },
  { id: 'r2', kind: 'rule', title: 'Old rule', content: 'x', priority: 90, active: false },
  { id: 'b1', kind: 'banned', title: 'Never', content: 'No "sin intermediarios".', priority: 99, active: true },
  { id: 'f1', kind: 'faq', title: 'Renting', content: 'Rent facts', intent: 'renting', priority: 70, active: true },
  { id: 'f2', kind: 'faq', title: 'Buying', content: 'Buy facts', intent: 'buying', priority: 70, active: true },
  { id: 'm1', kind: 'mention', title: 'Mention rent EN', content: 'casa-libre link', intent: 'renting', language: 'en', priority: 60, active: true },
  { id: 'm2', kind: 'mention', title: 'Mención ES', content: 'enlace', intent: 'renting', language: 'es', priority: 60, active: true },
];

test('selects rules + matching faq, skips inactive, other intents and mentions when not allowed', () => {
  const ids = selectKnowledge(KB, { intent: 'renting', language: 'en', mention: false }).map((e) => e.id);
  assert.deepEqual(ids, ['r1', 'b1', 'f1']);
});

test('includes the language-matched mention only when a mention is allowed', () => {
  assert.deepEqual(selectKnowledge(KB, { intent: 'renting', language: 'en', mention: true }).map((e) => e.id), ['r1', 'b1', 'f1', 'm1']);
  assert.deepEqual(selectKnowledge(KB, { intent: 'renting', language: 'es', mention: true }).map((e) => e.id), ['r1', 'b1', 'f1', 'm2']);
});

test('prompt carries the rules, the post and the mention instruction', () => {
  const post = { subreddit: 'Paraguay', title: 'Where to rent?', body: 'Need a flat', intent: 'renting', language: 'es' };
  const no = buildPrompt(post, selectKnowledge(KB, { intent: 'renting', language: 'es' }), { mention: false });
  assert.match(no.system, /Do NOT mention Casa Libre/);
  assert.match(no.system, /Write the reply in Spanish/);
  assert.match(no.system, /HARD RULES[\s\S]*Answer first/);
  assert.match(no.system, /NEVER DO[\s\S]*sin intermediarios/);
  assert.match(no.user, /r\/Paraguay[\s\S]*Where to rent\?[\s\S]*Need a flat/);
  const yes = buildPrompt(post, selectKnowledge(KB, { intent: 'renting', language: 'es', mention: true }), { mention: true, trackedUrl: 'https://casa-libre.com.py/r/rda' });
  assert.match(yes.system, /Casa Libre mention IS allowed[\s\S]*r\/rda/);
});

test('mention ratio + intent + subreddit gates', () => {
  assert.equal(allowMention({ intent: 'renting', subreddit: 'Paraguay', recentDrafts: 10, recentMentions: 0, targetRatio: 0.12 }), true);
  assert.equal(allowMention({ intent: 'renting', subreddit: 'Paraguay', recentDrafts: 10, recentMentions: 2, targetRatio: 0.12 }), false);
  assert.equal(allowMention({ intent: 'moving', subreddit: 'Paraguay', recentDrafts: 0, recentMentions: 0 }), false);
  assert.equal(allowMention({ intent: 'buying', subreddit: 'expats', recentDrafts: 0, recentMentions: 0 }), false);
});

test('mention detection', () => {
  assert.equal(mentionsCasaLibre('see [casa-libre.com.py](https://casa-libre.com.py/r/rda)'), true);
  assert.equal(mentionsCasaLibre('Casa Libre has listings'), true);
  assert.equal(mentionsCasaLibre('check several portals'), false);
});
