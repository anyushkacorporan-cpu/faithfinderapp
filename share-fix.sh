#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Fix the success alert to be minimal
content = content.replace(
    "Alert.alert('Shared! 🙏', `Your post about ${church.name} has been shared to the Community Discover feed.`);",
    "Alert.alert('Posted', 'Your recommendation is now live in Discover.', [{text:'Done'}]);"
)

open('app/church-detail.tsx', 'w').write(content)
print('church-detail done')
PYEOF

# Fix community screen to properly show church share card
python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Make sure churchShareData is imported from postsStore type
# Fix the church share card - it might not be rendering because of type issues
# Replace the church share card section
old = '''                    {!!post.churchShareData && (
                      <TouchableOpacity
                        style={s.churchShareCard}
                        onPress={() => router.push({
                          pathname: '/church-detail',
                          params: {
                            id: post.churchShareData!.id || '',
                            placeId: post.churchShareData!.placeId,
                            name: post.churchShareData!.name,
                            address: post.churchShareData!.address,
                          }
                        })}
                        activeOpacity={0.85}
                      >
                        <View style={s.churchShareIconWrap}>
                          <Ionicons name="home" size={22} color={COLORS.gold} />
                        </View>
                        <View style={s.churchShareInfo}>
                          <Text style={s.churchShareName}>{post.churchShareData.name}</Text>
                          <View style={s.churchShareLocation}>
                            <Ionicons name="location-outline" size={12} color="#888" />
                            <Text style={s.churchShareAddr} numberOfLines={1}>{post.churchShareData.address}</Text>
                          </View>
                          {!!post.churchShareData.description && (
                            <Text style={s.churchShareDesc} numberOfLines={2}>{post.churchShareData.description}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={COLORS.gold} />
                      </TouchableOpacity>
                    )}'''

new = '''                    {post.churchShareData ? (
                      <TouchableOpacity
                        style={s.churchShareCard}
                        onPress={() => router.push({
                          pathname: '/church-detail' as any,
                          params: {
                            id: post.churchShareData?.id || '',
                            placeId: post.churchShareData?.placeId || '',
                            name: post.churchShareData?.name || '',
                            address: post.churchShareData?.address || '',
                          }
                        })}
                        activeOpacity={0.85}
                      >
                        <View style={s.churchShareHeader}>
                          <View style={s.churchShareIconWrap}>
                            <Ionicons name="home" size={16} color={COLORS.gold} />
                          </View>
                          <Text style={s.churchShareName} numberOfLines={1}>{post.churchShareData?.name}</Text>
                          <Ionicons name="chevron-forward" size={14} color={COLORS.gold} />
                        </View>
                        <View style={s.churchShareLocation}>
                          <Ionicons name="location-outline" size={12} color="#888" />
                          <Text style={s.churchShareAddr} numberOfLines={1}>{post.churchShareData?.address}</Text>
                        </View>
                        {!!post.churchShareData?.description && (
                          <Text style={s.churchShareDesc} numberOfLines={2}>{post.churchShareData?.description}</Text>
                        )}
                        <View style={s.churchShareFooter}>
                          <Text style={s.churchShareLink}>View Church Details</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}'''

content = content.replace(old, new)

# Fix styles
content = content.replace(
    "  churchShareCard:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:8,backgroundColor:COLORS.lightBg},\n  churchShareIconWrap:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center',flexShrink:0},\n  churchShareInfo:{flex:1},\n  churchShareName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:4},\n  churchShareLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:3},\n  churchShareAddr:{fontSize:12,color:'#888',flex:1},\n  churchShareDesc:{fontSize:12,color:'#666',lineHeight:17},",
    "  churchShareCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14,marginBottom:8,backgroundColor:COLORS.lightBg},\n  churchShareHeader:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},\n  churchShareIconWrap:{width:28,height:28,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},\n  churchShareName:{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy},\n  churchShareLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:6},\n  churchShareAddr:{fontSize:12,color:'#888',flex:1},\n  churchShareDesc:{fontSize:13,color:'#555',lineHeight:18,marginBottom:8},\n  churchShareFooter:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8},\n  churchShareLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},\n  churchShareInfo:{flex:1},"
)

# Make sure router is imported
if "import { router }" not in content and "router } from 'expo-router'" not in content:
    content = "import { router } from 'expo-router';\n" + content

open('app/(tabs)/community.tsx', 'w').write(content)
print('community done')
PYEOF

echo "ALL DONE"
