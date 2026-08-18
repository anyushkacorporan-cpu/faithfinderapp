#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── 1. UPDATE postsStore with replies, comment likes, locations ──
cat > src/lib/postsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Reply = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
  city?: string;
  state?: string;
};

export type Comment = {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
  city?: string;
  state?: string;
  replies: Reply[];
};

export type EventShareData = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  price: string;
};

export type ChurchShareData = {
  id: string;
  name: string;
  address: string;
  type: string;
  rating?: number;
};

export type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorType: 'church' | 'personal';
  authorColor: string;
  city?: string;
  state?: string;
  content: string;
  image?: string;
  time: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  eventShareData?: EventShareData;
  churchShareData?: ChurchShareData;
  feed: 'foryou' | 'discover' | 'both';
};

const COLORS_LIST = ['#e74c6f','#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#c9a96e','#f5576c'];

const INITIAL_POSTS: Post[] = [
  {
    id:'1', authorName:'Grace Community Church', authorInitials:'GC', authorType:'church',
    authorColor:'#e74c6f', city:'Glen Cove', state:'NY',
    content:'What an incredible Sunday! Over 50 people came forward during altar call. God is moving! Join us next week, all are welcome.',
    time:'2h', likes:12, liked:false, feed:'both',
    comments:[
      { id:'c1', author:'Maria Santos', initials:'MS', color:'#667eea', text:'This is amazing! God is so good!', time:'1h', likes:3, liked:false, city:'Bronx', state:'NY', replies:[
        { id:'r1', author:'James Wilson', initials:'JW', color:'#43e97b', text:'Amen! Praying for continued revival!', time:'45m', likes:1, liked:false, city:'Brooklyn', state:'NY' }
      ]},
      { id:'c2', author:'David Kim', initials:'DK', color:'#f093fb', text:'Wish I could have been there!', time:'30m', likes:1, liked:false, city:'Queens', state:'NY', replies:[] }
    ]
  },
  {
    id:'2', authorName:'Pastor Michael Johnson', authorInitials:'MJ', authorType:'personal',
    authorColor:'#667eea', city:'Dallas', state:'TX',
    content:'"For I know the plans I have for you," declares the Lord. Trust His timing. Your breakthrough is coming. Keep faith!',
    time:'4h', likes:34, liked:false, feed:'discover',
    comments:[
      { id:'c3', author:'Sarah Thompson', initials:'ST', color:'#fa709a', text:'I needed this word today. Thank you Pastor!', time:'3h', likes:5, liked:false, city:'Houston', state:'TX', replies:[
        { id:'r2', author:'Pastor Michael Johnson', initials:'MJ', color:'#667eea', text:'Blessings to you Sarah! Stay encouraged!', time:'2h', likes:2, liked:false, city:'Dallas', state:'TX' }
      ]}
    ]
  },
  {
    id:'3', authorName:'Faith Tabernacle NYC', authorInitials:'FT', authorType:'church',
    authorColor:'#43e97b', city:'Harlem', state:'NY',
    content:'Youth night this Friday 7PM! Food, worship, and the Word. Bring a friend!',
    time:'6h', likes:28, liked:false, feed:'discover',
    comments:[]
  },
  {
    id:'4', authorName:'Blessing Okafor', authorInitials:'BO', authorType:'personal',
    authorColor:'#f093fb', city:'Atlanta', state:'GA',
    content:'Just finished reading Psalms 23 for the 100th time and it hits different every single time. "Yea, though I walk through the valley..." His presence is everything.',
    time:'8h', likes:67, liked:false, feed:'discover',
    comments:[
      { id:'c4', author:'Priya Nair', initials:'PN', color:'#4facfe', text:'One of my favorite passages too!', time:'7h', likes:4, liked:false, city:'Miami', state:'FL', replies:[] }
    ]
  },
  {
    id:'5', authorName:'Brooklyn Gospel Choir', authorInitials:'BG', authorType:'church',
    authorColor:'#fa709a', city:'Brooklyn', state:'NY',
    content:'New worship album dropping next month! 12 original songs written by our choir members. God has been so faithful through this process.',
    time:'10h', likes:89, liked:false, feed:'discover',
    comments:[]
  },
  {
    id:'6', authorName:'Carlos Rivera', authorInitials:'CR', authorType:'personal',
    authorColor:'#c9a96e', city:'Miami', state:'FL',
    content:'Sunday sermon hit home today. "God doesn\'t call the qualified, He qualifies the called." Stop disqualifying yourself from your destiny.',
    time:'12h', likes:112, liked:false, feed:'discover',
    comments:[
      { id:'c5', author:'Angela Moore', initials:'AM', color:'#e74c6f', text:'Preach! Someone needed to hear this.', time:'11h', likes:8, liked:false, city:'Orlando', state:'FL', replies:[
        { id:'r3', author:'Carlos Rivera', initials:'CR', color:'#c9a96e', text:'God placed it on my heart to share. Blessings!', time:'10h', likes:3, liked:false, city:'Miami', state:'FL' }
      ]}
    ]
  },
];

