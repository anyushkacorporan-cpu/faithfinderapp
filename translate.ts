const API_KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

export type TranslateResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
};

// Calls Google Cloud Translation API v2. Requires the Cloud Translation API
// to be enabled on the same Google Cloud project as the Places API key above.
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
