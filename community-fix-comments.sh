#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Share, Linking
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
  const [activePost, setActivePost] = useState<Post|null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{commentId:string;author:string}|null>(null);
  const [showComments, setShowComments] = useState(false);
  const [sharePost, setSharePost] = useState<Post|null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const displayName = user.accountType==='church'?(user.churchName||'Church'):((user.firstName||'You')+' '+(user.lastName||'')).trim();
  const userInitials = (user.accountType==='church'?(user.churchName?.[0]||'C'):((user.firstName?.[0]||'Y')+(user.lastName?.[0]||''))).toUpperCase();

  function handleCreatePost() {
    if (!newPostText.trim()) return;
    addPost({ authorName:displayName, authorInitials:userInitials, authorType:user.accountType==='church'?'church':'personal', authorColor:'#667eea', content:newPostText.trim(), time:'now', city:user.location?.split(',')[0]?.trim(), state:user.location?.split(',')[1]?.trim() });
    setNewPostText(''); setShowCreate(false);
  }

  function handleAddComment() {
    if (!commentText.trim()||!activePost) return;
    if (replyingTo) { addReply(activePost.id,replyingTo.commentId,commentText.trim(),displayName,userInitials,'#667eea'); setReplyingTo(null); }
    else { addComment(activePost.id,commentText.trim(),displayName,userInitials,'#667eea'); }
    setCommentText('');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header/>

      {/* Tabs */}
      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab=>(
            <TouchableOpacity key={tab} style={[s.tabPill,activeTab===tab&&s.tabPillActive]} onPress={()=>setActiveTab(tab)}>
              <Text style={[s.tabPillTxt,activeTab===tab&&s.tabPillTxtActive]}>{tab==='foryou'?'For You':'Discover'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.fab} onPress={()=>setShowCreate(true)}>
          <Ionicons name="create-outline" size={18} color={COLORS.white}/>
        </TouchableOpacity>
      </View>

      {activeTab==='discover'&&(
        <View style={s.discoverBanner}>
          <Ionicons name="globe" size={13} color={COLORS.gold}/>
          <Text style={s.discoverTxt}>Christians from all 50 states</Text>
        </View>
      )}

      <ScrollView style={s.feed} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingVertical:8}}>
        {posts.map(post=>(
          <PostCard key={post.id} post={post} showLocation={activeTab==='discover'}
            onLike={()=>toggleLike(post.id)}
            onComment={()=>{setActivePost(post);setShowComments(true);setReplyingTo(null);setCommentText('');}}
            onShare={()=>{setSharePost(post);setShareMessage('');}}
          />
        ))}
        <View style={{height:20}}/>
      </ScrollView>

      {/* Create Post */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{setShowCreate(false);setNewPostText('');}}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={[s.postBtn,!newPostText.trim()&&{opacity:0.4}]} onPress={handleCreatePost} disabled={!newPostText.trim()}>
              <Text style={s.postBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <View style={{flexDirection:'row',gap:12,padding:16}}>
              <View style={[s.avatarMd,{backgroundColor:'#667eea'}]}><Text style={s.avatarMdTxt}>{userInitials}</Text></View>
              <View style={{flex:1}}>
                <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:8}}>{displayName}</Text>
                <TextInput style={{fontSize:16,color:'#111',minHeight:100,lineHeight:24}} placeholder="Share what's on your heart..." placeholderTextColor="#bbb" value={newPostText} onChangeText={setNewPostText} multiline autoFocus/>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Comments */}
      <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <View style={{width:50}}/>
            <Text style={s.modalTitle}>Comments</Text>
            <TouchableOpacity onPress={()=>{setShowComments(false);setReplyingTo(null);setCommentText('');}}>
              <Text style={s.cancelTxt}>Done</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8,flexGrow:1}}>
              {(!activePost?.comments||activePost.comments.length===0)&&(
                <View style={{paddingVertical:48,alignItems:'center',gap:10}}>
                  <View style={{width:60,height:60,borderRadius:30,backgroundColor:'#f5f3ef',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-ellipses-outline" size={28} color={COLORS.gold}/>
                  </View>
                  <Text style={{fontSize:15,fontWeight:'600',color:'#bbb'}}>No comments yet</Text>
                  <Text style={{fontSize:13,color:'#ccc'}}>Be the first to share your thoughts</Text>
                </View>
              )}
              {activePost?.comments.map(c=>(
                <CommentThread key={c.id} comment={c} postId={activePost.id}
                  onReply={()=>setReplyingTo({commentId:c.id,author:c.author})}
                  onLike={()=>toggleCommentLike(activePost.id,c.id)}
                  onReplyLike={rid=>toggleReplyLike(activePost.id,c.id,rid)}
                />
              ))}
              <View style={{height:16}}/>
            </ScrollView>
            <View style={s.inputArea}>
              {replyingTo&&(
                <View style={s.replyBanner}>
                  <Text style={s.replyBannerTxt}>↩ Replying to <Text style={{fontWeight:'700',color:COLORS.navy}}>{replyingTo.author}</Text></Text>
                  <TouchableOpacity onPress={()=>setReplyingTo(null)}><Ionicons name="close-circle" size={17} color="#bbb"/></TouchableOpacity>
                </View>
              )}
              <View style={s.inputRow}>
                <View style={[s.avatarSm,{backgroundColor:'#667eea'}]}><Text style={s.avatarSmTxt}>{userInitials}</Text></View>
                <TextInput style={s.textInput} placeholder={replyingTo?`Reply to ${replyingTo.author}...`:'Add a comment...'} placeholderTextColor="#bbb" value={commentText} onChangeText={setCommentText} multiline/>
                <TouchableOpacity style={[s.sendBtn,!commentText.trim()&&{backgroundColor:'#ddd'}]} onPress={handleAddComment} disabled={!commentText.trim()}>
                  <Ionicons name="arrow-up" size={16} color="#fff"/>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Share */}
      <Modal visible={!!sharePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={()=>{setSharePost(null);setShareMessage('');}}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={s.postBtn} onPress={()=>{
              if (!sharePost) return;
              addPost({authorName:displayName,authorInitials:userInitials,authorType:user.accountType==='church'?'church':'personal',authorColor:'#667eea',content:shareMessage.trim(),time:'now'});
              setSharePost(null); setShareMessage('');
            }}>
              <Text style={s.postBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled">
              <View style={{flexDirection:'row',gap:12,padding:16}}>
                <View style={{alignItems:'center'}}>
                  <View style={[s.avatarMd,{backgroundColor:'#667eea'}]}><Text style={s.avatarMdTxt}>{userInitials}</Text></View>
                  <View style={{width:2,height:30,backgroundColor:'#f0ede8',marginTop:6,borderRadius:1}}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:8}}>{displayName}</Text>
                  <TextInput style={{fontSize:16,color:'#111',minHeight:50,lineHeight:24,marginBottom:12}} placeholder="Add your thoughts... (optional)" placeholderTextColor="#bbb" value={shareMessage} onChangeText={setShareMessage} multiline autoFocus/>
                  {sharePost&&(
                    <View style={{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:14,padding:12,backgroundColor:'#f8f7f4'}}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                        <View style={[s.avatarXs,{backgroundColor:sharePost.authorColor}]}><Text style={s.avatarXsTxt}>{sharePost.authorInitials}</Text></View>
                        <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{sharePost.authorName}</Text>
                      </View>
                      <Text style={{fontSize:13,color:'#555',lineHeight:19}} numberOfLines={3}>{sharePost.content}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/><Text style={{fontSize:12,color:'#bbb'}}>or share outside FaithFinder</Text><View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20}}>
                {[{icon:'chatbubble-outline',label:'Messages',color:'#2ecc71',bg:'#e8f8f0',act:'sms'},{icon:'mail-outline',label:'Email',color:'#3498db',bg:'#eaf4fb',act:'email'},{icon:'share-social-outline',label:'More',color:'#9b59b6',bg:'#f5eefb',act:'more'}].map(o=>(
                  <TouchableOpacity key={o.label} style={{alignItems:'center',gap:8}} onPress={()=>{
                    const msg=sharePost?.content||'';
                    if(o.act==='sms') Linking.openURL('sms:&body='+encodeURIComponent(msg)).catch(()=>{});
                    else if(o.act==='email') Linking.openURL('mailto:?subject=Check this out&body='+encodeURIComponent(msg)).catch(()=>{});
                    else{const p=sharePost;setSharePost(null);setTimeout(()=>Share.share({message:p?.content||''}).catch(()=>{}),500);}
                  }}>
                    <View style={{width:54,height:54,borderRadius:16,backgroundColor:o.bg,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name={o.icon as any} size={22} color={o.color}/>
                    </View>
                    <Text style={{fontSize:12,color:'#333',fontWeight:'600'}}>{o.label}</Text>
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

function PostCard({post,onLike,onComment,onShare,showLocation}:{post:Post;onLike:()=>void;onComment:()=>void;onShare:()=>void;showLocation:boolean}) {
  return (
    <View style={pc.card}>
      <View style={pc.hdr}>
        <TouchableOpacity style={pc.authorRow} activeOpacity={0.8}>
          <View style={[pc.avatar,{backgroundColor:post.authorColor}]}><Text style={pc.avatarTxt}>{post.authorInitials}</Text></View>
          <View style={{flex:1}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <Text style={pc.name}>{post.authorName}</Text>
              {post.authorType==='church'&&<View style={pc.badge}><Ionicons name="checkmark-circle" size={12} color={COLORS.gold}/><Text style={pc.badgeTxt}>Church</Text></View>}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
              <Text style={pc.meta}>{post.time}</Text>
              {showLocation&&post.city&&post.state&&<><Text style={pc.meta}>·</Text><Text style={pc.meta}>{post.city}, {post.state}</Text></>}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={pc.connectBtn}><Text style={pc.connectTxt}>+ Connect</Text></TouchableOpacity>
      </View>
      {!!post.content&&<Text style={pc.content}>{post.content}</Text>}
      {post.eventShareData&&(
        <TouchableOpacity style={pc.eventCard} activeOpacity={0.88} onPress={()=>router.push({pathname:'/event-detail' as any,params:{id:post.eventShareData!.id,title:post.eventShareData!.title,date:post.eventShareData!.date,location:post.eventShareData!.location,type:post.eventShareData!.type,price:post.eventShareData!.price,description:''}})}>
          <LinearGradient colors={['#1a1a2e','#2d2240']} style={pc.eventBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={pc.typePill}><Text style={pc.typePillTxt}>{post.eventShareData.type}</Text></View>
          </LinearGradient>
          <View style={{padding:12}}>
            <Text style={pc.eventTitle} numberOfLines={1}>{post.eventShareData.title}</Text>
            <Text style={pc.eventMeta}>{post.eventShareData.date} · {post.eventShareData.location}</Text>
            <Text style={pc.eventLink}>View Event →</Text>
          </View>
        </TouchableOpacity>
      )}
      {post.churchShareData&&(
        <View style={pc.churchCard}>
          <View style={[pc.churchIcon,{backgroundColor:COLORS.navy}]}><Ionicons name="business" size={18} color={COLORS.gold}/></View>
          <View style={{flex:1}}>
            <Text style={pc.churchName} numberOfLines={1}>{post.churchShareData.name}</Text>
            <Text style={pc.churchAddr} numberOfLines={1}>{post.churchShareData.address}</Text>
            <Text style={pc.eventLink}>View Church →</Text>
          </View>
        </View>
      )}
      <View style={pc.actions}>
        <TouchableOpacity style={pc.actionBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={22} color={post.liked?'#e74c6f':'#bbb'}/>
          {post.likes>0&&<Text style={[pc.actionTxt,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={pc.actionBtn} onPress={onComment} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color="#bbb"/>
          {post.comments.length>0&&<Text style={pc.actionTxt}>{post.comments.length}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={pc.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="arrow-redo-outline" size={20} color="#bbb"/>
          <Text style={pc.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CommentThread({comment,postId,onReply,onLike,onReplyLike}:{comment:Comment;postId:string;onReply:()=>void;onLike:()=>void;onReplyLike:(id:string)=>void}) {
  const [collapsed,setCollapsed]=useState(false);
  return (
    <View style={ct.wrap}>
      <View style={ct.row}>
        <View style={[ct.avatar,{backgroundColor:comment.color}]}><Text style={ct.avatarTxt}>{comment.initials}</Text></View>
        <View style={{flex:1}}>
          <Text style={ct.text}><Text style={ct.name}>{comment.author} </Text>{comment.text}</Text>
          <View style={ct.meta}>
            <Text style={ct.metaTxt}>{comment.time}</Text>
            {comment.city&&comment.state&&<Text style={ct.metaTxt}>{comment.city}, {comment.state}</Text>}
            {comment.likes>0&&<Text style={ct.metaTxt}>{comment.likes} like{comment.likes>1?'s':''}</Text>}
            <TouchableOpacity onPress={onReply} activeOpacity={0.6}><Text style={ct.metaAction}>Reply</Text></TouchableOpacity>
          </View>
          {comment.replies.length>0&&(
            <TouchableOpacity style={ct.viewReplies} onPress={()=>setCollapsed(!collapsed)} activeOpacity={0.6}>
              <View style={ct.viewRepliesLine}/>
              <Text style={ct.viewRepliesTxt}>{collapsed?`View ${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`:'Hide replies'}</Text>
            </TouchableOpacity>
          )}
          {!collapsed&&comment.replies.map(r=>(
            <View key={r.id} style={ct.replyRow}>
              <View style={[ct.replyAvatar,{backgroundColor:r.color}]}><Text style={ct.replyAvatarTxt}>{r.initials}</Text></View>
              <View style={{flex:1}}>
                <Text style={ct.text}><Text style={ct.name}>{r.author} </Text>{r.text}</Text>
                <View style={ct.meta}>
                  <Text style={ct.metaTxt}>{r.time}</Text>
                  {r.city&&r.state&&<Text style={ct.metaTxt}>{r.city}, {r.state}</Text>}
                  {r.likes>0&&<Text style={ct.metaTxt}>{r.likes} like{r.likes>1?'s':''}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={()=>onReplyLike(r.id)} activeOpacity={0.6} style={{paddingLeft:8,paddingTop:2}}>
                <Ionicons name={r.liked?'heart':'heart-outline'} size={12} color={r.liked?'#e74c6f':'#ccc'}/>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={onLike} activeOpacity={0.6} style={{paddingLeft:8,paddingTop:2}}>
          <Ionicons name={comment.liked?'heart':'heart-outline'} size={13} color={comment.liked?'#e74c6f':'#ccc'}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f5f3ef'},
  tabBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:'#ede9e3',gap:10},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#ede9e3',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:'#fff',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#aaa'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  fab:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  discoverBanner:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)'},
  discoverTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  feed:{flex:1},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  cancelTxt:{fontSize:15,color:'#888',fontWeight:'500'},
  modalTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  postBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  postBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  avatarMd:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  avatarMdTxt:{color:'#fff',fontWeight:'700',fontSize:15},
  avatarSm:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  avatarSmTxt:{color:'#fff',fontWeight:'700',fontSize:12},
  avatarXs:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},
  avatarXsTxt:{color:'#fff',fontWeight:'700',fontSize:9},
  inputArea:{borderTopWidth:1,borderTopColor:'#f0f0f0',backgroundColor:'#fff',paddingBottom:Platform.OS==='ios'?20:16},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:10,paddingBottom:4,backgroundColor:'#faf9f6'},
  replyBannerTxt:{fontSize:12,color:'#888'},
  inputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},
  textInput:{flex:1,backgroundColor:'#f2f2f2',borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#111',maxHeight:80},
  sendBtn:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
});

const pc = StyleSheet.create({
  card:{backgroundColor:'#fff',marginHorizontal:12,marginBottom:10,borderRadius:20,padding:16,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:10},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  authorRow:{flexDirection:'row',alignItems:'center',gap:10,flex:1},
  avatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:'#fff',fontWeight:'700',fontSize:15},
  name:{fontSize:15,fontWeight:'700',color:'#1a1a2e'},
  badge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:7,paddingVertical:2},
  badgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  meta:{fontSize:12,color:'#bbb'},
  connectBtn:{borderWidth:1.5,borderColor:'#ede9e3',borderRadius:100,paddingHorizontal:14,paddingVertical:7,backgroundColor:'#f8f7f4'},
  connectTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  content:{fontSize:15,color:'#2d2d2d',lineHeight:24,marginBottom:12},
  eventCard:{borderRadius:14,overflow:'hidden',borderWidth:1,borderColor:'#ede9e3',marginBottom:12},
  eventBanner:{height:70,padding:12,justifyContent:'flex-end'},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:3},
  typePillTxt:{color:'#fff',fontSize:10,fontWeight:'700'},
  eventTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  eventMeta:{fontSize:12,color:'#888',marginBottom:6},
  eventLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  churchCard:{flexDirection:'row',gap:12,borderWidth:1.5,borderColor:'#ede9e3',borderRadius:14,padding:12,marginBottom:12,backgroundColor:'#f8f7f4'},
  churchIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  churchName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  churchAddr:{fontSize:12,color:'#888',marginBottom:4},
  actions:{flexDirection:'row',alignItems:'center',paddingTop:12,borderTopWidth:1,borderTopColor:'#f5f3ef',marginTop:4},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:5,flex:1,justifyContent:'center',paddingVertical:4},
  actionTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
});

const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#f8f7f4'},
  row:{flexDirection:'row',gap:10,alignItems:'flex-start'},
  avatar:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:'#fff',fontWeight:'700',fontSize:12},
  text:{fontSize:14,color:'#111',lineHeight:21,marginBottom:5,flex:1},
  name:{fontWeight:'700',color:'#111'},
  meta:{flexDirection:'row',alignItems:'center',gap:12},
  metaTxt:{fontSize:12,color:'#999'},
  metaAction:{fontSize:12,color:'#999',fontWeight:'700'},
  viewReplies:{flexDirection:'row',alignItems:'center',gap:8,marginTop:6,marginBottom:2},
  viewRepliesLine:{width:20,height:1,backgroundColor:'#ddd'},
  viewRepliesTxt:{fontSize:12,color:'#999',fontWeight:'600'},
  replyRow:{flexDirection:'row',gap:8,alignItems:'flex-start',marginTop:10},
  replyAvatar:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},
  replyAvatarTxt:{color:'#fff',fontWeight:'700',fontSize:9},
});
EOF
echo "ALL DONE"
