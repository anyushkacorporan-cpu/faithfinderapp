#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Update postsStore to support event share posts
python3 << 'PYEOF'
content = open('src/lib/postsStore.ts').read()

# Add eventShareData to Post type
if 'eventShareData' not in content:
    content = content.replace(
        "  churchShareData?: { placeId: string; name: string; address: string; description?: string; id?: string; };",
        "  churchShareData?: { placeId: string; name: string; address: string; description?: string; id?: string; };\n  eventShareData?: { id: string; title: string; date: string; location: string; type: string; price: string; };"
    )

open('src/lib/postsStore.ts', 'w').write(content)
print('postsStore updated')
PYEOF

# Update event-detail to add share composer
python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Add useState imports for share composer
content = content.replace(
    "  const [inviteSent, setInviteSent] = useState(false);",
    "  const [inviteSent, setInviteSent] = useState(false);\n  const [showShareComposer, setShowShareComposer] = useState(false);\n  const [shareMessage, setShareMessage] = useState('');\n  const [showSharedToast, setShowSharedToast] = useState(false);"
)

# Add TextInput and Modal to imports
content = content.replace(
    "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert } from 'react-native';",
    "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput } from 'react-native';"
)

# Replace handleShare to open composer
content = content.replace(
    "  function handleShare() {\n    Share.share({\n      title: params.title,\n      message: 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location,\n    });\n  }",
    """  function handleShare() { setShowShareComposer(true); }

  async function handleExternalShare() {
    try {
      await Share.share({
        title: params.title,
        message: 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location,
      });
    } catch {}
  }

  function handlePostToFeed() {
    const { getUser } = require('../src/lib/userStore');
    const { addPost } = require('../src/lib/postsStore');
    const u = getUser();
    const displayName = u.accountType === 'church'
      ? (u.churchName || 'Church')
      : ((u.firstName || 'User') + ' ' + (u.lastName || '')).trim();
    const initials = (u.accountType === 'church'
      ? (u.churchName?.[0] || 'C')
      : ((u.firstName?.[0] || 'U') + (u.lastName?.[0] || ''))).toUpperCase();
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: u.accountType === 'church' ? 'church' : 'personal',
      authorColor: u.accountType === 'church' ? '#c9a96e' : '#667eea',
      content: shareMessage.trim(),
      time: 'now',
      eventShareData: {
        id: params.id,
        title: params.title,
        date: params.date,
        location: params.location,
        type: params.type,
        price: params.price,
      },
    });
    setShowShareComposer(false);
    setShareMessage('');
    setShowSharedToast(true);
    setTimeout(() => setShowSharedToast(false), 3000);
  }"""
)

# Add share composer modal and toast before closing SafeAreaView
content = content.replace(
    "    </SafeAreaView>\n  );\n}",
    """      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.root} edges={['top']}>
          <View style={s.shareHdr}>
            <TouchableOpacity onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={s.shareCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.shareHdrTitle}>New Post</Text>
            <TouchableOpacity style={s.sharePostBtn} onPress={handlePostToFeed}>
              <Text style={s.sharePostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.shareScroll} keyboardShouldPersistTaps="handled">
            <View style={s.composerRow}>
              <View style={s.composerAvatarWrap}>
                <View style={s.composerAvatar}>
                  <Ionicons name="person" size={18} color={COLORS.white} />
                </View>
                <View style={s.composerLine} />
              </View>
              <View style={s.composerRight}>
                <TextInput
                  style={s.composerInput}
                  placeholder="Add your thoughts about this event..."
                  placeholderTextColor="#bbb"
                  value={shareMessage}
                  onChangeText={setShareMessage}
                  multiline
                  autoFocus
                />
                <View style={s.eventQuoteCard}>
                  <View style={s.eventQuoteTop}>
                    <View style={s.eventQuoteIconWrap}>
                      <Ionicons name="calendar" size={14} color={COLORS.gold} />
                    </View>
                    <Text style={s.eventQuoteTitle} numberOfLines={1}>{params.title}</Text>
                  </View>
                  <View style={s.eventQuoteRow}>
                    <Ionicons name="calendar-outline" size={12} color="#888" />
                    <Text style={s.eventQuoteTxt}>{params.date}</Text>
                  </View>
                  <View style={s.eventQuoteRow}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    <Text style={s.eventQuoteTxt} numberOfLines={1}>{params.location}</Text>
                  </View>
                  <View style={s.eventQuoteFooter}>
                    <Text style={s.eventQuoteLink}>View Event Details</Text>
                    <Ionicons name="arrow-forward" size={12} color={COLORS.gold} />
                  </View>
                </View>
              </View>
            </View>
            <View style={s.orRow}>
              <View style={s.orLine} /><Text style={s.orTxt}>or share outside FaithFinder</Text><View style={s.orLine} />
            </View>
            <View style={s.externalOptions}>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                const msg = 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location;
                Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#e8f8f0'}]}>
                  <Ionicons name="chatbubble-outline" size={22} color="#2ecc71" />
                </View>
                <Text style={s.externalOptionLabel}>Messages</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                const msg = 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location;
                Linking.openURL('mailto:?subject=' + encodeURIComponent(params.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#eaf4fb'}]}>
                  <Ionicons name="mail-outline" size={22} color="#3498db" />
                </View>
                <Text style={s.externalOptionLabel}>Email</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.externalOption} onPress={() => {
                setShowShareComposer(false);
                setTimeout(handleExternalShare, 300);
              }}>
                <View style={[s.externalOptionIcon, {backgroundColor:'#f5eefb'}]}>
                  <Ionicons name="share-social-outline" size={22} color="#9b59b6" />
                </View>
                <Text style={s.externalOptionLabel}>More Options</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}
      {showSharedToast && (
        <View style={s.toastWrap}>
          <View style={s.toastCard}>
            <View style={s.toastIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.green} />
            </View>
            <Text style={s.toastTitle}>Shared to Community</Text>
            <TouchableOpacity onPress={() => setShowSharedToast(false)}>
              <Ionicons name="close" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}"""
)

