#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
with open('app/church-detail.tsx', 'r') as f:
    lines = f.readlines()

fixed = []
for line in lines:
    # Remove any emoji from string literals that cause syntax errors
    if '🌐' in line or '🙏' in line or '📍' in line or '📞' in line:
        line = line.replace('🌐 ', '').replace('🙏', '').replace('📍 ', '').replace('📞 ', '')
    fixed.append(line)

with open('app/church-detail.tsx', 'w') as f:
    f.writelines(fixed)

print('ALL DONE')
PYEOF
