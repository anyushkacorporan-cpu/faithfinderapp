import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== profile.tsx changes =====
with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove "Not set — tap Edit to add" placeholder rows for website and email
old_website_row = """              {user.website ? (
                <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(user.website!).catch(()=>{})}>
                  <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={COLORS.gold} /></View>
                  <Text style={[s.infoTxt, {color:COLORS.gold}]}>{user.website}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color='#bbb' /></View>
                  <Text style={s.infoTxtMuted}>WEBSITE{'\n'}Not set — tap Edit to add</Text>
                </View>
              )}"""
new_website_row = """              {!!user.website && (
                <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(user.website!).catch(()=>{})}>
                  <View style={s.infoIconWrap}><Ionicons name="globe-outline" size={18} color={COLORS.gold} /></View>
                  <Text style={[s.infoTxt, {color:COLORS.gold}]}>{user.website}</Text>
                </TouchableOpacity>
              )}"""
if old_website_row in content:
    content = content.replace(old_website_row, new_website_row)
    print('Website placeholder removed')
else:
    print('WARNING: website row not found exactly')

old_email_row = """              {user.churchEmail ? (
                <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL('mailto:' + user.churchEmail).catch(()=>{})}>
                  <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color={COLORS.navy} /></View>
                  <Text style={s.infoTxt}>{user.churchEmail}</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.infoRow}>
                  <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color='#bbb' /></View>
                  <Text style={s.infoTxtMuted}>EMAIL{'\n'}Not set — tap Edit to add</Text>
                </View>
              )}"""
new_email_row = """              {!!user.churchEmail && (
                <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL('mailto:' + user.churchEmail).catch(()=>{})}>
                  <View style={s.infoIconWrap}><Ionicons name="mail-outline" size={18} color={COLORS.navy} /></View>
                  <Text style={s.infoTxt}>{user.churchEmail}</Text>
                </TouchableOpacity>
              )}"""
if old_email_row in content:
    content = content.replace(old_email_row, new_email_row)
    print('Email placeholder removed')
else:
    print('WARNING: email row not found exactly')

# 2. Remove Activity tab from CHURCH_TABS
old_church_tabs = "const CHURCH_TABS = ['Posts', 'Events', 'Members'];"
new_church_tabs = "const CHURCH_TABS = ['Posts', 'Events', 'Members'];"
# CHURCH_TABS already doesn't have Activity - check PERSONAL_TABS
old_personal_tabs = "const PERSONAL_TABS = ['Posts', 'Activity'];"
new_personal_tabs = "const PERSONAL_TABS = ['Posts'];"
if old_personal_tabs in content:
    content = content.replace(old_personal_tabs, new_personal_tabs)
    print('Activity tab removed from personal tabs')
else:
    print('WARNING: PERSONAL_TABS not found')

# 3. Remove the Activity tab render blocks (both church and personal)
old_activity_church = """          {activeTab === 'Activity' && (
            <ActivityTabContent />
          )}"""
if old_activity_church in content:
    content = content.replace(old_activity_church, '')
    print('Activity tab render removed from church profile')
else:
    print('WARNING: church Activity tab render not found')

old_activity_personal = """        {activeTab === 'Activity' && (
          <ActivityTabContent />
        )}"""
if old_activity_personal in content:
    content = content.replace(old_activity_personal, '')
    print('Activity tab render removed from personal profile')
else:
    print('WARNING: personal Activity tab render not found')

# 4. Add "See Activity" link after the posts section in church profile
old_posts_end = """          {activeTab === 'Posts' && (
            myPosts.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="document-text-outline" size={40} color="#ddd" />
                <Text style={s.emptyTxt}>No posts yet</Text>
                <Text style={s.emptySub}>Your posts will appear here</Text>
              </View>
            ) : (
              <View style={{gap:0,paddingTop:12}}>
                {myPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showLocation={!!(post.city && post.state)}
                    onLike={() => toggleLike(post.id)}
                    onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                    onShare={() => {}}
                    onOpenProfile={() => {}}
                    isOwnPost={true}
                  />
                ))}
              </View>
            )
          )}"""

new_posts_end = """          {activeTab === 'Posts' && (
            <>
              {myPosts.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color="#ddd" />
                  <Text style={s.emptyTxt}>No posts yet</Text>
                  <Text style={s.emptySub}>Your posts will appear here</Text>
                </View>
              ) : (
                <View style={{gap:0,paddingTop:12}}>
                  {myPosts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      showLocation={!!(post.city && post.state)}
                      onLike={() => toggleLike(post.id)}
                      onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                      onShare={() => {}}
                      onOpenProfile={() => {}}
                      isOwnPost={true}
                    />
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:20,paddingVertical:16}}
                onPress={() => router.push('/activity' as any)}
              >
                <Ionicons name="pulse-outline" size={16} color={COLORS.gold} />
                <Text style={{fontSize:13,color:COLORS.gold,fontWeight:'600'}}>See Activity</Text>
              </TouchableOpacity>
            </>
          )}"""

if old_posts_end in content:
    content = content.replace(old_posts_end, new_posts_end)
    print('See Activity link added after posts')
else:
    print('WARNING: posts section not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - profile.tsx')

# ===== community.tsx: add pull-to-refresh =====
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add RefreshControl to import
old_rn_import = "import { View, Text, TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert, Image, ActivityIndicator} from 'react-native';"
new_rn_import = "import { View, Text, TextInput, Modal, KeyboardAvoidingView, Platform, Share, Alert, Image, ActivityIndicator, RefreshControl} from 'react-native';"
if old_rn_import in content:
    content = content.replace(old_rn_import, new_rn_import)
    print('RefreshControl imported')
else:
    print('WARNING: RN import not found exactly')

# Add refreshing state near other state declarations
old_state = "  const [isPosting, setIsPosting] = useState(false);"
new_state = "  const [isPosting, setIsPosting] = useState(false);\n  const [refreshing, setRefreshing] = useState(false);\n\n  async function handleRefresh() {\n    setRefreshing(true);\n    await new Promise(r => setTimeout(r, 800));\n    setRefreshing(false);\n  }"
if old_state in content:
    content = content.replace(old_state, new_state)
    print('Refresh state + handler added')
else:
    print('WARNING: isPosting state not found')

# Add RefreshControl to the ScrollView
old_scroll = "        <ScrollView style={s.feed} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps=\"handled\">"
new_scroll = "        <ScrollView style={s.feed} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps=\"handled\" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} colors={[COLORS.gold]} />}>"
if old_scroll in content:
    content = content.replace(old_scroll, new_scroll)
    print('Pull-to-refresh added to community ScrollView')
else:
    print('WARNING: community ScrollView not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - community.tsx')
