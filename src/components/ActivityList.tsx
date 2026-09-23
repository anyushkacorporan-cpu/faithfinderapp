import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { useActivity } from '../lib/activityStore';
import { usePosts, toggleLike } from '../lib/postsStore';
import { isBlocked, useBlocked } from '../lib/blockStore';
import { isHidden, useHidden } from '../lib/hiddenStore';
import { PostCard } from './PostCard';
import { useTranslation } from '../lib/i18n';

/**
 * The posts you have liked or commented on.
 *
 * Lifted out of app/activity.tsx so the profile's Activity tab and the
 * /activity route show the same thing. The derivation below is the whole
 * reason: it filters your history through the block list and the hidden list,
 * and two copies of that would be one copy getting fixed and one not.
 *
 * Renders the list only — no header, no SafeAreaView. Whoever mounts it owns
 * the chrome, which is what lets a tab and a pushed screen share it.
 */
export function ActivityList() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const activity = useActivity();
  const allPosts = usePosts();

  // Re-render when the block list changes so an unblock shows immediately.
  useBlocked();
  useHidden();

  const likedCommentedPosts = activity
    .filter(a => a.type === 'like' || a.type === 'comment')
    .map(a => {
      const post = allPosts.find(p => p.id === a.postId);
      return post ? { activity: a, post } : null;
    })
    // Something you liked last week belongs to someone you may have blocked
    // since. Your own history is not a way back to their content.
    .filter(item => !!item && !isBlocked(item.post.authorId, item.post.authorName) && !isHidden(item.post.id));

  // Deduplicate by postId (show each post once even if both liked and commented)
  const seen = new Set<string>();
  const uniquePosts = likedCommentedPosts.filter(item => {
    if (seen.has(item!.post.id)) return false;
    seen.add(item!.post.id);
    return true;
  });

  if (uniquePosts.length === 0) {
    return (
      <View style={s.empty}>
        <Ionicons name="pulse-outline" size={44} color={c.placeholder} />
        <Text style={s.emptyTxt}>{t('noActivityYet')}</Text>
        <Text style={s.emptySub}>{t('postsYouLike')}</Text>
      </View>
    );
  }

  return (
    <View style={{paddingTop:8}}>
      {uniquePosts.map(item => (
        <PostCard
          key={item!.post.id}
          post={item!.post}
          showLocation={!!(item!.post.city && item!.post.state)}
          onLike={() => toggleLike(item!.post.id)}
          onComment={() => router.push({ pathname: '/comments', params: { postId: item!.post.id } })}
          onShare={() => {}}
          onOpenProfile={() => router.push({ pathname: '/user-profile', params: { name: item!.post.authorName } })}
        />
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  empty:{paddingVertical:80,alignItems:'center',gap:10,paddingHorizontal:40},
  emptyTxt:{fontSize:16,fontWeight:'600',color:c.textMuted},
  emptySub:{fontSize:13,color:c.textMuted,textAlign:'center',lineHeight:18},
});
