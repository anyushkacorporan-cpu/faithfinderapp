import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal,
  ActivityIndicator, Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { fetchPayoutsDue, markPayout, amIAdmin, PayoutDue } from '../src/lib/refundsApi';

/**
 * What FourCircle owes each organiser, and what has been sent.
 *
 * The owner's screen, not an organiser's. It exists because releasing a
 * payout is a manual job: the connected account has to be unpaused in
 * Stripe's dashboard, the payout created there, and the account paused
 * again — Stripe offers no API for the pausing, so no amount of code removes
 * the person from the middle of it. This is the list that person works from,
 * and the record of what they did.
 *
 * Nothing here moves money. The buttons write down what happened.
 */

function money(n: number) { return '$' + n.toFixed(2); }

function when(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function PayoutsDueScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const { showToast } = useToast();

  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<PayoutDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<PayoutDue | null>(null);
  const [payoutId, setPayoutId] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const isAdmin = await amIAdmin();
    setAdmin(isAdmin);
    if (isAdmin) {
      const data = await fetchPayoutsDue();
      if (data) setRows(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  async function release() {
    if (!releasing) return;
    setBusy(true);
    const { ok, error } = await markPayout(releasing.eventId, 'released', {
      stripePayoutId: payoutId.trim() || undefined,
      amount: releasing.payable,
    });
    setBusy(false);
    if (!ok) { showToast(tx('Could not record it'), error || '', 'error'); return; }
    setReleasing(null);
    setPayoutId('');
    showToast(tx('Marked as released'), '', 'success');
    void refresh();
  }

  async function hold(row: PayoutDue) {
    const { ok, error } = await markPayout(row.eventId, 'held', { note: 'held for review' });
    if (!ok) { showToast(tx('Could not record it'), error || '', 'error'); return; }
    showToast(tx('Held'), tx('This payout will not be released until you unhold it.'), 'info');
    void refresh();
  }

  async function unhold(row: PayoutDue) {
    const { ok } = await markPayout(row.eventId, 'pending');
    if (ok) { showToast(tx('No longer held'), '', 'success'); void refresh(); }
  }

  const due = rows.filter(r => r.isDue);
  const waiting = rows.filter(r => !r.isDue && r.status === 'pending');
  const held = rows.filter(r => r.status === 'held');
  const done = rows.filter(r => r.status === 'released' || r.status === 'failed');

  function card(r: PayoutDue) {
    return (
      <View key={r.eventId} style={[s.card, r.isDue && s.cardDue]}>
        <Text style={s.title} numberOfLines={2}>{r.title}</Text>
        <Text style={s.meta} numberOfLines={1}>
          {r.organizerName || tx('Unnamed organiser')}
          {r.lifecycle === 'cancelled' ? ` · ${tx('cancelled')}` : ''}
        </Text>

        <Text style={s.amount}>{money(r.payable)}</Text>
        <Text style={s.breakdown}>
          {tx('gross')} {money(r.gross)}
          {r.refunded > 0 ? ` · ${tx('refunded')} ${money(r.refunded)}` : ''}
          {r.owed > 0 ? ` · ${tx('owed back')} ${money(r.owed)}` : ''}
          {` · ${r.ticketsPaid} ${t('ticketsWord').toLowerCase()}`}
        </Text>

        <View style={s.dates}>
          <Text style={s.dateTxt}>{tx('Ends')} {when(r.endsAt)}</Text>
          <Text style={[s.dateTxt, r.isDue && { color: c.gold, fontWeight: '700' }]}>
            {tx('Due')} {when(r.payoutDueAt)}
          </Text>
        </View>

        {!r.endsAt && (
          <Text style={s.warn}>{t('noEndDateWarning')}</Text>
        )}
        {r.openDisputes > 0 && (
          <Text style={s.warn}>
            {r.openDisputes} {t('openDisputesWarning')}
          </Text>
        )}

        {/* The connected account, which is where the payout is actually made.
            Copyable as text because an artifact of Stripe's own making: the
            account id is what their dashboard search takes. */}
        {!!r.stripeAccountId && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://dashboard.stripe.com/connect/accounts/${r.stripeAccountId}`)}
          >
            <Text style={s.acct}>{r.stripeAccountId} ↗</Text>
          </TouchableOpacity>
        )}
        <Text style={s.eventId}>{r.eventId}</Text>

        {r.status === 'released' ? (
          <View style={s.doneRow}>
            <Ionicons name="checkmark-circle" size={15} color={c.green} />
            <Text style={s.doneTxt}>
              {t('releasedOn')} {when(r.releasedAt)}
              {r.stripePayoutId ? ` · ${r.stripePayoutId}` : ''}
            </Text>
          </View>
        ) : (
          <View style={s.actions}>
            {r.status === 'held' ? (
              <TouchableOpacity style={s.ghostBtn} onPress={() => unhold(r)}>
                <Text style={s.ghostTxt}>{t('unhold')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.ghostBtn} onPress={() => hold(r)}>
                <Text style={s.ghostTxt}>{t('hold')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.primaryBtn, r.payable <= 0 && { opacity: 0.4 }]}
              disabled={r.payable <= 0}
              onPress={() => { setReleasing(r); setPayoutId(''); }}
            >
              <Text style={s.primaryTxt}>{t('markReleased')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  function group(label: string, list: PayoutDue[]) {
    if (list.length === 0) return null;
    return (
      <>
        <Text style={s.groupLbl}>{label} ({list.length})</Text>
        {list.map(card)}
      </>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('payoutsDue')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={c.gold} />
        ) : admin === false ? (
          <View style={s.empty}>
            <Ionicons name="lock-closed-outline" size={40} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('ownersOnly')}</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={44} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('noPayouts')}</Text>
            <Text style={s.emptyBody}>{t('noPayoutsBody')}</Text>
          </View>
        ) : (
          <>
            <View style={s.howTo}>
              <Text style={s.howToTxt}>{t('payoutHowTo')}</Text>
            </View>
            {group(t('dueNow'), due)}
            {group(t('onHold'), held)}
            {group(t('notYetDue'), waiting)}
            {group(t('alreadyReleased'), done)}
          </>
        )}
      </ScrollView>

      <Modal visible={!!releasing} transparent animationType="fade" onRequestClose={() => setReleasing(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('markReleased')}</Text>
            <Text style={s.sheetBody}>
              {releasing ? `${releasing.title} · ${money(releasing.payable)}` : ''}
            </Text>
            <Text style={s.sheetNote}>{t('markReleasedNote')}</Text>
            <TextInput
              style={s.input}
              placeholder="po_..."
              placeholderTextColor={c.placeholder}
              value={payoutId}
              onChangeText={setPayoutId}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[s.sendBtn, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={release}
            >
              <Text style={s.sendTxt}>{busy ? tx('Saving…') : t('save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setReleasing(null)}>
              <Text style={s.cancelTxt}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    hdr: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
    },
    hdrTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    scroll: { padding: 16, paddingBottom: 48, gap: 11 },

    howTo: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 13, marginBottom: 4,
    },
    howToTxt: { fontSize: 12.5, color: c.textMuted, lineHeight: 18 },

    groupLbl: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
      color: c.textMuted, marginTop: 10, marginBottom: 2,
    },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, gap: 4,
    },
    cardDue: { borderColor: c.gold },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    meta: { fontSize: 13, color: c.textMuted },
    amount: { fontSize: 25, fontWeight: '700', color: c.text, marginTop: 7 },
    breakdown: { fontSize: 12, color: c.textMuted, lineHeight: 17 },
    dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
    dateTxt: { fontSize: 12.5, color: c.textSecondary },
    warn: { fontSize: 12.5, color: c.red, marginTop: 6, lineHeight: 17 },
    acct: { fontSize: 12, color: c.gold, marginTop: 9, fontWeight: '600' },
    eventId: { fontSize: 11, color: c.placeholder, marginTop: 2 },

    actions: { flexDirection: 'row', gap: 9, marginTop: 12 },
    ghostBtn: {
      flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 11,
      paddingVertical: 10, alignItems: 'center',
    },
    ghostTxt: { fontSize: 14, fontWeight: '600', color: c.text },
    primaryBtn: {
      flex: 1, backgroundColor: c.gold, borderRadius: 11,
      paddingVertical: 10, alignItems: 'center',
    },
    primaryTxt: { fontSize: 14, fontWeight: '700', color: c.onPrimary },

    doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
    doneTxt: { fontSize: 12.5, color: c.textMuted, flex: 1 },

    empty: { alignItems: 'center', paddingTop: 70, gap: 10 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    emptyBody: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },

    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: 20, paddingBottom: 34, gap: 10,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    sheetBody: { fontSize: 14, color: c.textMuted },
    sheetNote: { fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12,
      fontSize: 15, color: c.text, backgroundColor: c.bg,
    },
    sendBtn: {
      backgroundColor: c.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
      marginTop: 4,
    },
    sendTxt: { fontSize: 15, fontWeight: '700', color: c.onPrimary },
    cancelBtn: { paddingVertical: 11, alignItems: 'center' },
    cancelTxt: { fontSize: 14.5, fontWeight: '600', color: c.textMuted },
  });
}
