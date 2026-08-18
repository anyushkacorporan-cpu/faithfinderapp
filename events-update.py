import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/events.tsx', 'r', encoding='utf-8') as f:
    events = f.read()

# ── Fix 1: Add location display + state filter + improve search ───────────────

# Add getUser import if missing
if 'getUser' not in events:
    events = events.replace(
        "import { COLORS, EVENTS } from '../../src/lib/constants';",
        "import { COLORS, EVENTS } from '../../src/lib/constants';\nimport { getUser } from '../../src/lib/userStore';\nimport { STATES } from '../../src/lib/filters';"
    )

# Add state filter to FILTER_OPTIONS if missing
if "'state'" not in events and 'State' not in events[:2000]:
    old_filter_opts = "const FILTER_OPTIONS = ["
    new_filter_opts = """const STATE_LIST = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const FILTER_OPTIONS = ["""
    events = events.replace(old_filter_opts, new_filter_opts)

# Add state/city filter state variables
if 'filterState' not in events:
    old_state = "  const [shareEvent, setShareEvent] = useState<any>(null);"
    new_state = """  const [filterState, setFilterState] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showStateFilter, setShowStateFilter] = useState(false);
  const user = getUser();
  const locationLabel = user.location || 'Set your location';
  const [shareEvent, setShareEvent] = useState<any>(null);"""
    events = events.replace(old_state, new_state)

# Fix search to also filter by state/city
old_search_filter = """    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q)
      );
    }"""

new_search_filter = """    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q) ||
        e.state?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.organizer?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.church?.toLowerCase().includes(q)
      );
    }
    // State/City filter
    if (filterState) {
      result = result.filter((e: any) =>
        e.state?.toLowerCase() === filterState.toLowerCase() ||
        e.location?.toLowerCase().includes(filterState.toLowerCase())
      );
    }
    if (filterCity) {
      result = result.filter((e: any) =>
        e.city?.toLowerCase().includes(filterCity.toLowerCase()) ||
        e.location?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }"""

if old_search_filter in events:
    events = events.replace(old_search_filter, new_search_filter)
    print('Search filter updated')
else:
    print('WARNING: search filter not found')

# ── Fix 2: Add location row + state filter button to UI ───────────────────────
old_search_ui = """      {/* Search + Filter */}
      <View style={s.searchRow}>"""

new_search_ui = """      {/* Location */}
      <View style={s.locationRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.gold} />
        <Text style={s.locationTxt}>{locationLabel}</Text>
      </View>

      {/* Search + Filter */}
      <View style={s.searchRow}>"""

if old_search_ui in events:
    events = events.replace(old_search_ui, new_search_ui)
    print('Location row added')
else:
    print('WARNING: search UI not found')

# ── Fix 3: Add State filter button next to existing filter ────────────────────
old_filter_btn = """          <TouchableOpacity style={[s.filterBtn, activeFilters.length>0 && s.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={14} color={activeFilters.length>0?COLORS.white:'#555'} />
            <Text style={[s.filterTxt, activeFilters.length>0 && s.filterTxtActive]}>Filter{activeFilters.length>0?` (${activeFilters.length})`:''}</Text>
          </TouchableOpacity>"""

new_filter_btn = """          <TouchableOpacity style={[s.filterBtn, activeFilters.length>0 && s.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={14} color={activeFilters.length>0?COLORS.white:'#555'} />
            <Text style={[s.filterTxt, activeFilters.length>0 && s.filterTxtActive]}>Filter{activeFilters.length>0?` (${activeFilters.length})`:''}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.filterBtn, filterState&&s.filterBtnActive]} onPress={() => setShowStateFilter(true)}>
            <Ionicons name="map-outline" size={14} color={filterState?COLORS.white:'#555'} />
            <Text style={[s.filterTxt, filterState&&s.filterTxtActive]}>{filterState||'State'}</Text>
          </TouchableOpacity>"""

if old_filter_btn in events:
    events = events.replace(old_filter_btn, new_filter_btn)
    print('State filter button added')
else:
    print('WARNING: filter btn not found')

# ── Fix 4: Match tab styling to Churches tab ──────────────────────────────────
old_tabs = """      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t} style={[s.tab, activeTab===t && s.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[s.tabTxt, activeTab===t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>"""

new_tabs = """      {/* Tabs - matching Church tab style */}
      <View style={s.toggleRow}>
        <View style={s.toggle}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={[s.toggleBtn, activeTab===t && s.toggleBtnActive]} onPress={() => setActiveTab(t)}>
              <Text style={[s.toggleTxt, activeTab===t && s.toggleTxtActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>"""

