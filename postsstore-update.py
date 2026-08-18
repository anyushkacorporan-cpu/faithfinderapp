import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('src/lib/postsStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extend Post type: repost fields, authorId, reports
old_type_end = """  visibility?: 'public' | 'connections';
  showLocation?: boolean;
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
};"""

new_type_end = """  visibility?: 'public' | 'connections';
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
  };
  repostComment?: string;
  repostsCount?: number;
  reports?: { id: string; reason: string; reportedBy: string; time: string }[];
  // legacy alias kept for backward compatibility
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
};

export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'misleading' | 'hate_speech' | 'other';"""

if old_type_end in content:
    content = content.replace(old_type_end, new_type_end)
    print('Post type extended')
else:
    print('ERROR: Post type end not found')

# 2. Add AsyncStorage persistence
old_import = "import { useState, useEffect } from 'react';"
new_import = "import { useState, useEffect } from 'react';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\n\nconst POSTS_KEY = 'faithfinder_posts_v1';"
content = content.replace(old_import, new_import, 1)

old_posts_init = "let posts: Post[] = INITIAL_POSTS;\nconst listeners: Array<() => void> = [];\nfunction notify() { listeners.forEach(fn => fn()); }"
new_posts_init = """let posts: Post[] = INITIAL_POSTS;
let hydrated = false;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

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
hydrate();"""

if old_posts_init in content:
    content = content.replace(old_posts_init, new_posts_init)
    print('Persistence added')
else:
    print('ERROR: posts init not found')

# 3. Update addPost to accept authorId and persist
old_add_post = """export function addPost(post: {
  authorName: string; authorInitials: string; authorType: 'church'|'personal';
  authorColor: string;
  authorPhoto?: string; content: string; time: string;
  city?: string; state?: string; feed?: 'foryou'|'discover'|'both';
  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
}) {
  const newPost: Post = {
    ...post,
    id: Date.now().toString(),
    likes: 0, liked: false, comments: [], feed: post.feed || 'both',
  };
  posts = [newPost, ...posts];
  notify();
}"""

new_add_post = """export function addPost(post: {
  authorName: string; authorInitials: string; authorType: 'church'|'personal';
  authorColor: string; authorId?: string;
  authorPhoto?: string; content: string; time: string;
  city?: string; state?: string; feed?: 'foryou'|'discover'|'both';
  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;
  sharedPost?: { authorName: string; authorInitials: string; authorColor: string; content: string; };
  repostOf?: Post['repostOf']; repostComment?: string;
}) {
  const newPost: Post = {
    ...post,
    id: Date.now().toString(),
    likes: 0, liked: false, comments: [], feed: post.feed || 'both',
  };
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
    reports: [...(p.reports || []), { id: Date.now().toString(), reason: labels[reason], reportedBy, time: 'now' }],
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
}"""

if old_add_post in content:
    content = content.replace(old_add_post, new_add_post)
    print('addPost extended + editPost/deletePost/reportPost/repostPost added')
else:
    print('ERROR: addPost not found')

# 4. Add persist() to toggleLike, addComment, addReply, toggleCommentLike, toggleReplyLike
for fn_name, old_notify in [
    ('toggleLike', """export function toggleLike(postId: string) {
  posts = posts.map(p => p.id === postId
    ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
    : p
  );
  notify();
}"""),
]:
    new_notify = old_notify.replace('  notify();\n}', '  persist();\n  notify();\n}')
    if old_notify in content:
        content = content.replace(old_notify, new_notify)
        print(f'{fn_name} persists now')
    else:
        print(f'WARNING: {fn_name} block not matched exactly')

# Generic catch-all: add persist() before notify() in addComment/addReply/toggleCommentLike/toggleReplyLike
for fname in ['addComment', 'addReply', 'toggleCommentLike', 'toggleReplyLike']:
    marker = f'export function {fname}('
    idx = content.find(marker)
    if idx != -1:
        end = content.find('\n}', idx) + 2
        block = content[idx:end]
        if 'persist();' not in block:
            new_block = block.replace('  notify();\n}', '  persist();\n  notify();\n}')
            content = content.replace(block, new_block)
            print(f'{fname} now persists')

with open('src/lib/postsStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - postsStore.ts updated')
