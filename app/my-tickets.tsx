import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import { useToast } from '../src/components/Toast';
import { useTickets, syncTicketsFromServer, Ticket } from '../src/lib/ticketStore';
import {
  fetchMyRefundRequests, requestRefund, escalateRefund, RefundRequest,
} from '../src/lib/refundsApi';

/**
 * The tickets somebody holds.
 *
 * There was nowhere to see one. A ticket's codes appeared on the screen after
 * checkout, passed as route parameters, and were gone the moment that screen
 * was — so a person who bought a ticket, closed the app and walked to the
 * church had no way to show what they had bought, although the codes were in
 * the database the whole time.
 *
 * This is also where a refund is asked for, which is what the ticketing terms
 * say: "from their ticket in the app, or by emailing support".
 *
 * One card per purchase, and everything that was true of it: what was bought,
 * what it cost, what the codes are, what the organiser promised about
 * refunds, and where a refund request has got to. No tabs and no filters —
 * most people will hold two or three of these.
 */

const POLICY_TEXT: Record<string, string> = {
  flexible: 'Full ticket refund up to 7 days before the event',
  standard: 'Full ticket refund up to 48 hours before the event',
  none: 'No refunds, except if the event is cancelled or changed',
};

export default function MyTicketsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, tx } = useTranslation();
  const { showToast } = useToast();
  const tickets = useTickets();

  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState<Ticket | null>(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    await syncTicketsFromServer();
    const rows = await fetchMyRefundRequests();
    if (rows) setRequests(rows);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const requestFor = (ticketId: string) => requests.find(r => r.ticketId === ticketId);

  async function send() {
    if (!asking) return;
    setSending(true);
    const { ok, policyRequires, error } = await requestRefund(asking.id, reason.trim());
    setSending(false);
    if (!ok) {
      showToast(tx('Could not send that'), error || '', 'error');
      return;
    }
    setAsking(null);
    setReason('');
    showToast(
      tx('Refund requested'),
      policyRequires
        ? tx('This event’s policy covers your request. The organiser has 5 business days to respond.')
        : tx('The organiser has 5 business days to respond.'),
      'success',
    );
    void refresh();
  }

  async function escalate(request: RefundRequest) {
    const { ok, error } = await escalateRefund(request.id);
    if (!ok) {
      showToast(tx('Could not escalate'), error || '', 'error');
      return;
    }
    showToast(tx('Sent to FourCircle'), tx('We will look at this and decide.'), 'success');
    void refresh();
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{t('myTickets')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading && tickets.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={c.gold} />
        ) : tickets.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="ticket-outline" size={44} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('noTicketsTitle')}</Text>
            <Text style={s.emptyBody}>{t('noTicketsBody')}</Text>
            <TouchableOpacity style={s.browseBtn} onPress={() => router.push('/(tabs)/events')}>
              <Text style={s.browseTxt}>{t('browseEvents')}</Text>
            </TouchableOpacity>
          </View>
        ) : tickets.map(ticket => {
          const request = requestFor(ticket.id);
          const refunded = ticket.status === 'refunded';
          const paid = ticket.totalPaid > 0;
          const policy = ticket.refundPolicy || 'standard';
          // Declined, or five business days gone with no answer.
          const canEscalate = !!request && !request.escalatedAt &&
            (request.status === 'declined' ||
             (request.status === 'requested' && Date.parse(request.respondBy) < Date.now()));

          return (
            <View key={ticket.id} style={[s.card, refunded && s.cardSpent]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: '/event-detail', params: { id: ticket.eventId, title: ticket.eventTitle } })}
              >
                <Text style={s.title} numberOfLines={2}>{ticket.eventTitle}</Text>
              </TouchableOpacity>

              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={c.textMuted} />
                <Text style={s.meta} numberOfLines={1}>{ticket.eventDate}</Text>
              </View>
              {!!ticket.eventLocation && (
                <View style={s.metaRow}>
                  <Ionicons name="location-outline" size={14} color={c.textMuted} />
                  <Text style={s.meta} numberOfLines={1}>{ticket.eventLocation}</Text>
                </View>
              )}

              {/* The codes. One per seat, so a party of four can be let in
                  separately, and large enough to read off a phone at a door. */}
              <Text style={s.sectionLbl}>
                {ticket.ticketIds.length > 1
                  ? `${ticket.ticketIds.length} ${t('ticketsWord')}`
                  : t('ticketWord')}
              </Text>
              <View style={s.codes}>
                {ticket.ticketIds.map(code => (
                  <View key={code} style={s.codePill}>
                    <Text style={s.codeTxt}>{code}</Text>
                  </View>
                ))}
              </View>

              {paid && (
                <>
                  <View style={s.rule} />
                  <View style={s.line}>
                    <Text style={s.lineLbl}>{t('youPaid')}</Text>
                    <Text style={s.lineVal}>${ticket.totalPaid.toFixed(2)}</Text>
                  </View>
                  {refunded && (
                    <View style={s.line}>
                      <Text style={s.lineLbl}>{t('refundedWord')}</Text>
                      <Text style={[s.lineVal, { color: c.green }]}>
                        ${(ticket.refundedAmount ?? 0).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Text style={s.policy}>
                    <Text style={s.policyLbl}>{t('refundPolicyWord')}: </Text>
                    {tx(POLICY_TEXT[policy] || POLICY_TEXT.standard)}
                  </Text>
                </>
              )}

              {/* Where the request has got to, in the plainest words
                  available. A status nobody can read is not a status. */}
              {!!request && !refunded && (
                <View style={s.status}>
                  <Ionicons
                    name={request.status === 'declined' ? 'close-circle' : 'time-outline'}
                    size={16}
                    color={request.status === 'declined' ? c.red : c.gold}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.statusTxt}>
                      {request.status === 'requested' && t('refundRequested')}
                      {request.status === 'approved' && t('refundApproved')}
                      {request.status === 'declined' && t('refundDeclined')}
                      {request.status === 'refunded' && t('refundPaid')}
                    </Text>
                    {!!request.declineReason && (
                      <Text style={s.statusSub}>{request.declineReason}</Text>
                    )}
                    {!!request.escalatedAt && (
                      <Text style={s.statusSub}>{t('refundEscalated')}</Text>
                    )}
                  </View>
                </View>
              )}

              {paid && !refunded && !request && (
                <TouchableOpacity style={s.askBtn} onPress={() => { setAsking(ticket); setReason(''); }}>
                  <Text style={s.askTxt}>{t('requestRefund')}</Text>
                </TouchableOpacity>
              )}

              {canEscalate && (
                <TouchableOpacity style={s.escalateBtn} onPress={() => escalate(request!)}>
                  <Text style={s.escalateTxt}>{t('escalateToFourCircle')}</Text>
                </TouchableOpacity>
              )}

              {refunded && (
                <View style={s.refundedBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={c.green} />
                  <Text style={s.refundedTxt}>{t('refundedWord')}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Asking */}
      <Modal visible={!!asking} transparent animationType="fade" onRequestClose={() => setAsking(null)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{t('requestRefund')}</Text>
            <Text style={s.sheetBody} numberOfLines={2}>{asking?.eventTitle}</Text>
            <TextInput
              style={s.input}
              placeholder={tx('Why are you asking? (optional)')}
              placeholderTextColor={c.placeholder}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Text style={s.sheetNote}>{t('refundGoesToOrganizer')}</Text>
            <TouchableOpacity
              style={[s.sendBtn, sending && { opacity: 0.6 }]}
              disabled={sending}
              onPress={send}
            >
              <Text style={s.sendTxt}>{sending ? tx('Sending…') : t('sendRequest')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setAsking(null)}>
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
    scroll: { padding: 16, paddingBottom: 48, gap: 14 },

    card: {
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
      padding: 16, gap: 6,
    },
    cardSpent: { opacity: 0.72 },
    title: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    meta: { fontSize: 13.5, color: c.textMuted, flex: 1 },

    sectionLbl: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
      color: c.textMuted, marginTop: 10,
    },
    codes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    codePill: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.gold, borderRadius: 8,
      paddingHorizontal: 11, paddingVertical: 6,
    },
    codeTxt: { fontSize: 15, fontWeight: '700', color: c.gold, letterSpacing: 1 },

    rule: { height: 1, backgroundColor: c.border, marginVertical: 10 },
    line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lineLbl: { fontSize: 14, color: c.textSecondary },
    lineVal: { fontSize: 14, fontWeight: '700', color: c.text },
    policy: { fontSize: 12.5, color: c.textMuted, marginTop: 8, lineHeight: 18 },
    policyLbl: { fontWeight: '700', color: c.textSecondary },

    status: {
      flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 12,
      backgroundColor: c.bg, borderRadius: 10, padding: 11,
    },
    statusTxt: { fontSize: 13.5, fontWeight: '600', color: c.text },
    statusSub: { fontSize: 12.5, color: c.textMuted, marginTop: 3, lineHeight: 17 },

    askBtn: {
      marginTop: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12,
      paddingVertical: 11, alignItems: 'center',
    },
    askTxt: { fontSize: 14, fontWeight: '600', color: c.text },
    escalateBtn: { marginTop: 9, paddingVertical: 9, alignItems: 'center' },
    escalateTxt: { fontSize: 13.5, fontWeight: '600', color: c.gold },

    refundedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    refundedTxt: { fontSize: 13, fontWeight: '700', color: c.green },

    empty: { alignItems: 'center', paddingTop: 70, gap: 10 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    emptyBody: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 },
    browseBtn: {
      marginTop: 8, backgroundColor: c.gold, borderRadius: 12,
      paddingHorizontal: 22, paddingVertical: 11,
    },
    browseTxt: { fontSize: 14.5, fontWeight: '700', color: c.onPrimary },

    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.card, borderTopLeftRadius: 22, borderTopRightRadius: 22,
      padding: 20, paddingBottom: 34, gap: 10,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    sheetBody: { fontSize: 14, color: c.textMuted },
    input: {
      borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12,
      fontSize: 15, color: c.text, minHeight: 86, textAlignVertical: 'top',
      backgroundColor: c.bg,
    },
    sheetNote: { fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
    sendBtn: {
      backgroundColor: c.gold, borderRadius: 12, paddingVertical: 13, alignItems: 'center',
      marginTop: 4,
    },
    sendTxt: { fontSize: 15, fontWeight: '700', color: c.onPrimary },
    cancelBtn: { paddingVertical: 11, alignItems: 'center' },
    cancelTxt: { fontSize: 14.5, fontWeight: '600', color: c.textMuted },
  });
}
