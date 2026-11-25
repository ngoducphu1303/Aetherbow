import type { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  buildRollbackLiveOpsConfig,
  DEFAULT_LIVEOPS_CONFIG,
  recordLiveOpsSnapshot,
  sanitizeLiveOpsConfig,
  sanitizeLiveOpsSnapshotHistory,
  type LiveOpsConfig,
  type LiveOpsSnapshotEntry,
} from '../data/liveOpsConfig';

const VERIFIED_ADMIN_EMAIL = 'ngoducphu1303@gmail.com';
const LIVEOPS_CACHE_KEY = 'aetherbow_liveops_config_v1';
const LIVEOPS_SNAPSHOT_HISTORY_KEY = 'aetherbow_liveops_snapshots_v1';

export type LiveOpsSource = 'firestore' | 'server' | 'local';

export function isVerifiedAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === VERIFIED_ADMIN_EMAIL && user.emailVerified === true;
}

export function readCachedLiveOpsConfig(): LiveOpsConfig {
  if (typeof window === 'undefined') return DEFAULT_LIVEOPS_CONFIG;
  try {
    const raw = window.localStorage.getItem(LIVEOPS_CACHE_KEY);
    if (!raw) return DEFAULT_LIVEOPS_CONFIG;
    return sanitizeLiveOpsConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_LIVEOPS_CONFIG;
  }
}

export function writeCachedLiveOpsConfig(cfg: LiveOpsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LIVEOPS_CACHE_KEY, JSON.stringify(sanitizeLiveOpsConfig(cfg)));
  } catch {
    // Ignore storage quota errors on locked/private tabs
  }
}

export function readLiveOpsSnapshotHistory(): LiveOpsSnapshotEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LIVEOPS_SNAPSHOT_HISTORY_KEY);
    if (!raw) return [];
    return sanitizeLiveOpsSnapshotHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistLiveOpsSnapshot(
  config: LiveOpsConfig,
  source: LiveOpsSource,
  label?: string
): LiveOpsSnapshotEntry[] {
  const prev = readLiveOpsSnapshotHistory();
  const next = recordLiveOpsSnapshot(prev, config, { source, label });
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LIVEOPS_SNAPSHOT_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

function fromFirestoreLiveOpsDoc(data: Record<string, unknown>): LiveOpsConfig {
  const updatedAtRaw = data.updatedAt;
  const updatedAtMs =
    updatedAtRaw instanceof Timestamp
      ? updatedAtRaw.toMillis()
      : typeof data.updatedAtMs === 'number'
      ? data.updatedAtMs
      : Date.now();
  return sanitizeLiveOpsConfig({
    ...data,
    updatedAtMs,
    updatedByEmail:
      typeof data.updatedByLabel === 'string' && data.updatedByLabel.trim()
        ? data.updatedByLabel
        : 'Admin LiveOps',
  });
}

export function subscribeLiveOpsConfig(
  onUpdate: (config: LiveOpsConfig, source: LiveOpsSource) => void
): () => void {
  let disposed = false;
  const cached = readCachedLiveOpsConfig();
  onUpdate(cached, 'local');

  // 1. Fetch Express server fallback config immediately
  if (typeof fetch === 'function') {
    fetch('/api/liveops/config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (disposed || !json?.config) return;
        const sanitized = sanitizeLiveOpsConfig(json.config);
        writeCachedLiveOpsConfig(sanitized);
        onUpdate(sanitized, 'server');
      })
      .catch(() => {});
  }

  // 2. Real-time Firestore listener on /liveops_config/global
  let unsubFirestore: (() => void) | null = null;
  try {
    const ref = doc(db, 'liveops_config', 'global');
    unsubFirestore = onSnapshot(
      ref,
      (snap) => {
        if (disposed || !snap.exists()) return;
        const cfg = fromFirestoreLiveOpsDoc(snap.data() as Record<string, unknown>);
        writeCachedLiveOpsConfig(cfg);
        onUpdate(cfg, 'firestore');
      },
      () => {
        // Silent fallback to server/local cache when offline or unconfigured
      }
    );
  } catch {
    // Firestore unavailable in isolated preview
  }

  return () => {
    disposed = true;
    unsubFirestore?.();
  };
}

