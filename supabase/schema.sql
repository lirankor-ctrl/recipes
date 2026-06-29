-- Cloud backup schema for the "מתכונים" recipes app.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- One backup row per user (the app updates it in place).
create table if not exists public.recipe_backups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  backup_data jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists recipe_backups_user_id_idx
  on public.recipe_backups (user_id);

-- Row Level Security: a user may only ever touch their own backups.
alter table public.recipe_backups enable row level security;

drop policy if exists "select own backups" on public.recipe_backups;
create policy "select own backups"
  on public.recipe_backups
  for select
  using (auth.uid() = user_id);

drop policy if exists "insert own backups" on public.recipe_backups;
create policy "insert own backups"
  on public.recipe_backups
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "update own backups" on public.recipe_backups;
create policy "update own backups"
  on public.recipe_backups
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "delete own backups" on public.recipe_backups;
create policy "delete own backups"
  on public.recipe_backups
  for delete
  using (auth.uid() = user_id);
