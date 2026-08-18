import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the camera badge positioning by wrapping avatar + badge in a relatively-sized View
old_avatar_block = """          <TouchableOpacity style={s.avatarWrap} onPress={async () => {
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
          </TouchableOpacity>"""

new_avatar_block = """          <View style={s.avatarWrap}>
            <TouchableOpacity style={{width:90,height:90}} onPress={async () => {
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
            </TouchableOpacity>
          </View>"""

if old_avatar_block in content:
    content = content.replace(old_avatar_block, new_avatar_block)
    print('Camera badge positioning fixed (now relative to avatar circle, not full width)')
else:
    print('ERROR: avatar block not found exactly')

# 2. Fix the empty location row - only show the row if a location actually exists
old_location = """          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={14} color="#888" />
            <Text style={s.locationTxt}>{user.location || ''}</Text>
          </View>"""

new_location = """          {!!user.location && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={s.locationTxt}>{user.location}</Text>
            </View>
          )}"""

if old_location in content:
    content = content.replace(old_location, new_location)
    print('Empty location row now hidden when no location is set')
else:
    print('ERROR: location row not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
