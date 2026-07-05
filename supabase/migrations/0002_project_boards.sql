-- Project boards
-- ---------------------------------------------------------------------------
-- The project-owned counterpart to the personal notes.boards table. Where a
-- personal board belongs to a user (user_id), a project board belongs to a
-- project (project_id -> public.projects) the same way, and is reached via
-- /project/<projectId> instead of /u/<userId>. Kept in a separate table so the
-- personal boards table never mixes personal and project rows.
--
-- References the canonical shared public.projects (owned by the suite hub) and
-- auth.users. Fully idempotent and self-contained.
--
-- Depends on 0001_relocate_personal.sql (notes schema + notes.set_updated_at is
-- defined here since it is the first table in notes that needs it).

create schema if not exists notes;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger function for the notes schema.
-- ---------------------------------------------------------------------------

create or replace function notes.set_updated_at()
returns trigger
language plpgsql
set search_path = notes
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists notes.project_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null default 'Untitled Board',
  description text,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  viewport jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all on notes.project_boards to anon, authenticated, service_role;

create index if not exists project_boards_project_idx
  on notes.project_boards (project_id);

drop trigger if exists project_boards_set_updated_at on notes.project_boards;
create trigger project_boards_set_updated_at
  before update on notes.project_boards
  for each row execute function notes.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security — membership only for now. 0003_abilities.sql replaces
-- these with ability-scoped policies (boards.view/create/update/delete).
-- ---------------------------------------------------------------------------

create or replace function notes.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.projects project
    join public.organization_users membership
      on membership.organization = project.organization_id
    where project.id = target_project_id
      and membership."user" = auth.uid()
  );
$$;

grant execute on function notes.can_access_project(uuid) to anon, authenticated, service_role;

alter table notes.project_boards enable row level security;

drop policy if exists project_boards_member_all on notes.project_boards;
create policy project_boards_member_all on notes.project_boards
  for all
  using (notes.can_access_project(project_id))
  with check (notes.can_access_project(project_id));
