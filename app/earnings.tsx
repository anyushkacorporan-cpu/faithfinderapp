import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useUserEvents, getEarnings } from '../src/lib/eventsStore';
import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EarningsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const events = useUserEvents();
  const earnings = getEarnings();
  const [activeTab, setActiveTab] = useState('Overview');

  const paidEvents = events.filter(e => e.isPaid);

  function handleWithdraw() {
    if (earnings.pendingPayout <= 0) { Alert.alert(tx('No Balance'), tx('You have no available balance to withdraw.')); return; }
    Alert.alert(
      tx('No payout account yet'),
      tx('Withdrawals need a connected Stripe account, which is not switched on yet. See the Settings tab.'));
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('earnings')}</Text>
        <View style={{width:36}} />
      </View>

      {/* Tabs */}
      <View style={s.tabsRow}>
        {['Overview', 'Payouts', 'Settings'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardScreen>
      <ScrollView
            {...KEYBOARD_SCROLL_PROPS} style={s.scroll} showsVerticalScrollIndicator={false}>

        {activeTab === 'Overview' && (
          <>
            {/* Total earnings hero */}
            <LinearGradient colors={[c.navy, '#2d2240']} style={s.heroCard} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Text style={s.heroLabel}>{t('totalNetRevenue')}</Text>
              <Text style={s.heroAmount}>${earnings.netRevenue.toFixed(2)}</Text>
              <View style={s.heroRow}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{earnings.totalTickets}</Text>
                  <Text style={s.heroStatLbl}>{t('ticketsSold')}</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{earnings.totalAttendees}</Text>
                  <Text style={s.heroStatLbl}>{t('attendees')}</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{paidEvents.length}</Text>
                  <Text style={s.heroStatLbl}>{t('paidEvents')}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stats grid */}
            <View style={s.statsGrid}>
              {[
                { label: 'Gross Revenue', value: formatCurrency(earnings.grossRevenue), icon: 'trending-up', color: '#667eea' },
                { label: 'Fees Paid by Buyers', value: formatCurrency(earnings.totalFees), icon: 'information-circle', color: c.textMuted },
                { label: 'Net Revenue', value: formatCurrency(earnings.netRevenue), icon: 'checkmark-circle', color: c.green },
                { label: 'Pending Payout', value: formatCurrency(earnings.pendingPayout), icon: 'time', color: c.gold },
                { label: 'Completed Payout', value: formatCurrency(earnings.completedPayout), icon: 'wallet', color: '#43e97b' },
                { label: 'Total Events', value: String(events.length), icon: 'calendar', color: c.text },
              ].map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View style={[s.statIcon, {backgroundColor: stat.color + '18'}]}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={s.statVal} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
                  <Text style={s.statLbl} numberOfLines={2}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Per-event breakdown */}
            {paidEvents.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>{t('eventBreakdown')}</Text>
                {paidEvents.map(e => (
                  <View key={e.id} style={s.eventRow}>
                    <View style={s.eventRowInfo}>
                      <Text style={s.eventRowTitle} numberOfLines={1}>{e.title}</Text>
                      <Text style={s.eventRowDate}>{e.date}</Text>
                    </View>
                    <View style={s.eventRowStats}>
                      <Text style={s.eventRowTickets}>{e.ticketsSold} tickets</Text>
                      <Text style={s.eventRowRevenue}>${(e.creatorPayout * e.ticketsSold).toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {events.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="cash-outline" size={48} color={c.placeholder} />
                <Text style={s.emptyTxt}>{t('noEarningsYet')}</Text>
                <Text style={s.emptySub}>{t('createPaidEvent')}</Text>
                <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-event')}>
                  <Text style={s.createBtnTxt}>{t('createEvent')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'Payouts' && (
          <>
            <View style={s.balanceCard}>
              <Text style={s.balanceLbl}>{t('availableBalance')}</Text>
              <Text style={s.balanceAmt}>${earnings.pendingPayout.toFixed(2)}</Text>
              <TouchableOpacity style={s.withdrawBtn} onPress={handleWithdraw}>
                <Ionicons name="arrow-up-circle" size={18} color={c.onPrimary} />
                <Text style={s.withdrawBtnTxt}>{t('requestWithdrawal')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>{t('withdrawalHistory')}</Text>
            {/* No withdrawals have ever been made — there is no payout system
                yet. This used to render two invented completed payouts above a
                $0.00 balance, which is not something to show on a money screen. */}
            <View style={s.emptyPayouts}>
              <Ionicons name="receipt-outline" size={26} color={c.textMuted} />
              <Text style={s.emptyPayoutsTitle}>{tx('No withdrawals yet')}</Text>
              <Text style={s.emptyPayoutsSub}>
                {tx('Once you connect a payout account and withdraw, your transfers will appear here.')}
              </Text>
            </View>
          </>
        )}

        {activeTab === 'Settings' && (
          <>
            <Text style={s.sectionTitle}>{t('payoutAccount')}</Text>

            {/* There used to be a form here asking for bank name, account
                number and routing number. It collected all three into
                component state and threw them away with an alert saying the
                integration was not live.

                It is not coming back. Taking somebody's account and routing
                number means handling banking credentials, and an app that
                asks for them has made itself responsible for them — for how
                they are stored, who can reach them, and what happens when
                that goes wrong. Stripe is set up to carry exactly that, and
                the reason every platform bounces you out to Stripe's own
                onboarding instead of asking in-app is that none of them want
                to carry it either.

                So the card below is the whole of this screen now: the
                organiser connects an account on Stripe's site, enters their
                details there, and comes back with nothing more than an id. */}

            <View style={s.stripeConnectCard}>
              <View style={s.stripeConnectHdr}>
                <Ionicons name="card-outline" size={24} color={c.gold} />
                <View style={{flex:1}}>
                  <Text style={s.stripeConnectTitle}>{t('connectStripe')}</Text>
                  <Text style={s.stripeConnectSub}>{t('forInstantPayouts')}</Text>
                </View>
              </View>
              <Text style={s.stripeConnectDesc}>
                {tx('Ticket money is paid out through Stripe. You enter your bank details on Stripe’s own site, never here, and payouts arrive automatically after each event.')}
              </Text>
              {/* Honest about not existing yet. This button used to say "you
                  will be redirected to Stripe" and then redirect nowhere. */}
              <TouchableOpacity
                style={[s.stripeConnectBtn, { backgroundColor: c.cardAlt }]}
                onPress={() => Alert.alert(
                  tx('Not available yet'),
                  tx('Connecting a Stripe account is not switched on yet. Nothing can be paid out until it is, and no tickets are being charged in the meantime.'))}>
                <Ionicons name="time-outline" size={16} color={c.textSecondary} />
                <Text style={[s.stripeConnectBtnTxt, { color: c.textSecondary }]}>{tx('Coming soon')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{height:30}} />
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  emptyPayouts:{alignItems:'center',paddingVertical:32,paddingHorizontal:24,backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,gap:8},
  emptyPayoutsTitle:{fontSize:15,fontWeight:'700',color:c.text},
  emptyPayoutsSub:{fontSize:13,color:c.textMuted,textAlign:'center',lineHeight:19},
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  tabsRow:{flexDirection:'row',backgroundColor:c.card,borderBottomWidth:1,borderBottomColor:c.border},
  tab:{flex:1,paddingVertical:12,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:c.navy},
  tabTxt:{fontSize:13,fontWeight:'600',color:c.textMuted},
  tabTxtActive:{color:c.text,fontWeight:'700'},
  scroll:{flex:1},
  heroCard:{margin:16,borderRadius:20,padding:20},
  heroLabel:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4},
  heroAmount:{fontSize:36,fontWeight:'700',color:c.onPrimary,marginBottom:16,fontFamily:'PlayfairDisplay_700Bold'},
  heroRow:{flexDirection:'row',alignItems:'center'},
  heroStat:{flex:1,alignItems:'center'},
  heroStatVal:{fontSize:18,fontWeight:'700',color:c.onPrimary},
  heroStatLbl:{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2},
  heroStatDivider:{width:1,height:30,backgroundColor:'rgba(255,255,255,0.2)'},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:16,gap:10,marginBottom:8},
  statCard:{width:'47%',backgroundColor:c.card,borderRadius:14,padding:14,borderWidth:1,borderColor:c.border,alignItems:'center',gap:6},
  statIcon:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  statVal:{fontSize:16,fontWeight:'700',color:c.text},
  statLbl:{fontSize:10,color:c.textMuted,textAlign:'center'},
  section:{paddingHorizontal:16,marginBottom:16},
  sectionTitle:{fontSize:16,fontWeight:'700',color:c.text,paddingHorizontal:16,marginBottom:12,marginTop:4},
  eventRow:{flexDirection:'row',alignItems:'center',backgroundColor:c.card,borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:c.border},
  eventRowInfo:{flex:1},
  eventRowTitle:{fontSize:14,fontWeight:'700',color:c.text},
  eventRowDate:{fontSize:12,color:c.textMuted,marginTop:2},
  eventRowStats:{alignItems:'flex-end'},
  eventRowTickets:{fontSize:12,color:c.textMuted},
  eventRowRevenue:{fontSize:15,fontWeight:'700',color:c.green},
  empty:{paddingVertical:50,alignItems:'center',gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:c.textMuted},
  emptySub:{fontSize:13,color:c.placeholder},
  createBtn:{marginTop:8,backgroundColor:c.primary,borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  createBtnTxt:{color:c.onPrimary,fontWeight:'700',fontSize:14},
  balanceCard:{margin:16,backgroundColor:c.primary,borderRadius:20,padding:20,alignItems:'center'},
  balanceLbl:{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:8},
  balanceAmt:{fontSize:40,fontWeight:'700',color:c.onPrimary,marginBottom:20,fontFamily:'PlayfairDisplay_700Bold'},
  withdrawBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  withdrawBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
  withdrawalRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.card,borderRadius:12,padding:14,marginHorizontal:16,marginBottom:8,borderWidth:1,borderColor:c.border},
  withdrawalIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  withdrawalInfo:{flex:1},
  withdrawalMethod:{fontSize:14,fontWeight:'600',color:c.text},
  withdrawalDate:{fontSize:12,color:c.textMuted,marginTop:2},
  withdrawalRight:{alignItems:'flex-end'},
  withdrawalAmt:{fontSize:15,fontWeight:'700',color:c.text,marginBottom:4},
  withdrawalStatus:{borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  withdrawalStatusTxt:{fontSize:11,fontWeight:'700'},
  stripeConnectCard:{margin:16,backgroundColor:c.card,borderRadius:16,padding:16,borderWidth:1,borderColor:c.border},
  stripeConnectHdr:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},
  stripeConnectTitle:{fontSize:15,fontWeight:'700',color:c.text},
  stripeConnectSub:{fontSize:12,color:c.textMuted},
  stripeBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  stripeBadgeTxt:{fontSize:10,fontWeight:'700',color:c.gold},
  stripeConnectDesc:{fontSize:13,color:c.textSecondary,lineHeight:20,marginBottom:14},
  stripeConnectBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:c.primary,borderRadius:12,paddingVertical:13},
  stripeConnectBtnTxt:{color:c.onPrimary,fontSize:14,fontWeight:'700'},
});
