import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings, updateAppearancePrefs } from '../src/lib/settingsStore';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const appSettings = useSettings();
  const { theme, language } = appSettings.appearance;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('appearance')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.sectionLabel}>Theme</Text>
        <View style={s.card}>
          {[
            {id:'light', label:'Light', icon:'sunny-outline', color:'#f39c12'},
            {id:'dark', label:'Dark', icon:'moon-outline', color:'#7c83ff'},
            {id:'system', label:'System Default', icon:'phone-portrait-outline', color:'#7f8c8d'},
          ].map((item,i,arr) => (
            <TouchableOpacity key={item.id} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => updateAppearancePrefs({theme: item.id as any})}>
              <View style={[s.iconWrap, {backgroundColor: item.color+'22'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              {theme===item.id && <Ionicons name="checkmark-circle" size={22} color={c.gold} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Language</Text>
        <View style={s.card}>
          {['English','Español'].map((lang,i,arr) => (
            <TouchableOpacity key={lang} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => updateAppearancePrefs({language: lang})}>
              <Text style={s.rowLabel}>{lang}</Text>
              {language===lang && <Ionicons name="checkmark-circle" size={22} color={c.gold} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => router.back()}>
          <Text style={s.saveBtnTxt}>{t('savePreferences')}</Text>
        </TouchableOpacity>
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
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:c.text},
  saveBtn:{backgroundColor:c.primary,borderRadius:16,paddingVertical:15,alignItems:'center',marginTop:8},
  saveBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
});
