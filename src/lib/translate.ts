const API_KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

export type TranslateResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
};

export async function detectLanguage(text: string): Promise<string | null> {
  if (!text || !text.trim()) return null;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });
    const data = await res.json();
    return data?.data?.detections?.[0]?.[0]?.language || null;
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
