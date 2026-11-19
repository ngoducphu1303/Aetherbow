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
  equippedWingId?: WingId | null;
  wingLevel?: number;
  equippedMountId?: MountId | null;
  mountLevel?: number;
  equippedWeaponAuraId?: WeaponAuraId;
  weaponAuraLevel?: number;
  equippedArtifactId?: ArtifactId | null;
  artifactLevel?: number;
  activeBondCount?: number;
  equippedHaloId?: HaloId | null;
  haloLevel?: number;
  equippedPetEvolved?: boolean;
  codexRankLevel?: number;
  codexAtkPct?: number;
  codexHpPct?: number;
  mythicWeaponTier?: number;
  equippedWarBannerId?: WarBannerId | null;
  warBannerLevel?: number;
  altarTotalLevel?: number;
  lifeStealPct?: number;
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

export type WingId = 'aries_feather' | 'phoenix_blaze' | 'swan_nebula' | 'seraph_zodiac';

export interface WingDefinition {
  id: WingId;
  name: string;
  badge: string;
  rarity: 'Hiếm' | 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại';
  desc: string;
  featherStyle: 'blade' | 'flame' | 'crystal' | 'seraph';
  primaryHex: number;
  secondaryHex: number;
  spineHex: number;
  baseAtk: number;
  baseHp: number;
  baseCrit: number;
  baseAspd: number;
  atkPerLv: number;
  hpPerLv: number;
  unlockGems: number;
  unlockFeathers: number;
}

export type AvatarFrameId =
  | 'default_gold'
  | 'astral_crescent'
  | 'royal_vip'
  | 'world_dragon'
  | 'seraph_crown'
  | 'crystal_guardian';

export interface AvatarFrameDefinition {
  id: AvatarFrameId;
  name: string;
  tierLabel: string;
  desc: string;
  ringClass: string;
  glowColor: string;
  unlockMethodLabel: string;
  unlockGems?: number;
}

export type MythicBadgeId =
  | 'badge_wing_lord'
  | 'badge_world_slayer'
  | 'badge_crystal_shield'
  | 'badge_auction_tycoon'
  | 'badge_vip_sovereign'
  | 'badge_power_legend';

export interface MythicBadgeDefinition {
  id: MythicBadgeId;
  title: string;
  tierLabel: string;
  desc: string;
  metric:
    | 'powerRating'
    | 'worldBossBestDamage'
    | 'crystalBestWave'
    | 'auctionTrades'
    | 'topUpPoints'
    | 'wingLevelSum';
  target: number;
  atkBonus: number;
  hpBonus: number;
  bossDmgBonus: number;
  accentColor: string;
}

export type MonthlyCardTier = 'silver_astral' | 'royal_zodiac';

export interface MonthlyCardProgress {
  activeUntilDate: string;
  lastClaimDate: string;
}

export interface MonthlyPrivilegeState {
  silver: MonthlyCardProgress;
  royal: MonthlyCardProgress;
}

export interface TopUpEvolutionState {
  points: number;
  claimedTierIds: string[];
}

export interface AuctionLotItem {
  id: string;
  sellerName: string;
  itemKind: 'gear' | 'socket_gem';
  gear?: GearInstance;
  socketGem?: SocketGemInstance;
  label: string;
  rarity: Rarity;
  startingBid: number;
  currentBid: number;
  buyoutPrice: number;
  highestBidderIsPlayer: boolean;
  playerBidAmount: number;
  endsAt: number;
  status: 'active' | 'sold' | 'ended';
  isPlayerListing?: boolean;
}

export interface AuctionClaimEntry {
  id: string;
  title: string;
  gems?: number;
  gold?: number;
  gear?: GearInstance;
  socketGem?: SocketGemInstance;
  reason: string;
}

export interface AuctionHouseState {
  lastRefreshAt: number;
  lots: AuctionLotItem[];
  claimBox: AuctionClaimEntry[];
  totalTrades: number;
}

export interface CrystalDefenseState {
  date: string;
  runsRemaining: number;
  bestWave: number;
  totalClears: number;
}

