path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/i18n.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "  resultsFor: { English: 'Results for', Español: 'Resultados para' },\n};"
new = """  resultsFor: { English: 'Results for', Español: 'Resultados para' },
  list: { English: 'List', Español: 'Lista' },
  free: { English: 'Free', Español: 'Gratis' },
  attendingChecked: { English: '\u2713 Attending', Español: '\u2713 Asistiendo' },
  noSavedEvents: { English: 'No saved events', Español: 'No hay eventos guardados' },
  noEventsYet: { English: 'No events yet', Español: 'A\u00fan no hay eventos' },
  noEventsFound: { English: 'No events found', Español: 'No se encontraron eventos' },
  tapHeartToSave: { English: 'Tap \u2665 on any event to save it', Español: 'Toca \u2665 en cualquier evento para guardarlo' },
  registerToSeeHere: { English: 'Register for an event to see it here', Español: 'Reg\u00edstrate en un evento para verlo aqu\u00ed' },
  tryAdjustingSearch: { English: 'Try adjusting your search or filters', Español: 'Intenta ajustar tu b\u00fasqueda o filtros' },
};"""
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