let posts: Post[] = INITIAL_POSTS;
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getPosts() { return [...posts]; }
export function getForYouPosts() { return posts.filter(p => p.feed === 'foryou' || p.feed === 'both'); }
export function getDiscoverPosts() { return posts.filter(p => p.feed === 'discover' || p.feed === 'both'); }

export function addPost(post: {
  authorName: string; authorInitials: string; authorType: 'church'|'personal';
  authorColor: string; content: string; time: string;
  city?: string; state?: string;
  image?: string; eventShareData?: EventShareData; churchShareData?: ChurchShareData;
}) {
  const newPost: Post = {
    ...post,
    id: Date.now().toString(),
    likes: 0, liked: false, comments: [], feed: 'both',
  };
  posts = [newPost, ...posts];
  notify();
}

export function toggleLike(postId: string) {
  posts = posts.map(p => p.id === postId
    ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
    : p
  );
  notify();
}

export function addComment(postId: string, text: string, author: string, initials: string, color: string, city?: string, state?: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: [...p.comments, {
      id: Date.now().toString(), author, initials, color, text,
      time: 'now', likes: 0, liked: false, city, state, replies: []
    }]
  } : p);
  notify();
}

export function addReply(postId: string, commentId: string, text: string, author: string, initials: string, color: string, city?: string, state?: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId ? {
      ...c,
      replies: [...c.replies, {
        id: Date.now().toString(), author, initials, color, text,
        time: 'now', likes: 0, liked: false, city, state
      }]
    } : c)
  } : p);
  notify();
}

export function toggleCommentLike(postId: string, commentId: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId
      ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 }
      : c)
  } : p);
  notify();
}

export function toggleReplyLike(postId: string, commentId: string, replyId: string) {
  posts = posts.map(p => p.id === postId ? {
    ...p,
    comments: p.comments.map(c => c.id === commentId ? {
      ...c,
      replies: c.replies.map(r => r.id === replyId
        ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 }
        : r)
    } : c)
  } : p);
  notify();
}

