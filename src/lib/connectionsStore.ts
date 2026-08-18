import { useState, useEffect } from 'react';

type Connection = { id: string; name: string; type: 'user' | 'church'; color: string; initials: string; };

let connections: Connection[] = [
  { id: 'grace-community', name: 'Grace Community Church', type: 'church', color: '#c9a96e', initials: 'GC' },
  { id: 'pastor-mike', name: 'Pastor Michael Johnson', type: 'user', color: '#667eea', initials: 'MJ' },
];

type Listener = () => void;
const listeners: Listener[] = [];
function notify() { listeners.forEach(l => l()); }

export function useConnections() {
  const [state, setState] = useState([...connections]);
  useEffect(() => {
    const fn = () => setState([...connections]);
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }, []);
  return state;
}

export function useConnectionCount() {
  return useConnections().length;
}

export function getConnections() { return connections; }
export function isConnected(nameOrId: string) { return connections.some(c => c.name === nameOrId || c.id === nameOrId); }
export function addConnection(c: Connection) { if (!isConnected(c.id)) { connections.push(c); notify(); } }
export function removeConnection(id: string) { connections = connections.filter(c => c.id !== id); notify(); }
