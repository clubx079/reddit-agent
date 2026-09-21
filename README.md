# Casa Libre · Reddit Agent

A local **listening + AI-drafting** dashboard for Paraguay real-estate conversations on Reddit.
It implements the **GREEN zone** of the Casa Libre Reddit/Quora strategy brief:

> Automate discovery + drafting (free, zero ban risk). A human reviews, edits and posts.

**This tool never posts to Reddit.** It only reads (public, read-only) and drafts.

## What it does

1. **Listen** — sweeps Reddit's free public JSON search across `r/Paraguay`, `r/expats`,
   `r/IWantOut`, `r/SouthAmerica`, `r/Asuncion` + a global search, for a configurable keyword set.
2. **Score & classify** — keeps only posts that tie a place (Paraguay/Asunción) to a real-estate
   intent, and tags each: buying / renting / selling / moving-expat / market.
3. **Draft** — writes a genuine, helpful reply grounded in the Casa Libre FAQ. Uses Claude when
   `ANTHROPIC_API_KEY` is set; a built-in FAQ template drafter otherwise.
4. **Human gate** — every post shows its direct Reddit link, an editable draft, and
   **Copy & open thread**. You post manually.

## Cost control

- Reddit reads are **free** (public JSON, read-only).
- Drafting is the only paid part. A scan keeps the **top `maxPosts` (default 6)** posts and drafts
  at most that many — so a scan costs ~6 short model calls. Regenerate is one call, on demand.

## Run

```bash
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY for real AI drafts
npm install
npm run dev                  # http://localhost:3030
```

If `ANTHROPIC_API_KEY` is present in your shell environment, `npm run dev` inherits it — no
`.env.local` needed. Without a key, drafts come from the FAQ template drafter.

## Config

Defaults live in `lib/config.js` and are editable at runtime via `PUT /api/config`
(keywords, subreddits, `timeWindow`, `limitPerQuery`, `minScore`, `maxPosts`).

Optional `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` raise rate limits via app-only OAuth.
Still read-only; still never posts.

## Layout

- `lib/reddit.js` — read-only Reddit search (public JSON + optional OAuth)
- `lib/relevance.js` — scoring + intent classification
- `lib/faq.js` — Casa Libre knowledge base + optional mention line
- `lib/draft.js` — Claude / template drafting
- `lib/store.js` — local JSON persistence (`data/store.json`, gitignored)
- `app/api/{scan,posts,posts/[id],draft,config}` — API routes
- `app/page.js` + `components/PostCard.js` — the dashboard

Local git only. Never pushed. No production DB is touched.
