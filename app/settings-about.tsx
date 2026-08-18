import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import Logo from '../src/components/Logo';
import { useTranslation } from '../src/lib/i18n';

export default function AboutScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('aboutApp')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.logoSection}>
          <Logo size="large" />
          <Text style={s.version}>Version 1.0.0</Text>
          <Text style={s.tagline}>"Connecting believers, one church at a time."</Text>
        </View>
        <View style={s.missionBox}>
          <Text style={s.missionTitle}>{t('ourMission')}</Text>
          <Text style={s.missionTxt}>FaithFinder exists to help believers find their spiritual home. We connect people with churches, faith communities, and events that align with their values and beliefs. Whether you're new to an area or searching for a church home, FaithFinder makes it easy to discover, connect, and grow in faith.</Text>
        </View>
        <View style={s.card}>
          {[
            {icon:'globe-outline', color:'#667eea', label:'Website', action:() => Linking.openURL('https://faithfinderapp.com')},
            {icon:'logo-instagram', color:'#e91e63', label:'Instagram', action:() => Linking.openURL('https://instagram.com/faithfinderapp')},
            {icon:'document-text-outline', color:c.navy, label:'Terms of Service', action:() => router.push('/terms' as any)},
            {icon:'shield-outline', color:c.green, label:'Privacy Policy', action:() => router.push('/privacy' as any)},
          ].map((item,i,arr) => (
            <TouchableOpacity key={i} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={item.action}>
              <View style={[s.iconWrap, {backgroundColor:item.color+'22'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.copyright}>© 2026 FaithFinder App. All rights reserved.</Text>
        <Text style={s.builtWith}>Made with ♥ for the faith community</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{padding:20,alignItems:'center'},
  logoSection:{alignItems:'center',marginBottom:24,paddingVertical:20},
  version:{fontSize:13,color:c.textMuted,marginTop:8},
  tagline:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:14,color:c.textSecondary,marginTop:6,textAlign:'center'},
  missionBox:{backgroundColor:c.card,borderRadius:16,padding:20,marginBottom:16,borderWidth:1,borderColor:c.border,width:'100%'},
  missionTitle:{fontSize:16,fontWeight:'700',color:c.text,marginBottom:10},
  missionTxt:{fontSize:14,color:c.textSecondary,lineHeight:22},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden',marginBottom:20,width:'100%'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:c.text},
  copyright:{fontSize:12,color:c.textMuted,textAlign:'center',marginBottom:4},
  builtWith:{fontSize:12,color:c.gold,textAlign:'center'},
});
