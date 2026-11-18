export enum GamePhase {
  TITLE = 'TITLE',
  PLAYING = 'PLAYING',
  SKILL_DRAFT = 'SKILL_DRAFT',
  VALKYRIE_DRAFT = 'VALKYRIE_DRAFT',
  ANGEL_DEVIL = 'ANGEL_DEVIL',
  LUCKY_WHEEL = 'LUCKY_WHEEL',
  PAUSED = 'PAUSED',
  VICTORY = 'VICTORY',
  GAME_OVER = 'GAME_OVER',
}

export enum GearSlot {
  WEAPON = 'WEAPON',
  NECKLACE = 'NECKLACE',
  RING = 'RING',
  ARMOR = 'ARMOR',
  HELMET = 'HELMET',
  BOOTS = 'BOOTS',
}

export type WeaponArchetype = 'bow' | 'staff' | 'claw';

export enum Rarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
  MYTHIC = 'MYTHIC',
}

export type HeroId =
  | 'artemis'
  | 'alex'
  | 'thor'
  | 'wukong'
  | 'cleo'
  | 'rolla'
  | 'atreus'
  | 'dracoola';

export type CrownStyle =
  | 'crescent'
  | 'ranger_band'
  | 'thor_wings'
  | 'wukong_circlet'
  | 'cleo_crown'
  | 'rolla_tiara'
  | 'demon_horns'
  | 'vampire_collar';

export type TalentId =
  | 'might'
  | 'vitality'
  | 'swift_bow'
  | 'eagle_eye'
  | 'iron_skin'
  | 'wind_step'
  | 'soul_regen'
  | 'fortune';

export interface TalentDefinition {
  id: TalentId;
  name: string;
  icon: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  stepCost: number;
  perLevelLabel: string;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  rarity: 'Rare' | 'Epic' | 'Legendary';
  title: string;
  skillName: string;
  ultName: string;
  ultDesc: string;
  role: string;
  passiveDesc: string;
  bonusAtk: number;
  bonusHp: number;
  unlockGold: number;
  unlockGems: number;
  accentHex: number;
  cloakHex: number;
  hairHex: number;
  eyeColor: string;
  cheekColor: string;
  crownStyle: CrownStyle;
}

export type RuneId =
  | 'rune_flame'
  | 'rune_frost'
  | 'sawblade_circle'
  | 'giant_meteor'
  | 'arrow_rain'
  | 'sword_of_time'
  | 'healing_sprite'
  | 'rootguard'
  | 'ability_circle'
  | 'rune_valkyrie'
  | 'star_of_fury'
  | 'equinox_bloom';

export interface RuneDefinition {
  id: RuneId;
  name: string;
  category: 'ability' | 'enhancement' | 'blessing';
  archetype: string;
  color: string;
  description: string;
  atkBonusPct: number;
  hpBonusPct: number;
  critBonus: number;
}

export interface RuneInstance {
  uid: string;
  runeId: RuneId;
  rarity: Rarity;
}

export enum EnemyKind {
  SKIRMISHER = 'SKIRMISHER',
  IMP_ARCHER = 'IMP_ARCHER',
  GOLEM = 'GOLEM',
  WISP = 'WISP',
  DRAGON_WHELP = 'DRAGON_WHELP',
  SHADOW_STALKER = 'SHADOW_STALKER',
  WARDEN_BOSS = 'WARDEN_BOSS',
  TITAN_BOSS = 'TITAN_BOSS',
  ZODIAC_BOSS = 'ZODIAC_BOSS',
}

export interface GearTemplate {
  templateId: string;
  name: string;
  slot: GearSlot;
  weaponArchetype?: WeaponArchetype;
  setName: string;
  isSTier?: boolean;
  description: string;
  perkLabel: string;
  baseAtk: number;
  baseHp: number;
  baseCritChance: number;
  baseAttackSpeed: number;
  baseMoveSpeed: number;
  baseDamageReduction: number;
  innatePierce?: boolean;
  innateHoming?: boolean;
  innateArrowSpeed?: number;
  visualAccentHex: number;
  cloakColorHex?: number;
}

export type SubstatKind =
  | 'atk_pct'
  | 'hp_pct'
  | 'crit_pct'
  | 'crit_dmg_pct'
  | 'aspd_pct'
  | 'move_pct'
  | 'dr_pct'
  | 'boss_dmg_pct';

