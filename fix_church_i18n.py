path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/index.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "            <Text style={s.nearbyTxt}>{church.state || 'NEARBY'}</Text>"
new1 = "            <Text style={s.nearbyTxt}>{church.state || t('nearbyBadge')}</Text>"
c1 = content.count(old1)
print('nearby badge occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "              <Text style={s.detailsBtn}>Details</Text>"
new2 = "              <Text style={s.detailsBtn}>{t('details')}</Text>"
c2 = content.count(old2)
print('details occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

old3 = """            {activeTab === 'Saved' ? 'Saved Churches' : searchResults !== null ? `Results for "${search || activeState}"` : nearbyChurches !== null ? 'Nearby Churches' : 'All Churches'}"""
new3 = """            {activeTab === 'Saved' ? t('savedChurches') : searchResults !== null ? `${t('resultsFor')} "${search || activeState}"` : nearbyChurches !== null ? t('nearbyChurches') : t('allChurches')}"""
c3 = content.count(old3)
print('section header occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
