import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statementSuffix, DESCRIPTOR_MAX } from './functions/_shared/statementDescriptor.ts';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * payments carries this inlined rather than imported, because that function
 * is deployed by pasting one file into a browser editor and a second file
 * has to exist there before the first will bundle. That went wrong twice.
 * One file cannot half-arrive.
 *
 * So the copy is compared, not the file: everything from DESCRIPTOR_MAX to
 * the end of statementSuffix, with the two `export` keywords the shared
 * version needs and the inlined one does not.
 */
test('the copy inlined into payments has not drifted', () => {
  const grab = (src: string) => {
    const from = src.indexOf('/** Room left for this');
    const to = src.indexOf('\n}', src.indexOf('function statementSuffix'));
    assert.ok(from > -1 && to > from, 'could not find the function to compare');
    return src.slice(from, to).replace(/\bexport /g, '').trim();
  };
  const canonical = grab(readFileSync(join(here, 'functions/_shared/statementDescriptor.ts'), 'utf8'));
  const inlined = grab(readFileSync(join(here, 'functions/payments/index.ts'), 'utf8'));
  assert.equal(inlined, canonical,
    'payments/index.ts has drifted from _shared/statementDescriptor.ts — copy it across');
});

test('an ordinary name comes through readable', () => {
  assert.equal(statementSuffix('Revival'), 'REVIVAL');
});

test('it never exceeds what Stripe leaves room for', () => {
  for (const name of ['Women’s Conference 2026', 'A'.repeat(80), 'Sunday Morning Worship Service']) {
    assert.ok(statementSuffix(name).length <= DESCRIPTOR_MAX,
      `${name} produced ${statementSuffix(name).length} characters`);
  }
});

test('it cuts at a word rather than mid-word', () => {
  // "WOMENS CON" would read as a typo on a statement.
  assert.equal(statementSuffix('Womens Conference'), 'WOMENS');
});

test('a single long word is still cut, because the limit is the limit', () => {
  assert.equal(statementSuffix('Thanksgivinggathering'), 'THANKSGIVI');
});

// ── The characters that make Stripe refuse the payment ───────────────────

test('nothing Stripe bans survives', () => {
  // < > \ " and ' are rejected by Stripe, and an apostrophe is the one a
  // real church name actually contains. A payment refused over a punctuation
  // mark would be worse than the bug this fixes.
  const out = statementSuffix(`St. Mary's <b>"Big"</b> \\ Night`);
  for (const ch of ['<', '>', '\\', '"', "'"]) {
    assert.ok(!out.includes(ch), `${ch} survived in ${JSON.stringify(out)}`);
  }
});

test('an accented name keeps its letters', () => {
  // Misión must not become MISIN.
  assert.equal(statementSuffix('Misión'), 'MISION');
});

// ── When there is nothing worth sending ──────────────────────────────────

test('empty in, empty out', () => {
  for (const v of ['', '   ', null, undefined]) {
    assert.equal(statementSuffix(v as any), '');
  }
});

test('a name with no letters returns nothing rather than digits', () => {
  // Stripe requires at least one letter and refuses the payment without one.
  assert.equal(statementSuffix('2026 !!! ###'), '');
  assert.equal(statementSuffix('12345'), '');
});

test('punctuation only returns nothing', () => {
  assert.equal(statementSuffix('!!!'), '');
});
