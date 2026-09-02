import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { changePassword } from '../src/lib/auth';
import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';

/**
 * Change your password.
 *
 * Until this existed the only way to change a password was a reset email,
 * which needs mail delivery the project does not have configured — so in
 * practice there was no way at all.
 */
export default function ChangePasswordScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showToast } = useToast();

  const [currentPw, setCurrentPw] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Checked as you type, so the button is never the first place you learn the
  // two do not match.
  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  async function handleSave() {
    setError('');
    if (!currentPw) { setError(tx('Enter your current password.')); return; }
    if (next.length < 8) { setError(tx('New password must be at least 8 characters.')); return; }
    if (next !== confirm) { setError(tx('The new passwords do not match.')); return; }

    setBusy(true);
    const err = await changePassword(currentPw, next);
    setBusy(false);
    if (err) { setError(err); return; }

    showToast(tx('Password changed'), tx('Use your new password next time you sign in.'), 'success');
    router.back();
  }

  function field(
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    hint?: string,
  ) {
    return (
      <View style={s.fieldWrap}>
        <Text style={s.label}>{label}</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={value}
            onChangeText={v => { onChange(v); setError(''); }}
            placeholder={placeholder}
            placeholderTextColor={c.placeholder}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        </View>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{tx('Change Password')}</Text>
        <View style={{width:36}} />
      </View>

      <KeyboardScreen>
        <ScrollView {...KEYBOARD_SCROLL_PROPS} contentContainerStyle={s.scroll}>
          {!!error && (
            <View style={s.errBox}>
              <Ionicons name="alert-circle-outline" size={16} color={c.red} />
              <Text style={s.errTxt}>{error}</Text>
            </View>
          )}

          <View style={s.card}>
            {field(tx('Current password'), currentPw, setCurrentPw, tx('Enter your current password'))}
            {field(tx('New password'), next, setNext, tx('At least 8 characters'),
                   tooShort ? tx('At least 8 characters') : undefined)}
            {field(tx('Confirm new password'), confirm, setConfirm, tx('Re-enter new password'),
                   mismatch ? tx('These do not match') : undefined)}

            <TouchableOpacity style={s.showRow} onPress={() => setShow(!show)}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.gold} />
              <Text style={s.showTxt}>{show ? tx('Hide passwords') : tx('Show passwords')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, busy && {opacity:0.6}]}
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.88}
          >
            <Text style={s.primaryBtnTxt}>{busy ? tx('Saving…') : tx('Change Password')}</Text>
          </TouchableOpacity>

          <Text style={s.note}>
            {tx('You stay signed in on this device. Other devices will need the new password.')}
          </Text>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{padding:20},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.isDark?'rgba(240,104,138,0.14)':'#fef2f2',borderRadius:12,padding:12,marginBottom:16},
  errTxt:{color:c.red,fontSize:13,flex:1},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,padding:16,marginBottom:20},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:c.text,marginBottom:8},
  inputWrap:{position:'relative'},
  input:{borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:c.text,backgroundColor:c.bg},
  hint:{fontSize:12,color:c.red,marginTop:6},
  showRow:{flexDirection:'row',alignItems:'center',gap:8,paddingTop:4},
  showTxt:{fontSize:13,fontWeight:'600',color:c.gold},
  primaryBtn:{backgroundColor:c.navy,borderRadius:16,paddingVertical:16,alignItems:'center'},
  primaryBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
  note:{fontSize:12,color:c.textMuted,textAlign:'center',marginTop:14,lineHeight:18},
});
