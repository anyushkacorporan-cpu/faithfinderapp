path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/components/PostCard.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old = "<Text style={{fontSize:12,color:COLORS.gold,fontWeight:'600'}}>"
new = "<Text style={{fontSize:12,color:'#888',fontWeight:'600'}}>"
c = content.count(old)
print('occurrences:', c)
if c == 1:
    content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
