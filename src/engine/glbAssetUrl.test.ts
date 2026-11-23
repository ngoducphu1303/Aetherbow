import assert from 'node:assert/strict';
import test from 'node:test';
import { getGlbAssetUrl, parseGlbCdnBase } from './glbAssetUrl';

test('GLB URLs preserve the object key, version and CDN prefix', () => {
  const segments = ['assets', 'Chương 1', 'Map mới', 'Chương 1.glb'];
  const cdn = parseGlbCdnBase('https://cdn.example.org/game');
  const cdnUrl = getGlbAssetUrl(segments, 2, '/preview/', 'https://game.example.org/', cdn);
  assert.equal(cdnUrl.origin, 'https://cdn.example.org');
  assert.equal(decodeURIComponent(cdnUrl.pathname), '/game/assets/Chương 1/Map mới/Chương 1.glb');
  assert.equal(cdnUrl.search, '?v=2');

  const local = getGlbAssetUrl(segments, 2, '/preview', 'https://game.example.org/');
  assert.equal(local.origin, 'https://game.example.org');
  assert.equal(decodeURIComponent(local.pathname), '/preview/assets/Chương 1/Map mới/Chương 1.glb');
  assert.throws(() => parseGlbCdnBase('https://key:secret@cdn.example.org'));
});
