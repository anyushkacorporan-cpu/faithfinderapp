import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'const s = StyleSheet.create' in content:
    print('s StyleSheet already present - aborting to avoid duplicate')
else:
    s_stylesheet = """
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  tabBar:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#999'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  composeBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.navy,borderRadius:22,paddingHorizontal:16,paddingVertical:9},
  composeBtnTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  discoverBanner:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:9,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)'},
  discoverTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  scroll:{flex:1},
  emptyFeed:{alignItems:'center',paddingVertical:64,paddingHorizontal:32,gap:12},
  emptyTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  emptySub:{fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20},
  emptyBtn:{marginTop:8,backgroundColor:COLORS.navy,borderRadius:22,paddingHorizontal:28,paddingVertical:13},
  emptyBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  modalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  cancelTxt:{fontSize:15,color:'#888'},
  modalTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  postBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:8},
  postBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  composeAuthor:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:16,paddingBottom:8},
  composeAvatar:{width:42,height:42,borderRadius:21,alignItems:'center',justifyContent:'center'},
  composeAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:15},
  composeAuthorName:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:8},
  visibilityRow:{flexDirection:'row',gap:8},
  visToggle:{flexDirection:'row',alignItems:'center',gap:6,alignSelf:'flex-start',borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:12,paddingVertical:6,marginTop:2},
  visToggleTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  visChip:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1.5,borderColor:COLORS.navy,borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  visChipActive:{backgroundColor:COLORS.navy},
  visChipTxt:{fontSize:11,fontWeight:'700',color:COLORS.navy},
  composeInput:{fontSize:16,color:COLORS.navy,lineHeight:25,minHeight:140,paddingHorizontal:16,paddingVertical:8,textAlignVertical:'top'},
  locationToggle:{flexDirection:'row',alignItems:'center',gap:10,marginHorizontal:16,paddingVertical:14,borderTopWidth:1,borderTopColor:'#f0ede8'},
  locationToggleTxt:{flex:1,fontSize:13},
  toggleSwitch:{width:46,height:27,borderRadius:14,backgroundColor:'#ddd',padding:3},
  toggleOn:{backgroundColor:COLORS.gold},
  toggleThumb:{width:21,height:21,borderRadius:11,backgroundColor:COLORS.white},
  toggleThumbOn:{transform:[{translateX:19}]},
  composeHint:{flexDirection:'row',alignItems:'flex-start',gap:8,marginHorizontal:16,paddingVertical:10},
  composeHintTxt:{flex:1,fontSize:12,color:'#aaa',lineHeight:18},
  quotedCard:{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,padding:12,marginTop:8,backgroundColor:'#faf9f6'},
  filterBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:10,paddingVertical:8},
  filterBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  filterBtnTxt:{fontSize:12,fontWeight:'600',color:COLORS.navy},
  resultCount:{fontSize:11,fontWeight:'700',color:'#bbb',letterSpacing:0.5,textTransform:'uppercase',paddingHorizontal:16,paddingTop:14,paddingBottom:6},
  searchBar:{flex:1,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:COLORS.lightBg,borderRadius:14,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:COLORS.border},
  searchInput:{flex:1,fontSize:14,color:COLORS.navy,padding:0},
});
"""

    content = content + s_stylesheet
    with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('s StyleSheet restored at end of file')

print('ALL DONE')
