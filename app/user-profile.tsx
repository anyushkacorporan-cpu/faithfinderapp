import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Modal, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../src/components/Header';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { usePosts, toggleLike, isAuthoredBy } from '../src/lib/postsStore';
import { useUser } from '../src/lib/userStore';
import { useConnectionCount, useConnections, isConnectedTo, addConnection, removeConnection, connectionFromAuthor } from '../src/lib/connectionsStore';
import { useToast } from '../src/components/Toast';
import { useConfirm } from '../src/components/Confirm';
import { PostCard } from '../src/components/PostCard';

export default function OtherUserProfileScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const params = useLocalSearchParams<{
    id?: string; name?: string; initials?: string; color?: string;
    type?: string; city?: string; state?: string; photo?: string; authorId?: string;
  }>();

  const allPosts = usePosts();
  const displayName = params.name || 'User';
  const initials = params.initials || displayName.slice(0,2).toUpperCase();
  const color = params.color || c.gold;
  const isChurch = params.type === 'church';
  const userPosts = allPosts.filter(p => isAuthoredBy(p, params.authorId, displayName));
  const galleryPhotos = userPosts.filter(p => !!p.image).map(p => p.image as string);

  const currentUser = useUser();
  const currentUserDisplayName = currentUser.accountType === 'church'
    ? currentUser.churchName
    : `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  // Prefer ids: two people can share a display name.
  const isSelf = (params.authorId && currentUser.id)
    ? params.authorId === currentUser.id
    : !!currentUserDisplayName && currentUserDisplayName === displayName;

  useEffect(() => {
    if (isSelf) {
      router.replace('/profile');
    }
  }, [isSelf]);
  const connectionCount = useConnectionCount();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  // Subscribe so the button flips as soon as the state changes anywhere.
  useConnections();
  // Their avatar colour, darkened, gives every profile a distinct cover that is
  // still recognisably theirs. shadeHex keeps it a plain string pair so the
  // gradient types cleanly.
  const coverGradient: [string, string] = [color, shadeHex(color, -0.45)];

  const connectionId = params.authorId || displayName;
  const connected = isConnectedTo(params.authorId, displayName);

  const combinedGalleryPhotos = isSelf ? [...new Set([...galleryPhotos, ...(currentUser.photos || [])])] : galleryPhotos;
  const galleryItems = combinedGalleryPhotos.map(uri => ({ uri, post: userPosts.find(p => p.image === uri) || null }));
  const churchesShared = userPosts.filter(p => !!p.churchShareData).map(p => p.churchShareData!);

  const [showAllGallery, setShowAllGallery] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);

  if (isSelf) {
    return <View style={{flex:1,backgroundColor:c.card}} />;
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.coverWrap}>
          {/* Only your own cover is available: another person's profile arrives
              as route params (name, initials, colour, photo) and nothing on the
              device stores anyone else's cover, bio or verse. Rather than a flat
              empty block, fall back to a gradient built from that person's own
              accent colour — so "no cover set" reads as designed, which stays
              the right treatment once profiles are real and some genuinely
              have none. */}
          {isSelf && currentUser.coverPhoto ? (
            <Image source={{uri:currentUser.coverPhoto}} style={s.cover} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={coverGradient}
              start={{x:0,y:0}}
              end={{x:1,y:1}}
              style={s.cover}
            />
          )}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.onPrimary} />
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            {(isSelf && currentUser.profilePhoto) || params.photo
              ? <Image source={{uri: (isSelf && currentUser.profilePhoto) || params.photo}} style={[s.avatar,{overflow:'hidden'}]} resizeMode="cover"/>
              : <View style={[s.avatar,{backgroundColor:color}]}>
                  <Text style={s.avatarTxt}>{initials}</Text>
                </View>
            }
          </View>
        </View>

        <View style={s.personalInfo}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={s.name}>{displayName}</Text>
            {isChurch && <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>{t('church')}</Text></View>}
          </View>

          {!!(params.city && params.state) && (
            <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:10}}>
              <Ionicons name="location-outline" size={14} color={c.textMuted} />
              <Text style={{fontSize:13,color:c.textMuted}}>{params.city}, {params.state}</Text>
            </View>
          )}

          {/* Connect is the whole point of a profile you do not own — without it
              there is no way to build the For You feed. Hidden on your own. */}
          {!isSelf && (
            connected ? (
              <TouchableOpacity
                style={s.connectedBtn}
                onPress={() => showConfirm({
                  title: tx('Remove connection'),
                  message: tx('You will stop seeing their posts in For You.'),
                  buttons: [
                    { text: t('cancel'), style: 'cancel' },
                    { text: tx('Remove'), style: 'destructive', onPress: () => {
                      removeConnection(connectionId);
                      showToast(tx('Removed'), displayName, 'info');
                    } },
                  ],
                })}
              >
                <Ionicons name="checkmark" size={16} color={c.text} />
                <Text style={s.connectedTxt}>{tx('Connected')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.connectBtn}
                onPress={() => {
                  addConnection(connectionFromAuthor({
                    authorId: params.authorId,
                    authorName: displayName,
                    authorType: isChurch ? 'church' : 'personal',
                    authorColor: color,
                    authorInitials: initials,
                  }));
                  showToast(tx('Connected'), tx('You will now see posts from') + ' ' + displayName, 'success');
                }}
              >
                <Ionicons name="add" size={17} color={c.onPrimary} />
                <Text style={s.connectTxt}>{tx('Connect')}</Text>
              </TouchableOpacity>
            )
          )}

          {isSelf && (
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:10}} onPress={() => router.push('/connections')}>
              <Ionicons name="people-outline" size={14} color={c.textMuted} />
              <Text style={{fontSize:13,color:c.textMuted}}>{connectionCount} Connections</Text>
            </TouchableOpacity>
          )}

          {isSelf && !!currentUser.bio && (
            <Text style={{fontSize:14,color:c.textSecondary,textAlign:'center',lineHeight:20,marginTop:12,paddingHorizontal:8}}>{currentUser.bio}</Text>
          )}
        </View>

        {isSelf && !!(currentUser.lifeVerse || currentUser.lifeVerseRef) && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <View style={s.sectionHdr}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Ionicons name="book-outline" size={16} color={c.gold} style={{marginRight:6}} />
                  <Text style={s.sectionTitle}>{t('favoriteVerse')}</Text>
                </View>
              </View>
              {!!currentUser.lifeVerse && (
                <Text style={{fontSize:15,fontStyle:'italic',color:c.text,lineHeight:22,textAlign:'center'}}>"{currentUser.lifeVerse}"</Text>
              )}
              {!!currentUser.lifeVerseRef && (
                <Text style={{fontSize:13,fontWeight:'700',color:c.gold,textAlign:'center',marginTop:8}}>{currentUser.lifeVerseRef}</Text>
              )}
            </View>
          </>
        )}

        {/* Faith Gallery */}
        {combinedGalleryPhotos.length > 0 && (
          <>
            <View style={s.divider} />
            <View style={s.section}>
              <View style={s.sectionHdr}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Ionicons name="images-outline" size={16} color={c.text} style={{marginRight:6}} />
                  <Text style={s.sectionTitle}>{t('faithGallery')}</Text>
                </View>
              </View>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                {(showAllGallery ? combinedGalleryPhotos : combinedGalleryPhotos.slice(0, 3)).map((uri: string) => {
                  const thumbSize = (Dimensions.get('window').width - 32 - 6 * 3) / 4;
                  const fullIndex = combinedGalleryPhotos.indexOf(uri);
                  return (
                    <TouchableOpacity key={uri} onPress={() => { setPhotoViewerIndex(fullIndex); setPhotoViewerVisible(true); }} activeOpacity={0.85}>
                      <Image source={{uri}} style={{width:thumbSize,height:thumbSize,borderRadius:8,backgroundColor:c.cardAlt}} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })}
              </View>
              {combinedGalleryPhotos.length > 3 && (
                <TouchableOpacity onPress={() => setShowAllGallery(!showAllGallery)} style={{marginTop:10,alignSelf:'flex-start'}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:c.gold}}>
                    {showAllGallery ? 'Show Less' : `See More (${combinedGalleryPhotos.length - 3})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.divider} />
          </>
        )}

        {churchesShared.length > 0 && (
          <>
            <View style={s.section}>
              <View style={s.sectionHdr}>
                <View style={{flexDirection:'row',alignItems:'center'}}>
                  <Ionicons name="business-outline" size={16} color={c.text} style={{marginRight:6}} />
                  <Text style={s.sectionTitle}>{t('churchesShared')}</Text>
                </View>
              </View>
              {churchesShared.map((church, i) => (
                <TouchableOpacity
                  key={`${church.id}-${i}`}
                  style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:i<churchesShared.length-1?1:0,borderBottomColor:c.cardAlt}}
                  onPress={() => router.push({ pathname: '/church-detail', params: { placeId: church.id } })}
                >
                  <View style={{width:36,height:36,borderRadius:10,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="business" size={16} color={c.text} />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'600',color:c.text}}>{church.name}</Text>
                    <Text style={{fontSize:12,color:c.textMuted}}>{church.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.divider} />
          </>
        )}

        <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
          <View style={{flex:1,backgroundColor:'#000'}}>
            <TouchableOpacity
              onPress={() => setPhotoViewerVisible(false)}
              style={{position:'absolute',top:54,right:20,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'}}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <FlatList
              data={galleryItems}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={photoViewerIndex}
              getItemLayout={(_, i) => ({ length: Dimensions.get('window').width, offset: Dimensions.get('window').width * i, index: i })}
              keyExtractor={(item) => item.uri}
              renderItem={({ item }) => (
                <View style={{width:Dimensions.get('window').width,flex:1,justifyContent:'center'}}>
                  <Image source={{uri:item.uri}} style={{width:'100%',height:'70%'}} resizeMode="contain" />
                  <View style={{paddingHorizontal:20,paddingTop:16}}>
                    {item.post ? (
                      <>
                        {!!item.post.content && (
                          <Text style={{color:'#fff',fontSize:14,lineHeight:20,marginBottom:14}}>{item.post.content}</Text>
                        )}
                        <View style={{flexDirection:'row',alignItems:'center',gap:20}}>
                          <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:6}} onPress={() => toggleLike(item.post!.id)}>
                            <Ionicons name={item.post.liked ? 'heart' : 'heart-outline'} size={20} color={item.post.liked ? '#e74c6f' : '#fff'} />
                            <Text style={{color:'#fff',fontSize:13,fontWeight:'600'}}>{item.post.likes}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{flexDirection:'row',alignItems:'center',gap:6}}
                            onPress={() => { setPhotoViewerVisible(false); router.push({ pathname: '/comments', params: { postId: item.post!.id } }); }}
                          >
                            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                            <Text style={{color:'#fff',fontSize:13,fontWeight:'600'}}>{item.post.comments.length}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>{t('sharedToFaithGallery')}</Text>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        </Modal>

        {/* The tab bar is a single non-interactive tab, so it is a heading, not
            navigation. With no posts it labels a list that is not there —
            dropping it and tightening the empty state saves roughly 170px of
            chrome on a profile that has nothing to show, which is most of them
            until people fill their profiles in. */}
        {userPosts.length > 0 && (
          <View style={s.tabsRow}>
            <View style={[s.tab, s.tabActive]}>
              <Text style={[s.tabTxt, s.tabTxtActive]}>{t('posts')}</Text>
            </View>
          </View>
        )}

        {userPosts.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={26} color={c.placeholder} />
            <Text style={s.emptyTxt}>{t('noPostsYet')}</Text>
          </View>
        ) : (
          <View>
            {userPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                showLocation={true}
                onLike={() => {}}
                onComment={() => router.push({ pathname: '/comments', params: { postId: post.id } })}
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

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
function shadeHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const shifted = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(shifted)));
  });
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  connectBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:14,paddingHorizontal:22,paddingVertical:10,borderRadius:100,backgroundColor:c.primary},
  connectTxt:{fontSize:14,fontWeight:'700',color:c.onPrimary},
  connectedBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,marginTop:14,paddingHorizontal:20,paddingVertical:10,borderRadius:100,borderWidth:1,borderColor:c.border,backgroundColor:c.cardAlt},
  connectedTxt:{fontSize:14,fontWeight:'700',color:c.text},
  root:{flex:1,backgroundColor:c.card},
  coverWrap:{position:'relative'},
  cover:{width:'100%',height:160,backgroundColor:c.primary},
  backBtn:{position:'absolute',top:14,left:14,width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.35)',alignItems:'center',justifyContent:'center'},
  avatarWrap:{position:'absolute',bottom:-40,left:0,right:0,alignItems:'center'},
  avatar:{width:80,height:80,borderRadius:40,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:c.card,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.15,shadowRadius:6},
  avatarTxt:{color:c.onPrimary,fontWeight:'700',fontSize:22},
  personalInfo:{paddingHorizontal:16,alignItems:'center',paddingTop:48,paddingBottom:16},
  name:{fontSize:19,fontWeight:'700',color:c.text,fontFamily:undefined},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:c.gold},
  divider:{height:8,backgroundColor:c.card},
  section:{paddingHorizontal:16,paddingVertical:16},
  sectionHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  sectionTitle:{fontSize:16,fontWeight:'700',color:c.text},
  tabsRow:{flexDirection:'row',borderTopWidth:1,borderBottomWidth:1,borderColor:c.border},
  tab:{flex:1,alignItems:'center',paddingVertical:12},
  tabActive:{borderBottomWidth:2,borderBottomColor:c.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.text,fontWeight:'700'},
  emptyState:{paddingVertical:22,alignItems:'center',gap:6,paddingHorizontal:40},
  emptyTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
});
