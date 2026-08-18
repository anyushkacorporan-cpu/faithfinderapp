import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../src/lib/constants';
import { useUser, setUser, getUser } from '../src/lib/userStore';
import { useToast } from '../src/components/Toast';
import { autocompleteCity } from '../src/lib/googlePlaces';
import { useTranslation } from '../src/lib/i18n';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const user = useUser();
  const isChurch = user.accountType === 'church';
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [churchName, setChurchName] = useState(user.churchName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [locationSuggestions, setLocationSuggestions] = useState<{description:string;placeId:string}[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  async function handleLocationChange(text: string) {
    setLocation(text);
    if (text.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    const results = await autocompleteCity(text);
    setLocationSuggestions(results);
    setShowLocationSuggestions(results.length > 0);
  }

  function selectLocationSuggestion(description: string) {
    setLocation(description);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  }
  const [phone, setPhone] = useState(user.phone || '');
  const [website, setWebsite] = useState(user.website || '');
  const [address, setAddress] = useState(user.address || '');
  const [serviceTimes, setServiceTimes] = useState(user.serviceTimes || '');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [profilePhoto, setProfilePhoto] = useState(user.profilePhoto || '');
  const [coverPhoto, setCoverPhoto] = useState(user.coverPhoto || '');
  const [lifeVerse, setLifeVerse] = useState(user.lifeVerse || '');
  const [lifeVerseRef, setLifeVerseRef] = useState(user.lifeVerseRef || '');

  async function handlePickProfilePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
  }

  async function handlePickCoverPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [16,9] });
    if (!result.canceled) setCoverPhoto(result.assets[0].uri);
  }

  async function handleAddGalleryPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
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

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  }

  function handleSave() {
    if (isChurch) {
      setUser({ churchName, bio, location, phone, website, address, serviceTimes, avatar });
    } else {
      setUser({ firstName, lastName, bio, location, phone, profilePhoto, coverPhoto, lifeVerse, lifeVerseRef });
    }
    showToast('Saved!', 'Your profile has been updated.', 'success');
    router.back();
  }

  const initials = isChurch
    ? (churchName?.[0] || 'C').toUpperCase()
    : `${firstName?.[0] || 'U'}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('editProfile')}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveBtn}>{t('save')}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Photos */}
          {isChurch ? (
            <View style={s.avatarSection}>
              <TouchableOpacity style={s.avatarWrap} onPress={handlePickPhoto}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={s.avatarImg} />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarInitials}>{initials}</Text>
                  </View>
                )}
                <View style={s.avatarEditBadge}>
                  <Ionicons name="camera" size={14} color={COLORS.white} />
                </View>
              </TouchableOpacity>
              <Text style={s.avatarHint}>{t('tapToChangePhoto')}</Text>
            </View>
          ) : (
            <>
              <View style={{marginBottom:16}}>
                <TouchableOpacity onPress={handlePickCoverPhoto} activeOpacity={0.85}>
                  {coverPhoto ? (
                    <Image source={{uri:coverPhoto}} style={{width:'100%',height:120,borderRadius:16}} resizeMode="cover" />
                  ) : (
                    <View style={{width:'100%',height:120,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name="image-outline" size={26} color="#bbb" />
                    </View>
                  )}
                  <View style={{position:'absolute',bottom:8,right:8,flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:100,paddingHorizontal:10,paddingVertical:6}}>
                    <Ionicons name="camera" size={12} color={COLORS.white} />
                    <Text style={{color:COLORS.white,fontSize:11,fontWeight:'600'}}>{coverPhoto ? 'Change cover' : 'Add cover'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
              <View style={s.avatarSection}>
                <TouchableOpacity style={s.avatarWrap} onPress={handlePickProfilePhoto}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={s.avatarImg} />
                  ) : (
                    <View style={s.avatarFallback}>
                      <Text style={s.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={s.avatarEditBadge}>
                    <Ionicons name="camera" size={14} color={COLORS.white} />
                  </View>
                </TouchableOpacity>
                <Text style={s.avatarHint}>{t('tapToChangePhoto')}</Text>
              </View>
            </>
          )}

          {isChurch ? (
            <>
              <Text style={s.sectionTitle}>{t('churchInformation')}</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('churchName')}</Text>
                <TextInput style={s.input} value={churchName} onChangeText={setChurchName} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('address')}</Text>
                <TextInput style={s.input} value={address} onChangeText={setAddress} placeholder="123 Faith St, City, State" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('phone')}</Text>
                <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="(555) 000-0000" placeholderTextColor={COLORS.placeholder} keyboardType="phone-pad" />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('website')}</Text>
                <TextInput style={s.input} value={website} onChangeText={setWebsite} placeholder="www.yourchurch.org" placeholderTextColor={COLORS.placeholder} autoCapitalize="none" />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('serviceTimes')}</Text>
                <TextInput style={s.input} value={serviceTimes} onChangeText={setServiceTimes} placeholder="Sunday 9AM & 11AM" placeholderTextColor={COLORS.placeholder} />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>About / Bio</Text>
                <TextInput style={[s.input, s.bioInput]} value={bio} onChangeText={setBio} placeholder="Tell the community about your church..." placeholderTextColor={COLORS.placeholder} multiline />
              </View>
            </>
          ) : (
            <>
              <Text style={s.sectionTitle}>{t('personalInformation')}</Text>
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
                  <Text style={s.label}>{t('firstName')}</Text>
                  <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="First" placeholderTextColor={COLORS.placeholder} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>{t('lastName')}</Text>
                  <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Last" placeholderTextColor={COLORS.placeholder} />
                </View>
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('bio')}</Text>
                <TextInput style={[s.input, s.bioInput]} value={bio} onChangeText={setBio} placeholder="Tell the community about yourself..." placeholderTextColor={COLORS.placeholder} multiline />
              </View>

              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('cityState')}</Text>
                <TextInput
                  style={s.input}
                  value={location}
                  onChangeText={handleLocationChange}
                  placeholder="Bronx, NY"
                  placeholderTextColor={COLORS.placeholder}
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <View style={s.suggestionsBox}>
                    {locationSuggestions.map(item => (
                      <TouchableOpacity key={item.placeId} style={s.suggestionRow} onPress={() => selectLocationSuggestion(item.description)}>
                        <Ionicons name="location-outline" size={14} color="#999" />
                        <Text style={s.suggestionTxt}>{item.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={s.sectionTitle}>{t('favoriteVerse')}</Text>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('verse')}</Text>
                <TextInput
                  style={[s.input, s.bioInput]}
                  value={lifeVerse}
                  onChangeText={setLifeVerse}
                  placeholder={'"For I know the plans I have for you..."'}
                  placeholderTextColor={COLORS.placeholder}
                  multiline
                />
              </View>
              <View style={s.fieldWrap}>
                <Text style={s.label}>{t('reference')}</Text>
                <TextInput
                  style={s.input}
                  value={lifeVerseRef}
                  onChangeText={setLifeVerseRef}
                  placeholder="Jeremiah 29:11"
                  placeholderTextColor={COLORS.placeholder}
                />
              </View>

              <Text style={s.sectionTitle}>{t('faithGallery')}</Text>
              <View style={{marginBottom:20}}>
                <Text style={{fontSize:12,color:'#aaa',marginBottom:8}}>{t('faithGalleryDesc')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(user.photos || []).map((uri: string) => (
                    <View key={uri} style={{marginRight:10,position:'relative'}}>
                      <Image source={{uri}} style={{width:80,height:80,borderRadius:12}} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => handleRemoveGalleryPhoto(uri)}
                        style={{position:'absolute',top:-6,right:-6,width:22,height:22,borderRadius:11,backgroundColor:'#e74c6f',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:COLORS.white}}
                      >
                        <Ionicons name="close" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity onPress={handleAddGalleryPhoto} style={{width:80,height:80,borderRadius:12,borderWidth:1.5,borderColor:COLORS.gold,borderStyle:'dashed',alignItems:'center',justifyContent:'center'}}>
                    <Ionicons name="add" size={22} color={COLORS.gold} />
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </>
          )}

          <TouchableOpacity style={s.saveFullBtn} onPress={handleSave}>
            <Text style={s.saveFullBtnTxt}>{t('saveChanges')}</Text>
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
  saveBtn:{fontSize:15,fontWeight:'700',color:COLORS.gold},
  scroll:{paddingHorizontal:20,paddingTop:20},
  avatarSection:{alignItems:'center',marginBottom:28},
  avatarWrap:{position:'relative',marginBottom:8},
  avatarImg:{width:88,height:88,borderRadius:44},
  avatarFallback:{width:88,height:88,borderRadius:44,backgroundColor:COLORS.navy,alignItems:'center',justifyContent:'center'},
  avatarInitials:{color:COLORS.white,fontSize:30,fontWeight:'700'},
  avatarEditBadge:{position:'absolute',bottom:0,right:0,width:28,height:28,borderRadius:14,backgroundColor:COLORS.gold,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:COLORS.white},
  avatarHint:{fontSize:13,color:'#aaa'},
  sectionTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy,marginBottom:16},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,color:COLORS.navy},
  bioInput:{height:100,textAlignVertical:'top',paddingTop:12},
  suggestionsBox:{borderWidth:1,borderColor:COLORS.border,borderRadius:12,marginTop:6,overflow:'hidden'},
  suggestionRow:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:14,paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  suggestionTxt:{fontSize:13,color:COLORS.navy,flex:1},
  saveFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',marginTop:8,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  saveFullBtnTxt:{color:'#fff',fontSize:16,fontWeight:'700'},
});
