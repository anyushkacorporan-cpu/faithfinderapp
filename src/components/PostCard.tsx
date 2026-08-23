import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { Post, formatRelativeTime } from '../lib/postsStore';
import { translateText, detectLanguage } from '../lib/translate';
import { useSettings } from '../lib/settingsStore';
import { useTranslation } from '../lib/i18n';
import { useConnections, isConnectedTo, addConnection, connectionFromAuthor } from '../lib/connectionsStore';
import { useToast } from './Toast';


const SCREEN_WIDTH = Dimensions.get('window').width;

function PostImage({ uri, style }: { uri: string; style?: any }) {
  const c = useThemeColors();
  const [aspectRatio, setAspectRatio] = useState(1);
  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => { if (w > 0 && h > 0) setAspectRatio(w / h); },
      () => {}
    );
  }, [uri]);
  const containerWidth = SCREEN_WIDTH - 36 - 18 * 2 + 18 * 2; // matches card horizontal margins/padding
  const maxHeight = 420;
  const minHeight = 160;
  let height = containerWidth / aspectRatio;
  if (height > maxHeight) height = maxHeight;
  if (height < minHeight) height = minHeight;
  return (
    <Image
      source={{ uri }}
      style={[{ width: '100%', height, borderRadius: 16, backgroundColor: c.cardAlt, marginBottom: 14 }, style]}
      resizeMode="cover"
    />
  );
}

const APP_LANG_CODES: Record<string,string> = { 'English':'en', 'Español':'es', 'Français':'fr', 'Português':'pt' };

export function TranslateRow({text}:{text:string}) {
  const c = useThemeColors();
  const appSettings = useSettings();
  const myLang = APP_LANG_CODES[appSettings.appearance.language] || 'en';
  const [detectedLang, setDetectedLang] = useState<string|null>(null);
  const [translated, setTranslated] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detectLanguage(text).then((lang) => { if (!cancelled) setDetectedLang(lang); });
    return () => { cancelled = true; };
  }, [text]);

  async function handleTranslate() {
    if (translated) { setShowingTranslation(!showingTranslation); return; }
    setLoading(true);
    setError(false);
    const result = await translateText(text, myLang);
    setLoading(false);
    if (result) {
      setTranslated(result.translatedText);
      setShowingTranslation(true);
    } else {
      setError(true);
    }
  }

  if (!detectedLang || detectedLang === myLang) return null;

  return (
    <View>
      <TouchableOpacity onPress={handleTranslate} disabled={loading} style={{marginTop:4}}>
        <Text style={{fontSize:12,color:c.textMuted,fontWeight:'600'}}>
          {loading ? 'Translating...' : showingTranslation ? 'See original' : error ? 'Translation failed – tap to retry' : 'Translate'}
        </Text>
      </TouchableOpacity>
      {showingTranslation && !!translated && (
        <Text style={{fontSize:14,color:c.textSecondary,lineHeight:20,marginTop:4,fontStyle:'italic'}}>{translated}</Text>
      )}
    </View>
  );
}

