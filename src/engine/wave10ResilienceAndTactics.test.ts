import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchGlbWithIdleTimeout,
  isValidGlbBinary,
  shouldSkipNodeApiEndpoints,
} from './glbFetchResilience';
import {
  clearChapter1BossDownloadCache,
  downloadChapter1BossArrayBuffer,
} from './chapter1Boss';
import {
  clearChapter1RosterDownloadCache,
  downloadChapter1RosterArrayBuffer,
} from './chapter1RosterAssets';
import {
  clearSolarLeoDownloadCache,
  downloadSolarLeoArrayBuffer,
} from './solarLeoAssets';
import {
  CombatFrameScratchPool,
  selectBossHazardSlot,
  type EnemySourceLike,
} from './combatScratchBuffers';
import { analyzeDefeatDiagnostics } from './defeatDiagnostics';
import { ZODIAC_BOSS_PHASE_SIGNATURES } from './tacticalCombatChoreography';
import type { CombatKeybinds } from '../types/game';

function createValidGlbBytes(totalLength = 64): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(totalLength));
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); // 'glTF'
  view.setUint32(4, 2, true); // version 2
  view.setUint32(8, totalLength, true);
  for (let i = 12; i < totalLength; i++) {
    bytes[i] = (i * 19 + 7) & 0xff;
  }
  return bytes;
}

test('W10-1a: fetchGlbWithIdleTimeout streams valid GLB, rejects HTML/corrupt payloads, and aborts stalled streams', async () => {
  const validBytes = createValidGlbBytes(96);
  assert.equal(isValidGlbBinary(validBytes.buffer), true);
  assert.equal(isValidGlbBinary(new ArrayBuffer(12)), false);

  const progressSteps: number[] = [];
  const streamedBuf = await fetchGlbWithIdleTimeout({
    url: 'https://cdn.example.test/valid.glb',
    idleTimeoutMs: 500,
    assetLabel: 'ValidTest',
    onProgress: (loaded) => progressSteps.push(loaded),
    fetchImpl: async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(validBytes.slice(0, 32));
          controller.enqueue(validBytes.slice(32, 64));
          controller.enqueue(validBytes.slice(64));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: {
          'content-type': 'model/gltf-binary',
          'content-length': String(validBytes.byteLength),
        },
      });
    },
  });

  assert.equal(streamedBuf.byteLength, 96);
  assert.deepEqual(progressSteps, [32, 64, 96]);

  // Reject HTML SPA fallback response even with HTTP 200
  await assert.rejects(
    () =>
      fetchGlbWithIdleTimeout({
        url: 'https://cdn.example.test/missing.glb',
        idleTimeoutMs: 500,
        assetLabel: 'HtmlFallback',
        fetchImpl: async () =>
          new Response('<!doctype html><html><body>SPA</body></html>', {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          }),
      }),
    /không phải tệp GLB/i
  );

  // Reject corrupted binary GLB header
  await assert.rejects(
    () =>
      fetchGlbWithIdleTimeout({
        url: 'https://cdn.example.test/corrupt.glb',
        idleTimeoutMs: 500,
        assetLabel: 'CorruptBinary',
        fetchImpl: async () =>
          new Response(new Uint8Array(64), {
            status: 200,
            headers: { 'content-type': 'model/gltf-binary' },
          }),
      }),
    /không hợp lệ/i
  );

  // Abort cleanly when stream stalls without producing bytes within idleTimeoutMs
  await assert.rejects(
    () =>
      fetchGlbWithIdleTimeout({
        url: 'https://cdn.example.test/stalled.glb',
        idleTimeoutMs: 70,
        assetLabel: 'StalledAsset',
        fetchImpl: async (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              'abort',
              () => reject(new DOMException('Aborted', 'AbortError')),
              { once: true }
            );
          }),
      }),
    /Hết thời gian tải StalledAsset/i
  );
});

