import { logActivity } from '../src/lib/activityStore';
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert, Image} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import {
  usePosts, addComment, addReply,
  toggleCommentLike, toggleReplyLike, Post, Comment
} from '../src/lib/postsStore';
import { isBlocked, useBlocked } from '../src/lib/blockStore';
import { getUser } from '../src/lib/userStore';
import { TranslateRow } from '../src/components/PostCard';
import { useTranslation } from '../src/lib/i18n';

export default function CommentsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const allPosts = usePosts();
  // Re-render when the block list changes so an unblock shows immediately.
  useBlocked();
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
      logActivity({ type: 'comment', postId: post.id, postContent: post.content?.slice(0, 80) });
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
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('commentsTitle')}</Text>
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
                    <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>{t('church')}</Text></View>
                  )}
                </View>
                <Text style={s.postMeta}>{post.time}{post.city && post.state ? ` · ${post.city}, ${post.state}` : ''}</Text>
              </View>
            </View>
            {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
            {!!post.image && (
              <Image source={{uri:post.image}} style={{width:'100%',height:280,borderRadius:14,marginTop:8,marginBottom:10,backgroundColor:c.cardAlt}} resizeMode="contain"/>
            )}
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
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={c.placeholder} />
              <Text style={s.emptyTitle}>{t('noCommentsYet')}</Text>
              <Text style={s.emptySubtitle}>{t('beFirstToShare')}</Text>
            </View>
          )}

          {/* Comments Feed */}
          {post.comments.filter(cm => !isBlocked(undefined, cm.author)).map(comment => (
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
                Replying to <Text style={{ fontWeight: '700', color: c.text }}>{replyingTo.author}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={s.composerRow}>
            <View style={[s.composerAvatar, { backgroundColor: '#667eea' }]}>
              <Text style={s.composerAvatarTxt}>{initials}</Text>
            </View>
            <TextInput
              style={s.composerInput}
              placeholder={replyingTo ? `${t('replyTo')} ${replyingTo.author}...` : t('addComment')}
              placeholderTextColor={c.placeholder}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[s.sendBtn, !commentText.trim() && { backgroundColor: c.placeholder }]}
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
  const c = useThemeColors();
  const cs = makeCs(c);
  const [showReplies, setShowReplies] = useState(true);
  const { t } = useTranslation();

  return (
    <View style={cs.wrap}>
      {/* Comment */}
      <View style={cs.row}>
        <TouchableOpacity onPress={() => router.push({pathname:'/user-profile', params:{name:comment.author,initials:comment.initials,color:comment.color,type:'user',city:comment.city||'',state:comment.state||'',photo:(comment as any).authorPhoto||''}})}>
          <View style={[cs.avatar, { backgroundColor: comment.color }]}>
            <Text style={cs.avatarTxt}>{comment.initials}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={cs.metaRow}>
            <Text style={cs.name}>{comment.author}</Text>
            {comment.city && comment.state && <Text style={cs.meta}> · {comment.city}, {comment.state}</Text>}
            <Text style={cs.meta}> · {comment.time}</Text>
          </View>
          <Text style={cs.text}>{comment.text}</Text>
          <TranslateRow text={comment.text}/>
          <View style={cs.actions}>
            <TouchableOpacity style={cs.actionBtn} onPress={onLike}>
              <Ionicons name={comment.liked ? 'heart' : 'heart-outline'} size={15} color={comment.liked ? '#e74c6f' : c.textMuted} />
              {comment.likes > 0 && <Text style={[cs.actionTxt, comment.liked && { color: '#e74c6f' }]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={cs.actionBtn} onPress={onReply}>
              <Text style={cs.actionTxt}>{t('reply')}</Text>
            </TouchableOpacity>
            {comment.replies.length > 0 && (
              <TouchableOpacity style={cs.actionBtn} onPress={() => setShowReplies(!showReplies)}>
                <Text style={cs.actionTxt}>
                  {showReplies ? t('hideReplies') : `${t('view')} ${comment.replies.length} ${comment.replies.length > 1 ? t('repliesWord') : t('replyWord')}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Replies */}
      {showReplies && comment.replies.filter(rp => !isBlocked(undefined, rp.author)).map(reply => (
        <View key={reply.id} style={cs.replyWrap}>
          <TouchableOpacity onPress={() => router.push({pathname:'/user-profile', params:{name:reply.author,initials:reply.initials,color:reply.color,type:'user',city:reply.city||'',state:reply.state||'',photo:(reply as any).authorPhoto||''}})}>
            <View style={[cs.replyAvatar, { backgroundColor: reply.color }]}>
              <Text style={cs.replyAvatarTxt}>{reply.initials}</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={cs.metaRow}>
              <Text style={cs.name}>{reply.author}</Text>
              {reply.city && reply.state && <Text style={cs.meta}> · {reply.city}, {reply.state}</Text>}
              <Text style={cs.meta}> · {reply.time}</Text>
            </View>
            <Text style={cs.text}>{reply.text}</Text>
            <TranslateRow text={reply.text}/>
            <View style={cs.actions}>
              <TouchableOpacity style={cs.actionBtn} onPress={() => onReplyLike(reply.id)}>
                <Ionicons name={reply.liked ? 'heart' : 'heart-outline'} size={14} color={reply.liked ? '#e74c6f' : c.textMuted} />
                {reply.likes > 0 && <Text style={[cs.actionTxt, reply.liked && { color: '#e74c6f' }]}>{reply.likes}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.card },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  scroll: { flex: 1 },
  originalPost: { padding: 16, backgroundColor: c.card },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postAuthorName: { fontSize: 15, fontWeight: '700', color: c.text },
  churchBadge: { backgroundColor: 'rgba(201,169,110,0.15)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  churchBadgeTxt: { fontSize: 10, fontWeight: '700', color: c.gold },
  postMeta: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  postContent: { fontSize: 15, color: '#2d2d2d', lineHeight: 23, marginBottom: 12 },
  postStats: { borderTopWidth: 1, borderTopColor: c.cardAlt, paddingTop: 10 },
  postStatTxt: { fontSize: 13, color: c.textMuted },
  divider: { height: 8, backgroundColor: c.bg },
  commentsHeader: { paddingHorizontal: 16, paddingVertical: 12 },
  commentsCount: { fontSize: 14, fontWeight: '700', color: c.text },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: c.textMuted },
  emptySubtitle: { fontSize: 13, color: c.placeholder },
  composer: { borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.card, paddingBottom: Platform.OS === 'ios' ? 8 : 12 },
  replyingToBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: c.cardAlt },
  replyingToTxt: { fontSize: 12, color: c.textMuted },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  composerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  composerAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  composerInput: { flex: 1, backgroundColor: c.cardAlt, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: c.text, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
});

const makeCs = (c: ThemeColors) => StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.rowBorder },
  row: { flexDirection: 'row', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '700', color: c.text },
  meta: { fontSize: 12, color: c.textMuted },
  text: { fontSize: 14, color: c.text, lineHeight: 21, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  replyWrap: { flexDirection: 'row', gap: 10, marginTop: 14, marginLeft: 50 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  replyAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