/**
 * Publishes validated LiveOps config to Firestore (/liveops_config/global) and
 * Express fallback (/api/liveops/config), preserving 100% of existing firestore.rules
 * schema constraints and automatically recording a rollback snapshot.
 */
export async function publishLiveOpsConfig(
  user: User,
  draftConfig: Partial<LiveOpsConfig>,
  currentActive: LiveOpsConfig
): Promise<{
  config: LiveOpsConfig;
  source: LiveOpsSource;
  snapshots: LiveOpsSnapshotEntry[];
}> {
  const nextVersion = Math.max(
    currentActive.version + 1,
    Number(draftConfig.version ?? currentActive.version + 1)
  );
  const actorLabel =
    (user.displayName || user.email?.split('@')[0] || 'Admin LiveOps').trim().slice(0, 32) ||
    'Admin LiveOps';

  const sanitized = sanitizeLiveOpsConfig({
    ...currentActive,
    ...draftConfig,
    configId: 'global',
    version: nextVersion,
    updatedAtMs: Date.now(),
    updatedByEmail: actorLabel,
  });

  let publishedSource: LiveOpsSource = 'local';
  let firestoreSucceeded = false;
  let serverSucceeded = false;
  let lastError: unknown = null;

  // 1. Sync to Firestore matching Blueprint 5 exact field whitelist in firestore.rules
  try {
    const ref = doc(db, 'liveops_config', 'global');
    const existingSnap = await getDoc(ref).catch(() => null);
    const existingCreatedAt = existingSnap?.exists() ? existingSnap.data()?.createdAt : null;
    const payload = {
      configId: 'global',
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
      scheduledStartMs: sanitized.scheduledStartMs,
      scheduledEndMs: sanitized.scheduledEndMs,
      announcementBanner: sanitized.announcementBanner,
      maintenanceNotice: sanitized.maintenanceNotice,
      balanceNote: sanitized.balanceNote,
      updatedByUid: user.uid,
      updatedByLabel: actorLabel,
      createdAt: existingCreatedAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    firestoreSucceeded = true;
    publishedSource = 'firestore';
  } catch (err) {
    lastError = err;
  }

  // 2. Sync to Express server route with Firebase Bearer ID token
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/liveops/config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ config: sanitized }),
    });
    if (res.ok) {
      serverSucceeded = true;
      if (!firestoreSucceeded) publishedSource = 'server';
    } else {
      const body = await res.json().catch(() => null);
      if (!firestoreSucceeded) {
        lastError = new Error(body?.message || `HTTP ${res.status}`);
      }
    }
  } catch (err) {
    if (!firestoreSucceeded) lastError = err;
  }

  if (!firestoreSucceeded && !serverSucceeded) {
    throw lastError instanceof Error
      ? lastError
      : new Error('Không thể đồng bộ cấu hình LiveOps lên Firestore hoặc máy chủ.');
  }

  writeCachedLiveOpsConfig(sanitized);
  const snapshots = persistLiveOpsSnapshot(sanitized, publishedSource);
  return {
    config: sanitized,
    source: publishedSource,
    snapshots,
  };
}

/**
 * Phase 4 Pillar 5: 1-Click Rollback by publishing a verified historical snapshot
 * via the standard monotonic `version + 1` sync path (zero firestore.rules changes).
 */
export async function rollbackLiveOpsToSnapshot(
  user: User,
  currentActive: LiveOpsConfig,
  snapshot: LiveOpsSnapshotEntry
): Promise<{
  config: LiveOpsConfig;
  source: LiveOpsSource;
  snapshots: LiveOpsSnapshotEntry[];
}> {
  const actorLabel =
    (user.displayName || user.email?.split('@')[0] || 'Admin LiveOps').trim().slice(0, 32) ||
    'Admin LiveOps';
  const rollbackDraft = buildRollbackLiveOpsConfig(currentActive, snapshot, {
    actorLabel,
  });
  return publishLiveOpsConfig(user, rollbackDraft, currentActive);
}
