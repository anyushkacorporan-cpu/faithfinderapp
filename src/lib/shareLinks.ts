/**
 * Deep linking + share text helpers for FaithFinder.
 *
 * CURRENT STATE: links use the app's custom URL scheme (faithfinder://...).
 * This works TODAY when the app is already installed (tapping the link on a
 * device that has FaithFinder opens directly to that church/event).
 *
 * NOT YET AVAILABLE: "deferred deep linking" - opening the App Store first,
 * then automatically landing on the right church/event after install. That
 * requires the app to be published, a verified domain with Apple App Site
 * Association / Android Asset Links files, and a link-routing backend
 * (e.g. Branch.io, or a custom server). None of that exists yet, so we do
 * not claim to support it. Once the app is live and a domain is ready, swap
 * FAITHFINDER_SCHEME-based links below for https://faithfinderapp.com/... 
 * Universal Links and wire a redirect service.
 */

const FAITHFINDER_SCHEME = 'faithfinder';

export function getChurchDeepLink(churchId: string): string {
  return `${FAITHFINDER_SCHEME}://church/${encodeURIComponent(churchId)}`;
}

export function getEventDeepLink(eventId: string): string {
  return `${FAITHFINDER_SCHEME}://event/${encodeURIComponent(eventId)}`;
}

export function buildChurchShareText(opts: {
  name: string;
  description?: string;
  churchId: string;
}): string {
  const link = getChurchDeepLink(opts.churchId);
  const parts = [`Check out ${opts.name} on FaithFinder!`];
  if (opts.description) parts.push(opts.description);
  parts.push(link);
  return parts.join('\n\n');
}

export function buildEventShareText(opts: {
  title: string;
  date?: string;
  location?: string;
  description?: string;
  eventId: string;
}): string {
  const link = getEventDeepLink(opts.eventId);
  const whenWhere = [opts.date, opts.location].filter(Boolean).join(' at ');
  const parts = [`${opts.title}${whenWhere ? ' — ' + whenWhere : ''}`];
  if (opts.description) parts.push(opts.description);
  parts.push('Join me on FaithFinder!');
  parts.push(link);
  return parts.join('\n\n');
}

/**
 * Build the text handed to the OS share sheet for a feed post.
 *
 * This MUST never return an empty string. `Share.share()` on iOS rejects when
 * `message` is empty and there is no `url`, and every call site swallows that
 * rejection with `.catch(() => {})` — so an empty message makes the Share
 * button look completely dead. Posts that are only an event card, only a
 * church card, or only an image have `content === ''`, and reposts store their
 * caption in `repostComment` with `content` left blank, so falling back to
 * `post.content` alone is not enough.
 */
export function buildPostShareText(post: {
  authorName?: string;
  content?: string;
  repostComment?: string;
  image?: string;
  linkUrl?: string;
  eventShareData?: { id?: string; title?: string; date?: string; location?: string };
  churchShareData?: { id?: string; placeId?: string; name?: string; address?: string };
  repostOf?: {
    authorName?: string;
    content?: string;
    image?: string;
    eventShareData?: { id?: string; title?: string; date?: string; location?: string };
    churchShareData?: { id?: string; placeId?: string; name?: string; address?: string };
  };
} | null | undefined): string {
  if (!post) return 'Check this out on FaithFinder!';

  // A repost shows the original post's card, so share the original.
  const source = post.repostOf ?? post;
  const author = (source.authorName || post.authorName || '').trim();

  const ev = source.eventShareData;
  if (ev?.title) {
    return buildEventShareText({
      title: ev.title,
      date: ev.date,
      location: ev.location,
      eventId: ev.id || ev.title,
    });
  }

  const ch = source.churchShareData;
  if (ch?.name) {
    return buildChurchShareText({
      name: ch.name,
      description: ch.address,
      churchId: ch.placeId || ch.id || ch.name,
    });
  }

  // Plain post: prefer the body, then the repost caption, then the link.
  // The caption on a repost belongs to the reposter, not the original author.
  const originalBody = (source.content || '').trim();
  if (originalBody) {
    return author ? `${author}: ${originalBody}\n\nSeen on FaithFinder` : originalBody;
  }
  const caption = (post.repostComment || '').trim();
  if (caption) {
    const reposter = (post.authorName || '').trim();
    return reposter ? `${reposter}: ${caption}\n\nSeen on FaithFinder` : caption;
  }

  if (post.linkUrl) return `${post.linkUrl}\n\nSeen on FaithFinder`;
  if (source.image) {
    return author
      ? `${author} shared a photo on FaithFinder`
      : 'Check out this photo on FaithFinder!';
  }

  return author
    ? `Check out ${author}'s post on FaithFinder!`
    : 'Check this out on FaithFinder!';
}
