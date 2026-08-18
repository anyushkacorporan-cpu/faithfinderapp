#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Screen 1: Church Setup Choice ─────────────────────
cat > app/church-setup.tsx << 'EOF'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { getUser } from '../src/lib/userStore';

export default function ChurchSetupScreen() {
  const user = getUser();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.inner}>

        {/* Header */}
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={s.titleWrap}>
          <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.logoIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="home" size={28} color={COLORS.gold} />
          </LinearGradient>
          <Text style={s.title}>Set Up Your Church</Text>
          <Text style={s.subtitle}>
            Welcome{user.churchName ? `, ${user.churchName}` : ''}! How would you like to get started?
          </Text>
        </View>

        {/* Options */}
        <View style={s.options}>

          {/* Claim existing */}
          <TouchableOpacity style={s.optionCard} onPress={() => router.push('/claim-church')} activeOpacity={0.88}>
            <View style={s.optionLeft}>
              <View style={s.optionIconWrap}>
                <Ionicons name="search" size={24} color={COLORS.navy} />
              </View>
              <View style={s.optionInfo}>
                <Text style={s.optionTitle}>Claim Your Church</Text>
                <Text style={s.optionDesc}>Your church is already listed on FaithFinder. Claim it as the official account.</Text>
                <View style={s.optionTag}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
                  <Text style={s.optionTagTxt}>Already in FaithFinder</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ddd" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orTxt}>or</Text>
            <View style={s.orLine} />
          </View>

          {/* Register new */}
          <TouchableOpacity style={[s.optionCard, s.optionCardNavy]} onPress={() => router.push('/register-church')} activeOpacity={0.88}>
            <View style={s.optionLeft}>
              <View style={s.optionIconWrapNavy}>
                <Ionicons name="add-circle" size={24} color={COLORS.gold} />
              </View>
              <View style={s.optionInfo}>
                <Text style={s.optionTitleNavy}>Register New Church</Text>
                <Text style={s.optionDescNavy}>Your church isn't on FaithFinder yet. Add it to our directory.</Text>
                <View style={s.optionTagNavy}>
                  <Ionicons name="star" size={13} color={COLORS.gold} />
                  <Text style={s.optionTagNavyTxt}>Get listed & verified</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

        </View>

        {/* Info */}
        <View style={s.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
          <Text style={s.infoTxt}>All church accounts go through a verification process. FaithFinder reviews submissions within 3–5 business days.</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  inner:{flex:1,paddingHorizontal:20},
  hdr:{paddingTop:8,marginBottom:16},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  titleWrap:{alignItems:'center',marginBottom:32},
  logoIcon:{width:72,height:72,borderRadius:20,alignItems:'center',justifyContent:'center',marginBottom:16},
  title:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:8,textAlign:'center'},
  subtitle:{fontSize:15,color:'#888',textAlign:'center',lineHeight:22,paddingHorizontal:10},
  options:{gap:0,marginBottom:24},
  optionCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:20,padding:18,backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:8},
  optionCardNavy:{backgroundColor:COLORS.navy,borderColor:COLORS.navy,marginTop:0},
  optionLeft:{flexDirection:'row',alignItems:'flex-start',gap:14,flex:1},
  optionIconWrap:{width:48,height:48,borderRadius:14,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  optionIconWrapNavy:{width:48,height:48,borderRadius:14,backgroundColor:'rgba(201,169,110,0.15)',alignItems:'center',justifyContent:'center'},
  optionInfo:{flex:1},
  optionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  optionTitleNavy:{fontSize:16,fontWeight:'700',color:COLORS.white,marginBottom:4},
  optionDesc:{fontSize:13,color:'#888',lineHeight:19,marginBottom:8},
  optionDescNavy:{fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:19,marginBottom:8},
  optionTag:{flexDirection:'row',alignItems:'center',gap:5},
  optionTagNavy:{flexDirection:'row',alignItems:'center',gap:5},
  optionTagTxt:{fontSize:12,fontWeight:'600',color:COLORS.green},
  optionTagNavyTxt:{fontSize:12,fontWeight:'600',color:COLORS.gold},
  orRow:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:16},
  orLine:{flex:1,height:1,backgroundColor:COLORS.border},
  orTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
  infoBox:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(201,169,110,0.08)',borderRadius:14,padding:14},
  infoTxt:{fontSize:13,color:'#666',lineHeight:19,flex:1},
});
EOF
echo "church-setup done"

# ── Screen 2: Register New Church ─────────────────────
cat > app/register-church.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];

