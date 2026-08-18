path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/settings-appearance.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "['English','Español','Français','Português'].map((lang,i,arr) => ("
new = "['English','Español'].map((lang,i,arr) => ("
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
