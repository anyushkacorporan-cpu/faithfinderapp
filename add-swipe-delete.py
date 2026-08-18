import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/notifications.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Swipeable import
old_import = "import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';"
new_import = "import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';\nimport { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';"

if old_import in content:
    content = content.replace(old_import, new_import)
    print('Swipeable imported')
else:
    print('ERROR: import line not found')

# 2. Wrap SafeAreaView with GestureHandlerRootView and wrap each row with Swipeable
old_row = """        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16}}>
          {notifications.map(n => (
            <TouchableOpacity key={n.id} style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} onLongPress={() => clearNotification(n.id)} activeOpacity={0.75}>
              <View style={[s.notifIconWrap, { backgroundColor: n.color + '20' }]}>
                <Ionicons name={n.icon as any} size={20} color={n.color} />
              </View>
              <View style={s.notifContent}>
                <View style={s.notifTopRow}>
                  <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                  {!n.read && <View style={s.unreadDot} />}
                </View>
                <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                <View style={s.notifBottomRow}>
                  <View style={[s.typePill, { backgroundColor: n.color + '18' }]}>
                    <Text style={[s.typePillTxt, { color: n.color }]}>{TYPE_LABELS[n.type]}</Text>
                  </View>
                  <Text style={s.notifTime}>{n.time}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ddd" />
            </TouchableOpacity>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>"""

new_row = """        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16}}>
          {notifications.map(n => (
            <Swipeable
              key={n.id}
              friction={2}
              rightThreshold={40}
              renderRightActions={() => (
                <TouchableOpacity
                  style={s.deleteAction}
                  onPress={() => clearNotification(n.id)}
                >
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={s.deleteActionTxt}>Delete</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity style={[s.notifRow, !n.read && s.notifRowUnread]} onPress={() => handleNotifTap(n)} activeOpacity={0.75}>
                <View style={[s.notifIconWrap, { backgroundColor: n.color + '20' }]}>
                  <Ionicons name={n.icon as any} size={20} color={n.color} />
                </View>
                <View style={s.notifContent}>
                  <View style={s.notifTopRow}>
                    <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                    {!n.read && <View style={s.unreadDot} />}
                  </View>
                  <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
                  <View style={s.notifBottomRow}>
                    <View style={[s.typePill, { backgroundColor: n.color + '18' }]}>
                      <Text style={[s.typePillTxt, { color: n.color }]}>{TYPE_LABELS[n.type]}</Text>
                    </View>
                    <Text style={s.notifTime}>{n.time}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ddd" />
              </TouchableOpacity>
            </Swipeable>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>"""

if old_row in content:
    content = content.replace(old_row, new_row)
    print('Swipeable rows added')
else:
    print('ERROR: row block not found exactly')

# 3. Wrap root SafeAreaView with GestureHandlerRootView
old_root = "  return (\n    <SafeAreaView"
new_root = "  return (\n    <GestureHandlerRootView style={{flex:1}}>\n    <SafeAreaView"

old_root_close = "    </SafeAreaView>\n  );\n}"
new_root_close = "    </SafeAreaView>\n    </GestureHandlerRootView>\n  );\n}"

if old_root in content:
    content = content.replace(old_root, new_root)
    print('GestureHandlerRootView opening added')
else:
    print('ERROR: root return not found')

if old_root_close in content:
    content = content.replace(old_root_close, new_root_close)
    print('GestureHandlerRootView closing added')
else:
    print('WARNING: root close not found exactly')

# 4. Add deleteAction styles
old_style_anchor = "  notifRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f5f3ef'},"
new_style_anchor = old_style_anchor + "\n  deleteAction:{backgroundColor:'#ef4444',justifyContent:'center',alignItems:'center',width:80,gap:4},\n  deleteActionTxt:{color:'#fff',fontSize:11,fontWeight:'700'},"

if old_style_anchor in content:
    content = content.replace(old_style_anchor, new_style_anchor)
    print('deleteAction styles added')
else:
    print('ERROR: style anchor not found')

with open('app/notifications.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
