#!/bin/bash
cd ~/Desktop/FaithFinderApp

# Create a reusable Logo component
cat > src/components/Logo.tsx << 'EOF'
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../lib/constants';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const fontSize = size === 'large' ? 30 : size === 'small' ? 18 : 22;
  const crossH = size === 'large' ? 28 : size === 'small' ? 18 : 22;
  const crossW = size === 'large' ? 14 : size === 'small' ? 10 : 12;
  const barH = size === 'large' ? 9 : size === 'small' ? 6 : 7;

  return (
    <View style={s.wrap}>
      <View style={[s.crossIcon, { height: crossH }]}>
        <View style={[s.crossV, { height: crossH }]} />
        <View style={[s.crossH, { width: crossW, top: barH }]} />
      </View>
      <Text style={[s.txt, { fontSize }]}>FaithFinder App</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crossIcon: { width: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  crossV: { position: 'absolute', width: 2, backgroundColor: COLORS.gold },
  crossH: { position: 'absolute', height: 2, backgroundColor: COLORS.gold },
  txt: { fontFamily: 'PlayfairDisplay_700Bold', color: COLORS.navy },
});
EOF
echo "Logo component done"

# Fix Header to use Logo component
cat > src/components/Header.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS } from '../lib/constants';
import { useNotifications, useUnreadCount, markRead, markAllRead } from '../lib/notificationsStore';
import Logo from './Logo';

