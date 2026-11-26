import { simulate100HourJourney } from '../src/data/balanceSimulation';
import { evaluatePass3EconomyAndSetBalance } from '../src/data/onboardingAndMasteryData';
import {
  getRuneRefinementCost,
  getSubstatPolishCost,
  RUNE_REFINEMENT_MAX_TIER,
} from '../src/data/runeAndAffixRefining';
import { Rarity } from '../src/types/game';

/**
 * Deterministic 8-Milestone Playtime & Economy CLI (`5m -> 100h`, Phase 5 Master Prompt).
 * Runs directly on top of real game math (`src/data/balanceSimulation.ts` +
 * `src/data/onboardingAndMasteryData.ts` + Wave 13 `src/data/runeAndAffixRefining.ts`)
 * and prints reproducible Markdown tables.
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

// Wave 13 Endgame Sink Audit: 4 Equipped Ancient Runes (+0 -> +5) + 6 Mythic/Legendary Gear (3 substats x 2 polish steps)
let runeRefineGoldPerRune = 0;
let runeRefineDustPerRune = 0;
let runeRefineShardsPerRune = 0;
for (let tier = 0; tier < RUNE_REFINEMENT_MAX_TIER; tier++) {
  const c = getRuneRefinementCost(tier);
  if (c) {
    runeRefineGoldPerRune += c.gold;
    runeRefineDustPerRune += c.starDust;
    runeRefineShardsPerRune += c.ancientRuneShards;
  }
}
const fourRunesGoldSink = runeRefineGoldPerRune * 4;
const fourRunesDustSink = runeRefineDustPerRune * 4;
const fourRunesShardSink = runeRefineShardsPerRune * 4;

const legendaryPolishCost = getSubstatPolishCost(Rarity.LEGENDARY, 0.5);
const mythicPolishCost = getSubstatPolishCost(Rarity.MYTHIC, 0.5);
// Realistic 100h polishing: 3 Legendary slots + 3 Mythic slots, 3 substats each, 2 polish steps each
const substatPolishGoldSink =
  3 * 3 * 2 * legendaryPolishCost.gold + 3 * 3 * 2 * mythicPolishCost.gold;
const substatPolishDustSink =
  3 * 3 * 2 * legendaryPolishCost.starDust + 3 * 3 * 2 * mythicPolishCost.starDust;
const wave13TotalGoldSink = fourRunesGoldSink + substatPolishGoldSink;
const wave13TotalDustSink = fourRunesDustSink + substatPolishDustSink;
const combinedEndgameGoldSink = pass3Audit.totalEndgameGoldSink + wave13TotalGoldSink;
const combinedSinkRatioPct = Number(
  ((combinedEndgameGoldSink / Math.max(1, pass3Audit.hour100GoldEarned)) * 100).toFixed(1)
);

console.log('\n## Endgame Economy Sink vs 100h Gold Earned Audit');
console.log(
  JSON.stringify(
    {
      ...pass3Audit,
      wave13EndgameSinks: {
        fourEquippedRunesMaxRefinement: {
          gold: fourRunesGoldSink,
          starDust: fourRunesDustSink,
          ancientRuneShards: fourRunesShardSink,
        },
        targetedSubstatPolishing6Slots: {
          gold: substatPolishGoldSink,
          starDust: substatPolishDustSink,
        },
        wave13TotalGoldSink,
        wave13TotalDustSink,
        combinedEndgameGoldSink,
        combinedGoldSinkTo100hRatioPct: combinedSinkRatioPct,
      },
    },
    null,
    2
  )
);

