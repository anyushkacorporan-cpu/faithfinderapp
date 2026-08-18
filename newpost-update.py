import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add ImagePicker import if missing
if "expo-image-picker" not in content:
    content = content.replace(
        "import { router } from 'expo-router';",
        "import { router } from 'expo-router';\nimport * as ImagePicker from 'expo-image-picker';"
    )
    print('ImagePicker imported')
else:
    print('ImagePicker already imported')

# 2. Add newPostImage state near newPostText
old_state = "  const [newPostText, setNewPostText] = useState('');"
new_state = "  const [newPostText, setNewPostText] = useState('');\n  const [newPostImage, setNewPostImage] = useState<string | null>(null);"
if old_state in content:
    content = content.replace(old_state, new_state)
    print('newPostImage state added')
else:
    print('WARNING: newPostText state not found')

# 3. Replace the visibility pills row with a single toggle icon button
old_vis_row = """                  <View style={s.visibilityRow}>
                    {(['public','connections'] as Visibility[]).map(v => (
                      <TouchableOpacity key={v} style={[s.visChip, visibility===v&&s.visChipActive]} onPress={() => setVisibility(v)}>
                        <Ionicons name={v==='public'?'earth-outline':'people-outline'} size={11} color={visibility===v?COLORS.white:COLORS.navy}/>
                        <Text style={[s.visChipTxt, visibility===v&&{color:COLORS.white}]}>{v==='public'?'Public':'Connections'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>"""

new_vis_row = """                  <TouchableOpacity
                    style={s.visToggle}
                    onPress={() => setVisibility(visibility === 'public' ? 'connections' : 'public')}
                  >
                    <Ionicons name={visibility==='public'?'earth':'people'} size={13} color={COLORS.navy}/>
                    <Text style={s.visToggleTxt}>{visibility==='public'?'Public':'Connections'}</Text>
                    <Ionicons name="swap-horizontal" size={13} color="#bbb"/>
                  </TouchableOpacity>"""

if old_vis_row in content:
    content = content.replace(old_vis_row, new_vis_row)
    print('Visibility pills converted to single toggle')
else:
    print('WARNING: visibility row not matched exactly')

# 4. Add visToggle style next to visibilityRow style
old_style = "  visibilityRow:{flexDirection:'row',gap:8},"
new_style = old_style + "\n  visToggle:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:12,paddingVertical:6,marginTop:2},\n  visToggleTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},"
if old_style in content:
    content = content.replace(old_style, new_style)
    print('visToggle style added')
else:
    print('WARNING: visibilityRow style not found')

# 5. Add image preview + attach button below the text input, before location toggle
old_anchor = """              <TextInput style={s.composeInput} placeholder="What's on your heart?" placeholderTextColor="#bbb" value={newPostText} onChangeText={setNewPostText} multiline autoFocus/>
              <View style={s.locationToggle}>"""

new_anchor = """              <TextInput style={s.composeInput} placeholder="What's on your heart?" placeholderTextColor="#bbb" value={newPostText} onChangeText={setNewPostText} multiline autoFocus/>

              {newPostImage && (
                <View style={{marginHorizontal:16,marginBottom:12,position:'relative'}}>
                  <Image source={{uri:newPostImage}} style={{width:'100%',height:200,borderRadius:14}} resizeMode="cover"/>
                  <TouchableOpacity
                    style={{position:'absolute',top:8,right:8,width:28,height:28,borderRadius:14,backgroundColor:'rgba(0,0,0,0.55)',alignItems:'center',justifyContent:'center'}}
                    onPress={() => setNewPostImage(null)}
                  >
                    <Ionicons name="close" size={16} color="#fff"/>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:14,alignSelf:'flex-start'}}
                onPress={async () => {
                  const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') return;
                  const result = await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,allowsEditing:true,quality:0.8});
                  if (!result.canceled) setNewPostImage(result.assets[0].uri);
                }}
              >
                <Ionicons name="image-outline" size={18} color={COLORS.gold}/>
                <Text style={{fontSize:13,fontWeight:'600',color:COLORS.gold}}>{newPostImage ? 'Change photo' : 'Add photo'}</Text>
              </TouchableOpacity>

              <View style={s.locationToggle}>"""

if old_anchor in content:
    content = content.replace(old_anchor, new_anchor)
    print('Image picker UI added')
else:
    print('WARNING: anchor for image picker not found')

# 6. Update handleCreatePost to include the image and reset it after posting
# Find handleCreatePost and add newPostImage to addPost call + reset
if 'newPostImage' in content:
    # Add image: newPostImage to addPost(...) call if not already present
    idx = content.find('function handleCreatePost')
    if idx != -1:
        call_idx = content.find('addPost({', idx)
        if call_idx != -1 and 'image:' not in content[call_idx:call_idx+400]:
            content = content.replace(
                content[call_idx:call_idx+9],
                "addPost({\n      image: newPostImage || undefined,",
                1
            )
            print('image field added to addPost call')
        # Reset newPostImage after posting (find setNewPostText(''))
        content = content.replace(
            "setNewPostText('');",
            "setNewPostText(''); setNewPostImage(null);"
        )
        print('newPostImage reset after posting')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
