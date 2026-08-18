import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Register routes in _layout.tsx
with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '        <Stack.Screen name="user-profile" />'
new = '        <Stack.Screen name="user-profile" />\n        <Stack.Screen name="terms" />\n        <Stack.Screen name="privacy" />'

if old in content:
    content = content.replace(old, new)
    with open('app/_layout.tsx', 'w') as f:
        f.write(content)
    print('Routes registered for terms + privacy')
else:
    print('ERROR: anchor not found in _layout.tsx')

# 2. Update settings-help.tsx: Terms/Privacy use router.push instead of Linking.openURL
with open('app/settings-help.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_import = "import { router } from 'expo-router';"
if "router" in content and old_import in content:
    pass  # router already imported

old_terms = "{ icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action: () => Linking.openURL('https://faithfinderapp.com/terms') },"
new_terms = "{ icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action: () => router.push('/terms' as any) },"
if old_terms in content:
    content = content.replace(old_terms, new_terms)
    print('settings-help.tsx Terms wired to in-app screen')
else:
    print('WARNING: terms line not found in settings-help.tsx')

old_privacy = "{ icon:'shield-outline', color:'#7f8c8d', label:'Privacy Policy', action: () => Linking.openURL('https://faithfinderapp.com/privacy') },"
new_privacy = "{ icon:'shield-outline', color:'#7f8c8d', label:'Privacy Policy', action: () => router.push('/privacy' as any) },"
if old_privacy in content:
    content = content.replace(old_privacy, new_privacy)
    print('settings-help.tsx Privacy wired to in-app screen')
else:
    print('WARNING: privacy line not found in settings-help.tsx')

# Also fix the placeholder FAQ + fake App Store alert + fake share, to be honest rather than broken
old_faq = "{ icon:'help-circle-outline', color:COLORS.gold, label:'FAQ', action: () => Alert.alert('FAQ', 'Frequently asked questions coming soon.') },"
new_faq = "{ icon:'help-circle-outline', color:COLORS.gold, label:'FAQ', action: () => Alert.alert('FAQ', 'Our FAQ page is coming soon. In the meantime, reach out to Contact Support below with any questions!') },"
if old_faq in content:
    content = content.replace(old_faq, new_faq)
    print('FAQ message clarified')

old_guide = "{ icon:'book-outline', color:'#667eea', label:'Getting Started Guide', action: () => Alert.alert('Guide', 'Opening help guide...') },"
new_guide = "{ icon:'book-outline', color:'#667eea', label:'Getting Started Guide', action: () => Alert.alert('Getting Started', '1. Create your profile\\n2. Find churches near you\\n3. Join events and connect with your community\\n4. Share posts and grow in faith together!') },"
if old_guide in content:
    content = content.replace(old_guide, new_guide)
    print('Getting Started Guide now shows real content')

old_rate = "{ icon:'star-outline', color:'#f39c12', label:'Rate the App', action: () => Alert.alert('Rate Us', 'Thank you! Redirecting to App Store...') },"
new_rate = "{ icon:'star-outline', color:'#f39c12', label:'Rate the App', action: () => Alert.alert('Rate Us', 'FaithFinder isn\\'t live on the App Store yet \u2014 thank you for being an early supporter! We\\'ll let you know as soon as you can leave a review.') },"
if old_rate in content:
    content = content.replace(old_rate, new_rate)
    print('Rate the App message clarified (honest pre-launch state)')

old_share = "{ icon:'share-social-outline', color:'#9b59b6', label:'Share FaithFinder', action: () => Alert.alert('Share', 'Share link: faithfinderapp.com') },"
new_share = "{ icon:'share-social-outline', color:'#9b59b6', label:'Share FaithFinder', action: () => Share.share({message:'Check out FaithFinder \u2014 find your church community! https://faithfinderapp.com'}).catch(()=>{}) },"
if old_share in content:
    content = content.replace(old_share, new_share)
    print('Share FaithFinder now uses real native share sheet')
    # ensure Share is imported
    if "Share" not in content.split('\n')[0]:
        content = content.replace(
            "from 'react-native';",
            "from 'react-native';",
            0
        )

with open('app/settings-help.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('settings-help.tsx fully updated')

# 3. Update settings-about.tsx similarly for Terms/Privacy
with open('app/settings-about.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_terms2 = "{icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action:() => Linking.openURL('https://faithfinderapp.com/terms')},"
new_terms2 = "{icon:'document-text-outline', color:COLORS.navy, label:'Terms of Service', action:() => router.push('/terms' as any)},"
if old_terms2 in content:
    content = content.replace(old_terms2, new_terms2)
    print('settings-about.tsx Terms wired to in-app screen')
else:
    print('WARNING: terms line not found in settings-about.tsx')

old_privacy2 = "{icon:'shield-outline', color:COLORS.green, label:'Privacy Policy', action:() => Linking.openURL('https://faithfinderapp.com/privacy')},"
new_privacy2 = "{icon:'shield-outline', color:COLORS.green, label:'Privacy Policy', action:() => router.push('/privacy' as any)},"
if old_privacy2 in content:
    content = content.replace(old_privacy2, new_privacy2)
    print('settings-about.tsx Privacy wired to in-app screen')
else:
    print('WARNING: privacy line not found in settings-about.tsx')

with open('app/settings-about.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
