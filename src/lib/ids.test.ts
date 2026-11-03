/**
 * Identifiers, which have to survive reaching Postgres.
 *
 * newId() exists because every store used Date.now().toString(), which gives
 * two objects created in the same millisecond the same id. These are real
 * UUIDs so they drop into a `uuid` column; a malformed one is a failed insert,
 * so the shape is worth pinning.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newId, newShortCode } from './ids.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('newId returns something Postgres will accept as a uuid', () => {
  for (let i = 0; i < 500; i++) {
    const id = newId();
    assert.match(id, UUID_V4, `not a v4 uuid: ${id}`);
  }
});

test('newId does not repeat itself', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 5000; i++) seen.add(newId());
  assert.equal(seen.size, 5000);
});

test('a short code is readable aloud', () => {
  // No I, O, 0 or 1: these get read out at a door and typed back in.
  const ambiguous = /[IO01]/;
  for (let i = 0; i < 500; i++) {
    const code = newShortCode();
    assert.equal(code.length, 8);
    assert.doesNotMatch(code, ambiguous, `ambiguous character in ${code}`);
    assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  }
});

test('a prefixed short code keeps its prefix and its length', () => {
  const code = newShortCode('FC');
  assert.match(code, /^FC-[A-HJ-NP-Z2-9]{8}$/);
});
