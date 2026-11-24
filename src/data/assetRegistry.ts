import { DEFAULT_HERO_ID, normalizePlayableHeroId, type PlayableHeroId } from './heroesData';
import { EnemyKind, HeroId, HeroSkinId } from '../types/game';

export interface CharacterAssetPack {
  assetKey: string;
  icon: string;
  portrait: string;
  skill: string;
  burst: string;
}

export interface EnemyAssetPack {
  assetKey: string;
  icon: string;
  portrait: string;
}

export interface BossAssetPack {
  assetKey: string;
  icon: string;
  portrait: string;
}

function ariesImage(assetKey: string): string {
  return encodeURI(`/assets/Chương 2/Runtime/${assetKey}.webp`);
}

function ariesPortrait(assetKey: string): EnemyAssetPack {
  const image = ariesImage(assetKey);
  return { assetKey, icon: image, portrait: image };
}

function ariesCharacter(assetKey: string): CharacterAssetPack {
  const pack = ariesPortrait(assetKey);
  return { ...pack, skill: pack.icon, burst: pack.icon };
}

function taurusImage(assetKey: string): string {
  return encodeURI(`/assets/Chương 3/Runtime/${assetKey}.webp`);
}

function taurusPortrait(assetKey: string): EnemyAssetPack {
  const image = taurusImage(assetKey);
  return { assetKey, icon: image, portrait: image };
}

function taurusCharacter(assetKey: string): CharacterAssetPack {
  const pack = taurusPortrait(assetKey);
  return { ...pack, skill: pack.icon, burst: pack.icon };
}

function geminiImage(assetKey: string): string {
  return encodeURI(`/assets/Chương 4/Runtime/${assetKey}.webp`);
}

function geminiPortrait(assetKey: string): EnemyAssetPack {
  const image = geminiImage(assetKey);
  return { assetKey, icon: image, portrait: image };
}

function geminiCharacter(assetKey: string): CharacterAssetPack {
  const pack = geminiPortrait(assetKey);
  return { ...pack, skill: pack.icon, burst: pack.icon };
}

const LEO_ENEMY_LABELS: Partial<Record<EnemyKind, string>> = {
  [EnemyKind.SKIRMISHER]: 'Sư Tử Lửa Đền Thờ',
  [EnemyKind.GOLEM]: 'Vệ Binh Đá Mặt Trời',
  [EnemyKind.IMP_ARCHER]: 'Linh Hồn Lửa Hoàng Đạo',
  [EnemyKind.DRAGON_WHELP]: 'Chiến Binh Thương Ánh Dương',
  [EnemyKind.WARDEN_BOSS]: 'Sư Tử Cánh Ánh Dương',
  [EnemyKind.TITAN_BOSS]: 'Sư Tử Cánh Ánh Dương',
  [EnemyKind.ZODIAC_BOSS]: 'Sư Vương Thái Dương',
};

const ARIES_ENEMIES: Partial<Record<EnemyKind, EnemyAssetPack & { name: string }>> = {
  [EnemyKind.SKIRMISHER]: { ...ariesPortrait('magma-ram'), name: 'Dương Hỏa Dung Nham' },
  [EnemyKind.GOLEM]: { ...ariesPortrait('obsidian-golem'), name: 'Golem Hắc Diện' },
  [EnemyKind.IMP_ARCHER]: { ...ariesPortrait('crimson-spirit'), name: 'Hỏa Linh Xích Hỏa' },
  [EnemyKind.DRAGON_WHELP]: { ...ariesPortrait('aries-berserker'), name: 'Cuồng Chiến Bạch Dương' },
  [EnemyKind.WARDEN_BOSS]: { ...ariesPortrait('cinderhorn'), name: 'Cinderhorn' },
  [EnemyKind.TITAN_BOSS]: { ...ariesPortrait('cinderhorn'), name: 'Cinderhorn' },
  [EnemyKind.ZODIAC_BOSS]: { ...ariesPortrait('kratos-aries'), name: 'Hỏa Dương Chiến Vương' },
};

