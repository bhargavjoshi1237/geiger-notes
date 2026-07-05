-- Relocate the per-user (personal) tables into the dedicated `notes` schema.
-- These stay exactly as they were — still keyed on the user's uuid — they just
-- live under `notes.*` instead of `public.*`. The suite Supabase project is
-- shared, so every product owns its own schema; only genuinely cross-product
-- tables (public.projects / organizations / organization_users / auth.users)
-- stay in public.
--
-- Idempotent: if a table still lives in public it is moved; on a fresh database
-- it is created directly in notes. Re-running is a no-op. RLS/policies/indexes/
-- triggers travel with the table on `alter table ... set schema`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

create schema if not exists notes;

-- Expose the schema to the PostgREST roles. (You must ALSO add `notes` to
-- Settings -> API -> Exposed schemas in the Supabase dashboard for the REST
-- API to serve it.)
grant usage on schema notes to anon, authenticated, service_role;
alter default privileges in schema notes
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema notes
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema notes
  grant all on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Move existing public.* personal tables into notes.* when present.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['boards', 'base', 'collab', 'documents', 'user_settings']
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) and not exists (
      select 1 from information_schema.tables
      where table_schema = 'notes' and table_name = t
    ) then
      execute format('alter table public.%I set schema notes', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Fresh-install fallback: create the same tables directly in notes if they were
-- never in public. Shapes mirror the original database/init/*.sql exactly so a
-- moved table and a freshly-created one are identical.
-- ---------------------------------------------------------------------------

create table if not exists notes.boards (
  id uuid not null default gen_random_uuid(),
  name text not null default 'Untitled Board'::text,
  description text null,
  nodes text null,
  edges text null,
  viewport text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  user_id uuid null,
  constraint boards_pkey primary key (id),
  constraint boards_user_id_fkey foreign key (user_id) references auth.users (id)
);

create table if not exists notes.base (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  viewport jsonb default '{}'::jsonb,
  preference jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists notes.collab (
  id uuid not null default gen_random_uuid(),
  host uuid null,
  joiners jsonb null default '{}'::jsonb,
  code text null,
  state_nodes text null,
  state_edges text null,
  preference jsonb null,
  created_at timestamp with time zone not null default now(),
  rollback jsonb null,
  constraint collab_pkey primary key (id),
  constraint collab_host_fkey foreign key (host) references auth.users (id)
);

create table if not exists notes.documents (
  id uuid primary key default gen_random_uuid(),
  content jsonb default '{}'::jsonb,
  created_at timestamp with time zone default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone default CURRENT_TIMESTAMP
);

create table if not exists notes.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

grant all on notes.boards, notes.base, notes.collab, notes.documents, notes.user_settings
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Re-assert the owner-scoped RLS that base + user_settings already had, so it
-- holds on both the moved and the freshly-created paths. boards/collab/documents
-- carried no RLS originally and keep that behavior (unchanged from public).
-- ---------------------------------------------------------------------------

alter table notes.base enable row level security;

drop policy if exists "Users can view their own base" on notes.base;
create policy "Users can view their own base"
  on notes.base for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own base" on notes.base;
create policy "Users can insert their own base"
  on notes.base for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own base" on notes.base;
create policy "Users can update their own base"
  on notes.base for update using (auth.uid() = user_id);

alter table notes.user_settings enable row level security;

drop policy if exists "Users can view their own settings" on notes.user_settings;
create policy "Users can view their own settings"
  on notes.user_settings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own settings" on notes.user_settings;
create policy "Users can insert their own settings"
  on notes.user_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own settings" on notes.user_settings;
create policy "Users can update their own settings"
  on notes.user_settings for update using (auth.uid() = user_id);
