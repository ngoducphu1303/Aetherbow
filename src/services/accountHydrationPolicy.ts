import { SaveData } from '../types/game';

export interface AccountCloudSaveHeader {
  highestChapterCleared: number;
  saveData?: Pick<SaveData, 'gold' | 'gems' | 'career'>;
}

export type AccountHydrationAction =
  | 'fresh_initial'
  | 'upload_guest'
  | 'load_cloud'
  | 'prompt_conflict';

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
 * a previously logged-out account's local save into a brand-new account.
 */
export function resolveAccountHydrationAction(params: {
  cloudRecord: AccountCloudSaveHeader | null;
  localSave: SaveData;
  isNewRegistration?: boolean;
  preserveGuestSave?: boolean;
}): AccountHydrationAction {
  const { cloudRecord, localSave, isNewRegistration = false, preserveGuestSave = false } = params;

  if (!cloudRecord) {
    // Only preserve localSave when the user explicitly linked an active Guest session.
    // All brand-new registrations or first-time sign-ins from SplashGate MUST start fresh!
    return preserveGuestSave ? 'upload_guest' : 'fresh_initial';
  }

  // Existing cloud account: only ask Cloud vs Local conflict when actively linking a Guest session
  // that actually has meaningful local progress different from the cloud save.
  if (preserveGuestSave && !isNewRegistration && hasMeaningfulLocalProgress(localSave)) {
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
