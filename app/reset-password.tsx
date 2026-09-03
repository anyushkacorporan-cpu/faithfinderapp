import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { setNewPassword } from '../src/lib/auth';
import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';

/**
 * Choose a new password, arriving from a reset email.
 *
 * Deliberately does not ask for the current one. Tapping the emailed link
 * already signed this person in; not remembering the old password is why they
 * are here at all.
 */
export default function ResetPasswordScreen() {
  const { tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showToast } = useToast();

  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const mismatch = confirm.length > 0 && next !== confirm;

  async function handleSave() {
    setError('');
    if (next.length < 8) { setError(tx('New password must be at least 8 characters.')); return; }
    if (next !== confirm) { setError(tx('The passwords do not match.')); return; }

    setBusy(true);
    const err = await setNewPassword(next);
    setBusy(false);
    if (err) { setError(err); return; }

    showToast(tx('Password updated'), tx('You are signed in with your new password.'), 'success');
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardScreen>
        <ScrollView {...KEYBOARD_SCROLL_PROPS} contentContainerStyle={s.scroll}>
          <Text style={s.title}>{tx('Choose a new password')}</Text>
          <Text style={s.sub}>{tx('You are signed in from your email link. Pick a new password to finish.')}</Text>

          {!!error && (
            <View style={s.errBox}>
              <Ionicons name="alert-circle-outline" size={16} color={c.red} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          )}

          <View style={s.card}>
            <View style={s.fieldWrap}>
              <Text style={s.label}>{tx('New password')}</Text>
              <TextInput
                style={s.input} value={next}
                onChangeText={v => { setNext(v); setError(''); }}
                placeholder={tx('At least 8 characters')} placeholderTextColor={c.placeholder}
                secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} spellCheck={false}
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>{tx('Confirm new password')}</Text>
              <TextInput
                style={s.input} value={confirm}
                onChangeText={v => { setConfirm(v); setError(''); }}
                placeholder={tx('Re-enter new password')} placeholderTextColor={c.placeholder}
                secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} spellCheck={false}
              />
              {mismatch && <Text style={s.hint}>{tx('These do not match')}</Text>}
            </View>
            <TouchableOpacity style={s.showRow} onPress={() => setShow(!show)}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.gold} />
              <Text style={s.showTxt}>{show ? tx('Hide passwords') : tx('Show passwords')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.primaryBtn, busy && {opacity:0.6}]} onPress={handleSave} disabled={busy} activeOpacity={0.88}>
            <Text style={s.primaryBtnTxt}>{busy ? tx('Saving…') : tx('Set Password')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  scroll:{padding:24,flexGrow:1,justifyContent:'center'},
  title:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:c.text,marginBottom:8},
  sub:{fontSize:14,color:c.textMuted,lineHeight:20,marginBottom:24},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.isDark?'rgba(240,104,138,0.14)':'#fef2f2',borderRadius:12,padding:12,marginBottom:16},
  errTxt:{color:c.red,fontSize:13,flex:1},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,padding:16,marginBottom:20},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:c.text,marginBottom:8},
  input:{borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:c.text,backgroundColor:c.bg},
  hint:{fontSize:12,color:c.red,marginTop:6},
  showRow:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:4},
  showTxt:{fontSize:13,fontWeight:'600',color:c.gold},
  primaryBtn:{backgroundColor:c.navy,borderRadius:16,paddingVertical:16,alignItems:'center'},
  primaryBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