export interface WorldBossState {
  date: string;
  dailyRunsRemaining: number;
  bestSingleDamage: number;
  totalDailyDamage: number;
  claimedMilestoneIds: string[];
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
    | 'elemental_tower'
    | 'crystal_defense'
    | 'world_boss'
    | 'blood_moon'
    | 'abyssal_gauntlet'
    | 'guild_war'
    | 'pantheon_expedition'
    | 'championship_3round'
    | 'crystal_vault'
    | 'dragon_lair';
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
  wingFeathers?: number;
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
  unlockedWings?: WingId[];
  wingLevels?: Partial<Record<WingId, number>>;
  equippedWingId?: WingId | null;
  unlockedAvatarFrames?: AvatarFrameId[];
  equippedAvatarFrameId?: AvatarFrameId;
  claimedMythicBadges?: MythicBadgeId[];
  equippedMythicBadgeId?: MythicBadgeId | null;
  monthlyPrivilege?: MonthlyPrivilegeState;
  topUpEvolution?: TopUpEvolutionState;
  auctionHouse?: AuctionHouseState;
  crystalDefense?: CrystalDefenseState;
  worldBoss?: WorldBossState;
  mountShards?: number;
  awakeningCrystals?: number;
  wishTickets?: number;
  unlockedMounts?: MountId[];
  mountLevels?: Partial<Record<MountId, number>>;
  equippedMountId?: MountId | null;
  unlockedWeaponAuras?: WeaponAuraId[];
  weaponAuraLevels?: Partial<Record<WeaponAuraId, number>>;
  equippedWeaponAuraId?: WeaponAuraId;
  wishPool?: WishPoolState;
  firstTopUp?: FirstTopUpState;
  claimedHotBundleIds?: string[];
  dispatch?: DispatchState;
  bloodMoon?: BloodMoonState;
  artifactShards?: number;
  unlockedArtifacts?: ArtifactId[];
  artifactLevels?: Partial<Record<ArtifactId, number>>;
  equippedArtifactId?: ArtifactId | null;
  mysticExchange?: MysticExchangeState;
  abyssalGauntlet?: AbyssalGauntletState;
  guildWar?: GuildWarState;
  unlockedDynamicTitles?: DynamicTitleId[];
  equippedDynamicTitleId?: DynamicTitleId;
  divineCrystals?: number;
  unlockedHalos?: HaloId[];
  haloLevels?: Partial<Record<HaloId, number>>;
  equippedHaloId?: HaloId | null;
  stepUpChain?: StepUpChainState;
  gemRebateVault?: AstralGemVaultState;
  pantheonExpedition?: PantheonExpeditionState;
  lobbySkyTheme?: LobbySkyThemeId;
  unlockedSkyThemes?: LobbySkyThemeId[];
  spiritCores?: number;
  evolvedPets?: PetId[];
  festivalState?: FestivalState;
  codexClaimedRanks?: number[];
  championship?: ChampionshipState;
  weekendPass?: WeekendPrivilegeState;
  honorFeed?: HonorMarqueeEntry[];
  reforgeStones?: number;
  mythicShards?: number;
  warCrests?: number;
  mythicWeapon?: MythicWeaponState;
  treasureWheel?: TreasureWheelState;
  supremeMonthly?: SupremeMonthlyPassState;
  blessingAltar?: BlessingAltarState;
  unlockedWarBanners?: WarBannerId[];
  warBannerLevels?: Partial<Record<WarBannerId, number>>;
  equippedWarBannerId?: WarBannerId | null;
  crystalVault?: CrystalVaultState;
  lobbyHeroPose?: LobbyHeroPoseId;
  // Wave 13 fields
  starlightGrass?: number;
  dragonScales?: number;
  blindBoxTickets?: number;
  unlockedAstralSteeds?: AstralSteedId[];
  astralSteedStars?: Partial<Record<AstralSteedId, number>>;
  equippedAstralSteedId?: AstralSteedId | null;
  starlightRace?: StarlightRaceState;
  soulRings?: SoulRingState;
  royalDutchAuction?: RoyalDutchAuctionState;
  royalBlindBox?: RoyalBlindBoxState;
  dragonLair?: DragonLairState;
  lobbyWeather?: LobbyWeatherId;
  unlockedVipFrames?: VipAvatarFrameId[];
  equippedVipFrameId?: VipAvatarFrameId | null;
  carnival7Day?: Carnival7DayState;
  evolvingFirstTopUp?: EvolvingFirstTopUpState;
}

export type MountId = 'aries_steed' | 'celestial_leo' | 'frost_unicorn' | 'crimson_wyrm';

export interface MountDefinition {
  id: MountId;
  name: string;
  badge: string;
  rarity: 'Hiếm' | 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại';
  desc: string;
  bodyHex: number;
  armorHex: number;
  maneHex: number;
  glowHex: number;
  baseAtk: number;
  baseHp: number;
  baseMoveSpeed: number;
  baseDr: number;
  atkPerLv: number;
  hpPerLv: number;
  unlockGems: number;
  unlockShards: number;
}

