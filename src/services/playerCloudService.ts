import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { AvatarFrameId, HeroId, SaveData } from '../types/game';

export const PLAYER_DOMAIN_SUFFIX = '@artemis3d.player';
export const SAVE_SCHEMA_VERSION = 2;

export type CloudSyncStatus = 'guest' | 'loading' | 'pending' | 'syncing' | 'synced' | 'error';

export interface PlayerCloudSummary {
  heroId: HeroId;
  heroName: string;
  title: string;
  equippedAvatarFrameId: AvatarFrameId;
  powerRating: number;
  highestChapterCleared: number;
  bestTowerFloor: number;
  arenaRating: number;
  worldBossBestDamage: number;
  vipLevel: number;
}

export interface CloudPlayerRecord {
  uid: string;
  displayName: string;
  username: string;
  authProvider: 'password' | 'google';
  saveVersion: number;
  powerRating: number;
  highestChapterCleared: number;
  saveData: SaveData;
  updatedAtMs: number;
}

export interface CloudLeaderboardRow {
  uid: string;
  displayName: string;
  heroId: HeroId;
  heroName: string;
  title: string;
  equippedAvatarFrameId: AvatarFrameId;
  powerRating: number;
  highestChapterCleared: number;
  bestTowerFloor: number;
  arenaRating: number;
  worldBossBestDamage: number;
  vipLevel: number;
  updatedAtMs: number;
}

export interface SaveConflictSnapshot {
  user: User;
  cloudRecord: CloudPlayerRecord;
  localSave: SaveData;
  localPower: number;
}

// Track known existing Firestore docs per UID so subsequent writes use updateDoc cleanly
const existingPlayerDocs = new Set<string>();
const existingLeaderboardDocs = new Set<string>();

export function getFirebaseAuthConsoleUrl(): string {
  return `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`;
}

