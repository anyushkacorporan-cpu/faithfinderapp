#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > app/signup.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

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
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.cross}>+</Text>
            <Text style={s.logo}><Text style={s.gold}>Faith</Text>Finder App</Text>
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>

          {/* Card */}
          <View style={s.card}>

            {/* Account type toggle */}
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

            {/* Error */}
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color='#dc2626' />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}

            {/* Name fields */}
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

            {/* Email */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="8+ characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm new password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="Re-enter" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.primaryBtnTxt}>Create Account</Text>
            </TouchableOpacity>

            {/* Terms */}
            <Text style={s.terms}>
              By creating an account, you agree to our{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>
              {' '}and{' '}
              <Text style={s.termsLink}>Terms of Service</Text>
            </Text>

          </View>

          {/* Sign in link */}
          <View style={s.signinRow}>
            <Text style={s.signinTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.signinLink}>Sign In</Text>
            </TouchableOpacity>
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
  row:{flexDirection:'row',marginBottom:0},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:13},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',marginTop:6,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  terms:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:14,lineHeight:17},
  termsLink:{color:COLORS.gold,fontWeight:'600'},
  signinRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "ALL DONE"
