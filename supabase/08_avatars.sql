-- ============================================================================
-- FaithFinder — profile and cover photos
--
-- Picked photos are paths inside the app's own sandbox on one phone. A post
-- carrying one as its author photo renders an avatar for its author and a
-- blank for everybody else — the same failure post images had, in the one
-- place people are least likely to report it, because it looks right to the
-- person who set it.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

-- Foldered by uploader, which is what makes "your own" expressible.
drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