export type WeaponAuraId = 'none' | 'solar_flare' | 'astral_prism' | 'void_eclipse';

export interface WeaponAuraDefinition {
  id: WeaponAuraId;
  name: string;
  badge: string;
  rarity: 'Cơ Bản' | 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại';
  desc: string;
  primaryHex: number;
  secondaryHex: number;
  baseAtkPct: number;
  baseCritDmg: number;
  atkPctPerLv: number;
  critDmgPerLv: number;
  unlockGems: number;
  unlockCrystals: number;
}

export type LobbyCameraPreset = 'overview' | 'closeup' | 'wardrobe';

export interface WardrobePreviewOverrides {
  skinId?: HeroSkinId;
  wingId?: WingId | null;
  mountId?: MountId | null;
  weaponAuraId?: WeaponAuraId;
  haloId?: HaloId | null;
}

export type WishTargetKind = 'hero' | 'wing' | 'mount' | 's_gear';

export interface WishTargetItem {
  id: string;
  kind: WishTargetKind;
  refId: string;
  name: string;
  badge: string;
  desc: string;
  accentColor: string;
}

export interface WishPoolState {
  selectedTargetId: string;
  pityCount: number;
  totalWishes: number;
  claimedMilestones: number[];
  recentLogs: string[];
}

export interface FirstTopUpTier {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  priceLabel: string;
  baseGems: number;
  bonusGemsFirstTime: number;
  topUpPoints: number;
  bonusMountShards: number;
  bonusAwakeningCrystals: number;
  bonusSGear: boolean;
  accent: 'sky' | 'amber' | 'rose';
}

export interface FirstTopUpState {
  claimedTierIds: string[];
}

export interface HotFlashBundle {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  discountLabel: string;
  originalGemsLabel: string;
  costGems: number;
  rewardGems: number;
  rewardGold: number;
  rewardMountShards: number;
  rewardCrystals: number;
  rewardWishTickets: number;
  rewardFeathers: number;
  topUpPoints: number;
}

export interface DispatchMissionDef {
  id: string;
  title: string;
  region: string;
  rank: 'A' | 'S' | 'SS';
  durationSec: number;
  rewardGold: number;
  rewardGems: number;
  rewardMountShards: number;
  rewardCrystals: number;
  rewardFeathers: number;
  accentColor: string;
}

export interface DispatchSlotState {
  slotIndex: number;
  missionId: string | null;
  heroId: HeroId | null;
  startedAt: number;
  endsAt: number;
}

export interface DispatchState {
  slots: DispatchSlotState[];
  completedCount: number;
}

export interface BloodMoonMilestone {
  score: number;
  title: string;
  rewardGems: number;
  rewardMountShards: number;
  rewardCrystals: number;
  rewardFeathers: number;
}

export interface BloodMoonState {
  date: string;
  dailyRunsRemaining: number;
  bestScore: number;
  totalClears: number;
  claimedMilestones: number[];
}

export type ArtifactId =
  | 'astral_astrolabe'
  | 'phoenix_orb'
  | 'frost_prism'
  | 'eclipse_chalice';

export interface MythicArtifactDefinition {
  id: ArtifactId;
  name: string;
  badge: string;
  elementLabel: string;
  desc: string;
  primaryHex: number;
  secondaryHex: number;
  baseAtk: number;
  baseHp: number;
  baseCrit: number;
  baseBossDmg: number;
  atkPerLv: number;
  hpPerLv: number;
  critPerLv: number;
  unlockGems: number;
  unlockArtifactShards: number;
}

export interface HeroBondDefinition {
  id: string;
  name: string;
  subtitle: string;
  heroIds: HeroId[];
  minTotalStars: number;
  bonusAtkPct: number;
  bonusHpPct: number;
  bonusCrit: number;
  bonusCritDmg: number;
  accentColor: string;
}

export type MysticCurrencyKind =
  | 'starDust'
  | 'petEssence'
  | 'wingFeathers'
  | 'mountShards'
  | 'awakeningCrystals'
  | 'mysticTokens';

export interface MysticExchangeOffer {
  id: string;
  title: string;
  desc: string;
  badge: string;
  inputKind: MysticCurrencyKind;
  inputAmount: number;
  outputKind: 'mysticTokens' | 'artifactShards' | 'gems' | 'mountShards' | 'awakeningCrystals' | 's_gear';
  outputAmount: number;
  weeklyLimit: number;
}

export interface MysticExchangeState {
  weekKey: string;
  mysticTokens: number;
  artifactShards: number;
  weeklyClaims: Record<string, number>;
}

