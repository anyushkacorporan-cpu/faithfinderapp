import { useState, useEffect } from 'react';
import { load, save } from './persist';

/**
 * Someone (or some church) the user follows. `address` and `placeId` are only
 * present on church connections saved from the church-detail screen — they let
 * that screen be reopened later without another Places lookup.
 */
type Connection = {
  id: string;
  name: string;
  type: 'user' | 'church';
  color: string;
  initials: string;
  address?: string;
  placeId?: string;
};

let connections: Connection[] = [
  { id: 'grace-community', name: 'Grace Community Church', type: 'church', color: '#c9a96e', initials: 'GC' },
  { id: 'pastor-mike', name: 'Pastor Michael Johnson', type: 'user', color: '#667eea', initials: 'MJ' },
];

type Listener = () => void;
const listeners: Listener[] = [];
function notify() { listeners.forEach(l => l()); }

const STORAGE_KEY = 'faithfinder_connections_v1';
function persist() { save(STORAGE_KEY, connections); }
load<typeof connections>(STORAGE_KEY, v => { connections = v; notify(); });

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
export function addConnection(c: Connection) { if (!isConnected(c.id)) { connections.push(c); persist(); notify(); } }
export function removeConnection(id: string) { connections = connections.filter(c => c.id !== id); persist(); notify(); }
