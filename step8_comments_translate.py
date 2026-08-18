path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/app/comments.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { getUser } from '../src/lib/userStore';"
new1 = "import { getUser } from '../src/lib/userStore';\nimport { TranslateRow } from '../src/components/PostCard';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "          <Text style={c.text}>{comment.text}</Text>"
new2 = "          <Text style={c.text}>{comment.text}</Text>\n          <TranslateRow text={comment.text}/>"
c2 = content.count(old2)
print('comment text occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

old3 = "            <Text style={c.text}>{reply.text}</Text>"
new3 = "            <Text style={c.text}>{reply.text}</Text>\n            <TranslateRow text={reply.text}/>"
c3 = content.count(old3)
print('reply text occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
