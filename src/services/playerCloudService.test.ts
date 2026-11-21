import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData } from '../data/gearData';
import {
  AccountCloudSaveHeader,
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

function makeCloudRecord(saveData: SaveData): AccountCloudSaveHeader {
  return {
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

test('Explicit Guest Linking into a brand-new account preserves the active Guest save', () => {
  const guestSave = makeProgressedSave();
  const action = resolveAccountHydrationAction({
    cloudRecord: null,
    localSave: guestSave,
    isNewRegistration: true,
    preserveGuestSave: true,
  });
  assert.equal(action, 'upload_guest');
});

test('Explicit Guest Linking into an EXISTING cloud account with different progress prompts conflict resolution', () => {
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

test('Logging into an existing cloud account from SplashGate loads cloud data directly without stale local conflict', () => {
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
