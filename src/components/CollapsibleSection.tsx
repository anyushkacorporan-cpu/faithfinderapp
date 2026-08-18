import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, ThemeColors } from '../lib/theme';

interface Props {
  title: string;
  preview?: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, preview, children }: Props) {
  const c = useThemeColors();
  const s = makeStyles(c);
  const [open, setOpen] = useState(false);
  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={s.left}>
          <Text style={s.title}>{title}</Text>
          {!open && preview ? <Text style={s.preview}>{preview}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.gold} />
      </TouchableOpacity>
      {open && <View style={s.body}>{children}</View>}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { borderWidth:1, borderColor:c.border, borderRadius:16, overflow:'hidden', marginBottom:4 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, backgroundColor:c.card },
  left: { flex:1 },
  title: { fontSize:15, fontWeight:'700', color:c.text },
  preview: { fontSize:12, color:c.textMuted, marginTop:2 },
  body: { borderTopWidth:1, borderTopColor:c.border },
});
