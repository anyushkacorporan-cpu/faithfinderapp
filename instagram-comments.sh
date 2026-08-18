#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/(tabs)/community.tsx').read()

new_thread = '''// ── Comment Thread ────────────────────────────────────────
function CommentThread({comment,postId,onReply,onLike,onReplyLike}:{
  comment:Comment; postId:string; onReply:()=>void; onLike:()=>void; onReplyLike:(id:string)=>void;
}) {
  const [collapsed,setCollapsed]=useState(false);
  return (
    <View style={ct.wrap}>
      <View style={ct.row}>
        <View style={[ct.avatar,{backgroundColor:comment.color}]}>
          <Text style={ct.avatarTxt}>{comment.initials}</Text>
        </View>
        <View style={{flex:1}}>
          <Text style={ct.text}>
            <Text style={ct.name}>{comment.author} </Text>
            {comment.text}
          </Text>
          <View style={ct.meta}>
            <Text style={ct.metaTxt}>{comment.time}</Text>
            {comment.city&&comment.state&&<Text style={ct.metaTxt}>{comment.city}, {comment.state}</Text>}
            {comment.likes>0&&<Text style={ct.metaTxt}>{comment.likes} like{comment.likes>1?'s':''}</Text>}
            <TouchableOpacity onPress={onReply} activeOpacity={0.6}>
              <Text style={ct.metaAction}>Reply</Text>
            </TouchableOpacity>
          </View>
          {comment.replies.length>0&&(
            <TouchableOpacity onPress={()=>setCollapsed(!collapsed)} activeOpacity={0.6} style={ct.viewRepliesBtn}>
              <View style={ct.viewRepliesLine}/>
              <Text style={ct.viewRepliesTxt}>{collapsed?`View ${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`:'Hide replies'}</Text>
            </TouchableOpacity>
          )}
          {!collapsed&&comment.replies.map(r=>(
            <View key={r.id} style={ct.replyRow}>
              <View style={[ct.replyAvatar,{backgroundColor:r.color}]}>
                <Text style={ct.replyAvatarTxt}>{r.initials}</Text>
              </View>
              <View style={{flex:1}}>
                <Text style={ct.text}>
                  <Text style={ct.name}>{r.author} </Text>
                  {r.text}
                </Text>
                <View style={ct.meta}>
                  <Text style={ct.metaTxt}>{r.time}</Text>
                  {r.city&&r.state&&<Text style={ct.metaTxt}>{r.city}, {r.state}</Text>}
                  {r.likes>0&&<Text style={ct.metaTxt}>{r.likes} like{r.likes>1?'s':''}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={()=>onReplyLike(r.id)} activeOpacity={0.6} style={ct.likeBtn}>
                <Ionicons name={r.liked?'heart':'heart-outline'} size={12} color={r.liked?'#e74c6f':'#ccc'}/>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={onLike} activeOpacity={0.6} style={ct.likeBtn}>
          <Ionicons name={comment.liked?'heart':'heart-outline'} size={13} color={comment.liked?'#e74c6f':'#ccc'}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ct = StyleSheet.create({
  wrap:{paddingHorizontal:16,paddingVertical:10},
  row:{flexDirection:'row',gap:12,alignItems:'flex-start'},
  avatar:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  avatarTxt:{color:'#fff',fontWeight:'700',fontSize:12},
  text:{fontSize:14,color:'#111',lineHeight:21,marginBottom:5,flex:1},
  name:{fontWeight:'700',color:'#111'},
  meta:{flexDirection:'row',alignItems:'center',gap:12},
  metaTxt:{fontSize:12,color:'#999'},
  metaAction:{fontSize:12,color:'#999',fontWeight:'700'},
  likeBtn:{paddingLeft:8,paddingTop:2},
  viewRepliesBtn:{flexDirection:'row',alignItems:'center',gap:8,marginTop:8,marginBottom:4},
  viewRepliesLine:{width:24,height:1,backgroundColor:'#ddd'},
  viewRepliesTxt:{fontSize:12,color:'#999',fontWeight:'600'},
  replyRow:{flexDirection:'row',gap:10,alignItems:'flex-start',marginTop:12},
  replyAvatar:{width:26,height:26,borderRadius:13,alignItems:'center',justifyContent:'center'},
  replyAvatarTxt:{color:'#fff',fontWeight:'700',fontSize:9},
});'''

content = re.sub(
    r'// ── Comment Thread ─+.*?^const ct = StyleSheet\.create\(\{.*?\}\);',
    new_thread,
    content,
    flags=re.DOTALL|re.MULTILINE
)

# Fix comments modal - white bg, no padding issues
content = content.replace(
    "<ScrollView style={{flex:1,backgroundColor:'#fff'}} keyboardShouldPersistTaps=\"handled\" contentContainerStyle={{paddingBottom:20}}>",
    "<ScrollView style={{flex:1,backgroundColor:'#fff'}} keyboardShouldPersistTaps=\"handled\" contentContainerStyle={{paddingTop:4,paddingBottom:20}}>"
)

content = content.replace(
    "<ScrollView style={{flex:1,backgroundColor:'#faf9f6'}} keyboardShouldPersistTaps=\"handled\" contentContainerStyle={{paddingVertical:8}}>",
    "<ScrollView style={{flex:1,backgroundColor:'#fff'}} keyboardShouldPersistTaps=\"handled\" contentContainerStyle={{paddingTop:4,paddingBottom:20}}>"
)

# Fix comment input bar - Instagram style
content = content.replace(
    "  commentInputArea:{borderTopWidth:1,borderTopColor:'#f0ede8',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?8:16},",
    "  commentInputArea:{borderTopWidth:1,borderTopColor:'#f0f0f0',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?20:16},"
)
content = content.replace(
    "  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:12},",
    "  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},"
)
content = content.replace(
    "  commentInput:{flex:1,backgroundColor:'#f5f3ef',borderRadius:24,paddingHorizontal:16,paddingVertical:12,fontSize:15,color:COLORS.navy,maxHeight:100,borderWidth:0},",
    "  commentInput:{flex:1,backgroundColor:'#f2f2f2',borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#111',maxHeight:80},"
)
content = content.replace(
    "  sendBtn:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:2},shadowOpacity:0.3,shadowRadius:4},",
    "  sendBtn:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},"
)

# Fix avatarSm used in input bar
content = content.replace(
    "  avatarSm:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},",
    "  avatarSm:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},"
)

open('app/(tabs)/community.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
