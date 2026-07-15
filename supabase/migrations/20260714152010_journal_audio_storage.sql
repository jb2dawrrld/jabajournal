-- Audio attachments: column + private storage bucket with per-user folder RLS

alter table public.journal_entries
  add column if not exists audio_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-audio',
  'journal-audio',
  false,
  26214400,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/x-m4a', 'audio/m4a']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "journal_audio_select_own" on storage.objects;
create policy "journal_audio_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'journal-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal_audio_insert_own" on storage.objects;
create policy "journal_audio_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'journal-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal_audio_update_own" on storage.objects;
create policy "journal_audio_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'journal-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'journal-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "journal_audio_delete_own" on storage.objects;
create policy "journal_audio_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'journal-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
