#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/community.tsx').read()

# Add missing styles to the s StyleSheet
content = content.replace(
    "const s = StyleSheet.create({",
    """const s = StyleSheet.create({
  tabBar:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#ede9e3',gap:10},
  tabToggle:{flex:1,flexDirection:'row',backgroundColor:'#ede9e3',borderRadius:100,padding:3},
  tabPill:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  tabPillActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:4,elevation:2},
  tabPillTxt:{fontSize:13,fontWeight:'600',color:'#aaa'},
  tabPillTxtActive:{color:COLORS.navy,fontWeight:'700'},
  newPostFab:{width:38,height:38,borderRadius:19,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  discoverHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:8,backgroundColor:'rgba(201,169,110,0.07)',borderBottomWidth:1,borderBottomColor:'rgba(201,169,110,0.12)'},
  discoverHeaderLeft:{flexDirection:'row',alignItems:'center',gap:6},
  discoverHeaderTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},"""
)

open('app/(tabs)/community.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
