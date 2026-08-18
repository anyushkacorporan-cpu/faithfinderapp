#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Step 1: Create the dedicated CommentsScreen
cat > "app/comments.tsx" << 'EOF'
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import {
  usePosts, addComment, addReply,
  toggleCommentLike, toggleReplyLike, Post, Comment
} from '../src/lib/postsStore';
import { getUser } from '../src/lib/userStore';

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const allPosts = usePosts();
  const post = allPosts.find(p => p.id === postId);
  const user = getUser();

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{commentId: string; author: string} | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();

  function handleAddComment() {
    if (!commentText.trim() || !post) return;
    if (replyingTo) {
      addReply(post.id, replyingTo.commentId, commentText.trim(), displayName, initials, '#667eea');
      setReplyingTo(null);
    } else {
      addComment(post.id, commentText.trim(), displayName, initials, '#667eea');
    }
    setCommentText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  if (!post) return null;

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Comments</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Original Post */}
          <View style={s.originalPost}>
            <View style={s.postAuthorRow}>
              <View style={[s.avatar, { backgroundColor: post.authorColor }]}>
                <Text style={s.avatarTxt}>{post.authorInitials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={s.postAuthorName}>{post.authorName}</Text>
                  {post.authorType === 'church' && (
                    <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>Church</Text></View>
                  )}
                </View>
                <Text style={s.postMeta}>{post.time}{post.city && post.state ? ` · ${post.city}, ${post.state}` : ''}</Text>
              </View>
            </View>
            <Text style={s.postContent}>{post.content}</Text>
            <View style={s.postStats}>
              <Text style={s.postStatTxt}>{post.likes} likes · {post.comments.length} comments</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Comments Count */}
          <View style={s.commentsHeader}>
            <Text style={s.commentsCount}>{post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}</Text>
          </View>

          {/* Empty State */}
          {post.comments.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color="#ddd" />
              <Text style={s.emptyTitle}>No comments yet</Text>
              <Text style={s.emptySubtitle}>Be the first to share your thoughts</Text>
            </View>
          )}

          {/* Comments Feed */}
          {post.comments.map(comment => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={post.id}
              onReply={() => setReplyingTo({ commentId: comment.id, author: comment.author })}
              onLike={() => toggleCommentLike(post.id, comment.id)}
              onReplyLike={(replyId) => toggleReplyLike(post.id, comment.id, replyId)}
            />
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Sticky Comment Composer */}
        <View style={s.composer}>
          {replyingTo && (
            <View style={s.replyingToBar}>
              <Text style={s.replyingToTxt}>
                Replying to <Text style={{ fontWeight: '700', color: COLORS.navy }}>{replyingTo.author}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={18} color="#bbb" />
              </TouchableOpacity>
            </View>
          )}
          <View style={s.composerRow}>
            <View style={[s.composerAvatar, { backgroundColor: '#667eea' }]}>
              <Text style={s.composerAvatarTxt}>{initials}</Text>
            </View>
            <TextInput
              style={s.composerInput}
              placeholder={replyingTo ? `Reply to ${replyingTo.author}...` : 'Add a comment...'}
              placeholderTextColor="#bbb"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, !commentText.trim() && { backgroundColor: '#ddd' }]}
              onPress={handleAddComment}
              disabled={!commentText.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CommentRow({ comment, postId, onReply, onLike, onReplyLike }: {
  comment: Comment; postId: string;
  onReply: () => void; onLike: () => void; onReplyLike: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <View style={c.wrap}>
      {/* Comment */}
      <View style={c.row}>
        <TouchableOpacity onPress={() => Alert.alert(comment.author, 'Profile coming soon!')}>
          <View style={[c.avatar, { backgroundColor: comment.color }]}>
            <Text style={c.avatarTxt}>{comment.initials}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={c.metaRow}>
            <Text style={c.name}>{comment.author}</Text>
            {comment.city && comment.state && <Text style={c.meta}> · {comment.city}, {comment.state}</Text>}
            <Text style={c.meta}> · {comment.time}</Text>
          </View>
          <Text style={c.text}>{comment.text}</Text>
          <View style={c.actions}>
            <TouchableOpacity style={c.actionBtn} onPress={onLike}>
              <Ionicons name={comment.liked ? 'heart' : 'heart-outline'} size={15} color={comment.liked ? '#e74c6f' : '#bbb'} />
              {comment.likes > 0 && <Text style={[c.actionTxt, comment.liked && { color: '#e74c6f' }]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={c.actionBtn} onPress={onReply}>
              <Text style={c.actionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length > 0 && (
              <TouchableOpacity style={c.actionBtn} onPress={() => setShowReplies(!showReplies)}>
                <Text style={c.actionTxt}>
                  {showReplies ? 'Hide replies' : `View ${comment.replies.length} repl${comment.replies.length > 1 ? 'ies' : 'y'}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Replies */}
      {showReplies && comment.replies.map(reply => (
        <View key={reply.id} style={c.replyWrap}>
          <TouchableOpacity onPress={() => Alert.alert(reply.author, 'Profile coming soon!')}>
            <View style={[c.replyAvatar, { backgroundColor: reply.color }]}>
              <Text style={c.replyAvatarTxt}>{reply.initials}</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={c.metaRow}>
              <Text style={c.name}>{reply.author}</Text>
              {reply.city && reply.state && <Text style={c.meta}> · {reply.city}, {reply.state}</Text>}
              <Text style={c.meta}> · {reply.time}</Text>
            </View>
            <Text style={c.text}>{reply.text}</Text>
            <View style={c.actions}>
              <TouchableOpacity style={c.actionBtn} onPress={() => onReplyLike(reply.id)}>
                <Ionicons name={reply.liked ? 'heart' : 'heart-outline'} size={14} color={reply.liked ? '#e74c6f' : '#bbb'} />
                {reply.likes > 0 && <Text style={[c.actionTxt, reply.liked && { color: '#e74c6f' }]}>{reply.likes}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  scroll: { flex: 1 },
  originalPost: { padding: 16, backgroundColor: '#fff' },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postAuthorName: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  churchBadge: { backgroundColor: 'rgba(201,169,110,0.15)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  churchBadgeTxt: { fontSize: 10, fontWeight: '700', color: COLORS.gold },
  postMeta: { fontSize: 12, color: '#aaa', marginTop: 1 },
  postContent: { fontSize: 15, color: '#2d2d2d', lineHeight: 23, marginBottom: 12 },
  postStats: { borderTopWidth: 1, borderTopColor: '#f5f3ef', paddingTop: 10 },
  postStatTxt: { fontSize: 13, color: '#aaa' },
  divider: { height: 8, backgroundColor: '#f8f7f4' },
  commentsHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  commentsCount: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#bbb' },
  emptySubtitle: { fontSize: 13, color: '#ccc' },
  composer: { borderTopWidth: 1, borderTopColor: '#f0ede8', backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 8 : 12 },
  replyingToBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: '#faf9f6' },
  replyingToTxt: { fontSize: 12, color: '#888' },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  composerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  composerAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  composerInput: { flex: 1, backgroundColor: '#f5f3ef', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.navy, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
});

const c = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8f7f4' },
  row: { flexDirection: 'row', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  meta: { fontSize: 12, color: '#aaa' },
  text: { fontSize: 14, color: '#333', lineHeight: 21, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { fontSize: 12, fontWeight: '600', color: '#aaa' },
  replyWrap: { flexDirection: 'row', gap: 10, marginTop: 14, marginLeft: 50 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  replyAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
EOF
echo "comments.tsx done"

# Step 2: Update community.tsx to navigate to comments page instead of showing bottom sheet
python3 - << 'PYEOF'
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove showComments state and modal, replace onComment with router.push
old = "  const [showComments, setShowComments] = useState(false);"
new = "  const [showComments, setShowComments] = useState(false); // kept for compat"

# Update onComment to navigate
old_comment = "            onComment={() => { setActivePost(post); setShowComments(true); setReplyingTo(null); setCommentText(''); }}"
new_comment = "            onComment={() => { router.push({ pathname: '/comments' as any, params: { postId: post.id } }); }}"

content = content.replace(old_comment, new_comment)

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('ALL DONE')
PYEOF
