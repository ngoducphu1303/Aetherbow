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
    list({ prefix, end, reverse, limit }) {
      const keys = [...entries.keys()].filter((key) => key.startsWith(prefix) && (!end || key < end)).sort();
      if (reverse) keys.reverse();
      return new Map(keys.slice(0, limit).map((key) => [key, structuredClone(entries.get(key))]));
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

test('new assets use chapter and group folders and stay outside the published model catalog', async (t) => {
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
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'www.googleapis.com') return Response.json({keys:[publicKey]});
    assert.equal(url.hostname, 's3.us-east-005.backblazeb2.com');
    const pathname = decodeURIComponent(url.pathname);
    assert.match(pathname, /^\/aetherbow-assets\/assets\/Chương 3\/Asset mới\/Bản đồ\/[a-f0-9-]{36}\/Hỏa Sơn thử\.glb$/);
    if (options.method === 'GET') return new Response(saved.get(pathname), { status: saved.has(pathname) ? 200 : 404 });
    const bytes = Buffer.from(await new Response(options.body).arrayBuffer());
    assert.deepEqual(bytes, glb);
    saved.set(pathname, bytes);
    return new Response(null, { status: 200 });
  });

  const send = (query, method = 'GET', payload) => worker.fetch(new Request(
    cdn + '/__admin/inbox?' + new URLSearchParams(query),
    { method, body: payload, headers: { Authorization: 'Bearer ' + token(), 'X-GLB-Size': String(glb.length) } },
  ), env);
  const parameters = { chapter: '3', group: 'map', name: 'Hỏa Sơn thử.glb' };
  assert.equal((await worker.fetch(new Request(cdn + '/__admin/inbox?chapter=3'), env)).status, 401);
  assert.equal((await send({ ...parameters, chapter: '13' }, 'PUT', glb)).status, 400);
  assert.equal((await send({ ...parameters, group: 'prototype' }, 'PUT', glb)).status, 400);
  assert.equal((await send({ ...parameters, name: '../test.glb' }, 'PUT', glb)).status, 400);
  assert.equal((await send({ ...parameters, name: 'folder\\test.glb' }, 'PUT', glb)).status, 400);
  assert.equal((await send({ ...parameters, name: 'test.zip' }, 'PUT', glb)).status, 400);
  assert.equal((await send(parameters, 'PUT', Buffer.alloc(glb.length))).status, 400);
  assert.equal(saved.size, 0);

  const first = await send(parameters, 'PUT', glb);
  assert.equal(first.status, 201);
  const entry = await first.json();
  assert.equal(entry.name, parameters.name);
  assert.equal(entry.chapter, 3);
  assert.equal(entry.size, glb.length);
  assert.ok(entry.path.includes(entry.id));
  const duplicate = await send(parameters, 'PUT', glb);
  assert.equal(duplicate.status, 201);
  assert.notEqual((await duplicate.json()).path, entry.path);
  assert.deepEqual((await (await send({chapter:'2'})).json()).files, []);
  const list = await (await send({ chapter: '3' })).json();
  assert.equal(list.files.length, 2);
  assert.equal(list.nextCursor, null);
  const served = await worker.fetch(new Request(cdn + entry.path), env, {});
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), glb);
  const versions = await worker.fetch(new Request(cdn + '/__asset-versions'), env);
  assert.deepEqual(await versions.json(), {});
});

test('inbox returns a stable chapter-scoped cursor for more than 50 uploads', async () => {
  const binding = catalogBinding();
  const stub = binding.get();
  for (let i = 0; i < 52; i += 1) {
    const id = '74f3d7ae-8c56-4ad9-9bee-' + String(i).padStart(12, '0');
    await stub.fetch('https://catalog.internal/inbox', {
      method: 'POST',
      body: JSON.stringify({ id, chapter: 3, uploadedAt: new Date(i).toISOString() }),
    });
  }
  const env = { FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: binding };
  const headers = { Authorization: 'Bearer ' + token() };
  const first = await worker.fetch(new Request(cdn + '/__admin/inbox?chapter=3', { headers }), env);
  const result = await first.json();
  assert.equal(result.files.length, 50);
  assert.ok(result.nextCursor);
  const second = await worker.fetch(new Request(cdn + '/__admin/inbox?' + new URLSearchParams({ chapter: '3', cursor: result.nextCursor }), { headers }), env);
  const remainder = await second.json();
  assert.equal(remainder.files.length, 2);
  assert.equal(remainder.nextCursor, null);
  const invalidCursor = await worker.fetch(new Request(cdn + '/__admin/inbox?' + new URLSearchParams({ chapter: '4', cursor: result.nextCursor }), { headers }), env);
  assert.equal(invalidCursor.status, 400);
});

