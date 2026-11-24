import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  DEFAULT_LIVEOPS_CONFIG,
  isVerifiedAdminIdentity,
  LIVEOPS_CONFIG_DOC_ID,
  LIVEOPS_STORAGE_KEY,
  LiveOpsConfig,
  sanitizeLiveOpsConfig,
} from '../data/liveOpsConfig';

let cachedConfig: LiveOpsConfig = loadLocalLiveOpsCache();

function toMs(raw: unknown): number {
  if (raw instanceof Timestamp) return raw.toMillis();
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'toMillis' in raw &&
    typeof (raw as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (raw as { toMillis: () => number }).toMillis();
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  return 0;
}

export function loadLocalLiveOpsCache(): LiveOpsConfig {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_LIVEOPS_CONFIG };
    }
    const raw = window.localStorage.getItem(LIVEOPS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LIVEOPS_CONFIG };
    return sanitizeLiveOpsConfig(JSON.parse(raw) as Partial<LiveOpsConfig>);
  } catch {
    return { ...DEFAULT_LIVEOPS_CONFIG };
  }
}

export function persistLocalLiveOpsCache(config: LiveOpsConfig): void {
  cachedConfig = sanitizeLiveOpsConfig(config);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LIVEOPS_STORAGE_KEY, JSON.stringify(cachedConfig));
    }
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getCachedLiveOpsConfig(): LiveOpsConfig {
  return cachedConfig;
}

export function isVerifiedAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return isVerifiedAdminIdentity({
    email: user.email,
    emailVerified: user.emailVerified,
  });
}

function mapFirestoreLiveOpsDoc(data: Record<string, unknown>): LiveOpsConfig {
  return sanitizeLiveOpsConfig({
    version: Number(data.version ?? 1),
    goldRewardMult: Number(data.goldRewardMult ?? 1),
    gemRewardMult: Number(data.gemRewardMult ?? 1),
    forgeShardMult: Number(data.forgeShardMult ?? 1),
    enemyHpMult: Number(data.enemyHpMult ?? 1),
    enemyDmgMult: Number(data.enemyDmgMult ?? 1),
    chestEpicRateBonus: Number(data.chestEpicRateBonus ?? 0),
    pitySoftCapOffset: Number(data.pitySoftCapOffset ?? 0),
    weekendBlitzEnabled: Boolean(data.weekendBlitzEnabled ?? true),
    doubleDropEventActive: Boolean(data.doubleDropEventActive ?? false),
    announcementBanner: String(data.announcementBanner ?? ''),
    maintenanceNotice: String(data.maintenanceNotice ?? ''),
    balanceNote: String(data.balanceNote ?? ''),
    updatedByEmail: String(data.updatedByLabel ?? 'Admin LiveOps'),
    updatedAtMs: toMs(data.updatedAt),
  });
}

/**
 * Subscribes to the live global LiveOps configuration from Firestore (`liveops_config/global`),
 * seamlessly falling back to the Express `/api/liveops/config` endpoint or local cache on static hosts.
 */
export function subscribeLiveOpsConfig(
  onUpdate: (config: LiveOpsConfig, source: 'firestore' | 'server' | 'local') => void
): () => void {
  onUpdate(cachedConfig, 'local');

  let active = true;
  const docRef = doc(db, 'liveops_config', LIVEOPS_CONFIG_DOC_ID);

  // Also attempt a lightweight HTTP sync from Express backend if present (gracefully ignored on Vercel static)
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    void window
      .fetch('/api/liveops/config', { method: 'GET', headers: { Accept: 'application/json' } })
      .then(async (res) => {
        if (!active || !res.ok) return;
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) return;
        const json = (await res.json()) as { config?: Partial<LiveOpsConfig> };
        if (json?.config && active) {
          const sanitized = sanitizeLiveOpsConfig(json.config);
          if (sanitized.updatedAtMs >= cachedConfig.updatedAtMs) {
            persistLocalLiveOpsCache(sanitized);
            onUpdate(sanitized, 'server');
          }
        }
      })
      .catch(() => {
        // Static deployment or offline — Firestore/local cache remain authoritative
      });
  }

  const unsub = onSnapshot(
    docRef,
    (snap) => {
      if (!active || !snap.exists()) return;
      const mapped = mapFirestoreLiveOpsDoc(snap.data() as Record<string, unknown>);
      persistLocalLiveOpsCache(mapped);
      onUpdate(mapped, 'firestore');
    },
    () => {
      // Quiet fallback to local/server cache if offline or rules not yet provisioned
    }
  );

  return () => {
    active = false;
    unsub();
  };
}

