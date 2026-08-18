import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Make cover photo tappable to pick image
old_cover = '''          <View style={s.cover} />

          <TouchableOpacity style={s.addCoverBtn}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>Add cover</Text>
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||'A'}{user.lastName?.[0]?.toUpperCase()||'J'}</Text>
            </View>
          </View>'''

new_cover = '''          {user.coverPhoto
            ? <Image source={{uri:user.coverPhoto}} style={{width:'100%',height:200}} resizeMode="cover"/>
            : <View style={s.cover} />
          }
          <TouchableOpacity style={s.addCoverBtn} onPress={async () => {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[16,9],quality:0.8});
            if (!result.canceled) setUser({coverPhoto:result.assets[0].uri});
          }}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>{user.coverPhoto ? 'Change cover' : 'Add cover'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.avatarWrap} onPress={async () => {
            const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.8});
            if (!result.canceled) setUser({profilePhoto:result.assets[0].uri});
          }}>
            {user.profilePhoto
              ? <Image source={{uri:user.profilePhoto}} style={[s.avatar,{overflow:'hidden'}]} resizeMode="cover"/>
              : <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||'A'}{user.lastName?.[0]?.toUpperCase()||'J'}</Text>
                </View>
            }
            <View style={{position:'absolute',bottom:0,right:0,width:24,height:24,borderRadius:12,backgroundColor:COLORS.navy,borderWidth:2,borderColor:COLORS.white,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="camera" size={12} color={COLORS.white}/>
            </View>
          </TouchableOpacity>'''

if old_cover in content:
    content = content.replace(old_cover, new_cover)
    print('Cover + profile photo fixed')
else:
    print('WARNING: cover section not found')

# Fix 2: Replace CHURCH_TABS with PERSONAL_TABS in the personal profile section
# The personal profile section is using CHURCH_TABS by mistake
old_tabs = '''tabsRow}>
            {CHURCH_TABS.map(t => (
              <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.emptyState}>
            <Ionicons name={activeTab==='Posts' ? 'document-text-outline' : activeTab==='Events' ? 'calendar-outline' : 'people-outline'} size={40} color="#ddd" />
            <Text style={s.emptyTxt}>No {activeTab.toLowerCase()} yet</Text>
            <Text style={s.emptySub}>{activeTab==='Posts' ? 'Share announcements with your community' : activeTab==='Events' ? 'Create events for your congregation' : 'Members will appear here when they connect'}</Text>
          </View>'''

new_tabs = '''tabsRow}>
            {PERSONAL_TABS.map(t => (
              <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Posts' && (
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No posts yet</Text>
              <Text style={s.emptySub}>Your posts will appear here</Text>
            </View>
          )}
          {activeTab === 'Activity' && (
            <View style={s.emptyState}>
              <Ionicons name="pulse-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No activity yet</Text>
              <Text style={s.emptySub}>Your likes and comments will appear here</Text>
            </View>
          )}
          {activeTab === 'Saved' && (
            <View style={s.emptyState}>
              <Ionicons name="bookmark-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No saved posts yet</Text>
              <Text style={s.emptySub}>Posts you save will appear here</Text>
            </View>
          )}'''

if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print('Personal tabs fixed')
else:
    print('WARNING: tabs section not found')

# Fix 3: Remove sign out from personal profile
old_signout = '''          {/* Sign out */}
          <TouchableOpacity style={s.signOutBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
            <Text style={s.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>'''
content = content.replace(old_signout, '')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
