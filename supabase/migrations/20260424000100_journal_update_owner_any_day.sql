drop policy if exists "journal_update_today" on public.journal_entries;

create policy "journal_update_own"
  on public.journal_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
