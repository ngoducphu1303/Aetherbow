import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CHAPTERS } from '../data/chaptersData';
import { EnemyKind } from '../types/game';
import {
  instantiateAutoRigModel,
  prepareAutoRigTemplate,
  updateAutoRigPose,
} from './aaaAutoRigSystem';
import {
  planAaaMobSkill,
  resolveChapterMobSkillTheme,
} from './aaaEnemyCombatEngine';
import {
  CHAPTER1_ROSTER_ASSET_IDS,
  CHAPTER2_ROSTER_ASSET_IDS,
  CHAPTER3_ROSTER_ASSET_IDS,
  resolveCampaignRosterAssetId,
  resolveCampaignRosterVisualTheme,
} from './chapter1RosterAssets';
import {
  CHAPTER_HAZARD_FLAVOR,
  createBossAiRuntimeState,
  planNextBossSkill,
  ZODIAC_BOSS_PROFILES,
} from './zodiacBossAi';

function buildDummyGltfMesh(w = 1, h = 2, d = 1): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d, 4, 8, 4);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  g.add(new THREE.Mesh(geo, mat));
  return g;
}

test('AutoRig respects custom hoverOffsetY when placing skeleton bones (Ch.2 & Ch.3 spirits/sub-bosses)', () => {
  const customHover = 0.42;
  const tpl = prepareAutoRigTemplate('flame_spirit', buildDummyGltfMesh(1, 1.8, 0.8), 2, {
    liteMode: true,
    targetHeight: 1.78,
    hoverOffsetY: customHover,
  });
  // Root bone headNorm is [0, 0, 0] -> world Y must match customHover, NOT calibration default (0.26)
  assert.ok(
    Math.abs(tpl.boneRest[0].localPos[1] - customHover) < 1e-4,
    `Expected root bone Y=${customHover}, got ${tpl.boneRest[0].localPos[1]}`
  );
  assert.ok(
    Math.abs(tpl.bounds.min.y - customHover) < 1e-3,
    `Expected baked mesh min.y=${customHover}, got ${tpl.bounds.min.y}`
  );
});

test('stone_guardian AutoRig differentiates horn-charge (Kratos-Aries / Địa Thần Kim Ngưu), slam, cast, and roar poses', () => {
  const tpl = prepareAutoRigTemplate('stone_guardian', buildDummyGltfMesh(1.4, 3.2, 1.1), 2, {
    liteMode: true,
    targetHeight: 3.3,
  });

  const makeInst = () => instantiateAutoRigModel(tpl);
  const baseInput = {
    elapsed: 1.2,
    dt: 0.05,
    phaseAngle: 0,
    speed: 4.5,
    maxSpeed: 5.0,
    lateralSpeed: 0,
    facingYaw: 0,
    targetYaw: 0,
    bossPhase: 1 as const,
    stunTimer: 0,
    hitFlashTimer: 0,
    recoilPitch: 0,
    recoilRoll: 0,
  };

  // 1) Dash / Horn Charge pose: spine & head pitch forward (+), arms swept back
  const chargeInst = makeInst();
  for (let i = 0; i < 16; i++) {
    updateAutoRigPose(chargeInst, {
      ...baseInput,
      elapsed: 1.2 + i * 0.05,
      telegraphType: 'none',
      telegraphProgress: 0,
      burstType: 'lunge',
      burstTimer: 0.4,
      isDashing: true,
    });
  }
  assert.ok(chargeInst.boneMap.head.rotation.x > 0.14, 'Charging bull/ram boss should lower head/horns forward');
  assert.ok(chargeInst.boneMap.spine.rotation.x > 0.2, 'Charging bull/ram boss should pitch spine forward');

  // 2) Roar / Eruption pose: head tilts back (-), arms fling wide outward
  const roarInst = makeInst();
  for (let i = 0; i < 16; i++) {
    updateAutoRigPose(roarInst, {
      ...baseInput,
      elapsed: 1.2 + i * 0.05,
      telegraphType: 'none',
      telegraphProgress: 0,
      burstType: 'roar',
      burstTimer: 0.4,
      isDashing: false,
    });
  }
  assert.ok(roarInst.boneMap.head.rotation.x < -0.22, 'Roaring boss should tilt head back');
  assert.ok(roarInst.boneMap.armR.rotation.z > 0.5, 'Roaring boss should flare right arm outward');

  // 3) Lane telegraph vs Slam telegraph: distinct body language
  const laneTeleInst = makeInst();
  const slamTeleInst = makeInst();
  for (let i = 0; i < 16; i++) {
    updateAutoRigPose(laneTeleInst, {
      ...baseInput,
      telegraphType: 'lane',
      telegraphProgress: 0.85,
      burstType: 'none',
      burstTimer: 0,
      isDashing: false,
    });
    updateAutoRigPose(slamTeleInst, {
      ...baseInput,
      telegraphType: 'slam',
      telegraphProgress: 0.85,
      burstType: 'none',
      burstTimer: 0,
      isDashing: false,
    });
  }
  assert.ok(
    laneTeleInst.boneMap.spine.rotation.x > slamTeleInst.boneMap.spine.rotation.x + 0.3,
    'Lane charge telegraph should lean forward while slam telegraph rears back'
  );
  assert.ok(
    slamTeleInst.boneMap.armR.rotation.x < -0.9,
    'Slam telegraph should raise right weapon arm high overhead'
  );
});

