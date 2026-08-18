#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Add the full s StyleSheet before the ct StyleSheet
s_styles = '''
// ── Main Styles ───────────────────────────────────────────
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f5f3ef'},
  tabBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#ede9e3',gap:10},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#ede9e3',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4,elevation:2},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#aaa'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  newPostFab:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  discoverHeader:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:8,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)',gap:6},
  discoverHeaderLeft:{flexDirection:'row',alignItems:'center',gap:6},
  discoverHeaderTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  feed:{flex:1},
  modalRoot:{flex:1,backgroundColor:COLORS.white},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#ede9e3'},
  modalCancelTxt:{fontSize:15,color:'#888',fontWeight:'500'},
  modalHdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  modalPostBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},
  modalPostBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  createComposer:{flexDirection:'row',gap:12,padding:16},
  createName:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:6},
  createInput:{fontSize:16,color:COLORS.navy,minHeight:120,textAlignVertical:'top',lineHeight:24},
  avatarLg:{width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},
  avatarLgTxt:{color:COLORS.white,fontWeight:'700',fontSize:16},
  avatarSm:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},
  avatarSmTxt:{color:COLORS.white,fontWeight:'700',fontSize:12},
  avatarXs:{width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},
  avatarXsTxt:{color:COLORS.white,fontWeight:'700',fontSize:9},
  avatarLine:{width:2,flex:1,minHeight:24,backgroundColor:'#ede9e3',marginTop:6,borderRadius:1},
  emptyComments:{paddingVertical:48,alignItems:'center',gap:8},
  emptyCommentsTxt:{fontSize:15,fontWeight:'600',color:'#bbb'},
  emptyCommentsSub:{fontSize:13,color:'#ccc'},
  commentInputArea:{borderTopWidth:1,borderTopColor:'#f0f0f0',backgroundColor:COLORS.white,paddingBottom:Platform.OS==='ios'?20:16},
  replyBanner:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingTop:10,paddingBottom:4,backgroundColor:'#faf9f6'},
  replyBannerTxt:{fontSize:12,color:'#888'},
  commentInputRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10},
  commentInput:{flex:1,backgroundColor:'#f2f2f2',borderRadius:22,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:'#111',maxHeight:80},
  sendBtn:{width:34,height:34,borderRadius:17,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  shareComposer:{flexDirection:'row',gap:12,padding:16},
  shareInput:{fontSize:16,color:COLORS.navy,minHeight:60,textAlignVertical:'top',lineHeight:24,marginBottom:12,paddingTop:4},
  quotedPost:{borderWidth:1.5,borderColor:'#ede9e3',borderRadius:14,padding:12,backgroundColor:'#f8f7f4'},
  quotedPostHdr:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:6},
  quotedPostAuthor:{fontSize:13,fontWeight:'700',color:COLORS.navy,flex:1},
  quotedPostLoc:{fontSize:11,color:'#bbb'},
  quotedPostContent:{fontSize:13,color:'#555',lineHeight:19},
  shareOrDivider:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:16,marginVertical:16},
  shareOrLine:{flex:1,height:1,backgroundColor:'#ede9e3'},
  shareOrTxt:{fontSize:12,color:'#bbb'},
  externalRow:{flexDirection:'row',justifyContent:'space-around',paddingHorizontal:20,paddingBottom:20},
  externalBtn:{alignItems:'center',gap:8},
  externalIcon:{width:54,height:54,borderRadius:16,alignItems:'center',justifyContent:'center'},
  externalLabel:{fontSize:12,color:'#333',fontWeight:'600'},
});

'''

content = content.replace(
    '\n// ── Comment Thread ─',
    s_styles + '\n// ── Comment Thread ─'
)

open('app/(tabs)/community.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