export function usePosts(feed?: 'foryou' | 'discover') {
  const [state, setState] = useState(feed === 'foryou' ? getForYouPosts() : feed === 'discover' ? getDiscoverPosts() : getPosts());
  useEffect(() => {
    const fn = () => setState(feed === 'foryou' ? getForYouPosts() : feed === 'discover' ? getDiscoverPosts() : getPosts());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, [feed]);
  return state;
}
EOF
echo "postsStore done"

# ── 2. FULL COMMUNITY TAB ────────────────────────────────
cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert, Image
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

  // Create post
  const [showCreate, setShowCreate] = useState(false);
  const [newPostText, setNewPostText] = useState('');

  // Comments modal
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{commentId: string; author: string} | null>(null);
  const [showComments, setShowComments] = useState(false);

  // Share composer
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const [shareMessage, setShareMessage] = useState('');

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const initials = (user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : ((user.firstName?.[0] || 'Y') + (user.lastName?.[0] || ''))).toUpperCase();

  function handleCreatePost() {
    if (!newPostText.trim()) return;
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea',
      content: newPostText.trim(),
      time: 'now',
      city: user.location?.split(',')[0]?.trim(),
      state: user.location?.split(',')[1]?.trim(),
    });
    setNewPostText('');
    setShowCreate(false);
  }

  function handleAddComment() {
    if (!commentText.trim() || !activePost) return;
    if (replyingTo) {
      addReply(activePost.id, replyingTo.commentId, commentText.trim(), displayName, initials, '#667eea');
      setReplyingTo(null);
    } else {
      addComment(activePost.id, commentText.trim(), displayName, initials, '#667eea');
    }
    setCommentText('');
  }

  function handleSharePost(post: Post) {
    setSharePost(post);
    setShareMessage('');
  }

  function handlePostShare() {
    if (!sharePost) return;
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea',
      content: shareMessage.trim(),
      time: 'now',
    });
    setSharePost(null);
    setShareMessage('');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <View style={s.tabsToggle}>
          <TouchableOpacity style={[s.tabBtn, activeTab==='foryou'&&s.tabBtnActive]} onPress={() => setActiveTab('foryou')}>
            <Text style={[s.tabTxt, activeTab==='foryou'&&s.tabTxtActive]}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, activeTab==='discover'&&s.tabBtnActive]} onPress={() => setActiveTab('discover')}>
            <Text style={[s.tabTxt, activeTab==='discover'&&s.tabTxtActive]}>Discover</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.createPostBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {activeTab === 'discover' && (
          <View style={s.discoverBanner}>
            <Ionicons name="globe-outline" size={16} color={COLORS.gold} />
            <Text style={s.discoverTxt}>Discover Christians from all 50 states</Text>
          </View>
        )}

        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => toggleLike(post.id)}
            onComment={() => { setActivePost(post); setShowComments(true); setReplyingTo(null); setCommentText(''); }}
            onShare={() => handleSharePost(post)}
            showLocation={activeTab === 'discover'}
          />
        ))}
        <View style={{height:20}} />
      </ScrollView>

      {/* Create Post Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewPostText(''); }}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={s.modalPostBtn} onPress={handleCreatePost}>
              <Text style={s.modalPostBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <View style={{flexDirection:'row',padding:16,gap:12}}>
              <View style={[s.authorAvatar,{backgroundColor:'#667eea'}]}>
                <Text style={s.authorInitials}>{initials}</Text>
              </View>
              <TextInput
                style={{flex:1,fontSize:16,color:COLORS.navy,minHeight:120,textAlignVertical:'top',lineHeight:24}}
                placeholder="Share what's on your heart..."
                placeholderTextColor="#bbb"
                value={newPostText}
                onChangeText={setNewPostText}
                multiline
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={showComments} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowComments(false); setReplyingTo(null); setCommentText(''); }}>
              <Text style={s.modalCancel}>Done</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Comments</Text>
            <View style={{width:50}} />
          </View>

          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled">
              {activePost?.comments.length === 0 && (
                <View style={{paddingVertical:40,alignItems:'center',gap:8}}>
                  <Ionicons name="chatbubble-outline" size={36} color="#ddd" />
                  <Text style={{fontSize:14,color:'#bbb'}}>No comments yet. Be first!</Text>
                </View>
              )}
              {activePost?.comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={activePost.id}
                  onReply={() => setReplyingTo({commentId: comment.id, author: comment.author})}
                  onLike={() => toggleCommentLike(activePost.id, comment.id)}
                  onReplyLike={(replyId) => toggleReplyLike(activePost.id, comment.id, replyId)}
                />
              ))}
              <View style={{height:20}} />
            </ScrollView>

            {/* Comment input */}
            <View style={s.commentInputWrap}>
              {replyingTo && (
                <View style={s.replyingToBar}>
                  <Text style={s.replyingToTxt}>Replying to <Text style={{fontWeight:'700'}}>{replyingTo.author}</Text></Text>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <Ionicons name="close" size={16} color="#888" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.commentInputRow}>
                <View style={[s.authorAvatar,{width:34,height:34,borderRadius:17,backgroundColor:'#667eea'}]}>
                  <Text style={[s.authorInitials,{fontSize:12}]}>{initials}</Text>
                </View>
                <TextInput
                  style={s.commentInput}
                  placeholder={replyingTo ? `Reply to ${replyingTo.author}...` : 'Add a comment...'}
                  placeholderTextColor="#bbb"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={[s.commentSendBtn, !commentText.trim()&&{opacity:0.4}]}
                  onPress={handleAddComment}
                  disabled={!commentText.trim()}
                >
                  <Ionicons name="arrow-up" size={18} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Share Composer Modal */}
      <Modal visible={!!sharePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setSharePost(null); setShareMessage(''); }}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity style={s.modalPostBtn} onPress={handlePostShare}>
              <Text style={s.modalPostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled">
              <View style={{flexDirection:'row',padding:16,gap:12}}>
                <View style={{alignItems:'center',gap:0}}>
                  <View style={[s.authorAvatar,{backgroundColor:'#667eea'}]}>
                    <Text style={s.authorInitials}>{initials}</Text>
                  </View>
                  <View style={{width:2,height:40,backgroundColor:'#f0ede8',marginTop:6,borderRadius:1}} />
                </View>
                <View style={{flex:1}}>
                  <TextInput
                    style={{fontSize:16,color:COLORS.navy,minHeight:60,textAlignVertical:'top',lineHeight:24,paddingTop:4,marginBottom:12}}
                    placeholder="Add your thoughts... (optional)"
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  {sharePost && (
                    <View style={s.quotedPostCard}>
                      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                        <View style={[s.authorAvatar,{width:28,height:28,borderRadius:14,backgroundColor:sharePost.authorColor}]}>
                          <Text style={[s.authorInitials,{fontSize:10}]}>{sharePost.authorInitials}</Text>
                        </View>
                        <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{sharePost.authorName}</Text>
                      </View>
                      <Text style={{fontSize:13,color:'#555',lineHeight:19}} numberOfLines={3}>{sharePost.content}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Divider + external */}
              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}} />
                <Text style={{fontSize:12,color:'#bbb'}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}} />
              </View>
              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = sharePost?.content || '';
                  require('react-native').Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71" />
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = sharePost?.content || '';
                  require('react-native').Linking.openURL('mailto:?subject=Check this out&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db" />
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const p = sharePost;
                  setSharePost(null);
                  setTimeout(() => {
                    Share.share({ message: p?.content || '' }).catch(() => {});
                  }, 500);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6" />
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>More Options</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PostCard({ post, onLike, onComment, onShare, showLocation }: {
  post: Post; onLike: () => void; onComment: () => void; onShare: () => void; showLocation: boolean;
}) {
  return (
    <View style={s.postCard}>
      <View style={s.postHdr}>
        <TouchableOpacity style={s.postAuthorRow} onPress={() => {
          if (post.authorType === 'church') {
            Alert.alert(post.authorName, 'Church profile coming soon!');
          } else {
            Alert.alert(post.authorName, 'User profile coming soon!');
          }
        }}>
          <View style={[s.authorAvatar, {backgroundColor: post.authorColor}]}>
            <Text style={s.authorInitials}>{post.authorInitials}</Text>
          </View>
          <View>
            <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
              <Text style={s.authorName}>{post.authorName}</Text>
              {post.authorType === 'church' && (
                <View style={s.churchBadge}><Text style={s.churchBadgeTxt}>Church</Text></View>
              )}
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
              <Text style={s.postTime}>{post.time}</Text>
              {showLocation && post.city && post.state && (
                <>
                  <Text style={s.postTimeDot}>·</Text>
                  <Ionicons name="location-outline" size={11} color="#aaa" />
                  <Text style={s.postLocation}>{post.city}, {post.state}</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.connectBtn} onPress={() => Alert.alert('Connect', 'Connected with ' + post.authorName + '!')}>
          <Text style={s.connectBtnTxt}>Connect</Text>
        </TouchableOpacity>
      </View>

      {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
      {!!post.image && <Image source={{uri: post.image}} style={s.postImage} resizeMode="cover" />}

      {post.eventShareData && (
        <TouchableOpacity style={s.quotedCard} onPress={() => router.push({
          pathname: '/event-detail' as any,
          params: { id: post.eventShareData!.id, title: post.eventShareData!.title, date: post.eventShareData!.date, location: post.eventShareData!.location, type: post.eventShareData!.type, price: post.eventShareData!.price, description: '' }
        })}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
            <View style={{width:24,height:24,borderRadius:6,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="calendar" size={13} color={COLORS.gold} />
            </View>
            <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1}} numberOfLines={1}>{post.eventShareData.title}</Text>
          </View>
          <Text style={{fontSize:11,color:'#888',marginBottom:2}}>{post.eventShareData.date}</Text>
          <Text style={{fontSize:11,color:'#888',marginBottom:6}} numberOfLines={1}>{post.eventShareData.location}</Text>
          <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700'}}>View Event →</Text>
        </TouchableOpacity>
      )}

      {post.churchShareData && (
        <View style={s.quotedCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
            <View style={{width:24,height:24,borderRadius:6,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="business" size={13} color={COLORS.gold} />
            </View>
            <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1}} numberOfLines={1}>{post.churchShareData.name}</Text>
          </View>
          <Text style={{fontSize:11,color:'#888',marginBottom:6}} numberOfLines={1}>{post.churchShareData.address}</Text>
          <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700'}}>View Church →</Text>
        </View>
      )}

      <View style={s.postActions}>
        <TouchableOpacity style={s.actionBtn} onPress={onLike}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?COLORS.red:'#888'} />
          <Text style={[s.actionTxt, post.liked&&{color:COLORS.red}]}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={19} color="#888" />
          <Text style={s.actionTxt}>{post.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={19} color="#888" />
          <Text style={s.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CommentItem({ comment, postId, onReply, onLike, onReplyLike }: {
  comment: Comment; postId: string; onReply: () => void; onLike: () => void; onReplyLike: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  return (
    <View style={s.commentItem}>
      <View style={{flexDirection:'row',gap:10}}>
        <View style={{alignItems:'center'}}>
          <View style={[s.commentAvatar, {backgroundColor: comment.color}]}>
            <Text style={s.commentAvatarTxt}>{comment.initials}</Text>
          </View>
          {comment.replies.length > 0 && showReplies && (
            <View style={{width:2,flex:1,backgroundColor:'#f0ede8',marginTop:4,borderRadius:1,minHeight:20}} />
          )}
        </View>
        <View style={{flex:1}}>
          <View style={s.commentBubble}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
              <Text style={s.commentAuthor}>{comment.author}</Text>
              {comment.city && comment.state && (
                <Text style={s.commentLocation}>{comment.city}, {comment.state}</Text>
              )}
            </View>
            <Text style={s.commentText}>{comment.text}</Text>
          </View>
          <View style={s.commentActions}>
            <Text style={s.commentTime}>{comment.time}</Text>
            <TouchableOpacity onPress={onLike}>
              <Text style={[s.commentActionTxt, comment.liked&&{color:COLORS.red}]}>
                {comment.liked?'♥':'♡'} {comment.likes > 0 ? comment.likes : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onReply}>
              <Text style={s.commentActionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length > 0 && (
              <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
                <Text style={s.commentActionTxt}>{showReplies ? 'Hide' : `${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Replies */}
          {showReplies && comment.replies.map(reply => (
            <View key={reply.id} style={s.replyItem}>
              <View style={[s.commentAvatar, {width:28,height:28,borderRadius:14,backgroundColor:reply.color}]}>
                <Text style={[s.commentAvatarTxt,{fontSize:10}]}>{reply.initials}</Text>
              </View>
              <View style={{flex:1}}>
                <View style={s.commentBubble}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
                    <Text style={s.commentAuthor}>{reply.author}</Text>
                    {reply.city && reply.state && (
                      <Text style={s.commentLocation}>{reply.city}, {reply.state}</Text>
                    )}
                  </View>
                  <Text style={s.commentText}>{reply.text}</Text>
                </View>
                <View style={s.commentActions}>
                  <Text style={s.commentTime}>{reply.time}</Text>
                  <TouchableOpacity onPress={() => onReplyLike(reply.id)}>
                    <Text style={[s.commentActionTxt, reply.liked&&{color:COLORS.red}]}>
                      {reply.liked?'♥':'♡'} {reply.likes > 0 ? reply.likes : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  tabsWrap:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border,gap:10},
  tabsToggle:{flex:1,flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  tabBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:3},
  tabTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  createPostBtn:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  discoverBanner:{flexDirection:'row',alignItems:'center',gap:8,padding:12,backgroundColor:'rgba(201,169,110,0.08)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.15)'},
  discoverTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  scroll:{flex:1},
  postCard:{backgroundColor:COLORS.white,marginBottom:8,padding:16,borderBottomWidth:1,borderTopWidth:1,borderColor:COLORS.border},
  postHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10},
  postAuthorRow:{flexDirection:'row',alignItems:'center',gap:10,flex:1},
  authorAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  authorInitials:{color:COLORS.white,fontWeight:'700',fontSize:14},
  authorName:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  churchBadge:{backgroundColor:'rgba(201,169,110,0.15)',borderRadius:100,paddingHorizontal:8,paddingVertical:2},
  churchBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  postTime:{fontSize:12,color:'#aaa'},
  postTimeDot:{fontSize:12,color:'#aaa'},
  postLocation:{fontSize:11,color:'#aaa'},
  connectBtn:{borderWidth:1.5,borderColor:COLORS.navy,borderRadius:100,paddingHorizontal:14,paddingVertical:6},
  connectBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  postContent:{fontSize:15,color:'#333',lineHeight:23,marginBottom:10},
  postImage:{width:'100%',height:200,borderRadius:12,marginBottom:10},
  quotedCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,padding:12,marginBottom:10,backgroundColor:COLORS.lightBg},
  postActions:{flexDirection:'row',alignItems:'center',gap:4,paddingTop:10,borderTopWidth:1,borderTopColor:COLORS.border},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:5,flex:1,justifyContent:'center',paddingVertical:6},
  actionTxt:{fontSize:13,color:'#888',fontWeight:'500'},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  modalCancel:{fontSize:15,color:'#888',fontWeight:'500'},
  modalTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  modalPostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  modalPostBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  commentItem:{paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f8f7f4'},
  commentAvatar:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  commentBubble:{backgroundColor:'#f8f7f4',borderRadius:14,padding:10,marginBottom:4},
  commentAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  commentLocation:{fontSize:11,color:'#aaa'},
  commentText:{fontSize:14,color:'#333',lineHeight:20},
  commentActions:{flexDirection:'row',alignItems:'center',gap:14,paddingLeft:4,marginBottom:8},
  commentTime:{fontSize:11,color:'#bbb'},
  commentActionTxt:{fontSize:12,fontWeight:'600',color:'#888'},
  replyItem:{flexDirection:'row',gap:8,marginLeft:8,marginBottom:6},
  commentInputWrap:{borderTopWidth:1,borderTopColor:COLORS.border,backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?8:16},
  replyingToBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:8,paddingBottom:4},
  replyingToTxt:{fontSize:12,color:'#888'},
  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},
  commentInput:{flex:1,borderWidth:1.5,borderColor:COLORS.border,borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy,maxHeight:100},
  commentSendBtn:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  quotedPostCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,padding:12,backgroundColor:COLORS.lightBg},
});
EOF
echo "community tab done"

echo "ALL DONE"
