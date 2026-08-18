path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/components/Header.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = """            {[
              { icon:'calendar-outline', label:'Create Event', color:'#c9a96e' },
              { icon:'list-outline', label:'My Events', color:'#667eea' },
              { icon:'cash-outline', label:'Earnings', color:COLORS.green },
              { icon:'notifications-outline', label:'Notification Preferences', color:COLORS.gold },
              { icon:'location-outline', label:'Location Settings', color:COLORS.green },
              { icon:'shield-outline', label:'Privacy & Security', color:COLORS.navy },
              { icon:'moon-outline', label:'Appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', label:'Help & Support', color:'#e67e22' },
              { icon:'information-circle-outline', label:'About FaithFinder', color:'#aaa' },
              { icon:'log-out-outline', label:'Sign Out', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                setShowSettings(false);
                if (item.label === 'Sign Out') {
                  signOut();
                  router.replace('/login');
                } else if (item.label === 'Create Event') {
                  router.push('/create-event');
                } else if (item.label === 'My Events') {
                  router.push('/my-events');
                } else if (item.label === 'Earnings') {
                  router.push('/earnings');
                } else if (item.label === 'Notification Preferences') {
                  router.push('/settings-notifications');
                } else if (item.label === 'Location Settings') {
                  router.push('/settings-location');
                } else if (item.label === 'Privacy & Security') {
                  router.push('/settings-privacy');
                } else if (item.label === 'Appearance') {
                  router.push('/settings-appearance');
                } else if (item.label === 'Help & Support') {
                  router.push('/settings-help');
                } else if (item.label === 'About FaithFinder') {
                  router.push('/settings-about');
                }
              }}>
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.label === 'Sign Out' && { color: COLORS.red }]}>{item.label}</Text>
                {item.label !== 'Sign Out' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
              </TouchableOpacity>
            ))}"""

new = """            {[
              { icon:'calendar-outline', key:'createEvent', color:'#c9a96e' },
              { icon:'list-outline', key:'myEvents', color:'#667eea' },
              { icon:'cash-outline', key:'earnings', color:COLORS.green },
              { icon:'notifications-outline', key:'notificationPreferences', color:COLORS.gold },
              { icon:'location-outline', key:'locationSettings', color:COLORS.green },
              { icon:'shield-outline', key:'privacySecurity', color:COLORS.navy },
              { icon:'moon-outline', key:'appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', key:'helpSupport', color:'#e67e22' },
              { icon:'information-circle-outline', key:'aboutApp', color:'#aaa' },
              { icon:'log-out-outline', key:'signOut', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                setShowSettings(false);
                if (item.key === 'signOut') {
                  signOut();
                  router.replace('/login');
                } else if (item.key === 'createEvent') {
                  router.push('/create-event');
                } else if (item.key === 'myEvents') {
                  router.push('/my-events');
                } else if (item.key === 'earnings') {
                  router.push('/earnings');
                } else if (item.key === 'notificationPreferences') {
                  router.push('/settings-notifications');
                } else if (item.key === 'locationSettings') {
                  router.push('/settings-location');
                } else if (item.key === 'privacySecurity') {
                  router.push('/settings-privacy');
                } else if (item.key === 'appearance') {
                  router.push('/settings-appearance');
                } else if (item.key === 'helpSupport') {
                  router.push('/settings-help');
                } else if (item.key === 'aboutApp') {
                  router.push('/settings-about');
                }
              }}>
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.key === 'signOut' && { color: COLORS.red }]}>{t(item.key as any)}</Text>
                {item.key !== 'signOut' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
              </TouchableOpacity>
            ))}"""

c = content.count(old)
print('menu block occurrences:', c)
if c == 1:
    content = content.replace(old, new)

old2 = "<Text style={s.sheetTitle}>Settings</Text>"
new2 = "<Text style={s.sheetTitle}>{t('settings')}</Text>"
c2 = content.count(old2)
print('sheet title occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