export interface AbyssalMilestone {
  wave: number;
  title: string;
  rewardGems: number;
  rewardArtifactShards: number;
  rewardMysticTokens: number;
}

export interface AbyssalGauntletState {
  date: string;
  dailyRunsRemaining: number;
  bestWave: number;
  bestScore: number;
  totalClears: number;
  claimedMilestones: number[];
}

export interface GuildWarWeeklyBox {
  score: number;
  title: string;
  rewardGems: number;
  rewardGuildCoins: number;
  rewardArtifactShards: number;
  rewardMysticTokens: number;
}

export interface GuildWarState {
  weekKey: string;
  dailyRunsRemaining: number;
  lastRunDate: string;
  weeklyScore: number;
  totalNodesCaptured: number;
  claimedWeeklyBoxes: number[];
}

export type DynamicTitleId =
  | 'none'
  | 'star_challenger'
  | 'dragon_slayer'
  | 'abyss_conqueror'
  | 'guild_champion'
  | 'mythic_sovereign';

export interface DynamicTitleDef {
  id: DynamicTitleId;
  title: string;
  unlockHint: string;
  gradientClass: string;
  borderClass: string;
  bonusAtk: number;
  bonusHp: number;
}

export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  amount: number;
  isCrit: boolean;
  isSuperCrit?: boolean;
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
  bossLayers?: number;
  bossCurrentLayer?: number;
  bossShield?: number;
  bossMaxShield?: number;
  bossStunTimer?: number;
  bossBrokenBannerTimer?: number;
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
  isCrystalDefenseMode?: boolean;
  crystalWave?: number;
  crystalTotalWaves?: number;
  crystalHp?: number;
  crystalMaxHp?: number;
  isWorldBossMode?: boolean;
  worldBossTimeLeft?: number;
  worldBossTotalDamage?: number;
  worldBossRank?: number;
  isBloodMoonMode?: boolean;
  bloodMoonTimeLeft?: number;
  bloodMoonScore?: number;
  bloodMoonWave?: number;
  isAbyssalMode?: boolean;
  abyssalWave?: number;
  abyssalTotalWaves?: number;
  abyssalScore?: number;
  isGuildWarMode?: boolean;
  guildWarTimeLeft?: number;
  guildWarScore?: number;
  guildWarNodes?: number;
  isPantheonMode?: boolean;
  pantheonStage?: number;
  pantheonTotalStages?: number;
  pantheonScore?: number;
  pantheonBlessingTitle?: string;
  isChampionshipMode?: boolean;
  championshipRound?: number;
  championshipTotalRounds?: number;
  championshipScore?: number;
  championshipRivalName?: string;
  championshipTacticsOffer?: ChampionshipTacticDef[] | null;
  isCrystalVaultMode?: boolean;
  vaultTimeLeft?: number;
  vaultPillarsBroken?: number;
  vaultWave?: number;
  vaultGemsLooted?: number;
  vaultReforgeLooted?: number;
  vaultShardsLooted?: number;
  isDragonLairMode?: boolean;
  dragonTimeLeft?: number;
  dragonPhase?: 1 | 2 | 3;
  dragonBreathWarning?: boolean;
  dragonScalesLooted?: number;
  dragonDamageDealt?: number;
  activeSkills: Partial<Record<SkillId, number>>;
  stageBannerText: string | null;
  comboCount: number;
  comboTimerRatio: number;
  comboTierLabel: string;
  comboDmgBonusPct?: number;
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

export type HaloId =
  | 'solar_crown'
  | 'lunar_eclipse'
  | 'stellar_wheel'
  | 'seraphim_glory';

export interface DivineHaloDefinition {
  id: HaloId;
  name: string;
  badge: string;
  elementLabel: string;
  desc: string;
  primaryHex: number;
  secondaryHex: number;
  baseAtkPct: number;
  baseHpPct: number;
  baseCritDmg: number;
  baseDr: number;
  atkPctPerLv: number;
  hpPctPerLv: number;
  critDmgPerLv: number;
  unlockGems: number;
  unlockDivineCrystals: number;
}

export interface StepUpChainStep {
  step: number;
  title: string;
  subtitle: string;
  badge: string;
  valueLabel: string;
  costGems: number; // 0 = Free step
  rewardGold: number;
  rewardGems: number;
  rewardDivineCrystals: number;
  rewardArtifactShards: number;
  rewardWishTickets: number;
  rewardSGear?: boolean;
  unlockHaloId?: HaloId;
  topUpPoints: number;
}

