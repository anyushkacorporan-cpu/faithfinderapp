import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Switch, Alert, Image, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../src/lib/constants';
import { addEvent } from '../src/lib/eventsStore';
import { getUser } from '../src/lib/userStore';
import { useTranslation } from '../src/lib/i18n';

const EVENT_TYPES = ['Conference','Festival','Workshop','Revival','Service','Concert','Retreat','Other'];
const SPEAKER_COLORS = ['#667eea','#f093fb','#4facfe','#43e97b','#fa709a','#c9a96e'];
const RECURRENCE_OPTIONS = [
  { id:'once', label:'One-Time' },
  { id:'weekly', label:'Weekly' },
  { id:'biweekly', label:'Bi-Weekly' },
  { id:'monthly', label:'Monthly' },
  { id:'yearly', label:'Yearly' },
];
const VENUE_TYPES = [
  { id:'in-person', label:'In-Person', icon:'location-outline' },
  { id:'online', label:'Online', icon:'wifi-outline' },
  { id:'hybrid', label:'Hybrid', icon:'git-merge-outline' },
];
const PLATFORMS = ['Zoom','YouTube Live','Facebook Live','Church Streaming','Vimeo','Other'];
const STEPS = ['Basics','Details','Venue','Agenda','Tickets'];
const GRADIENT_COLORS: Record<string,[string,string]> = {
  Conference:['#667eea','#764ba2'],
  Festival:['#f093fb','#f5576c'],
  Workshop:['#4facfe','#00f2fe'],
  Revival:['#43e97b','#38f9d7'],
  Service:['#fa709a','#fee140'],
  Concert:['#c9a96e','#1a1a2e'],
  Retreat:['#0f3460','#1a1a2e'],
  Other:['#1a1a2e','#2d2240'],
};

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
}

