#!/bin/bash
cd ~/Desktop/FaithFinderApp

python3 << 'PYEOF'
import re
content = open('app/event-detail.tsx').read()

# Find and replace the entire handleGetTicket function using regex
new_func = '''  function handleGetTicket() {
    if (attending) { Alert.alert('Already Attending', "You already have a ticket for this event!"); return; }
    if (params.price === 'Free') {
      setAttending(true);
      addAttending(params.id || '');
      router.push({ pathname: '/ticket-success' as any, params: { id: params.id, title: params.title, date: params.date, location: params.location, price: 'Free', type: params.type } });
    } else {
      router.push({ pathname: '/event-checkout' as any, params: { id: params.id, title: params.title, date: params.date, location: params.location, price: params.price, type: params.type } });
    }
  }'''

content = re.sub(
    r'  function handleGetTicket\(\) \{.*?\n  \}',
    new_func,
    content,
    flags=re.DOTALL
)

open('app/event-detail.tsx', 'w').write(content)
print('ALL DONE')
PYEOF
