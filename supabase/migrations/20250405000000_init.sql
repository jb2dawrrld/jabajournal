-- Jabajournal: profiles + journal entries with RLS and today-only writes

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'UTC',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.user_today(uid uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select (
    (now() at time zone coalesce(
      (select p.timezone from public.profiles p where p.id = uid),
      'UTC'
    ))
  )::date;
$$;

grant execute on function public.user_today(uuid) to authenticated, service_role;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  title text,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists journal_entries_user_month_idx
  on public.journal_entries (user_id, entry_date);

alter table public.journal_entries enable row level security;

create policy "journal_select_own"
  on public.journal_entries for select
  using (auth.uid() = user_id);

create policy "journal_insert_today"
  on public.journal_entries for insert
  with check (
    auth.uid() = user_id
    and entry_date = public.user_today(auth.uid())
  );

create policy "journal_update_today"
  on public.journal_entries for update
  using (
    auth.uid() = user_id
    and entry_date = public.user_today(auth.uid())
  )
  with check (
    auth.uid() = user_id
    and entry_date = public.user_today(auth.uid())
  );

create policy "journal_delete_today"
  on public.journal_entries for delete
  using (
    auth.uid() = user_id
    and entry_date = public.user_today(auth.uid())
  );

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_journal_entries_updated_at on public.journal_entries;
create trigger set_journal_entries_updated_at
  before update on public.journal_entries
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
