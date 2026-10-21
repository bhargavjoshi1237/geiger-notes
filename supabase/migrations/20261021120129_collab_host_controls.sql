-- Collab host controls
--
-- Moves host authority on live sessions from client-side checks into the
-- database. Owns RLS on notes.collab, notes.collab_guard_update() and
-- notes.meet_rooms_guard_update().
--
-- Host state lives in the existing jsonb bags, so the app keeps working while
-- this is unapplied: notes.collab.preference holds { ownerId, endedAt,
-- editLock, locked, facilitation, laser, hideCursors, focus } and
-- notes.meet_rooms.metadata holds { locked, allowUnmute, allowVideo,
-- allowShare, spotlightId, removed }.
--
-- Rules the collab guard enforces for a signed-in caller who is not the host:
--   * only the host may hand over the session; the original owner
--     (preference.ownerId) may always take it back
--   * only co-hosts may change preference, and never ownerId/endedAt
--   * only joined members may change the board, and not while editLock is on
--     (co-hosts excepted)
--   * a caller may only ask to join (not while locked) or leave on their own
--     row; co-hosts may manage other members but never appoint co-hosts
--   * nothing changes once the session has ended
-- Writes without a JWT subject (service role, migrations) are trusted.

-- @up
create schema if not exists notes;

-- ---------------------------------------------------------------------------
-- notes.collab: RLS + guard
-- ---------------------------------------------------------------------------

alter table notes.collab enable row level security;

drop policy if exists collab_select on notes.collab;
create policy collab_select on notes.collab
  for select to anon, authenticated
  using (true);

drop policy if exists collab_insert on notes.collab;
create policy collab_insert on notes.collab
  for insert to authenticated
  with check (host = auth.uid());

-- Row-level writes are open to members; collab_guard_update decides what each caller may change.
drop policy if exists collab_update on notes.collab;
create policy collab_update on notes.collab
  for update to authenticated
  using (true) with check (true);

drop policy if exists collab_delete on notes.collab;
create policy collab_delete on notes.collab
  for delete to authenticated
  using (host = auth.uid());

create or replace function notes.collab_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  uid_key text;
  old_pref jsonb := coalesce(old.preference, '{}'::jsonb);
  new_pref jsonb := coalesce(new.preference, '{}'::jsonb);
  old_joiners jsonb := coalesce(old.joiners, '{}'::jsonb);
  new_joiners jsonb := coalesce(new.joiners, '{}'::jsonb);
  me_old jsonb;
  is_member boolean;
  is_cohost boolean;
  k text;
  o jsonb;
  n jsonb;
  o_status text;
  n_status text;
begin
  if uid is null or uid = old.host then
    return new;
  end if;

  uid_key := uid::text;

  -- The original owner can always reclaim the host role.
  if old_pref->>'ownerId' = uid_key and new.host = uid then
    return new;
  end if;

  if new.host is distinct from old.host then
    raise exception 'Only the host can hand over the session' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.code is distinct from old.code
    or new.rollback is distinct from old.rollback
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the host can change this session' using errcode = '42501';
  end if;

  if old_pref->>'endedAt' is not null then
    raise exception 'This session has ended' using errcode = '42501';
  end if;

  me_old := old_joiners -> uid_key;
  is_member := coalesce(me_old->>'status', '') = 'joined';
  is_cohost := is_member and coalesce(me_old->'cohost', 'false'::jsonb) = 'true'::jsonb;

  if new_pref is distinct from old_pref then
    if not is_cohost then
      raise exception 'Only hosts can change session settings' using errcode = '42501';
    end if;
    if (new_pref->'ownerId') is distinct from (old_pref->'ownerId')
      or (new_pref->'endedAt') is distinct from (old_pref->'endedAt') then
      raise exception 'Only the host can end the session' using errcode = '42501';
    end if;
  end if;

  if new.state_nodes is distinct from old.state_nodes
    or new.state_edges is distinct from old.state_edges then
    if not is_member then
      raise exception 'Only session editors can change the board' using errcode = '42501';
    end if;
    if not is_cohost and coalesce(old_pref->'editLock', 'false'::jsonb) = 'true'::jsonb then
      raise exception 'The host has paused editing' using errcode = '42501';
    end if;
  end if;

  if new_joiners is distinct from old_joiners then
    for k in
      select jsonb_object_keys(old_joiners)
      union
      select jsonb_object_keys(new_joiners)
    loop
      o := old_joiners -> k;
      n := new_joiners -> k;
      continue when o is not distinct from n;

      if coalesce(n->'cohost', 'false'::jsonb) = 'true'::jsonb
        and coalesce(o->'cohost', 'false'::jsonb) <> 'true'::jsonb then
        raise exception 'Only the host can appoint co-hosts' using errcode = '42501';
      end if;

      if k = uid_key then
        if n is null then
          raise exception 'Membership records cannot be deleted' using errcode = '42501';
        end if;
        o_status := coalesce(o->>'status', '');
        n_status := coalesce(n->>'status', '');
        if n_status = 'requested' then
          if o_status = 'joined' then
            raise exception 'You are already in this session' using errcode = '42501';
          end if;
          if o_status <> 'requested'
            and coalesce(old_pref->'locked', 'false'::jsonb) = 'true'::jsonb then
            raise exception 'This session is locked' using errcode = '42501';
          end if;
        elsif n_status <> 'left' and n_status <> o_status then
          raise exception 'Only the host can change your access' using errcode = '42501';
        end if;
      elsif not is_cohost then
        raise exception 'Only hosts can manage members' using errcode = '42501';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists collab_guard_update on notes.collab;
create trigger collab_guard_update
before update on notes.collab
for each row execute function notes.collab_guard_update();

-- ---------------------------------------------------------------------------
-- notes.meet_rooms: only the host changes the room record
-- ---------------------------------------------------------------------------

create or replace function notes.meet_rooms_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or uid = old.host then
    return new;
  end if;
  if new.host is distinct from old.host
    or new.code is distinct from old.code
    or new.collab_session_id is distinct from old.collab_session_id
    or new.ended_at is distinct from old.ended_at
    or new.metadata is distinct from old.metadata
    or new.deleted_at is distinct from old.deleted_at then
    raise exception 'Only the meeting host can do that' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists meet_rooms_guard_update on notes.meet_rooms;
create trigger meet_rooms_guard_update
before update on notes.meet_rooms
for each row execute function notes.meet_rooms_guard_update();

-- @down
drop trigger if exists meet_rooms_guard_update on notes.meet_rooms;
drop function if exists notes.meet_rooms_guard_update();

drop trigger if exists collab_guard_update on notes.collab;
drop function if exists notes.collab_guard_update();

drop policy if exists collab_delete on notes.collab;
drop policy if exists collab_update on notes.collab;
drop policy if exists collab_insert on notes.collab;
drop policy if exists collab_select on notes.collab;
alter table notes.collab disable row level security;