export default function Header() {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const notifications = useNotifications();
  const unread = useUnreadCount();

  function handleNotifTap(notif: any) {
    markRead(notif.id);
    setShowNotifs(false);
    if (notif.navigateTo) {
      if (notif.navigateParams) {
        router.push({ pathname: notif.navigateTo as any, params: notif.navigateParams });
      } else {
        router.push(notif.navigateTo as any);
      }
    }
  }

  const TYPE_LABELS: Record<string, string> = {
    like: 'Like', church_post: 'Church Post', event: 'Event',
    comment: 'Comment', share: 'Share', invite: 'Invite', verification: 'Verification',
  };

  return (
    <>
      <View style={s.header}>
        <Logo size="small" />
        <View style={s.icons}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowNotifs(true)}>
            <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
            {unread > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={22} color={COLORS.navy} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal visible={showNotifs} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowNotifs(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Notifications</Text>
            <View style={s.sheetHdrRight}>
              {unread > 0 && (
                <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
                  <Text style={s.markAllTxt}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.closeBtn} onPress={() => setShowNotifs(false)}>
                <Ionicons name="close" size={20} color={COLORS.navy} />
              </TouchableOpacity>
            </View>
          </View>
          {notifications.length === 0 ? (
            <View style={s.emptyNotifs}>
              <Ionicons name="notifications-outline" size={40} color="#ddd" />
              <Text style={s.emptyNotifsTxt}>No notifications yet</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.map(n => (
                <TouchableOpacity key={n.id} style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} activeOpacity={0.75}>
                  <View style={[s.notifIconWrap, { backgroundColor: n.color + '20' }]}>
                    <Ionicons name={n.icon as any} size={20} color={n.color} />
                  </View>
                  <View style={s.notifContent}>
                    <View style={s.notifTopRow}>
                      <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                      {!n.read && <View style={s.unreadDot} />}
                    </View>
                    <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                    <View style={s.notifBottomRow}>
                      <View style={[s.typePill, { backgroundColor: n.color + '18' }]}>
                        <Text style={[s.typePillTxt, { color: n.color }]}>{TYPE_LABELS[n.type]}</Text>
                      </View>
                      <Text style={s.notifTime}>{n.time}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#ddd" />
                </TouchableOpacity>
              ))}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowSettings(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHdr}>
            <Text style={s.sheetTitle}>Settings</Text>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={20} color={COLORS.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[
              { icon:'person-outline', label:'Edit Profile', color:'#667eea' },
              { icon:'notifications-outline', label:'Notification Preferences', color:COLORS.gold },
              { icon:'location-outline', label:'Location Settings', color:COLORS.green },
              { icon:'shield-outline', label:'Privacy & Security', color:COLORS.navy },
              { icon:'moon-outline', label:'Appearance', color:'#9b59b6' },
              { icon:'help-circle-outline', label:'Help & Support', color:'#e67e22' },
              { icon:'information-circle-outline', label:'About FaithFinder', color:'#aaa' },
              { icon:'log-out-outline', label:'Sign Out', color:COLORS.red },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={s.settingRow} onPress={() => {
                setShowSettings(false);
                if (item.label === 'Sign Out') { router.replace('/login'); }
                else { Alert.alert(item.label, 'Coming soon!'); }
              }}>
                <View style={[s.settingIconWrap, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[s.settingLabel, item.label === 'Sign Out' && { color: COLORS.red }]}>{item.label}</Text>
                {item.label !== 'Sign Out' && <Ionicons name="chevron-forward" size={16} color="#ddd" />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:COLORS.border,backgroundColor:COLORS.white},
  icons:{flexDirection:'row',gap:6},
  iconBtn:{width:38,height:38,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',position:'relative'},
  badge:{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,backgroundColor:COLORS.red,alignItems:'center',justifyContent:'center',paddingHorizontal:3,borderWidth:2,borderColor:COLORS.white},
  badgeTxt:{color:COLORS.white,fontSize:9,fontWeight:'700'},
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.4)'},
  sheet:{backgroundColor:COLORS.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,maxHeight:'80%'},
  sheetHdr:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20},
  sheetHdrRight:{flexDirection:'row',alignItems:'center',gap:10},
  sheetTitle:{fontSize:20,fontWeight:'700',color:COLORS.navy},
  markAllBtn:{backgroundColor:COLORS.lightBg,borderRadius:100,paddingHorizontal:12,paddingVertical:6},
  markAllTxt:{fontSize:12,fontWeight:'600',color:COLORS.navy},
  closeBtn:{width:32,height:32,borderRadius:16,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'},
  emptyNotifs:{paddingVertical:40,alignItems:'center',gap:10},
  emptyNotifsTxt:{fontSize:14,color:'#bbb',fontWeight:'600'},
  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  notifRowUnread:{backgroundColor:'rgba(201,169,110,0.04)'},
  notifIconWrap:{width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center',flexShrink:0},
  notifContent:{flex:1},
  notifTopRow:{flexDirection:'row',alignItems:'center',gap:6,marginBottom:3},
  notifTitle:{fontSize:14,fontWeight:'700',color:COLORS.navy,flex:1},
  unreadDot:{width:8,height:8,borderRadius:4,backgroundColor:COLORS.gold,flexShrink:0},
  notifBody:{fontSize:13,color:'#666',lineHeight:18,marginBottom:6},
  notifBottomRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  typePill:{borderRadius:100,paddingHorizontal:8,paddingVertical:3},
  typePillTxt:{fontSize:10,fontWeight:'700'},
  notifTime:{fontSize:11,color:'#bbb'},
  settingRow:{flexDirection:'row',alignItems:'center',gap:14,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},
  settingIconWrap:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},
  settingLabel:{flex:1,fontSize:15,color:COLORS.navy,fontWeight:'500'},
});
EOF
echo "Header done"

# Fix login.tsx to use Logo component
cat > app/login.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';
import Logo from '../src/components/Logo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  function handleLogin() {
    setError('');
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setError('Please enter your password.'); return; }
    setUser({ email });
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.root} edges={['top','bottom']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.logoWrap}>
            <Logo size="large" />
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord.</Text>
          <Text style={s.verseRef}>— Jeremiah 29:11</Text>
          <View style={s.card}>
            <Text style={s.cardSub}>Sign in to your FaithFinder account</Text>
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon]} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={v => { setEmail(v); setError(''); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#bbb" style={s.inputIcon} />
                <TextInput style={[s.input, s.inputWithIcon, {paddingRight:50}]} placeholder="Enter your password" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={v => { setPassword(v); setError(''); }} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.forgotWrap} onPress={() => router.push('/forgot')}>
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.signInBtn} onPress={handleLogin} activeOpacity={0.88}>
              <Text style={s.signInTxt}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>
            <TouchableOpacity style={s.signUpBtn} onPress={() => router.push('/signup')} activeOpacity={0.88}>
              <Text style={s.signUpTxt}>Create an Account</Text>
            </TouchableOpacity>
            <View style={s.termsWrap}>
              <Text style={s.termsTxt}>By signing in you agree to our </Text>
              <TouchableOpacity><Text style={s.termsLink}>Privacy Policy</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  scroll:{flexGrow:1,paddingHorizontal:24,paddingTop:48},
  logoWrap:{alignItems:'center',marginBottom:16},
  verse:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20,paddingHorizontal:20},
  verseRef:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:12,color:COLORS.gold,textAlign:'center',marginTop:4,marginBottom:32},
  card:{backgroundColor:COLORS.white,borderRadius:24,borderWidth:1,borderColor:'#ebe8e2',padding:24,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:12},
  cardSub:{fontSize:14,color:'#aaa',marginBottom:24},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:16},
  errTxt:{color:'#dc2626',fontSize:13,flex:1},
  fieldWrap:{marginBottom:16},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:8},
  inputWrap:{position:'relative'},
  inputIcon:{position:'absolute',left:14,top:15,zIndex:1},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  inputWithIcon:{paddingLeft:44},
  eyeBtn:{position:'absolute',right:14,top:13},
  forgotWrap:{alignSelf:'flex-end',marginBottom:20,marginTop:-4},
  forgotTxt:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  signInBtn:{backgroundColor:COLORS.navy,borderRadius:16,paddingVertical:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginBottom:16,shadowColor:COLORS.navy,shadowOffset:{width:0,height:4},shadowOpacity:0.25,shadowRadius:8},
  signInTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  dividerRow:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},
  dividerLine:{flex:1,height:1,backgroundColor:'#f0ede8'},
  dividerTxt:{fontSize:13,color:'#ccc',fontWeight:'600'},
  signUpBtn:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:16,paddingVertical:15,alignItems:'center',marginBottom:20},
  signUpTxt:{fontSize:15,fontWeight:'700',color:COLORS.navy},
  termsWrap:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap'},
  termsTxt:{fontSize:12,color:'#bbb'},
  termsLink:{fontSize:12,color:COLORS.gold,fontWeight:'600'},
});
EOF
echo "Login done"

