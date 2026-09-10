-- FaithFinder — notification trigger tests. See supabase/tests/README.md.
-- Run against a scratch Postgres, never against the real project.

\set QUIET on
-- two accounts: Ana (church) and Ben (personal)
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','ana@example.com'),
  ('22222222-2222-2222-2222-222222222222','ben@example.com');
insert into profiles (id, account_type, church_name) values
  ('11111111-1111-1111-1111-111111111111','church','Grace Community Church') on conflict (id) do update set account_type=excluded.account_type, church_name=excluded.church_name;
insert into profiles (id, account_type, first_name, last_name) values
  ('22222222-2222-2222-2222-222222222222','personal','Ben','Ortiz') on conflict (id) do update set first_name=excluded.first_name, last_name=excluded.last_name;

insert into posts (id, author_id, author_name, content)
  values ('post-a','11111111-1111-1111-1111-111111111111','Grace Community Church','Sunday service was full');
\set QUIET off

\echo '--- 1. Ben likes Ana''s post -> Ana is told'
insert into post_likes (post_id, user_id) values ('post-a','22222222-2222-2222-2222-222222222222');
select type, actor_name, left(body,25) as body from notifications where user_id='11111111-1111-1111-1111-111111111111';

\echo '--- 2. Ana likes her own post -> nothing'
insert into post_likes (post_id, user_id) values ('post-a','11111111-1111-1111-1111-111111111111');
select count(*) as total_notifications from notifications;

\echo '--- 3. Ben unlikes -> the notification goes'
delete from post_likes where post_id='post-a' and user_id='22222222-2222-2222-2222-222222222222';
select count(*) as like_notifications from notifications where type='like';

\echo '--- 4. like, unlike, like again -> one row, not two'
insert into post_likes (post_id, user_id) values ('post-a','22222222-2222-2222-2222-222222222222');
delete from post_likes where post_id='post-a' and user_id='22222222-2222-2222-2222-222222222222';
insert into post_likes (post_id, user_id) values ('post-a','22222222-2222-2222-2222-222222222222');
select count(*) as like_notifications from notifications where type='like';

\echo '--- 5. likes_count actually moves now'
select likes_count from posts where id='post-a';

\echo '--- 6. Ben comments on Ana''s post -> Ana told once, as a comment'
insert into comments (id, post_id, author_id, author_name, text)
  values ('c1','post-a','22222222-2222-2222-2222-222222222222','Ben Ortiz','Praise God');
select user_id='11111111-1111-1111-1111-111111111111' as goes_to_ana, type, actor_name
  from notifications where type='comment';

\echo '--- 7. Ana replies to Ben -> Ben told (reply), Ana not told about herself'
insert into comments (id, post_id, parent_id, author_id, author_name, text)
  values ('c2','post-a','c1','11111111-1111-1111-1111-111111111111','Grace Community Church','Amen');
select type, user_id='22222222-2222-2222-2222-222222222222' as goes_to_ben, actor_name
  from notifications where type='reply';
select count(*) as ana_self_notifications from notifications
  where user_id='11111111-1111-1111-1111-111111111111'
    and actor_id='11111111-1111-1111-1111-111111111111';

\echo '--- 8. a third person replies to Ben on Ana''s post -> two people told, not one twice'
insert into auth.users (id,email) values ('33333333-3333-3333-3333-333333333333','cara@example.com');
update profiles set first_name='Cara', last_name='Diaz' where id='33333333-3333-3333-3333-333333333333';
insert into comments (id, post_id, parent_id, author_id, author_name, text)
  values ('c3','post-a','c1','33333333-3333-3333-3333-333333333333','Cara Diaz','Same here');
select type, actor_name, user_id from notifications where comment_id='c3' order by type;

\echo '--- 9. Ben follows Ana -> Ana told'
insert into connections (follower_id, target_id, target_name, target_type)
  values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Grace','user');
select type, actor_name from notifications where type='follow';

\echo '--- 10. following a Google Place ID must not crash the follow'
insert into connections (follower_id, target_id, target_name, target_type)
  values ('22222222-2222-2222-2222-222222222222','ChIJN1t_tDeuEmsRUsoyG83frY4','Some Church','church');
select count(*) as follow_notifications from notifications where type='follow';

\echo '--- 11. Ana announces -> her followers hear, she does not'
insert into posts (id, author_id, author_name, content, is_announcement)
  values ('post-b','11111111-1111-1111-1111-111111111111','Grace Community Church','Baptism Sunday', true);
select type, actor_name, user_id='22222222-2222-2222-2222-222222222222' as goes_to_ben
  from notifications where type='announcement';

\echo '--- 12. an ordinary post announces nothing'
insert into posts (id, author_id, author_name, content)
  values ('post-c','11111111-1111-1111-1111-111111111111','Grace Community Church','Coffee after service');
select count(*) as announcement_notifications from notifications where type='announcement';

\set QUIET on
create role app nologin;
grant usage on schema public to app;
grant select, insert, update, delete on notifications to app;
\set QUIET off

set role app;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- acting as Ben

\echo '--- 13. Ben sees only his own notifications'
select count(*) as bens_view, count(*) filter (where user_id <> '22222222-2222-2222-2222-222222222222') as not_his
  from notifications;

\echo '--- 14. Ben cannot forge a notification into Ana''s bell'
do $$
begin
  insert into notifications (user_id, type) values ('11111111-1111-1111-1111-111111111111','like');
  raise notice 'FAIL: the insert was allowed';
exception when insufficient_privilege then
  raise notice 'PASS: blocked by row-level security';
end $$;

\echo '--- 15. Ben cannot mark Ana''s notifications read'
with done as (update notifications set read = true
  where user_id = '11111111-1111-1111-1111-111111111111' returning 1)
select count(*) as anas_rows_ben_changed from done;

\echo '--- 16. Ben can mark his own read'
with done as (update notifications set read = true
  where user_id = '22222222-2222-2222-2222-222222222222' returning 1)
select count(*) as his_own_rows_changed from done;

\echo '--- 17. Ben cannot delete Ana''s'
with done as (delete from notifications
  where user_id = '11111111-1111-1111-1111-111111111111' returning 1)
select count(*) as anas_rows_ben_deleted from done;
reset role;
