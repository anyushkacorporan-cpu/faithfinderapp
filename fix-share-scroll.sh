#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()

# Make the TextInput smaller so buttons are visible without scrolling
content = content.replace(
    "  composerInput:{fontSize:16,color:COLORS.navy,minHeight:80,textAlignVertical:'top',marginBottom:14,lineHeight:24,paddingTop:4},",
    "  composerInput:{fontSize:16,color:COLORS.navy,minHeight:50,textAlignVertical:'top',marginBottom:10,lineHeight:24,paddingTop:4},"
)

# Make the share scroll not scroll — show everything at once
content = content.replace(
    "          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>\n            <ScrollView style={s.shareScroll} keyboardShouldPersistTaps=\"handled\">",
    "          <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>\n            <ScrollView style={s.shareScroll} contentContainerStyle={{paddingBottom:40}} keyboardShouldPersistTaps=\"handled\" showsVerticalScrollIndicator={false}>"
)

# Make quoted card shorter
content = content.replace(
    "  quotedCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:12,marginBottom:16,backgroundColor:COLORS.lightBg},",
    "  quotedCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:10,marginBottom:10,backgroundColor:COLORS.lightBg},"
)

open('app/(tabs)/events.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
