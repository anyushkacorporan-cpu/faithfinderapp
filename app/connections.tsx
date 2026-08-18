import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useConfirm } from '../src/components/Confirm';
import { useConnections, removeConnection } from '../src/lib/connectionsStore';

export default function ConnectionsScreen() {
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showConfirm } = useConfirm();
  const connections = useConnections();
  const churches = connections.filter(c => c.type === 'church');
  const people = connections.filter(c => c.type === 'user');

  function handleRemove(id: string, name: string) {
    showConfirm({
      title: 'Disconnect',
      message: `Remove ${name} from your connections?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => removeConnection(id) },
      ],
    });
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={s.title}>Connections</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {connections.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color={c.placeholder} />
            <Text style={s.emptyTitle}>No connections yet</Text>
            <Text style={s.emptySub}>Discover believers and churches in the Community tab</Text>
            <TouchableOpacity style={s.discoverBtn} onPress={() => { router.back(); }}>
              <Text style={s.discoverBtnTxt}>Go to Community</Text>
            </TouchableOpacity>
          </View>
        )}

        {churches.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Churches ({churches.length})</Text>
            {churches.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/profile' as any, params: { id: c.id, name: c.name, initials: c.initials, color: c.color, type: c.type } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>Church</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {people.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>People ({people.length})</Text>
            {people.map(c => (
              <TouchableOpacity key={c.id} style={s.row} onPress={() => router.push({ pathname: '/profile' as any, params: { id: c.id, name: c.name, initials: c.initials, color: c.color, type: c.type } })}>
                <View style={[s.avatar, { backgroundColor: c.color }]}>
                  <Text style={s.avatarTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.type}>Member</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => handleRemove(c.id, c.name)}>
                  <Text style={s.removeTxt}>Remove</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  section: { backgroundColor: c.card, marginTop: 8, paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.cardAlt },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: c.onPrimary, fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700', color: c.text },
  type: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: '#e0dbd4', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  removeTxt: { fontSize: 12, fontWeight: '600', color: c.textMuted },
});
