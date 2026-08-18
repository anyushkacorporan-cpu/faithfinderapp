#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ─── Step 1: Update connectionsStore to support user connections ─────────────
cat > "src/lib/connectionsStore.ts" << 'EOF'
type Connection = { id: string; name: string; type: 'user' | 'church'; color: string; initials: string; };
let connections: Connection[] = [
  { id: 'grace-community', name: 'Grace Community Church', type: 'church', color: '#c9a96e', initials: 'GC' },
  { id: 'pastor-mike', name: 'Pastor Michael Johnson', type: 'user', color: '#667eea', initials: 'MJ' },
];
type Listener = () => void;
const listeners: Listener[] = [];
function notify() { listeners.forEach(l => l()); }
import { useState, useEffect } from 'react';
export function useConnections() {
  const [state, setState] = useState([...connections]);
  useEffect(() => { const fn = () => setState([...connections]); listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i>-1) listeners.splice(i,1); }; }, []);
  return state;
}
export function getConnections() { return connections; }
export function isConnected(nameOrId: string) { return connections.some(c => c.name === nameOrId || c.id === nameOrId); }
export function addConnection(c: Connection) { if (!isConnected(c.id)) { connections.push(c); notify(); } }
export function removeConnection(id: string) { connections = connections.filter(c => c.id !== id); notify(); }
EOF
echo "connectionsStore done"

