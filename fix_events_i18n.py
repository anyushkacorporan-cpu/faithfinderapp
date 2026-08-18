path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/events.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = """          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.toggleBtn, activeTab===t && s.toggleBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.toggleTxt, activeTab===t && s.toggleTxtActive]}>
                {t}{t==='Attending'&&attending.length>0?` (${attending.length})`:''}{t==='Saved'&&saved.length>0?` (${saved.length})`:''}
              </Text>
            </TouchableOpacity>
          ))}"""
new1 = """          {TABS.map(tab => (
            <TouchableOpacity key={tab} style={[s.toggleBtn, activeTab===tab && s.toggleBtnActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.toggleTxt, activeTab===tab && s.toggleTxtActive]}>
                {tab==='List'?t('list'):tab==='Attending'?t('attending'):t('saved')}{tab==='Attending'&&attending.length>0?` (${attending.length})`:''}{tab==='Saved'&&saved.length>0?` (${saved.length})`:''}
              </Text>
            </TouchableOpacity>
          ))}"""
c1 = content.count(old1)
print('tabs occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "<Text style={s.badgeFreeTxt}>Free</Text>"
new2 = "<Text style={s.badgeFreeTxt}>{t('free')}</Text>"
c2 = content.count(old2)
print('free badge occurrences:', c2)
if c2 == 2:
    content = content.replace(old2, new2)

old3 = "<Text style={s.ticketBtnTxt}>{'Register'}</Text>"
new3 = "<Text style={s.ticketBtnTxt}>{t('register')}</Text>"
c3 = content.count(old3)
print('register occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

old4 = "<Text style={s.ticketBtnTxt}>{isAttending ? '\u2713 Attending' : 'Register'}</Text>"
new4 = "<Text style={s.ticketBtnTxt}>{isAttending ? t('attendingChecked') : t('register')}</Text>"
c4 = content.count(old4)
print('attending register occurrences:', c4)
if c4 == 1:
    content = content.replace(old4, new4)

old5 = """              {activeTab === 'Saved' ? 'No saved events' :
               activeTab === 'Attending' ? 'No events yet' :
               'No events found'}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'Saved' ? 'Tap \u2665 on any event to save it' :
               activeTab === 'Attending' ? 'Register for an event to see it here' :
               'Try adjusting your search or filters'}"""
new5 = """              {activeTab === 'Saved' ? t('noSavedEvents') :
               activeTab === 'Attending' ? t('noEventsYet') :
               t('noEventsFound')}
            </Text>
            <Text style={s.emptySub}>
              {activeTab === 'Saved' ? t('tapHeartToSave') :
               activeTab === 'Attending' ? t('registerToSeeHere') :
               t('tryAdjustingSearch')}"""
c5 = content.count(old5)
print('empty states occurrences:', c5)
if c5 == 1:
    content = content.replace(old5, new5)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
