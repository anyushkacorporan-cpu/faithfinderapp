#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── 1. LOGIN — gold cross icon, remove "Welcome back" ──
cat > app/login.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  function handleLogin() {
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Please enter your password.'); return; }
    setUser({ email });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoWrap}>
            <View style={s.crossWrap}>
              <Ionicons name="cross-outline" size={20} color={COLORS.gold} />
            </View>
            <Text style={s.logo}><Text style={s.logoGold}>Faith</Text><Text style={s.logoNavy}>Finder App</Text></Text>
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord.</Text>
          <Text style={s.verseRef}>— Jeremiah 29:11</Text>
          <View style={s.card}>
            <Text style={s.cardSub}>Sign in to your FaithFinder account</Text>
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon]} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setError(''); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon, {paddingRight:50}]} placeholder="Enter your password" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={v => { setPassword(v); setError(''); }} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.forgotWrap} onPress={() => router.push('/forgot')}>
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.signInBtn} onPress={handleLogin} activeOpacity={0.88}>
              <Text style={s.signInTxt}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>
            <TouchableOpacity style={s.signUpBtn} onPress={() => router.push('/signup')} activeOpacity={0.88}>
              <Text style={s.signUpTxt}>Create an Account</Text>
            </TouchableOpacity>
            <View style={s.termsWrap}>
              <Text style={s.termsTxt}>By signing in you agree to our </Text>
              <TouchableOpacity><Text style={s.termsLink}>Privacy Policy</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  scroll:{flexGrow:1,paddingHorizontal:24,paddingTop:48},
  logoWrap:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,marginBottom:16},
  crossWrap:{width:40,height:40,borderRadius:11,backgroundColor:'rgba(201,169,110,0.12)',alignItems:'center',justifyContent:'center'},
  logo:{fontFamily:'PlayfairDisplay_700Bold',fontSize:28},
  logoGold:{color:COLORS.gold},
  logoNavy:{color:COLORS.navy},
  verse:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20,paddingHorizontal:20},
  verseRef:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:12,color:COLORS.gold,textAlign:'center',marginTop:4,marginBottom:32},
  card:{backgroundColor:COLORS.white,borderRadius:24,borderWidth:1,borderColor:'#ebe8e2',padding:24,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:12},
  cardSub:{fontSize:14,color:'#aaa',marginBottom:24},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:16},
  errTxt:{color:'#dc2626',fontSize:13,flex:1},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  inputWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:15,zIndex:1},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputWithIcon:{paddingLeft:44},
  eyeBtn:{position:'absolute',right:14,top:13},
  forgotWrap:{alignSelf:'flex-end',marginBottom:20,marginTop:-4},
  forgotTxt:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  signInBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:16,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  signInTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  dividerRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},
  dividerLine:{flex:1,height:1,backgroundColor:'#f0ede8'},
  dividerTxt:{fontSize:13,color:'#ccc',fontWeight:'600'},
  signUpBtn:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:16,paddingVertical:15,alignItems:'center',marginBottom:20},
  signUpTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  termsWrap:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap'},
  termsTxt:{fontSize:12,color:'#bbb'},
  termsLink:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
});
EOF
echo "login done"

# ── 2. SIGNUP — add back arrow ──
cat > app/signup.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

