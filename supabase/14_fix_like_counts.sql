-- ============================================================================
-- FaithFinder — repair the like counter
--
-- sync_like_count() serves two tables: post_likes, which has post_id, and
-- comment_likes, which has comment_id. It began by reading
--
--     coalesce(new.post_id, new.comment_id)
--
-- in its DECLARE block, before the branch that knows which table fired it.
-- coalesce does not skip a field that does not exist — PL/pgSQL resolves the
-- field against the actual row type and raises "record new has no field
-- comment_id". Both branches were unreachable: the function raised before
-- reaching either.
--
-- A trigger that raises takes its statement with it, so every like and unlike
-- on both tables has been failing since 07_posts.sql was applied. The app
-- never showed it: the store updates the count on the phone and sends the row
-- without waiting for it, so a like looked right to the person tapping it and
-- reached nobody else. likes_count has never moved and post_likes is empty.
--
-- The fix is to read the column after choosing the branch that knows it is
-- there. 07_posts.sql carries the same correction so a fresh database does not
-- ship the bug and then need this file.
-- ============================================================================

create or replace function sync_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta  int := case tg_op when 'INSERT' then 1 else -1 end;
  row_id text;
begin
  if tg_table_name = 'post_likes' then
    if tg_op = 'INSERT' then row_id := new.post_id; else row_id := old.post_id; end if;
    update posts set likes_count = greatest(0, likes_count + delta) where id = row_id;
  else
    if tg_op = 'INSERT' then row_id := new.comment_id; else row_id := old.comment_id; end if;
    update comments set likes_count = greatest(0, likes_count + delta) where id = row_id;
  end if;
  return null;
end;
$$;

-- Any like that did land before this (there are none, but a re-run of this
-- file after real use should not double-count) is reconciled from the rows
-- themselves rather than adjusted.
update posts p set likes_count = coalesce(
  (select count(*) from post_likes l where l.post_id = p.id), 0);
update comments c set likes_count = coalesce(
  (select count(*) from comment_likes l where l.comment_id = c.id), 0);
