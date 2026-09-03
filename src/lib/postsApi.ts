import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { getAuthUser } from './auth';
import type { Post, Comment, Reply } from './postsStore';

/**
 * Posts, comments and likes, on the server.
 *
 * Every post used to live in AsyncStorage on the phone that wrote it, so the
 * community feed was not shared: you saw your own posts and the seeded demo
 * ones, and nothing you wrote ever reached anyone. The screens were real; the
 * content had nowhere to go.
 *
 * The local store stays as the thing the screens read — it is instant and
 * works offline. This is what fills it and what writes back. Every function
 * returns rather than throws: a failed sync must never lose what someone just
 * typed.
 */

// ── Row shapes ─────────────────────────────────────────────────────────────

type PostRow = Record<string, any>;
type CommentRow = Record<string, any>;

function postToRow(p: Post, authorId: string): PostRow {
  return {
    id: p.id,
    author_id: authorId,
    author_name: p.authorName,
    author_initials: p.authorInitials,
    author_type: p.authorType,
    author_color: p.authorColor,
    author_photo: p.authorPhoto ?? null,
    content: p.content ?? '',
    image: p.image ?? null,
    city: p.city ?? null,
    state: p.state ?? null,
    show_location: p.showLocation !== false,
    feed: p.feed || 'both',
    visibility: p.visibility || 'public',
    is_announcement: !!p.isAnnouncement,
    church_place_id: p.churchPlaceId ?? null,
    church_name: p.churchName ?? null,
    event_share: p.eventShareData ?? null,
    church_share: p.churchShareData ?? null,
    link_url: p.linkUrl ?? null,
    link_preview: p.linkPreview ?? null,
    repost_of: p.repostOf ?? null,
    repost_comment: p.repostComment ?? null,
    reposts_count: p.repostsCount ?? 0,
    edited: !!p.edited,
    created_at: new Date(p.createdAt || Date.now()).toISOString(),
  };
}

function rowToComment(r: CommentRow, likedIds: Set<string>, replies: Reply[]): Comment {
  return {
    id: r.id,
    author: r.author_name,
    authorId: r.author_id,
    initials: r.author_initials || '',
    color: r.author_color || '#999',
    text: r.text || '',
    image: r.image || undefined,
    time: r.created_at,
    likes: r.likes_count || 0,
    liked: likedIds.has(r.id),
    city: r.city || undefined,
    state: r.state || undefined,
    edited: !!r.edited,
    pinned: !!r.pinned,
    replies,
  };
}

function rowToPost(r: PostRow, comments: Comment[], likedPosts: Set<string>): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    authorName: r.author_name,
    authorInitials: r.author_initials || '',
    authorType: r.author_type,
    authorColor: r.author_color || '#999',
    authorPhoto: r.author_photo || undefined,
    city: r.city || undefined,
    state: r.state || undefined,
    showLocation: r.show_location,
    content: r.content || '',
    image: r.image || undefined,
    time: r.created_at,
    createdAt: new Date(r.created_at).getTime(),
    likes: r.likes_count || 0,
    liked: likedPosts.has(r.id),
    comments,
    feed: r.feed,
    visibility: r.visibility,
    isAnnouncement: r.is_announcement || undefined,
    churchPlaceId: r.church_place_id || undefined,
    churchName: r.church_name || undefined,
    eventShareData: r.event_share || undefined,
    churchShareData: r.church_share || undefined,
    linkUrl: r.link_url || undefined,
    linkPreview: r.link_preview || undefined,
    repostOf: r.repost_of || undefined,
    repostComment: r.repost_comment || undefined,
    repostsCount: r.reposts_count || undefined,
    edited: r.edited || undefined,
  };
}

// ── Reading ────────────────────────────────────────────────────────────────

/**
 * The feed, with its comments and this account's likes already resolved.
 *
 * Four queries rather than one join: a join would repeat every post's body
 * once per comment, and the like sets are per-viewer while everything else is
 * shared. Assembling them here keeps the payload proportional to what is
 * actually shown.
 */
