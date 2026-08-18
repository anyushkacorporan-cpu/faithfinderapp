#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/create-event.tsx').read()

# Replace the picker modal with a properly sized one
old = '''      {/* Date/Time Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={()=>setShowPicker(false)}/>
        <View style={s.pickerSheet}>
          <View style={s.pickerSheetHdr}>
            <TouchableOpacity onPress={()=>setShowPicker(false)}><Text style={s.pickerCancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.pickerSheetTitle}>{pickerTarget.includes('Time')?'Select Time':'Select Date'}</Text>
            <TouchableOpacity onPress={confirmPicker}><Text style={s.pickerDone}>Done</Text></TouchableOpacity>
          </View>
          <DateTimePicker
            value={tempDate}
            mode={pickerMode}
            display="spinner"
            onChange={handlePickerChange}
            minimumDate={pickerMode==='date'?new Date():undefined}
            style={{height:200}}
          />
        </View>
      </Modal>'''

new = '''      {/* Date/Time Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.pickerOverlay}>
          <TouchableOpacity style={{flex:1}} activeOpacity={1} onPress={()=>setShowPicker(false)}/>
          <View style={s.pickerSheet}>
            <View style={s.pickerSheetHdr}>
              <TouchableOpacity onPress={()=>setShowPicker(false)}>
                <Text style={s.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={s.pickerSheetTitle}>{pickerTarget.includes('Time')?'Select Time':'Select Date'}</Text>
              <TouchableOpacity onPress={confirmPicker}>
                <Text style={s.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={s.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode={pickerMode}
                display="spinner"
                onChange={handlePickerChange}
                minimumDate={pickerMode==='date' ? new Date() : undefined}
                textColor={COLORS.navy}
                themeVariant="light"
              />
            </View>
          </View>
        </View>
      </Modal>'''

content = content.replace(old, new)

# Fix the picker styles
old_styles = '''  pickerOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  pickerSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:30},
  pickerSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  pickerCancel:{fontSize:15,color:'#888'},
  pickerSheetTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  pickerDone:{fontSize:15,color:COLORS.gold,fontWeight:'700'},'''

new_styles = '''  pickerOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  pickerSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:40},
  pickerSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  pickerCancel:{fontSize:16,color:'#888',fontWeight:'500'},
  pickerSheetTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  pickerDone:{fontSize:16,color:COLORS.gold,fontWeight:'700'},
  pickerContainer:{backgroundColor:COLORS.white,paddingVertical:8},'''

content = content.replace(old_styles, new_styles)

open('app/create-event.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
