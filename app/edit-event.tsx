import { useState } from 'react';
import { useTranslation } from '../src/lib/i18n';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { getEvents, updateEvent } from '../src/lib/eventsStore';
import { KeyboardScreen } from '../src/components/KeyboardScreen';

export default function EditEventScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const params = useLocalSearchParams<{ id?: string }>();
  const event = getEvents().find(e => e.id === params.id);

  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [date, setDate] = useState(event?.date || '');
  const [time, setTime] = useState(event?.time || '');
  const [isPaid, setIsPaid] = useState(event?.isPaid || false);
  const [priceText, setPriceText] = useState(event?.isPaid ? String(event.ticketPrice) : '');

  if (!event) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.hdr}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>{t('editEvent')}</Text>
          <View style={{width:36}} />
        </View>
        <View style={s.notFound}>
          <Ionicons name="alert-circle-outline" size={40} color={c.placeholder} />
          <Text style={s.notFoundTxt}>{t('eventNotFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function handleSave() {
    if (!title.trim()) { Alert.alert(tx('Title required'), tx('Please enter an event title.')); return; }
    const parsedPrice = isPaid ? parseFloat(priceText) : 0;
    if (isPaid && (isNaN(parsedPrice) || parsedPrice < 0)) {
      Alert.alert(tx('Invalid price'), tx('Please enter a valid ticket price.'));
      return;
    }
    const platformFee = isPaid ? parseFloat((parsedPrice * 0.015).toFixed(2)) : 0;
    const creatorPayout = isPaid ? parseFloat((parsedPrice - platformFee).toFixed(2)) : 0;
    updateEvent(event!.id, {
      title: title.trim(),
      description: description.trim(),
      summary: description.trim(),
      date: date.trim(),
      time: time.trim(),
      isPaid,
      ticketPrice: parsedPrice,
      price: isPaid ? '$' + parsedPrice.toFixed(2) : 'Free',
      platformFee,
      creatorPayout,
    });
    Alert.alert(tx('Saved'), tx('Your event has been updated.'), [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('editEvent')}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveTxt}>{t('save')}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardScreen>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('title')}</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder={tx('Event title')} placeholderTextColor={c.placeholder} />
          </View>

          <View style={s.row}>
            <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
              <Text style={s.label}>{t('dateLabel')}</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} placeholder={tx('e.g. Jan 15, 2026')} placeholderTextColor={c.placeholder} />
            </View>
            <View style={[s.fieldWrap, {flex:1}]}>
              <Text style={s.label}>{t('timeLabel')}</Text>
              <TextInput style={s.input} value={time} onChangeText={setTime} placeholder={tx('e.g. 3:00 PM')} placeholderTextColor={c.placeholder} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('description')}</Text>
            <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription} placeholder={tx('Tell people about your event...')} placeholderTextColor={c.placeholder} multiline />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>{t('ticketType')}</Text>
            <View style={s.ticketRow}>
              <TouchableOpacity style={[s.ticketBtn, !isPaid && s.ticketBtnActive]} onPress={() => setIsPaid(false)}>
                <Ionicons name="gift-outline" size={18} color={!isPaid ? c.white : c.textMuted} />
                <Text style={[s.ticketBtnTxt, !isPaid && s.ticketBtnTxtActive]}>{t('free')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ticketBtn, isPaid && s.ticketBtnActive]} onPress={() => setIsPaid(true)}>
                <Ionicons name="cash-outline" size={18} color={isPaid ? c.white : c.textMuted} />
                <Text style={[s.ticketBtnTxt, isPaid && s.ticketBtnTxtActive]}>{t('paid')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isPaid && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Ticket Price ($)</Text>
              <TextInput style={s.input} value={priceText} onChangeText={setPriceText} placeholder="25.00" placeholderTextColor={c.placeholder} keyboardType="decimal-pad" />
            </View>
          )}

          <Text style={s.note}>Note: this quick-edit updates the core event details. Venue, speakers, and agenda aren't editable here yet.</Text>

          <TouchableOpacity style={s.saveFullBtn} onPress={handleSave}>
            <Text style={s.saveFullBtnTxt}>{t('saveChanges')}</Text>
          </TouchableOpacity>
          <View style={{height:40}} />
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.card},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  saveTxt:{fontSize:15,fontWeight:'700',color:c.gold},
  scroll:{paddingHorizontal:20,paddingTop:20},
  fieldWrap:{marginBottom:16},
  row:{flexDirection:'row'},
  label:{fontSize:13,fontWeight:'600',color:c.textSecondary,marginBottom:8},
  input:{borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,color:c.text},
  multiline:{height:100,textAlignVertical:'top',paddingTop:12},
  ticketRow:{flexDirection:'row',gap:10},
  ticketBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:c.border,borderRadius:14,paddingVertical:14},
  ticketBtnActive:{backgroundColor:c.primary,borderColor:c.primary},
  ticketBtnTxt:{fontSize:14,fontWeight:'700',color:c.textMuted},
  ticketBtnTxtActive:{color:c.onPrimary},
  note:{fontSize:12,color:c.textMuted,marginBottom:20,lineHeight:17},
  saveFullBtn:{backgroundColor:c.primary,borderRadius:16,paddingVertical:16,alignItems:'center',shadowColor:c.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  saveFullBtnTxt:{color:c.onPrimary,fontSize:16,fontWeight:'700'},
  notFound:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
  notFoundTxt:{fontSize:15,color:c.textMuted,fontWeight:'600'},
});
