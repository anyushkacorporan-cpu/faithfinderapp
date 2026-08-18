#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Screen 1: Choose Account Type ─────────────────────
cat > app/signup.tsx << 'EOF'
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../src/lib/constants';

export default function SignupScreen() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>

        {/* Back */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.navy} />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
          <Text style={s.title}>Create your account</Text>
          <Text style={s.subtitle}>Join the FaithFinder community and connect with churches near you.</Text>
        </View>

        {/* Cards */}
        <View style={s.cards}>

          {/* Personal */}
          <TouchableOpacity style={s.card} onPress={() => router.push('/signup-personal')} activeOpacity={0.88}>
            <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.cardGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
              <View style={s.cardIconWrap}>
                <Ionicons name="person" size={28} color={COLORS.gold} />
              </View>
              <View style={s.cardContent}>
                <Text style={s.cardTitle}>Personal Account</Text>
                <Text style={s.cardDesc}>For individuals looking to find churches, connect with believers and grow in faith.</Text>
                <View style={s.cardFeatures}>
                  {['Find nearby churches','Connect with members','Save your favorites','Join events'].map((f,i) => (
                    <View key={i} style={s.feature}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.gold} />
                      <Text style={s.featureTxt}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.cardArrow}>
                <Ionicons name="arrow-forward-circle" size={28} color={COLORS.gold} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Church */}
          <TouchableOpacity style={s.card} onPress={() => router.push('/signup-church')} activeOpacity={0.88}>
            <View style={s.cardLight}>
              <View style={s.cardIconWrapLight}>
                <Ionicons name="home" size={28} color={COLORS.navy} />
              </View>
              <View style={s.cardContent}>
                <Text style={s.cardTitleLight}>Church Account</Text>
                <Text style={s.cardDescLight}>For churches, ministries and faith organizations to reach their community.</Text>
                <View style={s.cardFeatures}>
                  {['Church profile page','Post announcements','Manage events','Connect with members'].map((f,i) => (
                    <View key={i} style={s.feature}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.navy} />
                      <Text style={s.featureTxtLight}>{f}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={s.cardArrow}>
                <Ionicons name="arrow-forward-circle" size={28} color={COLORS.navy} />
              </View>
            </View>
          </TouchableOpacity>

        </View>

        {/* Sign in link */}
        <View style={s.signinRow}>
          <Text style={s.signinTxt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={s.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:COLORS.white },
  inner: { flex:1, paddingHorizontal:20 },
  backBtn: { marginTop:8, marginBottom:8, width:40, height:40, borderRadius:20, backgroundColor:COLORS.lightBg, alignItems:'center', justifyContent:'center' },
  header: { marginBottom:28 },
  logo: { fontFamily:'PlayfairDisplay_700Bold', fontSize:22, color:COLORS.navy, marginBottom:12 },
  gold: { color:COLORS.gold },
  title: { fontFamily:'PlayfairDisplay_700Bold', fontSize:28, color:COLORS.navy, marginBottom:8, lineHeight:34 },
  subtitle: { fontSize:15, color:'#888', lineHeight:22 },
  cards: { gap:16, flex:1 },
  card: { borderRadius:20, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.12, shadowRadius:12, elevation:4 },
  cardGradient: { padding:22, gap:16 },
  cardLight: { padding:22, gap:16, backgroundColor:COLORS.lightBg, borderWidth:1.5, borderColor:COLORS.border, borderRadius:20 },
  cardIconWrap: { width:52, height:52, borderRadius:16, backgroundColor:'rgba(201,169,110,0.2)', alignItems:'center', justifyContent:'center' },
  cardIconWrapLight: { width:52, height:52, borderRadius:16, backgroundColor:'rgba(26,26,46,0.08)', alignItems:'center', justifyContent:'center' },
  cardContent: { gap:8 },
  cardTitle: { fontFamily:'PlayfairDisplay_700Bold', fontSize:20, color:COLORS.white },
  cardTitleLight: { fontFamily:'PlayfairDisplay_700Bold', fontSize:20, color:COLORS.navy },
  cardDesc: { fontSize:13, color:'rgba(255,255,255,0.7)', lineHeight:19 },
  cardDescLight: { fontSize:13, color:'#777', lineHeight:19 },
  cardFeatures: { gap:6, marginTop:4 },
  feature: { flexDirection:'row', alignItems:'center', gap:7 },
  featureTxt: { fontSize:12, color:'rgba(255,255,255,0.85)', fontWeight:'500' },
  featureTxtLight: { fontSize:12, color:COLORS.navy, fontWeight:'500' },
  cardArrow: { alignSelf:'flex-end' },
  signinRow: { flexDirection:'row', justifyContent:'center', alignItems:'center', paddingVertical:20 },
  signinTxt: { fontSize:14, color:'#aaa' },
  signinLink: { fontSize:14, fontWeight:'700', color:COLORS.gold },
});
EOF
echo "signup.tsx done"

# ── Screen 2: Personal Signup ──────────────────────────
cat > app/signup-personal.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];

