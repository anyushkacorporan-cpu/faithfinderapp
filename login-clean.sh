#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > app/login.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  function handleLogin() {
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Please enter your password.'); return; }
    setUser({ email });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.crossWrap}>
              <Text style={s.cross}>✝</Text>
            </View>
            <Text style={s.logo}><Text style={s.logoGold}>Faith</Text><Text style={s.logoNavy}>Finder</Text></Text>
          </View>

          {/* Verse */}
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord.</Text>
          <Text style={s.verseRef}>— Jeremiah 29:11</Text>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to your FaithFinder account</Text>

            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput
                  style={[s.input, s.inputWithIcon]}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.placeholder}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput
                  style={[s.input, s.inputWithIcon, {paddingRight:50}]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.placeholder}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPw}
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={s.forgotWrap} onPress={() => router.push('/forgot')}>
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In */}
            <TouchableOpacity style={s.signInBtn} onPress={handleLogin} activeOpacity={0.88}>
              <Text style={s.signInTxt}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Create account */}
            <TouchableOpacity style={s.signUpBtn} onPress={() => router.push('/signup')} activeOpacity={0.88}>
              <Text style={s.signUpTxt}>Create an Account</Text>
            </TouchableOpacity>

            <View style={s.termsWrap}>
              <Text style={s.termsTxt}>By signing in you agree to our </Text>
              <TouchableOpacity><Text style={s.termsLink}>Privacy Policy</Text></TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#f8f7f4' },
  scroll: { flexGrow:1, paddingHorizontal:24, paddingTop:48 },
  logoWrap: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 },
  crossWrap: { width:40, height:40, borderRadius:11, backgroundColor:'rgba(201,169,110,0.12)', alignItems:'center', justifyContent:'center' },
  cross: { fontSize:20, color:COLORS.gold },
  logo: { fontFamily:'PlayfairDisplay_700Bold', fontSize:30 },
  logoGold: { color:COLORS.gold },
  logoNavy: { color:COLORS.navy },
  verse: { fontFamily:'PlayfairDisplay_400Regular_Italic', fontSize:13, color:'#aaa', textAlign:'center', lineHeight:20, paddingHorizontal:20 },
  verseRef: { fontFamily:'PlayfairDisplay_400Regular_Italic', fontSize:12, color:COLORS.gold, textAlign:'center', marginTop:4, marginBottom:32 },
  card: { backgroundColor:COLORS.white, borderRadius:24, borderWidth:1, borderColor:'#ebe8e2', padding:24, shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.06, shadowRadius:12 },
  cardTitle: { fontFamily:'PlayfairDisplay_700Bold', fontSize:24, color:COLORS.navy, marginBottom:4 },
  cardSub: { fontSize:14, color:'#aaa', marginBottom:24 },
  errBox: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fef2f2', borderRadius:12, padding:12, marginBottom:16 },
  errTxt: { color:'#dc2626', fontSize:13, flex:1 },
  fieldWrap: { marginBottom:16 },
  label: { fontSize:13, fontWeight:'600', color:'#444', marginBottom:8 },
  inputWrap: { position:'relative' },
  inputIcon: { position:'absolute', left:14, top:15, zIndex:1 },
  input: { borderWidth:1.5, borderColor:'#e8e3da', borderRadius:14, paddingHorizontal:16, paddingVertical:14, fontSize:15, color:COLORS.navy, backgroundColor:COLORS.white },
  inputWithIcon: { paddingLeft:44 },
  eyeBtn: { position:'absolute', right:14, top:13 },
  forgotWrap: { alignSelf:'flex-end', marginBottom:20, marginTop:-4 },
  forgotTxt: { fontSize:13, color:COLORS.gold, fontWeight:'600' },
  signInBtn: { backgroundColor:COLORS.navy, borderRadius:16, paddingVertical:16, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, marginBottom:16, shadowColor:COLORS.navy, shadowOffset:{width:0,height:4}, shadowOpacity:0.25, shadowRadius:8 },
  signInTxt: { color:COLORS.white, fontSize:16, fontWeight:'700' },
  dividerRow: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:16 },
  dividerLine: { flex:1, height:1, backgroundColor:'#f0ede8' },
  dividerTxt: { fontSize:13, color:'#ccc', fontWeight:'600' },
  signUpBtn: { borderWidth:1.5, borderColor:'#e8e3da', borderRadius:16, paddingVertical:15, alignItems:'center', marginBottom:20 },
  signUpTxt: { fontSize:15, fontWeight:'700', color:COLORS.navy },
  termsWrap: { flexDirection:'row', justifyContent:'center', flexWrap:'wrap' },
  termsTxt: { fontSize:12, color:'#bbb' },
  termsLink: { fontSize:12, color:COLORS.gold, fontWeight:'600' },
});
EOF
echo "ALL DONE"
