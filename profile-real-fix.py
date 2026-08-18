import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the three debug console.log lines we added earlier
old_debug = """  const myPosts = allPosts.filter(p => p.authorName === displayName);
  console.log('PROFILE DEBUG displayName:', JSON.stringify(displayName));
  console.log('PROFILE DEBUG allPosts authorNames:', allPosts.map(p => JSON.stringify(p.authorName)));
  console.log('PROFILE DEBUG myPosts count:', myPosts.length);"""
new_debug = "  const myPosts = allPosts.filter(p => p.authorName === displayName);"
if old_debug in content:
    content = content.replace(old_debug, new_debug)
    print('Debug logs removed')
else:
    print('WARNING: debug log block not found exactly')

# 2. Replace the real (working) personal-profile empty-state block
old_block = """        <View style={s.emptyState}>
          <Ionicons name={activeTab==='Posts' ? 'document-text-outline' : 'pulse-outline'} size={40} color="#ddd" />
          <Text style={s.emptyTxt}>No {activeTab.toLowerCase()} yet</Text>
        </View>"""

new_block = """        {activeTab === 'Posts' && (
          myPosts.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No posts yet</Text>
              <Text style={s.emptySub}>Your posts will appear here</Text>
            </View>
          ) : (
            <View style={{paddingHorizontal:16,paddingTop:16,gap:12}}>
              {myPosts.map(post => (
                <View key={post.id} style={{borderWidth:1,borderColor:'#f0ede8',borderRadius:14,padding:14,backgroundColor:COLORS.white}}>
                  <Text style={{fontSize:12,color:'#bbb',marginBottom:6}}>{post.time}</Text>
                  {!!post.content && <Text style={{fontSize:14,color:COLORS.navy,lineHeight:20,marginBottom:post.image?8:0}}>{post.content}</Text>}
                  {!!post.image && (
                    <Image source={{uri:post.image}} style={{width:'100%',height:200,borderRadius:10,backgroundColor:'#f5f3ef'}} resizeMode="contain"/>
                  )}
                  <View style={{flexDirection:'row',gap:16,marginTop:10}}>
                    <Text style={{fontSize:12,color:'#999'}}>❤️ {post.likes}</Text>
                    <Text style={{fontSize:12,color:'#999'}}>💬 {post.comments.length}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        )}
        {activeTab === 'Activity' && (
          myAttendingEvents.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="pulse-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No activity yet</Text>
              <Text style={s.emptySub}>Events you attend will appear here</Text>
            </View>
          ) : (
            <View style={{paddingHorizontal:16,paddingTop:16,gap:12}}>
              {myAttendingEvents.map((event: any) => (
                <TouchableOpacity
                  key={event.id}
                  style={{borderWidth:1,borderColor:'#f0ede8',borderRadius:14,padding:14,backgroundColor:COLORS.white,flexDirection:'row',alignItems:'center',gap:12}}
                  onPress={() => router.push({pathname:'/event-detail' as any,params:{id:event.id}})}
                >
                  <View style={{width:40,height:40,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="calendar" size={18} color={COLORS.gold}/>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={1}>{event.title}</Text>
                    <Text style={{fontSize:12,color:'#999',marginTop:2}}>{event.date}{event.location?' · '+event.location:''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ddd"/>
                </TouchableOpacity>
              ))}
            </View>
          )
        )}"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print('Real personal-profile Posts/Activity block fixed')
else:
    print('ERROR: target block not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
