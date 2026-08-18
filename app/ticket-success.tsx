import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';

export default function TicketSuccessScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
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
      <LinearGradient colors={[c.navy, '#2d2240']} style={s.bg} start={{x:0,y:0}} end={{x:1,y:1}}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Success icon */}
          <Animated.View style={[s.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
            <View style={s.iconOuter}>
              <View style={s.iconInner}>
                <Ionicons name="checkmark" size={44} color={c.onPrimary} />
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
                  <Ionicons name="checkmark-circle" size={13} color={c.green} />
                  <Text style={s.ticketStatusTxt}>Confirmed</Text>
                </View>
              </View>

              <Text style={s.ticketTitle}>{params.title}</Text>
              {!!params.organizer && <Text style={s.ticketOrganizer}>by {params.organizer}</Text>}

              <View style={s.ticketDivider} />

              <View style={s.ticketDetails}>
                <View style={s.ticketDetail}>
                  <Ionicons name="calendar-outline" size={15} color={c.gold} />
                  <View>
                    <Text style={s.ticketDetailLbl}>Date</Text>
                    <Text style={s.ticketDetailVal}>{params.date}</Text>
                  </View>
                </View>
                <View style={s.ticketDetail}>
                  <Ionicons name="location-outline" size={15} color={c.gold} />
                  <View style={{flex:1}}>
                    <Text style={s.ticketDetailLbl}>Location</Text>
                    <Text style={s.ticketDetailVal} numberOfLines={2}>{params.location}</Text>
                  </View>
                </View>
                <View style={s.ticketDetail}>
                  <Ionicons name="ticket-outline" size={15} color={c.gold} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1},
  bg:{flex:1},
  scrollContent:{paddingHorizontal:24,paddingTop:40,alignItems:'center'},
  iconWrap:{marginBottom:20},
  iconOuter:{width:100,height:100,borderRadius:50,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center'},
  iconInner:{width:76,height:76,borderRadius:38,backgroundColor:c.green,alignItems:'center',justifyContent:'center'},
  content:{width:'100%',alignItems:'center'},
  successLabel:{fontSize:12,fontWeight:'700',color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:2,marginBottom:8},
  successTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:24,color:c.onPrimary,textAlign:'center',marginBottom:4},
  successSub:{fontSize:15,color:c.gold,fontWeight:'600',marginBottom:14},
  emailBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:12,paddingHorizontal:16,paddingVertical:10,marginBottom:20},
  emailBannerTxt:{color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:'500'},
  ticketCard:{width:'100%',backgroundColor:c.card,borderRadius:20,overflow:'hidden',marginBottom:20},
  ticketTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:14,paddingBottom:8},
  ticketTypePill:{backgroundColor:c.cardAlt,borderRadius:100,paddingHorizontal:12,paddingVertical:4},
  ticketTypeTxt:{fontSize:11,fontWeight:'700',color:c.textMuted},
  ticketStatusPill:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:'#e8f5e9',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  ticketStatusTxt:{fontSize:11,fontWeight:'700',color:c.green},
  ticketTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:17,color:c.text,paddingHorizontal:14,marginBottom:3},
  ticketOrganizer:{fontSize:12,color:c.gold,fontWeight:'600',paddingHorizontal:14,marginBottom:10},
  ticketDivider:{height:1,backgroundColor:c.border,marginHorizontal:14,marginVertical:10},
  ticketDetails:{paddingHorizontal:14,gap:10},
  ticketDetail:{flexDirection:'row',alignItems:'flex-start',gap:10},
  ticketDetailLbl:{fontSize:10,color:c.textMuted,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.3},
  ticketDetailVal:{fontSize:13,color:c.text,fontWeight:'600',marginTop:1},
  ticketIdsWrap:{paddingHorizontal:14,paddingBottom:6},
  ticketIdRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:6},
  ticketIdDot:{width:6,height:6,borderRadius:3,backgroundColor:c.gold},
  ticketIdTxt:{fontSize:12,color:c.textMuted},
  ticketIdCode:{fontWeight:'700',color:c.text,letterSpacing:0.5},
  barcodeWrap:{flexDirection:'row',alignItems:'center',gap:2,paddingHorizontal:14,paddingBottom:12,height:44},
  barcodeBar:{width:3,backgroundColor:c.primary,borderRadius:1},
  viewEventBtn:{width:'100%',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,paddingVertical:15,alignItems:'center',marginBottom:10},
  viewEventBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
  homeBtn:{width:'100%',borderWidth:1.5,borderColor:'rgba(255,255,255,0.2)',borderRadius:14,paddingVertical:14,alignItems:'center'},
  homeBtnTxt:{color:'rgba(255,255,255,0.6)',fontSize:14,fontWeight:'600'},
});