test('multipart inbox upload retries a part and finalizes idempotently after a lost completion response', async (t) => {
  const partSize = 6 * 1024 * 1024;
  const glb = Buffer.alloc(partSize + 24);
  model().copy(glb);
  glb.writeUInt32LE(glb.length, 8);
  const saved = [];
  let committed = false;
  let starts = 0;
  const original = globalThis.FixedLengthStream;
  globalThis.FixedLengthStream = class extends TransformStream { constructor() { super(); } };
  t.after(() => { globalThis.FixedLengthStream = original; });
  const env = {
    FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: catalogBinding(),
    B2_WRITE_KEY_ID: 'write-id', B2_WRITE_APPLICATION_KEY: 'write-secret',
  };
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'www.googleapis.com') return Response.json({ keys: [publicKey] });
    assert.equal(url.hostname, 's3.us-east-005.backblazeb2.com');
    if (options.method === 'HEAD') {
      return new Response(null, { status: committed ? 200 : 404, headers: { 'content-length': String(glb.length) } });
    }
    if (url.searchParams.has('uploads')) {
      starts++;
      return new Response('<InitiateMultipartUploadResult><UploadId>b2-id+/=</UploadId></InitiateMultipartUploadResult>');
    }
    assert.equal(url.searchParams.get('uploadId'), 'b2-id+/=');
    if (options.method === 'PUT') {
      const part = Number(url.searchParams.get('partNumber'));
      const bytes = Buffer.from(await new Response(options.body).arrayBuffer());
      assert.deepEqual(bytes, glb.subarray((part - 1) * partSize, part * partSize));
      saved.push(part);
      if (part === 2 && saved.filter((index) => index === 2).length === 1) throw new Error('simulated network reset');
      return new Response(null, { headers: { etag: '"' + String(part).repeat(32) + '"' } });
    }
    assert.match(options.body, /<PartNumber>1<\/PartNumber><ETag>"1{32}"<\/ETag>/);
    assert.match(options.body, /<PartNumber>2<\/PartNumber><ETag>"2{32}"<\/ETag>/);
    committed = true;
    throw new Error('completion response lost');
  });
  const id = '74f3d7ae-8c56-4ad9-9bee-000000000001';
  const send = (action, query, method, body, headers = {}) => worker.fetch(new Request(
    cdn + '/__admin/inbox-upload/' + action + '?' + new URLSearchParams({ ...query, id }),
    { method, body, headers: { Authorization: 'Bearer ' + token(), Origin: adminOrigin, ...headers } }
  ), env);
  const start = { chapter: '3', group: 'enemy', name: 'quai-thu.glb', size: String(glb.length) };
  for (let i = 0; i < 2; i++) {
    const response = await send('start', start, 'POST');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { partSize, completed: null });
  }
  assert.equal(starts, 1);
  assert.equal((await send('start', { ...start, name: 'khac.glb' }, 'POST')).status, 409);
  const put = (part) => {
    const body = glb.subarray((part - 1) * partSize, part * partSize);
    return send('part', { part: String(part) }, 'PUT', body, { 'x-glb-size': String(body.length) });
  };
  assert.equal((await put(1)).status, 200);
  const failure = await put(2);
  assert.equal(failure.status, 502);
  assert.equal(failure.headers.get('access-control-allow-origin'), adminOrigin);
  assert.equal((await put(2)).status, 200);
  const finish = await send('finish', {}, 'POST', JSON.stringify({ etags: ['1'.repeat(32), '2'.repeat(32)] }));
  assert.equal(finish.status, 201);
  const record = await finish.json();
  assert.equal(record.id, id);
  assert.equal(record.size, glb.length);
  assert.equal(record.b2Id, undefined);
  assert.deepEqual(await (await send('finish', {}, 'POST', '{}')).json(), record);
  assert.deepEqual((await (await send('start', start, 'POST')).json()).completed, record);
  assert.deepEqual(saved, [1, 2, 2]);
});

