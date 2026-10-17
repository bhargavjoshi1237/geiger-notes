-- Add board metadata
--
-- Gives personal sub-boards (notes.boards) the same jsonb expansion bag project boards already have; holds metadata.appearance (canvas background/pattern/theme).

-- @up
alter table if exists notes.boards
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- @down
alter table if exists notes.boards
  drop column if exists metadata;
