import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove debug log we added earlier
old_debug = "    console.log('DEBUG handleCreatePost user.location:', user.location, 'showLocation:', showLocation);\n"
if old_debug in content:
    content = content.replace(old_debug, '')
    print('Debug log removed')

# 2. Remove the duplicate location pill below the repost block (keep only header location)
old_pill = """      {showLocation&&post.city&&post.state&&(
        <View style={p.locationPill}>
          <Ionicons name="location" size={12} color={COLORS.gold}/>
          <Text style={p.locationPillTxt}>{post.city}, {post.state}</Text>
        </View>
      )}

      {post.eventShareData&&("""

new_pill = """      {post.eventShareData&&("""

if old_pill in content:
    content = content.replace(old_pill, new_pill)
    print('Duplicate location pill removed')
else:
    print('WARNING: location pill block not found exactly')

# 3. Fix image cropping - change resizeMode from 'cover' to 'contain' with auto height,
#    and give it a background so contain mode doesn't look broken on non-square images.
old_img_style = "  image:{width:'100%',height:220,borderRadius:12,marginBottom:10},"
new_img_style = "  image:{width:'100%',height:280,borderRadius:12,marginBottom:10,backgroundColor:'#f5f3ef'},"
if old_img_style in content:
    content = content.replace(old_img_style, new_img_style)
    print('Image style updated (taller box, neutral bg)')
else:
    print('WARNING: image style not found exactly')

old_img_render = "{!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode=\"cover\"/>}"
new_img_render = "{!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode=\"contain\"/>}"
if old_img_render in content:
    content = content.replace(old_img_render, new_img_render)
    print('Post image render mode set to contain')
else:
    print('WARNING: image render line not found exactly')

# Also fix the repostOf image, for consistency (reposted images shouldn't crop either)
old_repost_img = '<Image source={{uri:post.repostOf.image}} style={{width:\'100%\',height:180,borderRadius:10,marginTop:8}} resizeMode="cover"/>'
new_repost_img = '<Image source={{uri:post.repostOf.image}} style={{width:\'100%\',height:220,borderRadius:10,marginTop:8,backgroundColor:\'#f5f3ef\'}} resizeMode="contain"/>'
if old_repost_img in content:
    content = content.replace(old_repost_img, new_repost_img)
    print('Repost image render mode fixed')
else:
    print('WARNING: repost image line not found exactly')

# 4. Fix own-post location: ensure user.location is actually being read with a fallback
# to user.city/user.state if location string isn't set, and that the toggle default matches.
old_create = """      city: showLocation ? user.location?.split(',')[0]?.trim() : undefined,
      state: showLocation ? user.location?.split(',')[1]?.trim() : undefined,"""

new_create = """      city: showLocation ? (user.location?.split(',')[0]?.trim() || (user as any).city) : undefined,
      state: showLocation ? (user.location?.split(',')[1]?.trim() || (user as any).state) : undefined,"""

if old_create in content:
    content = content.replace(old_create, new_create)
    print('addPost city/state now falls back to user.city/state if location string is empty')
else:
    print('WARNING: addPost city/state lines not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
