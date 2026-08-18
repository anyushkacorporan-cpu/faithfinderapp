import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Extract the full PostCard function body
fn_start = content.find('function PostCard(')
fn_end = content.find('\nconst s = StyleSheet.create(', fn_start)
postcard_fn = content[fn_start:fn_end]

# 2. Extract the `p` StyleSheet block (the one used inside PostCard)
p_style_start = content.find('const p = StyleSheet.create({', fn_end)
if p_style_start == -1:
    print('ERROR: could not find p StyleSheet block')
else:
    p_style_end = content.find('\n});', p_style_start) + len('\n});')
    p_style_block = content[p_style_start:p_style_end]
    print('Found p style block, length:', len(p_style_block))

print('Found PostCard fn, length:', len(postcard_fn))

# 3. Build the shared component file
shared_component = f"""import {{ View, Text, TouchableOpacity, Image, StyleSheet }} from 'react-native';
import {{ Ionicons }} from '@expo/vector-icons';
import {{ router }} from 'expo-router';
import {{ COLORS }} from '../lib/constants';
import {{ Post }} from '../lib/postsStore';

export {postcard_fn.replace('function PostCard(', 'function PostCard(', 1)}

{p_style_block}
"""
# Make sure it's an exported function
shared_component = shared_component.replace('export function PostCard(', 'export function PostCard(')
if 'export function PostCard(' not in shared_component:
    shared_component = shared_component.replace('function PostCard(', 'export function PostCard(', 1)

with open('src/components/PostCard.tsx', 'w', encoding='utf-8') as f:
    f.write(shared_component)
print('Created src/components/PostCard.tsx')

# 4. Remove the local PostCard function + p styles from community.tsx, add an import instead
new_content = content[:fn_start] + content[p_style_end:]

# Add the import near the top (after other local imports)
import_anchor = "import { COLORS } from '../../src/lib/constants';"
if import_anchor in new_content:
    new_content = new_content.replace(
        import_anchor,
        import_anchor + "\nimport { PostCard } from '../../src/components/PostCard';"
    )
    print('Import added to community.tsx')
else:
    print('WARNING: import anchor not found in community.tsx, adding at top')
    new_content = "import { PostCard } from '../../src/components/PostCard';\n" + new_content

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('community.tsx updated to import shared PostCard')
print('ALL DONE - Part 1')
