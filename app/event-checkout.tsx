import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { addAttending } from '../src/lib/eventActionsStore';
import { useStripe } from '@stripe/stripe-react-native';
import { purchaseTicket, syncTicketsAfterSignIn } from '../src/lib/ticketStore';
import { recordTicketSale, syncEventsFromServer } from '../src/lib/eventsStore';
import { startPayment, confirmPayment } from '../src/lib/paymentsApi';
import { hasStripe } from '../src/lib/stripeConfig';
import { KeyboardScreen } from '../src/components/KeyboardScreen';

export default function EventCheckoutScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();

  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const priceStr = params.price || '0';
  const isFree = priceStr === 'Free' || priceStr === '0' || priceStr === '';
  const ticketPrice = isFree ? 0 : parseFloat(priceStr.replace('$','') || '0');
  const subtotal = ticketPrice * quantity;
  const platformFee = isFree ? 0 : parseFloat((subtotal * 0.015).toFixed(2));
  const total = isFree ? 0 : parseFloat((subtotal + platformFee).toFixed(2));


  async function handlePay() {
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    if (!agreed) return;

    setProcessing(true);

    // Free events never touch Stripe. There is nothing to charge, and routing
    // a zero through a payment processor only adds a way to fail.
    if (isFree) {
      const { ticket, error } = await purchaseTicket({
        eventId: params.id || '',
        eventTitle: params.title || '',
        eventDate: params.date || '',
        eventLocation: params.location || '',
        eventType: params.type || '',
        email: email.trim(),
        quantity,
        pricePerTicket: 0,
        totalPaid: 0,
        platformFee: 0,
      });
      setProcessing(false);
      if (!ticket) {
        Alert.alert(tx('Not enough seats'),
          error || tx('This event filled up while you were registering.'),
          [{ text: tx('OK'), onPress: () => router.back() }]);
        return;
      }
      recordTicketSale(params.id || '', quantity);
      addAttending(params.id || '');
      goToTicket(ticket.ticketIds);
      return;
    }

    // A build with no Stripe key cannot take money, and should say so rather
    // than opening a sheet that fails for reasons nobody can act on.
    if (!hasStripe()) {
      setProcessing(false);
      Alert.alert(tx('Payments are not set up yet'),
        tx('This build has no payment key configured. See PAYMENTS.md.'),
        [{ text: tx('OK') }]);
      return;
    }

    // Paid: the server holds the seats and prices the sale, then Stripe
    // collects. The app never says what anything costs.
    const { payment, error: startError } = await startPayment(
      params.id || '', quantity, email.trim());

    if (!payment) {
      setProcessing(false);
      Alert.alert(tx('Could not start checkout'),
        startError || tx('Please try again.'),
        [{ text: tx('OK') }]);
      return;
    }

    const init = await initPaymentSheet({
      merchantDisplayName: 'FaithFinder',
      paymentIntentClientSecret: payment.clientSecret,
      defaultBillingDetails: { email: email.trim() },
      // Apple Pay and cards both come from Stripe's own sheet, which handles
      // 3D Secure and never lets card numbers reach this code.
      applePay: { merchantCountryCode: payment.currency === 'CAD' ? 'CA' : 'US' },
      allowsDelayedPaymentMethods: false,
    });

    if (init.error) {
      setProcessing(false);
      Alert.alert(tx('Payment unavailable'), init.error.message, [{ text: tx('OK') }]);
      return;
    }

    const { error: sheetError } = await presentPaymentSheet();

    if (sheetError) {
      setProcessing(false);
      // Cancelling is not a failure worth alarming anyone about. The held
      // seats are released by the server when the payment does not complete.
      if (sheetError.code !== 'Canceled') {
        Alert.alert(tx('Payment not completed'), sheetError.message, [{ text: tx('OK') }]);
      }
      await confirmPayment(payment.ticketId);
      return;
    }

    // Stripe's sheet said yes; ask the server to check with Stripe before the
    // ticket counts as real.
    const confirmError = await confirmPayment(payment.ticketId);
    setProcessing(false);

    if (confirmError) {
      Alert.alert(tx('Payment could not be verified'), confirmError, [{ text: tx('OK') }]);
      return;
    }

    // The ticket was created server-side, so pull it down rather than
    // inventing a local copy that might disagree with it.
    await syncTicketsAfterSignIn();
    await syncEventsFromServer();
    addAttending(params.id || '');
    goToTicket(payment.ticketCodes);
  }

  function goToTicket(ticketIds: string[]) {
    router.replace({
      pathname: '/ticket-success',
      params: {
        id: params.id, title: params.title, date: params.date,
        location: params.location, price: isFree ? 'Free' : '$' + total.toFixed(2),
        type: params.type, organizer: params.organizer || '',
        quantity: String(quantity), ticketIds: ticketIds.join(','),
      }
    });
  }

  const canPay = agreed;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={s.hdrCenter}>
          <Text style={s.hdrTitle}>{isFree ? 'Registration' : 'Checkout'}</Text>
          <Text style={s.hdrSub}>{params.title}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <KeyboardScreen>
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Ticket Quantity */}
          <View style={s.section}>
            <View style={s.quantityRow}>
              <View>
                <Text style={s.quantityEventTitle} numberOfLines={1}>{params.title}</Text>
                <Text style={s.quantityPrice}>{isFree ? 'Free' : `$${ticketPrice.toFixed(2)} per ticket`}</Text>
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

          {/* Contact Email */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('contactEmail')}</Text>
            <TextInput
              style={[s.input, emailError ? {borderColor:c.red} : {}]}
              placeholder={tx('Enter your email address')}
              placeholderTextColor={c.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={t => { setEmail(t); setEmailError(''); }}
            />
            {!!emailError && <Text style={{color:c.red,fontSize:12,marginTop:4}}>{emailError}</Text>}
          </View>

          <View style={s.divider} />

          {/* Order Summary */}
          <View style={s.section}>
            <View style={s.orderRow}>
              <Text style={s.orderLbl}>{quantity}× {isFree ? 'Registration' : `Ticket${quantity>1?'s':''}`}</Text>
              <Text style={s.orderVal}>{isFree ? 'Free' : `$${subtotal.toFixed(2)}`}</Text>
            </View>
            {!isFree && (
              <View style={s.orderRow}>
                <Text style={s.orderLbl}>{t('platformFee')}</Text>
                <Text style={s.orderVal}>${platformFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.orderRow, {marginTop:8}]}>
              <Text style={s.orderTotalLbl}>{t('total')}</Text>
              <Text style={s.orderTotalVal}>{isFree ? 'Free' : `$${total.toFixed(2)}`}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Terms */}
          <View style={s.section}>
            <Text style={s.termsTitle}>{t('termsConditions')}</Text>
            <View style={s.termsBox}>
              <Text style={s.termsTxt}>
                {isFree
                  ? "By registering you agree to FaithFinder's Terms of Service and Privacy Policy. Registration is free and may be cancelled by the organizer."
                  : "By purchasing tickets you agree to FaithFinder's Terms of Service and Privacy Policy. All sales are final. Tickets are non-refundable unless the event is cancelled or rescheduled."
                }
              </Text>
            </View>
            <View style={s.agreeRow}>
              <TouchableOpacity style={[s.checkbox, agreed && s.checkboxChecked]} onPress={() => setAgreed(a => !a)}>
                {agreed && <Ionicons name="checkmark" size={13} color={c.onPrimary}/>}
              </TouchableOpacity>
              <Text style={s.agreeTxt}>{t('agreeTerms')}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Payment — paid events only.
              There is no card form here on purpose. Card numbers are collected
              by Stripe's own sheet, which opens when Pay is tapped: it handles
              Apple Pay, 3D Secure and bank redirects, and no card detail ever
              passes through this app. The form that used to sit here collected
              numbers it did nothing with. */}
          {!isFree && (
            <View style={s.section}>
              <Text style={s.payWithTitle}>{t('payWith')}</Text>
              <View style={s.payNote}>
                <Ionicons name="lock-closed-outline" size={16} color={c.textSecondary} />
                <Text style={s.payNoteTxt}>
                  {tx('Apple Pay and cards are handled securely by Stripe. Your card details are never stored by FaithFinder.')}
                </Text>
              </View>
            </View>
          )}

          <View style={{height:120}} />
        </ScrollView>
      </KeyboardScreen>

      {/* Bottom bar */}
      <View style={s.footer}>
        <View style={s.footerInfo}>
          <Text style={s.footerDate}>{params.date}</Text>
          <Text style={s.footerTotal}>{isFree ? 'Free' : `$${total.toFixed(2)}`}</Text>
        </View>
        {/* One button. Which payment methods are offered is Stripe's sheet
            to decide — it shows Apple Pay when the device and card support it,
            which the old three-way picker could only pretend to know. */}
        <TouchableOpacity
          style={[s.payNowBtn, (!canPay || processing) && s.payBtnDisabled]}
          onPress={handlePay}
          disabled={!canPay || processing}
        >
          <Text style={s.payNowBtnTxt}>
            {processing
              ? tx('Processing…')
              : isFree
                ? tx('Complete Registration')
                : `${tx('Pay')} $${total.toFixed(2)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.placeholder},
  hdrCenter:{alignItems:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  hdrSub:{fontSize:12,color:c.textMuted,marginTop:1},
  scroll:{flex:1},
  section:{backgroundColor:c.card,padding:16,marginBottom:1},
  sectionTitle:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:10},
  divider:{height:8,backgroundColor:c.cardAlt},
  input:{borderWidth:1.5,borderColor:c.border,borderRadius:10,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:c.text,backgroundColor:c.card},
  quantityRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  quantityEventTitle:{fontSize:15,fontWeight:'700',color:c.text,maxWidth:200},
  quantityPrice:{fontSize:13,color:c.textMuted,marginTop:3},
  quantityControls:{flexDirection:'row',alignItems:'center',gap:0},
  qBtn:{width:36,height:36,borderRadius:18,borderWidth:1.5,borderColor:c.placeholder,alignItems:'center',justifyContent:'center',backgroundColor:c.card},
  qBtnOff:{borderColor:c.border,backgroundColor:c.cardAlt},
  qBtnTxt:{fontSize:20,fontWeight:'300',color:c.text,lineHeight:24},
  qBtnTxtOff:{color:c.placeholder},
  qNum:{fontSize:18,fontWeight:'600',color:c.text,width:36,textAlign:'center'},
  orderRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:6},
  orderLbl:{fontSize:14,color:c.textSecondary},
  orderVal:{fontSize:14,color:c.text,fontWeight:'500'},
  orderTotalLbl:{fontSize:16,fontWeight:'700',color:c.text},
  orderTotalVal:{fontSize:16,fontWeight:'700',color:c.text},
  termsTitle:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:10},
  termsBox:{borderWidth:1,borderColor:c.placeholder,borderRadius:8,padding:12,marginBottom:12,maxHeight:100,overflow:'hidden'},
  termsTxt:{fontSize:13,color:c.textSecondary,lineHeight:19},
  agreeRow:{flexDirection:'row',alignItems:'center',gap:10},
  checkbox:{width:20,height:20,borderRadius:4,borderWidth:1.5,borderColor:c.placeholder,alignItems:'center',justifyContent:'center'},
  checkboxChecked:{backgroundColor:c.primary,borderColor:c.primary},
  agreeTxt:{fontSize:14,color:c.text,flex:1},
  payWithTitle:{fontSize:16,fontWeight:'700',color:c.text,marginBottom:12},
  payOption:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:c.placeholder,borderRadius:8,padding:14,backgroundColor:c.card},
  payOptionActive:{borderColor:c.primary,borderWidth:1.5},
  payOptionLeft:{flexDirection:'row',alignItems:'center',gap:12},
  applePayLogo:{flexDirection:'row',alignItems:'center',gap:1},
  applePayLogoTxt:{fontSize:14,fontWeight:"700",color:"#fff"},
  payOptionName:{fontSize:15,color:c.text,fontWeight:'500'},
  cardIcon:{width:32,height:24,borderRadius:4,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  radio:{width:20,height:20,borderRadius:10,borderWidth:1.5,borderColor:c.placeholder,alignItems:'center',justifyContent:'center'},
  radioActive:{borderColor:c.primary},
  radioDot:{width:10,height:10,borderRadius:5,backgroundColor:c.primary},
  paypalTxt:{fontSize:18,fontWeight:'700'},
  paypalNote:{backgroundColor:c.cardAlt,borderWidth:1,borderColor:c.placeholder,borderRadius:8,padding:12,marginTop:8},
  paypalNoteTxt:{fontSize:13,color:c.textSecondary},
  cardFields:{marginTop:12,gap:12},
  cardFieldRow:{gap:6},
  cardFieldTwoCol:{flexDirection:'row'},
  cardFieldLabel:{fontSize:13,fontWeight:'600',color:c.text},
  cardFieldWrap:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:c.placeholder,borderRadius:8,paddingHorizontal:12,backgroundColor:c.card},
  cardInput:{flex:1,paddingVertical:12,fontSize:15,color:c.text},
  cardInputSingle:{borderWidth:1,borderColor:c.placeholder,borderRadius:8,paddingHorizontal:12,paddingVertical:12,fontSize:15,color:c.text,backgroundColor:c.card},
  saveCardRow:{flexDirection:'row',alignItems:'flex-start',gap:10,marginTop:4},
  saveCardTxt:{fontSize:13,color:c.textSecondary,flex:1,lineHeight:18},
  testCardBox:{backgroundColor:c.cardAlt,borderRadius:8,padding:12,borderWidth:1,borderColor:c.border},
  testCardTitle:{fontSize:12,fontWeight:'700',color:'#b8860b',marginBottom:3},
  testCardNum:{fontSize:15,fontWeight:'700',color:c.text,letterSpacing:1.5,marginBottom:2},
  testCardSub:{fontSize:12,color:c.textMuted},
  footer:{backgroundColor:c.card,borderTopWidth:1,borderTopColor:c.placeholder,padding:16,paddingBottom:32},
  footerInfo:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
  footerDate:{fontSize:13,color:c.textMuted},
  footerTotal:{fontSize:16,fontWeight:'700',color:c.text},
  applePayBtn:{backgroundColor:'#000',borderRadius:10,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  applePayBtnTxt:{color:c.onPrimary,fontSize:17,fontWeight:'600'},
  payNowBtn:{backgroundColor:c.primary,borderRadius:10,paddingVertical:14,alignItems:'center'},
  payNowBtnTxt:{color:c.onPrimary,fontSize:16,fontWeight:'700'},
  paypalBtns:{flexDirection:'row',gap:10},
  paypalBtn:{flex:1,backgroundColor:'#003087',borderRadius:10,paddingVertical:14,alignItems:'center'},
  paypalBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
  payLaterBtn:{flex:1,backgroundColor:'#009cde',borderRadius:10,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},
  payLaterBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
  payNote:{flexDirection:'row',alignItems:'flex-start',gap:10,backgroundColor:c.cardAlt,borderRadius:12,padding:14},
  payNoteTxt:{flex:1,fontSize:13,color:c.textSecondary,lineHeight:19},
  payBtnDisabled:{opacity:0.4},
});
