-- XPALLA — Supabase schema
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- Storage is keyed by the app's own user ids; the server talks to these tables
-- with the service-role key, so Row Level Security is bypassed (the Node server
-- is the trusted layer and filters every query by user_id itself).

create table if not exists xpalla_users (
  id    text primary key,
  email text unique not null,
  data  jsonb not null
);

create table if not exists xpalla_sessions (
  token   text primary key,
  user_id text not null,
  exp     bigint not null
);

create table if not exists xpalla_brands (
  user_id text primary key,
  data    jsonb not null
);

create table if not exists xpalla_drafts (
  id         text primary key,
  user_id    text not null,
  created_at timestamptz default now(),
  data       jsonb not null
);

create table if not exists xpalla_waitlist (
  email      text primary key,
  created_at timestamptz default now(),
  data       jsonb not null
);

create index if not exists idx_drafts_user   on xpalla_drafts(user_id);
create index if not exists idx_sessions_user on xpalla_sessions(user_id);

-- Optional hardening: enable RLS so these tables are unreadable via the public
-- anon key (the server uses the service-role key, which still bypasses RLS).
alter table xpalla_users    enable row level security;
alter table xpalla_sessions enable row level security;
alter table xpalla_brands   enable row level security;
alter table xpalla_drafts   enable row level security;
alter table xpalla_waitlist enable row level security;
