import { spawnSync } from 'node:child_process';
import { openSync, readSync, closeSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const paths = readdirSync('public/assets', { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.glb'))
  .map((entry) => `${entry.parentPath}/${entry.name}`.replaceAll('\\', '/'))
  .sort();
if (paths.length === 0) throw new Error('No local .glb files found under public/assets. Run npm run sync:glb first.');

const glbHeader = Buffer.alloc(12);
let totalBytes = 0;
for (const path of paths) {
  if (/[\r\n]/.test(path)) throw new Error(`Cannot include filename in rclone list: ${JSON.stringify(path)}`);
  const size = statSync(path).size;
  const fd = openSync(path, 'r');
  try {
    const read = readSync(fd, glbHeader, 0, glbHeader.length, 0);
    if (read !== glbHeader.length || size < 20 || glbHeader.readUInt32LE(0) !== 0x46546c67 ||
        glbHeader.readUInt32LE(4) !== 2 || glbHeader.readUInt32LE(8) !== size) {
      throw new Error(`Invalid GLB: ${path}`);
    }
  } finally {
    closeSync(fd);
  }
  totalBytes += size;
}

console.log(`${paths.length} GLBs validated (${(totalBytes / 1e9).toFixed(2)} GB).`);
if (process.argv.includes('--list')) process.exit(0);

const { B2_KEY_ID, B2_APPLICATION_KEY } = process.env;
if (!B2_KEY_ID || !B2_APPLICATION_KEY) {
  throw new Error('Set B2_KEY_ID and B2_APPLICATION_KEY through the environment secret settings.');
}
const destination = 'b2glb:aetherbow-assets';
const env = {
  ...process.env,
  RCLONE_CONFIG_B2GLB_TYPE: 's3',
  RCLONE_CONFIG_B2GLB_PROVIDER: 'Other',
  RCLONE_CONFIG_B2GLB_ACCESS_KEY_ID: B2_KEY_ID,
  RCLONE_CONFIG_B2GLB_SECRET_ACCESS_KEY: B2_APPLICATION_KEY,
  RCLONE_CONFIG_B2GLB_ENDPOINT: 'https://s3.us-east-005.backblazeb2.com',
  RCLONE_CONFIG_B2GLB_REGION: 'us-east-005',
};
const input = paths.map((path) => path.slice('public/'.length)).join('\n') + '\n';

function rclone(command, options) {
  const result = spawnSync('rclone', [
    command, 'public', destination,
    '--files-from-raw', '-', '--s3-no-check-bucket', '--s3-force-path-style',
    ...options,
  ], { env, input, stdio: ['pipe', 'inherit', 'inherit'] });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.argv.includes('--check')) {
  rclone('copy', [
    '--checksum', '--transfers', '2', '--s3-upload-concurrency', '2',
    '--s3-upload-cutoff', '5Mi', '--s3-chunk-size', '5Mi',
    '--metadata-set', 'content-type=model/gltf-binary',
    '--metadata-set', 'cache-control=public, max-age=86400',
    '--stats', '15s',
  ]);
}
rclone('check', ['--one-way', '--checkers', '4']);
