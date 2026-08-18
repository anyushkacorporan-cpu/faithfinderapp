path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/(tabs)/index.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { useSettings } from '../../src/lib/settingsStore';"
new1 = "import { useSettings } from '../../src/lib/settingsStore';\nimport { useTranslation } from '../../src/lib/i18n';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "  const appSettings = useSettings();"
new2 = "  const appSettings = useSettings();\n  const { t } = useTranslation();"
c2 = content.count(old2)
print('hook occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
