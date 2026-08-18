#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── 1. UPDATE eventsStore with full data model ──────────
cat > src/lib/eventsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type AgendaItem = { time: string; activity: string };
export type Speaker = { name: string; role: string; initials: string; color: string };
export type VenueType = 'in-person' | 'online' | 'hybrid';
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type EventStatus = 'upcoming' | 'active' | 'past' | 'draft';

export type AppEvent = {
  id: string;
  status: EventStatus;
  title: string;
  description: string;
  summary: string;
  organizer: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  price: string;
  isPaid: boolean;
  ticketPrice: number;
  platformFee: number;
  creatorPayout: number;
  ticketsSold: number;
  bannerImage?: string;
  venueLayoutImage?: string;
  bannerColor: [string, string];
  speakers: Speaker[];
  agenda: AgendaItem[];
  experience: string[];
  audience: string;
  venueType: VenueType;
  venueName: string;
  venueAddress: string;
  venueInstructions: string;
  parking: string;
  liveStreamUrl: string;
  meetingUrl: string;
  platform: string;
  hasLiveStream: boolean;
  recurrence: RecurrenceType;
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

export function getEvents() { return [...events]; }
export function getUpcomingEvents() { return events.filter(e => e.status !== 'past' && e.status !== 'draft'); }
export function getUserEvents() { return [...events].sort((a,b) => b.createdAt - a.createdAt); }

export function addEvent(event: Omit<AppEvent, 'id' | 'createdAt' | 'bannerColor' | 'platformFee' | 'creatorPayout' | 'ticketsSold' | 'attending'>) {
  const idx = events.length % GRADIENTS.length;
  const platformFee = event.isPaid ? parseFloat((event.ticketPrice * 0.015).toFixed(2)) : 0;
  const creatorPayout = event.isPaid ? parseFloat((event.ticketPrice - platformFee).toFixed(2)) : 0;
  const newEvent: AppEvent = {
    ...event,
    id: 'user_' + Date.now().toString(),
    createdAt: Date.now(),
    bannerColor: GRADIENTS[idx],
    platformFee,
    creatorPayout,
    ticketsSold: 0,
    attending: 0,
  };
  events = [newEvent, ...events];
  notify();
  return newEvent;
}

export function updateEvent(id: string, updates: Partial<AppEvent>) {
  events = events.map(e => e.id === id ? { ...e, ...updates } : e);
  notify();
}

export function deleteEvent(id: string) {
  events = events.filter(e => e.id !== id);
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

export function useUserEvents() {
  const [state, setState] = useState(getUserEvents());
  useEffect(() => {
    const fn = () => setState(getUserEvents());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

// Earnings calculations
export function getEarnings() {
  const paidEvents = events.filter(e => e.isPaid);
  const grossRevenue = paidEvents.reduce((sum, e) => sum + (e.ticketPrice * e.ticketsSold), 0);
  const totalFees = paidEvents.reduce((sum, e) => sum + (e.platformFee * e.ticketsSold), 0);
  const netRevenue = grossRevenue - totalFees;
  const totalTickets = events.reduce((sum, e) => sum + e.ticketsSold, 0);
  const totalAttendees = events.reduce((sum, e) => sum + e.attending, 0);
  return { grossRevenue, totalFees, netRevenue, totalTickets, totalAttendees, pendingPayout: netRevenue * 0.7, completedPayout: netRevenue * 0.3 };
}
EOF
echo "eventsStore done"

# ── 2. CREATE EVENT SCREEN ──────────────────────────────
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
const RECURRENCE_OPTIONS = [
  { id: 'once', label: 'One-Time Event', icon: 'calendar-outline' },
  { id: 'daily', label: 'Daily', icon: 'sunny-outline' },
  { id: 'weekly', label: 'Weekly', icon: 'repeat-outline' },
  { id: 'biweekly', label: 'Bi-Weekly', icon: 'git-compare-outline' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-number-outline' },
  { id: 'yearly', label: 'Yearly', icon: 'star-outline' },
];
const VENUE_TYPES = [
  { id: 'in-person', label: 'In-Person', icon: 'location-outline' },
  { id: 'online', label: 'Online', icon: 'wifi-outline' },
  { id: 'hybrid', label: 'Hybrid', icon: 'git-merge-outline' },
];
const PLATFORMS = ['Zoom', 'YouTube Live', 'Facebook Live', 'Church Streaming', 'Vimeo', 'Other'];
const STEPS = ['Basic Info', 'Details', 'Venue', 'Agenda', 'Tickets'];

export default function CreateEventScreen() {
  const user = getUser();
  const [step, setStep] = useState(0);

  // Basic Info
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(
    user.accountType === 'church' ? (user.churchName || '') : ((user.firstName || '') + ' ' + (user.lastName || '')).trim()
  );
  const [eventType, setEventType] = useState('');
  const [showTypes, setShowTypes] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [bannerImage, setBannerImage] = useState('');

  // Details
  const [summary, setSummary] = useState('');
  const [experience, setExperience] = useState('');
  const [audience, setAudience] = useState('');
  const [speakers, setSpeakers] = useState<{name:string;role:string}[]>([]);
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [notes, setNotes] = useState('');

  // Venue
  const [venueType, setVenueType] = useState('in-person');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [zip, setZip] = useState('');
  const [parking, setParking] = useState('');
  const [venueInstructions, setVenueInstructions] = useState('');
  const [liveStreamUrl, setLiveStreamUrl] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [platform, setPlatform] = useState('');
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [venueLayoutImage, setVenueLayoutImage] = useState('');

  // Agenda
  const [agendaItems, setAgendaItems] = useState<{time:string;activity:string}[]>([]);
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaActivity, setAgendaActivity] = useState('');

  // Tickets
  const [isPaid, setIsPaid] = useState(false);
  const [ticketPrice, setTicketPrice] = useState('');
  const [saveDraft, setSaveDraft] = useState(false);

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

  async function handlePickVenueLayout() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled) setVenueLayoutImage(result.assets[0].uri);
  }

  function addSpeaker() {
    if (!speakerName.trim()) return;
    setSpeakers(p => [...p, { name: speakerName.trim(), role: speakerRole.trim() || 'Speaker' }]);
    setSpeakerName(''); setSpeakerRole('');
  }

  function addAgendaItem() {
    if (!agendaTime.trim() || !agendaActivity.trim()) return;
    setAgendaItems(p => [...p, { time: agendaTime.trim(), activity: agendaActivity.trim() }]);
    setAgendaTime(''); setAgendaActivity('');
  }

  function validateStep(s: number): boolean {
    const e: Record<string,string> = {};
    if (s === 0) {
      if (!title.trim()) e.title = 'Required';
      if (!eventType) e.eventType = 'Required';
      if (!date.trim()) e.date = 'Required';
    }
    if (s === 2) {
      if (venueType !== 'online' && !venueAddress.trim()) e.venueAddress = 'Required';
    }
    if (s === 4) {
      if (isPaid && price <= 0) e.ticketPrice = 'Enter valid price';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() { setStep(s => Math.max(s - 1, 0)); }

  async function handlePublish(draft = false) {
    if (!validateStep(step)) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const location = [venueAddress, city, stateName, zip].filter(Boolean).join(', ');
    addEvent({
      status: draft ? 'draft' : 'upcoming',
      title: title.trim(),
      description: summary.trim(),
      summary: summary.trim(),
      organizer: organizer.trim(),
      date: date.trim(),
      time: time.trim(),
      endTime: endTime.trim(),
      location: location || venueName,
      city: city.trim(),
      state: stateName.trim(),
      zip: zip.trim(),
      type: eventType,
      price: isPaid ? '$' + price.toFixed(2) : 'Free',
      isPaid,
      ticketPrice: price,
      bannerImage: bannerImage || undefined,
      venueLayoutImage: venueLayoutImage || undefined,
      speakers: speakers.map((sp, i) => ({
        ...sp,
        initials: sp.name.split(' ').map((w:string) => w[0]).join('').toUpperCase().slice(0,2),
        color: SPEAKER_COLORS[i % SPEAKER_COLORS.length],
      })),
      agenda: agendaItems,
      experience: experience.split('\n').filter((l:string) => l.trim()),
      audience: audience.trim() || 'All are welcome',
      venueType: venueType as any,
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      venueInstructions: venueInstructions.trim(),
      parking: parking.trim(),
      liveStreamUrl: liveStreamUrl.trim(),
      meetingUrl: meetingUrl.trim(),
      platform: platform.trim(),
      hasLiveStream: venueType === 'online' || venueType === 'hybrid',
      recurrence: recurrence as any,
      notes: notes.trim(),
    });
    setSubmitting(false);
    if (draft) {
      Alert.alert('Saved as Draft', 'Find it in Settings → My Events', [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('Event Published! 🎉', '"' + title + '" is now live.', [
        { text: 'View Events', onPress: () => router.replace('/(tabs)/events') }
      ]);
    }
  }

  const recurrenceLabel = RECURRENCE_OPTIONS.find(r => r.id === recurrence)?.label || 'One-Time Event';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => step === 0 ? router.back() : prevStep()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Create Event</Text>
        <TouchableOpacity onPress={() => handlePublish(true)}>
          <Text style={s.draftTxt}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Step indicator */}
      <View style={s.stepsRow}>
        {STEPS.map((label, i) => (
          <TouchableOpacity key={i} style={s.stepWrap} onPress={() => i < step && setStep(i)}>
            <View style={[s.stepDot, i === step && s.stepDotActive, i < step && s.stepDotDone]}>
              {i < step
                ? <Ionicons name="checkmark" size={12} color={COLORS.white} />
                : <Text style={[s.stepNum, i === step && s.stepNumActive]}>{i+1}</Text>
              }
            </View>
            <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.stepProgress}>
        <View style={[s.stepProgressFill, { width: ((step + 1) / STEPS.length * 100) + '%' }]} />
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* STEP 0: Basic Info */}
          {step === 0 && (
            <>
              <TouchableOpacity style={s.bannerPicker} onPress={handlePickBanner}>
                {bannerImage
                  ? <Image source={{ uri: bannerImage }} style={s.bannerImg} resizeMode="cover" />
                  : <View style={s.bannerPlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#bbb" />
                      <Text style={s.bannerPlaceholderTxt}>Add Event Banner</Text>
                      <Text style={s.bannerSub}>Tap to upload · 16:9 recommended</Text>
                    </View>
                }
              </TouchableOpacity>

              <Field label="Event Title *" error={errors.title}>
                <TextInput style={[s.input, !!errors.title && s.inputErr]} placeholder="Women of Purpose Conference" placeholderTextColor={COLORS.placeholder} value={title} onChangeText={v => { setTitle(v); setErrors(e => ({...e,title:''})); }} />
              </Field>

              <Field label="Organizer / Church">
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={organizer} onChangeText={setOrganizer} />
              </Field>

              <Field label="Event Type *" error={errors.eventType}>
                <TouchableOpacity style={[s.picker, !!errors.eventType && s.inputErr]} onPress={() => setShowTypes(!showTypes)}>
                  <Text style={[s.pickerTxt, !eventType && s.pickerPlaceholder]}>{eventType || 'Select type'}</Text>
                  <Ionicons name={showTypes ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
                </TouchableOpacity>
                {showTypes && (
                  <View style={s.dropList}>
                    {EVENT_TYPES.map(t => (
                      <TouchableOpacity key={t} style={[s.dropItem, eventType===t && s.dropItemActive]} onPress={() => { setEventType(t); setShowTypes(false); setErrors(e => ({...e,eventType:''})); }}>
                        <Text style={[s.dropTxt, eventType===t && {color:COLORS.navy,fontWeight:'700'}]}>{t}</Text>
                        {eventType===t && <Ionicons name="checkmark" size={16} color={COLORS.gold} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Field>

              <View style={s.row3}>
                <View style={{flex:1,marginRight:8}}>
                  <Field label="Date *" error={errors.date}>
                    <TextInput style={[s.input, !!errors.date && s.inputErr]} placeholder="Apr 18, 2026" placeholderTextColor={COLORS.placeholder} value={date} onChangeText={v => { setDate(v); setErrors(e=>({...e,date:''})); }} />
                  </Field>
                </View>
                <View style={{flex:1,marginRight:8}}>
                  <Field label="Start Time">
                    <TextInput style={s.input} placeholder="6:00 PM" placeholderTextColor={COLORS.placeholder} value={time} onChangeText={setTime} />
                  </Field>
                </View>
                <View style={{flex:1}}>
                  <Field label="End Time">
                    <TextInput style={s.input} placeholder="9:00 PM" placeholderTextColor={COLORS.placeholder} value={endTime} onChangeText={setEndTime} />
                  </Field>
                </View>
              </View>

              {/* Recurrence */}
              <Text style={s.fieldLabel}>Repeat Event</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:20}}>
                {RECURRENCE_OPTIONS.map(r => (
                  <TouchableOpacity key={r.id} style={[s.recurrenceBtn, recurrence===r.id && s.recurrenceBtnActive]} onPress={() => setRecurrence(r.id)}>
                    <Ionicons name={r.icon as any} size={16} color={recurrence===r.id ? COLORS.white : '#888'} />
                    <Text style={[s.recurrenceTxt, recurrence===r.id && s.recurrenceTxtActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* STEP 1: Details */}
          {step === 1 && (
            <>
              <Field label="Event Summary">
                <TextInput style={[s.input, s.multiline]} placeholder="What is this event about?" placeholderTextColor={COLORS.placeholder} value={summary} onChangeText={setSummary} multiline />
              </Field>
              <Field label="What Will Happen" hint="(one item per line)">
                <TextInput style={[s.input, s.multilineLg]} placeholder={'Worship\nMessage\nPrayer\nFellowship'} placeholderTextColor={COLORS.placeholder} value={experience} onChangeText={setExperience} multiline />
              </Field>
              <Field label="Target Audience">
                <TextInput style={s.input} placeholder="All ages, families welcome" placeholderTextColor={COLORS.placeholder} value={audience} onChangeText={setAudience} />
              </Field>

              {/* Speakers */}
              <Text style={s.fieldLabel}>Speakers & Guests</Text>
              {speakers.map((sp, i) => (
                <View key={i} style={s.speakerTag}>
                  <View style={[s.speakerAvatar, {backgroundColor: SPEAKER_COLORS[i % SPEAKER_COLORS.length]}]}>
                    <Text style={s.speakerAvatarTxt}>{sp.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.speakerName}>{sp.name}</Text>
                    <Text style={s.speakerRole}>{sp.role}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSpeakers(p => p.filter((_,idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={20} color="#ddd" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={s.addRow}>
                <TextInput style={[s.input, {flex:2, marginRight:8}]} placeholder="Speaker name" placeholderTextColor={COLORS.placeholder} value={speakerName} onChangeText={setSpeakerName} />
                <TextInput style={[s.input, {flex:1, marginRight:8}]} placeholder="Role" placeholderTextColor={COLORS.placeholder} value={speakerRole} onChangeText={setSpeakerRole} />
                <TouchableOpacity style={s.addBtn} onPress={addSpeaker}>
                  <Ionicons name="add" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Field label="Additional Notes">
                <TextInput style={[s.input, s.multiline]} placeholder="Any other information..." placeholderTextColor={COLORS.placeholder} value={notes} onChangeText={setNotes} multiline />
              </Field>
            </>
          )}

          {/* STEP 2: Venue */}
          {step === 2 && (
            <>
              <Text style={s.fieldLabel}>Venue Type</Text>
              <View style={s.venueTypeRow}>
                {VENUE_TYPES.map(v => (
                  <TouchableOpacity key={v.id} style={[s.venueTypeBtn, venueType===v.id && s.venueTypeBtnActive]} onPress={() => setVenueType(v.id)}>
                    <Ionicons name={v.icon as any} size={22} color={venueType===v.id ? COLORS.white : '#888'} />
                    <Text style={[s.venueTypeTxt, venueType===v.id && s.venueTypeTxtActive]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(venueType === 'in-person' || venueType === 'hybrid') && (
                <>
                  <Field label="Venue Name">
                    <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={venueName} onChangeText={setVenueName} />
                  </Field>
                  <Field label="Street Address *" error={errors.venueAddress}>
                    <TextInput style={[s.input, !!errors.venueAddress && s.inputErr]} placeholder="123 Faith Ave" placeholderTextColor={COLORS.placeholder} value={venueAddress} onChangeText={v => { setVenueAddress(v); setErrors(e=>({...e,venueAddress:''})); }} />
                  </Field>
                  <View style={s.row3}>
                    <View style={{flex:2, marginRight:8}}>
                      <Field label="City">
                        <TextInput style={s.input} placeholder="New York" placeholderTextColor={COLORS.placeholder} value={city} onChangeText={setCity} />
                      </Field>
                    </View>
                    <View style={{flex:1, marginRight:8}}>
                      <Field label="State">
                        <TextInput style={s.input} placeholder="NY" placeholderTextColor={COLORS.placeholder} value={stateName} onChangeText={setStateName} />
                      </Field>
                    </View>
                    <View style={{flex:1}}>
                      <Field label="Zip">
                        <TextInput style={s.input} placeholder="10001" placeholderTextColor={COLORS.placeholder} value={zip} onChangeText={setZip} keyboardType="number-pad" />
                      </Field>
                    </View>
                  </View>
                  <Field label="Parking Information">
                    <TextInput style={s.input} placeholder="Free parking on site" placeholderTextColor={COLORS.placeholder} value={parking} onChangeText={setParking} />
                  </Field>
                  <Field label="Venue Instructions">
                    <TextInput style={[s.input, s.multiline]} placeholder="Enter through the main doors..." placeholderTextColor={COLORS.placeholder} value={venueInstructions} onChangeText={setVenueInstructions} multiline />
                  </Field>
                </>
              )}

              {(venueType === 'online' || venueType === 'hybrid') && (
                <>
                  <Field label="Platform">
                    <TouchableOpacity style={s.picker} onPress={() => setShowPlatforms(!showPlatforms)}>
                      <Text style={[s.pickerTxt, !platform && s.pickerPlaceholder]}>{platform || 'Select platform'}</Text>
                      <Ionicons name={showPlatforms ? 'chevron-up' : 'chevron-down'} size={18} color="#bbb" />
                    </TouchableOpacity>
                    {showPlatforms && (
                      <View style={s.dropList}>
                        {PLATFORMS.map(p => (
                          <TouchableOpacity key={p} style={[s.dropItem, platform===p && s.dropItemActive]} onPress={() => { setPlatform(p); setShowPlatforms(false); }}>
                            <Text style={[s.dropTxt, platform===p && {color:COLORS.navy,fontWeight:'700'}]}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </Field>
                  <Field label="Livestream URL">
                    <TextInput style={s.input} placeholder="https://youtube.com/live/..." placeholderTextColor={COLORS.placeholder} value={liveStreamUrl} onChangeText={setLiveStreamUrl} autoCapitalize="none" />
                  </Field>
                  <Field label="Meeting URL">
                    <TextInput style={s.input} placeholder="https://zoom.us/j/..." placeholderTextColor={COLORS.placeholder} value={meetingUrl} onChangeText={setMeetingUrl} autoCapitalize="none" />
                  </Field>
                </>
              )}

              {/* Venue Layout */}
              <Text style={s.fieldLabel}>Venue Layout <Text style={s.optionalTxt}>(Optional)</Text></Text>
              <TouchableOpacity style={s.uploadBox} onPress={handlePickVenueLayout}>
                {venueLayoutImage
                  ? <Image source={{ uri: venueLayoutImage }} style={s.venueLayoutImg} resizeMode="contain" />
                  : <View style={s.uploadBoxInner}>
                      <Ionicons name="map-outline" size={28} color="#bbb" />
                      <Text style={s.uploadBoxTxt}>Upload venue map or seating chart</Text>
                    </View>
                }
              </TouchableOpacity>
            </>
          )}

          {/* STEP 3: Agenda */}
          {step === 3 && (
            <>
              <Text style={s.agendaDesc}>Build your event timeline. Add activities in order.</Text>
              {agendaItems.map((item, i) => (
                <View key={i} style={s.agendaItem}>
                  <View style={s.agendaTimeWrap}>
                    <Text style={s.agendaTime}>{item.time}</Text>
                  </View>
                  <View style={s.agendaDot} />
                  <Text style={s.agendaActivity}>{item.activity}</Text>
                  <TouchableOpacity onPress={() => setAgendaItems(p => p.filter((_,idx) => idx !== i))}>
                    <Ionicons name="close-circle" size={18} color="#ddd" />
                  </TouchableOpacity>
                </View>
              ))}
              {agendaItems.length > 0 && <View style={s.agendaDivider} />}
              <View style={s.addRow}>
                <TextInput style={[s.input, {width:100, marginRight:8}]} placeholder="6:00 PM" placeholderTextColor={COLORS.placeholder} value={agendaTime} onChangeText={setAgendaTime} />
                <TextInput style={[s.input, {flex:1, marginRight:8}]} placeholder="Worship" placeholderTextColor={COLORS.placeholder} value={agendaActivity} onChangeText={setAgendaActivity} />
                <TouchableOpacity style={s.addBtn} onPress={addAgendaItem}>
                  <Ionicons name="add" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              {agendaItems.length === 0 && (
                <View style={s.agendaEmpty}>
                  <Ionicons name="time-outline" size={40} color="#ddd" />
                  <Text style={s.agendaEmptyTxt}>No agenda items yet</Text>
                  <Text style={s.agendaEmptySub}>Add a time and activity above</Text>
                </View>
              )}
            </>
          )}

          {/* STEP 4: Tickets */}
          {step === 4 && (
            <>
              <View style={s.ticketRow}>
                <TouchableOpacity style={[s.ticketBtn, !isPaid && s.ticketBtnFree]} onPress={() => setIsPaid(false)}>
                  <Ionicons name="checkmark-circle" size={20} color={!isPaid ? COLORS.green : '#ddd'} />
                  <Text style={[s.ticketBtnTxt, !isPaid && {color:COLORS.green}]}>Free Event</Text>
                  <Text style={s.ticketBtnSub}>No payment required</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.ticketBtn, isPaid && s.ticketBtnPaid]} onPress={() => setIsPaid(true)}>
                  <Ionicons name="card-outline" size={20} color={isPaid ? COLORS.white : '#ddd'} />
                  <Text style={[s.ticketBtnTxt, isPaid && {color:COLORS.white}]}>Paid Event</Text>
                  <Text style={[s.ticketBtnSub, isPaid && {color:'rgba(255,255,255,0.7)'}]}>Set ticket price</Text>
                </TouchableOpacity>
              </View>

              {isPaid && (
                <>
                  <Field label="Ticket Price (USD) *" error={errors.ticketPrice}>
                    <View style={s.priceRow}>
                      <Text style={s.dollar}>$</Text>
                      <TextInput style={[s.input, {flex:1}, !!errors.ticketPrice && s.inputErr]} placeholder="0.00" placeholderTextColor={COLORS.placeholder} value={ticketPrice} onChangeText={v => { setTicketPrice(v); setErrors(e=>({...e,ticketPrice:''})); }} keyboardType="decimal-pad" />
                    </View>
                  </Field>
                  {price > 0 && (
                    <View style={s.feeCard}>
                      <Text style={s.feeCardTitle}>Revenue Breakdown</Text>
                      <View style={s.feeRow}><Text style={s.feeLbl}>Ticket Price</Text><Text style={s.feeVal}>${price.toFixed(2)}</Text></View>
                      <View style={s.feeRow}><Text style={s.feeLbl}>Platform Fee (1.5%)</Text><Text style={[s.feeVal,{color:COLORS.red}]}>-${platformFee.toFixed(2)}</Text></View>
                      <View style={[s.feeRow,s.feeTotalRow]}><Text style={s.feeTotalLbl}>You Receive</Text><Text style={[s.feeVal,{color:COLORS.green,fontWeight:'700',fontSize:17}]}>${creatorPayout.toFixed(2)}</Text></View>
                      <View style={s.stripeRow}>
                        <Ionicons name="card-outline" size={14} color={COLORS.gold} />
                        <Text style={s.stripeTxt}>Payments processed via Stripe. Connect your account in Settings → Earnings to receive payouts.</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              <View style={s.reviewCard}>
                <Text style={s.reviewTitle}>Event Summary</Text>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Title</Text><Text style={s.reviewVal} numberOfLines={1}>{title || '—'}</Text></View>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Type</Text><Text style={s.reviewVal}>{eventType || '—'}</Text></View>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Date</Text><Text style={s.reviewVal}>{date || '—'}</Text></View>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Venue</Text><Text style={s.reviewVal}>{venueType}</Text></View>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Schedule</Text><Text style={s.reviewVal}>{RECURRENCE_OPTIONS.find(r=>r.id===recurrence)?.label}</Text></View>
                <View style={s.reviewRow}><Text style={s.reviewLbl}>Admission</Text><Text style={s.reviewVal}>{isPaid ? '$'+price.toFixed(2) : 'Free'}</Text></View>
              </View>
            </>
          )}

          {/* Navigation */}
          <View style={s.navRow}>
            {step > 0 && (
              <TouchableOpacity style={s.prevBtn} onPress={prevStep}>
                <Ionicons name="arrow-back" size={18} color={COLORS.navy} />
                <Text style={s.prevBtnTxt}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.nextBtn, submitting && {opacity:0.5}]}
              onPress={step === STEPS.length - 1 ? () => handlePublish(false) : nextStep}
              disabled={submitting}
            >
              <Text style={s.nextBtnTxt}>{step === STEPS.length - 1 ? (submitting ? 'Publishing...' : 'Publish Event') : 'Next'}</Text>
              {step < STEPS.length - 1 && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
              {step === STEPS.length - 1 && !submitting && <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />}
            </TouchableOpacity>
          </View>

          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, hint, error, children }: { label:string; hint?:string; error?:string; children:React.ReactNode }) {
  return (
    <View style={{marginBottom:14}}>
      <Text style={fs.label}>{label}{hint && <Text style={fs.hint}> {hint}</Text>}</Text>
      {children}
      {!!error && <Text style={fs.err}>{error}</Text>}
    </View>
  );
}
const fs = StyleSheet.create({
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  hint:{fontWeight:'400',color:'#bbb',fontSize:11},
  err:{fontSize:12,color:COLORS.red,marginTop:4},
});

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  draftTxt:{fontSize:14,color:COLORS.gold,fontWeight:'600'},
  stepsRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:16,paddingBottom:8},
  stepWrap:{flex:1,alignItems:'center',gap:4},
  stepDot:{width:26,height:26,borderRadius:13,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  stepDotActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  stepDotDone:{backgroundColor:COLORS.green,borderColor:COLORS.green},
  stepNum:{fontSize:11,fontWeight:'700',color:'#aaa'},
  stepNumActive:{color:COLORS.white},
  stepLabel:{fontSize:9,color:'#aaa',fontWeight:'600',textAlign:'center'},
  stepLabelActive:{color:COLORS.navy},
  stepProgress:{height:3,backgroundColor:COLORS.lightBg,marginHorizontal:16,borderRadius:2,marginBottom:16},
  stepProgressFill:{height:3,backgroundColor:COLORS.navy,borderRadius:2},
  scroll:{paddingHorizontal:20},
  bannerPicker:{height:160,borderRadius:16,overflow:'hidden',borderWidth:1.5,borderColor:COLORS.border,marginBottom:20,borderStyle:'dashed'},
  bannerImg:{width:'100%',height:'100%'},
  bannerPlaceholder:{flex:1,alignItems:'center',justifyContent:'center',gap:6,backgroundColor:COLORS.lightBg},
  bannerPlaceholderTxt:{fontSize:14,fontWeight:'600',color:'#aaa'},
  bannerSub:{fontSize:11,color:'#ccc'},
  fieldLabel:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  optionalTxt:{fontWeight:'400',color:'#bbb',fontSize:11},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:COLORS.navy},
  inputErr:{borderColor:COLORS.red},
  multiline:{height:80,textAlignVertical:'top',paddingTop:12},
  multilineLg:{height:110,textAlignVertical:'top',paddingTop:12},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:14,paddingVertical:13},
  pickerTxt:{fontSize:14,color:COLORS.navy},
  pickerPlaceholder:{color:COLORS.placeholder},
  dropList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,marginTop:4,overflow:'hidden'},
  dropItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  dropItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  dropTxt:{fontSize:14,color:'#555'},
  row3:{flexDirection:'row'},
  recurrenceBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:14,paddingVertical:8,marginRight:8},
  recurrenceBtnActive:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  recurrenceTxt:{fontSize:12,fontWeight:'600',color:'#888'},
  recurrenceTxtActive:{color:COLORS.white},
  venueTypeRow:{flexDirection:'row',gap:8,marginBottom:16},
  venueTypeBtn:{flex:1,alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  venueTypeBtnActive:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  venueTypeTxt:{fontSize:12,fontWeight:'700',color:'#888'},
  venueTypeTxtActive:{color:COLORS.white},
  uploadBox:{height:140,borderRadius:14,borderWidth:1.5,borderColor:COLORS.border,borderStyle:'dashed',overflow:'hidden',marginBottom:16},
  uploadBoxInner:{flex:1,alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.lightBg},
  uploadBoxTxt:{fontSize:13,color:'#bbb'},
  venueLayoutImg:{width:'100%',height:'100%'},
  agendaDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:21},
  agendaItem:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:10},
  agendaTimeWrap:{backgroundColor:COLORS.navy,borderRadius:8,paddingHorizontal:10,paddingVertical:5,minWidth:70,alignItems:'center'},
  agendaTime:{fontSize:12,fontWeight:'700',color:COLORS.white},
  agendaDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.gold},
  agendaActivity:{flex:1,fontSize:14,color:COLORS.navy,fontWeight:'500'},
  agendaDivider:{height:1,backgroundColor:COLORS.border,marginBottom:16},
  agendaEmpty:{paddingVertical:30,alignItems:'center',gap:8},
  agendaEmptyTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  agendaEmptySub:{fontSize:12,color:'#ddd'},
  speakerTag:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:COLORS.border,borderRadius:12,marginBottom:8},
  speakerAvatar:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  speakerAvatarTxt:{color:COLORS.white,fontWeight:'700',fontSize:13},
  speakerName:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  speakerRole:{fontSize:12,color:'#888'},
  addRow:{flexDirection:'row',alignItems:'center',marginBottom:16},
  addBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  ticketRow:{flexDirection:'row',gap:10,marginBottom:16},
  ticketBtn:{flex:1,alignItems:'center',gap:4,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:16},
  ticketBtnFree:{borderColor:COLORS.green,backgroundColor:'#e8f5e9'},
  ticketBtnPaid:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  ticketBtnTxt:{fontSize:14,fontWeight:'700',color:'#aaa'},
  ticketBtnSub:{fontSize:11,color:'#bbb'},
  priceRow:{flexDirection:'row',alignItems:'center',gap:8},
  dollar:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  feeCard:{backgroundColor:COLORS.lightBg,borderRadius:14,padding:16,marginBottom:16},
  feeCardTitle:{fontSize:12,fontWeight:'700',color:COLORS.navy,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
  feeRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  feeLbl:{fontSize:14,color:'#666'},
  feeVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  feeTotalRow:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,marginTop:4},
  feeTotalLbl:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  stripeRow:{flexDirection:'row',alignItems:'flex-start',gap:6,marginTop:10},
  stripeTxt:{fontSize:12,color:'#888',flex:1,lineHeight:17},
  reviewCard:{backgroundColor:COLORS.lightBg,borderRadius:14,padding:16,marginBottom:16},
  reviewTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,marginBottom:12},
  reviewRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  reviewLbl:{fontSize:13,color:'#888'},
  reviewVal:{fontSize:13,color:COLORS.navy,fontWeight:'600',maxWidth:'60%',textAlign:'right'},
  navRow:{flexDirection:'row',gap:10,marginBottom:16},
  prevBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  prevBtnTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  nextBtn:{flex:2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.navy,borderRadius:14,paddingVertical:14,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  nextBtnTxt:{fontSize:15,fontWeight:'700',color:COLORS.white},
});
EOF
echo "create-event done"

# ── 3. MY EVENTS SCREEN ─────────────────────────────────
cat > app/my-events.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../src/lib/constants';
import { useUserEvents, deleteEvent, updateEvent } from '../src/lib/eventsStore';

const STATUS_TABS = ['All', 'Upcoming', 'Active', 'Past', 'Drafts'];

export default function MyEventsScreen() {
  const events = useUserEvents();
  const [activeTab, setActiveTab] = useState('All');

  const filtered = events.filter(e => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Upcoming') return e.status === 'upcoming';
    if (activeTab === 'Active') return e.status === 'active';
    if (activeTab === 'Past') return e.status === 'past';
    if (activeTab === 'Drafts') return e.status === 'draft';
    return true;
  });

  function handleDelete(id: string, title: string) {
    Alert.alert('Delete Event', 'Delete "' + title + '"? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
    ]);
  }

  function handlePublishDraft(id: string) {
    updateEvent(id, { status: 'upcoming' });
    Alert.alert('Published!', 'Your event is now live.');
  }

  const STATUS_COLORS: Record<string, string> = {
    upcoming: '#667eea',
    active: COLORS.green,
    past: '#aaa',
    draft: COLORS.gold,
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>My Events</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-event')}>
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {STATUS_TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="calendar-outline" size={48} color="#ddd" />
            <Text style={s.emptyTxt}>No events yet</Text>
            <Text style={s.emptySub}>Tap + to create your first event</Text>
            <TouchableOpacity style={s.createFirstBtn} onPress={() => router.push('/create-event')}>
              <Text style={s.createFirstBtnTxt}>Create Event</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.map(event => (
          <View key={event.id} style={s.card}>
            <LinearGradient colors={event.bannerColor} style={s.cardBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
              <View style={[s.statusBadge, {backgroundColor: STATUS_COLORS[event.status] + '33'}]}>
                <Text style={[s.statusTxt, {color: STATUS_COLORS[event.status]}]}>{event.status.toUpperCase()}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{event.title}</Text>
            </LinearGradient>
            <View style={s.cardBody}>
              <View style={s.cardInfoRow}>
                <View style={s.cardInfo}>
                  <Ionicons name="calendar-outline" size={13} color="#888" />
                  <Text style={s.cardInfoTxt}>{event.date}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Ionicons name="ticket-outline" size={13} color="#888" />
                  <Text style={s.cardInfoTxt}>{event.ticketsSold} tickets sold</Text>
                </View>
                <View style={s.cardInfo}>
                  <Ionicons name="cash-outline" size={13} color="#888" />
                  <Text style={s.cardInfoTxt}>{event.isPaid ? '$' + (event.ticketPrice * event.ticketsSold).toFixed(2) : 'Free'}</Text>
                </View>
              </View>
              <View style={s.cardActions}>
                {event.status === 'draft' && (
                  <TouchableOpacity style={s.publishBtn} onPress={() => handlePublishDraft(event.id)}>
                    <Text style={s.publishBtnTxt}>Publish</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.editBtn} onPress={() => Alert.alert('Edit Event', 'Event editing coming soon.')}>
                  <Ionicons name="create-outline" size={16} color={COLORS.navy} />
                  <Text style={s.editBtnTxt}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(event.id, event.title)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View style={{height:20}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  createBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  tabsScroll:{backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border,maxHeight:48},
  tabsContent:{paddingHorizontal:16,paddingVertical:8,gap:8},
  tab:{borderRadius:100,paddingHorizontal:16,paddingVertical:6,backgroundColor:COLORS.lightBg},
  tabActive:{backgroundColor:COLORS.navy},
  tabTxt:{fontSize:13,fontWeight:'600',color:'#888'},
  tabTxtActive:{color:COLORS.white},
  scroll:{flex:1},
  empty:{paddingVertical:60,alignItems:'center',gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:'#bbb'},
  emptySub:{fontSize:13,color:'#ddd'},
  createFirstBtn:{marginTop:8,backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  createFirstBtnTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  card:{backgroundColor:COLORS.white,marginHorizontal:16,marginTop:16,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border},
  cardBanner:{height:90,padding:12,justifyContent:'space-between'},
  statusBadge:{alignSelf:'flex-start',borderRadius:100,paddingHorizontal:10,paddingVertical:3},
  statusTxt:{fontSize:10,fontWeight:'700'},
  cardTitle:{fontSize:16,fontWeight:'700',color:COLORS.white,fontFamily:'PlayfairDisplay_700Bold'},
  cardBody:{padding:14},
  cardInfoRow:{flexDirection:'row',gap:12,marginBottom:12,flexWrap:'wrap'},
  cardInfo:{flexDirection:'row',alignItems:'center',gap:4},
  cardInfoTxt:{fontSize:12,color:'#888'},
  cardActions:{flexDirection:'row',gap:8,alignItems:'center'},
  publishBtn:{backgroundColor:COLORS.green,borderRadius:100,paddingHorizontal:16,paddingVertical:7},
  publishBtnTxt:{color:COLORS.white,fontSize:12,fontWeight:'700'},
  editBtn:{flexDirection:'row',alignItems:'center',gap:4,borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:14,paddingVertical:7},
  editBtnTxt:{fontSize:12,fontWeight:'700',color:COLORS.navy},
  deleteBtn:{width:34,height:34,borderRadius:17,borderWidth:1.5,borderColor:'#fee2e2',backgroundColor:'#fff5f5',alignItems:'center',justifyContent:'center',marginLeft:'auto'},
});
EOF
echo "my-events done"

# ── 4. EARNINGS SCREEN ──────────────────────────────────
cat > app/earnings.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../src/lib/constants';
import { useUserEvents, getEarnings } from '../src/lib/eventsStore';

const WITHDRAWAL_HISTORY = [
  { id: '1', amount: 245.50, status: 'completed', date: 'May 15, 2026', method: 'Bank Transfer' },
  { id: '2', amount: 180.00, status: 'completed', date: 'Apr 28, 2026', method: 'Bank Transfer' },
];

export default function EarningsScreen() {
  const events = useUserEvents();
  const earnings = getEarnings();
  const [activeTab, setActiveTab] = useState('Overview');
  const [showPayoutSetup, setShowPayoutSetup] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const paidEvents = events.filter(e => e.isPaid);

  function handleWithdraw() {
    if (earnings.pendingPayout <= 0) { Alert.alert('No Balance', 'You have no available balance to withdraw.'); return; }
    Alert.alert('Request Withdrawal', 'Request $' + earnings.pendingPayout.toFixed(2) + ' to your connected bank account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request', onPress: () => Alert.alert('Submitted!', 'Your withdrawal request has been submitted. Allow 3-5 business days.') },
    ]);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Earnings</Text>
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

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {activeTab === 'Overview' && (
          <>
            {/* Total earnings hero */}
            <LinearGradient colors={[COLORS.navy, '#2d2240']} style={s.heroCard} start={{x:0,y:0}} end={{x:1,y:1}}>
              <Text style={s.heroLabel}>Total Net Revenue</Text>
              <Text style={s.heroAmount}>${earnings.netRevenue.toFixed(2)}</Text>
              <View style={s.heroRow}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{earnings.totalTickets}</Text>
                  <Text style={s.heroStatLbl}>Tickets Sold</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{earnings.totalAttendees}</Text>
                  <Text style={s.heroStatLbl}>Attendees</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{paidEvents.length}</Text>
                  <Text style={s.heroStatLbl}>Paid Events</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Stats grid */}
            <View style={s.statsGrid}>
              {[
                { label: 'Gross Revenue', value: '$' + earnings.grossRevenue.toFixed(2), icon: 'trending-up', color: '#667eea' },
                { label: 'Platform Fees', value: '$' + earnings.totalFees.toFixed(2), icon: 'remove-circle', color: COLORS.red },
                { label: 'Net Revenue', value: '$' + earnings.netRevenue.toFixed(2), icon: 'checkmark-circle', color: COLORS.green },
                { label: 'Pending Payout', value: '$' + earnings.pendingPayout.toFixed(2), icon: 'time', color: COLORS.gold },
                { label: 'Completed Payout', value: '$' + earnings.completedPayout.toFixed(2), icon: 'wallet', color: '#43e97b' },
                { label: 'Total Events', value: String(events.length), icon: 'calendar', color: COLORS.navy },
              ].map((stat, i) => (
                <View key={i} style={s.statCard}>
                  <View style={[s.statIcon, {backgroundColor: stat.color + '18'}]}>
                    <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                  </View>
                  <Text style={s.statVal}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Per-event breakdown */}
            {paidEvents.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Event Breakdown</Text>
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
                <Ionicons name="cash-outline" size={48} color="#ddd" />
                <Text style={s.emptyTxt}>No earnings yet</Text>
                <Text style={s.emptySub}>Create a paid event to start earning</Text>
                <TouchableOpacity style={s.createBtn} onPress={() => router.push('/create-event')}>
                  <Text style={s.createBtnTxt}>Create Event</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'Payouts' && (
          <>
            <View style={s.balanceCard}>
              <Text style={s.balanceLbl}>Available Balance</Text>
              <Text style={s.balanceAmt}>${earnings.pendingPayout.toFixed(2)}</Text>
              <TouchableOpacity style={s.withdrawBtn} onPress={handleWithdraw}>
                <Ionicons name="arrow-up-circle" size={18} color={COLORS.white} />
                <Text style={s.withdrawBtnTxt}>Request Withdrawal</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionTitle}>Withdrawal History</Text>
            {WITHDRAWAL_HISTORY.map(w => (
              <View key={w.id} style={s.withdrawalRow}>
                <View style={[s.withdrawalIcon, {backgroundColor: w.status === 'completed' ? '#e8f5e9' : '#fff3e0'}]}>
                  <Ionicons name={w.status === 'completed' ? 'checkmark-circle' : 'time'} size={20} color={w.status === 'completed' ? COLORS.green : COLORS.gold} />
                </View>
                <View style={s.withdrawalInfo}>
                  <Text style={s.withdrawalMethod}>{w.method}</Text>
                  <Text style={s.withdrawalDate}>{w.date}</Text>
                </View>
                <View style={s.withdrawalRight}>
                  <Text style={s.withdrawalAmt}>${w.amount.toFixed(2)}</Text>
                  <View style={[s.withdrawalStatus, {backgroundColor: w.status === 'completed' ? '#e8f5e9' : '#fff3e0'}]}>
                    <Text style={[s.withdrawalStatusTxt, {color: w.status === 'completed' ? COLORS.green : COLORS.gold}]}>{w.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {activeTab === 'Settings' && (
          <>
            <Text style={s.sectionTitle}>Payout Account</Text>
            <View style={s.payoutCard}>
              <View style={s.payoutCardHdr}>
                <View style={[s.payoutIcon, {backgroundColor:'#e8f5e9'}]}>
                  <Ionicons name="business-outline" size={22} color={COLORS.green} />
                </View>
                <View>
                  <Text style={s.payoutCardTitle}>Bank Account</Text>
                  <Text style={s.payoutCardSub}>Add your bank details to receive payouts</Text>
                </View>
              </View>
              {[
                { label: 'Bank Name', placeholder: 'Chase, Wells Fargo...', value: bankName, onChange: setBankName },
                { label: 'Account Number', placeholder: '••••••••1234', value: accountNumber, onChange: setAccountNumber },
                { label: 'Routing Number', placeholder: '9 digit routing number', value: routingNumber, onChange: setRoutingNumber },
              ].map((field, i) => (
                <View key={i} style={s.payoutField}>
                  <Text style={s.payoutFieldLabel}>{field.label}</Text>
                  <View style={s.payoutInputWrap}>
                    <TextInput
                      style={s.payoutInput}
                      placeholder={field.placeholder}
                      placeholderTextColor={COLORS.placeholder}
                      value={field.value}
                      onChangeText={field.onChange}
                      secureTextEntry={field.label !== 'Bank Name'}
                      keyboardType={field.label === 'Bank Name' ? 'default' : 'number-pad'}
                    />
                  </View>
                </View>
              ))}
              <TouchableOpacity style={s.savePayoutBtn} onPress={() => Alert.alert('Saved', 'Payout account updated successfully.')}>
                <Text style={s.savePayoutBtnTxt}>Save Payout Account</Text>
              </TouchableOpacity>
            </View>

            <View style={s.stripeConnectCard}>
              <View style={s.stripeConnectHdr}>
                <Ionicons name="card-outline" size={24} color={COLORS.gold} />
                <View style={{flex:1}}>
                  <Text style={s.stripeConnectTitle}>Connect Stripe Account</Text>
                  <Text style={s.stripeConnectSub}>For instant, secure payouts</Text>
                </View>
                <View style={s.stripeBadge}><Text style={s.stripeBadgeTxt}>Recommended</Text></View>
              </View>
              <Text style={s.stripeConnectDesc}>Connect your Stripe account to receive automatic payouts within 2-3 business days after each event.</Text>
              <TouchableOpacity style={s.stripeConnectBtn} onPress={() => Alert.alert('Connect Stripe', 'You will be redirected to Stripe to connect your account.')}>
                <Ionicons name="link-outline" size={16} color={COLORS.white} />
                <Text style={s.stripeConnectBtnTxt}>Connect Stripe Account</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{height:30}} />
      </ScrollView>
    </SafeAreaView>
  );
}

import { TextInput } from 'react-native';

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  tabsRow:{flexDirection:'row',backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  tab:{flex:1,paddingVertical:12,alignItems:'center',borderBottomWidth:2,borderBottomColor:'transparent'},
  tabActive:{borderBottomColor:COLORS.navy},
  tabTxt:{fontSize:13,fontWeight:'600',color:'#aaa'},
  tabTxtActive:{color:COLORS.navy,fontWeight:'700'},
  scroll:{flex:1},
  heroCard:{margin:16,borderRadius:20,padding:20},
  heroLabel:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'600',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4},
  heroAmount:{fontSize:36,fontWeight:'700',color:COLORS.white,marginBottom:16,fontFamily:'PlayfairDisplay_700Bold'},
  heroRow:{flexDirection:'row',alignItems:'center'},
  heroStat:{flex:1,alignItems:'center'},
  heroStatVal:{fontSize:18,fontWeight:'700',color:COLORS.white},
  heroStatLbl:{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2},
  heroStatDivider:{width:1,height:30,backgroundColor:'rgba(255,255,255,0.2)'},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:16,gap:10,marginBottom:8},
  statCard:{width:'30%',flex:1,backgroundColor:COLORS.white,borderRadius:14,padding:12,borderWidth:1,borderColor:COLORS.border,alignItems:'center',gap:6},
  statIcon:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  statVal:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  statLbl:{fontSize:10,color:'#aaa',textAlign:'center'},
  section:{paddingHorizontal:16,marginBottom:16},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,paddingHorizontal:16,marginBottom:12,marginTop:4},
  eventRow:{flexDirection:'row',alignItems:'center',backgroundColor:COLORS.white,borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:COLORS.border},
  eventRowInfo:{flex:1},
  eventRowTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  eventRowDate:{fontSize:12,color:'#aaa',marginTop:2},
  eventRowStats:{alignItems:'flex-end'},
  eventRowTickets:{fontSize:12,color:'#aaa'},
  eventRowRevenue:{fontSize:15,fontWeight:'700',color:COLORS.green},
  empty:{paddingVertical:50,alignItems:'center',gap:10},
  emptyTxt:{fontSize:16,fontWeight:'700',color:'#bbb'},
  emptySub:{fontSize:13,color:'#ddd'},
  createBtn:{marginTop:8,backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  createBtnTxt:{color:COLORS.white,fontWeight:'700',fontSize:14},
  balanceCard:{margin:16,backgroundColor:COLORS.navy,borderRadius:20,padding:20,alignItems:'center'},
  balanceLbl:{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:8},
  balanceAmt:{fontSize:40,fontWeight:'700',color:COLORS.white,marginBottom:20,fontFamily:'PlayfairDisplay_700Bold'},
  withdrawBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:100,paddingHorizontal:24,paddingVertical:12},
  withdrawBtnTxt:{color:COLORS.white,fontSize:15,fontWeight:'700'},
  withdrawalRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:COLORS.white,borderRadius:12,padding:14,marginHorizontal:16,marginBottom:8,borderWidth:1,borderColor:COLORS.border},
  withdrawalIcon:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  withdrawalInfo:{flex:1},
  withdrawalMethod:{fontSize:14,fontWeight:'600',color:COLORS.navy},
  withdrawalDate:{fontSize:12,color:'#aaa',marginTop:2},
  withdrawalRight:{alignItems:'flex-end'},
  withdrawalAmt:{fontSize:15,fontWeight:'700',color:COLORS.navy,marginBottom:4},
  withdrawalStatus:{borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  withdrawalStatusTxt:{fontSize:11,fontWeight:'700'},
  payoutCard:{margin:16,backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  payoutCardHdr:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},
  payoutIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center'},
  payoutCardTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  payoutCardSub:{fontSize:12,color:'#888',marginTop:2},
  payoutField:{marginBottom:14},
  payoutFieldLabel:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  payoutInputWrap:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,overflow:'hidden'},
  payoutInput:{paddingHorizontal:14,paddingVertical:13,fontSize:14,color:COLORS.navy},
  savePayoutBtn:{backgroundColor:COLORS.navy,borderRadius:12,paddingVertical:14,alignItems:'center',marginTop:4},
  savePayoutBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
  stripeConnectCard:{margin:16,backgroundColor:COLORS.white,borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border},
  stripeConnectHdr:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},
  stripeConnectTitle:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  stripeConnectSub:{fontSize:12,color:'#888'},
  stripeBadge:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  stripeBadgeTxt:{fontSize:10,fontWeight:'700',color:COLORS.gold},
  stripeConnectDesc:{fontSize:13,color:'#666',lineHeight:20,marginBottom:14},
  stripeConnectBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.navy,borderRadius:12,paddingVertical:13},
  stripeConnectBtnTxt:{color:COLORS.white,fontSize:14,fontWeight:'700'},
});
EOF
echo "earnings done"

# ── 5. UPDATE HEADER with My Events + Earnings ──────────
python3 << 'PYEOF'
content = open('src/components/Header.tsx').read()

# Add My Events and Earnings to settings list
if 'My Events' not in content:
    content = content.replace(
        "{ icon:'calendar-outline', label:'Create Event', color:'#c9a96e' },",
        "{ icon:'calendar-outline', label:'Create Event', color:'#c9a96e' },\n              { icon:'list-outline', label:'My Events', color:'#667eea' },\n              { icon:'cash-outline', label:'Earnings', color:COLORS.green },"
    )

# Add navigation
if "'My Events'" not in content:
    content = content.replace(
        "} else if (item.label === 'Create Event') {",
        "} else if (item.label === 'My Events') {\n                  router.push('/my-events');\n                } else if (item.label === 'Earnings') {\n                  router.push('/earnings');\n                } else if (item.label === 'Create Event') {"
    )

open('src/components/Header.tsx', 'w').write(content)
print('Header updated')
PYEOF

# ── 6. UPDATE LAYOUT ────────────────────────────────────
python3 << 'PYEOF'
content = open('app/_layout.tsx').read()
added = []
if 'my-events' not in content:
    content = content.replace(
        '<Stack.Screen name="create-event" />',
        '<Stack.Screen name="create-event" />\n        <Stack.Screen name="my-events" />\n        <Stack.Screen name="earnings" />'
    )
    added.append('my-events, earnings')
open('app/_layout.tsx', 'w').write(content)
print('Layout updated:', added)
PYEOF

# ── 7. UPDATE EVENTS TAB to show user events ────────────
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
    print('Events tab updated')
else:
    print('Events tab already has eventsStore')
PYEOF

echo "ALL DONE"