export interface GearSubstat {
  id: string;
  kind: SubstatKind;
  value: number; // e.g. 0.08 means +8%
  tier: 'common' | 'rare' | 'epic' | 'gold';
}

export type SocketGemColor = 'ruby' | 'sapphire' | 'topaz' | 'emerald';
export type SocketGemTier = 1 | 2 | 3;

export interface SocketGemInstance {
  uid: string;
  color: SocketGemColor;
  tier: SocketGemTier;
}

export interface GearInstance {
  uid: string;
  templateId: string;
  rarity: Rarity;
  level: number;
  awakeningLevel?: number; // 0..3
  substats?: GearSubstat[];
  socketedGems?: string[]; // SocketGemInstance uids
}

export interface ComputedPlayerStats {
  heroId: HeroId;
  heroName: string;
  heroStar: number;
  weaponArchetype: WeaponArchetype;
  attack: number;
  maxHp: number;
  critChance: number;
  critDamage: number;
  attackSpeedMult: number;
  moveSpeed: number;
  damageReduction: number;
  arrowSpeed: number;
  innatePierce: boolean;
  innateHoming: boolean;
  stageHealPct: number;
  goldGainMult: number;
  bossDamageBonus: number;
  powerRating: number;
  equippedRunes: RuneId[];
  equippedPetId?: PetId | null;
  petAtk?: number;
  constellationStars?: number;
  constellationFireBonus?: number;
  constellationIceBonus?: number;
  constellationStormBonus?: number;
  constellationLevels?: number[];
}

export type SkillRarity = 'common' | 'rare' | 'epic' | 'legend';
export type SkillCategory =
  | 'weapon'
  | 'elemental'
  | 'circle'
  | 'strike'
  | 'meteor'
  | 'sprite'
  | 'stat';

export type SkillId =
  | 'multishot'
  | 'front_arrow'
  | 'diag_arrow'
  | 'rear_arrow'
  | 'ricochet'
  | 'bouncy_wall'
  | 'pierce'
  | 'tracking_eye'
  | 'fire_arrow'
  | 'super_blaze'
  | 'ice_arrow'
  | 'super_freeze'
  | 'lightning_arrow'
  | 'super_bolt'
  | 'venom_arrow'
  | 'orbit_orbs'
  | 'super_circle'
  | 'flying_swords'
  | 'twin_strike'
  | 'meteor_shower'
  | 'super_meteor'
  | 'bomb_sprite'
  | 'laser_sprite'
  | 'warriors_soul'
  | 'power_trio'
  | 'atk_boost'
  | 'aspd_boost'
  | 'crit_mastery'
  | 'fountain_of_life'
  | 'bloodthirst'
  | 'sacred_protection'
  | 'revive';

export interface SkillDefinition {
  id: SkillId;
  name: string;
  rarity: SkillRarity;
  category: SkillCategory;
  description: string;
  maxStacks: number;
  accentColor: string;
}

export type StageEventAfter = 'none' | 'valkyrie' | 'angel' | 'devil' | 'wheel';

export interface ChapterStageDef {
  stageNumber: number;
  name: string;
  isBossStage: boolean;
  bossTitle?: string;
  eventAfter?: StageEventAfter;
  obstaclePreset: 'courtyard' | 'pillars' | 'cross' | 'gauntlet' | 'sanctum';
  waves: Array<{
    enemies: Array<{ kind: EnemyKind; count: number; isElite?: boolean }>;
  }>;
}

export interface ChapterDefinition {
  id: number;
  name: string;
  zodiacId: string;
  zodiacIcon: string;
  zodiacName: string;
  regionName: string;
  subtitle: string;
  bossName: string;
  recommendedPower: number;
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
  stages: ChapterStageDef[];
}

export interface DailyQuestProgress {
  date: string;
  kills: number;
  stages: number;
  chests: number;
  upgrades: number;
  claimedIds: string[];
}

export interface CheckInProgress {
  count: number; // 0..7
  lastDate: string; // YYYY-MM-DD
}

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  masterVol: number; // 0..1
  bgmVol: number; // 0..1
  sfxVol: number; // 0..1
  graphicsQuality: GraphicsQuality;
  screenShake: boolean;
  showDamageNumbers: boolean;
  starfallWeather?: boolean;
}

export interface BattlePassProgress {
  seasonId: number;
  xp: number;
  premiumUnlocked: boolean;
  claimedFree: number[];
  claimedPremium: number[];
}

