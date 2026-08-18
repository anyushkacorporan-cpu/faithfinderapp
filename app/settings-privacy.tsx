import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, updatePrivacyPrefs } from '../src/lib/settingsStore';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useConfirm } from '../src/components/Confirm';
import { deleteAccount } from '../src/lib/userStore';
import { useTranslation } from '../src/lib/i18n';

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showConfirm } = useConfirm();
  const settings = useSettings();
  const { publicProfile, showLocation } = settings.privacy;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('privacySecurity')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLabel}>{t('privacy')}</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:c.isDark?'rgba(124,131,255,0.18)':'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="person-outline" size={20} color={c.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('publicProfile')}</Text>
              <Text style={s.rowDesc}>{t('allowOthersViewProfile')}</Text>
            </View>
            <Switch value={publicProfile} onValueChange={(v) => updatePrivacyPrefs({publicProfile:v})} trackColor={{false:c.cardAlt,true:c.navy}} thumbColor={c.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:c.lightGreen}]}>
              <Ionicons name="location-outline" size={20} color={c.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('showLocationOnProfile')}</Text>
              <Text style={s.rowDesc}>{t('displayCityOnProfile')}</Text>
            </View>
            <Switch value={showLocation} onValueChange={(v) => updatePrivacyPrefs({showLocation:v})} trackColor={{false:c.cardAlt,true:c.navy}} thumbColor={c.white} />
          </View>
        </View>

        <Text style={s.sectionLabel}>{t('security')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Alert.alert('Coming Soon', 'Two-factor authentication is in development and will be available in a future update.')}>
            <View style={[s.iconWrap, {backgroundColor:c.isDark?'rgba(240,104,138,0.16)':'#fce4ec'}]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={c.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('twoFactorAuth')}</Text>
              <Text style={s.rowDesc}>{t('comingSoon')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>{t('dangerZone')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => {
            showConfirm({
              title: 'Delete Account',
              message: 'This permanently deletes your profile and data from this device and signs you out. This cannot be undone.',
              buttons: [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Account', style: 'destructive', onPress: async () => {
                  await deleteAccount();
                  router.replace('/login');
                } },
              ],
            });
          }}>
            <View style={[s.iconWrap,{backgroundColor:c.isDark?'rgba(240,104,138,0.16)':'#fdeaea'}]}>
              <Ionicons name="trash-outline" size={18} color={c.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={[s.rowLabel,{color:c.red}]}>Delete Account</Text>
              <Text style={s.rowDesc}>{t('deleteAccountDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{padding:20},
  sectionLabel:{fontSize:12,fontWeight:'700',color:c.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,marginTop:4},
  sectionDesc:{fontSize:13,color:c.textMuted,lineHeight:19,marginTop:8,paddingHorizontal:4},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:c.text,marginBottom:2},
  rowDesc:{fontSize:12,color:c.textMuted},
});
