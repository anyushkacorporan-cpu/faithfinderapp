import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """        <View style={s.personalInfo}>
          <Text style={s.name}>{user.firstName || 'Annie'} {user.lastName || 'Johnson'}</Text>
          {!!user.location && (
            <View style={s.locationRow}>
              <Ionicons name="location-outline" size={14} color="#888" />
              <Text style={s.locationTxt}>{user.location}</Text>
            </View>
          )}
          <TouchableOpacity style={s.connectionsRow} onPress={() => router.push('/connections' as any)}>
            <Text style={s.connectionsNum}>{connectionCount}</Text>
            <Text style={s.connectionsTxt}> Connection{connectionCount !== 1 ? 's' : ''} </Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
          </TouchableOpacity>
          {!!user.bio && (
            <Text style={{fontSize:14,color:'#555',textAlign:'center',lineHeight:20,marginBottom:10,paddingHorizontal:8}}>{user.bio}</Text>
          )}
          {!!user.createdAt && (
            <Text style={{fontSize:12,color:'#aaa',textAlign:'center',marginBottom:12}}>
              Member since {new Date(user.createdAt).toLocaleDateString('en-US',{month:'long',year:'numeric'})}
            </Text>
          )}"""

new_block = """        <View style={s.personalInfo}>
          <Text style={s.name}>{user.firstName || 'Annie'} {user.lastName || 'Johnson'}</Text>
          {!!user.bio && (
            <Text style={{fontSize:14,color:'#555',textAlign:'center',lineHeight:20,marginTop:4,marginBottom:14,paddingHorizontal:8}}>{user.bio}</Text>
          )}
          <View style={{flexDirection:'row',alignItems:'center',gap:16,marginBottom:14}}>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:5}} onPress={() => router.push('/connections' as any)}>
              <Ionicons name="people-outline" size={14} color="#888" />
              <Text style={{fontSize:13,color:'#888'}}>{connectionCount}</Text>
            </TouchableOpacity>
            {!!user.location && (
              <>
                <View style={{width:1,height:12,backgroundColor:'#e5e0d8'}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={{fontSize:13,color:'#888'}}>{user.location}</Text>
                </View>
              </>
            )}
          </View>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    print('Profile header redesigned to match mockup')
else:
    print('ERROR: target block not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
