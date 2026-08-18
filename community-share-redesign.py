import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the entire Repost Compose Modal with a clean two-step flow:
# Step A (default): a bottom sheet with "Repost" and "Share" big buttons
# Step B (only if they tap Repost): the compose screen with comment + quoted card

old_modal_start = content.find('{/* Repost Compose Modal */}')
old_modal_end = content.find('</Modal>', old_modal_start) + len('</Modal>')
old_modal = content[old_modal_start:old_modal_end]

new_modal = '''{/* Share/Repost Bottom Sheet */}
      <Modal visible={!!repostTarget && !showRepostCompose} transparent animationType="fade" onRequestClose={() => setRepostTarget(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setRepostTarget(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy,textAlign:'center',marginBottom:16}}>Share Post</Text>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => setShowRepostCompose(true)}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:'rgba(102,126,234,0.12)',alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="repeat" size={22} color="#667eea"/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.navy}}>Repost</Text>
                <Text style={{fontSize:12,color:'#999',marginTop:1}}>Share to your FaithFinder feed</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd"/>
            </TouchableOpacity>

            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:14}} onPress={() => {
              const m = repostTarget?.repostOf?.content || repostTarget?.content || '';
              setRepostTarget(null);
              setTimeout(() => Share.share({message:m,title:'Check this out on FaithFinder'}).catch(()=>{}), 350);
            }}>
              <View style={{width:44,height:44,borderRadius:14,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="arrow-redo-outline" size={22} color={COLORS.navy}/>
              </View>
              <View style={{flex:1}}>
                <Text style={{fontSize:15,fontWeight:'700',color:COLORS.navy}}>Share</Text>
                <Text style={{fontSize:12,color:'#999',marginTop:1}}>Send via Messages, Mail & more</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ddd"/>
            </TouchableOpacity>

            <TouchableOpacity style={{paddingVertical:16,marginTop:6,alignItems:'center'}} onPress={() => setRepostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Repost Compose Screen */}
      <Modal visible={!!repostTarget && showRepostCompose} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowRepostCompose(false); setRepostTarget(null); }}>
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => { setShowRepostCompose(false); setRepostTarget(null); }}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Repost</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (repostTarget) {
                repostPost(repostTarget, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, repostComment.trim());
              }
              setShowRepostCompose(false);
              setRepostTarget(null);
            }}>
              <Text style={s.postBtnTxt}>Repost</Text>
            </TouchableOpacity>
          </View>
          <View style={s.composeAuthor}>
            <View style={[s.composeAvatar,{backgroundColor:'#667eea'}]}>
              <Text style={s.composeAvatarTxt}>{initials}</Text>
            </View>
            <Text style={s.composeAuthorName}>{displayName}</Text>
          </View>
          <TextInput
            style={[s.composeInput,{minHeight:80}]}
            multiline
            autoFocus
            value={repostComment}
            onChangeText={setRepostComment}
            placeholder="Add a comment (optional)"
            placeholderTextColor="#bbb"
          />
          {repostTarget&&(
            <View style={[s.quotedCard,{marginHorizontal:16}]}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6}}>
                <View style={{width:26,height:26,borderRadius:13,backgroundColor:(repostTarget.repostOf?.authorColor)||repostTarget.authorColor,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{(repostTarget.repostOf?.authorInitials)||repostTarget.authorInitials}</Text>
                </View>
                <Text style={{fontSize:13,fontWeight:'700',color:COLORS.navy}}>{(repostTarget.repostOf?.authorName)||repostTarget.authorName}</Text>
              </View>
              <Text style={{fontSize:13,color:'#555'}} numberOfLines={3}>{(repostTarget.repostOf?.content)||repostTarget.content}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>'''

if old_modal_start != -1 and old_modal_end > old_modal_start:
    content = content[:old_modal_start] + new_modal + content[old_modal_end:]
    print('Repost/Share modal redesigned')
else:
    print('ERROR: could not locate old modal block')

# Add showRepostCompose state near repostTarget state
old_state = "  const [repostTarget, setRepostTarget] = useState<Post | null>(null);"
new_state = "  const [repostTarget, setRepostTarget] = useState<Post | null>(null);\n  const [showRepostCompose, setShowRepostCompose] = useState(false);"
if old_state in content:
    content = content.replace(old_state, new_state)
    print('showRepostCompose state added')
else:
    print('WARNING: repostTarget state declaration not found')

# Reset showRepostCompose whenever repostTarget is set to null elsewhere (safety)
content = content.replace(
    "onShare={() => { setRepostTarget(post); setRepostComment(''); }}",
    "onShare={() => { setRepostTarget(post); setRepostComment(''); setShowRepostCompose(false); }}"
)

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
