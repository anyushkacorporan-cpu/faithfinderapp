path1 = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/settings-privacy.tsx'
with open(path1, encoding='utf-8') as f:
    content = f.read()

old1 = "  const { publicProfile, showLocation, allowMessages } = settings.privacy;"
new1 = "  const { publicProfile, showLocation } = settings.privacy;"
c1 = content.count(old1)
print('destructure occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Allow Messages</Text>
              <Text style={s.rowDesc}>Let other members message you</Text>
            </View>
            <Switch value={allowMessages} onValueChange={(v) => updatePrivacyPrefs({allowMessages:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>"""
new2 = """        </View>"""
c2 = content.count(old2)
print('JSX row occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

# The row above Allow Messages currently has s.rowBorder since it wasn't the last item;
# now that Allow Messages is removed, Show Location becomes the last row and should
# drop its bottom border to match the card's visual pattern used elsewhere in the app.
old3 = """          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location-outline" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Show Location on Profile</Text>
              <Text style={s.rowDesc}>Display your city on your profile</Text>
            </View>
            <Switch value={showLocation} onValueChange={(v) => updatePrivacyPrefs({showLocation:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>"""
new3 = """          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location-outline" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Show Location on Profile</Text>
              <Text style={s.rowDesc}>Display your city on your profile</Text>
            </View>
            <Switch value={showLocation} onValueChange={(v) => updatePrivacyPrefs({showLocation:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>"""
c3 = content.count(old3)
print('border-fix occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/settingsStore.ts'
with open(path2, encoding='utf-8') as f:
    content2 = f.read()

old4 = "  publicProfile: boolean; showLocation: boolean; allowMessages: boolean;"
new4 = "  publicProfile: boolean; showLocation: boolean;"
c4 = content2.count(old4)
print('type occurrences:', c4)
if c4 == 1:
    content2 = content2.replace(old4, new4)

old5 = "    publicProfile: true, showLocation: false, allowMessages: true,"
new5 = "    publicProfile: true, showLocation: false,"
c5 = content2.count(old5)
print('default occurrences:', c5)
if c5 == 1:
    content2 = content2.replace(old5, new5)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print('Done')
