import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, updateLocationPrefs } from '../src/lib/settingsStore';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';

export default function LocationSettingsScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const settings = useSettings();
  const { locationEnabled, nearbyChurches, nearbyEvents } = settings.location;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('locationSettings')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionDesc}>{t('controlLocationUsage')}</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorder]}>
            <View style={[s.iconWrap, {backgroundColor:c.lightGreen}]}>
              <Ionicons name="location" size={20} color={c.green} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('enableLocation')}</Text>
              <Text style={s.rowDesc}>{t('allowLocationAccess')}</Text>
            </View>
            <Switch value={locationEnabled} onValueChange={(v) => updateLocationPrefs({locationEnabled:v})} trackColor={{false:c.cardAlt,true:c.navy}} thumbColor={c.white} />
          </View>
          <View style={[s.row, s.rowBorder, !locationEnabled && {opacity:0.4}]}>
            <View style={[s.iconWrap, {backgroundColor:'rgba(201,169,110,0.16)'}]}>
              <Ionicons name="home-outline" size={20} color={c.gold} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('nearbyChurches')}</Text>
              <Text style={s.rowDesc}>{t('showChurchesNear')}</Text>
            </View>
            <Switch disabled={!locationEnabled} value={locationEnabled && nearbyChurches} onValueChange={(v) => updateLocationPrefs({nearbyChurches:v})} trackColor={{false:c.cardAlt,true:c.navy}} thumbColor={c.white} />
          </View>
          <View style={[s.row, !locationEnabled && {opacity:0.4}]}>
            <View style={[s.iconWrap, {backgroundColor:c.isDark?'rgba(124,131,255,0.18)':'rgba(26,26,46,0.08)'}]}>
              <Ionicons name="calendar-outline" size={20} color={c.navy} />
            </View>
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>{t('nearbyEventsLabel')}</Text>
              <Text style={s.rowDesc}>{t('showEventsNear')}</Text>
            </View>
            <Switch disabled={!locationEnabled} value={locationEnabled && nearbyEvents} onValueChange={(v) => updateLocationPrefs({nearbyEvents:v})} trackColor={{false:c.cardAlt,true:c.navy}} thumbColor={c.white} />
          </View>
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
  sectionDesc:{fontSize:14,color:c.textMuted,marginBottom:16,lineHeight:20},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden',marginBottom:20},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowInfo:{flex:1},
  rowLabel:{fontSize:14,fontWeight:'600',color:c.text,marginBottom:2},
  rowDesc:{fontSize:12,color:c.textMuted},
});
