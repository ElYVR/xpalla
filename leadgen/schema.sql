-- LEADGEN — Supabase schema. Run this in the Supabase SQL Editor.
-- The Node server is the trusted layer (service-role key); RLS is enabled as
-- defense-in-depth against the public anon key, same posture as XPALLA.

create table if not exists leadgen_settings (
  id   text primary key,          -- always 'owner' (single-user app)
  data jsonb not null
);

create table if not exists leadgen_sessions (
  token text primary key,
  exp   bigint not null
);

create table if not exists leadgen_leads (
  id         text primary key,
  stage      text,
  created_at timestamptz default now(),
  data       jsonb not null
);

create index if not exists idx_leadgen_leads_stage on leadgen_leads(stage);

alter table leadgen_settings enable row level security;
alter table leadgen_sessions enable row level security;
alter table leadgen_leads    enable row level security;
