-- Allow authenticated users to insert their own profile row if the signup trigger
-- did not run (recovery). Matches RLS pattern: only auth.uid() = id.

drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);
