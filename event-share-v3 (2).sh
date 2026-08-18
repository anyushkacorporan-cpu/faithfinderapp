#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/(tabs)/events.tsx').read()

# Replace the entire share modal with exact church-style + external options
old = re.search(r'\{/\* Share Composer Modal.*?</Modal>', content, re.DOTALL)
if old:
    print("Found old modal, replacing...")
else:
    print("Modal not found with regex")

content = re.sub(
    r'\{/\* Share Composer Modal.*?</Modal>',
    '''      {/* Share Composer Modal */}
      <Modal visible={!!shareEvent} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.shareModalRoot} edges={['top']}>
          <View style={s.shareHdr}>
            <TouchableOpacity style={s.shareCancelBtn} onPress={() => { setShareEvent(null); setShareMessage(''); }}>
              <Text style={s.shareCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.shareHdrTitle}>New Post</Text>
            <TouchableOpacity
              style={s.sharePostBtn}
              onPress={() => {
                if (!shareEvent) return;
                const { getUser } = require('../../src/lib/userStore');
                const { addPost } = require('../../src/lib/postsStore');
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
                  authorColor: '#667eea',
                  content: shareMessage.trim(),
                  time: 'now',
                  eventShareData: {
                    id: shareEvent.id,
                    title: shareEvent.title,
                    date: shareEvent.date,
                    location: shareEvent.location,
                    type: shareEvent.type,
                    price: shareEvent.price,
                  },
                });
                setShareEvent(null);
                setShareMessage('');
                setSharedToast(true);
                setTimeout(() => setSharedToast(false), 3000);
              }}
            >
              <Text style={s.sharePostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={s.shareScroll} keyboardShouldPersistTaps="handled">
              <View style={s.composerRow}>
                <View style={s.composerAvatarWrap}>
                  <View style={s.composerAvatar}>
                    <Ionicons name="person" size={18} color={COLORS.white} />
                  </View>
                  <View style={s.composerAvatarLine} />
                </View>
                <View style={s.composerRight}>
                  <TextInput
                    style={s.composerInput}
                    placeholder="Add your thoughts..."
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  {shareEvent && (
                    <View style={s.quotedCard}>
                      <View style={s.quotedTop}>
                        <View style={s.quotedIconWrap}>
                          <Ionicons name="calendar" size={14} color={COLORS.gold} />
                        </View>
                        <Text style={s.quotedTitle} numberOfLines={1}>{shareEvent.title}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="location-outline" size={11} color="#888" />
                        <Text style={s.quotedTxt} numberOfLines={1}>{shareEvent.location}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="calendar-outline" size={11} color="#888" />
                        <Text style={s.quotedTxt}>{shareEvent.date}</Text>
                      </View>
                      <View style={s.quotedFooter}>
                        <Text style={s.quotedLink}>View event on FaithFinder →</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Divider */}
              <View style={s.shareOrRow}>
                <View style={s.shareOrLine} />
                <Text style={s.shareOrTxt}>or share outside FaithFinder</Text>
                <View style={s.shareOrLine} />
              </View>

              {/* External options */}
              <View style={s.externalOptions}>
                <TouchableOpacity style={s.externalOption} onPress={() => {
                  if (!shareEvent) return;
                  const msg = shareEvent.title + ' — ' + shareEvent.date + ' at ' + shareEvent.location;
                  require('react-native').Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={[s.externalIcon, {backgroundColor:'#e8f8f0'}]}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71" />
                  </View>
                  <Text style={s.externalLabel}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.externalOption} onPress={() => {
                  if (!shareEvent) return;
                  const msg = shareEvent.title + ' — ' + shareEvent.date + ' at ' + shareEvent.location;
                  require('react-native').Linking.openURL('mailto:?subject=' + encodeURIComponent(shareEvent.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={[s.externalIcon, {backgroundColor:'#eaf4fb'}]}>
                    <Ionicons name="mail-outline" size={22} color="#3498db" />
                  </View>
                  <Text style={s.externalLabel}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.externalOption} onPress={() => {
                  if (!shareEvent) return;
                  setShareEvent(null);
                  setTimeout(() => {
                    require('react-native').Share.share({
                      title: shareEvent.title,
                      message: shareEvent.title + ' — ' + shareEvent.date + ' at ' + shareEvent.location + '. Find it on FaithFinder!',
                    });
                  }, 300);
                }}>
                  <View style={[s.externalIcon, {backgroundColor:'#f5eefb'}]}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6" />
                  </View>
                  <Text style={s.externalLabel}>More Options</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>''',
    content,
    flags=re.DOTALL
)

# Add missing styles if not present
if 'shareOrRow' not in content:
    content = content.replace(
        "  quotedLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},",
        """  quotedLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},
  shareOrRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  shareOrLine:{flex:1,height:1,backgroundColor:COLORS.border},
  shareOrTxt:{fontSize:12,color:'#bbb',fontWeight:'500'},
  externalOptions:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30},
  externalOption:{alignItems:'center',gap:8},
  externalIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalLabel:{fontSize:12,color:COLORS.navy,fontWeight:'600'},"""
    )

open('app/(tabs)/events.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
