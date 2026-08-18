import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('src/components/PostCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useState/useEffect import + Dimensions for width calc
old_import = "import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';"
new_import = "import { useState, useEffect } from 'react';\nimport { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('Imports updated')
else:
    print('ERROR: react-native import not found')

# 2. Add a small helper component that measures the image and renders it at the correct aspect ratio
helper_component = """
const SCREEN_WIDTH = Dimensions.get('window').width;

function PostImage({ uri, style }: { uri: string; style?: any }) {
  const [aspectRatio, setAspectRatio] = useState(1);
  useEffect(() => {
    Image.getSize(
      uri,
      (w, h) => { if (w > 0 && h > 0) setAspectRatio(w / h); },
      () => {}
    );
  }, [uri]);
  const containerWidth = SCREEN_WIDTH - 36 - 18 * 2 + 18 * 2; // matches card horizontal margins/padding
  const maxHeight = 420;
  const minHeight = 160;
  let height = containerWidth / aspectRatio;
  if (height > maxHeight) height = maxHeight;
  if (height < minHeight) height = minHeight;
  return (
    <Image
      source={{ uri }}
      style={[{ width: '100%', height, borderRadius: 16, backgroundColor: '#f5f3ef', marginBottom: 14 }, style]}
      resizeMode="cover"
    />
  );
}
"""

# Insert helper right after imports, before the PostCard function
fn_idx = content.find('export function PostCard(')
if fn_idx != -1:
    content = content[:fn_idx] + helper_component + '\n' + content[fn_idx:]
    print('PostImage helper component added')
else:
    print('ERROR: PostCard function not found')

# 3. Replace the three places a raw post image <Image> is rendered with <PostImage>
old_main_img = '{!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="contain"/>}'
new_main_img = '{!post.repostOf&&!!post.image&&<PostImage uri={post.image} />}'
if old_main_img in content:
    content = content.replace(old_main_img, new_main_img)
    print('Main post image switched to PostImage')
else:
    print('WARNING: main image line not found exactly')

old_repost_img = "{!!post.repostOf.image&&<Image source={{uri:post.repostOf.image}} style={{width:'100%',height:220,borderRadius:10,marginTop:8,backgroundColor:'#f5f3ef'}} resizeMode=\"contain\"/>}"
new_repost_img = "{!!post.repostOf.image&&<PostImage uri={post.repostOf.image} style={{marginTop:8,marginBottom:0}} />}"
if old_repost_img in content:
    content = content.replace(old_repost_img, new_repost_img)
    print('Repost image switched to PostImage')
else:
    print('WARNING: repost image line not found exactly')

with open('src/components/PostCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
