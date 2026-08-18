import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '../lib/theme';

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

function iconFor(type: ToastType, c: ThemeColors): { name: any; color: string; bg: string } {
  switch (type) {
    case 'info': return { name: 'information-circle', color: c.gold, bg: 'rgba(201,169,110,0.14)' };
    case 'error': return { name: 'alert-circle', color: c.red, bg: 'rgba(231,76,111,0.14)' };
    default: return { name: 'checkmark-circle', color: c.green, bg: 'rgba(67,233,123,0.14)' };
  }
}

function ToastBanner({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -10, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(onDone);
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  const icon = iconFor(item.type, c);

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
  const c = useThemeColors();
  const s = makeStyles(c);
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { position: 'absolute', top: '42%', left: 16, right: 16, zIndex: 999, gap: 8 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 18, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 6, borderWidth: 1, borderColor: c.border,
  },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: c.text },
  message: { fontSize: 12, color: c.textMuted, marginTop: 1, lineHeight: 16 },
});