export default function RegisterChurchScreen() {
  const [churchName, setChurchName] = useState('');
  const [address, setAddress] = useState('');
  const [denomination, setDenomination] = useState('');
  const [serviceTimes, setServiceTimes] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');
  const [showDenom, setShowDenom] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  const ROLES = ['Senior Pastor','Associate Pastor','Church Administrator','Elder','Deacon','Ministry Leader','Other'];

  function validate() {
    const e: Record<string,string> = {};
    if (!churchName.trim()) e.churchName = 'Church name is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!role) e.role = 'Your role is required';
    if (!website && !email) e.contact = 'Please provide a website or official email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setUser({
      churchName,
      address,
      denomination,
      serviceTimes,
      website,
      phone,
      verificationStatus: 'pending',
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.successWrap}>
          <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.successIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.gold} />
          </LinearGradient>
          <Text style={s.successTitle}>Church Submitted!</Text>
          <Text style={s.successSub}>
            <Text style={{fontWeight:'700',color:COLORS.navy}}>{churchName}</Text> has been submitted for review. FaithFinder will add it to the directory within 3–5 business days.
          </Text>
          <View style={s.successCard}>
            {[
              { icon:'time-outline', title:'Review Period', sub:'3–5 business days' },
              { icon:'notifications-outline', title:'You\'ll be notified', sub:'Via email and app notification' },
              { icon:'globe-outline', title:'After approval', sub:'Your church appears in search results with a verified badge' },
            ].map((item, i) => (
              <View key={i}>
                {i > 0 && <View style={s.successDivider} />}
                <View style={s.successRow}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.gold} />
                  <View style={s.successInfo}>
                    <Text style={s.successRowTitle}>{item.title}</Text>
                    <Text style={s.successRowSub}>{item.sub}</Text>
                  </View>
                </View>
              </View>
            ))}
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
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={s.hdr}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <View style={s.body}>
            <View style={s.stepBadge}>
              <Ionicons name="add-circle-outline" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>Register New Church</Text>
            </View>
            <Text style={s.title}>Church Details</Text>
            <Text style={s.subtitle}>Fill in your church information. All fields marked * are required.</Text>

            {/* Church Info */}
            <Text style={s.sectionTitle}>Church Information</Text>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Church Name *</Text>
              <View style={s.inputWrap}>
                <Ionicons name="home-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon, errors.churchName && s.inputErr]} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={v => { setChurchName(v); setErrors(e => ({...e,churchName:''})); }} />
              </View>
              {!!errors.churchName && <Text style={s.errTxt}>{errors.churchName}</Text>}
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Address *</Text>
              <View style={s.inputWrap}>
                <Ionicons name="location-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon, errors.address && s.inputErr]} placeholder="123 Faith St, Glen Cove, NY 11542" placeholderTextColor={COLORS.placeholder} value={address} onChangeText={v => { setAddress(v); setErrors(e => ({...e,address:''})); }} />
              </View>
              {!!errors.address && <Text style={s.errTxt}>{errors.address}</Text>}
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Denomination</Text>
              <TouchableOpacity style={[s.picker, showDenom && s.pickerOpen]} onPress={() => setShowDenom(!showDenom)}>
                <Text style={[s.pickerTxt, !denomination && s.pickerPlaceholder]}>{denomination || 'Select denomination'}</Text>
                <Ionicons name={showDenom ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
              </TouchableOpacity>
              {showDenom && (
                <View style={s.dropList}>
                  {DENOMINATIONS.map(d => (
                    <TouchableOpacity key={d} style={[s.dropItem, denomination===d && s.dropItemActive]} onPress={() => { setDenomination(d); setShowDenom(false); }}>
                      <Text style={[s.dropTxt, denomination===d && s.dropTxtActive]}>{d}</Text>
                      {denomination===d && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Service Times</Text>
              <View style={s.inputWrap}>
                <Ionicons name="time-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon]} placeholder="Sunday 9AM & 11AM" placeholderTextColor={COLORS.placeholder} value={serviceTimes} onChangeText={setServiceTimes} />
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Phone Number</Text>
              <View style={s.inputWrap}>
                <Ionicons name="call-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon]} placeholder="(516) 000-0000" placeholderTextColor={COLORS.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
            </View>

            <View style={s.divider} />

            {/* Verification */}
            <Text style={s.sectionTitle}>Verification</Text>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Your Role *</Text>
              <TouchableOpacity style={[s.picker, showRoles && s.pickerOpen, errors.role && s.pickerErr]} onPress={() => setShowRoles(!showRoles)}>
                <Text style={[s.pickerTxt, !role && s.pickerPlaceholder]}>{role || 'Select your role'}</Text>
                <Ionicons name={showRoles ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
              </TouchableOpacity>
              {!!errors.role && <Text style={s.errTxt}>{errors.role}</Text>}
              {showRoles && (
                <View style={s.dropList}>
                  {ROLES.map(r => (
                    <TouchableOpacity key={r} style={[s.dropItem, role===r && s.dropItemActive]} onPress={() => { setRole(r); setShowRoles(false); }}>
                      <Text style={[s.dropTxt, role===r && s.dropTxtActive]}>{r}</Text>
                      {role===r && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Church Website</Text>
              <View style={s.inputWrap}>
                <Ionicons name="globe-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} value={website} onChangeText={v => { setWebsite(v); setErrors(e => ({...e,contact:''})); }} autoCapitalize="none" keyboardType="url" />
              </View>
            </View>
            <View style={s.orRow}>
              <View style={s.orLine} /><Text style={s.orTxt}>or</Text><View style={s.orLine} />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Official Church Email</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon, errors.contact && s.inputErr]} placeholder="pastor@yourchurch.org" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setErrors(e => ({...e,contact:''})); }} keyboardType="email-address" autoCapitalize="none" />
              </View>
              {!!errors.contact && <Text style={s.errTxt}>{errors.contact}</Text>}
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Additional Notes <Text style={s.optional}>(optional)</Text></Text>
              <TextInput style={[s.input, {height:80,textAlignVertical:'top',paddingTop:12}]} placeholder="Anything else you'd like to share..." placeholderTextColor={COLORS.placeholder} value={notes} onChangeText={setNotes} multiline />
            </View>

            <View style={s.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gold} />
              <Text style={s.infoBoxTxt}>FaithFinder reviews all new church submissions within 3–5 business days. Your church will appear in search results once approved.</Text>
            </View>

            <TouchableOpacity style={[s.primaryBtn, submitting && s.primaryBtnDisabled]} onPress={handleSubmit} activeOpacity={0.85}>
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : <><Text style={s.primaryBtnTxt}>Submit for Review</Text><Ionicons name="shield-checkmark-outline" size={18} color={COLORS.white} /></>
              }
            </TouchableOpacity>
          </View>
          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{paddingHorizontal:20,paddingTop:12,marginBottom:4},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  body:{paddingHorizontal:20},
  stepBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:100,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',marginBottom:12,marginTop:8},
  stepBadgeTxt:{fontSize:12,fontWeight:'700',color:COLORS.gold},
  title:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:6},
  subtitle:{fontSize:14,color:'#888',lineHeight:20,marginBottom:24},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:16},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  optional:{fontWeight:'400',color:'#bbb'},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputErr:{borderColor:COLORS.red},
  inputWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:16,zIndex:1},
  inputWithIcon:{paddingLeft:44},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:5},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15},
  pickerOpen:{borderColor:COLORS.navy},
  pickerErr:{borderColor:COLORS.red},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  dropList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  dropItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  dropItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  dropTxt:{fontSize:14,color:'#444'},
  dropTxtActive:{color:COLORS.navy,fontWeight:'700'},
  divider:{height:1,backgroundColor:COLORS.border,marginVertical:20},
  orRow:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:12},
  orLine:{flex:1,height:1,backgroundColor:COLORS.border},
  orTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
  infoBox:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(201,169,110,0.08)',borderRadius:14,padding:14,marginBottom:20},
  infoBoxTxt:{fontSize:13,color:'#666',lineHeight:19,flex:1},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:12,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  primaryBtnDisabled:{opacity:0.7},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  // Success
  successWrap:{flex:1,paddingHorizontal:24,paddingTop:60,alignItems:'center'},
  successIcon:{width:96,height:96,borderRadius:24,alignItems:'center',justifyContent:'center',marginBottom:24},
  successTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:10,textAlign:'center'},
  successSub:{fontSize:15,color:'#666',textAlign:'center',lineHeight:22,marginBottom:28,paddingHorizontal:10},
  successCard:{width:'100%',borderWidth:1,borderColor:COLORS.border,borderRadius:20,overflow:'hidden',marginBottom:20},
  successRow:{flexDirection:'row',alignItems:'flex-start',gap:14,padding:16},
  successDivider:{height:1,backgroundColor:COLORS.border},
  successInfo:{flex:1},
  successRowTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:2},
  successRowSub:{fontSize:13,color:'#888',lineHeight:18},
  pendingBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:16,paddingVertical:8,marginBottom:20},
  pendingBadgeTxt:{fontSize:13,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "register-church done"

# Update _layout
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
        <Stack.Screen name="church-setup" />
        <Stack.Screen name="claim-church" />
        <Stack.Screen name="register-church" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
      </Stack>
    </>
  );
}
EOF
echo "layout done"

# Update signup to go to church-setup
sed -i '' 's|router.push.*claim-church.*|router.push("/church-setup");|g' app/signup.tsx
echo "signup updated"

echo "ALL DONE"
