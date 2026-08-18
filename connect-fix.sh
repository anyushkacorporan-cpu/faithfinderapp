#!/bin/bash
cd ~/Desktop/FaithFinderApp

# ── Connections Store ──────────────────────────────────
cat > src/lib/connectionsStore.ts << 'EOF'
import { useState, useEffect } from 'react';

export type Connection = {
  id: string;
  name: string;
  type: 'church' | 'person';
  address?: string;
  placeId?: string;
  color?: string;
  initials?: string;
  connectedAt: number;
};

let connections: Connection[] = [];
const listeners: Array<() => void> = [];
function notify() { listeners.forEach(fn => fn()); }

export function getConnections() { return [...connections]; }
export function getConnectionCount() { return connections.length; }

export function isConnected(id: string) {
  return connections.some(c => c.id === id);
}

export function addConnection(conn: Omit<Connection, 'connectedAt'>) {
  if (!isConnected(conn.id)) {
    connections = [{ ...conn, connectedAt: Date.now() }, ...connections];
    notify();
  }
}

export function removeConnection(id: string) {
  connections = connections.filter(c => c.id !== id);
  notify();
}

export function useConnections() {
  const [state, setState] = useState(getConnections());
  useEffect(() => {
    const fn = () => setState(getConnections());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useConnectionCount() {
  const [count, setCount] = useState(getConnectionCount());
  useEffect(() => {
    const fn = () => setCount(getConnectionCount());
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return count;
}
EOF
echo "connectionsStore done"

# ── Update church-detail.tsx Connect button ────────────
python3 << 'PYEOF'
content = open('app/church-detail.tsx').read()

# Add import for connectionsStore
if 'connectionsStore' not in content:
    content = content.replace(
        "import { useSavedChurches } from '../src/lib/store';",
        "import { useSavedChurches } from '../src/lib/store';\nimport { isConnected, addConnection, removeConnection } from '../src/lib/connectionsStore';"
    )

# Add connection state after other state declarations
if 'connected,' not in content:
    content = content.replace(
        "  const placeId = params.placeId || staticChurch?.placeId || '';",
        "  const placeId = params.placeId || staticChurch?.placeId || '';\n  const [connected, setConnected] = useState(isConnected(params.id || placeId || ''));"
    )

# Replace the Connect button with functional one
content = content.replace(
    "<TouchableOpacity style={s.connectBtn}>\n              <Text style={s.connectBtnTxt}>Connect</Text>\n            </TouchableOpacity>",
    """<TouchableOpacity style={[s.connectBtn, connected && s.connectBtnActive]} onPress={() => {
              const connId = params.id || placeId || '';
              if (connected) {
                removeConnection(connId);
                setConnected(false);
              } else {
                addConnection({
                  id: connId,
                  name: church.name,
                  type: 'church',
                  address: church.address,
                  placeId: church.placeId,
                  color: COLORS.gold,
                  initials: church.name?.slice(0,2).toUpperCase() || 'CH',
                });
                setConnected(true);
              }
            }}>
              <Text style={s.connectBtnTxt}>{connected ? 'Connected ✓' : 'Connect'}</Text>
            </TouchableOpacity>"""
)

# Add connectBtnActive style
content = content.replace(
    "connectBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},",
    "connectBtn:{backgroundColor:COLORS.navy,borderRadius:100,paddingHorizontal:20,paddingVertical:9},connectBtnActive:{backgroundColor:COLORS.green},"
)

open('app/church-detail.tsx', 'w').write(content)
print('church-detail done')
PYEOF

# ── Update Personal Profile to show connections ─────────
python3 << 'PYEOF'
content = open('app/(tabs)/profile.tsx').read()

# Add import for connectionsStore
if 'connectionsStore' not in content:
    content = content.replace(
        "import { useUser, setUser } from '../../src/lib/userStore';",
        "import { useUser, setUser } from '../../src/lib/userStore';\nimport { useConnections, useConnectionCount, removeConnection } from '../../src/lib/connectionsStore';"
    )

# Add connections to the component
if 'useConnections()' not in content:
    content = content.replace(
        "  const isChurch = user.accountType === 'church';",
        "  const isChurch = user.accountType === 'church';\n  const connections = useConnections();\n  const connectionCount = useConnectionCount();"
    )

# Replace static connections count with dynamic
content = content.replace(
    "<Text style={s.connectionsNum}>0</Text>\n            <Text style={s.connectionsTxt}> Connections </Text>",
    "<Text style={s.connectionsNum}>{connectionCount}</Text>\n            <Text style={s.connectionsTxt}> Connection{connectionCount !== 1 ? 's' : ''} </Text>"
)

open('app/(tabs)/profile.tsx', 'w').write(content)
print('profile done')
PYEOF

echo "ALL DONE"
