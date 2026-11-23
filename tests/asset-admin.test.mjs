import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';
import worker, { AssetCatalog } from '../workers/glb-cdn/index.mjs';

const adminOrigin = 'https://aetherbow.vercel.app';
const path = '/assets/Chương 2/Runtime/bellona-lite.glb';
const project = 'firebase-test';
const email = 'owner@example.org';
const cdn = 'https://test.example';
const projectKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = { ...projectKeys.publicKey.export({ format: 'jwk' }), kid: 'test-key' };

function token(overrides = {}, signingKey = projectKeys.privateKey) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: project, iss: 'https://securetoken.google.com/' + project, sub: 'owner-id', auth_time: now,
    exp: now + 900, iat: now, email, email_verified: true, firebase: { sign_in_provider: 'google.com' },
    ...overrides,
  };
  const body = encode({ alg: 'RS256', kid: 'test-key' }) + '.' + encode(claims);
  return body + '.' + sign('RSA-SHA256', Buffer.from(body), signingKey).toString('base64url');
}

function catalogBinding() {
  const entries = new Map();
  const storage = {
    get(key) {
      if (Array.isArray(key)) return new Map(key.filter((name) => entries.has(name)).map((name) => [name, structuredClone(entries.get(name))]));
      return structuredClone(entries.get(key));
    },
    put(value) { for (const [key, item] of Object.entries(value)) entries.set(key, structuredClone(item)); },
    delete(key) { entries.delete(key); },
    transaction(fn) { return fn(storage); },
  };
  const instance = new AssetCatalog({ storage });
  return { idFromName: (name) => name, get: () => ({ fetch: (url, options) => instance.fetch(new Request(url, options)) }) };
}

function model() {
  const json = Buffer.from('{"asset":{"version":"2.0"}} ');
  const glb = Buffer.alloc(20 + json.length);
  glb.write('glTF');
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(json.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  json.copy(glb, 20);
  return glb;
}

test('admin authorization validates Google identity, signature, project and origin', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.match(url, /^https:\/\/www.googleapis.com\//);
    return Response.json({ keys: [publicKey] }, { headers: { 'cache-control': 'max-age=0' } });
  });
  const env = { FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: catalogBinding() };
  const request = (credential, origin = adminOrigin) => new Request(cdn + '/__admin/session', {
    headers: { Origin: origin, ...(credential && { Authorization: 'Bearer ' + credential }) },
  });

  assert.equal((await worker.fetch(request())).status, 401);
  assert.equal((await worker.fetch(request(token(), 'https://other.example'), env)).status, 403);
  for (const claims of [
    {email: 'other@example.org'}, {email_verified:false}, {aud:'other-project'}, {exp:0}, {auth_time:undefined},
    {firebase:{sign_in_provider:'password'}},
  ]) {
    assert.equal((await worker.fetch(request(token(claims)), env)).status, 403);
  }
  const forged = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.equal((await worker.fetch(request(token({}, forged)), env)).status, 403);
  const allowed = await worker.fetch(request(token()), env);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), adminOrigin);
});

test('draft GLB can be previewed, published, and rolled back without replacing the canonical file', async (t) => {
  const glb = model();
  const saved = new Map();
  const original = globalThis.FixedLengthStream;
  globalThis.FixedLengthStream = class extends TransformStream { constructor() { super(); } };
  t.after(() => { globalThis.FixedLengthStream = original; });

  const env = {
    FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: catalogBinding(),
    B2_WRITE_KEY_ID: 'write-id', B2_WRITE_APPLICATION_KEY: 'write-secret',
    B2_READ_KEY_ID: 'read-id', B2_READ_APPLICATION_KEY: 'read-secret',
  };
  t.mock.method(globalThis, 'fetch', async (value, options) => {
    const url = new URL(value);
    if (url.hostname === 'www.googleapis.com') return Response.json({ keys: [publicKey] });
    assert.equal(url.hostname, 's3.us-east-005.backblazeb2.com');
    const pathname = decodeURIComponent(url.pathname);
    assert.match(pathname, /^\/aetherbow-assets\/assets\/\.revisions\//);
    if (options.method === 'PUT') {
      assert.equal(options.headers['content-length'], String(glb.length));
      assert.match(url.searchParams.get('X-Amz-Credential'), /^write-id\//);
      const bytes = Buffer.from(await new Response(options.body).arrayBuffer());
      assert.deepEqual(bytes, glb);
      saved.set(pathname, bytes);
      return new Response(null, { status: 200 });
    }
    assert.match(options.headers.get('authorization'), /^AWS4-HMAC-SHA256 Credential=read-id\//);
    return new Response(saved.get(pathname), { status: saved.has(pathname) ? 200 : 404 });
  });
  const call = (action, method = 'GET', body, headers = {}) => worker.fetch(new Request(
    cdn + '/__admin/' + action + '?path=' + encodeURIComponent(path),
    { method, body, duplex: 'half', headers: { Authorization: 'Bearer ' + token(), Origin: adminOrigin, ...headers } }
  ), env);
  const versions = async () => (await worker.fetch(new Request(cdn + '/__asset-versions'), env)).json();

  assert.deepEqual(await versions(), {});
  const invalid = await call('upload', 'PUT', Buffer.alloc(glb.length), { 'x-glb-size': String(glb.length) });
  assert.equal(invalid.status, 400);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(glb.subarray(0, 4)); controller.enqueue(glb.subarray(4)); controller.close(); } });
  const uploaded = await call('upload', 'PUT', stream, { 'x-glb-size': String(glb.length) });
  assert.equal(uploaded.status, 201);
  const revision = await uploaded.json();
  assert.equal((await (await call('entry')).json()).draft.id, revision.id);
  assert.deepEqual(await versions(), {});
  const preview = await worker.fetch(new Request(cdn + path + '?rev=' + revision.id), env, {});
  assert.deepEqual(Buffer.from(await preview.arrayBuffer()), glb);
  assert.equal((await call('publish', 'POST', JSON.stringify({ id: revision.id, expected: null }))).status, 200);
  assert.deepEqual(await versions(), { [path]:revision.id });
  assert.equal((await (await call('entry')).json()).draft, null);
  assert.equal((await call('rollback', 'POST', JSON.stringify({ expected: null }))).status, 409);
  assert.equal((await call('rollback', 'POST', JSON.stringify({ expected: revision.id }))).status, 200);
  assert.deepEqual(await versions(), {});
});
