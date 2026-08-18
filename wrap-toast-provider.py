import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

# 1. Wrap _layout.tsx with ToastProvider
with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'ToastProvider' not in content:
    # Add import
    import re
    # Insert import after the last import line
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('import '):
            last_import_idx = i
    lines.insert(last_import_idx + 1, "import { ToastProvider } from '../src/components/Toast';")
    content = '\n'.join(lines)

    # Wrap the returned JSX - find "export default function RootLayout" and its return statement
    old_return_start = content.find('  return (', content.find('export default function RootLayout'))
    if old_return_start != -1:
        # find matching closing of this return - look for the line "  );" after it that closes this function
        # Simplest robust approach: insert <ToastProvider> right after 'return (' and find the very last ');' in file, wrap before it
        insert_point = old_return_start + len('  return (')
        content = content[:insert_point] + '\n    <ToastProvider>' + content[insert_point:]
        # find the last occurrence of '  );' in the file (end of RootLayout return)
        last_close = content.rfind('  );')
        content = content[:last_close] + '    </ToastProvider>\n  ' + content[last_close+2:]
        print('_layout.tsx wrapped with ToastProvider')
    else:
        print('ERROR: RootLayout return not found')

    with open('app/_layout.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print('ToastProvider already present in _layout.tsx')

print('ALL DONE - Part 1')