if old_tabs in events:
    events = events.replace(old_tabs, new_tabs)
    print('Tabs updated to match church style')
else:
    print('WARNING: tabs not found - checking alternate')

# ── Fix 5: Add State filter modal ─────────────────────────────────────────────
# Add before the closing </SafeAreaView>
old_end = """    </SafeAreaView>
  );
}"""

state_modal = """
      {/* State Filter Modal */}
      <Modal visible={showStateFilter} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{flex:1,backgroundColor:COLORS.white}} edges={['top']}>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'}}>
            <TouchableOpacity onPress={() => setShowStateFilter(false)}>
              <Text style={{fontSize:15,color:'#888'}}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{fontSize:16,fontWeight:'700',color:COLORS.navy}}>Filter by State</Text>
            <TouchableOpacity onPress={() => { setFilterState(''); setFilterCity(''); setShowStateFilter(false); }}>
              <Text style={{fontSize:15,color:COLORS.gold,fontWeight:'600'}}>Clear</Text>
            </TouchableOpacity>
          </View>
          <View style={{paddingHorizontal:16,paddingVertical:12}}>
            <TextInput
              style={{borderWidth:1.5,borderColor:'#f0ede8',borderRadius:12,paddingHorizontal:14,paddingVertical:10,fontSize:14,color:COLORS.navy,marginBottom:12}}
              placeholder="Filter by city..."
              placeholderTextColor="#bbb"
              value={filterCity}
              onChangeText={setFilterCity}
            />
          </View>
          <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:40}}>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
              {STATE_LIST.map(state => (
                <TouchableOpacity
                  key={state}
                  style={{paddingHorizontal:16,paddingVertical:10,borderRadius:100,borderWidth:1.5,borderColor:filterState===state?COLORS.navy:'#f0ede8',backgroundColor:filterState===state?COLORS.navy:'transparent'}}
                  onPress={() => { setFilterState(filterState===state?'':state); }}
                >
                  <Text style={{fontSize:13,fontWeight:'600',color:filterState===state?COLORS.white:COLORS.navy}}>{state}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={{padding:16,borderTopWidth:1,borderTopColor:'#f0ede8'}}>
            <TouchableOpacity
              style={{backgroundColor:COLORS.navy,borderRadius:14,paddingVertical:14,alignItems:'center'}}
              onPress={() => setShowStateFilter(false)}
            >
              <Text style={{color:COLORS.white,fontSize:15,fontWeight:'700'}}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
"""

if old_end in events:
    events = events.replace(old_end, state_modal + old_end)
    print('State filter modal added')
else:
    print('WARNING: end not found')

# ── Fix 6: Add missing styles ─────────────────────────────────────────────────
old_style_end = "});"
# Find last StyleSheet.create closing
last_idx = events.rfind(old_style_end)
extra_styles = """
  locationRow:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:16,paddingVertical:8,backgroundColor:COLORS.white},
  locationTxt:{fontSize:13,color:COLORS.gold,fontWeight:'600'},
  toggleRow:{paddingHorizontal:16,paddingVertical:10,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:'#f0ede8'},
  toggle:{flexDirection:'row',backgroundColor:'#f0ede8',borderRadius:100,padding:3},
  toggleBtn:{flex:1,paddingVertical:8,borderRadius:100,alignItems:'center'},
  toggleBtnActive:{backgroundColor:COLORS.white,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.08,shadowRadius:3},
  toggleTxt:{fontSize:13,fontWeight:'600',color:'#999'},
  toggleTxtActive:{color:COLORS.navy,fontWeight:'700'},
"""

if 'locationRow:{' not in events:
    events = events[:last_idx] + extra_styles + events[last_idx:]
    print('Styles added')
else:
    print('Styles already present')

# ── Fix 7: Add email requirement to checkout flow ─────────────────────────────
with open('app/event-checkout.tsx', 'r', encoding='utf-8') as f:
    checkout = f.read()

if 'emailInput' not in checkout and 'email' not in checkout[:500]:
    # Add email field before the quantity selector
    old_qty = "  const [quantity, setQuantity] = useState(1);"
    new_qty = """  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');"""
    checkout = checkout.replace(old_qty, new_qty)

    # Add email validation before payment
    old_pay = "  function handlePay() {"
    new_pay = """  function handlePay() {
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');"""
    checkout = checkout.replace(old_pay, new_pay)

    with open('app/event-checkout.tsx', 'w', encoding='utf-8') as f:
        f.write(checkout)
    print('event-checkout.tsx email requirement added')
else:
    print('event-checkout.tsx already has email')

with open('app/(tabs)/events.tsx', 'w', encoding='utf-8') as f:
    f.write(events)

print('\nALL DONE')
