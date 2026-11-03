/**
 * The sample-data filter, which has to be exactly as aggressive as it is.
 *
 * Too loose and the invented events come back on a device that already saved
 * them. Too broad and it silently deletes somebody's real event. The id-and-
 * name pairing is what keeps it narrow, so that is what is tested: a short id
 * alone must not be enough, and a matching title alone must not be enough.
 *
 * Written once as a throwaway while building the filter, where it caught a
 * wrong assumption and was then lost. Kept this time.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripSampleEvents, stripSamplePosts, stripSampleConnections,
} from './purgeSampleData.ts';

test('the five seeded events go, a real one stays', () => {
  const stored = [
    { id: '1', title: 'Women of Purpose Conference' },
    { id: '2', title: 'NYC Gospel Music Festival' },
    { id: '3', title: 'Faith & Finance Workshop' },
    { id: '4', title: 'Passion Conference 2026' },
    { id: '5', title: 'Red Rocks Worship Night' },
    { id: 'user_1761350000000', title: 'My Real Event' },
  ];
  assert.deepEqual(
    stripSampleEvents(stored).map(e => e.id),
    ['user_1761350000000'],
  );
});

test('a short id is not enough to delete something', () => {
  // Somebody's real event that happens to be stored under id '3'.
  assert.deepEqual(
    stripSampleEvents([{ id: '3', title: 'Our Youth Night' }]).map(e => e.id),
    ['3'],
  );
});

test('a matching title is not enough either', () => {
  // A real event genuinely named the same thing as a seeded one.
  assert.deepEqual(
    stripSampleEvents([{ id: 'user_9', title: 'Passion Conference 2026' }])
      .map(e => e.id),
    ['user_9'],
  );
});

test('all six seeded posts go, a real post stays', () => {
  const posts = [
    { id: '1', authorName: 'Grace Community Church' },
    { id: '2', authorName: 'Pastor Michael Johnson' },
    { id: '3', authorName: 'Faith Tabernacle NYC' },
    { id: '4', authorName: 'Blessing Okafor' },
    { id: '5', authorName: 'Brooklyn Gospel Choir' },
    { id: '6', authorName: 'Carlos Rivera' },
    { id: 'b1f2c3d4-aaaa-4bbb-8ccc-ddddeeeeffff', authorName: 'Anyushka' },
  ];
  assert.deepEqual(stripSamplePosts(posts).map(p => p.authorName), ['Anyushka']);
});

test('the two demo follows go, a real church follow stays', () => {
  // The real one carries a Places id and the same name — only the seeded id
  // may match.
  assert.deepEqual(
    stripSampleConnections([
      { id: 'grace-community', name: 'Grace Community Church' },
      { id: 'pastor-mike', name: 'Pastor Michael Johnson' },
      { id: 'ChIJL-v7OcmWwoARLWQTr2JBIgw', name: 'Grace Community Church' },
    ]).map(c => c.id),
    ['ChIJL-v7OcmWwoARLWQTr2JBIgw'],
  );
});

test('nothing in, nothing out', () => {
  assert.deepEqual(stripSampleEvents([]), []);
  assert.deepEqual(stripSamplePosts([]), []);
  assert.deepEqual(stripSampleConnections([]), []);
});

test('a record missing its fields is kept, not thrown on', () => {
  // Storage can hold anything an older build wrote. A filter that throws here
  // takes the whole hydrate down with it and the app opens empty.
  assert.equal(stripSamplePosts([{} as never]).length, 1);
  assert.equal(stripSampleEvents([{ id: undefined } as never]).length, 1);
  assert.equal(stripSampleConnections([{ name: 'x' } as never]).length, 1);
});