export interface StepUpChainState {
  currentStep: number; // 1..5 (6 = completed cycle)
  claimedSteps: number[];
  cycleCount: number;
}

export interface AstralGemVaultMilestone {
  storedTarget: number;
  title: string;
  dividendGems: number;
  bonusDivineCrystals: number;
  bonusWishTickets: number;
}

export interface AstralGemVaultState {
  storedGems: number;
  totalDepositedEver: number;
  vaultBrokenCount: number;
  claimedMilestoneTargets: number[];
}

export type PantheonBlessingId = 'blessing_wrath' | 'blessing_starlight' | 'blessing_immortal';

export interface PantheonBlessingDef {
  id: PantheonBlessingId;
  name: string;
  badge: string;
  desc: string;
  atkBonusPct: number;
  critBonus: number;
  drBonus: number;
  accentColor: string;
}

export interface PantheonMilestone {
  score: number;
  title: string;
  rewardGems: number;
  rewardDivineCrystals: number;
  rewardArtifactShards: number;
}

export interface PantheonExpeditionState {
  date: string;
  dailyRunsRemaining: number;
  selectedBlessingId: PantheonBlessingId;
  bestDeityStage: number; // 0..3
  bestScore: number;
  totalClears: number;
  claimedMilestones: number[];
}

// ============================================================================
// WAVE 11 TYPES: DYNAMIC 3D LOBBY SKY, SPIRIT BEAST EVOLUTION, CELESTIAL
// FESTIVAL, CODEX COLLECTION BUFFS, 3-ROUND CHAMPIONSHIP & WEEKEND TREASURY
// ============================================================================

export type LobbySkyThemeId =
  | 'golden_galaxy'
  | 'dawn_sanctum'
  | 'lunar_eclipse'
  | 'crimson_moon';

export interface LobbySkyThemeDef {
  id: LobbySkyThemeId;
  name: string;
  badge: string;
  desc: string;
  skyHex: number;
  fogHex: number;
  keyLightHex: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  pedestalMarbleHex: number;
  pedestalGoldHex: number;
  crystalHex: number;
  starfallHex: number;
  swatchGradient: string;
  unlockGems: number; // 0 = Free default
  unlockCodexScore?: number;
}

export type MysteryBoxTierId = 'nebula' | 'eclipse' | 'supreme';

export interface FestivalQuestDef {
  id: string;
  title: string;
  desc: string;
  metric: 'runs' | 'kills' | 'chests' | 'championship_wins' | 'evolved_pets' | 'codex_score' | 'hero_count';
  target: number;
  rewardLanterns: number;
  rewardGold: number;
  rewardGems: number;
}

export interface FestivalMilestoneDef {
  lanternsTarget: number;
  title: string;
  rewardGems: number;
  rewardSpiritCores: number;
  rewardDivineCrystals: number;
  rewardWishTickets: number;
}

export interface MysteryBoxDropOdds {
  label: string;
  chancePct: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
}

export interface MysteryBoxDef {
  id: MysteryBoxTierId;
  name: string;
  badge: string;
  discountLabel: string;
  originalGems: number;
  costGems: number;
  maxWeeklyPurchases: number;
  lanternsBonus: number;
  guaranteedSummary: string;
  drops: MysteryBoxDropOdds[];
}

export interface FestivalState {
  weekKey: string;
  lanterns: number;
  claimedQuestIds: string[];
  claimedMilestones: number[];
  mysteryBoxPurchases: Partial<Record<MysteryBoxTierId, number>>;
  totalBoxesOpened: number;
}

export interface CodexRankDef {
  rank: number;
  title: string;
  pointsRequired: number;
  atkPctBonus: number;
  hpPctBonus: number;
  critBonus: number;
  goldPctBonus: number;
  rewardGems: number;
  rewardSpiritCores: number;
}

export interface CodexSummary {
  totalPoints: number;
  heroPoints: number;
  petPoints: number;
  cosmeticPoints: number;
  artifactHaloPoints: number;
  currentRank: CodexRankDef;
  nextRank: CodexRankDef | null;
  totalAtkPct: number;
  totalHpPct: number;
  totalCrit: number;
  totalGoldPct: number;
}

export type ChampionshipTacticId =
  | 'tactic_fury'
  | 'tactic_vampiric'
  | 'tactic_executioner'
  | 'tactic_aegis'
  | 'tactic_rapidfire'
  | 'tactic_spirit_surge';

