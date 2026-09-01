/**
 * Work out a post's language without asking Google.
 *
 * `detectLanguage` was called from a `useEffect` in every TranslateRow, and a
 * TranslateRow renders under every post, every comment and every reply. Nothing
 * was remembered, so scrolling a feed of twenty posts was twenty billable
 * calls, and scrolling back up was twenty more. It was the app's only cost tied
 * to *scrolling* rather than to an action someone chose.
 *
 * The detection only ever answers one question: should we offer to translate
 * this? The app ships in English and Spanish, so distinguishing those two is
 * the whole job — and that is easy to do locally.
 *
 * Stopwords do most of the work. "Dios es bueno y su amor es eterno" contains
 * es, y, su — none of which appear in English — while an English sentence of
 * any length almost always contains the, and, is or to. Short posts and
 * emoji-only posts skip detection entirely: nobody needs "Amen!" translated,
 * and a call to establish that is a call wasted.
 */

const ES = new Set([
  'el','la','los','las','un','una','unos','unas','de','del','al','y','o','pero',
  'que','qué','como','cómo','porque','para','por','con','sin','sobre','entre',
  'es','son','está','están','ser','estar','fue','era','hay','muy','más','pero',
  'yo','tú','él','ella','nosotros','ustedes','ellos','mi','tu','su','nuestro',
  'dios','señor','jesús','cristo','iglesia','oración','fe','amén','gracias',
  'bendiciones','hermano','hermana','amor','vida','día','hoy','todos','nada',
]);

const EN = new Set([
  'the','a','an','and','or','but','that','which','because','for','with','without',
  'about','between','is','are','was','were','be','been','being','has','have','had',
  'very','more','most','i','you','he','she','we','they','my','your','his','her',
  'our','their','god','lord','jesus','christ','church','prayer','faith','amen',
  'thanks','blessings','brother','sister','love','life','day','today','all','not',
  'this','of','to','in','on','at','it','so','just','from','will','can','out','up',
]);

/** Accented characters and punctuation that only Spanish uses here. */
const ES_CHARS = /[ñáéíóúü¿¡]/i;

export type Guess = 'en' | 'es' | null;

/**
 * The language of a piece of text, or null when it is genuinely unclear and
 * worth asking Google about.
 */
export function guessLanguage(text: string): Guess {
  const t = (text || '').trim();

  // Too short to be worth translating, whatever it is. This alone removes most
  // comments — "Amen!", "🙏", "So true".
  if (t.replace(/[^\p{L}]/gu, '').length < 12) return null;

  if (ES_CHARS.test(t)) return 'es';

  const words = t.toLowerCase().match(/[\p{L}']+/gu) || [];
  if (words.length < 3) return null;

  let es = 0, en = 0;
  for (const w of words) {
    if (ES.has(w)) es++;
    if (EN.has(w)) en++;
  }

  // A clear margin, not a bare majority: one shared word should not decide it.
  // Below this the caller falls through to the API, which is the right place
  // for genuinely ambiguous text.
  if (es >= 2 && es > en) return 'es';
  if (en >= 2 && en > es) return 'en';
  return null;
}

/**
 * Whether this text is worth spending an API call on at all.
 *
 * Emoji, punctuation and very short posts never are — and they are a large
 * share of what people write in a comment thread.
 */
export function worthDetecting(text: string): boolean {
  return (text || '').replace(/[^\p{L}]/gu, '').length >= 12;
}
