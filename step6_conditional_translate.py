path = '/Users/AnyushkaAriesCorporan/Desktop/FaithFinderApp/src/components/PostCard.tsx'
with open(path, encoding='utf-8') as f:
    content = f.read()

old1 = "import { translateText } from '../lib/translate';"
new1 = "import { translateText, detectLanguage } from '../lib/translate';\nimport { useSettings } from '../lib/settingsStore';"
c1 = content.count(old1)
print('import occurrences:', c1)
if c1 == 1:
    content = content.replace(old1, new1)

old2 = """function TranslateRow({text}:{text:string}) {
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
        <Text style={{fontSize:12,color:'#888',fontWeight:'600'}}>
          {loading ? 'Translating...' : showingTranslation ? 'See original' : 'See translation'}
        </Text>
      </TouchableOpacity>
      {showingTranslation && !!translated && (
        <Text style={{fontSize:14,color:'#555',lineHeight:20,marginTop:4,fontStyle:'italic'}}>{translated}</Text>
      )}
    </View>
  );
}"""
new2 = """function TranslateRow({text}:{text:string}) {
  const appSettings = useSettings();
  const myLang = appSettings.appearance.language === 'Español' ? 'es' : 'en';
  const [detectedLang, setDetectedLang] = useState<string|null>(null);
  const [translated, setTranslated] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [showingTranslation, setShowingTranslation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    detectLanguage(text).then((lang) => { if (!cancelled) setDetectedLang(lang); });
    return () => { cancelled = true; };
  }, [text]);

  async function handleTranslate() {
    if (translated) { setShowingTranslation(!showingTranslation); return; }
    setLoading(true);
    const result = await translateText(text, myLang);
    setLoading(false);
    if (result) {
      setTranslated(result.translatedText);
      setShowingTranslation(true);
    }
  }

  if (!detectedLang || detectedLang === myLang) return null;

  return (
    <View>
      <TouchableOpacity onPress={handleTranslate} disabled={loading} style={{marginTop:4}}>
        <Text style={{fontSize:12,color:'#888',fontWeight:'600'}}>
          {loading ? 'Translating...' : showingTranslation ? 'See original' : 'See translation'}
        </Text>
      </TouchableOpacity>
      {showingTranslation && !!translated && (
        <Text style={{fontSize:14,color:'#555',lineHeight:20,marginTop:4,fontStyle:'italic'}}>{translated}</Text>
      )}
    </View>
  );
}"""
c2 = content.count(old2)
print('TranslateRow occurrences:', c2)
if c2 == 1:
    content = content.replace(old2, new2)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
