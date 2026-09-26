import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';

export default function PrivacyScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('privacyTitle')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.updated}>{t('legalLastUpdated')}</Text>

        <Text style={s.h2}>{t('privacyH1')}</Text>
        <Text style={s.p}>{t('privacyP1')}</Text>

        <Text style={s.h2}>{t('privacyH2')}</Text>
        <Text style={s.p}>{t('privacyP2')}</Text>

        <Text style={s.h2}>{t('privacyH3')}</Text>
        <Text style={s.p}>{t('privacyP3')}</Text>

        <Text style={s.h2}>{t('privacyH4')}</Text>
        <Text style={s.p}>{t('privacyP4')}</Text>

        <Text style={s.h2}>{t('privacyH5')}</Text>
        <Text style={s.p}>{t('privacyP5')}</Text>

        <Text style={s.h2}>{t('privacyH6')}</Text>
        <Text style={s.p}>{t('privacyP6')}</Text>

        <Text style={s.h2}>{t('privacyH7')}</Text>
        <Text style={s.p}>{t('privacyP7')}</Text>

        <Text style={s.h2}>{t('privacyH8')}</Text>
        <Text style={s.p}>{t('privacyP8a')}</Text>
        <Text style={s.p}>{t('privacyP8b')}</Text>
        <Text style={s.p}>{t('privacyP8c')}</Text>

        <Text style={s.h2}>{t('privacyH9')}</Text>
        <Text style={s.p}>{t('privacyP9')}</Text>

        <Text style={s.h2}>{t('privacyH10')}</Text>
        <Text style={s.p}>{t('privacyP10')}</Text>

        <Text style={s.h2}>{t('privacyH11')}</Text>
        <Text style={s.p}>{t('privacyP11')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{padding:20,paddingBottom:48},
  updated:{fontSize:12,color:c.textMuted,marginBottom:20},
  h2:{fontSize:15,fontWeight:'700',color:c.text,marginTop:18,marginBottom:6},
  p:{fontSize:14,color:c.textSecondary,lineHeight:22},
});
