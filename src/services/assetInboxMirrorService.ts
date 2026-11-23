import { type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type AssetInboxGroup = 'map' | 'hero' | 'enemy' | 'boss' | 'companion' | 'other';

export interface AssetInboxMirrorInput {
  id: string;
  name: string;
  chapter: number;
  group: AssetInboxGroup;
  path: string;
  size: number;
  uploadedAt?: string;
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_UTC_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,3})?Z$/;
const VALID_GROUPS = new Set<AssetInboxGroup>(['map', 'hero', 'enemy', 'boss', 'companion', 'other']);
const VALID_UID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const mirroredIds = new Set<string>();
const syncedAdminUids = new Set<string>();

function sanitizeInboxItem(item: AssetInboxMirrorInput) {
  if (!UUID_V4_RE.test(item.id)) return null;
  const name = item.name.trim().normalize('NFC');
  if (name.length < 5 || name.length > 120 || !/\.glb$/i.test(name) || name.includes('/') || name.includes('\\') || name.includes('..')) {
    return null;
  }
  if (!Number.isInteger(item.chapter) || item.chapter < 1 || item.chapter > 12) return null;
  if (!VALID_GROUPS.has(item.group)) return null;
  const path = item.path.normalize('NFC');
  if (path.length < 15 || path.length > 320 || path.includes('..') || !path.startsWith(`/assets/Chương ${item.chapter}/Asset mới/`)) {
    return null;
  }
  if (!Number.isInteger(item.size) || item.size < 24 || item.size > 120_000_000) return null;
  const uploadedAt = typeof item.uploadedAt === 'string' && ISO_UTC_RE.test(item.uploadedAt)
    ? item.uploadedAt
    : new Date().toISOString();

  return {
    id: item.id,
    name,
    chapter: item.chapter,
    group: item.group,
    path,
    size: item.size,
    uploadedAt,
    isPublic: true,
  };
}

export async function syncAssetAdminUidToFirestore(owner: User, passwordUid: string): Promise<boolean> {
  if (!VALID_UID_RE.test(passwordUid) || !VALID_UID_RE.test(owner.uid)) return false;
  if (syncedAdminUids.has(passwordUid)) return true;

  const ref = doc(db, 'asset_admins', passwordUid);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      syncedAdminUids.add(passwordUid);
      return true;
    }
    await setDoc(ref, {
      uid: passwordUid,
      handle: 'puugoo',
      grantedBy: owner.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    syncedAdminUids.add(passwordUid);
    return true;
  } catch {
    // Non-fatal: Firestore rules may not be deployed yet or user is not the Google owner.
    return false;
  }
}

export type MirrorSyncResult = {
  synced: number;
  status: 'synced' | 'needs-google-auth' | 'unavailable';
};

export async function mirrorAssetInboxItems(items: AssetInboxMirrorInput[]): Promise<MirrorSyncResult> {
  let synced = 0;
  for (const raw of items) {
    if (mirroredIds.has(raw.id)) {
      synced += 1;
      continue;
    }
    const clean = sanitizeInboxItem(raw);
    if (!clean) continue;

    const ref = doc(db, 'asset_inbox', clean.id);
    try {
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        await setDoc(ref, {
          ...clean,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      mirroredIds.add(clean.id);
      synced += 1;
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
      if (code === 'permission-denied') {
        return { synced, status: 'needs-google-auth' };
      }
      return { synced, status: 'unavailable' };
    }
  }
  return { synced, status: 'synced' };
}
