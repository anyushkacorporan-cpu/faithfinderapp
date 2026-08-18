path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/profile.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { useEvents } from '../../src/lib/eventsStore';"
new1 = "import { useEvents } from '../../src/lib/eventsStore';\nimport { useSettings } from '../../src/lib/settingsStore';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """export default function ProfileScreen() {
  const user = useUser();"""
new2 = """export default function ProfileScreen() {
  const user = useUser();
  const appSettings = useSettings();"""
c2 = content.count(old2)
print('hook occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

# Personal profile location display
old3 = """            {!!user.location && (
              <>
                <View style={{width:1,height:12,backgroundColor:'#e5e0d8'}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={{fontSize:13,color:'#888'}}>{user.location.split(',').slice(0,2).join(',').trim()}</Text>
                </View>
              </>
            )}"""
new3 = """            {appSettings.privacy.showLocation && !!user.location && (
              <>
                <View style={{width:1,height:12,backgroundColor:'#e5e0d8'}} />
                <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={{fontSize:13,color:'#888'}}>{user.location.split(',').slice(0,2).join(',').trim()}</Text>
                </View>
              </>
            )}"""
c3 = content.count(old3)
print('personal location occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

# Church profile location display
old4 = """                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#888" />
                  <Text style={s.locationTxt} numberOfLines={1}>{user.address || user.location || ''}</Text>
                </View>"""
new4 = """                {appSettings.privacy.showLocation && (
                <View style={s.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#888" />
                  <Text style={s.locationTxt} numberOfLines={1}>{user.address || user.location || ''}</Text>
                </View>
                )}"""
c4 = content.count(old4)
print('church location occurrences:', c4)
if c4 == 1:
    content = content.replace(old4, new4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
