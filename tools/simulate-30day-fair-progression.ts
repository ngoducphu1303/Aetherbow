import { simulate30DayFairProgression } from '../src/data/fairProgression30Day';

function printProfile(luckProfile: 'average' | 'unlucky') {
  const res = simulate30DayFairProgression({
    seed: 'aetherbow-fair-30d',
    luckProfile,
    dailyMinutes: 40,
  });

  console.log(`\n=== 30-DAY FAIR PROGRESSION SIMULATION (${luckProfile.toUpperCase()} · 40 min/day) ===`);
  console.log('Day | Wk | Ch  | Tower | Power (LC) | AvgLv | Rarity       | Mythic | Talents | Max%');
  console.log('----+----+-----+-------+------------+-------+--------------+--------+---------+-----');
  for (const d of res.days) {
    if ([1, 2, 4, 7, 10, 14, 17, 21, 24, 27, 28, 29, 30].includes(d.day)) {
      console.log(
        `${String(d.day).padStart(3)} | W${d.week} | ${String(d.chapterCleared).padStart(2)}/12 | ${String(d.bestTowerFloor).padStart(5)} | ${String(d.powerRating).padStart(10)} | +${String(d.avgGearLevel).padStart(4)} | ${d.highestRarityLabel.padEnd(12)} | ${String(d.mythicGearCount).padStart(4)}/6 | ${String(d.talentLevels).padStart(3)}/160 | ${String(d.maxStagePct).padStart(3)}%`
      );
    }
  }
  console.log('Chapter Clear Days:', res.chapterClearDays);
  console.log(
    `Summary: Ch=${res.finalChaptersCleared}/12 | Tower=${res.finalTowerFloor} (T40: D${res.dayReachedTower40 ?? '-'}, T45: D${res.dayReachedTower45 ?? '-'}) | Power=${res.finalPowerRating} LC | Mythic=${res.finalMythicSlots}/6 | Talents=${res.finalTalentLevels}/160 | MaxStage=${res.finalMaxStagePct}%`
  );
}

printProfile('average');
printProfile('unlucky');
