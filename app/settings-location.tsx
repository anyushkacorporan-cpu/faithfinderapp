import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updateLocationPrefs } from '../src/lib/settingsStore';
import { useTranslation } from '../src/lib/i18n';

export default function LocationSettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const { locationEnabled, nearbyChurches, nearbyEvents, locationNotifs } = settings.location;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('locationSettings')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionDesc}>{t('controlLocationUsage')}</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:'#e8f5e9'}]}>
              <Ionicons name="location" size={20} color={COLORS.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('enableLocation')}</Text>
              <Text style={s.rowDesc}>{t('allowLocationAccess')}</Text>
            </View>
            <Switch value={locationEnabled} onValueChange={(v) => updateLocationPrefs({locationEnabled:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder, !locationEnabled && {opacity:0.4}]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.12)'}]}>
              <Ionicons name="home-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('nearbyChurches')}</Text>
              <Text style={s.rowDesc}>{t('showChurchesNear')}</Text>
            </View>
            <Switch disabled={!locationEnabled} value={locationEnabled && nearbyChurches} onValueChange={(v) => updateLocationPrefs({nearbyChurches:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, s.rowBorder, !locationEnabled && {opacity:0.4}]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('nearbyEventsLabel')}</Text>
              <Text style={s.rowDesc}>{t('showEventsNear')}</Text>
            </View>
            <Switch disabled={!locationEnabled} value={locationEnabled && nearbyEvents} onValueChange={(v) => updateLocationPrefs({nearbyEvents:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
          <View style={[s.row, !locationEnabled && {opacity:0.4}]}>
            <View style={[s.iconWrap, {backgroundColor:'#fce4ec'}]}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.red} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('locationNotifications')}</Text>
              <Text style={s.rowDesc}>{t('notifyNearChurch')}</Text>
            </View>
            <Switch disabled={!locationEnabled} value={locationEnabled && locationNotifs} onValueChange={(v) => updateLocationPrefs({locationNotifs:v})} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>
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
  sectionDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:20},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:20},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:COLORS.navy,marginBottom:2},
  rowDesc:{fontSize:12,color:'#aaa'},
});
