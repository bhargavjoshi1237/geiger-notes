-- One live home board per project
-- ---------------------------------------------------------------------------
-- The save-state API creates a project's "home" canvas (metadata.home = true)
-- on first save via a find-or-insert. Two concurrent saves (e.g. the debounced
-- autosave fetch racing the beforeunload sendBeacon) could both miss the lookup
-- and each INSERT a home row. Duplicate home rows then break load-state, whose
-- .maybeSingle() errors on >1 row and renders the canvas empty ("data gone").
--
-- This migration collapses any existing duplicates and adds a partial unique
-- index so the race is rejected by the DB (the second insert 23505s, and the
-- API falls back to updating the winner). Depends on 0002_project_boards.sql.

create schema if not exists notes;

-- Collapse duplicate home rows: keep the most recently updated per project,
-- soft-delete the rest so the unique index below can be created.
with ranked as (
  select id,
    row_number() over (
      partition by project_id
      order by updated_at desc, created_at desc
    ) as rn
  from notes.project_boards
  where metadata->>'home' = 'true' and deleted_at is null
)
update notes.project_boards pb
set deleted_at = now()
from ranked
where pb.id = ranked.id and ranked.rn > 1;

-- One live home board per project.
create unique index if not exists project_boards_one_home_per_project
  on notes.project_boards (project_id)
  where metadata->>'home' = 'true' and deleted_at is null;
