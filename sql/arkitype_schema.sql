-- ════════════════════════════════════════════════════════════════════════════
-- Arkitype — accounts + per-file design systems.
-- Run ONCE in the Supabase dashboard → SQL Editor (owner privileges).
-- Safe to re-run: every statement is idempotent.
--
-- Security posture mirrors Hued: owner-only RLS on every table, a SECURITY
-- DEFINER signup trigger, and no anonymous access — with ONE deliberate
-- exception, `published_snapshots` (§3), which is anon-readable by design so
-- published styleguides work without an account. The browser only ever holds
-- the publishable key, so RLS below is the real access boundary.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. profiles — one row per auth user (display name + onboarding survey) ────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  survey     jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── 2. projects — each "file" is one row; full ProjectState blob in `state` ───
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'Untitled system',
  state      jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner);
-- List order in the dashboard: most-recently-touched first.
create index if not exists projects_owner_updated_idx
  on public.projects (owner, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (auth.uid() = owner);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = owner);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = owner);

-- ── 3. published_snapshots — the public, read-only styleguide for a project ───
-- The ONLY anonymously-readable table in the schema. A row exists only after
-- the owner explicitly publishes, and it holds a frozen copy of the design
-- system (not a live view of `projects.state`), so unpublished edits stay
-- private until the next publish.
create table if not exists public.published_snapshots (
  project_id   uuid primary key references public.projects (id) on delete cascade,
  owner        uuid not null references auth.users (id) on delete cascade,
  slug         text not null unique,
  snapshot     jsonb not null,
  published_at timestamptz not null default now()
);

create index if not exists published_snapshots_owner_idx
  on public.published_snapshots (owner);

alter table public.published_snapshots enable row level security;

-- Anyone with the link can read. Knowing the slug IS the access grant, the way
-- a Figma "anyone with the link" share works — there is no per-viewer identity.
drop policy if exists "published_snapshots_select_public" on public.published_snapshots;
create policy "published_snapshots_select_public" on public.published_snapshots
  for select using (true);

drop policy if exists "published_snapshots_insert_own" on public.published_snapshots;
create policy "published_snapshots_insert_own" on public.published_snapshots
  for insert with check (auth.uid() = owner);

drop policy if exists "published_snapshots_update_own" on public.published_snapshots;
create policy "published_snapshots_update_own" on public.published_snapshots
  for update using (auth.uid() = owner) with check (auth.uid() = owner);

-- Unpublish.
drop policy if exists "published_snapshots_delete_own" on public.published_snapshots;
create policy "published_snapshots_delete_own" on public.published_snapshots
  for delete using (auth.uid() = owner);

-- ── 4. auto-create a profile row on signup (Hued pattern) ─────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 5. keep updated_at fresh on every write ───────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();
