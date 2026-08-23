/**
 * RFC 4122 version 4 identifiers, with no dependencies.
 *
 * Every store used `Date.now().toString()`, which produces the same id for any
 * two objects created in the same millisecond. On one device that is merely
 * unlikely; once posts, comments and tickets sync between devices it is a
 * certainty. These are real UUIDs so they can drop straight into a Postgres
 * `uuid` column when the backend arrives.
 *
 * `Math.random()` is not a cryptographically strong source, and that is fine
 * here: these identify rows, they never authorise anything. Anything
 * security-bearing — session tokens, invite codes, password resets — must be
 * issued by the server, never generated on the client.
 */
export function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8; // variant bits per RFC 4122
    return v.toString(16);
  });
}

/**
 * A short, human-quotable code for things a person may need to read aloud or
 * type — a ticket at a door, for instance. Not an identifier: pair it with a
 * `newId()` primary key rather than using it as one.
 */
export function newShortCode(prefix = ''): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += alphabet[(Math.random() * alphabet.length) | 0];
  }
  return prefix ? `${prefix}-${out}` : out;
}
