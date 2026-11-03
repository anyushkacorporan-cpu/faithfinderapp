import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useThemeColors, ThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';
import { POLICY_NAME, POLICY_ONE_LINER, policyKey } from '../lib/ticketingTerms';

/**
 * What a buyer is told about refunds before they pay.
 *
 * One component rather than the same paragraph written twice, because the
 * event page and the checkout screen have to say the same thing: a summary
 * that differed between where somebody decided and where they paid would be
 * the worst possible place for it to differ.
 *
 * Before this existed, checkout said "All sales are final. Tickets are
 * non-refundable unless the event is cancelled or rescheduled" — which was
 * not the policy, was shown to every buyer of every event, and contradicted
 * the terms it sat underneath.
 */
export function RefundPolicyNote({ policy }: { policy?: string | null }) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t, lang } = useTranslation();
  const k = lang === 'Español' ? 'es' : 'en';
  const key = policyKey(policy);

  return (
    <View style={s.box}>
      <Text style={s.line}>
        <Text style={s.label}>{t('refundPolicyWord')}: </Text>
        <Text style={s.name}>{POLICY_NAME[key][k]}</Text>
      </Text>
      <Text style={s.body}>{POLICY_ONE_LINER[key][k]}</Text>
      <Text style={s.body}>{t('cancelMeansFullRefund')}</Text>
      <Text style={s.body}>{t('feesShownBeforeYouPay')}</Text>
      <TouchableOpacity onPress={() => router.push('/ticketing-terms')}>
        <Text style={s.link}>{t('seeFullTerms')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    box: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 12, padding: 13, gap: 4,
    },
    line: { fontSize: 13.5 },
    label: { color: c.textSecondary, fontWeight: '700' },
    name: { color: c.text, fontWeight: '700' },
    body: { fontSize: 12.5, color: c.textMuted, lineHeight: 18 },
    link: { fontSize: 13, color: c.gold, fontWeight: '700', marginTop: 6 },
  });
}