# ─── Step 2: Update postsStore to support feed + visibility ──────────────────
python3 - << 'PYEOF'
with open('src/lib/postsStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add visibility field to Post type if not present
if 'visibility' not in content:
    old = "  feed: 'foryou' | 'discover' | 'both';"
    new = "  feed: 'foryou' | 'discover' | 'both';\n  visibility?: 'public' | 'connections';\n  showLocation?: boolean;"
    content = content.replace(old, new)

    with open('src/lib/postsStore.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('postsStore updated')
else:
    print('postsStore already has visibility')
PYEOF

# ─── Step 3: Update notifications to support clear ───────────────────────────
python3 - << 'PYEOF'
import os
path = 'src/lib/notificationsStore.ts'
if not os.path.exists(path):
    print('notificationsStore not found, skipping')
else:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'clearAll' not in content:
        # Add clearAll and clearOne functions before last export or at end
        addition = """
export function clearAllNotifications() {
  notifications = [];
  notify();
}
export function clearNotification(id: string) {
  notifications = notifications.filter(n => n.id !== id);
  notify();
}
export function markAllRead() {
  notifications = notifications.map(n => ({ ...n, read: true }));
  notify();
}
"""
        content = content.rstrip() + '\n' + addition
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('notificationsStore updated')
    else:
        print('notificationsStore already has clearAll')
PYEOF

# ─── Step 4: Full community.tsx rewrite ──────────────────────────────────────
cat > "app/(tabs)/community.tsx" << 'EOF'
import { useState } from 'react';
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
import { useConnections, addConnection, isConnected } from '../../src/lib/connectionsStore';

type Visibility = 'public' | 'connections';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<'foryou'|'discover'>('foryou');
  const posts = usePosts(activeTab);
  const connections = useConnections();
  const user = getUser();

  const [showCreate, setShowCreate] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [showLocation, setShowLocation] = useState(true);
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
      city: showLocation ? user.location?.split(',')[0]?.trim() : undefined,
      state: showLocation ? user.location?.split(',')[1]?.trim() : undefined,
      feed: visibility === 'public' ? 'discover' : 'foryou',
    });
    setNewPostText(''); setShowCreate(false); setVisibility('public'); setShowLocation(true);
  }

  function handleConnect(post: Post) {
    addConnection({ id: post.id, name: post.authorName, type: post.authorType === 'church' ? 'church' : 'user', color: post.authorColor, initials: post.authorInitials });
    Alert.alert('Connected!', `You are now connected with ${post.authorName}.`);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header />

      {/* Tab Bar */}
      <View style={s.tabBar}>
        <View style={s.tabToggle}>
          {(['foryou','discover'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[s.tabPill, activeTab===tab&&s.tabPillActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabPillTxt, activeTab===tab&&s.tabPillTxtActive]}>
                {tab === 'foryou' ? 'For You' : 'Discover'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Premium Compose Button */}
        <TouchableOpacity style={s.composeBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="create-outline" size={19} color={COLORS.white} />
          <Text style={s.composeBtnTxt}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Discover Banner */}
      {activeTab === 'discover' && (
        <View style={s.discoverBanner}>
          <Ionicons name="earth-outline" size={15} color={COLORS.gold} />
          <Text style={s.discoverTxt}>Believers from all 50 states · Join the conversation</Text>
        </View>
      )}

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {posts.length === 0 && activeTab === 'foryou' && (
          <View style={s.emptyFeed}>
            <Ionicons name="people-outline" size={44} color="#ddd" />
            <Text style={s.emptyTitle}>Your feed is quiet</Text>
            <Text style={s.emptySubtitle}>Connect with churches and believers to see their posts here</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setActiveTab('discover')}>
              <Text style={s.emptyBtnTxt}>Discover People</Text>
            </TouchableOpacity>
          </View>
        )}
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            connected={isConnected(post.authorName)}
            showLocation={activeTab === 'discover'}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => { setSharePost(post); setShareMessage(''); }}
            onConnect={() => handleConnect(post)}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Create Post Modal ── */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }} edges={['top']}>
          {/* Header */}
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowCreate(false); setNewPostText(''); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity
              style={[s.postBtn, !newPostText.trim() && { opacity: 0.4 }]}
              onPress={handleCreatePost}
              disabled={!newPostText.trim()}
            >
              <Text style={s.postBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Author row */}
              <View style={s.composeAuthor}>
                <View style={[s.composeAvatar, { backgroundColor: '#667eea' }]}>
                  <Text style={s.composeAvatarTxt}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.composeAuthorName}>{displayName}</Text>
                  {/* Visibility */}
                  <View style={s.visibilityRow}>
                    <TouchableOpacity
                      style={[s.visibilityChip, visibility === 'public' && s.visibilityChipActive]}
                      onPress={() => setVisibility('public')}
                    >
                      <Ionicons name="earth-outline" size={11} color={visibility === 'public' ? COLORS.white : COLORS.navy} />
                      <Text style={[s.visibilityChipTxt, visibility === 'public' && { color: COLORS.white }]}>Public</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.visibilityChip, visibility === 'connections' && s.visibilityChipActive]}
                      onPress={() => setVisibility('connections')}
                    >
                      <Ionicons name="people-outline" size={11} color={visibility === 'connections' ? COLORS.white : COLORS.navy} />
                      <Text style={[s.visibilityChipTxt, visibility === 'connections' && { color: COLORS.white }]}>Connections</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Text input */}
              <TextInput
                style={s.composeInput}
                placeholder="What's on your heart?"
                placeholderTextColor="#bbb"
                value={newPostText}
                onChangeText={setNewPostText}
                multiline
                autoFocus
              />

              {/* Location toggle */}
              <View style={s.locationToggle}>
                <Ionicons name="location-outline" size={16} color={showLocation ? COLORS.gold : '#bbb'} />
                <Text style={[s.locationToggleTxt, showLocation && { color: COLORS.navy }]}>
                  {showLocation && user.location ? user.location : 'Show my location'}
                </Text>
                <TouchableOpacity
                  style={[s.toggleSwitch, showLocation && s.toggleSwitchOn]}
                  onPress={() => setShowLocation(!showLocation)}
                >
                  <View style={[s.toggleThumb, showLocation && s.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={s.composeDivider} />

              {/* Post type hint */}
              <View style={s.composeHint}>
                <Ionicons name={visibility === 'public' ? 'earth-outline' : 'people-outline'} size={14} color={COLORS.gold} />
                <Text style={s.composeHintTxt}>
                  {visibility === 'public'
                    ? 'This post will appear in the Discover feed for everyone'
                    : 'This post will appear in the For You feed for your connections'}
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Share Composer Modal ── */}
      <Modal visible={!!sharePost} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setSharePost(null); setShareMessage(''); }}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Share Post</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              addPost({ authorName: displayName, authorInitials: initials, authorType: user.accountType === 'church' ? 'church' : 'personal', authorColor: '#667eea', content: shareMessage.trim(), time: 'now', feed: 'both' });
              setSharePost(null); setShareMessage('');
            }}>
              <Text style={s.postBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
                <View style={[s.composeAvatar, { backgroundColor: '#667eea' }]}>
                  <Text style={s.composeAvatarTxt}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={{ fontSize: 15, color: COLORS.navy, minHeight: 60, lineHeight: 23, paddingTop: 2 }}
                    placeholder="Add your thoughts..."
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline autoFocus
                  />
                  {sharePost && (
                    <View style={s.quotedCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <View style={[s.composeAvatar, { width: 26, height: 26, borderRadius: 13, backgroundColor: sharePost.authorColor }]}>
                          <Text style={[s.composeAvatarTxt, { fontSize: 10 }]}>{sharePost.authorInitials}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy }}>{sharePost.authorName}</Text>
                      </View>
                      <Text style={{ fontSize: 13, color: '#555', lineHeight: 19 }} numberOfLines={3}>{sharePost.content}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={s.shareDivider}>
                <View style={{ flex: 1, height: 1, backgroundColor: '#f0ede8' }} />
                <Text style={s.shareDividerTxt}>or share outside FaithFinder</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#f0ede8' }} />
              </View>
              <View style={s.shareOptions}>
                {[
                  { label: 'Messages', icon: 'chatbubble-outline', color: '#2ecc71', bg: '#e8f8f0', action: () => { const m = sharePost?.content||''; require('react-native').Linking.openURL('sms:&body='+encodeURIComponent(m)).catch(()=>{}); } },
                  { label: 'Email', icon: 'mail-outline', color: '#3498db', bg: '#eaf4fb', action: () => { const m = sharePost?.content||''; require('react-native').Linking.openURL('mailto:?subject=Check this out&body='+encodeURIComponent(m)).catch(()=>{}); } },
                  { label: 'More', icon: 'share-social-outline', color: '#9b59b6', bg: '#f5eefb', action: () => { const p=sharePost; setSharePost(null); setTimeout(()=>Share.share({message:p?.content||''}).catch(()=>{}),500); } },
                ].map(opt => (
                  <TouchableOpacity key={opt.label} style={{ alignItems: 'center', gap: 8 }} onPress={opt.action}>
                    <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: opt.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#111', fontWeight: '600' }}>{opt.label}</Text>
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

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, connected, showLocation, onLike, onComment, onShare, onConnect }: {
  post: Post; connected: boolean; showLocation: boolean;
  onLike: () => void; onComment: () => void; onShare: () => void; onConnect: () => void;
}) {
  return (
    <View style={p.card}>
      {/* Author row */}
      <View style={p.hdr}>
        <TouchableOpacity style={p.authorRow} onPress={() => Alert.alert(post.authorName, 'Profile coming soon!')}>
          <View style={[p.avatar, { backgroundColor: post.authorColor }]}>
            <Text style={p.avatarTxt}>{post.authorInitials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={p.authorName}>{post.authorName}</Text>
              {post.authorType === 'church' && (
                <View style={p.churchBadge}><Text style={p.churchBadgeTxt}>Church</Text></View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={p.time}>{post.time}</Text>
              {showLocation && post.city && post.state && (
                <>
                  <Text style={p.dot}>·</Text>
                  <Ionicons name="location" size={11} color={COLORS.gold} />
                  <Text style={p.location}>{post.city}, {post.state}</Text>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {/* Connect / Connected */}
        {connected ? (
          <View style={p.connectedBadge}>
            <Ionicons name="checkmark" size={12} color={COLORS.gold} />
            <Text style={p.connectedTxt}>Connected</Text>
          </View>
        ) : (
          <TouchableOpacity style={p.connectBtn} onPress={onConnect}>
            <Text style={p.connectBtnTxt}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {!!post.content && <Text style={p.content}>{post.content}</Text>}
      {!!post.image && <Image source={{ uri: post.image }} style={p.image} resizeMode="cover" />}

      {/* Location pill on Discover */}
      {showLocation && post.city && post.state && (
        <View style={p.locationPill}>
          <Ionicons name="location" size={12} color={COLORS.gold} />
          <Text style={p.locationPillTxt}>{post.city}, {post.state}</Text>
        </View>
      )}

      {/* Event/Church share cards */}
      {post.eventShareData && (
        <TouchableOpacity style={p.sharedCard} onPress={() => router.push({ pathname: '/event-detail' as any, params: { id: post.eventShareData!.id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calendar" size={12} color={COLORS.gold} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy, flex: 1 }} numberOfLines={1}>{post.eventShareData.title}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#888' }}>{post.eventShareData.date} · {post.eventShareData.location}</Text>
          <Text style={{ fontSize: 11, color: COLORS.gold, fontWeight: '700', marginTop: 4 }}>View Event →</Text>
        </TouchableOpacity>
      )}
      {post.churchShareData && (
        <View style={p.sharedCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="business" size={12} color={COLORS.gold} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.navy, flex: 1 }} numberOfLines={1}>{post.churchShareData.name}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#888' }}>{post.churchShareData.address}</Text>
          <Text style={{ fontSize: 11, color: COLORS.gold, fontWeight: '700', marginTop: 4 }}>View Church →</Text>
        </View>
      )}

      {/* Actions */}
      <View style={p.actions}>
        <TouchableOpacity style={p.actionBtn} onPress={onLike}>
          <Ionicons name={post.liked ? 'heart' : 'heart-outline'} size={20} color={post.liked ? '#e74c6f' : '#999'} />
          <Text style={[p.actionTxt, post.liked && { color: '#e74c6f' }]}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={19} color="#999" />
          <Text style={p.actionTxt}>{post.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={19} color="#999" />
          <Text style={p.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f7f4' },
  tabBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  tabToggle: { flex: 1, flexDirection: 'row', backgroundColor: '#f0ede8', borderRadius: 100, padding: 3 },
  tabPill: { flex: 1, paddingVertical: 8, borderRadius: 100, alignItems: 'center' },
  tabPillActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  tabPillTxt: { fontSize: 13, fontWeight: '600', color: '#999' },
  tabPillTxtActive: { color: COLORS.navy, fontWeight: '700' },
  composeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.navy, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9 },
  composeBtnTxt: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  discoverBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(201,169,110,0.07)', borderBottomWidth: 1, borderBottomColor: 'rgba(201,169,110,0.12)' },
  discoverTxt: { fontSize: 12, color: COLORS.gold, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  emptyFeed: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  emptySubtitle: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, backgroundColor: COLORS.navy, borderRadius: 22, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  cancelTxt: { fontSize: 15, color: '#888' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.navy },
  postBtn: { backgroundColor: COLORS.navy, borderRadius: 100, paddingHorizontal: 20, paddingVertical: 8 },
  postBtnTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  composeAuthor: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  composeAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  composeAvatarTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  composeAuthorName: { fontSize: 15, fontWeight: '700', color: COLORS.navy, marginBottom: 8 },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  visibilityChipActive: { backgroundColor: COLORS.navy },
  visibilityChipTxt: { fontSize: 11, fontWeight: '700', color: COLORS.navy },
  composeInput: { fontSize: 16, color: COLORS.navy, lineHeight: 25, minHeight: 120, paddingHorizontal: 16, paddingVertical: 8, textAlignVertical: 'top' },
  locationToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0ede8' },
  locationToggleTxt: { flex: 1, fontSize: 13, color: '#aaa' },
  toggleSwitch: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#ddd', padding: 3 },
  toggleSwitchOn: { backgroundColor: COLORS.gold },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white },
  toggleThumbOn: { transform: [{ translateX: 18 }] },
  composeDivider: { height: 1, backgroundColor: '#f0ede8', marginHorizontal: 16, marginVertical: 8 },
  composeHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  composeHintTxt: { flex: 1, fontSize: 12, color: '#aaa', lineHeight: 18 },
  quotedCard: { borderWidth: 1.5, borderColor: '#f0ede8', borderRadius: 12, padding: 12, marginTop: 8, backgroundColor: '#faf9f6' },
  shareDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginVertical: 20 },
  shareDividerTxt: { fontSize: 11, color: '#bbb' },
  shareOptions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, paddingBottom: 20 },
});

const p = StyleSheet.create({
  card: { backgroundColor: COLORS.white, marginBottom: 8, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#f0ede8' },
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  authorName: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  churchBadge: { backgroundColor: 'rgba(201,169,110,0.12)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  churchBadgeTxt: { fontSize: 10, fontWeight: '700', color: COLORS.gold },
  time: { fontSize: 12, color: '#bbb' },
  dot: { fontSize: 12, color: '#bbb' },
  location: { fontSize: 12, color: COLORS.gold, fontWeight: '600' },
  connectBtn: { borderWidth: 1.5, borderColor: COLORS.navy, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  connectBtnTxt: { fontSize: 12, fontWeight: '700', color: COLORS.navy },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  connectedTxt: { fontSize: 12, fontWeight: '700', color: COLORS.gold },
  content: { fontSize: 15, color: '#333', lineHeight: 23, marginBottom: 10 },
  image: { width: '100%', height: 220, borderRadius: 12, marginBottom: 10 },
  locationPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(201,169,110,0.08)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  locationPillTxt: { fontSize: 12, color: COLORS.gold, fontWeight: '600' },
  sharedCard: { borderWidth: 1.5, borderColor: '#f0ede8', borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: '#faf9f6' },
  actions: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f3ef', marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4 },
  actionTxt: { fontSize: 13, color: '#999', fontWeight: '500' },
});
EOF
echo "community.tsx done"

# ─── Step 5: Update Notifications screen to support clear ────────────────────
python3 - << 'PYEOF'
import os
notif_path = 'app/notifications.tsx'
if not os.path.exists(notif_path):
    print('notifications.tsx not found')
else:
    with open(notif_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add clearAll import if not there
    if 'clearAllNotifications' not in content:
        old_import = "} from '../src/lib/notificationsStore';"
        new_import = "  clearAllNotifications, clearNotification, markAllRead,\n} from '../src/lib/notificationsStore';"
        content = content.replace(old_import, new_import)

        # Add clear button to header area
        old_hdr = '<Text style={s.headerTitle}>Notifications</Text>'
        new_hdr = '''<Text style={s.headerTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => Alert.alert('Clear Notifications', 'What would you like to do?', [
              { text: 'Mark All Read', onPress: markAllRead },
              { text: 'Clear All', style: 'destructive', onPress: clearAllNotifications },
              { text: 'Cancel', style: 'cancel' },
            ])}>
              <Text style={{ fontSize: 13, color: COLORS.gold, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>'''
        content = content.replace(old_hdr, new_hdr)

        with open(notif_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('notifications.tsx updated')
    else:
        print('notifications.tsx already has clear')
PYEOF

echo "ALL DONE"
