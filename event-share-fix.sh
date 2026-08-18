#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Add showShareComposer and shareMessage state
content = content.replace(
    "  const [showInviteModal, setShowInviteModal] = useState(false);",
    "  const [showInviteModal, setShowInviteModal] = useState(false);\n  const [showShareComposer, setShowShareComposer] = useState(false);\n  const [shareMessage, setShareMessage] = useState('');\n  const [sharedToast, setSharedToast] = useState(false);"
)

# Replace handleShare with composer
old = '''  function handleShare() {
    Share.share({
      title: params.title,
      message: 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location,
    });
  }'''

new = '''  function handleShare() { setShowShareComposer(true); }

  async function handleExternalShare() {
    Share.share({
      title: params.title,
      message: 'Check out ' + params.title + ' on FaithFinder! ' + params.date + ' at ' + params.location,
    });
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
      authorColor: '#667eea',
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
    setSharedToast(true);
    setTimeout(() => setSharedToast(false), 3000);
  }'''

content = content.replace(old, new)

# Add TextInput to imports if not there
if 'TextInput' not in content.split('from')[0]:
    content = content.replace(
        "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal } from 'react-native';",
        "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput } from 'react-native';"
    )

# Add share composer modal before closing SafeAreaView
content = content.replace(
    "    </SafeAreaView>\n  );\n}",
    """      {/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1, backgroundColor:'#fff'}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'}}>
            <TouchableOpacity onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={{fontSize:15,color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy}}>Share Event</Text>
            <TouchableOpacity style={{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:18,paddingVertical:8}} onPress={handlePostToFeed}>
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Post</Text>
            </TouchableOpacity>
          </View>
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
            {/* Event preview card */}
            <View style={{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:14,padding:14,backgroundColor:'#f8f7f4'}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                <View style={{width:26,height:26,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
                  <Ionicons name="calendar" size={14} color={COLORS.gold} />
                </View>
                <Text style={{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={1}>{params.title}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                <Ionicons name="calendar-outline" size={12} color="#888" />
                <Text style={{fontSize:12,color:'#888'}}>{params.date}</Text>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                <Ionicons name="location-outline" size={12} color="#888" />
                <Text style={{fontSize:12,color:'#888',flex:1}} numberOfLines={1}>{params.location}</Text>
              </View>
              <View style={{borderTopWidth:1,borderTopColor:'#f0ede8',paddingTop:8}}>
                <Text style={{fontSize:12,color:COLORS.gold,fontWeight:'700'}}>View Event Details →</Text>
              </View>
            </View>
            <View style={{flexDirection:'row',alignItems:'center',gap:12,marginVertical:16}}>
              <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}} />
              <Text style={{fontSize:12,color:'#bbb'}}>or share outside FaithFinder</Text>
              <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}} />
            </View>
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderWidth:1.5,borderColor:'#f0ede8',borderRadius:14,padding:14}}
              onPress={() => { setShowShareComposer(false); setTimeout(handleExternalShare, 300); }}
            >
              <Ionicons name="share-social-outline" size={18} color={COLORS.navy} />
              <Text style={{fontSize:14,fontWeight:'600',color:COLORS.navy}}>Share via Messages, Email & More</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}
      {sharedToast && (
        <View style={{position:'absolute',bottom:40,left:16,right:16,backgroundColor:'#fff',borderRadius:16,padding:16,flexDirection:'row',alignItems:'center',gap:12,shadowColor:'#000',shadowOffset:{width:0,height:8},shadowOpacity:0.15,shadowRadius:16,borderWidth:1,borderColor:'#f0ede8'}}>
          <View style={{width:44,height:44,borderRadius:22,backgroundColor:'#e8f5e9',alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.green} />
          </View>
          <Text style={{flex:1,fontSize:15,fontWeight:'700',color:COLORS.navy}}>Shared to Community</Text>
          <TouchableOpacity onPress={() => setSharedToast(false)}>
            <Ionicons name="close" size={18} color="#aaa" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}"""
)

open('app/event-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
