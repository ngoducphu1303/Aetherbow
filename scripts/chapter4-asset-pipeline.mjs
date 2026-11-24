import path from 'node:path';
import {
  DELL_E5430_LITE_PROFILE,
  HIGH_QUALITY_PROFILE,
  inspectGlbBuffer,
  inspectGlbFile,
  syncChapter3ManifestEntries,
  validateAssetVariant,
  validateChapter3Pack,
} from './chapter3-asset-pipeline.mjs';

export {
  DELL_E5430_LITE_PROFILE,
  HIGH_QUALITY_PROFILE,
  inspectGlbBuffer,
  inspectGlbFile,
  validateAssetVariant,
};

export const CHAPTER4_RUNTIME_REL_DIR = 'public/assets/Chương 4/Runtime';

export const CHAPTER4_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1KlOq3VRzPmmKdbMu88NXccuNB2DYJd7I?usp=sharing';

export const CHAPTER4_ASSET_SPECS = Object.freeze([
  {
    id: 'gemini-arena',
    role: 'arena',
    match: '01_Dau_Truong_Song_Tu_Gemini_Arena.glb',
    driveGlbId: '1lkzaVN7eXQlYNU1K9yPnsMuVFrarJVxJ',
    drivePngId: '1lkH_v1dAXoTxm-tAe7vxf4m4mpN9Uy5R',
    highTris: 60_000,
    highMaxTris: 81_000,
    liteTris: 28_000,
    liteMaxTris: 37_800,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 4.5 * 1024 * 1024,
    liteMaxBytes: 2.2 * 1024 * 1024,
    isArena: true,
  },
  {
    id: 'than-vuong-song-tu',
    role: 'boss',
    match: '02_Boss_Chinh_Than_Vuong_Song_Tu_Dual_Gemini_God_King.glb',
    driveGlbId: '1Kd_kE5yZP2uVjlHSnlgOFMWTiz1Qw6Pk',
    drivePngId: '14uTpSURHNIorWR53EjLeDTCaQBsZa56E',
    highTris: 24_000,
    highMaxTris: 32_400,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'song-thu-canh-gio',
    role: 'subboss',
    match: '03_Boss_Phu_Song_Thu_Canh_Gio_Twin_Headed_Wind_Beast.glb',
    driveGlbId: '1U1MucY15pgGFRMWotetIPUfYA6637WuS',
    drivePngId: '11QfCxaqLuBwl-cFfp0jVckoktWs6c_9V',
    highTris: 20_000,
    highMaxTris: 27_000,
    liteTris: 7_000,
    liteMaxTris: 9_450,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'linh-mieu-ung-gio',
    role: 'mob',
    match: '04_Quai_1_Linh_Mieu_Ung_Gio_Phantom_Wind_Lynx.glb',
    driveGlbId: '1vDdS5WGWFAyxtVJGs-8NqzFrwrcIe_C6',
    drivePngId: '1WlY0HSDaD4em7qwpSdmNysILqd68zZVa',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 've-binh-guong-song-sinh',
    role: 'mob',
    match: '05_Quai_2_Ve_Binh_Guong_Song_Sinh_Twin_Mirror_Sentinel.glb',
    driveGlbId: '1zJMFYR46eoKq0gtyvGbiNED6-Y8QJymu',
    drivePngId: '1Ht3Ge2j3mgCFW_ZJ8ESEX7FBQAyWj-ck',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'linh-hon-mat-na-song-sinh',
    role: 'mob',
    match: '06_Quai_3_Linh_Hon_Mat_Na_Song_Sinh_Twin_Mask_Spirit.glb',
    driveGlbId: '1QcvcUZ5Q6KP_fxsm7ffcU-ZMUN3G2l4k',
    drivePngId: '1zqr5_7M4DJ7_0IlHwCZY5KHG_7TWog3p',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'chien-binh-song-dao-phong-anh',
    role: 'mob',
    match: '07_Quai_4_Chien_Binh_Song_Dao_Phong_Anh_Wind_Shadow_Warrior.glb',
    driveGlbId: '1iojz3XpaF6AFSLq9HBH6dqMF-FDN6BB6',
    drivePngId: '1JIz9QwQ5SyoRW4u93hsyHz8RQHMWVDlD',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'celeste',
    role: 'hero',
    match: '08_Nu_Chinh_Song_Tu_Gemini_Heroine.glb',
    driveGlbId: '1xQEA_d4qryLv8PopdnKV24KpS52GAzqq',
    drivePngId: '1DXbCyESiiHJr6BuYqX5qgSET9G2KULSQ',
    highTris: 25_000,
    highMaxTris: 33_750,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'astral-mirror-queen',
    role: 'skin',
    match: '14_Trang_Phuc_Nu_Hoang_Guong_Tinh_Tu_Astral_Mirror_Queen_APose.glb',
    driveGlbId: '1QF6XMpIZIsTMBK344ozut1NQreeR7Ml3',
    drivePngId: '1_tSeKHAKrDDGc5c8y4g0abMwbbNXntGG',
    highTris: 25_000,
    highMaxTris: 33_750,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'twin-astral-spirits',
    role: 'companion',
    match: '09_Tinh_Linh_Cap_Song_Sinh_Twin_Astral_Spirits_Pet.glb',
    driveGlbId: '16Zcn_YSHPRvzcuodgyYmA01HYIJIaBwJ',
    drivePngId: '1p9RoMOM_J4kxQSpsQp9vOnFVxI7S9OYs',
    highTris: 11_000,
    highMaxTris: 14_850,
    liteTris: 4_500,
    liteMaxTris: 6_075,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'celestial-wind-mount',
    role: 'mount',
    match: '11_Thu_Cuoi_Thien_Ma_Gio_Tinh_Tu_Celestial_Wind_Mount.glb',
    driveGlbId: '1mkcA5pXJ30cP_mamIPEg07sT_DxjcsDV',
    drivePngId: '1ku7WFvCc9dXhatjAANgIAvZ_wegeT_NT',
    highTris: 20_000,
    highMaxTris: 27_000,
    liteTris: 7_500,
    liteMaxTris: 10_125,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 2.8 * 1024 * 1024,
    liteMaxBytes: 850 * 1024,
  },
  {
    id: 'dual-gemini-wings',
    role: 'accessory',
    match: '10_Canh_Song_Tu_Nhi_Nguyen_Dual_Gemini_Wings.glb',
    driveGlbId: '19tSW91qiZmlfy-LvvfvsBfDMfc2VbQ9T',
    drivePngId: '1An9Te1EQ8G5iv_0gmVI3d5p6XT3yIHYX',
    highTris: 11_000,
    highMaxTris: 14_850,
    liteTris: 4_500,
    liteMaxTris: 6_075,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'twin-hourglass-relic',
    role: 'accessory',
    match: '12_Thanh_Khi_Dong_Ho_Cat_Guong_Thien_Ha_Twin_Hourglass_Relic.glb',
    driveGlbId: '1jYyNZmnewptZGlDMbiHfPLow0G0q9c8W',
    drivePngId: '1NZzmUrX_EJD9TvkP6Gpx-ddpflgWe4c8',
    highTris: 10_000,
    highMaxTris: 13_500,
    liteTris: 4_000,
    liteMaxTris: 5_400,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.6 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'gemini-halo',
    role: 'accessory',
    match: '13_Hao_Quang_Phap_Tran_Song_Tu_Gemini_Halo_VFX.glb',
    driveGlbId: '1iMzv9gZsk821iNtHpHAbffXqBt27Lynf',
    drivePngId: '1LvEbxqpRS4MdV_V_rbzu209mSfK-OCxF',
    highTris: 10_000,
    highMaxTris: 13_500,
    liteTris: 4_000,
    liteMaxTris: 5_400,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.6 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
]);

export function buildDriveDownloadUrl(fileId) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

export function validateChapter4Pack(variantEntries, tierFilter = 'both') {
  return validateChapter3Pack(variantEntries, tierFilter);
}

export function syncChapter4ManifestEntries(manifestObj, fileEntries) {
  return syncChapter3ManifestEntries(manifestObj, fileEntries);
}

export function parseChapter4CliArgs(argv) {
  const options = {
    verifyOnly: false,
    dryRun: false,
    tier: 'both',
    sourceDir: null,
    outDir: path.resolve(process.cwd(), CHAPTER4_RUNTIME_REL_DIR),
    reportPath: '/tmp/ch4-geometry-report.json',
    updateManifest: false,
    keepRaw: false,
    skipPortraits: false,
    skipExisting: false,
    concurrency: 1,
    help: false,
    ids: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--verify' || arg === '--check') {
      options.verifyOnly = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--update-manifest') {
      options.updateManifest = true;
    } else if (arg === '--keep-raw') {
      options.keepRaw = true;
    } else if (arg === '--skip-portraits') {
      options.skipPortraits = true;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === '--concurrency') {
      const value = Number.parseInt(argv[i + 1] ?? '', 10);
      if (!Number.isFinite(value) || value < 1 || value > 6) {
        throw new Error(`Invalid --concurrency value "${argv[i + 1] ?? ''}". Expected 1..6.`);
      }
      options.concurrency = value;
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--tier') {
      const value = argv[i + 1];
      if (!value || !['both', 'high', 'lite'].includes(value)) {
        throw new Error(`Invalid --tier value "${value ?? ''}". Expected: both | high | lite.`);
      }
      options.tier = value;
      i += 1;
    } else if (arg === '--source-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --source-dir.');
      options.sourceDir = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--out-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --out-dir.');
      options.outDir = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--report') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --report.');
      options.reportPath = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--only') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing asset ID(s) after --only.');
      for (const id of value.split(',').map((s) => s.trim()).filter(Boolean)) {
        options.ids.push(id);
      }
      i += 1;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.ids.push(arg);
    }
  }

  return options;
}

export function resolveSelectedChapter4Specs(ids) {
  if (!ids || ids.length === 0) return [...CHAPTER4_ASSET_SPECS];
  const known = new Map(CHAPTER4_ASSET_SPECS.map((s) => [s.id, s]));
  const selected = [];
  for (const id of ids) {
    const spec = known.get(id);
    if (!spec) {
      throw new Error(
        `Unknown Chapter 4 asset ID "${id}". Valid IDs: ${CHAPTER4_ASSET_SPECS.map((s) => s.id).join(', ')}`
      );
    }
    if (!selected.includes(spec)) selected.push(spec);
  }
  return selected;
}
