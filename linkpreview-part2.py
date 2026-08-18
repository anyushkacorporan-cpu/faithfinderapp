import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import the link preview utility
if 'linkPreview' not in content[:2000]:
    content = content.replace(
        "import * as ImagePicker from 'expo-image-picker';",
        "import * as ImagePicker from 'expo-image-picker';\nimport { extractFirstUrl, fetchLinkPreview, LinkPreviewData } from '../../src/lib/linkPreview';"
    )
    print('linkPreview util imported')
else:
    print('already imported')

# 2. Add state for detected link preview in compose modal
old_state = "  const [newPostImage, setNewPostImage] = useState<string | null>(null);"
new_state = """  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [linkPreviewData, setLinkPreviewData] = useState<LinkPreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print('Link preview state added')
else:
    print('WARNING: newPostImage state not found')

# 3. Add a useEffect-like debounce: detect URL on text change.
# Since onChangeText is inline, wrap it to also trigger detection.
old_textinput = '<TextInput style={s.composeInput} placeholder="What\'s on your heart?" placeholderTextColor="#bbb" value={newPostText} onChangeText={setNewPostText} multiline autoFocus/>'

new_textinput = '''<TextInput
                style={s.composeInput}
                placeholder="What's on your heart?"
                placeholderTextColor="#bbb"
                value={newPostText}
                onChangeText={(t) => {
                  setNewPostText(t);
                  const url = extractFirstUrl(t);
                  if (url && url !== detectedUrl) {
                    setDetectedUrl(url);
                    setLoadingPreview(true);
                    setLinkPreviewData(null);
                    fetchLinkPreview(url).then(data => {
                      setLinkPreviewData(data);
                      setLoadingPreview(false);
                    });
                  } else if (!url && detectedUrl) {
                    setDetectedUrl(null);
                    setLinkPreviewData(null);
                  }
                }}
                multiline
                autoFocus
              />'''

if old_textinput in content:
    content = content.replace(old_textinput, new_textinput)
    print('TextInput wired with link detection')
else:
    print('WARNING: TextInput block not matched exactly')

# 4. Show a loading state + preview card under the image picker button, before location toggle
old_anchor = """              <TouchableOpacity
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

new_anchor = """              <TouchableOpacity
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

              {loadingPreview && (
                <View style={{flexDirection:'row',alignItems:'center',gap:8,marginHorizontal:16,marginBottom:14}}>
                  <ActivityIndicator size="small" color={COLORS.gold}/>
                  <Text style={{fontSize:12,color:'#999'}}>Fetching link preview...</Text>
                </View>
              )}

              {linkPreviewData && !loadingPreview && (
                <View style={{marginHorizontal:16,marginBottom:14,borderWidth:1,borderColor:'#f0ede8',borderRadius:14,overflow:'hidden',backgroundColor:'#faf9f6'}}>
                  {!!linkPreviewData.image && (
                    <Image source={{uri:linkPreviewData.image}} style={{width:'100%',height:160}} resizeMode="cover"/>
                  )}
                  <View style={{padding:12}}>
                    {!!linkPreviewData.siteName && (
                      <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700',textTransform:'uppercase',marginBottom:2}}>{linkPreviewData.siteName}</Text>
                    )}
                    {!!linkPreviewData.title && (
                      <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={2}>{linkPreviewData.title}</Text>
                    )}
                    {!!linkPreviewData.description && (
                      <Text style={{fontSize:12,color:'#888',marginTop:3}} numberOfLines={2}>{linkPreviewData.description}</Text>
                    )}
                  </View>
                </View>
              )}

              <View style={s.locationToggle}>"""

if old_anchor in content:
    content = content.replace(old_anchor, new_anchor)
    print('Link preview card UI added to compose modal')
else:
    print('WARNING: anchor for preview card not found')

# 5. Add ActivityIndicator to react-native import
import re
m = re.search(r"import\s*\{([^}]*)\}\s*from\s*'react-native';", content)
if m and 'ActivityIndicator' not in m.group(1):
    inner = m.group(1).rstrip()
    if not inner.endswith(','):
        inner += ','
    inner += ' ActivityIndicator'
    content = content.replace(m.group(0), f"import {{{inner}}} from 'react-native';")
    print('ActivityIndicator imported')

# 6. Wire linkUrl/linkPreview into the addPost() call and reset state after posting
content = content.replace(
    "image: newPostImage || undefined,",
    "image: newPostImage || undefined,\n      linkUrl: detectedUrl || undefined,\n      linkPreview: linkPreviewData || undefined,"
)
content = content.replace(
    "setNewPostText(''); setNewPostImage(null);",
    "setNewPostText(''); setNewPostImage(null); setDetectedUrl(null); setLinkPreviewData(null);"
)
print('Link data wired into addPost + reset')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 2 (compose modal) complete')
