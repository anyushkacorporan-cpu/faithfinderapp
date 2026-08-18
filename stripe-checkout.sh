#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Install Stripe
npx expo install @stripe/stripe-react-native 2>/dev/null || npm install @stripe/stripe-react-native 2>/dev/null
echo "Stripe installed"

# Create stripe config
cat > src/lib/stripeConfig.ts << 'EOF'
// ─────────────────────────────────────────────
// STRIPE CONFIGURATION
// Test mode — swap these keys when going live
// Get your keys at: https://dashboard.stripe.com
// ─────────────────────────────────────────────

export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz';
// Replace with your real key: pk_test_... or pk_live_...

export const STRIPE_MERCHANT_ID = 'merchant.com.faithfinder';
// Replace with your Apple Pay merchant ID from Apple Developer account

// Test card numbers (use these while testing):
// ✅ Success:     4242 4242 4242 4242
// ❌ Declined:    4000 0000 0000 0002
// 🔐 3D Secure:  4000 0025 0000 3155
// Expiry: any future date | CVV: any 3 digits | ZIP: any 5 digits
EOF
echo "stripe config done"

# Update app.json to add Stripe plugin
python3 << 'PYEOF'
import json
with open('app.json') as f:
    config = json.load(f)

plugins = config.get('expo', {}).get('plugins', [])
has_stripe = any(
    (isinstance(p, str) and p == '@stripe/stripe-react-native') or
    (isinstance(p, list) and p[0] == '@stripe/stripe-react-native')
    for p in plugins
)

if not has_stripe:
    plugins.append([
        "@stripe/stripe-react-native",
        {
            "merchantIdentifier": "merchant.com.faithfinder",
            "enableGooglePay": False
        }
    ])
    config['expo']['plugins'] = plugins
    with open('app.json', 'w') as f:
        json.dump(config, f, indent=2)
    print('app.json updated')
else:
    print('app.json already has Stripe')
PYEOF

# Update _layout to wrap app with StripeProvider
python3 << 'PYEOF'
content = open('app/_layout.tsx').read()

if 'StripeProvider' not in content:
    content = content.replace(
        "import { StatusBar } from 'expo-status-bar';",
        "import { StatusBar } from 'expo-status-bar';\nimport { StripeProvider } from '@stripe/stripe-react-native';\nimport { STRIPE_PUBLISHABLE_KEY, STRIPE_MERCHANT_ID } from '../src/lib/stripeConfig';"
    )
    content = content.replace(
        "  return (\n    <>\n      <StatusBar style=\"dark\" />",
        "  return (\n    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier={STRIPE_MERCHANT_ID}>\n      <StatusBar style=\"dark\" />"
    )
    content = content.replace(
        "    </>\n  );\n}",
        "    </StripeProvider>\n  );\n}"
    )
    open('app/_layout.tsx', 'w').write(content)
    print('layout updated with StripeProvider')
else:
    print('layout already has StripeProvider')
PYEOF

# Build full checkout screen with Stripe
cat > app/event-checkout.tsx << 'EOF'
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripe, CardField, CardFieldInput } from '@stripe/stripe-react-native';
import { COLORS } from '../src/lib/constants';
import { addAttending } from '../src/lib/eventActionsStore';
import { addTicket } from '../src/lib/ticketStore';