export default function SignupScreen() {
  const [accountType, setAccountType] = useState<'personal'|'church'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  function handleCreate() {
    setError('');
    if (accountType === 'personal') {
      if (!firstName || !lastName) { setError('Please enter your first and last name.'); return; }
    } else {
      if (!churchName) { setError('Please enter your church name.'); return; }
    }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setUser({ accountType, firstName, lastName, churchName, email });
    if (accountType === 'church') {
      router.push('/church-setup');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Back arrow */}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={s.logoWrap}>
            <View style={s.crossWrap}>
              <Ionicons name="cross-outline" size={18} color={COLORS.gold} />
            </View>
            <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
          <View style={s.card}>
            <View style={s.typeRow}>
              <TouchableOpacity style={[s.typeBtn, accountType==='personal' && s.typeBtnActive]} onPress={() => setAccountType('personal')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='personal' && s.typeIconWrapActive]}>
                  <Ionicons name="person" size={22} color={accountType==='personal' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='personal' && s.typeLblActive]}>Community</Text>
                <Text style={[s.typeSub, accountType==='personal' && s.typeSubActive]}>Individual believer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, accountType==='church' && s.typeBtnActive]} onPress={() => setAccountType('church')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='church' && s.typeIconWrapActive]}>
                  <Ionicons name="home-outline" size={22} color={accountType==='church' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='church' && s.typeLblActive]}>Church</Text>
                <Text style={[s.typeSub, accountType==='church' && s.typeSubActive]}>Ministry or organization</Text>
              </TouchableOpacity>
            </View>
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color='#dc2626' />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}
            {accountType === 'personal' ? (
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:10}]}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput style={s.input} placeholder="John" placeholderTextColor={COLORS.placeholder} value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>Last Name</Text>
                  <TextInput style={s.input} placeholder="Doe" placeholderTextColor={COLORS.placeholder} value={lastName} onChangeText={setLastName} />
                </View>
              </View>
            ) : (
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Name</Text>
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={setChurchName} />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="8+ characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="Re-enter" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.primaryBtnTxt}>{accountType === 'church' ? 'Continue to Claim Church' : 'Create Account'}</Text>
              {accountType === 'church' && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </TouchableOpacity>
            <Text style={s.terms}>By creating an account, you agree to our <Text style={s.termsLink}>Privacy Policy</Text> and <Text style={s.termsLink}>Terms of Service</Text></Text>
          </View>
          <View style={s.signinRow}>
            <Text style={s.signinTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}><Text style={s.signinLink}>Sign In</Text></TouchableOpacity>
          </View>
          <View style={{height:20}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  scroll:{flexGrow:1,paddingHorizontal:20,paddingTop:16},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',marginBottom:12},
  logoWrap:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:10},
  crossWrap:{width:36,height:36,borderRadius:10,backgroundColor:'rgba(201,169,110,0.12)',alignItems:'center',justifyContent:'center'},
  logo:{fontFamily:'PlayfairDisplay_700Bold',fontSize:24,color:COLORS.navy},
  gold:{color:COLORS.gold},
  verse:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20,marginBottom:24,paddingHorizontal:10},
  card:{backgroundColor:COLORS.white,borderRadius:24,borderWidth:1,borderColor:'#ebe8e2',padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:12},
  typeRow:{flexDirection:'row',gap:10,marginBottom:20},
  typeBtn:{flex:1,alignItems:'center',borderWidth:1.5,borderColor:'#e8e3da',borderRadius:16,paddingVertical:14,paddingHorizontal:8,gap:6,backgroundColor:COLORS.white},
  typeBtnActive:{borderColor:COLORS.gold,backgroundColor:'#fffbf5'},
  typeIconWrap:{width:44,height:44,borderRadius:22,backgroundColor:'#f0ede8',alignItems:'center',justifyContent:'center'},
  typeIconWrapActive:{backgroundColor:COLORS.navy},
  typeLbl:{fontSize:14,fontWeight:'700',color:'#aaa'},
  typeLblActive:{color:COLORS.navy},
  typeSub:{fontSize:11,color:'#ccc',textAlign:'center'},
  typeSubActive:{color:'#888'},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:14},
  errTxt:{color:'#dc2626',fontSize:13,flex:1},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:13},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:6,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  terms:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:14,lineHeight:17},
  termsLink:{color:COLORS.gold,fontWeight:'600'},
  signinRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "signup done"

# ── 3. COMMUNITY — posts, likes, comments, share, church posts in Discover ──
cat > src/lib/postsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Post = {
  id: string;
  authorName: string;
  authorInitials: string;
  authorType: 'personal' | 'church';
  authorColor: string;
  content: string;
  image?: string;
  likes: string[];
  comments: { id: string; author: string; text: string; time: string }[];
  time: string;
  createdAt: number;
};

