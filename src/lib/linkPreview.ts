export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/i;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return ''; }
    })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&apos;/g, "'");
}

function extractMeta(html: string, property: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeEntities(m[1]);
  }
  return undefined;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubePreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const videoId = getYouTubeId(url);
    return {
      url,
      title: data.title,
      description: data.author_name ? `By ${data.author_name}` : undefined,
      image: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : data.thumbnail_url,
      siteName: 'YouTube',
    };
  } catch {
    return null;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  if (/youtu\.be|youtube\.com/i.test(url)) {
    const yt = await fetchYouTubePreview(url);
    if (yt) return yt;
  }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaithFinderBot/1.0)' } });
    const html = await res.text();

    const title = extractMeta(html, 'og:title') || (html.match(/<title>([^<]+)<\/title>/i)?.[1]);
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description');
    let image = extractMeta(html, 'og:image');
    const siteName = extractMeta(html, 'og:site_name');

    if (image && image.startsWith('/')) {
      try {
        const u = new URL(url);
        image = `${u.protocol}//${u.host}${image}`;
      } catch {}
    }

    if (!title && !description && !image) return null;

    return {
      url,
      title: title ? decodeEntities(title.trim()) : undefined,
      description: description ? decodeEntities(description.trim()) : undefined,
      image,
      siteName: siteName ? decodeEntities(siteName.trim()) : undefined,
    };
  } catch {
    return null;
  }
}
