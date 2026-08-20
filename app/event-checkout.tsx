import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { addAttending } from '../src/lib/eventActionsStore';
import { addTicket } from '../src/lib/ticketStore';

export default function EventCheckoutScreen() {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{
    id: string; title: string; date: string; location: string;
    price: string; type: string; organizer?: string;
  }>();

  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'apple'|'card'|'paypal'>('apple');
  const [agreed, setAgreed] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zip, setZip] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  const priceStr = params.price || '0';
  const isFree = priceStr === 'Free' || priceStr === '0' || priceStr === '';
  const ticketPrice = isFree ? 0 : parseFloat(priceStr.replace('$','') || '0');
  const subtotal = ticketPrice * quantity;
  const platformFee = isFree ? 0 : parseFloat((subtotal * 0.015).toFixed(2));
  const total = isFree ? 0 : parseFloat((subtotal + platformFee).toFixed(2));

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
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');
    if (!agreed) return;
    if (!isFree && paymentMethod === 'card' && !cardComplete) return;
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
        location: params.location, price: isFree ? 'Free' : '$' + total.toFixed(2),
        type: params.type, organizer: params.organizer || '',
        quantity: String(quantity), ticketIds: ticket.ticketIds.join(','),
      }
    });
  }

  const canPay = agreed && (isFree || paymentMethod !== 'card' || cardComplete);

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

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
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
              placeholder="Enter your email address"
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

          {/* Payment - paid events only */}
          {!isFree && (
            <View style={s.section}>
              <Text style={s.payWithTitle}>{t('payWith')}</Text>

              <TouchableOpacity style={[s.payOption, paymentMethod==='apple' && s.payOptionActive]} onPress={() => setPaymentMethod('apple')}>
                <View style={s.payOptionLeft}>
                  <View style={s.applePayLogo}>
                    <Ionicons name="logo-apple" size={18} color="#fff"/>
                    <Text style={s.applePayLogoTxt}> Pay</Text>
                  </View>
                  <Text style={s.payOptionName}>Apple Pay</Text>
                </View>
                <View style={[s.radio, paymentMethod==='apple' && s.radioActive]}>
                  {paymentMethod==='apple' && <View style={s.radioDot}/>}
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[s.payOption, paymentMethod==='card' && s.payOptionActive, {marginTop:8}]} onPress={() => setPaymentMethod('card')}>
                <View style={s.payOptionLeft}>
                  <View style={s.cardIcon}><Ionicons name="card-outline" size={16} color={c.textSecondary}/></View>
                  <Text style={s.payOptionName}>Credit / Debit Card</Text>
                </View>
                <View style={[s.radio, paymentMethod==='card' && s.radioActive]}>
                  {paymentMethod==='card' && <View style={s.radioDot}/>}
                </View>
              </TouchableOpacity>

              {paymentMethod === 'card' && (
                <View style={s.cardFields}>
                  <View style={s.cardFieldRow}>
                    <Text style={s.cardFieldLabel}>{t('cardNumber')}</Text>
                    <View style={s.cardFieldWrap}>
                      <Ionicons name="card-outline" size={16} color={c.textMuted}/>
                      <TextInput style={s.cardInput} placeholder="1234 5678 9012 3456" placeholderTextColor={c.placeholder} keyboardType="numeric" value={cardNumber} onChangeText={t=>setCardNumber(formatCardNumber(t))} maxLength={19}/>
                    </View>
                  </View>
                  <View style={s.cardFieldTwoCol}>
                    <View style={[s.cardFieldRow,{flex:1,marginRight:8}]}>
                      <Text style={s.cardFieldLabel}>{t('expiry')}</Text>
                      <TextInput style={s.cardInputSingle} placeholder="MM/YY" placeholderTextColor={c.placeholder} keyboardType="numeric" value={expiry} onChangeText={t=>setExpiry(formatExpiry(t))} maxLength={5}/>
                    </View>
                    <View style={[s.cardFieldRow,{flex:1,marginRight:8}]}>
                      <Text style={s.cardFieldLabel}>CVV</Text>
                      <TextInput style={s.cardInputSingle} placeholder="123" placeholderTextColor={c.placeholder} keyboardType="numeric" secureTextEntry value={cvv} onChangeText={t=>setCvv(t.replace(/\D/g,'').slice(0,4))} maxLength={4}/>
                    </View>
                    <View style={[s.cardFieldRow,{flex:1}]}>
                      <Text style={s.cardFieldLabel}>ZIP</Text>
                      <TextInput style={s.cardInputSingle} placeholder="10001" placeholderTextColor={c.placeholder} keyboardType="numeric" value={zip} onChangeText={t=>setZip(t.replace(/\D/g,'').slice(0,5))} maxLength={5}/>
                    </View>
                  </View>
                  <View style={s.saveCardRow}>
                    <TouchableOpacity style={[s.checkbox, saveCard && s.checkboxChecked]} onPress={()=>setSaveCard(v=>!v)}>
                      {saveCard && <Ionicons name="checkmark" size={11} color={c.onPrimary}/>}
                    </TouchableOpacity>
                    <Text style={s.saveCardTxt}>{t('saveCard')}</Text>
                  </View>
                  <View style={s.testCardBox}>
                    <Text style={s.testCardTitle}>🧪 Test Mode</Text>
                    <Text style={s.testCardNum}>4242 4242 4242 4242</Text>
                    <Text style={s.testCardSub}>{t('anyFutureDate')}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={[s.payOption, paymentMethod==='paypal' && s.payOptionActive, {marginTop:8}]} onPress={() => setPaymentMethod('paypal')}>
                <View style={s.payOptionLeft}>
                  <Text style={s.paypalTxt}><Text style={{color:'#003087'}}>Pay</Text><Text style={{color:'#009cde'}}>Pal</Text></Text>
                </View>
                <View style={[s.radio, paymentMethod==='paypal' && s.radioActive]}>
                  {paymentMethod==='paypal' && <View style={s.radioDot}/>}
                </View>
              </TouchableOpacity>

              {paymentMethod === 'paypal' && (
                <View style={s.paypalNote}>
                  <Text style={s.paypalNoteTxt}>{t('paypalProceed')}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{height:120}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom bar */}
      <View style={s.footer}>
        <View style={s.footerInfo}>
          <Text style={s.footerDate}>{params.date}</Text>
          <Text style={s.footerTotal}>{isFree ? 'Free' : `$${total.toFixed(2)}`}</Text>
        </View>
        {isFree ? (
          <TouchableOpacity style={[s.payNowBtn, (!canPay || processing) && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Complete Registration'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'apple' ? (
          <TouchableOpacity style={[s.applePayBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
            <Ionicons name="logo-apple" size={20} color={c.onPrimary} />
            <Text style={s.applePayBtnTxt}>{processing ? 'Processing...' : 'Pay'}</Text>
          </TouchableOpacity>
        ) : paymentMethod === 'paypal' ? (
          <View style={s.paypalBtns}>
            <TouchableOpacity style={[s.paypalBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Text style={s.paypalBtnTxt}>PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payLaterBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
              <Ionicons name="logo-paypal" size={14} color={c.onPrimary} />
              <Text style={s.payLaterBtnTxt}>{t('payLater')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[s.payNowBtn, !canPay && s.payBtnDisabled]} onPress={handlePay} disabled={!canPay || processing}>
            <Text style={s.payNowBtnTxt}>{processing ? 'Processing...' : 'Pay Now'}</Text>
          </TouchableOpacity>
        )}
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
  payBtnDisabled:{opacity:0.4},
});
