import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { setUser } from '../src/lib/userStore';
import { signUp, getAuthUser, hasDatabase, databaseProblem } from '../src/lib/auth';
import { syncProfileAfterSignIn } from '../src/lib/profileSync';
import { KeyboardScreen } from '../src/components/KeyboardScreen';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];

export default function SignupChurchScreen() {
  const { t, tx } = useTranslation();
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

  const [creating, setCreating] = useState(false);
  const [authError, setAuthError] = useState('');

  async function handleCreate() {
    setAuthError('');

    const local = {
      accountType: 'church' as const,
      churchName: churchName.trim(),
      email: email.trim(),
      address: address.trim(),
      phone: phone.trim(),
      serviceTimes: serviceTimes.trim(),
      website: website.trim(),
      createdAt: new Date().toISOString(),
    };

    // Credentials that are present but malformed are a setup mistake, not an
    // offline build. Signing someone in locally here would hand them an
    // account that does not exist on the server.
    const configProblem = databaseProblem();
    if (configProblem) { setAuthError(configProblem); return; }

    if (!hasDatabase()) {
      setUser(local);
      router.replace('/(tabs)');
      return;
    }

    setCreating(true);
    const { error: err, needsConfirmation } = await signUp(email, password, {
      accountType: 'church',
      churchName: churchName.trim(),
    });
    if (err) { setCreating(false); setAuthError(err); return; }

    // The account exists but has no session: this project requires a
    // confirmation email. Navigating to the app now would look like success
    // and then fail at every write, so say what happened and stop here.
    if (needsConfirmation) {
      setCreating(false);
      setAuthError('Account created. Check your email for a confirmation link, then sign in.');
      return;
    }

    const u = getAuthUser();
    setUser({ ...local, id: u?.id });
    if (u) await syncProfileAfterSignIn(u.id);

    setCreating(false);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardScreen>
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
              <Text style={s.stepBadgeTxt}>{t('churchAccount')}</Text>
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
                <Text style={s.label}>{t('churchName')}</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="home-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon, errors.churchName && s.inputErr]} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={v => { setChurchName(v); setErrors(e => ({...e, churchName:''})); }} />
                </View>
                {!!errors.churchName && <Text style={s.errTxt}>{errors.churchName}</Text>}
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('churchEmail')}</Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon, errors.email && s.inputErr]} placeholder="info@yourdomain.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setErrors(e => ({...e, email:''})); }} keyboardType="email-address" autoCapitalize="none" />
                </View>
                {!!errors.email && <Text style={s.errTxt}>{errors.email}</Text>}
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('denomination')} <Text style={s.optional}>(optional)</Text></Text>
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
                <Text style={s.label}>{t('password')}</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.password && s.inputErr]} placeholder={tx('Min. 8 characters')} placeholderTextColor={COLORS.placeholder} value={password} onChangeText={v => { setPassword(v); setErrors(e => ({...e, password:''})); }} secureTextEntry={!showPw} />
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
                <Text style={s.label}>{t('confirmPassword')}</Text>
                <View style={s.pwWrap}>
                  <TextInput style={[s.input, {paddingRight:48}, errors.confirm && s.inputErr]} placeholder={tx('Re-enter password')} placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={v => { setConfirm(v); setErrors(e => ({...e, confirm:''})); }} secureTextEntry={!showConfirm} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                  </TouchableOpacity>
                </View>
                {!!errors.confirm && <Text style={s.errTxt}>{errors.confirm}</Text>}
                {confirm.length > 0 && password === confirm && (
                  <View style={s.matchRow}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                    <Text style={s.matchTxt}>{t('passwordsMatch')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <View style={s.form}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('churchAddress')} <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="location-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="123 Faith St, Glen Cove, NY" placeholderTextColor={COLORS.placeholder} value={address} onChangeText={setAddress} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('phoneNumber')} <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="call-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="(516) 000-0000" placeholderTextColor={COLORS.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('serviceTimes')} <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="time-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder={tx('Sunday 9AM & 11AM')} placeholderTextColor={COLORS.placeholder} value={serviceTimes} onChangeText={setServiceTimes} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('website')} <Text style={s.optional}>(optional)</Text></Text>
                <View style={s.inputIconWrap}>
                  <Ionicons name="globe-outline" size={18} color="#bbb" style={s.inputIcon} />
                  <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
                </View>
              </View>
            </View>
          )}

          {!!authError && <Text style={[s.errTxt, {textAlign:'center', marginBottom:10}]}>{authError}</Text>}

          {/* CTA */}
          <TouchableOpacity
            style={[s.primaryBtn, creating && {opacity:0.6}]}
            onPress={step < 3 ? handleNext : handleCreate}
            disabled={creating}
            activeOpacity={0.88}
          >
            <Text style={s.primaryBtnTxt}>
              {creating ? 'Creating account…' : step < 3 ? 'Continue' : 'Create Church Account'}
            </Text>
            {!creating && <Ionicons name={step < 3 ? 'arrow-forward' : 'checkmark'} size={20} color={COLORS.white} />}
          </TouchableOpacity>

          {step === 1 && (
            <View style={s.signinRow}>
              <Text style={s.signinTxt}>{t('alreadyHaveAccount')}</Text>
              <TouchableOpacity onPress={() => router.replace('/login')}><Text style={s.signinLink}>{t('signIn')}</Text></TouchableOpacity>
            </View>
          )}

          <View style={{height:30}} />
        </ScrollView>
      </KeyboardScreen>
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
