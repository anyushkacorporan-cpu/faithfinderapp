import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useSettings, updateAppearancePrefs } from '../src/lib/settingsStore';
import { useTranslation } from '../src/lib/i18n';

export default function AppearanceSettingsScreen() {
  const { t } = useTranslation();
  const appSettings = useSettings();
  const { theme, fontSize, language } = appSettings.appearance;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('appearance')}</Text>
        <View style={{width:36}} />
      </View>
      <ScrollView contentContainerStyle={s.scroll}>

        <Text style={s.sectionLabel}>Theme</Text>
        <View style={s.card}>
          {[
            {id:'light', label:'Light', icon:'sunny-outline', color:'#f39c12'},
            {id:'dark', label:'Dark', icon:'moon-outline', color:'#2c3e50'},
            {id:'system', label:'System Default', icon:'phone-portrait-outline', color:'#7f8c8d'},
          ].map((item,i,arr) => (
            <TouchableOpacity key={item.id} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => updateAppearancePrefs({theme: item.id as any})}>
              <View style={[s.iconWrap, {backgroundColor: item.color+'18'}]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={s.rowLabel}>{item.label}</Text>
              {theme===item.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Text Size</Text>
        <View style={s.card}>
          {[
            {id:'small', label:'Small'},
            {id:'medium', label:'Medium (Default)'},
            {id:'large', label:'Large'},
          ].map((item,i,arr) => (
            <TouchableOpacity key={item.id} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => updateAppearancePrefs({fontSize: item.id as any})}>
              <Text style={[s.rowLabel, item.id==='small'&&{fontSize:12}, item.id==='large'&&{fontSize:17}]}>{item.label}</Text>
              {fontSize===item.id && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Language</Text>
        <View style={s.card}>
          {['English','Español'].map((lang,i,arr) => (
            <TouchableOpacity key={lang} style={[s.row, i<arr.length-1&&s.rowBorder]} onPress={() => updateAppearancePrefs({language: lang})}>
              <Text style={s.rowLabel}>{lang}</Text>
              {language===lang && <Ionicons name="checkmark-circle" size={22} color={COLORS.navy} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={() => router.back()}>
          <Text style={s.saveBtnTxt}>Save Preferences</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:COLORS.navy},
  scroll:{padding:20},
  sectionLabel:{fontSize:12,fontWeight:'700',color:'#aaa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,marginTop:4},
  card:{backgroundColor:COLORS.white,borderRadius:16,borderWidth:1,borderColor:COLORS.border,overflow:'hidden',marginBottom:16},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  iconWrap:{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'},
  rowLabel:{flex:1,fontSize:14,fontWeight:'600',color:COLORS.navy},
  saveBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:15,alignItems:'center',marginTop:8},
  saveBtnTxt:{color:'#fff',fontSize:15,fontWeight:'700'},
});
