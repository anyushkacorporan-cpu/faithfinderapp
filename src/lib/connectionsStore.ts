import { useState, useEffect } from 'react';
import { load, save } from './persist';

/**
 * Someone (or some church) the user follows. `address` and `placeId` are only
 * present on church connections saved from the church-detail screen — they let
 * that screen be reopened later without another Places lookup.
 */
export type Connection = {
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

/**
 * Build a Connection from any author — a post, a comment, a profile screen.
 *
 * Both places you can connect from must produce the SAME record, or you would
 * connect in the feed and the profile would still show "Connect": isConnected()
 * matches on id OR name, so the id has to be derived the same way every time.
 * Accounts created before ids existed have only a name, which is why the name
 * is the fallback id rather than something generated.
 */
export function connectionFromAuthor(a: {
  authorId?: string;
  authorName: string;
  authorType?: 'church' | 'personal';
  authorColor?: string;
  authorInitials?: string;
}): Connection {
  return {
    id: a.authorId || a.authorName,
    name: a.authorName,
    type: a.authorType === 'church' ? 'church' : 'user',
    color: a.authorColor || '#667eea',
    initials: a.authorInitials || a.authorName.slice(0, 2).toUpperCase(),
  };
}

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
/**
 * Match on a single value. Kept for callers that only have one thing to hand.
 * Prefer isConnectedTo() when you have both an id and a name.
 */
export function isConnected(nameOrId: string) { return connections.some(c => c.name === nameOrId || c.id === nameOrId); }

/**
 * Is this account already connected? Pass whatever you have.
 *
 * A church can be reached two ways and each stores a different id: following
 * from the Churches tab records the Google Place ID, while a church account
 * posting in the feed carries its own account id. Checking id OR name OR
 * placeId means the same church resolves to one connection either way, instead
 * of showing "Connect" a second time and creating a duplicate.
 */
export function isConnectedTo(id?: string, name?: string): boolean {
  if (!id && !name) return false;
  return connections.some(c =>
    (!!id && (c.id === id || c.placeId === id)) ||
    (!!name && c.name === name)
  );
}
export function addConnection(c: Connection) { if (!isConnected(c.id)) { connections.push(c); persist(); notify(); } }
/** Remove by id, placeId or name — whichever the calling screen holds. */
export function removeConnection(idOrName: string) {
  connections = connections.filter(c =>
    c.id !== idOrName && c.name !== idOrName && c.placeId !== idOrName
  );
  persist(); notify();
}
