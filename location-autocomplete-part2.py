import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/edit-profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_field = """              <View style={s.fieldWrap}>
                <Text style={s.label}>Location</Text>
                <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
            </>
          )}"""

new_field = """              <View style={s.fieldWrap}>
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

if old_field in content:
    content = content.replace(old_field, new_field)
    print('Location dropdown UI wired in')
else:
    print('ERROR: target field block not found exactly')

with open('app/edit-profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
