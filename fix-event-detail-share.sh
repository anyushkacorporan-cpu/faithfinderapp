#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/event-detail.tsx').read()

# Find both share modals and replace with one clean version
# First let's see how many modals there are
modals = [m.start() for m in re.finditer(r'Share Event', content)]
print(f"Found 'Share Event' at positions: {modals}")

# Replace ALL share composer modals with one clean version
# Remove everything between {/* Share Composer Modal */} and the next {/* 
content = re.sub(
    r'\{/\* Share Composer Modal \*/\}.*?\{/\* Shared Toast \*/\}',
    '''{/* Share Composer Modal */}
      <Modal visible={showShareComposer} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border}}>
            <TouchableOpacity onPress={() => { setShowShareComposer(false); setShareMessage(''); }}>
              <Text style={{fontSize:15,color:'#888',fontWeight:'500'}}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy}}>New Post</Text>
            <TouchableOpacity
              style={{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9}}
              onPress={handlePostToFeed}
            >
              <Text style={{color:'#fff',fontSize:14,fontWeight:'700'}}>Share</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8}}>
                <View style={{alignItems:'center',marginRight:12}}>
                  <View style={{width:42,height:42,borderRadius:21,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="person" size={18} color={COLORS.white}/>
                  </View>
                  <View style={{width:2,flex:1,backgroundColor:'#f0ede8',marginTop:8,borderRadius:1}}/>
                </View>
                <View style={{flex:1}}>
                  <TextInput
                    style={{fontSize:16,color:COLORS.navy,minHeight:50,textAlignVertical:'top',marginBottom:10,lineHeight:24,paddingTop:4}}
                    placeholder="Add your thoughts..."
                    placeholderTextColor="#bbb"
                    value={shareMessage}
                    onChangeText={setShareMessage}
                    multiline
                    autoFocus
                  />
                  <View style={{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:10,backgroundColor:COLORS.lightBg}}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:8}}>
                      <View style={{width:26,height:26,borderRadius:8,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'}}>
                        <Ionicons name="calendar" size={14} color={COLORS.gold}/>
                      </View>
                      <Text style={{flex:1,fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={1}>{params.title}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4}}>
                      <Ionicons name="calendar-outline" size={11} color="#888"/>
                      <Text style={{fontSize:12,color:'#888'}}>{params.date}</Text>
                    </View>
                    <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                      <Ionicons name="location-outline" size={11} color="#888"/>
                      <Text style={{fontSize:12,color:'#888',flex:1}} numberOfLines={1}>{params.location}</Text>
                    </View>
                    <View style={{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:8}}>
                      <Text style={{fontSize:12,color:COLORS.gold,fontWeight:'700'}}>View event on FaithFinder →</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
                <Text style={{fontSize:12,color:'#bbb'}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
              </View>

              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = params.title + ' — ' + params.date + ' at ' + params.location;
                  Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const msg = params.title + ' — ' + params.date + ' at ' + params.location;
                  Linking.openURL('mailto:?subject=' + encodeURIComponent(params.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: params.title, message: params.title + ' — ' + params.date + ' at ' + params.location + '. Find it on FaithFinder!' });
                  }, 400);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>More Options</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}''',
    content,
    flags=re.DOTALL
)

# Add KeyboardAvoidingView and Platform imports if missing
if 'KeyboardAvoidingView' not in content:
    content = content.replace(
        "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput } from 'react-native';",
        "import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';"
    )

open('app/event-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
