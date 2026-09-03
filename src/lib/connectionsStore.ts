import { useState, useEffect } from 'react';
import { load, save } from './persist';
import { fetchConnections, pushConnection, removeConnectionRemote } from './connectionsApi';

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

const INITIAL_CONNECTIONS: Connection[] = [
  { id: 'grace-community', name: 'Grace Community Church', type: 'church', color: '#c9a96e', initials: 'GC' },
  { id: 'pastor-mike', name: 'Pastor Michael Johnson', type: 'user', color: '#667eea', initials: 'MJ' },
];

let connections: Connection[] = INITIAL_CONNECTIONS;

/**
 * The seeded pair are demo content, not people. Pushing them would write two
 * fake connections onto every account that ever opens the app, and they would
 * then sync back down as though someone had chosen them.
 */
const SEEDED = new Set(INITIAL_CONNECTIONS.map(c => c.id));

type Listener = () => void;
const listeners: Listener[] = [];
/**
 * Notify subscribers over a copy of the list.
 *
 * A subscriber's setState can unmount a component, whose cleanup splices itself
 * out of `listeners` while forEach is still walking it — every listener after
 * the removed index is then skipped and silently misses that update. Iterating
 * a snapshot means the removal takes effect on the next notify instead of
 * halfway through this one.
 */
function notify() { [...listeners].forEach(l => l()); }

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
    // Re-read on subscribe: hydration from storage can land between the
    // useState initialiser above and this effect, and that notify would be
    // missed - leaving this component on the empty pre-hydration value until
    // something else happened to change the store.
    fn();
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
export function addConnection(c: Connection) {
  if (isConnected(c.id)) return;
  connections.push(c);
  persist();
  notify();
  // Not awaited: following is instant on screen and should work offline. The
  // next sign-in reconciles anything that did not reach the server.
  if (!SEEDED.has(c.id)) void pushConnection(c);
}
/** Remove by id, placeId or name — whichever the calling screen holds. */
export function removeConnection(idOrName: string) {
  connections = connections.filter(c =>
    c.id !== idOrName && c.name !== idOrName && c.placeId !== idOrName
  );
  persist(); notify();
  void removeConnectionRemote(idOrName);
}

/**
 * Reconcile this device's connections with the account's, at sign-in.
 *
 * A union, like blocks — but for the opposite reason. There is no harm in
 * keeping a follow the server has not heard of yet, and dropping one means
 * someone silently disappears from a feed the person curated. Local-only rows
 * are pushed up, which is how a follow made offline lands. The seeded demo
 * pair are excluded: they are placeholder content, and writing them to the
 * server would put two people nobody chose into every account's list.
 */
export async function syncConnectionsAfterSignIn(): Promise<void> {
  const remote = await fetchConnections();
  if (!remote) return;

  const merged = [...connections];
  for (const r of remote) {
    if (!merged.some(c => c.id === r.id || c.name === r.name)) merged.push(r);
  }

  const remoteIds = new Set(remote.map(r => r.id));
  for (const local of connections) {
    if (!remoteIds.has(local.id) && !SEEDED.has(local.id)) void pushConnection(local);
  }

  connections = merged;
  persist();
  notify();
}

/**
 * Return this store to a fresh-install state. Called only from
 * `deleteAccountAndData` — see src/lib/accountDeletion.ts for why clearing
 * storage alone is not enough.
 */
export function resetStore() {
  connections = INITIAL_CONNECTIONS;
  persist();
  notify();
}
