import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ImageBackground, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { Post, formatRelativeTime, postImages, isEmptyPost } from '../lib/postsStore';
import { translateText, detectLanguage } from '../lib/translate';
import { useSettings } from '../lib/settingsStore';
import { useTranslation } from '../lib/i18n';
import { useConnections, isConnectedTo, addConnection, connectionFromAuthor } from '../lib/connectionsStore';
import { useToast } from './Toast';


const SCREEN_WIDTH = Dimensions.get('window').width;

// The card runs the full width of the screen and insets its contents. These
// mirror the styles below and are what the photo widths are derived from; the
// calculation and the styles reading the same constants is what stops them
// drifting apart, which they had.
// 16, not the 32 this became when the card went full-width: that number was
// the old 14 of margin plus 18 of padding added together, which was right
// arithmetically and left the avatar floating well inside the edge. Everything
// the card insets — author row, caption, actions — moves together, which is
// the point of there being one number.
const CARD_INSET = 16;     // p.card paddingHorizontal
const REPOST_PADDING = 14; // p.repostCard padding

/**
 * A photo on a post.
 *
 * `bleed` is how far the image reaches back out through its container. At the
 * top level it cancels the card's margin and padding both, so the photo spans
 * the whole device width; a quoted repost passes 0 and stays inset, because a
 * picture inside a quote should read as part of the quote rather than as the
 * post's own.
 *
 * The height comes from the image's real proportions, clamped. Nothing is
 * stretched: a portrait photo taller than the clamp is cropped by `cover`
 * rather than squashed to fit.
 */
function PostImage({ uri, style, inset = CARD_INSET, bleed = inset }: { uri: string; style?: any; inset?: number; bleed?: number }) {
  const c = useThemeColors();
  const [aspectRatio, setAspectRatio] = useState(1);
  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => { if (w > 0 && h > 0) setAspectRatio(w / h); },
      () => {}
    );
  }, [uri]);

  // The width this image will actually be laid out at.
  //
  // The old expression was `SCREEN_WIDTH - 36 - 18*2 + 18*2`, whose two halves
  // cancel to `SCREEN_WIDTH - 36`. The real content box is
  // `SCREEN_WIDTH - 14*2 - 18*2`, so every height was computed from a width
  // 28pt too generous and came out proportionally too tall — which `cover`
  // then hid by cropping. Same numbers as the styles, once.
  const width = photoWidth(inset, bleed);

  // A feed photo should hold the screen, not sit in it. Proportional to the
  // device rather than a fixed 420, so it means the same thing on a small
  // phone as on a large one.
  const height = clampHeight(width / aspectRatio, width);

  return (
    <Image
      source={{ uri }}
      style={[{
        width,
        height,
        // Pull back out through the padding so the photo meets the card's edge.
        marginHorizontal: -bleed,
        // Square corners when it reaches the card edge, rounded when inset —
        // a rounded corner against a straight edge reads as a mistake.
        borderRadius: bleed > 0 ? 0 : 16,
        backgroundColor: c.cardAlt,
        marginBottom: 14,
      }, style]}
      resizeMode="cover"
    />
  );
}

/**
 * The width a photo is laid out at.
 *
 * `inset` is however far its container holds it off the screen edge, and
 * `bleed` how much of that it reaches back out through. When they are equal
 * the photo spans the screen exactly.
 *
 * Both are the caller's to state. An earlier version inferred "inside a quoted
 * repost" from `bleed === 0`, which held only until something else wanted an
 * inset photo — a church's page, as it turned out — and then quietly
 * subtracted a repost's padding from a card that had none.
 */
function photoWidth(inset: number, bleed: number): number {
  return SCREEN_WIDTH - (inset - bleed) * 2;
}

/**
 * The height a photo gets, from its own proportions.
 *
 * The ceiling is 4:5 — a photo may be a quarter taller than it is wide and no
 * more. Tied to the width rather than the screen, because that is what the
 * limit is actually about: how tall a picture may be relative to itself. A
 * proportion of screen height let a portrait photo run to nearly two thirds of
 * the display, pushing everything after it out of view, which reads as the
 * photo having taken over the feed rather than being in it.
 *
 * A photo taller than that is cropped by `cover`, never squashed.
 *
 * The floor is deliberately low. It exists only so a freak panorama does not
 * render as a sliver — set any higher and an ordinary landscape photo gets
 * cropped top and bottom to reach a height it never had, which is the
 * "awkward crop" that makes every picture look the same shape.
 */
