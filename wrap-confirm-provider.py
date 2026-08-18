import os
os.chdir(os.path.expanduser('~/Desktop/FaithFinderApp'))

with open('app/_layout.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'ConfirmProvider' not in content:
    old_import = "import { ToastProvider } from '../src/components/Toast';"
    new_import = "import { ToastProvider } from '../src/components/Toast';\nimport { ConfirmProvider } from '../src/components/Confirm';"
    if old_import in content:
        content = content.replace(old_import, new_import)
        print('ConfirmProvider imported')
    else:
        print('ERROR: ToastProvider import not found')

    old_open = "    <ToastProvider>"
    new_open = "    <ToastProvider>\n    <ConfirmProvider>"
    if old_open in content:
        content = content.replace(old_open, new_open)
        print('ConfirmProvider opening tag added')
    else:
        print('ERROR: ToastProvider opening tag not found')

    old_close = "    </ToastProvider>"
    new_close = "    </ConfirmProvider>\n    </ToastProvider>"
    if old_close in content:
        content = content.replace(old_close, new_close)
        print('ConfirmProvider closing tag added')
    else:
        print('ERROR: ToastProvider closing tag not found')

    with open('app/_layout.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print('ConfirmProvider already present')

print('ALL DONE')
