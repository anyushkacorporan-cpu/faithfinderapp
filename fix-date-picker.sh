#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
content = open('app/create-event.tsx').read()

# Replace the schedule grid section with better styled date/time pickers
old = '''              {/* Date/Time pickers */}
              <Text style={s.fieldLbl}>Event Schedule *</Text>
              <View style={s.scheduleGrid}>
                <TouchableOpacity style={[s.datePickerBtn,!!errors.startDate&&s.inputErr]} onPress={()=>openPicker('startDate')}>
                  <Ionicons name="calendar-outline" size={16} color={startDate?COLORS.navy:'#bbb'}/>
                  <Text style={[s.datePickerTxt,!startDate&&s.datePickerPH]}>{startDate?startDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Start Date'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.datePickerBtn} onPress={()=>openPicker('startTime')}>
                  <Ionicons name="time-outline" size={16} color={startTime?COLORS.navy:'#bbb'}/>
                  <Text style={[s.datePickerTxt,!startTime&&s.datePickerPH]}>{startTime?formatTime(startTime):'Start Time'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.datePickerBtn} onPress={()=>openPicker('endDate')}>
                  <Ionicons name="calendar-outline" size={16} color={endDate?COLORS.navy:'#bbb'}/>
                  <Text style={[s.datePickerTxt,!endDate&&s.datePickerPH]}>{endDate?endDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'End Date'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.datePickerBtn} onPress={()=>openPicker('endTime')}>
                  <Ionicons name="time-outline" size={16} color={endTime?COLORS.navy:'#bbb'}/>
                  <Text style={[s.datePickerTxt,!endTime&&s.datePickerPH]}>{endTime?formatTime(endTime):'End Time'}</Text>
                </TouchableOpacity>
              </View>
              {!!errors.startDate&&<Text style={s.errTxt}>Start date is required</Text>}'''

new = '''              {/* Date/Time pickers */}
              <Text style={s.fieldLbl}>Event Schedule *</Text>
              <View style={s.scheduleCard}>
                <View style={s.scheduleRow}>
                  <Text style={s.scheduleSectionLbl}>START</Text>
                  <View style={s.scheduleBtnsRow}>
                    <TouchableOpacity style={[s.schedulePicker, startDate && s.schedulePickerFilled, !!errors.startDate && s.schedulePickerErr]} onPress={()=>openPicker('startDate')}>
                      <View style={[s.scheduleIconWrap, startDate && s.scheduleIconWrapFilled]}>
                        <Ionicons name="calendar" size={16} color={startDate ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>Date</Text>
                        <Text style={[s.schedulePickerValue, !startDate && s.schedulePickerPH]}>
                          {startDate ? startDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={startDate ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.schedulePicker, startTime && s.schedulePickerFilled]} onPress={()=>openPicker('startTime')}>
                      <View style={[s.scheduleIconWrap, startTime && s.scheduleIconWrapFilledTime]}>
                        <Ionicons name="time" size={16} color={startTime ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>Time</Text>
                        <Text style={[s.schedulePickerValue, !startTime && s.schedulePickerPH]}>
                          {startTime ? formatTime(startTime) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={startTime ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.scheduleDivider}/>

                <View style={s.scheduleRow}>
                  <Text style={s.scheduleSectionLbl}>END</Text>
                  <View style={s.scheduleBtnsRow}>
                    <TouchableOpacity style={[s.schedulePicker, endDate && s.schedulePickerFilled]} onPress={()=>openPicker('endDate')}>
                      <View style={[s.scheduleIconWrap, endDate && s.scheduleIconWrapFilled]}>
                        <Ionicons name="calendar" size={16} color={endDate ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>Date</Text>
                        <Text style={[s.schedulePickerValue, !endDate && s.schedulePickerPH]}>
                          {endDate ? endDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={endDate ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.schedulePicker, endTime && s.schedulePickerFilled]} onPress={()=>openPicker('endTime')}>
                      <View style={[s.scheduleIconWrap, endTime && s.scheduleIconWrapFilledTime]}>
                        <Ionicons name="time" size={16} color={endTime ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>Time</Text>
                        <Text style={[s.schedulePickerValue, !endTime && s.schedulePickerPH]}>
                          {endTime ? formatTime(endTime) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={endTime ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {!!errors.startDate&&<Text style={s.errTxt}>Start date is required</Text>}'''

content = content.replace(old, new)

# Replace old schedule grid styles with new ones
old_styles = '''  scheduleGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8},
  datePickerBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:12,paddingVertical:12,width:'48%'},
  datePickerTxt:{fontSize:13,color:COLORS.navy,flex:1},
  datePickerPH:{color:COLORS.placeholder},'''

new_styles = '''  scheduleCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,overflow:'hidden',marginBottom:8},
  scheduleRow:{padding:14},
  scheduleSectionLbl:{fontSize:10,fontWeight:'700',color:'#aaa',letterSpacing:1,textTransform:'uppercase',marginBottom:10},
  scheduleBtnsRow:{gap:8},
  schedulePicker:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:12,backgroundColor:COLORS.white},
  schedulePickerFilled:{borderColor:'rgba(26,26,46,0.15)',backgroundColor:COLORS.lightBg},
  schedulePickerErr:{borderColor:COLORS.red},
  scheduleIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  scheduleIconWrapFilled:{backgroundColor:COLORS.navy},
  scheduleIconWrapFilledTime:{backgroundColor:'#667eea'},
  schedulePickerInfo:{flex:1},
  schedulePickerLabel:{fontSize:10,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2},
  schedulePickerValue:{fontSize:14,fontWeight:'600',color:COLORS.navy},
  schedulePickerPH:{color:'#bbb',fontWeight:'400'},
  scheduleDivider:{height:1,backgroundColor:COLORS.border},
  datePickerBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:12,paddingVertical:12,width:'48%'},
  datePickerTxt:{fontSize:13,color:COLORS.navy,flex:1},
  datePickerPH:{color:COLORS.placeholder},'''

content = content.replace(old_styles, new_styles)

open('app/create-event.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
