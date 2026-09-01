import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { sendPasswordReset } from '../src/lib/auth';

import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';
export default function ForgotScreen() {
  const { t, tx } = useTranslation();
  const [email, setEmail] = useState('');
  const { showToast } = useToast();
  async function handleReset() {
    if (!email.includes('@')) { showToast(tx('Invalid Email'), tx('Please enter a valid email address.'), 'error'); return; }

    const err = await sendPasswordReset(email);
    // A failure that is not the person's fault still gets reported, but the
    // wording never confirms whether an account exists for that address —
    // that would turn this screen into a way to enumerate users.
    if (err) { showToast(tx('Something went wrong'), err, 'error'); return; }

    showToast(tx('Email Sent!'), tx('Check your inbox for your password reset link.'), 'success');
    router.back();
  }
  return (
    <KeyboardScreen>
    <ScrollView
            {...KEYBOARD_SCROLL_PROPS} contentContainerStyle={s.scroll}>
      <View style={s.logoWrap}>
        <Text style={s.title}>{t('resetPassword')}</Text>
        <Text style={s.sub}>{t('resetPasswordSub')}</Text>
      </View>
      <View style={s.card}>
        <View style={s.fieldWrap}>
          <Text style={s.label}>{t('email')}</Text>
          <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleReset} activeOpacity={0.85}>
          <Text style={s.primaryBtnTxt}>{t('sendResetLink')}</Text>
        </TouchableOpacity>
        <View style={s.divider} />
        <TouchableOpacity style={s.backRow} onPress={() => router.back()}>
          <Text style={s.goldLink}>{t('backToSignIn')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardScreen>
  );
}
const s = StyleSheet.create({
  scroll: { flexGrow:1, justifyContent:'center', padding:24, backgroundColor:'#fff' },
  logoWrap: { alignItems:'center', marginBottom:28 },
  title: { fontFamily:'PlayfairDisplay_700Bold', fontSize:26, color:'#1a1a2e', marginBottom:8 },
  sub: { fontSize:14, color:'#aaa', textAlign:'center', lineHeight:20 },
  card: { backgroundColor:'#fff', borderRadius:24, borderWidth:1, borderColor:'#e8e8e8', padding:22, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.06, shadowRadius:12, elevation:3 },
  fieldWrap: { marginBottom:18 },
  label: { fontSize:13, fontWeight:'600', color:'#444', marginBottom:6 },
  input: { borderWidth:1.5, borderColor:'#e8e8e8', borderRadius:14, paddingHorizontal:16, paddingVertical:14, fontSize:15, color:'#1a1a2e' },
  primaryBtn: { backgroundColor:'#1a1a2e', borderRadius:100, paddingVertical:16, alignItems:'center' },
  primaryBtnTxt: { color:'#fff', fontSize:16, fontWeight:'700' },
  divider: { borderTopWidth:1, borderColor:'#f0ede8', marginTop:20 },
  backRow: { alignItems:'center', paddingTop:18 },
  goldLink: { fontSize:14, fontWeight:'700', color:'#c9a96e' },
});
