import { useState, useRef } from 'react';
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
import { useThemeColors, ThemeColors } from '../../src/lib/theme';
import { useConfirm } from '../../src/components/Confirm';
import { useToast } from '../../src/components/Toast';
import { getCurrentCityState } from '../../src/lib/userLocation';
import { useSettings } from '../../src/lib/settingsStore';
import { useTranslation } from '../../src/lib/i18n';
import { PostCard } from '../../src/components/PostCard';
import { usePosts, addPost, toggleLike, Post, editPost, deletePost, reportPost, repostPost, isAuthoredBy } from '../../src/lib/postsStore';
import { getUser } from '../../src/lib/userStore';
import { buildPostShareText } from '../../src/lib/shareLinks';
import { useConnections, isConnected } from '../../src/lib/connectionsStore';
import { announceToFollowers } from '../../src/lib/notificationsStore';

type Visibility = 'public' | 'connections';

export default function CommunityScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showConfirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'foryou'|'discover'>('foryou');
  const allPosts = usePosts();
  const { showToast } = useToast();
  const appSettings = useSettings();
  const { t, tx } = useTranslation();
  const connections = useConnections();
  const user = getUser();

  // ── Sharing to the OS share sheet ───────────────────────────────────────
  // iOS refuses to present the share sheet while a React Native <Modal> is
  // still on screen (or still animating away) — the promise rejects and the
  // button looks dead. So the Share row does NOT call Share.share() directly:
  // it stashes the text, closes the sheet, and we fire the share from the
  // Modal's onDismiss (iOS) once the sheet is genuinely gone. Android has no
  // onDismiss, so a short timer covers it, and a longer timer is a backstop in
  // case onDismiss never arrives. `shareFiredRef` makes sure only one wins.
  const pendingShareRef = useRef<string | null>(null);
  const shareFiredRef = useRef(false);
  const shareTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearShareTimers() {
    shareTimersRef.current.forEach(clearTimeout);
    shareTimersRef.current = [];
  }

  function queueShare(message: string) {
    clearShareTimers();
    pendingShareRef.current = message;
    shareFiredRef.current = false;
    // Android never fires Modal.onDismiss; the backstop covers a missing one.
    shareTimersRef.current.push(setTimeout(flushPendingShare, Platform.OS === 'android' ? 300 : 900));
  }

  function flushPendingShare() {
    const message = pendingShareRef.current;
    if (!message || shareFiredRef.current) return;
    shareFiredRef.current = true;
    pendingShareRef.current = null;
    clearShareTimers();
    Share.share({ message, title: tx('Check this out on FaithFinder') })
      .catch((err: any) => {
        // Never fail silently — a dead-looking button is what sent us here.
        showToast(t('share'), String(err?.message || err), 'error');
      });
  }

  const connectedNames = connections.map(c => c.name);
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();
  // When "Public Profile" is off, the user's own posts are kept out of the
  // public Discover feed (strangers can't see them) — they still show under
  // "For You" for the user and their connections.
  const isPublicProfile = appSettings.privacy.publicProfile;
  const posts = activeTab === 'foryou'
    ? allPosts.filter(p =>
        isAuthoredBy(p, user.id, displayName) || connectedNames.includes(p.authorName)
      )
    : allPosts.filter(p =>
        (p.feed === 'discover' || p.feed === 'both') &&
        !(!isPublicProfile && isAuthoredBy(p, user.id, displayName))
      );

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
  // Only church accounts can mark a post as an announcement.
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showLocation, setShowLocation] = useState(true);

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

    const announcing = user.accountType === 'church' && isAnnouncement;

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
      isAnnouncement: announcing,
    });
    if (announcing) {
      announceToFollowers({
        churchName: displayName,
        churchId: user.id,
        body: newPostText.trim(),
        postId: '',
      });
    }
    setNewPostText(''); setNewPostImage(null); setDetectedUrl(null); setLinkPreviewData(null);
    setShowCreate(false); setVisibility('public'); setShowLocation(true); setIsAnnouncement(false);
    setIsPosting(false);
  }

  function openProfile(post: Post) {
    router.push({
      pathname: '/user-profile' as any,
      params: { authorId: post.authorId || '', name: post.authorName, initials: post.authorInitials, color: post.authorColor, type: post.authorType, city: post.city || '', state: post.state || '', photo: post.authorPhoto || '' }
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tabPill, activeTab===tab&&s.tabPillActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabPillTxt, activeTab===tab&&s.tabPillTxtActive]}>{tab === 'foryou' ? t('forYou') : t('discover')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.composeBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="create-outline" size={18} color={c.onPrimary} />
          <Text style={s.composeBtnTxt}>{t('post')}</Text>
        </TouchableOpacity>
      </View>

      {/* Daily verse — sits under the feed switcher so it reads as a banner
          over the posts rather than a header over the whole app. */}
      <View style={s.verseBar}>
        <View style={s.verseAccent} />
        <Text style={s.verseTxt}>{getDailyVerse(appSettings.appearance.language).text} <Text style={s.verseRef}>— {getDailyVerse(appSettings.appearance.language).reference}</Text></Text>
      </View>

      {activeTab === 'discover' && (
        <View style={s.discoverBanner}>
          <Ionicons name="earth-outline" size={14} color={c.gold} />
          <Text style={s.discoverTxt}>Believers from all 50 states · Join the conversation</Text>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.gold} colors={[c.gold]} />}>
        {posts.length === 0 && activeTab === 'foryou' && (
          <View style={s.emptyFeed}>
            <Ionicons name="people-outline" size={48} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('yourFeedQuiet')}</Text>
            <Text style={s.emptySub}>{t('connectWithChurches')}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setActiveTab('discover')}>
              <Text style={s.emptyBtnTxt}>{t('browseDiscover')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {posts.map(post => (
          <PostCard key={post.id} post={post} showLocation={!!(post.city && post.state)}
            isOwnPost={isAuthoredBy(post, user.id, displayName)}
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
        <SafeAreaView style={{ flex:1, backgroundColor: c.bg }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewPostText(''); setNewPostImage(null); setDetectedUrl(null); setLinkPreviewData(null); setDetectedUrl(null); setLinkPreviewData(null); }}>
              <Text style={s.cancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{t('newPost')}</Text>
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
                    <Ionicons name={visibility==='public'?'earth':'people'} size={13} color={c.text}/>
                    <Text style={s.visToggleTxt}>{visibility==='public'?'Public':'Connections'}</Text>
                    <Ionicons name="swap-horizontal" size={13} color={c.textMuted}/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Announcements are a church-only capability: they notify every
                  follower, so a personal account never sees this control. */}
              {user.accountType === 'church' && (
                <TouchableOpacity
                  style={[s.announceToggle, isAnnouncement && s.announceToggleOn]}
                  onPress={() => setIsAnnouncement(v => !v)}
                  activeOpacity={0.85}
                >
                  <View style={[s.announceIcon, isAnnouncement && {backgroundColor:c.gold}]}>
                    <Ionicons name="megaphone" size={15} color={isAnnouncement ? c.onPrimary : c.gold}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[s.announceLabel, isAnnouncement && {color:c.text}]}>{tx('Post as announcement')}</Text>
                    <Text style={s.announceDesc}>{tx('Notifies everyone who follows your church')}</Text>
                  </View>
                  <Ionicons
                    name={isAnnouncement ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isAnnouncement ? c.gold : c.placeholder}
                  />
                </TouchableOpacity>
              )}
              <TextInput
                style={s.composeInput}
                placeholder={tx('What\'s on your heart?')}
                placeholderTextColor={c.placeholder}
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
                  <Image source={{uri:newPostImage}} style={{width:'100%',height:280,borderRadius:14,backgroundColor:c.cardAlt}} resizeMode="contain"/>
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
                <Ionicons name="image-outline" size={18} color={c.gold}/>
                <Text style={{fontSize:13,fontWeight:'600',color:c.gold}}>{newPostImage ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>

              {loadingPreview && (
                <View style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:14}}>
                  <ActivityIndicator size="small" color={c.gold}/>
                  <Text style={{fontSize:12,color:c.textMuted}}>{t('fetchingPreview')}</Text>
                </View>
              )}

              {linkPreviewData && !loadingPreview && (
                <View style={{marginHorizontal:16,marginBottom:14,borderWidth:1,borderColor:c.border,borderRadius:14,overflow:'hidden',backgroundColor:c.cardAlt}}>
                  {!!linkPreviewData.image && (
                    <Image source={{uri:linkPreviewData.image}} style={{width:'100%',height:160}} resizeMode="cover"/>
                  )}
                  <View style={{padding:12}}>
                    {!!linkPreviewData.siteName && (
                      <Text style={{fontSize:11,color:c.gold,fontWeight:'700',textTransform:'uppercase',marginBottom:2}}>{linkPreviewData.siteName}</Text>
                    )}
                    {!!linkPreviewData.title && (
                      <Text style={{fontSize:14,fontWeight:'700',color:c.text}} numberOfLines={2}>{linkPreviewData.title}</Text>
                    )}
                    {!!linkPreviewData.description && (
                      <Text style={{fontSize:12,color:c.textMuted,marginTop:3}} numberOfLines={2}>{linkPreviewData.description}</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={s.composeHint}>
                <Ionicons name={visibility==='public'?'earth-outline':'people-outline'} size={13} color={c.gold}/>
                <Text style={s.composeHintTxt}>{visibility==='public'?'Visible to everyone in Discover':'Visible only to your connections in For You'}</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

            {/* Post Options Menu */}
      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:c.overlay,justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setMenuPost(null)}>
          <View style={{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:c.border,alignSelf:'center',marginVertical:10}}/>
            {menuPost && isAuthoredBy(menuPost, user.id, displayName) ? (
              <>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  setEditingPost(menuPost); setEditText(menuPost.repostComment || menuPost.content); setMenuPost(null);
                }}>
                  <Ionicons name="create-outline" size={22} color={c.text}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:c.text}}>{t('editPost')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  const target = menuPost;
                  setMenuPost(null);
                  showConfirm({
                    title: tx('Delete Post'),
                    message: tx('Are you sure you want to delete this post? This cannot be undone.'),
                    buttons: [
                      { text: tx('Cancel'), style: 'cancel' },
                      { text: tx('Delete'), style: 'destructive', onPress: () => deletePost(target!.id) },
                    ],
                  });
                }}>
                  <Ionicons name="trash-outline" size={22} color={c.red}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:c.red}}>{t('deletePost')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                setReportPostTarget(menuPost); setMenuPost(null);
              }}>
                <Ionicons name="flag-outline" size={22} color={c.red}/>
                <Text style={{fontSize:15,fontWeight:'600',color:c.red}}>{t('reportPost')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setMenuPost(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:c.textMuted}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Post Modal */}
      <Modal visible={!!reportPostTarget} transparent animationType="fade" onRequestClose={() => setReportPostTarget(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:c.overlay,justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setReportPostTarget(null)}>
          <View style={{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:c.border,alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:17,fontWeight:'700',color:c.text,textAlign:'center',marginBottom:4}}>{t('reportPost')}</Text>
            <Text style={{fontSize:13,color:c.textMuted,textAlign:'center',marginBottom:14,paddingHorizontal:24}}>{t('whyReporting')}</Text>
            {[
              {id:'spam', label:'Spam'},
              {id:'harassment', label:'Harassment or bullying'},
              {id:'inappropriate', label:'Inappropriate content'},
              {id:'misleading', label:'False or misleading information'},
              {id:'hate_speech', label:'Hate speech'},
              {id:'other', label:'Other'},
            ].map(reason => (
              <TouchableOpacity key={reason.id} style={{paddingHorizontal:20,paddingVertical:14,borderTopWidth:1,borderTopColor:c.rowBorder}} onPress={() => {
                const target = reportPostTarget;
                setReportPostTarget(null);
                reportPost(target!.id, reason.id as any, displayName);
                showToast(tx('Reported'), tx('Thank you for letting us know. Our team will review this post.'), 'info');
              }}>
                <Text style={{fontSize:15,color:c.text}}>{tx(reason.label)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setReportPostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:c.textMuted}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal visible={!!editingPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingPost(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setEditingPost(null)}><Text style={s.cancelTxt}>{t('cancel')}</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{t('editPost')}</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (editingPost) {
                if (editingPost.repostOf) {
                  editPost(editingPost.id, {}); // marks edited; repostComment handled below
                }
                editPost(editingPost.id, editingPost.repostOf ? {} : { content: editText });
              }
              setEditingPost(null);
            }}>
              <Text style={s.postBtnTxt}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.composeInput}
            multiline
            autoFocus
            value={editText}
            onChangeText={setEditText}
            placeholder={tx('What\'s on your mind?')}
            placeholderTextColor={c.placeholder}
          />
        </SafeAreaView>
      </Modal>

      {/* Share/Repost Bottom Sheet */}
      <Modal visible={!!repostTarget && !showRepostCompose} transparent animationType="fade" onRequestClose={() => setRepostTarget(null)} onDismiss={flushPendingShare}>
        <TouchableOpacity style={{flex:1,backgroundColor:c.overlay,justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setRepostTarget(null)}>
          <View style={{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:c.border,alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:16,fontWeight:'700',color:c.text,textAlign:'center',marginBottom:16}}>{t('sharePost')}</Text>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => setShowRepostCompose(true)}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:'rgba(102,126,234,0.16)',alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="repeat" size={22} color="#667eea"/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:c.text}}>{t('repost')}</Text>
                <Text style={{fontSize:12,color:c.textMuted,marginTop:1}}>{t('shareToFeed')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.placeholder}/>
            </TouchableOpacity>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => {
              queueShare(buildPostShareText(repostTarget));
              setRepostTarget(null);
            }}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="arrow-redo-outline" size={22} color={c.text}/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:c.text}}>{t('share')}</Text>
                <Text style={{fontSize:12,color:c.textMuted,marginTop:1}}>{t('sendVia')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.placeholder}/>
            </TouchableOpacity>

            <TouchableOpacity style={{paddingVertical:16,marginTop:6,alignItems:'center'}} onPress={() => setRepostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:c.textMuted}}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Repost Compose Screen */}
      <Modal visible={!!repostTarget && showRepostCompose} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowRepostCompose(false); setRepostTarget(null); }}>
        <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowRepostCompose(false); setRepostTarget(null); }}><Text style={s.cancelTxt}>{t('cancel')}</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{t('repost')}</Text>
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
              <Text style={s.postBtnTxt}>{t('repost')}</Text>
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
            placeholder={tx('Add a comment (optional)')}
            placeholderTextColor={c.placeholder}
          />
          {repostTarget&&(
            <View style={[s.quotedCard,{marginHorizontal:16}]}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                <View style={{width:26,height:26,borderRadius:13,backgroundColor:(repostTarget.repostOf?.authorColor)||repostTarget.authorColor,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{(repostTarget.repostOf?.authorInitials)||repostTarget.authorInitials}</Text>
                </View>
                <Text style={{fontSize:13,fontWeight:'700',color:c.text}}>{(repostTarget.repostOf?.authorName)||repostTarget.authorName}</Text>
              </View>
              <Text style={{fontSize:13,color:c.textSecondary}} numberOfLines={3}>{(repostTarget.repostOf?.content)||repostTarget.content}</Text>
              {!!((repostTarget.repostOf?.image)||repostTarget.image) && (
                <Image source={{uri:(repostTarget.repostOf?.image)||repostTarget.image}} style={{width:'100%',aspectRatio:16/9,borderRadius:10,marginTop:8}} resizeMode="cover"/>
              )}
              {!!((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData) && (
                <View style={{marginTop:8,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:c.border}}>
                  {(((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerImage) ? (
                    <ImageBackground source={{uri: ((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerImage}} style={{aspectRatio:16/9,backgroundColor:c.cardAlt}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.bannerColor || ['#667eea','#764ba2']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
                  )}
                  <View style={{padding:10}}>
                    <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:c.text}} numberOfLines={1}>{((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.title}</Text>
                    <Text style={{fontSize:11,color:c.textMuted,marginTop:2}}>{((repostTarget.repostOf?.eventShareData)||repostTarget.eventShareData)!.date}</Text>
                  </View>
                </View>
              )}
              {!!((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData) && (
                <View style={{marginTop:8,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:c.border}}>
                  {(((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.photo) ? (
                    <ImageBackground source={{uri: ((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.photo}} style={{aspectRatio:16/9,backgroundColor:'#c9a96e'}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.gradient || ['#c9a96e','#1a1a2e']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
                  )}
                  <View style={{padding:10}}>
                    <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:c.text}} numberOfLines={1}>{((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.name}</Text>
                    <Text style={{fontSize:11,color:c.textMuted,marginTop:2}} numberOfLines={1}>{((repostTarget.repostOf?.churchShareData)||repostTarget.churchShareData)!.address}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}


const makeStyles = (c: ThemeColors) => StyleSheet.create({
  announceToggle:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:16,marginTop:12,paddingHorizontal:12,paddingVertical:10,borderRadius:14,borderWidth:1,borderColor:c.border,backgroundColor:c.card},
  announceToggleOn:{borderColor:c.gold,backgroundColor:'rgba(201,169,110,0.10)'},
  announceIcon:{width:30,height:30,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(201,169,110,0.16)'},
  announceLabel:{fontSize:13,fontWeight:'700',color:c.textSecondary},
  announceDesc:{fontSize:11,color:c.textMuted,marginTop:1},
  verseBar:{flexDirection:'row',alignItems:'stretch',gap:12,paddingVertical:12,paddingRight:16,paddingLeft:14,borderTopWidth:1,borderTopColor:c.border,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  verseAccent:{width:3,backgroundColor:c.gold},
  verseTxt:{flex:1,fontFamily:'PlayfairDisplay_400Regular',fontSize:14,color:c.text,lineHeight:20},
  verseRef:{fontFamily:'PlayfairDisplay_400Regular',fontSize:12,color:c.textMuted},
  root:{flex:1,backgroundColor:c.bg},
  tabBar:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingTop:2,paddingBottom:10,backgroundColor:c.card},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:c.cardAlt,borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  tabPillTxtActive:{color:c.text,fontWeight:'700'},
  composeBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.primary,borderRadius:22,paddingHorizontal:16,paddingVertical:9},
  composeBtnTxt:{color:c.onPrimary,fontSize:13,fontWeight:'700'},
  discoverBanner:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:9,backgroundColor:'rgba(201,169,110,0.10)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.18)'},
  discoverTxt:{fontSize:12,color:c.gold,fontWeight:'600'},
  scroll:{flex:1},
  emptyFeed:{alignItems:'center',paddingVertical:64,paddingHorizontal:32,gap:12},
  emptyTitle:{fontSize:17,fontWeight:'700',color:c.text},
  emptySub:{fontSize:13,color:c.textMuted,textAlign:'center',lineHeight:20},
  emptyBtn:{marginTop:8,backgroundColor:c.primary,borderRadius:22,paddingHorizontal:28,paddingVertical:13},
  emptyBtnTxt:{color:c.onPrimary,fontSize:14,fontWeight:'700'},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border},
  cancelTxt:{fontSize:15,color:c.textMuted},
  modalTitle:{fontSize:16,fontWeight:'700',color:c.text},
  postBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:8},
  postBtnTxt:{color:c.onPrimary,fontSize:14,fontWeight:'700'},
  composeAuthor:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:16,paddingBottom:8},
  composeAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  composeAvatarTxt:{color:c.white,fontWeight:'700',fontSize:15},
  composeAuthorName:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:8},
  visibilityRow:{flexDirection:'row',gap:8},
  visToggle:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',borderWidth:1.5,borderColor:c.border,borderRadius:100,paddingHorizontal:12,paddingVertical:6,marginTop:2},
  visToggleTxt:{fontSize:12,fontWeight:'700',color:c.text},
  visChip:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1.5,borderColor:c.navy,borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  visChipActive:{backgroundColor:c.navy},
  visChipTxt:{fontSize:11,fontWeight:'700',color:c.text},
  composeInput:{fontSize:16,color:c.text,lineHeight:25,minHeight:140,paddingHorizontal:16,paddingVertical:8,textAlignVertical:'top'},
  locationToggle:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:16,paddingVertical:14,borderTopWidth:1,borderTopColor:c.border},
  locationToggleTxt:{flex:1,fontSize:13},
  toggleSwitch:{width:46,height:27,borderRadius:14,backgroundColor:c.cardAlt,padding:3},
  toggleOn:{backgroundColor:c.gold},
  toggleThumb:{width:21,height:21,borderRadius:11,backgroundColor:c.white},
  toggleThumbOn:{transform:[{translateX:19}]},
  composeHint:{flexDirection:'row',alignItems:'flex-start',gap:8,marginHorizontal:16,paddingVertical:10},
  composeHintTxt:{flex:1,fontSize:12,color:c.textMuted,lineHeight:18},
  quotedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:12,padding:12,marginTop:8,backgroundColor:c.cardAlt},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.cardAlt,borderWidth:1.5,borderColor:c.border,borderRadius:12,paddingHorizontal:10,paddingVertical:8},
  filterBtnActive:{backgroundColor:c.navy,borderColor:c.navy},
  filterBtnTxt:{fontSize:12,fontWeight:'600',color:c.text},
  resultCount:{fontSize:11,fontWeight:'700',color:c.textMuted,letterSpacing:0.5,textTransform:'uppercase',paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.cardAlt,borderRadius:14,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:c.border},
  searchInput:{flex:1,fontSize:14,color:c.text,padding:0},
});
