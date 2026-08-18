import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/index.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove debug logging first
old_debug = """  if (activeTab === 'Saved') {
    console.log('DEBUG saved array:', saved);
    console.log('DEBUG CHURCHES sample ids:', CHURCHES.slice(0,3).map(c=>c.id));
    displayed = CHURCHES.filter(c => saved.includes(c.id));
    console.log('DEBUG displayed count:', displayed.length);"""

new_logic = """  if (activeTab === 'Saved') {
    // Build a pool combining static churches + any nearby/search results
    // the user has saved, so saved nearby/Google-Places churches aren't lost.
    const pool = new Map<string, any>();
    CHURCHES.forEach(c => pool.set(c.id, c));
    (nearbyChurches || []).forEach((c: any) => pool.set(c.id, c));
    (searchResults || []).forEach((c: any) => pool.set(c.id, c));
    displayed = saved.map(id => pool.get(id)).filter(Boolean);"""

if old_debug in content:
    content = content.replace(old_debug, new_logic)
    print('Saved tab logic fixed (with debug removal)')
else:
    # Try without the debug lines, in case they weren't applied
    old_plain = """  if (activeTab === 'Saved') {
    displayed = CHURCHES.filter(c => saved.includes(c.id));"""
    if old_plain in content:
        content = content.replace(old_plain, new_logic)
        print('Saved tab logic fixed (plain version)')
    else:
        print('ERROR: neither anchor found')

with open('app/(tabs)/index.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
