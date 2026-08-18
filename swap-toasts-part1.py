import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# ===== 1. community.tsx: Replace "Reported" alert with toast =====
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import useToast
old_import = "import { COLORS } from '../../src/lib/constants';"
if "useToast" not in content:
    content = content.replace(
        old_import,
        old_import + "\nimport { useToast } from '../../src/components/Toast';",
        1
    )
    print('useToast imported into community.tsx')

# Add the hook near other hooks
old_hook_anchor = "  const allPosts = usePosts();"
if "const { showToast }" not in content:
    content = content.replace(
        old_hook_anchor,
        old_hook_anchor + "\n  const { showToast } = useToast();",
        1
    )
    print('showToast hook added')

# Replace the Reported alert
old_reported = """                reportPost(target!.id, reason.id as any, displayName);
                Alert.alert('Reported', 'Thank you for letting us know. Our team will review this post.');"""
new_reported = """                reportPost(target!.id, reason.id as any, displayName);
                showToast('Reported', 'Thank you for letting us know. Our team will review this post.', 'info');"""

if old_reported in content:
    content = content.replace(old_reported, new_reported)
    print('Reported alert replaced with toast')
else:
    print('WARNING: Reported alert block not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# ===== 2. edit-profile.tsx: Replace "Saved!" alert with toast =====
with open('app/edit-profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import2 = "import { useUser, setUser } from '../src/lib/userStore';"
if old_import2 in content and "useToast" not in content:
    content = content.replace(
        old_import2,
        old_import2 + "\nimport { useToast } from '../src/components/Toast';",
        1
    )
    print('useToast imported into edit-profile.tsx')
else:
    print('WARNING: userStore import not found in edit-profile.tsx, or already has useToast')

# Find handleSave function and add the hook + replace alert
idx = content.find('export default function')
if idx != -1 and "const { showToast }" not in content:
    # insert hook right after function declaration opens, find first line after it
    next_newline = content.find('\n', idx)
    content = content[:next_newline+1] + "  const { showToast } = useToast();\n" + content[next_newline+1:]
    print('showToast hook added to edit-profile.tsx')

old_save_alert = "Alert.alert('Saved!', 'Your profile has been updated.');"
new_save_alert = "showToast('Saved!', 'Your profile has been updated.', 'success');"
if old_save_alert in content:
    content = content.replace(old_save_alert, new_save_alert)
    print('Saved alert replaced with toast')
else:
    print('WARNING: Saved alert line not found exactly, searching variants')
    idx2 = content.find("'Saved!'")
    if idx2 != -1:
        print('Context near Saved!:', repr(content[idx2-60:idx2+120]))

with open('app/edit-profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
