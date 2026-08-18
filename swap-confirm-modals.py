import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

def add_confirm_import_and_hook(content, import_anchor, import_path):
    if 'useConfirm' not in content:
        content = content.replace(
            import_anchor,
            import_anchor + f"\nimport {{ useConfirm }} from '{import_path}';",
            1
        )
    if 'const { showConfirm }' not in content:
        idx = content.find('export default function')
        nl = content.find('\n', idx)
        content = content[:nl+1] + "  const { showConfirm } = useConfirm();\n" + content[nl+1:]
    return content

# ===== 1. community.tsx - Delete Post =====
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = add_confirm_import_and_hook(content, "import { COLORS } from '../../src/lib/constants';", '../../src/components/Confirm')

old_delete_post = """                  Alert.alert('Delete Post', 'Are you sure you want to delete this post? This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deletePost(target!.id) },
                  ]);"""

new_delete_post = """                  showConfirm({
                    title: 'Delete Post',
                    message: 'Are you sure you want to delete this post? This cannot be undone.',
                    buttons: [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deletePost(target!.id) },
                    ],
                  });"""

if old_delete_post in content:
    content = content.replace(old_delete_post, new_delete_post)
    print('community.tsx Delete Post converted to Confirm modal')
else:
    print('ERROR: Delete Post block not found in community.tsx')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ===== 2. my-events.tsx - Delete Event =====
with open('app/my-events.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = add_confirm_import_and_hook(content, "import { COLORS } from '../src/lib/constants';", '../src/components/Confirm')

old_delete_event = """    Alert.alert('Delete Event', 'Delete "' + title + '"? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
    ]);"""

new_delete_event = """    showConfirm({
      title: 'Delete Event',
      message: 'Delete "' + title + '"? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
      ],
    });"""

if old_delete_event in content:
    content = content.replace(old_delete_event, new_delete_event)
    print('my-events.tsx Delete Event converted to Confirm modal')
else:
    print('ERROR: Delete Event block not found in my-events.tsx')

with open('app/my-events.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ===== 3. connections.tsx - Disconnect =====
with open('app/connections.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = add_confirm_import_and_hook(content, "import { COLORS } from '../src/lib/constants';", '../src/components/Confirm')

old_disconnect = """    Alert.alert('Disconnect', `Remove ${name} from your connections?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => removeConnection(id) },
    ]);"""

new_disconnect = """    showConfirm({
      title: 'Disconnect',
      message: `Remove ${name} from your connections?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => removeConnection(id) },
      ],
    });"""

if old_disconnect in content:
    content = content.replace(old_disconnect, new_disconnect)
    print('connections.tsx Disconnect converted to Confirm modal')
else:
    print('ERROR: Disconnect block not found in connections.tsx')

with open('app/connections.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