test('Chapters 1, 2, and 3 all showcase all 4 unique regular mob archetypes + sub-boss + final boss with chapter-themed palettes', () => {
  for (const chId of [1, 2, 3] as const) {
    const ch = CHAPTERS.find((c) => c.id === chId);
    assert.ok(ch, `Chapter ${chId} must exist`);

    // Stages 1-3 introduce all 4 regular mob kinds progressively
    const earlyKinds = new Set(
      ch.stages.slice(0, 3).flatMap((st) => st.waves.flatMap((w) => w.enemies.map((e) => e.kind)))
    );
    assert.ok(earlyKinds.has(EnemyKind.SKIRMISHER), `Ch.${chId} early stages missing SKIRMISHER`);
    assert.ok(earlyKinds.has(EnemyKind.GOLEM), `Ch.${chId} early stages missing GOLEM`);
    assert.ok(earlyKinds.has(EnemyKind.IMP_ARCHER), `Ch.${chId} early stages missing IMP_ARCHER`);
    assert.ok(earlyKinds.has(EnemyKind.DRAGON_WHELP), `Ch.${chId} early stages missing DRAGON_WHELP`);

    // Stage 5 mixes all 4 regular mobs in a single room
    const st5Kinds = new Set(
      ch.stages[4].waves.flatMap((w) => w.enemies.map((e) => e.kind))
    );
    assert.equal(st5Kinds.size, 4, `Ch.${chId} stage 5 should field all 4 regular mob roles`);

    // Mob skill theme is distinct per chapter
    const mobTheme = resolveChapterMobSkillTheme(chId);
    assert.ok(mobTheme.mortarOwnerName.length > 0);
  }

  // Distinct chapter mob themes (Solar Amber vs Crimson Magma vs Emerald Jade)
  const t1 = resolveChapterMobSkillTheme(1);
  const t2 = resolveChapterMobSkillTheme(2);
  const t3 = resolveChapterMobSkillTheme(3);
  assert.notEqual(t1.pounceHex, t2.pounceHex);
  assert.notEqual(t2.pounceHex, t3.pounceHex);
  assert.equal(t3.pounceHex, 0x10b981);

  // Floating spirit & winged sub-boss flags work across all 3 chapters (not just Chapter 1!)
  for (const spiritId of ['flame_spirit', 'crimson-spirit', 'linh-hon-luc-bao'] as const) {
    assert.equal(resolveCampaignRosterVisualTheme(spiritId).isFloatingSpirit, true);
  }
  for (const wingedId of ['winged_solar_lion', 'cinderhorn', 'ngoc-nguu-duc-thu'] as const) {
    assert.equal(resolveCampaignRosterVisualTheme(wingedId).isWingedSubBoss, true);
  }
  assert.equal(resolveCampaignRosterVisualTheme('dia-than-kim-nguu').chapterId, 3);
  assert.equal(resolveCampaignRosterVisualTheme('kratos-aries').chapterId, 2);

  // All Chapter 1, 2, 3 roster asset IDs map back from EnemyKind
  assert.equal(CHAPTER1_ROSTER_ASSET_IDS.length, 5);
  assert.equal(CHAPTER2_ROSTER_ASSET_IDS.length, 6);
  assert.equal(CHAPTER3_ROSTER_ASSET_IDS.length, 6);
  assert.equal(
    resolveCampaignRosterAssetId({ chapterId: 3, enemyKind: EnemyKind.ZODIAC_BOSS }),
    'dia-than-kim-nguu'
  );
  assert.equal(
    resolveCampaignRosterAssetId({ chapterId: 2, enemyKind: EnemyKind.ZODIAC_BOSS }),
    'kratos-aries'
  );
});

