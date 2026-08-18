import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../lib/theme';

export default function Logo({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const c = useThemeColors();
  const fontSize = size === 'large' ? 30 : size === 'small' ? 18 : 22;
  const crossH = size === 'large' ? 28 : size === 'small' ? 18 : 22;
  const crossW = size === 'large' ? 14 : size === 'small' ? 10 : 12;
  const barH = size === 'large' ? 9 : size === 'small' ? 6 : 7;

  return (
    <View style={s.wrap}>
      <View style={[s.crossIcon, { height: crossH }]}>
        <View style={[s.crossV, { height: crossH, backgroundColor: c.gold }]} />
        <View style={[s.crossH, { width: crossW, top: barH, backgroundColor: c.gold }]} />
      </View>
      <Text style={[s.txt, { fontSize, color: c.text }]}>FaithFinder App</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crossIcon: { width: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  crossV: { position: 'absolute', width: 2 },
  crossH: { position: 'absolute', height: 2 },
  txt: { fontFamily: 'PlayfairDisplay_700Bold' },
});
