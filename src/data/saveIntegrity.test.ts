import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData } from './gearData';
import {
  decodeSaveTransferCode,
  encodeSaveTransferCode,
  encodeSignedSaveJson,
  SAVE_JSON_ENVELOPE_FORMAT,
} from './phase5Data';
import { validateAndSanitizeSaveIntegrity } from './saveIntegrity';

test('SaveIntegrity: preserves clean player save with zero false-positive anomalies', () => {
  const clean = createInitialSaveData();
  const report = validateAndSanitizeSaveIntegrity(clean);
  assert.equal(report.hadAnomalies, false);
  assert.deepEqual(report.issuesFixed, []);
  assert.equal(report.sanitizedSave.selectedHeroId, 'aurelia');
});

test('SaveIntegrity: clamps tampered currency, gear level/awakening, heroStars, pity, and dedupes mail/inventory', () => {
  const base = createInitialSaveData();
  const tampered = {
    ...base,
    gold: -500,
    gems: 999_999_999,
    highestChapterCleared: 99,
    starDust: -20,
    paragonInfusionLevel: 9999,
    unlockedHeroes: [],
    heroStars: { aurelia: 99, bellona: -3 },
    pity: { ...(base.pity ?? {}), mythicPulls: -10, sTierPulls: 9999 },
    claimedMailIds: ['m1', 'm1', '', 'm2'],
    deletedMailIds: ['d1', 'd1'],
    inventory: [
      { ...base.inventory[0], level: 999, awakeningLevel: 42 },
      { ...base.inventory[0], level: 5 }, // duplicate uid
    ],
  } as unknown as typeof base;

  const report = validateAndSanitizeSaveIntegrity(tampered);
  assert.equal(report.hadAnomalies, true);
  assert.equal(report.sanitizedSave.gold, 0);
  assert.equal(report.sanitizedSave.gems, 99_999_999);
  assert.equal(report.sanitizedSave.highestChapterCleared, 12);
  assert.equal(report.sanitizedSave.starDust, 0);
  assert.equal(report.sanitizedSave.paragonInfusionLevel, 500);
  assert.deepEqual(report.sanitizedSave.unlockedHeroes, ['aurelia']);
  assert.equal(report.sanitizedSave.selectedHeroId, 'aurelia');
  assert.equal(report.sanitizedSave.heroStars.aurelia, 10);
  assert.equal(report.sanitizedSave.heroStars.bellona, 0);
  assert.equal(report.sanitizedSave.inventory.length, 1);
  assert.equal(report.sanitizedSave.inventory[0].level, 120);
  assert.equal(report.sanitizedSave.inventory[0].awakeningLevel, 10);
  assert.deepEqual(report.sanitizedSave.claimedMailIds, ['m1', 'm2']);
  assert.deepEqual(report.sanitizedSave.deletedMailIds, ['d1']);
});

test('Signed JSON-V2 save export/import roundtrips cleanly and rejects tampered payload checksum', () => {
  const save = { ...createInitialSaveData(), gold: 42500, highestChapterCleared: 6, paragonInfusionLevel: 3 };
  const signedJson = encodeSignedSaveJson(save, '2026-11-24T12:00:00.000Z');
  const parsedEnvelope = JSON.parse(signedJson) as { format: string; checksum: string; payload: typeof save };
  assert.equal(parsedEnvelope.format, SAVE_JSON_ENVELOPE_FORMAT);

  const decoded = decodeSaveTransferCode(signedJson);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.preview?.version, 'JSON-V2');
  assert.equal(decoded.save?.gold, 42500);
  assert.equal(decoded.save?.highestChapterCleared, 6);
  assert.equal(decoded.save?.paragonInfusionLevel, 3);

  // Tamper gold inside the JSON-V2 file without updating checksum -> MUST reject!
  parsedEnvelope.payload.gold = 999_000_000;
  const tamperedRes = decodeSaveTransferCode(JSON.stringify(parsedEnvelope));
  assert.equal(tamperedRes.ok, false);
  assert.match(tamperedRes.error ?? '', /checksum|toàn vẹn/i);
});

test('Legacy raw JSON and ABW5 transfer codes remain backward-compatible and clamp out-of-range fields', () => {
  const legacyRaw = {
    ...createInitialSaveData(),
    gold: -999,
    highestChapterCleared: 50,
    paragonInfusionLevel: 999,
  };
  const decodedLegacy = decodeSaveTransferCode(JSON.stringify(legacyRaw));
  assert.equal(decodedLegacy.ok, true);
  assert.equal(decodedLegacy.preview?.version, 'JSON');
  assert.equal(decodedLegacy.save?.gold, 0);
  assert.equal(decodedLegacy.save?.highestChapterCleared, 12);
  assert.equal(decodedLegacy.save?.paragonInfusionLevel, 500);
  assert.ok((decodedLegacy.integrityFixedCount ?? 0) >= 1);

  const abw5 = encodeSaveTransferCode({ ...createInitialSaveData(), gold: 12345, highestChapterCleared: 4 });
  const decodedAbw5 = decodeSaveTransferCode(abw5);
  assert.equal(decodedAbw5.ok, true);
  assert.equal(decodedAbw5.preview?.version, 'ABW5');
  assert.equal(decodedAbw5.save?.gold, 12345);
});