export function getFirestoreUpgradeUrl(): string {
  return `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
}

export function normalizeAccountEmail(rawInput: string): { email: string; username: string } {
  const trimmed = rawInput.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Vui lòng nhập tên tài khoản hoặc email.');
  }
  if (trimmed.includes('@')) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }
    const handle = trimmed.split('@')[0].slice(0, 24);
    return { email: trimmed, username: trimmed.slice(0, 64) || handle };
  }
  if (!/^[a-z0-9._-]{3,24}$/.test(trimmed)) {
    throw new Error(
      'Tên tài khoản dài 3–24 ký tự, chỉ dùng chữ không dấu, số và dấu (., _, -).'
    );
  }
  return {
    email: `${trimmed}${PLAYER_DOMAIN_SUFFIX}`,
    username: trimmed,
  };
}

export function formatAccountHandle(email: string | null | undefined): string {
  if (!email) return 'Chiến Binh Tinh Giới';
  if (email.endsWith(PLAYER_DOMAIN_SUFFIX)) {
    return `@${email.slice(0, -PLAYER_DOMAIN_SUFFIX.length)}`;
  }
  return email;
}

export function sanitizeDisplayName(raw: string, fallback = 'Chiến Binh'): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (cleaned.length >= 2) return cleaned;
  return fallback.slice(0, 24);
}

export function detectAuthProvider(user: User): 'password' | 'google' {
  const hasGoogle = user.providerData?.some((p) => p.providerId === 'google.com');
  return hasGoogle ? 'google' : 'password';
}

export function isPasswordAccount(user: User | null): boolean {
  if (!user) return false;
  return user.providerData?.some((p) => p.providerId === 'password') ?? false;
}

export function mapAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Tài khoản hoặc mật khẩu không chính xác.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Tên tài khoản hoặc email này đã tồn tại. Vui lòng chọn tên khác hoặc chuyển sang Đăng nhập.';
  }
  if (code === 'auth/weak-password') {
    return 'Mật khẩu quá yếu. Vui lòng dùng ít nhất 6 ký tự.';
  }
  if (code === 'auth/invalid-email') {
    return 'Tên tài khoản hoặc email không hợp lệ.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lát rồi thử lại.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép popup rồi thử lại.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phương thức Tài khoản & Mật khẩu chưa được bật trong Firebase Console (Authentication → Sign-in method → Email/Password). Bạn có thể bật công tắc đó hoặc dùng Đăng nhập Google ngay lập tức.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'Phiên đăng nhập đã cũ. Vui lòng đăng nhập lại trước khi đổi mật khẩu.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Không thể kết nối máy chủ Firebase. Vui lòng kiểm tra kết nối mạng.';
  }
  if (msg.includes('Quota exceeded')) {
    return 'Hạn mức đọc/ghi miễn phí hôm nay của cơ sở dữ liệu đã đạt giới hạn và sẽ làm mới vào ngày mai.';
  }
  return msg || 'Đã xảy ra lỗi xác thực. Vui lòng thử lại.';
}

/**
 * Recursively converts any JS object into a Firestore-safe native Map/Array value
 * (strips undefined, functions, and non-finite numbers without JSON.stringify storage).
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return null as T;
  }
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as T;
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && typeof item !== 'function')
      .map((item) => sanitizeForFirestore(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined || typeof val === 'function') continue;
      out[key] = sanitizeForFirestore(val);
    }
    return out as T;
  }
  return null as T;
}

function clampInt(n: number, min: number, max: number): number {
  const safe = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, safe));
}

function clampNum(n: number, min: number, max: number): number {
  const safe = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, safe));
}

function safeIdToken(raw: string, fallback: string, maxLen: number): string {
  const cleaned = (raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
  return cleaned.length >= 1 ? cleaned : fallback;
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis?: unknown }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return Date.now();
}

export async function registerWithPassword(
  accountInput: string,
  password: string,
  displayNameInput: string
): Promise<User> {
  const { email, username } = normalizeAccountEmail(accountInput);
  if (password.length < 6) {
    throw new Error('Mật khẩu cần có ít nhất 6 ký tự.');
  }
  const cleanName = sanitizeDisplayName(displayNameInput, username);
  if (cleanName.length < 2 || cleanName.length > 24) {
    throw new Error('Tên hiển thị cần từ 2 đến 24 ký tự.');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: cleanName });
  return cred.user;
}

export async function loginWithPassword(
  accountInput: string,
  password: string
): Promise<User> {
  const { email } = normalizeAccountEmail(accountInput);
  if (!password) {
    throw new Error('Vui lòng nhập mật khẩu.');
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function logoutPlayer(): Promise<void> {
  await signOut(auth);
}

export async function fetchPlayerCloudDoc(uid: string): Promise<CloudPlayerRecord | null> {
  const path = `players/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    if (!snap.exists()) {
      existingPlayerDocs.delete(uid);
      return null;
    }
    existingPlayerDocs.add(uid);
    const data = snap.data();
    return {
      uid: String(data.uid ?? uid),
      displayName: sanitizeDisplayName(String(data.displayName ?? ''), 'Chiến Binh'),
      username: String(data.username ?? ''),
      authProvider: data.authProvider === 'google' ? 'google' : 'password',
      saveVersion: Number(data.saveVersion ?? SAVE_SCHEMA_VERSION),
      powerRating: Number(data.powerRating ?? 0),
      highestChapterCleared: Number(data.highestChapterCleared ?? 0),
      saveData: data.saveData as SaveData,
      updatedAtMs: toTimestampMs(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function savePlayerCloudState(
  user: User,
  displayNameRaw: string,
  save: SaveData,
  summary: PlayerCloudSummary
): Promise<number> {
  const uid = user.uid;
  const displayName = sanitizeDisplayName(
    displayNameRaw || user.displayName || formatAccountHandle(user.email),
    'Chiến Binh'
  );
  const username = formatAccountHandle(user.email).slice(0, 64);
  const authProvider = detectAuthProvider(user);
  const sanitizedSave = sanitizeForFirestore(save);
  const powerRating = clampNum(Math.round(summary.powerRating), 0, 1000000000);
  const highestChapterCleared = clampInt(summary.highestChapterCleared, 0, 100);
  const bestTowerFloor = clampInt(summary.bestTowerFloor, 0, 10000);
  const arenaRating = clampNum(Math.round(summary.arenaRating), 0, 1000000);
  const worldBossBestDamage = clampNum(Math.round(summary.worldBossBestDamage), 0, 10000000000);
  const vipLevel = clampInt(summary.vipLevel, 0, 30);
  const heroId = safeIdToken(summary.heroId, 'artemis', 32);
  const heroName = (summary.heroName || 'Artemis').trim().slice(0, 32) || 'Artemis';
  const title = (summary.title || 'Tân Binh Tinh Giới').trim().slice(0, 48) || 'Tân Binh Tinh Giới';
  const equippedAvatarFrameId = safeIdToken(summary.equippedAvatarFrameId, 'default_gold', 48);

  const playerPath = `players/${uid}`;
  const playerRef = doc(db, 'players', uid);

  // Ensure we know whether player doc exists so rules match create vs update strictly
  if (!existingPlayerDocs.has(uid)) {
    try {
      const snap = await getDoc(playerRef);
      if (snap.exists()) existingPlayerDocs.add(uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, playerPath);
    }
  }

  try {
    if (existingPlayerDocs.has(uid)) {
      await updateDoc(playerRef, {
        displayName,
        username,
        authProvider,
        saveVersion: SAVE_SCHEMA_VERSION,
        powerRating,
        highestChapterCleared,
        saveData: sanitizedSave,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(playerRef, {
        uid,
        displayName,
        username,
        authProvider,
        saveVersion: SAVE_SCHEMA_VERSION,
        powerRating,
        highestChapterCleared,
        saveData: sanitizedSave,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      existingPlayerDocs.add(uid);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingPlayerDocs.has(uid) ? OperationType.UPDATE : OperationType.CREATE,
      playerPath
    );
  }

  const lbPath = `leaderboard/${uid}`;
  const lbRef = doc(db, 'leaderboard', uid);

  if (!existingLeaderboardDocs.has(uid)) {
    try {
      const snap = await getDoc(lbRef);
      if (snap.exists()) existingLeaderboardDocs.add(uid);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, lbPath);
    }
  }

  try {
    if (existingLeaderboardDocs.has(uid)) {
      await updateDoc(lbRef, {
        displayName,
        heroId,
        heroName,
        title,
        equippedAvatarFrameId,
        powerRating,
        highestChapterCleared,
        bestTowerFloor,
        arenaRating,
        worldBossBestDamage,
        vipLevel,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(lbRef, {
        uid,
        displayName,
        heroId,
        heroName,
        title,
        equippedAvatarFrameId,
        powerRating,
        highestChapterCleared,
        bestTowerFloor,
        arenaRating,
        worldBossBestDamage,
        vipLevel,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      existingLeaderboardDocs.add(uid);
    }
  } catch (error) {
    handleFirestoreError(
      error,
      existingLeaderboardDocs.has(uid) ? OperationType.UPDATE : OperationType.CREATE,
      lbPath
    );
  }

  return Date.now();
}

export async function updatePlayerDisplayName(
  user: User,
  newDisplayNameRaw: string
): Promise<string> {
  const cleanName = newDisplayNameRaw.trim().replace(/\s+/g, ' ');
  if (cleanName.length < 2 || cleanName.length > 24) {
    throw new Error('Tên hiển thị phải từ 2 đến 24 ký tự.');
  }
  await updateProfile(user, { displayName: cleanName });

  const uid = user.uid;
  const playerPath = `players/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    if (snap.exists()) {
      existingPlayerDocs.add(uid);
      await updateDoc(doc(db, 'players', uid), {
        displayName: cleanName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, playerPath);
  }

  const lbPath = `leaderboard/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'leaderboard', uid));
    if (snap.exists()) {
      existingLeaderboardDocs.add(uid);
      await updateDoc(doc(db, 'leaderboard', uid), {
        displayName: cleanName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, lbPath);
  }

  return cleanName;
}

export async function updatePlayerPassword(
  user: User,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!user.email) {
    throw new Error('Tài khoản này không hỗ trợ đổi mật khẩu trực tiếp.');
  }
  if (!currentPassword) {
    throw new Error('Vui lòng nhập mật khẩu hiện tại.');
  }
  if (newPassword.length < 6) {
    throw new Error('Mật khẩu mới cần tối thiểu 6 ký tự.');
  }
  if (newPassword === currentPassword) {
    throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại.');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function fetchRealLeaderboard(maxEntries = 60): Promise<CloudLeaderboardRow[]> {
  const path = 'leaderboard';
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('isPublic', '==', true),
      limit(maxEntries)
    );
    const snap = await getDocs(q);
    const rows: CloudLeaderboardRow[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      rows.push({
        uid: String(data.uid ?? docSnap.id),
        displayName: String(data.displayName ?? 'Chiến Binh'),
        heroId: (data.heroId as HeroId) || 'artemis',
        heroName: String(data.heroName ?? 'Artemis'),
        title: String(data.title ?? 'Tân Binh Tinh Giới'),
        equippedAvatarFrameId: (data.equippedAvatarFrameId as AvatarFrameId) || 'default_gold',
        powerRating: Number(data.powerRating ?? 0),
        highestChapterCleared: Number(data.highestChapterCleared ?? 0),
        bestTowerFloor: Number(data.bestTowerFloor ?? 0),
        arenaRating: Number(data.arenaRating ?? 0),
        worldBossBestDamage: Number(data.worldBossBestDamage ?? 0),
        vipLevel: Number(data.vipLevel ?? 0),
        updatedAtMs: toTimestampMs(data.updatedAt),
      });
    });
    return rows;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Real-time Firestore leaderboard subscription (Pillar 4 Competitive LiveOps).
 * Strictly queries with `where('isPublic', '==', true)` + bounded `limit` and cleans up on unmount.
 */
export function subscribeRealLeaderboard(
  onData: (rows: CloudLeaderboardRow[]) => void,
  onError?: (err: Error) => void,
  maxEntries = 50
): () => void {
  const path = 'leaderboard';
  const q = query(
    collection(db, 'leaderboard'),
    where('isPublic', '==', true),
    limit(Math.max(10, Math.min(60, maxEntries)))
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows: CloudLeaderboardRow[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        rows.push({
          uid: String(data.uid ?? docSnap.id),
          displayName: String(data.displayName ?? 'Chiến Binh'),
          heroId: (data.heroId as HeroId) || 'artemis',
          heroName: String(data.heroName ?? 'Artemis'),
          title: String(data.title ?? 'Tân Binh Tinh Giới'),
          equippedAvatarFrameId: (data.equippedAvatarFrameId as AvatarFrameId) || 'default_gold',
          powerRating: Number(data.powerRating ?? 0),
          highestChapterCleared: Number(data.highestChapterCleared ?? 0),
          bestTowerFloor: Number(data.bestTowerFloor ?? 0),
          arenaRating: Number(data.arenaRating ?? 0),
          worldBossBestDamage: Number(data.worldBossBestDamage ?? 0),
          vipLevel: Number(data.vipLevel ?? 0),
          updatedAtMs: toTimestampMs(data.updatedAt),
        });
      });
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CloudBossRaceEntry {
  uid: string;
  weekId: string;
  displayName: string;
  heroId: HeroId;
  bestScore: number;
  bestDamage: number;
  bestClearTimeMs: number;
  perfectDodges: number;
  autoPilotUsed: boolean;
  updatedAtMs: number;
}

export async function syncBossRaceEntryToFirestore(params: {
  user: User;
  weekId: string;
  displayName: string;
  heroId: HeroId;
  score: number;
  damage: number;
  clearTimeMs: number;
  perfectDodges: number;
  autoPilotUsed: boolean;
}): Promise<void> {
  const uid = params.user.uid;
  const weekId = safeIdToken(params.weekId, '2026-W01', 24);
  const entryId = `${weekId}_${uid}`;
  const path = `boss_race_entries/${entryId}`;
  const ref = doc(db, 'boss_race_entries', entryId);

  const displayName = sanitizeDisplayName(params.displayName, 'Chiến Binh');
  const heroId = safeIdToken(params.heroId, 'artemis', 32);
  const bestScore = clampNum(Math.round(params.score), 0, 100000000);
  const bestDamage = clampNum(Math.round(params.damage), 0, 10000000000);
  const bestClearTimeMs = clampInt(params.clearTimeMs, 0, 600000);
  const perfectDodges = clampInt(params.perfectDodges, 0, 500);
  const autoPilotUsed = Boolean(params.autoPilotUsed);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const prev = snap.data();
      const prevBest = Number(prev.bestScore ?? 0);
      const nextBestScore = Math.max(prevBest, bestScore);
      const nextBestDamage = Math.max(Number(prev.bestDamage ?? 0), bestDamage);
      const prevTime = Number(prev.bestClearTimeMs ?? 0);
      const nextBestTime =
        bestClearTimeMs > 0 && (prevTime === 0 || bestClearTimeMs < prevTime)
          ? bestClearTimeMs
          : prevTime;
      await updateDoc(ref, {
        displayName,
        heroId,
        bestScore: nextBestScore,
        bestDamage: nextBestDamage,
        bestClearTimeMs: nextBestTime,
        perfectDodges: Math.max(Number(prev.perfectDodges ?? 0), perfectDodges),
        autoPilotUsed,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        weekId,
        displayName,
        heroId,
        bestScore,
        bestDamage,
        bestClearTimeMs,
        perfectDodges,
        autoPilotUsed,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeWeeklyBossRace(
  weekIdRaw: string,
  onData: (rows: CloudBossRaceEntry[]) => void,
  onError?: (err: Error) => void,
  maxEntries = 40
): () => void {
  const weekId = safeIdToken(weekIdRaw, '2026-W01', 24);
  const path = 'boss_race_entries';
  const q = query(
    collection(db, 'boss_race_entries'),
    where('isPublic', '==', true),
    where('weekId', '==', weekId),
    limit(Math.max(10, Math.min(50, maxEntries)))
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows: CloudBossRaceEntry[] = [];
      snap.forEach((d) => {
        const data = d.data();
        rows.push({
          uid: String(data.uid ?? ''),
          weekId: String(data.weekId ?? weekId),
          displayName: String(data.displayName ?? 'Chiến Binh'),
          heroId: (data.heroId as HeroId) || 'artemis',
          bestScore: Number(data.bestScore ?? 0),
          bestDamage: Number(data.bestDamage ?? 0),
          bestClearTimeMs: Number(data.bestClearTimeMs ?? 0),
          perfectDodges: Number(data.perfectDodges ?? 0),
          autoPilotUsed: Boolean(data.autoPilotUsed),
          updatedAtMs: toTimestampMs(data.updatedAt),
        });
      });
      rows.sort((a, b) => b.bestScore - a.bestScore);
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CloudSeasonStandingRow {
  uid: string;
  seasonId: string;
  displayName: string;
  heroId: HeroId;
  seasonPoints: number;
  weeksParticipated: number;
  equalizedArenaWins: number;
  rankTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'astral_emperor';
  claimedMilestones: string[];
  updatedAtMs: number;
}

export async function syncSeasonStandingToFirestore(params: {
  user: User;
  seasonId: string;
  displayName: string;
  heroId: HeroId;
  seasonPoints: number;
  weeksParticipated: number;
  equalizedArenaWins: number;
  rankTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'astral_emperor';
  claimedMilestones?: string[];
}): Promise<void> {
  const uid = params.user.uid;
  const seasonId = safeIdToken(params.seasonId, 'S01', 24);
  const standingId = `${seasonId}_${uid}`;
  const path = `season_standings/${standingId}`;
  const ref = doc(db, 'season_standings', standingId);

  const displayName = sanitizeDisplayName(params.displayName, 'Chiến Binh');
  const heroId = safeIdToken(params.heroId, 'artemis', 32);
  const seasonPoints = clampInt(params.seasonPoints, 0, 1000000);
  const weeksParticipated = clampInt(params.weeksParticipated, 0, 12);
  const equalizedArenaWins = clampInt(params.equalizedArenaWins, 0, 10000);
  const safeMilestones = (params.claimedMilestones ?? [])
    .filter((m): m is string => typeof m === 'string' && m.length > 0)
    .slice(0, 20);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const prev = snap.data();
      const nextPoints = Math.max(Number(prev.seasonPoints ?? 0), seasonPoints);
      const nextWeeks = Math.max(Number(prev.weeksParticipated ?? 0), weeksParticipated);
      const nextEqWins = Math.max(Number(prev.equalizedArenaWins ?? 0), equalizedArenaWins);
      const prevMilestones = Array.isArray(prev.claimedMilestones)
        ? prev.claimedMilestones.filter((m): m is string => typeof m === 'string' && m.length > 0)
        : [];
      const mergedMilestones = Array.from(new Set([...prevMilestones, ...safeMilestones])).slice(0, 20);
      await updateDoc(ref, {
        displayName,
        heroId,
        seasonPoints: nextPoints,
        weeksParticipated: nextWeeks,
        equalizedArenaWins: nextEqWins,
        rankTier: params.rankTier,
        claimedMilestones: mergedMilestones,
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid,
        seasonId,
        displayName,
        heroId,
        seasonPoints,
        weeksParticipated,
        equalizedArenaWins,
        rankTier: params.rankTier,
        claimedMilestones: safeMilestones,
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeSeasonStandings(
  seasonIdRaw: string,
  onData: (rows: CloudSeasonStandingRow[]) => void,
  onError?: (err: Error) => void,
  maxEntries = 40
): () => void {
  const seasonId = safeIdToken(seasonIdRaw, 'S01', 24);
  const path = 'season_standings';
  const q = query(
    collection(db, 'season_standings'),
    where('isPublic', '==', true),
    where('seasonId', '==', seasonId),
    limit(Math.max(10, Math.min(50, maxEntries)))
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows: CloudSeasonStandingRow[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const tier = String(data.rankTier ?? 'bronze');
        rows.push({
          uid: String(data.uid ?? ''),
          seasonId: String(data.seasonId ?? seasonId),
          displayName: String(data.displayName ?? 'Chiến Binh'),
          heroId: (data.heroId as HeroId) || 'artemis',
          seasonPoints: Number(data.seasonPoints ?? 0),
          weeksParticipated: Number(data.weeksParticipated ?? 0),
          equalizedArenaWins: Number(data.equalizedArenaWins ?? 0),
          rankTier:
            tier === 'silver' ||
            tier === 'gold' ||
            tier === 'platinum' ||
            tier === 'astral_emperor'
              ? tier
              : 'bronze',
          claimedMilestones: Array.isArray(data.claimedMilestones)
            ? data.claimedMilestones.map(String)
            : [],
          updatedAtMs: toTimestampMs(data.updatedAt),
        });
      });
      rows.sort((a, b) => b.seasonPoints - a.seasonPoints);
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

/**
 * Determines whether local guest save data has meaningful progress worth offering a
 * Cloud vs. Local conflict resolution choice when logging into an existing cloud account.
 */
export function hasMeaningfulLocalProgress(save: SaveData): boolean {
  const kills = save.career?.totalKills ?? 0;
  const runs = save.career?.totalRuns ?? 0;
  return (
    save.highestChapterCleared > 0 ||
    (save.bestTowerFloor ?? 0) > 0 ||
    kills >= 5 ||
    runs >= 1 ||
    save.unlockedHeroes.length > 1 ||
    save.inventory.length > 6 ||
    save.gold >= 1800
  );
}
