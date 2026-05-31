-- Per-user application settings (General / Defaults preferences).
-- Account identity (name, email, avatar) lives in Supabase Auth user_metadata;
-- this table stores workspace preferences as a single JSONB blob so the schema
-- never needs to change as new toggles are added.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

-- Row Level Security: a user can only ever read/write their own row.
alter table public.user_settings enable row level security;

create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);