function clampHeight(natural: number, width: number): number {
  const maxHeight = Math.round(width * 1.25);
  const minHeight = 140;
  return Math.max(minHeight, Math.min(maxHeight, natural));
}

/**
 * Several photos on one post, swiped through.
 *
 * One height for the whole set, taken from the first photo. Sizing each frame
 * to its own picture would change the card's height mid-swipe and shove
 * everything below it up and down, which is worse than the crop it avoids —
 * and it is what every feed that does this settles on.
 */
function PostPhotoGallery({ uris, inset = CARD_INSET, bleed = inset, style }: { uris: string[]; inset?: number; bleed?: number; style?: any }) {
  const c = useThemeColors();
  const [aspectRatio, setAspectRatio] = useState(1);
  const [page, setPage] = useState(0);

  useEffect(() => {
    Image.getSize(uris[0], (w, h) => { if (w > 0 && h > 0) setAspectRatio(w / h); }, () => {});
  }, [uris[0]]);

  const width = photoWidth(inset, bleed);
  const height = clampHeight(width / aspectRatio, width);

  return (
    <View style={[{ marginHorizontal: -bleed, marginBottom: 14 }, style]}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // One page wide, stated rather than inherited. A horizontal ScrollView
        // that is not given a width takes its content's width instead, so
        // contentSize equals the frame and it stops scrolling at all — the
        // photos are still there, off the side of the screen, unreachable.
        style={{ width, height }}
        // Follow the drag rather than waiting for momentum to end. A slow swipe
        // released without a flick fires no momentum event, which left the
        // badge reading 1/4 over the second photo.
        scrollEventThrottle={16}
        onScroll={e => {
          const next = Math.max(0, Math.min(uris.length - 1,
            Math.round(e.nativeEvent.contentOffset.x / width)));
          setPage(prev => (prev === next ? prev : next));
        }}
      >
        {uris.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={{ width, height, backgroundColor: c.cardAlt, borderRadius: bleed > 0 ? 0 : 16 }}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Which of how many. Without it a second photo is invisible — nothing
          on screen says there is anything to swipe to. Over the picture rather
          than under it, so it costs no height and cannot push the caption
          around as the count changes. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', top: 12, right: 12,
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
          {page + 1}/{uris.length}
        </Text>
      </View>
    </View>
  );
}

/**
 * Whatever photos a post has: none, one, or a gallery.
 *
 * Exported because the comment thread shows the same post and should show the
 * same photos — before this it rendered `post.image` alone, so opening the
 * comments on a post with four pictures showed one.
 */
export function PostPhotos({ uris, inset, bleed, style }: { uris: string[]; inset?: number; bleed?: number; style?: any }) {
  if (!uris.length) return null;
  if (uris.length === 1) return <PostImage uri={uris[0]} inset={inset} bleed={bleed} style={style} />;
  return <PostPhotoGallery uris={uris} inset={inset} bleed={bleed} style={style} />;
}

/** How many lines of a caption show before it is folded away. */
const CAPTION_LINES = 3;

/**
 * A post's caption, folded when it runs long.
 *
 * The line count has to be measured rather than guessed: the same character
 * count is two lines of one word and five of another, and a caption folded at
 * exactly its own length would show a "more" that reveals nothing.
 *
 * So an invisible copy is laid out once to count the lines, and thrown away as
 * soon as it has answered. Rendering the visible copy unclamped for a frame
 * would answer the same question and flash the whole caption on every post in
 * the feed while doing it.
 */
function Caption({ text, style }: { text: string; style: any }) {
  const c = useThemeColors();
  const { tx } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState<boolean | null>(null);

  return (
    <View style={{ marginBottom: 12 }}>
      {overflows === null && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}>
          <Text
            style={[style, { marginBottom: 0 }]}
            onTextLayout={e => setOverflows(e.nativeEvent.lines.length > CAPTION_LINES)}
          >
            {text}
          </Text>
        </View>
      )}

      <Text
        style={[style, { marginBottom: 0 }]}
        numberOfLines={expanded ? undefined : CAPTION_LINES}
      >
        {text}
      </Text>

      {/* Only when there is something hidden. A "more" on a caption that
          already fits is a promise the tap cannot keep. */}
      {overflows === true && (
        <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.gold, marginTop: 2 }}>
            {expanded ? tx('less') : tx('more')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
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

export function PostCard({post,showLocation,onLike,onComment,onShare,onOpenProfile,isOwnPost,onMenu}:{
  post:Post; showLocation:boolean; onLike:()=>void; onComment:()=>void; onShare:()=>void; onOpenProfile:()=>void;
  isOwnPost?:boolean; onMenu?:()=>void;
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
  // Nothing to show is not a card. One that slipped through renders as a row
  // of buttons attached to no content, with no way to remove it.
  if (isEmptyPost(post)) return null;

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

      {!!post.repostComment&&<Caption text={post.repostComment} style={p.content}/>}
      {!post.repostOf&&!!post.content&&<Caption text={post.content} style={p.content}/>}
      {!post.repostOf&&!!post.content&&<TranslateRow text={post.content}/>}
      {!post.repostOf&&<PostPhotos uris={postImages(post)} />}

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
          {!!post.repostOf.image&&<PostPhotos uris={postImages(post.repostOf)} inset={CARD_INSET + REPOST_PADDING} bleed={0} style={{marginTop:8,marginBottom:0}} />}
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
  // Flush to the screen, because the photo inside it is. A card inset from
  // the edge cannot hold a picture wider than itself without the picture
  // crossing its own border, so the rounded, floating card gives way to the
  // full-width one every feed with full-bleed photos ends up using. The
  // padding stays: text is still inset, only the photo is not.
  //
  // One rule, underneath. A border on both edges drew twice between adjacent
  // cards and once more against whatever sits above the first one — a band of
  // empty white with a line at each end.
  // The gap between posts is drawn, not left: the background and the card are
  // both white in the light theme, so nothing shows through a margin. An 8pt
  // band reads as a section break where a hairline read as an accident, and
  // replaces the margin rather than adding to it.
  //
  // The top padding is tighter than the bottom on purpose — the author row
  // belongs to the divider above it, and 18 left it floating in the middle of
  // its own gap.
  card:{backgroundColor:c.card,paddingTop:12,paddingBottom:18,paddingHorizontal:CARD_INSET,borderBottomWidth:8,borderBottomColor:c.border},
  authorRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:14},
  avatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:c.white,fontWeight:'700',fontSize:15},
  authorName:{fontSize:14,fontWeight:'700',color:c.text},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.16)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:c.gold},
  time:{fontSize:12,color:c.textMuted},
  dot:{fontSize:12,color:c.textMuted},
  locationTxt:{fontSize:12,color:c.gold,fontWeight:'600'},
  content:{fontSize:16,color:c.text,lineHeight:24,marginBottom:12},
  locationPill:{flexDirection:'row',alignItems:'center',gap:4,alignSelf:'flex-start',backgroundColor:'rgba(201,169,110,0.10)',borderRadius:100,paddingHorizontal:10,paddingVertical:4,marginBottom:14},
  locationPillTxt:{fontSize:12,color:c.gold,fontWeight:'600'},
  sharedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:16,padding:14,marginBottom:14,backgroundColor:c.cardAlt},
  repostCard:{borderWidth:1.5,borderColor:c.border,borderRadius:16,padding:14,marginBottom:14,backgroundColor:c.cardAlt},
  // No rule above the actions. The card already ends with one, so a second
  // line a few points higher boxed the caption in for no reason. The spacing
  // that was holding the row off the text is kept — only the line is gone.
  actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:14,marginTop:4},
  actionBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:6,paddingHorizontal:12,backgroundColor:c.cardAlt,borderRadius:100},
  actionTxt:{fontSize:13,color:c.textMuted,fontWeight:'500'},
});
