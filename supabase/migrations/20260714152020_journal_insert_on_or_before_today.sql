-- Allow creating entries for today and any past day (matches editable UI).

drop policy if exists "journal_insert_today" on public.journal_entries;
drop policy if exists "journal_insert_on_or_before_today" on public.journal_entries;

create policy "journal_insert_on_or_before_today"
  on public.journal_entries for insert
  with check (
    auth.uid() = user_id
    and entry_date <= public.user_today(auth.uid())
  );
