-- 001_schema.sql — Casa Libre Reddit Agent (own AiroBase project 8e2888edd08c489d84ef).
-- Run once in the AiroBase SQL Editor. Idempotent (safe to re-run).
--
--   ra_users      team accounts (email + bcrypt password), role admin | member
--   ra_invites    pending team invitations (token hash, 7-day expiry)
--   ra_posts      Reddit posts that landed (Reddit API / F5Bot / manual / demo)
--   ra_drafts     AI-drafted (and human-edited) replies; every version kept
--   ra_knowledge  the knowledge base the LLM must follow (rules, facts, tone, mentions)
--   ra_settings   key → jsonb (keywords, subreddits, LLM provider/model, limits…)
--   ra_activity   audit log (who did what)
--
-- The app talks to these tables only server-side with the SECRET key. RLS is ON with
-- no policies, so the publishable (anon) key can read or write nothing.
-- The app never posts to Reddit: read + draft only; a human posts.

-- ---------- team ----------------------------------------------------------------
create table if not exists public.ra_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  full_name      text,
  password_hash  text,                                   -- bcrypt; null until the invite is accepted
  role           text not null default 'member' check (role in ('admin', 'member')),
  status         text not null default 'active' check (status in ('active', 'disabled')),
  created_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

create table if not exists public.ra_invites (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  role         text not null default 'member' check (role in ('admin', 'member')),
  token_hash   text not null unique,                      -- sha256 of the emailed token
  invited_by   uuid references public.ra_users(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ra_invites_email_idx on public.ra_invites (lower(email));

-- ---------- posts ------------------------------------------------------------------
create table if not exists public.ra_posts (
  id               uuid primary key default gen_random_uuid(),
  reddit_id        text not null unique,                  -- t3 id (e.g. 1abcde) or demo_*/manual_*
  subreddit        text not null,
  title            text not null,
  body             text,
  author           text,
  permalink        text,                                  -- https://www.reddit.com/r/…/comments/…
  created_utc      timestamptz,
  reddit_score     int,
  num_comments     int,
  source           text not null default 'reddit_api' check (source in ('reddit_api', 'f5bot', 'manual', 'demo')),
  matched_keyword  text,
  relevance        int not null default 0 check (relevance between 0 and 100),
  intent           text not null default 'general' check (intent in ('buying', 'renting', 'selling', 'moving', 'market', 'general')),
  language         text not null default 'en' check (language in ('en', 'es')),
  status           text not null default 'new' check (status in ('new', 'drafted', 'approved', 'posted', 'dismissed')),
  assigned_to      uuid references public.ra_users(id) on delete set null,
  posted_at        timestamptz,                           -- a human marked it as posted on Reddit
  posted_by        uuid references public.ra_users(id) on delete set null,
  our_comment_url  text,                                  -- link to the reply we posted (for tracking)
  fetched_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ra_posts_status_idx on public.ra_posts (status, relevance desc, fetched_at desc);
create index if not exists ra_posts_sub_idx on public.ra_posts (subreddit);

-- ---------- drafts -----------------------------------------------------------------
create table if not exists public.ra_drafts (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null references public.ra_posts(id) on delete cascade,
  body              text not null,
  provider          text not null default 'groq' check (provider in ('groq', 'openai', 'template', 'human')),
  model             text,
  mention_included  boolean not null default false,       -- mentions Casa Libre (the ~1-in-9 rule)
  knowledge_ids     uuid[] not null default '{}',          -- which KB entries grounded it
  prompt_tokens     int,
  completion_tokens int,
  status            text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  created_by        uuid references public.ra_users(id) on delete set null,
  edited_by         uuid references public.ra_users(id) on delete set null,
  approved_by       uuid references public.ra_users(id) on delete set null,
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists ra_drafts_post_idx on public.ra_drafts (post_id, created_at desc);

-- ---------- knowledge base ---------------------------------------------------------
create table if not exists public.ra_knowledge (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('rule', 'fact', 'faq', 'tone', 'mention', 'banned')),
  title       text not null,
  content     text not null,
  intent      text check (intent is null or intent in ('buying', 'renting', 'selling', 'moving', 'market', 'general')),
  language    text check (language is null or language in ('en', 'es')),
  priority    int not null default 50 check (priority between 0 and 100),  -- higher = sent first
  active      boolean not null default true,
  created_by  uuid references public.ra_users(id) on delete set null,
  updated_by  uuid references public.ra_users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists ra_knowledge_active_idx on public.ra_knowledge (active, kind, priority desc);

-- ---------- settings + activity ----------------------------------------------------
create table if not exists public.ra_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.ra_users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.ra_activity (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.ra_users(id) on delete set null,
  action      text not null,          -- e.g. 'login', 'invite.sent', 'draft.generated', 'post.posted'
  entity      text,                   -- 'post' | 'draft' | 'knowledge' | 'user' | 'invite' | 'settings'
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists ra_activity_created_idx on public.ra_activity (created_at desc);

-- ---------- security: server-side (secret key) only --------------------------------
alter table public.ra_users     enable row level security;
alter table public.ra_invites   enable row level security;
alter table public.ra_posts     enable row level security;
alter table public.ra_drafts    enable row level security;
alter table public.ra_knowledge enable row level security;
alter table public.ra_settings  enable row level security;
alter table public.ra_activity  enable row level security;
