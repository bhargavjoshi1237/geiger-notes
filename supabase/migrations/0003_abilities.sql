-- Abilities (role-based action authorization)
-- ---------------------------------------------------------------------------
-- Ported from geiger-flow (0003_abilities + 0004_tasks_abilities). Classifies
-- user actions as "abilities" (e.g. boards.create) that a role may be granted,
-- and enforces them in RLS via notes.has_ability(project_id, key).
--
-- Resolution model:
--   * notes.project_role(project)   -> the caller's role for a project
--     ('owner' for the project/org creator, else their organization_users role)
--   * notes.role_ability            -> explicit (organization, role, ability) grants
--   * notes.open_module             -> modules open to every project member
--   * notes.has_ability(project, a) -> owner can do anything; an open module is
--     available to all members; otherwise an explicit grant is required.
--
-- Depends on 0002_project_boards.sql (notes.project_boards).

create schema if not exists notes;

-- ---------------------------------------------------------------------------
-- Resolver functions (security definer so policies can read the shared tables
-- regardless of their own RLS).
-- ---------------------------------------------------------------------------

create or replace function notes.project_org(target_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.projects where id = target_project_id;
$$;

create or replace function notes.project_role(target_project_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  org uuid;
  creator uuid;
  member_role text;
begin
  if uid is null then
    return null;
  end if;

  select organization_id, created_by
  into org, creator
  from public.projects
  where id = target_project_id;

  -- Project creator is treated as an owner.
  if creator is not null and creator = uid then
    return 'owner';
  end if;

  if org is not null then
    select lower(ou.role::text)
    into member_role
    from public.organization_users ou
    where ou."user" = uid and ou.organization = org
    limit 1;

    if member_role is not null then
      return member_role;
    end if;

    -- Organization creator is treated as an owner.
    if exists (
      select 1 from public.organizations o
      where o.id = org and o.created_by = uid
    ) then
      return 'owner';
    end if;
  end if;

  return null;
end;
$$;

create or replace function notes.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.organization_users
    where "user" = auth.uid() and organization = target_org
  ) or exists (
    select 1 from public.organizations
    where id = target_org and created_by = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Per-role ability grants.
-- ---------------------------------------------------------------------------

create table if not exists notes.role_ability (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_key text not null,
  ability text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, role_key, ability)
);

grant all on notes.role_ability to anon, authenticated, service_role;

alter table notes.role_ability enable row level security;

drop policy if exists role_ability_read on notes.role_ability;
create policy role_ability_read on notes.role_ability
  for select
  using (notes.is_org_member(organization_id));

drop policy if exists role_ability_write on notes.role_ability;
create policy role_ability_write on notes.role_ability
  for all
  using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Modules open to every project member regardless of role. `boards` gates the
-- notes.project_boards table (ability namespace 'boards').
-- ---------------------------------------------------------------------------

create table if not exists notes.open_module (
  module text primary key
);

-- No RLS policy: config read only by the security-definer has_ability function
-- (which bypasses RLS); it is not reachable through the API.
alter table notes.open_module enable row level security;

insert into notes.open_module (module) values ('boards')
  on conflict (module) do nothing;

-- ---------------------------------------------------------------------------
-- The core check.
-- ---------------------------------------------------------------------------

create or replace function notes.has_ability(target_project_id uuid, ability text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  role_key text;
  org uuid;
begin
  if uid is null then
    return false;
  end if;

  role_key := notes.project_role(target_project_id);

  -- Transitional: projects not yet linked to an organization are accessible to
  -- any authenticated user, so the app works before org provisioning is wired
  -- up. Remove once every project carries organization_id + created_by.
  if role_key is null then
    select organization_id into org
    from public.projects where id = target_project_id;

    if org is null then
      role_key := 'member';
    else
      return false;
    end if;
  end if;

  -- Owners can do anything.
  if role_key = 'owner' then
    return true;
  end if;

  -- Open modules are available to all project members.
  if exists (
    select 1 from notes.open_module om
    where om.module = split_part(ability, '.', 1)
  ) then
    return true;
  end if;

  -- Otherwise require an explicit per-role grant.
  return exists (
    select 1 from notes.role_ability ra
    where ra.organization_id = notes.project_org(target_project_id)
      and ra.role_key = role_key
      and (ra.ability = has_ability.ability or ra.ability = '*')
  );
end;
$$;

grant execute on function notes.project_org(uuid) to anon, authenticated, service_role;
grant execute on function notes.project_role(uuid) to anon, authenticated, service_role;
grant execute on function notes.is_org_member(uuid) to anon, authenticated, service_role;
grant execute on function notes.has_ability(uuid, text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Project boards RLS — ability-scoped, one policy per action.
-- Replaces the membership-only policy from 0002_project_boards.sql.
-- ---------------------------------------------------------------------------

drop policy if exists project_boards_member_all on notes.project_boards;

drop policy if exists project_boards_select on notes.project_boards;
create policy project_boards_select on notes.project_boards
  for select using (notes.has_ability(project_id, 'boards.view'));

drop policy if exists project_boards_insert on notes.project_boards;
create policy project_boards_insert on notes.project_boards
  for insert with check (notes.has_ability(project_id, 'boards.create'));

drop policy if exists project_boards_update on notes.project_boards;
create policy project_boards_update on notes.project_boards
  for update
  using (notes.has_ability(project_id, 'boards.update'))
  with check (notes.has_ability(project_id, 'boards.update'));

drop policy if exists project_boards_delete on notes.project_boards;
create policy project_boards_delete on notes.project_boards
  for delete using (notes.has_ability(project_id, 'boards.delete'));
