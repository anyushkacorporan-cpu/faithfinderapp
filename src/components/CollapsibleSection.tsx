import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

interface Props {
  title: string;
  preview?: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, preview, children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.wrap}>
      <TouchableOpacity style={s.header} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <View style={s.left}>
          <Text style={s.title}>{title}</Text>
          {!open && preview ? <Text style={s.preview}>{preview}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gold} />
      </TouchableOpacity>
      {open && <View style={s.body}>{children}</View>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { borderWidth:1, borderColor:COLORS.border, borderRadius:16, overflow:'hidden', marginBottom:4 },
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:14, backgroundColor:COLORS.white },
  left: { flex:1 },
  title: { fontSize:15, fontWeight:'700', color:COLORS.navy },
  preview: { fontSize:12, color:'#aaa', marginTop:2 },
  body: { borderTopWidth:1, borderTopColor:COLORS.border },
});
