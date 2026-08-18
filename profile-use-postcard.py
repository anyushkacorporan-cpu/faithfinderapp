import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Import the shared PostCard + toggleLike (so likes work the same as Community)
old_import = "import { usePosts } from '../../src/lib/postsStore';"
new_import = "import { usePosts, toggleLike } from '../../src/lib/postsStore';\nimport { PostCard } from '../../src/components/PostCard';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('PostCard + toggleLike imported')
else:
    print('ERROR: usePosts import not found')

# 2. Replace the simplified card markup (the real, rendering one at ~line 494) with PostCard
old_block = """            <View style={{paddingHorizontal:16,paddingTop:16,gap:12}}>
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
            </View>"""

new_block = """            <View>
              {myPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  showLocation={true}
                  isOwnPost={true}
                  onLike={() => toggleLike(post.id)}
                  onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
                  onShare={() => {}}
                  onOpenProfile={() => {}}
                />
              ))}
            </View>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print('Posts tab now uses shared PostCard component')
else:
    print('ERROR: target block not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
