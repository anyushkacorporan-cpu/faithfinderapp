#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re

content = open('app/church-detail.tsx').read()

# 1. Fix handlePostToFeed to properly add to posts and show toast
old_post = '''  function handlePostToFeed() {
    setSharingToFeed(true);
    const user = require('../src/lib/userStore').getUser();
    const displayName = user.accountType === 'church'
      ? (user.churchName || 'Church')
      : `${user.firstName || 'User'} ${user.lastName || ''}`.trim();
    const initials = (user.accountType === 'church'
      ? (user.churchName?.[0] || 'C')
      : `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`).toUpperCase();
    require('../src/lib/postsStore').addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: user.accountType === 'church' ? 'church' : 'personal',
      authorColor: '#667eea',
      content: shareMessage.trim(),
      time: 'now',
      churchPlaceId: placeId,
      churchName: church.name,
      churchShareData: {
        placeId: placeId,
        name: church.name,
        address: church.address,
        description: church.description,
        id: church.id,
      },
    });
    setSharingToFeed(false);
    setShowShareComposer(false);
    setShareMessage('');
    Alert.alert('Shared to Community', church.name + ' has been posted to Discover.', [{text:'OK'}]);
  }'''

new_post = '''  function handlePostToFeed() {
    setSharingToFeed(true);
    const { getUser } = require('../src/lib/userStore');
    const { addPost } = require('../src/lib/postsStore');
    const u = getUser();
    const displayName = u.accountType === 'church'
      ? (u.churchName || 'Church')
      : ((u.firstName || 'User') + ' ' + (u.lastName || '')).trim();
    const initials = (u.accountType === 'church'
      ? (u.churchName?.[0] || 'C')
      : ((u.firstName?.[0] || 'U') + (u.lastName?.[0] || ''))).toUpperCase();
    addPost({
      authorName: displayName,
      authorInitials: initials,
      authorType: u.accountType === 'church' ? 'church' : 'personal',
      authorColor: u.accountType === 'church' ? '#c9a96e' : '#667eea',
      content: shareMessage.trim(),
      time: 'now',
      churchPlaceId: placeId,
      churchName: church.name,
      churchShareData: {
        placeId: placeId,
        name: church.name,
        address: church.address,
        description: church.description || '',
        id: church.id,
      },
    });
    setSharingToFeed(false);
    setShowShareComposer(false);
    setShareMessage('');
    setShowSharedToast(true);
    setTimeout(() => setShowSharedToast(false), 3000);
  }'''

content = content.replace(old_post, new_post)

# 2. Fix external share to use real native Share
old_external = '''  function handleExternalShare() {
    Share.share({
      title: church.name,
      message: `Check out ${church.name} on FaithFinder!\\n📍 ${church.address}${church.phone ? '\\n📞 ' + church.phone : ''}${church.website ? '\\n🌐 ' + church.website : ''}`,
    });
  }'''

new_external = '''  async function handleExternalShare() {
    try {
      const result = await Share.share({
        title: church.name,
        message: 'Check out ' + church.name + ' on FaithFinder!\\n📍 ' + church.address + (church.phone ? '\\n📞 ' + church.phone : '') + (church.website ? '\\n🌐 ' + church.website : ''),
        url: church.website || 'https://faithfinderapp.com',
      });
    } catch (e) {}
  }'''

content = content.replace(old_external, new_external)

# 3. Fix toast to just say "Shared to Community"
content = re.sub(
    r'<Text style=\{s\.toastTitle\}>Shared to Community</Text>.*?(?=\n\s*</View>)',
    '<Text style={s.toastTitle}>Shared to Community</Text>',
    content,
    flags=re.DOTALL
)

open('app/church-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
