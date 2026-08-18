import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== 1. Remove Location field from Edit Profile (personal branch) =====
with open('app/edit-profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_loc_field = """              <View style={s.fieldWrap}>
                <Text style={s.label}>Location</Text>
                <TextInput
                  style={s.input}
                  value={location}
                  onChangeText={handleLocationChange}
                  placeholder="City, State"
                  placeholderTextColor={COLORS.placeholder}
                  onFocus={() => { if (locationSuggestions.length > 0) setShowLocationSuggestions(true); }}
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <View style={{borderWidth:1,borderColor:COLORS.border,borderRadius:10,marginTop:6,backgroundColor:COLORS.white,overflow:'hidden'}}>
                    {locationSuggestions.map((item, idx) => (
                      <TouchableOpacity
                        key={item.placeId}
                        style={{paddingHorizontal:14,paddingVertical:12,borderTopWidth:idx===0?0:1,borderTopColor:'#f0ede8'}}
                        onPress={() => selectLocationSuggestion(item.description)}
                      >
                        <Text style={{fontSize:14,color:COLORS.navy}}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}"""

new_loc_field = """            </>
          )}"""

if old_loc_field in content:
    content = content.replace(old_loc_field, new_loc_field)
    print('Location field removed from Edit Profile (personal)')
else:
    print('WARNING: full location block not found exactly, trying simpler version')
    old_simple = """              <View style={s.fieldWrap}>
                <Text style={s.label}>Location</Text>
                <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
            </>
          )}"""
    new_simple = """            </>
          )}"""
    if old_simple in content:
        content = content.replace(old_simple, new_simple)
        print('Location field removed (simple version matched)')
    else:
        print('ERROR: neither location block variant found')

with open('app/edit-profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ===== 2. Remove "Show my location" toggle from New Post compose (community.tsx) =====
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_toggle = """              <View style={s.locationToggle}>
                <Ionicons name="location-outline" size={15} color={showLocation?COLORS.gold:'#ccc'}/>
                <Text style={[s.locationToggleTxt,{color:showLocation?COLORS.navy:'#bbb'}]}>{showLocation&&user.location?user.location:'Show my location'}</Text>
                <TouchableOpacity style={[s.toggleSwitch,showLocation&&s.toggleOn]} onPress={() => setShowLocation(!showLocation)}>
                  <View style={[s.toggleThumb,showLocation&&s.toggleThumbOn]}/>
                </TouchableOpacity>
              </View>
              <View style={s.composeHint}>
                <Ionicons name={visibility==='public'?'earth-outline':'people-outline'} size={13} color={COLORS.gold}/>
                <Text style={s.composeHintTxt}>{visibility==='public'?'Visible to everyone in Discover':'Visible only to your connections in For You'}</Text>
              </View>"""

new_toggle = """              <View style={s.composeHint}>
                <Ionicons name={visibility==='public'?'earth-outline':'people-outline'} size={13} color={COLORS.gold}/>
                <Text style={s.composeHintTxt}>{visibility==='public'?'Visible to everyone in Discover':'Visible only to your connections in For You'}</Text>
              </View>"""

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle)
    print('Location toggle removed from New Post compose screen')
else:
    print('ERROR: location toggle block not found exactly')

# Also stop saving city/state on new posts since the toggle no longer exists
old_post_loc = """      city: showLocation ? (user.location?.includes(',') ? user.location.split(',')[0]?.trim() : user.location) : undefined,
      state: showLocation ? (user.location?.includes(',') ? user.location.split(',')[1]?.trim() : undefined) : undefined,"""
new_post_loc = """      city: undefined,
      state: undefined,"""

if old_post_loc in content:
    content = content.replace(old_post_loc, new_post_loc)
    print('addPost no longer attaches city/state')
else:
    print('WARNING: addPost location lines not found exactly (may already differ)')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