export interface SaveLiveOpsResult {
  config: LiveOpsConfig;
  syncedTargets: Array<'firestore' | 'server' | 'local'>;
}

/**
 * Saves an updated LiveOps configuration. Strictly requires a verified admin account.
 */
export async function saveLiveOpsConfigAsAdmin(
  user: User | null,
  draft: Partial<LiveOpsConfig>,
  options?: { allowLinkedAssetAdmin?: boolean }
): Promise<SaveLiveOpsResult> {
  const isGoogleAdmin = isVerifiedAdminUser(user);
  if (!user || (!isGoogleAdmin && !options?.allowLinkedAssetAdmin)) {
    throw new Error('Chỉ tài khoản quản trị đã xác thực mới có quyền cập nhật LiveOps.');
  }

  const nowMs = Date.now();
  const nextVersion = Math.max(1, (cachedConfig.version || 1) + 1);
  const sanitized = sanitizeLiveOpsConfig({
    ...cachedConfig,
    ...draft,
    version: nextVersion,
    updatedByEmail: user.email ?? 'admin',
    updatedAtMs: nowMs,
  });

  const syncedTargets: Array<'firestore' | 'server' | 'local'> = [];
  const docPath = `liveops_config/${LIVEOPS_CONFIG_DOC_ID}`;
  const docRef = doc(db, 'liveops_config', LIVEOPS_CONFIG_DOC_ID);
  let firestoreError: unknown = null;

  try {
    const existing = await getDoc(docRef);
    const payload = {
      configId: LIVEOPS_CONFIG_DOC_ID,
      version: sanitized.version,
      goldRewardMult: sanitized.goldRewardMult,
      gemRewardMult: sanitized.gemRewardMult,
      forgeShardMult: sanitized.forgeShardMult,
      enemyHpMult: sanitized.enemyHpMult,
      enemyDmgMult: sanitized.enemyDmgMult,
      chestEpicRateBonus: sanitized.chestEpicRateBonus,
      pitySoftCapOffset: sanitized.pitySoftCapOffset,
      weekendBlitzEnabled: sanitized.weekendBlitzEnabled,
      doubleDropEventActive: sanitized.doubleDropEventActive,
      announcementBanner: sanitized.announcementBanner,
      maintenanceNotice: sanitized.maintenanceNotice,
      balanceNote: sanitized.balanceNote,
      updatedByUid: user.uid,
      updatedByLabel: isGoogleAdmin ? 'Admin LiveOps' : 'Asset Admin LiveOps',
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, payload, { merge: false });
    syncedTargets.push('firestore');
  } catch (error) {
    firestoreError = error;
    if (!options?.allowLinkedAssetAdmin) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  // Mirror to Express backend when running in full-stack environment
  try {
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      const idToken = await user.getIdToken();
      const res = await window.fetch('/api/liveops/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(sanitized),
      });
      if (res.ok) {
        syncedTargets.push('server');
      }
    }
  } catch {
    // Expected on static hosts (Vercel); Firestore remains synced
  }

  if (syncedTargets.length === 0 && firestoreError) {
    handleFirestoreError(firestoreError, OperationType.WRITE, docPath);
  }

  persistLocalLiveOpsCache(sanitized);
  syncedTargets.push('local');

  return { config: sanitized, syncedTargets };
}
