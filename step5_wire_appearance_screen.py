path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/settings-appearance.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { COLORS } from '../src/lib/constants';"
new1 = "import { COLORS } from '../src/lib/constants';\nimport { useSettings, updateAppearancePrefs } from '../src/lib/settingsStore';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """export default function AppearanceSettingsScreen() {
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [language, setLanguage] = useState('English');"""
new2 = """export default function AppearanceSettingsScreen() {
  const appSettings = useSettings();
  const { theme, fontSize, language } = appSettings.appearance;"""
c2 = content.count(old2)
print('state occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

old3 = "onPress={() => setTheme(item.id)}"
new3 = "onPress={() => updateAppearancePrefs({theme: item.id as any})}"
c3 = content.count(old3)
print('theme onPress occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

old4 = "onPress={() => setFontSize(item.id)}"
new4 = "onPress={() => updateAppearancePrefs({fontSize: item.id as any})}"
c4 = content.count(old4)
print('fontSize onPress occurrences:', c4)
if c4 == 1:
    content = content.replace(old4, new4)

old5 = "onPress={() => setLanguage(lang)}"
new5 = "onPress={() => updateAppearancePrefs({language: lang})}"
c5 = content.count(old5)
print('language onPress occurrences:', c5)
if c5 == 1:
    content = content.replace(old5, new5)

old6 = "<TouchableOpacity style={s.saveBtn} onPress={() => Alert.alert('Saved!', 'Appearance settings updated.', [{text:'OK',onPress:()=>router.back()}])}>"
new6 = "<TouchableOpacity style={s.saveBtn} onPress={() => router.back()}>"
c6 = content.count(old6)
print('save button occurrences:', c6)
if c6 == 1:
    content = content.replace(old6, new6)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
