import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# Read current edit-church-profile.tsx
with open('app/edit-church-profile.tsx', 'r', encoding='utf-8') as f:
    old_content = f.read()

# Check what the service times field currently looks like
idx = old_content.find('serviceTimes')
print('Current serviceTimes context:')
print(repr(old_content[max(0,idx-100):idx+300]))
