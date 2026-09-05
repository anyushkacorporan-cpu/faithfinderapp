-- ============================================================================
-- FaithFinder — more than one photo per post
--
-- A post carried a single `image`. Posts written before this column existed
-- keep it, and the app reads whichever it finds, so nothing has to be
-- rewritten and no post loses its picture.
-- ============================================================================

-- jsonb rather than text[]: the app already sends and receives json for every
-- other list on a post, and one representation is easier to reason about than
-- two.
alter table posts add column if not exists images jsonb;
