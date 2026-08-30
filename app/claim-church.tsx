import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, CHURCHES } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { setUser } from '../src/lib/userStore';

import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';
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
  const { t, tx } = useTranslation();
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
      // Keep the Place ID: it is what lets this account's posts appear on the
      // church page, which Places identifies by id rather than by name.
      placeId: selectedChurch.placeId,
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
          <Text style={s.submittedTitle}>{t('verificationSubmitted')}</Text>
          <Text style={s.submittedSub}>{t('thankYouClaiming')}<Text style={{fontWeight:'700',color:COLORS.navy}}>{selectedChurch?.name}</Text>. FaithFinder will review your submission within 3–5 business days.</Text>
          <View style={s.submittedCard}>
            <View style={s.submittedRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>{t('reviewPeriod')}</Text>
                <Text style={s.submittedRowSub}>3–5 business days</Text>
              </View>
            </View>
            <View style={s.submittedDivider} />
            <View style={s.submittedRow}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>{t('youllBeNotified')}</Text>
                <Text style={s.submittedRowSub}>{t('viaEmailAndApp')}</Text>
              </View>
            </View>
            <View style={s.submittedDivider} />
            <View style={s.submittedRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gold} />
              <View style={s.submittedInfo}>
                <Text style={s.submittedRowTitle}>{t('afterApproval')}</Text>
                <Text style={s.submittedRowSub}>{t('fullProfileUnlocked')}</Text>
              </View>
            </View>
          </View>
          <View style={s.pendingBadge}>
            <Ionicons name="time-outline" size={14} color={COLORS.gold} />
            <Text style={s.pendingBadgeTxt}>{t('verificationPending')}</Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={s.primaryBtnTxt}>{t('goToMyProfile')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardScreen dismissOnTap={false}>
      <ScrollView
            {...KEYBOARD_SCROLL_PROPS} showsVerticalScrollIndicator={false}>

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
              <Text style={s.stepBadgeTxt}>{t('churchAccount')}</Text>
            </View>
            <Text style={s.title}>{t('findYourChurch')}</Text>
            <Text style={s.subtitle}>{t('searchForYourChurch')}</Text>

            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={18} color={COLORS.gold} />
              <TextInput
                style={s.searchInput}
                placeholder={tx('Search by church name or city...')}
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
              {searching ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.searchBtnTxt}>{t('search')}</Text>}
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
                        <Text style={s.listedBadgeTxt}>{t('listed')}</Text>
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

            <TouchableOpacity style={s.addNewBtn} onPress={() => router.push('/register-church')}>
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
              <Text style={s.stepBadgeTxt}>{t('confirmChurch')}</Text>
            </View>
            <Text style={s.title}>{t('isThisYourChurch')}</Text>
            <Text style={s.subtitle}>{t('confirmClaimChurch')}</Text>

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
              <Text style={s.primaryBtnTxt}>{t('yesClaimChurch')}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => setStep('search')}>
              <Text style={s.secondaryBtnTxt}>{t('searchAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Verify */}
        {step === 'verify' && (
          <View style={s.body}>
            <View style={s.stepBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>{t('verification')}</Text>
            </View>
            <Text style={s.title}>{t('verifyYourRole')}</Text>
            <Text style={s.subtitle}>{t('helpUsConfirm')}<Text style={{fontWeight:'700',color:COLORS.navy}}>{selectedChurch?.name}</Text>. We review all claims within 3–5 business days.</Text>

            {/* Step 1: Role */}
            <View style={s.verifySection}>
              <View style={s.verifySectionHdr}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>1</Text></View>
                <Text style={s.verifySectionTitle}>{t('yourRoleAtChurch')}</Text>
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
                <Text style={s.verifySectionTitle}>{t('churchWebsiteOrEmail')}</Text>
              </View>
              <Text style={s.verifyHint}>{t('provideOneOfFollowing')}</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('churchWebsite')}</Text>
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
                <Text style={s.label}>{t('officialChurchEmail')}</Text>
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
                <Text style={s.verifySectionTitle}>{t('photoProof')} <Text style={s.optional}>(optional but recommended)</Text></Text>
              </View>
              <Text style={s.verifyHint}>{t('uploadPhotoOfSign')}</Text>
              <TouchableOpacity style={s.uploadBtn}>
                <Ionicons name="camera-outline" size={24} color={COLORS.navy} />
                <Text style={s.uploadTxt}>{t('uploadPhoto')}</Text>
                <Text style={s.uploadSub}>{t('churchSignBulletin')}</Text>
              </TouchableOpacity>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('additionalNotes')} <Text style={s.optional}>(optional)</Text></Text>
                <TextInput
                  style={[s.input, {height:80, textAlignVertical:'top', paddingTop:12}]}
                  placeholder={tx('Any additional information to help verify your claim...')}
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
                    <Text style={s.primaryBtnTxt}>{t('submitForVerification')}</Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.white} />
                  </>
              }
            </TouchableOpacity>
          </View>
        )}

        <View style={{height:40}} />
      </ScrollView>
      </KeyboardScreen>
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
