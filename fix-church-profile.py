import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the duplicate notification + settings icons (the overlay ones in the cover photo area)
old_overlay_icons = """                  <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(0,0,0,0.3)',alignItems:'center',justifyContent:'center'}} onPress={() => setShowSettings(true)}>
                  <Ionicons name="settings-outline" size={20} color={COLORS.white} />"""

if old_overlay_icons in content:
    # Find the parent View containing both and remove it
    # Look for the container starting point
    idx = content.find(old_overlay_icons)
    # Find the start of the wrapping View (search backwards for the nearest <View style={{position:'absolute'...)
    start = content.rfind('<View style={{position:\'absolute\'', 0, idx)
    # Find the closing </View> after the icons
    end = content.find('</View>', idx) + len('</View>')
    content = content[:start] + content[end:]
    print('Duplicate overlay icons removed')
else:
    print('WARNING: overlay icons not found exactly - checking alternate')
    # Try simpler removal of just the notification icon line
    idx = content.find("name=\"notifications-outline\" size={20} color={COLORS.white}")
    if idx != -1:
        print('Found notification icon at church profile overlay')

# 2. Consolidate two Edit buttons into one - remove the "Edit" link in sectionHdr
old_edit_link = """            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>Information</Text>
              <TouchableOpacity onPress={() => router.push('/edit-church-profile')}>
                <Text style={s.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>"""

new_edit_link = """            <View style={s.sectionHdr}>
              <Text style={s.sectionTitle}>Information</Text>
            </View>"""

if old_edit_link in content:
    content = content.replace(old_edit_link, new_edit_link)
    print('Duplicate Edit link removed from Information section')
else:
    print('WARNING: Information section Edit link not found exactly')

# 3. Remove the Share icon from the actions row
old_share = """            <View style={s.actionIcons}>
              <TouchableOpacity style={s.actionIconBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={20} color="#888" />
              </TouchableOpacity>"""

new_share = """            <View style={s.actionIcons}>"""

if old_share in content:
    content = content.replace(old_share, new_share)
    print('Share icon removed from church profile actions row')
else:
    print('WARNING: share icon block not found exactly')

# 4. Hide "Write a review" button for church owners (they are viewing their own profile)
old_review = """          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={18} color={COLORS.gold} />)}
            <Text style={s.ratingTxt}>No reviews yet</Text>
            <TouchableOpacity style={s.writeReviewBtn}>
              <Text style={s.writeReviewTxt}>Write a review</Text>
            </TouchableOpacity>
          </View>"""

new_review = """          <View style={s.starsRow}>
            {[1,2,3,4,5].map(i => <Ionicons key={i} name="star-outline" size={18} color={COLORS.gold} />)}
            <Text style={s.ratingTxt}>No reviews yet</Text>
          </View>"""

if old_review in content:
    content = content.replace(old_review, new_review)
    print('"Write a review" button removed for church owner view')
else:
    print('WARNING: starsRow with write review not found exactly')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - profile.tsx')
