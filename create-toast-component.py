import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

toast_component = '''import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

type ToastType = 'success' | 'info' | 'error';

type ToastItem = {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (title: string, message?: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, { name: any; color: string; bg: string }> = {
  success: { name: 'checkmark-circle', color: COLORS.green, bg: 'rgba(67,233,123,0.12)' },
  info: { name: 'information-circle', color: COLORS.gold, bg: 'rgba(201,169,110,0.12)' },
  error: { name: 'alert-circle', color: COLORS.red, bg: 'rgba(231,76,111,0.12)' },
};

function ToastBanner({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(onDone);
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  const icon = ICONS[item.type];

  return (
    <Animated.View style={[s.toast, { transform: [{ translateY }], opacity }]}>
      <View style={[s.iconWrap, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{item.title}</Text>
        {!!item.message && <Text style={s.message}>{item.message}</Text>}
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  function showToast(title: string, message?: string, type: ToastType = 'success') {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, title, message, type }]);
  }

  function removeToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={s.container} pointerEvents="none">
        {toasts.map(t => (
          <ToastBanner key={t.id} item={t} onDone={() => removeToast(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', top: 56, left: 16, right: 16, zIndex: 999, gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: 18, padding: 14,
    shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 6, borderWidth: 1, borderColor: '#f0ede8',
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.navy },
  message: { fontSize: 12, color: '#888', marginTop: 1, lineHeight: 16 },
});
'''

with open('src/components/Toast.tsx', 'w', encoding='utf-8') as f:
    f.write(toast_component)

print('Created src/components/Toast.tsx')
print('ALL DONE - Part 1')