let posts: Post[] = [
  {
    id: '1',
    authorName: 'Grace Community Church',
    authorInitials: 'GC',
    authorType: 'church',
    authorColor: '#c9a96e',
    content: 'What an incredible Sunday! Over 50 people came forward during altar call. God is moving! Join us next week, all are welcome.',
    likes: [],
    comments: [],
    time: '2h',
    createdAt: Date.now() - 7200000,
  },
  {
    id: '2',
    authorName: 'Lakewood Church',
    authorInitials: 'LC',
    authorType: 'church',
    authorColor: '#1a1a2e',
    content: 'Night of Hope is coming! Join Joel and Victoria Osteen for an unforgettable evening of worship and encouragement. Free admission.',
    likes: [],
    comments: [],
    time: '1d',
    createdAt: Date.now() - 86400000,
  },
  {
    id: '3',
    authorName: 'Jasmine Carter',
    authorInitials: 'JC',
    authorType: 'personal',
    authorColor: '#667eea',
    content: 'Just finished writing "Unshakeable". God gave me every lyric at 3am! So grateful for this gift.',
    likes: [],
    comments: [],
    time: '4h',
    createdAt: Date.now() - 14400000,
  },
];

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getPosts() { return [...posts].sort((a,b) => b.createdAt - a.createdAt); }

export function addPost(post: Omit<Post, 'id' | 'likes' | 'comments' | 'createdAt'>) {
  posts = [{ ...post, id: Date.now().toString(), likes: [], comments: [], createdAt: Date.now() }, ...posts];
  notify();
}

export function toggleLike(postId: string, userId: string) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    const liked = p.likes.includes(userId);
    return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...p.likes, userId] };
  });
  notify();
}

export function addComment(postId: string, author: string, text: string) {
  posts = posts.map(p => {
    if (p.id !== postId) return p;
    return { ...p, comments: [...p.comments, { id: Date.now().toString(), author, text, time: 'now' }] };
  });
  notify();
}

export function usePosts() {
  const [state, setState] = useState(getPosts());
  useEffect(() => {
    const fn = () => setState(getPosts());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
EOF
echo "postsStore done"

# ── 4. COMMUNITY SCREEN ──
cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, Alert, Share, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../src/components/Header';
import { COLORS } from '../../src/lib/constants';
import { usePosts, addPost, toggleLike, addComment, getPosts } from '../../src/lib/postsStore';
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
  const [posting, setPosting] = useState(false);

  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Your Church')
    : `${user.firstName || 'You'} ${user.lastName || ''}`.trim();

  const initials = user.accountType === 'church'
    ? (user.churchName?.[0] || 'C')
    : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;

  const forYouPosts = posts;
  const discoverPosts = posts.filter(p => p.authorType === 'church');

  const displayPosts = activeTab === 'For You' ? forYouPosts : discoverPosts;

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  }

  function handlePost() {
    if (!postText.trim() && !postImage) { Alert.alert('Please write something or add a photo.'); return; }
    setPosting(true);
    addPost({
      authorName: displayName,
      authorInitials: initials.toUpperCase(),
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: user.accountType === 'church' ? COLORS.gold : '#667eea',
      content: postText.trim(),
      image: postImage || undefined,
      time: 'now',
    });
    setPostText('');
    setPostImage(null);
    setPosting(false);
  }

  function handleShare(post: any) {
    Share.share({ message: `${post.authorName}: ${post.content}` });
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
              <Text style={s.createAvatarTxt}>{initials.toUpperCase()}</Text>
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
            <View style={s.previewImageWrap}>
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
            <TouchableOpacity style={[s.postBtn, (!postText.trim() && !postImage) && s.postBtnDisabled]} onPress={handlePost} disabled={!postText.trim() && !postImage}>
              <Text style={s.postBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Posts */}
        {displayPosts.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={40} color="#ddd" />
            <Text style={s.emptyTxt}>No posts yet</Text>
            <Text style={s.emptySub}>{activeTab === 'Discover' ? 'Church posts will appear here' : 'Be the first to post!'}</Text>
          </View>
        )}

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
              {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
              {!!post.image && <Image source={{ uri: post.image }} style={s.postImage} resizeMode="cover" />}
              <View style={s.postStats}>
                {post.likes.length > 0 && <Text style={s.statTxt}>{post.likes.length} like{post.likes.length !== 1 ? 's' : ''}</Text>}
                {post.comments.length > 0 && <Text style={s.statTxt}>{post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}</Text>}
              </View>
              <View style={s.postActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id, MY_ID)}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? COLORS.red : '#888'} />
                  <Text style={[s.actionTxt, liked && {color:COLORS.red}]}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => setCommentModal(post.id)}>
                  <Ionicons name="chatbubble-outline" size={20} color="#888" />
                  <Text style={s.actionTxt}>Comment</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleShare(post)}>
                  <Ionicons name="share-social-outline" size={20} color="#888" />
                  <Text style={s.actionTxt}>Share</Text>
                </TouchableOpacity>
              </View>
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
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCommentModal(null)} />
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
  createCard:{backgroundColor:COLORS.white,margin:12,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:4},
  createTop:{flexDirection:'row',gap:10,marginBottom:12},
  createAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  createAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  createInput:{flex:1,fontSize:14,color:COLORS.navy,minHeight:60,textAlignVertical:'top'},
  previewImageWrap:{position:'relative',marginBottom:12},
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
  emptySub:{fontSize:13,color:'#ddd'},
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
  postStats:{flexDirection:'row',gap:12,marginBottom:8},
  statTxt:{fontSize:12,color:'#aaa'},
  postActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,gap:0},
  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5},
  actionTxt:{fontSize:13,color:'#888',fontWeight:'600'},
  commentsWrap:{marginTop:8,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8,gap:4},
  commentRow:{flexDirection:'row',flexWrap:'wrap'},
  commentAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  commentText:{fontSize:13,color:'#555'},
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
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
echo "community done"