# Add new styles
content = content.replace(
    "  sendInviteTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},",
    """  sendInviteTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  shareHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  shareCancelTxt:{fontSize:15,color:'#888'},
  shareHdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  sharePostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  sharePostBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  shareScroll:{flex:1,backgroundColor:COLORS.white},
  composerRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8},
  composerAvatarWrap:{alignItems:'center',marginRight:12},
  composerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  composerLine:{width:2,flex:1,backgroundColor:'#f0ede8',marginTop:8,borderRadius:1},
  composerRight:{flex:1},
  composerInput:{fontSize:16,color:COLORS.navy,minHeight:80,textAlignVertical:'top',marginBottom:14,lineHeight:24,paddingTop:4},
  eventQuoteCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:16,backgroundColor:COLORS.lightBg},
  eventQuoteTop:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8},
  eventQuoteIconWrap:{width:24,height:24,borderRadius:7,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  eventQuoteTitle:{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy},
  eventQuoteRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4},
  eventQuoteTxt:{fontSize:12,color:'#888',flex:1},
  eventQuoteFooter:{flexDirection:'row',alignItems:'center',gap:4,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8,marginTop:4},
  eventQuoteLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  orRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  orLine:{flex:1,height:1,backgroundColor:COLORS.border},
  orTxt:{fontSize:12,color:'#bbb'},
  externalOptions:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30},
  externalOption:{alignItems:'center',gap:8},
  externalOptionIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalOptionLabel:{fontSize:12,color:COLORS.navy,fontWeight:'600'},
  toastWrap:{position:'absolute',bottom:40,left:16,right:16,zIndex:999},
  toastCard:{backgroundColor:COLORS.white,borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:COLORS.border},
  toastIconWrap:{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'},
  toastTitle:{flex:1,fontSize:15,fontWeight:'700',color:COLORS.navy},"""
)

open('app/event-detail.tsx', 'w').write(content)
print('event-detail done')
PYEOF

# Update community screen to show event share cards
python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Add event share card after church share card
old = "                {post.churchShareData && ("
new = """                {post.eventShareData && (
                  <TouchableOpacity
                    style={s.churchCard}
                    activeOpacity={0.88}
                    onPress={() => router.push({
                      pathname: '/event-detail' as any,
                      params: {
                        id: post.eventShareData?.id || '',
                        title: post.eventShareData?.title || '',
                        date: post.eventShareData?.date || '',
                        location: post.eventShareData?.location || '',
                        type: post.eventShareData?.type || '',
                        price: post.eventShareData?.price || '',
                        description: '',
                      }
                    })}
                  >
                    <View style={s.churchCardTop}>
                      <View style={[s.churchCardIcon, {backgroundColor:'#1a1a2e'}]}>
                        <Ionicons name="calendar" size={16} color={COLORS.gold} />
                      </View>
                      <Text style={s.churchCardName} numberOfLines={1}>{post.eventShareData?.title}</Text>
                    </View>
                    <View style={s.churchCardLocation}>
                      <Ionicons name="calendar-outline" size={12} color="#888" />
                      <Text style={s.churchCardAddr} numberOfLines={1}>{post.eventShareData?.date}</Text>
                    </View>
                    <View style={s.churchCardLocation}>
                      <Ionicons name="location-outline" size={12} color="#888" />
                      <Text style={s.churchCardAddr} numberOfLines={1}>{post.eventShareData?.location}</Text>
                    </View>
                    <View style={s.churchCardFooter}>
                      <Text style={s.churchCardLink}>View Event Details</Text>
                      <Ionicons name="arrow-forward-circle" size={18} color={COLORS.gold} />
                    </View>
                  </TouchableOpacity>
                )}
                {post.churchShareData && ("""

content = content.replace(old, new)
open('app/(tabs)/community.tsx', 'w').write(content)
print('community done')
PYEOF

echo "ALL DONE"
