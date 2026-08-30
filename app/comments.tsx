import { logActivity } from '../src/lib/activityStore';
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Alert, Image, Modal} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import {
  usePosts, addComment, addReply, editComment, deleteComment,
  togglePinComment, reportComment, sortComments, isCommentMine, isAuthoredBy,
  toggleCommentLike, toggleReplyLike, Post, Comment, ReportReason
} from '../src/lib/postsStore';
import * as ImagePicker from 'expo-image-picker';
import { useConfirm } from '../src/components/Confirm';
import { useToast } from '../src/components/Toast';
import { isBlocked, useBlocked } from '../src/lib/blockStore';
import { getUser } from '../src/lib/userStore';
import { TranslateRow } from '../src/components/PostCard';
import { CommentAvatar } from '../src/components/CommentAvatar';
import { useTranslation } from '../src/lib/i18n';

import { KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';
export default function CommentsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const allPosts = usePosts();
  // Re-render when the block list changes so an unblock shows immediately.
  useBlocked();
  const post = allPosts.find(p => p.id === postId);
  const user = getUser();

  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'liked'>('recent');
  const [menuFor, setMenuFor] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [editText, setEditText] = useState('');
  const [reportFor, setReportFor] = useState<Comment | null>(null);
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();

  // Faith-shaped shortcuts, for when a reply is a reaction rather than a
  // sentence. They append to whatever is typed rather than replacing it.
  const QUICK = ['🙏', '❤️', '🕊️', '✝️', '🙌', '😊'];

  async function pickCommentPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) setCommentImage(result.assets[0].uri);
  }
  const [replyingTo, setReplyingTo] = useState<{commentId: string; author: string} | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();

  function handleAddComment() {
    // A photo on its own is a comment; text is no longer the only way to say
    // something here.
    if ((!commentText.trim() && !commentImage) || !post) return;
    if (replyingTo) {
      addReply(post.id, replyingTo.commentId, commentText.trim(), displayName, initials, '#667eea');
      setReplyingTo(null);
    } else {
      addComment(post.id, commentText.trim(), displayName, initials, '#667eea', undefined, undefined, commentImage || undefined);
      logActivity({ type: 'comment', postId: post.id, postContent: post.content?.slice(0, 80) });
    }
    setCommentText('');
    setCommentImage(null);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function handleSaveEdit() {
    if (!post || !editing || !editText.trim()) return;
    editComment(post.id, editing.id, editText.trim());
    setEditing(null);
    setEditText('');
    showToast(tx('Saved'), tx('Your comment has been updated.'), 'success');
  }

  function handleDeleteComment(cm: Comment) {
    if (!post) return;
    setMenuFor(null);
    showConfirm({
      title: tx('Delete comment'),
      message: tx('This cannot be undone.'),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        { text: tx('Delete'), style: 'destructive', onPress: () => deleteComment(post.id, cm.id) },
      ],
    });
  }

  if (!post) return null;

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      {/* Header */}
      {/* No title: the screen is plainly a comment thread, and the post it
          belongs to is the first thing on it. The row stays so the back button
          keeps its position. */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          {...KEYBOARD_SCROLL_PROPS}
          style={s.scroll}
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
            {/* Only worth offering once there is something to reorder. */}
            {post.comments.length > 1 && (
              <View style={s.sortRow}>
                {(['recent','liked'] as const).map(k => (
                  <TouchableOpacity key={k} style={[s.sortBtn, sortBy===k && s.sortBtnOn]} onPress={() => setSortBy(k)}>
                    <Text style={[s.sortTxt, sortBy===k && s.sortTxtOn]}>
                      {k === 'recent' ? tx('Most recent') : tx('Most liked')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
          {sortComments(post.comments.filter(cm => !isBlocked(undefined, cm.author)), sortBy).map(comment => (
            <CommentRow
              key={comment.id}
              comment={comment}
              postId={post.id}
              onReply={() => setReplyingTo({ commentId: comment.id, author: comment.author })}
              onLike={() => toggleCommentLike(post.id, comment.id)}
              onReplyLike={(replyId) => toggleReplyLike(post.id, comment.id, replyId)}
              onMenu={() => setMenuFor(comment)}
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
          {/* Attached photo, before it is sent */}
          {!!commentImage && (
            <View style={s.attachPreview}>
              <Image source={{uri: commentImage}} style={s.attachThumb} resizeMode="cover" />
              <Text style={s.attachTxt} numberOfLines={1}>{tx('Photo attached')}</Text>
              <TouchableOpacity onPress={() => setCommentImage(null)}>
                <Ionicons name="close-circle" size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Quick reactions: a tap instead of a sentence. Appends rather than
              replaces, so they can punctuate a written reply too. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickRow} keyboardShouldPersistTaps="handled">
            {QUICK.map(e => (
              <TouchableOpacity key={e} style={s.quickBtn} onPress={() => setCommentText(t2 => (t2 + e))}>
                <Text style={s.quickTxt}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.composerRow}>
            <View style={[s.composerAvatar, { backgroundColor: '#667eea' }]}>
              <Text style={s.composerAvatarTxt}>{initials}</Text>
            </View>
            <TouchableOpacity style={s.attachBtn} onPress={pickCommentPhoto}>
              <Ionicons name="image-outline" size={21} color={c.textMuted} />
            </TouchableOpacity>
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
              style={[s.sendBtn, !commentText.trim() && !commentImage && { backgroundColor: c.placeholder }]}
              onPress={handleAddComment}
              disabled={!commentText.trim() && !commentImage}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Per-comment actions. What appears depends on who you are: the author
          may edit or delete, the post's author may pin, anyone else may report. */}
      <Modal visible={!!menuFor && !editing} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity style={s.sheetBg} activeOpacity={1} onPress={() => setMenuFor(null)}>
          <View style={s.sheet}>
            <View style={s.sheetGrab} />
            {menuFor && isCommentMine(menuFor, user.id, displayName) ? (
              <>
                <TouchableOpacity style={s.sheetRow} onPress={() => { setEditText(menuFor.text); setEditing(menuFor); }}>
                  <Ionicons name="create-outline" size={21} color={c.text} />
                  <Text style={s.sheetTxt}>{tx('Edit comment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.sheetRow} onPress={() => handleDeleteComment(menuFor)}>
                  <Ionicons name="trash-outline" size={21} color={c.red} />
                  <Text style={[s.sheetTxt, {color:c.red}]}>{tx('Delete comment')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={s.sheetRow} onPress={() => { const target = menuFor; setMenuFor(null); setReportFor(target); }}>
                <Ionicons name="flag-outline" size={21} color={c.red} />
                <Text style={[s.sheetTxt, {color:c.red}]}>{tx('Report comment')}</Text>
              </TouchableOpacity>
            )}

            {/* Pinning belongs to whoever wrote the post, not to the commenter. */}
            {!!post && isAuthoredBy(post, user.id, displayName) && !!menuFor && (
              <TouchableOpacity style={s.sheetRow} onPress={() => {
                togglePinComment(post.id, menuFor.id);
                const wasPinned = menuFor.pinned;
                setMenuFor(null);
                showToast(wasPinned ? tx('Unpinned') : tx('Pinned'),
                          wasPinned ? tx('The comment is back in order.') : tx('It now sits at the top.'), 'success');
              }}>
                <Ionicons name={menuFor.pinned ? 'remove-circle-outline' : 'pin-outline'} size={21} color={c.gold} />
                <Text style={[s.sheetTxt, {color:c.gold}]}>
                  {menuFor.pinned ? tx('Unpin comment') : tx('Pin to top')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={s.sheetCancel} onPress={() => setMenuFor(null)}>
              <Text style={s.sheetCancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Editing your own comment */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setEditing(null); setMenuFor(null); }}>
        <SafeAreaView style={{flex:1, backgroundColor: c.bg}} edges={['top']}>
          <View style={s.editHdr}>
            <TouchableOpacity onPress={() => { setEditing(null); setMenuFor(null); }}>
              <Text style={s.editCancel}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={s.editTitle}>{tx('Edit comment')}</Text>
            <TouchableOpacity style={s.editSave} onPress={() => { handleSaveEdit(); setMenuFor(null); }} disabled={!editText.trim()}>
              <Text style={s.editSaveTxt}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            maxLength={500}
          />
        </SafeAreaView>
      </Modal>

      {/* Reporting one comment, with the same reasons a post uses */}
      <Modal visible={!!reportFor} transparent animationType="fade" onRequestClose={() => setReportFor(null)}>
        <TouchableOpacity style={s.sheetBg} activeOpacity={1} onPress={() => setReportFor(null)}>
          <View style={s.sheet}>
            <View style={s.sheetGrab} />
            <Text style={s.sheetTitle}>{tx('Report comment')}</Text>
            {([
              ['spam','Spam'],
              ['harassment','Harassment or bullying'],
              ['inappropriate','Inappropriate content'],
              ['misleading','False or misleading information'],
              ['hate_speech','Hate speech'],
              ['other','Other'],
            ] as [ReportReason,string][]).map(([id,label]) => (
              <TouchableOpacity key={id} style={s.sheetRow} onPress={() => {
                if (post && reportFor) reportComment(post.id, reportFor.id, id, displayName);
                setReportFor(null);
                showToast(tx('Reported'), tx('Thanks for telling us. Our team will take a look.'), 'info');
              }}>
                <Text style={s.sheetTxt}>{tx(label)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.sheetCancel} onPress={() => setReportFor(null)}>
              <Text style={s.sheetCancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function CommentRow({ comment, postId, onReply, onLike, onReplyLike, onMenu }: {
  comment: Comment; postId: string;
  onReply: () => void; onLike: () => void; onReplyLike: (id: string) => void;
  onMenu: () => void;
}) {
  const c = useThemeColors();
  const cs = makeCs(c);
  const [showReplies, setShowReplies] = useState(true);
  const { t } = useTranslation();

  return (
    <View style={cs.wrap}>
      {/* Comment */}
      <View style={cs.row}>
        <CommentAvatar
          author={comment.author} initials={comment.initials} color={comment.color}
          city={comment.city} state={comment.state}
          avatarStyle={cs.avatar} textStyle={cs.avatarTxt}
        />
        <View style={{ flex: 1 }}>
          {!!comment.pinned && (
            <View style={cs.pinnedTag}>
              <Ionicons name="pin" size={11} color={c.gold} />
              <Text style={cs.pinnedTxt}>Pinned</Text>
            </View>
          )}
          <View style={cs.metaRow}>
            <Text style={cs.name}>{comment.author}</Text>
            {comment.city && comment.state && <Text style={cs.meta}> · {comment.city}, {comment.state}</Text>}
            <Text style={cs.meta}> · {comment.time}</Text>
            {!!comment.edited && <Text style={cs.meta}> · edited</Text>}
            <View style={{flex:1}} />
            <TouchableOpacity onPress={onMenu} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="ellipsis-horizontal" size={15} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          {!!comment.text && <Text style={cs.text}>{comment.text}</Text>}
          {!!comment.image && (
            <Image source={{uri: comment.image}} style={cs.commentImage} resizeMode="cover" />
          )}
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
          <CommentAvatar
            author={reply.author} initials={reply.initials} color={reply.color}
            city={reply.city} state={reply.state}
            avatarStyle={cs.replyAvatar} textStyle={cs.replyAvatarTxt}
          />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, height: 38 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  scroll: { flex: 1 },
  originalPost: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, backgroundColor: c.card },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  postAuthorName: { fontSize: 15, fontWeight: '700', color: c.text },
  churchBadge: { backgroundColor: 'rgba(201,169,110,0.15)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  churchBadgeTxt: { fontSize: 10, fontWeight: '700', color: c.gold },
  postMeta: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  postContent: { fontSize: 15, color: c.text, lineHeight: 23, marginBottom: 12 },
  postStats: { borderTopWidth: 1, borderTopColor: c.cardAlt, paddingTop: 10 },
  postStatTxt: { fontSize: 13, color: c.textMuted },
  divider: { height: 8, backgroundColor: c.cardAlt },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  sortRow: { flexDirection: 'row', gap: 6 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, backgroundColor: c.cardAlt },
  sortBtnOn: { backgroundColor: c.navy },
  sortTxt: { fontSize: 11, fontWeight: '600', color: c.textMuted },
  sortTxtOn: { color: c.white },
  attachBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  attachPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 8 },
  attachThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: c.cardAlt },
  attachTxt: { flex: 1, fontSize: 13, color: c.textMuted },
  quickRow: { paddingHorizontal: 12, paddingBottom: 8 },
  quickBtn: { paddingHorizontal: 9, paddingVertical: 5, marginRight: 6, borderRadius: 100, backgroundColor: c.cardAlt },
  quickTxt: { fontSize: 19 },
  sheetBg: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 30 },
  sheetGrab: { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginVertical: 10 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, paddingVertical: 15 },
  sheetTxt: { fontSize: 15, fontWeight: '600', color: c.text },
  sheetCancel: { paddingVertical: 15, marginTop: 4, alignItems: 'center' },
  sheetCancelTxt: { fontSize: 15, fontWeight: '600', color: c.textMuted },
  editHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  editCancel: { fontSize: 15, color: c.textMuted },
  editTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  editSave: { backgroundColor: c.primary, borderRadius: 100, paddingHorizontal: 18, paddingVertical: 8 },
  editSaveTxt: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  editInput: { flex: 1, fontSize: 16, color: c.text, padding: 20, textAlignVertical: 'top' },
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
  commentImage: { width: '100%', aspectRatio: 4/3, borderRadius: 12, marginBottom: 8, backgroundColor: c.cardAlt },
  pinnedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  pinnedTxt: { fontSize: 10, fontWeight: '700', color: c.gold, letterSpacing: 0.4, textTransform: 'uppercase' },
  text: { fontSize: 14, color: c.text, lineHeight: 21, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  replyWrap: { flexDirection: 'row', gap: 10, marginTop: 14, marginLeft: 50 },
  replyAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  replyAvatarTxt: { color: '#fff', fontWeight: '700', fontSize: 11 },
});
