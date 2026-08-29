import { logActivity, removeActivityByPost } from './activityStore';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from './ids';
import { getUser } from './userStore';
import { publishProfile } from './profilesStore';
import { getConnections } from './connectionsStore';

const POSTS_KEY = 'faithfinder_posts_v1';

export type Reply = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
  city?: string;
  state?: string;
};

export type Comment = {
  id: string;
  author: string;
  /** Stable id of the author, so "is this mine?" never compares display names. */
  authorId?: string;
  initials: string;
  color: string;
  text: string;
  /** An optional photo, the same as a post can carry. */
  image?: string;
  time: string;
  likes: number;
  liked: boolean;
  city?: string;
  state?: string;
  /** Set once edited, so the comment can say so rather than changing silently. */
  edited?: boolean;
  /** The post's author may pin one comment to the top. */
  pinned?: boolean;
  /** Reports filed against this comment, alongside the ones filed on posts. */
  reports?: { id: string; reason: string; reportedBy: string; time: string }[];
  replies: Reply[];
};

export type EventShareData = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  type: string;
  price: string;
  organizer?: string;
  bannerImage?: string;
  bannerColor?: [string, string];
};

export type ChurchShareData = {
  id: string;
  placeId?: string;
  name: string;
  address: string;
  description?: string;
  type?: string;
  rating?: number;
  photo?: string;
  gradient?: [string, string];
  phone?: string;
};

export type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorType: 'church' | 'personal';
  authorColor: string;
  authorPhoto?: string;
  city?: string;
  state?: string;
  content: string;
  image?: string;
  time: string;
  createdAt?: number;
  likes: number;
  liked: boolean;
  comments: Comment[];
  eventShareData?: EventShareData;
  churchShareData?: ChurchShareData;
  /**
   * The church this post belongs to. Set when a church account posts, and when
   * anyone shares a church to the feed. placeId is the reliable half — Google
   * supplies one spelling of a church's name and the account holder types
   * another, so matching on name alone misses posts.
   *
   * These were already being written at runtime through an untyped require()
   * in church-detail; declaring them makes that intentional and lets other
   * screens set them too.
   */
  churchPlaceId?: string;
  churchName?: string;
  feed: 'foryou' | 'discover' | 'both';
  /**
   * Church announcements. Only church accounts can set this. It changes how the
   * post renders and, unlike an ordinary post, notifies everyone who follows
   * the church — gated by the Announcements notification preference.
   */
  isAnnouncement?: boolean;
  visibility?: 'public' | 'connections';
  showLocation?: boolean;
  authorId?: string;
  edited?: boolean;
  repostOf?: {
    id: string;
    authorName: string;
    authorInitials: string;
    authorType: 'church' | 'personal';
    authorColor: string;
    authorPhoto?: string;
    content: string;
    image?: string;
    time: string;
    createdAt?: number;
    // repostPost() copies these across so a reposted event/church card still
    // renders its card (and still has something to share).
    eventShareData?: EventShareData;
    churchShareData?: ChurchShareData;
  };
  repostComment?: string;
  repostsCount?: number;
  linkUrl?: string;
  linkPreview?: { title?: string; description?: string; image?: string; siteName?: string };
  reports?: { id: string; reason: string; reportedBy: string; time: string }[];
  // legacy alias kept for backward compatibility
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
};

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'misleading' | 'hate_speech' | 'other';

