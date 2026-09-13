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

-- ── Capacity close-out ──────────────────────────────────────────────────────

\echo '--- 18. an event with capacity 2 accepts two seats'
insert into events (id, organizer_id, title, capacity, date, time, location)
  values ('user_cap', '11111111-1111-1111-1111-111111111111', 'Small Room', 2,
          'Oct 1, 2026', '7:00 PM', 'Brooklyn');
insert into tickets (id, event_id, buyer_id, event_title, event_date, event_location,
                     event_type, quantity, price_per_ticket, total_paid, platform_fee, ticket_codes)
  values ('t1','user_cap','22222222-2222-2222-2222-222222222222','Small Room','Oct 1','Brooklyn','Other',2,0,0,0,'{TKT-1,TKT-2}');
select capacity, tickets_sold from events where id='user_cap';

\echo '--- 19. the third seat is refused, and says how many are left'
do $$
begin
  insert into tickets (id, event_id, buyer_id, event_title, event_date, event_location,
                       event_type, quantity, price_per_ticket, total_paid, platform_fee, ticket_codes)
  values ('t2','user_cap','33333333-3333-3333-3333-333333333333','Small Room','Oct 1','Brooklyn','Other',1,0,0,0,'{TKT-3}');
  raise notice 'FAIL: the sale was allowed past capacity';
exception when check_violation then
  raise notice 'PASS: refused — %', sqlerrm;
end $$;

\echo '--- 20. the count did not move on the refused sale'
select tickets_sold from events where id='user_cap';

\echo '--- 21. capacity 0 means no limit'
insert into events (id, organizer_id, title, capacity, date, time, location)
  values ('user_nolimit', '11111111-1111-1111-1111-111111111111', 'Open Door', 0,
          'Oct 2, 2026', '7:00 PM', 'Queens');
insert into tickets (id, event_id, buyer_id, event_title, event_date, event_location,
                     event_type, quantity, price_per_ticket, total_paid, platform_fee, ticket_codes)
  values ('t3','user_nolimit','22222222-2222-2222-2222-222222222222','Open Door','Oct 2','Queens','Other',500,0,0,0,'{TKT-4}');
select tickets_sold as five_hundred_seats_sold_with_no_limit from events where id='user_nolimit';

-- ── Preferences the database can see (15_notification_prefs.sql) ────────────

\echo '--- 22. Ana turns Likes off; Ben likes her post; no row is written'
update profiles set notification_prefs = '{"likes": false}'::jsonb
  where id = '11111111-1111-1111-1111-111111111111';
insert into posts (id, author_id, author_name, content)
  values ('post-p','11111111-1111-1111-1111-111111111111','Grace','Prefs test');
insert into post_likes (post_id, user_id) values ('post-p','22222222-2222-2222-2222-222222222222');
select count(*) as like_rows_for_ana from notifications
  where user_id='11111111-1111-1111-1111-111111111111' and post_id='post-p' and type='like';

\echo '--- 23. Comments still on, so a comment does arrive'
insert into comments (id, post_id, author_id, author_name, text)
  values ('cp1','post-p','22222222-2222-2222-2222-222222222222','Ben','Nice');
select count(*) as comment_rows_for_ana from notifications
  where user_id='11111111-1111-1111-1111-111111111111' and post_id='post-p' and type='comment';

\echo '--- 24. turn Likes back on; the next like is written'
update profiles set notification_prefs = '{"likes": true}'::jsonb
  where id = '11111111-1111-1111-1111-111111111111';
delete from post_likes where post_id='post-p';
insert into post_likes (post_id, user_id) values ('post-p','33333333-3333-3333-3333-333333333333');
select count(*) as like_rows_after_reenabling from notifications
  where user_id='11111111-1111-1111-1111-111111111111' and post_id='post-p' and type='like';

\echo '--- 25. a profile that never saved preferences still gets everything'
select wants_notification('22222222-2222-2222-2222-222222222222','likes') as absent_means_on;

\echo '--- 26. announcements: a follower with the switch off is skipped'
update profiles set notification_prefs = '{"announcements": false}'::jsonb
  where id = '22222222-2222-2222-2222-222222222222';
insert into posts (id, author_id, author_name, content, is_announcement)
  values ('post-ann2','11111111-1111-1111-1111-111111111111','Grace','Second announcement', true);
select count(*) as announcement_rows_for_ben from notifications
  where user_id='22222222-2222-2222-2222-222222222222' and post_id='post-ann2';

-- ── Saved events and hidden posts (16_saved_and_hidden.sql) ─────────────────

\echo '--- 27. an id with nothing behind it still saves (no foreign key)'
insert into saved_events (user_id, event_id)
  values ('22222222-2222-2222-2222-222222222222','seeded-demo-event-3');
insert into hidden_posts (user_id, post_id)
  values ('22222222-2222-2222-2222-222222222222','offline-post-not-uploaded');
select (select count(*) from saved_events) as saved,
       (select count(*) from hidden_posts) as hidden;

\echo '--- 28. saving the same event twice is one row'
insert into saved_events (user_id, event_id)
  values ('22222222-2222-2222-2222-222222222222','seeded-demo-event-3')
  on conflict (user_id, event_id) do nothing;
select count(*) as still_one from saved_events
  where event_id = 'seeded-demo-event-3';

\echo '--- 29. Ana cannot see or touch what Ben saved or hid'
set role app;
grant usage on schema public to app;
reset role;
grant select, insert, update, delete on saved_events, hidden_posts to app;
set role app;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Ana
select (select count(*) from saved_events) as anas_view_of_saved,
       (select count(*) from hidden_posts) as anas_view_of_hidden;