const TAURUS_ENEMIES: Partial<Record<EnemyKind, EnemyAssetPack & { name: string }>> = {
  [EnemyKind.SKIRMISHER]: { ...taurusPortrait('nguu-ngoc-xung-kich'), name: 'Ngưu Ngọc Xung Kích' },
  [EnemyKind.GOLEM]: { ...taurusPortrait('ve-binh-ngoc-luc-bao'), name: 'Vệ Binh Ngọc Lục Bảo' },
  [EnemyKind.IMP_ARCHER]: { ...taurusPortrait('linh-hon-luc-bao'), name: 'Linh Hồn Lục Bảo' },
  [EnemyKind.DRAGON_WHELP]: { ...taurusPortrait('chien-binh-kich-luc-bao'), name: 'Chiến Binh Kích Lục Bảo' },
  [EnemyKind.WARDEN_BOSS]: { ...taurusPortrait('ngoc-nguu-duc-thu'), name: 'Ngọc Ngưu Dực Thú' },
  [EnemyKind.TITAN_BOSS]: { ...taurusPortrait('ngoc-nguu-duc-thu'), name: 'Ngọc Ngưu Dực Thú' },
  [EnemyKind.ZODIAC_BOSS]: { ...taurusPortrait('dia-than-kim-nguu'), name: 'Địa Thần Kim Ngưu' },
};

const GEMINI_ENEMIES: Partial<Record<EnemyKind, EnemyAssetPack & { name: string }>> = {
  [EnemyKind.SKIRMISHER]: { ...geminiPortrait('linh-mieu-ung-gio'), name: 'Linh Miêu Ưng Gió' },
  [EnemyKind.GOLEM]: { ...geminiPortrait('ve-binh-guong-song-sinh'), name: 'Vệ Binh Gương Song Sinh' },
  [EnemyKind.IMP_ARCHER]: { ...geminiPortrait('linh-hon-mat-na-song-sinh'), name: 'Linh Hồn Mặt Nạ Song Sinh' },
  [EnemyKind.DRAGON_WHELP]: { ...geminiPortrait('chien-binh-song-dao-phong-anh'), name: 'Chiến Binh Song Đao Phong Ảnh' },
  [EnemyKind.WARDEN_BOSS]: { ...geminiPortrait('song-thu-canh-gio'), name: 'Song Thú Cánh Gió' },
  [EnemyKind.TITAN_BOSS]: { ...geminiPortrait('song-thu-canh-gio'), name: 'Song Thú Cánh Gió' },
  [EnemyKind.ZODIAC_BOSS]: { ...geminiPortrait('than-vuong-song-tu'), name: 'Thần Vương Song Tử' },
};

export const HERO_ASSET_PACKS: Record<PlayableHeroId, CharacterAssetPack> = {
  celeste: geminiCharacter('celeste'),
  sylvia: taurusCharacter('sylvia'),
  bellona: ariesCharacter('bellona'),
  aurelia: {
    assetKey: 'aurelia',
    icon: encodeURI('/assets/Chương 1/Nhân vật/1. Anh hùng/Aurelia.webp'),
    portrait: encodeURI('/assets/Chương 1/Nhân vật/1. Anh hùng/Aurelia.webp'),
    skill: encodeURI('/assets/Chương 1/Nhân vật/1. Anh hùng/Aurelia.webp'),
    burst: encodeURI('/assets/Chương 1/Nhân vật/1. Anh hùng/Aurelia.webp'),
  },
};

