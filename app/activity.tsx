import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useActivity } from '../src/lib/activityStore';
import { usePosts, toggleLike } from '../src/lib/postsStore';
import { PostCard } from '../src/components/PostCard';

export default function ActivityScreen() {
  const activity = useActivity();
  const allPosts = usePosts();

  const likedCommentedPosts = activity
    .filter(a => a.type === 'like' || a.type === 'comment')
    .map(a => {
      const post = allPosts.find(p => p.id === a.postId);
      return post ? { activity: a, post } : null;
    })
    .filter(Boolean);

  // Deduplicate by postId (show each post once even if both liked and commented)
  const seen = new Set<string>();
  const uniquePosts = likedCommentedPosts.filter(item => {
    if (seen.has(item!.post.id)) return false;
    seen.add(item!.post.id);
    return true;
  });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Activity</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {uniquePosts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="pulse-outline" size={44} color="#ddd" />
            <Text style={s.emptyTxt}>No activity yet</Text>
            <Text style={s.emptySub}>Posts you like or comment on will appear here.</Text>
          </View>
        ) : (
          <View style={{paddingTop:8}}>
            {uniquePosts.map(item => (
              <PostCard
                key={item!.post.id}
                post={item!.post}
                showLocation={!!(item!.post.city && item!.post.state)}
                onLike={() => toggleLike(item!.post.id)}
                onComment={() => router.push({ pathname: '/comments' as any, params: { postId: item!.post.id } })}
                onShare={() => {}}
                onOpenProfile={() => router.push({ pathname: '/user-profile' as any, params: { name: item!.post.authorName } })}
              />
            ))}
          </View>
        )}
        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  empty:{paddingVertical:80,alignItems:'center',gap:10,paddingHorizontal:40},
  emptyTxt:{fontSize:16,fontWeight:'600',color:'#999'},
  emptySub:{fontSize:13,color:'#bbb',textAlign:'center',lineHeight:18},
});
