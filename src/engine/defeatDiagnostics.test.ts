import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeDefeatDiagnostics } from './defeatDiagnostics';

test('DefeatDiagnostics: detects severe CP gap and recommends Gear + Talents upgrades', () => {
  const report = analyzeDefeatDiagnostics({
    chapterId: 4,
    stageReached: 3,
    totalStages: 10,
    playerPowerRating: 11000,
    recommendedChapterPower: 20000,
    elapsedSeconds: 52,
    perfectDodges: 2,
    damageTakenCount: 5,
    castInterrupts: 1,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 1,
  });

  assert.equal(report.primaryCauseCode, 'power_gap');
  assert.equal(report.metrics.length, 4);
  assert.equal(report.metrics[0].status, 'critical');
  assert.equal(report.recommendations.length, 2);
  assert.equal(report.recommendations[0].actionTarget, 'gear');
  assert.equal(report.recommendations[1].actionTarget, 'talents');
});

test('DefeatDiagnostics: identifies missed Boss interrupt windows when CP is sufficient', () => {
  const report = analyzeDefeatDiagnostics({
    chapterId: 3,
    stageReached: 10,
    totalStages: 10,
    playerPowerRating: 12000,
    recommendedChapterPower: 10000,
    elapsedSeconds: 65,
    perfectDodges: 4,
    damageTakenCount: 4,
    castInterrupts: 0,
    bossGuardBreaks: 0,
    bossInterruptOpportunities: 2,
    arenaMechanismsTriggered: 2,
    defeatCause: {
      code: 'boss_slam',
      label: 'Đòn chấn động Boss',
      tip: 'Lướt ra khỏi vòng đỏ trước khi nổ.',
      killerName: 'Kim Ngưu Thánh Giáp',
    },
  });

  assert.equal(report.primaryCauseCode, 'missed_boss_interrupt');
  assert.equal(report.recommendations.length, 2);
  assert.equal(report.recommendations[0].actionTarget, 'retry');
  assert.equal(report.recommendations[1].actionTarget, 'codex');
});

test('DefeatDiagnostics: identifies telegraph dodge deficit when hit repeatedly without Perfect Dodges', () => {
  const report = analyzeDefeatDiagnostics({
    chapterId: 2,
    stageReached: 6,
    totalStages: 10,
    playerPowerRating: 5200,
    recommendedChapterPower: 4500,
    elapsedSeconds: 40,
    perfectDodges: 0,
    damageTakenCount: 7,
    castInterrupts: 1,
    bossGuardBreaks: 1,
    arenaMechanismsTriggered: 1,
    defeatCause: {
      code: 'ranged_barrage',
      label: 'Mưa đạn tầm xa',
      tip: 'Di chuyển ngang vuông góc tia bắn.',
    },
  });

  assert.equal(report.primaryCauseCode, 'telegraph_dodge_deficit');
  assert.equal(report.recommendations.length, 2);
});

test('DefeatDiagnostics: flags unused arena mechanisms in extended rooms', () => {
  const report = analyzeDefeatDiagnostics({
    chapterId: 1,
    stageReached: 4,
    totalStages: 10,
    playerPowerRating: 1600,
    recommendedChapterPower: 1350,
    elapsedSeconds: 45,
    perfectDodges: 3,
    damageTakenCount: 3,
    castInterrupts: 1,
    bossGuardBreaks: 1,
    arenaMechanismsTriggered: 0,
    defeatCause: {
      code: 'melee_swarm',
      label: 'Quái cận chiến áp sát',
      tip: 'Giữ khoảng cách và lướt thoát vòng vây.',
    },
  });

  assert.equal(report.primaryCauseCode, 'unused_arena_mechanism');
  assert.equal(report.recommendations.length, 2);
});