export function PostCard({post,showLocation,onLike,onComment,onShare,onOpenProfile,isOwnPost,onMenu,onRepost}:{
  post:Post; showLocation:boolean; onLike:()=>void; onComment:()=>void; onShare:()=>void; onOpenProfile:()=>void;
  isOwnPost?:boolean; onMenu?:()=>void; onRepost?:()=>void;
}) {
  const c = useThemeColors();
  const p = makeStyles(c);
  const { t, tx } = useTranslation();
  const { showToast } = useToast();
  // Subscribe so the badge disappears the moment the connection is made,
  // including when it was made from somewhere else.
  useConnections();
  const alreadyConnected = isConnectedTo(post.authorId, post.authorName);
  const canConnect = !isOwnPost && !alreadyConnected;

  function handleConnect() {
    addConnection(connectionFromAuthor(post));
    showToast(tx('Connected'), tx('You will now see posts from') + ' ' + post.authorName, 'success');
  }
  return (
    <View style={[p.card, post.isAnnouncement && p.cardAnnouncement]}>
      {post.isAnnouncement && (
        <View style={p.announceBanner}>
          <Ionicons name="megaphone" size={13} color={c.gold}/>
          <Text style={p.announceBannerTxt}>{t('announcement')}</Text>
        </View>
      )}

      <View style={p.authorRow}>
        <View>
          <TouchableOpacity onPress={onOpenProfile}>
            {post.authorPhoto
              ? <Image source={{uri:post.authorPhoto}} style={[p.avatar,{overflow:'hidden'}]} resizeMode="cover"/>
              : <View style={[p.avatar,{backgroundColor:post.authorColor}]}>
                  <Text style={p.avatarTxt}>{post.authorInitials}</Text>
                </View>
            }
          </TouchableOpacity>
          {/* Connect straight from the feed. The badge is only shown when it
              would do something, so it vanishes once you are connected rather
              than sitting on every avatar forever. hitSlop gives it a real
              tap target without making the dot bigger. */}
          {canConnect && (
            <TouchableOpacity
              style={p.connectBadge}
              onPress={handleConnect}
              hitSlop={{top:8,bottom:8,left:8,right:8}}
              accessibilityLabel={`${tx('Connect with')} ${post.authorName}`}
            >
              <Ionicons name="add" size={13} color={c.onPrimary}/>
            </TouchableOpacity>
          )}
        </View>
        <View style={{flex:1}}>
          <TouchableOpacity onPress={onOpenProfile} style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <Text style={p.authorName}>{post.authorName}</Text>
            {post.authorType==='church'&&<View style={p.churchBadge}><Text style={p.churchBadgeTxt}>{t('church')}</Text></View>}
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            {showLocation&&!!post.city&&(
              <Text style={p.locationTxt}>{post.city}{post.state?`, ${post.state}`:''}</Text>
            )}
            {showLocation&&!!post.city&&<Text style={p.dot}>·</Text>}
            <Text style={p.time}>{formatRelativeTime(post.createdAt, post.time)}</Text>
            {post.edited&&<Text style={p.time}> · Edited</Text>}
            <Ionicons name="globe-outline" size={11} color={c.textMuted}/>
          </View>
        </View>
        {onMenu&&(
          <TouchableOpacity onPress={onMenu} style={{padding:6}}>
            <Ionicons name="ellipsis-horizontal" size={18} color={c.textMuted}/>
          </TouchableOpacity>
        )}
      </View>

      {!!post.repostComment&&<Text style={p.content}>{post.repostComment}</Text>}
      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!post.repostOf&&!!post.content&&<TranslateRow text={post.content}/>}
      {!post.repostOf&&!!post.image&&<PostImage uri={post.image} />}

      {!post.repostOf&&!!post.linkPreview&&!!post.linkUrl&&(
        <TouchableOpacity
          style={{borderWidth:1,borderColor:c.border,borderRadius:14,overflow:'hidden',marginBottom:10,backgroundColor:c.cardAlt}}
          onPress={() => require('react-native').Linking.openURL(post.linkUrl!).catch(()=>{})}
          activeOpacity={0.85}
        >
          {!!post.linkPreview.image && (
            <Image source={{uri:post.linkPreview.image}} style={{width:'100%',height:160}} resizeMode="cover"/>
          )}
          <View style={{padding:12}}>
            {!!post.linkPreview.siteName && (
              <Text style={{fontSize:11,color:c.gold,fontWeight:'700',textTransform:'uppercase',marginBottom:2}}>{post.linkPreview.siteName}</Text>
            )}
            {!!post.linkPreview.title && (
              <Text style={{fontSize:14,fontWeight:'700',color:c.text}} numberOfLines={2}>{post.linkPreview.title}</Text>
            )}
            {!!post.linkPreview.description && (
              <Text style={{fontSize:12,color:c.textMuted,marginTop:3}} numberOfLines={2}>{post.linkPreview.description}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {!!post.repostOf&&(
        <View style={p.repostCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
            {post.repostOf.authorPhoto
              ? <Image source={{uri:post.repostOf.authorPhoto}} style={{width:28,height:28,borderRadius:14}} resizeMode="cover"/>
              : <View style={{width:28,height:28,borderRadius:14,backgroundColor:post.repostOf.authorColor,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:c.white,fontSize:11,fontWeight:'700'}}>{post.repostOf.authorInitials}</Text>
                </View>
            }
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:c.text}}>{post.repostOf.authorName}</Text>
              <Text style={{fontSize:11,color:c.textMuted}}>{formatRelativeTime(post.repostOf.createdAt, post.repostOf.time)}</Text>
            </View>
          </View>
          {!!post.repostOf.content&&<Text style={{fontSize:14,color:c.text,lineHeight:21}}>{post.repostOf.content}</Text>}
          {!!post.repostOf.image&&<PostImage uri={post.repostOf.image} style={{marginTop:8,marginBottom:0}} />}
          {!!post.repostOf.eventShareData && (
            <TouchableOpacity
              style={{backgroundColor:c.card,marginTop:8,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:c.border}}
              onPress={()=>router.push({pathname:'/event-detail',params:{id:post.repostOf?.eventShareData!.id}})}
              activeOpacity={0.92}
            >
              {post.repostOf.eventShareData.bannerImage ? (
                <ImageBackground source={{uri: post.repostOf.eventShareData.bannerImage}} style={{aspectRatio:16/9,backgroundColor:c.cardAlt}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
              ) : (
                <LinearGradient colors={post.repostOf.eventShareData.bannerColor || ['#667eea','#764ba2']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
              )}
              <View style={{padding:10}}>
                <View style={{flexDirection:'row',gap:6,marginBottom:6}}>
                  <View style={{backgroundColor:c.navy,borderRadius:100,paddingHorizontal:8,paddingVertical:3}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:c.white}}>{post.repostOf.eventShareData.type}</Text>
                  </View>
                  <View style={{backgroundColor: post.repostOf.eventShareData.price==='Free' ? c.green : '#e67e22', borderRadius:100, paddingHorizontal:8, paddingVertical:3}}>
                    <Text style={{fontSize:10,fontWeight:'700',color:c.white}}>{post.repostOf.eventShareData.price}</Text>
                  </View>
                </View>
                <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:c.text}} numberOfLines={1}>{post.repostOf.eventShareData.title}</Text>
                {!!post.repostOf.eventShareData.organizer && (
                  <Text style={{fontSize:11,color:c.gold,fontWeight:'600',marginTop:2}}>by {post.repostOf.eventShareData.organizer}</Text>
                )}
                <Text style={{fontSize:11,color:c.textMuted,marginTop:4}}>{post.repostOf.eventShareData.date}{post.repostOf.eventShareData.time?' · '+post.repostOf.eventShareData.time:''}</Text>
                {!!post.repostOf.eventShareData.location && (
                  <Text style={{fontSize:11,color:c.textMuted,marginTop:2}} numberOfLines={1}>{post.repostOf.eventShareData.location}</Text>
                )}
                <Text style={{fontSize:11,color:c.gold,fontWeight:'700',marginTop:6}}>View Event →</Text>
              </View>
            </TouchableOpacity>
          )}
          {!!post.repostOf.churchShareData && (
            <TouchableOpacity
              style={{backgroundColor:c.card,marginTop:8,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:c.border}}
              onPress={()=>router.push({pathname:'/church-detail',params:{placeId: post.repostOf?.churchShareData!.placeId || post.repostOf?.churchShareData!.id}})}
              activeOpacity={0.92}
            >
              {post.repostOf.churchShareData.photo ? (
                <ImageBackground source={{uri: post.repostOf.churchShareData.photo}} style={{aspectRatio:16/9,backgroundColor:'#c9a96e'}} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover" />
              ) : (
                <LinearGradient colors={post.repostOf.churchShareData.gradient || ['#c9a96e','#1a1a2e']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
              )}
              <View style={{padding:10}}>
                {!!post.repostOf.churchShareData.rating && post.repostOf.churchShareData.rating > 0 && (
                  <View style={{flexDirection:'row',alignItems:'center',gap:3,marginBottom:6}}>
                    <Ionicons name="star" size={11} color={c.gold}/>
                    <Text style={{fontSize:11,fontWeight:'700',color:c.text}}>{post.repostOf.churchShareData.rating.toFixed(1)}</Text>
                  </View>
                )}
                <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:c.text}} numberOfLines={1}>{post.repostOf.churchShareData.name}</Text>
                {!!post.repostOf.churchShareData.type && (
                  <Text style={{fontSize:11,color:c.gold,fontWeight:'600',marginTop:2}}>{post.repostOf.churchShareData.type}</Text>
                )}
                <Text style={{fontSize:11,color:c.textMuted,marginTop:4}} numberOfLines={1}>{post.repostOf.churchShareData.address}</Text>
                <Text style={{fontSize:11,color:c.gold,fontWeight:'700',marginTop:6}}>View Church →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {post.eventShareData&&(
        <TouchableOpacity
          style={{backgroundColor:c.card,marginTop:8,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8}}
          onPress={()=>router.push({pathname:'/event-detail',params:{id:post.eventShareData!.id}})}
          activeOpacity={0.92}
        >
          {post.eventShareData.bannerImage ? (
            <ImageBackground source={{uri: post.eventShareData.bannerImage}} style={{aspectRatio:16/9,backgroundColor:c.cardAlt}} resizeMode="cover" />
          ) : (
            <LinearGradient colors={post.eventShareData.bannerColor || ['#667eea','#764ba2']} style={{aspectRatio:16/9}} start={{x:0,y:0}} end={{x:1,y:1}} />
          )}
          <View style={{padding:14}}>
            <View style={{flexDirection:'row',gap:8,marginBottom:10}}>
              <View style={{backgroundColor:c.navy,borderRadius:100,paddingHorizontal:10,paddingVertical:4}}>
                <Text style={{fontSize:11,fontWeight:'700',color:c.white}}>{post.eventShareData.type}</Text>
              </View>
              <View style={{backgroundColor: post.eventShareData.price==='Free' ? c.green : '#e67e22', borderRadius:100, paddingHorizontal:10, paddingVertical:4}}>
                <Text style={{fontSize:11,fontWeight:'700',color:c.white}}>{post.eventShareData.price}</Text>
              </View>
            </View>
            <Text style={{fontFamily:'PlayfairDisplay_700Bold',fontSize:17,color:c.text,marginBottom:3}} numberOfLines={1}>{post.eventShareData.title}</Text>
            {!!post.eventShareData.organizer && (
              <Text style={{fontSize:12,color:c.gold,fontWeight:'600',marginBottom:8}}>by {post.eventShareData.organizer}</Text>
            )}
            <View style={{gap:5}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Ionicons name="calendar-outline" size={13} color={c.textMuted}/>
                <Text style={{fontSize:12,color:c.textMuted}}>{post.eventShareData.date}{post.eventShareData.time?' · '+post.eventShareData.time:''}</Text>
              </View>
              {!!post.eventShareData.location && (
                <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                  <Ionicons name="location-outline" size={13} color={c.textMuted}/>
                  <Text style={{fontSize:12,color:c.textMuted}}>{post.eventShareData.location}</Text>
                </View>
              )}
            </View>
            <Text style={{fontSize:12,color:c.gold,fontWeight:'700',marginTop:10}}>View Event →</Text>
          </View>
        </TouchableOpacity>
      )}
      {post.churchShareData&&(
        <TouchableOpacity
          style={{backgroundColor:c.card,marginTop:8,borderRadius:20,overflow:'hidden',borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8}}
          onPress={()=>router.push({pathname:'/church-detail',params:{placeId: post.churchShareData!.placeId || post.churchShareData!.id}})}
          activeOpacity={0.92}
        >
          {post.churchShareData.photo ? (
            <ImageBackground source={{uri: post.churchShareData.photo}} style={{height:140,justifyContent:'flex-end',padding:14,backgroundColor:(post.churchShareData.gradient && post.churchShareData.gradient[0]) || '#c9a96e'}} resizeMode="cover">
              {!!post.churchShareData.rating && post.churchShareData.rating > 0 && (
                <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(26,26,46,0.85)',alignSelf:'flex-start',borderRadius:100,paddingHorizontal:10,paddingVertical:4}}>
                  <Ionicons name="star" size={11} color={c.gold}/>
                  <Text style={{fontSize:11,fontWeight:'700',color:'#fff'}}>{post.churchShareData.rating.toFixed(1)}</Text>
                </View>
              )}
            </ImageBackground>
          ) : (
            <LinearGradient colors={post.churchShareData.gradient || ['#c9a96e','#1a1a2e']} style={{height:140,justifyContent:'flex-end',padding:14}} start={{x:0,y:0}} end={{x:1,y:1}}>
              {!!post.churchShareData.rating && post.churchShareData.rating > 0 && (
                <View style={{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'rgba(26,26,46,0.85)',alignSelf:'flex-start',borderRadius:100,paddingHorizontal:10,paddingVertical:4}}>
                  <Ionicons name="star" size={11} color={c.gold}/>
                  <Text style={{fontSize:11,fontWeight:'700',color:'#fff'}}>{post.churchShareData.rating.toFixed(1)}</Text>
                </View>
              )}
            </LinearGradient>
          )}
          <View style={{padding:14}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4}}>
              <View style={{width:22,height:22,borderRadius:6,backgroundColor:c.navy,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="business" size={12} color={c.gold}/>
              </View>
              <Text style={{fontSize:15,fontWeight:'700',color:c.text,flex:1}} numberOfLines={1}>{post.churchShareData.name}</Text>
            </View>
            {!!post.churchShareData.type && (
              <Text style={{fontSize:11,color:c.gold,fontWeight:'600',marginBottom:4}}>{post.churchShareData.type}</Text>
            )}
            <Text style={{fontSize:12,color:c.textMuted}}>{post.churchShareData.address}</Text>
            <Text style={{fontSize:12,color:c.gold,fontWeight:'700',marginTop:10}}>View Church →</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={p.actions}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <TouchableOpacity style={p.actionBtn} onPress={onLike}>
            <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?c.red:c.textMuted}/>
            <Text style={[p.actionTxt,post.liked&&{color:c.red}]}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={p.actionBtn} onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={19} color={c.textMuted}/>
            <Text style={p.actionTxt}>{post.comments.length}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="repeat-outline" size={19} color={c.textMuted}/>
          <Text style={p.actionTxt}>{post.repostsCount||0}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const makeStyles = (c: ThemeColors) => StyleSheet.create({
  connectBadge:{position:'absolute',right:-2,bottom:-2,width:19,height:19,borderRadius:10,backgroundColor:c.primary,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:c.card},
  cardAnnouncement:{borderColor:c.gold,borderWidth:1.5,backgroundColor:c.isDark?'rgba(201,169,110,0.07)':'rgba(201,169,110,0.05)'},
  announceBanner:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:12},
  announceBannerTxt:{fontSize:11,fontWeight:'700',color:c.gold,letterSpacing:0.6,textTransform:'uppercase'},
  card:{backgroundColor:c.card,marginHorizontal:14,marginBottom:14,paddingVertical:18,paddingHorizontal:18,borderRadius:22,borderWidth:1,borderColor:c.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:10,elevation:2},
  authorRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:14},
  avatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:c.white,fontWeight:'700',fontSize:15},
  authorName:{fontSize:14,fontWeight:'700',color:c.text},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.16)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:c.gold},
  time:{fontSize:12,color:c.textMuted},
  dot:{fontSize:12,color:c.textMuted},
  locationTxt:{fontSize:12,color:c.gold,fontWeight:'600'},
  content:{fontSize:15,color:c.text,lineHeight:23,marginBottom:14},
  image:{width:'100%',height:280,borderRadius:16,marginBottom:14,backgroundColor:c.cardAlt},
  locationPill:{flexDirection:'row',alignItems:'center',gap:4,alignSelf:'flex-start',backgroundColor:'rgba(201,169,110,0.10)',borderRadius:100,paddingHorizontal:10,paddingVertical:4,marginBottom:14},
  locationPillTxt:{fontSize:12,color:c.gold,fontWeight:'600'},
  sharedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:16,padding:14,marginBottom:14,backgroundColor:c.cardAlt},
  repostCard:{borderWidth:1.5,borderColor:c.border,borderRadius:16,padding:14,marginBottom:14,backgroundColor:c.cardAlt},
  actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:14,borderTopWidth:1,borderTopColor:c.rowBorder,marginTop:4},
  actionBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:6,paddingHorizontal:12,backgroundColor:c.cardAlt,borderRadius:100},
  actionTxt:{fontSize:13,color:c.textMuted,fontWeight:'500'},
});