export const SKIN_ASSET_PACKS: Partial<Record<HeroSkinId, CharacterAssetPack>> = {
  astral_mirror_queen: geminiCharacter('astral-mirror-queen'),
  venus_incarnate: taurusCharacter('venus-incarnate'),
  golden_fleece: ariesCharacter('golden-fleece'),
  aurelia_oasis_dancer: {
    assetKey: 'aurelia-oasis-dancer',
    icon: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Golden Oasis Sun Dancer.webp'),
    portrait: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Golden Oasis Sun Dancer.webp'),
    skill: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Golden Oasis Sun Dancer.webp'),
    burst: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Golden Oasis Sun Dancer.webp'),
  },
  aurelia_temple_commander: {
    assetKey: 'aurelia-temple-commander',
    icon: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Royal Sun-Temple Commander.webp'),
    portrait: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Royal Sun-Temple Commander.webp'),
    skill: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Royal Sun-Temple Commander.webp'),
    burst: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Royal Sun-Temple Commander.webp'),
  },
  aurelia_solaris_valkyrie: {
    assetKey: 'aurelia-solaris-valkyrie',
    icon: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Solaris Valkyrie Regalia.webp'),
    portrait: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Solaris Valkyrie Regalia.webp'),
    skill: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Solaris Valkyrie Regalia.webp'),
    burst: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Solaris Valkyrie Regalia.webp'),
  },
  aurelia_winter_solstice: {
    assetKey: 'aurelia-winter-solstice',
    icon: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Winter Solstice Crystal Sovereign.webp'),
    portrait: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Winter Solstice Crystal Sovereign.webp'),
    skill: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Winter Solstice Crystal Sovereign.webp'),
    burst: encodeURI('/assets/Chương 1/Nhân vật/7. Trang phục/Winter Solstice Crystal Sovereign.webp'),
  },
};

export const SOLAR_LEO_ITEM_THUMBNAILS: Record<string, string> = {
  twin_astral_spirits: geminiImage('twin-astral-spirits'),
  dual_gemini_wings: geminiImage('dual-gemini-wings'),
  celestial_wind_mount: geminiImage('celestial-wind-mount'),
  twin_hourglass_relic: geminiImage('twin-hourglass-relic'),
  gemini_halo: geminiImage('gemini-halo'),
  jade_calf: taurusImage('jade-calf'),
  emerald_taurus_wings: taurusImage('emerald-taurus-wings'),
  jade_bull: taurusImage('jade-bull'),
  jade_heart_relic: taurusImage('jade-heart-relic'),
  emerald_taurus_halo: taurusImage('emerald-taurus-halo'),
  pyro: ariesImage('pyro'),
  crimson_ram_wings: ariesImage('crimson-ram-wings'),
  vulcan: ariesImage('vulcan'),
  war_horn: ariesImage('war-horn'),
  aries_vanguard: ariesImage('aries-halo'),
  astraeo: encodeURI('/assets/Chương 1/Nhân vật/2. Tinh linh/Astraeo.webp'),
  solar_zenith: encodeURI('/assets/Chương 1/Nhân vật/3. Cánh/Wings of the Solar Zenith.webp'),
  solarius: encodeURI('/assets/Chương 1/Nhân vật/4. Thú cưỡi/Solarius.webp'),
  astrolabe_regulus: encodeURI('/assets/Chương 1/Nhân vật/5. Thánh khí/Astrolabe of Regulus.webp'),
  leo_sovereign: encodeURI('/assets/Chương 1/Nhân vật/6. Hào quang/Halo of the Leo Sovereign.webp'),
};

