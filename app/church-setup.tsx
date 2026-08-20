import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useTranslation } from '../src/lib/i18n';
import { getUser } from '../src/lib/userStore';

export default function ChurchSetupScreen() {
  const { t } = useTranslation();
  const user = getUser();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.inner}>

        {/* Header */}
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={s.titleWrap}>
          <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.logoIcon} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Ionicons name="home" size={28} color={COLORS.gold} />
          </LinearGradient>
          <Text style={s.title}>{t('setUpYourChurch')}</Text>
          <Text style={s.subtitle}>
            Welcome{user.churchName ? `, ${user.churchName}` : ''}! How would you like to get started?
          </Text>
        </View>

        {/* Options */}
        <View style={s.options}>

          {/* Claim existing */}
          <TouchableOpacity style={s.optionCard} onPress={() => router.push('/claim-church')} activeOpacity={0.88}>
            <View style={s.optionLeft}>
              <View style={s.optionIconWrap}>
                <Ionicons name="search" size={24} color={COLORS.navy} />
              </View>
              <View style={s.optionInfo}>
                <Text style={s.optionTitle}>{t('claimYourChurch')}</Text>
                <Text style={s.optionDesc}>Your church is already listed on FaithFinder. Claim it as the official account.</Text>
                <View style={s.optionTag}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
                  <Text style={s.optionTagTxt}>{t('alreadyInFaithFinder')}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ddd" />
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.orRow}>
            <View style={s.orLine} />
            <Text style={s.orTxt}>or</Text>
            <View style={s.orLine} />
          </View>

          {/* Register new */}
          <TouchableOpacity style={[s.optionCard, s.optionCardNavy]} onPress={() => router.push('/register-church')} activeOpacity={0.88}>
            <View style={s.optionLeft}>
              <View style={s.optionIconWrapNavy}>
                <Ionicons name="add-circle" size={24} color={COLORS.gold} />
              </View>
              <View style={s.optionInfo}>
                <Text style={s.optionTitleNavy}>{t('registerNewChurch')}</Text>
                <Text style={s.optionDescNavy}>{t('churchNotListedYet')}</Text>
                <View style={s.optionTagNavy}>
                  <Ionicons name="star" size={13} color={COLORS.gold} />
                  <Text style={s.optionTagNavyTxt}>{t('getListedVerified')}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>

        </View>

        {/* Info */}
        <View style={s.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.gold} />
          <Text style={s.infoTxt}>All church accounts go through a verification process. FaithFinder reviews submissions within 3–5 business days.</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  inner:{flex:1,paddingHorizontal:20},
  hdr:{paddingTop:8,marginBottom:16},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  titleWrap:{alignItems:'center',marginBottom:32},
  logoIcon:{width:72,height:72,borderRadius:20,alignItems:'center',justifyContent:'center',marginBottom:16},
  title:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.navy,marginBottom:8,textAlign:'center'},
  subtitle:{fontSize:15,color:'#888',textAlign:'center',lineHeight:22,paddingHorizontal:10},
  options:{gap:0,marginBottom:24},
  optionCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:20,padding:18,backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.05,shadowRadius:8},
  optionCardNavy:{backgroundColor:COLORS.navy,borderColor:COLORS.navy,marginTop:0},
  optionLeft:{flexDirection:'row',alignItems:'flex-start',gap:14,flex:1},
  optionIconWrap:{width:48,height:48,borderRadius:14,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  optionIconWrapNavy:{width:48,height:48,borderRadius:14,backgroundColor:'rgba(201,169,110,0.15)',alignItems:'center',justifyContent:'center'},
  optionInfo:{flex:1},
  optionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  optionTitleNavy:{fontSize:16,fontWeight:'700',color:COLORS.white,marginBottom:4},
  optionDesc:{fontSize:13,color:'#888',lineHeight:19,marginBottom:8},
  optionDescNavy:{fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:19,marginBottom:8},
  optionTag:{flexDirection:'row',alignItems:'center',gap:5},
  optionTagNavy:{flexDirection:'row',alignItems:'center',gap:5},
  optionTagTxt:{fontSize:12,fontWeight:'600',color:COLORS.green},
  optionTagNavyTxt:{fontSize:12,fontWeight:'600',color:COLORS.gold},
  orRow:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:16},
  orLine:{flex:1,height:1,backgroundColor:COLORS.border},
  orTxt:{fontSize:13,color:'#bbb',fontWeight:'600'},
  infoBox:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:'rgba(201,169,110,0.08)',borderRadius:14,padding:14},
  infoTxt:{fontSize:13,color:'#666',lineHeight:19,flex:1},
});
