import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove 'Saved' from PERSONAL_TABS
old_tabs = "const PERSONAL_TABS = ['Posts', 'Activity', 'Saved'];"
new_tabs = "const PERSONAL_TABS = ['Posts', 'Activity'];"
if old_tabs in content:
    content = content.replace(old_tabs, new_tabs)
    print('Saved tab removed from PERSONAL_TABS')
else:
    print('ERROR: PERSONAL_TABS line not found')

# 2. Import attending events + the events constant so we can resolve event details
old_import = "import { usePosts } from '../../src/lib/postsStore';"
new_import = old_import + "\nimport { useEventActions } from '../../src/lib/eventActionsStore';\nimport { EVENTS } from '../../src/lib/constants';\nimport { useEvents } from '../../src/lib/eventsStore';"
if old_import in content:
    content = content.replace(old_import, new_import)
    print('Event-related imports added')
else:
    print('ERROR: usePosts import line not found')

# 3. Compute myAttendingEvents alongside myPosts
old_myposts = "  const myPosts = allPosts.filter(p => p.authorName === displayName);"
new_myposts = """  const myPosts = allPosts.filter(p => p.authorName === displayName);
  const { attending } = useEventActions();
  const userCreatedEvents = useEvents();
  const allEventsPool = [...userCreatedEvents, ...EVENTS];
  const myAttendingEvents = attending
    .map(id => allEventsPool.find((e: any) => e.id === id))
    .filter(Boolean);"""

if old_myposts in content:
    content = content.replace(old_myposts, new_myposts)
    print('myAttendingEvents computed')
else:
    print('ERROR: myPosts line not found')

# 4. Replace the empty Activity tab block with real attended-events list
old_activity_block = """          {activeTab === 'Activity' && (
            <View style={s.emptyState}>
              <Ionicons name="pulse-outline" size={40} color="#ddd" />
              <Text style={s.emptyTxt}>No activity yet</Text>
              <Text style={s.emptySub}>Your likes and comments will appear here</Text>
            </View>
          )}"""

new_activity_block = """          {activeTab === 'Activity' && (
            myAttendingEvents.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="pulse-outline" size={40} color="#ddd" />
                <Text style={s.emptyTxt}>No activity yet</Text>
                <Text style={s.emptySub}>Events you attend will appear here</Text>
              </View>
            ) : (
              <View style={{paddingHorizontal:16,gap:12}}>
                {myAttendingEvents.map((event: any) => (
                  <TouchableOpacity
                    key={event.id}
                    style={{borderWidth:1,borderColor:'#f0ede8',borderRadius:14,padding:14,backgroundColor:COLORS.white,flexDirection:'row',alignItems:'center',gap:12}}
                    onPress={() => router.push({pathname:'/event-detail' as any,params:{id:event.id}})}
                  >
                    <View style={{width:40,height:40,borderRadius:12,backgroundColor:COLORS.lightBg,alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name="calendar" size={18} color={COLORS.gold}/>
                    </View>
                    <View style={{flex:1}}>
                      <Text style={{fontSize:14,fontWeight:'700',color:COLORS.navy}} numberOfLines={1}>{event.title}</Text>
                      <Text style={{fontSize:12,color:'#999',marginTop:2}}>{event.date}{event.location?' · '+event.location:''}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#ddd"/>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}"""

if old_activity_block in content:
    content = content.replace(old_activity_block, new_activity_block)
    print('Activity tab now renders attended events')
else:
    print('ERROR: activity tab block not found exactly')

# 5. Remove the Saved tab's empty-state block entirely (the one referencing activeTab === 'Saved')
old_saved_block_start = content.find("          {activeTab === 'Saved' && (")
if old_saved_block_start != -1:
    # find matching closing )} for this block - it's the next "          )}" after the start
    close_idx = content.find("          )}", old_saved_block_start)
    close_idx_end = close_idx + len("          )}")
    removed = content[old_saved_block_start:close_idx_end]
    content = content[:old_saved_block_start] + content[close_idx_end:]
    print('Saved tab JSX block removed, length removed:', len(removed))
else:
    print('Saved tab JSX block not found (may already be removed)')

# 6. Fix the icon-picker line that still references 'Saved' for icon selection (line ~462 originally)
old_icon_line = "<Ionicons name={activeTab==='Posts' ? 'document-text-outline' : activeTab==='Activity' ? 'pulse-outline' : 'bookmark-outline'} size={40} color=\"#ddd\" />"
new_icon_line = "<Ionicons name={activeTab==='Posts' ? 'document-text-outline' : 'pulse-outline'} size={40} color=\"#ddd\" />"
if old_icon_line in content:
    content = content.replace(old_icon_line, new_icon_line)
    print('Leftover Saved-tab icon reference fixed')
else:
    print('Leftover icon line not found (may not exist in this branch)')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
