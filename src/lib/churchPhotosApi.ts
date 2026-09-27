import { supabase, writeFailed } from './supabase';
import { getAuthUser } from './auth';
import { uploadImage } from './postsApi';

/**
 * Photos on a church that somebody has claimed.
 *
 * Two kinds of photo reach a church page and they are not interchangeable. The
 * imported one lives on `churches.photo_url`, came from Wikimedia, carries an
 * attribution and belongs to the import — a re-import may replace it. The other
 * kind is the gallery below, which belongs to whoever proved the church is
 * theirs.
 *
 * Removing the imported photo therefore is not a delete. `churches` has no
 * write policy at all, deliberately, and the next import would undo it anyway;
 * what a church can do is record that it should not be shown, which is
 * `hide_imported_photo` on its claim. See supabase/23_church_photos_editable.sql.
 *
 * Nothing here is allowed to be trusted by the client. Every write is refused
 * by row-level security unless the claim has actually been granted, so the
 * ownership check below decides what the screen *offers*, never what the server
 * permits.
 */

export type ChurchPhoto = { id: string; url: string; sort: number };

/**
 * The directory's own id for a church.
 *
 * Screens carry `db_<uuid>` because churchesApi prefixes it to keep imported
 * churches apart from Google's and the seeded ones. Anything without that
 * prefix is not a row in our table and has no photos to manage.
 */
export function churchUuid(id: string | undefined | null): string | null {
  if (!id || !id.startsWith('db_')) return null;
  const uuid = id.slice(3);
  return uuid.length ? uuid : null;
}

/** Which church this account has been granted, if any. */
export async function fetchMyChurch(): Promise<{ churchId: string | null; approved: boolean } | null> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me) return null;
  const { data, error } = await db
    .from('profiles').select('claimed_church_id,verification_status').eq('id', me.id).single();
  if (error) { writeFailed('read your claim', error); return null; }
  return {
    churchId: data?.claimed_church_id || null,
    approved: data?.verification_status === 'approved',
  };
}

/**
 * True when this account may edit this church's photos.
 *
 * Both halves matter: the claim has to name this church, and it has to have
 * been approved. A pending claim is a request, not a permission — the server
 * takes the same view, and would refuse the write either way.
 */
export async function canEditChurchPhotos(churchId: string): Promise<boolean> {
  const mine = await fetchMyChurch();
  return !!mine && mine.approved && mine.churchId === churchId;
}

/** Every gallery photo for a church, in display order. Null means the read failed. */
export async function fetchChurchPhotos(churchId: string): Promise<ChurchPhoto[] | null> {
  const db = supabase();
  if (!db || !churchId) return null;
  const { data, error } = await db
    .from('church_photos').select('id,url,sort')
    .eq('church_id', churchId)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) { writeFailed('read the church gallery', error); return null; }
  return (data || []) as ChurchPhoto[];
}

/**
 * Upload local photos and attach them to the church.
 *
 * Each file is uploaded before its row is written, because a row pointing at a
 * phone-local file:// path is a photo only its uploader can see — the failure
 * 08_avatars.sql was written about. uploadImage returns the local uri when the
 * upload fails, so that case is detected here and the row is not written at
 * all: better to report nothing saved than to save something nobody else can
 * load.
 *
 * Returns the photos that actually landed, which may be fewer than were picked.
 */
export async function addChurchPhotos(churchId: string, localUris: string[]): Promise<ChurchPhoto[]> {
  const db = supabase();
  const me = getAuthUser();
  if (!db || !me || !churchId || !localUris.length) return [];

  const existing = await fetchChurchPhotos(churchId);
  let nextSort = (existing || []).reduce((max, p) => Math.max(max, p.sort), -1) + 1;

  const rows: Array<{ church_id: string; added_by: string; url: string; sort: number }> = [];
  for (const uri of localUris) {
    const url = await uploadImage(uri, 'church-photos');
    if (url === uri && !/^https?:/.test(uri)) continue;  // upload failed; already warned
    rows.push({ church_id: churchId, added_by: me.id, url, sort: nextSort++ });
  }
  if (!rows.length) return [];

  const { data, error } = await db.from('church_photos').insert(rows).select('id,url,sort');
  if (error) { writeFailed('add church photos', error); return []; }
  return (data || []) as ChurchPhoto[];
}

/** Detach a gallery photo. Returns whether the row is gone from the server. */
export async function removeChurchPhoto(photoId: string): Promise<boolean> {
  const db = supabase();
  if (!db || !photoId) return false;
  const { error } = await db.from('church_photos').delete().eq('id', photoId);
  return !writeFailed('remove a church photo', error);
}

/**
 * Show or stop showing the imported photo.
 *
 * Not a delete, for the reasons at the top of this file. The imported photo
 * stays exactly where it is and the view stops selecting it, which is also what
 * makes the removal outlive the next import.
 */
export async function setImportedPhotoHidden(churchId: string, hidden: boolean): Promise<boolean> {
  const db = supabase();
  if (!db || !churchId) return false;
  const { error } = await db.from('church_profiles')
    .update({ hide_imported_photo: hidden }).eq('church_id', churchId);
  return !writeFailed('hide the imported photo', error);
}

/** Whether the imported photo is currently suppressed, and what it is. */
export async function fetchImportedPhoto(
  churchId: string,
): Promise<{ url: string | null; credit: string | null; hidden: boolean } | null> {
  const db = supabase();
  if (!db || !churchId) return null;
  const [base, claim] = await Promise.all([
    db.from('churches').select('photo_url,photo_credit').eq('id', churchId).single(),
    db.from('church_profiles').select('hide_imported_photo').eq('church_id', churchId).maybeSingle(),
  ]);
  if (base.error) { writeFailed('read the imported photo', base.error); return null; }
  return {
    url: base.data?.photo_url || null,
    credit: base.data?.photo_credit || null,
    hidden: claim.data?.hide_imported_photo === true,
  };
}
