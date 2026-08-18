import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Modal, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../src/components/Header';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { usePosts, toggleLike } from '../src/lib/postsStore';
import { useUser } from '../src/lib/userStore';
import { useConnectionCount } from '../src/lib/connectionsStore';
import { PostCard } from '../src/components/PostCard';

export default function OtherUserProfileScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{
    id?: string; name?: string; initials?: string; color?: string;
    type?: string; city?: string; state?: string; photo?: string;
  }>();

  const allPosts = usePosts();
  const displayName = params.name || 'User';
  const initials = params.initials || displayName.slice(0,2).toUpperCase();
  const color = params.color || c.gold;
  const isChurch = params.type === 'church';
  const userPosts = allPosts.filter(p => p.authorName === displayName);
  const galleryPhotos = userPosts.filter(p => !!p.image).map(p => p.image as string);

  const currentUser = useUser();
  const currentUserDisplayName = currentUser.accountType === 'church'
    ? currentUser.churchName
    : `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
  const isSelf = currentUserDisplayName && currentUserDisplayName === displayName;

  useEffect(() => {
    if (isSelf) {
      router.replace('/profile' as any);
    }
  }, [isSelf]);
  const connectionCount = useConnectionCount();

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
          {isSelf && currentUser.coverPhoto
            ? <Image source={{uri:currentUser.coverPhoto}} style={s.cover} resizeMode="cover" />
            : <View style={s.cover} />
          }
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
            {isChurch && <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>Church</Text></View>}
          </View>

          {!!(params.city && params.state) && (
            <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:10}}>
              <Ionicons name="location-outline" size={14} color={c.textMuted} />
              <Text style={{fontSize:13,color:c.textMuted}}>{params.city}, {params.state}</Text>
            </View>
          )}

          {isSelf && (
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:5,marginTop:10}} onPress={() => router.push('/connections' as any)}>
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
                  <Text style={s.sectionTitle}>Favorite Bible Verse</Text>
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
                  <Text style={s.sectionTitle}>Faith Gallery</Text>
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
                  <Text style={s.sectionTitle}>Churches Shared</Text>
                </View>
              </View>
              {churchesShared.map((church, i) => (
                <TouchableOpacity
                  key={`${church.id}-${i}`}
                  style={{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10,borderBottomWidth:i<churchesShared.length-1?1:0,borderBottomColor:c.cardAlt}}
                  onPress={() => router.push({ pathname: '/church-detail' as any, params: { placeId: church.id } })}
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
                            onPress={() => { setPhotoViewerVisible(false); router.push({ pathname: '/comments' as any, params: { postId: item.post!.id } }); }}
                          >
                            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                            <Text style={{color:'#fff',fontSize:13,fontWeight:'600'}}>{item.post.comments.length}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>Shared to Faith Gallery</Text>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        </Modal>

        <View style={s.tabsRow}>
          <View style={[s.tab, s.tabActive]}>
            <Text style={[s.tabTxt, s.tabTxtActive]}>Posts</Text>
          </View>
        </View>

        {userPosts.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={c.placeholder} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  emptyState:{paddingVertical:40,alignItems:'center',gap:8,paddingHorizontal:40},
  emptyTxt:{fontSize:15,fontWeight:'600',color:c.textMuted},
});
