import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updatePrivacyPrefs } from '../src/lib/settingsStore';
import { useConfirm } from '../src/components/Confirm';
import { deleteAccount } from '../src/lib/userStore';
import { useTranslation } from '../src/lib/i18n';

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const { showConfirm } = useConfirm();
  const settings = useSettings();
  const { publicProfile, showLocation } = settings.privacy;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('privacySecurity')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionLabel}>{t('privacy')}</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="person-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('publicProfile')}</Text>
              <Text style={s.rowDesc}>{t('allowOthersViewProfile')}</Text>
            </View>
            <Switch value={publicProfile} onValueChange={(v) => updatePrivacyPrefs({publicProfile:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={s.row}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location-outline" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('showLocationOnProfile')}</Text>
              <Text style={s.rowDesc}>{t('displayCityOnProfile')}</Text>
            </View>
            <Switch value={showLocation} onValueChange={(v) => updatePrivacyPrefs({showLocation:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
        </View>

        <Text style={s.sectionLabel}>{t('security')}</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => Alert.alert('Coming Soon', 'Two-factor authentication is in development and will be available in a future update.')}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('twoFactorAuth')}</Text>
              <Text style={s.rowDesc}>{t('comingSoon')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ddd" />
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
            <View style={[s.iconWrap,{backgroundColor:'#fdeaea'}]}>
              <Ionicons name="trash-outline" size={18} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={[s.rowLabel,{color:COLORS.red}]}>Delete Account</Text>
              <Text style={s.rowDesc}>{t('deleteAccountDesc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#ddd" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionLabel:{fontSize:12,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,marginTop:4},
  sectionDesc:{fontSize:13,color:'#999',lineHeight:19,marginTop:8,paddingHorizontal:4},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
