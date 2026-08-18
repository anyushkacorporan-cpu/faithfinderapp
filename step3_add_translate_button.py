path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/components/PostCard.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { Post, formatRelativeTime } from '../lib/postsStore';"
new1 = "import { Post, formatRelativeTime } from '../lib/postsStore';\nimport { translateText } from '../lib/translate';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = "      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}"
new2 = """      {!post.repostOf&&!!post.content&&<Text style={p.content}>{post.content}</Text>}
      {!post.repostOf&&!!post.content&&<TranslateRow text={post.content}/>}"""
c2 = content.count(old2)
print('content row occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

# Add the TranslateRow component right before "export function PostCard"
old3 = "export function PostCard("
new3 = """function TranslateRow({text}:{text:string}) {
  const [translated, setTranslated] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);

  async function handleTranslate() {
    if (translated) { setShowingTranslation(!showingTranslation); return; }
    setLoading(true);
    const result = await translateText(text, 'en');
    setLoading(false);
    if (result) {
      setTranslated(result.translatedText);
      setShowingTranslation(true);
    }
  }

  return (
    <View>
      <TouchableOpacity onPress={handleTranslate} disabled={loading} style={{marginTop:4}}>
        <Text style={{fontSize:12,color:COLORS.gold,fontWeight:'600'}}>
          {loading ? 'Translating...' : showingTranslation ? 'See original' : 'See translation'}
        </Text>
      </TouchableOpacity>
      {showingTranslation && !!translated && (
        <Text style={{fontSize:14,color:'#555',lineHeight:20,marginTop:4,fontStyle:'italic'}}>{translated}</Text>
      )}
    </View>
  );
}

export function PostCard("""
c3 = content.count(old3)
print('PostCard export occurrences:', c3)
if c3 == 1:
    content = content.replace(old3, new3)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
