path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/i18n.ts'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "  privacyPolicy: { English: 'Privacy Policy', Español: 'Política de Privacidad' },\n};"
new = """  privacyPolicy: { English: 'Privacy Policy', Español: 'Política de Privacidad' },
  aboutApp: { English: 'About FaithFinder', Español: 'Acerca de FaithFinder' },
  signOut: { English: 'Sign Out', Español: 'Cerrar Sesión' },
};"""
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
