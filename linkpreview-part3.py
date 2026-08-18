import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert the link preview display right after the post content/image block in PostCard
old_anchor = """      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="cover"/>}"""

new_anchor = """      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="cover"/>}

      {!post.repostOf&&!!post.linkPreview&&!!post.linkUrl&&(
        <TouchableOpacity
          style={{borderWidth:1,borderColor:'#f0ede8',borderRadius:14,overflow:'hidden',marginBottom:10,backgroundColor:'#faf9f6'}}
          onPress={() => require('react-native').Linking.openURL(post.linkUrl!).catch(()=>{})}
          activeOpacity={0.85}
        >
          {!!post.linkPreview.image && (
            <Image source={{uri:post.linkPreview.image}} style={{width:'100%',height:160}} resizeMode="cover"/>
          )}
          <View style={{padding:12}}>
            {!!post.linkPreview.siteName && (
              <Text style={{fontSize:11,color:COLORS.gold,fontWeight:'700',textTransform:'uppercase',marginBottom:2}}>{post.linkPreview.siteName}</Text>
            )}
            {!!post.linkPreview.title && (
              <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={2}>{post.linkPreview.title}</Text>
            )}
            {!!post.linkPreview.description && (
              <Text style={{fontSize:12,color:'#888',marginTop:3}} numberOfLines={2}>{post.linkPreview.description}</Text>
            )}
          </View>
        </TouchableOpacity>
      )}"""

if old_anchor in content:
    content = content.replace(old_anchor, new_anchor)
    print('Link preview display added to PostCard')
else:
    print('ERROR: anchor not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