export const ENEMY_ASSET_PACKS: Record<EnemyKind, EnemyAssetPack> = {
  [EnemyKind.SKIRMISHER]: {
    assetKey: 'hilichurl',
    icon: '/assets/apiaetherbow/enemies/hilichurl/icon.webp',
    portrait: '/assets/apiaetherbow/enemies/hilichurl/portrait.webp',
  },
  [EnemyKind.IMP_ARCHER]: {
    assetKey: 'hilichurl-shooter',
    icon: '/assets/apiaetherbow/enemies/hilichurl-shooter/icon.png',
    portrait: '/assets/apiaetherbow/enemies/hilichurl-shooter/portrait.webp',
  },
  [EnemyKind.GOLEM]: {
    assetKey: 'ruin-guard',
    icon: '/assets/apiaetherbow/enemies/ruin-guard/icon.png',
    portrait: '/assets/apiaetherbow/enemies/ruin-guard/portrait.webp',
  },
  [EnemyKind.WISP]: {
    assetKey: 'abyss-mage',
    icon: '/assets/apiaetherbow/enemies/abyss-mage/icon.webp',
    portrait: '/assets/apiaetherbow/enemies/abyss-mage/portrait.png',
  },
  [EnemyKind.DRAGON_WHELP]: {
    assetKey: 'geovishap-hatchling',
    icon: '/assets/apiaetherbow/enemies/geovishap-hatchling/icon.png',
    portrait: '/assets/apiaetherbow/enemies/geovishap-hatchling/portrait.webp',
  },
  [EnemyKind.SHADOW_STALKER]: {
    assetKey: 'fatui-agent',
    icon: '/assets/apiaetherbow/enemies/fatui-agent/icon.png',
    portrait: '/assets/apiaetherbow/enemies/fatui-agent/portrait.png',
  },
  [EnemyKind.WARDEN_BOSS]: {
    assetKey: 'lawachurl',
    icon: '/assets/apiaetherbow/enemies/lawachurl/icon.webp',
    portrait: '/assets/apiaetherbow/enemies/lawachurl/portrait.webp',
  },
  [EnemyKind.TITAN_BOSS]: {
    assetKey: 'ruin-grader',
    icon: '/assets/apiaetherbow/enemies/ruin-grader/icon.png',
    portrait: '/assets/apiaetherbow/enemies/ruin-grader/portrait.webp',
  },
  [EnemyKind.ZODIAC_BOSS]: {
    assetKey: 'magatsu-mitake-narukami-no-mikoto',
    icon: '/assets/apiaetherbow/bosses/magatsu-mitake-narukami-no-mikoto/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/magatsu-mitake-narukami-no-mikoto/portrait.webp',
  },
};

export const WEEKLY_BOSS_CATALOG: Record<string, BossAssetPack> = {
  'all-devouring-narwhal': {
    assetKey: 'all-devouring-narwhal',
    icon: '/assets/apiaetherbow/bosses/all-devouring-narwhal/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/all-devouring-narwhal/portrait.webp',
  },
  azhdaha: {
    assetKey: 'azhdaha',
    icon: '/assets/apiaetherbow/bosses/azhdaha/icon.png',
    portrait: '/assets/apiaetherbow/bosses/azhdaha/portrait.png',
  },
  childe: {
    assetKey: 'childe',
    icon: '/assets/apiaetherbow/bosses/childe/icon.png',
    portrait: '/assets/apiaetherbow/bosses/childe/portrait.png',
  },
  'everlasting-lord-of-arcane-wisdom': {
    assetKey: 'everlasting-lord-of-arcane-wisdom',
    icon: '/assets/apiaetherbow/bosses/everlasting-lord-of-arcane-wisdom/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/everlasting-lord-of-arcane-wisdom/portrait.webp',
  },
  'guardian-of-apep-s-oasis': {
    assetKey: 'guardian-of-apep-s-oasis',
    icon: '/assets/apiaetherbow/bosses/guardian-of-apep-s-oasis/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/guardian-of-apep-s-oasis/portrait.webp',
  },
  'la-signora': {
    assetKey: 'la-signora',
    icon: '/assets/apiaetherbow/bosses/la-signora/icon.png',
    portrait: '/assets/apiaetherbow/bosses/la-signora/portrait.png',
  },
  'lupus-boreas': {
    assetKey: 'lupus-boreas',
    icon: '/assets/apiaetherbow/bosses/lupus-boreas/icon.png',
    portrait: '/assets/apiaetherbow/bosses/lupus-boreas/portrait.png',
  },
  'magatsu-mitake-narukami-no-mikoto': {
    assetKey: 'magatsu-mitake-narukami-no-mikoto',
    icon: '/assets/apiaetherbow/bosses/magatsu-mitake-narukami-no-mikoto/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/magatsu-mitake-narukami-no-mikoto/portrait.webp',
  },
  stormterror: {
    assetKey: 'stormterror',
    icon: '/assets/apiaetherbow/bosses/stormterror/icon.png',
    portrait: '/assets/apiaetherbow/bosses/stormterror/portrait.png',
  },
  'the-knave': {
    assetKey: 'the-knave',
    icon: '/assets/apiaetherbow/bosses/the-knave/icon.webp',
    portrait: '/assets/apiaetherbow/bosses/the-knave/portrait.webp',
  },
};

