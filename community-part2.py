import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert all new modals right before the existing Share Modal.
# Find the Share modal marker - it's the modal that uses sharePost
marker = content.find('{/* Share')
if marker == -1:
    marker = content.find('<Modal visible={!!sharePost}')
print('Share modal marker at:', marker)

new_modals = '''      {/* Post Options Menu */}
      <Modal visible={!!menuPost} transparent animationType="fade" onRequestClose={() => setMenuPost(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setMenuPost(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            {menuPost && menuPost.authorName === displayName ? (
              <>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  setEditingPost(menuPost); setEditText(menuPost.repostComment || menuPost.content); setMenuPost(null);
                }}>
                  <Ionicons name="create-outline" size={22} color={COLORS.navy}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:COLORS.navy}}>Edit Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                  const target = menuPost;
                  setMenuPost(null);
                  Alert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deletePost(target!.id) },
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.red}/>
                  <Text style={{fontSize:15,fontWeight:'600',color:COLORS.red}}>Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:14,paddingHorizontal:20,paddingVertical:16}} onPress={() => {
                setReportPostTarget(menuPost); setMenuPost(null);
              }}>
                <Ionicons name="flag-outline" size={22} color={COLORS.red}/>
                <Text style={{fontSize:15,fontWeight:'600',color:COLORS.red}}>Report Post</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setMenuPost(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Post Modal */}
      <Modal visible={!!reportPostTarget} transparent animationType="fade" onRequestClose={() => setReportPostTarget(null)}>
        <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'flex-end'}} activeOpacity={1} onPress={() => setReportPostTarget(null)}>
          <View style={{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingTop:8,paddingBottom:32}}>
            <View style={{width:36,height:4,borderRadius:2,backgroundColor:'#e8e3da',alignSelf:'center',marginVertical:10}}/>
            <Text style={{fontSize:17,fontWeight:'700',color:COLORS.navy,textAlign:'center',marginBottom:4}}>Report Post</Text>
            <Text style={{fontSize:13,color:'#888',textAlign:'center',marginBottom:14,paddingHorizontal:24}}>Why are you reporting this post?</Text>
            {[
              {id:'spam', label:'Spam'},
              {id:'harassment', label:'Harassment or bullying'},
              {id:'inappropriate', label:'Inappropriate content'},
              {id:'misleading', label:'False or misleading information'},
              {id:'hate_speech', label:'Hate speech'},
              {id:'other', label:'Other'},
            ].map(reason => (
              <TouchableOpacity key={reason.id} style={{paddingHorizontal:20,paddingVertical:14,borderTopWidth:1,borderTopColor:'#f5f3ef'}} onPress={() => {
                const target = reportPostTarget;
                setReportPostTarget(null);
                reportPost(target!.id, reason.id as any, displayName);
                Alert.alert('Reported', 'Thank you for letting us know. Our team will review this post.');
              }}>
                <Text style={{fontSize:15,color:COLORS.navy}}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:16,marginTop:4}} onPress={() => setReportPostTarget(null)}>
              <Text style={{fontSize:15,fontWeight:'600',color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal visible={!!editingPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingPost(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setEditingPost(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Edit Post</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (editingPost) {
                if (editingPost.repostOf) {
                  editPost(editingPost.id, {}); // marks edited; repostComment handled below
                }
                editPost(editingPost.id, editingPost.repostOf ? {} : { content: editText });
              }
              setEditingPost(null);
            }}>
              <Text style={s.postBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.composeInput}
            multiline
            autoFocus
            value={editText}
            onChangeText={setEditText}
            placeholder="What's on your mind?"
            placeholderTextColor="#bbb"
          />
        </SafeAreaView>
      </Modal>

      {/* Repost Compose Modal */}
      <Modal visible={!!repostTarget} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRepostTarget(null)}>
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setRepostTarget(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Repost</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (repostTarget) {
                repostPost(repostTarget, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, repostComment.trim());
              }
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
      </Modal>

      '''

if marker != -1:
    content = content[:marker] + new_modals + content[marker:]
    print('Modals inserted before share modal')
else:
    print('ERROR: share modal marker not found, appending before final closing')
    # Fallback: insert right before the last </SafeAreaView> close of the component
    fallback_marker = content.rfind('    </SafeAreaView>\n  );\n}')
    if fallback_marker != -1:
        content = content[:fallback_marker] + new_modals + content[fallback_marker:]
        print('Modals inserted via fallback position')
    else:
        print('CRITICAL: could not find insertion point')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 2 complete (modals added)')
