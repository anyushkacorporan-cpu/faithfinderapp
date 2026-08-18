import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

new_file = r"""import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS } from '../../src/lib/constants';
import { usePosts, addPost, toggleLike, Post } from '../../src/lib/postsStore';
import { getUser } from '../../src/lib/userStore';
import { useConnections, isConnected } from '../../src/lib/connectionsStore';

type Visibility = 'public' | 'connections';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'foryou'|'discover'>('foryou');
  const allPosts = usePosts();
  const connections = useConnections();
  const user = getUser();

  const connectedNames = connections.map(c => c.name);
  const posts = activeTab === 'foryou'
    ? allPosts.filter(p =>
        (p.feed === 'foryou' || p.feed === 'both') &&
        (connectedNames.includes(p.authorName) || p.authorInitials === initials)
      )
    : allPosts.filter(p => p.feed === 'discover' || p.feed === 'both');

  const [showCreate, setShowCreate] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showLocation, setShowLocation] = useState(true);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();

  function handleCreatePost() {
    if (!newPostText.trim()) return;
    addPost({
      authorName: displayName, authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea', content: newPostText.trim(), time: 'now',
      city: showLocation ? user.location?.split(',')[0]?.trim() : undefined,
      state: showLocation ? user.location?.split(',')[1]?.trim() : undefined,
      feed: visibility === 'public' ? 'discover' : 'foryou',
    });
    setNewPostText(''); setShowCreate(false); setVisibility('public'); setShowLocation(true);
  }

  function openProfile(post: Post) {
    router.push({
      pathname: '/profile' as any,
      params: { id: post.id, name: post.authorName, initials: post.authorInitials, color: post.authorColor, type: post.authorType, city: post.city || '', state: post.state || '' }
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tabPill, activeTab===tab&&s.tabPillActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabPillTxt, activeTab===tab&&s.tabPillTxtActive]}>{tab === 'foryou' ? 'For You' : 'Discover'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.composeBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="create-outline" size={18} color={COLORS.white} />
          <Text style={s.composeBtnTxt}>Post</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'discover' && (
        <View style={s.discoverBanner}>
          <Ionicons name="earth-outline" size={14} color={COLORS.gold} />
          <Text style={s.discoverTxt}>Believers from all 50 states · Join the conversation</Text>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {posts.length === 0 && activeTab === 'foryou' && (
          <View style={s.emptyFeed}>
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={s.emptyTitle}>Your feed is quiet</Text>
            <Text style={s.emptySub}>Connect with churches and believers to see their posts here</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setActiveTab('discover')}>
              <Text style={s.emptyBtnTxt}>Browse Discover</Text>
            </TouchableOpacity>
          </View>
        )}
        {posts.map(post => (
          <PostCard key={post.id} post={post} showLocation={activeTab === 'discover'}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => { setSharePost(post); setShareMessage(''); }}
            onOpenProfile={() => openProfile(post)}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Create Post */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor: COLORS.white }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewPostText(''); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={[s.postBtn, !newPostText.trim()&&{opacity:0.4}]} onPress={handleCreatePost} disabled={!newPostText.trim()}>
              <Text style={s.postBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:40}}>
              <View style={s.composeAuthor}>
                <View style={[s.composeAvatar,{backgroundColor:'#667eea'}]}>
                  <Text style={s.composeAvatarTxt}>{initials}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.composeAuthorName}>{displayName}</Text>
                  <View style={s.visibilityRow}>
                    {(['public','connections'] as Visibility[]).map(v => (
                      <TouchableOpacity key={v} style={[s.visChip, visibility===v&&s.visChipActive]} onPress={() => setVisibility(v)}>
                        <Ionicons name={v==='public'?'earth-outline':'people-outline'} size={11} color={visibility===v?COLORS.white:COLORS.navy}/>
                        <Text style={[s.visChipTxt, visibility===v&&{color:COLORS.white}]}>{v==='public'?'Public':'Connections'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <TextInput style={s.composeInput} placeholder="What's on your heart?" placeholderTextColor="#bbb" value={newPostText} onChangeText={setNewPostText} multiline autoFocus/>
              <View style={s.locationToggle}>
                <Ionicons name="location-outline" size={15} color={showLocation?COLORS.gold:'#ccc'}/>
                <Text style={[s.locationToggleTxt,{color:showLocation?COLORS.navy:'#bbb'}]}>{showLocation&&user.location?user.location:'Show my location'}</Text>
                <TouchableOpacity style={[s.toggleSwitch,showLocation&&s.toggleOn]} onPress={() => setShowLocation(!showLocation)}>
                  <View style={[s.toggleThumb,showLocation&&s.toggleThumbOn]}/>
                </TouchableOpacity>
              </View>
              <View style={s.composeHint}>
                <Ionicons name={visibility==='public'?'earth-outline':'people-outline'} size={13} color={COLORS.gold}/>
                <Text style={s.composeHintTxt}>{visibility==='public'?'Visible to everyone in Discover':'Visible only to your connections in For You'}</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Share */}
      <Modal visible={!!sharePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setSharePost(null); setShareMessage(''); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Share Post</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              addPost({authorName:displayName,authorInitials:initials,authorType:user.accountType==='church'?'church':'personal',authorColor:'#667eea',content:shareMessage.trim(),time:'now',feed:'both'});
              setSharePost(null); setShareMessage('');
            }}>
              <Text style={s.postBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:40}}>
              <View style={{flexDirection:'row',padding:16,gap:12}}>
                <View style={[s.composeAvatar,{backgroundColor:'#667eea'}]}>
                  <Text style={s.composeAvatarTxt}>{initials}</Text>
                </View>
                <View style={{flex:1}}>
                  <TextInput style={{fontSize:15,color:COLORS.navy,minHeight:60,lineHeight:23}} placeholder="Add your thoughts..." placeholderTextColor="#bbb" value={shareMessage} onChangeText={setShareMessage} multiline autoFocus/>
                  {sharePost&&(
                    <View style={s.quotedCard}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                        <View style={[s.composeAvatar,{width:26,height:26,borderRadius:13,backgroundColor:sharePost.authorColor}]}>
                          <Text style={[s.composeAvatarTxt,{fontSize:10}]}>{sharePost.authorInitials}</Text>
                        </View>
                        <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{sharePost.authorName}</Text>
                      </View>
                      <Text style={{fontSize:13,color:'#555',lineHeight:19}} numberOfLines={3}>{sharePost.content}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:20}}>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
                <Text style={{fontSize:11,color:'#bbb'}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20}}>
                {[
                  {label:'Messages',icon:'chatbubble-outline',color:'#2ecc71',bg:'#e8f8f0',fn:()=>{const m=sharePost?.content||'';require('react-native').Linking.openURL('sms:&body='+encodeURIComponent(m)).catch(()=>{});}},
                  {label:'Email',icon:'mail-outline',color:'#3498db',bg:'#eaf4fb',fn:()=>{const m=sharePost?.content||'';require('react-native').Linking.openURL('mailto:?subject=Check this out&body='+encodeURIComponent(m)).catch(()=>{});}},
                  {label:'More',icon:'share-social-outline',color:'#9b59b6',bg:'#f5eefb',fn:()=>{const p=sharePost;setSharePost(null);setTimeout(()=>Share.share({message:p?.content||''}).catch(()=>{}),500);}},
                ].map(o=>(
                  <TouchableOpacity key={o.label} style={{alignItems:'center',gap:8}} onPress={o.fn}>
                    <View style={{width:54,height:54,borderRadius:16,backgroundColor:o.bg,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name={o.icon as any} size={22} color={o.color}/>
                    </View>
                    <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PostCard({post,showLocation,onLike,onComment,onShare,onOpenProfile}:{
  post:Post; showLocation:boolean; onLike:()=>void; onComment:()=>void; onShare:()=>void; onOpenProfile:()=>void;
}) {
  return (
    <View style={p.card}>
      <View style={p.authorRow}>
        <TouchableOpacity onPress={onOpenProfile}>
          <View style={[p.avatar,{backgroundColor:post.authorColor}]}>
            <Text style={p.avatarTxt}>{post.authorInitials}</Text>
          </View>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <TouchableOpacity onPress={onOpenProfile} style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <Text style={p.authorName}>{post.authorName}</Text>
            {post.authorType==='church'&&<View style={p.churchBadge}><Text style={p.churchBadgeTxt}>Church</Text></View>}
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Text style={p.time}>{post.time}</Text>
            {showLocation&&post.city&&post.state&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}, {post.state}</Text></>
            )}
          </View>
        </View>
      </View>

      {!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="cover"/>}

      {showLocation&&post.city&&post.state&&(
        <View style={p.locationPill}>
          <Ionicons name="location" size={12} color={COLORS.gold}/>
          <Text style={p.locationPillTxt}>{post.city}, {post.state}</Text>
        </View>
      )}

      {post.eventShareData&&(
        <TouchableOpacity style={p.sharedCard} onPress={()=>router.push({pathname:'/event-detail' as any,params:{id:post.eventShareData!.id}})}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
            <View style={{width:22,height:22,borderRadius:6,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="calendar" size={12} color={COLORS.gold}/>
            </View>
            <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1}} numberOfLines={1}>{post.eventShareData.title}</Text>
          </View>
          <Text style={{fontSize:11,color:'#888'}}>{post.eventShareData.date} · {post.eventShareData.location}</Text>
          <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700',marginTop:4}}>View Event →</Text>
        </TouchableOpacity>
      )}
      {post.churchShareData&&(
        <View style={p.sharedCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
            <View style={{width:22,height:22,borderRadius:6,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="business" size={12} color={COLORS.gold}/>
            </View>
            <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1}} numberOfLines={1}>{post.churchShareData.name}</Text>
          </View>
          <Text style={{fontSize:11,color:'#888'}}>{post.churchShareData.address}</Text>
          <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700',marginTop:4}}>View Church →</Text>
        </View>
      )}

      <View style={p.actions}>
        <TouchableOpacity style={p.actionBtn} onPress={onLike}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?'#e74c6f':'#999'}/>
          <Text style={[p.actionTxt,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>{post.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  tabBar:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#999'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  composeBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.navy,borderRadius:22,paddingHorizontal:16,paddingVertical:9},
  composeBtnTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  discoverBanner:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:9,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)'},
  discoverTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  scroll:{flex:1},
  emptyFeed:{alignItems:'center',paddingVertical:64,paddingHorizontal:32,gap:12},
  emptyTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  emptySub:{fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20},
  emptyBtn:{marginTop:8,backgroundColor:COLORS.navy,borderRadius:22,paddingHorizontal:28,paddingVertical:13},
  emptyBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  cancelTxt:{fontSize:15,color:'#888'},
  modalTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  postBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:8},
  postBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  composeAuthor:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:16,paddingBottom:8},
  composeAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  composeAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:15},
  composeAuthorName:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:8},
  visibilityRow:{flexDirection:'row',gap:8},
  visChip:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1.5,borderColor:COLORS.navy,borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  visChipActive:{backgroundColor:COLORS.navy},
  visChipTxt:{fontSize:11,fontWeight:'700',color:COLORS.navy},
  composeInput:{fontSize:16,color:COLORS.navy,lineHeight:25,minHeight:140,paddingHorizontal:16,paddingVertical:8,textAlignVertical:'top'},
  locationToggle:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:16,paddingVertical:14,borderTopWidth:1,borderTopColor:'#f0ede8'},
  locationToggleTxt:{flex:1,fontSize:13},
  toggleSwitch:{width:46,height:27,borderRadius:14,backgroundColor:'#ddd',padding:3},
  toggleOn:{backgroundColor:COLORS.gold},
  toggleThumb:{width:21,height:21,borderRadius:11,backgroundColor:COLORS.white},
  toggleThumbOn:{transform:[{translateX:19}]},
  composeHint:{flexDirection:'row',alignItems:'flex-start',gap:8,marginHorizontal:16,paddingVertical:10},
  composeHintTxt:{flex:1,fontSize:12,color:'#aaa',lineHeight:18},
  quotedCard:{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,padding:12,marginTop:8,backgroundColor:'#faf9f6'},
});

const p = StyleSheet.create({
  card:{backgroundColor:COLORS.white,marginBottom:8,paddingVertical:14,paddingHorizontal:16,borderBottomWidth:1,borderTopWidth:1,borderColor:'#f0ede8'},
  authorRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  avatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:15},
  authorName:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  time:{fontSize:12,color:'#bbb'},
  dot:{fontSize:12,color:'#bbb'},
  locationTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  content:{fontSize:15,color:'#333',lineHeight:23,marginBottom:10},
  image:{width:'100%',height:220,borderRadius:12,marginBottom:10},
  locationPill:{flexDirection:'row',alignItems:'center',gap:4,alignSelf:'flex-start',backgroundColor:'rgba(201,169,110,0.08)',borderRadius:100,paddingHorizontal:10,paddingVertical:4,marginBottom:10},
  locationPillTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  sharedCard:{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,padding:12,marginBottom:10,backgroundColor:'#faf9f6'},
  actions:{flexDirection:'row',alignItems:'center',paddingTop:10,borderTopWidth:1,borderTopColor:'#f5f3ef',marginTop:4},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingVertical:4},
  actionTxt:{fontSize:13,color:'#999',fontWeight:'500'},
});
"""

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(new_file)
print('DONE community.tsx - wrote', len(new_file), 'chars')

# Also fix comments.tsx - make avatars/names tappable
import os
if os.path.exists('app/comments.tsx'):
    with open('app/comments.tsx', 'r', encoding='utf-8') as f:
        c = f.read()
    # Replace Alert.alert profile placeholders with router.push
    c = c.replace(
        "onPress={() => Alert.alert(comment.author, 'Profile coming soon!')}",
        "onPress={() => router.push({pathname:'/profile' as any, params:{id:comment.id,name:comment.author,initials:comment.initials,color:comment.color,type:'user',city:comment.city||'',state:comment.state||''}})}"
    )
    c = c.replace(
        "onPress={() => Alert.alert(reply.author, 'Profile coming soon!')}",
        "onPress={() => router.push({pathname:'/profile' as any, params:{id:reply.id,name:reply.author,initials:reply.initials,color:reply.color,type:'user',city:reply.city||'',state:reply.state||''}})}"
    )
    # Also make the name text tappable in comments
    with open('app/comments.tsx', 'w', encoding='utf-8') as f:
        f.write(c)
    print('comments.tsx updated')
else:
    print('comments.tsx not found - skipping')

