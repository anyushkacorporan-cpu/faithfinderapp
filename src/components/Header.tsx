import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { useUnreadCount } from '../lib/notificationsStore';
import { useTranslation } from '../lib/i18n';

/**
 * The app's two global controls — notification bell (with unread badge) and the
 * settings gear, which opens the Settings screen. This is the single definition of
 * both; place it wherever a screen needs them:
 *   - on its own slim row via <Header /> below (Community, Profile)
 *   - inline in a row the screen already has (the location line on Churches and
 *     Events), which costs no extra height. Pass `compact` there.
 *   - floating over a cover photo (Profile). Pass `overlay` there: the buttons
 *     become dark translucent circles with white glyphs so they stay readable
 *     over a light or a dark photo.
 */
export function HeaderIcons({ compact = false, overlay = false }: { compact?: boolean; overlay?: boolean } = {}) {
  const { t } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const unread = useUnreadCount();

  return (
    <>
      <View style={s.icons}>
        <TouchableOpacity style={[s.iconBtn, compact && s.iconBtnCompact, overlay && s.iconBtnOverlay]} activeOpacity={0.7} onPress={() => router.push('/notifications')}>
          {overlay && <BlurView intensity={26} tint="dark" style={[StyleSheet.absoluteFill, s.overlayBlur]} />}
          <Ionicons name="notifications-outline" size={compact ? 19 : 22} color={overlay ? '#fff' : c.text} />
          {unread > 0 && (
            <View style={s.badge}><Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[s.iconBtn, compact && s.iconBtnCompact, overlay && s.iconBtnOverlay]} activeOpacity={0.7} onPress={() => router.push('/settings')}>
          {overlay && <BlurView intensity={26} tint="dark" style={[StyleSheet.absoluteFill, s.overlayBlur]} />}
          <Ionicons name="settings-outline" size={compact ? 19 : 22} color={overlay ? '#fff' : c.text} />
        </TouchableOpacity>
      </View>

    </>
  );
}

/**
 * A slim, right-aligned row carrying HeaderIcons. Replaces the old wordmark bar:
 * same controls, no repeated "FaithFinder App" on every tab.
 */
/**
 * The app's top bar: a slot on the left, the bell and gear on the right.
 *
 * `left` exists so a screen can put its own control up here - the Community
 * tab's search field - without this shared component learning about any
 * particular screen. Screens that pass nothing get exactly what they had.
 */
export default function Header({ left }: { left?: React.ReactNode } = {}) {
  const c = useThemeColors();
  const s = makeStyles(c);
  return (
    <View style={[s.header, !!left && s.headerWithLeft]}>
      {!!left && <View style={s.headerLeft}>{left}</View>}
      <HeaderIcons />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',paddingHorizontal:16,paddingTop:6,paddingBottom:8,backgroundColor:c.card},
  headerWithLeft:{justifyContent:'space-between',gap:10},
  headerLeft:{flex:1,minWidth:0},
  icons:{flexDirection:'row',gap:6},
  iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center',position:'relative'},
  iconBtnCompact:{width:32,height:32,borderRadius:10},
  iconBtnOverlay:{backgroundColor:'rgba(255,255,255,0.20)',borderRadius:19,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,0.35)'},
  overlayBlur:{borderRadius:19,overflow:'hidden'},
  badge:{position:'absolute',top:-5,right:-5,minWidth:20,height:20,borderRadius:10,backgroundColor:c.red,alignItems:'center',justifyContent:'center',paddingHorizontal:5,borderWidth:2,borderColor:c.card},
  // 9px in an 18px circle read as a plain red dot - the number was there and
  // nobody could see it. Big enough to actually count at a glance.
  badgeTxt:{color:c.white,fontSize:11,fontWeight:'800',lineHeight:13},
});
