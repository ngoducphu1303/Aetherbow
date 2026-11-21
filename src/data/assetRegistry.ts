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

export const HERO_ASSET_PACKS: Record<HeroId, CharacterAssetPack> = {
  artemis: {
    assetKey: 'ganyu',
    icon: '/assets/apiaetherbow/characters/ganyu/icon.webp',
    portrait: '/assets/apiaetherbow/characters/ganyu/portrait.png',
    skill: '/assets/apiaetherbow/characters/ganyu/skill.png',
    burst: '/assets/apiaetherbow/characters/ganyu/burst.png',
  },
  alex: {
    assetKey: 'tartaglia',
    icon: '/assets/apiaetherbow/characters/tartaglia/icon.png',
    portrait: '/assets/apiaetherbow/characters/tartaglia/portrait.png',
    skill: '/assets/apiaetherbow/characters/tartaglia/skill.png',
    burst: '/assets/apiaetherbow/characters/tartaglia/burst.png',
  },
  dracoola: {
    assetKey: 'arlecchino',
    icon: '/assets/apiaetherbow/characters/arlecchino/icon.webp',
    portrait: '/assets/apiaetherbow/characters/arlecchino/portrait.webp',
    skill: '/assets/apiaetherbow/characters/arlecchino/skill.webp',
    burst: '/assets/apiaetherbow/characters/arlecchino/burst.webp',
  },
  rolla: {
    assetKey: 'ayaka',
    icon: '/assets/apiaetherbow/characters/ayaka/icon.webp',
    portrait: '/assets/apiaetherbow/characters/ayaka/portrait.png',
    skill: '/assets/apiaetherbow/characters/ayaka/skill.png',
    burst: '/assets/apiaetherbow/characters/ayaka/burst.png',
  },
  cleo: {
    assetKey: 'mavuika',
    icon: '/assets/apiaetherbow/characters/mavuika/icon.webp',
    portrait: '/assets/apiaetherbow/characters/mavuika/portrait.webp',
    skill: '/assets/apiaetherbow/characters/mavuika/skill.webp',
    burst: '/assets/apiaetherbow/characters/mavuika/burst.webp',
  },
  thor: {
    assetKey: 'raiden',
    icon: '/assets/apiaetherbow/characters/raiden/icon.webp',
    portrait: '/assets/apiaetherbow/characters/raiden/portrait.png',
    skill: '/assets/apiaetherbow/characters/raiden/skill.png',
    burst: '/assets/apiaetherbow/characters/raiden/burst.png',
  },
  atreus: {
    assetKey: 'xiao',
    icon: '/assets/apiaetherbow/characters/xiao/icon.webp',
    portrait: '/assets/apiaetherbow/characters/xiao/portrait.png',
    skill: '/assets/apiaetherbow/characters/xiao/skill.png',
    burst: '/assets/apiaetherbow/characters/xiao/burst.png',
  },
  wukong: {
    assetKey: 'zhongli',
    icon: '/assets/apiaetherbow/characters/zhongli/icon.png',
    portrait: '/assets/apiaetherbow/characters/zhongli/portrait.png',
    skill: '/assets/apiaetherbow/characters/zhongli/skill.png',
    burst: '/assets/apiaetherbow/characters/zhongli/burst.png',
  },
  lisa: {
    assetKey: 'lisa',
    icon: '/assets/apiaetherbow/characters/lisa/icon.png',
    portrait: '/assets/apiaetherbow/characters/lisa/portrait.png',
    skill: '/assets/apiaetherbow/characters/lisa/skill.png',
    burst: '/assets/apiaetherbow/characters/lisa/burst.png',
  },
  hatsune_miku: {
    assetKey: 'hatsune-miku',
    icon: '/assets/apiaetherbow/characters/hatsune-miku/icon.png',
    portrait: '/assets/apiaetherbow/characters/hatsune-miku/portrait.png',
    skill: '/assets/apiaetherbow/characters/hatsune-miku/skill.png',
    burst: '/assets/apiaetherbow/characters/hatsune-miku/burst.png',
  },
  van_tich: {
    assetKey: 'van-tich',
    icon: '/assets/apiaetherbow/characters/van-tich/icon.webp',
    portrait: '/assets/apiaetherbow/characters/van-tich/portrait.webp',
    skill: '/assets/apiaetherbow/characters/van-tich/skill.webp',
    burst: '/assets/apiaetherbow/characters/van-tich/burst.webp',
  },
};

