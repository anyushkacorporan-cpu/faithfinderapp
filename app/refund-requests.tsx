import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { useConfirm } from '../src/components/Confirm';
import { useUserEvents } from '../src/lib/eventsStore';
import {
  fetchOrganizerRefundRequests, decideRefund, OrganizerRefundRequest,
} from '../src/lib/refundsApi';

/**
 * Refund requests against this organiser's events.
 *
 * Without this screen a request reached the database and the organiser never
 * learned of it — the attendee was told five business days and the clock ran
 * against somebody who had not been told there was one.
 *
 * Open requests first, because they are the ones with a deadline. Everything
 * already answered falls below, so the list reads as a queue rather than a
 * history.
 */

const POLICY_TEXT: Record<string, string> = {
  flexible: 'Flexible — full refund up to 7 days before',
  standard: 'Standard — full refund up to 48 hours before',
  none: 'No refunds, except cancellation',
};

function daysLeft(respondBy: string): number {
  return Math.ceil((Date.parse(respondBy) - Date.now()) / 86400000);
}

export default function RefundRequestsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const myEvents = useUserEvents();

  const [requests, setRequests] = useState<OrganizerRefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [declining, setDeclining] = useState<OrganizerRefundRequest | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const eventIds = useMemo(() => myEvents.map(e => e.id), [myEvents]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await fetchOrganizerRefundRequests(eventIds);
    if (rows) setRequests(rows);
    setLoading(false);
  }, [eventIds]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const open = requests.filter(r => r.status === 'requested');
  const answered = requests.filter(r => r.status !== 'requested');

  function confirmApprove(request: OrganizerRefundRequest) {
    showConfirm({
      title: t('approveRefundTitle'),
      message: tx('This refunds')
        + ` $${request.refundAmount.toFixed(2)} `
        + tx('to the buyer and takes the same amount out of your Stripe balance. It cannot be undone.'),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        { text: t('approve'), onPress: () => void approve(request) },
      ],
    });
  }

  async function approve(request: OrganizerRefundRequest) {
    setBusy(true);
    const { ok, error } = await decideRefund(request.id, true);
    setBusy(false);
    if (!ok) {
      showToast(tx('Could not refund that'), error || '', 'error');
      return;
    }
    showToast(tx('Refunded'), tx('The buyer has been refunded.'), 'success');
    void refresh();
  }

  async function decline() {
    if (!declining) return;
    if (!reason.trim()) {
      showToast(tx('A reason is needed'), tx('The attendee is shown why it was declined.'), 'error');
      return;
    }
    setBusy(true);
    const { ok, error } = await decideRefund(declining.id, false, reason.trim());
    setBusy(false);
    if (!ok) {
      showToast(tx('Could not decline that'), error || '', 'error');
      return;
    }
    setDeclining(null);
    setReason('');
    showToast(tx('Declined'), tx('The attendee has been told, with your reason.'), 'info');
    void refresh();
  }

  function card(request: OrganizerRefundRequest, isOpen: boolean) {
    const left = daysLeft(request.respondBy);
    const overdue = isOpen && left < 0;

    return (
      <View key={request.id} style={[s.card, overdue && s.cardOverdue]}>
        <Text style={s.event} numberOfLines={2}>{request.eventTitle}</Text>
        <Text style={s.meta} numberOfLines={1}>{request.eventDate}</Text>

        <View style={s.amountRow}>
          <Text style={s.amount}>${request.refundAmount.toFixed(2)}</Text>
          <Text style={s.amountSub}>
            {request.quantity > 1
              ? `${request.quantity} ${t('ticketsWord').toLowerCase()}`
              : `1 ${t('ticketWord').toLowerCase()}`}
            {request.eventCancelled ? ` · ${tx('cancelled event, fees included')}` : ''}
          </Text>
        </View>

        <Text style={s.policy}>{tx(POLICY_TEXT[request.ticketPolicy] || POLICY_TEXT.standard)}</Text>

        {!!request.reason && (
          <View style={s.quote}>
            <Text style={s.quoteTxt}>{request.reason}</Text>
          </View>
        )}

        {isOpen ? (
          <>
            <Text style={[s.clock, overdue && { color: c.red }]}>
              {overdue
                ? t('refundOverdue')
                : left <= 1
                  ? t('refundDueToday')
                  : `${left} ${t('daysToRespond')}`}
            </Text>
            <View style={s.actions}>
              <TouchableOpacity
                style={[s.declineBtn, busy && { opacity: 0.6 }]}
                disabled={busy}
                onPress={() => { setDeclining(request); setReason(''); }}
              >
                <Text style={s.declineTxt}>{t('decline')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.approveBtn, busy && { opacity: 0.6 }]}
                disabled={busy}
                onPress={() => confirmApprove(request)}
              >
                <Text style={s.approveTxt}>{t('approve')}</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={s.answered}>
            <Ionicons
              name={request.status === 'declined' ? 'close-circle' : 'checkmark-circle'}
              size={16}
              color={request.status === 'declined' ? c.red : c.green}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.answeredTxt}>
                {request.status === 'declined' ? t('refundDeclined') : t('refundPaid')}
              </Text>
              {!!request.declineReason && (
                <Text style={s.answeredSub}>{request.declineReason}</Text>
              )}
              {!!request.escalatedAt && (
                <Text style={[s.answeredSub, { color: c.gold }]}>{t('refundEscalatedOrganizer')}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('refundRequests')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading && requests.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={c.gold} />
        ) : requests.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="checkmark-done-outline" size={44} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('noRefundRequests')}</Text>
            <Text style={s.emptyBody}>{t('noRefundRequestsBody')}</Text>
          </View>
        ) : (
          <>
            {open.length > 0 && (
              <>
                <Text style={s.groupLbl}>{t('needsAnAnswer')} ({open.length})</Text>
                {open.map(r => card(r, true))}
              </>
            )}
            {answered.length > 0 && (
              <>
                <Text style={[s.groupLbl, { marginTop: open.length ? 18 : 0 }]}>
                  {t('alreadyAnswered')}
                </Text>
                {answered.map(r => card(r, false))}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Declining, which needs a reason the attendee will read. */}
      <Modal visible={!!declining} transparent animationType="fade" onRequestClose={() => setDeclining(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('declineRefund')}</Text>
            <Text style={s.sheetBody}>{t('declineReasonShown')}</Text>
            <TextInput
              style={s.input}
              placeholder={tx('e.g. The event is in two days and the caterer is already paid.')}
              placeholderTextColor={c.placeholder}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={decline}
            >
              <Text style={s.sendTxt}>{busy ? tx('Sending…') : t('sendDecline')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setDeclining(null)}>
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
    scroll: { padding: 16, paddingBottom: 48, gap: 12 },

    groupLbl: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
      color: c.textMuted, marginBottom: 2,
    },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, gap: 5,
    },
    cardOverdue: { borderColor: c.red },
    event: { fontSize: 16, fontWeight: '700', color: c.text },
    meta: { fontSize: 13, color: c.textMuted },

    amountRow: { marginTop: 8 },
    amount: { fontSize: 24, fontWeight: '700', color: c.text },
    amountSub: { fontSize: 12.5, color: c.textMuted, marginTop: 1 },
    policy: { fontSize: 12.5, color: c.textSecondary, marginTop: 6 },

    quote: {
      backgroundColor: c.bg, borderRadius: 10, padding: 11, marginTop: 9,
      borderLeftWidth: 2, borderLeftColor: c.gold,
    },
    quoteTxt: { fontSize: 13.5, color: c.text, lineHeight: 19 },

    clock: { fontSize: 12.5, fontWeight: '600', color: c.gold, marginTop: 10 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
    declineBtn: {
      flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingVertical: 11, alignItems: 'center',
    },
    declineTxt: { fontSize: 14.5, fontWeight: '600', color: c.text },
    approveBtn: {
      flex: 1, backgroundColor: c.gold, borderRadius: 12,
      paddingVertical: 11, alignItems: 'center',
    },
    approveTxt: { fontSize: 14.5, fontWeight: '700', color: c.onPrimary },

    answered: {
      flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 10,
      backgroundColor: c.bg, borderRadius: 10, padding: 11,
    },
    answeredTxt: { fontSize: 13.5, fontWeight: '600', color: c.text },
    answeredSub: { fontSize: 12.5, color: c.textMuted, marginTop: 3, lineHeight: 17 },

    empty: { alignItems: 'center', paddingTop: 70, gap: 10 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    emptyBody: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },

    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: 20, paddingBottom: 34, gap: 10,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    sheetBody: { fontSize: 13.5, color: c.textMuted, lineHeight: 19 },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12,
      fontSize: 15, color: c.text, minHeight: 86, textAlignVertical: 'top',
      backgroundColor: c.bg,
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
