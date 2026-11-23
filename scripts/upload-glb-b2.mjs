import { spawnSync } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { closeSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const B2_ORIGIN = 'https://s3.us-east-005.backblazeb2.com';
const SIGNING_REGION = 'us-east-005';
const BUCKET = 'aetherbow-assets';
const GLB_CONTENT_TYPE = 'model/gltf-binary';
const CACHE_CONTROL = 'public, max-age=86400';
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const UPLOAD_CONCURRENCY = 2;
const CHECK_CONCURRENCY = 4;

const args = process.argv.slice(2);
const listOnly = args.includes('--list');
const checkOnly = args.includes('--check');
const forceNative = args.includes('--native');
const verifyCdn = args.includes('--verify-cdn');

function getFlagValue(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
  return value;
}

const rawPrefix = getFlagValue('--prefix');
const normalizedPrefix = rawPrefix
  ? rawPrefix
      .replaceAll('\\', '/')
      .replace(/^\/+/, '')
      .replace(/^public\//, '')
      .replace(/^assets\//, '')
  : undefined;

const allPaths = readdirSync('public/assets', { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.glb'))
  .map((entry) => `${entry.parentPath}/${entry.name}`.replaceAll('\\', '/'))
  .sort();

const paths = normalizedPrefix
  ? allPaths.filter((path) => path.slice('public/assets/'.length).startsWith(normalizedPrefix))
  : allPaths;

if (paths.length === 0) {
  throw new Error(
    normalizedPrefix
      ? `No local .glb files matched prefix "${normalizedPrefix}" under public/assets.`
      : 'No local .glb files found under public/assets. Run npm run sync:glb first.',
  );
}

const glbHeader = Buffer.alloc(12);
const files = [];
let totalBytes = 0;
for (const path of paths) {
  if (/[\r\n]/.test(path) || path.includes('..')) {
    throw new Error(`Unsafe GLB path: ${JSON.stringify(path)}`);
  }
  const size = statSync(path).size;
  const fd = openSync(path, 'r');
  try {
    const read = readSync(fd, glbHeader, 0, glbHeader.length, 0);
    if (
      read !== glbHeader.length ||
      size < 20 ||
      glbHeader.readUInt32LE(0) !== 0x46546c67 ||
      glbHeader.readUInt32LE(4) !== 2 ||
      glbHeader.readUInt32LE(8) !== size
    ) {
      throw new Error(`Invalid GLB: ${path}`);
    }
  } finally {
    closeSync(fd);
  }
  files.push({ localPath: path, objectKey: path.slice('public/'.length), size });
  totalBytes += size;
}

console.log(`${files.length} GLBs validated (${(totalBytes / 1e6).toFixed(2)} MB).`);
if (listOnly) process.exit(0);

const keyId = (process.env.B2_KEY_ID || process.env.B2_WRITE_KEY_ID || '').trim();
const applicationKey = (process.env.B2_APPLICATION_KEY || process.env.B2_WRITE_APPLICATION_KEY || '').trim();
if (!keyId || !applicationKey) {
  throw new Error('Set B2_KEY_ID and B2_APPLICATION_KEY through Settings -> Secrets (environment variables).');
}

function hasRclone() {
  if (forceNative) return false;
  const probe = spawnSync('rclone', ['version'], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

function encodeS3Segment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeS3Key(objectKey) {
  return objectKey.split('/').map(encodeS3Segment).join('/');
}

function hmacSha256(key, value) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function signS3Request(method, url, extraHeaders, payloadHash) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${SIGNING_REGION}/s3/aws4_request`;

  const headers = {
    ...extraHeaders,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const sortedNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedNames.map((name) => `${name}:${String(headers[name]).trim()}\n`).join('');
  const signedHeaders = sortedNames.join(';');
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const canonicalHash = createHash('sha256').update(canonicalRequest, 'utf8').digest('hex');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, canonicalHash].join('\n');

  const kDate = hmacSha256(Buffer.from(`AWS4${applicationKey}`, 'utf8'), dateStamp);
  const kRegion = hmacSha256(kDate, SIGNING_REGION);
  const kService = hmacSha256(kRegion, 's3');
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  const requestHeaders = new Headers();
  for (const name of sortedNames) {
    if (name !== 'host') requestHeaders.set(name, String(headers[name]));
  }
  requestHeaders.set(
    'authorization',
    `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  );
  return requestHeaders;
}

async function fetchWithRetry(url, init, label, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(120_000),
      });
      if (response.status >= 500 || response.status === 429) {
        await response.body?.cancel();
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        continue;
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError?.message ?? 'network error'}`);
}

async function headB2Object(objectKey) {
  const url = new URL(`/${BUCKET}/${encodeS3Key(objectKey)}`, B2_ORIGIN);
  const headers = signS3Request('HEAD', url, {}, EMPTY_SHA256);
  const response = await fetchWithRetry(url.href, { method: 'HEAD', headers }, `HEAD ${objectKey}`);
  await response.body?.cancel();
  if (response.status === 404) return { exists: false };
  if (!response.ok) {
    throw new Error(`B2 HEAD failed for ${objectKey} (HTTP ${response.status})`);
  }
  return {
    exists: true,
    size: Number(response.headers.get('content-length') ?? -1),
    etag: (response.headers.get('etag') ?? '').replaceAll('"', '').toLowerCase(),
  };
}

async function uploadB2Object(file) {
  const buffer = readFileSync(file.localPath);
  const md5Hex = createHash('md5').update(buffer).digest('hex');
  const md5Base64 = createHash('md5').update(buffer).digest('base64');
  const existing = await headB2Object(file.objectKey);
  if (existing.exists && existing.size === file.size && existing.etag === md5Hex) {
    return 'skipped';
  }

  const sha256Hex = createHash('sha256').update(buffer).digest('hex');
  const url = new URL(`/${BUCKET}/${encodeS3Key(file.objectKey)}`, B2_ORIGIN);
  const headers = signS3Request(
    'PUT',
    url,
    {
      'cache-control': CACHE_CONTROL,
      'content-length': String(file.size),
      'content-md5': md5Base64,
      'content-type': GLB_CONTENT_TYPE,
    },
    sha256Hex,
  );
  const response = await fetchWithRetry(url.href, { method: 'PUT', headers, body: buffer }, `PUT ${file.objectKey}`);
  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`B2 PUT failed for ${file.objectKey} (HTTP ${response.status})`);
  }
  return 'uploaded';
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const results = new Array(items.length);
  async function next() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

async function verifyCdnObjects() {
  const manifest = JSON.parse(readFileSync('scripts/glb-manifest.json', 'utf8'));
  const cdnBase = String(manifest.cdnBaseUrl || '').replace(/\/+$/, '');
  if (!cdnBase) return;
  await runPool(files, CHECK_CONCURRENCY, async (file) => {
    const cdnUrl = `${cdnBase}/${encodeS3Key(file.objectKey)}`;
    const response = await fetchWithRetry(cdnUrl, { method: 'HEAD' }, `CDN HEAD ${file.objectKey}`);
    await response.body?.cancel();
    const remoteSize = Number(response.headers.get('content-length') ?? -1);
    if (!response.ok || remoteSize !== file.size) {
      throw new Error(
        `CDN check failed for ${file.objectKey}: HTTP ${response.status}, size ${remoteSize} (expected ${file.size})`,
      );
    }
  });
  console.log(`CDN verified ${files.length} GLBs at ${cdnBase}.`);
}

if (hasRclone()) {
  const destination = `b2glb:${BUCKET}`;
  const env = {
    ...process.env,
    RCLONE_CONFIG_B2GLB_TYPE: 's3',
    RCLONE_CONFIG_B2GLB_PROVIDER: 'Other',
    RCLONE_CONFIG_B2GLB_ACCESS_KEY_ID: keyId,
    RCLONE_CONFIG_B2GLB_SECRET_ACCESS_KEY: applicationKey,
    RCLONE_CONFIG_B2GLB_ENDPOINT: B2_ORIGIN,
    RCLONE_CONFIG_B2GLB_REGION: SIGNING_REGION,
  };
  const input = files.map((file) => file.objectKey).join('\n') + '\n';

  function rclone(command, options) {
    const result = spawnSync(
      'rclone',
      [command, 'public', destination, '--files-from-raw', '-', '--s3-no-check-bucket', '--s3-force-path-style', ...options],
      { env, input, stdio: ['pipe', 'inherit', 'inherit'] },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }

  if (!checkOnly) {
    rclone('copy', [
      '--checksum',
      '--transfers',
      String(UPLOAD_CONCURRENCY),
      '--s3-upload-concurrency',
      String(UPLOAD_CONCURRENCY),
      '--s3-upload-cutoff',
      '5Mi',
      '--s3-chunk-size',
      '5Mi',
      '--metadata-set',
      `content-type=${GLB_CONTENT_TYPE}`,
      '--metadata-set',
      `cache-control=${CACHE_CONTROL}`,
      '--stats',
      '15s',
    ]);
  }
  rclone('check', ['--one-way', '--checkers', String(CHECK_CONCURRENCY)]);
} else {
  if (!checkOnly) {
    let uploaded = 0;
    let skipped = 0;
    await runPool(files, UPLOAD_CONCURRENCY, async (file, index) => {
      const outcome = await uploadB2Object(file);
      if (outcome === 'uploaded') uploaded++;
      else skipped++;
      console.log(`[${index + 1}/${files.length}] ${outcome}: ${file.objectKey} (${(file.size / 1e6).toFixed(2)} MB)`);
    });
    console.log(`B2 upload complete: ${uploaded} uploaded, ${skipped} unchanged.`);
  }

  await runPool(files, CHECK_CONCURRENCY, async (file) => {
    const remote = await headB2Object(file.objectKey);
    if (!remote.exists || remote.size !== file.size) {
      throw new Error(
        `B2 verification failed for ${file.objectKey}: exists=${remote.exists}, remoteSize=${remote.size ?? 'none'}, expected=${file.size}`,
      );
    }
  });
  console.log(`B2 verified ${files.length} GLBs in bucket ${BUCKET}.`);
}

if (verifyCdn) {
  await verifyCdnObjects();
}