export interface ChampionshipTacticDef {
  id: ChampionshipTacticId;
  name: string;
  badge: string;
  desc: string;
  atkBonusPct?: number;
  critBonus?: number;
  aspdBonus?: number;
  drBonus?: number;
  healPct?: number;
  shieldPct?: number;
  ultFill?: number;
  accentClass: string;
}

export interface ChampionshipMilestoneDef {
  trophiesTarget: number;
  title: string;
  rewardGems: number;
  rewardSpiritCores: number;
  rewardLanterns: number;
  rewardWishTickets: number;
}

export interface ChampionshipState {
  date: string;
  dailyRunsRemaining: number;
  gloryTrophies: number;
  bestRoundCleared: number; // 0..3
  championshipTitlesWon: number;
  claimedCupMilestones: number[];
}

export interface WeekendPrivilegePackDef {
  id: string;
  name: string;
  badge: string;
  discountLabel: string;
  originalGems: number;
  costGems: number;
  isBestSeller?: boolean;
  subtitle: string;
  rewardGold: number;
  rewardGems: number;
  rewardSpiritCores: number;
  rewardDivineCrystals: number;
  rewardLanterns: number;
  rewardWishTickets: number;
  rewardSGear?: boolean;
  activatesWeekendPass?: boolean;
  topUpPoints: number;
}

export interface WeekendPrivilegeState {
  passActive: boolean;
  daysRemaining: number;
  lastClaimDate: string;
  purchasedPackIds: string[];
  weekKey: string;
}

export interface BundlePreviewItem {
  label: string;
  quantity: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  note?: string;
}

export interface BundlePreviewPayload {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  priceLabel: string;
  originalPriceLabel?: string;
  valueTag?: string;
  canAfford: boolean;
  disabledReason?: string;
  items: BundlePreviewItem[];
  dropOdds?: MysteryBoxDropOdds[];
  confirmLabel: string;
  onConfirm: () => void;
}

export interface HonorMarqueeEntry {
  id: string;
  playerName: string;
  badge: string;
  message: string;
  accent: 'gold' | 'emerald' | 'purple' | 'rose';
  isUser?: boolean;
}

// ============================================================================
// WAVE 12 TYPES: MYTHIC WEAPON TRANSCENDENCE & GOLDEN REFORGE, ZODIAC
// TREASURE WHEEL & SUPREME MONTHLY CARD, CRYSTAL VAULT 3D RAID, BLESSING ALTAR
// & 3D WAR BANNERS, PHOTO MODE POSES, LIVE CP BREAKDOWN & CLAIM ALL
// ============================================================================

export type MythicGoldenStatKind =
  | 'atk_pct'
  | 'crit_pct'
  | 'crit_dmg'
  | 'boss_dmg'
  | 'aspd_pct'
  | 'lifesteal_pct';

export type GoldenStatTier = 'rare' | 'epic' | 'legendary' | 'mythic';

export interface MythicGoldenStatSlot {
  slotIndex: number; // 0..2
  kind: MythicGoldenStatKind;
  value: number; // e.g. 0.12 = +12%
  tier: GoldenStatTier;
  locked: boolean;
}

export interface MythicWeaponState {
  tier: number; // 0..5
  goldenStats: MythicGoldenStatSlot[];
  totalReforges: number;
}

export interface TreasureWheelSlotDef {
  index: number; // 0..11
  id: string;
  label: string;
  shortLabel: string;
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  weight: number;
  rewardKind:
    | 'gold'
    | 'gems'
    | 'reforgeStones'
    | 'mythicShards'
    | 'warCrests'
    | 'spiritCores'
    | 'wishTickets'
    | 'jackpot_mythic';
  amount: number;
}

export interface TreasureWheelState {
  pityCount: number; // 0..9 -> 10 guarantees mythic jackpot
  totalSpins: number;
  lastRewardLabel: string;
  claimedMilestoneSpins: number[];
}

export interface SupremeMonthlyPassState {
  active: boolean;
  daysRemaining: number; // 0..30
  lastClaimDate: string;
  totalActivatedCount: number;
}

export type AltarBlessingId = 'altar_fury' | 'altar_aegis' | 'altar_fortune' | 'altar_breaker';

export interface AltarBlessingDef {
  id: AltarBlessingId;
  name: string;
  subtitle: string;
  maxLevel: number;
  atkPctPerLv: number;
  hpPctPerLv: number;
  critPerLv: number;
  bossDmgPerLv: number;
  goldPctPerLv: number;
  accentHex: number;
}

export interface BlessingAltarState {
  levels: Record<AltarBlessingId, number>;
  totalSacrifices: number;
}

