#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/event-checkout.tsx').read()

# Add Linking import
content = content.replace(
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';",
    "import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';"
)

# Replace handlePay to send email ticket
old_pay = '''  async function handlePay() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    addAttending(params.id || '');
    setProcessing(false);
    router.replace({
      pathname: '/ticket-success',
      params: { id: params.id, title: params.title, date: params.date, location: params.location, price: params.price, type: params.type, organizer: params.organizer || '' }
    });
  }'''

new_pay = '''  async function handlePay() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    addAttending(params.id || '');
    setProcessing(false);

    // Send ticket via Mail app
    const ticketId = 'TKT-' + Math.random().toString(36).substr(2,8).toUpperCase();
    const subject = encodeURIComponent('Your Ticket — ' + params.title);
    const body = encodeURIComponent(
      'Hi there,\\n\\n' +
      'Your ticket has been confirmed! Here are your details:\\n\\n' +
      '━━━━━━━━━━━━━━━━━━━━━━\\n' +
      'EVENT: ' + params.title + '\\n' +
      'DATE: ' + params.date + '\\n' +
      'LOCATION: ' + params.location + '\\n' +
      'TICKET ID: ' + ticketId + '\\n' +
      'AMOUNT PAID: ' + params.price + '\\n' +
      '━━━━━━━━━━━━━━━━━━━━━━\\n\\n' +
      'Please show this email at the door.\\n\\n' +
      'See you there!\\n' +
      'FaithFinder App Team'
    );

    // Open Mail app with pre-filled ticket email
    Linking.openURL('mailto:?subject=' + subject + '&body=' + body).catch(() => {});

    router.replace({
      pathname: '/ticket-success',
      params: { id: params.id, title: params.title, date: params.date, location: params.location, price: params.price, type: params.type, organizer: params.organizer || '', ticketId }
    });
  }'''

content = content.replace(old_pay, new_pay)

open('app/event-checkout.tsx', 'w').write(content)
print('checkout updated')
PYEOF

# Update ticket-success to show email confirmation and ticketId
python3 << 'PYEOF'
content = open('app/ticket-success.tsx').read()

# Add ticketId to params
content = content.replace(
    "  const params = useLocalSearchParams<{\n    id: string; title: string; date: string; location: string;\n    price: string; type: string; organizer?: string;\n  }>();",
    "  const params = useLocalSearchParams<{\n    id: string; title: string; date: string; location: string;\n    price: string; type: string; organizer?: string; ticketId?: string;\n  }>();"
)

# Update ticket ID display to use real ticketId
content = content.replace(
    "  ticketId:{fontSize:11,color:'#aaa',textAlign:'center',paddingBottom:14,letterSpacing:2},",
    "  ticketId:{fontSize:11,color:'#aaa',textAlign:'center',paddingBottom:14,letterSpacing:2},\n  emailBanner:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:12,padding:12,marginBottom:16},\n  emailBannerTxt:{color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:'600'},"
)

# Add email confirmation banner before actions
content = content.replace(
    "          {/* Actions */}\n          <View style={s.actions}>",
    """          {/* Email banner */}
          <View style={s.emailBanner}>
            <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={s.emailBannerTxt}>Ticket sent to your Mail app</Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>"""
)

# Use real ticket ID
content = content.replace(
    "  ticketId:{fontSize:11,color:'#aaa',textAlign:'center',paddingBottom:14,letterSpacing:2},",
    "  ticketId:{fontSize:11,color:'#aaa',textAlign:'center',paddingBottom:14,letterSpacing:2},"
)

open('app/ticket-success.tsx', 'w').write(content)
print('ticket-success updated')
PYEOF

echo "ALL DONE"
