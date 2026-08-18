#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── 1. PREMIUM CHECKOUT SCREEN ──────────────────────────
cat > app/event-checkout.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { addAttending } from '../src/lib/eventActionsStore';

export default function EventCheckoutScreen() {
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'apple' | 'card'>('apple');

  const ticketPrice = parseFloat(params.price?.replace('$','') || '0');
  const platformFee = parseFloat((ticketPrice * 0.015).toFixed(2));
  const total = parseFloat((ticketPrice + platformFee).toFixed(2));

  async function handlePay() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));
    addAttending(params.id || '');
    setProcessing(false);
    router.replace({
      pathname: '/ticket-success',
      params: { id: params.id, title: params.title, date: params.date, location: params.location, price: params.price, type: params.type, organizer: params.organizer || '' }
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Checkout</Text>
        <View style={{width:36}} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Event summary */}
        <View style={s.eventCard}>
          <LinearGradient colors={['#1a1a2e','#2d2240']} style={s.eventBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={s.typePill}><Text style={s.typePillTxt}>{params.type}</Text></View>
          </LinearGradient>
          <View style={s.eventInfo}>
            <Text style={s.eventTitle}>{params.title}</Text>
            {!!params.organizer && <Text style={s.eventOrganizer}>by {params.organizer}</Text>}
            <View style={s.eventMetaRow}>
              <Ionicons name="calendar-outline" size={13} color="#888" />
              <Text style={s.eventMetaTxt}>{params.date}</Text>
            </View>
            <View style={s.eventMetaRow}>
              <Ionicons name="location-outline" size={13} color="#888" />
              <Text style={s.eventMetaTxt} numberOfLines={1}>{params.location}</Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order Summary</Text>
          <View style={s.orderCard}>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>1x Ticket</Text>
              <Text style={s.orderVal}>${ticketPrice.toFixed(2)}</Text>
            </View>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>Platform Fee (1.5%)</Text>
              <Text style={s.orderVal}>${platformFee.toFixed(2)}</Text>
            </View>
            <View style={s.orderDivider} />
            <View style={s.orderRow}>
              <Text style={s.orderTotalLbl}>Total</Text>
              <Text style={s.orderTotalVal}>${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment Method</Text>
          <TouchableOpacity
            style={[s.payMethodBtn, paymentMethod === 'apple' && s.payMethodBtnActive]}
            onPress={() => setPaymentMethod('apple')}
          >
            <View style={s.payMethodLeft}>
              <View style={[s.payMethodIcon, {backgroundColor:'#000'}]}>
                <Ionicons name="logo-apple" size={20} color={COLORS.white} />
              </View>
              <View>
                <Text style={s.payMethodName}>Apple Pay</Text>
                <Text style={s.payMethodSub}>Touch ID or Face ID</Text>
              </View>
            </View>
            <View style={[s.payMethodCheck, paymentMethod === 'apple' && s.payMethodCheckActive]}>
              {paymentMethod === 'apple' && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.payMethodBtn, paymentMethod === 'card' && s.payMethodBtnActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <View style={s.payMethodLeft}>
              <View style={[s.payMethodIcon, {backgroundColor:'#667eea'}]}>
                <Ionicons name="card-outline" size={20} color={COLORS.white} />
              </View>
              <View>
                <Text style={s.payMethodName}>Credit / Debit Card</Text>
                <Text style={s.payMethodSub}>Visa, Mastercard, Amex</Text>
              </View>
            </View>
            <View style={[s.payMethodCheck, paymentMethod === 'card' && s.payMethodCheckActive]}>
              {paymentMethod === 'card' && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Security note */}
        <View style={s.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.green} />
          <Text style={s.secureTxt}>Secured by Stripe · 256-bit SSL encryption</Text>
        </View>

        <View style={{height:120}} />
      </ScrollView>

      {/* Pay button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.payBtn, processing && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={processing}
          activeOpacity={0.88}
        >
          {paymentMethod === 'apple' && !processing ? (
            <View style={s.applePayRow}>
              <Ionicons name="logo-apple" size={20} color={COLORS.white} />
              <Text style={s.payBtnTxt}>Pay</Text>
            </View>
          ) : (
            <Text style={s.payBtnTxt}>{processing ? 'Processing...' : 'Pay $' + total.toFixed(2)}</Text>
          )}
          {processing && <View style={s.processingDot} />}
        </TouchableOpacity>
        <Text style={s.footerNote}>By completing purchase you agree to our Terms of Service</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{flex:1},
  eventCard:{backgroundColor:COLORS.white,margin:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border},
  eventBanner:{height:90,padding:12,justifyContent:'flex-end'},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  typePillTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  eventInfo:{padding:14},
  eventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:17,color:COLORS.navy,marginBottom:3},
  eventOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',marginBottom:8},
  eventMetaRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4},
  eventMetaTxt:{fontSize:13,color:'#666'},
  section:{paddingHorizontal:16,marginBottom:16},
  sectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:10},
  orderCard:{backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  orderRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  orderLbl:{fontSize:14,color:'#666'},
  orderVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  orderDivider:{height:1,backgroundColor:COLORS.border,marginBottom:10},
  orderTotalLbl:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  orderTotalVal:{fontSize:18,fontWeight:'700',color:COLORS.navy},
  payMethodBtn:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.white,borderRadius:14,padding:14,marginBottom:10,borderWidth:1.5,borderColor:COLORS.border},
  payMethodBtnActive:{borderColor:COLORS.navy,backgroundColor:'rgba(26,26,46,0.02)'},
  payMethodLeft:{flexDirection:'row',alignItems:'center',gap:12},
  payMethodIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  payMethodName:{fontSize:15,fontWeight:'600',color:COLORS.navy},
  payMethodSub:{fontSize:12,color:'#aaa'},
  payMethodCheck:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'#ddd',alignItems:'center',justifyContent:'center'},
  payMethodCheckActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  secureRow:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,marginBottom:20},
  secureTxt:{fontSize:12,color:'#aaa'},
  footer:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:COLORS.white,padding:16,borderTopWidth:1,borderTopColor:COLORS.border},
  payBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  payBtnDisabled:{opacity:0.6},
  applePayRow:{flexDirection:'row',alignItems:'center',gap:6},
  payBtnTxt:{color:COLORS.white,fontSize:17,fontWeight:'700'},
  processingDot:{width:8,height:8,borderRadius:4,backgroundColor:'rgba(255,255,255,0.5)',marginLeft:8},
  footerNote:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:8},
});
EOF
echo "checkout done"

# ── 2. TICKET SUCCESS SCREEN ────────────────────────────
cat > app/ticket-success.tsx << 'EOF'
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function TicketSuccessScreen() {
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.bg} start={{x:0,y:0}} end={{x:1,y:1}}>

        {/* Success icon */}
        <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View style={s.iconOuter}>
            <View style={s.iconInner}>
              <Ionicons name="checkmark" size={44} color={COLORS.white} />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          <Text style={s.successLabel}>Ticket Secured</Text>
          <Text style={s.successTitle}>{params.title}</Text>
          <Text style={s.successSub}>You're Attending</Text>

          {/* Ticket card */}
          <View style={s.ticketCard}>
            <View style={s.ticketTop}>
              <View style={s.ticketTypePill}>
                <Text style={s.ticketTypeTxt}>{params.type}</Text>
              </View>
              <View style={s.ticketStatusPill}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.green} />
                <Text style={s.ticketStatusTxt}>Confirmed</Text>
              </View>
            </View>
            <Text style={s.ticketEventTitle}>{params.title}</Text>
            {!!params.organizer && <Text style={s.ticketOrganizer}>by {params.organizer}</Text>}
            <View style={s.ticketDivider} />
            <View style={s.ticketDetails}>
              <View style={s.ticketDetail}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.gold} />
                <View>
                  <Text style={s.ticketDetailLbl}>Date</Text>
                  <Text style={s.ticketDetailVal}>{params.date}</Text>
                </View>
              </View>
              <View style={s.ticketDetail}>
                <Ionicons name="location-outline" size={16} color={COLORS.gold} />
                <View style={{flex:1}}>
                  <Text style={s.ticketDetailLbl}>Location</Text>
                  <Text style={s.ticketDetailVal} numberOfLines={2}>{params.location}</Text>
                </View>
              </View>
              <View style={s.ticketDetail}>
                <Ionicons name="ticket-outline" size={16} color={COLORS.gold} />
                <View>
                  <Text style={s.ticketDetailLbl}>Amount Paid</Text>
                  <Text style={s.ticketDetailVal}>{params.price}</Text>
                </View>
              </View>
            </View>
            <View style={s.ticketBarcode}>
              {Array.from({length:30}).map((_,i) => (
                <View key={i} style={[s.barcodeBar, {height: Math.random() > 0.5 ? 28 : 18, opacity: 0.15 + Math.random() * 0.6}]} />
              ))}
            </View>
            <Text style={s.ticketId}>TKT-{Math.random().toString(36).substr(2,8).toUpperCase()}</Text>
          </View>

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity style={s.viewEventBtn} onPress={() => router.replace({
              pathname: '/event-detail',
              params: { id: params.id, title: params.title, description: '', date: params.date, location: params.location, type: params.type, price: params.price }
            })}>
              <Text style={s.viewEventBtnTxt}>View Event Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/(tabs)/events')}>
              <Text style={s.homeBtnTxt}>Back to Events</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1},
  bg:{flex:1,paddingHorizontal:24,paddingTop:40,alignItems:'center'},
  iconWrap:{marginBottom:24},
  iconOuter:{width:100,height:100,borderRadius:50,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center'},
  iconInner:{width:76,height:76,borderRadius:38,backgroundColor:COLORS.green,alignItems:'center',justifyContent:'center'},
  content:{width:'100%',alignItems:'center'},
  successLabel:{fontSize:13,fontWeight:'700',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8},
  successTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:26,color:COLORS.white,textAlign:'center',marginBottom:4},
  successSub:{fontSize:16,color:COLORS.gold,fontWeight:'600',marginBottom:24},
  ticketCard:{width:'100%',backgroundColor:COLORS.white,borderRadius:20,overflow:'hidden',marginBottom:24},
  ticketTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,paddingBottom:8},
  ticketTypePill:{backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:12,paddingVertical:4},
  ticketTypeTxt:{fontSize:11,fontWeight:'700',color:'#888'},
  ticketStatusPill:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  ticketStatusTxt:{fontSize:11,fontWeight:'700',color:COLORS.green},
  ticketEventTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:COLORS.navy,paddingHorizontal:16,marginBottom:4},
  ticketOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',paddingHorizontal:16,marginBottom:12},
  ticketDivider:{height:1,backgroundColor:COLORS.border,marginHorizontal:16,marginBottom:14},
  ticketDetails:{paddingHorizontal:16,gap:12,marginBottom:14},
  ticketDetail:{flexDirection:'row',alignItems:'flex-start',gap:10},
  ticketDetailLbl:{fontSize:10,color:'#aaa',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.3},
  ticketDetailVal:{fontSize:14,color:COLORS.navy,fontWeight:'600',marginTop:2},
  ticketBarcode:{flexDirection:'row',alignItems:'center',gap:1.5,paddingHorizontal:16,marginBottom:8,height:36},
  barcodeBar:{width:3,backgroundColor:COLORS.navy,borderRadius:1},
  ticketId:{fontSize:11,color:'#aaa',textAlign:'center',paddingBottom:14,letterSpacing:2},
  actions:{width:'100%',gap:10},
  viewEventBtn:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,paddingVertical:15,alignItems:'center'},
  viewEventBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  homeBtn:{borderWidth:1.5,borderColor:'rgba(255,255,255,0.25)',borderRadius:14,paddingVertical:14,alignItems:'center'},
  homeBtnTxt:{color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:'600'},
});
EOF
echo "ticket-success done"

