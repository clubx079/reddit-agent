// Relevance scoring + intent classification.
// A post is kept only if it mentions Paraguay/Asunción AND a real-estate intent.
// This is what turns a noisy keyword search into a clean review queue.

const PLACE_TERMS = [
  'paraguay', 'paraguayan', 'asuncion', 'asunción', 'ciudad del este',
  'encarnacion', 'encarnación', 'san lorenzo', 'luque', 'villa morra',
  'las mercedes', 'carmelitas', 'guarani', 'guaraní', 'py',
];

// Real-estate signal terms grouped by intent.
const INTENT_TERMS = {
  selling: ['sell', 'selling', 'sold', 'list my', 'listing my', 'put my house', 'offload'],
  buying: ['buy', 'buying', 'purchase', 'purchasing', 'invest', 'investment', 'closing on', 'mortgage', 'title', 'escritura'],
  renting: ['rent', 'renting', 'rental', 'lease', 'leasing', 'airbnb', 'sublet', 'tenant', 'landlord', 'alquiler'],
  moving: ['move', 'moving', 'relocate', 'relocating', 'relocation', 'expat', 'living in', 'live in', 'retire', 'retiring', 'residency', 'visa', 'settle'],
  market: ['market', 'price', 'prices', 'pricing', 'cost', 'costs', 'worth', 'expensive', 'cheap', 'affordable', 'per m2', 'per m²', 'square meter', 'appreciation'],
};

// General real-estate terms — presence of any (with a place term) qualifies a post
// even if no specific intent dominates.
const RE_TERMS = [
  'real estate', 'realestate', 'property', 'properties', 'house', 'houses',
  'home', 'homes', 'apartment', 'apartments', 'apt', 'flat', 'condo',
  'housing', 'land', 'plot', 'neighborhood', 'neighbourhood', 'barrio', 'inmueble',
];

function norm(s) {
  return (s || '').toLowerCase();
}

function countHits(text, terms) {
  let n = 0;
  const found = [];
  for (const t of terms) {
    if (text.includes(t)) {
      n++;
      found.push(t);
    }
  }
  return { n, found };
}

// Returns { relevant, score (0-100), intent, matchedKeywords }.
export function scorePost(post, keywords = []) {
  const text = norm(`${post.title} ${post.selftext || ''}`);
  const place = countHits(text, PLACE_TERMS);
  const re = countHits(text, RE_TERMS);

  // Per-intent hits.
  const intentScores = {};
  for (const [intent, terms] of Object.entries(INTENT_TERMS)) {
    intentScores[intent] = countHits(text, terms).n;
  }
  const bestIntent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0];
  const hasIntent = bestIntent && bestIntent[1] > 0;
  const intent = hasIntent ? bestIntent[0] : re.n > 0 ? 'general' : 'general';

  // A post is only relevant if it ties a place to real estate.
  const relevant = place.n > 0 && (re.n > 0 || hasIntent);

  // Score: place presence + RE presence + intent strength + keyword directness
  // + a small recency bonus, clamped to 0-100.
  const kw = norm(keywords.join(' '));
  const matchedKeywords = keywords.filter((k) => text.includes(norm(k)));
  let score = 0;
  score += Math.min(place.n, 3) * 12; // up to 36
  score += Math.min(re.n, 3) * 8; // up to 24
  score += hasIntent ? Math.min(bestIntent[1], 3) * 8 : 0; // up to 24
  score += Math.min(matchedKeywords.length, 2) * 8; // up to 16

  // Recency bonus: newer posts score higher (up to +15).
  const ageDays = (Date.now() - (post.createdUtc || 0) * 1000) / 86400000;
  if (ageDays <= 3) score += 15;
  else if (ageDays <= 14) score += 10;
  else if (ageDays <= 60) score += 5;

  // Title mentions (vs only body) get a small boost — usually more on-topic.
  if (norm(post.title).match(/paraguay|asunci/)) score += 6;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { relevant, score, intent, matchedKeywords };
}

export const INTENT_LABELS = {
  buying: 'Buying',
  renting: 'Renting',
  selling: 'Selling',
  moving: 'Moving / Expat',
  market: 'Market / Prices',
  general: 'General',
};
