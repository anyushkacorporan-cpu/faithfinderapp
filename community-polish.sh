#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Share, Image, Linking
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS } from '../../src/lib/constants';
import {
  usePosts, addPost, toggleLike, addComment, addReply,
  toggleCommentLike, toggleReplyLike, Post, Comment
} from '../../src/lib/postsStore';
import { getUser } from '../../src/lib/userStore';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'foryou'|'discover'>('foryou');
  const posts = usePosts(activeTab);
  const user = getUser();

  const [showCreate, setShowCreate] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{commentId:string;author:string}|null>(null);
  const [showComments, setShowComments] = useState(false);
  const [sharePost, setSharePost] = useState<Post|null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const displayName = user.accountType==='church'
    ? (user.churchName||'Church')
    : ((user.firstName||'You')+' '+(user.lastName||'')).trim();
  const userInitials = (user.accountType==='church'
    ? (user.churchName?.[0]||'C')
    : ((user.firstName?.[0]||'Y')+(user.lastName?.[0]||''))).toUpperCase();

  function handleCreatePost() {
    if (!newPostText.trim()) return;
    addPost({
      authorName: displayName, authorInitials: userInitials,
      authorType: user.accountType==='church'?'church':'personal',
      authorColor:'#667eea', content:newPostText.trim(), time:'now',
      city:user.location?.split(',')[0]?.trim(),
      state:user.location?.split(',')[1]?.trim(),
    });
    setNewPostText(''); setShowCreate(false);
  }

  function handleAddComment() {
    if (!commentText.trim()||!activePost) return;
    if (replyingTo) {
      addReply(activePost.id, replyingTo.commentId, commentText.trim(), displayName, userInitials, '#667eea');
      setReplyingTo(null);
    } else {
      addComment(activePost.id, commentText.trim(), displayName, userInitials, '#667eea');
    }
    setCommentText('');
  }

  function openComments(post: Post) {
    setActivePost(post); setShowComments(true);
    setReplyingTo(null); setCommentText('');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      {/* Tab Bar */}
      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tabPill, activeTab===tab&&s.tabPillActive]} onPress={()=>setActiveTab(tab)}>
              <Text style={[s.tabPillTxt, activeTab===tab&&s.tabPillTxtActive]}>
                {tab==='foryou'?'For You':'Discover'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.newPostFab} onPress={()=>setShowCreate(true)}>
          <Ionicons name="create-outline" size={18} color={COLORS.white}/>
        </TouchableOpacity>
      </View>

      {/* Discover header */}
      {activeTab==='discover' && (
        <View style={s.discoverHeader}>
          <View style={s.discoverHeaderLeft}>
            <Ionicons name="globe" size={14} color={COLORS.gold}/>
            <Text style={s.discoverHeaderTxt}>Christians from all 50 states</Text>
          </View>
        </View>
      )}

      <ScrollView style={s.feed} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingTop:8,paddingBottom:32}}>
        {posts.map(post => (
          <PostCard
            key={post.id} post={post}
            showLocation={activeTab==='discover'}
            onLike={()=>toggleLike(post.id)}
            onComment={()=>openComments(post)}
            onShare={()=>{setSharePost(post);setShareMessage('');}}
          />
        ))}
      </ScrollView>

      {/* ── Create Post Modal ── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{setShowCreate(false);setNewPostText('');}}>
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalHdrTitle}>New Post</Text>
            <TouchableOpacity
              style={[s.modalPostBtn, !newPostText.trim()&&{opacity:0.4}]}
              onPress={handleCreatePost} disabled={!newPostText.trim()}
            >
              <Text style={s.modalPostBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <View style={s.createComposer}>
              <View style={[s.avatarLg,{backgroundColor:'#667eea'}]}>
                <Text style={s.avatarLgTxt}>{userInitials}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={s.createName}>{displayName}</Text>
                <TextInput
                  style={s.createInput}
                  placeholder="Share what's on your heart..."
                  placeholderTextColor="#bbb"
                  value={newPostText}
                  onChangeText={setNewPostText}
                  multiline autoFocus
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Comments Modal ── */}
      <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <View style={{width:50}}/>
            <Text style={s.modalHdrTitle}>Comments</Text>
            <TouchableOpacity onPress={()=>{setShowComments(false);setReplyingTo(null);setCommentText('');}}>
              <Text style={s.modalCancelTxt}>Done</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8}}>
              {(!activePost?.comments||activePost.comments.length===0) && (
                <View style={s.emptyComments}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color="#e0dbd4"/>
                  <Text style={s.emptyCommentsTxt}>No comments yet</Text>
                  <Text style={s.emptyCommentsSub}>Be the first to share your thoughts</Text>
                </View>
              )}
              {activePost?.comments.map(c=>(
                <CommentThread
                  key={c.id} comment={c} postId={activePost.id}
                  onReply={()=>setReplyingTo({commentId:c.id,author:c.author})}
                  onLike={()=>toggleCommentLike(activePost.id,c.id)}
                  onReplyLike={rid=>toggleReplyLike(activePost.id,c.id,rid)}
                />
              ))}
              <View style={{height:16}}/>
            </ScrollView>
            {/* Input */}
            <View style={s.commentInputArea}>
              {replyingTo && (
                <View style={s.replyBanner}>
                  <Text style={s.replyBannerTxt}>↩ Replying to <Text style={{fontWeight:'700',color:COLORS.navy}}>{replyingTo.author}</Text></Text>
                  <TouchableOpacity onPress={()=>setReplyingTo(null)}>
                    <Ionicons name="close-circle" size={18} color="#bbb"/>
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.commentInputRow}>
                <View style={[s.avatarSm,{backgroundColor:'#667eea'}]}>
                  <Text style={s.avatarSmTxt}>{userInitials}</Text>
                </View>
                <TextInput
                  style={s.commentInput}
                  placeholder={replyingTo?`Reply to ${replyingTo.author}...`:'Add a comment...'}
                  placeholderTextColor="#bbb"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[s.sendBtn,!commentText.trim()&&{backgroundColor:'#e0dbd4'}]}
                  onPress={handleAddComment} disabled={!commentText.trim()}
                >
                  <Ionicons name="arrow-up" size={16} color={COLORS.white}/>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Share Modal ── */}
      <Modal visible={!!sharePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{setSharePost(null);setShareMessage('');}}>
              <Text style={s.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalHdrTitle}>New Post</Text>
            <TouchableOpacity style={s.modalPostBtn} onPress={()=>{
              if (!sharePost) return;
              addPost({
                authorName:displayName, authorInitials:userInitials,
                authorType:user.accountType==='church'?'church':'personal',
                authorColor:'#667eea', content:shareMessage.trim(), time:'now',
              });
              setSharePost(null); setShareMessage('');
            }}>
              <Text style={s.modalPostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled">
              <View style={s.shareComposer}>
                <View style={{alignItems:'center',gap:0}}>
                  <View style={[s.avatarLg,{backgroundColor:'#667eea'}]}>
                    <Text style={s.avatarLgTxt}>{userInitials}</Text>
                  </View>
                  <View style={s.avatarLine}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.createName}>{displayName}</Text>
                  <TextInput
                    style={s.shareInput}
                    placeholder="Add your thoughts... (optional)"
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline autoFocus
                  />
                  {sharePost && (
                    <View style={s.quotedPost}>
                      <View style={s.quotedPostHdr}>
                        <View style={[s.avatarXs,{backgroundColor:sharePost.authorColor}]}>
                          <Text style={s.avatarXsTxt}>{sharePost.authorInitials}</Text>
                        </View>
                        <Text style={s.quotedPostAuthor}>{sharePost.authorName}</Text>
                        {sharePost.city&&sharePost.state&&(
                          <Text style={s.quotedPostLoc}>{sharePost.city}, {sharePost.state}</Text>
                        )}
                      </View>
                      <Text style={s.quotedPostContent} numberOfLines={3}>{sharePost.content}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={s.shareOrDivider}>
                <View style={s.shareOrLine}/><Text style={s.shareOrTxt}>or share outside FaithFinder</Text><View style={s.shareOrLine}/>
              </View>
              <View style={s.externalRow}>
                {[
                  {icon:'chatbubble-outline',label:'Messages',color:'#2ecc71',bg:'#e8f8f0',action:'sms'},
                  {icon:'mail-outline',label:'Email',color:'#3498db',bg:'#eaf4fb',action:'email'},
                  {icon:'share-social-outline',label:'More',color:'#9b59b6',bg:'#f5eefb',action:'more'},
                ].map(opt=>(
                  <TouchableOpacity key={opt.label} style={s.externalBtn} onPress={()=>{
                    const msg = sharePost?.content||'';
                    if (opt.action==='sms') Linking.openURL('sms:&body='+encodeURIComponent(msg)).catch(()=>{});
                    else if (opt.action==='email') Linking.openURL('mailto:?subject=Check this out&body='+encodeURIComponent(msg)).catch(()=>{});
                    else { const p=sharePost; setSharePost(null); setTimeout(()=>Share.share({message:p?.content||''}).catch(()=>{}),500); }
                  }}>
                    <View style={[s.externalIcon,{backgroundColor:opt.bg}]}>
                      <Ionicons name={opt.icon as any} size={22} color={opt.color}/>
                    </View>
                    <Text style={s.externalLabel}>{opt.label}</Text>
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

// ── Post Card ─────────────────────────────────────────────
function PostCard({post,onLike,onComment,onShare,showLocation}:{
  post:Post; onLike:()=>void; onComment:()=>void; onShare:()=>void; showLocation:boolean;
}) {
  return (
    <View style={pc.card}>
      {/* Header */}
      <View style={pc.hdr}>
        <TouchableOpacity style={pc.authorRow} activeOpacity={0.7}>
          <View style={[pc.avatar,{backgroundColor:post.authorColor}]}>
            <Text style={pc.avatarTxt}>{post.authorInitials}</Text>
          </View>
          <View style={{flex:1}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <Text style={pc.authorName}>{post.authorName}</Text>
              {post.authorType==='church'&&(
                <View style={pc.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={COLORS.gold}/>
                  <Text style={pc.verifiedTxt}>Church</Text>
                </View>
              )}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4,marginTop:1}}>
              <Text style={pc.timeTxt}>{post.time}</Text>
              {showLocation&&post.city&&post.state&&(
                <><Text style={pc.dot}>·</Text>
                <Ionicons name="location-outline" size={11} color="#bbb"/>
                <Text style={pc.locTxt}>{post.city}, {post.state}</Text></>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={pc.connectBtn}>
          <Text style={pc.connectTxt}>+ Connect</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!!post.content&&<Text style={pc.content}>{post.content}</Text>}

      {/* Image */}
      {!!post.image&&<Image source={{uri:post.image}} style={pc.image} resizeMode="cover"/>}

      {/* Event card */}
      {post.eventShareData&&(
        <TouchableOpacity style={pc.eventCard} activeOpacity={0.88} onPress={()=>router.push({
          pathname:'/event-detail' as any,
          params:{id:post.eventShareData!.id,title:post.eventShareData!.title,date:post.eventShareData!.date,location:post.eventShareData!.location,type:post.eventShareData!.type,price:post.eventShareData!.price,description:''}
        })}>
          <LinearGradient colors={['#1a1a2e','#2d2240']} style={pc.eventCardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={pc.eventTypePill}><Text style={pc.eventTypeTxt}>{post.eventShareData.type}</Text></View>
          </LinearGradient>
          <View style={pc.eventCardBody}>
            <Text style={pc.eventCardTitle} numberOfLines={1}>{post.eventShareData.title}</Text>
            <View style={pc.eventCardRow}>
              <Ionicons name="calendar-outline" size={12} color="#888"/>
              <Text style={pc.eventCardTxt}>{post.eventShareData.date}</Text>
            </View>
            <View style={pc.eventCardRow}>
              <Ionicons name="location-outline" size={12} color="#888"/>
              <Text style={pc.eventCardTxt} numberOfLines={1}>{post.eventShareData.location}</Text>
            </View>
            <View style={pc.eventCardFooter}>
              <Text style={pc.eventCardLink}>View Event Details →</Text>
              <View style={[pc.eventPricePill,post.eventShareData.price==='Free'&&pc.eventPriceFree]}>
                <Text style={[pc.eventPriceTxt,post.eventShareData.price==='Free'&&{color:COLORS.green}]}>{post.eventShareData.price}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Church card */}
      {post.churchShareData&&(
        <View style={pc.churchCard}>
          <View style={[pc.churchCardIcon,{backgroundColor:COLORS.navy}]}>
            <Ionicons name="business" size={20} color={COLORS.gold}/>
          </View>
          <View style={{flex:1}}>
            <Text style={pc.churchCardName} numberOfLines={1}>{post.churchShareData.name}</Text>
            <Text style={pc.churchCardAddr} numberOfLines={1}>{post.churchShareData.address}</Text>
            <Text style={pc.churchCardLink}>View Church →</Text>
          </View>
        </View>
      )}

      {/* Quoted post (reshare) */}
      {!post.eventShareData&&!post.churchShareData&&post.content===''&&(
        <View style={pc.quotedPost}>
          <Text style={{fontSize:13,color:'#888',fontStyle:'italic'}}>Shared a post</Text>
        </View>
      )}

      {/* Actions */}
      <View style={pc.actions}>
        <TouchableOpacity style={pc.actionBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={22} color={post.liked?'#e74c6f':'#aaa'}/>
          {post.likes>0&&<Text style={[pc.actionCount,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={pc.actionBtn} onPress={onComment} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color="#aaa"/>
          {post.comments.length>0&&<Text style={pc.actionCount}>{post.comments.length}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={pc.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="arrow-redo-outline" size={20} color="#aaa"/>
          <Text style={pc.actionLabel}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Comment Thread ────────────────────────────────────────
function CommentThread({comment,postId,onReply,onLike,onReplyLike}:{
  comment:Comment; postId:string; onReply:()=>void; onLike:()=>void; onReplyLike:(id:string)=>void;
}) {
  const [collapsed,setCollapsed]=useState(false);
  return (
    <View style={ct.wrap}>
      <View style={ct.row}>
        <View style={{alignItems:'center'}}>
          <View style={[ct.avatar,{backgroundColor:comment.color}]}>
            <Text style={ct.avatarTxt}>{comment.initials}</Text>
          </View>
          {comment.replies.length>0&&!collapsed&&<View style={ct.threadLine}/>}
        </View>
        <View style={{flex:1,paddingBottom:4}}>
          <View style={ct.bubble}>
            <View style={ct.bubbleHdr}>
              <Text style={ct.author}>{comment.author}</Text>
              {comment.city&&comment.state&&<Text style={ct.loc}>{comment.city}, {comment.state}</Text>}
              <Text style={ct.time}>{comment.time}</Text>
            </View>
            <Text style={ct.text}>{comment.text}</Text>
          </View>
          <View style={ct.actions}>
            <TouchableOpacity style={ct.actionBtn} onPress={onLike}>
              <Ionicons name={comment.liked?'heart':'heart-outline'} size={14} color={comment.liked?'#e74c6f':'#bbb'}/>
              {comment.likes>0&&<Text style={[ct.actionTxt,comment.liked&&{color:'#e74c6f'}]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={ct.actionBtn} onPress={onReply}>
              <Text style={ct.actionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length>0&&(
              <TouchableOpacity style={ct.actionBtn} onPress={()=>setCollapsed(!collapsed)}>
                <Text style={ct.actionTxt}>{collapsed?`View ${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`:'Hide replies'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Replies */}
      {!collapsed&&comment.replies.map((r,i)=>(
        <View key={r.id} style={ct.replyRow}>
          <View style={ct.replyIndent}>
            {i<comment.replies.length-1&&<View style={ct.replyLine}/>}
          </View>
          <View style={[ct.avatar,{width:28,height:28,borderRadius:14,backgroundColor:r.color}]}>
            <Text style={[ct.avatarTxt,{fontSize:10}]}>{r.initials}</Text>
          </View>
          <View style={{flex:1}}>
            <View style={ct.bubble}>
              <View style={ct.bubbleHdr}>
                <Text style={ct.author}>{r.author}</Text>
                {r.city&&r.state&&<Text style={ct.loc}>{r.city}, {r.state}</Text>}
                <Text style={ct.time}>{r.time}</Text>
              </View>
              <Text style={ct.text}>{r.text}</Text>
            </View>
            <View style={ct.actions}>
              <TouchableOpacity style={ct.actionBtn} onPress={()=>onReplyLike(r.id)}>
                <Ionicons name={r.liked?'heart':'heart-outline'} size={13} color={r.liked?'#e74c6f':'#bbb'}/>
                {r.likes>0&&<Text style={[ct.actionTxt,r.liked&&{color:'#e74c6f'}]}>{r.likes}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f5f3ef'},
  tabBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#ede9e3',gap:10},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#ede9e3',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4,elevation:2},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#aaa'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  newPostFab:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  discoverHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:8,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)'},
  discoverHeaderLeft:{flexDirection:'row',alignItems:'center',gap:6},
  discoverHeaderTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  feed:{flex:1},
  modalRoot:{flex:1,backgroundColor:COLORS.white},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#ede9e3'},
  modalCancelTxt:{fontSize:15,color:'#888',fontWeight:'500'},
  modalHdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  modalPostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  modalPostBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  createComposer:{flexDirection:'row',gap:12,padding:16},
  createName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:6},
  createInput:{fontSize:16,color:COLORS.navy,minHeight:120,textAlignVertical:'top',lineHeight:24},
  avatarLg:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  avatarLgTxt:{color:COLORS.white,fontWeight:'700',fontSize:16},
  avatarSm:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  avatarSmTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  avatarXs:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},
  avatarXsTxt:{color:COLORS.white,fontWeight:'700',fontSize:9},
  avatarLine:{width:2,flex:1,minHeight:24,backgroundColor:'#ede9e3',marginTop:6,borderRadius:1},
  emptyComments:{paddingVertical:48,alignItems:'center',gap:8},
  emptyCommentsTxt:{fontSize:15,fontWeight:'600',color:'#bbb'},
  emptyCommentsSub:{fontSize:13,color:'#ccc'},
  commentInputArea:{borderTopWidth:1,borderTopColor:'#ede9e3',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?8:16},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:8,paddingBottom:4,backgroundColor:'#f8f7f4'},
  replyBannerTxt:{fontSize:12,color:'#888'},
  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},
  commentInput:{flex:1,backgroundColor:'#f5f3ef',borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy,maxHeight:100,borderWidth:1,borderColor:'#ede9e3'},
  sendBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  shareComposer:{flexDirection:'row',gap:12,padding:16},
  shareInput:{fontSize:16,color:COLORS.navy,minHeight:60,textAlignVertical:'top',lineHeight:24,marginBottom:12,paddingTop:4},
  quotedPost:{borderWidth:1.5,borderColor:'#ede9e3',borderRadius:14,padding:12,backgroundColor:'#f8f7f4'},
  quotedPostHdr:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  quotedPostAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1},
  quotedPostLoc:{fontSize:11,color:'#bbb'},
  quotedPostContent:{fontSize:13,color:'#555',lineHeight:19},
  shareOrDivider:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  shareOrLine:{flex:1,height:1,backgroundColor:'#ede9e3'},
  shareOrTxt:{fontSize:12,color:'#bbb'},
  externalRow:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20},
  externalBtn:{alignItems:'center',gap:8},
  externalIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalLabel:{fontSize:12,color:'#333',fontWeight:'600'},
});

const pc = StyleSheet.create({
  card:{backgroundColor:COLORS.white,marginHorizontal:12,marginBottom:10,borderRadius:20,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:10,elevation:3},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  authorRow:{flexDirection:'row',alignItems:'center',gap:10,flex:1},
  avatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:16},
  authorName:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  verifiedBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:7,paddingVertical:2},
  verifiedTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  timeTxt:{fontSize:12,color:'#bbb'},
  dot:{fontSize:12,color:'#bbb'},
  locTxt:{fontSize:11,color:'#bbb'},
  connectBtn:{borderWidth:1.5,borderColor:'#ede9e3',borderRadius:100,paddingHorizontal:14,paddingVertical:7,backgroundColor:'#f8f7f4'},
  connectTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  content:{fontSize:15,color:'#2d2d2d',lineHeight:24,marginBottom:12,letterSpacing:0.1},
  image:{width:'100%',height:220,borderRadius:16,marginBottom:12},
  eventCard:{borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:'#ede9e3',marginBottom:12},
  eventCardBanner:{height:80,padding:12,justifyContent:'flex-end'},
  eventTypePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:3},
  eventTypeTxt:{color:COLORS.white,fontSize:10,fontWeight:'700'},
  eventCardBody:{padding:12},
  eventCardTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:6,fontFamily:'PlayfairDisplay_700Bold'},
  eventCardRow:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:4},
  eventCardTxt:{fontSize:12,color:'#888',flex:1},
  eventCardFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:6,paddingTop:8,borderTopWidth:1,borderTopColor:'#ede9e3'},
  eventCardLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  eventPricePill:{backgroundColor:'#f5f3ef',borderRadius:8,paddingHorizontal:10,paddingVertical:3},
  eventPriceFree:{backgroundColor:'#e8f5e9'},
  eventPriceTxt:{fontSize:11,fontWeight:'700',color:'#555'},
  churchCard:{flexDirection:'row',gap:12,borderWidth:1.5,borderColor:'#ede9e3',borderRadius:16,padding:14,marginBottom:12,backgroundColor:'#f8f7f4'},
  churchCardIcon:{width:48,height:48,borderRadius:14,alignItems:'center',justifyContent:'center'},
  churchCardName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:3},
  churchCardAddr:{fontSize:12,color:'#888',marginBottom:4},
  churchCardLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  quotedPost:{borderWidth:1.5,borderColor:'#ede9e3',borderRadius:14,padding:12,marginBottom:12,backgroundColor:'#f8f7f4'},
  actions:{flexDirection:'row',alignItems:'center',paddingTop:12,borderTopWidth:1,borderTopColor:'#f5f3ef',marginTop:4},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:5,flex:1,justifyContent:'center',paddingVertical:4},
  actionCount:{fontSize:13,color:'#aaa',fontWeight:'600'},
  actionLabel:{fontSize:13,color:'#aaa',fontWeight:'600'},
});

const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingTop:12},
  row:{flexDirection:'row',gap:10},
  avatar:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  threadLine:{width:2,flex:1,backgroundColor:'#ede9e3',marginTop:4,borderRadius:1,minHeight:16,alignSelf:'center'},
  bubble:{backgroundColor:'#f5f3ef',borderRadius:16,borderTopLeftRadius:4,padding:12,marginBottom:4,flex:1},
  bubbleHdr:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'},
  author:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  loc:{fontSize:11,color:'#bbb'},
  time:{fontSize:11,color:'#bbb',marginLeft:'auto'},
  text:{fontSize:14,color:'#333',lineHeight:21},
  actions:{flexDirection:'row',alignItems:'center',gap:14,paddingLeft:4,marginBottom:10},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:4},
  actionTxt:{fontSize:12,color:'#aaa',fontWeight:'600'},
  replyRow:{flexDirection:'row',gap:8,paddingLeft:44,paddingBottom:4},
  replyIndent:{width:2,backgroundColor:'#ede9e3',borderRadius:1,marginRight:6},
  replyLine:{flex:1,width:2,backgroundColor:'#ede9e3'},
});
EOF
echo "ALL DONE"