do $$
begin
  insert into saved_events (user_id, event_id)
    values ('22222222-2222-2222-2222-222222222222','sneaky');
  raise notice 'FAIL: Ana saved something onto Ben''s account';
exception when insufficient_privilege then
  raise notice 'PASS: blocked by row-level security';
end $$;
reset role;

-- ── The other five kinds (17_more_notifications.sql) ────────────────────────

\set QUIET on
reset request.jwt.claim.sub;   -- test 29 left Ana signed in
-- Test 26 turned Ben's Announcements switch off and left it off; these tests
-- are about the new kinds, so everybody starts with everything on again.
update profiles set notification_prefs = '{}'::jsonb;
delete from notifications;
\set QUIET off

\echo '--- 30. Ben reposts Ana''s post -> Ana is told, as a share'
insert into posts (id, author_id, author_name, content, repost_of)
  values ('post-r1','22222222-2222-2222-2222-222222222222','Ben Ortiz','',
          '{"id":"post-a"}'::jsonb);
select type, actor_name, user_id='11111111-1111-1111-1111-111111111111' as goes_to_ana
  from notifications where type='share';

\echo '--- 31. Ana reposts her own post -> no second share, only Ben''s'
insert into posts (id, author_id, author_name, author_type, content, repost_of)
  values ('post-r2','11111111-1111-1111-1111-111111111111','Grace','church','',
          '{"id":"post-a"}'::jsonb);
select count(*) as share_notifications_still from notifications where type='share';

\echo '--- 32. Ana (a church Ben follows) posts -> Ben gets a church update'
insert into posts (id, author_id, author_name, author_type, content)
  values ('post-cu','11111111-1111-1111-1111-111111111111','Grace','church','Youth night Friday');
select type, user_id='22222222-2222-2222-2222-222222222222' as goes_to_ben, left(body,20) as body
  from notifications where post_id='post-cu';

\echo '--- 33. an announcement is an announcement, not also a church update'
insert into posts (id, author_id, author_name, author_type, content, is_announcement)
  values ('post-cu2','11111111-1111-1111-1111-111111111111','Grace','church','Building fund', true);
select type, count(*) from notifications where post_id='post-cu2' group by type;

\echo '--- 34. Ana turns Shares off -> Ben reposting her again tells her nothing'
\set QUIET on
delete from notifications;
\set QUIET off
update profiles set notification_prefs = '{"shares": false}'::jsonb
  where id='11111111-1111-1111-1111-111111111111';
insert into posts (id, author_id, author_name, content, repost_of)
  values ('post-r3','22222222-2222-2222-2222-222222222222','Ben Ortiz','',
          '{"id":"post-cu"}'::jsonb);
select count(*) as share_notifications from notifications where type='share';
\set QUIET on
update profiles set notification_prefs = '{}'::jsonb
  where id='11111111-1111-1111-1111-111111111111';
delete from notifications;
\set QUIET off

\echo '--- 35/36. Ana adds an event -> Ben (follows her) and Cara (lives there) told'
\set QUIET on
update profiles set location='Austin, TX' where id='33333333-3333-3333-3333-333333333333';
update profiles set location='Dallas, TX' where id='22222222-2222-2222-2222-222222222222';
\set QUIET off
insert into events (id, organizer_id, title, city, state)
  values ('user_ev1','11111111-1111-1111-1111-111111111111','Worship Night','Austin','TX');
select type, left(body,20) as body,
       (user_id='22222222-2222-2222-2222-222222222222') as ben,
       (user_id='33333333-3333-3333-3333-333333333333') as cara
  from notifications where event_id='user_ev1' order by ben desc;

\echo '--- 37. a draft tells nobody; publishing it does'
insert into events (id, organizer_id, title, city, state, status)
  values ('user_ev2','11111111-1111-1111-1111-111111111111','Quiet Plan','Austin','TX','draft');
select count(*) as while_draft from notifications where event_id='user_ev2';
update events set status='upcoming' where id='user_ev2';
select count(*) as after_publishing from notifications where event_id='user_ev2';

\echo '--- 38. Ben invites Cara -> Cara told, Ben not'
insert into event_invites (event_id, event_title, inviter_id, invitee_id)
  values ('user_ev1','Worship Night','22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333');
select type, actor_name, user_id='33333333-3333-3333-3333-333333333333' as goes_to_cara
  from notifications where type='invite';

\echo '--- 39. inviting the same person to the same event twice -> still one'
insert into event_invites (event_id, event_title, inviter_id, invitee_id)
  values ('user_ev1','Worship Night','22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333')
  on conflict do nothing;
select count(*) as invite_notifications from notifications where type='invite';

\echo '--- 40. a church cannot verify itself'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Ana
update profiles set verification_status='approved'
  where id='11111111-1111-1111-1111-111111111111';
select verification_status as after_self_approval from profiles
  where id='11111111-1111-1111-1111-111111111111';

\echo '--- 41. ...but may submit a claim, which tells nobody yet'
update profiles set verification_status='pending'
  where id='11111111-1111-1111-1111-111111111111';
select verification_status as after_claim,
       (select count(*) from notifications where type='verification') as told
  from profiles where id='11111111-1111-1111-1111-111111111111';

\echo '--- 42. the review approves it -> Ana is told'
reset request.jwt.claim.sub;   -- the SQL editor, where review happens
update profiles set verification_status='approved'
  where id='11111111-1111-1111-1111-111111111111';
select type, body, user_id='11111111-1111-1111-1111-111111111111' as goes_to_ana
  from notifications where type='verification';