export default function CreateEventScreen() {
  const { t } = useTranslation();
  const user = getUser();
  const [step, setStep] = useState(0);

  // Basic
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState(
    user.accountType==='church'?(user.churchName||''):((user.firstName||'')+' '+(user.lastName||'')).trim()
  );
  const [eventType, setEventType] = useState('');
  const [showTypes, setShowTypes] = useState(false);
  const [recurrence, setRecurrence] = useState('once');
  const [bannerImage, setBannerImage] = useState('');

  // Date/Time pickers
  const [startDate, setStartDate] = useState<Date|null>(null);
  const [startTime, setStartTime] = useState<Date|null>(null);
  const [endDate, setEndDate] = useState<Date|null>(null);
  const [endTime, setEndTime] = useState<Date|null>(null);
  const [pickerMode, setPickerMode] = useState<'date'|'time'>('date');
  const [pickerTarget, setPickerTarget] = useState<'startDate'|'startTime'|'endDate'|'endTime'>('startDate');
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

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
  const [showPreview, setShowPreview] = useState(false);

  const [errors, setErrors] = useState<Record<string,string>>({});
  const [submitting, setSubmitting] = useState(false);

  const price = parseFloat(ticketPrice)||0;
  const platformFee = isPaid ? parseFloat((price*0.015).toFixed(2)) : 0;
  const creatorPayout = isPaid ? parseFloat((price-platformFee).toFixed(2)) : 0;

  const displayDate = startDate
    ? (endDate && endDate.toDateString()!==startDate.toDateString()
        ? startDate.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' – '+formatDate(endDate)
        : formatDate(startDate))
    : '';
  const displayTime = startTime
    ? formatTime(startTime) + (endTime ? ' – '+formatTime(endTime) : '')
    : '';
  const displayLocation = [venueName, venueAddress, city, stateName].filter(Boolean).join(', ') ||
    (venueType==='online' ? (platform||'Online Event') : '');
  const gradient = GRADIENT_COLORS[eventType] || GRADIENT_COLORS['Other'];

  function openPicker(target: typeof pickerTarget) {
    const mode = target.includes('Time') ? 'time' : 'date';
    setPickerTarget(target);
    setPickerMode(mode);
    const current = target==='startDate'?startDate:target==='startTime'?startTime:target==='endDate'?endDate:endTime;
    setTempDate(current||new Date());
    setShowPicker(true);
  }

  function handlePickerChange(_: any, selected?: Date) {
    if (Platform.OS==='android') setShowPicker(false);
    if (!selected) return;
    setTempDate(selected);
  }

  function confirmPicker() {
    if (pickerTarget==='startDate') setStartDate(tempDate);
    else if (pickerTarget==='startTime') setStartTime(tempDate);
    else if (pickerTarget==='endDate') setEndDate(tempDate);
    else setEndTime(tempDate);
    setShowPicker(false);
  }

  async function handlePickBanner() {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!=='granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({quality:0.8,aspect:[16,9],allowsEditing:true});
    if (!result.canceled) setBannerImage(result.assets[0].uri);
  }

  async function handlePickVenueLayout() {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!=='granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({quality:0.8,allowsEditing:true});
    if (!result.canceled) setVenueLayoutImage(result.assets[0].uri);
  }

  function addSpeaker() {
    if (!speakerName.trim()) return;
    setSpeakers(p=>[...p,{name:speakerName.trim(),role:speakerRole.trim()||'Speaker'}]);
    setSpeakerName(''); setSpeakerRole('');
  }

  function addAgendaItem() {
    if (!agendaTime.trim()||!agendaActivity.trim()) return;
    setAgendaItems(p=>[...p,{time:agendaTime.trim(),activity:agendaActivity.trim()}]);
    setAgendaTime(''); setAgendaActivity('');
  }

  function validate(s: number) {
    const e: Record<string,string> = {};
    if (s===0) {
      if (!title.trim()) e.title='Required';
      if (!eventType) e.eventType='Required';
      if (!startDate) e.startDate='Required';
    }
    if (s===2 && venueType!=='online' && !venueAddress.trim()) e.venueAddress='Required';
    if (s===4 && isPaid && price<=0) e.ticketPrice='Enter valid price';
    setErrors(e);
    return Object.keys(e).length===0;
  }

  function nextStep() { if (validate(step)) setStep(s=>Math.min(s+1,STEPS.length-1)); }
  function prevStep() { setStep(s=>Math.max(s-1,0)); }

  async function handlePublish(draft=false) {
    if (!validate(step)) return;
    setSubmitting(true);
    await new Promise(r=>setTimeout(r,600));
    const location = displayLocation;
    addEvent({
      status: draft?'draft':'upcoming',
      title:title.trim(),
      description:summary.trim(),
      summary:summary.trim(),
      organizer:organizer.trim(),
      date:displayDate,
      time:displayTime,
      endTime:endTime?formatTime(endTime):'',
      location,
      city:city.trim(),
      state:stateName.trim(),
      zip:zip.trim(),
      type:eventType,
      price:isPaid?'$'+price.toFixed(2):'Free',
      isPaid,
      ticketPrice:price,
      bannerImage:bannerImage||undefined,
      venueLayoutImage:venueLayoutImage||undefined,
      speakers:speakers.map((sp,i)=>({
        ...sp,
        initials:sp.name.split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2),
        color:SPEAKER_COLORS[i%SPEAKER_COLORS.length],
      })),
      agenda:agendaItems,
      experience:experience.split('\n').filter((l:string)=>l.trim()),
      audience:audience.trim()||'All are welcome',
      venueType:venueType as any,
      venueName:venueName.trim(),
      venueAddress:venueAddress.trim(),
      venueInstructions:venueInstructions.trim(),
      parking:parking.trim(),
      liveStreamUrl:liveStreamUrl.trim(),
      meetingUrl:meetingUrl.trim(),
      platform:platform.trim(),
      hasLiveStream:venueType==='online'||venueType==='hybrid',
      recurrence:recurrence as any,
      notes:notes.trim(),
    });
    setSubmitting(false);
    if (draft) {
      Alert.alert('Saved as Draft','Find it in Settings → My Events',[{text:'OK',onPress:()=>router.back()}]);
    } else {
      Alert.alert('Event Published! 🎉','"'+title+'" is now live.',[
        {text:'View Events',onPress:()=>router.replace('/(tabs)/events')}
      ]);
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={()=>step===0?router.back():prevStep()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('createEventTitle')}</Text>
        <View style={s.hdrRight}>
          <TouchableOpacity style={s.previewIconBtn} onPress={()=>setShowPreview(true)}>
            <Ionicons name="eye-outline" size={20} color={COLORS.gold} />
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>handlePublish(true)}>
            <Text style={s.draftTxt}>{t('draft')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Step indicator */}
      <View style={s.stepsRow}>
        {STEPS.map((label,i)=>(
          <TouchableOpacity key={i} style={s.stepWrap} onPress={()=>i<step&&setStep(i)}>
            <View style={[s.stepDot, i===step&&s.stepDotActive, i<step&&s.stepDotDone]}>
              {i<step
                ?<Ionicons name="checkmark" size={11} color={COLORS.white}/>
                :<Text style={[s.stepNum,i===step&&s.stepNumActive]}>{i+1}</Text>}
            </View>
            <Text style={[s.stepLbl,i===step&&s.stepLblActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.progressBar}>
        <View style={[s.progressFill,{width:((step+1)/STEPS.length*100)+'%'}]}/>
      </View>

      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── STEP 0: Basics ── */}
          {step===0&&(
            <>
              <TouchableOpacity style={s.bannerPicker} onPress={handlePickBanner}>
                {bannerImage
                  ?<Image source={{uri:bannerImage}} style={s.bannerImg} resizeMode="cover"/>
                  :<LinearGradient colors={gradient} style={s.bannerGradient} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.7)"/>
                    <Text style={s.bannerTxt}>{t('addEventBanner')}</Text>
                    <Text style={s.bannerSub}>Tap to upload · 16:9</Text>
                  </LinearGradient>}
              </TouchableOpacity>

              <LField label="Event Title *" error={errors.title}>
                <TextInput style={[s.input,!!errors.title&&s.inputErr]} placeholder="Women of Purpose Conference" placeholderTextColor={COLORS.placeholder} value={title} onChangeText={v=>{setTitle(v);setErrors(e=>({...e,title:''}));}}/>
              </LField>

              <LField label="Organizer">
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={organizer} onChangeText={setOrganizer}/>
              </LField>

              <LField label="Event Type *" error={errors.eventType}>
                <TouchableOpacity style={[s.picker,!!errors.eventType&&s.inputErr]} onPress={()=>setShowTypes(!showTypes)}>
                  <Text style={[s.pickerTxt,!eventType&&s.pickerPH]}>{eventType||'Select type'}</Text>
                  <Ionicons name={showTypes?'chevron-up':'chevron-down'} size={17} color="#bbb"/>
                </TouchableOpacity>
                {showTypes&&(
                  <View style={s.dropList}>
                    {EVENT_TYPES.map(t=>(
                      <TouchableOpacity key={t} style={[s.dropItem,eventType===t&&s.dropItemActive]} onPress={()=>{setEventType(t);setShowTypes(false);setErrors(e=>({...e,eventType:''}));}}>
                        <Text style={[s.dropTxt,eventType===t&&{color:COLORS.navy,fontWeight:'700'}]}>{t}</Text>
                        {eventType===t&&<Ionicons name="checkmark" size={15} color={COLORS.gold}/>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </LField>

              {/* Date/Time pickers */}
              <Text style={s.fieldLbl}>Event Schedule *</Text>
              <View style={s.scheduleCard}>
                <View style={s.scheduleRow}>
                  <Text style={s.scheduleSectionLbl}>{t('startLabel')}</Text>
                  <View style={s.scheduleBtnsRow}>
                    <TouchableOpacity style={[s.schedulePicker, startDate && s.schedulePickerFilled, !!errors.startDate && s.schedulePickerErr]} onPress={()=>openPicker('startDate')}>
                      <View style={[s.scheduleIconWrap, startDate && s.scheduleIconWrapFilled]}>
                        <Ionicons name="calendar" size={16} color={startDate ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>{t('dateLabel')}</Text>
                        <Text style={[s.schedulePickerValue, !startDate && s.schedulePickerPH]}>
                          {startDate ? startDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={startDate ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.schedulePicker, startTime && s.schedulePickerFilled]} onPress={()=>openPicker('startTime')}>
                      <View style={[s.scheduleIconWrap, startTime && s.scheduleIconWrapFilledTime]}>
                        <Ionicons name="time" size={16} color={startTime ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>{t('timeLabel')}</Text>
                        <Text style={[s.schedulePickerValue, !startTime && s.schedulePickerPH]}>
                          {startTime ? formatTime(startTime) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={startTime ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.scheduleDivider}/>

                <View style={s.scheduleRow}>
                  <Text style={s.scheduleSectionLbl}>{t('endLabel')}</Text>
                  <View style={s.scheduleBtnsRow}>
                    <TouchableOpacity style={[s.schedulePicker, endDate && s.schedulePickerFilled]} onPress={()=>openPicker('endDate')}>
                      <View style={[s.scheduleIconWrap, endDate && s.scheduleIconWrapFilled]}>
                        <Ionicons name="calendar" size={16} color={endDate ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>{t('dateLabel')}</Text>
                        <Text style={[s.schedulePickerValue, !endDate && s.schedulePickerPH]}>
                          {endDate ? endDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={endDate ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.schedulePicker, endTime && s.schedulePickerFilled]} onPress={()=>openPicker('endTime')}>
                      <View style={[s.scheduleIconWrap, endTime && s.scheduleIconWrapFilledTime]}>
                        <Ionicons name="time" size={16} color={endTime ? COLORS.white : '#aaa'}/>
                      </View>
                      <View style={s.schedulePickerInfo}>
                        <Text style={s.schedulePickerLabel}>{t('timeLabel')}</Text>
                        <Text style={[s.schedulePickerValue, !endTime && s.schedulePickerPH]}>
                          {endTime ? formatTime(endTime) : 'Tap to select'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={endTime ? COLORS.navy : '#ddd'}/>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              {!!errors.startDate&&<Text style={s.errTxt}>{t('startDateRequired')}</Text>}

              {/* Schedule preview */}
              {startDate&&(
                <View style={s.schedulePreview}>
                  <Ionicons name="calendar" size={16} color={COLORS.gold}/>
                  <Text style={s.schedulePreviewTxt}>{displayDate}{displayTime?' · '+displayTime:''}</Text>
                </View>
              )}

              {/* Recurrence */}
              <Text style={s.fieldLbl}>{t('repeatLabel')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:20}}>
                {RECURRENCE_OPTIONS.map(r=>(
                  <TouchableOpacity key={r.id} style={[s.recBtn,recurrence===r.id&&s.recBtnActive]} onPress={()=>setRecurrence(r.id)}>
                    <Text style={[s.recTxt,recurrence===r.id&&s.recTxtActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── STEP 1: Details ── */}
          {step===1&&(
            <>
              <LField label="Event Summary">
                <TextInput style={[s.input,s.multiline]} placeholder="What is this event about?" placeholderTextColor={COLORS.placeholder} value={summary} onChangeText={setSummary} multiline/>
              </LField>
              <LField label="What Will Happen" hint="(one per line)">
                <TextInput style={[s.input,s.multilineLg]} placeholder={'Worship\nMessage\nPrayer\nFellowship'} placeholderTextColor={COLORS.placeholder} value={experience} onChangeText={setExperience} multiline/>
              </LField>
              <LField label="Target Audience">
                <TextInput style={s.input} placeholder="All ages, families welcome" placeholderTextColor={COLORS.placeholder} value={audience} onChangeText={setAudience}/>
              </LField>

              <Text style={s.fieldLbl}>{t('speakersGuests')}</Text>
              {speakers.map((sp,i)=>(
                <View key={i} style={s.speakerTag}>
                  <View style={[s.speakerAvt,{backgroundColor:SPEAKER_COLORS[i%SPEAKER_COLORS.length]}]}>
                    <Text style={s.speakerAvtTxt}>{sp.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={s.speakerName}>{sp.name}</Text>
                    <Text style={s.speakerRole}>{sp.role}</Text>
                  </View>
                  <TouchableOpacity onPress={()=>setSpeakers(p=>p.filter((_,idx)=>idx!==i))}>
                    <Ionicons name="close-circle" size={20} color="#ddd"/>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={s.addRow}>
                <TextInput style={[s.input,{flex:2,marginRight:8}]} placeholder="Name" placeholderTextColor={COLORS.placeholder} value={speakerName} onChangeText={setSpeakerName}/>
                <TextInput style={[s.input,{flex:1,marginRight:8}]} placeholder="Role" placeholderTextColor={COLORS.placeholder} value={speakerRole} onChangeText={setSpeakerRole}/>
                <TouchableOpacity style={s.addBtn} onPress={addSpeaker}>
                  <Ionicons name="add" size={22} color={COLORS.white}/>
                </TouchableOpacity>
              </View>
              <LField label="Additional Notes">
                <TextInput style={[s.input,s.multiline]} placeholder="Any other information..." placeholderTextColor={COLORS.placeholder} value={notes} onChangeText={setNotes} multiline/>
              </LField>
            </>
          )}

          {/* ── STEP 2: Venue ── */}
          {step===2&&(
            <>
              <Text style={s.fieldLbl}>{t('venueType')}</Text>
              <View style={s.venueRow}>
                {VENUE_TYPES.map(v=>(
                  <TouchableOpacity key={v.id} style={[s.venueBtn,venueType===v.id&&s.venueBtnActive]} onPress={()=>setVenueType(v.id)}>
                    <Ionicons name={v.icon as any} size={20} color={venueType===v.id?COLORS.white:'#888'}/>
                    <Text style={[s.venueTxt,venueType===v.id&&{color:COLORS.white}]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(venueType==='in-person'||venueType==='hybrid')&&(
                <>
                  <LField label="Venue Name">
                    <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={venueName} onChangeText={setVenueName}/>
                  </LField>
                  <LField label="Street Address *" error={errors.venueAddress}>
                    <TextInput style={[s.input,!!errors.venueAddress&&s.inputErr]} placeholder="123 Faith Ave" placeholderTextColor={COLORS.placeholder} value={venueAddress} onChangeText={v=>{setVenueAddress(v);setErrors(e=>({...e,venueAddress:''}));}}/>
                  </LField>
                  <View style={{flexDirection:'row',gap:8}}>
                    <View style={{flex:2}}>
                      <LField label="City">
                        <TextInput style={s.input} placeholder="New York" placeholderTextColor={COLORS.placeholder} value={city} onChangeText={setCity}/>
                      </LField>
                    </View>
                    <View style={{flex:1}}>
                      <LField label="State">
                        <TextInput style={s.input} placeholder="NY" placeholderTextColor={COLORS.placeholder} value={stateName} onChangeText={setStateName}/>
                      </LField>
                    </View>
                    <View style={{flex:1}}>
                      <LField label="Zip">
                        <TextInput style={s.input} placeholder="10001" placeholderTextColor={COLORS.placeholder} value={zip} onChangeText={setZip} keyboardType="number-pad"/>
                      </LField>
                    </View>
                  </View>
                  <LField label="Parking">
                    <TextInput style={s.input} placeholder="Free parking on site" placeholderTextColor={COLORS.placeholder} value={parking} onChangeText={setParking}/>
                  </LField>
                  <LField label="Venue Instructions">
                    <TextInput style={[s.input,s.multiline]} placeholder="Enter through main doors..." placeholderTextColor={COLORS.placeholder} value={venueInstructions} onChangeText={setVenueInstructions} multiline/>
                  </LField>
                </>
              )}

              {(venueType==='online'||venueType==='hybrid')&&(
                <>
                  <LField label="Platform">
                    <TouchableOpacity style={s.picker} onPress={()=>setShowPlatforms(!showPlatforms)}>
                      <Text style={[s.pickerTxt,!platform&&s.pickerPH]}>{platform||'Select platform'}</Text>
                      <Ionicons name={showPlatforms?'chevron-up':'chevron-down'} size={17} color="#bbb"/>
                    </TouchableOpacity>
                    {showPlatforms&&(
                      <View style={s.dropList}>
                        {PLATFORMS.map(p=>(
                          <TouchableOpacity key={p} style={[s.dropItem,platform===p&&s.dropItemActive]} onPress={()=>{setPlatform(p);setShowPlatforms(false);}}>
                            <Text style={[s.dropTxt,platform===p&&{color:COLORS.navy,fontWeight:'700'}]}>{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </LField>
                  <LField label="Livestream URL">
                    <TextInput style={s.input} placeholder="https://youtube.com/live/..." placeholderTextColor={COLORS.placeholder} value={liveStreamUrl} onChangeText={setLiveStreamUrl} autoCapitalize="none"/>
                  </LField>
                  <LField label="Meeting URL">
                    <TextInput style={s.input} placeholder="https://zoom.us/j/..." placeholderTextColor={COLORS.placeholder} value={meetingUrl} onChangeText={setMeetingUrl} autoCapitalize="none"/>
                  </LField>
                </>
              )}

              <Text style={s.fieldLbl}>Venue Map / Layout <Text style={{fontWeight:'400',color:'#bbb',fontSize:11}}>(Optional)</Text></Text>
              <TouchableOpacity style={s.uploadBox} onPress={handlePickVenueLayout}>
                {venueLayoutImage
                  ?<Image source={{uri:venueLayoutImage}} style={s.venueLayoutImg} resizeMode="contain"/>
                  :<View style={s.uploadBoxInner}>
                    <Ionicons name="map-outline" size={28} color="#bbb"/>
                    <Text style={s.uploadBoxTxt}>{t('uploadSeatingChart')}</Text>
                  </View>}
              </TouchableOpacity>
            </>
          )}

          {/* ── STEP 3: Agenda ── */}
          {step===3&&(
            <>
              <Text style={s.agendaDesc}>{t('buildTimeline')}</Text>
              {agendaItems.length>0&&(
                <View style={s.agendaList}>
                  {agendaItems.map((item,i)=>(
                    <View key={i} style={s.agendaItem}>
                      <View style={s.agendaTimeWrap}>
                        <Text style={s.agendaTimeTxt}>{item.time}</Text>
                      </View>
                      <View style={s.agendaLine}/>
                      <View style={s.agendaDot}/>
                      <Text style={s.agendaActTxt}>{item.activity}</Text>
                      <TouchableOpacity onPress={()=>setAgendaItems(p=>p.filter((_,idx)=>idx!==i))}>
                        <Ionicons name="close-circle" size={18} color="#ddd"/>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              <View style={s.addRow}>
                <TextInput style={[s.input,{width:90,marginRight:8}]} placeholder="6:00 PM" placeholderTextColor={COLORS.placeholder} value={agendaTime} onChangeText={setAgendaTime}/>
                <TextInput style={[s.input,{flex:1,marginRight:8}]} placeholder="Worship" placeholderTextColor={COLORS.placeholder} value={agendaActivity} onChangeText={setAgendaActivity}/>
                <TouchableOpacity style={s.addBtn} onPress={addAgendaItem}>
                  <Ionicons name="add" size={22} color={COLORS.white}/>
                </TouchableOpacity>
              </View>
              {agendaItems.length===0&&(
                <View style={s.emptyAgenda}>
                  <Ionicons name="time-outline" size={40} color="#ddd"/>
                  <Text style={s.emptyAgendaTxt}>{t('noAgendaYet')}</Text>
                  <Text style={s.emptyAgendaSub}>Add a time + activity above</Text>
                </View>
              )}
            </>
          )}

          {/* ── STEP 4: Tickets ── */}
          {step===4&&(
            <>
              <View style={s.ticketRow}>
                <TouchableOpacity style={[s.ticketBtn,!isPaid&&s.ticketBtnFree]} onPress={()=>setIsPaid(false)}>
                  <Ionicons name="checkmark-circle" size={20} color={!isPaid?COLORS.green:'#ddd'}/>
                  <Text style={[s.ticketBtnTxt,!isPaid&&{color:COLORS.green}]}>{t('freeEvent')}</Text>
                  <Text style={s.ticketBtnSub}>{t('noPayment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.ticketBtn,isPaid&&s.ticketBtnPaid]} onPress={()=>setIsPaid(true)}>
                  <Ionicons name="card-outline" size={20} color={isPaid?COLORS.white:'#ddd'}/>
                  <Text style={[s.ticketBtnTxt,isPaid&&{color:COLORS.white}]}>{t('paidEvent')}</Text>
                  <Text style={[s.ticketBtnSub,isPaid&&{color:'rgba(255,255,255,0.6)'}]}>{t('setPrice')}</Text>
                </TouchableOpacity>
              </View>

              {isPaid&&(
                <>
                  <LField label="Ticket Price (USD) *" error={errors.ticketPrice}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <Text style={s.dollar}>$</Text>
                      <TextInput style={[s.input,{flex:1},!!errors.ticketPrice&&s.inputErr]} placeholder="0.00" placeholderTextColor={COLORS.placeholder} value={ticketPrice} onChangeText={v=>{setTicketPrice(v);setErrors(e=>({...e,ticketPrice:''}));}} keyboardType="decimal-pad"/>
                    </View>
                  </LField>
                  {price>0&&(
                    <View style={s.feeCard}>
                      <Text style={s.feeCardTitle}>{t('revenueBreakdown')}</Text>
                      <View style={s.feeRow}><Text style={s.feeLbl}>{t('ticketPriceLabel')}</Text><Text style={s.feeVal}>${price.toFixed(2)}</Text></View>
                      <View style={s.feeRow}><Text style={s.feeLbl}>Platform Fee (1.5%)</Text><Text style={[s.feeVal,{color:COLORS.red}]}>-${platformFee.toFixed(2)}</Text></View>
                      <View style={[s.feeRow,s.feeTotalRow]}><Text style={s.feeTotalLbl}>{t('youReceive')}</Text><Text style={[s.feeVal,{color:COLORS.green,fontWeight:'700',fontSize:17}]}>${creatorPayout.toFixed(2)}</Text></View>
                    </View>
                  )}
                </>
              )}

              {/* Event preview card */}
              <Text style={s.fieldLbl}>{t('eventPreview')}</Text>
              <Text style={s.previewHint}>{t('previewHintTab')}</Text>
              <EventPreviewCard
                title={title||'Your Event Title'}
                date={displayDate}
                time={displayTime}
                location={displayLocation}
                organizer={organizer}
                type={eventType||'Event'}
                price={isPaid&&price>0?'$'+price.toFixed(2):'Free'}
                bannerImage={bannerImage}
                gradient={gradient}
              />
            </>
          )}

          {/* Navigation */}
          <View style={s.navRow}>
            {step>0&&(
              <TouchableOpacity style={s.prevBtn} onPress={prevStep}>
                <Ionicons name="arrow-back" size={17} color={COLORS.navy}/>
                <Text style={s.prevBtnTxt}>{t('back')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.nextBtn,submitting&&{opacity:0.5}]}
              onPress={step===STEPS.length-1?()=>handlePublish(false):nextStep}
              disabled={submitting}
            >
              <Text style={s.nextBtnTxt}>{step===STEPS.length-1?(submitting?'Publishing...':'Publish Event'):'Next'}</Text>
              <Ionicons name={step===STEPS.length-1?'checkmark-circle':'arrow-forward'} size={17} color={COLORS.white}/>
            </TouchableOpacity>
          </View>
          <View style={{height:40}}/>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date/Time Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={s.pickerOverlay}>
          <TouchableOpacity style={{flex:1}} activeOpacity={1} onPress={()=>setShowPicker(false)}/>
          <View style={s.pickerSheet}>
            <View style={s.pickerSheetHdr}>
              <TouchableOpacity onPress={()=>setShowPicker(false)}>
                <Text style={s.pickerCancel}>{t('cancel')}</Text>
              </TouchableOpacity>
              <Text style={s.pickerSheetTitle}>{pickerTarget.includes('Time')?'Select Time':'Select Date'}</Text>
              <TouchableOpacity onPress={confirmPicker}>
                <Text style={s.pickerDone}>{t('done')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode={pickerMode}
                display="spinner"
                onChange={handlePickerChange}
                minimumDate={pickerMode==='date' ? new Date() : undefined}
                textColor={COLORS.navy}
                themeVariant="light"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Full Preview Modal */}
      <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:'#f8f7f4'}} edges={['top']}>
          <View style={s.previewModalHdr}>
            <Text style={s.previewModalTitle}>{t('eventPreview')}</Text>
            <TouchableOpacity style={s.previewCloseBtn} onPress={()=>setShowPreview(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy}/>
            </TouchableOpacity>
          </View>
          <Text style={s.previewModalSub}>{t('previewHintUsers')}</Text>
          <ScrollView style={{padding:16}}>
            <EventPreviewCard
              title={title||'Your Event Title'}
              date={displayDate}
              time={displayTime}
              location={displayLocation}
              organizer={organizer}
              type={eventType||'Event'}
              price={isPaid&&price>0?'$'+price.toFixed(2):'Free'}
              bannerImage={bannerImage}
              gradient={gradient}
              fullSize
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function EventPreviewCard({title,date,time,location,organizer,type,price,bannerImage,gradient,fullSize=false}:{
  title:string;date:string;time:string;location:string;organizer:string;type:string;price:string;bannerImage:string;gradient:[string,string];fullSize?:boolean;
}) {
  return (
    <View style={pc.card}>
      {bannerImage
        ?<Image source={{uri:bannerImage}} style={[pc.banner,fullSize&&pc.bannerLg]} resizeMode="cover"/>
        :<LinearGradient colors={gradient} style={[pc.banner,fullSize&&pc.bannerLg]} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={pc.bannerContent}>
            <View style={pc.typePill}><Text style={pc.typePillTxt}>{type}</Text></View>
            <Text style={pc.bannerTitle} numberOfLines={2}>{title}</Text>
          </View>
        </LinearGradient>}
      <View style={pc.body}>
        <View style={pc.topRow}>
          <Text style={pc.titleTxt} numberOfLines={1}>{title}</Text>
          {price==='Free'
            ?<View style={pc.freeBadge}><Text style={pc.freeBadgeTxt}>{t('free')}</Text></View>
            :<View style={pc.paidBadge}><Text style={pc.paidBadgeTxt}>{price}</Text></View>}
        </View>
        {!!organizer&&<Text style={pc.organizerTxt}>by {organizer}</Text>}
        {!!date&&<View style={pc.infoRow}><Ionicons name="calendar-outline" size={13} color="#888"/><Text style={pc.infoTxt}>{date}{time?' · '+time:''}</Text></View>}
        {!!location&&<View style={pc.infoRow}><Ionicons name="location-outline" size={13} color="#888"/><Text style={pc.infoTxt} numberOfLines={1}>{location}</Text></View>}
      </View>
    </View>
  );
}
const pc = StyleSheet.create({
  card:{backgroundColor:COLORS.white,borderRadius:16,overflow:'hidden',borderWidth:1,borderColor:COLORS.border,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:8},
  banner:{height:140,justifyContent:'flex-end',padding:14},
  bannerLg:{height:200},
  bannerContent:{gap:6},
  typePill:{alignSelf:'flex-start',backgroundColor:'rgba(255,255,255,0.2)',borderRadius:100,paddingHorizontal:10,paddingVertical:4},
  typePillTxt:{color:COLORS.white,fontSize:11,fontWeight:'700'},
  bannerTitle:{fontFamily:'PlayfairDisplay_700Bold',fontSize:18,color:COLORS.white,lineHeight:24},
  body:{padding:14},
  topRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:4},
  titleTxt:{fontFamily:'PlayfairDisplay_700Bold',fontSize:16,color:COLORS.navy,flex:1,marginRight:8},
  freeBadge:{backgroundColor:'#e8f5e9',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  freeBadgeTxt:{fontSize:11,fontWeight:'700',color:COLORS.green},
  paidBadge:{backgroundColor:'#fff3e0',borderRadius:8,paddingHorizontal:10,paddingVertical:4},
  paidBadgeTxt:{fontSize:11,fontWeight:'700',color:'#e65100'},
  organizerTxt:{fontSize:12,color:COLORS.gold,fontWeight:'600',marginBottom:6},
  infoRow:{flexDirection:'row',alignItems:'center',gap:5,marginBottom:4},
  infoTxt:{fontSize:12,color:'#666',flex:1},
});

function LField({label,hint,error,children}:{label:string;hint?:string;error?:string;children:React.ReactNode}) {
  return (
    <View style={{marginBottom:14}}>
      <Text style={{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8}}>{label}{hint&&<Text style={{fontWeight:'400',color:'#bbb',fontSize:11}}> {hint}</Text>}</Text>
      {children}
      {!!error&&<Text style={{fontSize:12,color:COLORS.red,marginTop:4}}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.white},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  hdrRight:{flexDirection:'row',alignItems:'center',gap:12},
  previewIconBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(201,169,110,0.12)',alignItems:'center',justifyContent:'center'},
  draftTxt:{fontSize:14,color:COLORS.gold,fontWeight:'600'},
  stepsRow:{flexDirection:'row',paddingHorizontal:16,paddingTop:14,paddingBottom:8},
  stepWrap:{flex:1,alignItems:'center',gap:4},
  stepDot:{width:26,height:26,borderRadius:13,backgroundColor:COLORS.lightBg,borderWidth:1.5,borderColor:COLORS.border,alignItems:'center',justifyContent:'center'},
  stepDotActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  stepDotDone:{backgroundColor:COLORS.green,borderColor:COLORS.green},
  stepNum:{fontSize:11,fontWeight:'700',color:'#aaa'},
  stepNumActive:{color:COLORS.white},
  stepLbl:{fontSize:9,color:'#bbb',fontWeight:'600',textAlign:'center'},
  stepLblActive:{color:COLORS.navy},
  progressBar:{height:3,backgroundColor:COLORS.lightBg,marginHorizontal:16,borderRadius:2,marginBottom:16},
  progressFill:{height:3,backgroundColor:COLORS.navy,borderRadius:2},
  scroll:{paddingHorizontal:20},
  bannerPicker:{height:160,borderRadius:16,overflow:'hidden',marginBottom:20},
  bannerImg:{width:'100%',height:'100%'},
  bannerGradient:{flex:1,alignItems:'center',justifyContent:'center',gap:6},
  bannerTxt:{fontSize:14,fontWeight:'600',color:'rgba(255,255,255,0.9)'},
  bannerSub:{fontSize:11,color:'rgba(255,255,255,0.6)'},
  fieldLbl:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:14,paddingVertical:12,fontSize:14,color:COLORS.navy},
  inputErr:{borderColor:COLORS.red},
  multiline:{height:80,textAlignVertical:'top',paddingTop:12},
  multilineLg:{height:110,textAlignVertical:'top',paddingTop:12},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:14,paddingVertical:13},
  pickerTxt:{fontSize:14,color:COLORS.navy},
  pickerPH:{color:COLORS.placeholder},
  dropList:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,marginTop:4,overflow:'hidden'},
  dropItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border},
  dropItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  dropTxt:{fontSize:14,color:'#555'},
  scheduleCard:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:16,overflow:'hidden',marginBottom:8},
  scheduleRow:{padding:14},
  scheduleSectionLbl:{fontSize:10,fontWeight:'700',color:'#aaa',letterSpacing:1,textTransform:'uppercase',marginBottom:10},
  scheduleBtnsRow:{gap:8},
  schedulePicker:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:COLORS.border,borderRadius:12,padding:12,backgroundColor:COLORS.white},
  schedulePickerFilled:{borderColor:'rgba(26,26,46,0.15)',backgroundColor:COLORS.lightBg},
  schedulePickerErr:{borderColor:COLORS.red},
  scheduleIconWrap:{width:36,height:36,borderRadius:10,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  scheduleIconWrapFilled:{backgroundColor:COLORS.navy},
  scheduleIconWrapFilledTime:{backgroundColor:'#667eea'},
  schedulePickerInfo:{flex:1},
  schedulePickerLabel:{fontSize:10,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2},
  schedulePickerValue:{fontSize:14,fontWeight:'600',color:COLORS.navy},
  schedulePickerPH:{color:'#bbb',fontWeight:'400'},
  scheduleDivider:{height:1,backgroundColor:COLORS.border},
  datePickerBtn:{flexDirection:'row',alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:12,paddingVertical:12,width:'48%'},
  datePickerTxt:{fontSize:13,color:COLORS.navy,flex:1},
  datePickerPH:{color:COLORS.placeholder},
  errTxt:{fontSize:12,color:COLORS.red,marginBottom:8},
  schedulePreview:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(201,169,110,0.1)',borderRadius:10,padding:12,marginBottom:16},
  schedulePreviewTxt:{fontSize:13,color:COLORS.navy,fontWeight:'600',flex:1},
  recBtn:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1.5,borderColor:COLORS.border,borderRadius:100,paddingHorizontal:14,paddingVertical:8,marginRight:8},
  recBtnActive:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  recTxt:{fontSize:12,fontWeight:'600',color:'#888'},
  recTxtActive:{color:COLORS.white},
  venueRow:{flexDirection:'row',gap:8,marginBottom:16},
  venueBtn:{flex:1,alignItems:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:12,paddingVertical:14},
  venueBtnActive:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  venueTxt:{fontSize:12,fontWeight:'700',color:'#888'},
  uploadBox:{height:130,borderRadius:14,borderWidth:1.5,borderColor:COLORS.border,borderStyle:'dashed',overflow:'hidden',marginBottom:16},
  uploadBoxInner:{flex:1,alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.lightBg},
  uploadBoxTxt:{fontSize:13,color:'#bbb'},
  venueLayoutImg:{width:'100%',height:'100%'},
  agendaDesc:{fontSize:14,color:'#888',marginBottom:16,lineHeight:20},
  agendaList:{marginBottom:16},
  agendaItem:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10},
  agendaTimeWrap:{backgroundColor:COLORS.navy,borderRadius:8,paddingHorizontal:10,paddingVertical:5,minWidth:72,alignItems:'center'},
  agendaTimeTxt:{fontSize:11,fontWeight:'700',color:COLORS.white},
  agendaLine:{width:16,height:1,backgroundColor:COLORS.border},
  agendaDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.gold},
  agendaActTxt:{flex:1,fontSize:14,color:COLORS.navy},
  emptyAgenda:{paddingVertical:30,alignItems:'center',gap:6},
  emptyAgendaTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  emptyAgendaSub:{fontSize:12,color:'#ddd'},
  addRow:{flexDirection:'row',alignItems:'center',marginBottom:14},
  addBtn:{width:44,height:44,borderRadius:12,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  speakerTag:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderWidth:1,borderColor:COLORS.border,borderRadius:12,marginBottom:8},
  speakerAvt:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center'},
  speakerAvtTxt:{color:COLORS.white,fontWeight:'700',fontSize:13},
  speakerName:{fontSize:14,fontWeight:'700',color:COLORS.navy},
  speakerRole:{fontSize:12,color:'#888'},
  ticketRow:{flexDirection:'row',gap:10,marginBottom:16},
  ticketBtn:{flex:1,alignItems:'center',gap:4,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:16},
  ticketBtnFree:{borderColor:COLORS.green,backgroundColor:'#e8f5e9'},
  ticketBtnPaid:{borderColor:COLORS.navy,backgroundColor:COLORS.navy},
  ticketBtnTxt:{fontSize:14,fontWeight:'700',color:'#aaa'},
  ticketBtnSub:{fontSize:11,color:'#bbb'},
  dollar:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  feeCard:{backgroundColor:COLORS.lightBg,borderRadius:14,padding:16,marginBottom:16},
  feeCardTitle:{fontSize:11,fontWeight:'700',color:COLORS.navy,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
  feeRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
  feeLbl:{fontSize:14,color:'#666'},
  feeVal:{fontSize:14,color:COLORS.navy,fontWeight:'600'},
  feeTotalRow:{borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10,marginTop:4},
  feeTotalLbl:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  previewHint:{fontSize:12,color:'#aaa',marginBottom:12,marginTop:-4},
  navRow:{flexDirection:'row',gap:10,marginBottom:16},
  prevBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  prevBtnTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  nextBtn:{flex:2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:COLORS.navy,borderRadius:14,paddingVertical:14},
  nextBtnTxt:{fontSize:15,fontWeight:'700',color:COLORS.white},
  pickerOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},
  pickerSheet:{backgroundColor:COLORS.white,borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:40},
  pickerSheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:16,borderBottomWidth:1,borderBottomColor:COLORS.border},
  pickerCancel:{fontSize:16,color:'#888',fontWeight:'500'},
  pickerSheetTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  pickerDone:{fontSize:16,color:COLORS.gold,fontWeight:'700'},
  pickerContainer:{backgroundColor:COLORS.white,paddingVertical:8},
  previewModalHdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  previewModalTitle:{fontSize:17,fontWeight:'700',color:COLORS.navy},
  previewCloseBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  previewModalSub:{fontSize:13,color:'#aaa',textAlign:'center',paddingVertical:12,backgroundColor:COLORS.white},
});
