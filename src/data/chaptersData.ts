import { ChapterDefinition, ChapterStageDef, EnemyKind, StageEventAfter } from '../types/game';

interface RawZodiacChapter {
  id: number;
  name: string;
  zodiacId: string;
  zodiacIcon: string;
  zodiacName: string;
  regionName: string;
  subtitle: string;
  bossName: string;
  floorPrimary: string;
  floorAccent: string;
  stoneHex: number;
  trimHex: number;
  skyHex: number;
  fogHex: number;
  keyLightHex: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hpScale: number;
  dmgScale: number;
  goldBonusMult: number;
  recommendedPower: number;
  subBossNames: [string, string];
  enemyFamily: [EnemyKind, EnemyKind, EnemyKind];
}

const RAW_ZODIAC_CHAPTERS: RawZodiacChapter[] = [
  {
    id: 1,
    name: 'Chương 1: Thánh Điện Nhật Luân',
    zodiacId: 'leo',
    zodiacIcon: '🦁',
    zodiacName: 'Sư Tử',
    regionName: 'Thánh Điện Nhật Luân',
    subtitle: 'Chòm sao Sư Tử thức giấc! Hạ gục Tướng Quân Hỏa Ngục Ares và đối đầu Sư Vương Thái Dương.',
    bossName: 'Sư Vương Thái Dương',
    floorPrimary: '#3f2412',
    floorAccent: '#d97706',
    stoneHex: 0x57361c,
    trimHex: 0xfbbf24,
    skyHex: 0x1a1109,
    fogHex: 0x24160c,
    keyLightHex: 0xffe4b8,
    hemiSkyHex: 0xfde68a,
    hemiGroundHex: 0x451a03,
    hpScale: 1.0,
    dmgScale: 1.0,
    goldBonusMult: 1.0,
    recommendedPower: 220,
    subBossNames: ['Ares · Tướng Quân Hỏa Ngục', 'Boreas · Tướng Quân Phong Băng'],
    enemyFamily: [EnemyKind.SKIRMISHER, EnemyKind.IMP_ARCHER, EnemyKind.DRAGON_WHELP],
  },
  {
    id: 2,
    name: 'Chương 2: Hỏa Sơn Sừng Đỏ',
    zodiacId: 'aries',
    zodiacIcon: '♈',
    zodiacName: 'Bạch Dương',
    regionName: 'Hỏa Sơn Sừng Đỏ',
    subtitle: 'Chòm sao Bạch Dương bùng cháy giữa nham thạch, nơi Hỏa Dương Chiến Vương ngự trị.',
    bossName: 'Hỏa Dương Chiến Vương',
    floorPrimary: '#381224',
    floorAccent: '#e11d48',
    stoneHex: 0x4c1d34,
    trimHex: 0xfb7185,
    skyHex: 0x180912,
    fogHex: 0x240c1a,
    keyLightHex: 0xffb3c1,
    hemiSkyHex: 0xfda4af,
    hemiGroundHex: 0x3b0722,
    hpScale: 1.45,
    dmgScale: 1.28,
    goldBonusMult: 1.35,
    recommendedPower: 350,
    subBossNames: ['Golem Dung Nham', 'Nữ Hoàng Nhện Độc'],
    enemyFamily: [EnemyKind.DRAGON_WHELP, EnemyKind.GOLEM, EnemyKind.IMP_ARCHER],
  },
  {
    id: 3,
    name: 'Chương 3: Thảo Nguyên Kim Giác',
    zodiacId: 'taurus',
    zodiacIcon: '🐂',
    zodiacName: 'Kim Ngưu',
    regionName: 'Thảo Nguyên Kim Giác',
    subtitle: 'Pháo đài đá xanh hoàng kim bảo vệ bởi Kim Ngưu Cự Thần đầy sức mạnh.',
    bossName: 'Kim Ngưu Cự Thần',
    floorPrimary: '#243018',
    floorAccent: '#84cc16',
    stoneHex: 0x364924,
    trimHex: 0xfbbf24,
    skyHex: 0x111a0b,
    fogHex: 0x18240f,
    keyLightHex: 0xecfccb,
    hemiSkyHex: 0xbef264,
    hemiGroundHex: 0x1a2e05,
    hpScale: 1.95,
    dmgScale: 1.55,
    goldBonusMult: 1.7,
    recommendedPower: 520,
    subBossNames: ['Vệ Binh Kim Ngưu', 'Đại Ma Vương Atreus'],
    enemyFamily: [EnemyKind.GOLEM, EnemyKind.SKIRMISHER, EnemyKind.WISP],
  },
  {
    id: 4,
    name: 'Chương 4: Song Thành Ảo Ảnh',
    zodiacId: 'gemini',
    zodiacIcon: '🎭',
    zodiacName: 'Song Tử',
    regionName: 'Song Thành Ảo Ảnh',
    subtitle: 'Thành trì tinh vân song sinh ẩn chứa ảo ảnh của Song Tử Huyễn Vương.',
    bossName: 'Song Tử Huyễn Vương',
    floorPrimary: '#162542',
    floorAccent: '#67e8f9',
    stoneHex: 0x243b66,
    trimHex: 0x67e8f9,
    skyHex: 0x0b1224,
    fogHex: 0x101a33,
    keyLightHex: 0xcffafe,
    hemiSkyHex: 0x67e8f9,
    hemiGroundHex: 0x1e1b4b,
    hpScale: 2.55,
    dmgScale: 1.88,
    goldBonusMult: 2.1,
    recommendedPower: 740,
    subBossNames: ['Kẻ Dệt Lưới Ảo Ảnh', 'Cổ Long Thiên Không'],
    enemyFamily: [EnemyKind.SHADOW_STALKER, EnemyKind.WISP, EnemyKind.IMP_ARCHER],
  },
  {
    id: 5,
    name: 'Chương 5: Thủy Cung Nguyệt Triều',
    zodiacId: 'cancer',
    zodiacIcon: '🦀',
    zodiacName: 'Cự Giải',
    regionName: 'Thủy Cung Nguyệt Triều',
    subtitle: 'Cung điện đại dương sâu thẳm nơi Cự Giải Nguyệt Giáp trấn giữ lối đi.',
    bossName: 'Cự Giải Nguyệt Giáp',
    floorPrimary: '#0c2c42',
    floorAccent: '#38bdf8',
    stoneHex: 0x164263,
    trimHex: 0x38bdf8,
    skyHex: 0x061524,
    fogHex: 0x091f36,
    keyLightHex: 0xbae6fd,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x082f49,
    hpScale: 3.25,
    dmgScale: 2.25,
    goldBonusMult: 2.55,
    recommendedPower: 980,
    subBossNames: ['Chấp Pháp Triều Dâng', 'Long Vệ Hải Vực'],
    enemyFamily: [EnemyKind.WISP, EnemyKind.GOLEM, EnemyKind.SHADOW_STALKER],
  },
  {
    id: 6,
    name: 'Chương 6: Vườn Sao Trinh Nữ',
    zodiacId: 'virgo',
    zodiacIcon: '🌾',
    zodiacName: 'Xử Nữ',
    regionName: 'Vườn Sao Trinh Nữ',
    subtitle: 'Khu vườn ngọc bích tĩnh lặng được canh gác bởi Tinh Nữ Thánh Vệ.',
    bossName: 'Tinh Nữ Thánh Vệ',
    floorPrimary: '#153328',
    floorAccent: '#5eead4',
    stoneHex: 0x204d3d,
    trimHex: 0xd9f99d,
    skyHex: 0x091c15,
    fogHex: 0x0e281e,
    keyLightHex: 0xecfccb,
    hemiSkyHex: 0x5eead4,
    hemiGroundHex: 0x064e3b,
    hpScale: 4.1,
    dmgScale: 2.65,
    goldBonusMult: 3.0,
    recommendedPower: 1280,
    subBossNames: ['Vệ Binh Thánh Thảo', 'Nữ Hoàng Sợi Nấm'],
    enemyFamily: [EnemyKind.WISP, EnemyKind.SKIRMISHER, EnemyKind.IMP_ARCHER],
  },
  {
    id: 7,
    name: 'Chương 7: Điện Cân Bằng',
    zodiacId: 'libra',
    zodiacIcon: '⚖️',
    zodiacName: 'Thiên Bình',
    regionName: 'Điện Cân Bằng',
    subtitle: 'Thánh đường tử tinh phán xét công bằng dưới quyền Phán Quan Thiên Bình.',
    bossName: 'Phán Quan Thiên Bình',
    floorPrimary: '#2f1f3d',
    floorAccent: '#f0abfc',
    stoneHex: 0x462f5b,
    trimHex: 0xf0abfc,
    skyHex: 0x160e1f,
    fogHex: 0x20152d,
    keyLightHex: 0xf5d0fe,
    hemiSkyHex: 0xf0abfc,
    hemiGroundHex: 0x3b0764,
    hpScale: 5.0,
    dmgScale: 3.1,
    goldBonusMult: 3.5,
    recommendedPower: 1620,
    subBossNames: ['Chấp Pháp Công Lý', 'Bạo Chúa Nhật Thực'],
    enemyFamily: [EnemyKind.SHADOW_STALKER, EnemyKind.IMP_ARCHER, EnemyKind.GOLEM],
  },
  {
    id: 8,
    name: 'Chương 8: Hoang Mạc Độc Tinh',
    zodiacId: 'scorpio',
    zodiacIcon: '🦂',
    zodiacName: 'Bọ Cạp',
    regionName: 'Hoang Mạc Độc Tinh',
    subtitle: 'Vùng cát tím kịch độc nơi Hạt Vương Độc Vĩ tung nọc chết người.',
    bossName: 'Hạt Vương Độc Vĩ',
    floorPrimary: '#32142e',
    floorAccent: '#c084fc',
    stoneHex: 0x4b1e46,
    trimHex: 0xc084fc,
    skyHex: 0x170816,
    fogHex: 0x220c20,
    keyLightHex: 0xe9d5ff,
    hemiSkyHex: 0xc084fc,
    hemiGroundHex: 0x4c0519,
    hpScale: 6.1,
    dmgScale: 3.6,
    goldBonusMult: 4.1,
    recommendedPower: 2050,
    subBossNames: ['Độc Hạt Vệ Binh', 'Thực Thần Tinh Hà'],
    enemyFamily: [EnemyKind.SHADOW_STALKER, EnemyKind.DRAGON_WHELP, EnemyKind.WISP],
  },
  {
    id: 9,
    name: 'Chương 9: Thiên Lộ Xạ Thủ',
    zodiacId: 'sagittarius',
    zodiacIcon: '🏹',
    zodiacName: 'Nhân Mã',
    regionName: 'Thiên Lộ Xạ Thủ',
    subtitle: 'Con đường sao băng rực rỡ thử thách tài thiện xạ trước Nhân Mã Thần Xạ.',
    bossName: 'Nhân Mã Thần Xạ',
    floorPrimary: '#1c2b4a',
    floorAccent: '#a5b4fc',
    stoneHex: 0x2c4270,
    trimHex: 0xfbbf24,
    skyHex: 0x0c1324,
    fogHex: 0x131d36,
    keyLightHex: 0xe0e7ff,
    hemiSkyHex: 0xa5b4fc,
    hemiGroundHex: 0x1e1b4b,
    hpScale: 7.3,
    dmgScale: 4.15,
    goldBonusMult: 4.7,
    recommendedPower: 2550,
    subBossNames: ['Thiên Cung Kỵ Sĩ', 'Cổ Long Sao Băng'],
    enemyFamily: [EnemyKind.IMP_ARCHER, EnemyKind.WISP, EnemyKind.SHADOW_STALKER],
  },
  {
    id: 10,
    name: 'Chương 10: Đỉnh Sơn Tinh Tú',
    zodiacId: 'capricorn',
    zodiacIcon: '🐐',
    zodiacName: 'Ma Kết',
    regionName: 'Đỉnh Sơn Tinh Tú',
    subtitle: 'Đỉnh núi băng giá chạm tới dải ngân hà của Sơn Thần Ma Kết.',
    bossName: 'Sơn Thần Ma Kết',
    floorPrimary: '#1b3444',
    floorAccent: '#7dd3fc',
    stoneHex: 0x2a4f66,
    trimHex: 0x7dd3fc,
    skyHex: 0x0b161f,
    fogHex: 0x122230,
    keyLightHex: 0xe0f2fe,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x0f172a,
    hpScale: 8.7,
    dmgScale: 4.75,
    goldBonusMult: 5.4,
    recommendedPower: 3100,
    subBossNames: ['Hộ Vệ Đỉnh Băng', 'Golem Hắc Diệu'],
    enemyFamily: [EnemyKind.GOLEM, EnemyKind.SHADOW_STALKER, EnemyKind.WISP],
  },
  {
    id: 11,
    name: 'Chương 11: Hải Đài Thiên Thủy',
    zodiacId: 'aquarius',
    zodiacIcon: '🏺',
    zodiacName: 'Bảo Bình',
    regionName: 'Hải Đài Thiên Thủy',
    subtitle: 'Đài thiên văn sóng ngọc lam nơi Thủy Sứ Bảo Bình điều khiển dòng sao.',
    bossName: 'Thủy Sứ Bảo Bình',
    floorPrimary: '#0e3150',
    floorAccent: '#22d3ee',
    stoneHex: 0x164a78,
    trimHex: 0x22d3ee,
    skyHex: 0x071729,
    fogHex: 0x0b223d,
    keyLightHex: 0xa5f3fc,
    hemiSkyHex: 0x22d3ee,
    hemiGroundHex: 0x172554,
    hpScale: 10.3,
    dmgScale: 5.4,
    goldBonusMult: 6.2,
    recommendedPower: 3750,
    subBossNames: ['Thiên Thủy Chấp Pháp', 'Tinh Vân Sứ Giả'],
    enemyFamily: [EnemyKind.WISP, EnemyKind.DRAGON_WHELP, EnemyKind.IMP_ARCHER],
  },
  {
    id: 12,
    name: 'Chương 12: Hải Vực Mộng Ảo',
    zodiacId: 'pisces',
    zodiacIcon: '🐟',
    zodiacName: 'Song Ngư',
    regionName: 'Hải Vực Mộng Ảo',
    subtitle: 'Đỉnh cao cuối cùng của 12 Cung Hoàng Đạo — quyết chiến Song Ngư Mộng Chủ!',
    bossName: 'Song Ngư Mộng Chủ',
    floorPrimary: '#152644',
    floorAccent: '#5eead4',
    stoneHex: 0x223d6b,
    trimHex: 0x5eead4,
    skyHex: 0x091122,
    fogHex: 0x0f1a33,
    keyLightHex: 0xccfbf1,
    hemiSkyHex: 0x5eead4,
    hemiGroundHex: 0x3b0764,
    hpScale: 12.2,
    dmgScale: 6.1,
    goldBonusMult: 7.2,
    recommendedPower: 4500,
    subBossNames: ['Song Ngư Hộ Vệ', 'Long Vương Tinh Giới'],
    enemyFamily: [EnemyKind.DRAGON_WHELP, EnemyKind.SHADOW_STALKER, EnemyKind.GOLEM],
  },
];