export default function SignupPersonalScreen() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [location, setLocation] = useState('');
  const [denomination, setDenomination] = useState('');
  const [showDenom, setShowDenom] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  function validateStep1() {
    const e: Record<string,string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string,string> = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleCreate() {
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.hdr}>
            <TouchableOpacity style={s.backBtn} onPress={() => step > 1 ? setStep(step-1) : router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </TouchableOpacity>
            <View style={s.steps}>
              {[1,2,3].map(i => (
                <View key={i} style={[s.step, i <= step && s.stepActive]} />
              ))}
            </View>
          </View>

          {/* Step label */}
          <View style={s.stepHdr}>
            <View style={s.stepBadge}>
              <Ionicons name="person" size={14} color={COLORS.gold} />
              <Text style={s.stepBadgeTxt}>Personal Account</Text>
            </View>
            <Text style={s.stepTitle}>
              {step === 1 ? 'Your Details' : step === 2 ? 'Secure your account' : 'Almost done!'}
            </Text>
            <Text style={s.stepSub}>
              {step === 1 ? 'Tell us a bit about yourself' : step === 2 ? 'Create a strong password' : 'Add your location and denomination (optional)'}
            </Text>
          </View>

          {/* Step 1 */}
          {step === 1 && (
            <View style={s.form}>
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput style={[s.input, errors.firstName && s.inputErr]} placeholder="Annie" placeholderTextColor={COLORS.placeholder} value={firstName} onChangeText={v => { setFirstName(v); setErrors(e => ({...e, firstName:''})); }} />
                  {!!errors.firstName && <Text style={s.errTxt}>{errors.firstName}</Text>}
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>Last Name</Text>
                  <TextInput style={[s.input, errors.lastName && s.inputErr]} placeholder="Johnson" placeholderTextColor={COLORS.placeholder} value={lastName} onChangeText={v => { setLastName(v); setErrors(e => ({...e, lastName:''})); }} />
                  {!!errors.lastName && <Text style={s.errTxt}>{errors.lastName}</Text>}
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Email Address</Text>
                <TextInput style={[s.input, errors.email && s.inputErr]} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setErrors(e => ({...e, email:''})); }} keyboardType="email-address" autoCapitalize="none" />
                {!!errors.email && <Text style={s.errTxt}>{errors.email}</Text>}
              </View>
            </View>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Password</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.password && s.inputErr]} placeholder="Min. 8 characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={v => { setPassword(v); setErrors(e => ({...e, password:''})); }} secureTextEntry={!showPw} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>
                {!!errors.password && <Text style={s.errTxt}>{errors.password}</Text>}
                {/* Strength indicator */}
                <View style={s.strengthRow}>
                  {[8,12,16].map((min,i) => (
                    <View key={i} style={[s.strengthBar, password.length >= min && s.strengthBarActive]} />
                  ))}
                  <Text style={s.strengthTxt}>
                    {password.length === 0 ? '' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.confirm && s.inputErr]} placeholder="Re-enter password" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={v => { setConfirm(v); setErrors(e => ({...e, confirm:''})); }} secureTextEntry={!showConfirm} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>
                {!!errors.confirm && <Text style={s.errTxt}>{errors.confirm}</Text>}
                {confirm.length > 0 && password === confirm && (
                  <View style={s.matchRow}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                    <Text style={s.matchTxt}>Passwords match</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>City, State <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="location-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="Glen Cove, NY" placeholderTextColor={COLORS.placeholder} value={location} onChangeText={setLocation} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Denomination <Text style={s.optional}>(optional)</Text></Text>
                <TouchableOpacity style={s.picker} onPress={() => setShowDenom(!showDenom)}>
                  <Text style={[s.pickerTxt, !denomination && s.pickerPlaceholder]}>{denomination || 'Select denomination'}</Text>
                  <Ionicons name={showDenom ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
                </TouchableOpacity>
                {showDenom && (
                  <View style={s.denomList}>
                    {DENOMINATIONS.map(d => (
                      <TouchableOpacity key={d} style={[s.denomItem, denomination===d && s.denomItemActive]} onPress={() => { setDenomination(d); setShowDenom(false); }}>
                        <Text style={[s.denomTxt, denomination===d && s.denomTxtActive]}>{d}</Text>
                        {denomination===d && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity style={s.primaryBtn} onPress={step < 3 ? handleNext : handleCreate} activeOpacity={0.88}>
            <Text style={s.primaryBtnTxt}>{step < 3 ? 'Continue' : 'Create Account'}</Text>
            <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={20} color={COLORS.white} />
          </TouchableOpacity>

          {step === 1 && (
            <View style={s.signinRow}>
              <Text style={s.signinTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}><Text style={s.signinLink}>Sign In</Text></TouchableOpacity>
            </View>
          )}

          <View style={{height:30}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  scroll:{paddingHorizontal:20,paddingTop:8},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  steps:{flexDirection:'row',gap:6},
  step:{width:32,height:4,borderRadius:2,backgroundColor:COLORS.border},
  stepActive:{backgroundColor:COLORS.navy},
  stepHdr:{marginBottom:28},
  stepBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:100,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',marginBottom:12},
  stepBadgeTxt:{fontSize:12,fontWeight:'700',color:COLORS.gold},
  stepTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:6,lineHeight:32},
  stepSub:{fontSize:14,color:'#888',lineHeight:20},
  form:{gap:4,marginBottom:24},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  optional:{fontWeight:'400',color:'#bbb'},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputErr:{borderColor:COLORS.red},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:5},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:14},
  strengthRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},
  strengthBar:{flex:1,height:3,borderRadius:2,backgroundColor:COLORS.border},
  strengthBarActive:{backgroundColor:COLORS.gold},
  strengthTxt:{fontSize:11,color:'#aaa',width:40},
  matchRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:6},
  matchTxt:{fontSize:12,color:COLORS.green,fontWeight:'600'},
  inputIconWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:15,zIndex:1},
  inputWithIcon:{paddingLeft:44},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  denomList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  denomItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  denomItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  denomTxt:{fontSize:14,color:'#444'},
  denomTxtActive:{color:COLORS.navy,fontWeight:'700'},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:17,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  signinRow:{flexDirection:'row',justifyContent:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "signup-personal.tsx done"

# ── Screen 3: Church Signup ────────────────────────────
cat > app/signup-church.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];

export default function SignupChurchScreen() {
  const [step, setStep] = useState(1);
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [address, setAddress] = useState('');
  const [denomination, setDenomination] = useState('');
  const [serviceTimes, setServiceTimes] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [showDenom, setShowDenom] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  function validateStep1() {
    const e: Record<string,string> = {};
    if (!churchName.trim()) e.churchName = 'Church name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!email.includes('@')) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: Record<string,string> = {};
    if (password.length < 8) e.password = 'Password must be at least 8 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleCreate() {
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={s.hdr}>
            <TouchableOpacity style={s.backBtn} onPress={() => step > 1 ? setStep(step-1) : router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
            </TouchableOpacity>
            <View style={s.steps}>
              {[1,2,3].map(i => (
                <View key={i} style={[s.step, i <= step && s.stepActive]} />
              ))}
            </View>
          </View>

          {/* Step label */}
          <View style={s.stepHdr}>
            <View style={s.stepBadge}>
              <Ionicons name="home" size={14} color={COLORS.navy} />
              <Text style={s.stepBadgeTxt}>Church Account</Text>
            </View>
            <Text style={s.stepTitle}>
              {step === 1 ? 'Church Details' : step === 2 ? 'Secure your account' : 'Church Information'}
            </Text>
            <Text style={s.stepSub}>
              {step === 1 ? 'Tell us about your church' : step === 2 ? 'Create a strong password' : 'Help people find your church'}
            </Text>
          </View>

          {/* Step 1 */}
          {step === 1 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Name</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="home-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon, errors.churchName && s.inputErr]} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={v => { setChurchName(v); setErrors(e => ({...e, churchName:''})); }} />
                </View>
                {!!errors.churchName && <Text style={s.errTxt}>{errors.churchName}</Text>}
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Email</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon, errors.email && s.inputErr]} placeholder="info@yourdomain.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setErrors(e => ({...e, email:''})); }} keyboardType="email-address" autoCapitalize="none" />
                </View>
                {!!errors.email && <Text style={s.errTxt}>{errors.email}</Text>}
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Denomination <Text style={s.optional}>(optional)</Text></Text>
                <TouchableOpacity style={[s.picker, showDenom && s.pickerOpen]} onPress={() => setShowDenom(!showDenom)}>
                  <Text style={[s.pickerTxt, !denomination && s.pickerPlaceholder]}>{denomination || 'Select denomination'}</Text>
                  <Ionicons name={showDenom ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
                </TouchableOpacity>
                {showDenom && (
                  <View style={s.denomList}>
                    {DENOMINATIONS.map(d => (
                      <TouchableOpacity key={d} style={[s.denomItem, denomination===d && s.denomItemActive]} onPress={() => { setDenomination(d); setShowDenom(false); }}>
                        <Text style={[s.denomTxt, denomination===d && s.denomTxtActive]}>{d}</Text>
                        {denomination===d && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Password</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.password && s.inputErr]} placeholder="Min. 8 characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={v => { setPassword(v); setErrors(e => ({...e, password:''})); }} secureTextEntry={!showPw} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>
                {!!errors.password && <Text style={s.errTxt}>{errors.password}</Text>}
                <View style={s.strengthRow}>
                  {[8,12,16].map((min,i) => (
                    <View key={i} style={[s.strengthBar, password.length >= min && s.strengthBarActive]} />
                  ))}
                  <Text style={s.strengthTxt}>
                    {password.length === 0 ? '' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong'}
                  </Text>
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Confirm Password</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.confirm && s.inputErr]} placeholder="Re-enter password" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={v => { setConfirm(v); setErrors(e => ({...e, confirm:''})); }} secureTextEntry={!showConfirm} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>
                {!!errors.confirm && <Text style={s.errTxt}>{errors.confirm}</Text>}
                {confirm.length > 0 && password === confirm && (
                  <View style={s.matchRow}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                    <Text style={s.matchTxt}>Passwords match</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Address <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="location-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="123 Faith St, Glen Cove, NY" placeholderTextColor={COLORS.placeholder} value={address} onChangeText={setAddress} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Phone Number <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="call-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="(516) 000-0000" placeholderTextColor={COLORS.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Service Times <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="time-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="Sunday 9AM & 11AM" placeholderTextColor={COLORS.placeholder} value={serviceTimes} onChangeText={setServiceTimes} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Website <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="globe-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
                </View>
              </View>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity style={s.primaryBtn} onPress={step < 3 ? handleNext : handleCreate} activeOpacity={0.88}>
            <Text style={s.primaryBtnTxt}>{step < 3 ? 'Continue' : 'Create Church Account'}</Text>
            <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={20} color={COLORS.white} />
          </TouchableOpacity>

          {step === 1 && (
            <View style={s.signinRow}>
              <Text style={s.signinTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}><Text style={s.signinLink}>Sign In</Text></TouchableOpacity>
            </View>
          )}

          <View style={{height:30}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  scroll:{paddingHorizontal:20,paddingTop:8},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:24},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  steps:{flexDirection:'row',gap:6},
  step:{width:32,height:4,borderRadius:2,backgroundColor:COLORS.border},
  stepActive:{backgroundColor:COLORS.navy},
  stepHdr:{marginBottom:28},
  stepBadge:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:12,paddingVertical:6,alignSelf:'flex-start',marginBottom:12},
  stepBadgeTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  stepTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:6,lineHeight:32},
  stepSub:{fontSize:14,color:'#888',lineHeight:20},
  form:{gap:4,marginBottom:24},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  optional:{fontWeight:'400',color:'#bbb'},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputErr:{borderColor:COLORS.red},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:5},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:14},
  strengthRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},
  strengthBar:{flex:1,height:3,borderRadius:2,backgroundColor:COLORS.border},
  strengthBarActive:{backgroundColor:COLORS.gold},
  strengthTxt:{fontSize:11,color:'#aaa',width:40},
  matchRow:{flexDirection:'row',alignItems:'center',gap:5,marginTop:6},
  matchTxt:{fontSize:12,color:COLORS.green,fontWeight:'600'},
  inputIconWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:16,zIndex:1},
  inputWithIcon:{paddingLeft:44},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:15},
  pickerOpen:{borderColor:COLORS.navy},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  denomList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  denomItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  denomItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  denomTxt:{fontSize:14,color:'#444'},
  denomTxtActive:{color:COLORS.navy,fontWeight:'700'},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:17,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  signinRow:{flexDirection:'row',justifyContent:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "signup-church.tsx done"

# Update _layout to include new screens
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
        <Stack.Screen name="signup-personal" />
        <Stack.Screen name="signup-church" />
        <Stack.Screen name="forgot" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="church-detail" />
        <Stack.Screen name="event-detail" />
      </Stack>
    </>
  );
}
EOF
echo "layout done"

echo "ALL DONE"