test('puugoo earns admin only after Google verifies the matching password account UID', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ keys:[publicKey] }));
  const env = { FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: catalogBinding() };
  const verifiedNow = Math.floor(Date.now() / 1000);
  const own = { email: 'puugoo@artemis3d.player', sub: 'puugoo-real-uid', email_verified:false,
    firebase: { sign_in_provider:'password' } };
  const call = (route, bearer, passwordToken) => worker.fetch(new Request(cdn+'/__admin/'+route, {
    method: passwordToken ? 'POST' : 'GET',
    headers: { Authorization:'Bearer '+bearer, Origin:adminOrigin },
    body: passwordToken ? JSON.stringify({passwordToken}) : undefined,
  }), env);
  const session = token(own);
  assert.equal((await call('session', session)).status, 403);
  assert.equal((await call('password-account', session, session)).status, 403);
  const owner = token();
  assert.deepEqual(await (await call('session', owner)).json(), {
    allowed:true, canLinkPassword:true, passwordLinked:false,
  });
  assert.equal((await call('password-account', token({auth_time:verifiedNow-301}), session)).status, 403);
  assert.equal((await call('password-account', owner, token({...own, auth_time:verifiedNow-301}))).status, 403);
  assert.equal((await call('password-account', owner, token({...own,email:'not-puugoo@artemis3d.player'}))).status, 403);
  assert.equal((await call('password-account', owner, token({...own,firebase:{sign_in_provider:'google.com'}}))).status, 403);
  for (let retry = 0; retry < 2; retry++) {
    assert.equal((await call('password-account', owner, session)).status, 200);
  }
  assert.deepEqual(await (await call('session', session)).json(), {
    allowed:true, canLinkPassword:false, passwordLinked:true,
  });
  assert.equal((await call('session', token({...own,sub:'new-account-same-name'}))).status, 403);
  assert.equal((await call('password-account', owner, token({...own,sub:'different'}))).status, 409);
});

test('both upload flows accept 120 MB and multipart replacements remain drafts', async (t) => {
  let contentLength = 120_000_000;
  const b2Paths = [];
  const env = { FIREBASE_PROJECT_ID: project, ADMIN_GOOGLE_EMAIL: email, ASSET_CATALOG: catalogBinding(),
    B2_WRITE_KEY_ID:'write-id', B2_WRITE_APPLICATION_KEY:'write-secret' };
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    const url = new URL(input);
    if (url.hostname === 'www.googleapis.com') return Response.json({keys:[publicKey]});
    if (options.method === 'HEAD') return new Response(null,{headers:{'content-length':String(contentLength)}});
    b2Paths.push(decodeURIComponent(url.pathname));
    if (url.searchParams.has('uploads')) return new Response('<UploadId>test-large-file</UploadId>');
    assert.match(options.body, /<CompleteMultipartUpload>/);
    assert.equal((options.body.match(/<PartNumber>/g) ?? []).length,20);
    return new Response('<CompleteMultipartUploadResult/>');
  });
  const auth = { Authorization: 'Bearer ' + token(), Origin: adminOrigin };
  const browserCall = (route, params, body) => worker.fetch(new Request(cdn+'/__admin/'+route+'?'+new URLSearchParams(params), {
    method:body ? 'POST' : 'GET', body:body ? JSON.stringify(body):undefined, headers:auth,
  }),env);
  const id = '74f3d7ae-8c56-4ad9-9bee-000000000003';
  for (const [route, query] of [
    ['model-upload', {path}],
    ['inbox-upload', {chapter:'3',group:'map',name:'size-test.glb'}],
  ]) {
    assert.equal((await browserCall(route+'/start',{...query,id,size:String(contentLength+1)},{})).status,413);
  }
  assert.equal((await browserCall('model-upload/start',{path,id,size:String(contentLength)},{})).status,200);
  const input = {chapter:'3',group:'map',name:'size-test.glb',size:String(contentLength),
    id:'74f3d7ae-8c56-4ad9-9bee-000000000004'};
  assert.equal((await browserCall('inbox-upload/start',input,{})).status,200);
  const finished = await browserCall('model-upload/finish',{id},{etags:Array(20).fill('a'.repeat(32))});
  assert.equal(finished.status,201);
  assert.equal((await finished.json()).size,contentLength);
  assert.ok(b2Paths.some((value)=>value.includes('/.revisions/'+id)));
  const entry = await (await browserCall('entry',{path})).json();
  assert.equal(entry.active,null);
  assert.equal(entry.draft.id,id);
  assert.deepEqual((await (await browserCall('inbox',{chapter:'3'})).json()).files,[]);
});
