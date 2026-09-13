import { load, save } from './persist';
import { guessLanguage, worthDetecting } from './languageGuess';

import { GOOGLE_API_KEY, googleHeaders } from './googleConfig';
const API_KEY = GOOGLE_API_KEY;

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

  if (alreadyRefused()) return null;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${API_KEY}`, {
      method: 'POST',
      headers: googleHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ q: text }),
    });
    const data = await res.json();
    if (!res.ok) { translateFailed('detect a language', res.status, data); return null; }
    const lang = data?.data?.detections?.[0]?.[0]?.language || null;
    if (lang) remember(key, lang);
    return lang;
  } catch {
    return null;
  }
}

/**
 * Say when Google refused, rather than returning null and leaving the Translate
 * button looking like it does nothing.
 */
/**
 * Stop asking once the answer is no.
 *
 * Translation is refused outright on a project with no billing account, and the
 * feed calls language detection once per post. Seven posts meant seven refused
 * requests and seven identical warnings, on every load, for a service that had
 * already said it would not serve this app. The log became something to scroll
 * past, which is the opposite of why it was added.
 *
 * A refusal is remembered for the life of the process. It resets on restart, so
 * attaching billing and reopening the app is enough to start it working — there
 * is no state to clear and nothing to remember to undo.
 *
 * Only refusals count. A dropped connection or a timeout is not the service
 * declining, and one bad moment should not turn the feature off for the session.
 */
let refused: string | null = null;

function translateFailed(what: string, status: number, body: any): void {
  const message = body?.error?.message || 'unknown error';

  // 401 and 403 are the service declining: a key it will not accept, or a
  // project it will not serve. Anything else — a 500, a gateway timeout — is a
  // bad moment rather than an answer, and latching on one would turn the
  // feature off for the session over something that fixes itself.
  const declined = status === 401 || status === 403;

  if (!declined) {
    console.warn(`[google] could not ${what}: ${message}`);
    return;
  }
  if (refused) return;                       // already said, once is enough
  refused = message;
  console.warn(`[google] could not ${what}: ${message}`);
  console.warn('[google] translation is off for this session; it will try again after a restart.');
}

/** Whether Google has already turned this app away this session. */
function alreadyRefused(): boolean {
  return refused !== null;
}

export async function translateText(text: string, targetLang: string = 'en'): Promise<TranslateResult | null> {
  if (!text || !text.trim()) return null;
  if (alreadyRefused()) return null;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`, {
      method: 'POST',
      headers: googleHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ q: text, target: targetLang, format: 'text' }),
    });
    const data = await res.json();
    if (!res.ok) { translateFailed('translate', res.status, data); return null; }
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
