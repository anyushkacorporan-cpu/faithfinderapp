import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';

export default function PrivacyScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Privacy Policy</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.updated}>Last updated: June 2026</Text>

        <Text style={s.h2}>1. Information We Collect</Text>
        <Text style={s.p}>We collect information you provide directly, such as your name, email, profile photo, bio, and church affiliation. We also collect content you create, including posts, comments, and event registrations.</Text>

        <Text style={s.h2}>2. Location Information</Text>
        <Text style={s.p}>With your permission, we collect precise location data from your device (GPS) to show nearby churches and events. You can disable location access at any time in your device settings; doing so may limit some features like "Nearby Churches."</Text>

        <Text style={s.h2}>3. Payment Information</Text>
        <Text style={s.p}>When you purchase event tickets, payment is processed securely through Stripe. FaithFinder does not store your full credit card number. Stripe's own privacy practices govern how your payment data is handled; see stripe.com/privacy for details.</Text>

        <Text style={s.h2}>4. How We Use Your Information</Text>
        <Text style={s.p}>We use your information to operate the App, including displaying your profile and posts to other users, processing event registrations and payments, sending notifications you've opted into, and improving the App's features.</Text>

        <Text style={s.h2}>5. What Other Users Can See</Text>
        <Text style={s.p}>Your name, profile photo, bio, and posts marked "Public" are visible to other users. Posts marked "Connections" are visible only to people you're connected with. Your exact location is never shown to other users — only the city-level area you choose to display, if any.</Text>

        <Text style={s.h2}>6. Data Storage</Text>
        <Text style={s.p}>Your information is stored on secure servers operated by FaithFinder and our infrastructure providers. We take reasonable measures to protect your data but cannot guarantee absolute security.</Text>

        <Text style={s.h2}>7. Data Sharing</Text>
        <Text style={s.p}>We do not sell your personal information. We share data only with service providers necessary to operate the App (such as Stripe for payments and Google for location/maps services), and when required by law.</Text>

        <Text style={s.h2}>8. Your Choices</Text>
        <Text style={s.p}>You can edit or delete your profile information at any time through Edit Profile. You can disable location access and notifications through Settings or your device's system settings. You may request deletion of your account by contacting support@faithfinderapp.com.</Text>

        <Text style={s.h2}>9. Children's Privacy</Text>
        <Text style={s.p}>FaithFinder is not intended for children under 13. We do not knowingly collect information from children under 13.</Text>

        <Text style={s.h2}>10. Changes to This Policy</Text>
        <Text style={s.p}>We may update this Privacy Policy from time to time. We will notify you of material changes through the App.</Text>

        <Text style={s.h2}>11. Contact Us</Text>
        <Text style={s.p}>Questions about this Privacy Policy can be sent to support@faithfinderapp.com.</Text>
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