export const CHAPTER_BOSS_ASSETS: Record<number, BossAssetPack> = {
  1: WEEKLY_BOSS_CATALOG.azhdaha,
  2: ariesPortrait('kratos-aries'),
  3: taurusPortrait('dia-than-kim-nguu'),
  4: geminiPortrait('than-vuong-song-tu'),
  5: WEEKLY_BOSS_CATALOG['all-devouring-narwhal'],
  6: WEEKLY_BOSS_CATALOG['guardian-of-apep-s-oasis'],
  7: WEEKLY_BOSS_CATALOG['magatsu-mitake-narukami-no-mikoto'],
  8: WEEKLY_BOSS_CATALOG['the-knave'],
  9: WEEKLY_BOSS_CATALOG.childe,
  10: WEEKLY_BOSS_CATALOG['lupus-boreas'],
  11: WEEKLY_BOSS_CATALOG.stormterror,
  12: WEEKLY_BOSS_CATALOG['all-devouring-narwhal'],
};

export const WEEKLY_BOSS_ID_ASSETS: Record<string, BossAssetPack> = {
  weekly_solar_leo: WEEKLY_BOSS_CATALOG.azhdaha,
  weekly_boreas_frost: WEEKLY_BOSS_CATALOG['lupus-boreas'],
  weekly_ares_warlord: WEEKLY_BOSS_CATALOG.childe,
  weekly_obsidian_eclipse: WEEKLY_BOSS_CATALOG['the-knave'],
};

export const ENEMY_LABEL_VI: Record<EnemyKind, string> = {
  [EnemyKind.SKIRMISHER]: 'Lính Đá Hilichurl',
  [EnemyKind.IMP_ARCHER]: 'Xạ Thủ Hilichurl',
  [EnemyKind.GOLEM]: 'Vệ Binh Di Tích',
  [EnemyKind.WISP]: 'Pháp Sư Vực Sâu',
  [EnemyKind.DRAGON_WHELP]: 'Ấu Long Nham',
  [EnemyKind.SHADOW_STALKER]: 'Mật Vụ Fatui',
  [EnemyKind.WARDEN_BOSS]: 'Vua Giáp Khổng Lồ',
  [EnemyKind.TITAN_BOSS]: 'Cự Nhân Di Tích',
  [EnemyKind.ZODIAC_BOSS]: 'Chúa Tể Hoàng Đạo',
};

export function getHeroAssetPack(
  heroId: HeroId = DEFAULT_HERO_ID,
  skinId?: HeroSkinId
): CharacterAssetPack {
  if (skinId && skinId !== 'default') {
    const skinPack = SKIN_ASSET_PACKS[skinId];
    if (skinPack) return skinPack;
  }
  return HERO_ASSET_PACKS[normalizePlayableHeroId(heroId)];
}

export function getSkinAssetPack(skinId: HeroSkinId, fallbackHeroId: HeroId = DEFAULT_HERO_ID): CharacterAssetPack {
  return getHeroAssetPack(fallbackHeroId, skinId);
}

export function getEnemyLabel(kind: EnemyKind, chapterId?: number): string {
  if (chapterId === 1) return LEO_ENEMY_LABELS[kind] ?? ENEMY_LABEL_VI[kind];
  if (chapterId === 2) return ARIES_ENEMIES[kind]?.name ?? ENEMY_LABEL_VI[kind];
  if (chapterId === 3) return TAURUS_ENEMIES[kind]?.name ?? ENEMY_LABEL_VI[kind];
  if (chapterId === 4) return GEMINI_ENEMIES[kind]?.name ?? ENEMY_LABEL_VI[kind];
  return ENEMY_LABEL_VI[kind];
}

