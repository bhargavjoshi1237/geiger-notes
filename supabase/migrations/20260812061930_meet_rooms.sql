-- Meeting rooms
--
-- Owns notes.meet_rooms. A meeting is a standalone feature that sits BESIDE
-- collaboration rather than inside it: it has its own code, its own room, and
-- its own lifecycle, so you can call someone without starting a collab session.
-- When a collab session does happen to be running, a meeting may be attached to
-- it (collab_session_id) so its members join without exchanging a code — that
-- link is an optional convenience, never a requirement.
--
-- The room row is only the rendezvous point. All media is peer-to-peer WebRTC
-- and all signalling rides Supabase Realtime broadcast on `meet:<roomId>`, so
-- no offer, answer, or ICE candidate is ever written here.

-- @up
create schema if not exists notes;
create extension if not exists pgcrypto;

create or replace function notes.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists notes.meet_rooms (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  host              uuid,
  -- Optional link to a running notes.collab session, when the meeting was
  -- started from one. Null for a standalone meeting.
  collab_session_id uuid,
  -- { "<userId>": { name, joinedAt, leftAt } } — who has been in the room.
  -- Live presence comes from the Realtime channel; this is the durable record.
  participants      jsonb not null default '{}'::jsonb,
  ended_at          timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- Codes are how a meeting is joined, so they must resolve to exactly one live
-- room. Ended rooms are excluded, which lets a code be reissued later.
create unique index if not exists meet_rooms_code_active_idx
  on notes.meet_rooms (code)
  where deleted_at is null and ended_at is null;

create index if not exists meet_rooms_host_idx
  on notes.meet_rooms (host)
  where deleted_at is null;

create index if not exists meet_rooms_collab_idx
  on notes.meet_rooms (collab_session_id)
  where deleted_at is null and ended_at is null;

drop trigger if exists meet_rooms_touch_updated_at on notes.meet_rooms;
create trigger meet_rooms_touch_updated_at
before update on notes.meet_rooms
for each row execute function notes.touch_updated_at();

alter table notes.meet_rooms enable row level security;

drop policy if exists meet_rooms_demo_all on notes.meet_rooms;
create policy meet_rooms_demo_all on notes.meet_rooms
  for all to anon, authenticated
  using (true) with check (true);

-- @down
drop policy if exists meet_rooms_demo_all on notes.meet_rooms;
drop table if exists notes.meet_rooms cascade;
