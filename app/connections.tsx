import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useConfirm } from '../src/components/Confirm';
import { useConnections, removeConnection, addConnection } from '../src/lib/connectionsStore';
import { searchPeople, PersonResult } from '../src/lib/profilesStore';
import { getUser } from '../src/lib/userStore';
import { useToast } from '../src/components/Toast';
import { useTranslation } from '../src/lib/i18n';
import { KeyboardScreen, KEYBOARD_SCROLL_PROPS } from '../src/components/KeyboardScreen';

export default function ConnectionsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { t } = useTranslation();
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const connections = useConnections();
  const churches = connections.filter(c => c.type === 'church');
  const people = connections.filter(c => c.type === 'user');

  // Finding someone new belongs here, at the top of the list of people you
  // already know - the screen was otherwise a dead end when you had nobody.
  const [query, setQuery] = useState('');
  const me = getUser();
  const connectedIds = new Set(connections.map(c => c.id));
  const connectedNames = new Set(connections.map(c => c.name));
  const found: PersonResult[] = query.trim()
    ? searchPeople(query, { excludeId: me.id })
        .filter(p => !connectedIds.has(p.id) && !connectedNames.has(p.name))
    : [];

  function handleConnect(p: PersonResult) {
    addConnection({
      id: p.id, name: p.name,
      type: p.accountType === 'church' ? 'church' : 'user',
      color: p.color || c.navy,
      initials: p.initials || p.name.slice(0, 2).toUpperCase(),
    });
    showToast('Connected', `You are now connected with ${p.name}.`, 'success');
  }

  function handleRemove(id: string, name: string) {
    showConfirm({
      title: t('disconnect'),
      message: t('removeConnectionMsg').replace('{name}', name),
      buttons: [
        { text: t('cancel'), style: 'cancel' },
        { text: t('disconnect'), style: 'destructive', onPress: () => removeConnection(id) },
      ],
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <KeyboardScreen dismissOnTap={false}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('connections')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView {...KEYBOARD_SCROLL_PROPS} showsVerticalScrollIndicator={false}>
        <View style={s.searchRow}>
          <Ionicons name="search" size={16} color={c.placeholder} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('findConnections')}
            placeholderTextColor={c.placeholder}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={c.placeholder} />
            </TouchableOpacity>
          )}
        </View>

        {!!query.trim() && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('searchResults')} ({found.length})</Text>
            {found.length === 0 ? (
              <Text style={s.noResults}>{t('noOneFound')}</Text>
            ) : found.map(p => (
              <View key={p.id} style={s.row}>
                {p.photo ? (
                  <Image source={{ uri: p.photo }} style={s.avatar} resizeMode="cover" />
                ) : (
                  <View style={[s.avatar, { backgroundColor: p.color || c.navy }]}>
                    <Text style={s.avatarTxt}>{p.initials || p.name.slice(0,2).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                  {/* Name, photo, city - enough to know you found the right
                      person, and nothing more about someone you do not know. */}
                  {!!(p.city && p.state) && (
                    <Text style={s.meta} numberOfLines={1}>{p.city}, {p.state}</Text>
                  )}
                </View>
                <TouchableOpacity style={s.connectBtn} onPress={() => handleConnect(p)}>
                  <Ionicons name="person-add-outline" size={14} color={c.onPrimary} />
                  <Text style={s.connectBtnTxt}>{t('connect')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {connections.length === 0 && !query.trim() && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={c.placeholder} />
            <Text style={s.emptyTitle}>{t('noConnectionsYet')}</Text>
            <Text style={s.emptySub}>{t('discoverBelievers')}</Text>
            <TouchableOpacity style={s.discoverBtn} onPress={() => { router.back(); }}>
              <Text style={s.discoverBtnTxt}>{t('goToCommunity')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {churches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('churches')} ({churches.length})</Text>
            {churches.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/church-detail', params: { id: c.id, placeId: c.placeId || '', name: c.name, address: c.address || '' } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>{t('church')}</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>{t('remove')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {people.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('people')} ({people.length})</Text>
            {people.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/user-profile', params: { authorId: c.id, name: c.name, initials: c.initials, color: c.color, type: c.type } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>{t('member')}</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>{t('remove')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: c.text },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  discoverBtn: { marginTop: 8, backgroundColor: c.primary, borderRadius: 22, paddingHorizontal: 28, paddingVertical: 12 },
  discoverBtnTxt: { color: c.onPrimary, fontSize: 14, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.inputBg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 16, marginTop: 14 },
  searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
  noResults: { fontSize: 13, color: c.textMuted, paddingBottom: 16 },
  meta: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.primary, borderRadius: 100, paddingHorizontal: 13, paddingVertical: 7 },
  connectBtnTxt: { color: c.onPrimary, fontSize: 13, fontWeight: '700' },
  section: { backgroundColor: c.card, marginTop: 8, paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.cardAlt },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700', color: c.text },
  type: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: c.border, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  removeTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
});