export type WarBannerId = 'banner_solar' | 'banner_lunar' | 'banner_storm' | 'banner_phoenix';

export interface WarBannerDef {
  id: WarBannerId;
  name: string;
  badge: string;
  desc: string;
  clothHex: number;
  trimHex: number;
  emblemHex: number;
  baseAtkPct: number;
  baseHpPct: number;
  baseBossDmg: number;
  atkPctPerLv: number;
  hpPctPerLv: number;
  unlockGems: number;
  unlockWarCrests: number;
}

export interface CrystalVaultMilestone {
  pillarsTarget: number;
  title: string;
  rewardGems: number;
  rewardReforgeStones: number;
  rewardMythicShards: number;
  rewardWarCrests: number;
}

export interface CrystalVaultState {
  date: string;
  dailyRunsRemaining: number;
  bestPillarsBroken: number;
  totalPillarsBroken: number;
  totalVaultGems: number;
  claimedMilestones: number[];
}

export type LobbyHeroPoseId = 'heroic' | 'aim_ready' | 'astral_float' | 'victory_salute';

export interface CombatPowerCategoryItem {
  id: 'gear_mythic' | 'hero_talents' | 'pets' | 'cosmetics_halo' | 'altar_banner' | 'codex_bonds';
  label: string;
  score: number;
  sharePct: number;
  statusLabel: string;
  targetAction: 'gear' | 'mythic_forge' | 'heroes' | 'pets' | 'wardrobe' | 'altar_banner' | 'codex';
  actionLabel: string;
  accentClass: string;
}

export interface CombatPowerAnalysis {
  totalPower: number;
  rankLabel: string;
  categories: CombatPowerCategoryItem[];
  weakestCategory: CombatPowerCategoryItem;
}

export interface ClaimAllSourceItem {
  id: string;
  label: string;
  detail: string;
  count: number;
}

export interface ClaimAllPreview {
  totalClaimableCount: number;
  sources: ClaimAllSourceItem[];
}

// ============================================================================
// WAVE 13 TYPES: ASTRAL STEEDS 3D & STARLIGHT RACE, MULTI-TIER SOUL RINGS &
// SPIRIT JADE FUSION, ROYAL DUTCH AUCTION & BLIND BOX, ANCIENT DRAGON LAIR 3D,
// 3D LOBBY WEATHER & ANIMATED VIP FRAMES, 7-DAY CARNIVAL & 3-TIER FIRST TOP-UP
// ============================================================================

export type AstralSteedId =
  | 'galaxy_pegasus'
  | 'frost_starwolf'
  | 'eclipse_phoenix'
  | 'golden_sovereign_dragon';

export interface AstralSteedDef {
  id: AstralSteedId;
  name: string;
  badge: string;
  rarity: 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại' | 'Chí Tôn';
  desc: string;
  bodyHex: number;
  armorHex: number;
  accentHex: number;
  glowHex: number;
  baseAtkPct: number;
  baseHpPct: number;
  baseMoveSpeed: number;
  baseCrit: number;
  atkPctPerStar: number;
  hpPctPerStar: number;
  raceSpeedRating: number; // 100..160 for Starlight Race
  unlockGrass: number;
  unlockGems: number;
}

export interface StarlightRaceMilestone {
  pointsTarget: number;
  title: string;
  rewardGems: number;
  rewardGrass: number;
  rewardDragonScales: number;
  rewardBlindBoxTickets: number;
}

export interface StarlightRaceState {
  date: string;
  dailyRunsRemaining: number;
  totalRacePoints: number;
  bestLapTimeSec: number;
  claimedMilestones: number[];
  lastRaceLog: string;
}

export type SoulRingSlotId =
  | 'ring_silver'
  | 'ring_gold'
  | 'ring_amethyst'
  | 'ring_crimson'
  | 'ring_aurora';

export interface SoulRingDef {
  id: SoulRingSlotId;
  tierIndex: number; // 1..5
  name: string;
  badge: string;
  statLabel: string;
  ringHex: number;
  emissiveHex: number;
  requiredJadeTier: 1 | 2 | 3 | 4 | 5;
  atkPctPerLv: number;
  hpPctPerLv: number;
  critPerLv: number;
  bossDmgPerLv: number;
  critDmgPerLv: number;
}

export interface SoulRingState {
  levels: Record<SoulRingSlotId, number>; // 0..10
  spiritJades: [number, number, number, number, number]; // Tier 1..5 counts
  totalFusions: number;
}

