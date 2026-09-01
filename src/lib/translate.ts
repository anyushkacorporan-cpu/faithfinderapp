import { load, save } from './persist';
import { guessLanguage, worthDetecting } from './languageGuess';

const API_KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

export type TranslateResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
};

/**
 * Detections already made, kept between launches.
 *
 * The language of a given piece of text never changes, so this has no TTL —
 * an answer from last week is as good as one from a second ago. Keyed by a
 * hash rather than the text itself so the stored object stays small; a
 * collision would mislabel one post's language, which is not worth a byte more
 * to prevent.
 */
const DETECT_KEY = 'faithfinder_lang_detect_v1';
const MAX_ENTRIES = 500;

let detected: Record<string, string> = {};
load<Record<string, string>>(DETECT_KEY, v => { detected = v || {}; });

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h);
}

function remember(key: string, lang: string) {
  detected[key] = lang;
  // Unbounded growth in a store that is read at startup is its own problem.
  // Oldest-first is not available here, so drop the earliest inserted.
  const keys = Object.keys(detected);
  if (keys.length > MAX_ENTRIES) {
    for (const k of keys.slice(0, keys.length - MAX_ENTRIES)) delete detected[k];
  }
  save(DETECT_KEY, detected);
}

/**
 * The language of some text.
 *
 * Three steps, cheapest first: what we already worked out, then a local guess,
 * then — only for text that is long enough to matter and ambiguous enough to
 * need it — Google. This used to be step three alone, on every render.
 */
export async function detectLanguage(text: string): Promise<string | null> {
  if (!text || !text.trim()) return null;

  const key = hash(text);
  if (detected[key]) return detected[key];

  // Not worth a network call, let alone a billable one.
  if (!worthDetecting(text)) return null;

  const guess = guessLanguage(text);
  if (guess) {
    remember(key, guess);
    return guess;
  }

  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });
    const data = await res.json();
    const lang = data?.data?.detections?.[0]?.[0]?.language || null;
    if (lang) remember(key, lang);
    return lang;
  } catch {
    return null;
  }
}

export async function translateText(text: string, targetLang: string = 'en'): Promise<TranslateResult | null> {
  if (!text || !text.trim()) return null;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, target: targetLang, format: 'text' }),
    });
    const data = await res.json();
    const translation = data?.data?.translations?.[0];
    if (!translation) return null;
    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage,
    };
  } catch {
    return null;
  }
}