# Fix signup.tsx to use Logo component
cat > app/signup.tsx << 'EOF'
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { setUser } from '../src/lib/userStore';
import Logo from '../src/components/Logo';

export default function SignupScreen() {
  const [accountType, setAccountType] = useState<'personal'|'church'>('personal');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  function handleCreate() {
    setError('');
    if (accountType === 'personal') {
      if (!firstName || !lastName) { setError('Please enter your first and last name.'); return; }
    } else {
      if (!churchName) { setError('Please enter your church name.'); return; }
    }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setUser({ accountType, firstName, lastName, churchName, email });
    if (accountType === 'church') {
      router.push('/church-setup');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
          </TouchableOpacity>
          <View style={s.logoWrap}>
            <Logo size="medium" />
          </View>
          <Text style={s.verse}>"For I know the plans I have for you," declares the Lord. — Jeremiah 29:11</Text>
          <View style={s.card}>
            <View style={s.typeRow}>
              <TouchableOpacity style={[s.typeBtn, accountType==='personal' && s.typeBtnActive]} onPress={() => setAccountType('personal')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='personal' && s.typeIconWrapActive]}>
                  <Ionicons name="person" size={22} color={accountType==='personal' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='personal' && s.typeLblActive]}>Community</Text>
                <Text style={[s.typeSub, accountType==='personal' && s.typeSubActive]}>Individual believer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, accountType==='church' && s.typeBtnActive]} onPress={() => setAccountType('church')} activeOpacity={0.85}>
                <View style={[s.typeIconWrap, accountType==='church' && s.typeIconWrapActive]}>
                  <Ionicons name="home-outline" size={22} color={accountType==='church' ? COLORS.white : '#bbb'} />
                </View>
                <Text style={[s.typeLbl, accountType==='church' && s.typeLblActive]}>Church</Text>
                <Text style={[s.typeSub, accountType==='church' && s.typeSubActive]}>Ministry or organization</Text>
              </TouchableOpacity>
            </View>
            {!!error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle-outline" size={16} color='#dc2626' />
                <Text style={s.errTxt}>{error}</Text>
              </View>
            )}
            {accountType === 'personal' ? (
              <View style={s.row}>
                <View style={[s.fieldWrap, {flex:1, marginRight:10}]}>
                  <Text style={s.label}>First Name</Text>
                  <TextInput style={s.input} placeholder="John" placeholderTextColor={COLORS.placeholder} value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[s.fieldWrap, {flex:1}]}>
                  <Text style={s.label}>Last Name</Text>
                  <TextInput style={s.input} placeholder="Doe" placeholderTextColor={COLORS.placeholder} value={lastName} onChangeText={setLastName} />
                </View>
              </View>
            ) : (
              <View style={s.fieldWrap}>
                <Text style={s.label}>Church Name</Text>
                <TextInput style={s.input} placeholder="Grace Community Church" placeholderTextColor={COLORS.placeholder} value={churchName} onChangeText={setChurchName} />
              </View>
            )}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={COLORS.placeholder} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="8+ characters" placeholderTextColor={COLORS.placeholder} value={password} onChangeText={setPassword} secureTextEntry={!showPw} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPw(!showPw)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm Password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, {paddingRight:50}]} placeholder="Re-enter" placeholderTextColor={COLORS.placeholder} value={confirm} onChangeText={setConfirm} secureTextEntry={!showConfirm} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={s.primaryBtn} onPress={handleCreate} activeOpacity={0.88}>
              <Text style={s.primaryBtnTxt}>{accountType === 'church' ? 'Continue to Claim Church' : 'Create Account'}</Text>
              {accountType === 'church' && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </TouchableOpacity>
            <Text style={s.terms}>By creating an account, you agree to our <Text style={s.termsLink}>Privacy Policy</Text> and <Text style={s.termsLink}>Terms of Service</Text></Text>
          </View>
          <View style={s.signinRow}>
            <Text style={s.signinTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.back()}><Text style={s.signinLink}>Sign In</Text></TouchableOpacity>
          </View>
          <View style={{height:20}} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:{flex:1,backgroundColor:'#f8f7f4'},
  scroll:{flexGrow:1,paddingHorizontal:20,paddingTop:16},
  backBtn:{width:40,height:40,borderRadius:20,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center',marginBottom:12},
  logoWrap:{alignItems:'center',marginBottom:10},
  verse:{fontFamily:'PlayfairDisplay_400Regular_Italic',fontSize:13,color:'#aaa',textAlign:'center',lineHeight:20,marginBottom:24,paddingHorizontal:10},
  card:{backgroundColor:COLORS.white,borderRadius:24,borderWidth:1,borderColor:'#ebe8e2',padding:20,shadowColor:'#000',shadowOffset:{width:0,height:2},shadowOpacity:0.06,shadowRadius:12},
  typeRow:{flexDirection:'row',gap:10,marginBottom:20},
  typeBtn:{flex:1,alignItems:'center',borderWidth:1.5,borderColor:'#e8e3da',borderRadius:16,paddingVertical:14,paddingHorizontal:8,gap:6,backgroundColor:COLORS.white},
  typeBtnActive:{borderColor:COLORS.gold,backgroundColor:'#fffbf5'},
  typeIconWrap:{width:44,height:44,borderRadius:22,backgroundColor:'#f0ede8',alignItems:'center',justifyContent:'center'},
  typeIconWrapActive:{backgroundColor:COLORS.navy},
  typeLbl:{fontSize:14,fontWeight:'700',color:'#aaa'},
  typeLblActive:{color:COLORS.navy},
  typeSub:{fontSize:11,color:'#ccc',textAlign:'center'},
  typeSubActive:{color:'#888'},
  errBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#fef2f2',borderRadius:12,padding:12,marginBottom:14},
  errTxt:{color:'#dc2626',fontSize:13,flex:1},
  row:{flexDirection:'row'},
  fieldWrap:{marginBottom:14},
  label:{fontSize:13,fontWeight:'600',color:'#444',marginBottom:6},
  input:{borderWidth:1.5,borderColor:'#e8e3da',borderRadius:14,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:COLORS.navy,backgroundColor:COLORS.white},
  pwWrap:{position:'relative'},
  eyeBtn:{position:'absolute',right:14,top:13},
  primaryBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingVertical:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8,marginTop:6},
  primaryBtnTxt:{color:COLORS.white,fontSize:16,fontWeight:'700'},
  terms:{fontSize:11,color:'#bbb',textAlign:'center',marginTop:14,lineHeight:17},
  termsLink:{color:COLORS.gold,fontWeight:'600'},
  signinRow:{flexDirection:'row',justifyContent:'center',alignItems:'center',paddingTop:20},
  signinTxt:{fontSize:14,color:'#aaa'},
  signinLink:{fontSize:14,fontWeight:'700',color:COLORS.gold},
});
EOF
echo "Signup done"

echo "ALL DONE"