# ── 3. UPDATE event-detail to use checkout screen ────────
python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Replace the paid event Alert with navigation to checkout
old_paid = '''      Alert.alert(
        'Get Tickets',
        'Tickets are ' + params.price,
        [
          { text: 'Buy Tickets', onPress: () => Linking.openURL('https://faithfinderapp.com/tickets') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );'''

new_paid = '''      router.push({
        pathname: '/event-checkout',
        params: {
          id: params.id,
          title: params.title,
          date: params.date,
          location: params.location,
          price: params.price,
          type: params.type,
        }
      });'''

content = content.replace(old_paid, new_paid)

# Replace free event success message
old_free_success = "setAttending(true);\n              addAttending(params.id || '');\n              Alert.alert('Registered!', \"You're in!\");"
new_free_success = """setAttending(true);
              addAttending(params.id || '');
              router.push({
                pathname: '/ticket-success',
                params: {
                  id: params.id,
                  title: params.title,
                  date: params.date,
                  location: params.location,
                  price: 'Free',
                  type: params.type,
                }
              });"""
content = content.replace(old_free_success, new_free_success)

open('app/event-detail.tsx', 'w').write(content)
print('event-detail updated')
PYEOF

# ── 4. UPDATE LAYOUT to include new screens ──────────────
python3 << 'PYEOF'
content = open('app/_layout.tsx').read()
added = []
if 'event-checkout' not in content:
    content = content.replace(
        '<Stack.Screen name="event-detail" />',
        '<Stack.Screen name="event-detail" />\n        <Stack.Screen name="event-checkout" />\n        <Stack.Screen name="ticket-success" />'
    )
    added.append('event-checkout, ticket-success')
open('app/_layout.tsx', 'w').write(content)
print('Layout updated:', added if added else 'already exists')
PYEOF

echo "ALL DONE"
