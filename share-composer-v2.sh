#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/church-detail.tsx').read()

# Replace the entire share composer modal
old_modal = '''      {/* Share Composer Modal */}
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
              placeholder={`What would you like to say about ${church.name}?`}
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
      </Modal>'''

new_modal = '''      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalRoot} edges={['top']}>
          {/* Header */}
          <View style={s.shareHdr}>
            <TouchableOpacity style={s.shareCancelBtn} onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={s.shareCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.shareHdrTitle}>New Post</Text>
            <TouchableOpacity
              style={[s.sharePostBtn, sharingToFeed && s.sharePostBtnDisabled]}
              onPress={handlePostToFeed}
              disabled={sharingToFeed}
            >
              <Text style={s.sharePostBtnTxt}>Share</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.shareScroll} keyboardShouldPersistTaps="handled">
            {/* Composer row — avatar + text input */}
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
                {/* Quoted church card */}
                <View style={s.quotedCard}>
                  <View style={s.quotedTop}>
                    <View style={s.quotedIconWrap}>
                      <Ionicons name="home" size={14} color={COLORS.gold} />
                    </View>
                    <Text style={s.quotedName}>{church.name}</Text>
                  </View>
                  <View style={s.quotedLocationRow}>
                    <Ionicons name="location-outline" size={11} color="#888" />
                    <Text style={s.quotedAddr} numberOfLines={1}>{church.address}</Text>
                  </View>
                  {!!church.description && (
                    <Text style={s.quotedDesc} numberOfLines={2}>{church.description}</Text>
                  )}
                  <View style={s.quotedFooter}>
                    <Text style={s.quotedLink}>View church on FaithFinder →</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={s.shareOrRow}>
              <View style={s.shareOrLine} />
              <Text style={s.shareOrTxt}>or share outside FaithFinder</Text>
              <View style={s.shareOrLine} />
            </View>

            {/* External share options */}
            <View style={s.externalOptions}>
              {[
                { icon: 'chatbubble-outline', label: 'Messages', color: '#2ecc71' },
                { icon: 'mail-outline', label: 'Email', color: '#3498db' },
                { icon: 'share-social-outline', label: 'More Options', color: '#9b59b6' },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.externalOption}
                  onPress={() => {
                    setShowShareComposer(false);
                    setTimeout(handleExternalShare, 300);
                  }}
                >
                  <View style={[s.externalOptionIcon, { backgroundColor: opt.color + '18' }]}>
                    <Ionicons name={opt.icon as any} size={22} color={opt.color} />
                  </View>
                  <Text style={s.externalOptionLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>'''

content = content.replace(old_modal, new_modal)

# Replace old composer styles with new ones
old_styles = '''  postShareBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:18,paddingVertical:8},
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
  externalShareTxt:{fontSize:14,fontWeight:'600',color:COLORS.navy},'''

new_styles = '''  shareHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  shareCancelBtn:{paddingVertical:4,paddingHorizontal:4},
  shareCancelTxt:{fontSize:15,color:'#888',fontWeight:'500'},
  shareHdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  sharePostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  sharePostBtnDisabled:{opacity:0.5},
  sharePostBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  shareScroll:{flex:1},
  composerRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8},
  composerAvatarWrap:{alignItems:'center',marginRight:12},
  composerAvatar:{width:42,height:42,borderRadius:21,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  composerAvatarLine:{width:2,flex:1,backgroundColor:'#f0ede8',marginTop:8,borderRadius:1},
  composerRight:{flex:1},
  composerInput:{fontSize:16,color:COLORS.navy,minHeight:80,textAlignVertical:'top',marginBottom:14,lineHeight:24,paddingTop:4},
  quotedCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:16,backgroundColor:COLORS.lightBg},
  quotedTop:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  quotedIconWrap:{width:22,height:22,borderRadius:6,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  quotedName:{fontSize:14,fontWeight:'700',color:COLORS.navy,flex:1},
  quotedLocationRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  quotedAddr:{fontSize:12,color:'#888',flex:1},
  quotedDesc:{fontSize:12,color:'#666',lineHeight:17,marginBottom:6},
  quotedFooter:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8,marginTop:4},
  quotedLink:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  shareOrRow:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  shareOrLine:{flex:1,height:1,backgroundColor:COLORS.border},
  shareOrTxt:{fontSize:12,color:'#bbb',fontWeight:'500'},
  externalOptions:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30},
  externalOption:{alignItems:'center',gap:8},
  externalOptionIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalOptionLabel:{fontSize:12,color:COLORS.navy,fontWeight:'600'},'''

content = content.replace(old_styles, new_styles)
open('app/church-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
