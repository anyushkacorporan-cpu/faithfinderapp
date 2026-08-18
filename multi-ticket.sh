#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Update ticketStore to support multiple tickets ──────
cat > src/lib/ticketStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  eventType: string;
  quantity: number;
  pricePerTicket: number;
  totalPaid: number;
  platformFee: number;
  purchasedAt: number;
  ticketIds: string[];
};

let tickets: Ticket[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getTickets() { return [...tickets]; }
export function getTicketForEvent(eventId: string) { return tickets.find(t => t.eventId === eventId); }

export function addTicket(ticket: Omit<Ticket, 'id' | 'purchasedAt' | 'ticketIds'>) {
  const ticketIds = Array.from({length: ticket.quantity}, () => 'TKT-' + Math.random().toString(36).substr(2,8).toUpperCase());
  const newTicket: Ticket = {
    ...ticket,
    id: Date.now().toString(),
    purchasedAt: Date.now(),
    ticketIds,
  };
  tickets = [newTicket, ...tickets];
  notify();
  return newTicket;
}

export function useTickets() {
  const [state, setState] = useState(getTickets());
  useEffect(() => {
    const fn = () => setState(getTickets());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
EOF
echo "ticketStore done"

# ── Full Checkout Screen with multi-ticket ──────────────
cat > app/event-checkout.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { addAttending } from '../src/lib/eventActionsStore';
import { addTicket } from '../src/lib/ticketStore';

export default function EventCheckoutScreen() {
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'apple' | 'card'>('apple');
  const [processing, setProcessing] = useState(false);

  const ticketPrice = parseFloat(params.price?.replace('$','') || '0');
  const subtotal = ticketPrice * quantity;
  const platformFee = parseFloat((subtotal * 0.015).toFixed(2));
  const total = parseFloat((subtotal + platformFee).toFixed(2));

  async function handlePay() {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));

    // Store tickets
    const ticket = addTicket({
      eventId: params.id || '',
      eventTitle: params.title || '',
      eventDate: params.date || '',
      eventLocation: params.location || '',
      eventType: params.type || '',
      quantity,
      pricePerTicket: ticketPrice,
      totalPaid: total,
      platformFee,
    });

    // Mark as attending
    addAttending(params.id || '');

    // Send email via Mail app
    const subject = encodeURIComponent('Your Tickets — ' + params.title);
    const ticketList = ticket.ticketIds.map((id, i) => `Ticket ${i+1}: ${id}`).join('\n');
    const body = encodeURIComponent(
      'Your tickets are confirmed!\n\n' +
      'EVENT: ' + params.title + '\n' +
      'DATE: ' + params.date + '\n' +
      'LOCATION: ' + params.location + '\n' +
      'TICKETS: ' + quantity + 'x @ $' + ticketPrice.toFixed(2) + '\n' +
      'TOTAL PAID: $' + total.toFixed(2) + '\n\n' +
      ticketList + '\n\n' +
      'Show this email at the door.\n\nFaithFinder App'
    );
    Linking.openURL('mailto:?subject=' + subject + '&body=' + body).catch(() => {});

    setProcessing(false);
    router.replace({
      pathname: '/ticket-success',
      params: {
        id: params.id,
        title: params.title,
        date: params.date,
        location: params.location,
        price: '$' + total.toFixed(2),
        type: params.type,
        organizer: params.organizer || '',
        quantity: String(quantity),
        ticketIds: ticket.ticketIds.join(','),
      }
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

        {/* Event card */}
        <View style={s.eventCard}>
          <LinearGradient colors={['#1a1a2e','#2d2240']} style={s.eventBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
            <View style={s.typePill}><Text style={s.typePillTxt}>{params.type}</Text></View>
            <Text style={s.eventBannerTitle} numberOfLines={2}>{params.title}</Text>
          </LinearGradient>
          <View style={s.eventInfo}>
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

        {/* Ticket Quantity */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ticket Quantity</Text>
          <View style={s.quantityCard}>
            <View style={s.quantityLeft}>
              <Text style={s.quantityLabel}>Number of Tickets</Text>
              <Text style={s.quantityPriceEach}>${ticketPrice.toFixed(2)} per ticket</Text>
            </View>
            <View style={s.quantityControls}>
              <TouchableOpacity
                style={[s.quantityBtn, quantity <= 1 && s.quantityBtnDisabled]}
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Ionicons name="remove" size={20} color={quantity <= 1 ? '#ddd' : COLORS.navy} />
              </TouchableOpacity>
              <Text style={s.quantityNum}>{quantity}</Text>
              <TouchableOpacity
                style={[s.quantityBtn, quantity >= 10 && s.quantityBtnDisabled]}
                onPress={() => setQuantity(q => Math.min(10, q + 1))}
                disabled={quantity >= 10}
              >
                <Ionicons name="add" size={20} color={quantity >= 10 ? '#ddd' : COLORS.navy} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Order Summary</Text>
          <View style={s.orderCard}>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>{quantity} × Ticket{quantity > 1 ? 's' : ''}</Text>
              <Text style={s.orderVal}>${subtotal.toFixed(2)}</Text>
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
            style={[s.payMethodBtn, paymentMethod==='apple' && s.payMethodBtnActive]}
            onPress={() => setPaymentMethod('apple')}
          >
            <View style={s.payMethodLeft}>
              <View style={[s.payMethodIcon, {backgroundColor:'#000'}]}>
                <Ionicons name="logo-apple" size={20} color={COLORS.white} />
              </View>
              <View>
                <Text style={s.payMethodName}>Apple Pay</Text>
                <Text style={s.payMethodSub}>Face ID · Touch ID</Text>
              </View>
            </View>
            <View style={[s.payMethodCheck, paymentMethod==='apple' && s.payMethodCheckActive]}>
              {paymentMethod==='apple' && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.payMethodBtn, paymentMethod==='card' && s.payMethodBtnActive]}
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
            <View style={[s.payMethodCheck, paymentMethod==='card' && s.payMethodCheckActive]}>
              {paymentMethod==='card' && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
        </View>

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
              <Text style={s.payBtnTxt}>Pay ${total.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={s.payBtnTxt}>{processing ? 'Processing...' : 'Pay $' + total.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
        <Text style={s.footerNote}>
          {quantity} ticket{quantity > 1 ? 's' : ''} · ${total.toFixed(2)} total · Tickets sent to Mail app
        </Text>
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
  eventBanner:{height:110,padding:14,justifyContent:'space-between'},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  typePillTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  eventBannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:COLORS.white},
  eventInfo:{padding:14},
  eventOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',marginBottom:6},
  eventMetaRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4},
  eventMetaTxt:{fontSize:13,color:'#666'},
  section:{paddingHorizontal:16,marginBottom:16},
  sectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:10},
  quantityCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  quantityLeft:{flex:1},
  quantityLabel:{fontSize:15,fontWeight:'600',color:COLORS.navy,marginBottom:3},
  quantityPriceEach:{fontSize:13,color:'#888'},
  quantityControls:{flexDirection:'row',alignItems:'center',gap:0},
  quantityBtn:{width:40,height:40,borderRadius:20,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.white},
  quantityBtnDisabled:{borderColor:'#f0ede8',backgroundColor:COLORS.lightBg},
  quantityNum:{fontSize:20,fontWeight:'700',color:COLORS.navy,width:44,textAlign:'center'},
  orderCard:{backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  orderRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  orderLbl:{fontSize:14,color:'#666'},
  orderVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  orderDivider:{height:1,backgroundColor:COLORS.border,marginBottom:10},
  orderTotalLbl:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  orderTotalVal:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  payMethodBtn:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.white,borderRadius:14,padding:14,marginBottom:10,borderWidth:1.5,borderColor:COLORS.border},
  payMethodBtnActive:{borderColor:COLORS.navy,backgroundColor:'rgba(26,26,46,0.02)'},
  payMethodLeft:{flexDirection:'row',alignItems:'center',gap:12},
  payMethodIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  payMethodName:{fontSize:15,fontWeight:'600',color:COLORS.navy},
  payMethodSub:{fontSize:12,color:'#aaa'},
  payMethodCheck:{width:24,height:24,borderRadius:12,borderWidth:1.5,borderColor:'#ddd',alignItems:'center',justifyContent:'center'},
  payMethodCheckActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  secureRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:16,marginBottom:20},
  secureTxt:{fontSize:12,color:'#aaa'},
  footer:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:COLORS.white,padding:16,paddingBottom:32,borderTopWidth:1,borderTopColor:COLORS.border},
  payBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  payBtnDisabled:{opacity:0.6},
  applePayRow:{flexDirection:'row',alignItems:'center',gap:6},
  payBtnTxt:{color:COLORS.white,fontSize:17,fontWeight:'700'},
  footerNote:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:8},
});
EOF
echo "checkout done"

# ── Update ticket-success for multi-ticket ──────────────
cat > app/ticket-success.tsx << 'EOF'
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/verse-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';

export default function TicketSuccessScreen() {
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
    quantity?: string; ticketIds?: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const quantity = parseInt(params.quantity || '1');
  const ticketIds = params.ticketIds ? params.ticketIds.split(',') : ['TKT-' + Math.random().toString(36).substr(2,8).toUpperCase()];

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.bg} start={{x:0,y:0}} end={{x:1,y:1}}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Success icon */}
          <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
            <View style={s.iconOuter}>
              <View style={s.iconInner}>
                <Ionicons name="checkmark" size={44} color={COLORS.white} />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[s.content, { opacity: fadeAnim }]}>
            <Text style={s.successLabel}>Registration Complete</Text>
            <Text style={s.successTitle}>{params.title}</Text>
            <Text style={s.successSub}>
              {quantity > 1 ? `${quantity} Tickets Secured` : 'Ticket Secured · You\'re Attending'}
            </Text>

            {/* Email notice */}
            <View style={s.emailBanner}>
              <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={s.emailBannerTxt}>
                {quantity > 1 ? `${quantity} tickets sent to your Mail app` : 'Ticket sent to your Mail app'}
              </Text>
            </View>

            {/* Ticket card */}
            <View style={s.ticketCard}>
              <View style={s.ticketTop}>
                <View style={s.ticketTypePill}>
                  <Text style={s.ticketTypeTxt}>{params.type}</Text>
                </View>
                <View style={s.ticketStatusPill}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.green} />
                  <Text style={s.ticketStatusTxt}>Confirmed</Text>
                </View>
              </View>

              <Text style={s.ticketTitle}>{params.title}</Text>
              {!!params.organizer && <Text style={s.ticketOrganizer}>by {params.organizer}</Text>}

              <View style={s.ticketDivider} />

              <View style={s.ticketDetails}>
                <View style={s.ticketDetail}>
                  <Ionicons name="calendar-outline" size={15} color={COLORS.gold} />
                  <View>
                    <Text style={s.ticketDetailLbl}>Date</Text>
                    <Text style={s.ticketDetailVal}>{params.date}</Text>
                  </View>
                </View>
                <View style={s.ticketDetail}>
                  <Ionicons name="location-outline" size={15} color={COLORS.gold} />
                  <View style={{flex:1}}>
                    <Text style={s.ticketDetailLbl}>Location</Text>
                    <Text style={s.ticketDetailVal} numberOfLines={2}>{params.location}</Text>
                  </View>
                </View>
                <View style={s.ticketDetail}>
                  <Ionicons name="ticket-outline" size={15} color={COLORS.gold} />
                  <View>
                    <Text style={s.ticketDetailLbl}>Tickets</Text>
                    <Text style={s.ticketDetailVal}>{quantity}x · {params.price} total</Text>
                  </View>
                </View>
              </View>

              {/* Individual ticket IDs */}
              <View style={s.ticketDivider} />
              <View style={s.ticketIdsWrap}>
                {ticketIds.map((id, i) => (
                  <View key={i} style={s.ticketIdRow}>
                    <View style={s.ticketIdDot} />
                    <Text style={s.ticketIdTxt}>Ticket {i+1}: <Text style={s.ticketIdCode}>{id}</Text></Text>
                  </View>
                ))}
              </View>

              {/* Barcode */}
              <View style={s.barcodeWrap}>
                {Array.from({length:35}).map((_,i) => (
                  <View key={i} style={[s.barcodeBar, {height: i%3===0?30:i%2===0?20:25, opacity:0.1+Math.random()*0.5}]} />
                ))}
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity style={s.viewEventBtn} onPress={() => router.replace({
              pathname: '/event-detail',
              params: { id:params.id, title:params.title, description:'', date:params.date, location:params.location, type:params.type, price:params.price }
            })}>
              <Text style={s.viewEventBtnTxt}>View Event Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/(tabs)/events')}>
              <Text style={s.homeBtnTxt}>Back to Events</Text>
            </TouchableOpacity>

            <View style={{height:40}} />
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1},
  bg:{flex:1},
  scrollContent:{paddingHorizontal:24,paddingTop:40,alignItems:'center'},
  iconWrap:{marginBottom:20},
  iconOuter:{width:100,height:100,borderRadius:50,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center'},
  iconInner:{width:76,height:76,borderRadius:38,backgroundColor:COLORS.green,alignItems:'center',justifyContent:'center'},
  content:{width:'100%',alignItems:'center'},
  successLabel:{fontSize:12,fontWeight:'700',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:2,marginBottom:8},
  successTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:24,color:COLORS.white,textAlign:'center',marginBottom:4},
  successSub:{fontSize:15,color:COLORS.gold,fontWeight:'600',marginBottom:14},
  emailBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:12,paddingHorizontal:16,paddingVertical:10,marginBottom:20},
  emailBannerTxt:{color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:'500'},
  ticketCard:{width:'100%',backgroundColor:COLORS.white,borderRadius:20,overflow:'hidden',marginBottom:20},
  ticketTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:14,paddingBottom:8},
  ticketTypePill:{backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:12,paddingVertical:4},
  ticketTypeTxt:{fontSize:11,fontWeight:'700',color:'#888'},
  ticketStatusPill:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  ticketStatusTxt:{fontSize:11,fontWeight:'700',color:COLORS.green},
  ticketTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:17,color:COLORS.navy,paddingHorizontal:14,marginBottom:3},
  ticketOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',paddingHorizontal:14,marginBottom:10},
  ticketDivider:{height:1,backgroundColor:COLORS.border,marginHorizontal:14,marginVertical:10},
  ticketDetails:{paddingHorizontal:14,gap:10},
  ticketDetail:{flexDirection:'row',alignItems:'flex-start',gap:10},
  ticketDetailLbl:{fontSize:10,color:'#aaa',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.3},
  ticketDetailVal:{fontSize:13,color:COLORS.navy,fontWeight:'600',marginTop:1},
  ticketIdsWrap:{paddingHorizontal:14,paddingBottom:6},
  ticketIdRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6},
  ticketIdDot:{width:6,height:6,borderRadius:3,backgroundColor:COLORS.gold},
  ticketIdTxt:{fontSize:12,color:'#888'},
  ticketIdCode:{fontWeight:'700',color:COLORS.navy,letterSpacing:0.5},
  barcodeWrap:{flexDirection:'row',alignItems:'center',gap:2,paddingHorizontal:14,paddingBottom:12,height:44},
  barcodeBar:{width:3,backgroundColor:COLORS.navy,borderRadius:1},
  viewEventBtn:{width:'100%',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,paddingVertical:15,alignItems:'center',marginBottom:10},
  viewEventBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  homeBtn:{width:'100%',borderWidth:1.5,borderColor:'rgba(255,255,255,0.2)',borderRadius:14,paddingVertical:14,alignItems:'center'},
  homeBtnTxt:{color:'rgba(255,255,255,0.6)',fontSize:14,fontWeight:'600'},
});
EOF

# Fix the wrong import
sed -i '' "s|from 'expo-linear-gradient';|from 'expo-linear-gradient';|g" app/ticket-success.tsx
sed -i '' "s|from '@expo/verse-icons';|from '@expo/vector-icons';|g" app/ticket-success.tsx

echo "ticket-success done"

echo "ALL DONE"
