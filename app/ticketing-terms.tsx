import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useTranslation } from '../src/lib/i18n';
import {
  TERMS, TERMS_TITLE, TERMS_INTRO, TERMS_UPDATED,
} from '../src/lib/ticketingTerms';

/**
 * The ticketing terms, in full.
 *
 * Linked from checkout, from Settings, and from the event creation screen,
 * which are the three places somebody is about to agree to them. The existing
 * Terms of Service screen stays where it is and covers the app; this covers
 * money.
 *
 * The text lives in src/lib/ticketingTerms.ts with both languages side by
 * side. This screen only chooses which column to read.
 */
export default function TicketingTermsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { lang } = useTranslation();
  const k = lang === 'Español' ? 'es' : 'en';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle} numberOfLines={1}>{TERMS_TITLE[k]}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.updated}>{TERMS_UPDATED[k]}</Text>
        <Text style={s.intro}>{TERMS_INTRO[k]}</Text>

        {TERMS.map(section => (
          <View key={section.heading.en} style={s.section}>
            <Text style={s.h2}>{section.heading[k]}</Text>
            {section.paragraphs.map((p, i) => (
              <Text key={i} style={s.p}>{p[k]}</Text>
            ))}
          </View>
        ))}

        <View style={{ height: 28 }} />
      </ScrollView>
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
    hdrTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text, textAlign: 'center' },
    scroll: { padding: 20, paddingBottom: 40 },
    updated: { fontSize: 12.5, color: c.textMuted, marginBottom: 14 },
    intro: { fontSize: 15, color: c.text, lineHeight: 23, marginBottom: 8 },
    section: { marginTop: 22 },
    h2: { fontSize: 16.5, fontWeight: '700', color: c.text, marginBottom: 9 },
    p: { fontSize: 14.5, color: c.textSecondary, lineHeight: 22, marginBottom: 11 },
  });
}
