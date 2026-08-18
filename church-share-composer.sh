#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Replace the share function with one that shows a composer modal
old = '''  function handleShare() {
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

new = '''  const [showShareComposer, setShowShareComposer] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [sharingToFeed, setSharingToFeed] = useState(false);

  function handleShare() {
    setShowShareComposer(true);
  }

  function handleExternalShare() {
    Share.share({
      title: church.name,
      message: `Check out ${church.name} on FaithFinder!\\n📍 ${church.address}${church.phone ? '\\n📞 ' + church.phone : ''}${church.website ? '\\n🌐 ' + church.website : ''}`,
    });
  }

  function handlePostToFeed() {
    setSharingToFeed(true);
    const user = require('../src/lib/userStore').getUser();
    const displayName = user.accountType === 'church'
      ? (user.churchName || 'Church')
      : `${user.firstName || 'User'} ${user.lastName || ''}`.trim();
    const initials = (user.accountType === 'church'
      ? (user.churchName?.[0] || 'C')
      : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`).toUpperCase();
    require('../src/lib/postsStore').addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea',
      content: shareMessage.trim(),
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
    setSharingToFeed(false);
    setShowShareComposer(false);
    setShareMessage('');
    Alert.alert('Shared! 🙏', `Your post about ${church.name} has been shared to the Community Discover feed.`);
  }'''

content = content.replace(old, new)
open('app/church-detail.tsx', 'w').write(content)
print('share function updated')
PYEOF

# Add share composer modal and import TextInput to church-detail
python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Add share composer modal before the closing </SafeAreaView>
old_end = '''      {/* Comment Modal */}'''

new_end = '''      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Share Church</Text>
            <TouchableOpacity
              style={[s.postShareBtn, sharingToFeed && s.postShareBtnDisabled]}
              onPress={handlePostToFeed}
              disabled={sharingToFeed}
            >
              <Text style={s.postShareBtnTxt}>Post</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.composerScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              style={s.composerInput}
              placeholder={`Share your thoughts about ${church.name}...\\n\\nExamples:\\n"I visited last Sunday and felt very welcomed."\\n"Highly recommend for Bible-based community."\\n"Amazing worship and friendly people."`}
              placeholderTextColor="#bbb"
              value={shareMessage}
              onChangeText={setShareMessage}
              multiline
              autoFocus
            />
            {/* Church Preview Card */}
            <View style={s.composerChurchCard}>
              <View style={s.composerChurchIconWrap}>
                <Ionicons name="home" size={22} color={COLORS.gold} />
              </View>
              <View style={s.composerChurchInfo}>
                <Text style={s.composerChurchName}>{church.name}</Text>
                <View style={s.composerChurchLocation}>
                  <Ionicons name="location-outline" size={12} color="#888" />
                  <Text style={s.composerChurchAddr} numberOfLines={1}>{church.address}</Text>
                </View>
                {!!church.description && (
                  <Text style={s.composerChurchDesc} numberOfLines={2}>{church.description}</Text>
                )}
              </View>
            </View>
            <View style={s.composerDivider}>
              <View style={s.composerDividerLine} />
              <Text style={s.composerDividerTxt}>or</Text>
              <View style={s.composerDividerLine} />
            </View>
            <TouchableOpacity style={s.externalShareBtn} onPress={() => { setShowShareComposer(false); setTimeout(handleExternalShare, 300); }}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.navy} />
              <Text style={s.externalShareTxt}>Share Externally (Text, Email, Social)</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Comment Modal */}'''

content = content.replace(old_end, new_end)

# Add composer styles
content = content.replace(
    "  noReviewsTxt:{fontSize:16,color:'#bbb',fontWeight:'600'},",
    """  noReviewsTxt:{fontSize:16,color:'#bbb',fontWeight:'600'},
  postShareBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:18,paddingVertical:8},
  postShareBtnDisabled:{opacity:0.5},
  postShareBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  composerScroll:{flex:1,padding:16},
  composerInput:{fontSize:16,color:COLORS.navy,minHeight:120,textAlignVertical:'top',marginBottom:20,lineHeight:24},
  composerChurchCard:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,padding:14,backgroundColor:COLORS.lightBg,marginBottom:16},
  composerChurchIconWrap:{width:48,height:48,borderRadius:14,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center',flexShrink:0},
  composerChurchInfo:{flex:1},
  composerChurchName:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  composerChurchLocation:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:3},
  composerChurchAddr:{fontSize:12,color:'#888',flex:1},
  composerChurchDesc:{fontSize:12,color:'#666',lineHeight:17},
  composerDivider:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},
  composerDividerLine:{flex:1,height:1,backgroundColor:COLORS.border},
  composerDividerTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
  externalShareBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14},
  externalShareTxt:{fontSize:14,fontWeight:'600',color:COLORS.navy},"""
)

open('app/church-detail.tsx', 'w').write(content)
print('composer modal added')
PYEOF

echo "ALL DONE"
