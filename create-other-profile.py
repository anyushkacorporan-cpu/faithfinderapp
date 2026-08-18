import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

screen = """import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import { COLORS } from '../src/lib/constants';
import { usePosts } from '../src/lib/postsStore';
import { PostCard } from '../src/components/PostCard';

export default function OtherUserProfileScreen() {
  const params = useLocalSearchParams<{
    id?: string; name?: string; initials?: string; color?: string;
    type?: string; city?: string; state?: string;
  }>();

  const allPosts = usePosts();
  const displayName = params.name || 'User';
  const initials = params.initials || displayName.slice(0,2).toUpperCase();
  const color = params.color || COLORS.gold;
  const isChurch = params.type === 'church';
  const userPosts = allPosts.filter(p => p.authorName === displayName);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.coverWrap}>
          <View style={s.cover} />
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <View style={[s.avatar,{backgroundColor:color}]}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
          </View>
        </View>

        <View style={s.personalInfo}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={s.name}>{displayName}</Text>
            {isChurch && <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>Church</Text></View>}
          </View>

          {!!(params.city && params.state) && (
            <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:10}}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={{fontSize:13,color:'#888'}}>{params.city}, {params.state}</Text>
            </View>
          )}
        </View>

        <View style={s.tabsRow}>
          <View style={[s.tab, s.tabActive]}>
            <Text style={[s.tabTxt, s.tabTxtActive]}>Posts</Text>
          </View>
        </View>

        {userPosts.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#ddd" />
            <Text style={s.emptyTxt}>No posts yet</Text>
          </View>
        ) : (
          <View>
            {userPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                showLocation={true}
                onLike={() => {}}
                onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                onShare={() => {}}
                onOpenProfile={() => {}}
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
  root:{flex:1,backgroundColor:COLORS.white},
  coverWrap:{position:'relative'},
  cover:{width:'100%',height:160,backgroundColor:COLORS.navy},
  backBtn:{position:'absolute',top:14,left:14,width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.35)',alignItems:'center',justifyContent:'center'},
  avatarWrap:{position:'absolute',bottom:-40,left:0,right:0,alignItems:'center'},
  avatar:{width:80,height:80,borderRadius:40,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.15,shadowRadius:6},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:22},
  personalInfo:{paddingHorizontal:16,alignItems:'center',paddingTop:48,paddingBottom:16},
  name:{fontSize:19,fontWeight:'700',color:COLORS.navy,fontFamily:undefined},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:COLORS.border},
  tab:{flex:1,alignItems:'center',paddingVertical:12},
  tabActive:{borderBottomWidth:2,borderBottomColor:COLORS.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:'#999'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  emptyState:{paddingVertical:40,alignItems:'center',gap:8,paddingHorizontal:40},
  emptyTxt:{fontSize:15,fontWeight:'600',color:'#999'},
});
"""

with open('app/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(screen)
print('Created app/profile.tsx')
print('ALL DONE')