# ── 5. HEADER with working notifications and settings ──
cat > src/components/Header.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';

const NOTIFICATIONS = [
  { id: '1', icon: 'heart', color: COLORS.red, title: 'Someone liked your post', time: '2m ago' },
  { id: '2', icon: 'home', color: COLORS.gold, title: 'Grace Church posted an update', time: '1h ago' },
  { id: '3', icon: 'shield-checkmark', color: COLORS.green, title: 'Your church verification is under review', time: '3h ago' },
  { id: '4', icon: 'calendar', color: COLORS.navy, title: 'New event in your area', time: '1d ago' },
];

export default function Header() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [unread, setUnread] = useState(3);

  function handleNotifOpen() {
    setShowNotifs(true);
    setUnread(0);
  }

  return (
    <>
      <View style={s.header}>
        <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
        <View style={s.icons}>
          <TouchableOpacity style={s.iconBtn} onPress={handleNotifOpen}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
            {unread > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unread}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={showNotifs} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNotifs(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setShowNotifs(false)}>
              <Ionicons name="close" size={22} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {NOTIFICATIONS.map(n => (
              <TouchableOpacity key={n.id} style={s.notifRow} activeOpacity={0.7}>
                <View style={[s.notifIcon, {backgroundColor: n.color + '22'}]}>
                  <Ionicons name={n.icon as any} size={18} color={n.color} />
                </View>
                <View style={s.notifInfo}>
                  <Text style={s.notifTitle}>{n.title}</Text>
                  <Text style={s.notifTime}>{n.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={22} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {[
              { icon:'person-outline', label:'Edit Profile', color:'#667eea' },
              { icon:'notifications-outline', label:'Notification Preferences', color:COLORS.gold },
              { icon:'location-outline', label:'Location Settings', color:COLORS.green },
              { icon:'shield-outline', label:'Privacy & Security', color:COLORS.navy },
              { icon:'moon-outline', label:'Appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', label:'Help & Support', color:'#e67e22' },
              { icon:'information-circle-outline', label:'About FaithFinder', color:'#aaa' },
              { icon:'log-out-outline', label:'Sign Out', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                if (item.label === 'Sign Out') { setShowSettings(false); router.replace('/login'); }
                else { setShowSettings(false); Alert.alert(item.label, 'Coming soon!'); }
              }}>
                <View style={[s.settingIcon, {backgroundColor: item.color + '18'}]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.label === 'Sign Out' && {color:COLORS.red}]}>{item.label}</Text>
                {item.label !== 'Sign Out' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  logo:{fontFamily:'PlayfairDisplay_700Bold',fontSize:20,color:COLORS.navy},
  gold:{color:COLORS.gold},
  icons:{flexDirection:'row',gap:4},
  iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',position:'relative'},
  badge:{position:'absolute',top:-2,right:-2,width:16,height:16,borderRadius:8,backgroundColor:COLORS.red,alignItems:'center',justifyContent:'center'},
  badgeTxt:{color:COLORS.white,fontSize:9,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,maxHeight:'75%'},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  sheetTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  notifIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  notifInfo:{flex:1},
  notifTitle:{fontSize:14,color:COLORS.navy,fontWeight:'500',marginBottom:2},
  notifTime:{fontSize:12,color:'#aaa'},
  settingRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  settingIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  settingLabel:{flex:1,fontSize:15,color:COLORS.navy,fontWeight:'500'},
});
EOF
echo "header done"

# ── 6. EVENTS — fix all buttons ──
cat > app/event-detail.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { COLORS } from '../src/lib/constants';

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id:string; title:string; description:string; date:string; location:string; type:string; price:string; }>();
  const [saved, setSaved] = useState(false);
  const [attending, setAttending] = useState(false);

  async function handleAddToCalendar() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow calendar access to add this event.'); return; }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find(c => c.allowsModifications) || calendars[0];
      if (!defaultCal) { Alert.alert('No calendar found'); return; }
      await Calendar.createEventAsync(defaultCal.id, {
        title: params.title || 'FaithFinder Event',
        notes: params.description || '',
        location: params.location || '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        timeZone: 'GMT',
      });
      Alert.alert('Added!', 'Event has been added to your calendar.');
    } catch (e) {
      Alert.alert('Could not add to calendar', 'Please try again.');
    }
  }

  function handleShare() {
    Share.share({
      title: params.title,
      message: `Check out this event on FaithFinder!\n\n${params.title}\n📍 ${params.location}\n📅 ${params.date}${params.price !== 'Free' ? '\n🎟 ' + params.price : '\n✅ Free'}`,
    });
  }

  function handleGetTicket() {
    if (params.price === 'Free') {
      Alert.alert('Free Event', 'This is a free event! Just show up and enjoy.', [
        { text: 'Register Interest', onPress: () => { setAttending(true); Alert.alert('Registered!', "You're registered for this event."); }},
        { text: 'Close', style: 'cancel' },
      ]);
    } else {
      Alert.alert('Get Tickets', `Tickets are ${params.price}. You will be redirected to purchase.`, [
        { text: 'Buy Tickets', onPress: () => Linking.openURL('https://faithfinderapp.com/tickets') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

  function handleInvite() {
    Share.share({
      message: `Join me at ${params.title}! 📅 ${params.date} 📍 ${params.location}\n\nFind it on FaithFinder.`,
    });
  }

  const GRADIENT_COLORS: Record<string, [string,string]> = {
    Conference: ['#667eea','#764ba2'],
    Festival: ['#f093fb','#f5576c'],
    Workshop: ['#4facfe','#00f2fe'],
    Revival: ['#43e97b','#38f9d7'],
    Service: ['#fa709a','#fee140'],
  };
  const gradient = GRADIENT_COLORS[params.type || ''] || ['#667eea','#764ba2'] as [string,string];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <LinearGradient colors={gradient} style={s.banner} start={{x:0,y:0}} end={{x:1,y:1}}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <View style={s.bannerActions}>
            <TouchableOpacity style={s.bannerActionBtn} onPress={() => setSaved(!saved)}>
              <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? COLORS.red : COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.bannerActionBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={s.bannerContent}>
            <View style={s.typePill}><Text style={s.typePillTxt}>{params.type}</Text></View>
            <Text style={s.bannerTitle}>{params.title}</Text>
          </View>
        </LinearGradient>

        <View style={s.body}>

          {/* Quick info */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="calendar-outline" size={18} color={COLORS.navy} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Date & Time</Text>
                <Text style={s.infoValue}>{params.date}</Text>
              </View>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="location-outline" size={18} color={COLORS.navy} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Location</Text>
                <Text style={s.infoValue}>{params.location}</Text>
              </View>
              <TouchableOpacity style={s.dirBtn} onPress={() => {
                const q = encodeURIComponent(params.location || '');
                Linking.openURL(`maps://?q=${q}`).catch(() => Linking.openURL(`https://maps.google.com/?q=${q}`));
              }}>
                <Text style={s.dirBtnTxt}>Directions</Text>
              </TouchableOpacity>
            </View>
            <View style={s.infoDivider} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}><Ionicons name="ticket-outline" size={18} color={COLORS.navy} /></View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>Admission</Text>
                <Text style={[s.infoValue, params.price === 'Free' ? s.free : s.paid]}>{params.price}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {!!params.description && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>About this Event</Text>
              <Text style={s.descTxt}>{params.description}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.calBtn} onPress={handleAddToCalendar}>
              <Ionicons name="calendar" size={20} color={COLORS.navy} />
              <Text style={s.calBtnTxt}>Add to Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.inviteBtn} onPress={handleInvite}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.navy} />
              <Text style={s.inviteBtnTxt}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Get Ticket CTA */}
          <TouchableOpacity style={[s.ticketBtn, attending && s.ticketBtnAttending]} onPress={handleGetTicket} activeOpacity={0.88}>
            <Ionicons name={attending ? 'checkmark-circle' : 'ticket-outline'} size={20} color={COLORS.white} />
            <Text style={s.ticketBtnTxt}>{attending ? "You're Registered!" : params.price === 'Free' ? 'Register (Free)' : `Get Tickets — ${params.price}`}</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  banner:{height:280,justifyContent:'space-between',padding:16},
  backBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerActions:{flexDirection:'row',gap:10,alignSelf:'flex-end',marginTop:-38},
  bannerActionBtn:{width:38,height:38,borderRadius:19,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'},
  bannerContent:{gap:8},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.25)',borderRadius:100,paddingHorizontal:12,paddingVertical:4},
  typePillTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  bannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:24,color:COLORS.white,lineHeight:30},
  body:{padding:16},
  infoCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,overflow:'hidden',marginBottom:20},
  infoRow:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  infoDivider:{height:1,backgroundColor:'#f5f3ef',marginLeft:62},
  infoIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  infoContent:{flex:1},
  infoLabel:{fontSize:11,color:'#bbb',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:2},
  infoValue:{fontSize:14,color:COLORS.navy,fontWeight:'500'},
  free:{color:COLORS.green,fontWeight:'700'},
  paid:{color:COLORS.gold,fontWeight:'700'},
  dirBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  dirBtnTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  section:{marginBottom:20},
  sectionTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy,marginBottom:8},
  descTxt:{fontSize:14,color:'#555',lineHeight:22},
  actionRow:{flexDirection:'row',gap:10,marginBottom:16},
  calBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:13},
  calBtnTxt:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  inviteBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:13},
  inviteBtnTxt:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  ticketBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  ticketBtnAttending:{backgroundColor:COLORS.green},
  ticketBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
});
EOF
echo "event-detail done"

