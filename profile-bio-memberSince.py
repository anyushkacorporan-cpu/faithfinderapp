import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Add createdAt to User type + set it on first load
with open('src/lib/userStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

old_type = """  serviceTimes?: string;
  avatar?: string;
};

let user: User = {};"""

new_type = """  serviceTimes?: string;
  avatar?: string;
  createdAt?: string;
};

let user: User = { createdAt: new Date().toISOString() };"""

if old_type in content:
    content = content.replace(old_type, new_type)
    print('createdAt added to User type + initial user object')
else:
    print('ERROR: User type/initial user not found exactly')

with open('src/lib/userStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Update profile.tsx: remove church pill, add bio + member since display
with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_pill = """          <View style={s.churchPill}>
            <Ionicons name="home-outline" size={16} color="#888" />
            <Text style={s.churchPillTxt}>Grace Community Church</Text>
          </View>
          {user.ministries && user.ministries.length > 0 && ("""

new_pill = """          {!!user.bio && (
            <Text style={{fontSize:14,color:'#555',textAlign:'center',lineHeight:20,marginBottom:10,paddingHorizontal:8}}>{user.bio}</Text>
          )}
          {!!user.createdAt && (
            <Text style={{fontSize:12,color:'#aaa',textAlign:'center',marginBottom:12}}>
              Member since {new Date(user.createdAt).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
            </Text>
          )}
          {user.ministries && user.ministries.length > 0 && ("""

if old_pill in content:
    content = content.replace(old_pill, new_pill)
    print('Church pill removed, bio + member since added')
else:
    print('ERROR: church pill block not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 1')
