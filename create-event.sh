#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Events Store ──────────────────────────────────────
cat > src/lib/eventsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type AppEvent = {
  id: string;
  title: string;
  description: string;
  summary: string;
  organizer: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  type: string;
  price: string;
  isPaid: boolean;
  ticketPrice: number;
  platformFee: number;
  creatorPayout: number;
  bannerImage?: string;
  bannerColor: [string, string];
  speakers: { name: string; role: string; initials: string; color: string }[];
  experience: string[];
  audience: string;
  hasLiveStream: boolean;
  liveStreamUrl: string;
  parking: string;
  notes: string;
  createdAt: number;
};

const COLORS_LIST = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#c9a96e'];
const GRADIENTS: [string,string][] = [
  ['#667eea','#764ba2'],
  ['#f093fb','#f5576c'],
  ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'],
  ['#fa709a','#fee140'],
  ['#c9a96e','#1a1a2e'],
];

let events: AppEvent[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getEvents() { return [...events].sort((a,b) => b.createdAt - a.createdAt); }

export function addEvent(event: Omit<AppEvent, 'id' | 'createdAt' | 'bannerColor' | 'platformFee' | 'creatorPayout'>) {
  const idx = events.length % GRADIENTS.length;
  const platformFee = event.isPaid ? parseFloat((event.ticketPrice * 0.015).toFixed(2)) : 0;
  const creatorPayout = event.isPaid ? parseFloat((event.ticketPrice - platformFee).toFixed(2)) : 0;
  events = [{
    ...event,
    id: 'user_' + Date.now().toString(),
    createdAt: Date.now(),
    bannerColor: GRADIENTS[idx],
    platformFee,
    creatorPayout,
  }, ...events];
  notify();
}

export function useEvents() {
  const [state, setState] = useState(getEvents());
  useEffect(() => {
    const fn = () => setState(getEvents());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}
EOF
echo "eventsStore done"

# ── Create Event Screen ───────────────────────────────
cat > app/create-event.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../src/lib/constants';
import { addEvent } from '../src/lib/eventsStore';
import { getUser } from '../src/lib/userStore';

const EVENT_TYPES = ['Conference', 'Festival', 'Workshop', 'Revival', 'Service', 'Concert', 'Retreat', 'Other'];
const SPEAKER_COLORS = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#c9a96e'];

export default function CreateEventScreen() {
  const user = getUser();
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(
    user.accountType === 'church' ? (user.churchName || '') : `${user.firstName || ''} ${user.lastName || ''}`.trim()
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [audience, setAudience] = useState('');
  const [eventType, setEventType] = useState('');
  const [showTypes, setShowTypes] = useState(false);
  const [bannerImage, setBannerImage] = useState('');
  const [speakers, setSpeakers] = useState<{name:string;role:string}[]>([]);
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [hasLiveStream, setHasLiveStream] = useState(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [parking, setParking] = useState('');
  const [notes, setNotes] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('');
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [submitting, setSubmitting] = useState(false);

  const price = parseFloat(ticketPrice) || 0;
  const platformFee = isPaid ? parseFloat((price * 0.015).toFixed(2)) : 0;
  const creatorPayout = isPaid ? parseFloat((price - platformFee).toFixed(2)) : 0;

  async function handlePickBanner() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, aspect: [16,9], allowsEditing: true });
    if (!result.canceled) setBannerImage(result.assets[0].uri);
  }

  function addSpeaker() {
    if (!speakerName.trim()) return;
    setSpeakers(p => [...p, { name: speakerName.trim(), role: speakerRole.trim() || 'Speaker' }]);
    setSpeakerName('');
    setSpeakerRole('');
  }

  function removeSpeaker(i: number) {
    setSpeakers(p => p.filter((_,idx) => idx !== i));
  }

  function validate() {
    const e: Record<string,string> = {};
    if (!title.trim()) e.title = 'Event title is required';
    if (!date.trim()) e.date = 'Date is required';
    if (!location.trim()) e.location = 'Location is required';
    if (!eventType) e.eventType = 'Please select an event type';
    if (isPaid && (!ticketPrice || price <= 0)) e.ticketPrice = 'Please enter a valid ticket price';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handlePublish() {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));

    addEvent({
      title: title.trim(),
      description: summary.trim(),
      summary: summary.trim(),
      organizer: organizer.trim(),
      date: date.trim() + (time.trim() ? ' · ' + time.trim() : ''),
      time: time.trim(),
      location: location.trim(),
      city: city.trim(),
      state: state.trim(),
      type: eventType,
      price: isPaid ? '$' + price.toFixed(2) : 'Free',
      isPaid,
      ticketPrice: price,
      bannerImage: bannerImage || undefined,
      speakers: speakers.map((sp, i) => ({
        ...sp,
        initials: sp.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
        color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
      })),
      experience: experience.split('\n').filter(l => l.trim()),
      audience: audience.trim() || 'All are welcome',
      hasLiveStream,
      liveStreamUrl: liveStreamUrl.trim(),
      parking: parking.trim(),
      notes: notes.trim(),
    });

    setSubmitting(false);
    Alert.alert(
      'Event Published!',
      '"' + title + '" is now live in the Events tab.',
      [{ text: 'View Events', onPress: () => router.replace('/(tabs)/events') }]
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Create Event</Text>
        <TouchableOpacity style={[s.publishBtn, submitting && s.publishBtnDisabled]} onPress={handlePublish} disabled={submitting}>
          <Text style={s.publishBtnTxt}>{submitting ? 'Publishing...' : 'Publish'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Banner */}
          <TouchableOpacity style={s.bannerPicker} onPress={handlePickBanner} activeOpacity={0.85}>
            {bannerImage ? (
              <Image source={{ uri: bannerImage }} style={s.bannerImg} resizeMode="cover" />
            ) : (
              <View style={s.bannerPlaceholder}>
                <Ionicons name="image-outline" size={32} color="#bbb" />
                <Text style={s.bannerPlaceholderTxt}>Add Event Banner Image</Text>
                <Text style={s.bannerPlaceholderSub}>Recommended: 16:9 ratio</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Basic Info */}
          <Text style={s.sectionTitle}>Event Information</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Event Title *</Text>
            <TextInput style={[s.input, errors.title && s.inputErr]} placeholder="Women of Purpose Conference" placeholderTextColor={COLORS.placeholder} value={title} onChangeText={v => { setTitle(v); setErrors(e => ({...e,title:''})); }} />
            {!!errors.title && <Text style={s.errTxt}>{errors.title}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Organizer / Church Name</Text>
            <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={organizer} onChangeText={setOrganizer} />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Event Type *</Text>
            <TouchableOpacity style={[s.picker, errors.eventType && s.pickerErr]} onPress={() => setShowTypes(!showTypes)}>
              <Text style={[s.pickerTxt, !eventType && s.pickerPlaceholder]}>{eventType || 'Select event type'}</Text>
              <Ionicons name={showTypes?'chevron-up':'chevron-down'} size={18} color="#bbb" />
            </TouchableOpacity>
            {!!errors.eventType && <Text style={s.errTxt}>{errors.eventType}</Text>}
            {showTypes && (
              <View style={s.dropList}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity key={t} style={[s.dropItem, eventType===t && s.dropItemActive]} onPress={() => { setEventType(t); setShowTypes(false); }}>
                    <Text style={[s.dropTxt, eventType===t && s.dropTxtActive]}>{t}</Text>
                    {eventType===t && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.row}>
            <View style={[s.fieldWrap,{flex:1,marginRight:8}]}>
              <Text style={s.label}>Date *</Text>
              <TextInput style={[s.input, errors.date && s.inputErr]} placeholder="Apr 18, 2026" placeholderTextColor={COLORS.placeholder} value={date} onChangeText={v => { setDate(v); setErrors(e=>({...e,date:''})); }} />
              {!!errors.date && <Text style={s.errTxt}>{errors.date}</Text>}
            </View>
            <View style={[s.fieldWrap,{flex:1}]}>
              <Text style={s.label}>Time</Text>
              <TextInput style={s.input} placeholder="9:00 AM" placeholderTextColor={COLORS.placeholder} value={time} onChangeText={setTime} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Address *</Text>
            <TextInput style={[s.input, errors.location && s.inputErr]} placeholder="123 Faith Ave" placeholderTextColor={COLORS.placeholder} value={location} onChangeText={v => { setLocation(v); setErrors(e=>({...e,location:''})); }} />
            {!!errors.location && <Text style={s.errTxt}>{errors.location}</Text>}
          </View>

          <View style={s.row}>
            <View style={[s.fieldWrap,{flex:1,marginRight:8}]}>
              <Text style={s.label}>City</Text>
              <TextInput style={s.input} placeholder="New York" placeholderTextColor={COLORS.placeholder} value={city} onChangeText={setCity} />
            </View>
            <View style={[s.fieldWrap,{flex:1}]}>
              <Text style={s.label}>State</Text>
              <TextInput style={s.input} placeholder="NY" placeholderTextColor={COLORS.placeholder} value={state} onChangeText={setState} />
            </View>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Event Details</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Summary / Description</Text>
            <TextInput style={[s.input, s.multiline]} placeholder="What is this event about?" placeholderTextColor={COLORS.placeholder} value={summary} onChangeText={setSummary} multiline />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>What Will Happen <Text style={s.hint}>(one item per line)</Text></Text>
            <TextInput style={[s.input, s.multiline]} placeholder={'Worship session\nKeynote message\nBreakout groups'} placeholderTextColor={COLORS.placeholder} value={experience} onChangeText={setExperience} multiline />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Target Audience</Text>
            <TextInput style={s.input} placeholder="All ages, families welcome" placeholderTextColor={COLORS.placeholder} value={audience} onChangeText={setAudience} />
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Speakers & Guests</Text>

          {speakers.map((sp, i) => (
            <View key={i} style={s.speakerTag}>
              <View style={[s.speakerDot, {backgroundColor: SPEAKER_COLORS[i % SPEAKER_COLORS.length]}]}>
                <Text style={s.speakerDotTxt}>{sp.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={s.speakerInfo}>
                <Text style={s.speakerName}>{sp.name}</Text>
                <Text style={s.speakerRole}>{sp.role}</Text>
              </View>
              <TouchableOpacity onPress={() => removeSpeaker(i)}>
                <Ionicons name="close-circle" size={20} color="#ddd" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.row}>
            <View style={[s.fieldWrap,{flex:2,marginRight:8}]}>
              <TextInput style={s.input} placeholder="Speaker name" placeholderTextColor={COLORS.placeholder} value={speakerName} onChangeText={setSpeakerName} />
            </View>
            <View style={[s.fieldWrap,{flex:1,marginRight:8}]}>
              <TextInput style={s.input} placeholder="Role" placeholderTextColor={COLORS.placeholder} value={speakerRole} onChangeText={setSpeakerRole} />
            </View>
            <TouchableOpacity style={s.addSpeakerBtn} onPress={addSpeaker}>
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Additional Info</Text>

          <View style={s.toggleRow}>
            <View style={s.toggleInfo}>
              <Ionicons name="wifi-outline" size={20} color={COLORS.navy} />
              <Text style={s.toggleLabel}>Live Stream Available</Text>
            </View>
            <Switch value={hasLiveStream} onValueChange={setHasLiveStream} trackColor={{false:'#ddd',true:COLORS.navy}} thumbColor={COLORS.white} />
          </View>

          {hasLiveStream && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Live Stream URL</Text>
              <TextInput style={s.input} placeholder="https://youtube.com/live/..." placeholderTextColor={COLORS.placeholder} value={liveStreamUrl} onChangeText={setLiveStreamUrl} autoCapitalize="none" />
            </View>
          )}

          <View style={s.fieldWrap}>
            <Text style={s.label}>Parking Information</Text>
            <TextInput style={s.input} placeholder="Free parking available on site" placeholderTextColor={COLORS.placeholder} value={parking} onChangeText={setParking} />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Additional Notes</Text>
            <TextInput style={[s.input, s.multiline]} placeholder="Any other important information..." placeholderTextColor={COLORS.placeholder} value={notes} onChangeText={setNotes} multiline />
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Tickets & Pricing</Text>

          <View style={s.ticketTypeRow}>
            <TouchableOpacity style={[s.ticketTypeBtn, !isPaid && s.ticketTypeBtnActive]} onPress={() => setIsPaid(false)}>
              <Ionicons name="checkmark-circle" size={18} color={!isPaid ? COLORS.green : '#ddd'} />
              <Text style={[s.ticketTypeTxt, !isPaid && s.ticketTypeTxtActive]}>Free Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ticketTypeBtn, isPaid && s.ticketTypeBtnPaid]} onPress={() => setIsPaid(true)}>
              <Ionicons name="card-outline" size={18} color={isPaid ? COLORS.white : '#ddd'} />
              <Text style={[s.ticketTypeTxt, isPaid && s.ticketTypeTxtPaid]}>Paid Event</Text>
            </TouchableOpacity>
          </View>

          {isPaid && (
            <View style={s.pricingSection}>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Ticket Price (USD) *</Text>
                <View style={s.priceInputWrap}>
                  <Text style={s.priceDollar}>$</Text>
                  <TextInput
                    style={[s.input, s.priceInput, errors.ticketPrice && s.inputErr]}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.placeholder}
                    value={ticketPrice}
                    onChangeText={v => { setTicketPrice(v); setErrors(e=>({...e,ticketPrice:''})); }}
                    keyboardType="decimal-pad"
                  />
                </View>
                {!!errors.ticketPrice && <Text style={s.errTxt}>{errors.ticketPrice}</Text>}
              </View>

              {price > 0 && (
                <View style={s.feeBreakdown}>
                  <Text style={s.feeTitle}>Fee Breakdown</Text>
                  <View style={s.feeRow}>
                    <Text style={s.feeLbl}>Ticket Price</Text>
                    <Text style={s.feeVal}>${price.toFixed(2)}</Text>
                  </View>
                  <View style={s.feeRow}>
                    <Text style={s.feeLbl}>Platform Fee (1.5%)</Text>
                    <Text style={[s.feeVal, {color:COLORS.red}]}>-${platformFee.toFixed(2)}</Text>
                  </View>
                  <View style={[s.feeRow, s.feeTotal]}>
                    <Text style={s.feeTotalLbl}>You Receive</Text>
                    <Text style={[s.feeVal, {color:COLORS.green,fontWeight:'700'}]}>${creatorPayout.toFixed(2)}</Text>
                  </View>
                  <View style={s.stripeNote}>
                    <Ionicons name="information-circle-outline" size={14} color="#aaa" />
                    <Text style={s.stripeNoteTxt}>Payments processed securely via Stripe. Connect your Stripe account in Settings to receive payouts.</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={[s.publishFullBtn, submitting && s.publishBtnDisabled]} onPress={handlePublish} disabled={submitting}>
            <Ionicons name={submitting ? 'hourglass-outline' : 'checkmark-circle'} size={20} color={COLORS.white} />
            <Text style={s.publishFullBtnTxt}>{submitting ? 'Publishing...' : 'Publish Event'}</Text>
          </TouchableOpacity>

          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const EVENT_TYPES = ['Conference', 'Festival', 'Workshop', 'Revival', 'Service', 'Concert', 'Retreat', 'Other'];
const SPEAKER_COLORS = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#c9a96e'];

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  publishBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:16,paddingVertical:8},
  publishBtnDisabled:{opacity:0.5},
  publishBtnTxt:{color:'#fff',fontSize:14,fontWeight:'700'},
  scroll:{paddingHorizontal:20,paddingTop:16},
  bannerPicker:{height:180,borderRadius:16,overflow:'hidden',borderWidth:1.5,borderColor:COLORS.border,marginBottom:20,borderStyle:'dashed'},
  bannerImg:{width:'100%',height:'100%'},
  bannerPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.lightBg},
  bannerPlaceholderTxt:{fontSize:14,fontWeight:'600',color:'#aaa'},
  bannerPlaceholderSub:{fontSize:12,color:'#ccc'},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:16},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  hint:{fontWeight:'400',color:'#bbb',fontSize:11},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,color:COLORS.navy},
  inputErr:{borderColor:COLORS.red},
  multiline:{height:80,textAlignVertical:'top',paddingTop:12},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:4},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14},
  pickerErr:{borderColor:COLORS.red},
  pickerTxt:{fontSize:15,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  dropList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,marginTop:4,overflow:'hidden'},
  dropItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:13,borderBottomWidth:1,borderBottomColor:COLORS.border},
  dropItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  dropTxt:{fontSize:14,color:'#444'},
  dropTxtActive:{color:COLORS.navy,fontWeight:'700'},
  divider:{height:1,backgroundColor:COLORS.border,marginVertical:20},
  speakerTag:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:COLORS.border,borderRadius:14,marginBottom:10},
  speakerDot:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  speakerDotTxt:{color:'#fff',fontWeight:'700',fontSize:14},
  speakerInfo:{flex:1},
  speakerName:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  speakerRole:{fontSize:12,color:'#888'},
  addSpeakerBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  toggleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,marginBottom:14},
  toggleInfo:{flexDirection:'row',alignItems:'center',gap:10},
  toggleLabel:{fontSize:15,color:COLORS.navy,fontWeight:'600'},
  ticketTypeRow:{flexDirection:'row',gap:10,marginBottom:16},
  ticketTypeBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  ticketTypeBtnActive:{borderColor:COLORS.green,backgroundColor:'#e8f5e9'},
  ticketTypeBtnPaid:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  ticketTypeTxt:{fontSize:14,fontWeight:'700',color:'#aaa'},
  ticketTypeTxtActive:{color:COLORS.green},
  ticketTypeTxtPaid:{color:COLORS.white},
  pricingSection:{marginBottom:16},
  priceInputWrap:{flexDirection:'row',alignItems:'center',gap:8},
  priceDollar:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  priceInput:{flex:1,fontSize:20,fontWeight:'700'},
  feeBreakdown:{backgroundColor:COLORS.lightBg,borderRadius:14,padding:16,marginTop:4},
  feeTitle:{fontSize:13,fontWeight:'700',color:COLORS.navy,marginBottom:12,textTransform:'uppercase',letterSpacing:0.5},
  feeRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  feeLbl:{fontSize:14,color:'#666'},
  feeVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  feeTotal:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,marginTop:4},
  feeTotalLbl:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  stripeNote:{flexDirection:'row',alignItems:'flex-start',gap:6,marginTop:10},
  stripeNoteTxt:{fontSize:12,color:'#aaa',flex:1,lineHeight:17},
  publishFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,marginTop:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  publishFullBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
EOF
echo "create-event done"

# Update Header settings to include Create Event
python3 << 'PYEOF'
content = open('src/components/Header.tsx').read()

# Add Create Event to settings list
content = content.replace(
    "{ icon:'person-outline', label:'Edit Profile', color:'#667eea' },",
    "{ icon:'person-outline', label:'Edit Profile', color:'#667eea' },\n              { icon:'calendar-outline', label:'Create Event', color:COLORS.gold },"
)

# Add navigation for Create Event
content = content.replace(
    "} else if (item.label === 'Edit Profile') {",
    "} else if (item.label === 'Create Event') {\n                  router.push('/create-event');\n                } else if (item.label === 'Edit Profile') {"
)

open('src/components/Header.tsx', 'w').write(content)
print('Header updated')
PYEOF

# Update Events tab to show user-created events
python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()

# Add eventsStore import
content = content.replace(
    "import { COLORS, EVENTS } from '../../src/lib/constants';",
    "import { COLORS, EVENTS } from '../../src/lib/constants';\nimport { useEvents } from '../../src/lib/eventsStore';"
)

# Merge user events with static events
content = content.replace(
    "  const [savedEvents, setSavedEvents] = useState<string[]>([]);",
    "  const userEvents = useEvents();\n  const [savedEvents, setSavedEvents] = useState<string[]>([]);"
)

# Combine all events
content = content.replace(
    "  let filtered = EVENTS.filter(e => {",
    "  const allEvents = [...userEvents.map(e => ({ ...e, id: e.id, attending: 0 })), ...EVENTS];\n  let filtered = allEvents.filter(e => {"
)

open('app/(tabs)/events.tsx', 'w').write(content)
print('events tab updated')
PYEOF

# Update event-detail to handle user-created events from eventsStore
python3 << 'PYEOF'
content = open('app/event-detail.tsx').read()

# Add eventsStore import
if 'eventsStore' not in content:
    content = content.replace(
        "import { COLORS, EVENT_DETAILS } from '../src/lib/constants';",
        "import { COLORS, EVENT_DETAILS } from '../src/lib/constants';\nimport { getEvents } from '../src/lib/eventsStore';"
    )

# Get details from eventsStore if it's a user event
content = content.replace(
    "  const details = EVENT_DETAILS[params.id] || {",
    """  const userEvent = getEvents().find(e => e.id === params.id);
  const details = userEvent ? {
    bannerColor: userEvent.bannerColor,
    summary: userEvent.summary,
    experience: userEvent.experience,
    speakers: userEvent.speakers,
    audience: userEvent.audience,
    notes: [
      ...(userEvent.hasLiveStream ? [{ icon: 'wifi-outline', label: 'Live Stream', value: userEvent.liveStreamUrl || 'Available' }] : []),
      ...(userEvent.parking ? [{ icon: 'car-outline', label: 'Parking', value: userEvent.parking }] : []),
      ...(userEvent.notes ? [{ icon: 'information-circle-outline', label: 'Notes', value: userEvent.notes }] : []),
    ],
    bannerImage: userEvent.bannerImage,
  } : EVENT_DETAILS[params.id] || {"""
)

# Close the ternary properly
content = content.replace(
    "    notes: [],\n  };",
    "    notes: [],\n  } : undefined};"
)

# Show banner image if available
content = content.replace(
    "<LinearGradient colors={details.bannerColor} style={s.banner} start={{x:0,y:0}} end={{x:1,y:1}}>",
    """{details.bannerImage ? (
          <View style={[s.banner, {position:'relative'}]}>
            <Image source={{uri: details.bannerImage}} style={{...StyleSheet.absoluteFillObject, width:'100%', height:'100%'}} resizeMode="cover" />"""
    + "\n          <View style={{...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.3)'}} />"
    + "\n          "
)

open('app/event-detail.tsx', 'w').write(content)
print('event-detail updated')
PYEOF

# Update _layout to include create-event
python3 << 'PYEOF'
content = open('app/_layout.tsx').read()
if 'create-event' not in content:
    content = content.replace(
        '<Stack.Screen name="edit-profile" />',
        '<Stack.Screen name="edit-profile" />\n        <Stack.Screen name="create-event" />'
    )
    open('app/_layout.tsx', 'w').write(content)
    print('layout updated')
else:
    print('layout already has create-event')
PYEOF

echo "ALL DONE"