export interface PityState {
  mythicRollsSinceEpic: number;
  mythicRollsSinceSTier: number;
  runeRollsSinceEpic: number;
}

export interface CareerStats {
  totalKills: number;
  totalBossesKilled: number;
  totalRuns: number;
  maxComboEver: number;
  totalChestsOpened: number;
  seenEnemies: string[];
  seenSkills: string[];
}

export interface AchievementDefinition {
  id: string;
  title: string;
  desc: string;
  metric:
    | 'totalKills'
    | 'totalBossesKilled'
    | 'maxComboEver'
    | 'totalChestsOpened'
    | 'highestChapterCleared'
    | 'bestTowerFloor';
  target: number;
  rewardGold: number;
  rewardGems: number;
  unlockTitle?: string;
}

export interface MailItem {
  id: string;
  title: string;
  sender: string;
  body: string;
  date: string;
  rewardGold: number;
  rewardGems: number;
  bonusGearRarity?: Rarity;
  bonusSTier?: boolean;
  claimed: boolean;
}

export interface FlashDealItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  currency: 'gold' | 'gems' | 'free';
  originalPrice: number;
  price: number;
  discountPct: number;
  rewardKind: 'gold' | 'gems' | 'gear_epic' | 'gear_s' | 'rune_epic';
  amount: number;
}

export interface DailyFlashDealState {
  date: string;
  purchasedIds: string[];
}

export interface DailySweepState {
  date: string;
  remaining: number;
}

export type PetId =
  | 'solar_phoenix'
  | 'frost_owl'
  | 'storm_dragonet'
  | 'eclipse_fox'
  | 'jade_turtle'
  | 'star_fairy';

export interface PetDefinition {
  id: PetId;
  name: string;
  title: string;
  element: 'fire' | 'ice' | 'storm' | 'shadow' | 'earth' | 'star';
  rarity: 'Hiếm' | 'Sử Thi' | 'Huyền Thoại';
  desc: string;
  skillName: string;
  skillDesc: string;
  baseAtk: number;
  baseHp: number;
  baseCrit: number;
  unlockGems: number;
  unlockGold: number;
  primaryHex: number;
  secondaryHex: number;
  fireInterval: number;
}

export interface PetInstance {
  petId: PetId;
  level: number; // 1..30
}

export type HeroSkinId = 'default' | 'celestial_gold' | 'blood_moon' | 'jade_nebula' | 'arctic_frost';

export interface HeroSkinDefinition {
  id: HeroSkinId;
  name: string;
  badge: string;
  desc: string;
  unlockGems: number;
  unlockGold: number;
  cloakHex?: number;
  accentHex?: number;
  hairHex?: number;
  atkBonus: number;
  hpBonus: number;
}

export type AuraStyleId =
  | 'zodiac_gold'
  | 'arcane_eclipse'
  | 'aurora_emerald'
  | 'crimson_corona'
  | 'starlight_prism';

export interface AuraDefinition {
  id: AuraStyleId;
  name: string;
  desc: string;
  unlockGems: number;
  unlockGold: number;
  primaryHex: number;
  secondaryHex: number;
  critBonus: number;
}

export interface VipState {
  activeUntilDate: string; // YYYY-MM-DD, empty if inactive
  lastDailyClaimDate: string;
  starterPackClaimed: boolean;
}

export interface DailyRiftMutatorPair {
  id: string;
  title: string;
  subtitle: string;
  playerBuffTitle: string;
  playerBuffDesc: string;
  enemyChallengeTitle: string;
  enemyChallengeDesc: string;
  atkMult: number;
  playerSpeedMult: number;
  critBonus: number;
  enemyHpMult: number;
  enemySpeedMult: number;
  bossScaleMult: number;
}

export interface DailyRiftState {
  date: string;
  runsRemaining: number;
  clearedToday: boolean;
}

export interface ForgeRecipe {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  starDustCost: number;
  goldCost: number;
  rewardKind: 'gear_s_weapon' | 'gear_s_armor' | 'gear_s_accessory' | 'gear_epic_any' | 'pet_essence';
  rarity: Rarity;
  amount: number;
}

export interface CoopAllySummary {
  heroId: HeroId;
  name: string;
  damage: number;
  isMvp?: boolean;
}

export interface DamageBreakdown {
  basic: number;
  ultimate: number;
  pet: number;
  elemental: number;
  peakCrit: number;
  elapsedSeconds: number;
  coopAllies?: CoopAllySummary[];
}

