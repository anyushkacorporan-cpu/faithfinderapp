import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../lib/constants';

const TAG_ICONS: Record<string, string> = {
  'Parking Available': 'car-outline',
  'Wheelchair Accessible': 'accessibility-outline',
  'Children Ministry': 'people-outline',
  'Live Worship': 'musical-notes-outline',
  'Bible Study': 'book-outline',
  'Youth Ministry': 'school-outline',
  'Online Services': 'globe-outline',
  'Community Outreach': 'heart-outline',
  'Hours Available': 'time-outline',
  'Website': 'globe-outline',
  'Phone Available': 'call-outline',
};

interface Props {
  tags: string[];
  hours?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
}

export default function ChurchTags({ tags, hours, hasWebsite, hasPhone }: Props) {
  const allTags = [
    ...tags,
    ...(hours ? ['Hours Available'] : []),
    ...(hasWebsite ? ['Website'] : []),
    ...(hasPhone ? ['Phone Available'] : []),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.scroll}>
      {allTags.map((tag, i) => (
        <View key={i} style={s.tag}>
          <Ionicons name={TAG_ICONS[tag] as any || 'checkmark-circle-outline'} size={13} color={COLORS.navy} />
          <Text style={s.tagTxt}>{tag}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: '#ddd',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: COLORS.white,
  },
  tagTxt: { fontSize: 12, fontWeight: '600', color: COLORS.navy },
});