export async function fetchFeed(limit = 100): Promise<Post[] | null> {
  const db = supabase();
  if (!db) return null;
  const me = getAuthUser();

  const { data: postRows, error } = await db
    .from('posts').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error || !postRows) return null;
  if (!postRows.length) return [];

  const ids = postRows.map(p => p.id);
  const { data: commentRows } = await db
    .from('comments').select('*').in('post_id', ids).order('created_at', { ascending: true });

  let likedPosts = new Set<string>();
  let likedComments = new Set<string>();
  if (me) {
    const [{ data: pl }, { data: cl }] = await Promise.all([
      db.from('post_likes').select('post_id').eq('user_id', me.id).in('post_id', ids),
      db.from('comment_likes').select('comment_id').eq('user_id', me.id),
    ]);
    likedPosts = new Set((pl || []).map(r => r.post_id));
    likedComments = new Set((cl || []).map(r => r.comment_id));
  }

  // Replies first, so each top-level comment can be built with its own.
  const byParent = new Map<string, CommentRow[]>();
  const tops: CommentRow[] = [];
  for (const c of commentRows || []) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) || [];
      list.push(c);
      byParent.set(c.parent_id, list);
    } else {
      tops.push(c);
    }
  }

  const commentsByPost = new Map<string, Comment[]>();
  for (const c of tops) {
    const replies: Reply[] = (byParent.get(c.id) || []).map(r => ({
      id: r.id,
      author: r.author_name,
      initials: r.author_initials || '',
      color: r.author_color || '#999',
      text: r.text || '',
      time: r.created_at,
      likes: r.likes_count || 0,
      liked: likedComments.has(r.id),
      city: r.city || undefined,
      state: r.state || undefined,
    }));
    const list = commentsByPost.get(c.post_id) || [];
    list.push(rowToComment(c, likedComments, replies));
    commentsByPost.set(c.post_id, list);
  }

  return postRows.map(r => rowToPost(r, commentsByPost.get(r.id) || [], likedPosts));
}

// ── Writing ────────────────────────────────────────────────────────────────

export async function createPost(post: Post): Promise<boolean> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return false;
  const { error } = await db.from('posts').insert(postToRow(post, me.id));
  return !error;
}

export async function updatePostContent(id: string, content: string): Promise<void> {
  const db = supabase();
  if (!db || !getAuthUser()) return;
  await db.from('posts').update({ content, edited: true }).eq('id', id);
}

export async function deletePostRemote(id: string): Promise<void> {
  const db = supabase();
  if (!db || !getAuthUser()) return;
  await db.from('posts').delete().eq('id', id);
}

/** Add or remove this account's like. The count is kept by a trigger. */
export async function setPostLike(postId: string, liked: boolean): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  if (liked) {
    // Ignore a duplicate rather than erroring: a double tap is one like.
    await db.from('post_likes').upsert({ post_id: postId, user_id: me.id }, { onConflict: 'post_id,user_id' });
  } else {
    await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', me.id);
  }
}

export async function setCommentLike(commentId: string, liked: boolean): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  if (liked) {
    await db.from('comment_likes').upsert({ comment_id: commentId, user_id: me.id }, { onConflict: 'comment_id,user_id' });
  } else {
    await db.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', me.id);
  }
}

export async function createComment(
  postId: string,
  c: { id: string; author: string; initials: string; color: string; text: string; image?: string; city?: string; state?: string },
  parentId?: string,
): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;
  await db.from('comments').insert({
    id: c.id,
    post_id: postId,
    parent_id: parentId ?? null,
    author_id: me.id,
    author_name: c.author,
    author_initials: c.initials,
    author_color: c.color,
    text: c.text,
    image: c.image ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
  });
}

export async function updateCommentText(id: string, text: string): Promise<void> {
  const db = supabase();
  if (!db || !getAuthUser()) return;
  await db.from('comments').update({ text, edited: true }).eq('id', id);
}

export async function deleteCommentRemote(id: string): Promise<void> {
  const db = supabase();
  if (!db || !getAuthUser()) return;
  await db.from('comments').delete().eq('id', id);
}

// ── Images ─────────────────────────────────────────────────────────────────

/**
 * Put a picked photo somewhere other phones can see it.
 *
 * A picked image is a path inside this app's own sandbox — meaningful here and
 * nowhere else, so anything referring to one shows a broken frame to everybody
 * but the person who picked it. Avatars are the worst case: they look right to
 * their owner, so nobody reports them.
 *
 * Already-uploaded urls and empty values pass straight through, so callers can
 * hand this whatever they have. Returns the local uri unchanged on failure —
 * a photo only its author can see is a poor outcome, losing the post or the
 * profile edit entirely is a worse one.
 */
export async function uploadImage(localUri: string, bucket = 'post-images'): Promise<string> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !localUri || localUri.startsWith('http')) return localUri;

  try {
    const bytes = await new File(localUri).bytes();
    const ext = (localUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
    // Foldered by uploader because that is what the storage policy checks.
    const path = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await db.storage.from(bucket).upload(path, bytes, {
      contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });
    if (error) return localUri;

    return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch {
    return localUri;
  }
}

export const uploadPostImage = (uri: string) => uploadImage(uri, 'post-images');
