import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Fix community.tsx's handleCreatePost: split on comma if present, else use whole string as city
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = """      city: showLocation ? user.location?.split(',')[0]?.trim() : undefined,
      state: showLocation ? user.location?.split(',')[1]?.trim() : undefined,"""

new = """      city: showLocation ? (user.location?.includes(',') ? user.location.split(',')[0]?.trim() : user.location) : undefined,
      state: showLocation ? (user.location?.includes(',') ? user.location.split(',')[1]?.trim() : undefined) : undefined,"""

if old in content:
    content = content.replace(old, new)
    print('handleCreatePost location parsing fixed')
else:
    print('ERROR: anchor not found')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Fix PostCard.tsx rendering: show location if city exists, state is optional
with open('src/components/PostCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_render1 = """            {showLocation&&post.city&&post.state&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}, {post.state}</Text></>
            )}"""
new_render1 = """            {showLocation&&!!post.city&&(
              <><Text style={p.dot}>·</Text><Ionicons name="location" size={11} color={COLORS.gold}/><Text style={p.locationTxt}>{post.city}{post.state?`, ${post.state}`:''}</Text></>
            )}"""

if old_render1 in content:
    content = content.replace(old_render1, new_render1)
    print('PostCard header location render fixed (city-only support)')
else:
    print('WARNING: header location render not found exactly')

with open('src/components/PostCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
