import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditEconomySinksAndArbitrage,
  evaluateChapterTtkTtdCurve,
  evaluateSkillBuildBalance,
  simulate100HourJourney,
} from '../src/data/balanceSimulation.ts';

test('Progression: 100-hour deterministic simulation preserves healthy Early->Mid->Late->Endgame pacing for Average & Unlucky profiles', () => {
  const avg = simulate100HourJourney('average');
  const unlucky = simulate100HourJourney('unlucky');

  assert.equal(avg.milestones.length, 8);
  assert.equal(unlucky.milestones.length, 8);

  // Early 5m player starts grounded (never OP)
  const m5 = avg.milestones[0];
  assert.equal(m5.cumulativeMinutes, 5);
  assert.ok(m5.powerRating < 900, `5m power should stay grounded, got ${m5.powerRating}`);
  assert.equal(m5.chapterCleared, 0);

  // Power and chapter progression grow cleanly across the 100-hour journey
  for (let i = 1; i < avg.milestones.length; i++) {
    assert.ok(
      avg.milestones[i].powerRating > avg.milestones[i - 1].powerRating,
      `Power must grow from ${avg.milestones[i - 1].milestoneLabel} to ${avg.milestones[i].milestoneLabel}`
    );
    assert.ok(avg.milestones[i].chapterCleared >= avg.milestones[i - 1].chapterCleared);
  }

  // Endgame 100h reaches late/endgame chapters with deterministic bad-luck floor
  assert.ok(avg.day30ChaptersCleared >= 8);
  assert.ok(
    unlucky.hour100PowerRating / avg.hour100PowerRating >= 0.78,
    'Unlucky player must retain >= 78% of Average player power thanks to deterministic pity & target forge'
  );
});

test('Combat: 12-Chapter TTK/TTD curve maintains tactical survivability without trivial one-shots', () => {
  const rows = evaluateChapterTtkTtdCurve();
  assert.equal(rows.length, 12);

  for (const row of rows) {
    assert.ok(
      row.mobTtkSec >= 0.4 && row.mobTtkSec <= 8.0,
      `Ch.${row.chapterId} mob TTK out of range: ${row.mobTtkSec}`
    );
    assert.ok(
      row.bossTtkSec >= 8 && row.bossTtkSec <= 120,
      `Ch.${row.chapterId} boss TTK out of range: ${row.bossTtkSec}`
    );
    assert.ok(
      row.playerTtdHits >= 3.5,
      `Ch.${row.chapterId} player TTD hits too punishing: ${row.playerTtdHits}`
    );
  }
});

test('Skill System: All 4 core build archetypes stay within balanced competitive DPS band (no single dominant build)', () => {
  const report = evaluateSkillBuildBalance();
  assert.equal(report.builds.length, 4);
  assert.ok(report.totalSkills >= 20);
  assert.ok(report.totalSynergies >= 8);
  assert.equal(report.balanced, true, `Build max-to-median ratio exceeded 1.25: ${report.maxToMedianRatio}`);
});

test('Economy: Zero infinite Gold<->Gem flash-deal arbitrage loops and healthy currency sink coverage', () => {
  const audit = auditEconomySinksAndArbitrage();
  assert.equal(
    audit.flashDealArbitrageDetected,
    false,
    `Flash deal Gold<->Gem arbitrage must be eliminated (buy=${audit.flashDealGoldPerGemBuy}, sell=${audit.flashDealGoldPerGemSell})`
  );
  assert.ok(
    audit.flashDealGoldPerGemBuy <= audit.flashDealGoldPerGemSell,
    `Gold Vault (${audit.flashDealGoldPerGemBuy}g/gem) must not exceed Gem Exchange (${audit.flashDealGoldPerGemSell}g/gem)`
  );
  assert.ok(audit.fullTalentGoldSink > 100_000);
  assert.ok(audit.sixMythicGearLv80GoldSink > 1_000_000);
});
