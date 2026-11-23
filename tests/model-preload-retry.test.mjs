import test from 'node:test';
import assert from 'node:assert/strict';

test('Startup only preloads the selected map and retries it without requesting retired heroes', async () => {
  const prevDoc = globalThis.document;
  const prevFetch = globalThis.fetch;
  globalThis.document = { baseURI: 'http://127.0.0.1:3000/' };
  const requests = [];
  let mapShouldFail = true;
  const glb = new Uint8Array(24);
  const view = new DataView(glb.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, glb.length, true);
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    if (mapShouldFail) return new Response('server error', { status: 500 });
    return new Response(glb, {
      status: 200,
      headers: { 'content-length': String(glb.length), 'content-type': 'model/gltf-binary' },
    });
  };
  try {
    const models = await import('../src/engine/modelAssets.ts');
    models.setGlobalAssetPreloadMode({ liteMode: true, activeHeroId: 'artemis' });
    models.setChapter1MapPreloadVariant('lite');
    models.preloadGameModels();
    const map = models.CHAPTER1_MAP_MODEL_ASSET;
    await assert.rejects(models.downloadModel(map), /500/);
    const failed = models.getModelDownloadProgress();
    assert.equal(failed.status, 'error');
    assert.deepEqual(failed.files.map(({ path }) => path), [map]);

    mapShouldFail = false;
    const buffer = await models.retryModelDownload(map);
    assert.equal(buffer.byteLength, glb.length);
    assert.equal(models.getModelDownloadProgress().status, 'ready');
    models.preloadGameModels();
    await models.downloadModel(map);
    assert.equal(requests.length, 2);
    assert.equal(requests[0], requests[1]);
    assert.ok(!requests[0].includes('/heroes/'));

    models.setChapter1MapPreloadVariant('none');
    models.preloadGameModels();
    assert.deepEqual(models.getModelDownloadProgress(), {
      status: 'ready', percent: 100, completed: 0, total: 0, files: [],
    });
  } finally {
    globalThis.document = prevDoc;
    globalThis.fetch = prevFetch;
  }
});
