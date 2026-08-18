#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Replace CommentThread function and its styles
old_comment_thread = '''// ── Comment Thread ────────────────────────────────────────
function CommentThread({comment,postId,onReply,onLike,onReplyLike}:{
  comment:Comment; postId:string; onReply:()=>void; onLike:()=>void; onReplyLike:(id:string)=>void;
}) {
  const [collapsed,setCollapsed]=useState(false);
  return (
    <View style={ct.wrap}>
      <View style={ct.row}>
        <View style={{alignItems:'center'}}>
          <View style={[ct.avatar,{backgroundColor:comment.color}]}>
            <Text style={ct.avatarTxt}>{comment.initials}</Text>
          </View>
          {comment.replies.length>0&&!collapsed&&<View style={ct.threadLine}/>}
        </View>
        <View style={{flex:1,paddingBottom:4}}>
          <View style={ct.bubble}>
            <View style={ct.bubbleHdr}>
              <Text style={ct.author}>{comment.author}</Text>
              {comment.city&&comment.state&&<Text style={ct.loc}>{comment.city}, {comment.state}</Text>}
              <Text style={ct.time}>{comment.time}</Text>
            </View>
            <Text style={ct.text}>{comment.text}</Text>
          </View>
          <View style={ct.actions}>
            <TouchableOpacity style={ct.actionBtn} onPress={onLike}>
              <Ionicons name={comment.liked?'heart':'heart-outline'} size={14} color={comment.liked?'#e74c6f':'#bbb'}/>
              {comment.likes>0&&<Text style={[ct.actionTxt,comment.liked&&{color:'#e74c6f'}]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={ct.actionBtn} onPress={onReply}>
              <Text style={ct.actionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length>0&&(
              <TouchableOpacity style={ct.actionBtn} onPress={()=>setCollapsed(!collapsed)}>
                <Text style={ct.actionTxt}>{collapsed?`View ${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`:'Hide replies'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Replies */}
      {!collapsed&&comment.replies.map((r,i)=>(
        <View key={r.id} style={ct.replyRow}>
          <View style={ct.replyIndent}>
            {i<comment.replies.length-1&&<View style={ct.replyLine}/>}
          </View>
          <View style={[ct.avatar,{width:28,height:28,borderRadius:14,backgroundColor:r.color}]}>
            <Text style={[ct.avatarTxt,{fontSize:10}]}>{r.initials}</Text>
          </View>
          <View style={{flex:1}}>
            <View style={ct.bubble}>
              <View style={ct.bubbleHdr}>
                <Text style={ct.author}>{r.author}</Text>
                {r.city&&r.state&&<Text style={ct.loc}>{r.city}, {r.state}</Text>}
                <Text style={ct.time}>{r.time}</Text>
              </View>
              <Text style={ct.text}>{r.text}</Text>
            </View>
            <View style={ct.actions}>
              <TouchableOpacity style={ct.actionBtn} onPress={()=>onReplyLike(r.id)}>
                <Ionicons name={r.liked?'heart':'heart-outline'} size={13} color={r.liked?'#e74c6f':'#bbb'}/>
                {r.likes>0&&<Text style={[ct.actionTxt,r.liked&&{color:'#e74c6f'}]}>{r.likes}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}'''

