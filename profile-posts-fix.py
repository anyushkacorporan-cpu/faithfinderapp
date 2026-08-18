import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import for usePosts
old_import = "import { useConnections, useConnectionCount, removeConnection } from '../../src/lib/connectionsStore';"
new_import = old_import + "\nimport { usePosts } from '../../src/lib/postsStore';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('usePosts imported')
else:
    print('ERROR: import anchor not found')

# 2. Compute displayName + myPosts right after user/activeTab declarations
old_decl = "  const user = useUser();\n  const [activeTab, setActiveTab] = useState('Posts');"
new_decl = """  const user = useUser();
  const [activeTab, setActiveTab] = useState('Posts');
  const allPosts = usePosts();
  const displayName = user.accountType === 'church'
    ? (user.churchName || 'Church')
    : ((user.firstName || 'You') + ' ' + (user.lastName || '')).trim();
  const myPosts = allPosts.filter(p => p.authorName === displayName);"""

if old_decl in content:
    content = content.replace(old_decl, new_decl)
    print('myPosts computed')
else:
    print('ERROR: user/activeTab declaration not found')

# 3. Replace the empty Posts tab block with a real post list (personal profile section)
old_posts_block = """          {activeTab === 'Posts' && (
            <View style={s.emptyState}>
              <Ionicons name="document-text-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No posts yet</Text>
              <Text style={s.emptySub}>Your posts will appear here</Text>
            </View>
          )}"""

new_posts_block = """          {activeTab === 'Posts' && (
            myPosts.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="document-text-outline" size={40} color="#ddd" />
                <Text style={s.emptyTxt}>No posts yet</Text>
                <Text style={s.emptySub}>Your posts will appear here</Text>
              </View>
            ) : (
              <View style={{paddingHorizontal:16,gap:12}}>
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
          )}"""

if old_posts_block in content:
    content = content.replace(old_posts_block, new_posts_block)
    print('Posts tab now renders real posts')
else:
    print('ERROR: posts tab block not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
