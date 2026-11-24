import { simulatePlaytimeMilestones } from '../src/data/economyTelemetry';

const seedArg = process.argv.find((arg) => arg.startsWith('--seed='));
const seed = seedArg ? Number(seedArg.slice('--seed='.length)) || 20260410 : 20260410;
const asJson = process.argv.includes('--json');

const report = simulatePlaytimeMilestones(seed);

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `=== AETHERBOW 8-MILESTONE PLAYTIME SIMULATION (seed=${report.seed}, model=${report.simulationKind}) ===`
  );
  console.log(
    `Fresh Baseline: Power=${report.freshBaselinePower} LC | Gold=${report.freshBaselineGold} | Gems=${report.freshBaselineGems}`
  );
  console.log('');
  console.log(
    '| Mốc | Pha | Ch.Clear | Tháp | Power (LC) | Rec (LC) | Tỷ lệ | Rarity Cao Nhất | Gold Thu | Gold Chi | Sink % | Mob TTK | Boss TTK | Player TTD |'
  );
  console.log(
    '|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|'
  );
  for (const m of report.milestones) {
    console.log(
      `| ${m.milestoneId} | ${m.phaseLabel} | ${m.highestChapterCleared}/12 | F${m.bestTowerFloor} | ${m.playerPower.toLocaleString('en-US')} | ${m.recommendedPower.toLocaleString('en-US')} | ${(m.powerRatio * 100).toFixed(0)}% | ${m.highestRarityLabel} | ${m.goldEarnedCumulative.toLocaleString('en-US')} | ${m.goldSpentCumulative.toLocaleString('en-US')} | ${m.goldSinkRatioPct}% | ${m.estMobTtkSec}s | ${m.estBossTtkSec}s | ${m.estPlayerTtdSec}s |`
    );
  }
  if (report.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of report.warnings) console.log(` - ${w}`);
  } else {
    console.log('\nWarnings: 0');
  }
}
