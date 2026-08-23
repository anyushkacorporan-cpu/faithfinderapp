import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors, ThemeColors } from '../src/lib/theme';
import { useConfirm } from '../src/components/Confirm';
import { useToast } from '../src/components/Toast';
import { useBlocked, unblockUser } from '../src/lib/blockStore';
import { useTranslation } from '../src/lib/i18n';

export default function BlockedUsersScreen() {
  const { t, tx } = useTranslation();
  const c = useThemeColors();
  const s = makeStyles(c);
  const { showConfirm } = useConfirm();
  const { showToast } = useToast();
  const blocked = useBlocked();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.hdr}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </TouchableOpacity>
        <Text style={s.hdrTitle}>{tx('Blocked Users')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {blocked.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="ban-outline" size={30} color={c.textMuted} />
            </View>
            <Text style={s.emptyTitle}>{tx('No one is blocked')}</Text>
            <Text style={s.emptySub}>
              {tx('When you block someone, their posts and comments disappear from FaithFinder. They will show up here so you can undo it.')}
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>
              {blocked.length} {blocked.length === 1 ? tx('person') : tx('people')}
            </Text>
            <View style={s.card}>
              {blocked.map((b, i, arr) => (
                <View key={(b.id || b.name) + i} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{b.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel} numberOfLines={1}>{b.name}</Text>
                    <Text style={s.rowDesc}>{tx('Blocked')} {formatBlockedAt(b.blockedAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.unblockBtn}
                    onPress={() => {
                      showConfirm({
                        title: tx('Unblock') + ' ' + b.name,
                        message: tx('Their posts and comments will be visible to you again.'),
                        buttons: [
                          { text: t('cancel'), style: 'cancel' },
                          {
                            text: tx('Unblock'),
                            onPress: () => {
                              unblockUser(b.id || b.name);
                              showToast(tx('Unblocked'), b.name, 'success');
                            },
                          },
                        ],
                      });
                    }}
                  >
                    <Text style={s.unblockTxt}>{tx('Unblock')}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={s.footnote}>
              {tx('Blocking is private — the other person is not told.')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Coarse relative date; a blocked-on timestamp never needs minute precision. */
function formatBlockedAt(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root:{flex:1,backgroundColor:c.bg},
  hdr:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderBottomColor:c.border,backgroundColor:c.card},
  backBtn:{width:36,height:36,borderRadius:18,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  hdrTitle:{fontSize:16,fontWeight:'700',color:c.text},
  scroll:{padding:20},
  sectionLabel:{fontSize:12,fontWeight:'700',color:c.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:10},
  card:{backgroundColor:c.card,borderRadius:16,borderWidth:1,borderColor:c.border,overflow:'hidden'},
  row:{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:12,gap:12},
  rowBorder:{borderBottomWidth:1,borderBottomColor:c.rowBorder},
  avatar:{width:38,height:38,borderRadius:19,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center'},
  avatarTxt:{fontSize:13,fontWeight:'700',color:c.textSecondary},
  rowInfo:{flex:1,minWidth:0},
  rowLabel:{fontSize:14,fontWeight:'600',color:c.text},
  rowDesc:{fontSize:12,color:c.textMuted,marginTop:1},
  unblockBtn:{paddingHorizontal:14,paddingVertical:7,borderRadius:100,borderWidth:1,borderColor:c.border,backgroundColor:c.cardAlt},
  unblockTxt:{fontSize:13,fontWeight:'700',color:c.text},
  footnote:{fontSize:12,color:c.textMuted,marginTop:14,lineHeight:18},
  emptyWrap:{alignItems:'center',paddingTop:60,paddingHorizontal:20},
  emptyIcon:{width:64,height:64,borderRadius:32,backgroundColor:c.cardAlt,alignItems:'center',justifyContent:'center',marginBottom:16},
  emptyTitle:{fontSize:16,fontWeight:'700',color:c.text,marginBottom:6},
  emptySub:{fontSize:13,color:c.textMuted,textAlign:'center',lineHeight:20},
});
