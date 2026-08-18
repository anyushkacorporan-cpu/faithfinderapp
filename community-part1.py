import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports to include new store functions
old_import = None
for line in content.split('\n')[:30]:
    if 'postsStore' in line:
        old_import = line
        break
print('Found import line:', repr(old_import))

if old_import and 'editPost' not in old_import:
    # add the new functions to the existing import
    new_import = old_import.rstrip()
    # insert before the closing "} from"
    if new_import.endswith("from '../../src/lib/postsStore';") or "from '../../src/lib/postsStore'" in new_import:
        new_import = new_import.replace(
            " } from '../../src/lib/postsStore';",
            ", editPost, deletePost, reportPost, repostPost } from '../../src/lib/postsStore';"
        )
    content = content.replace(old_import, new_import)
    print('Import updated')

# 2. Add state for menus near showCreate state
old_state = "  const [showCreate, setShowCreate] = useState(false);"
new_state = """  const [showCreate, setShowCreate] = useState(false);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [reportPostTarget, setReportPostTarget] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editText, setEditText] = useState('');
  const [repostTarget, setRepostTarget] = useState<Post | null>(null);
  const [repostComment, setRepostComment] = useState('');"""

if old_state in content:
    content = content.replace(old_state, new_state)
    print('State variables added')
else:
    print('WARNING: showCreate state not found exactly, trying alt')

# 3. Update <PostCard> usage to pass new handlers + current user identity
old_postcard = """        {posts.map(post => (
          <PostCard key={post.id} post={post} showLocation={activeTab === 'discover'}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => { setSharePost(post); setShareMessage(''); }}
            onOpenProfile={() => openProfile(post)}
          />
        ))}"""

new_postcard = """        {posts.map(post => (
          <PostCard key={post.id} post={post} showLocation={activeTab === 'discover'}
            isOwnPost={post.authorName === displayName}
            onLike={() => toggleLike(post.id)}
            onComment={() => router.push({ pathname: '/comments' as any, params: { postId: post.id } })}
            onShare={() => { setSharePost(post); setShareMessage(''); }}
            onOpenProfile={() => openProfile(post)}
            onMenu={() => setMenuPost(post)}
            onRepost={() => { setRepostTarget(post); setRepostComment(''); }}
          />
        ))}"""

if old_postcard in content:
    content = content.replace(old_postcard, new_postcard)
    print('PostCard usage updated')
else:
    print('WARNING: PostCard usage block not matched exactly')

# 4. Update PostCard function signature and add menu button + repost rendering
old_sig = """function PostCard({post,showLocation,onLike,onComment,onShare,onOpenProfile}:{
  post:Post; showLocation:boolean; onLike:()=>void; onComment:()=>void; onShare:()=>void; onOpenProfile:()=>void;
}) {"""

new_sig = """function PostCard({post,showLocation,onLike,onComment,onShare,onOpenProfile,isOwnPost,onMenu,onRepost}:{
  post:Post; showLocation:boolean; onLike:()=>void; onComment:()=>void; onShare:()=>void; onOpenProfile:()=>void;
  isOwnPost?:boolean; onMenu?:()=>void; onRepost?:()=>void;
}) {"""

if old_sig in content:
    content = content.replace(old_sig, new_sig)
    print('PostCard signature updated')
else:
    print('WARNING: PostCard signature not matched exactly')

# 5. Add the three-dot menu button to the author row (top right)
old_authorrow_end = """          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Text style={p.time}>{post.time}</Text>
            {showLocation&&post.city&&post.state&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}, {post.state}</Text></>
            )}
          </View>
        </View>
      </View>"""

new_authorrow_end = """          <View style={{flexDirection:'row',alignItems:'center',gap:4,flexWrap:'wrap'}}>
            <Text style={p.time}>{post.time}</Text>
            {post.edited&&<Text style={p.time}> · Edited</Text>}
            {showLocation&&post.city&&post.state&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}, {post.state}</Text></>
            )}
          </View>
        </View>
        {onMenu&&(
          <TouchableOpacity onPress={onMenu} style={{padding:6}}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#bbb"/>
          </TouchableOpacity>
        )}
      </View>"""

if old_authorrow_end in content:
    content = content.replace(old_authorrow_end, new_authorrow_end)
    print('Three-dot menu button added')
else:
    print('WARNING: author row end not matched exactly')

# 6. Add repost display block - render repostOf content + repostComment
# Insert right after the content+image block, before the locationPill
old_content_block = """      {!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="cover"/>}"""

new_content_block = """      {!!post.repostComment&&<Text style={p.content}>{post.repostComment}</Text>}
      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!post.repostOf&&!!post.image&&<Image source={{uri:post.image}} style={p.image} resizeMode="cover"/>}

      {!!post.repostOf&&(
        <View style={p.repostCard}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
            {post.repostOf.authorPhoto
              ? <Image source={{uri:post.repostOf.authorPhoto}} style={{width:28,height:28,borderRadius:14}} resizeMode="cover"/>
              : <View style={{width:28,height:28,borderRadius:14,backgroundColor:post.repostOf.authorColor,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#fff',fontSize:11,fontWeight:'700'}}>{post.repostOf.authorInitials}</Text>
                </View>
            }
            <View style={{flex:1}}>
              <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{post.repostOf.authorName}</Text>
              <Text style={{fontSize:11,color:'#bbb'}}>{post.repostOf.time}</Text>
            </View>
          </View>
          {!!post.repostOf.content&&<Text style={{fontSize:14,color:'#333',lineHeight:21}}>{post.repostOf.content}</Text>}
          {!!post.repostOf.image&&<Image source={{uri:post.repostOf.image}} style={{width:'100%',height:180,borderRadius:10,marginTop:8}} resizeMode="cover"/>}
        </View>
      )}"""

if old_content_block in content:
    content = content.replace(old_content_block, new_content_block)
    print('Repost display block added')
else:
    print('WARNING: content block not matched exactly')

# 7. Add Repost button to actions row (alongside Like/Comment/Share)
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
          <Ionicons name="share-social-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>"""

new_actions = """      <View style={p.actions}>
        <TouchableOpacity style={p.actionBtn} onPress={onLike}>
          <Ionicons name={post.liked?'heart':'heart-outline'} size={20} color={post.liked?'#e74c6f':'#999'}/>
          <Text style={[p.actionTxt,post.liked&&{color:'#e74c6f'}]}>{post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={p.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>{post.comments.length}</Text>
        </TouchableOpacity>
        {onRepost&&(
          <TouchableOpacity style={p.actionBtn} onPress={onRepost}>
            <Ionicons name="repeat-outline" size={19} color="#999"/>
            <Text style={p.actionTxt}>{post.repostsCount||0}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={p.actionBtn} onPress={onShare}>
          <Ionicons name="share-social-outline" size={19} color="#999"/>
          <Text style={p.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>"""

if old_actions in content:
    content = content.replace(old_actions, new_actions)
    print('Repost button added to actions row')
else:
    print('WARNING: actions block not matched exactly')

# 8. Add repostCard style
old_style = "  sharedCard:{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,padding:12,marginBottom:10,backgroundColor:'#faf9f6'},"
new_style = old_style + "\n  repostCard:{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,padding:12,marginBottom:10,backgroundColor:'#faf9f6'},"
if old_style in content:
    content = content.replace(old_style, new_style)
    print('repostCard style added')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 1 complete (PostCard updates)')
