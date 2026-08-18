import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Clean up the church profile photo banner section (remove duplicate relative views)
old_banner_mess = None
# Find everything between ') : (' and '{/* Actions row */}'
start = content.find('          ) : (\n')
end = content.find('          {/* Actions row */}')
if start != -1 and end != -1:
    old_banner_mess = content[start:end]
    new_banner = '''          ) : (
            <View style={{position:'relative'}}>
              <TouchableOpacity style={s.photoBanner} onPress={handleAddPhotoOptions} activeOpacity={0.85}>
                <LinearGradient colors={[COLORS.navy, '#2d2240']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
                <View style={s.photoUploadWrap}>
                  <View style={s.photoUploadIcon}>
                    <Ionicons name="camera" size={28} color={COLORS.gold} />
                  </View>
                  <Text style={s.photoUploadTitle}>Add Church Photos</Text>
                  <Text style={s.photoUploadSub}>Show your church to the community</Text>
                </View>
              </TouchableOpacity>
              <View style={{position:'absolute',top:16,right:16,flexDirection:'row',gap:8,zIndex:10}}>
                <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/notifications' as any)}>
                  <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/settings' as any)}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          '''
    content = content.replace(old_banner_mess, new_banner)
    print('Church banner fixed')
else:
    print('Church banner markers not found')

# Fix 2: Replace personal profile cover section with bigger cover + overlay icons
old_personal_cover = '''        <View style={s.coverWrap}>
          <View style={s.cover} />
          <TouchableOpacity style={s.addCoverBtn}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>Add cover</Text>
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||\'A\'}{user.lastName?.[0]?.toUpperCase()||\'J\'}</Text>
            </View>
          </View>
        </View>'''

new_personal_cover = '''        <View style={s.coverWrap}>
          <View style={s.cover} />
          {/* Notification + Settings icons overlaid on cover */}
          <View style={{position:'absolute',top:16,right:16,flexDirection:'row',gap:8,zIndex:10}}>
            <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.coverIconBtn} onPress={() => router.push('/settings' as any)}>
              <Ionicons name="settings-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.addCoverBtn}>
            <Ionicons name="camera-outline" size={14} color={COLORS.white} />
            <Text style={s.addCoverTxt}>Add cover</Text>
          </TouchableOpacity>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarTxt}>{user.firstName?.[0]?.toUpperCase()||\'A\'}{user.lastName?.[0]?.toUpperCase()||\'J\'}</Text>
            </View>
          </View>
        </View>'''

if old_personal_cover in content:
    content = content.replace(old_personal_cover, new_personal_cover)
    print('Personal cover fixed')
else:
    print('Personal cover not found')

# Fix 3: Make cover taller for personal profile
content = content.replace(
    "coverWrap:{position:'relative',height:160,marginBottom:40}",
    "coverWrap:{position:'relative',height:220,marginBottom:40}"
)
content = content.replace(
    "cover:{width:'100%',height:140,backgroundColor:COLORS.navy}",
    "cover:{width:'100%',height:200,backgroundColor:COLORS.navy}"
)

# Fix 4: Make connections button navigate to connections screen
content = content.replace(
    '<TouchableOpacity style={s.connectionsRow}>',
    "<TouchableOpacity style={s.connectionsRow} onPress={() => router.push('/connections' as any)}>"
)

# Fix 5: Remove sign out from personal profile
old_signout = '''        <TouchableOpacity style={s.signOutBtn} onPress={() => router.replace('/login')}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={s.signOutTxt}>Sign Out</Text>
        </TouchableOpacity>'''
content = content.replace(old_signout, '')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('ALL DONE')
