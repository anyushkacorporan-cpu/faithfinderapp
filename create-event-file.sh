#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Create eventsStore
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
  attending: number;
  createdAt: number;
};

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

export function addEvent(event: Omit<AppEvent, 'id' | 'createdAt' | 'bannerColor' | 'platformFee' | 'creatorPayout' | 'attending'>) {
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
    attending: 0,
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
echo "eventsStore created"

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
    user.accountType === 'church' ? (user.churchName || '') : ((user.firstName || '') + ' ' + (user.lastName || '')).trim()
  );
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
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
  const [additionalNotes, setAdditionalNotes] = useState('');
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
      location: location.trim() + (city.trim() ? ', ' + city.trim() : '') + (stateName.trim() ? ', ' + stateName.trim() : ''),
      city: city.trim(),
      state: stateName.trim(),
      type: eventType,
      price: isPaid ? '$' + price.toFixed(2) : 'Free',
      isPaid,
      ticketPrice: price,
      bannerImage: bannerImage || undefined,
      speakers: speakers.map((sp, i) => ({
        ...sp,
        initials: sp.name.split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2),
        color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
      })),
      experience: experience.split('\n').filter((l:string) => l.trim()),
      audience: audience.trim() || 'All are welcome',
      hasLiveStream,
      liveStreamUrl: liveStreamUrl.trim(),
      parking: parking.trim(),
      notes: additionalNotes.trim(),
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
                <Text style={s.bannerPlaceholderSub}>Tap to upload · 16:9 recommended</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={s.sectionTitle}>Event Information</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Event Title *</Text>
            <TextInput style={[s.input, !!errors.title && s.inputErr]} placeholder="Women of Purpose Conference" placeholderTextColor={COLORS.placeholder} value={title} onChangeText={v => { setTitle(v); setErrors(e => ({...e, title:''})); }} />
            {!!errors.title && <Text style={s.errTxt}>{errors.title}</Text>}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Organizer / Church Name</Text>
            <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={organizer} onChangeText={setOrganizer} />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Event Type *</Text>
            <TouchableOpacity style={[s.picker, !!errors.eventType && s.inputErr]} onPress={() => setShowTypes(!showTypes)}>
              <Text style={[s.pickerTxt, !eventType && s.placeholder]}>{eventType || 'Select event type'}</Text>
              <Ionicons name={showTypes ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
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
            <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
              <Text style={s.label}>Date *</Text>
              <TextInput style={[s.input, !!errors.date && s.inputErr]} placeholder="Apr 18, 2026" placeholderTextColor={COLORS.placeholder} value={date} onChangeText={v => { setDate(v); setErrors(e => ({...e,date:''})); }} />
              {!!errors.date && <Text style={s.errTxt}>{errors.date}</Text>}
            </View>
            <View style={[s.fieldWrap, {flex:1}]}>
              <Text style={s.label}>Time</Text>
              <TextInput style={s.input} placeholder="9:00 AM" placeholderTextColor={COLORS.placeholder} value={time} onChangeText={setTime} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Address *</Text>
            <TextInput style={[s.input, !!errors.location && s.inputErr]} placeholder="123 Faith Ave" placeholderTextColor={COLORS.placeholder} value={location} onChangeText={v => { setLocation(v); setErrors(e => ({...e,location:''})); }} />
            {!!errors.location && <Text style={s.errTxt}>{errors.location}</Text>}
          </View>

          <View style={s.row}>
            <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
              <Text style={s.label}>City</Text>
              <TextInput style={s.input} placeholder="New York" placeholderTextColor={COLORS.placeholder} value={city} onChangeText={setCity} />
            </View>
            <View style={[s.fieldWrap, {flex:1}]}>
              <Text style={s.label}>State</Text>
              <TextInput style={s.input} placeholder="NY" placeholderTextColor={COLORS.placeholder} value={stateName} onChangeText={setStateName} />
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
                <Text style={s.speakerDotTxt}>{sp.name.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={s.speakerInfo}>
                <Text style={s.speakerName}>{sp.name}</Text>
                <Text style={s.speakerRole}>{sp.role}</Text>
              </View>
              <TouchableOpacity onPress={() => setSpeakers(p => p.filter((_,idx) => idx !== i))}>
                <Ionicons name="close-circle" size={20} color="#ddd" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={s.addSpeakerRow}>
            <TextInput style={[s.input, {flex:2, marginRight:8}]} placeholder="Speaker name" placeholderTextColor={COLORS.placeholder} value={speakerName} onChangeText={setSpeakerName} />
            <TextInput style={[s.input, {flex:1, marginRight:8}]} placeholder="Role" placeholderTextColor={COLORS.placeholder} value={speakerRole} onChangeText={setSpeakerRole} />
            <TouchableOpacity style={s.addBtn} onPress={addSpeaker}>
              <Ionicons name="add" size={22} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Additional Info</Text>

          <View style={s.toggleRow}>
            <View style={s.toggleLeft}>
              <Ionicons name="wifi-outline" size={20} color={COLORS.navy} />
              <Text style={s.toggleLabel}>Live Stream Available</Text>
            </View>
            <Switch value={hasLiveStream} onValueChange={setHasLiveStream} trackColor={{false:'#ddd', true:COLORS.navy}} thumbColor={COLORS.white} />
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
            <TextInput style={[s.input, s.multiline]} placeholder="Any other important information..." placeholderTextColor={COLORS.placeholder} value={additionalNotes} onChangeText={setAdditionalNotes} multiline />
          </View>

          <View style={s.divider} />
          <Text style={s.sectionTitle}>Tickets & Pricing</Text>

          <View style={s.ticketRow}>
            <TouchableOpacity style={[s.ticketBtn, !isPaid && s.ticketBtnFree]} onPress={() => setIsPaid(false)}>
              <Ionicons name="checkmark-circle" size={18} color={!isPaid ? COLORS.green : '#ddd'} />
              <Text style={[s.ticketBtnTxt, !isPaid && {color: COLORS.green}]}>Free Event</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.ticketBtn, isPaid && s.ticketBtnPaid]} onPress={() => setIsPaid(true)}>
              <Ionicons name="card-outline" size={18} color={isPaid ? COLORS.white : '#ddd'} />
              <Text style={[s.ticketBtnTxt, isPaid && {color: COLORS.white}]}>Paid Event</Text>
            </TouchableOpacity>
          </View>

          {isPaid && (
            <>
              <View style={s.fieldWrap}>
                <Text style={s.label}>Ticket Price (USD) *</Text>
                <View style={s.priceRow}>
                  <Text style={s.dollar}>$</Text>
                  <TextInput style={[s.input, {flex:1}, !!errors.ticketPrice && s.inputErr]} placeholder="0.00" placeholderTextColor={COLORS.placeholder} value={ticketPrice} onChangeText={v => { setTicketPrice(v); setErrors(e => ({...e,ticketPrice:''})); }} keyboardType="decimal-pad" />
                </View>
                {!!errors.ticketPrice && <Text style={s.errTxt}>{errors.ticketPrice}</Text>}
              </View>

              {price > 0 && (
                <View style={s.feeCard}>
                  <Text style={s.feeTitle}>Fee Breakdown</Text>
                  <View style={s.feeRow}>
                    <Text style={s.feeLbl}>Ticket Price</Text>
                    <Text style={s.feeVal}>${price.toFixed(2)}</Text>
                  </View>
                  <View style={s.feeRow}>
                    <Text style={s.feeLbl}>Platform Fee (1.5%)</Text>
                    <Text style={[s.feeVal, {color: COLORS.red}]}>-${platformFee.toFixed(2)}</Text>
                  </View>
                  <View style={[s.feeRow, s.feeTotalRow]}>
                    <Text style={s.feeTotalLbl}>You Receive</Text>
                    <Text style={[s.feeVal, {color: COLORS.green, fontWeight:'700', fontSize:16}]}>${creatorPayout.toFixed(2)}</Text>
                  </View>
                  <View style={s.stripeRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#aaa" />
                    <Text style={s.stripeTxt}>Payments processed via Stripe. Connect your Stripe account in Settings to receive payouts.</Text>
                  </View>
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={[s.publishFullBtn, submitting && {opacity:0.5}]} onPress={handlePublish} disabled={submitting} activeOpacity={0.88}>
            <Ionicons name={submitting ? 'hourglass-outline' : 'checkmark-circle'} size={20} color={COLORS.white} />
            <Text style={s.publishFullBtnTxt}>{submitting ? 'Publishing...' : 'Publish Event'}</Text>
          </TouchableOpacity>

          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  placeholder:{color:COLORS.placeholder},
  errTxt:{fontSize:12,color:COLORS.red,marginTop:4},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14},
  pickerTxt:{fontSize:15,color:COLORS.navy},
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
  addSpeakerRow:{flexDirection:'row',alignItems:'center',marginBottom:14},
  addBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  toggleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,marginBottom:14},
  toggleLeft:{flexDirection:'row',alignItems:'center',gap:10},
  toggleLabel:{fontSize:15,color:COLORS.navy,fontWeight:'600'},
  ticketRow:{flexDirection:'row',gap:10,marginBottom:16},
  ticketBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  ticketBtnFree:{borderColor:COLORS.green,backgroundColor:'#e8f5e9'},
  ticketBtnPaid:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  ticketBtnTxt:{fontSize:14,fontWeight:'700',color:'#aaa'},
  priceRow:{flexDirection:'row',alignItems:'center',gap:8},
  dollar:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  feeCard:{backgroundColor:COLORS.lightBg,borderRadius:14,padding:16,marginBottom:16},
  feeTitle:{fontSize:12,fontWeight:'700',color:COLORS.navy,marginBottom:12,textTransform:'uppercase',letterSpacing:0.5},
  feeRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  feeLbl:{fontSize:14,color:'#666'},
  feeVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  feeTotalRow:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,marginTop:4},
  feeTotalLbl:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  stripeRow:{flexDirection:'row',alignItems:'flex-start',gap:6,marginTop:10},
  stripeTxt:{fontSize:12,color:'#aaa',flex:1,lineHeight:17},
  publishFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,marginTop:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  publishFullBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
EOF
echo "create-event.tsx created"

# Update events tab to include user events
python3 << 'PYEOF'
content = open('app/(tabs)/events.tsx').read()
if 'eventsStore' not in content:
    content = content.replace(
        "import { COLORS, EVENTS } from '../../src/lib/constants';",
        "import { COLORS, EVENTS } from '../../src/lib/constants';\nimport { useEvents } from '../../src/lib/eventsStore';"
    )
    content = content.replace(
        "  const [savedEvents, setSavedEvents] = useState<string[]>([]);",
        "  const userEvents = useEvents();\n  const [savedEvents, setSavedEvents] = useState<string[]>([]);"
    )
    content = content.replace(
        "  let filtered = EVENTS.filter(e => {",
        "  const allEvents = [...userEvents.map((e:any) => ({ ...e, attending: 0 })), ...EVENTS];\n  let filtered = allEvents.filter((e:any) => {"
    )
    open('app/(tabs)/events.tsx', 'w').write(content)
    print('events tab updated')
else:
    print('events tab already updated')
PYEOF

echo "ALL DONE"
