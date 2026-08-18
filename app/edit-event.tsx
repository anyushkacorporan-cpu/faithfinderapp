import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { getEvents, updateEvent } from '../src/lib/eventsStore';

export default function EditEventScreen() {
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
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <Text style={s.hdrTitle}>Edit Event</Text>
          <View style={{width:36}} />
        </View>
        <View style={s.notFound}>
          <Ionicons name="alert-circle-outline" size={40} color="#ddd" />
          <Text style={s.notFoundTxt}>Event not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  function handleSave() {
    if (!title.trim()) { Alert.alert('Title required', 'Please enter an event title.'); return; }
    const parsedPrice = isPaid ? parseFloat(priceText) : 0;
    if (isPaid && (isNaN(parsedPrice) || parsedPrice < 0)) {
      Alert.alert('Invalid price', 'Please enter a valid ticket price.');
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
    Alert.alert('Saved', 'Your event has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>Edit Event</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={s.saveTxt}>Save</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.fieldWrap}>
            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={COLORS.placeholder} />
          </View>

          <View style={s.row}>
            <View style={[s.fieldWrap, {flex:1, marginRight:8}]}>
              <Text style={s.label}>Date</Text>
              <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="e.g. Jan 15, 2026" placeholderTextColor={COLORS.placeholder} />
            </View>
            <View style={[s.fieldWrap, {flex:1}]}>
              <Text style={s.label}>Time</Text>
              <TextInput style={s.input} value={time} onChangeText={setTime} placeholder="e.g. 3:00 PM" placeholderTextColor={COLORS.placeholder} />
            </View>
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, s.multiline]} value={description} onChangeText={setDescription} placeholder="Tell people about your event..." placeholderTextColor={COLORS.placeholder} multiline />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>Ticket Type</Text>
            <View style={s.ticketRow}>
              <TouchableOpacity style={[s.ticketBtn, !isPaid && s.ticketBtnActive]} onPress={() => setIsPaid(false)}>
                <Ionicons name="gift-outline" size={18} color={!isPaid ? COLORS.white : '#999'} />
                <Text style={[s.ticketBtnTxt, !isPaid && s.ticketBtnTxtActive]}>Free</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ticketBtn, isPaid && s.ticketBtnActive]} onPress={() => setIsPaid(true)}>
                <Ionicons name="cash-outline" size={18} color={isPaid ? COLORS.white : '#999'} />
                <Text style={[s.ticketBtnTxt, isPaid && s.ticketBtnTxtActive]}>Paid</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isPaid && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>Ticket Price ($)</Text>
              <TextInput style={s.input} value={priceText} onChangeText={setPriceText} placeholder="25.00" placeholderTextColor={COLORS.placeholder} keyboardType="decimal-pad" />
            </View>
          )}

          <Text style={s.note}>Note: this quick-edit updates the core event details. Venue, speakers, and agenda aren't editable here yet.</Text>

          <TouchableOpacity style={s.saveFullBtn} onPress={handleSave}>
            <Text style={s.saveFullBtnTxt}>Save Changes</Text>
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
  saveTxt:{fontSize:15,fontWeight:'700',color:COLORS.gold},
  scroll:{paddingHorizontal:20,paddingTop:20},
  fieldWrap:{marginBottom:16},
  row:{flexDirection:'row'},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  input:{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingHorizontal:16,paddingVertical:13,fontSize:15,color:COLORS.navy},
  multiline:{height:100,textAlignVertical:'top',paddingTop:12},
  ticketRow:{flexDirection:'row',gap:10},
  ticketBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,paddingVertical:14},
  ticketBtnActive:{backgroundColor:COLORS.navy,borderColor:COLORS.navy},
  ticketBtnTxt:{fontSize:14,fontWeight:'700',color:'#999'},
  ticketBtnTxtActive:{color:COLORS.white},
  note:{fontSize:12,color:'#aaa',marginBottom:20,lineHeight:17},
  saveFullBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,alignItems:'center',shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  saveFullBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  notFound:{flex:1,alignItems:'center',justifyContent:'center',gap:10},
  notFoundTxt:{fontSize:15,color:'#999',fontWeight:'600'},
});
