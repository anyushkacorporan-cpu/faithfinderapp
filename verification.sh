#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Install image picker
echo "Installing expo-image-picker..."

cat > app/claim-church.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, CHURCHES } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

const KEY = 'AIzaSyAHZO8wyxyCmx0k8u059QSX7QpsEvZ82sU';

async function searchChurchesAPI(query: string) {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' church')}&type=church&key=${KEY}`);
    const data = await res.json();
    return (data.results || []).slice(0, 8).map((p: any) => ({
      placeId: p.place_id,
      name: p.name,
      address: p.formatted_address || '',
      rating: p.rating || 0,
    }));
  } catch { return []; }
}

export default function ClaimChurchScreen() {
  const [step, setStep] = useState<'search'|'preview'|'verify'|'submitted'>('search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<any>(null);

  // Verification fields
  const [role, setRole] = useState('');
  const [website, setWebsite] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [photoNote, setPhotoNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const ROLES = ['Senior Pastor', 'Associate Pastor', 'Church Administrator', 'Elder', 'Deacon', 'Ministry Leader', 'Other'];
  const [showRoles, setShowRoles] = useState(false);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    // Search local list first
    const local = CHURCHES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
    ).map(c => ({ placeId: c.placeId, name: c.name, address: c.address, rating: c.rating, local: true }));

    // Also search Google Places
    const remote = await searchChurchesAPI(search);
    const combined = [...local, ...remote.filter((r: any) => !local.find(l => l.placeId === r.placeId))];
    setResults(combined);
    setSearching(false);
  }

  function handleSelect(church: any) {
    setSelectedChurch(church);
    setStep('preview');
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!role) e.role = 'Please select your role';
    if (!website && !officialEmail) e.contact = 'Please provide a website or official church email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500)); // simulate submission
    setUser({
      churchName: selectedChurch.name,
      address: selectedChurch.address,
      website: website,
      verificationStatus: 'pending',
    });
    setSubmitting(false);
    setStep('submitted');
  }

  if (step === 'submitted') {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.submittedWrap}>
          <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.submittedIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.gold} />
          </LinearGradient>
          <Text style={s.submittedTitle}>Verification Submitted!</Text>
          <Text style={s.submittedSub}>Thank you for claiming <Text style={{fontWeight:'700',color:COLORS.navy}}>{selectedChurch?.name}</Text>. FaithFinder will review your submission within 3–5 business days.</Text>
          <View style={s.submittedCard}>
            <View style={s.submittedRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>Review Period</Text>
                <Text style={s.submittedRowSub}>3–5 business days</Text>
              </View>
            </View>
            <View style={s.submittedDivider} />
            <View style={s.submittedRow}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>You'll be notified</Text>
                <Text style={s.submittedRowSub}>Via email and app notification</Text>
              </View>
            </View>
            <View style={s.submittedDivider} />
            <View style={s.submittedRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>After approval</Text>
                <Text style={s.submittedRowSub}>Full church profile unlocked with verified badge</Text>
              </View>
            </View>
          </View>
          <View style={s.pendingBadge}>
            <Ionicons name="time-outline" size={14} color={COLORS.gold} />
            <Text style={s.pendingBadgeTxt}>Verification Pending</Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.primaryBtnTxt}>Go to My Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => step === 'search' ? router.back() : setStep(step === 'verify' ? 'preview' : 'search')}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={s.progress}>
            {(['search','preview','verify'] as const).map((st, i) => (
              <View key={st} style={[s.progressDot, (step === st || (step === 'verify' && i < 2) || (step === 'preview' && i < 1)) && s.progressDotActive]} />
            ))}
          </View>
        </View>

        {/* Step: Search */}
        {step === 'search' && (
          <View style={s.body}>
            <View style={s.stepBadge}>
              <Ionicons name="home" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>Church Account</Text>
            </View>
            <Text style={s.title}>Find Your Church</Text>
            <Text style={s.subtitle}>Search for your church to claim it. If it's not listed, we'll add it.</Text>

            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.gold} />
              <TextInput
                style={s.searchInput}
                placeholder="Search by church name or city..."
                placeholderTextColor={COLORS.placeholder}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color="#ccc" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={s.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
              {searching ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.searchBtnTxt}>Search</Text>}
            </TouchableOpacity>

            {results.length > 0 && (
              <View style={s.resultsList}>
                <Text style={s.resultsLabel}>{results.length} churches found</Text>
                {results.map((church, i) => (
                  <TouchableOpacity key={i} style={s.resultCard} onPress={() => handleSelect(church)} activeOpacity={0.85}>
                    <View style={s.resultIcon}>
                      <Ionicons name="home" size={20} color={COLORS.navy} />
                    </View>
                    <View style={s.resultInfo}>
                      <Text style={s.resultName}>{church.name}</Text>
                      <Text style={s.resultAddr} numberOfLines={1}>{church.address}</Text>
                      {church.rating > 0 && (
                        <View style={s.resultRating}>
                          <Ionicons name="star" size={12} color={COLORS.gold} />
                          <Text style={s.resultRatingTxt}>{church.rating}</Text>
                        </View>
                      )}
                    </View>
                    {church.local && (
                      <View style={s.listedBadge}>
                        <Text style={s.listedBadgeTxt}>Listed</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#ddd" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={s.orDivider}>
              <View style={s.orLine} />
              <Text style={s.orTxt}>or</Text>
              <View style={s.orLine} />
            </View>

            <TouchableOpacity style={s.addNewBtn} onPress={() => router.push('/add-church')}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.navy} />
              <Text style={s.addNewTxt}>My church isn't listed — Add it</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Preview */}
        {step === 'preview' && selectedChurch && (
          <View style={s.body}>
            <View style={s.stepBadge}>
              <Ionicons name="home" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>Confirm Church</Text>
            </View>
            <Text style={s.title}>Is this your church?</Text>
            <Text style={s.subtitle}>Please confirm this is the church you want to claim.</Text>

            <View style={s.previewCard}>
              <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.previewBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
                <Ionicons name="home" size={36} color={COLORS.gold} />
              </LinearGradient>
              <View style={s.previewBody}>
                <Text style={s.previewName}>{selectedChurch.name}</Text>
                <View style={s.previewRow}>
                  <Ionicons name="location-outline" size={14} color="#888" />
                  <Text style={s.previewAddr}>{selectedChurch.address}</Text>
                </View>
                {selectedChurch.rating > 0 && (
                  <View style={s.previewRow}>
                    <Ionicons name="star" size={14} color={COLORS.gold} />
                    <Text style={s.previewRating}>{selectedChurch.rating} Google rating</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={() => setStep('verify')}>
              <Text style={s.primaryBtnTxt}>Yes, Claim This Church</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setStep('search')}>
              <Text style={s.secondaryBtnTxt}>Search Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Verify */}
        {step === 'verify' && (
          <View style={s.body}>
            <View style={s.stepBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>Verification</Text>
            </View>
            <Text style={s.title}>Verify Your Role</Text>
            <Text style={s.subtitle}>Help us confirm you represent <Text style={{fontWeight:'700',color:COLORS.navy}}>{selectedChurch?.name}</Text>. We review all claims within 3–5 business days.</Text>

            {/* Step 1: Role */}
            <View style={s.verifySection}>
              <View style={s.verifySectionHdr}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>1</Text></View>
                <Text style={s.verifySectionTitle}>Your role at the church</Text>
              </View>
              <TouchableOpacity style={[s.picker, showRoles && s.pickerOpen, errors.role && s.pickerErr]} onPress={() => setShowRoles(!showRoles)}>
                <Text style={[s.pickerTxt, !role && s.pickerPlaceholder]}>{role || 'Select your role'}</Text>
                <Ionicons name={showRoles ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
              </TouchableOpacity>
              {!!errors.role && <Text style={s.errTxt}>{errors.role}</Text>}
              {showRoles && (
                <View style={s.roleList}>
                  {ROLES.map(r => (
                    <TouchableOpacity key={r} style={[s.roleItem, role===r && s.roleItemActive]} onPress={() => { setRole(r); setShowRoles(false); }}>
                      <Text style={[s.roleTxt, role===r && s.roleTxtActive]}>{r}</Text>
                      {role===r && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Step 2: Website or Email */}
            <View style={s.verifySection}>
              <View style={s.verifySectionHdr}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>2</Text></View>
                <Text style={s.verifySectionTitle}>Church website or official email</Text>
              </View>
              <Text style={s.verifyHint}>Provide one of the following to verify your affiliation</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Website</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="globe-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
                </View>
              </View>
              <View style={s.orDivider}>
                <View style={s.orLine} />
                <Text style={s.orTxt}>or</Text>
                <View style={s.orLine} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Official Church Email</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="pastor@yourchurch.org" placeholderTextColor={COLORS.placeholder} value={officialEmail} onChangeText={setOfficialEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
              </View>
              {!!errors.contact && <Text style={s.errTxt}>{errors.contact}</Text>}
            </View>

            {/* Step 3: Photo proof */}
            <View style={s.verifySection}>
              <View style={s.verifySectionHdr}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>3</Text></View>
                <Text style={s.verifySectionTitle}>Photo proof <Text style={s.optional}>(optional but recommended)</Text></Text>
              </View>
              <Text style={s.verifyHint}>Upload a photo of your church sign, bulletin, or letterhead</Text>
              <TouchableOpacity style={s.uploadBtn}>
                <Ionicons name="camera-outline" size={24} color={COLORS.navy} />
                <Text style={s.uploadTxt}>Upload Photo</Text>
                <Text style={s.uploadSub}>Church sign, bulletin, or letterhead</Text>
              </TouchableOpacity>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Additional notes <Text style={s.optional}>(optional)</Text></Text>
                <TextInput
                  style={[s.input, {height:80, textAlignVertical:'top', paddingTop:12}]}
                  placeholder="Any additional information to help verify your claim..."
                  placeholderTextColor={COLORS.placeholder}
                  value={photoNote}
                  onChangeText={setPhotoNote}
                  multiline
                />
              </View>
            </View>

            {/* Info box */}
            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gold} />
              <Text style={s.infoBoxTxt}>FaithFinder reviews all church claims within 3–5 business days. You'll receive an email and app notification when approved.</Text>
            </View>

            <TouchableOpacity style={[s.primaryBtn, submitting && s.primaryBtnDisabled]} onPress={handleSubmit} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : <>
                    <Text style={s.primaryBtnTxt}>Submit for Verification</Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.white} />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingTop:12,paddingBottom:8},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  progress:{flexDirection:'row',gap:8},
  progressDot:{width:28,height:4,borderRadius:2,backgroundColor:COLORS.border},
  progressDotActive:{backgroundColor:COLORS.navy},
  body:{paddingHorizontal:20},
  stepBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:100,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',marginBottom:12,marginTop:8},
  stepBadgeTxt:{fontSize:12,fontWeight:'700',color:COLORS.gold},
  title:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:6,lineHeight:32},
  subtitle:{fontSize:14,color:'#888',lineHeight:20,marginBottom:24},
  searchBar:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:16,paddingVertical:13,marginBottom:12,backgroundColor:COLORS.white},
  searchInput:{flex:1,fontSize:15,color:COLORS.navy},
  searchBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:14,alignItems:'center',marginBottom:20},
  searchBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  resultsList:{marginBottom:20},
  resultsLabel:{fontSize:12,color:'#aaa',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10},
  resultCard:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border},
  resultIcon:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  resultInfo:{flex:1},
  resultName:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  resultAddr:{fontSize:13,color:'#888'},
  resultRating:{flexDirection:'row',alignItems:'center',gap:3,marginTop:3},
  resultRatingTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
  listedBadge:{backgroundColor:COLORS.lightGreen,borderRadius:6,paddingHorizontal:8,paddingVertical:3,marginRight:4},
  listedBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.green},
  orDivider:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:16},
  orLine:{flex:1,height:1,backgroundColor:COLORS.border},
  orTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
  addNewBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,paddingVertical:14},
  addNewTxt:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  previewCard:{borderWidth:1,borderColor:COLORS.border,borderRadius:20,overflow:'hidden',marginBottom:20},
  previewBanner:{height:120,alignItems:'center',justifyContent:'center'},
  previewBody:{padding:16},
  previewName:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:COLORS.navy,marginBottom:8},
  previewRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:5},
  previewAddr:{fontSize:13,color:'#666',flex:1},
  previewRating:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:12,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  primaryBtnDisabled:{opacity:0.7},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  secondaryBtn:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,paddingVertical:14,alignItems:'center'},
  secondaryBtnTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  verifySection:{marginBottom:24},
  verifySectionHdr:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12},
  stepNum:{width:28,height:28,borderRadius:14,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  stepNumTxt:{color:COLORS.white,fontSize:13,fontWeight:'700'},
  verifySectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,flex:1},
  verifyHint:{fontSize:13,color:'#888',marginBottom:12,lineHeight:19},
  optional:{fontWeight:'400',color:'#bbb',fontSize:13},
  fieldWrap:{marginBottom:12},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputIconWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:16,zIndex:1},
  inputWithIcon:{paddingLeft:44},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15},
  pickerOpen:{borderColor:COLORS.navy},
  pickerErr:{borderColor:COLORS.red},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:5},
  roleList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  roleItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  roleItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  roleTxt:{fontSize:14,color:'#444'},
  roleTxtActive:{color:COLORS.navy,fontWeight:'700'},
  uploadBtn:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,paddingVertical:20,alignItems:'center',gap:6,marginBottom:12,borderStyle:'dashed'},
  uploadTxt:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  uploadSub:{fontSize:12,color:'#aaa'},
  infoBox:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(201,169,110,0.08)',borderRadius:14,padding:14,marginBottom:20},
  infoBoxTxt:{fontSize:13,color:'#666',lineHeight:19,flex:1},
  // Submitted
  submittedWrap:{flex:1,paddingHorizontal:24,paddingTop:60,alignItems:'center'},
  submittedIcon:{width:96,height:96,borderRadius:24,alignItems:'center',justifyContent:'center',marginBottom:24},
  submittedTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:10,textAlign:'center'},
  submittedSub:{fontSize:15,color:'#666',textAlign:'center',lineHeight:22,marginBottom:28,paddingHorizontal:10},
  submittedCard:{width:'100%',borderWidth:1,borderColor:COLORS.border,borderRadius:20,overflow:'hidden',marginBottom:20},
  submittedRow:{flexDirection:'row',alignItems:'flex-start',gap:14,padding:16},
  submittedDivider:{height:1,backgroundColor:COLORS.border},
  submittedInfo:{flex:1},
  submittedRowTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  submittedRowSub:{fontSize:13,color:'#888',lineHeight:18},
  pendingBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:16,paddingVertical:8,marginBottom:20},
  pendingBadgeTxt:{fontSize:13,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "claim-church done"

# Update _layout to include claim-church
cat > app/_layout.tsx << 'EOF'
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold, PlayfairDisplay_400Regular_Italic });
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="claim-church" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
      </Stack>
    </>
  );
}
EOF
echo "layout done"

# Update signup to redirect church accounts to claim-church
cat > app/signup.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

export default function SignupScreen() {
  const [accountType, setAccountType] = useState<'personal'|'church'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  function handleCreate() {
    setError('');
    if (accountType === 'personal') {
      if (!firstName || !lastName) { setError('Please enter your first and last name.'); return; }
    } else {
      if (!churchName) { setError('Please enter your church name.'); return; }
    }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setUser({ accountType, firstName, lastName, churchName, email });

    if (accountType === 'church') {
      router.push('/claim-church');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoWrap}>
            <Text style={s.cross}>+</Text>
            <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
          <View style={s.card}>
            <View style={s.typeRow}>
              <TouchableOpacity style={[s.typeBtn, accountType==='personal' && s.typeBtnActive]} onPress={() => setAccountType('personal')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='personal' && s.typeIconWrapActive]}>
                  <Ionicons name="person" size={22} color={accountType==='personal' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='personal' && s.typeLblActive]}>Community</Text>
                <Text style={[s.typeSub, accountType==='personal' && s.typeSubActive]}>Individual believer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, accountType==='church' && s.typeBtnActive]} onPress={() => setAccountType('church')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='church' && s.typeIconWrapActive]}>
                  <Ionicons name="home-outline" size={22} color={accountType==='church' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='church' && s.typeLblActive]}>Church</Text>
                <Text style={[s.typeSub, accountType==='church' && s.typeSubActive]}>Ministry or organization</Text>
              </TouchableOpacity>
            </View>
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color='#dc2626' />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}
            {accountType === 'personal' ? (
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:10}]}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput style={s.input} placeholder="John" placeholderTextColor={COLORS.placeholder} value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>Last Name</Text>
                  <TextInput style={s.input} placeholder="Doe" placeholderTextColor={COLORS.placeholder} value={lastName} onChangeText={setLastName} />
                </View>
              </View>
            ) : (
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Name</Text>
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={setChurchName} />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="8+ characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm new password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="Re-enter" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.primaryBtnTxt}>
                {accountType === 'church' ? 'Continue to Claim Church' : 'Create Account'}
              </Text>
              {accountType === 'church' && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </TouchableOpacity>
            <Text style={s.terms}>
              By creating an account, you agree to our <Text style={s.termsLink}>Privacy Policy</Text> and <Text style={s.termsLink}>Terms of Service</Text>
            </Text>
          </View>
          <View style={s.signinRow}>
            <Text style={s.signinTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}><Text style={s.signinLink}>Sign In</Text></TouchableOpacity>
          </View>
          <View style={{height:20}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  scroll:{flexGrow:1,paddingHorizontal:20,paddingTop:16},
  logoWrap:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:10},
  cross:{fontSize:22,color:COLORS.gold,fontWeight:'300'},
  logo:{fontFamily:'PlayfairDisplay_700Bold',fontSize:24,color:COLORS.navy},
  gold:{color:COLORS.gold},
  verse:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20,marginBottom:24,paddingHorizontal:10},
  card:{backgroundColor:COLORS.white,borderRadius:24,borderWidth:1,borderColor:'#ebe8e2',padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:12},
  typeRow:{flexDirection:'row',gap:10,marginBottom:20},
  typeBtn:{flex:1,alignItems:'center',borderWidth:1.5,borderColor:'#e8e3da',borderRadius:16,paddingVertical:14,paddingHorizontal:8,gap:6,backgroundColor:COLORS.white},
  typeBtnActive:{borderColor:COLORS.gold,backgroundColor:'#fffbf5'},
  typeIconWrap:{width:44,height:44,borderRadius:22,backgroundColor:'#f0ede8',alignItems:'center',justifyContent:'center'},
  typeIconWrapActive:{backgroundColor:COLORS.navy},
  typeLbl:{fontSize:14,fontWeight:'700',color:'#aaa'},
  typeLblActive:{color:COLORS.navy},
  typeSub:{fontSize:11,color:'#ccc',textAlign:'center'},
  typeSubActive:{color:'#888'},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:14},
  errTxt:{color:'#dc2626',fontSize:13,flex:1},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:13},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:6,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  terms:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:14,lineHeight:17},
  termsLink:{color:COLORS.gold,fontWeight:'600'},
  signinRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "signup updated"

# Update userStore to include verificationStatus
cat > src/lib/userStore.ts << 'EOF'
let userData: any = {
  accountType: 'personal',
  firstName: 'Annie',
  lastName: 'Johnson',
  churchName: '',
  email: '',
  location: 'Glen Cove, NY',
  denomination: '',
  serviceTimes: '',
  website: '',
  phone: '',
  address: '',
  lifeVerse: '"I can do all things through Christ who strengthens me."',
  lifeVerseRef: 'Philippians 4:13',
  ministries: ['Worship', 'Outreach'],
  verificationStatus: 'none',
};

const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getUser() { return { ...userData }; }

export function setUser(updates: Partial<typeof userData>) {
  userData = { ...userData, ...updates };
  notify();
}

export function subscribeUser(fn: () => void) {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i > -1) listeners.splice(i, 1);
  };
}
EOF
echo "userStore updated"

echo "ALL DONE"
