import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== Fix edit-profile.tsx =====
with open('app/edit-profile.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove BOTH location field blocks (each is exactly 2 lines: label + input)
new_lines = []
skip_next = 0
removed_count = 0
for i, line in enumerate(lines):
    if skip_next > 0:
        skip_next -= 1
        continue
    if '<Text style={s.label}>Location</Text>' in line:
        # this line + the next line (the TextInput) get removed
        # also remove the wrapping <View style={s.fieldWrap}> above if present and the closing </View> below
        # Check if previous appended line was the View wrapper - remove it too
        if new_lines and '<View style={s.fieldWrap}>' in new_lines[-1]:
            new_lines.pop()
        skip_next = 1  # skip the TextInput line that follows
        removed_count += 1
        # Also need to skip the closing </View> on the next-next line
        # We'll handle this by checking ahead
        if i + 2 < len(lines) and '</View>' in lines[i+2]:
            skip_next = 2
        continue
    new_lines.append(line)

with open('app/edit-profile.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'Removed {removed_count} Location field block(s) from edit-profile.tsx')

# ===== Fix community.tsx =====
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove debug log
content = content.replace(
    "    console.log('LOCATION CHECK -> user.location:', JSON.stringify(user.location), '| showLocation:', showLocation);\n",
    ""
)
print('Debug log removed')

# Remove the location toggle block entirely
old_toggle_block = """              <View style={s.locationToggle}>
                <Ionicons name="location-outline" size={15} color={showLocation?COLORS.gold:'#ccc'}/>
                <Text style={[s.locationToggleTxt,{color:showLocation?COLORS.navy:'#bbb'}]}>{showLocation&&user.location?user.location:'Show my location'}</Text>
                <TouchableOpacity style={[s.toggleSwitch,showLocation&&s.toggleOn]} onPress={() => setShowLocation(!showLocation)}>
                  <View style={[s.toggleThumb,showLocation&&s.toggleThumbOn]}/>
                </TouchableOpacity>
              </View>
"""
if old_toggle_block in content:
    content = content.replace(old_toggle_block, "")
    print('Location toggle block removed')
else:
    print('ERROR: toggle block not found exactly - printing nearby content for inspection')
    idx = content.find('locationToggle')
    print(repr(content[idx-50:idx+400]))

# Stop saving city/state on posts
old_city_state = """      city: showLocation ? (user.location?.includes(',') ? user.location.split(',')[0]?.trim() : user.location) : undefined,
      state: showLocation ? (user.location?.includes(',') ? user.location.split(',')[1]?.trim() : undefined) : undefined,"""
new_city_state = """      city: undefined,
      state: undefined,"""
if old_city_state in content:
    content = content.replace(old_city_state, new_city_state)
    print('City/state assignment cleared')
else:
    print('WARNING: city/state lines not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