export function getEnemyAssetPack(kind: EnemyKind, chapterId?: number): EnemyAssetPack {
  if (chapterId === 2) {
    const pack = ARIES_ENEMIES[kind];
    if (pack) return pack;
  }
  if (chapterId === 3) {
    const pack = TAURUS_ENEMIES[kind];
    if (pack) return pack;
  }
  if (chapterId === 4) {
    const pack = GEMINI_ENEMIES[kind];
    if (pack) return pack;
  }
  return ENEMY_ASSET_PACKS[kind] ?? ENEMY_ASSET_PACKS[EnemyKind.SKIRMISHER];
}

export function getBossAssetPack(opts: {
  chapterId?: number;
  weeklyBossId?: string;
  bossName?: string | null;
  bossKind?: EnemyKind;
  isDragonLair?: boolean;
  isSkyCitadel?: boolean;
  isWorldBoss?: boolean;
  isGuildBoss?: boolean;
}): BossAssetPack {
  if (opts.weeklyBossId) {
    const normalized = opts.weeklyBossId.replace(/_blitz$/, '');
    if (WEEKLY_BOSS_ID_ASSETS[normalized]) {
      return WEEKLY_BOSS_ID_ASSETS[normalized];
    }
  }

  if (opts.isDragonLair) return WEEKLY_BOSS_CATALOG.stormterror;
  if (opts.isSkyCitadel) return WEEKLY_BOSS_CATALOG['la-signora'];
  if (opts.isWorldBoss) return WEEKLY_BOSS_CATALOG['all-devouring-narwhal'];
  if (opts.isGuildBoss) return WEEKLY_BOSS_CATALOG.azhdaha;

  const lower = (opts.bossName ?? '').toLowerCase();
  if (opts.chapterId === 2) {
    if (lower.startsWith('cinderhorn')) return ariesPortrait('cinderhorn');
    if (lower.includes('hỏa dương chiến vương') || !lower) return CHAPTER_BOSS_ASSETS[2];
  }
  if (opts.chapterId === 3) {
    if (lower.includes('ngọc ngưu dực thú')) return taurusPortrait('ngoc-nguu-duc-thu');
    if (lower.includes('địa thần kim ngưu') || !lower) return CHAPTER_BOSS_ASSETS[3];
  }
  if (opts.chapterId === 4) {
    if (lower.includes('song thú cánh gió')) return geminiPortrait('song-thu-canh-gio');
    if (lower.includes('thần vương song tử') || !lower) return CHAPTER_BOSS_ASSETS[4];
  }
  if (lower.includes('boreas') || lower.includes('băng đế')) {
    return WEEKLY_BOSS_CATALOG['lupus-boreas'];
  }
  if (lower.includes('ares') || lower.includes('chiến thần')) {
    return WEEKLY_BOSS_CATALOG.childe;
  }
  if (lower.includes('atreus') || lower.includes('nhật thực') || lower.includes('ma vương')) {
    return WEEKLY_BOSS_CATALOG['the-knave'];
  }
  if (lower.includes('hỏa') || lower.includes('phượng') || lower.includes('signora')) {
    return WEEKLY_BOSS_CATALOG['la-signora'];
  }
  if (lower.includes('cổ long') || lower.includes('rồng') || lower.includes('phong')) {
    return WEEKLY_BOSS_CATALOG.stormterror;
  }
  if (lower.includes('golem') || lower.includes('hộ vệ')) {
    return ENEMY_ASSET_PACKS[EnemyKind.TITAN_BOSS];
  }

  if (opts.chapterId && CHAPTER_BOSS_ASSETS[opts.chapterId]) {
    return CHAPTER_BOSS_ASSETS[opts.chapterId];
  }

  if (opts.bossKind) {
    return ENEMY_ASSET_PACKS[opts.bossKind];
  }

  return WEEKLY_BOSS_CATALOG.azhdaha;
}