new_comment_thread = '''// ── Comment Thread ────────────────────────────────────────
function CommentThread({comment,postId,onReply,onLike,onReplyLike}:{
  comment:Comment; postId:string; onReply:()=>void; onLike:()=>void; onReplyLike:(id:string)=>void;
}) {
  const [collapsed,setCollapsed]=useState(false);
  const meta = [comment.city&&comment.state?comment.city+', '+comment.state:null, comment.time].filter(Boolean).join(' · ');
  return (
    <View style={ct.wrap}>
      {/* Main comment */}
      <View style={ct.commentRow}>
        <View style={[ct.avatar,{backgroundColor:comment.color}]}>
          <Text style={ct.avatarTxt}>{comment.initials}</Text>
        </View>
        <View style={{flex:1}}>
          <View style={ct.headerLine}>
            <Text style={ct.author}>{comment.author}</Text>
            <Text style={ct.meta}>{meta}</Text>
          </View>
          <Text style={ct.text}>{comment.text}</Text>
          <View style={ct.actions}>
            <TouchableOpacity style={ct.actionBtn} onPress={onLike} activeOpacity={0.7}>
              <Ionicons name={comment.liked?'heart':'heart-outline'} size={16} color={comment.liked?'#e74c6f':'#bbb'}/>
              {comment.likes>0&&<Text style={[ct.actionCount,comment.liked&&{color:'#e74c6f'}]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={ct.actionBtn} onPress={onReply} activeOpacity={0.7}>
              <Ionicons name="arrow-undo-outline" size={15} color="#bbb"/>
              <Text style={ct.actionLabel}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length>0&&(
              <TouchableOpacity style={ct.actionBtn} onPress={()=>setCollapsed(!collapsed)} activeOpacity={0.7}>
                <Ionicons name={collapsed?'chevron-down':'chevron-up'} size={14} color="#bbb"/>
                <Text style={ct.actionLabel}>
                  {collapsed?`${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`:'Hide'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Replies */}
      {!collapsed&&comment.replies.length>0&&(
        <View style={ct.repliesWrap}>
          {comment.replies.map(r=>{
            const rMeta = [r.city&&r.state?r.city+', '+r.state:null, r.time].filter(Boolean).join(' · ');
            return (
              <View key={r.id} style={ct.replyRow}>
                <View style={[ct.replyAvatar,{backgroundColor:r.color}]}>
                  <Text style={ct.replyAvatarTxt}>{r.initials}</Text>
                </View>
                <View style={{flex:1}}>
                  <View style={ct.headerLine}>
                    <Text style={ct.author}>{r.author}</Text>
                    <Text style={ct.meta}>{rMeta}</Text>
                  </View>
                  <Text style={ct.text}>{r.text}</Text>
                  <View style={ct.actions}>
                    <TouchableOpacity style={ct.actionBtn} onPress={()=>onReplyLike(r.id)} activeOpacity={0.7}>
                      <Ionicons name={r.liked?'heart':'heart-outline'} size={15} color={r.liked?'#e74c6f':'#bbb'}/>
                      {r.likes>0&&<Text style={[ct.actionCount,r.liked&&{color:'#e74c6f'}]}>{r.likes}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}'''

content = content.replace(old_comment_thread, new_comment_thread)

# Replace ct styles
old_ct = '''const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingTop:12},
  row:{flexDirection:'row',gap:10},
  avatar:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  threadLine:{width:2,flex:1,backgroundColor:'#ede9e3',marginTop:4,borderRadius:1,minHeight:16,alignSelf:'center'},
  bubble:{backgroundColor:'#f5f3ef',borderRadius:16,borderTopLeftRadius:4,padding:12,marginBottom:4,flex:1},
  bubbleHdr:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'},
  author:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  loc:{fontSize:11,color:'#bbb'},
  time:{fontSize:11,color:'#bbb',marginLeft:'auto'},
  text:{fontSize:14,color:'#333',lineHeight:21},
  actions:{flexDirection:'row',alignItems:'center',gap:14,paddingLeft:4,marginBottom:10},
  actionBtn:{flexDirection:'row',alignItems:'center',gap:4},
  actionTxt:{fontSize:12,color:'#aaa',fontWeight:'600'},
  replyRow:{flexDirection:'row',gap:8,paddingLeft:44,paddingBottom:4},
  replyIndent:{width:2,backgroundColor:'#ede9e3',borderRadius:1,marginRight:6},
  replyLine:{flex:1,width:2,backgroundColor:'#ede9e3'},
});'''

new_ct = '''const ct = StyleSheet.create({
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

content = content.replace(old_ct, new_ct)

# Also modernize the comment input bar
old_input = '''  commentInputArea:{borderTopWidth:1,borderTopColor:'#ede9e3',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?8:16},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:8,paddingBottom:4,backgroundColor:'#f8f7f4'},
  replyBannerTxt:{fontSize:12,color:'#888'},
  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},
  commentInput:{flex:1,backgroundColor:'#f5f3ef',borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy,maxHeight:100,borderWidth:1,borderColor:'#ede9e3'},
  sendBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},'''

new_input = '''  commentInputArea:{borderTopWidth:1,borderTopColor:'#f0ede8',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?8:16},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:10,paddingBottom:4,backgroundColor:'#faf9f6'},
  replyBannerTxt:{fontSize:12,color:'#888'},
  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:12},
  commentInput:{flex:1,backgroundColor:'#f5f3ef',borderRadius:24,paddingHorizontal:16,paddingVertical:11,fontSize:15,color:COLORS.navy,maxHeight:100},
  sendBtn:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:4},'''

content = content.replace(old_input, new_input)

open('app/(tabs)/community.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
