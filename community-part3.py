import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/(tabs)/community.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add shareLegacyPost as just an alias for repostTarget (no new state needed)
# Simplify: just remove the reference, since repostTarget already holds the post.
content = content.replace(
    "onShare={() => { setRepostTarget(post); setRepostComment(''); setShareLegacyPost(post); }}",
    "onShare={() => { setRepostTarget(post); setRepostComment(''); }}"
)
print('Removed undefined setShareLegacyPost reference')

# 2. Add a "Share externally" button into the Repost modal, right after the header
old_repost_hdr = """          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setRepostTarget(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Repost</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (repostTarget) {
                repostPost(repostTarget, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, repostComment.trim());
              }
              setRepostTarget(null);
            }}>
              <Text style={s.postBtnTxt}>Repost</Text>
            </TouchableOpacity>
          </View>"""

new_repost_hdr = """          <View style={s.modalHdr}>
            <TouchableOpacity onPress={() => setRepostTarget(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Repost</Text>
            <TouchableOpacity style={s.postBtn} onPress={() => {
              if (repostTarget) {
                repostPost(repostTarget, {
                  authorName: displayName, authorInitials: initials,
                  authorType: user.accountType === 'church' ? 'church' : 'personal',
                  authorColor: '#667eea', authorPhoto: user.profilePhoto,
                }, repostComment.trim());
              }
              setRepostTarget(null);
            }}>
              <Text style={s.postBtnTxt}>Repost</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:16,paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#f0ede8'}}
            onPress={() => {
              const m = repostTarget?.repostOf?.content || repostTarget?.content || '';
              const target = repostTarget;
              setRepostTarget(null);
              setTimeout(() => Share.share({message:m,title:'Check this out on FaithFinder'}).catch(()=>{}), 400);
            }}
          >
            <Ionicons name="share-social-outline" size={20} color={COLORS.navy}/>
            <Text style={{fontSize:15,fontWeight:'600',color:COLORS.navy}}>Share Externally</Text>
          </TouchableOpacity>"""

if old_repost_hdr in content:
    content = content.replace(old_repost_hdr, new_repost_hdr)
    print('Share Externally option added to Repost modal')
else:
    print('ERROR: repost header block not found exactly')

with open('app/(tabs)/community.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('ALL DONE')
