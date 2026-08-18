import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';

export default function TermsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Terms of Service</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.updated}>Last updated: June 2026</Text>

        <Text style={s.h2}>1. Acceptance of Terms</Text>
        <Text style={s.p}>By creating an account or using FaithFinder ("the App"), you agree to these Terms of Service. If you do not agree, please do not use the App.</Text>

        <Text style={s.h2}>2. Who Can Use FaithFinder</Text>
        <Text style={s.p}>You must be at least 13 years old to create an account. Church accounts must be created by an authorized representative of that church or ministry.</Text>

        <Text style={s.h2}>3. Your Account</Text>
        <Text style={s.p}>You are responsible for the accuracy of the information you provide and for keeping your account credentials secure. You agree to provide truthful information when registering a church or personal profile.</Text>

        <Text style={s.h2}>4. User Content</Text>
        <Text style={s.p}>You retain ownership of content you post (including text, photos, and comments). By posting, you grant FaithFinder a license to display that content within the App. You are solely responsible for what you post and agree not to post content that is unlawful, harassing, hateful, or that infringes on others' rights.</Text>

        <Text style={s.h2}>5. Community Conduct</Text>
        <Text style={s.p}>FaithFinder is a community built on respect and faith. We do not tolerate harassment, hate speech, spam, or impersonation. Reported content will be reviewed, and accounts that violate these standards may be suspended or removed.</Text>

        <Text style={s.h2}>6. Events & Payments</Text>
        <Text style={s.p}>FaithFinder facilitates event registration and ticket purchases through Stripe. A platform fee (currently 1.5%) applies to paid ticket transactions. Refunds, cancellations, and event changes are managed by the event organizer (church or individual host), not by FaithFinder. We are not responsible for events hosted by third parties.</Text>

        <Text style={s.h2}>7. Church Profiles</Text>
        <Text style={s.p}>Church accounts are responsible for the accuracy of their listing, service times, and event information. FaithFinder does not verify denominational claims or doctrine and is not responsible for the content or conduct of any listed church.</Text>

        <Text style={s.h2}>8. Location Information</Text>
        <Text style={s.p}>The App may request access to your device's location to show nearby churches and events. You can control this through your device settings at any time. Declining location access may limit certain features.</Text>

        <Text style={s.h2}>9. Termination</Text>
        <Text style={s.p}>We may suspend or terminate your account if you violate these Terms or engage in conduct harmful to the community. You may delete your account at any time through Settings.</Text>

        <Text style={s.h2}>10. Disclaimer</Text>
        <Text style={s.p}>FaithFinder is provided "as is." We do not guarantee the accuracy of church listings, event details, or user-submitted content. We are not liable for interactions, transactions, or relationships formed through the App.</Text>

        <Text style={s.h2}>11. Changes to These Terms</Text>
        <Text style={s.p}>We may update these Terms from time to time. Continued use of the App after changes take effect constitutes acceptance of the revised Terms.</Text>

        <Text style={s.h2}>12. Contact Us</Text>
        <Text style={s.p}>Questions about these Terms can be sent to support@faithfinderapp.com.</Text>
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
