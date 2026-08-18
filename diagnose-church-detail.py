import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# Read the current broken file and fix just the email section
with open('app/church-detail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Count lines
lines = content.split('\n')
print(f'Total lines: {len(lines)}')

# Find the broken section - look for Collapsible closing tag that shouldn't be there
for i, line in enumerate(lines):
    if 'Collapsible' in line or 'Not available' in line or 'churchEmail' in line:
        print(f'{i+1}: {repr(line[:80])}')
