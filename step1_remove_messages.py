path1 = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/settings-privacy.tsx'
with open(path1, encoding='utf-8') as f:
    content = f.read()

old1 = "  const { publicProfile, showLocation, allowMessages } = settings.privacy;"
new1 = "  const { publicProfile, showLocation } = settings.privacy;"
count1 = content.count(old1)
print('settings-privacy.tsx destructure occurrences:', count1)
if count1 == 1:
    content = content.replace(old1, new1)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/lib/settingsStore.ts'
with open(path2, encoding='utf-8') as f:
    content2 = f.read()

old2 = "  publicProfile: boolean; showLocation: boolean; allowMessages: boolean;"
new2 = "  publicProfile: boolean; showLocation: boolean;"
count2 = content2.count(old2)
print('settingsStore.ts type occurrences:', count2)
if count2 == 1:
    content2 = content2.replace(old2, new2)

old3 = "    publicProfile: true, showLocation: false, allowMessages: true,"
new3 = "    publicProfile: true, showLocation: false,"
count3 = content2.count(old3)
print('settingsStore.ts default occurrences:', count3)
if count3 == 1:
    content2 = content2.replace(old3, new3)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

print('Both files patched (type and default definitions)')
