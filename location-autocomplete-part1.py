import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Add a city autocomplete function to googlePlaces.ts
with open('src/lib/googlePlaces.ts', 'r', encoding='utf-8') as f:
    content = f.read()

addition = """
export async function autocompleteCity(query: string): Promise<{ description: string; placeId: string }[]> {
  if (!query.trim()) return [];
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${q}&types=(cities)&key=${API_KEY}`
    );
    const data = await res.json();
    if (!data.predictions) return [];
    return data.predictions.map((p: any) => ({ description: p.description, placeId: p.place_id }));
  } catch { return []; }
}
"""

if 'autocompleteCity' not in content:
    content = content + addition
    with open('src/lib/googlePlaces.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print('autocompleteCity function added')
else:
    print('autocompleteCity already exists')

# 2. Wire it into edit-profile.tsx's personal Location field
with open('app/edit-profile.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
old_import_anchor = "import { useUser, setUser } from '../src/lib/userStore';"
if old_import_anchor in content:
    if 'autocompleteCity' not in content:
        content = content.replace(
            old_import_anchor,
            old_import_anchor + "\nimport { autocompleteCity } from '../src/lib/googlePlaces';"
        )
        print('autocompleteCity imported into edit-profile.tsx')
else:
    print('WARNING: userStore import anchor not found, trying alt path')
    old_import_anchor2 = "import { useUser, setUser } from '../../src/lib/userStore';"
    if old_import_anchor2 in content:
        content = content.replace(
            old_import_anchor2,
            old_import_anchor2 + "\nimport { autocompleteCity } from '../../src/lib/googlePlaces';"
        )
        print('autocompleteCity imported (alt path)')
    else:
        print('ERROR: neither import path matched')

# Add state for suggestions near the location state declaration
old_loc_state = "  const [location, setLocation] = useState(user.location || '');"
new_loc_state = """  const [location, setLocation] = useState(user.location || '');
  const [locationSuggestions, setLocationSuggestions] = useState<{description:string;placeId:string}[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  async function handleLocationChange(text: string) {
    setLocation(text);
    if (text.trim().length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    const results = await autocompleteCity(text);
    setLocationSuggestions(results);
    setShowLocationSuggestions(results.length > 0);
  }

  function selectLocationSuggestion(description: string) {
    setLocation(description);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  }"""

if old_loc_state in content:
    content = content.replace(old_loc_state, new_loc_state)
    print('Location autocomplete state + handlers added')
else:
    print('ERROR: location state declaration not found')

with open('app/edit-profile.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE - Part 1 (logic)')