export default function EventCheckoutScreen() {
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();

  const { confirmPayment } = useStripe();
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'apple' | 'card'>('apple');
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cardDetails, setCardDetails] = useState<CardFieldInput.Details | null>(null);

  const ticketPrice = parseFloat(params.price?.replace('$', '') || '0');
  const subtotal = ticketPrice * quantity;
  const platformFee = parseFloat((subtotal * 0.015).toFixed(2));
  const total = parseFloat((subtotal + platformFee).toFixed(2));

  // Format card number input
  function formatCardNumber(text: string) {
    const cleaned = text.replace(/\s/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19);
  }

  async function handleApplePay() {
    setProcessing(true);
    // Simulate Apple Pay processing
    await new Promise(r => setTimeout(r, 2000));
    completeOrder();
  }

  async function handleCardPay() {
    if (!cardComplete) {
      Alert.alert('Incomplete Card', 'Please enter your full card details.');
      return;
    }
    setProcessing(true);

    try {
      // In production: fetch clientSecret from your backend
      // const { clientSecret } = await fetch('/create-payment-intent', { method: 'POST', body: JSON.stringify({ amount: total * 100 }) }).then(r => r.json());
      // const { error, paymentIntent } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });

      // Test mode simulation — always succeeds
      await new Promise(r => setTimeout(r, 2000));
      completeOrder();
    } catch (e) {
      setProcessing(false);
      Alert.alert('Payment Failed', 'Please check your card details and try again.');
    }
  }

  function completeOrder() {
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

    addAttending(params.id || '');
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

  function handlePay() {
    if (paymentMethod === 'apple') {
      handleApplePay();
    } else {
      handleCardPay();
    }
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

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Event Card */}
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

          {/* Quantity */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Tickets</Text>
            <View style={s.quantityCard}>
              <View>
                <Text style={s.quantityLabel}>Number of Tickets</Text>
                <Text style={s.quantityPricePer}>${ticketPrice.toFixed(2)} per ticket</Text>
              </View>
              <View style={s.quantityControls}>
                <TouchableOpacity
                  style={[s.qBtn, quantity<=1 && s.qBtnDisabled]}
                  onPress={() => setQuantity(q => Math.max(1, q-1))}
                  disabled={quantity<=1}
                >
                  <Ionicons name="remove" size={20} color={quantity<=1 ? '#ddd' : COLORS.navy} />
                </TouchableOpacity>
                <Text style={s.qNum}>{quantity}</Text>
                <TouchableOpacity
                  style={[s.qBtn, quantity>=10 && s.qBtnDisabled]}
                  onPress={() => setQuantity(q => Math.min(10, q+1))}
                  disabled={quantity>=10}
                >
                  <Ionicons name="add" size={20} color={quantity>=10 ? '#ddd' : COLORS.navy} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Order Summary</Text>
            <View style={s.orderCard}>
              <View style={s.orderRow}>
                <Text style={s.orderLbl}>{quantity}× Ticket{quantity>1?'s':''}</Text>
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

          {/* Payment Method Selector */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment Method</Text>
            <View style={s.payMethodRow}>
              <TouchableOpacity
                style={[s.payMethodTab, paymentMethod==='apple' && s.payMethodTabActive]}
                onPress={() => setPaymentMethod('apple')}
              >
                <Ionicons name="logo-apple" size={18} color={paymentMethod==='apple' ? COLORS.white : '#888'} />
                <Text style={[s.payMethodTabTxt, paymentMethod==='apple' && s.payMethodTabTxtActive]}>Apple Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.payMethodTab, paymentMethod==='card' && s.payMethodTabActive]}
                onPress={() => setPaymentMethod('card')}
              >
                <Ionicons name="card-outline" size={18} color={paymentMethod==='card' ? COLORS.white : '#888'} />
                <Text style={[s.payMethodTabTxt, paymentMethod==='card' && s.payMethodTabTxtActive]}>Card</Text>
              </TouchableOpacity>
            </View>

            {/* Apple Pay */}
            {paymentMethod === 'apple' && (
              <View style={s.applePayCard}>
                <View style={s.applePayTop}>
                  <View style={s.applePayIconWrap}>
                    <Ionicons name="logo-apple" size={28} color={COLORS.white} />
                  </View>
                  <View>
                    <Text style={s.applePayName}>Apple Pay</Text>
                    <Text style={s.applePaySub}>Face ID · Touch ID · Passcode</Text>
                  </View>
                </View>
                <Text style={s.applePayNote}>
                  Your payment will be authorized using Apple Pay. No card details required.
                </Text>
              </View>
            )}

            {/* Card Payment */}
            {paymentMethod === 'card' && (
              <View style={s.cardSection}>
                <View style={s.cardFieldWrap}>
                  <Text style={s.cardFieldLabel}>Card Details</Text>
                  <CardField
                    postalCodeEnabled={true}
                    placeholders={{ number: '4242 4242 4242 4242' }}
                    cardStyle={{
                      backgroundColor: COLORS.white,
                      textColor: COLORS.navy,
                      placeholderColor: '#bbb',
                      borderColor: COLORS.border,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      fontSize: 16,
                    }}
                    style={s.cardField}
                    onCardChange={(details) => {
                      setCardDetails(details);
                      setCardComplete(details.complete);
                    }}
                  />
                  {cardComplete && (
                    <View style={s.cardValidRow}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                      <Text style={s.cardValidTxt}>Card details complete</Text>
                    </View>
                  )}
                </View>
                <View style={s.testCardBox}>
                  <Text style={s.testCardTitle}>Test Mode — Use test card:</Text>
                  <Text style={s.testCardNum}>4242 4242 4242 4242</Text>
                  <Text style={s.testCardSub}>Any future expiry · Any CVV · Any ZIP</Text>
                </View>
              </View>
            )}
          </View>

          {/* Security */}
          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.green} />
            <Text style={s.secureTxt}>Secured by Stripe · 256-bit SSL encryption</Text>
          </View>

          <View style={{height:120}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Pay Button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.payBtn, (processing || (paymentMethod==='card' && !cardComplete)) && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={processing || (paymentMethod==='card' && !cardComplete)}
          activeOpacity={0.88}
        >
          {paymentMethod==='apple' && !processing ? (
            <View style={s.applePayBtnRow}>
              <Ionicons name="logo-apple" size={22} color={COLORS.white} />
              <Text style={s.payBtnTxt}>Pay ${total.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={s.payBtnTxt}>
              {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={s.footerNote}>
          {quantity} ticket{quantity>1?'s':''} · ${total.toFixed(2)} total
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
  eventBanner:{height:100,padding:14,justifyContent:'space-between'},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  typePillTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  eventBannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:17,color:COLORS.white},
  eventInfo:{padding:14},
  eventOrganizer:{fontSize:12,color:COLORS.gold,fontWeight:'600',marginBottom:6},
  eventMetaRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:4},
  eventMetaTxt:{fontSize:13,color:'#666'},
  section:{paddingHorizontal:16,marginBottom:16},
  sectionTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:10},
  quantityCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  quantityLabel:{fontSize:15,fontWeight:'600',color:COLORS.navy,marginBottom:3},
  quantityPricePer:{fontSize:13,color:'#888'},
  quantityControls:{flexDirection:'row',alignItems:'center'},
  qBtn:{width:40,height:40,borderRadius:20,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  qBtnDisabled:{borderColor:'#f0ede8',backgroundColor:COLORS.lightBg},
  qNum:{fontSize:20,fontWeight:'700',color:COLORS.navy,width:44,textAlign:'center'},
  orderCard:{backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  orderRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  orderLbl:{fontSize:14,color:'#666'},
  orderVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  orderDivider:{height:1,backgroundColor:COLORS.border,marginBottom:10},
  orderTotalLbl:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  orderTotalVal:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  payMethodRow:{flexDirection:'row',gap:10,marginBottom:14},
  payMethodTab:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingVertical:13,backgroundColor:COLORS.white},
  payMethodTabActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  payMethodTabTxt:{fontSize:14,fontWeight:'700',color:'#888'},
  payMethodTabTxtActive:{color:COLORS.white},
  applePayCard:{backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  applePayTop:{flexDirection:'row',alignItems:'center',gap:14,marginBottom:12},
  applePayIconWrap:{width:48,height:48,borderRadius:14,backgroundColor:'#000',alignItems:'center',justifyContent:'center'},
  applePayName:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  applePaySub:{fontSize:12,color:'#888',marginTop:2},
  applePayNote:{fontSize:13,color:'#666',lineHeight:20},
  cardSection:{gap:12},
  cardFieldWrap:{backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  cardFieldLabel:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:10},
  cardField:{width:'100%',height:56},
  cardValidRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:8},
  cardValidTxt:{fontSize:13,color:COLORS.green,fontWeight:'600'},
  testCardBox:{backgroundColor:'rgba(201,169,110,0.08)',borderRadius:12,padding:14,borderWidth:1,borderColor:'rgba(201,169,110,0.2)'},
  testCardTitle:{fontSize:12,fontWeight:'700',color:COLORS.gold,marginBottom:4},
  testCardNum:{fontSize:16,fontWeight:'700',color:COLORS.navy,letterSpacing:2,marginBottom:3},
  testCardSub:{fontSize:12,color:'#888'},
  secureRow:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingBottom:20},
  secureTxt:{fontSize:12,color:'#aaa'},
  footer:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:COLORS.white,padding:16,paddingBottom:32,borderTopWidth:1,borderTopColor:COLORS.border},
  payBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',justifyContent:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.3,shadowRadius:8},
  payBtnDisabled:{opacity:0.5},
  applePayBtnRow:{flexDirection:'row',alignItems:'center',gap:8},
  payBtnTxt:{color:COLORS.white,fontSize:17,fontWeight:'700'},
  footerNote:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:8},
});
EOF
echo "checkout done"

echo "ALL DONE"
