#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()

# Replace the existing share modal with church-style composer
old_modal = '''      {/* Share Composer Modal */}
      <Modal visible={!!shareEvent} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:'#fff'}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'}}>
            <TouchableOpacity onPress={() => { setShareEvent(null); setShareMessage(''); }}>
              <Text style={{fontSize:15,color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy}}>Share Event</Text>
            <TouchableOpacity
              style={{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:18,paddingVertical:8}}
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
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Post</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1,padding:16}} keyboardShouldPersistTaps="handled">
              <View style={{flexDirection:'row',gap:12,marginBottom:16}}>
                <View style={{width:42,height:42,borderRadius:21,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="person" size={18} color="#fff" />
                </View>
                <TextInput
                  style={{flex:1,fontSize:16,color:COLORS.navy,minHeight:80,textAlignVertical:'top'}}
                  placeholder="Write something about this event..."
                  placeholderTextColor="#bbb"
                  value={shareMessage}
                  onChangeText={setShareMessage}
                  multiline
                  autoFocus
                />
              </View>
              {shareEvent && (
                <View style={{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:14,padding:14,backgroundColor:'#f8f7f4'}}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                    <View style={{width:28,height:28,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name="calendar" size={14} color={COLORS.gold} />
                    </View>
                    <Text style={{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={1}>{shareEvent.title}</Text>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                    <Ionicons name="calendar-outline" size={12} color="#888" />
                    <Text style={{fontSize:12,color:'#888'}}>{shareEvent.date}</Text>
                  </View>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                    <Ionicons name="location-outline" size={12} color="#888" />
                    <Text style={{fontSize:12,color:'#888',flex:1}} numberOfLines={1}>{shareEvent.location}</Text>
                  </View>
                  <View style={{borderTopWidth:1,borderTopColor:'#f0ede8',paddingTop:8}}>
                    <Text style={{fontSize:12,color:COLORS.gold,fontWeight:'700'}}>View Event Details →</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>'''

new_modal = '''      {/* Share Composer Modal — same as church share */}
      <Modal visible={!!shareEvent} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.shareModalRoot} edges={['top']}>
          {/* Header */}
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
              {/* Composer row */}
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
                    placeholder="Add your thoughts about this event..."
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  {/* Quoted event card */}
                  {shareEvent && (
                    <View style={s.quotedCard}>
                      <View style={s.quotedTop}>
                        <View style={s.quotedIconWrap}>
                          <Ionicons name="calendar" size={14} color={COLORS.gold} />
                        </View>
                        <Text style={s.quotedTitle} numberOfLines={1}>{shareEvent.title}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="calendar-outline" size={11} color="#888" />
                        <Text style={s.quotedTxt}>{shareEvent.date}</Text>
                      </View>
                      <View style={s.quotedRow}>
                        <Ionicons name="location-outline" size={11} color="#888" />
                        <Text style={s.quotedTxt} numberOfLines={1}>{shareEvent.location}</Text>
                      </View>
                      <View style={s.quotedFooter}>
                        <Text style={s.quotedLink}>View Event Details →</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>'''

content = content.replace(old_modal, new_modal)

# Add styles
content = content.replace(
    "  filterApplyTxt:{fontSize:14,fontWeight:'700',color:COLORS.white},",
    """  filterApplyTxt:{fontSize:14,fontWeight:'700',color:COLORS.white},
  shareModalRoot:{flex:1,backgroundColor:COLORS.white},
  shareHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  shareCancelBtn:{paddingVertical:4},
  shareCancelTxt:{fontSize:15,color:'#888',fontWeight:'500'},
  shareHdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  sharePostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
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
  quotedTitle:{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy},
  quotedRow:{flexDirection:'row',alignItems:'center',gap:4,marginBottom:4},
  quotedTxt:{fontSize:12,color:'#888',flex:1},
  quotedFooter:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8,marginTop:4},
  quotedLink:{fontSize:12,color:COLORS.gold,fontWeight:'700'},"""
)

open('app/(tabs)/events.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
