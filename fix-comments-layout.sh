#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Fix the comments modal - remove gray bubbles, make it fill properly
old_ct = '''const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingTop:14,paddingBottom:2},
  commentRow:{flexDirection:'row',gap:10,marginBottom:2},
  avatar:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:13},
  headerLine:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'},
  author:{fontSize:14,fontWeight:'700',color:'#1a1a2e'},
  meta:{fontSize:12,color:'#bbb',fontWeight:'400'},
  text:{fontSize:14,color:'#3d3d3d',lineHeight:22,marginBottom:8},
  actions:{flexDirection:'row',alignItems:'center',gap:16,marginBottom:4},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:4,paddingVertical:4,paddingRight:4},
  actionCount:{fontSize:13,fontWeight:'600',color:'#bbb'},
  actionLabel:{fontSize:13,fontWeight:'600',color:'#bbb'},
  repliesWrap:{marginLeft:46,marginTop:4,paddingLeft:12,borderLeftWidth:2,borderLeftColor:'#f0ede8'},
  replyRow:{flexDirection:'row',gap:8,marginBottom:12},
  replyAvatar:{width:28,height:28,borderRadius:14,alignItems:'center',justifyContent:'center'},
  replyAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:10},
});'''

new_ct = '''const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingTop:16,paddingBottom:8,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  commentRow:{flexDirection:'row',gap:12,marginBottom:6},
  avatar:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  headerLine:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:5,flexWrap:'wrap'},
  author:{fontSize:14,fontWeight:'700',color:'#1a1a2e'},
  meta:{fontSize:12,color:'#bbb',fontWeight:'400'},
  text:{fontSize:15,color:'#2d2d2d',lineHeight:23,marginBottom:10},
  actions:{flexDirection:'row',alignItems:'center',gap:20,marginBottom:4,marginTop:2},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:6,paddingRight:8},
  actionCount:{fontSize:13,fontWeight:'600',color:'#bbb'},
  actionLabel:{fontSize:13,fontWeight:'600',color:'#bbb'},
  repliesWrap:{marginLeft:50,marginTop:8,borderLeftWidth:0},
  replyRow:{flexDirection:'row',gap:10,marginBottom:14},
  replyAvatar:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
  replyAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:11},
});'''

content = content.replace(old_ct, new_ct)

# Also fix the CommentThread to remove the gray bubble background
old_bubble = '''          <View style={ct.headerLine}>
              <Text style={ct.author}>{comment.author}</Text>
              <Text style={ct.meta}>{meta}</Text>
            </View>
            <Text style={ct.text}>{comment.text}</Text>'''

new_bubble = '''          <View style={ct.headerLine}>
              <Text style={ct.author}>{comment.author}</Text>
              <Text style={ct.meta}>{meta}</Text>
            </View>
            <Text style={ct.text}>{comment.text}</Text>'''

# Fix empty comments section to have gray background filling the whole modal
old_empty = '''              {(!activePost?.comments||activePost.comments.length===0) && (
                <View style={s.emptyComments}>
                  <Ionicons name="chatbubble-ellipses-outline" size={40} color="#e0dbd4"/>
                  <Text style={s.emptyCommentsTxt}>No comments yet</Text>
                  <Text style={s.emptyCommentsSub}>Be the first to share your thoughts</Text>
                </View>
              )}'''

new_empty = '''              {(!activePost?.comments||activePost.comments.length===0) && (
                <View style={s.emptyComments}>
                  <View style={{width:64,height:64,borderRadius:32,backgroundColor:'#f0ede8',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                    <Ionicons name="chatbubble-ellipses-outline" size={32} color="#c9a96e"/>
                  </View>
                  <Text style={s.emptyCommentsTxt}>No comments yet</Text>
                  <Text style={s.emptyCommentsSub}>Be the first to share your thoughts</Text>
                </View>
              )}'''

content = content.replace(old_empty, new_empty)

# Fix the modal background to be light gray so it doesnt look empty
old_modal_scroll = '''          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8}}>'''

new_modal_scroll = '''          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
            <ScrollView style={{flex:1,backgroundColor:'#faf9f6'}} keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingVertical:8}}>'''

content = content.replace(old_modal_scroll, new_modal_scroll)

open('app/(tabs)/community.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
