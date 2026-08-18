#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()

old = '''                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Shared Toast */}'''

new = '''                </View>
              </View>

              <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16}}>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
                <Text style={{fontSize:12,color:'#bbb'}}>or share outside FaithFinder</Text>
                <View style={{flex:1,height:1,backgroundColor:'#f0ede8'}}/>
              </View>

              <View style={{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:30}}>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  const msg = ev.title + ' — ' + ev.date + ' at ' + ev.location;
                  require('react-native').Linking.openURL('sms:&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#e8f8f0',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="chatbubble-outline" size={22} color="#2ecc71"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Messages</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  const msg = ev.title + ' — ' + ev.date + ' at ' + ev.location;
                  require('react-native').Linking.openURL('mailto:?subject=' + encodeURIComponent(ev.title) + '&body=' + encodeURIComponent(msg)).catch(() => {});
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#eaf4fb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="mail-outline" size={22} color="#3498db"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>Email</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const ev = shareEvent;
                  if (!ev) return;
                  setShareEvent(null);
                  setTimeout(() => {
                    require('react-native').Share.share({ title: ev.title, message: ev.title + ' — ' + ev.date + ' at ' + ev.location + '. Find it on FaithFinder!' });
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

      {/* Shared Toast */}'''

if old in content:
    content = content.replace(old, new)
    open('app/(tabs)/events.tsx', 'w').write(content)
    print('ALL DONE')
else:
    print('ERROR - text not found')
PYEOF
