import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal, TextInput, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useUser, setUser, getUser } from '../src/lib/userStore';
import { useToast } from '../src/components/Toast';

const DENOMINATIONS = ['Non-Denominational','Catholic','Baptist','Methodist','Lutheran','Presbyterian','Episcopal','Pentecostal','Assemblies of God','Evangelical','Reformed','AME','Other'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const HOURS = Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
const MINUTES = ['00','15','30','45'];
const AMPM = ['AM','PM'];

type ServiceTime = { day: string; startH: string; startM: string; startAMPM: string; endH: string; endM: string; endAMPM: string; note?: string; };

function formatServiceTimes(times: ServiceTime[]): string {
  return times.map(t => {
    const base = `${t.day} ${t.startH}:${t.startM} ${t.startAMPM}–${t.endH}:${t.endM} ${t.endAMPM}`;
    return t.note ? `${base} | ${t.note}` : base;
  }).join('\n');
}

function parseServiceTimes(str: string): ServiceTime[] {
  if (!str) return [];
  return str.split('\n').map(line => {
    const match = line.match(/^(\w+)\s+(\d+):(\d+)\s+(AM|PM)–(\d+):(\d+)\s+(AM|PM)(?:\s\|\s(.+))?$/);
    if (!match) return null;
    return { day:match[1], startH:match[2], startM:match[3], startAMPM:match[4], endH:match[5], endM:match[6], endAMPM:match[7], note:match[8]||'' };
  }).filter(Boolean) as ServiceTime[];
}

type PickerProps = { visible:boolean; options:string[]; selected:string; onSelect:(v:string)=>void; onClose:()=>void; title:string; };
function InlinePicker({visible,options,selected,onSelect,onClose,title}:PickerProps) {
  const c = useThemeColors();
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.4)'}} activeOpacity={1} onPress={onClose}/>
      <View style={{position:'absolute',bottom:0,left:0,right:0,backgroundColor:c.card,borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:32}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:20,borderBottomWidth:1,borderBottomColor:c.border}}>
          <Text style={{fontSize:16,fontWeight:'700',color:c.text}}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={c.text}/></TouchableOpacity>
        </View>
        <ScrollView style={{maxHeight:300}}>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingVertical:14,borderBottomWidth:1,borderBottomColor:c.cardAlt}} onPress={()=>{onSelect(opt);onClose();}}>
              <Text style={{fontSize:15,color:selected===opt?c.navy:c.textSecondary,fontWeight:selected===opt?'700':'400'}}>{opt}</Text>
              {selected===opt&&<Ionicons name="checkmark" size={18} color={c.gold}/>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function EditChurchProfileScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const user = useUser();
  const { showToast } = useToast();
  const [churchName, setChurchName] = useState(user.churchName || '');
  const [address, setAddress] = useState(user.address || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [website, setWebsite] = useState(user.website || '');
  const [churchEmail, setChurchEmail] = useState(user.churchEmail || '');
  const [denomination, setDenomination] = useState(user.denomination || '');
  const [showDenom, setShowDenom] = useState(false);
  const [bio, setBio] = useState(user.bio || '');
  const [newMinistry, setNewMinistry] = useState('');

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(tx('Permission needed'), tx('Please allow access to your photo library.')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.8 });
    if (!result.canceled) setUser({ avatar: result.assets[0].uri });
  }

  async function handleAddGalleryPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(tx('Permission needed'), tx('Please allow access to your photo library.')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) {
      const liveUser = getUser();
      const newPhotos = result.assets.map(a => a.uri);
      setUser({ photos: [...(liveUser.photos || []), ...newPhotos] });
    }
  }

  function handleRemoveGalleryPhoto(uri: string) {
    const liveUser = getUser();
    setUser({ photos: (liveUser.photos || []).filter((p: string) => p !== uri) });
  }

  function addMinistry() {
    const name = newMinistry.trim();
    if (!name) return;
    const liveMinistries: string[] = getUser().ministries || [];
    if (liveMinistries.some(m => m.toLowerCase() === name.toLowerCase())) { setNewMinistry(''); return; }
    setUser({ ministries: [...liveMinistries, name] });
    setNewMinistry('');
  }

  function removeMinistry(name: string) {
    const liveMinistries: string[] = getUser().ministries || [];
    setUser({ ministries: liveMinistries.filter(m => m !== name) });
  }

  const [serviceTimes, setServiceTimes] = useState<ServiceTime[]>(() => parseServiceTimes(user.serviceTimes || ''));
  const [picker, setPicker] = useState<{idx:number;field:keyof ServiceTime;options:string[];title:string}|null>(null);

  function addServiceTime() {
    setServiceTimes(prev => [...prev, {day:'Sunday',startH:'09',startM:'00',startAMPM:'AM',endH:'11',endM:'00',endAMPM:'AM',note:''}]);
  }

  function removeServiceTime(idx:number) {
    setServiceTimes(prev => prev.filter((_,i)=>i!==idx));
  }

  function updateServiceTime(idx:number, field:keyof ServiceTime, value:string) {
    setServiceTimes(prev => prev.map((t,i) => i===idx ? {...t,[field]:value} : t));
  }

  function openPicker(idx:number, field:keyof ServiceTime, options:string[], title:string) {
    setPicker({idx,field,options,title});
  }

  function handleSave() {
    setUser({ churchName, address, phone, website, churchEmail, denomination, bio, serviceTimes: formatServiceTimes(serviceTimes) });
    showToast(tx('Saved!'), tx('Your church profile has been updated.'), 'success');
    router.back();
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>{t('editChurchProfile')}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={s.saveBtn}>{t('save')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text style={s.sectionTitle}>{t('photos')}</Text>

          <View style={{flexDirection:'row',alignItems:'center',gap:16,marginBottom:20}}>
            <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
              {user.avatar
                ? <Image source={{uri:user.avatar}} style={{width:72,height:72,borderRadius:18}} resizeMode="cover" />
                : <View style={{width:72,height:72,borderRadius:18,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="home" size={26} color={c.gold} />
                  </View>
              }
              <View style={{position:'absolute',bottom:-2,right:-2,width:22,height:22,borderRadius:11,backgroundColor:c.gold,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:c.card}}>
                <Ionicons name="camera" size={11} color={c.onPrimary} />
              </View>
            </TouchableOpacity>
            <View style={{flex:1}}>
              <Text style={s.label}>{t('profilePhoto')}</Text>
              <Text style={{fontSize:12,color:c.textMuted}}>{t('tapToChangeChurchPhoto')}</Text>
            </View>
          </View>

          <View style={{marginBottom:20}}>
            <Text style={s.label}>{t('galleryPhotos')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}}>
              {(user.photos || []).map((uri: string) => (
                <View key={uri} style={{marginRight:10,position:'relative'}}>
                  <Image source={{uri}} style={{width:80,height:80,borderRadius:12}} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => handleRemoveGalleryPhoto(uri)}
                    style={{position:'absolute',top:-6,right:-6,width:22,height:22,borderRadius:11,backgroundColor:c.red,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:c.card}}
                  >
                    <Ionicons name="close" size={12} color={c.onPrimary} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={handleAddGalleryPhoto} style={{width:80,height:80,borderRadius:12,borderWidth:1.5,borderColor:c.gold,borderStyle:'dashed',alignItems:'center',justifyContent:'center'}}>
                <Ionicons name="add" size={22} color={c.gold} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          <Text style={s.sectionTitle}>{t('churchInformation')}</Text>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('churchName')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="home-outline" size={18} color={c.textMuted} style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="Grace Community Church" placeholderTextColor={c.placeholder} value={churchName} onChangeText={setChurchName} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('address')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={18} color={c.textMuted} style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="123 Faith St, Glen Cove, NY 11542" placeholderTextColor={c.placeholder} value={address} onChangeText={setAddress} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('email')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={c.textMuted} style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="info@yourchurch.org" placeholderTextColor={c.placeholder} value={churchEmail} onChangeText={setChurchEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('phone')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="call-outline" size={18} color={c.textMuted} style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="(516) 000-0000" placeholderTextColor={c.placeholder} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('website')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="globe-outline" size={18} color={c.textMuted} style={s.icon} />
              <TextInput style={[s.input, s.inputWithIcon]} placeholder="www.yourchurch.org" placeholderTextColor={c.placeholder} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('denomination')}</Text>
            <TouchableOpacity style={[s.picker, showDenom && s.pickerOpen]} onPress={() => setShowDenom(!showDenom)}>
              <Text style={[s.pickerTxt, !denomination && s.pickerPlaceholder]}>{denomination || 'Select denomination'}</Text>
              <Ionicons name={showDenom ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
            </TouchableOpacity>
            {showDenom && (
              <View style={s.denomList}>
                {DENOMINATIONS.map(d => (
                  <TouchableOpacity key={d} style={[s.denomItem, denomination===d && s.denomItemActive]} onPress={() => { setDenomination(d); setShowDenom(false); }}>
                    <Text style={[s.denomTxt, denomination===d && s.denomTxtActive]}>{d}</Text>
                    {denomination===d && <Ionicons name="checkmark" size={16} color={c.gold} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>About / Description</Text>
            <TextInput
              style={[s.input, s.bioInput]}
              placeholder={tx('Tell the community about your church...')}
              placeholderTextColor={c.placeholder}
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </View>

          <Text style={s.sectionTitle}>{t('serviceTimes')}</Text>

          {serviceTimes.map((st, idx) => (
            <View key={idx} style={s.serviceTimeCard}>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <TouchableOpacity style={s.dayPicker} onPress={() => openPicker(idx,'day',DAYS,'Day of Week')}>
                  <Text style={s.dayPickerTxt}>{st.day}</Text>
                  <Ionicons name="chevron-down" size={14} color={c.text}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeServiceTime(idx)}>
                  <Ionicons name="trash-outline" size={18} color={c.red}/>
                </TouchableOpacity>
              </View>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                <Text style={s.timeLabel}>{t('fromLabel')}</Text>
                <TouchableOpacity style={s.timePart} onPress={() => openPicker(idx,'startH',HOURS,'Start Hour')}>
                  <Text style={s.timePartTxt}>{st.startH}</Text>
                </TouchableOpacity>
                <Text style={s.timeSep}>:</Text>
                <TouchableOpacity style={s.timePart} onPress={() => openPicker(idx,'startM',MINUTES,'Start Minute')}>
                  <Text style={s.timePartTxt}>{st.startM}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.timeAmPm} onPress={() => openPicker(idx,'startAMPM',AMPM,'AM / PM')}>
                  <Text style={s.timeAmPmTxt}>{st.startAMPM}</Text>
                </TouchableOpacity>
                <Text style={s.timeDash}>–</Text>
                <TouchableOpacity style={s.timePart} onPress={() => openPicker(idx,'endH',HOURS,'End Hour')}>
                  <Text style={s.timePartTxt}>{st.endH}</Text>
                </TouchableOpacity>
                <Text style={s.timeSep}>:</Text>
                <TouchableOpacity style={s.timePart} onPress={() => openPicker(idx,'endM',MINUTES,'End Minute')}>
                  <Text style={s.timePartTxt}>{st.endM}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.timeAmPm} onPress={() => openPicker(idx,'endAMPM',AMPM,'AM / PM')}>
                  <Text style={s.timeAmPmTxt}>{st.endAMPM}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={s.noteInput}
                placeholder={tx('Add a note (optional) — e.g. Main Worship Service')}
                placeholderTextColor={c.placeholder}
                value={st.note || ''}
                onChangeText={v => updateServiceTime(idx, 'note', v)}
              />
            </View>
          ))}

          <TouchableOpacity style={s.addTimeBtn} onPress={addServiceTime}>
            <Ionicons name="add-circle-outline" size={20} color={c.gold}/>
            <Text style={s.addTimeTxt}>{t('addServiceTime')}</Text>
          </TouchableOpacity>

          <Text style={s.sectionTitle}>{t('amenities')}</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
            {[
              {key:'parking',label:'Parking Available',icon:'car-outline'},
              {key:'wheelchair',label:'Wheelchair Accessible',icon:'accessibility-outline'},
              {key:'children',label:'Children Ministry',icon:'people-outline'},
              {key:'liveWorship',label:'Live Worship',icon:'musical-notes-outline'},
              {key:'bibleStudy',label:'Bible Study',icon:'book-outline'},
              {key:'youthMinistry',label:'Youth Ministry',icon:'school-outline'},
              {key:'onlineServices',label:'Online Services',icon:'globe-outline'},
              {key:'communityOutreach',label:'Community Outreach',icon:'heart-outline'},
            ].map(item => {
              const active = (user.amenities || {})[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  onPress={() => {
                    const liveAmenities = getUser().amenities || {};
                    setUser({amenities:{...liveAmenities,[item.key]:!liveAmenities[item.key]}});
                  }}
                  activeOpacity={0.7}
                  style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:100,borderWidth:1.5,borderColor:active?c.navy:c.border,backgroundColor:active?'rgba(26,26,46,0.06)':c.white}}
                >
                  <Ionicons name={item.icon as any} size={14} color={active?c.navy:c.textMuted}/>
                  <Text style={{fontSize:12,fontWeight:'600',color:active?c.navy:c.textMuted}}>{tx(item.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>{t('ministries')}</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>
            <TextInput
              style={[s.input, {flex:1}]}
              placeholder={tx('e.g. Youth Ministry, Bible Study...')}
              placeholderTextColor={c.placeholder}
              value={newMinistry}
              onChangeText={setNewMinistry}
              onSubmitEditing={addMinistry}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addMinistry} style={{width:48,height:48,borderRadius:14,backgroundColor:c.primary,alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="add" size={22} color={c.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
            {(user.ministries || []).map((name: string) => (
              <View key={name} style={{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,paddingVertical:8,borderRadius:100,borderWidth:1.5,borderColor:c.gold,backgroundColor:'rgba(201,169,110,0.08)'}}>
                <Text style={{fontSize:12,fontWeight:'600',color:c.gold}}>{name}</Text>
                <TouchableOpacity onPress={() => removeMinistry(name)}>
                  <Ionicons name="close-circle" size={16} color={c.gold} />
                </TouchableOpacity>
              </View>
            ))}
            {(!user.ministries || user.ministries.length === 0) && (
              <Text style={{fontSize:12,color:c.textMuted}}>{t('noMinistriesYet')}</Text>
            )}
          </View>

          <TouchableOpacity style={s.saveFullBtn} onPress={handleSave}>
            <Text style={s.saveFullBtnTxt}>{t('saveChanges')}</Text>
          </TouchableOpacity>

          <View style={{height:40}} />
        </ScrollView>
      </KeyboardAvoidingView>

      {picker && (
        <InlinePicker
          visible={true}
          title={picker.title}
          options={picker.field==='day'?DAYS:picker.field==='startH'||picker.field==='endH'?HOURS:picker.field==='startM'||picker.field==='endM'?MINUTES:AMPM}
          selected={serviceTimes[picker.idx]?.[picker.field]||''}
          onSelect={v => updateServiceTime(picker.idx, picker.field, v)}
          onClose={() => setPicker(null)}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  saveBtn:{fontSize:15,fontWeight:'700',color:c.gold},
  scroll:{padding:20},
  sectionTitle:{fontSize:13,fontWeight:'700',color:c.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:14,marginTop:8},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:c.textSecondary,marginBottom:8},
  inputWrap:{position:'relative'},
  icon:{position:'absolute',left:14,top:15,zIndex:1},
  input:{borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:c.text,backgroundColor:c.card},
  inputWithIcon:{paddingLeft:44},
  bioInput:{height:100,textAlignVertical:'top',paddingTop:12},
  picker:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingHorizontal:16,paddingVertical:14,backgroundColor:c.card},
  pickerOpen:{borderColor:c.primary},
  pickerTxt:{fontSize:15,color:c.text},
  pickerPlaceholder:{color:c.placeholder},
  denomList:{borderWidth:1.5,borderColor:c.border,borderRadius:14,marginTop:4,overflow:'hidden',backgroundColor:c.card},
  denomItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border},
  denomItemActive:{backgroundColor:'rgba(201,169,110,0.06)'},
  denomTxt:{fontSize:14,color:c.textSecondary},
  denomTxtActive:{color:c.text,fontWeight:'700'},
  serviceTimeCard:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,padding:16,marginBottom:10},
  dayPicker:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.cardAlt,borderRadius:10,paddingHorizontal:14,paddingVertical:8},
  dayPickerTxt:{fontSize:14,fontWeight:'700',color:c.text},
  timeLabel:{fontSize:13,color:c.textMuted,width:32},
  timePart:{backgroundColor:c.cardAlt,borderRadius:8,paddingHorizontal:10,paddingVertical:7,minWidth:36,alignItems:'center'},
  timePartTxt:{fontSize:14,fontWeight:'700',color:c.text},
  timeSep:{fontSize:16,fontWeight:'700',color:c.text},
  timeDash:{fontSize:16,color:c.textMuted,marginHorizontal:2},
  timeAmPm:{backgroundColor:'rgba(201,169,110,0.12)',borderRadius:8,paddingHorizontal:10,paddingVertical:7},
  timeAmPmTxt:{fontSize:13,fontWeight:'700',color:c.gold},
  addTimeBtn:{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'center',paddingVertical:14,borderWidth:1.5,borderColor:c.gold,borderRadius:14,borderStyle:'dashed',marginBottom:20,marginTop:4},
  addTimeTxt:{fontSize:14,fontWeight:'700',color:c.gold},
  noteInput:{marginTop:10,borderWidth:1,borderColor:'#eee6d9',borderRadius:10,paddingHorizontal:12,paddingVertical:9,fontSize:13,color:c.text,backgroundColor:c.cardAlt},
  saveFullBtn:{backgroundColor:c.primary,borderRadius:16,paddingVertical:16,alignItems:'center',marginTop:8},
  saveFullBtnTxt:{color:c.onPrimary,fontSize:15,fontWeight:'700'},
});
