#!/usr/bin/env node
/**
 * Is the Spanish app actually in Spanish? — a repeatable answer.
 *
 * The app translates in two ways. Named keys go through t('signIn'), and raw
 * English goes through tx('Bible Study'), which looks the string up in a
 * reverse index built from the table's English values. Both fail silently:
 * t() falls back to the key, tx() returns whatever it was handed. So a string
 * nobody wired up looks completely normal in English and is simply English in
 * the Spanish app, on a screen no one thought to re-open with the language
 * switched.
 *
 * Walking the app by hand found 88 of those. This finds them without walking.
 * It reads every .tsx under app/ and src/, pulls out the literals a person
 * would actually read, and reports the ones with no entry in the table.
 *
 *   node scripts/check-spanish.mjs           report
 *   node scripts/check-spanish.mjs --all     also list what IS covered
 *
 * Exits non-zero when something is uncovered, so it can gate a commit.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const showAll = process.argv.includes('--all');

const ok   = s => console.log(`  \x1b[32m✓\x1b[0m ${s}`);
const bad  = s => console.log(`  \x1b[31m✗\x1b[0m ${s}`);
const head = s => console.log(`\n\x1b[1m${s}\x1b[0m`);

// ── The table ──────────────────────────────────────────────────────────────

/**
 * Read the table by evaluating it, not by matching lines.
 *
 * A line-based regex missed every multi-line entry, which is how the legal
 * screens are written — and then reported all 51 of their keys as untranslated
 * when they had been translated all along. A checker that cries wolf is worse
 * than no checker, so this takes the object literal and evaluates it: whatever
 * the table actually holds is what gets checked.
 */
const i18nSrc = readFileSync('src/lib/i18n.ts', 'utf8');
const open_ = i18nSrc.indexOf('{', i18nSrc.indexOf('const translations'));
let depth = 0, close = -1;
for (let i = open_; i < i18nSrc.length; i++) {
  if (i18nSrc[i] === '{') depth++;
  else if (i18nSrc[i] === '}' && --depth === 0) { close = i; break; }
}
if (close < 0) { console.error('could not find the translations object'); process.exit(2); }
const table = new Function(`return ${i18nSrc.slice(open_, close + 1)}`)();
const entries = Object.entries(table).map(([key, v]) => ({ key, en: v.English, es: v['Español'] }));

const byKey     = new Map(entries.map(e => [e.key, e]));
const byEnglish = new Map(entries.map(e => [e.en, e]));

head(`Translation table`);
ok(`${entries.length} entries parsed from src/lib/i18n.ts`);

// A declared entry whose Spanish is the same as its English is usually a gap,
// but sometimes the word genuinely does not change. Only the unexpected ones
// are worth a line.
const SAME_IN_BOTH = new Set(['Total', 'Spam', 'Festival', 'Instagram', 'OK']);
const untranslated = entries.filter(e => e.en === e.es && !SAME_IN_BOTH.has(e.en));
if (untranslated.length) {
  for (const e of untranslated) bad(`${e.key} has no Spanish: ${JSON.stringify(e.en)}`);
} else {
  ok('every entry has a distinct Spanish value');
}

// ── Strings the app shows but never translates ─────────────────────────────

/**
 * Not everything in quotes is copy.
 *
 * Brand names, example addresses and real contact details must survive
 * untranslated — "support@faithfinderapp.com" in Spanish is still
 * support@faithfinderapp.com. Anything listed here is deliberate, so a new
 * untranslated string cannot hide behind a blanket rule.
 */
const LEAVE_IN_ENGLISH = new Set([
  'FaithFinder', 'FaithFinder App',
  'support@faithfinderapp.com',
  'you@example.com', 'pastor@yourchurch.org', 'info@yourchurch.org',
  'www.yourchurch.org',
  'New York', 'NY', 'Bronx, NY',
  'Version 1.0.0',
]);

