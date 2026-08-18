import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Add a reusable getCurrentCityState helper to userLocation.ts
helper = '''import * as Location from 'expo-location';

export async function getCurrentCityState(): Promise<{ city: string; state: string } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geo[0]) {
      const city = geo[0].city || geo[0].subregion || '';
      const state = geo[0].region || '';
      if (city) return { city, state };
    }
    return null;
  } catch {
    return null;
  }
}
'''

with open('src/lib/userLocation.ts', 'w', encoding='utf-8') as f:
    f.write(helper)
print('Created src/lib/userLocation.ts')

# 2. Wire it into community.tsx's handleCreatePost
with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Import the helper + settings store
old_import = "import { COLORS } from '../../src/lib/constants';"
new_import = old_import + "\nimport { getCurrentCityState } from '../../src/lib/userLocation';\nimport { useSettings } from '../../src/lib/settingsStore';"
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print('Imports added')
else:
    print('WARNING: COLORS import anchor not found, trying broader search')

# Add useSettings hook near the top of the component
old_hook_anchor = "  const allPosts = usePosts();"
new_hook_anchor = "  const allPosts = usePosts();\n  const appSettings = useSettings();"
if old_hook_anchor in content:
    content = content.replace(old_hook_anchor, new_hook_anchor, 1)
    print('useSettings hook added')
else:
    print('WARNING: usePosts anchor not found')

# Make handleCreatePost async and fetch real location when Enable Location is on
old_handle_start = "  function handleCreatePost() {\n    if (isPosting) return;\n    if (!newPostText.trim()) return;\n    setIsPosting(true);\n    addPost({"
new_handle_start = """  async function handleCreatePost() {
    if (isPosting) return;
    if (!newPostText.trim()) return;
    setIsPosting(true);

    let city: string | undefined;
    let state: string | undefined;
    if (appSettings.location.locationEnabled) {
      const loc = await getCurrentCityState();
      if (loc) { city = loc.city; state = loc.state; }
    }

    addPost({"""

if old_handle_start in content:
    content = content.replace(old_handle_start, new_handle_start)
    print('handleCreatePost now fetches real GPS location when enabled')
else:
    print('ERROR: handleCreatePost start not found exactly')

# Replace the hardcoded undefined city/state with the fetched values
old_city_state = """      city: undefined,
      state: undefined,"""
new_city_state = """      city,
      state,"""
if old_city_state in content:
    content = content.replace(old_city_state, new_city_state)
    print('addPost now uses real fetched city/state')
else:
    print('WARNING: city/state lines not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
