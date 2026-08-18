path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/components/Header.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { useTranslation } from '../lib/i18n';\nimport { useTranslation } from '../lib/i18n';"
new1 = "import { useTranslation } from '../lib/i18n';"
c1 = content.count(old1)
print('duplicate import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "  const { t } = useTranslation();\n  const { t } = useTranslation();"
new2 = "  const { t } = useTranslation();"
c2 = content.count(old2)
print('duplicate hook occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