// Computes a human-readable relative time (e.g. "5 minutes ago", "Yesterday").
// Falls back to the legacy static `time` string for older posts that predate
// real timestamps (e.g. hardcoded seed data), since there's no real creation
// date to compute from for those.
export function formatRelativeTime(createdAt?: number, fallback?: string): string {
  if (!createdAt) return fallback || '';
  const diffMs = Date.now() - createdAt;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay} days ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} year${diffYear === 1 ? '' : 's'} ago`;
}

const COLORS_LIST = ['#e74c6f','#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#c9a96e','#f5576c'];

const INITIAL_POSTS: Post[] = [
  {
    id:'1', authorName:'Grace Community Church', authorInitials:'GC', authorType:'church',
    authorColor:'#e74c6f', city:'Glen Cove', state:'NY',
    content:'What an incredible Sunday! Over 50 people came forward during altar call. God is moving! Join us next week, all are welcome.',
    time:'2h', likes:12, liked:false, feed:'both',
    comments:[
      { id:'c1', author:'Maria Santos', initials:'MS', color:'#667eea', text:'This is amazing! God is so good!', time:'1h', likes:3, liked:false, city:'Bronx', state:'NY', replies:[
        { id:'r1', author:'James Wilson', initials:'JW', color:'#43e97b', text:'Amen! Praying for continued revival!', time:'45m', likes:1, liked:false, city:'Brooklyn', state:'NY' }
      ]},
      { id:'c2', author:'David Kim', initials:'DK', color:'#f093fb', text:'Wish I could have been there!', time:'30m', likes:1, liked:false, city:'Queens', state:'NY', replies:[] }
    ]
  },
  {
    id:'2', authorName:'Pastor Michael Johnson', authorInitials:'MJ', authorType:'personal',
    authorColor:'#667eea', city:'Dallas', state:'TX',
    content:'"For I know the plans I have for you," declares the Lord. Trust His timing. Your breakthrough is coming. Keep faith!',
    time:'4h', likes:34, liked:false, feed:'both',
    comments:[
      { id:'c3', author:'Sarah Thompson', initials:'ST', color:'#fa709a', text:'I needed this word today. Thank you Pastor!', time:'3h', likes:5, liked:false, city:'Houston', state:'TX', replies:[
        { id:'r2', author:'Pastor Michael Johnson', initials:'MJ', color:'#667eea', text:'Blessings to you Sarah! Stay encouraged!', time:'2h', likes:2, liked:false, city:'Dallas', state:'TX' }
      ]}
    ]
  },
  {
    id:'3', authorName:'Faith Tabernacle NYC', authorInitials:'FT', authorType:'church',
    authorColor:'#43e97b', city:'Harlem', state:'NY',
    content:'Youth night this Friday 7PM! Food, worship, and the Word. Bring a friend!',
    time:'6h', likes:28, liked:false, feed:'both',
    comments:[]
  },
  {
    id:'4', authorName:'Blessing Okafor', authorInitials:'BO', authorType:'personal',
    authorColor:'#f093fb', city:'Atlanta', state:'GA',
    content:'Just finished reading Psalms 23 for the 100th time and it hits different every single time. "Yea, though I walk through the valley..." His presence is everything.',
    time:'8h', likes:67, liked:false, feed:'both',
    comments:[
      { id:'c4', author:'Priya Nair', initials:'PN', color:'#4facfe', text:'One of my favorite passages too!', time:'7h', likes:4, liked:false, city:'Miami', state:'FL', replies:[] }
    ]
  },
  {
    id:'5', authorName:'Brooklyn Gospel Choir', authorInitials:'BG', authorType:'church',
    authorColor:'#fa709a', city:'Brooklyn', state:'NY',
    content:'New worship album dropping next month! 12 original songs written by our choir members. God has been so faithful through this process.',
    time:'10h', likes:89, liked:false, feed:'both',
    comments:[]
  },
  {
    id:'6', authorName:'Carlos Rivera', authorInitials:'CR', authorType:'personal',
    authorColor:'#c9a96e', city:'Miami', state:'FL',
    content:'Sunday sermon hit home today. "God doesn\'t call the qualified, He qualifies the called." Stop disqualifying yourself from your destiny.',
    time:'12h', likes:112, liked:false, feed:'both',
    comments:[
      { id:'c5', author:'Angela Moore', initials:'AM', color:'#e74c6f', text:'Preach! Someone needed to hear this.', time:'11h', likes:8, liked:false, city:'Orlando', state:'FL', replies:[
        { id:'r3', author:'Carlos Rivera', initials:'CR', color:'#c9a96e', text:'God placed it on my heart to share. Blessings!', time:'10h', likes:3, liked:false, city:'Miami', state:'FL' }
      ]}
    ]
  },
];

let posts: Post[] = INITIAL_POSTS;
let hydrated = false;
const listeners: Array<() => void> = [];
/**
 * Notify subscribers over a copy of the list.
 *
 * A subscriber's setState can unmount a component, whose cleanup splices itself
 * out of `listeners` while forEach is still walking it — every listener after
 * the removed index is then skipped and silently misses that update. Iterating
 * a snapshot means the removal takes effect on the next notify instead of
 * halfway through this one.
 */
function notify() { [...listeners].forEach(fn => fn()); }

async function persist() {
  try { await AsyncStorage.setItem(POSTS_KEY, JSON.stringify(posts)); } catch {}
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(POSTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        posts = parsed;
        notify();
      }
    }
  } catch {}
}
hydrate();

export function getPosts() { return [...posts]; }
export function getForYouPosts() { return posts.filter(p => p.feed === 'foryou' || p.feed === 'both'); }
export function getDiscoverPosts() { return posts.filter(p => p.feed === 'discover' || p.feed === 'both'); }

/**
 * Record this account in the profile directory.
 *
 * Called from every action that puts this account's name in front of other
 * people — posting, commenting, replying. Posting alone was not enough: someone
 * who only ever comments was absent from the directory, so their comments
 * showed initials on a coloured circle even though they had a photo set.
 *
 * The display name, colour and initials come from the caller because each entry
 * point already computed them; everything else is read live from userStore, so
 * a profile edit propagates on the next thing they write.
 */
function publishSelf(who: { name: string; color: string; initials: string; city?: string; state?: string }) {
  const u = getUser();
  if (!u.id || !who.name) return;
  // userStore keeps one free-text "City, ST"; the directory keeps them apart.
  const [savedCity, savedState] = (u.location || '').split(',').map(part => part.trim());
  publishProfile({
    id: u.id,
    name: who.name,
    accountType: u.accountType,
    photo: u.profilePhoto || u.avatar,
    cover: u.coverPhoto,
    bio: u.bio,
    city: who.city || savedCity || undefined,
    state: who.state || savedState || undefined,
    lifeVerse: u.lifeVerse,
    lifeVerseRef: u.lifeVerseRef,
    color: who.color,
    initials: who.initials,
    connectionCount: getConnections().length,
    photos: u.photos,
  });
}

export function addPost(post: {
  authorName: string; authorInitials: string; authorType: 'church'|'personal';
  authorColor: string; authorId?: string;
  authorPhoto?: string; content: string; time: string;
  city?: string; state?: string; feed?: 'foryou'|'discover'|'both';
  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;
  churchPlaceId?: string; churchName?: string;
  linkUrl?: string; linkPreview?: Post['linkPreview']; isAnnouncement?: boolean;
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
  repostOf?: Post['repostOf']; repostComment?: string;
}) {
  const newPost: Post = {
    ...post,
    id: newId(),
    // Stamp the author's stable id even when the caller forgot, so ownership
    // never has to fall back to comparing display names.
    authorId: post.authorId || getUser().id,
    createdAt: Date.now(),
    likes: 0, liked: false, comments: [], feed: post.feed || 'both',
  };
  // Keep this account's public profile current so anyone who taps through from
  // this post sees a real profile rather than a name on a blank cover.
  publishSelf({
    name: newPost.authorName,
    color: newPost.authorColor,
    initials: newPost.authorInitials,
    city: newPost.city,
    state: newPost.state,
  });

  posts = [newPost, ...posts];
  // bump repost count on the original post if this is a repost
  if (post.repostOf) {
    posts = posts.map(p => p.id === post.repostOf!.id
      ? { ...p, repostsCount: (p.repostsCount || 0) + 1 }
      : p);
  }
  persist();
  notify();
}

/**
 * Does this post belong to the given account?
 *
 * Ownership used to be `post.authorName === displayName`, which meant two
 * people with the same name could edit and delete each other's posts, and
 * anyone who changed their name lost everything they had written.
 *
 * Prefer the stable id. Fall back to the name only for posts written before
 * ids existed, so old local content does not disappear from the author's
 * profile on upgrade. Delete the fallback once the backend owns the data.
 */
export function isAuthoredBy(
  post: Pick<Post, 'authorId' | 'authorName'>,
  userId?: string,
  displayName?: string,
): boolean {
  // id OR name, deliberately. Comparing ids alone looks stricter but orphans
  // content whenever the stored id stops matching -- posts written before ids
  // existed, or after signOut generated a new one -- and the visible symptom is
  // your own posts offering to connect you to yourself. Once a server owns
  // identity the name half can go.
  if (post.authorId && userId && post.authorId === userId) return true;
  return !!displayName && post.authorName === displayName;
}

/**
 * Posts belonging to a church.
 *
 * Match on the Google Place ID when both sides have one, and fall back to the
 * name. A church account that CLAIMED its listing carries the place id; one
 * registered from scratch has no Places entry, so only the name is available.
 * Checking both means each kind of church still finds its own posts.
 */
export function postsForChurch(placeId?: string, churchName?: string): Post[] {
  if (!placeId && !churchName) return [];
  return posts.filter(p =>
    (!!placeId && p.churchPlaceId === placeId) ||
    (!!churchName && (p.churchName === churchName || p.authorName === churchName))
  );
}

export function editPost(postId: string, updates: { content?: string; image?: string | null }) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    const next: Post = { ...p, edited: true };
    if (updates.content !== undefined) next.content = updates.content;
    if (updates.image !== undefined) next.image = updates.image === null ? undefined : updates.image;
    return next;
  });
  persist();
  notify();
}

export function deletePost(postId: string) {
  posts = posts.filter(p => p.id !== postId);
  persist();
  notify();
}

export function reportPost(postId: string, reason: ReportReason, reportedBy: string) {
  const labels: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment or bullying',
    inappropriate: 'Inappropriate content',
    misleading: 'False or misleading information',
    hate_speech: 'Hate speech',
    other: 'Other',
  };
  posts = posts.map(p => p.id === postId ? {
    ...p,
    reports: [...(p.reports || []), { id: newId(), reason: labels[reason], reportedBy, time: 'now' }],
  } : p);
  persist();
  notify();
}

export function repostPost(original: Post, reposter: {
  authorName: string; authorInitials: string; authorType: 'church'|'personal';
  authorColor: string; authorId?: string; authorPhoto?: string;
}, comment: string = '') {
  const repostSource = original.repostOf
    ? original.repostOf // reposting a repost shows the ORIGINAL post, not the wrapper
    : {
        id: original.id,
        authorName: original.authorName,
        authorInitials: original.authorInitials,
        authorType: original.authorType,
        authorColor: original.authorColor,
        authorPhoto: original.authorPhoto,
        content: original.content,
        image: original.image,
        time: original.time,
        createdAt: original.createdAt,
        eventShareData: original.eventShareData,
        churchShareData: original.churchShareData,
      };

  addPost({
    authorName: reposter.authorName,
    authorInitials: reposter.authorInitials,
    authorType: reposter.authorType,
    authorColor: reposter.authorColor,
    authorId: reposter.authorId,
    authorPhoto: reposter.authorPhoto,
    content: '',
    time: 'now',
    feed: 'both',
    repostOf: repostSource,
    repostComment: comment,
  });
}

export function toggleLike(postId: string) {
  const post = posts.find(p => p.id === postId);
  const alreadyLiked = post?.liked;
  posts = posts.map(p => p.id === postId
    ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
    : p
  );
  persist();
  notify();
  // Log to activity if this was a new like (not un-like)
  if (!alreadyLiked && post) {
    logActivity({ type: 'like', postId, postContent: post.content?.slice(0, 80) });
  } else if (alreadyLiked) {
    removeActivityByPost(postId, 'like');
  }
}

export function addComment(postId: string, text: string, author: string, initials: string, color: string, city?: string, state?: string, image?: string) {
  // A comment is the only trace some people leave, so it has to be enough to
  // put them in the directory — otherwise their avatar stays initials forever.
  publishSelf({ name: author, color, initials, city, state });
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: [...p.comments, {
      id: newId(), author, authorId: getUser().id, initials, color, text, image,
      time: 'now', likes: 0, liked: false, city, state, replies: []
    }]
  } : p);
  persist();
  notify();
}

/** Is this comment mine? Matches on id, falling back to display name. */
export function isCommentMine(comment: Comment, userId?: string, displayName?: string): boolean {
  if (comment.authorId && userId && comment.authorId === userId) return true;
  return !!displayName && comment.author === displayName;
}

export function editComment(postId: string, commentId: string, text: string) {
  posts = posts.map(p => p.id !== postId ? p : {
    ...p,
    comments: p.comments.map(cm => cm.id === commentId ? { ...cm, text, edited: true } : cm),
  });
  persist();
  notify();
}

export function deleteComment(postId: string, commentId: string) {
  posts = posts.map(p => p.id !== postId ? p : {
    ...p,
    comments: p.comments.filter(cm => cm.id !== commentId),
  });
  persist();
  notify();
}

/**
 * Pin one comment to the top, or unpin it.
 *
 * One at a time on purpose: pinning is for the organiser highlighting the one
 * thing everyone needs to read, and a list of six pinned comments is just the
 * list again. Pinning a second comment moves the pin rather than adding one.
 */
export function togglePinComment(postId: string, commentId: string) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    const already = p.comments.find(cm => cm.id === commentId)?.pinned;
    return {
      ...p,
      comments: p.comments.map(cm => ({ ...cm, pinned: !already && cm.id === commentId })),
    };
  });
  persist();
  notify();
}

/** File a report against one comment, the same shape posts use. */
export function reportComment(postId: string, commentId: string, reason: ReportReason, reportedBy: string) {
  const labels: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment or bullying',
    inappropriate: 'Inappropriate content',
    misleading: 'False or misleading information',
    hate_speech: 'Hate speech',
    other: 'Other',
  };
  posts = posts.map(p => p.id !== postId ? p : {
    ...p,
    comments: p.comments.map(cm => cm.id !== commentId ? cm : {
      ...cm,
      reports: [...(cm.reports || []), { id: newId(), reason: labels[reason], reportedBy, time: 'now' }],
    }),
  });
  persist();
  notify();
}

/**
 * Comments in display order: the pinned one first, then by the chosen sort.
 * Pinning outranks sorting - that is the point of a pin.
 */
export function sortComments(comments: Comment[], by: 'recent' | 'liked'): Comment[] {
  const rest = [...comments].filter(cm => !cm.pinned);
  rest.sort((a, b) =>
    by === 'liked' ? (b.likes - a.likes) : 0   // newest last already; 'recent' keeps insertion order
  );
  if (by === 'recent') rest.reverse();
  const pinned = comments.filter(cm => cm.pinned);
  return [...pinned, ...rest];
}

export function addReply(postId: string, commentId: string, text: string, author: string, initials: string, color: string, city?: string, state?: string) {
  publishSelf({ name: author, color, initials, city, state });
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId ? {
      ...c,
      replies: [...c.replies, {
        id: newId(), author, initials, color, text,
        time: 'now', likes: 0, liked: false, city, state
      }]
    } : c)
  } : p);
  persist();
  notify();
}

export function toggleCommentLike(postId: string, commentId: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId
      ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
      : c)
  } : p);
  persist();
  notify();
}

export function toggleReplyLike(postId: string, commentId: string, replyId: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId ? {
      ...c,
      replies: c.replies.map(r => r.id === replyId
        ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 }
        : r)
    } : c)
  } : p);
  persist();
  notify();
}

export function usePosts(feed?: 'foryou' | 'discover') {
  const [state, setState] = useState(feed === 'foryou' ? getForYouPosts() : feed === 'discover' ? getDiscoverPosts() : getPosts());
  useEffect(() => {
    const fn = () => setState(feed === 'foryou' ? getForYouPosts() : feed === 'discover' ? getDiscoverPosts() : getPosts());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, [feed]);
  return state;
}

export function useChurchPosts(placeId?: string) {
  const [state, setState] = useState(getPosts());
  useEffect(() => {
    const fn = () => setState(getPosts());
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  posts = INITIAL_POSTS;
  persist();
  notify();
}
