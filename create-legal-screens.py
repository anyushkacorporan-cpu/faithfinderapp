import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

terms_screen = '''import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function TermsScreen() {
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
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

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20,paddingBottom:48},
  updated:{fontSize:12,color:'#aaa',marginBottom:20},
  h2:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginTop:18,marginBottom:6},
  p:{fontSize:14,color:'#444',lineHeight:22},
});
'''

privacy_screen = '''import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
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

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20,paddingBottom:48},
  updated:{fontSize:12,color:'#aaa',marginBottom:20},
  h2:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginTop:18,marginBottom:6},
  p:{fontSize:14,color:'#444',lineHeight:22},
});
'''

with open('app/terms.tsx', 'w', encoding='utf-8') as f:
    f.write(terms_screen)
print('Created app/terms.tsx')

with open('app/privacy.tsx', 'w', encoding='utf-8') as f:
    f.write(privacy_screen)
print('Created app/privacy.tsx')

print('ALL DONE - Part 1 (screens created)')
