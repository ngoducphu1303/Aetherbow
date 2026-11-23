import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = new URL('./glb-manifest.json', import.meta.url);
const b2Origin = 'https://s3.us-east-005.backblazeb2.com';

async function inspectGlb(file) {
  const { size } = await stat(file);
  const header = Buffer.alloc(12);
  const descriptor = await open(file, 'r');
  try {
    const { bytesRead } = await descriptor.read(header);
    if (bytesRead !== header.length || size < 20 ||
        header.toString('ascii', 0, 4) !== 'glTF' || header.readUInt32LE(4) !== 2 ||
        header.readUInt32LE(8) !== size) throw new Error('Invalid GLB 2.0 file or size');
  } finally {
    await descriptor.close();
  }
  const hash = createHash('md5');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return { size, md5: hash.digest('base64') };
}

function githubToken() {
  try {
    const token = execFileSync('gh', ['auth', 'token', '--hostname', 'github.com'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (token) return token;
  } catch {
    // The caller can authenticate in the same terminal and try again.
  }
  throw new Error('Install GitHub CLI and sign in with: gh auth login --hostname github.com');
}

async function main() {
  if (process.argv.length !== 3 || process.argv.includes('--help')) {
    console.log('Usage: npm run upload:glb -- "public/assets/path/model.glb"');
    process.exitCode = process.argv.includes('--help') ? 0 : 1;
    return;
  }
  const publicRoot = resolve(root, 'public') + sep;
  const file = resolve(root, process.argv[2]);
  if (!file.startsWith(publicRoot + 'assets' + sep) || !/\.glb$/i.test(file)) {
    throw new Error('Choose a .glb file under public/assets');
  }
  const assetPath = file.slice(publicRoot.length).split(sep).join('/');
  const { size, md5 } = await inspectGlb(file);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const objectPath = assetPath.split('/').map(encodeURIComponent).join('/');
  const assetUrl = new URL(objectPath, manifest.cdnBaseUrl);
  const target = new URL('/__upload/' + objectPath, assetUrl.origin);

  const grantResponse = await fetch(target, {
    method: 'POST',
    headers: { authorization: `Bearer ${githubToken()}`, 'x-glb-size': String(size), 'x-glb-md5': md5 },
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  if (!grantResponse.ok) throw new Error(`Worker authorization failed (HTTP ${grantResponse.status}): ${(await grantResponse.text()).slice(0, 160)}`);
  const grant = await grantResponse.json();
  const uploadUrl = new URL(grant.url);
  if (uploadUrl.origin !== b2Origin || decodeURIComponent(uploadUrl.pathname) !== '/aetherbow-assets/' + assetPath ||
      !uploadUrl.searchParams.has('X-Amz-Signature') ||
      grant.headers['content-length'] !== String(size) || grant.headers['content-md5'] !== md5 ||
      grant.headers['content-type'] !== 'model/gltf-binary') {
    throw new Error('Worker returned an invalid upload grant');
  }

  // The signed URL is private and short-lived. Never print it or the GitHub token.
  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'PUT', headers: grant.headers, body: createReadStream(file), duplex: 'half',
      redirect: 'error', signal: AbortSignal.timeout(15 * 60_000),
    });
  } catch {
    throw new Error('Could not reach Backblaze to complete the upload');
  }
  if (!response.ok) {
    const code = (await response.text()).match(/<Code>([a-zA-Z]+)<\/Code>/)?.[1];
    throw new Error(`Backblaze upload failed (HTTP ${response.status}${code ? ', '+code : ''})`);
  }
  await response.body?.cancel();

  assetUrl.searchParams.set('v', String(Date.now()));
  const verification = await fetch(assetUrl, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!verification.ok || Number(verification.headers.get('content-length')) !== size) {
    throw new Error('Backblaze accepted the upload, but the CDN size could not be verified');
  }

  const path = 'public/' + assetPath;
  const entry = manifest.files.find((item) => item.path === path);
  console.log(`Uploaded and verified ${path} (${size} bytes).`);
  if (entry?.size !== size) console.log('Update the path and byte size in scripts/glb-manifest.json.');
  if (entry) console.log('If you replaced its contents, increment the model version in the game to refresh cached copies.');
}

main().catch((error) => {
  // Some fetch errors include the request URL in their cause. Log only controlled messages.
  console.error(error instanceof Error && error.name === 'Error' ? error.message : 'GLB upload failed.');
  process.exitCode = 1;
});
