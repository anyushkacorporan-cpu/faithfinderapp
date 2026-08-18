#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()

# Add state for share composer
content = content.replace(
    "  const { saved, attending } = useEventActions();",
    """  const { saved, attending } = useEventActions();
  const [shareEvent, setShareEvent] = useState<any>(null);
  const [shareMessage, setShareMessage] = useState('');
  const [sharedToast, setSharedToast] = useState(false);"""
)

# Add Modal and TextInput to imports
content = content.replace(
    "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Share } from 'react-native';",
    "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Share, KeyboardAvoidingView, Platform } from 'react-native';"
)

# Fix share button in footer to open composer
content = content.replace(
    '''                    <TouchableOpacity style={s.footerIconBtn} onPress={e => {
                      e.stopPropagation();
                      Share.share({ message: event.title + \' — \' + event.date + \' at \' + event.location });
                    }}>
                      <Ionicons name="share-social-outline" size={18} color="#888" />
                    </TouchableOpacity>''',
    '''                    <TouchableOpacity style={s.footerIconBtn} onPress={e => {
                      e.stopPropagation();
                      setShareEvent(event);
                      setShareMessage('');
                    }}>
                      <Ionicons name="share-social-outline" size={18} color="#888" />
                    </TouchableOpacity>'''
)

# Add postToFeed function and share modal before the filter modal
content = content.replace(
    "      {/* Filter Modal */}",
    """      {/* Share Composer Modal */}
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
      </Modal>

      {/* Shared Toast */}
      {sharedToast && (
        <View style={{position:'absolute',bottom:100,left:16,right:16,backgroundColor:'#fff',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,zIndex:999,borderWidth:1,borderColor:'#f0ede8'}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.green} />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:COLORS.navy}}>Shared to Community</Text>
          <TouchableOpacity onPress={() => setSharedToast(false)}>
            <Ionicons name="close" size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Modal */}"""
)

# Add SafeAreaView import if not present
if 'SafeAreaView' not in content.split('import')[1]:
    content = content.replace(
        "import { SafeAreaView } from 'react-native-safe-area-context';",
        "import { SafeAreaView } from 'react-native-safe-area-context';"
    )

open('app/(tabs)/events.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