const skip = /^[\s\d\W]*$/;
const technical = s =>
  /^[a-z0-9-]+$/.test(s) ||                  // icon names, style tokens
  /^(#|https?:|\/\/|\.|@)/.test(s) ||
  /^[a-z]+([A-Z][a-z]+)+$/.test(s) ||        // camelCase identifiers
  /^\d/.test(s);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const files = [...walk('app'), ...walk('src')].sort();
const missing = [];
let covered = 0;

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;

    const seen = [];
    for (const m of line.matchAll(/>([^<>{}\n]*[A-Za-z][^<>{}\n]*)</g)) seen.push(['text', m[1].trim()]);

    /**
     * Words sharing a text node with an expression, like
     * `<Text>{n} churches found</Text>`. The plain pattern above stops at { and
     * }, so anything sitting next to a count, a name or a date was invisible to
     * this check — which is how "churches found" survived it.
     *
     * Both halves need care. `>` also opens the arrow in `=>`, so a loose
     * version of this reported `StyleSheet.create(` and `router.push(` as
     * untranslated copy, 85 times. `codeish` is what separates prose from the
     * source it sits in: real copy has a space in it and does not carry
     * brackets, assignment or semicolons.
     */
    const codeish = (t) => !/ /.test(t) || /[()[\]=;]|\.[A-Za-z]/.test(t);
    if (line.includes('<Text') || line.includes('</Text>')) {
      for (const m of line.matchAll(/\}([^<>{}\n]*[A-Za-z]{2}[^<>{}\n]*)</g)) {
        const t = m[1].trim(); if (!codeish(t)) seen.push(['text-with-expr', t]);
      }
      for (const m of line.matchAll(/>([^<>{}\n]*[A-Za-z]{2}[^<>{}\n]*)\{/g)) {
        const t = m[1].trim(); if (!codeish(t)) seen.push(['text-with-expr', t]);
      }
    }
    for (const m of line.matchAll(
      /\b(placeholder|title|label|hint|accessibilityLabel|accessibilityHint)=(?:"([^"]*)"|'([^']*)')/g,
    )) seen.push([m[1], (m[2] ?? m[3]).trim()]);

    for (const [kind, text] of seen) {
      if (!text || skip.test(text) || technical(text)) continue;
      if (!/[A-Za-z]{2}/.test(text)) continue;
      if (LEAVE_IN_ENGLISH.has(text)) continue;
      // A required field is written "Street Address *" and looked up without
      // the asterisk — it is punctuation, and the same punctuation in Spanish,
      // so the table holds the words once. Check the same way the screens do,
      // or every required label reads as a gap that must not be filled.
      const lookup = text.replace(/ \*$/, '');
      if (byEnglish.has(text) || byEnglish.has(lookup)) {
        covered++; if (showAll) ok(`${f}:${i + 1} ${JSON.stringify(text)}`); continue;
      }
      missing.push({ f, ln: i + 1, kind, text });
    }
  });
}

head('Literals in the screens');
ok(`${covered} already have an entry`);
if (missing.length) {
  bad(`${missing.length} do not:`);
  let last = '';
  for (const m of missing) {
    if (m.f !== last) { console.log(`\n    ${m.f}`); last = m.f; }
    console.log(`      ${String(m.ln).padStart(4)}  [${m.kind}]  ${JSON.stringify(m.text)}`);
  }
} else {
  ok('nothing untranslated');
}

// ── Errors built outside a component ───────────────────────────────────────

/**
 * src/lib/auth.ts is where a wrong password becomes a sentence. It is not a
 * component, so it cannot call t() — it returns English and the screens pass
 * that through tx(). That only works while every sentence it can return has
 * an entry, and nothing but this check enforces it.
 */
head('src/lib/auth.ts error messages');
const authSrc = readFileSync('src/lib/auth.ts', 'utf8');
const authStrings = [...authSrc.matchAll(/return\s+'([A-Z][^']*)'/g)].map(m => m[1])
  .concat([...authSrc.matchAll(/^const TIMEOUT_MESSAGE\s*=\s*\n?\s*'([^']*)'/gm)].map(m => m[1]));
const authMissing = [...new Set(authStrings)].filter(s => !byEnglish.has(s));
if (authMissing.length) {
  bad(`${authMissing.length} of ${new Set(authStrings).size} would show in English:`);
  for (const s of authMissing) console.log(`      ${JSON.stringify(s)}`);
} else {
  ok(`all ${new Set(authStrings).size} have an entry`);
}

// ── Keys named in the screens that the table does not have ─────────────────

head("t('…') keys with no entry");
const keyed = new Set();
for (const f of files) {
  for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([A-Za-z0-9_]+)'\s*\)/g)) keyed.add(m[1]);
}
const unknownKeys = [...keyed].filter(k => !byKey.has(k));
if (unknownKeys.length) {
  bad(`${unknownKeys.length} would render as the key itself: ${unknownKeys.join(', ')}`);
} else {
  ok(`all ${keyed.size} keys resolve`);
}

const failures = untranslated.length + missing.length + authMissing.length + unknownKeys.length;
console.log('');
if (failures) {
  console.log(`\x1b[31m  ${failures} thing(s) would show English in the Spanish app.\x1b[0m\n`);
  process.exit(1);
}
console.log('\x1b[32m  The Spanish app is Spanish.\x1b[0m\n');