function buildZodiacStages(ch: RawZodiacChapter): ChapterStageDef[] {
  const [e1, e2, e3] = ch.enemyFamily;
  const presets: ChapterStageDef['obstaclePreset'][] = [
    'courtyard',
    'pillars',
    'cross',
    'gauntlet',
    'sanctum',
  ];

  const stages: ChapterStageDef[] = [];
  for (let s = 1; s <= 12; s++) {
    const isSubBoss1 = s === 4;
    const isSubBoss2 = s === 8;
    const isFinalBoss = s === 12;
    const isBossStage = isSubBoss1 || isSubBoss2 || isFinalBoss;

    let eventAfter: StageEventAfter = 'none';
    if (s === 2 || s === 6 || s === 10) eventAfter = 'valkyrie';
    else if (s === 4) eventAfter = 'wheel';
    else if (s === 8) eventAfter = Math.random() < 0.5 ? 'angel' : 'devil';

    if (isFinalBoss) {
      stages.push({
        stageNumber: s,
        name: `Thánh Điện ${ch.zodiacName}`,
        isBossStage: true,
        bossTitle: ch.bossName,
        eventAfter: 'none',
        obstaclePreset: 'sanctum',
        waves: [{ enemies: [{ kind: EnemyKind.ZODIAC_BOSS, count: 1 }] }],
      });
    } else if (isSubBoss1) {
      stages.push({
        stageNumber: s,
        name: ch.subBossNames[0],
        isBossStage: true,
        bossTitle: ch.subBossNames[0],
        eventAfter: 'wheel',
        obstaclePreset: 'sanctum',
        waves: [
          {
            enemies: [
              { kind: EnemyKind.WARDEN_BOSS, count: 1 },
              { kind: e2, count: 2 },
            ],
          },
        ],
      });
    } else if (isSubBoss2) {
      stages.push({
        stageNumber: s,
        name: ch.subBossNames[1],
        isBossStage: true,
        bossTitle: ch.subBossNames[1],
        eventAfter: 'devil',
        obstaclePreset: 'sanctum',
        waves: [
          {
            enemies: [
              { kind: EnemyKind.TITAN_BOSS, count: 1 },
              { kind: e3, count: 2 },
            ],
          },
        ],
      });
    } else {
      const waveCount = s >= 7 ? 2 : 1;
      const waves: ChapterStageDef['waves'] = [];
      for (let w = 0; w < waveCount; w++) {
        waves.push({
          enemies: [
            { kind: e1, count: 2 + Math.floor(s / 4), isElite: s >= 5 && w === 0 },
            { kind: e2, count: 1 + Math.floor(s / 3) },
            ...(s >= 3 ? [{ kind: e3, count: 1 + Math.floor(s / 5) }] : []),
          ],
        });
      }
      stages.push({
        stageNumber: s,
        name: `${ch.regionName} · Phòng ${s}`,
        isBossStage: false,
        eventAfter,
        obstaclePreset: presets[(s - 1) % 4],
        waves,
      });
    }
  }
  return stages;
}

export const CHAPTERS: ChapterDefinition[] = RAW_ZODIAC_CHAPTERS.map((ch) => ({
  id: ch.id,
  name: ch.name,
  zodiacId: ch.zodiacId,
  zodiacIcon: ch.zodiacIcon,
  zodiacName: ch.zodiacName,
  regionName: ch.regionName,
  subtitle: ch.subtitle,
  bossName: ch.bossName,
  recommendedPower: ch.recommendedPower,
  floorPrimary: ch.floorPrimary,
  floorAccent: ch.floorAccent,
  stoneHex: ch.stoneHex,
  trimHex: ch.trimHex,
  skyHex: ch.skyHex,
  fogHex: ch.fogHex,
  keyLightHex: ch.keyLightHex,
  hemiSkyHex: ch.hemiSkyHex,
  hemiGroundHex: ch.hemiGroundHex,
  hpScale: ch.hpScale,
  dmgScale: ch.dmgScale,
  goldBonusMult: ch.goldBonusMult,
  stages: buildZodiacStages(ch),
}));
