import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Update community.tsx's openProfile to pass authorPhoto
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = """      params: { id: post.id, name: post.authorName, initials: post.authorInitials, color: post.authorColor, type: post.authorType, city: post.city || '', state: post.state || '' }"""
new = """      params: { id: post.id, name: post.authorName, initials: post.authorInitials, color: post.authorColor, type: post.authorType, city: post.city || '', state: post.state || '', photo: post.authorPhoto || '' }"""

if old in content:
    content = content.replace(old, new)
    print('community.tsx openProfile updated with photo param')
else:
    print('ERROR: community.tsx anchor not found')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update comments.tsx's two navigation calls to pass photo (comment/reply don't store authorPhoto today,
#    so we pass empty string safely - this keeps consistency without breaking anything)
with open('app/comments.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old1 = "params:{id:comment.id,name:comment.author,initials:comment.initials,color:comment.color,type:'user',city:comment.city||'',state:comment.state||''}"
new1 = "params:{id:comment.id,name:comment.author,initials:comment.initials,color:comment.color,type:'user',city:comment.city||'',state:comment.state||'',photo:(comment as any).authorPhoto||''}"
if old1 in content:
    content = content.replace(old1, new1)
    print('comments.tsx comment navigation updated')
else:
    print('WARNING: comment nav line not found exactly')

old2 = "params:{id:reply.id,name:reply.author,initials:reply.initials,color:reply.color,type:'user',city:reply.city||'',state:reply.state||''}"
new2 = "params:{id:reply.id,name:reply.author,initials:reply.initials,color:reply.color,type:'user',city:reply.city||'',state:reply.state||'',photo:(reply as any).authorPhoto||''}"
if old2 in content:
    content = content.replace(old2, new2)
    print('comments.tsx reply navigation updated')
else:
    print('WARNING: reply nav line not found exactly')

with open('app/comments.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update user-profile.tsx to accept and display the photo param
with open('app/user-profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_params = """  const params = useLocalSearchParams<{
    id?: string; name?: string; initials?: string; color?: string;
    type?: string; city?: string; state?: string;
  }>();"""
new_params = """  const params = useLocalSearchParams<{
    id?: string; name?: string; initials?: string; color?: string;
    type?: string; city?: string; state?: string; photo?: string;
  }>();"""

if old_params in content:
    content = content.replace(old_params, new_params)
    print('user-profile.tsx params type updated')
else:
    print('ERROR: params type block not found exactly')

old_avatar = """          <View style={s.avatarWrap}>
            <View style={[s.avatar,{backgroundColor:color}]}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
          </View>"""

new_avatar = """          <View style={s.avatarWrap}>
            {params.photo
              ? <Image source={{uri:params.photo}} style={[s.avatar,{overflow:'hidden'}]} resizeMode="cover"/>
              : <View style={[s.avatar,{backgroundColor:color}]}>
                  <Text style={s.avatarTxt}>{initials}</Text>
                </View>
            }
          </View>"""

if old_avatar in content:
    content = content.replace(old_avatar, new_avatar)
    print('user-profile.tsx avatar now shows real photo if available')
else:
    print('ERROR: avatar block not found exactly')

with open('app/user-profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
