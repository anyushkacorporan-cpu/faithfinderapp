import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert, Image, ActivityIndicator, RefreshControl, ImageBackground} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { extractFirstUrl, fetchLinkPreview, LinkPreviewData } from '../../src/lib/linkPreview';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { getDailyVerse } from '../../src/lib/dailyVerse';
import { COLORS } from '../../src/lib/constants';
import { useConfirm } from '../../src/components/Confirm';
import { useToast } from '../../src/components/Toast';
import { getCurrentCityState } from '../../src/lib/userLocation';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';
import { PostCard } from '../../src/components/PostCard';
import { usePosts, addPost, toggleLike, Post, editPost, deletePost, reportPost, repostPost } from '../../src/lib/postsStore';
import { getUser } from '../../src/lib/userStore';
import { useConnections, isConnected } from '../../src/lib/connectionsStore';

type Visibility = 'public' | 'connections';

export default function CommunityScreen() {
  const { showConfirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'foryou'|'discover'>('foryou');
  const allPosts = usePosts();
  const { showToast } = useToast();
  const appSettings = useSettings();
  const { t } = useTranslation();
  const connections = useConnections();
  const user = getUser();

  const connectedNames = connections.map(c => c.name);
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();
  const posts = activeTab === 'foryou'
    ? allPosts.filter(p =>
        p.authorName === displayName || connectedNames.includes(p.authorName)
      )
    : allPosts.filter(p => p.feed === 'discover' || p.feed === 'both');

  const [showCreate, setShowCreate] = useState(false);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [reportPostTarget, setReportPostTarget] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState('');
  const [repostTarget, setRepostTarget] = useState<Post | null>(null);
  const [showRepostCompose, setShowRepostCompose] = useState(false);
  const [repostComment, setRepostComment] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [linkPreviewData, setLinkPreviewData] = useState<LinkPreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showLocation, setShowLocation] = useState(true);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [shareMessage, setShareMessage] = useState('');

  async function handleCreatePost() {
    if (isPosting) return;
    if (!newPostText.trim()) return;
    setIsPosting(true);

    let city: string | undefined;
    let state: string | undefined;
    if (appSettings.location.locationEnabled) {
      const loc = await getCurrentCityState();
      if (loc) { city = loc.city; state = loc.state; }
    }

    addPost({
      image: newPostImage || undefined,
      linkUrl: detectedUrl || undefined,
      linkPreview: linkPreviewData || undefined,
      authorName: displayName, authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea', authorPhoto: user.profilePhoto, content: newPostText.trim(), time: 'now',
      city,
      state,
      feed: visibility === 'public' ? 'discover' : 'foryou',
    });
    setNewPostText(''); setNewPostImage(null); setDetectedUrl(null); setLinkPreviewData(null);
    setShowCreate(false); setVisibility('public'); setShowLocation(true);
    setIsPosting(false);
  }

  function openProfile(post: Post) {
    router.push({
      pathname: '/user-profile' as any,
      params: { id: post.id, name: post.authorName, initials: post.authorInitials, color: post.authorColor, type: post.authorType, city: post.city || '', state: post.state || '', photo: post.authorPhoto || '' }
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <View style={s.verseBar}>
        <View style={s.verseAccent} />
        <Text style={s.verseTxt}>{getDailyVerse(appSettings.appearance.language).text} <Text style={s.verseRef}>— {getDailyVerse(appSettings.appearance.language).reference}</Text></Text>
      </View>

      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tabPill, activeTab===tab&&s.tabPillActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabPillTxt, activeTab===tab&&s.tabPillTxtActive]}>{tab === 'foryou' ? t('forYou') : t('discover')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.composeBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="create-outline" size={18} color={COLORS.white} />
          <Text style={s.composeBtnTxt}>{t('post')}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'discover' && (
        <View style={s.discoverBanner}>
          <Ionicons name="earth-outline" size={14} color={COLORS.gold} />
          <Text style={s.discoverTxt}>Believers from all 50 states · Join the conversation</Text>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#c9a96e" colors={["#c9a96e"]} />}>
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
          <PostCard key={post.id} post={post} showLocation={!!(post.city && post.state)}
            isOwnPost={post.authorName === displayName}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => { setRepostTarget(post); setRepostComment(''); setShowRepostCompose(false); }}
            onOpenProfile={() => openProfile(post)}
            onMenu={() => setMenuPost(post)}
            onRepost={() => { setRepostTarget(post); setRepostComment(''); }}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Create Post */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex:1, backgroundColor: COLORS.white }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewPostText(''); setNewPostImage(null); setDetectedUrl(null); setLinkPreviewData(null); setDetectedUrl(null); setLinkPreviewData(null); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={[s.postBtn, (!newPostText.trim()||isPosting)&&{opacity:0.4}]} onPress={handleCreatePost} disabled={!newPostText.trim()||isPosting}>
              <Text style={s.postBtnTxt}>{t('post')}</Text>
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
                  <TouchableOpacity
                    style={s.visToggle}
                    onPress={() => setVisibility(visibility === 'public' ? 'connections' : 'public')}
                  >
                    <Ionicons name={visibility==='public'?'earth':'people'} size={13} color={COLORS.navy}/>
                    <Text style={s.visToggleTxt}>{visibility==='public'?'Public':'Connections'}</Text>
                    <Ionicons name="swap-horizontal" size={13} color="#bbb"/>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput
                style={s.composeInput}
                placeholder="What's on your heart?"
                placeholderTextColor="#bbb"
                value={newPostText}
                onChangeText={(t) => {
                  setNewPostText(t);
                  const url = extractFirstUrl(t);
                  if (url && url !== detectedUrl) {
                    setDetectedUrl(url);
                    setLoadingPreview(true);
                    setLinkPreviewData(null);
                    fetchLinkPreview(url).then(data => {
                      setLinkPreviewData(data);
                      setLoadingPreview(false);
                    });
                  } else if (!url && detectedUrl) {
                    setDetectedUrl(null);
                    setLinkPreviewData(null);
                  }
                }}
                multiline
                autoFocus
              />

              {newPostImage && (
                <View style={{marginHorizontal:16,marginBottom:12,position:'relative'}}>
                  <Image source={{uri:newPostImage}} style={{width:'100%',height:280,borderRadius:14,backgroundColor:'#f5f3ef'}} resizeMode="contain"/>
                  <TouchableOpacity
                    style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:14,backgroundColor:'rgba(0,0,0,0.55)',alignItems:'center',justifyContent:'center'}}
                    onPress={() => setNewPostImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#fff"/>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:14,alignSelf:'flex-start'}}
                onPress={async () => {
                  const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') return;
                  const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,quality:0.8});
                  if (!result.canceled) setNewPostImage(result.assets[0].uri);
                }}
              >
                <Ionicons name="image-outline" size={18} color={COLORS.gold}/>
                <Text style={{fontSize:13,fontWeight:'600',color:COLORS.gold}}>{newPostImage ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>

              {loadingPreview && (
                <View style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:14}}>
                  <ActivityIndicator size="small" color={COLORS.gold}/>
                  <Text style={{fontSize:12,color:'#999'}}>Fetching link preview...</Text>
                </View>
              )}

              {linkPreviewData && !loadingPreview && (
                <View style={{marginHorizontal:16,marginBottom:14,borderWidth:1,borderColor:'#f0ede8',borderRadius:14,overflow:'hidden',backgroundColor:'#faf9f6'}}>
                  {!!linkPreviewData.image && (
                    <Image source={{uri:linkPreviewData.image}} style={{width:'100%',height:160}} resizeMode="cover"/>
                  )}
                  <View style={{padding:12}}>
                    {!!linkPreviewData.siteName && (
                      <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700',textTransform:'uppercase',marginBottom:2}}>{linkPreviewData.siteName}</Text>
                    )}
                    {!!linkPreviewData.title && (
                      <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={2}>{linkPreviewData.title}</Text>
                    )}
                    {!!linkPreviewData.description && (
                      <Text style={{fontSize:12,color:'#888',marginTop:3}} numberOfLines={2}>{linkPreviewData.description}</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={s.composeHint}>
                <Ionicons name={visibility==='public'?'earth-outline':'people-outline'} size={13} color={COLORS.gold}/>
                <Text style={s.composeHintTxt}>{visibility==='public'?'Visible to everyone in Discover':'Visible only to your connections in For You'}</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

            {/* Post Options Menu */}
      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setMenuPost(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            {menuPost && menuPost.authorName === displayName ? (
              <>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  setEditingPost(menuPost); setEditText(menuPost.repostComment || menuPost.content); setMenuPost(null);
                }}>
                  <Ionicons name="create-outline" size={22} color={COLORS.navy}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:COLORS.navy}}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  const target = menuPost;
                  setMenuPost(null);
                  showConfirm({
                    title: 'Delete Post',
                    message: 'Are you sure you want to delete this post? This cannot be undone.',
                    buttons: [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deletePost(target!.id) },
                    ],
                  });
                }}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.red}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:COLORS.red}}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                setReportPostTarget(menuPost); setMenuPost(null);
              }}>
                <Ionicons name="flag-outline" size={22} color={COLORS.red}/>
                <Text style={{fontSize:15,fontWeight:'600',color:COLORS.red}}>Report Post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setMenuPost(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Post Modal */}
      <Modal visible={!!reportPostTarget} transparent animationType="fade" onRequestClose={() => setReportPostTarget(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setReportPostTarget(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:17,fontWeight:'700',color:COLORS.navy,textAlign:'center',marginBottom:4}}>Report Post</Text>
            <Text style={{fontSize:13,color:'#888',textAlign:'center',marginBottom:14,paddingHorizontal:24}}>Why are you reporting this post?</Text>
            {[
              {id:'spam', label:'Spam'},
              {id:'harassment', label:'Harassment or bullying'},
              {id:'inappropriate', label:'Inappropriate content'},
              {id:'misleading', label:'False or misleading information'},
              {id:'hate_speech', label:'Hate speech'},
              {id:'other', label:'Other'},
            ].map(reason => (
              <TouchableOpacity key={reason.id} style={{paddingHorizontal:20,paddingVertical:14,borderTopWidth:1,borderTopColor:'#f5f3ef'}} onPress={() => {
                const target = reportPostTarget;
                setReportPostTarget(null);
                reportPost(target!.id, reason.id as any, displayName);
                showToast('Reported', 'Thank you for letting us know. Our team will review this post.', 'info');
              }}>
                <Text style={{fontSize:15,color:COLORS.navy}}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setReportPostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal visible={!!editingPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingPost(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setEditingPost(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Post</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (editingPost) {
                if (editingPost.repostOf) {
                  editPost(editingPost.id, {}); // marks edited; repostComment handled below
                }
                editPost(editingPost.id, editingPost.repostOf ? {} : { content: editText });
              }
              setEditingPost(null);
            }}>
              <Text style={s.postBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.composeInput}
            multiline
            autoFocus
            value={editText}
            onChangeText={setEditText}
            placeholder="What's on your mind?"
            placeholderTextColor="#bbb"
          />
        </SafeAreaView>
      </Modal>

      {/* Share/Repost Bottom Sheet */}
      <Modal visible={!!repostTarget && !showRepostCompose} transparent animationType="fade" onRequestClose={() => setRepostTarget(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setRepostTarget(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy,textAlign:'center',marginBottom:16}}>Share Post</Text>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => setShowRepostCompose(true)}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:'rgba(102,126,234,0.12)',alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="repeat" size={22} color="#667eea"/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.navy}}>Repost</Text>
                <Text style={{fontSize:12,color:'#999',marginTop:1}}>Share to your FaithFinder feed</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd"/>
            </TouchableOpacity>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => {
              const m = repostTarget?.repostOf?.content || repostTarget?.content || '';
              setRepostTarget(null);
              setTimeout(() => Share.share({message:m,title:'Check this out on FaithFinder'}).catch(()=>{}), 350);
            }}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="arrow-redo-outline" size={22} color={COLORS.navy}/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.navy}}>Share</Text>
                <Text style={{fontSize:12,color:'#999',marginTop:1}}>Send via Messages, Mail & more</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd"/>
            </TouchableOpacity>

            <TouchableOpacity style={{paddingVertical:16,marginTop:6,alignItems:'center'}} onPress={() => setRepostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Repost Compose Screen */}
      <Modal visible={!!repostTarget && showRepostCompose} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowRepostCompose(false); setRepostTarget(null); }}>
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowRepostCompose(false); setRepostTarget(null); }}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Repost</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (repostTarget) {
                repostPost(repostTarget, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, repostComment.trim());
              }
              setShowRepostCompose(false);
              setRepostTarget(null);
            }}>
              <Text style={s.postBtnTxt}>Repost</Text>
            </TouchableOpacity>
          </View>
          <View style={s.composeAuthor}>
            <View style={[s.composeAvatar,{backgroundColor:'#667eea'}]}>
              <Text style={s.composeAvatarTxt}>{initials}</Text>
            </View>
            <Text style={s.composeAuthorName}>{displayName}</Text>
          </View>
          <TextInput
            style={[s.composeInput,{minHeight:80}]}
            multiline
            autoFocus
            value={repostComment}
            onChangeText={setRepostComment}
            placeholder="Add a comment (optional)"
            placeholderTextColor="#bbb"
          />
          {repostTarget&&(
            <View style={[s.quotedCard,{marginHorizontal:16}]}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                <View style={{width:26,height:26,borderRadius:13,backgroundColor:(repostTarget.repostOf?.authorColor)||repostTarget.authorColor,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{(repostTarget.repostOf?.authorInitials)||repostTarget.authorInitials}</Text>
                </View>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{(repostTarget.repostOf?.authorName)||repostTarget.authorName}</Text>
              </View>
              <Text style={{fontSize:13,color:'#555'}} numberOfLines={3}>{(repostTarget.repostOf?.content)||repostTarget.content}</Text>
              {!!((repostTarget.repostOf?.image)||repostTarget.image) && (
                <Image source={{uri:(repostTarget.repostOf?.image)||repostTarget.image}} style={{width:'100%',aspectRatio:16/9,borderRadius:10,marginTop:8}} resizeMode="cover"/>
              )}
              {!!((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData) && (
                <View style={{marginTop:8,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:COLORS.border}}>
                  {(((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerImage) ? (
                    <ImageBackground source={{uri: ((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerImage}} style={{aspectRatio:16/9,backgroundColor:'#f0ede6'}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerColor || ['#667eea','#764ba2']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
                  )}
                  <View style={{padding:10}}>
                    <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:COLORS.navy}} numberOfLines={1}>{((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.title}</Text>
                    <Text style={{fontSize:11,color:'#888',marginTop:2}}>{((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.date}</Text>
                  </View>
                </View>
              )}
              {!!((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData) && (
                <View style={{marginTop:8,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:COLORS.border}}>
                  {(((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.photo) ? (
                    <ImageBackground source={{uri: ((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.photo}} style={{aspectRatio:16/9,backgroundColor:'#c9a96e'}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.gradient || ['#c9a96e','#1a1a2e']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
                  )}
                  <View style={{padding:10}}>
                    <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:COLORS.navy}} numberOfLines={1}>{((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.name}</Text>
                    <Text style={{fontSize:11,color:'#888',marginTop:2}} numberOfLines={1}>{((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.address}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
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
                  {label:'More',icon:'share-social-outline',color:'#9b59b6',bg:'#f5eefb',fn:()=>{const p=sharePost;setSharePost(null);setTimeout(()=>Share.share({message:p?.content||'',title:'Check this out on FaithFinder'}).catch(()=>{}),800);}},
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



const s = StyleSheet.create({
  verseBar:{flexDirection:'row',alignItems:'stretch',gap:12,paddingVertical:14,paddingRight:16,paddingLeft:14,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  verseAccent:{width:3,backgroundColor:COLORS.gold},
  verseTxt:{flex:1,fontFamily:'PlayfairDisplay_400Regular',fontSize:14,color:'#2c2c2a',lineHeight:20},
  verseRef:{fontFamily:'PlayfairDisplay_400Regular',fontSize:12,color:'#999999'},
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
  visToggle:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:12,paddingVertical:6,marginTop:2},
  visToggleTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
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
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:10,paddingVertical:8},
  filterBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  filterBtnTxt:{fontSize:12,fontWeight:'600',color:COLORS.navy},
  resultCount:{fontSize:11,fontWeight:'700',color:'#bbb',letterSpacing:0.5,textTransform:'uppercase',paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.lightBg,borderRadius:14,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:COLORS.border},
  searchInput:{flex:1,fontSize:14,color:COLORS.navy,padding:0},
});