test('W10-1b: Stalled High GLB downloads automatically time out and recover via Lite fallback across Boss, Roster, and SolarLeo loaders', async () => {
  clearChapter1BossDownloadCache();
  clearChapter1RosterDownloadCache();
  clearSolarLeoDownloadCache();

  const liteGlb = createValidGlbBytes(80);
  const requestedUrls: string[] = [];

  const stallingHighFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    requestedUrls.push(url);
    if (url.toLowerCase().includes('high')) {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        );
      });
    }
    return new Response(liteGlb, {
      status: 200,
      headers: {
        'content-type': 'model/gltf-binary',
        'content-length': String(liteGlb.byteLength),
      },
    });
  };

  const bossBuf = await downloadChapter1BossArrayBuffer('high', {
    fetchImpl: stallingHighFetch,
    idleTimeoutMs: 60,
  });
  assert.equal(bossBuf.byteLength, 80);

  const rosterBuf = await downloadChapter1RosterArrayBuffer('fire_lion', 'high', {
    fetchImpl: stallingHighFetch,
    idleTimeoutMs: 60,
  });
  assert.equal(rosterBuf.byteLength, 80);

  const heroBuf = await downloadSolarLeoArrayBuffer('aurelia', 'high', {
    fetchImpl: stallingHighFetch,
    idleTimeoutMs: 60,
  });
  assert.equal(heroBuf.byteLength, 80);

  assert.equal(
    requestedUrls.filter((u) => u.toLowerCase().includes('high')).length,
    3,
    'Should attempt High variant once per loader before timing out'
  );
  assert.equal(
    requestedUrls.filter((u) => u.toLowerCase().includes('lite')).length,
    3,
    'Should recover via Lite variant across Boss, Roster, and SolarLeo loaders'
  );

  clearChapter1BossDownloadCache();
  clearChapter1RosterDownloadCache();
  clearSolarLeoDownloadCache();
});

test('W10-1c: shouldSkipNodeApiEndpoints classifies static SPA deployments vs Node backend hosts', () => {
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: 'true', hostname: 'localhost' }), true);
  assert.equal(
    shouldSkipNodeApiEndpoints({ envStaticSpa: 'false', hostname: 'aetherbow.vercel.app' }),
    false
  );
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: '', hostname: 'aetherbow.vercel.app' }), true);
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: '', hostname: 'preview.pages.dev' }), true);
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: '', hostname: 'game.netlify.app' }), true);
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: '', hostname: 'localhost' }), false);
  assert.equal(shouldSkipNodeApiEndpoints({ envStaticSpa: '', hostname: 'api.aetherbow.vn' }), false);
});

test('W10-2: Zero-GC Boss hazard slot eviction respects Lite cap and mechanismScanScratch stays isolated for 600 frames', () => {
  const pool = [
    { id: 0, active: true, life: 4.5 },
    { id: 1, active: true, life: 1.2 },
    { id: 2, active: false, life: 0 },
    { id: 3, active: false, life: 0 },
  ];

  // Under Desktop cap (4), selects first free slot (id 2)
  assert.equal(selectBossHazardSlot(pool, 4)?.id, 2);
  // Under Dell E5430 Lite cap (2), 2 slots are already active -> recycles oldest active slot (id 1, life 1.2)
  assert.equal(selectBossHazardSlot(pool, 2)?.id, 1);

  const scratch = new CombatFrameScratchPool<EnemySourceLike>();
  const mockEnemies: EnemySourceLike[] = [
    {
      id: 101,
      x: 1,
      z: 2,
      hp: 120,
      maxHp: 120,
      isBoss: false,
      isElite: false,
      radius: 0.9,
      spawnTimer: 0,
      telegraphType: 'none',
      telegraphTimer: 0,
      slamX: 0,
      slamZ: 0,
      slamRadius: 0,
      aimX: 0,
      aimZ: 0,
    },
  ];

  const initialRef = scratch.mechanismScanScratch;
  for (let frame = 0; frame < 600; frame++) {
    const copied = scratch.copyEnemiesInto(mockEnemies, scratch.mechanismScanScratch);
    assert.equal(copied, initialRef);
    assert.equal(copied.length, 1);
    assert.notEqual(scratch.mechanismScanScratch, scratch.reactionScanScratch);
    assert.notEqual(scratch.mechanismScanScratch, scratch.resonanceScanScratch);
    assert.notEqual(scratch.mechanismScanScratch, scratch.chainScanScratch);
  }
});

