import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ── Fix 1: Match scripture style to Events tab ────────────────────────────────
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    community = f.read()

old_scripture = '''function ScriptureCard() {
  const ITEMS = [
    { text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."', ref: 'Jeremiah 29:11' },
    { text: '"I can do all this through him who gives me strength."', ref: 'Philippians 4:13' },
    { text: '"Trust in the Lord with all your heart."', ref: 'Proverbs 3:5' },
    { text: '"Be strong and courageous. Do not be afraid."', ref: 'Joshua 1:9' },
    { text: '"The Lord is my shepherd, I lack nothing."', ref: 'Psalm 23:1' },
    { text: '"And we know that in all things God works for the good of those who love him."', ref: 'Romans 8:28' },
    { text: '"Come to me, all you who are weary and burdened, and I will give you rest."', ref: 'Matthew 11:28' },
  ];
  const item = ITEMS[new Date().getDay() % ITEMS.length];
  return (
    <View style={{backgroundColor:'rgba(201,169,110,0.06)',borderBottomWidth:1,borderTopWidth:1,borderColor:'rgba(201,169,110,0.2)',paddingHorizontal:16,paddingVertical:14,marginBottom:8}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
        <Ionicons name="book-outline" size={13} color={COLORS.gold}/>
        <Text style={{fontSize:11,fontWeight:'700',color:COLORS.gold,textTransform:'uppercase',letterSpacing:0.8}}>Daily Scripture</Text>
      </View>
      <Text style={{fontSize:14,color:COLORS.navy,lineHeight:22,fontStyle:'italic',marginBottom:6}}>{item.text}</Text>
      <Text style={{fontSize:12,fontWeight:'700',color:COLORS.gold}}>{item.ref}</Text>
    </View>
  );
}'''

new_scripture = '''function ScriptureCard() {
  return (
    <View style={{paddingHorizontal:20,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#ede9e3'}}>
      <Text style={{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:12,color:'#999',textAlign:'center',lineHeight:18}}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
    </View>
  );
}'''

if old_scripture in community:
    community = community.replace(old_scripture, new_scripture)
    print('Scripture style updated')
else:
    print('WARNING: scripture not found - may already be different')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(community)

# ── Fix 2: Profile icons - make them open the Header modal/settings ───────────
with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    profile = f.read()

# Fix notification icon - should use router to settings/notifications
# The community notifications are in the Header component as a modal
# For profile, route to a dedicated screen or trigger header
# Best approach: route to settings for settings, and use Alert for notifications
# since notifications live in Header modal

# Fix pencil icon - route to edit profile
old_pencil = "onPress={() => router.push('/edit-church-profile')}"
new_pencil = "onPress={() => router.push('/edit-church-profile' as any)}"
profile = profile.replace(old_pencil, new_pencil)

# Fix connections button
old_conn = "<TouchableOpacity style={s.connectionsRow}>"
new_conn = "<TouchableOpacity style={s.connectionsRow} onPress={() => router.push('/connections' as any)}>"
if old_conn in profile:
    profile = profile.replace(old_conn, new_conn)
    print('Connections button fixed')

# Fix personal profile edit button (pencil in verseRefRow)
# Add edit profile button to personal profile
old_verse_pencil = '''          <View style={s.verseRefRow}>
              <Text style={s.verseRef}>{user.lifeVerseRef}</Text>
              <Ionicons name="pencil-outline" size={13} color={COLORS.gold} />
            </View>'''
new_verse_pencil = '''          <View style={s.verseRefRow}>
              <Text style={s.verseRef}>{user.lifeVerseRef}</Text>
              <TouchableOpacity onPress={() => router.push('/settings-profile' as any)}>
                <Ionicons name="pencil-outline" size={13} color={COLORS.gold} />
              </TouchableOpacity>
            </View>'''
profile = profile.replace(old_verse_pencil, new_verse_pencil)

# Add Edit Profile button to personal profile section
old_ministries = '''          <View style={s.ministriesRow}>
            {['Worship','Outreach'].map(m => (
              <View key={m} style={s.ministryTag}><Text style={s.ministryTagTxt}>{m}</Text></View>
            ))}
          </View>'''
new_ministries = '''          <View style={s.ministriesRow}>
            {['Worship','Outreach'].map(m => (
              <View key={m} style={s.ministryTag}><Text style={s.ministryTagTxt}>{m}</Text></View>
            ))}
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/settings-profile' as any)}>
            <Ionicons name="pencil-outline" size={16} color={COLORS.navy}/>
            <Text style={s.editTxt}>Edit Profile</Text>
          </TouchableOpacity>'''
if old_ministries in profile:
    profile = profile.replace(old_ministries, new_ministries)
    print('Personal edit button added')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(profile)
print('profile.tsx updated')

# ── Fix 3: church-detail.tsx crash - church used before defined ───────────────
with open('app/church-detail.tsx', 'r', encoding='utf-8') as f:
    church = f.read()

# Move the churchPosts line to after the church object definition
old_crash = '''  const allChurchPosts = useChurchPosts(placeId);
  const churchPosts = allChurchPosts.filter((p: any) => p.authorType === "church" && p.churchName === church.name);

  const church = {'''
new_crash = '''  const allChurchPosts = useChurchPosts(placeId);

  const church = {'''

if old_crash in church:
    church = church.replace(old_crash, new_crash)
    # Now add churchPosts after church definition closes
    old_church_end = '''  };

  const [tab, setTab'''
    new_church_end = '''  };

  const churchPosts = allChurchPosts.filter((p: any) => p.authorType === "church" && p.churchName === church.name);

  const [tab, setTab'''
    church = church.replace(old_church_end, new_church_end)
    with open('app/church-detail.tsx', 'w', encoding='utf-8') as f:
        f.write(church)
    print('church-detail crash fixed')
else:
    print('church-detail: pattern not found - checking alternate')
    # Try just making the filter safe
    old_safe = 'allChurchPosts.filter((p: any) => p.authorType === "church" && p.churchName === church.name)'
    new_safe = 'allChurchPosts.filter((p: any) => p.authorType === "church" && church && p.churchName === church.name)'
    if old_safe in church:
        church = church.replace(old_safe, new_safe)
        with open('app/church-detail.tsx', 'w', encoding='utf-8') as f:
            f.write(church)
        print('church-detail: safe guard added')

print('\nALL DONE')
