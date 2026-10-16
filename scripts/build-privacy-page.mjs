/**
 * Builds docs/privacy.html from app/privacy.tsx.
 *
 * App Store Connect needs a public URL for the privacy policy, and reviewers
 * read it alongside the in-app screen. Keeping two hand-written copies is how
 * they end up disagreeing - and a policy that contradicts the app is worse than
 * no policy. This generates the web page from the screen, so editing the app
 * and re-running this is the only way to change either.
 *
 *   node scripts/build-privacy-page.mjs
 *
 * TWO THINGS CHANGED UNDER IT
 *
 * The screen was translated after this was written. Its paragraphs stopped
 * being English and became t('privacyP1') calls, and this went on matching
 * them: it wrote `{t('legalLastUpdated')}` onto the public privacy policy as
 * visible text, reported "11 sections" and exited zero. So the keys are now
 * resolved against the English side of the translation table, and a key that
 * does not resolve stops the run rather than being published.
 *
 * And the output moved from web/ to docs/, because GitHub Pages serves a
 * public repository's docs folder for nothing — which is what makes the URL
 * App Store Connect wants exist at all, with no domain and no host to pay for.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = readFileSync('app/privacy.tsx', 'utf8');

/**
 * key -> English, from the translation table.
 *
 * Read with a regex rather than imported, because i18n.ts is TypeScript and
 * this is a plain node script. The shape it matches is the one the whole file
 * uses: `key: { English: '…', Español: '…' }`.
 */
const i18n = readFileSync('src/lib/i18n.ts', 'utf8');
const english = new Map();
for (const m of i18n.matchAll(/(\w+):\s*\{\s*English:\s*(['"`])((?:[^\\]|\\.)*?)\2/g)) {
  english.set(m[1], m[3].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\`/g, '`'));
}
if (english.size < 100) {
  console.error(`Only ${english.size} translations parsed from src/lib/i18n.ts — the shape of that file has changed.`);
  process.exit(1);
}

const unresolved = [];
/** `{t('key')}` -> the English behind it. */
function resolveKeys(text) {
  return text.replace(/\{\s*t\(\s*['"](\w+)['"]\s*\)\s*\}/g, (_, key) => {
    if (!english.has(key)) { unresolved.push(key); return ''; }
    return english.get(key);
  });
}

const blocks = [];
const re = /<Text style=\{s\.(h2|p|updated)\}>([\s\S]*?)<\/Text>/g;
let m;
while ((m = re.exec(src)) !== null) {
  const text = resolveKeys(m[2])
    .replace(/\{'([^']*)'\}/g, '$1')   // {'…'} escapes in JSX
    .replace(/\{"([^"]*)"\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (text) blocks.push({ kind: m[1], text });
}
if (!blocks.length) {
  console.error('No policy copy found — did the markup in app/privacy.tsx change?');
  process.exit(1);
}

// Refusing rather than publishing a gap. A privacy policy missing the section
// about what other people can see is a worse outcome than a failed build.
if (unresolved.length) {
  console.error(`\n  These keys are in app/privacy.tsx but not in the translation table:`);
  for (const k of [...new Set(unresolved)]) console.error(`    ${k}`);
  console.error(`\n  Nothing written.\n`);
  process.exit(1);
}

// Any JSX left behind means a shape this does not understand, and it would be
// published as text. The old version did exactly that.
const leaked = blocks.filter(b => /[{}]/.test(b.text));
if (leaked.length) {
  console.error(`\n  Markup survived into the output, which would be published as text:`);
  for (const b of leaked) console.error(`    ${JSON.stringify(b.text.slice(0, 70))}`);
  console.error(`\n  Nothing written.\n`);
  process.exit(1);
}

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const body = blocks.map(b => {
  if (b.kind === 'updated') return `  <p class="updated">${esc(b.text)}</p>`;
  if (b.kind === 'h2')      return `  <h2>${esc(b.text)}</h2>`;
  return `  <p>${esc(b.text)}</p>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy — Four Circle</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap">
<style>
  :root { --ground:#faf9f6; --ink:#1a1a2e; --ink-2:#4a4a56; --gold:#c9a96e; --rule:#e9e5dd; }
  @media (prefers-color-scheme: dark) {
    :root { --ground:#0f0f13; --ink:#f4f2ee; --ink-2:#b4b4bf; --rule:#26262e; --gold:#d4b47e; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--ink);
    font-family: "DM Sans", ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 16px; line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 44rem; margin: 0 auto; padding: 56px 22px 96px; }
  .mark { font-size: 26px; color: var(--gold); line-height: 1; margin-bottom: 10px; }
  h1 {
    font-family: "Playfair Display", Georgia, serif; font-weight: 700;
    font-size: clamp(30px, 6vw, 40px); line-height: 1.15; margin: 0 0 6px;
  }
  .app { font-size: 14px; color: var(--ink-2); margin: 0 0 4px; }
  .updated { font-size: 13px; color: var(--ink-2); margin: 0 0 34px; }
  h2 {
    font-family: "Playfair Display", Georgia, serif; font-weight: 600;
    font-size: 20px; margin: 34px 0 8px; padding-top: 22px;
    border-top: 1px solid var(--rule);
  }
  p { margin: 0 0 14px; color: var(--ink-2); }
  a { color: var(--gold); }
  footer { margin-top: 48px; font-size: 13px; color: var(--ink-2); }
</style>
</head>
<body>
<main>
  <div class="mark">&#8224;</div>
  <h1>Privacy Policy</h1>
  <p class="app">Four Circle</p>
${body}
  <footer>This page mirrors the Privacy Policy shown inside the Four Circle app under Settings &rarr; About.</footer>
</main>
</body>
</html>
`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/privacy.html', html);
console.log(`docs/privacy.html written — ${blocks.filter(b => b.kind === 'h2').length} sections, ${html.length} bytes`);
