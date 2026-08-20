import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { setUser } from '../src/lib/userStore';
import Logo from '../src/components/Logo';

export default function SignupScreen() {
  const { t } = useTranslation();
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
      router.push('/church-setup');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={s.logoWrap}>
            <Logo size="medium" tint="#1a1a2e" />
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
          <View style={s.card}>
            <View style={s.typeRow}>
              <TouchableOpacity style={[s.typeBtn, accountType==='personal' && s.typeBtnActive]} onPress={() => setAccountType('personal')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='personal' && s.typeIconWrapActive]}>
                  <Ionicons name="person" size={22} color={accountType==='personal' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='personal' && s.typeLblActive]}>{t('community')}</Text>
                <Text style={[s.typeSub, accountType==='personal' && s.typeSubActive]}>{t('individualBeliever')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, accountType==='church' && s.typeBtnActive]} onPress={() => setAccountType('church')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='church' && s.typeIconWrapActive]}>
                  <Ionicons name="home-outline" size={22} color={accountType==='church' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='church' && s.typeLblActive]}>{t('church')}</Text>
                <Text style={[s.typeSub, accountType==='church' && s.typeSubActive]}>{t('ministryOrOrg')}</Text>
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
                  <Text style={s.label}>{t('firstName')}</Text>
                  <TextInput style={s.input} placeholder="John" placeholderTextColor={COLORS.placeholder} value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>{t('lastName')}</Text>
                  <TextInput style={s.input} placeholder="Doe" placeholderTextColor={COLORS.placeholder} value={lastName} onChangeText={setLastName} />
                </View>
              </View>
            ) : (
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('churchName')}</Text>
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={setChurchName} />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>{t('email')}</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>{t('password')}</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder={t('eightPlusChars')} placeholderTextColor={COLORS.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>{t('confirmPassword')}</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder={t('reenter')} placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.primaryBtnTxt}>{accountType === 'church' ? 'Continue to Claim Church' : 'Create Account'}</Text>
              {accountType === 'church' && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </TouchableOpacity>
            <Text style={s.terms}>{t('agreeCreateAccount')}<Text style={s.termsLink}>{t('privacyPolicy')}</Text> and <Text style={s.termsLink}>{t('termsOfService')}</Text></Text>
          </View>
          <View style={s.signinRow}>
            <Text style={s.signinTxt}>{t('alreadyHaveAccount')}</Text>
            <TouchableOpacity onPress={() => router.back()}><Text style={s.signinLink}>{t('signIn')}</Text></TouchableOpacity>
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
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',marginBottom:12},
  logoWrap:{alignItems:'center',marginBottom:10},
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
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:6},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  terms:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:14,lineHeight:17},
  termsLink:{color:COLORS.gold,fontWeight:'600'},
  signinRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
