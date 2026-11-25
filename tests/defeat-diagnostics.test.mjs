import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDefeatDiagnostics } from '../src/engine/defeatDiagnostics.ts';

test('analyzeDefeatDiagnostics identifies CP power gap and provides gear/talent recommendations', () => {
  const report = analyzeDefeatDiagnostics({
    chapterId: 3,
    stageReached: 5,
    totalStages: 12,
    playerPowerRating: 2100,
    recommendedChapterPower: 3800,
    elapsedSeconds: 58,
    perfectDodges: 2,
    damageTakenCount: 4,
    castInterrupts: 1,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 1,
  });

  assert.equal(report.primaryCauseId, 'power_gap');
  assert.ok(report.powerRatioPct < 78);
  assert.equal(report.metrics.length, 4);
  assert.equal(report.recommendations.length, 2);
  assert.equal(report.recommendations[0].actionTarget, 'gear');
  assert.equal(report.recommendations[1].actionTarget, 'talents');
});

test('analyzeDefeatDiagnostics identifies missed Boss interrupts, poor dodge timing, and unused arena mechanisms', () => {
  const bossMiss = analyzeDefeatDiagnostics({
    chapterId: 2,
    stageReached: 12,
    totalStages: 12,
    playerPowerRating: 2400,
    recommendedChapterPower: 2500,
    elapsedSeconds: 95,
    perfectDodges: 3,
    damageTakenCount: 3,
    castInterrupts: 0,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 2,
  });
  assert.equal(bossMiss.primaryCauseId, 'missed_interrupts');
  assert.equal(bossMiss.recommendations[0].actionTarget, 'codex');

  const dodgeIssue = analyzeDefeatDiagnostics({
    chapterId: 2,
    stageReached: 6,
    totalStages: 12,
    playerPowerRating: 2400,
    recommendedChapterPower: 2500,
    elapsedSeconds: 62,
    perfectDodges: 0,
    damageTakenCount: 7,
    castInterrupts: 1,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 1,
  });
  assert.equal(dodgeIssue.primaryCauseId, 'dodge_timing');
  assert.equal(dodgeIssue.recommendations[0].actionTarget, 'retry');

  const mechUnused = analyzeDefeatDiagnostics({
    chapterId: 1,
    stageReached: 5,
    totalStages: 12,
    playerPowerRating: 1200,
    recommendedChapterPower: 1350,
    elapsedSeconds: 70,
    perfectDodges: 3,
    damageTakenCount: 3,
    castInterrupts: 1,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 0,
  });
  assert.equal(mechUnused.primaryCauseId, 'unused_mechanisms');
});
