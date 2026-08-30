import { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Modal,
  Image, ImageBackground, Share, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { useToast } from './Toast';
import { Post, repostPost } from '../lib/postsStore';
import { getUser } from '../lib/userStore';
import { buildPostShareText } from '../lib/shareLinks';
import { KeyboardScreen } from './KeyboardScreen';

/**
 * The Repost / Share sheet for a post.
 *
 * This used to live inside the Community screen, which meant the same button on
 * your own profile did nothing at all — `onShare` was wired to an empty
 * function there. Rather than copy a hundred lines of modals into a second
 * screen and let the two drift, both now render this.
 *
 * The share-timing dance below is load-bearing, not incidental: see queueShare.
 */
export function PostShareSheet({ post, onClose }: { post: Post | null; onClose: () => void }) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const { showToast } = useToast();
  const [composing, setComposing] = useState(false);
  const [comment, setComment] = useState('');

  // Reset when a different post opens the sheet, so a caption typed for one
  // post is never carried onto another.
  useEffect(() => { if (!post) { setComposing(false); setComment(''); } }, [post]);

  /**
   * Calling Share.share() while the sheet is still on screen means iOS has two
   * modals fighting for the window, and the share sheet loses — the button
   * looks dead. So the Share row does NOT call Share.share() directly: it
   * stashes the text, closes the sheet, and the share fires from the Modal's
   * onDismiss once the sheet is genuinely gone. Android never fires onDismiss,
   * so a short timer covers it, and a longer one is a backstop in case
   * onDismiss never arrives. `firedRef` makes sure only one wins.
   */
  const pendingRef = useRef<string | null>(null);
  const firedRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function queueShare(message: string) {
    clearTimers();
    pendingRef.current = message;
    firedRef.current = false;
    timersRef.current.push(setTimeout(flushPendingShare, Platform.OS === 'android' ? 300 : 900));
  }

  function flushPendingShare() {
    const message = pendingRef.current;
    if (!message || firedRef.current) return;
    firedRef.current = true;
    pendingRef.current = null;
    clearTimers();
    Share.share({ message, title: tx('Check this out on FaithFinder') })
      .catch((err: any) => {
        // Never fail silently — a dead-looking button is what sent us here.
        showToast(t('share'), String(err?.message || err), 'error');
      });
  }

  // Clean up on unmount so a pending timer cannot fire into a gone screen.
  useEffect(() => clearTimers, []);

  const user = getUser();
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();

  // A repost quotes the original, never the repost wrapper around it.
  const src = post?.repostOf ?? post;

  function close() { setComposing(false); setComment(''); onClose(); }

  return (
    <>
      <Modal visible={!!post && !composing} transparent animationType="fade" onRequestClose={close} onDismiss={flushPendingShare}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={close}>
          <View style={s.sheet}>
            <View style={s.grabber}/>
            <Text style={s.sheetTitle}>{t('sharePost')}</Text>

            <TouchableOpacity style={s.optRow} onPress={() => setComposing(true)}>
              <View style={[s.optIcon,{backgroundColor:'rgba(102,126,234,0.16)'}]}>
                <Ionicons name="repeat" size={22} color="#667eea"/>
              </View>
              <View style={{flex:1}}>
                <Text style={s.optTitle}>{t('repost')}</Text>
                <Text style={s.optSub}>{t('shareToFeed')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.placeholder}/>
            </TouchableOpacity>

            <TouchableOpacity style={s.optRow} onPress={() => { queueShare(buildPostShareText(post)); close(); }}>
              <View style={[s.optIcon,{backgroundColor:c.cardAlt}]}>
                <Ionicons name="arrow-redo-outline" size={22} color={c.text}/>
              </View>
              <View style={{flex:1}}>
                <Text style={s.optTitle}>{t('share')}</Text>
                <Text style={s.optSub}>{t('sendVia')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.placeholder}/>
            </TouchableOpacity>

            <TouchableOpacity style={s.cancelRow} onPress={close}>
              <Text style={s.cancelRowTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!post && composing} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top']}>
        <KeyboardScreen dismissOnTap={false}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={close}><Text style={s.cancelTxt}>{t('cancel')}</Text></TouchableOpacity>
            <Text style={s.modalTitle}>{t('repost')}</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (post) {
                repostPost(post, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, comment.trim());
              }
              close();
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
            style={s.composeInput}
            multiline
            autoFocus
            value={comment}
            onChangeText={setComment}
            placeholder={tx('Add a comment (optional)')}
            placeholderTextColor={c.placeholder}
          />

          {!!src && (
            <View style={s.quotedCard}>
              <View style={s.quotedHdr}>
                <View style={[s.quotedAvatar,{backgroundColor:src.authorColor}]}>
                  <Text style={s.quotedAvatarTxt}>{src.authorInitials}</Text>
                </View>
                <Text style={s.quotedName}>{src.authorName}</Text>
              </View>
              <Text style={s.quotedBody} numberOfLines={3}>{src.content}</Text>

              {!!src.image && (
                <Image source={{uri:src.image}} style={s.quotedImage} resizeMode="cover"/>
              )}

              {!!src.eventShareData && (
                <View style={s.quotedEmbed}>
                  {src.eventShareData.bannerImage ? (
                    <ImageBackground source={{uri:src.eventShareData.bannerImage}} style={s.embedBanner} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover"/>
                  ) : (
                    <LinearGradient colors={src.eventShareData.bannerColor || ['#667eea','#764ba2']} style={s.embedBanner} start={{x:0,y:0}} end={{x:1,y:1}}/>
                  )}
                  <View style={s.embedBody}>
                    <Text style={s.embedTitle} numberOfLines={1}>{src.eventShareData.title}</Text>
                    <Text style={s.embedSub}>{src.eventShareData.date}</Text>
                  </View>
                </View>
              )}

              {!!src.churchShareData && (
                <View style={s.quotedEmbed}>
                  {src.churchShareData.photo ? (
                    <ImageBackground source={{uri:src.churchShareData.photo}} style={[s.embedBanner,{backgroundColor:'#c9a96e'}]} imageStyle={{width:'100%',height:'100%'}} resizeMode="cover"/>
                  ) : (
                    <LinearGradient colors={src.churchShareData.gradient || ['#c9a96e','#1a1a2e']} style={s.embedBanner} start={{x:0,y:0}} end={{x:1,y:1}}/>
                  )}
                  <View style={s.embedBody}>
                    <Text style={s.embedTitle} numberOfLines={1}>{src.churchShareData.name}</Text>
                    <Text style={s.embedSub} numberOfLines={1}>{src.churchShareData.address}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </KeyboardScreen>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay:{flex:1,backgroundColor:c.overlay,justifyContent:'flex-end'},
  sheet:{backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32},
  grabber:{width:36,height:4,borderRadius:2,backgroundColor:c.border,alignSelf:'center',marginVertical:10},
  sheetTitle:{fontSize:16,fontWeight:'700',color:c.text,textAlign:'center',marginBottom:16},
  optRow:{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14},
  optIcon:{width:44,height:44,borderRadius:14,alignItems:'center',justifyContent:'center'},
  optTitle:{fontSize:15,fontWeight:'700',color:c.text},
  optSub:{fontSize:12,color:c.textMuted,marginTop:1},
  cancelRow:{paddingVertical:16,marginTop:6,alignItems:'center'},
  cancelRowTxt:{fontSize:15,fontWeight:'600',color:c.textMuted},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.border},
  cancelTxt:{fontSize:15,color:c.textMuted},
  modalTitle:{fontSize:16,fontWeight:'700',color:c.text},
  postBtn:{backgroundColor:c.primary,borderRadius:100,paddingHorizontal:20,paddingVertical:8},
  postBtnTxt:{color:c.onPrimary,fontSize:14,fontWeight:'700'},
  composeAuthor:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:16,paddingBottom:8},
  composeAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  composeAvatarTxt:{color:c.white,fontWeight:'700',fontSize:15},
  composeAuthorName:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:8},
  composeInput:{fontSize:16,color:c.text,lineHeight:25,minHeight:80,paddingHorizontal:16,paddingVertical:8,textAlignVertical:'top'},
  quotedCard:{borderWidth:1.5,borderColor:c.border,borderRadius:12,padding:12,marginTop:8,marginHorizontal:16,backgroundColor:c.cardAlt},
  quotedHdr:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6},
  quotedAvatar:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},
  quotedAvatarTxt:{color:'#fff',fontSize:10,fontWeight:'700'},
  quotedName:{fontSize:13,fontWeight:'700',color:c.text},
  quotedBody:{fontSize:13,color:c.textSecondary},
  quotedImage:{width:'100%',aspectRatio:16/9,borderRadius:10,marginTop:8},
  quotedEmbed:{marginTop:8,borderRadius:12,overflow:'hidden',borderWidth:1,borderColor:c.border},
  embedBanner:{aspectRatio:16/9},
  embedBody:{padding:10},
  embedTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:14,color:c.text},
  embedSub:{fontSize:11,color:c.textMuted,marginTop:2},
});
