import test from 'node:test';
import assert from 'node:assert/strict';

function makeValidGlbBytes(totalLength = 24) {
  const buf = new ArrayBuffer(totalLength);
  const view = new DataView(buf);
  view.setUint32(0, 0x46546c67, true); // 'glTF' magic
  view.setUint32(4, 2, true); // GLB version 2
  view.setUint32(8, totalLength, true); // exact total byteLength
  return new Uint8Array(buf);
}

test('ModelAssets: tracks per-file progress and retries a single failed GLB without re-downloading healthy files', async () => {
  const prevDoc = globalThis.document;
  const prevFetch = globalThis.fetch;

  globalThis.document = { baseURI: 'http://127.0.0.1:3000/' };

  const fetchCounts = new Map();
  let dragonShouldFail = true;
  const validGlb = makeValidGlbBytes(24);

  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCounts.set(href, (fetchCounts.get(href) ?? 0) + 1);

    if (href.includes('dragon.glb') && dragonShouldFail) {
      return new Response('server error', { status: 500 });
    }

    // Stream two chunks to verify incremental byte-level progress updates
    const chunkA = validGlb.slice(0, 12);
    const chunkB = validGlb.slice(12);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunkA);
        setTimeout(() => {
          controller.enqueue(chunkB);
          controller.close();
        }, 15);
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { 'content-length': String(validGlb.byteLength), 'content-type': 'model/gltf-binary' },
    });
  };

  try {
    const mod = await import('../src/engine/modelAssets.ts');
    const seenSnapshots = [];
    const unsubscribe = mod.subscribeToModelDownloads(() => {
      seenSnapshots.push(mod.getModelDownloadProgress());
    });

    mod.preloadGameModels();

    // Wait for initial batch (hero succeeds, dragon fails with HTTP 500)
    await new Promise((r) => setTimeout(r, 90));

    const snapAfterFail = mod.getModelDownloadProgress();
    assert.equal(snapAfterFail.status, 'error');
    assert.equal(snapAfterFail.completed, 1);
    assert.equal(snapAfterFail.total, 2);

    const heroFile = snapAfterFail.files.find((f) => f.path === 'heroes/golden-dress-girl.glb');
    const dragonFile = snapAfterFail.files.find((f) => f.path === 'mounts/dragon.glb');
    assert.equal(heroFile?.status, 'ready');
    assert.equal(heroFile?.percent, 100);
    assert.equal(dragonFile?.status, 'error');
    assert.match(dragonFile?.error ?? '', /500/);

    // Now flip dragon to healthy and retry ONLY the failed file
    dragonShouldFail = false;
    const retriedBuf = await mod.retryModelDownload('mounts/dragon.glb');
    assert.equal(retriedBuf.byteLength, 24);

    const snapReady = mod.getModelDownloadProgress();
    assert.equal(snapReady.status, 'ready');
    assert.equal(snapReady.percent, 100);
    assert.equal(snapReady.completed, 2);
    assert.ok(snapReady.files.every((f) => f.status === 'ready' && f.percent === 100));

    // Confirm hero GLB was fetched strictly ONCE (never re-downloaded during single-file retry)
    const heroEntry = [...fetchCounts.entries()].find(([u]) => u.includes('golden-dress-girl.glb'));
    const dragonEntry = [...fetchCounts.entries()].find(([u]) => u.includes('dragon.glb'));
    assert.equal(heroEntry?.[1], 1, 'Healthy hero model must not be re-downloaded on dragon retry');
    assert.equal(dragonEntry?.[1], 2, 'Failed dragon model should be fetched twice (initial + retry)');
    assert.ok(seenSnapshots.length >= 2, 'Progress snapshots should stream incrementally');

    unsubscribe();
  } finally {
    globalThis.document = prevDoc;
    globalThis.fetch = prevFetch;
  }
});
