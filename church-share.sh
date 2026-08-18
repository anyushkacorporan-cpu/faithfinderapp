#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Update postsStore to support church share posts with navigation
python3 << 'PYEOF'
content = open('src/lib/postsStore.ts').read()

# Add churchShareData to Post type
content = content.replace(
    "  churchPlaceId?: string;\n  churchName?: string;",
    "  churchPlaceId?: string;\n  churchName?: string;\n  churchShareData?: { placeId: string; name: string; address: string; description?: string; id?: string; };"
)

open('src/lib/postsStore.ts', 'w').write(content)
print('postsStore updated')
PYEOF

# Update church-detail share button
python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Replace existing handleShare function
old_share = '''  async function handleShare() {
    try {
      await Share.share({
        title: church.name,
        message: `Check out ${church.name} on FaithFinder!\\n📍 ${church.address}${church.phone ? '\\n📞 ' + church.phone : ''}${church.website ? '\\n🌐 ' + church.website : ''}`,
      });
    } catch {}
  }'''

new_share = '''  function handleShare() {
    Alert.alert(
      'Share Church',
      'How would you like to share this church?',
      [
        {
          text: 'Post to Community',
          onPress: () => {
            const { getUser } = require('../src/lib/userStore');
            const user = getUser();
            const displayName = user.accountType === 'church'
              ? (user.churchName || 'Church')
              : `${user.firstName || 'User'} ${user.lastName || ''}`.trim();
            const initials = user.accountType === 'church'
              ? (user.churchName?.[0] || 'C')
              : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;
            const { addPost } = require('../src/lib/postsStore');
            addPost({
              authorName: displayName,
              authorInitials: initials.toUpperCase(),
              authorType: user.accountType === 'church' ? 'church' : 'personal',
              authorColor: '#667eea',
              content: `🏛️ Recommending this church to the community!\\n\\n${church.name}\\n📍 ${church.address}${church.description ? '\\n\\n' + church.description : ''}`,
              time: 'now',
              churchPlaceId: placeId,
              churchName: church.name,
              churchShareData: {
                placeId: placeId,
                name: church.name,
                address: church.address,
                description: church.description,
                id: church.id,
              },
            });
            Alert.alert('Shared! 🙏', `${church.name} has been shared to the Community Discover feed.`);
          }
        },
        {
          text: 'Share Externally',
          onPress: async () => {
            try {
              await Share.share({
                title: church.name,
                message: `Check out ${church.name} on FaithFinder!\\n📍 ${church.address}${church.phone ? '\\n📞 ' + church.phone : ''}${church.website ? '\\n🌐 ' + church.website : ''}`,
              });
            } catch {}
          }
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }'''

content = content.replace(old_share, new_share)
open('app/church-detail.tsx', 'w').write(content)
print('church-detail share updated')
PYEOF

# Update Community screen to handle church share posts with navigation
python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Add navigation to church detail when tapping shared church post
# Find the post card section and add church share card handling
old_post_content = '''                    {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
                    {!!post.image && <Image source={{ uri: post.image }} style={s.postImage} resizeMode="cover" />}'''

new_post_content = '''                    {!!post.content && <Text style={s.postContent}>{post.content}</Text>}
                    {!!post.image && <Image source={{ uri: post.image }} style={s.postImage} resizeMode="cover" />}
                    {!!post.churchShareData && (
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

content = content.replace(old_post_content, new_post_content)

# Add router import if not present
if "import { router }" not in content and "router" not in content:
    content = content.replace(
        "import { Ionicons } from '@expo/vector-icons';",
        "import { Ionicons } from '@expo/vector-icons';\nimport { router } from 'expo-router';"
    )
elif "from 'expo-router'" not in content:
    content = content.replace(
        "import { Ionicons } from '@expo/vector-icons';",
        "import { Ionicons } from '@expo/vector-icons';\nimport { router } from 'expo-router';"
    )

# Add church share card styles
content = content.replace(
    "  commentSendBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},",
    """  commentSendBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  churchShareCard:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:8,backgroundColor:COLORS.lightBg},
  churchShareIconWrap:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center',flexShrink:0},
  churchShareInfo:{flex:1},
  churchShareName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  churchShareLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:3},
  churchShareAddr:{fontSize:12,color:'#888',flex:1},
  churchShareDesc:{fontSize:12,color:'#666',lineHeight:17},"""
)

open('app/(tabs)/community.tsx', 'w').write(content)
print('community updated')
PYEOF

echo "ALL DONE"
