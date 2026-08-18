import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../src/lib/constants';
import { useConfirm } from '../src/components/Confirm';
import { useConnections, removeConnection } from '../src/lib/connectionsStore';

export default function ConnectionsScreen() {
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
          <Ionicons name="chevron-back" size={24} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={s.title}>Connections</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {connections.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="people-outline" size={48} color="#ddd" />
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8f7f4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#f0ede8' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.navy },
  emptySub: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  discoverBtn: { marginTop: 8, backgroundColor: COLORS.navy, borderRadius: 22, paddingHorizontal: 28, paddingVertical: 12 },
  discoverBtnTxt: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  section: { backgroundColor: COLORS.white, marginTop: 8, paddingHorizontal: 16, paddingTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f5f3ef' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.navy },
  type: { fontSize: 12, color: '#aaa', marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: '#e0dbd4', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  removeTxt: { fontSize: 12, fontWeight: '600', color: '#888' },
});
