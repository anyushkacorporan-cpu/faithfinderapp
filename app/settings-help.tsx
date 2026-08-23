import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';

export default function HelpSupportScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const items = [
    { icon:'book-outline', color:'#667eea', labelKey:'gettingStartedGuide', action: () => Alert.alert(tx('Getting Started'), '1. Create your profile\\n2. Find churches near you\\n3. Join events and connect with your community\\n4. Share posts and grow in faith together!') },
    { icon:'help-circle-outline', color:c.gold, labelKey:'faq', action: () => Alert.alert(tx('FAQ'), tx('Our FAQ page is coming soon. In the meantime, reach out to Contact Support below with any questions!')) },
    { icon:'chatbubble-outline', color:c.green, labelKey:'contactSupport', action: () => Linking.openURL('mailto:support@faithfinderapp.com') },
    { icon:'bug-outline', color:c.red, labelKey:'reportBug', action: () => Linking.openURL('mailto:bugs@faithfinderapp.com?subject=Bug Report') },
    { icon:'star-outline', color:'#f39c12', labelKey:'rateApp', action: () => Alert.alert(tx('Rate Us'), 'FaithFinder isn\\\'t live on the App Store yet — thank you for being an early supporter! We\\\'ll let you know as soon as you can leave a review.') },
    { icon:'share-social-outline', color:'#9b59b6', labelKey:'shareApp', action: () => Share.share({message:'Check out FaithFinder — find your church community! https://faithfinderapp.com'}).catch(()=>{}) },
    { icon:'document-text-outline', color:c.navy, labelKey:'termsOfService', action: () => router.push('/terms') },
    { icon:'shield-outline', color:'#7f8c8d', labelKey:'privacyPolicy', action: () => router.push('/privacy') },
  ];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('helpSupport')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.emailBox}>
          <Ionicons name="mail-outline" size={24} color={c.gold} />
          <View style={s.emailInfo}>
            <Text style={s.emailLabel}>{t('emailSupport')}</Text>
            <Text style={s.emailAddr}>support@faithfinderapp.com</Text>
          </View>
        </View>
        <View style={s.card}>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={[s.row, i<items.length-1&&s.rowBorder]} onPress={item.action}>
              <View style={[s.iconWrap, {backgroundColor: item.color+'22'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{t(item.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={16} color={c.placeholder} />
            </TouchableOpacity>
          ))}
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
  emailBox:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.card,borderRadius:16,padding:16,marginBottom:16,borderWidth:1,borderColor:c.border},
  emailInfo:{flex:1},
  emailLabel:{fontSize:13,fontWeight:'600',color:c.text},
  emailAddr:{fontSize:13,color:c.gold},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:c.text},
});
