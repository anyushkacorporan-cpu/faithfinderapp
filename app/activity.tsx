import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { ActivityList } from '../src/components/ActivityList';
import { useTranslation } from '../src/lib/i18n';

/**
 * Activity as its own screen.
 *
 * The profile's Activity tab is the way in now — nothing in the app pushes
 * this route any more. It stays registered because the list it shows lives in
 * ActivityList either way, so keeping the route costs a header and nothing
 * else, and a link that arrives here from outside the app still lands
 * somewhere sensible.
 */
export default function ActivityScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('activity')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ActivityList />
        <View style={{height:40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
});
