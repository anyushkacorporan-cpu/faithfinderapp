import { supabase } from './supabase';
import { getAuthUser } from './auth';

/**
 * Blocks and reports, on the server.
 *
 * Both were device-local, which made them look like features while being
 * neither: a block lasted until the app was reinstalled, and a report was
 * filed into the reporter's own phone where nobody could read it.
 *
 * The local stores stay as they are and keep driving the screens — they are
 * instant and work offline. These functions mirror the same actions to the
 * database, so the block outlives the device and the report reaches someone.
 * Every call returns rather than throws: failing to sync a block must never
 * stop the block from taking effect locally.
 */

export type RemoteBlock = { id?: string; name: string; blockedAt: number };

/** Everything this account has blocked, or null if it could not be read. */
export async function fetchBlocks(): Promise<RemoteBlock[] | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;

  const { data, error } = await db
    .from('blocked_users')
    .select('blocked_id, blocked_name, created_at')
    .eq('blocker_id', me.id);

  if (error || !data) return null;
  return data.map(r => ({
    id: r.blocked_id || undefined,
    name: r.blocked_name,
    blockedAt: new Date(r.created_at).getTime(),
  }));
}

/** Record a block. Safe to call for one that already exists. */
export async function pushBlock(user: { id?: string; name: string }): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !user.name) return;

  // onConflict rather than an existence check: two taps in quick succession
  // would both pass the check and one would fail on the constraint.
  await db.from('blocked_users').upsert(
    { blocker_id: me.id, blocked_id: user.id ?? null, blocked_name: user.name },
    { onConflict: 'blocker_id,blocked_name' },
  );
}

/** Remove a block, by id or by name — whichever the caller has. */
export async function removeBlock(idOrName: string): Promise<void> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return;

  // Two deletes rather than an `or`, because the value could legitimately be
  // either column and matching the wrong one silently removes nothing.
  await db.from('blocked_users').delete().eq('blocker_id', me.id).eq('blocked_name', idOrName);
  await db.from('blocked_users').delete().eq('blocker_id', me.id).eq('blocked_id', idOrName);
}

export type ReportInput = {
  targetType: 'post' | 'comment' | 'user' | 'event';
  targetId: string;
  reason: string;
  details?: string;
  targetAuthor?: string;
  targetAuthorId?: string;
  /** The reported text itself — see the snapshot column in 06_moderation.sql. */
  snapshot?: string;
};

/**
 * File a report.
 *
 * Returns whether it reached the server, because this is the one place where
 * saying "reported" without it being true is the whole failure. Callers that
 * cannot show an error should still not claim success they did not get.
 */
export async function submitReport(input: ReportInput): Promise<boolean> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return false;

  const { error } = await db.from('reports').upsert(
    {
      reporter_id: me.id,
      target_type: input.targetType,
      target_id: input.targetId,
      target_author: input.targetAuthor ?? null,
      target_author_id: input.targetAuthorId ?? null,
      reason: input.reason,
      details: input.details ?? null,
      // Long enough to judge a post by, short enough not to store someone's
      // essay twice.
      snapshot: input.snapshot ? input.snapshot.slice(0, 2000) : null,
    },
    { onConflict: 'reporter_id,target_type,target_id' },
  );

  return !error;
}
