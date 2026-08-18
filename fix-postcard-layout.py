import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('src/components/PostCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the author row meta info: name on top, then city/state · time · globe on second line
old_meta = """          <TouchableOpacity onPress={onOpenProfile} style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <Text style={p.authorName}>{post.authorName}</Text>
            {post.authorType==='church'&&<View style={p.churchBadge}><Text style={p.churchBadgeTxt}>Church</Text></View>}
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Text style={p.time}>{post.time}</Text>
            {post.edited&&<Text style={p.time}> · Edited</Text>}
            {showLocation&&!!post.city&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}{post.state?`, ${post.state}`:''}</Text></>
            )}
          </View>"""

new_meta = """          <TouchableOpacity onPress={onOpenProfile} style={{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <Text style={p.authorName}>{post.authorName}</Text>
            {post.authorType==='church'&&<View style={p.churchBadge}><Text style={p.churchBadgeTxt}>Church</Text></View>}
          </TouchableOpacity>
          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            {showLocation&&!!post.city&&(
              <Text style={p.locationTxt}>{post.city}{post.state?`, ${post.state}`:''}</Text>
            )}
            {showLocation&&!!post.city&&<Text style={p.dot}>·</Text>}
            <Text style={p.time}>{post.time}</Text>
            {post.edited&&<Text style={p.time}> · Edited</Text>}
            <Ionicons name="globe-outline" size={11} color="#bbb"/>
          </View>"""

if old_meta in content:
    content = content.replace(old_meta, new_meta)
    print('Author row meta restructured')
else:
    print('ERROR: author row meta not found exactly')

# 2. Fix actions row: like+comment on left, repost on right
old_actions = """      <View style={p.actions}>
        <TouchableOpacity style={p.actionBtn} onPress={onLike}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?'#e74c6f':'#999'}/>
          <Text style={[p.actionTxt,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>{post.comments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="repeat-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>{post.repostsCount||0}</Text>
        </TouchableOpacity>
      </View>"""

new_actions = """      <View style={p.actions}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <TouchableOpacity style={p.actionBtn} onPress={onLike}>
            <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?'#e74c6f':'#999'}/>
            <Text style={[p.actionTxt,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={p.actionBtn} onPress={onComment}>
            <Ionicons name="chatbubble-outline" size={19} color="#999"/>
            <Text style={p.actionTxt}>{post.comments.length}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="repeat-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>{post.repostsCount||0}</Text>
        </TouchableOpacity>
      </View>"""

if old_actions in content:
    content = content.replace(old_actions, new_actions)
    print('Actions row restructured: like+comment left, repost right')
else:
    print('ERROR: actions row not found exactly')

# 3. Update actions style to use space-between instead of equal flex
old_actions_style = "  actions:{flexDirection:'row',alignItems:'center',paddingTop:14,borderTopWidth:1,borderTopColor:'#f5f3ef',marginTop:4},"
new_actions_style = "  actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:14,borderTopWidth:1,borderTopColor:'#f5f3ef',marginTop:4},"

if old_actions_style in content:
    content = content.replace(old_actions_style, new_actions_style)
    print('Actions style updated to space-between')
else:
    print('ERROR: actions style not found exactly')

# 4. Update actionBtn style - remove flex:1 so buttons don't stretch
old_btn_style = "  actionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:6},"
new_btn_style = "  actionBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:6,paddingHorizontal:12,backgroundColor:'#f5f3ef',borderRadius:100},"

if old_btn_style in content:
    content = content.replace(old_btn_style, new_btn_style)
    print('ActionBtn style updated (removed flex:1, added pill style)')
else:
    print('ERROR: actionBtn style not found exactly')

with open('src/components/PostCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