test('Calibrated facingYawOffsets align Chapter 2 magma-ram (-PI/2) and Chapter 3 ngoc-nguu-duc-thu (-PI/4) to +Z', async () => {
  const { getCampaignRosterSpec } = await import('./chapter1RosterAssets');
  assert.ok(Math.abs(getCampaignRosterSpec('magma-ram').facingYawOffset - -Math.PI / 2) < 1e-6);
  assert.ok(Math.abs(getCampaignRosterSpec('ngoc-nguu-duc-thu').facingYawOffset - -Math.PI / 4) < 1e-6);
});

test('Chapter 1-2-3 Final Bosses (Leo, Aries, Taurus) plan valid distinct skills and Ch.3 Taurus uses Emerald Jade palette', () => {
  assert.equal(CHAPTER_HAZARD_FLAVOR[3].accentHex, 0x10b981);
  assert.equal(ZODIAC_BOSS_PROFILES.taurus.accentHex, 0x10b981);

  for (const [chId, expectedProfile] of [
    [1, 'leo'],
    [2, 'aries'],
    [3, 'taurus'],
  ] as const) {
    const state = createBossAiRuntimeState({
      enemyKind: EnemyKind.ZODIAC_BOSS,
      chapterId: chId,
    });
    assert.equal(state.profileId, expectedProfile);
    const seenSkills = new Set<string>();
    for (let step = 0; step < 6; step++) {
      const plan = planNextBossSkill(state, {
        bossX: 0,
        bossZ: -3,
        playerX: 1.5,
        playerZ: 2.2,
        playerVx: 1.2,
        playerVz: 0,
        bossPhase: step >= 3 ? 2 : 1,
        arenaHalfW: 13,
        arenaHalfD: 13,
        lowEndGpu: true,
      });
      assert.ok(plan.telegraphDuration >= 0.4, `Ch.${chId} boss skill telegraph must be readable`);
      seenSkills.add(plan.skill.id);
    }
    assert.ok(seenSkills.size >= 3, `Ch.${chId} boss must cycle across at least 3 distinct skills`);

    // Verify anti-kiting gap-closer kicks in cleanly at long range (> preferredRangeMax + 1.5)
    const farPlan = planNextBossSkill(state, {
      bossX: 0,
      bossZ: -7,
      playerX: 0,
      playerZ: 6,
      playerVx: 0,
      playerVz: 0,
      bossPhase: 1,
      arenaHalfW: 13,
      arenaHalfD: 13,
      lowEndGpu: true,
    });
    assert.ok(
      farPlan.skill.kind === 'leap_slam' ||
        farPlan.skill.kind === 'dash_charge' ||
        farPlan.skill.kind === 'strafe_barrage' ||
        farPlan.skill.kind === 'meteor_cascade',
      `Ch.${chId} boss must punish long-range kiting with gap-closer or pursuit skill`
    );
  }

  // Regular mob 2-skill rotation works cleanly on Ch.1, Ch.2, Ch.3
  for (const kind of ['SKIRMISHER', 'GOLEM', 'IMP_ARCHER', 'DRAGON_WHELP'] as const) {
    const s0 = planAaaMobSkill({
      kind,
      skillCycle: 0,
      enemyX: 0,
      enemyZ: -4,
      playerX: 0,
      playerZ: 2,
      playerVx: 0,
      playerVz: 0,
      baseCooldown: 1.85,
      allowMortar: true,
      chapterIndex: 3,
    });
    const firstSkillId = s0.skillId;
    const nextCycle = s0.nextSkillCycle;
    const s1 = planAaaMobSkill({
      kind,
      skillCycle: nextCycle,
      enemyX: 0,
      enemyZ: -4,
      playerX: 0,
      playerZ: 2,
      playerVx: 0,
      playerVz: 0,
      baseCooldown: 1.85,
      allowMortar: true,
      chapterIndex: 3,
    });
    assert.notEqual(firstSkillId, s1.skillId, `${kind} should alternate between 2 distinct skills`);
  }
});