export interface BuildPreset {
  id: string;
  name: string;
  heroId: HeroId;
  equipped: Partial<Record<GearSlot, string>>;
  equippedRunes: string[];
  equippedPetId: PetId | null;
  skinId: HeroSkinId;
  auraId: AuraStyleId;
}

export type GuildTechId = 'forge_might' | 'bastion_ward' | 'star_sight' | 'fortune_vault';

export interface GuildState {
  name: string;
  emblem: string;
  level: number;
  exp: number;
  guildCoins: number;
  lastTributeDate: string;
  tributeCountToday: number;
  techLevels: Record<GuildTechId, number>;
  bossRunsDate: string;
  bossRunsRemaining: number;
  bestGuildBossDamage: number;
  totalGuildBossDamage: number;
  claimedDamageTiers: string[];
}

export interface DestinyWheelPrize {
  id: string;
  label: string;
  badge: string;
  kind: 'gold' | 'gems' | 'star_dust' | 'pet_essence' | 'gear_epic' | 'gear_s';
  amount: number;
  color: string;
  weight: number;
}

export interface DestinyWheelState {
  eventId: string;
  freeSpinsDate: string;
  freeSpinsRemaining: number;
  tickets: number;
  totalSpins: number;
  claimedMilestones: number[];
  history: string[];
}

export interface SeasonMedalDefinition {
  id: string;
  title: string;
  tierLabel: string;
  desc: string;
  metric:
    | 'powerRating'
    | 'seasonScore'
    | 'guildBossDamage'
    | 'bestTowerFloor'
    | 'awakenedCount'
    | 'destinySpins';
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  atkBonus: number;
  hpBonus: number;
  accentColor: string;
}

export interface NightMarketOffer {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  currency: 'gold' | 'gems';
  originalPrice: number;
  price: number;
  discountPct: number;
  maxPurchases: number;
  rewardKind:
    | 'star_dust'
    | 'pet_essence'
    | 'gear_s'
    | 'socket_gem_t2'
    | 'destiny_ticket'
    | 'arena_ticket';
  amount: number;
}

export interface NightMarketState {
  date: string;
  purchasedCounts: Record<string, number>;
  totalGemsSpent: number;
  claimedSpendMilestones: number[];
}

export interface ArenaOpponent {
  id: string;
  name: string;
  title: string;
  heroId: HeroId;
  rating: number;
  powerRating: number;
  maxHp: number;
  attack: number;
  speedMult: number;
  weaponArchetype: WeaponArchetype;
  accentHex: number;
  cloakHex: number;
  hairHex: number;
  rewardPoints: number;
  rewardArenaCoins: number;
}

export interface ArenaState {
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  bestRating: number;
  arenaCoins: number;
  ticketsDate: string;
  ticketsRemaining: number;
  claimedRankTiers: string[];
}

export interface NoviceJourneyState {
  claimedTaskIds: string[];
  claimedDayMilestones: number[];
}

export type ElementalTowerId = 'fire' | 'ice' | 'storm';
export type ConstellationElement = 'fire' | 'earth' | 'air' | 'water';
export type ConstellationId =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type CoopRaidDifficulty = 'normal' | 'heroic' | 'mythic';

export interface GrowthFundState {
  premiumUnlocked: boolean;
  claimedFreeIds: string[];
  claimedPremiumIds: string[];
}

export interface ArenaShopState {
  date: string;
  purchasedCounts: Record<string, number>;
}

export interface CoopRaidState {
  date: string;
  dailyRewardsLeft: number;
  highestDifficulty: CoopRaidDifficulty | null;
  bestTeamDamage: number;
  totalClears: number;
}

export interface ElementalTowersState {
  fire: number;
  ice: number;
  storm: number;
}

export interface RunHistoryEntry {
  id: string;
  mode:
    | 'chapter'
    | 'tower'
    | 'boss_rush'
    | 'daily_rift'
    | 'guild_boss'
    | 'arena'
    | 'coop_raid'
    | 'elemental_tower';
  label: string;
  stageReached: number;
  kills: number;
  maxCombo: number;
  gold: number;
  gems: number;
  victory: boolean;
  heroId: HeroId;
  timestamp: number;
}

