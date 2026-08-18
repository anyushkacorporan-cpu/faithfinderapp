path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/i18n.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "  aboutApp: { English: 'About FaithFinder', Español: 'Acerca de FaithFinder' },\n  signOut: { English: 'Sign Out', Español: 'Cerrar Sesión' },\n};"
new = """  aboutApp: { English: 'About FaithFinder', Español: 'Acerca de FaithFinder' },
  signOut: { English: 'Sign Out', Español: 'Cerrar Sesión' },
  details: { English: 'Details', Español: 'Detalles' },
  nearbyBadge: { English: 'NEARBY', Español: 'CERCA' },
  savedChurches: { English: 'Saved Churches', Español: 'Iglesias Guardadas' },
  nearbyChurches: { English: 'Nearby Churches', Español: 'Iglesias Cercanas' },
  allChurches: { English: 'All Churches', Español: 'Todas las Iglesias' },
  resultsFor: { English: 'Results for', Español: 'Resultados para' },
};"""
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
