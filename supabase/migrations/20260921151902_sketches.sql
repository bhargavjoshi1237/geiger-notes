-- Sketches
--
-- Owns notes.sketches. Self-contained: creates the schema, the shared
-- updated_at trigger function, the table, its indexes and ability-scoped RLS.

-- @up
create extension if not exists pgcrypto;

create schema if not exists notes;
grant usage on schema notes to anon, authenticated, service_role;

-- Self-contained: do not depend on an earlier migration having defined this.
create or replace function notes.set_updated_at()
returns trigger language plpgsql set search_path = notes as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists notes.sketches (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null default 'Untitled Sketch',
  description text,
  elements    jsonb not null default '[]'::jsonb,
  app_state   jsonb not null default '{}'::jsonb,
  files       jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

grant all on notes.sketches to anon, authenticated, service_role;

create index if not exists sketches_project_idx on notes.sketches (project_id);
create index if not exists sketches_user_idx    on notes.sketches (user_id);
create index if not exists sketches_updated_idx on notes.sketches (updated_at desc);

drop trigger if exists sketches_set_updated_at on notes.sketches;
create trigger sketches_set_updated_at
  before update on notes.sketches
  for each row execute function notes.set_updated_at();

-- Member-open by default, exactly like 'boards'.
insert into notes.open_module (module) values ('sketches') on conflict (module) do nothing;

alter table notes.sketches enable row level security;

drop policy if exists sketches_select on notes.sketches;
create policy sketches_select on notes.sketches for select using (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.view') end
);

drop policy if exists sketches_insert on notes.sketches;
create policy sketches_insert on notes.sketches for insert with check (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.create') end
);

drop policy if exists sketches_update on notes.sketches;
create policy sketches_update on notes.sketches for update
  using (case when project_id is null then user_id = auth.uid()
              else notes.has_ability(project_id, 'sketches.update') end)
  with check (case when project_id is null then user_id = auth.uid()
                   else notes.has_ability(project_id, 'sketches.update') end);

drop policy if exists sketches_delete on notes.sketches;
create policy sketches_delete on notes.sketches for delete using (
  case when project_id is null then user_id = auth.uid()
       else notes.has_ability(project_id, 'sketches.delete') end
);

-- @down
drop table if exists notes.sketches cascade;
delete from notes.open_module where module = 'sketches';