export interface RoyalDutchLotDef {
  id: string;
  title: string;
  subtitle: string;
  rarity: 'epic' | 'legendary' | 'mythic';
  startGems: number;
  floorGems: number;
  dropStepGems: number;
  rewardKind:
    | 'starlightGrass'
    | 'dragonScales'
    | 'spiritJadeT3'
    | 'spiritJadeT4'
    | 'blindBoxTickets'
    | 'mythicShards';
  rewardAmount: number;
  bonusGold: number;
}

export interface RoyalDutchAuctionState {
  sessionStartedAt: number;
  purchasedLotIds: string[];
  refreshCount: number;
}

export interface BlindBoxSlotReward {
  boxIndex: number; // 0..8
  label: string;
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  isGrandPrize: boolean;
  rewardGems: number;
  rewardGold: number;
  rewardGrass: number;
  rewardDragonScales: number;
  rewardJadeTier?: 1 | 2 | 3 | 4;
  rewardJadeAmount?: number;
}

export interface RoyalBlindBoxState {
  cycleNumber: number;
  grandPrizeIndex: number; // 0..8
  openedBoxes: Record<number, BlindBoxSlotReward>;
  totalBoxesOpened: number;
  sessionEndsAt: number;
}

export interface DragonLairMilestone {
  scalesTarget: number;
  title: string;
  rewardGems: number;
  rewardDragonScales: number;
  rewardGrass: number;
  rewardBlindBoxTickets: number;
  rewardJadeT3: number;
}

export interface DragonLairState {
  date: string;
  dailyRunsRemaining: number;
  bestDamage: number;
  totalClears: number;
  totalScalesEarned: number;
  claimedMilestones: number[];
}

export type LobbyWeatherId =
  | 'clear'
  | 'meteor_shower'
  | 'starlight_snow'
  | 'sakura_petals'
  | 'golden_embers';

export interface LobbyWeatherDef {
  id: LobbyWeatherId;
  name: string;
  shortDesc: string;
  swatchClass: string;
  particleHex: number;
  secondaryHex: number;
}

export type VipAvatarFrameId =
  | 'vip_royal_gold'
  | 'vip_nebula_flow'
  | 'vip_diamond_crown'
  | 'vip_dragon_soul';

export interface VipAvatarFrameDef {
  id: VipAvatarFrameId;
  name: string;
  tierLabel: string;
  desc: string;
  frameClass: string;
  bonusAtk: number;
  bonusHp: number;
  unlockVipLevel: number;
  unlockDragonScales: number;
  unlockGems: number;
}

export interface CarnivalDayTaskDef {
  id: string;
  day: number; // 1..7
  title: string;
  desc: string;
  metric:
    | 'login_days'
    | 'runs'
    | 'kills'
    | 'soul_ring_lv'
    | 'steed_count'
    | 'dragon_scales'
    | 'blind_boxes';
  target: number;
  points: number;
  rewardGold: number;
  rewardGems: number;
  rewardGrass?: number;
  rewardJadeT1?: number;
  rewardBlindBoxTickets?: number;
}

export interface CarnivalPointMilestone {
  pointsTarget: number;
  title: string;
  rewardGems: number;
  rewardGrass: number;
  rewardBlindBoxTickets: number;
  unlockSteedId?: AstralSteedId;
}

export interface Carnival7DayState {
  startDate: string;
  daysLoggedIn: number; // 1..7
  lastLoginDate: string;
  claimedTaskIds: string[];
  claimedMilestones: number[];
}

export interface EvolvingFirstTopUpTierDef {
  tier: 1 | 2 | 3;
  id: 'tier_origin' | 'tier_golden' | 'tier_sovereign';
  title: string;
  subtitle: string;
  badge: string;
  valueLabel: string;
  costGems: number;
  rewardGems: number;
  rewardGold: number;
  rewardGrass: number;
  rewardDragonScales: number;
  rewardBlindBoxTickets: number;
  rewardJadeT2: number;
  rewardMythicShards: number;
  unlockSteedId?: AstralSteedId;
  unlockVipFrameId?: VipAvatarFrameId;
  topUpPoints: number;
}

export interface EvolvingFirstTopUpState {
  claimedTiers: number[]; // [1, 2, 3]
}

export interface TopPlayerBuildProfile {
  rank: number;
  name: string;
  guild: string;
  titleBadge: string;
  powerRating: number;
  heroId: HeroId;
  heroStar: number;
  astralSteedId: AstralSteedId;
  steedStar: number;
  warBannerId: WarBannerId;
  vipFrameId: VipAvatarFrameId;
  mythicWeaponTier: number;
  soulRingTotalLv: number;
  signatureQuote: string;
}