export const SKIN_ASSET_PACKS: Partial<Record<HeroSkinId, CharacterAssetPack>> = {
  alice_ao_dai: {
    ...HERO_ASSET_PACKS.artemis,
    assetKey: 'alice-ao-dai',
    icon: '/assets/apiaetherbow/skins/alice-ao-dai/icon.webp',
    portrait: '/assets/apiaetherbow/skins/alice-ao-dai/portrait.webp',
  },
  celestial_gold: {
    assetKey: 'navia',
    icon: '/assets/apiaetherbow/characters/navia/icon.png',
    portrait: '/assets/apiaetherbow/characters/navia/portrait.png',
    skill: '/assets/apiaetherbow/characters/navia/skill.png',
    burst: '/assets/apiaetherbow/characters/navia/burst.png',
  },
  blood_moon: {
    assetKey: 'hu-tao',
    icon: '/assets/apiaetherbow/characters/hu-tao/icon.png',
    portrait: '/assets/apiaetherbow/characters/hu-tao/portrait.png',
    skill: '/assets/apiaetherbow/characters/hu-tao/skill.png',
    burst: '/assets/apiaetherbow/characters/hu-tao/burst.png',
  },
  jade_nebula: {
    assetKey: 'nahida',
    icon: '/assets/apiaetherbow/characters/nahida/icon.webp',
    portrait: '/assets/apiaetherbow/characters/nahida/portrait.webp',
    skill: '/assets/apiaetherbow/characters/nahida/skill.webp',
    burst: '/assets/apiaetherbow/characters/nahida/burst.webp',
  },
  arctic_frost: {
    assetKey: 'eula',
    icon: '/assets/apiaetherbow/characters/eula/icon.webp',
    portrait: '/assets/apiaetherbow/characters/eula/portrait.png',
    skill: '/assets/apiaetherbow/characters/eula/skill.png',
    burst: '/assets/apiaetherbow/characters/eula/burst.png',
  },
  thunder_empress: {
    assetKey: 'clorinde',
    icon: '/assets/apiaetherbow/characters/clorinde/icon.png',
    portrait: '/assets/apiaetherbow/characters/clorinde/portrait.webp',
    skill: '/assets/apiaetherbow/characters/clorinde/skill.webp',
    burst: '/assets/apiaetherbow/characters/clorinde/burst.webp',
  },
  crimson_phoenix: {
    assetKey: 'yoimiya',
    icon: '/assets/apiaetherbow/characters/yoimiya/icon.png',
    portrait: '/assets/apiaetherbow/characters/yoimiya/portrait.png',
    skill: '/assets/apiaetherbow/characters/yoimiya/skill.png',
    burst: '/assets/apiaetherbow/characters/yoimiya/burst.png',
  },
  astral_archon: {
    assetKey: 'furina',
    icon: '/assets/apiaetherbow/characters/furina/icon.webp',
    portrait: '/assets/apiaetherbow/characters/furina/portrait.webp',
    skill: '/assets/apiaetherbow/characters/furina/skill.webp',
    burst: '/assets/apiaetherbow/characters/furina/burst.webp',
  },
  abyss_duelist: {
    assetKey: 'wriothesley',
    icon: '/assets/apiaetherbow/characters/wriothesley/icon.webp',
    portrait: '/assets/apiaetherbow/characters/wriothesley/portrait.webp',
    skill: '/assets/apiaetherbow/characters/wriothesley/skill.webp',
    burst: '/assets/apiaetherbow/characters/wriothesley/burst.webp',
  },
  jade_adeptus: {
    assetKey: 'xianyun',
    icon: '/assets/apiaetherbow/characters/xianyun/icon.webp',
    portrait: '/assets/apiaetherbow/characters/xianyun/portrait.png',
    skill: '/assets/apiaetherbow/characters/xianyun/skill.png',
    burst: '/assets/apiaetherbow/characters/xianyun/burst.png',
  },
  lunar_sovereign: {
    assetKey: 'neuvillette',
    icon: '/assets/apiaetherbow/characters/neuvillette/icon.webp',
    portrait: '/assets/apiaetherbow/characters/neuvillette/portrait.webp',
    skill: '/assets/apiaetherbow/characters/neuvillette/skill.webp',
    burst: '/assets/apiaetherbow/characters/neuvillette/burst.webp',
  },
  verdant_ranger: {
    assetKey: 'tighnari',
    icon: '/assets/apiaetherbow/characters/tighnari/icon.png',
    portrait: '/assets/apiaetherbow/characters/tighnari/portrait.webp',
    skill: '/assets/apiaetherbow/characters/tighnari/skill.webp',
    burst: '/assets/apiaetherbow/characters/tighnari/burst.webp',
  },
  twilight_raven: {
    assetKey: 'fischl',
    icon: '/assets/apiaetherbow/characters/fischl/icon.webp',
    portrait: '/assets/apiaetherbow/characters/fischl/portrait.png',
    skill: '/assets/apiaetherbow/characters/fischl/skill.png',
    burst: '/assets/apiaetherbow/characters/fischl/burst.png',
  },
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
  2: WEEKLY_BOSS_CATALOG['la-signora'],
  3: WEEKLY_BOSS_CATALOG['lupus-boreas'],
  4: WEEKLY_BOSS_CATALOG['everlasting-lord-of-arcane-wisdom'],
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
  heroId: HeroId = 'artemis',
  skinId?: HeroSkinId
): CharacterAssetPack {
  if (skinId && skinId !== 'default') {
    const skinPack = SKIN_ASSET_PACKS[skinId];
    if (skinPack) return skinPack;
  }
  return HERO_ASSET_PACKS[heroId] ?? HERO_ASSET_PACKS.artemis;
}

export function getSkinAssetPack(skinId: HeroSkinId, fallbackHeroId: HeroId = 'artemis'): CharacterAssetPack {
  return getHeroAssetPack(fallbackHeroId, skinId);
}

export function getEnemyAssetPack(kind: EnemyKind): EnemyAssetPack {
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
