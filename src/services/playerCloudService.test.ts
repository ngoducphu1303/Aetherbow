import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData } from '../data/gearData';
import {
  ACCOUNT_RESET_EPOCH,
  AccountCloudSaveHeader,
  CURRENT_RESET_SAVE_VERSION,
  isCloudRecordBeforeResetEpoch,
  isSaveBeforeResetEpoch,
  resolveAccountHydrationAction,
} from './accountHydrationPolicy';
import { SaveData } from '../types/game';

function makeProgressedSave(): SaveData {
  const base = createInitialSaveData();
  return {
    ...base,
    gold: 25000,
    gems: 850,
    highestChapterCleared: 5,
    bestTowerFloor: 18,
    career: {
      totalKills: 640,
      totalBossesKilled: 18,
      totalRuns: 22,
      maxComboEver: 85,
      totalChestsOpened: 14,
      seenEnemies: [],
      seenSkills: [],
    },
  };
}

function makeCloudRecord(saveData: SaveData, saveVersion = CURRENT_RESET_SAVE_VERSION): AccountCloudSaveHeader {
  return {
    saveVersion,
    highestChapterCleared: saveData.highestChapterCleared,
    saveData,
  };
}

test('New Account Registration from SplashGate ALWAYS starts with fresh initial data even when stale local save exists', () => {
  const staleOldAccountSave = makeProgressedSave();
  const action = resolveAccountHydrationAction({
    cloudRecord: null,
    localSave: staleOldAccountSave,
    isNewRegistration: true,
    preserveGuestSave: false,
  });
  assert.equal(action, 'fresh_initial');
});

test('Brand-new Google Sign-In from SplashGate starts with fresh initial data instead of cloning stale local save', () => {
  const staleOldAccountSave = makeProgressedSave();
  const action = resolveAccountHydrationAction({
    cloudRecord: null,
    localSave: staleOldAccountSave,
    isNewRegistration: false,
    preserveGuestSave: false,
  });
  assert.equal(action, 'fresh_initial');
});

test('Explicit Guest Linking into a brand-new account preserves the active post-reset Guest save', () => {
  const guestSave = makeProgressedSave();
  const action = resolveAccountHydrationAction({
    cloudRecord: null,
    localSave: guestSave,
    isNewRegistration: true,
    preserveGuestSave: true,
  });
  assert.equal(action, 'upload_guest');
});

test('Explicit Guest Linking into an EXISTING post-reset cloud account with different progress prompts conflict resolution', () => {
  const guestSave = makeProgressedSave();
  const existingCloud = makeCloudRecord({
    ...createInitialSaveData(),
    gold: 5000,
    highestChapterCleared: 2,
  });
  const action = resolveAccountHydrationAction({
    cloudRecord: existingCloud,
    localSave: guestSave,
    isNewRegistration: false,
    preserveGuestSave: true,
  });
  assert.equal(action, 'prompt_conflict');
});

test('Logging into an existing post-reset cloud account from SplashGate loads cloud data directly without stale local conflict', () => {
  const staleOtherAccountSave = makeProgressedSave();
  const existingCloud = makeCloudRecord({
    ...createInitialSaveData(),
    gold: 1200,
    highestChapterCleared: 1,
  });
  const action = resolveAccountHydrationAction({
    cloudRecord: existingCloud,
    localSave: staleOtherAccountSave,
    isNewRegistration: false,
    preserveGuestSave: false,
  });
  assert.equal(action, 'load_cloud');
});

test('Legacy pre-reset cloud account (old saveVersion or missing accountResetEpoch) resets to fresh_initial on login', () => {
  const legacySave: SaveData = {
    ...makeProgressedSave(),
    accountResetEpoch: undefined,
  };
  const legacyCloud = makeCloudRecord(legacySave, 2);
  assert.equal(isSaveBeforeResetEpoch(legacySave), true);
  assert.equal(isCloudRecordBeforeResetEpoch(legacyCloud), true);

  const action = resolveAccountHydrationAction({
    cloudRecord: legacyCloud,
    localSave: createInitialSaveData(),
    isNewRegistration: false,
    preserveGuestSave: false,
  });
  assert.equal(action, 'fresh_initial');
});

test('Pre-reset local guest save cannot override a legacy cloud account when linking', () => {
  const legacyGuest: SaveData = {
    ...makeProgressedSave(),
    accountResetEpoch: 0,
  };
  const legacyCloud = makeCloudRecord(legacyGuest, 2);
  const action = resolveAccountHydrationAction({
    cloudRecord: legacyCloud,
    localSave: legacyGuest,
    isNewRegistration: false,
    preserveGuestSave: true,
  });
  assert.equal(action, 'fresh_initial');
});

test('Post-reset initial save carries current ACCOUNT_RESET_EPOCH', () => {
  const fresh = createInitialSaveData();
  assert.equal(fresh.accountResetEpoch, ACCOUNT_RESET_EPOCH);
  assert.equal(isSaveBeforeResetEpoch(fresh), false);
});