export interface SaveData {
  gold: number;
  gems: number;
  starDust?: number;
  petEssence?: number;
  highestChapterCleared: number;
  bestStagePerChapter: Record<number, number>;
  selectedHeroId: HeroId;
  unlockedHeroes: HeroId[];
  heroStars: Record<HeroId, number>;
  equipped: Record<GearSlot, string>;
  inventory: GearInstance[];
  equippedRunes: string[]; // rune instance uids (up to 4)
  runeInventory: RuneInstance[];
  muted: boolean;
  welcomeGiftClaimed?: boolean;
  checkIn?: CheckInProgress;
  dailyQuests?: DailyQuestProgress;
  talents?: Partial<Record<TalentId, number>>;
  bestTowerFloor?: number;
  bestBossRushRound?: number;
  battlePass?: BattlePassProgress;
  pity?: PityState;
  career?: CareerStats;
  achievementsClaimed?: string[];
  settings?: GameSettings;
  onboardingCompleted?: boolean;
  equippedTitle?: string;
  mailInbox?: MailItem[];
  flashDeals?: DailyFlashDealState;
  dailySweeps?: DailySweepState;
  runHistory?: RunHistoryEntry[];
  pets?: PetInstance[];
  equippedPetId?: PetId | null;
  unlockedSkins?: HeroSkinId[];
  equippedSkinByHero?: Partial<Record<HeroId, HeroSkinId>>;
  unlockedAuras?: AuraStyleId[];
  equippedAuraId?: AuraStyleId;
  vip?: VipState;
  dailyRift?: DailyRiftState;
  buildPresets?: BuildPreset[];
  guild?: GuildState;
  destinyWheel?: DestinyWheelState;
  seasonMedalsClaimed?: string[];
  socketGems?: SocketGemInstance[];
  nightMarket?: NightMarketState;
  arena?: ArenaState;
  noviceJourney?: NoviceJourneyState;
  growthFund?: GrowthFundState;
  arenaShop?: ArenaShopState;
  constellations?: Partial<Record<ConstellationId, number>>;
  coopRaid?: CoopRaidState;
  elementalTowers?: ElementalTowersState;
  commercialPackClaims?: Record<string, number>;
}

export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  amount: number;
  isCrit: boolean;
  isHeal?: boolean;
  label?: string;
  element?: 'fire' | 'ice' | 'storm' | 'poison' | 'playerHit';
  createdAt: number;
}

export interface JoystickState {
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
}

export interface HudRadarSnapshot {
  playerX: number; // -1..1 normalized arena coords
  playerZ: number; // -1..1
  playerYaw: number;
  portalOpen: boolean;
  enemies: Array<{ x: number; z: number; isBoss: boolean; isElite: boolean }>;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  shield: number;
  xp: number;
  xpToNext: number;
  level: number;
  stage: number;
  totalStages: number;
  stageName: string;
  chapterName: string;
  heroName: string;
  enemiesRemaining: number;
  portalOpen: boolean;
  isBossStage: boolean;
  lastPlayerHitAt: number;
  runGold: number;
  runGems: number;
  kills: number;
  dashCooldownRatio: number;
  ultCharge: number;
  ultName: string;
  revivesLeft: number;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2;
  isTowerMode: boolean;
  towerFloor: number;
  isBossRushMode?: boolean;
  bossRushRound?: number;
  bossRushTotalRounds?: number;
  isDailyRiftMode?: boolean;
  dailyRiftTitle?: string;
  isGuildBossMode?: boolean;
  guildBossTimeLeft?: number;
  guildBossTotalDamage?: number;
  isArenaMode?: boolean;
  arenaTimeLeft?: number;
  arenaOpponentName?: string;
  arenaOpponentHp?: number;
  arenaOpponentMaxHp?: number;
  isCoopRaidMode?: boolean;
  coopDifficulty?: CoopRaidDifficulty;
  coopAllies?: Array<{ heroId: HeroId; name: string; damage: number; ultCharge: number }>;
  isElementalTowerMode?: boolean;
  elementalTowerId?: ElementalTowerId;
  elementalTowerFloor?: number;
  activeSkills: Partial<Record<SkillId, number>>;
  stageBannerText: string | null;
  comboCount: number;
  comboTimerRatio: number;
  comboTierLabel: string;
  radarData?: HudRadarSnapshot;
}

export interface EncounterOffer {
  kind: 'angel' | 'devil';
  devilSkill?: SkillDefinition;
}

export interface WheelOutcome {
  label: string;
  kind: 'gold' | 'gems' | 'heal' | 'atk';
  amount: number;
  color: string;
}
