import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# Step 1: Create a linkPreview utility
link_preview_util = '''export type LinkPreviewData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

const URL_REGEX = /(https?:\\/\\/[^\\s]+)/i;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
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

export async function fetchLinkPreview(url: string): Promise<LinkPreviewData | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FaithFinderBot/1.0)' } });
    const html = await res.text();

    const title = extractMeta(html, 'og:title') || (html.match(/<title>([^<]+)<\\/title>/i)?.[1]);
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
'''

with open('src/lib/linkPreview.ts', 'w', encoding='utf-8') as f:
    f.write(link_preview_util)
print('Created src/lib/linkPreview.ts')

# Step 2: Add linkUrl/linkPreview to Post type in postsStore.ts
with open('src/lib/postsStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_type = "  repostComment?: string;\n  repostsCount?: number;"
new_type = """  repostComment?: string;
  repostsCount?: number;
  linkUrl?: string;
  linkPreview?: { title?: string; description?: string; image?: string; siteName?: string };"""

if old_type in content:
    content = content.replace(old_type, new_type)
    print('Post type extended with link fields')
else:
    print('WARNING: repostsCount field not found in Post type')

old_addpost_sig = "  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;"
new_addpost_sig = "  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;\n  linkUrl?: string; linkPreview?: Post['linkPreview'];"
if old_addpost_sig in content:
    content = content.replace(old_addpost_sig, new_addpost_sig)
    print('addPost signature extended with link fields')
else:
    print('WARNING: addPost signature anchor not found')

with open('src/lib/postsStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 1 (store + util) complete')
