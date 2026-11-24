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
  let mapShouldFail = true;
  const validGlb = makeValidGlbBytes(24);

  globalThis.fetch = async (url) => {
    const href = String(url);
    fetchCounts.set(href, (fetchCounts.get(href) ?? 0) + 1);

    const decodedPath = decodeURIComponent(new URL(href).pathname).toLowerCase();
    if (decodedPath.includes('chương 1') && mapShouldFail) {
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

    mod.setChapter1MapPreloadVariant('lite');
    mod.preloadGameModels();

    // Wait for the initial startup preload where Chapter 1 lite map fails with 500.
    await new Promise((r) => setTimeout(r, 90));

    const snapAfterFail = mod.getModelDownloadProgress();
    assert.equal(snapAfterFail.status, 'error');
    assert.equal(snapAfterFail.total, 1);
    assert.equal(snapAfterFail.completed, 0);

    const mapFile = snapAfterFail.files.find((f) => f.path === mod.CHAPTER1_MAP_MODEL_ASSET);
    assert.equal(mapFile?.status, 'error');
    assert.match(mapFile?.error ?? '', /500/);

    // Also load a healthy hero model once and ensure retrying the failed map never re-downloads it.
    const heroBuf = await mod.downloadModel('heroes/golden-dress-girl.glb');
    assert.equal(heroBuf.byteLength, 24);

    // Flip Chapter 1 map to healthy and retry ONLY the failed file
    mapShouldFail = false;
    const retriedBuf = await mod.retryModelDownload(mod.CHAPTER1_MAP_MODEL_ASSET);
    assert.equal(retriedBuf.byteLength, 24);

    const snapReady = mod.getModelDownloadProgress();
    assert.equal(snapReady.status, 'ready');
    assert.equal(snapReady.percent, 100);
    assert.equal(snapReady.completed, snapReady.total);
    assert.ok(snapReady.files.every((f) => f.status === 'ready' && f.percent === 100));

    // Confirm hero GLB was fetched strictly ONCE and failed map fetched twice (initial + retry)
    const heroEntry = [...fetchCounts.entries()].find(([u]) => u.includes('golden-dress-girl.glb'));
    const mapEntry = [...fetchCounts.entries()].find(([u]) =>
      decodeURIComponent(new URL(u).pathname).toLowerCase().includes('chương 1')
    );
    assert.equal(heroEntry?.[1], 1, 'Healthy hero model must not be re-downloaded on retry');
    assert.equal(mapEntry?.[1], 2, 'Failed model should be fetched twice (initial + retry)');
    assert.ok(seenSnapshots.length >= 2, 'Progress snapshots should stream incrementally');

    unsubscribe();
  } finally {
    globalThis.document = prevDoc;
    globalThis.fetch = prevFetch;
  }
});
