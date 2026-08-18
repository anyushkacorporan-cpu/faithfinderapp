#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Fix both More Options buttons - increase timeout and store params first
old1 = '''                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: params.title, message: params.title + ' — ' + params.date + ' at ' + params.location + '. Find it on FaithFinder!' });
                  }, 400);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>More Options</Text>
                </TouchableOpacity>'''

new1 = '''                <TouchableOpacity style={{alignItems:'center',gap:8}} onPress={() => {
                  const t = params.title || '';
                  const d = params.date || '';
                  const l = params.location || '';
                  setShowShareComposer(false);
                  setTimeout(() => {
                    Share.share({ title: t, message: t + ' — ' + d + ' at ' + l + '. Find it on FaithFinder!' }).catch(() => {});
                  }, 600);
                }}>
                  <View style={{width:54,height:54,borderRadius:16,backgroundColor:'#f5eefb',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="share-social-outline" size={22} color="#9b59b6"/>
                  </View>
                  <Text style={{fontSize:12,color:'#111',fontWeight:'600'}}>More Options</Text>
                </TouchableOpacity>'''

# Replace all occurrences
count = content.count(old1)
print(f'Found {count} occurrences')
content = content.replace(old1, new1)

open('app/event-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
