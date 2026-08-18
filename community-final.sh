#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, Alert, Share, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../src/components/Header';
import { COLORS } from '../../src/lib/constants';
import { usePosts, addPost, toggleLike, addComment } from '../../src/lib/postsStore';
import { getUser } from '../../src/lib/userStore';

const MY_ID = 'current_user';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('For You');
  const posts = usePosts();
  const user = getUser();
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<string|null>(null);
  const [commentModal, setCommentModal] = useState<string|null>(null);
  const [commentText, setCommentText] = useState('');

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Your Church')
    : `${user.firstName || 'You'} ${user.lastName || ''}`.trim();

  const initials = user.accountType === 'church'
    ? (user.churchName?.[0] || 'C').toUpperCase()
    : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`.toUpperCase();

  const forYouPosts = posts;
  const discoverPosts = posts.filter(p => p.authorType === 'church' || p.churchShareData);
  const displayPosts = activeTab === 'For You' ? forYouPosts : discoverPosts;

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  }

  function handlePost() {
    if (!postText.trim() && !postImage) { Alert.alert('Please write something or add a photo.'); return; }
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: user.accountType === 'church' ? COLORS.gold : '#667eea',
      content: postText.trim(),
      image: postImage || undefined,
      time: 'now',
    });
    setPostText('');
    setPostImage(null);
  }

  function handleComment(postId: string) {
    if (!commentText.trim()) return;
    addComment(postId, displayName, commentText.trim());
    setCommentText('');
    setCommentModal(null);
  }

  const commentPost = commentModal ? posts.find(p => p.id === commentModal) : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      {/* Tabs */}
      <View style={s.tabsRow}>
        {['For You', 'Discover'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Create Post */}
        <View style={s.createCard}>
          <View style={s.createTop}>
            <View style={[s.createAvatar, {backgroundColor: user.accountType === 'church' ? COLORS.navy : '#667eea'}]}>
              <Text style={s.createAvatarTxt}>{initials}</Text>
            </View>
            <TextInput
              style={s.createInput}
              placeholder={user.accountType === 'church' ? "Share an announcement..." : "What's on your heart?"}
              placeholderTextColor="#bbb"
              value={postText}
              onChangeText={setPostText}
              multiline
            />
          </View>
          {!!postImage && (
            <View style={s.previewWrap}>
              <Image source={{ uri: postImage }} style={s.previewImage} resizeMode="cover" />
              <TouchableOpacity style={s.removeImageBtn} onPress={() => setPostImage(null)}>
                <Ionicons name="close-circle" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}
          <View style={s.createActions}>
            <TouchableOpacity style={s.createActionBtn} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={COLORS.navy} />
              <Text style={s.createActionTxt}>Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.postBtn, (!postText.trim() && !postImage) && s.postBtnDisabled]}
              onPress={handlePost}
              disabled={!postText.trim() && !postImage}
            >
              <Text style={s.postBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty state */}
        {displayPosts.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={40} color="#ddd" />
            <Text style={s.emptyTxt}>{activeTab === 'Discover' ? 'No church posts yet' : 'Be the first to post!'}</Text>
          </View>
        )}

        {/* Posts */}
        {displayPosts.map(post => {
          const liked = post.likes.includes(MY_ID);
          return (
            <View key={post.id} style={s.postCard}>
              <View style={s.postHdr}>
                <View style={[s.postAvatar, {backgroundColor: post.authorColor}]}>
                  <Text style={s.postAvatarTxt}>{post.authorInitials}</Text>
                </View>
                <View style={s.postMeta}>
                  <Text style={s.postAuthor}>{post.authorName}</Text>
                  <View style={s.postMetaRow}>
                    {post.authorType === 'church' && (
                      <View style={s.churchBadge}>
                        <Ionicons name="home" size={10} color={COLORS.gold} />
                        <Text style={s.churchBadgeTxt}>Church</Text>
                      </View>
                    )}
                    <Text style={s.postTime}>{post.time}</Text>
                  </View>
                </View>
              </View>

              {/* Post content */}
              {!!post.content && <Text style={s.postContent}>{post.content}</Text>}

              {/* Post image */}
              {!!post.image && (
                <Image source={{ uri: post.image }} style={s.postImage} resizeMode="cover" />
              )}

              {/* Church share card */}
              {post.churchShareData && (
                <TouchableOpacity
                  style={s.churchCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({
                    pathname: '/church-detail' as any,
                    params: {
                      id: post.churchShareData?.id || '',
                      placeId: post.churchShareData?.placeId || '',
                      name: post.churchShareData?.name || '',
                      address: post.churchShareData?.address || '',
                    }
                  })}
                >
                  <View style={s.churchCardTop}>
                    <View style={s.churchCardIcon}>
                      <Ionicons name="home" size={16} color={COLORS.gold} />
                    </View>
                    <Text style={s.churchCardName} numberOfLines={1}>{post.churchShareData.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
                  </View>
                  <View style={s.churchCardLocation}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    <Text style={s.churchCardAddr} numberOfLines={1}>{post.churchShareData.address}</Text>
                  </View>
                  {!!post.churchShareData.description && (
                    <Text style={s.churchCardDesc} numberOfLines={2}>{post.churchShareData.description}</Text>
                  )}
                  <View style={s.churchCardFooter}>
                    <Text style={s.churchCardLink}>View Church Details →</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Stats */}
              {(post.likes.length > 0 || post.comments.length > 0) && (
                <View style={s.postStats}>
                  {post.likes.length > 0 && <Text style={s.statTxt}>{post.likes.length} like{post.likes.length !== 1 ? 's' : ''}</Text>}
                  {post.comments.length > 0 && <Text style={s.statTxt}>{post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}</Text>}
                </View>
              )}

              {/* Actions */}
              <View style={s.postActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id, MY_ID)}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? COLORS.red : '#888'} />
                  <Text style={[s.actionTxt, liked && {color:COLORS.red}]}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => setCommentModal(post.id)}>
                  <Ionicons name="chatbubble-outline" size={20} color="#888" />
                  <Text style={s.actionTxt}>Comment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => Share.share({ message: `${post.authorName}: ${post.content}` })}>
                  <Ionicons name="share-social-outline" size={20} color="#888" />
                  <Text style={s.actionTxt}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Comments preview */}
              {post.comments.length > 0 && (
                <View style={s.commentsWrap}>
                  {post.comments.slice(-2).map(c => (
                    <View key={c.id} style={s.commentRow}>
                      <Text style={s.commentAuthor}>{c.author}</Text>
                      <Text style={s.commentText}> {c.text}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{height:20}} />
      </ScrollView>

      {/* Comment Modal */}
      <Modal visible={!!commentModal} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCommentModal(null)} />
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={s.commentSheet}>
            <View style={s.commentSheetHdr}>
              <Text style={s.commentSheetTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentModal(null)}>
                <Ionicons name="close" size={22} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.commentList}>
              {commentPost?.comments.map(c => (
                <View key={c.id} style={s.commentItem}>
                  <View style={s.commentAvatar}><Text style={s.commentAvatarTxt}>{c.author[0]}</Text></View>
                  <View style={s.commentBubble}>
                    <Text style={s.commentBubbleAuthor}>{c.author}</Text>
                    <Text style={s.commentBubbleText}>{c.text}</Text>
                  </View>
                </View>
              ))}
              {commentPost?.comments.length === 0 && (
                <Text style={s.noComments}>No comments yet. Be the first!</Text>
              )}
            </ScrollView>
            <View style={s.commentInputRow}>
              <TextInput style={s.commentInput} placeholder="Write a comment..." placeholderTextColor="#bbb" value={commentText} onChangeText={setCommentText} />
              <TouchableOpacity style={s.commentSendBtn} onPress={() => handleComment(commentModal!)}>
                <Ionicons name="send" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  tabsRow:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:COLORS.border},
  tab:{flex:1,paddingVertical:13,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:COLORS.navy},
  tabTxt:{fontSize:14,fontWeight:'600',color:'#aaa'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1,backgroundColor:'#f8f7f4'},
  createCard:{backgroundColor:COLORS.white,margin:12,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  createTop:{flexDirection:'row',gap:10,marginBottom:12},
  createAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  createAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  createInput:{flex:1,fontSize:14,color:COLORS.navy,minHeight:60,textAlignVertical:'top'},
  previewWrap:{position:'relative',marginBottom:12},
  previewImage:{width:'100%',height:200,borderRadius:12},
  removeImageBtn:{position:'absolute',top:8,right:8},
  createActions:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:12},
  createActionBtn:{flexDirection:'row',alignItems:'center',gap:6},
  createActionTxt:{fontSize:13,color:COLORS.navy,fontWeight:'600'},
  postBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:8},
  postBtnDisabled:{opacity:0.4},
  postBtnTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  emptyState:{paddingVertical:40,alignItems:'center',gap:8},
  emptyTxt:{fontSize:15,color:'#bbb',fontWeight:'600'},
  postCard:{backgroundColor:COLORS.white,marginHorizontal:12,marginBottom:10,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  postHdr:{flexDirection:'row',gap:10,marginBottom:10},
  postAvatar:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  postAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:15},
  postMeta:{flex:1},
  postAuthor:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  postMetaRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:2},
  churchBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:6,paddingHorizontal:6,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  postTime:{fontSize:12,color:'#aaa'},
  postContent:{fontSize:14,color:'#333',lineHeight:21,marginBottom:10},
  postImage:{width:'100%',height:200,borderRadius:12,marginBottom:10},
  churchCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14,marginBottom:10,backgroundColor:COLORS.lightBg},
  churchCardTop:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  churchCardIcon:{width:28,height:28,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  churchCardName:{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy},
  churchCardLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:6},
  churchCardAddr:{fontSize:12,color:'#888',flex:1},
  churchCardDesc:{fontSize:13,color:'#555',lineHeight:18,marginBottom:8},
  churchCardFooter:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8},
  churchCardLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  postStats:{flexDirection:'row',gap:12,marginBottom:8},
  statTxt:{fontSize:12,color:'#aaa'},
  postActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  actionTxt:{fontSize:13,color:'#888',fontWeight:'600'},
  commentsWrap:{marginTop:8,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8,gap:4},
  commentRow:{flexDirection:'row',flexWrap:'wrap'},
  commentAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  commentText:{fontSize:13,color:'#555'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  commentSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:16,maxHeight:500},
  commentSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  commentSheetTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  commentList:{maxHeight:300},
  commentItem:{flexDirection:'row',gap:10,marginBottom:12},
  commentAvatar:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:COLORS.white,fontWeight:'700'},
  commentBubble:{flex:1,backgroundColor:COLORS.lightBg,borderRadius:12,padding:10},
  commentBubbleAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  commentBubbleText:{fontSize:13,color:'#555'},
  noComments:{fontSize:13,color:'#bbb',textAlign:'center',paddingVertical:20},
  commentInputRow:{flexDirection:'row',gap:10,alignItems:'center',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:12},
  commentInput:{flex:1,borderWidth:1.5,borderColor:COLORS.border,borderRadius:20,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy},
  commentSendBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
});
EOF
echo "ALL DONE"
