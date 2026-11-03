import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import {
  fetchAttendees, checkIn, flushCheckinQueue, queuedCount,
  Attendee, ScanOutcome,
} from '../src/lib/checkinApi';

/**
 * The door.
 *
 * One screen, because a person on a door has one hand free: the camera fills
 * it, the answer lands over the top, and the list is a tap away for the
 * phone that will not cooperate.
 *
 * The scanner keeps running between scans and is gated by a cooldown rather
 * than being torn down and rebuilt. A QR code in front of a camera fires
 * onBarcodeScanned many times a second, and restarting the camera for each
 * one is both slow and a good way to miss the next person.
 */
export default function EventCheckinScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id: string; title: string }>();
  const eventId = params.id || '';

  const [permission, requestPermission] = useCameraPermissions();
  const [tab, setTab] = useState<'scan' | 'list'>('scan');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<(ScanOutcome & { code?: string }) | null>(null);
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(0);
  // Admitted on this device since the list was last pulled down. Held as
  // state rather than read out of usedRef, because a ref does not re-render
  // and the count above the camera has to move as people come in.
  const [admittedHere, setAdmittedHere] = useState(0);

  // Codes admitted on this device, so a second scan is caught instantly even
  // with no signal and before the list is refreshed.
  const usedRef = useRef<Set<string>>(new Set());
  // onBarcodeScanned fires continuously while a code is in frame.
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    const list = await fetchAttendees(eventId);
    if (list) {
      setAttendees(list);
      const used = new Set<string>();
      for (const a of list) {
        // The list says how many of a holder's seats are in, not which, so
        // the first N codes stand in for them. It only has to be right about
        // the count; the server decides which code is actually spent.
        a.codes.slice(0, a.checkedIn).forEach(code => used.add(code));
      }
      usedRef.current = used;
      // The server's own count now includes anything this device sent, so
      // counting it again here would double it.
      setAdmittedHere(0);
    }
    setLoading(false);
  }, [eventId]);

  useFocusEffect(useCallback(() => {
    void load();
    void flushCheckinQueue().then(({ left }) => setPending(left));
  }, [load]));

  useEffect(() => { void queuedCount().then(setPending); }, [result]);

  const inCount = useMemo(
    () => attendees.reduce((n, a) => n + a.checkedIn, 0) + admittedHere,
    [attendees, admittedHere],
  );
  const expected = useMemo(() => attendees.reduce((n, a) => n + a.seats, 0), [attendees]);

  async function admit(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;

    const outcome = await checkIn(eventId, code, attendees, usedRef.current);
    if (outcome.status === 'ok') {
      usedRef.current.add(code.trim().toUpperCase());
      setAdmittedHere(n => n + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setResult({ ...outcome, code });

    // Long enough to read the answer, short enough for a queue.
    setTimeout(() => { busyRef.current = false; setResult(null); }, 2200);
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter(a =>
      a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q));
  }, [attendees, search]);

  function Banner() {
    if (!result) return null;
    const good = result.status === 'ok';
    const warn = result.status === 'already';
    const bg = good ? c.green : warn ? c.gold : c.red;
    const title =
      result.status === 'ok' ? t('checkedIn')
      : result.status === 'already' ? t('alreadyCheckedIn')
      : result.status === 'wrong_event' ? t('wrongEvent')
      : result.status === 'refunded' ? t('ticketRefunded')
      : result.status === 'cancelled' ? t('eventCancelledWord')
      : result.status === 'forbidden' ? t('notYourEvent')
      : t('ticketNotValid');
    const sub =
      result.status === 'ok'
        ? `${(result as any).name} · ${(result as any).seats} ${(result as any).seats === 1 ? t('seatWord') : t('seatsWord')}`
        : result.status === 'already' && (result as any).at
          ? new Date((result as any).at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : result.code || '';
    return (
      <View style={[s.banner, { backgroundColor: bg }]}>
        <Ionicons
          name={good ? 'checkmark-circle' : warn ? 'alert-circle' : 'close-circle'}
          size={30} color="#fff"
        />
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>{title}</Text>
          {!!sub && <Text style={s.bannerSub}>{sub}</Text>}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.hdrTitle} numberOfLines={1}>{params.title || t('checkIn')}</Text>
          <Text style={s.hdrCount}>
            {inCount} {t('ofWord')} {expected} {t('checkedInLower')}
            {pending > 0 ? ` · ${pending} ${t('waitingToSync')}` : ''}
          </Text>
        </View>
      </View>

      <View style={s.tabs}>
        {(['scan', 'list'] as const).map(id => (
          <TouchableOpacity
            key={id}
            style={[s.tab, tab === id && s.tabOn]}
            onPress={() => setTab(id)}
          >
            <Text style={[s.tabTxt, tab === id && s.tabTxtOn]}>
              {id === 'scan' ? t('scanWord') : t('attendeesWord')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'scan' ? (
        <View style={{ flex: 1 }}>
          {!permission ? (
            <View style={s.center}><ActivityIndicator color={c.gold} /></View>
          ) : !permission.granted ? (
            <View style={s.center}>
              <Ionicons name="camera-outline" size={44} color={c.textMuted} />
              <Text style={s.permTxt}>{t('cameraNeededForCheckin')}</Text>
              <TouchableOpacity style={s.permBtn} onPress={() => void requestPermission()}>
                <Text style={s.permBtnTxt}>{t('allowCamera')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => { void admit(String(data || '')); }}
              />
              <View style={s.reticle} pointerEvents="none" />
              <Banner />
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color={c.textMuted} />
            <TextInput
              style={s.search}
              placeholder={t('searchByName')}
              placeholderTextColor={c.placeholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
          {loading ? (
            <View style={s.center}><ActivityIndicator color={c.gold} /></View>
          ) : (
            <FlatList
              data={shown}
              keyExtractor={a => a.ticketId}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              ListEmptyComponent={
                <Text style={s.emptyTxt}>
                  {attendees.length ? t('nobodyByThatName') : t('nobodyRegisteredYet')}
                </Text>
              }
              renderItem={({ item }) => {
                const next = item.codes.find(code => !usedRef.current.has(code));
                const allIn = !next;
                return (
                  <View style={s.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowName}>{item.name}</Text>
                      <Text style={s.rowMeta}>
                        {item.seats} {item.seats === 1 ? t('seatWord') : t('seatsWord')}
                        {item.checkedIn > 0 ? ` · ${item.checkedIn} ${t('inWord')}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.admitBtn, allIn && s.admitBtnDone]}
                      disabled={allIn}
                      onPress={() => { if (next) void admit(next); }}
                    >
                      <Text style={[s.admitTxt, allIn && s.admitTxtDone]}>
                        {allIn ? t('allInWord') : t('checkInAction')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
          <Banner />
        </View>
      )}
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    hdr: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    hdrTitle: { fontSize: 16, fontWeight: '700', color: c.text },
    hdrCount: { fontSize: 12.5, color: c.textMuted, marginTop: 1 },
    tabs: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 10 },
    tab: {
      flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    tabOn: { backgroundColor: c.gold, borderColor: c.gold },
    tabTxt: { fontSize: 13.5, fontWeight: '600', color: c.textSecondary },
    tabTxtOn: { color: '#1a1208' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28 },
    permTxt: { fontSize: 14.5, color: c.textSecondary, textAlign: 'center', lineHeight: 21 },
    permBtn: { backgroundColor: c.gold, borderRadius: 11, paddingHorizontal: 22, paddingVertical: 12 },
    permBtnTxt: { fontSize: 15, fontWeight: '700', color: '#1a1208' },
    reticle: {
      position: 'absolute', top: '26%', left: '14%', right: '14%', bottom: '34%',
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 18,
    },
    banner: {
      position: 'absolute', left: 14, right: 14, bottom: 22,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    },
    bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.92)', marginTop: 1 },
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12,
      borderWidth: 1, borderColor: c.border, borderRadius: 11, backgroundColor: c.card,
    },
    search: { flex: 1, paddingVertical: 10, fontSize: 14.5, color: c.text },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 13, marginBottom: 8,
    },
    rowName: { fontSize: 15, fontWeight: '600', color: c.text },
    rowMeta: { fontSize: 12.5, color: c.textMuted, marginTop: 2 },
    admitBtn: { backgroundColor: c.gold, borderRadius: 9, paddingHorizontal: 15, paddingVertical: 9 },
    admitBtnDone: { backgroundColor: c.cardAlt },
    admitTxt: { fontSize: 13, fontWeight: '700', color: '#1a1208' },
    admitTxtDone: { color: c.textMuted },
    emptyTxt: { textAlign: 'center', color: c.textMuted, fontSize: 14, marginTop: 40 },
  });
}