# ── 7. EVENTS TAB — tap to open detail ──
cat > "app/(tabs)/events.tsx" << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';
import { COLORS, EVENTS } from '../../src/lib/constants';

const TABS = ['Upcoming', 'Attending', 'Saved'];
const FILTERS = ['All', 'Conference', 'Festival', 'Workshop', 'Revival', 'Service'];

export default function EventsScreen() {
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [activeFilter, setActiveFilter] = useState('All');
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<string[]>([]);

  let filtered = EVENTS.filter(e => activeFilter === 'All' || e.type === activeFilter);
  if (activeTab === 'Saved') filtered = filtered.filter(e => savedEvents.includes(e.id));
  if (activeTab === 'Attending') filtered = filtered.filter(e => attendingEvents.includes(e.id));

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />
      <View style={s.tabsRow}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillsRow} contentContainerStyle={s.pillsContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[s.pill, activeFilter===f && s.pillActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[s.pillTxt, activeFilter===f && s.pillTxtActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>This Month</Text>
        {filtered.length === 0 && (
          <View style={s.empty}><Text style={s.emptyTxt}>No events found</Text></View>
        )}
        {filtered.map(event => (
          <TouchableOpacity key={event.id} style={s.card} activeOpacity={0.88}
            onPress={() => router.push({ pathname:'/event-detail', params:{ id:event.id, title:event.title, description:event.description, date:event.date, location:event.location, type:event.type, price:event.price }})}>
            <View style={s.dateBox}>
              <Text style={s.dateMonth}>{event.date?.split(' ')[0] || 'APR'}</Text>
              <Text style={s.dateDay}>{event.date?.split(' ')[1]?.replace(',','') || '1'}</Text>
            </View>
            <View style={s.eventInfo}>
              <Text style={s.eventTitle}>{event.title}</Text>
              <Text style={s.eventLoc}>📍 {event.location}</Text>
              <View style={s.badges}>
                <View style={s.badgeType}><Text style={s.badgeTypeTxt}>{event.type}</Text></View>
                {event.price === 'Free'
                  ? <View style={s.badgeFree}><Text style={s.badgeFreeTxt}>Free</Text></View>
                  : <View style={s.badgePaid}><Text style={s.badgePaidTxt}>{event.price}</Text></View>
                }
              </View>
            </View>
            <TouchableOpacity onPress={e => { e.stopPropagation(); setSavedEvents(p => p.includes(event.id) ? p.filter(i=>i!==event.id) : [...p,event.id]); }}>
              <Text style={{fontSize:20}}>{savedEvents.includes(event.id) ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        <View style={{height:20}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  tabsRow:{flexDirection:'row',backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  tab:{flex:1,paddingVertical:12,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:COLORS.gold},
  tabTxt:{fontSize:12,fontWeight:'700',color:'#ccc'},
  tabTxtActive:{color:COLORS.navy},
  pillsRow:{backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border,maxHeight:50},
  pillsContent:{paddingHorizontal:16,paddingVertical:8,gap:8,flexDirection:'row'},
  pill:{borderRadius:100,paddingHorizontal:16,paddingVertical:6,backgroundColor:COLORS.lightBg},
  pillActive:{backgroundColor:COLORS.navy},
  pillTxt:{fontSize:12,fontWeight:'700',color:'#888'},
  pillTxtActive:{color:COLORS.white},
  scroll:{flex:1,backgroundColor:COLORS.cream},
  sectionLabel:{fontSize:11,fontWeight:'700',color:'#bbb',letterSpacing:0.7,textTransform:'uppercase',paddingHorizontal:16,paddingTop:14,paddingBottom:8},
  empty:{padding:40,alignItems:'center'},
  emptyTxt:{fontSize:14,color:'#bbb'},
  card:{backgroundColor:COLORS.white,marginHorizontal:12,marginBottom:12,borderRadius:20,padding:16,borderWidth:1,borderColor:COLORS.border,flexDirection:'row',gap:14,alignItems:'center'},
  dateBox:{width:52,height:52,borderRadius:14,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  dateMonth:{fontSize:9,fontWeight:'700',color:COLORS.gold,letterSpacing:0.5,textTransform:'uppercase'},
  dateDay:{fontSize:20,fontWeight:'700',color:COLORS.white,lineHeight:24},
  eventInfo:{flex:1},
  eventTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  eventLoc:{fontSize:11,color:'#999',marginBottom:8},
  badges:{flexDirection:'row',gap:6,flexWrap:'wrap'},
  badgeType:{backgroundColor:COLORS.lightBg,borderRadius:8,paddingHorizontal:9,paddingVertical:3},
  badgeTypeTxt:{fontSize:10,fontWeight:'700',color:'#888'},
  badgeFree:{backgroundColor:'#e8f5e9',borderRadius:8,paddingHorizontal:9,paddingVertical:3},
  badgeFreeTxt:{fontSize:10,fontWeight:'700',color:'#2e7d32'},
  badgePaid:{backgroundColor:'#fff3e0',borderRadius:8,paddingHorizontal:9,paddingVertical:3},
  badgePaidTxt:{fontSize:10,fontWeight:'700',color:'#e65100'},
});
EOF
echo "events done"

# ── 8. CHURCH DETAIL — add user reviews ──
# Add reviews capability to constants
cat >> src/lib/constants.ts << 'EOF2'

// User reviews store
let churchReviews: Record<string, {id:string; author:string; rating:number; text:string; time:string}[]> = {};
const reviewListeners: Array<()=>void> = [];

export function getChurchReviews(placeId: string) {
  return churchReviews[placeId] || [];
}

export function addChurchReview(placeId: string, review: {author:string; rating:number; text:string}) {
  if (!churchReviews[placeId]) churchReviews[placeId] = [];
  churchReviews[placeId] = [{ ...review, id: Date.now().toString(), time: 'Just now' }, ...churchReviews[placeId]];
  reviewListeners.forEach(fn => fn());
}

export function subscribeReviews(fn: ()=>void) {
  reviewListeners.push(fn);
  return () => { const i = reviewListeners.indexOf(fn); if (i>-1) reviewListeners.splice(i,1); };
}
EOF2
echo "constants updated"

# Install expo-calendar
npx expo install expo-calendar 2>/dev/null || true

# Update _layout
cat > app/_layout.tsx << 'EOF'
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic });
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="church-setup" />
        <Stack.Screen name="claim-church" />
        <Stack.Screen name="register-church" />
        <Stack.Screen name="edit-church-profile" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
      </Stack>
    </>
  );
}
EOF
echo "layout done"

echo "ALL DONE"
