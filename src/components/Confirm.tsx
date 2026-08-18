import { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

type ConfirmButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  buttons: ConfirmButton[];
};

type ConfirmContextValue = {
  showConfirm: (options: ConfirmOptions) => void;
};

const ConfirmContext = createContext<ConfirmContextValue>({ showConfirm: () => {} });

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  function showConfirm(opts: ConfirmOptions) {
    setOptions(opts);
  }

  function handlePress(btn: ConfirmButton) {
    setOptions(null);
    setTimeout(() => btn.onPress?.(), 150);
  }

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <Modal visible={!!options} transparent animationType="fade" onRequestClose={() => setOptions(null)}>
        <View style={s.overlay}>
          <View style={s.card}>
            {options?.buttons.some(b => b.style === 'destructive') && (
              <View style={s.iconWrap}>
                <Ionicons name="alert-circle" size={28} color={COLORS.red} />
              </View>
            )}
            <Text style={s.title}>{options?.title}</Text>
            {!!options?.message && <Text style={s.message}>{options.message}</Text>}
            <View style={s.btnRow}>
              {options?.buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.btn,
                    btn.style === 'destructive' && s.btnDestructive,
                    btn.style === 'cancel' && s.btnCancel,
                    (!btn.style || btn.style === 'default') && s.btnDefault,
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[
                    s.btnTxt,
                    btn.style === 'destructive' && s.btnTxtDestructive,
                    btn.style === 'cancel' && s.btnTxtCancel,
                    (!btn.style || btn.style === 'default') && s.btnTxtDefault,
                  ]}>{btn.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </ConfirmContext.Provider>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26,26,46,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 24, padding: 24, width: '100%', maxWidth: 340,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(231,76,111,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.navy, textAlign: 'center', marginBottom: 6 },
  message: { fontSize: 14, color: '#777', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
  btnDefault: { backgroundColor: COLORS.navy },
  btnCancel: { backgroundColor: '#f0ede8' },
  btnDestructive: { backgroundColor: '#fee2e2' },
  btnTxt: { fontSize: 15, fontWeight: '700' },
  btnTxtDefault: { color: COLORS.white },
  btnTxtCancel: { color: COLORS.navy },
  btnTxtDestructive: { color: COLORS.red },
});
