#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 - << 'PYEOF'
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_fn = """function CommentItem({ comment, postId, onReply, onLike, onReplyLike }: {
  comment: Comment; postId: string; onReply: () => void; onLike: () => void; onReplyLike: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  return (
    <View style={s.commentItem}>
      <View style={{flexDirection:'row',gap:10}}>
        <View style={{alignItems:'center'}}>
          <View style={[s.commentAvatar, {backgroundColor: comment.color}]}>
            <Text style={s.commentAvatarTxt}>{comment.initials}</Text>
          </View>
          {comment.replies.length > 0 && showReplies && (
            <View style={{width:2,flex:1,backgroundColor:'#f0ede8',marginTop:4,borderRadius:1,minHeight:20}} />
          )}
        </View>
        <View style={{flex:1}}>
          <View style={s.commentBubble}>
            <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
              <Text style={s.commentAuthor}>{comment.author}</Text>
              {comment.city && comment.state && (
                <Text style={s.commentLocation}>{comment.city}, {comment.state}</Text>
              )}
            </View>
            <Text style={s.commentText}>{comment.text}</Text>
          </View>
          <View style={s.commentActions}>
            <Text style={s.commentTime}>{comment.time}</Text>
            <TouchableOpacity onPress={onLike}>
              <Text style={[s.commentActionTxt, comment.liked&&{color:COLORS.red}]}>
                {comment.liked?'♥':'♡'} {comment.likes > 0 ? comment.likes : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onReply}>
              <Text style={s.commentActionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length > 0 && (
              <TouchableOpacity onPress={() => setShowReplies(!showReplies)}>
                <Text style={s.commentActionTxt}>{showReplies ? 'Hide' : `${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`}</Text>
              </TouchableOpacity>
            )}
          </View>
          {showReplies && comment.replies.map(reply => (
            <View key={reply.id} style={s.replyItem}>
              <View style={[s.commentAvatar, {width:28,height:28,borderRadius:14,backgroundColor:reply.color}]}>
                <Text style={[s.commentAvatarTxt,{fontSize:10}]}>{reply.initials}</Text>
              </View>
              <View style={{flex:1}}>
                <View style={s.commentBubble}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3}}>
                    <Text style={s.commentAuthor}>{reply.author}</Text>
                    {reply.city && reply.state && (
                      <Text style={s.commentLocation}>{reply.city}, {reply.state}</Text>
                    )}
                  </View>
                  <Text style={s.commentText}>{reply.text}</Text>
                </View>
                <View style={s.commentActions}>
                  <Text style={s.commentTime}>{reply.time}</Text>
                  <TouchableOpacity onPress={() => onReplyLike(reply.id)}>
                    <Text style={[s.commentActionTxt, reply.liked&&{color:COLORS.red}]}>
                      {reply.liked?'♥':'♡'} {reply.likes > 0 ? reply.likes : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>"""

new_fn = """function CommentItem({ comment, postId, onReply, onLike, onReplyLike }: {
  comment: Comment; postId: string; onReply: () => void; onLike: () => void; onReplyLike: (id: string) => void;
}) {
  const [showReplies, setShowReplies] = useState(true);
  return (
    <View style={s.commentItem}>
      {/* Main comment */}
      <View style={{flexDirection:'row',gap:12}}>
        <View style={[s.commentAvatar,{backgroundColor:comment.color}]}>
          <Text style={s.commentAvatarTxt}>{comment.initials}</Text>
        </View>
        <View style={{flex:1}}>
          <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:4,marginBottom:4}}>
            <Text style={s.commentAuthor}>{comment.author}</Text>
            {comment.city&&comment.state&&<Text style={s.commentMeta}>· {comment.city}, {comment.state}</Text>}
            <Text style={s.commentMeta}>· {comment.time}</Text>
          </View>
          <Text style={s.commentText}>{comment.text}</Text>
          <View style={s.commentActions}>
            <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4}} onPress={onLike}>
              <Ionicons name={comment.liked?'heart':'heart-outline'} size={15} color={comment.liked?COLORS.red:'#bbb'}/>
              {comment.likes>0&&<Text style={[s.commentActionTxt,comment.liked&&{color:COLORS.red}]}>{comment.likes}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onReply}>
              <Text style={s.commentActionTxt}>Reply</Text>
            </TouchableOpacity>
            {comment.replies.length>0&&(
              <TouchableOpacity onPress={()=>setShowReplies(!showReplies)}>
                <Text style={s.commentActionTxt}>{showReplies?'Hide replies':`${comment.replies.length} repl${comment.replies.length>1?'ies':'y'}`}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {/* Replies */}
      {showReplies&&comment.replies.map(reply=>(
        <View key={reply.id} style={{flexDirection:'row',gap:10,marginTop:14,marginLeft:48}}>
          <View style={[s.commentAvatar,{width:30,height:30,borderRadius:15,backgroundColor:reply.color}]}>
            <Text style={[s.commentAvatarTxt,{fontSize:11}]}>{reply.initials}</Text>
          </View>
          <View style={{flex:1}}>
            <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:4,marginBottom:4}}>
              <Text style={s.commentAuthor}>{reply.author}</Text>
              {reply.city&&reply.state&&<Text style={s.commentMeta}>· {reply.city}, {reply.state}</Text>}
              <Text style={s.commentMeta}>· {reply.time}</Text>
            </View>
            <Text style={s.commentText}>{reply.text}</Text>
            <View style={s.commentActions}>
              <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4}} onPress={()=>onReplyLike(reply.id)}>
                <Ionicons name={reply.liked?'heart':'heart-outline'} size={14} color={reply.liked?COLORS.red:'#bbb'}/>
                {reply.likes>0&&<Text style={[s.commentActionTxt,reply.liked&&{color:COLORS.red}]}>{reply.likes}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}"""

old_styles = """  commentItem:{paddingHorizontal:16,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f8f7f4'},
  commentAvatar:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  commentBubble:{backgroundColor:'#f8f7f4',borderRadius:14,padding:10,marginBottom:4},
  commentAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy},
  commentLocation:{fontSize:11,color:'#aaa'},
  commentText:{fontSize:14,color:'#333',lineHeight:20},
  commentActions:{flexDirection:'row',alignItems:'center',gap:14,paddingLeft:4,marginBottom:8},
  commentTime:{fontSize:11,color:'#bbb'},
  commentActionTxt:{fontSize:12,fontWeight:'600',color:'#888'},
  replyItem:{flexDirection:'row',gap:8,marginLeft:8,marginBottom:6},"""

new_styles = """  commentItem:{paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  commentAvatar:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  commentAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:13},
  commentAuthor:{fontSize:14,fontWeight:'700',color:'#1a1a2e'},
  commentMeta:{fontSize:12,color:'#aaa',fontWeight:'400'},
  commentText:{fontSize:14,color:'#333',lineHeight:22,marginBottom:8},
  commentActions:{flexDirection:'row',alignItems:'center',gap:18},
  commentActionTxt:{fontSize:12,fontWeight:'600',color:'#aaa'},"""

if old_fn in content:
    content = content.replace(old_fn, new_fn)
    content = content.replace(old_styles, new_styles)
    with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('ALL DONE')
else:
    print('ERROR: string not found')
PYEOF
