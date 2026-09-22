// Default listening configuration for the Casa Libre Reddit agent.
// Editable at runtime from the dashboard (persisted into the store).

export const DEFAULT_CONFIG = {
  // Keyword phrases searched on Reddit. Kept broad; relevance.js does the
  // real filtering (must mention Paraguay/Asunción + a real-estate intent).
  keywords: [
    'Paraguay real estate',
    'Asuncion apartment',
    'Asunción apartment',
    'houses in Asuncion',
    'buy house Paraguay',
    'sell house Paraguay',
    'Paraguay property',
    'property in Paraguay',
    'living in Asuncion',
    'moving to Paraguay',
    'relocating to Paraguay',
    'expat Paraguay housing',
    'rent apartment Asuncion',
    'Paraguay housing market',
    'real estate Asuncion',
    'Zillow Paraguay',
    'retire in Paraguay',
  ],
  // Subreddits searched directly (plus a global search across all of Reddit).
  subreddits: [
    'Paraguay',
    'expats',
    'IWantOut',
    'SouthAmerica',
    'ParaguayExpats',
    'Asuncion',
  ],
  // How far back a search reaches (Reddit `t` param): hour|day|week|month|year|all
  timeWindow: 'year',
  // Results requested per query.
  limitPerQuery: 15,
  // Minimum relevance score (0-100) to keep a post in the queue.
  minScore: 25,
  // COST CONTROL: cap the review queue to the top-N most relevant posts per scan.
  // Drafting cost scales with this, so keep it small for testing (~4-6).
  maxPosts: 6,
};

// Casa Libre facts used by the drafter for grounding + the optional mention.
export const CASA_LIBRE = {
  name: 'Casa Libre',
  url: 'https://casa-libre.com.py',
  // TRACKED link — every mention the agent drafts uses this, never the bare
  // domain. /r/<slug> redirects to the site with utm params attached, so the
  // admin's analytics can tell Reddit traffic apart from organic Google. Add
  // ?t=<thread> to tell individual threads apart (see buyer portal lib/campaigns.js).
  trackedUrl: 'https://casa-libre.com.py/r/rda',
  trackedUrlFor: (thread) => `https://casa-libre.com.py/r/rda${thread ? `?t=${encodeURIComponent(String(thread).slice(0, 40))}` : ''}`,
  country: 'Paraguay',
  cities: ['Asunción', 'Ciudad del Este', 'Encarnación', 'San Lorenzo', 'Luque'],
  // ~9:1 rule from the strategy brief: mention Casa Libre in roughly 1 of 9
  // drafts, only where it genuinely helps. This is the target ratio the UI
  // nudges toward; the human always decides.
  mentionRatio: 9,
};
