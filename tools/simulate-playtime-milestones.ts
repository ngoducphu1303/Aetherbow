import { simulate100HourJourney } from '../src/data/balanceSimulation';
import { evaluatePass3EconomyAndSetBalance } from '../src/data/onboardingAndMasteryData';

/**
 * Deterministic 8-Milestone Playtime & Economy CLI (`5m -> 100h`, Phase 5 Master Prompt).
 * Runs directly on top of real game math (`src/data/balanceSimulation.ts` +
 * `src/data/onboardingAndMasteryData.ts`) and prints reproducible Markdown tables.
 */
const averageReport = simulate100HourJourney('average', 'aaaa-100h-v1');
const unluckyReport = simulate100HourJourney('unlucky', 'aaaa-100h-v1');
const pass3Audit = evaluatePass3EconomyAndSetBalance();

console.log('# AETHERBOW 8-MILESTONE PLAYTIME SIMULATION (seed=aaaa-100h-v1)\n');
console.log(
  `Fresh Start Power Rating: ${averageReport.startingPowerRating} LC | Day 30 (avg): ${averageReport.day30PowerRating} LC (Ch.${averageReport.day30ChaptersCleared}) | 100h (avg): ${averageReport.hour100PowerRating} LC (Tower F${averageReport.hour100TowerFloor})`
);
console.log(
  `Day 30 (unlucky): ${unluckyReport.day30PowerRating} LC (Ch.${unluckyReport.day30ChaptersCleared}) | 100h (unlucky): ${unluckyReport.hour100PowerRating} LC (Tower F${unluckyReport.hour100TowerFloor})\n`
);

console.log('| Milestone | Day | Chapters | Tower | Power (Avg) | Power (Unlucky) | Highest Rarity | Avg Gear Lv | Talents | Cum. Gold | Cum. Gems |');
console.log('|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|');

for (let i = 0; i < averageReport.milestones.length; i++) {
  const a = averageReport.milestones[i];
  const u = unluckyReport.milestones[i];
  console.log(
    `| ${a.milestoneLabel} | D${a.estimatedDay} | ${a.chapterCleared}/12 | F${a.bestTowerFloor} | ${a.powerRating.toLocaleString('en-US')} | ${u.powerRating.toLocaleString('en-US')} | ${a.highestRarity} | Lv.${a.avgGearLevel} | ${a.talentLevels} | ${a.cumulativeGoldEarned.toLocaleString('en-US')} | ${a.cumulativeGemsEarned.toLocaleString('en-US')} |`
  );
}

console.log('\n## Endgame Economy Sink vs 100h Gold Earned Audit');
console.log(JSON.stringify(pass3Audit, null, 2));
