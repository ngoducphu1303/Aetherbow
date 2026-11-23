import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';
import { processAsset } from './build-chapter1-roster-variants.mjs';

const root = 'public/assets/Chương 2';
const assets = [
  ['aries-arena', '01_Dau_Truong/Aries War-Forge Arena.glb', 60_000, 30_000],
  ['kratos-aries', '02_Boss/1. Boss chính/Kratos-Aries.glb', 24_000, 9_000],
  ['cinderhorn', '02_Boss/2. Boss phụ/Cinderhorn.glb', 20_000, 7_000],
  ['magma-ram', '03_Quai_Vat/1. Magma Ram Charger.glb', 12_000, 4_800],
  ['obsidian-golem', '03_Quai_Vat/2. Obsidian Horned Golem.glb', 12_000, 4_800],
  ['crimson-spirit', '03_Quai_Vat/3. Crimson Mars Flame Spirit.glb', 12_000, 4_800],
  ['aries-berserker', '03_Quai_Vat/4. Aries Flame Berserker.glb', 12_000, 4_800],
  ['bellona', '04_Nu_Chinh/Bellona.glb', 25_000, 9_000],
  ['pyro', '05_Trang_Bi_Ngoai_Trang/1. Tinh linh/Pyro.glb', 11_000, 4_500],
  ['crimson-ram-wings', '05_Trang_Bi_Ngoai_Trang/2. Cánh/Wings of the Crimson Ram.glb', 11_000, 4_500],
  ['vulcan', '05_Trang_Bi_Ngoai_Trang/3. Thú cưỡi/Vulcan.glb', 20_000, 7_500],
  ['war-horn', '05_Trang_Bi_Ngoai_Trang/4. Thánh khí/War-Horn of Mars.glb', 10_000, 4_000],
  ['aries-halo', '05_Trang_Bi_Ngoai_Trang/5. Hào quang/Halo of the Aries Vanguard.glb', 10_000, 4_000],
  ['golden-fleece', '06_Trang_Phuc/Golden Fleece Empress Regalia.glb', 25_000, 9_000],
];

await MeshoptSimplifier.ready;
for (const [id, source, highTris, liteTris] of assets) {
  if (process.argv.length > 2 && !process.argv.slice(2).includes(id)) continue;
  const outputDir = path.join(root, 'Runtime');
  mkdirSync(outputDir, { recursive: true });
  if (id !== 'aries-arena') {
    execFileSync('convert', [path.join(root, source.replace(/\.glb$/, '.png')),
      '-resize', '512x512>', '-strip', '-quality', '84', path.join(outputDir, `${id}.webp`)]);
  }
  await processAsset({
    id,
    skipLite: id === 'aries-arena',
    recoverAlbedo: id === 'crimson-spirit',
    sourcePath: path.join(root, source),
    outDir: outputDir,
    highFile: `${id}-high.glb`,
    liteFile: `${id}-lite.glb`,
    highTris,
    highMaxTris: Math.ceil(highTris * 1.35),
    liteTris,
    liteMaxTris: Math.ceil(liteTris * 1.35),
    highAlbedoSize: highTris >= 20_000 ? 1536 : 1024,
    highDataSize: 512,
    liteAlbedoSize: liteTris >= 9_000 ? 1024 : 512,
  });
}