test('W10-3: Defeat diagnostics inject exact Zodiac Boss signatures, chapter arena mechanism names, and custom keybinds across all 12 chapters', () => {
  const customKeys: CombatKeybinds = {
    dash: 'ShiftLeft',
    activeSkill: 'KeyJ',
    heavyBreak: 'KeyK',
    ultimate: 'KeyU',
    overdrive: 'KeyO',
    pause: 'KeyP',
    cycleCamera: 'KeyC',
    toggleAutoPilot: 'KeyV',
  };

  // Missed Boss interrupts on Chapter 4 should surface Chapter 4 Boss signature + custom [K]/[J]/[U] keys + Lăng Kính Tinh Giới
  const bossReport = analyzeDefeatDiagnostics({
    chapterId: 4,
    stageReached: 12,
    totalStages: 12,
    playerPowerRating: 12000,
    recommendedChapterPower: 12000,
    elapsedSeconds: 88,
    perfectDodges: 3,
    damageTakenCount: 4,
    castInterrupts: 0,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 1,
    combatKeybinds: customKeys,
  });

  assert.equal(bossReport.primaryCauseId, 'missed_interrupts');
  assert.equal(bossReport.chapterMechanismName, 'Lăng Kính Tinh Giới');
  assert.match(bossReport.primaryCauseSummary, new RegExp(ZODIAC_BOSS_PHASE_SIGNATURES[4].phase2Title));
  assert.ok(
    bossReport.primaryCauseSummary.includes(ZODIAC_BOSS_PHASE_SIGNATURES[4].phase2Counterplay),
    'Should include exact Phase II counterplay tip for Chapter 4'
  );
  assert.ok(
    bossReport.recommendations[1].detail.includes(ZODIAC_BOSS_PHASE_SIGNATURES[4].phase3Counterplay),
    'Should include exact Phase III counterplay tip for Chapter 4'
  );
  assert.match(bossReport.primaryCauseSummary, /\[K\]/);
  assert.match(bossReport.recommendations[0].detail, /\[J\]/);
  assert.match(bossReport.recommendations[0].detail, /\[U\]/);
  assert.match(bossReport.recommendations[1].title, /Lăng Kính Tinh Giới/);

  // Unused mechanism on Chapter 3 should specifically reference Tinh Thể Lục Bảo
  const mechReport = analyzeDefeatDiagnostics({
    chapterId: 3,
    stageReached: 5,
    totalStages: 12,
    playerPowerRating: 9500,
    recommendedChapterPower: 9500,
    elapsedSeconds: 54,
    perfectDodges: 4,
    damageTakenCount: 2,
    castInterrupts: 1,
    bossGuardBreaks: 1,
    arenaMechanismsTriggered: 0,
  });
  assert.equal(mechReport.primaryCauseId, 'unused_mechanisms');
  assert.match(mechReport.primaryCauseTitle, /Tinh Thể Lục Bảo/);
  assert.match(mechReport.recommendations[0].detail, /hồi 14% HP/i);

  // Dodge timing report uses custom dash key label
  const dodgeReport = analyzeDefeatDiagnostics({
    chapterId: 2,
    stageReached: 3,
    totalStages: 12,
    playerPowerRating: 4200,
    recommendedChapterPower: 4200,
    elapsedSeconds: 40,
    perfectDodges: 0,
    damageTakenCount: 7,
    castInterrupts: 1,
    bossGuardBreaks: 0,
    arenaMechanismsTriggered: 1,
    combatKeybinds: customKeys,
  });
  assert.equal(dodgeReport.primaryCauseId, 'dodge_timing');
  assert.match(dodgeReport.primaryCauseSummary, /\[SHIFT\]/i);

  // Verify all 12 chapters produce valid distinct Boss signature labels
  const uniqueBossLabels = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const r = analyzeDefeatDiagnostics({
      chapterId: ch,
      stageReached: 12,
      totalStages: 12,
      playerPowerRating: 10000,
      recommendedChapterPower: 10000,
      elapsedSeconds: 60,
      perfectDodges: 2,
      damageTakenCount: 3,
      castInterrupts: 0,
      bossGuardBreaks: 0,
      arenaMechanismsTriggered: 1,
    });
    uniqueBossLabels.add(r.bossSignatureLabel);
  }
  assert.equal(uniqueBossLabels.size, 12, 'All 12 Zodiac chapters should expose unique Boss signature labels');
});
