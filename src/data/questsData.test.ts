import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_QUESTS,
  countClaimableDailyQuests,
  countClaimableWelfare,
  getDefaultWelfareTab,
} from './questsData';

const TODAY = '2026-11-23';
const YESTERDAY = '2026-11-22';

test('countClaimableDailyQuests returns 0 for missing or incomplete progress', () => {
  assert.equal(countClaimableDailyQuests(undefined, TODAY), 0);
  assert.equal(
    countClaimableDailyQuests(
      {
        date: TODAY,
        kills: 19,
        stages: 4,
        upgrades: 0,
        chests: 0,
        claimedIds: [],
      },
      TODAY
    ),
    0
  );
});

test('countClaimableDailyQuests triggers accurately as daily tasks reach targets and clears when claimed', () => {
  const oneReady = {
    date: TODAY,
    kills: 5,
    stages: 2,
    upgrades: 1,
    chests: 0,
    claimedIds: [],
  };
  assert.equal(countClaimableDailyQuests(oneReady, TODAY), 1);

  const allReady = {
    date: TODAY,
    kills: 20,
    stages: 5,
    upgrades: 1,
    chests: 1,
    claimedIds: [],
  };
  assert.equal(countClaimableDailyQuests(allReady, TODAY), DAILY_QUESTS.length);

  const partiallyClaimed = {
    ...allReady,
    claimedIds: ['dq_upgrade_1', 'dq_chest_1'],
  };
  assert.equal(countClaimableDailyQuests(partiallyClaimed, TODAY), 2);

  const allClaimed = {
    ...allReady,
    claimedIds: DAILY_QUESTS.map((q) => q.id),
  };
  assert.equal(countClaimableDailyQuests(allClaimed, TODAY), 0);
});

test('countClaimableDailyQuests resets to 0 on daily date rollover', () => {
  const staleProgress = {
    date: YESTERDAY,
    kills: 99,
    stages: 20,
    upgrades: 5,
    chests: 3,
    claimedIds: [],
  };
  assert.equal(countClaimableDailyQuests(staleProgress, TODAY), 0);
});

test('countClaimableWelfare stays aligned with countClaimableDailyQuests', () => {
  const save = {
    welcomeGiftClaimed: true,
    checkIn: { count: 1, lastDate: TODAY },
    dailyQuests: {
      date: TODAY,
      kills: 20,
      stages: 0,
      upgrades: 1,
      chests: 0,
      claimedIds: [],
    },
  };
  assert.equal(countClaimableDailyQuests(save.dailyQuests, TODAY), 2);
  assert.equal(countClaimableWelfare(save, TODAY), 2);
});

test('getDefaultWelfareTab routes to quests when daily tasks are ready after welcome and check-in', () => {
  assert.equal(
    getDefaultWelfareTab({ welcomeGiftClaimed: false }, TODAY),
    'welcome'
  );
  assert.equal(
    getDefaultWelfareTab(
      { welcomeGiftClaimed: true, checkIn: { count: 1, lastDate: YESTERDAY } },
      TODAY
    ),
    'checkin'
  );
  assert.equal(
    getDefaultWelfareTab(
      {
        welcomeGiftClaimed: true,
        checkIn: { count: 1, lastDate: TODAY },
        dailyQuests: {
          date: TODAY,
          kills: 0,
          stages: 0,
          upgrades: 1,
          chests: 0,
          claimedIds: [],
        },
      },
      TODAY
    ),
    'quests'
  );
  assert.equal(
    getDefaultWelfareTab(
      {
        welcomeGiftClaimed: true,
        checkIn: { count: 1, lastDate: TODAY },
        dailyQuests: {
          date: TODAY,
          kills: 0,
          stages: 0,
          upgrades: 0,
          chests: 0,
          claimedIds: [],
        },
      },
      TODAY
    ),
    'checkin'
  );
});
