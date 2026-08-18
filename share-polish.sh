#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Fix the success message in church-detail
python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Replace the Alert with a custom toast-style success
content = content.replace(
    "Alert.alert('Shared! 🙏', `Your post about ${church.name} has been shared to the Community Discover feed.`, [{text:'Done'}]);",
    "Alert.alert('Shared to Community', church.name + ' has been posted to Discover.', [{text:'OK', style:'default'}]);"
)

# Also fix older version if present
content = content.replace(
    "Alert.alert('Shared! 🙏', `Your post about ${church.name} has been shared to the Community Discover feed.`);",
    "Alert.alert('Shared to Community', church.name + ' has been posted to Discover.', [{text:'OK', style:'default'}]);"
)

content = content.replace(
    "Alert.alert('Posted', 'Your recommendation is now live in Discover.', [{text:'Done'}]);",
    "Alert.alert('Shared to Community', church.name + ' has been posted to Discover.', [{text:'OK', style:'default'}]);"
)

open('app/church-detail.tsx', 'w').write(content)
print('alert fixed')
PYEOF

# Update community screen church card to be more social-media premium
python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Replace church card styles with premium social-media style
content = content.replace(
    "  churchCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14,marginBottom:10,backgroundColor:COLORS.lightBg},\n  churchCardTop:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},\n  churchCardIcon:{width:28,height:28,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},\n  churchCardName:{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy},\n  churchCardLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:6},\n  churchCardAddr:{fontSize:12,color:'#888',flex:1},\n  churchCardDesc:{fontSize:13,color:'#555',lineHeight:18,marginBottom:8},\n  churchCardFooter:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8},\n  churchCardLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},",
    "  churchCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:16,marginBottom:10,backgroundColor:COLORS.white,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:6},\n  churchCardBanner:{height:80,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},\n  churchCardTop:{flexDirection:'row',alignItems:'center',gap:8,padding:12,paddingBottom:6},\n  churchCardIcon:{width:32,height:32,borderRadius:10,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},\n  churchCardName:{flex:1,fontSize:15,fontWeight:'700',color:COLORS.navy},\n  churchCardLocation:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:12,marginBottom:6},\n  churchCardAddr:{fontSize:12,color:'#888',flex:1},\n  churchCardDesc:{fontSize:13,color:'#555',lineHeight:18,marginBottom:0,paddingHorizontal:12},\n  churchCardFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:10,borderTopWidth:1,borderTopColor:COLORS.border,marginTop:8},\n  churchCardLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},",
)

# Replace church card JSX to include banner
old_card = '''              {post.churchShareData && (
                <TouchableOpacity
                  style={s.churchCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({
                    pathname: '/church-detail' as any,
                    params: {
                      id: post.churchShareData?.id || '',
                      placeId: post.churchShareData?.placeId || '',
                      name: post.churchShareData?.name || '',
                      address: post.churchShareData?.address || '',
                    }
                  })}
                >
                  <View style={s.churchCardTop}>
                    <View style={s.churchCardIcon}>
                      <Ionicons name="home" size={16} color={COLORS.gold} />
                    </View>
                    <Text style={s.churchCardName} numberOfLines={1}>{post.churchShareData?.name}</Text>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
                  </View>
                  <View style={s.churchCardLocation}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    <Text style={s.churchCardAddr} numberOfLines={1}>{post.churchShareData?.address}</Text>
                  </View>
                  {!!post.churchShareData?.description && (
                    <Text style={s.churchCardDesc} numberOfLines={2}>{post.churchShareData?.description}</Text>
                  )}
                  <View style={s.churchCardFooter}>
                    <Text style={s.churchCardLink}>View Church Details →</Text>
                  </View>
                </TouchableOpacity>
              )}'''

new_card = '''              {post.churchShareData && (
                <TouchableOpacity
                  style={s.churchCard}
                  activeOpacity={0.88}
                  onPress={() => router.push({
                    pathname: '/church-detail' as any,
                    params: {
                      id: post.churchShareData?.id || '',
                      placeId: post.churchShareData?.placeId || '',
                      name: post.churchShareData?.name || '',
                      address: post.churchShareData?.address || '',
                    }
                  })}
                >
                  {/* Dark banner with icon */}
                  <View style={s.churchCardBanner}>
                    <Ionicons name="home" size={32} color={COLORS.gold} />
                  </View>
                  {/* Card body */}
                  <View style={s.churchCardTop}>
                    <View style={s.churchCardIcon}>
                      <Ionicons name="home" size={16} color={COLORS.gold} />
                    </View>
                    <Text style={s.churchCardName} numberOfLines={1}>{post.churchShareData?.name}</Text>
                  </View>
                  <View style={s.churchCardLocation}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    <Text style={s.churchCardAddr} numberOfLines={1}>{post.churchShareData?.address}</Text>
                  </View>
                  {!!post.churchShareData?.description && (
                    <Text style={s.churchCardDesc} numberOfLines={2}>{post.churchShareData?.description}</Text>
                  )}
                  <View style={s.churchCardFooter}>
                    <Text style={s.churchCardLink}>View Church Details</Text>
                    <Ionicons name="arrow-forward-circle" size={18} color={COLORS.gold} />
                  </View>
                </TouchableOpacity>
              )}'''

content = content.replace(old_card, new_card)
open('app/(tabs)/community.tsx', 'w').write(content)
print('community card updated')
PYEOF

echo "ALL DONE"
