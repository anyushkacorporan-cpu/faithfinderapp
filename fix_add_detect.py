path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/translate.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "export async function translateText(text: string, targetLang: string = 'en'): Promise<TranslateResult | null> {"
new = """export async function detectLanguage(text: string): Promise<string | null> {
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

export async function translateText(text: string, targetLang: string = 'en'): Promise<TranslateResult | null> {"""
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
