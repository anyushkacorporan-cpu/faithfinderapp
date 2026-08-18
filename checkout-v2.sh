#!/bin/bash
cd ~/Desktop/FaithFinderApp

cat > app/event-checkout.tsx << 'EOF'
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const [paymentMethod, setPaymentMethod] = useState<'apple'|'card'|'paypal'>('apple');
  const [agreed, setAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zip, setZip] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  const ticketPrice = parseFloat(params.price?.replace('$','') || '0');
  const subtotal = ticketPrice * quantity;
  const platformFee = parseFloat((subtotal * 0.015).toFixed(2));
  const total = parseFloat((subtotal + platformFee).toFixed(2));

  function formatCardNumber(text: string) {
    const digits = text.replace(/\D/g,'').slice(0,16);
    return digits.replace(/(.{4})/g,'$1 ').trim();
  }

  function formatExpiry(text: string) {
    const digits = text.replace(/\D/g,'').slice(0,4);
    if (digits.length >= 2) return digits.slice(0,2) + '/' + digits.slice(2);
    return digits;
  }

  const cardComplete = cardNumber.replace(/\s/g,'').length === 16 &&
    expiry.length === 5 && cvv.length >= 3 && zip.length >= 5;

  async function handlePay() {
    if (!agreed) return;
    if (paymentMethod === 'card' && !cardComplete) return;
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));

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
        id: params.id, title: params.title, date: params.date,
        location: params.location, price: '$' + total.toFixed(2),
        type: params.type, organizer: params.organizer || '',
        quantity: String(quantity), ticketIds: ticket.ticketIds.join(','),
      }
    });
  }

  const canPay = agreed && (paymentMethod !== 'card' || cardComplete);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={s.hdrTitle}>Checkout</Text>
          <Text style={s.hdrSub}>Order for {params.title}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Ticket Quantity */}
          <View style={s.section}>
            <View style={s.quantityRow}>
              <View>
                <Text style={s.quantityEventTitle} numberOfLines={1}>{params.title}</Text>
                <Text style={s.quantityPrice}>${ticketPrice.toFixed(2)} per ticket</Text>
              </View>
              <View style={s.quantityControls}>
                <TouchableOpacity style={[s.qBtn, quantity<=1&&s.qBtnOff]} onPress={()=>setQuantity(q=>Math.max(1,q-1))} disabled={quantity<=1}>
                  <Text style={[s.qBtnTxt, quantity<=1&&s.qBtnTxtOff]}>−</Text>
                </TouchableOpacity>
                <Text style={s.qNum}>{quantity}</Text>
                <TouchableOpacity style={[s.qBtn, quantity>=10&&s.qBtnOff]} onPress={()=>setQuantity(q=>Math.min(10,q+1))} disabled={quantity>=10}>
                  <Text style={[s.qBtnTxt, quantity>=10&&s.qBtnTxtOff]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.divider} />

          {/* Order Summary */}
          <View style={s.section}>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>{quantity}× Ticket{quantity>1?'s':''}</Text>
              <Text style={s.orderVal}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>Platform Fee</Text>
              <Text style={s.orderVal}>${platformFee.toFixed(2)}</Text>
            </View>
            <View style={[s.orderRow, {marginTop:8}]}>
              <Text style={s.orderTotalLbl}>Total</Text>
              <Text style={s.orderTotalVal}>${total.toFixed(2)}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Terms */}
          <View style={s.section}>
            <Text style={s.termsTitle}>Terms & Conditions</Text>
            <View style={s.termsBox}>
              <Text style={s.termsTxt}>
                By purchasing tickets you agree to FaithFinder's Terms of Service and Privacy Policy. All sales are final. Tickets are non-refundable unless the event is cancelled or rescheduled.
              </Text>
            </View>
            <TouchableOpacity style={s.agreeRow} onPress={() => setAgreed(!agreed)}>
              <View style={[s.checkbox, agreed && s.checkboxChecked]}>
                {agreed && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
              </View>
              <Text style={s.agreeTxt}>I agree to the above terms and conditions.</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* Pay With */}
          <View style={s.section}>
            <Text style={s.payWithTitle}>Pay with</Text>

            {/* Apple Pay */}
            <TouchableOpacity
              style={[s.payOption, paymentMethod==='apple' && s.payOptionActive]}
              onPress={() => setPaymentMethod('apple')}
            >
              <View style={s.payOptionLeft}>
                <View style={s.applePayLogo}>
                  <Ionicons name="logo-apple" size={16} color="#000" />
                  <Text style={s.applePayLogoTxt}>Pay</Text>
                </View>
                <Text style={s.payOptionName}>Apple Pay</Text>
              </View>
              <View style={[s.radio, paymentMethod==='apple' && s.radioActive]}>
                {paymentMethod==='apple' && <View style={s.radioDot}/>}
              </View>
            </TouchableOpacity>

            {/* Credit/Debit Card */}
            <TouchableOpacity
              style={[s.payOption, paymentMethod==='card' && s.payOptionActive, {marginTop:8}]}
              onPress={() => setPaymentMethod('card')}
            >
              <View style={s.payOptionLeft}>
                <View style={s.cardIcon}>
                  <Ionicons name="card" size={18} color="#555" />
                </View>
                <Text style={s.payOptionName}>Credit or debit card</Text>
              </View>
              <View style={[s.radio, paymentMethod==='card' && s.radioActive]}>
                {paymentMethod==='card' && <View style={s.radioDot}/>}
              </View>
            </TouchableOpacity>

            {/* Card fields - only show when card selected */}
            {paymentMethod === 'card' && (
              <View style={s.cardFields}>
                <View style={s.cardFieldRow}>
                  <Text style={s.cardFieldLabel}>Card number <Text style={{color:'red'}}>*</Text></Text>
                  <View style={s.cardFieldWrap}>
                    <TextInput
                      style={s.cardInput}
                      placeholder="1234 1234 1234 1234"
                      placeholderTextColor="#bbb"
                      value={cardNumber}
                      onChangeText={t => setCardNumber(formatCardNumber(t))}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                    <Ionicons name="card-outline" size={20} color="#bbb" />
                  </View>
                </View>
                <View style={s.cardFieldTwoCol}>
                  <View style={[s.cardFieldRow, {flex:1, marginRight:8}]}>
                    <Text style={s.cardFieldLabel}>Expiration Date <Text style={{color:'red'}}>*</Text></Text>
                    <TextInput
                      style={s.cardInputSingle}
                      placeholder="MM/YY"
                      placeholderTextColor="#bbb"
                      value={expiry}
                      onChangeText={t => setExpiry(formatExpiry(t))}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={[s.cardFieldRow, {flex:1}]}>
                    <Text style={s.cardFieldLabel}>Security code <Text style={{color:'red'}}>*</Text></Text>
                    <TextInput
                      style={s.cardInputSingle}
                      placeholder="123"
                      placeholderTextColor="#bbb"
                      value={cvv}
                      onChangeText={setCvv}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
                <View style={s.cardFieldRow}>
                  <Text style={s.cardFieldLabel}>Zip code <Text style={{color:'red'}}>*</Text></Text>
                  <TextInput
                    style={s.cardInputSingle}
                    placeholder="12345"
                    placeholderTextColor="#bbb"
                    value={zip}
                    onChangeText={setZip}
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
                <TouchableOpacity style={s.saveCardRow} onPress={() => setSaveCard(!saveCard)}>
                  <View style={[s.checkbox, saveCard && s.checkboxChecked]}>
                    {saveCard && <Ionicons name="checkmark" size={12} color={COLORS.white} />}
                  </View>
                  <Text style={s.saveCardTxt}>Save payment details to your FaithFinder account (optional)</Text>
                </TouchableOpacity>
                <View style={s.testCardBox}>
                  <Text style={s.testCardTitle}>🧪 Test Mode</Text>
                  <Text style={s.testCardNum}>4242 4242 4242 4242</Text>
                  <Text style={s.testCardSub}>Any future date · Any CVV · Any ZIP</Text>
                </View>
              </View>
            )}

            {/* PayPal */}
            <TouchableOpacity
              style={[s.payOption, paymentMethod==='paypal' && s.payOptionActive, {marginTop:8}]}
              onPress={() => setPaymentMethod('paypal')}
            >
              <View style={s.payOptionLeft}>
                <Text style={s.paypalTxt}><Text style={{color:'#003087'}}>Pay</Text><Text style={{color:'#009cde'}}>Pal</Text></Text>
              </View>
              <View style={[s.radio, paymentMethod==='paypal' && s.radioActive]}>
                {paymentMethod==='paypal' && <View style={s.radioDot}/>}
              </View>
            </TouchableOpacity>

            {paymentMethod === 'paypal' && (
              <View style={s.paypalNote}>
                <Text style={s.paypalNoteTxt}>Proceed below with your PayPal account to complete your purchase.</Text>
              </View>
            )}
          </View>

          <View style={{height:120}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={s.footer}>
        <View style={s.footerInfo}>
          <Text style={s.footerDate}>{params.date}</Text>
          <Text style={s.footerTotal}>${total.toFixed(2)}</Text>
        </View>
        {paymentMethod === 'apple' ? (
          <TouchableOpacity
            style={[s.applePayBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Ionicons name="logo-apple" size={20} color={COLORS.white} />
            <Text style={s.applePayBtnTxt}>{processing ? 'Processing...' : 'Pay'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'paypal' ? (
          <View style={s.paypalBtns}>
            <TouchableOpacity style={[s.paypalBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Text style={s.paypalBtnTxt}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payLaterBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Ionicons name="logo-paypal" size={14} color={COLORS.white} />
              <Text style={s.payLaterBtnTxt}>Pay Later</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.payNowBtn, !canPay && s.payBtnDisabled]}
            onPress={handlePay}
            disabled={!canPay || processing}
          >
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Pay Now'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f5f5f0'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#eee'},
  hdrCenter:{alignItems:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:'#111'},
  hdrSub:{fontSize:12,color:'#888',marginTop:1},
  scroll:{flex:1},
  section:{backgroundColor:COLORS.white,padding:16,marginBottom:1},
  divider:{height:8,backgroundColor:'#f0f0ec'},
  quantityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  quantityEventTitle:{fontSize:15,fontWeight:'700',color:'#111',maxWidth:200},
  quantityPrice:{fontSize:13,color:'#888',marginTop:3},
  quantityControls:{flexDirection:'row',alignItems:'center',gap:0},
  qBtn:{width:36,height:36,borderRadius:18,borderWidth:1.5,borderColor:'#ddd',alignItems:'center',justifyContent:'center',backgroundColor:COLORS.white},
  qBtnOff:{borderColor:'#f0f0ec',backgroundColor:'#f8f8f5'},
  qBtnTxt:{fontSize:20,fontWeight:'300',color:'#111',lineHeight:24},
  qBtnTxtOff:{color:'#ccc'},
  qNum:{fontSize:18,fontWeight:'600',color:'#111',width:36,textAlign:'center'},
  orderRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},
  orderLbl:{fontSize:14,color:'#555'},
  orderVal:{fontSize:14,color:'#111',fontWeight:'500'},
  orderTotalLbl:{fontSize:16,fontWeight:'700',color:'#111'},
  orderTotalVal:{fontSize:16,fontWeight:'700',color:'#111'},
  termsTitle:{fontSize:15,fontWeight:'700',color:'#111',marginBottom:10},
  termsBox:{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,marginBottom:12,maxHeight:100,overflow:'hidden'},
  termsTxt:{fontSize:13,color:'#666',lineHeight:19},
  agreeRow:{flexDirection:'row',alignItems:'center',gap:10},
  checkbox:{width:20,height:20,borderRadius:4,borderWidth:1.5,borderColor:'#ccc',alignItems:'center',justifyContent:'center'},
  checkboxChecked:{backgroundColor:'#111',borderColor:'#111'},
  agreeTxt:{fontSize:14,color:'#333',flex:1},
  payWithTitle:{fontSize:16,fontWeight:'700',color:'#111',marginBottom:12},
  payOption:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:14,backgroundColor:COLORS.white},
  payOptionActive:{borderColor:'#111',borderWidth:1.5},
  payOptionLeft:{flexDirection:'row',alignItems:'center',gap:12},
  applePayLogo:{flexDirection:'row',alignItems:'center',gap:1},
  applePayLogoTxt:{fontSize:14,fontWeight:'700',color:'#000'},
  payOptionName:{fontSize:15,color:'#111',fontWeight:'500'},
  cardIcon:{width:32,height:24,borderRadius:4,backgroundColor:'#f0f0ec',alignItems:'center',justifyContent:'center'},
  radio:{width:20,height:20,borderRadius:10,borderWidth:1.5,borderColor:'#ccc',alignItems:'center',justifyContent:'center'},
  radioActive:{borderColor:'#111'},
  radioDot:{width:10,height:10,borderRadius:5,backgroundColor:'#111'},
  paypalTxt:{fontSize:18,fontWeight:'700'},
  paypalNote:{backgroundColor:'#f8f8f5',borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,marginTop:8},
  paypalNoteTxt:{fontSize:13,color:'#555'},
  cardFields:{marginTop:12,gap:12},
  cardFieldRow:{gap:6},
  cardFieldTwoCol:{flexDirection:'row'},
  cardFieldLabel:{fontSize:13,fontWeight:'600',color:'#333'},
  cardFieldWrap:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#ddd',borderRadius:8,paddingHorizontal:12,backgroundColor:COLORS.white},
  cardInput:{flex:1,paddingVertical:12,fontSize:15,color:'#111'},
  cardInputSingle:{borderWidth:1,borderColor:'#ddd',borderRadius:8,paddingHorizontal:12,paddingVertical:12,fontSize:15,color:'#111',backgroundColor:COLORS.white},
  saveCardRow:{flexDirection:'row',alignItems:'flex-start',gap:10,marginTop:4},
  saveCardTxt:{fontSize:13,color:'#555',flex:1,lineHeight:18},
  testCardBox:{backgroundColor:'#fffbf0',borderRadius:8,padding:12,borderWidth:1,borderColor:'#f0e8c8'},
  testCardTitle:{fontSize:12,fontWeight:'700',color:'#b8860b',marginBottom:3},
  testCardNum:{fontSize:15,fontWeight:'700',color:'#111',letterSpacing:1.5,marginBottom:2},
  testCardSub:{fontSize:12,color:'#888'},
  footer:{backgroundColor:COLORS.white,borderTopWidth:1,borderTopColor:'#eee',padding:16,paddingBottom:32},
  footerInfo:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  footerDate:{fontSize:13,color:'#888'},
  footerTotal:{fontSize:16,fontWeight:'700',color:'#111'},
  applePayBtn:{backgroundColor:'#000',borderRadius:10,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  applePayBtnTxt:{color:COLORS.white,fontSize:17,fontWeight:'600'},
  payNowBtn:{backgroundColor:'#111',borderRadius:10,paddingVertical:14,alignItems:'center'},
  payNowBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  paypalBtns:{flexDirection:'row',gap:10},
  paypalBtn:{flex:1,backgroundColor:'#003087',borderRadius:10,paddingVertical:14,alignItems:'center'},
  paypalBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  payLaterBtn:{flex:1,backgroundColor:'#009cde',borderRadius:10,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  payLaterBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  payBtnDisabled:{opacity:0.4},
});
EOF
echo "ALL DONE"
