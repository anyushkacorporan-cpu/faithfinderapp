import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Wire toggleLike in postsStore.ts to log activity
with open('src/lib/postsStore.ts', 'r', encoding='utf-8') as f:
    content = f.read()

if 'logActivity' not in content:
    # Add import at top
    content = "import { logActivity, removeActivityByPost } from './activityStore';\n" + content
    print('activityStore imported into postsStore.ts')

# Find toggleLike and add logging
old_toggle = """export function toggleLike(postId: string) {"""
if old_toggle in content:
    # Find the function body to inject logging after the like is added
    idx = content.find(old_toggle)
    # Find where the like is added vs removed - look for the toggle logic
    func_end = content.find('\n}', idx)
    func_body = content[idx:func_end+2]
    
    new_func_body = func_body.replace(
        "export function toggleLike(postId: string) {",
        """export function toggleLike(postId: string) {
  const post = posts.find(p => p.id === postId);
  const alreadyLiked = post?.likedByMe;"""
    )
    
    # Add logging after the mutation
    new_func_body = new_func_body.replace(
        "\n  persist();\n  notify();\n}",
        """
  persist();
  notify();
  // Log to activity if this was a new like (not un-like)
  if (!alreadyLiked && post) {
    logActivity({ type: 'like', postId, postContent: post.content?.slice(0, 80) });
  } else if (alreadyLiked) {
    removeActivityByPost(postId, 'like');
  }
}"""
    )
    
    content = content[:idx] + new_func_body + content[func_end+2:]
    print('toggleLike now logs to activityStore')
else:
    print('ERROR: toggleLike function not found')

with open('src/lib/postsStore.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# 2. Wire addComment in comments.tsx to log activity
with open('app/comments.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'logActivity' not in content:
    old_import = "  usePosts, addComment, addReply,"
    new_import = "  usePosts, addComment, addReply,"
    # Add activityStore import after existing imports
    content = content.replace(
        "import {",
        "import { logActivity } from '../src/lib/activityStore';\nimport {",
        1
    )
    print('activityStore imported into comments.tsx')

old_add_comment = "      addComment(post.id, commentText.trim(), displayName, initials, '#667eea');"
new_add_comment = """      addComment(post.id, commentText.trim(), displayName, initials, '#667eea');
      logActivity({ type: 'comment', postId: post.id, postContent: post.content?.slice(0, 80) });"""

if old_add_comment in content:
    content = content.replace(old_add_comment, new_add_comment)
    print('addComment now logs to activityStore')
else:
    print('ERROR: addComment call not found exactly')

with open('app/comments.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# 3. Update Activity tab in profile.tsx to show likes, comments, AND attended events
with open('app/(tabs)/profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'useActivity' not in content:
    content = content.replace(
        "import { useUser, setUser } from '../../src/lib/userStore';",
        "import { useUser, setUser } from '../../src/lib/userStore';\nimport { useActivity } from '../../src/lib/activityStore';"
    )
    print('useActivity imported into profile.tsx')

# Find the Activity tab render section and replace it
old_activity_tab = """            {activeTab === 'Activity' && ("""
if old_activity_tab in content:
    # Find the full activity tab section
    start = content.find(old_activity_tab)
    # Find end by looking for the next tab condition or closing of the tab section
    end = content.find("            {activeTab === 'Posts' &&", start)
    if end == -1:
        end = content.find("          </ScrollView>", start)
    
    old_section = content[start:end]
    
    new_section = """            {activeTab === 'Activity' && (
              <ActivityTabContent />
            )}
"""
    content = content[:start] + new_section + content[end:]
    print('Activity tab content replaced with ActivityTabContent component')

# Add the ActivityTabContent component + useActivity hook before the main component's return
# First add hook inside the component
if "const activity = useActivity();" not in content:
    content = content.replace(
        "  const { showToast } = useToast();",
        "  const { showToast } = useToast();\n  const activity = useActivity();"
    )
    print('useActivity hook added to ProfileScreen')

# Add the ActivityTabContent inline component right before the StyleSheet
activity_component = """
function ActivityTabContent() {
  const activity = useActivity();
  const { myAttendingEvents } = useEventActions();
  const { events: allEvents } = useEvents();

  const TYPE_CONFIG = {
    like: { icon: 'heart', color: '#e74c6f', label: 'Liked a post' },
    comment: { icon: 'chatbubble', color: '#667eea', label: 'Commented on a post' },
    attending: { icon: 'calendar', color: COLORS.gold, label: 'Attending an event' },
  };

  // Merge likes/comments with attended events into one chronological list
  const attendingItems = myAttendingEvents.map(eventId => {
    const event = allEvents.find((e: any) => e.id === eventId);
    return {
      id: 'attending-' + eventId,
      type: 'attending' as const,
      eventTitle: event?.title || 'An event',
      timestamp: Date.now() - 1000,
    };
  });

  const allActivity = [...activity, ...attendingItems]
    .sort((a, b) => b.timestamp - a.timestamp);

  if (allActivity.length === 0) {
    return (
      <View style={{ paddingVertical: 60, alignItems: 'center', gap: 10 }}>
        <Ionicons name="pulse-outline" size={40} color="#ddd" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#999' }}>No activity yet</Text>
        <Text style={{ fontSize: 13, color: '#bbb', textAlign: 'center', paddingHorizontal: 40 }}>
          Like posts, leave comments, or attend events to see your activity here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 8 }}>
      {allActivity.map(item => {
        const config = TYPE_CONFIG[item.type];
        const subtitle = item.type === 'attending'
          ? item.eventTitle
          : item.postContent
            ? '"' + item.postContent + (item.postContent.length >= 80 ? '...' : '') + '"'
            : '';
        return (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f3ef' }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: config.color + '18', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={config.icon as any} size={18} color={config.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.navy }}>{config.label}</Text>
              {!!subtitle && <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

"""

style_anchor = "const s = StyleSheet.create({"
if 'ActivityTabContent' not in content and style_anchor in content:
    content = content.replace(style_anchor, activity_component + style_anchor)
    print('ActivityTabContent component added')
else:
    print('ActivityTabContent already present or style anchor not found')

with open('app/(tabs)/profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
