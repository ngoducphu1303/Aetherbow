import { SaveData } from '../types/game';

export const ACCOUNT_RESET_EPOCH = 1;
export const CURRENT_RESET_SAVE_VERSION = 3;

export interface AccountCloudSaveHeader {
  saveVersion?: number;
  highestChapterCleared: number;
  saveData?: Pick<SaveData, 'gold' | 'gems' | 'career' | 'accountResetEpoch'>;
}

export type AccountHydrationAction =
  | 'fresh_initial'
  | 'upload_guest'
  | 'load_cloud'
  | 'prompt_conflict';

export function isSaveBeforeResetEpoch(
  save: Pick<SaveData, 'accountResetEpoch'> | null | undefined
): boolean {
  return (save?.accountResetEpoch ?? 0) < ACCOUNT_RESET_EPOCH;
}

export function isCloudRecordBeforeResetEpoch(
  cloudRecord: AccountCloudSaveHeader | null | undefined
): boolean {
  if (!cloudRecord) return false;
  const versionTooOld =
    typeof cloudRecord.saveVersion === 'number' &&
    cloudRecord.saveVersion < CURRENT_RESET_SAVE_VERSION;
  const epochTooOld = (cloudRecord.saveData?.accountResetEpoch ?? 0) < ACCOUNT_RESET_EPOCH;
  return versionTooOld || epochTooOld;
}

/**
 * Determines whether local guest save data has meaningful progress worth offering a
 * Cloud vs. Local conflict resolution choice when linking into an existing cloud account.
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

/**
 * Pure decision table for hydrating a signed-in Firebase account without leaking
 * a previously logged-out account's local save into a brand-new account, while
 * enforcing global account reset epochs on legacy/pre-reset saves.
 */
export function resolveAccountHydrationAction(params: {
  cloudRecord: AccountCloudSaveHeader | null;
  localSave: SaveData;
  isNewRegistration?: boolean;
  preserveGuestSave?: boolean;
}): AccountHydrationAction {
  const { cloudRecord, localSave, isNewRegistration = false, preserveGuestSave = false } = params;

  if (!cloudRecord || isCloudRecordBeforeResetEpoch(cloudRecord)) {
    // Only preserve localSave when the user explicitly linked an active post-reset Guest session.
    // All legacy/pre-reset cloud saves, brand-new registrations, or first-time sign-ins from SplashGate MUST start fresh!
    if (preserveGuestSave && !isSaveBeforeResetEpoch(localSave)) {
      return 'upload_guest';
    }
    return 'fresh_initial';
  }

  // Existing post-reset cloud account: only ask Cloud vs Local conflict when actively linking a Guest session
  // that actually has meaningful post-reset local progress different from the cloud save.
  if (
    preserveGuestSave &&
    !isNewRegistration &&
    !isSaveBeforeResetEpoch(localSave) &&
    hasMeaningfulLocalProgress(localSave)
  ) {
    const cloudIsDifferent =
      cloudRecord.highestChapterCleared !== localSave.highestChapterCleared ||
      (cloudRecord.saveData?.gold ?? 0) !== localSave.gold ||
      (cloudRecord.saveData?.gems ?? 0) !== localSave.gems ||
      (cloudRecord.saveData?.career?.totalRuns ?? 0) !== (localSave.career?.totalRuns ?? 0);
    if (cloudIsDifferent) {
      return 'prompt_conflict';
    }
  }

  return 'load_cloud';
}