test('HUD getEnemyLabel returns authentic Chapter 1, 2, and 3 Vietnamese roster names (no Hilichurl fallback)', async () => {
  const { getEnemyLabel } = await import('../data/assetRegistry');
  const expected: Record<number, Record<string, string>> = {
    1: {
      [EnemyKind.SKIRMISHER]: 'Sư Tử Lửa Đền Thờ',
      [EnemyKind.GOLEM]: 'Vệ Binh Đá Mặt Trời',
      [EnemyKind.IMP_ARCHER]: 'Linh Hồn Lửa Hoàng Đạo',
      [EnemyKind.DRAGON_WHELP]: 'Chiến Binh Thương Ánh Dương',
      [EnemyKind.WARDEN_BOSS]: 'Sư Tử Cánh Ánh Dương',
      [EnemyKind.ZODIAC_BOSS]: 'Sư Vương Thái Dương',
    },
    2: {
      [EnemyKind.SKIRMISHER]: 'Dương Hỏa Dung Nham',
      [EnemyKind.GOLEM]: 'Golem Hắc Diện',
      [EnemyKind.IMP_ARCHER]: 'Hỏa Linh Xích Hỏa',
      [EnemyKind.DRAGON_WHELP]: 'Cuồng Chiến Bạch Dương',
      [EnemyKind.WARDEN_BOSS]: 'Cinderhorn',
      [EnemyKind.ZODIAC_BOSS]: 'Hỏa Dương Chiến Vương',
    },
    3: {
      [EnemyKind.SKIRMISHER]: 'Ngưu Ngọc Xung Kích',
      [EnemyKind.GOLEM]: 'Vệ Binh Ngọc Lục Bảo',
      [EnemyKind.IMP_ARCHER]: 'Linh Hồn Lục Bảo',
      [EnemyKind.DRAGON_WHELP]: 'Chiến Binh Kích Lục Bảo',
      [EnemyKind.WARDEN_BOSS]: 'Ngọc Ngưu Dực Thú',
      [EnemyKind.ZODIAC_BOSS]: 'Địa Thần Kim Ngưu',
    },
  };

  for (const chId of [1, 2, 3]) {
    for (const [kind, label] of Object.entries(expected[chId])) {
      const actual = getEnemyLabel(kind as EnemyKind, chId);
      assert.equal(actual, label, `Ch.${chId} ${kind} label mismatch`);
      assert.ok(!actual.includes('Hilichurl'), `Ch.${chId} ${kind} must not show Hilichurl fallback`);
    }
  }
});

