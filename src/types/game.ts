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

export type HeroId = 'artemis' | 'hatsune_miku' | 'aurelia' | 'bellona' | 'sylvia' | 'celeste';

export type CrownStyle =
  | 'crescent'
  | 'ranger_band'
  | 'thor_wings'
  | 'wukong_circlet'
  | 'cleo_crown'
  | 'rolla_tiara'
  | 'demon_horns'
  | 'vampire_collar'
  | 'witch_hat';

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
  roleTag?: SkillBuildTag;
  unlockChapterReq?: number;
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

export type EliteAffix =
  | 'aegis'
  | 'haste'
  | 'volatile'
  | 'frost'
  | 'vanguard_link'
  | 'quake_pulse';

export type TacticalRoomModifierId =
  | 'leyline_conduit'
  | 'fragile_sanctuary'
  | 'vanguard_phalanx'
  | 'elemental_resonance'
  | 'haste_currents';

export interface TacticalRoomModifierSnapshot {
  id: TacticalRoomModifierId;
  name: string;
  shortRule: string;
  symbol: string;
  accentHex: string;
  buffActive?: boolean;
}

export type TacticalCrossroadsId = 'ambush_vault' | 'sanctuary_spring' | 'rune_bastion';

export type EnemyFormationDoctrine = 'pincer_flank' | 'balanced_line' | 'shield_wall';

export interface TacticalCrossroadsOption {
  id: TacticalCrossroadsId;
  title: string;
  subtitle: string;
  glyph: string;
  accentHex: string;
  doctrine: EnemyFormationDoctrine;
  doctrineLabel: string;
  riskSummary: string;
  rewardSummary: string;
  enemyHpMult: number;
  enemyDmgMult: number;
  goldBonusPct: number;
  starDustBonusPct: number;
  instantHealRatio: number;
  bonusAtkPct: number;
  bonusCritPct: number;
}

export type GearSetId =
  | 'Destruction Set'
  | 'Echo Set'
  | 'Dragon Knight Set'
  | 'Oracle Set'
  | 'Griffin Set';

export interface GearSetBonusTier {
  piecesRequired: 2 | 3;
  label: string;
  atkPct?: number;
  hpPct?: number;
  critChance?: number;
  critDamage?: number;
  attackSpeed?: number;
  moveSpeed?: number;
  damageReduction?: number;
  bossDamageBonus?: number;
}

export interface GearSetDefinition {
  id: GearSetId;
  displayName: string;
  accentColor: string;
  maxPieces: number;
  tiers: GearSetBonusTier[];
}

export interface ActiveGearSetBonus {
  setId: GearSetId;
  displayName: string;
  accentColor: string;
  equippedCount: number;
  maxPieces: number;
  unlockedTiers: GearSetBonusTier[];
  nextTier?: GearSetBonusTier;
}

export interface SideModeScaling {
  chapterTier: number;
  enemyHpScale: number;
  enemyDmgScale: number;
  goldRewardMult: number;
  starDustBonus: number;
  label: string;
}

export type KpiGradeStatus = 'pass' | 'warn' | 'insufficient';

export interface KpiEvaluationRow {
  id: string;
  label: string;
  actualText: string;
  targetText: string;
  status: KpiGradeStatus;
  note: string;
}

export interface PlaytestKpiContext {
  highestChapterCleared?: number;
  activeSetCount?: number;
  maxMasteryLevel?: number;
}

export type ArenaHazardType = 'solar_eruption' | 'frost_zone' | 'void_pulse';

export type LoadoutPresetSlotId = 'preset_1' | 'preset_2' | 'preset_3';

export interface LoadoutPreset {
  slotId: LoadoutPresetSlotId;
  name: string;
  heroId: HeroId;
  equipped: Partial<Record<GearSlot, string>>;
  equippedRunes: string[];
  equippedPetId?: PetId | null;
  equippedWingId?: WingId | null;
  savedAt: number;
}

export interface ChapterEquipmentPreset {
  chapterId: number;
  skinId: HeroSkinId;
  equipped: SaveData['equipped'];
}

export interface ChapterMilestoneProgress {
  chapterId: number;
  clears: number;
  starsEarned: number[];
  bestEndHpRatio?: number;
  bestPerfectDodges?: number;
  bestBossGuardBreaks?: number;
}

export interface HeroMasteryProgress {
  level: number; // 1..10
  exp: number;
  totalRuns: number;
}

export interface HeroMasteryBonuses {
  level: number;
  exp: number;
  nextExp: number;
  isMax: boolean;
  atkPct: number;
  hpPct: number;
  critChance: number;
  bossDamageBonus: number;
  cpBonus: number;
  summaryLabel: string;
}

export interface EndlessTowerFloorScaling {
  floor: number;
  enemyHpScale: number;
  enemyDmgScale: number;
  goldReward: number;
  starDustReward: number;
  gemReward: number;
  enableHazards: boolean;
  enableDualAffixElites: boolean;
  enableBossPhaseThree: boolean;
  label: string;
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

export type MythicImprintAspectId =
  | 'solar_sunder'
  | 'astral_pierce'
  | 'jade_aegis'
  | 'lunar_execution';

export interface MythicZodiacImprint {
  aspectId: MythicImprintAspectId;
  tier: number; // 1..5
}

export interface GearInstance {
  uid: string;
  templateId: string;
  rarity: Rarity;
  level: number;
  awakeningLevel?: number; // 0..3
  substats?: GearSubstat[];
  socketedGems?: string[]; // SocketGemInstance uids
  transmutedSetId?: GearSetId; // Wave 15: Deterministic Gear Set Transmutation override
  mythicImprint?: MythicZodiacImprint; // Wave 17: Mythic Zodiac Imprint (+1..+5, gated Ch.4+ & MYTHIC)
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
  activeGearSets?: ActiveGearSetBonus[];
  heroMasteryLevel?: number;
  heroMasteryBonusLabel?: string;
  paragonInfusionLevel?: number;
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

export type SkillBuildTag = 'aoe' | 'boss' | 'sustain' | 'hybrid';

export type SkillSynergyId =
  | 'storm_chain'
  | 'piercing_volley'
  | 'inferno_meteor'
  | 'boss_barrage'
  | 'frost_shatter'
  | 'homing_blades'
  | 'aegis_sanctuary'
  | 'solar_orbit'
  | 'venom_eclipse';

export type SkillSynergyTier = 1 | 2 | 3;

export interface ActiveSkillSynergyTierInfo {
  id: SkillSynergyId;
  tier: SkillSynergyTier;
  totalStacks: number;
  nextTierStacks: number | null;
  powerScale: number;
}

export interface SkillSynergyDef {
  id: SkillSynergyId;
  name: string;
  buildTag: 'aoe' | 'boss' | 'sustain';
  groupA: SkillId[];
  groupB: SkillId[];
  shortEffect: string;
  accentColor: string;
}

export interface SkillDefinition {
  id: SkillId;
  name: string;
  rarity: SkillRarity;
  category: SkillCategory;
  description: string;
  maxStacks: number;
  accentColor: string;
  buildTag?: SkillBuildTag;
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

export type GpuCapabilityTier = 'software' | 'integrated' | 'discrete';

export type Chapter1MapVariant = 'none' | 'lite' | 'full';

export type Boss3dModelVariant = 'none' | 'lite' | 'high';

export type Chapter1MapMode = 'auto' | 'lite_3d' | 'light' | 'high_3d';

export type LowEndSafetyMode = 'auto' | 'on' | 'off';

export type DeviceHardwareTier = 'ultra_lite' | 'lite' | 'balanced' | 'high';

export interface SystemLiteBudget {
  deviceTier: DeviceHardwareTier;
  liteActive: boolean;
  targetCombatFps: 12 | 24 | 30 | 45 | 60;
  targetLobbyFps: 12 | 20 | 30;
  maxPixelBudget: number;
  maxDpr: number;
  minAdaptiveDprScale: number;
  maxTextureSize: 512 | 1024 | 2048 | 4096;
  arenaTextureSize: 256 | 512;
  shadowMapSize: 0 | 1024 | 2048;
  bloomAllowed: boolean;
  environmentReflections: boolean;
  loadLobbyCity3d: boolean;
  arenaMonolithCount: number;
  arenaDustCount: number;
  enableBrazierFlames: boolean;
  enableConstellationLines: boolean;
  assetVariant: 'none' | 'lite' | 'high';
  particleBudgetMult: number;
}

export interface GpuProfileSummary {
  tier: GpuCapabilityTier;
  deviceTier?: DeviceHardwareTier;
  tierLabel: string;
  rendererName: string;
  recommendedQuality: GraphicsQuality;
  bloomSupported: boolean;
  shadowMapSize: 0 | 1024 | 2048;
  targetCombatFps: 12 | 30 | 60;
  lowPowerLegacyGpu?: boolean;
  supportsHighDetailChapter1Map?: boolean;
  supportsHighDetailAssets?: boolean;
  safetyReason?: string;
  crashGuardTripped?: boolean;
  logicalCores?: number;
  deviceMemoryGb?: number;
  estimatedVramMb?: number;
  maxTextureSize?: number;
  maxRenderbufferSize?: number;
  maxTextureImageUnits?: number;
}

export type HudScaleMode = 'compact' | 'normal' | 'large';

export type CombatCameraPreset = 'action' | 'tactical' | 'wide';

export type PhotoLightingPreset = 'golden_hall' | 'moonlit' | 'inferno';

export type CombatKeybindAction =
  | 'dash'
  | 'activeSkill'
  | 'heavyBreak'
  | 'ultimate'
  | 'overdrive'
  | 'pause'
  | 'cycleCamera'
  | 'toggleAutoPilot';

export type CombatKeybinds = Record<CombatKeybindAction, string>;

export type UiTextScaleMode = 'normal' | 'large' | 'xlarge';

export type GpuWatchdogStage = 0 | 1 | 2 | 3 | 4;

export type TelegraphShapeKind =
  | 'aoe_ring'
  | 'charge_lane'
  | 'beam_reticle'
  | 'interrupt_halo';

export type SkillEvolutionId =
  | 'evo_fire_solar_lance'
  | 'evo_fire_inferno_ring'
  | 'evo_ice_brittle_shatter'
  | 'evo_ice_glacier_nova'
  | 'evo_bolt_overload_arc'
  | 'evo_bolt_storm_web'
  | 'evo_multi_deadeye_rail'
  | 'evo_multi_tempest_fan'
  | 'evo_orbs_sentinel_bastion'
  | 'evo_orbs_sawblade_vortex'
  | 'evo_sword_boss_executioner'
  | 'evo_sword_blade_storm';

export type SkillEvolutionBranch = 'boss' | 'aoe';

export interface SkillEvolutionDef {
  id: SkillEvolutionId;
  baseSkillId: SkillId;
  branch: SkillEvolutionBranch;
  name: string;
  tagline: string;
  description: string;
  effectSummary: string;
  accentColor: string;
  accentHex: number;
}

export interface SkillEvolutionOffer {
  baseSkillId: SkillId;
  baseSkillName: string;
  branchBoss: SkillEvolutionDef;
  branchAoe: SkillEvolutionDef;
}

export interface SkillEvolutionCodexEntry extends SkillEvolutionDef {
  baseSkillName: string;
  discovered: boolean;
}

export type RoomBountyKind =
  | 'no_hit'
  | 'elemental_reactions'
  | 'boss_break'
  | 'fast_clear';

export interface RoomBountySnapshot {
  id: string;
  kind: RoomBountyKind;
  title: string;
  progressLabel: string;
  status: 'active' | 'completed' | 'failed';
  rewardLabel: string;
}

export interface GameSettings {
  masterVol: number; // 0..1
  bgmVol: number; // 0..1
  sfxVol: number; // 0..1
  graphicsQuality: GraphicsQuality;
  screenShake: boolean;
  showDamageNumbers: boolean;
  starfallWeather?: boolean;
  bloomEnabled?: boolean;
  hapticsEnabled?: boolean;
  highContrastTelegraphs?: boolean;
  colorblindTelegraphs?: boolean;
  autoGpuWatchdog?: boolean;
  adaptiveChapterMusic?: boolean;
  hudScale?: HudScaleMode;
  combatCameraPreset?: CombatCameraPreset;
  liveDpsMeter?: boolean;
  photoLightingPreset?: PhotoLightingPreset;
  keybinds?: Partial<CombatKeybinds>;
  showFpsOverlay?: boolean;
  adaptiveResolutionGuard?: boolean;
  compactHud?: boolean;
  chapter1MapMode?: Chapter1MapMode;
  lowEndSafetyMode?: LowEndSafetyMode;
  reducedMotion?: boolean;
  reduceScreenFlash?: boolean;
  uiTextScale?: UiTextScaleMode;
  audioCaptions?: boolean;
}

export interface GachaPullHistoryEntry {
  id: string;
  timestampMs: number;
  chestVariant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare';
  itemName: string;
  rarity: Rarity;
  isSTier?: boolean;
  shardsGained: number;
}

export interface FairCatchUpState {
  claimedDateKey: string;
  claimedMissionIdsToday: string[];
  totalMissionsClaimed: number;
}

export interface EqualizedRiftProgressSnapshot {
  dateKey: string;
  bestFloorToday: number;
  seasonBestFloor: number;
  claimedMilestones: number[];
  totalRiftClears: number;
}

export interface FairProgressionState {
  astralShards: number;
  pullHistory: GachaPullHistoryEntry[];
  totalExchanges: number;
  arenaEqualizedMode: boolean;
  equalizedArenaWins: number;
  equalizedTrialRound?: number;
  equalizedTrialWins?: number;
  selectedTrialKitId?: 'assassin_counter' | 'rapid_ranger' | 'elemental_sage';
  equalizedRift?: EqualizedRiftProgressSnapshot;
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
  runeRollsSinceLegendary?: number;
  ancientRuneShards?: number;
  forgeRollsSinceEpic?: number;
  forgeRollsSinceLegendary?: number;
  forgeRelicShards?: number;
}

export interface CareerStats {
  totalKills: number;
  totalBossesKilled: number;
  totalRuns: number;
  maxComboEver: number;
  totalChestsOpened: number;
  seenEnemies: string[];
  seenSkills: string[];
  arenaMechanismsTriggered?: number;
  bossInterruptsTotal?: number;
  setProcsTriggered?: number;
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
    | 'bestTowerFloor'
    | 'discoveredEvolutions'
    | 'chapterStarsEarned'
    | 'arenaMechanismsTriggered'
    | 'bossInterruptsTotal'
    | 'setProcsTriggered';
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
  minChapterCleared?: number;
  minCh1Stage?: number;
  claimed: boolean;
}

export type EarlyFeatureId =
  | 'mail'
  | 'welcome_gift'
  | 'daily_quests'
  | 'talents'
  | 'hero_star'
  | 'iron_chest'
  | 'mythic_chest'
  | 'flash_deals'
  | 'starter_pack'
  | 'sweep'
  | 'battle_pass'
  | 'runes'
  | 'forge'
  | 'meta_events'
  | 'late_modes'
  | 'daily_rift'
  | 'endless_tower'
  | 'arena'
  | 'coop_raid'
  | 'elemental_towers'
  | 'world_boss'
  | 'crystal_defense'
  | 'blood_moon'
  | 'abyssal_gauntlet'
  | 'pantheon_expedition'
  | 'dragon_lair'
  | 'crystal_vault'
  | 'sky_citadel';

export interface EarlyForgeProgress {
  rareShards: number;
  epicShards: number;
  sTierBlueprints: number;
}

export interface DefeatCauseInfo {
  code:
    | 'boss_slam'
    | 'boss_lane'
    | 'boss_projectile'
    | 'boss_contact'
    | 'ranged_barrage'
    | 'melee_swarm'
    | 'unknown';
  label: string;
  tip: string;
  killerName?: string;
}

export interface PlaytestMilestoneRecord {
  runIndex: number;
  elapsedSec: number;
}

export interface PlaytestBossAttemptRecord {
  attempts: number;
  cleared: boolean;
  attemptsToFirstClear?: number;
}

export interface PlaytestMetrics {
  createdAt: number;
  totalRuns: number;
  totalPlaySeconds: number;
  firstDefeatRunIndex?: number;
  startedRunAfterFirstDefeat: boolean;
  stageEntriesByChapter: Record<string, Record<number, number>>;
  stageDefeatsByChapter: Record<string, Record<number, number>>;
  bossAttempts: Record<string, PlaytestBossAttemptRecord>;
  milestones: {
    firstUpgrade?: PlaytestMilestoneRecord;
    firstRare?: PlaytestMilestoneRecord;
    firstEpic?: PlaytestMilestoneRecord;
    firstSTier?: PlaytestMilestoneRecord;
    firstCh1Clear?: PlaytestMilestoneRecord;
  };
  synergyPickCounts: Partial<Record<SkillSynergyId, number>>;
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
  | 'star_fairy'
  | 'astraeo' | 'pyro' | 'jade_calf' | 'twin_astral_spirits';

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

export type HeroSkinId =
  | 'default'
  | 'aurelia_oasis_dancer'
  | 'aurelia_temple_commander'
  | 'aurelia_solaris_valkyrie'
  | 'aurelia_winter_solstice' | 'golden_fleece' | 'venus_incarnate' | 'astral_mirror_queen';

export interface HeroSkinDefinition {
  id: HeroSkinId;
  heroId?: HeroId;
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

export type CombatDamageSkillKey =
  | 'basic_volley'
  | 'hero_active'
  | 'heavy_break'
  | 'hero_ultimate'
  | 'weapon_overdrive'
  | 'orbit_orbs'
  | 'flying_swords'
  | 'meteor_shower'
  | 'elemental_procs'
  | 'elemental_reaction'
  | 'pet_companion'
  | 'arena_mechanism';

export interface DamageBreakdown {
  basic: number;
  ultimate: number;
  pet: number;
  elemental: number;
  peakCrit: number;
  elapsedSeconds: number;
  perfectDodges?: number;
  punishHits?: number;
  elementalReactions?: number;
  counterShots?: number;
  coopAllies?: CoopAllySummary[];
  skillDamageMap?: Partial<Record<CombatDamageSkillKey, number>>;
}

export interface AutoSalvageFilterRule {
  maxRarity: 'COMMON' | 'RARE' | 'EPIC';
  protectSTier: boolean;
  protectSetPieces: boolean;
  protectUpgradedOrSocketed: boolean;
  autoRunAfterBattle: boolean;
}

export type WeeklyChallengeMetric =
  | 'runsCompleted'
  | 'bossKills'
  | 'bossInterrupts'
  | 'elementalReactions'
  | 'uniqueHeroesWon';

export interface WeeklyChallengeProgress {
  weekKey: string;
  runsCompleted: number;
  bossKills: number;
  bossInterrupts: number;
  elementalReactions: number;
  heroesUsedToWin: HeroId[];
  claimedIds: string[];
}

export interface EdgeThreatIndicator {
  angleDeg: number;
  severity: 'high' | 'medium';
  kind: 'boss_charge' | 'orb';
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

export type WingId =
  | 'aries_feather'
  | 'phoenix_blaze'
  | 'swan_nebula'
  | 'seraph_zodiac'
  | 'solar_zenith' | 'crimson_ram_wings' | 'emerald_taurus_wings' | 'dual_gemini_wings';

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
  highestBidderName?: string;
  highestBidderIsAiLive?: boolean;
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
    | 'dragon_lair'
    | 'sky_citadel';
  label: string;
  stageReached: number;
  kills: number;
  maxCombo: number;
  gold: number;
  gems: number;
  victory: boolean;
  heroId: HeroId;
  timestamp: number;
  activeSynergies?: SkillSynergyId[];
  activeSetNames?: string[];
  durationSec?: number;
  defeatCauseLabel?: string;
  masteryExpGained?: number;
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
  aliceDefaultMigrated?: boolean;
  unlockedHeroes: HeroId[];
  heroStars: Partial<Record<HeroId, number>>;
  equipped: Partial<Record<GearSlot, string>>;
  inventory: GearInstance[];
  equippedRunes: string[]; // rune instance uids (up to 4)
  runeInventory: RuneInstance[];
  runeRefinements?: Partial<Record<RuneId, number>>; // Wave 13: +0..+5 ancient rune refinement tiers
  muted: boolean;
  welcomeGiftClaimed?: boolean;
  checkIn?: CheckInProgress;
  dailyQuests?: DailyQuestProgress;
  talents?: Partial<Record<TalentId, number>>;
  paragonInfusionLevel?: number;
  bestTowerFloor?: number;
  bestBossRushRound?: number;
  battlePass?: BattlePassProgress;
  pity?: PityState;
  fairProgression?: FairProgressionState;
  fairCatchUp?: FairCatchUpState;
  career?: CareerStats;
  achievementsClaimed?: string[];
  settings?: GameSettings;
  claimedRivalBounties?: Record<string, string>; // aiPlayerId -> YYYY-MM-DD date key
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
  loadoutPresets?: LoadoutPreset[];
  chapterEquipmentPresets?: ChapterEquipmentPreset[];
  chapterMilestones?: Partial<Record<number, ChapterMilestoneProgress>>;
  activeLoadoutPresetId?: LoadoutPresetSlotId | null;
  heroMastery?: Partial<Record<HeroId, HeroMasteryProgress>>;
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
  mountAppearance?: 'zodiac' | 'astral';
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
  // Wave 14 fields
  celestialFeathers?: number;
  unlockedCelestialWings?: CelestialWingId[];
  celestialWingStars?: Partial<Record<CelestialWingId, number>>;
  equippedCelestialWingId?: CelestialWingId | null;
  skyCitadel?: SkyCitadelState;
  astralBoard?: AstralBoardState;
  zodiacRelics?: ZodiacRelicState;
  guildSanctuary?: GuildSanctuaryState;
  mythicShardShop?: MythicShardShopState;
  sanctuaryFloorTheme?: SanctuaryFloorId;
  unlockedRoyal3DTitles?: Royal3DTitleId[];
  equippedRoyal3DTitleId?: Royal3DTitleId | null;
  // Early-game progression & persistent claim ledger (Schema v2)
  progressionSchemaVersion?: number;
  claimedMailIds?: string[];
  deletedMailIds?: string[];
  earlyMilestonesClaimed?: string[];
  earlyForgeProgress?: EarlyForgeProgress;
  playtestMetrics?: PlaytestMetrics;
  // Phase 5: Nightmare Ascension, Synergy & Skill Evolution Discovery Codex
  nightmareClears?: Record<number, number>;
  selectedNightmareTier?: number;
  discoveredSynergies?: SkillSynergyId[];
  discoveredEvolutions?: SkillEvolutionId[];
  // Wave 2 AAA + Real-Time AI Preferences & Duel Record
  aiPreferences?: AiPreferencesState;
  // Wave 6: Fair Progression Substat Gold Pity + Co-op AI Role Presets
  reforgeGoldPityCount?: number;
  coopPartyRoles?: [CoopAiRole, CoopAiRole];
  // 30-Day Fair Progression Roadmap & Active Day Tracker (backwards-compatible)
  fairRoadmapClaimedIds?: string[];
  fairActiveDays?: {
    count: number;
    lastDate: string;
  };
  // Global account reset epoch counter
  accountResetEpoch?: number;
  // Wave 11: Smart Auto-Salvage Filter, Weekly Challenges & Claimed Hero Mastery Milestones
  autoSalvageFilter?: AutoSalvageFilterRule;
  weeklyChallenges?: WeeklyChallengeProgress;
  claimedHeroMasteryMilestones?: Partial<Record<HeroId, number[]>>;
  // Wave 14: 12-Chapter Zodiac Journey Log Claimed Milestone IDs
  claimedJourneyMilestones?: string[];
}

export type AiAutoPilotTactic = 'aggressive' | 'balanced' | 'evasive';
export type AiCompanionRole = 'vanguard' | 'ranger' | 'mystic';
export type AiLivePlayerPersonality = 'aggressive' | 'tactical' | 'assassin';
export type AiLivePlayerStatus =
  | 'lobby'
  | 'campaign'
  | 'weekly_practice'
  | 'ready_duel'
  | 'in_duel';

export type AiDuelDifficultyTier = 'challenger' | 'master' | 'sovereign' | 'mythic';

export type VirtualPlayerPersonaId =
  | 'natural_balanced'
  | 'boss_hunter'
  | 'cautious_kiter'
  | 'synergy_architect';

export type AiTacticalTargetPriority = 'boss' | 'caster' | 'low_hp' | 'traps' | 'nearest';

export type AiInferenceSource = 'nvidia_nim' | 'local_fallback';

export interface AiTacticalDirective {
  tactic: AiAutoPilotTactic;
  targetPriority: AiTacticalTargetPriority;
  holdUltForBreak: boolean;
  kitingRangeDelta: number;
  dashAggression: number;
  thoughtVi: string;
  personaId: VirtualPlayerPersonaId;
  source: AiInferenceSource;
  model: string;
  expiresAtMs: number;
}

export interface AiDraftDecision {
  selectedId: string;
  reasonVi: string;
  source: AiInferenceSource;
  model: string;
}

export interface NvidiaAiStatusSnapshot {
  configured: boolean;
  mode: AiInferenceSource;
  primaryModel: string;
  fastModel: string;
  rpmBudget: number;
  remainingRpm: number;
}

export interface AiPreferencesState {
  autoPilotEnabled: boolean;
  tactic: AiAutoPilotTactic;
  persona?: VirtualPlayerPersonaId;
  autoSkillPick: boolean;
  squadAssistEnabled: boolean;
  squadRoles: AiCompanionRole[];
  liveDuelWins: number;
  liveDuelLosses: number;
  liveDuelRating: number;
  aiDuelTier?: AiDuelDifficultyTier;
  aiWinStreak?: number;
  pveChallengeEnabled?: boolean;
  squadFormation?: 'break_focus' | 'guard_sustain' | 'elemental_chain';
}

export interface AiLiveBuildSnapshot {
  weaponName: string;
  armorName: string;
  mountName: string;
  wingName: string;
  tacticSummary: string;
  favoriteSkills: string[];
}

export interface AiLivePlayerProfile {
  id: string;
  displayName: string;
  tag: '[AI Live]';
  heroId: HeroId;
  powerRating: number;
  highestChapterCleared: number;
  worldBossBestDamage: number;
  bestTowerFloor: number;
  weeklyPracticeBest: number;
  weeklyPracticeClearTimeMs: number | null;
  guildRole: string;
  guildContribution: number;
  guildBossDamage: number;
  titleBadge: string;
  frameId: AvatarFrameId;
  personality: AiLivePlayerPersonality;
  status: AiLivePlayerStatus;
  statusDetail: string;
  duelRating: number;
  duelWins: number;
  duelLosses: number;
  winStreak: number;
  lastActiveAt: number;
  buildSnapshot?: AiLiveBuildSnapshot;
}

export type AiLiveChatChannel = 'lobby' | 'guild';

export interface AiLiveChatMessage {
  id: string;
  channel: AiLiveChatChannel;
  senderName: string;
  senderTag: '[AI Live]' | 'Người Thật';
  aiPlayerId?: string;
  heroId?: HeroId;
  text: string;
  timestamp: number;
}

export interface AiLiveActivityEvent {
  id: string;
  timestamp: number;
  kind:
    | 'status'
    | 'campaign'
    | 'weekly_practice'
    | 'duel_result'
    | 'weekly_rank'
    | 'world_boss'
    | 'tower'
    | 'guild'
    | 'auction';
  actorName: string;
  summary: string;
  accent: 'amber' | 'sky' | 'emerald' | 'rose';
}

export interface AiLiveAuctionSyncLot {
  id: string;
  label: string;
  currentBid: number;
  buyoutPrice: number;
  highestBidderIsPlayer: boolean;
  isPlayerListing: boolean;
  endsAt: number;
}

export interface AiLiveAuctionBidEvent {
  eventId: string;
  lotId: string;
  lotLabel: string;
  bidderId: string;
  bidderName: string;
  bidderTag: '[AI Live]';
  action: 'bid' | 'buyout';
  amount: number;
  isPlayerListing: boolean;
  timestamp: number;
}

export type CoopTacticalOrder =
  | 'focus_boss'
  | 'clear_adds'
  | 'hold_resonance'
  | 'break_guard'
  | 'protect_player';
export type AdaptiveFpsTier = 'full' | 'balanced' | 'performance_guard';

export interface AiLiveInvite {
  inviteId: string;
  kind: 'coop_raid' | 'arena_duel' | 'rival_revenge';
  aiPlayerId: string;
  aiDisplayName: string;
  aiHeroId: HeroId;
  aiPowerRating: number;
  message: string;
  createdAt: number;
  expiresAt: number;
  revengeBonusPct?: number;
  revengeStreak?: number;
}

export type AiRivalTier = 'contender' | 'archrival' | 'nemesis';

export interface AiRivalRecord {
  aiPlayerId: string;
  aiDisplayName: string;
  aiHeroId: HeroId;
  aiPowerRating: number;
  winsAgainst: number;
  lossesAgainst: number;
  rivalryScore: number;
  rivalryTier: AiRivalTier;
  lastEncounterReason: string;
  lastEncounterAt: number;
  bountyClaimedDateKey?: string;
  vendettaPending?: boolean;
  revengeStreak?: number;
  revengeBonusPct?: number;
  lastOutcome?: 'player_won' | 'ai_won';
}

export interface AiAdaptationSummarySnapshot {
  playerName: string;
  samplesAnalyzed: number;
  dodgeBias: 'left' | 'right' | 'balanced';
  dodgeBiasStrength: number;
  rangeStyle: 'kiter' | 'midrange' | 'brawler';
  avgEngageDistance: number;
  dashFrequencyPer10s: number;
  preferredElement: 'fire' | 'ice' | 'storm' | 'poison';
  coopComplementaryElement: 'fire' | 'ice' | 'storm' | 'poison';
  counterInsightLabel: string;
  coopSynergyHint: string;
  updatedAt: number;
}

export interface LiveGuildWarBastionSnapshot {
  id: 'solar_spire' | 'astral_citadel' | 'void_shrine';
  name: string;
  bonusLabel: string;
  controlScore: number;
  owner: 'zodiac_guild' | 'contested' | 'dark_alliance';
  allyAiCount: number;
  enemyAiCount: number;
  lastStrikeBy?: string;
  lastStrikeAt?: number;
}

export interface LiveGuildWarContributionSnapshot {
  id: string;
  displayName: string;
  isHuman: boolean;
  heroId: HeroId;
  points: number;
  strikes: number;
  lastActionAt: number;
}

export interface LiveGuildWarSnapshot {
  warId: string;
  dateKey: string;
  zodiacGuildName: string;
  rivalGuildName: string;
  zodiacScore: number;
  rivalScore: number;
  targetScore: number;
  status: 'active' | 'zodiac_victory' | 'rival_victory';
  bastions: LiveGuildWarBastionSnapshot[];
  contributors: LiveGuildWarContributionSnapshot[];
  rewardGold: number;
  rewardGems: number;
  rewardGuildCoins: number;
  rewardStarDust: number;
  claimedByPlayer: boolean;
  lastUpdatedAt: number;
}

export interface LiveSpectatorFighterSnapshot {
  aiPlayerId: string;
  displayName: string;
  heroId: HeroId;
  powerRating: number;
  personality: 'aggressive' | 'tactical' | 'assassin';
  hp: number;
  maxHp: number;
  momentum: number;
  styleGrade: 'B' | 'A' | 'S' | 'SS' | 'SSS';
  damageDealt: number;
  critsLanded: number;
  dodgesLanded: number;
  cheersCount: number;
}

export interface LiveSpectatorMatchSnapshot {
  matchId: string;
  roundLabel: string;
  status: 'pre_match' | 'live' | 'finished';
  startedAt: number;
  updatedAt: number;
  tickCount: number;
  maxTicks: number;
  fighterA: LiveSpectatorFighterSnapshot;
  fighterB: LiveSpectatorFighterSnapshot;
  winnerId: string | null;
  tickerLog: Array<{
    id: string;
    tick: number;
    text: string;
    accent: 'sky' | 'amber' | 'rose' | 'emerald';
  }>;
  cheerRewardGold: number;
  cheerRewardGems: number;
  cheerRewardStarDust: number;
  playerCheeredFighterId?: string | null;
  playerClaimedReward?: boolean;
}

export interface AiLiveHubSnapshot {
  serverNow: number;
  onlineHumanCount: number;
  onlineAiCount: number;
  players: AiLivePlayerProfile[];
  activities: AiLiveActivityEvent[];
  chatHistory?: {
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  };
  pendingInvites?: AiLiveInvite[];
  rivals?: AiRivalRecord[];
  guildBossLive?: LiveGuildBossState;
  miniCup?: LiveMiniCupState | null;
  serverBounty?: LiveServerBountyState;
  adaptationProfile?: AiAdaptationSummarySnapshot | null;
  guildWarLive?: LiveGuildWarSnapshot | null;
  spectatorMatch?: LiveSpectatorMatchSnapshot | null;
}

export type MountId = 'black_dragon' | 'solarius' | 'vulcan' | 'jade_bull' | 'celestial_wind_mount';

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
  petId?: PetId | null;
  wingId?: WingId | null;
  mountId?: MountId | null;
  astralSteedId?: AstralSteedId | null;
  weaponAuraId?: WeaponAuraId;
  artifactId?: ArtifactId | null;
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
  | 'eclipse_chalice'
  | 'astrolabe_regulus' | 'war_horn' | 'jade_heart_relic' | 'twin_hourglass_relic';

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
  drops?: Array<{ x: number; z: number; kind: 'gold' | 'gem' | 'heal' }>;
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
  chapterId?: number;
  heroName: string;
  heroId?: HeroId;
  skinId?: HeroSkinId;
  enemiesRemaining: number;
  portalOpen: boolean;
  isBossStage: boolean;
  lastPlayerHitAt: number;
  lastHitAngleDeg?: number | null;
  runGold: number;
  runGems: number;
  kills: number;
  dashCooldownRatio: number;
  ultCharge: number;
  ultName: string;
  revivesLeft: number;
  bossName: string | null;
  bossEnemyKind?: EnemyKind;
  weeklyBossId?: string;
  activeTargetKind?: EnemyKind;
  activeTargetChapterId?: number;
  activeTargetName?: string;
  activeTargetHpPct?: number;
  bossHp: number;
  bossMaxHp: number;
  bossPhase: 1 | 2 | 3;
  bossLayers?: number;
  bossCurrentLayer?: number;
  bossShield?: number;
  bossMaxShield?: number;
  bossStunTimer?: number;
  bossBrokenBannerTimer?: number;
  bossPunishActive?: boolean;
  bossPunishRatio?: number;
  bossPunishBonusPct?: number;
  bossPhaseTwoBannerTimer?: number;
  bossPhaseThreeBannerTimer?: number;
  activeBossTelegraph?: {
    kind: 'sweep' | 'charge' | 'slam' | 'barrage';
    label: string;
    actionHint: string;
    remainingSec: number;
    durationSec: number;
    dangerLevel: 'high' | 'critical';
  } | null;
  coopSynergy?: {
    resonanceRemainingSec: number;
    resonanceBonusPct: number;
    windowRemainingSec: number;
    windowAllyName: string | null;
    calloutText: string | null;
    alliesUltReady: string[];
  } | null;
  coopTacticalOrder?: CoopTacticalOrder;
  adaptiveFpsTier?: AdaptiveFpsTier;
  adaptiveFpsAvg?: number;
  gpuWatchdogStage?: GpuWatchdogStage;
  gpuWatchdogNotice?: string | null;
  activeEliteAffixLabel?: string;
  activeArenaHazardLabel?: string;
  activeArenaMechanismLabel?: string;
  activeArenaMechanismReady?: boolean;
  activeSetProcBanner?: string | null;
  activeSynergies?: SkillSynergyId[];
  activeSynergyTiers?: ActiveSkillSynergyTierInfo[];
  activeEvolutions?: SkillEvolutionId[];
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
  isSkyCitadelMode?: boolean;
  skyCitadelTimeLeft?: number;
  skyCitadelWave?: number;
  skyCitadelScore?: number;
  skyCitadelFeathersLooted?: number;
  bossWarningTitle?: string | null;
  bossWarningSubtitle?: string | null;
  bossWarningTimer?: number;
  bossEntranceActive?: boolean;
  bossEntranceRemainingSec?: number;
  bossEntranceTotalSec?: number;
  bossEntranceBossName?: string | null;
  bossEntranceStageLabel?: string | null;
  activeSkills: Partial<Record<SkillId, number>>;
  stageBannerText: string | null;
  comboCount: number;
  comboTimerRatio: number;
  comboTierLabel: string;
  comboDmgBonusPct?: number;
  radarData?: HudRadarSnapshot;
  // Phase 5: Active Skill E, Perfect Dodge, Nightmare Ascension, 3D Training Grounds
  activeSkillName?: string;
  activeSkillCooldownRatio?: number;
  activeSkillCooldownSec?: number;
  activeSkillReady?: boolean;
  perfectDodgeBannerTimer?: number;
  perfectDodgeBuffTimer?: number;
  perfectDodgeCount?: number;
  nightmareTier?: number;
  nightmareMutatorLabels?: string[];
  isTrainingMode?: boolean;
  trainingTargetMode?: TrainingTargetMode;
  trainingDps5s?: number;
  trainingPeakDps?: number;
  trainingTotalDamage?: number;
  trainingCritRatePct?: number;
  trainingHits?: number;
  trainingMvpSkillLabel?: string;
  // AAA Wave 2: Cinematic Letterbox, Boss Execution Slow-Mo & Synergy Awakening
  cinematicBarRatio?: number;
  bossFinisherTimer?: number;
  bossFinisherName?: string | null;
  synergyAwakenedName?: string | null;
  synergyAwakenedTimer?: number;
  // AAA Wave 3: Ultimate Cut-in, Boss Phase Shift, Edge Threat Arrows & Biome Weather
  ultCutinTimer?: number;
  ultCutinTitle?: string | null;
  ultCutinHeroName?: string | null;
  ultCutinAccentHex?: string | null;
  bossPhaseShiftTimer?: number;
  bossPhaseShiftLevel?: 2 | 3 | null;
  edgeThreats?: EdgeThreatIndicator[];
  biomeWeatherLabel?: string | null;
  // AAA Wave 4: Counter-Shot Readiness, Gamepad Detection & Elemental Reactions
  counterShotReady?: boolean;
  counterShotTimer?: number;
  gamepadConnected?: boolean;
  elementalReactionsCount?: number;
  // AAA Wave 5: Live Rolling DPS Telemetry
  liveDps5s?: number;
  livePeakCrit?: number;
  // AAA Wave 6: Astral Overcharge, Tactical Room Bounty, Quick Camera Toast & Opt-in FPS
  astralOverchargeRatio?: number;
  roomBounty?: RoomBountySnapshot | null;
  roomBountyBanner?: string | null;
  // AAA Wave 13: Tactical Room Modifiers & Elemental Chain Resonance
  tacticalRoomModifier?: TacticalRoomModifierSnapshot | null;
  elementalChainCount?: number;
  elementalChainLabel?: string | null;
  cameraPresetToast?: string | null;
  fps?: number;
  frameTimeMs?: number;
  // AAA Wave 7: Boss Weak-Point Window & Arena Resonance Trap Callout
  bossWeakPointActive?: boolean;
  bossWeakPointTimer?: number;
  bossEnrageRemainingSec?: number;
  bossTimedEnraged?: boolean;
  trapTriggerToast?: string | null;
  // AAA Wave 2 + Pillar 5 Real-Time AI & Diagnostics
  autoPilotEnabled?: boolean;
  autoPilotTactic?: AiAutoPilotTactic;
  autoPilotPersona?: VirtualPlayerPersonaId;
  autoPilotLockedReason?: string | null;
  autoPilotStatusText?: string | null;
  autoPilotThoughtVi?: string | null;
  autoPilotThoughtSource?: AiInferenceSource | null;
  autoPilotManualOverride?: boolean;
  aiSquadAllies?: Array<{
    role: AiCompanionRole;
    roleLabel: string;
    name: string;
    hpPct: number;
    damage: number;
    ultCharge: number;
    callout?: string | null;
  }>;
  activeCompanionCommand?: VirtualCompanionCommandId;
  companionCalloutSpeaker?: string | null;
  companionCalloutText?: string | null;
  companionCalloutSource?: AiInferenceSource | null;
  isWeeklyRankedBossMode?: boolean;
  isWeeklyBossPracticeMode?: boolean;
  weeklyBossTimeLeft?: number;
  weeklyBossTotalDamage?: number;
  bossStaggerRatio?: number;
  bossStaggerBroken?: boolean;
  liveAiRivalTag?: string | null;
  perfDrawCalls?: number;
  perfSimHz?: number;
  isArenaEqualized?: boolean;
  combatLightingMood?: 'normal' | 'boss_enrage' | 'victory_golden';
  // Wave 6: Perfect Dodge Counter-Window, Live Boss Split Pace & Co-op Role Synergy
  counterWindowRemainingSec?: number;
  counterChargesRemaining?: number;
  counterTotalLanded?: number;
  bossPace?: BossPaceHudSnapshot | null;
  coopRoleSynergyLabel?: string | null;
  activeWeatherLabel?: string | null;
  // Wave 7: Boss Guard-Break, Combat Style Momentum & Co-op Ping Callouts
  bossStaggerBrokenSec?: number;
  bossGuardBreaksTotal?: number;
  styleGrade?: CombatStyleGrade;
  styleScore?: number;
  styleFillRatio?: number;
  coopPingToast?: string | null;
  // Wave 8: Lethal AI Duel Telemetry (AI Tier, Shield, Ult Charge, Intent & Sudden Death)
  arenaAiTier?: AiDuelDifficultyTier;
  arenaAiTierLabel?: string;
  arenaAiRewardBonusPct?: number;
  arenaOpponentShieldPct?: number;
  arenaOpponentUltPct?: number;
  arenaAiIntentLabel?: string | null;
  arenaAiEnraged?: boolean;
  arenaSuddenDeathLabel?: string | null;
  arenaSuddenDeathMult?: number;
  arenaAiDodgesCount?: number;
  pveChallengeTierLabel?: string | null;
  // Combat Overhaul: Heavy Break Strike (F), 4-Beat Combo Finisher, Room Chaos Events & Boss Totems
  heavyBreakCooldownRatio?: number;
  heavyBreakCooldownSec?: number;
  heavyBreakReady?: boolean;
  comboBeat?: 1 | 2 | 3 | 4;
  comboBeatFinisherReady?: boolean;
  activeRoomEvent?: {
    id: string;
    title: string;
    subtitle: string;
    accentHex: string;
  } | null;
  bossTotemsAlive?: number;
  ambushBossActive?: boolean;
  // Wave 9: Boss Phase Counter Window, Execution Finisher, Interactive Arena Props & Co-op Rescue
  phaseCounterWindowSec?: number;
  phaseCounterWindowTotalSec?: number;
  phaseCounterReady?: boolean;
  finisherReadyTargetName?: string | null;
  finisherTargetHpPct?: number | null;
  arenaPropsRemaining?: number;
  arenaPropBuffLabel?: string | null;
  coopSanctuaryCooldownSec?: number;
  coopSanctuaryActiveSec?: number;
  coopPrimerBanner?: string | null;
  // Wave 10: Boss Breakable Parts, Elemental Resonance Burst, Adaptive AI & Trial Gauntlet
  bossParts?: Array<{
    id: string;
    label: string;
    hp: number;
    maxHp: number;
    broken: boolean;
    debuffLabel: string;
  }>;
  bossPartBrokenBanner?: string | null;
  elementalResonance?: {
    stack: number;
    maxStack: number;
    recentElements: string[];
    burstBannerText: string | null;
  };
  aiAdaptationBadge?: string | null;
  trialGauntletRound?: number | null;
  guildWarBastionLabel?: string | null;
  weaponOverdrive?: {
    charge: number;
    active: boolean;
    remainingSec: number;
    maxDurationSec: number;
    stanceLabel: string;
  };
  activeRiftMutators?: string | null;
  equalizedRiftFloor?: number | null;
  squadFormationId?: 'break_focus' | 'guard_sustain' | 'elemental_chain';
  squadPingBanner?: string | null;
  interactiveHazardsRemaining?: number;
  // Wave 15: Zodiac Riposte, Wall-Slam Impact Physics & Tactical Room Crossroads
  riposteReady?: boolean;
  wallSlamCount?: number;
  wallSlamToast?: string | null;
  activeCrossroads?: {
    id: TacticalCrossroadsId;
    title: string;
    glyph: string;
    doctrineLabel: string;
    rewardSummary: string;
  } | null;
  // Wave 16: 12-Zodiac Boss Entrance Choreography & Combat Audio Captions
  bossIntroOverlay?: BossIntroOverlayState | null;
  audioCaptionCues?: CombatAudioCaptionCue[];
  // Wave 17: Boss Interrupt Counter-Surge & 12-Zodiac Boss Practice (0 Farm)
  interruptCounterSurge?: InterruptCounterSurgeHudState | null;
  bossPractice?: BossPracticeHudState | null;
  // Wave 18: Zodiac Vow Modifiers & Ricochet Resonance
  activeVowLabels?: string[];
  activeVowGoldBonusPct?: number;
  ricochetHitsCount?: number;
}

export interface InterruptCounterSurgeHudState {
  active: boolean;
  remainingSec: number;
  maxDurationSec: number;
  bossWeakpointBonusPct: number;
  activeCdTrimmedPct: number;
  ultGained: number;
  totalSurgesTriggered: number;
}

export interface BossPracticeHudState {
  active: boolean;
  chapterId: number;
  bossName: string;
  zodiacTitle: string;
  bossPhase: 1 | 2 | 3;
  defeated: boolean;
  elapsedSec: number;
  interruptCount: number;
  perfectDodgeCount: number;
  zeroRewardLocked: true;
}

export interface SmartUpgradeRoiEntry {
  id: string;
  targetTab: 'gear' | 'talents' | 'runes' | 'hero' | 'forge_imprint';
  title: string;
  detail: string;
  goldCost: number;
  estimatedLcGain: number;
  lcPer1000Gold: number;
  affordableNow: boolean;
  actionLabel: string;
}

export interface SaveRollbackSnapshotMeta {
  id: string;
  createdAtMs: number;
  reason: 'manual' | 'pre_import' | 'pre_reset' | 'pre_restore' | 'pre_cloud_overwrite';
  reasonLabel: string;
  highestChapterCleared: number;
  powerRating: number;
  gold: number;
  gems: number;
  checksum: string;
}

export interface BossIntroOverlayState {
  active: boolean;
  chapterId: number;
  zodiacTitle: string;
  bossName: string;
  epithet: string;
  entranceCallout: string;
  counterplayHint: string;
  accentHex: string;
  progress: number;
}

export type CombatAudioCaptionKind =
  | 'boss_telegraph'
  | 'riposte_ready'
  | 'wall_slam'
  | 'boss_shatter'
  | 'loot_rare'
  | 'execution_finisher';

export interface CombatAudioCaptionCue {
  id: string;
  kind: CombatAudioCaptionKind;
  glyph: string;
  label: string;
  detail: string;
  tone: 'warning' | 'counter' | 'impact' | 'reward';
  createdAtMs: number;
  expiresAtMs: number;
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
  | 'seraphim_glory'
  | 'leo_sovereign' | 'aries_vanguard' | 'emerald_taurus_halo' | 'gemini_halo';

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

export type AstralSteedId = never;

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
  astralSteedId: AstralSteedId | null;
  steedStar: number;
  warBannerId: WarBannerId;
  vipFrameId: VipAvatarFrameId;
  mythicWeaponTier: number;
  soulRingTotalLv: number;
  signatureQuote: string;
}

// ============================================================================
// WAVE 14 TYPES: CELESTIAL WINGS 3D & SKY CITADEL ARENA, GUILD 3D SANCTUARY,
// SEASON IV MYTHIC SHARD EXCHANGE, ASTRAL DICE BOARD & ZODIAC RELICS,
// 3D SANCTUARY FLOORS & ROYAL 3D FLOATING TITLES
// ============================================================================

export type CelestialWingId =
  | 'seraph_azure'
  | 'phoenix_solar'
  | 'nebula_void'
  | 'sovereign_aurora';

export interface CelestialWingDef {
  id: CelestialWingId;
  name: string;
  badge: string;
  rarity: 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại' | 'Chí Tôn';
  desc: string;
  featherHex: number;
  tipHex: number;
  frameHex: number;
  emissiveHex: number;
  baseAtkPct: number;
  baseHpPct: number;
  baseAspd: number;
  baseCrit: number;
  atkPctPerStar: number;
  hpPctPerStar: number;
  unlockFeathers: number;
  unlockGems: number;
}

export interface SkyCitadelMilestone {
  scoreTarget: number;
  title: string;
  rewardGems: number;
  rewardFeathers: number;
  rewardMythicShards: number;
  rewardDice: number;
}

export interface SkyCitadelState {
  date: string;
  dailyRunsRemaining: number;
  bestScore: number;
  totalScore: number;
  totalClears: number;
  claimedMilestones: number[];
}

export interface AstralBoardTileDef {
  index: number; // 0..15
  label: string;
  shortLabel: string;
  kind: 'start' | 'gems' | 'feathers' | 'mythic_shards' | 'relic_essence' | 'gold' | 'double_next' | 'jackpot';
  amount: number;
  accentClass: string;
}

export interface AstralBoardLapMilestone {
  lapsTarget: number;
  title: string;
  rewardGems: number;
  rewardMythicShards: number;
  rewardFeathers: number;
  rewardGoldenDice: number;
}

export interface AstralBoardState {
  date: string;
  position: number; // 0..15
  lapsCompleted: number;
  normalDice: number;
  goldenDice: number;
  doubleNext: boolean;
  totalRolls: number;
  dailyFreeClaimed: boolean;
  claimedLapMilestones: number[];
  lastLog: string;
}

export type ZodiacRelicId =
  | 'relic_aries_horn'
  | 'relic_leo_suncrest'
  | 'relic_libra_scale'
  | 'relic_scorpio_sting'
  | 'relic_sagittarius_bow'
  | 'relic_aquarius_chalice';

export interface ZodiacRelicDef {
  id: ZodiacRelicId;
  name: string;
  zodiacLabel: string;
  rarity: 'Sử Thi' | 'Huyền Thoại' | 'Thần Thoại';
  desc: string;
  accentHex: string;
  baseAtkPct: number;
  baseHpPct: number;
  baseCrit: number;
  baseBossDmg: number;
  baseGoldPct: number;
  atkPctPerLv: number;
  hpPctPerLv: number;
  unlockEssence: number;
}

export interface ZodiacRelicState {
  essence: number;
  levels: Partial<Record<ZodiacRelicId, number>>; // 0 = locked, 1..5 = stars
}

export type GuildMonumentId = 'citadel_hall' | 'astral_forge' | 'star_spire' | 'guild_vault';

export interface GuildMonumentDef {
  id: GuildMonumentId;
  name: string;
  subtitle: string;
  maxLevel: number;
  atkPctPerLv: number;
  hpPctPerLv: number;
  bossDmgPerLv: number;
  goldPctPerLv: number;
  baseGuildCoins: number;
}

export interface GuildDailyBossChest {
  id: string;
  damageTarget: number;
  title: string;
  rewardGuildCoins: number;
  rewardGems: number;
  rewardMythicShards: number;
  rewardFeathers: number;
}

export interface GuildSanctuaryState {
  date: string;
  monumentLevels: Record<GuildMonumentId, number>;
  dailyBossDamage: number;
  claimedDailyBossChestIds: string[];
  dailySanctuaryBlessingClaimed: boolean;
}

export interface MythicShardOfferDef {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  costShards: number;
  maxPurchases: number;
  rewardKind:
    | 'celestial_wing'
    | 'zodiac_relic_essence'
    | 'royal_title'
    | 'golden_dice'
    | 's_tier_chest'
    | 'celestial_feathers';
  amount: number;
  targetWingId?: CelestialWingId;
  targetTitleId?: Royal3DTitleId;
}

export interface MythicShardShopState {
  purchasedCounts: Record<string, number>;
}

export type SanctuaryFloorId =
  | 'marble_gold'
  | 'star_glass'
  | 'magma_dragon'
  | 'frost_sanctum';

export interface SanctuaryFloorDef {
  id: SanctuaryFloorId;
  name: string;
  shortDesc: string;
  swatchClass: string;
  floorHex: number;
  ringHex: number;
  pillarGlowHex: number;
  roughness: number;
  metalness: number;
}

export type Royal3DTitleId =
  | 'title_sky_sovereign'
  | 'title_star_emperor'
  | 'title_guild_marshal'
  | 'title_zodiac_oracle'
  | 'title_aurora_seraph';

export interface Royal3DTitleDef {
  id: Royal3DTitleId;
  label: string;
  subLabel: string;
  gradientClass: string;
  borderClass: string;
  atkBonus: number;
  hpBonus: number;
  critBonus: number;
  unlockMethodLabel: string;
  unlockGems: number;
}

// ============================================================================
// PHASE 5 TYPES: 8 HERO ACTIVE SKILLS, PERFECT DODGE, NIGHTMARE ASCENSION I-V,
// 3D TRAINING GROUNDS DPS, SYNERGY/BOSS CODEX & SAVE EXPORT/IMPORT
// ============================================================================

export type HeroActiveSkillEffectKind =
  | 'moon_fan_mark'
  | 'valiant_cadence'
  | 'stage_crescendo'
  | 'crimson_swarm'
  | 'glacial_spire'
  | 'ember_nova'
  | 'thunder_arc'
  | 'abyssal_aegis'
  | 'cudgel_vault'
  | 'electro_rose_lantern'
  | 'storm_convergence'
  | 'jade_bastion';

export interface HeroActiveSkillDef {
  heroId: HeroId;
  name: string;
  shortLabel: string;
  desc: string;
  cooldownSec: number;
  damageMult: number;
  effectKind: HeroActiveSkillEffectKind;
  accentHex: number;
  accentCss: string;
  radius: number;
  durationSec?: number;
}

export type NightmareMutatorId =
  | 'blood_frenzy'
  | 'rapid_barrage'
  | 'dense_hazards'
  | 'empowered_elites'
  | 'double_punish';

export interface NightmareMutatorDef {
  id: NightmareMutatorId;
  name: string;
  shortDesc: string;
  isSkillReward?: boolean;
}

export interface NightmareTierConfig {
  tier: number; // 0 = Normal, 1..5 = Nightmare I..V
  chapterId: number;
  label: string;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemySpeedMult: number;
  bulletSpeedMult: number;
  hazardIntervalMult: number;
  extraEliteAffix: boolean;
  punishBonusMult: number;
  goldRewardMult: number;
  starDustRewardMult: number;
  masteryExpMult: number;
  mutators: NightmareMutatorDef[];
}

export type TrainingTargetMode = 'single' | 'aoe';

export interface TrainingDpsSnapshot {
  dps5s: number;
  peakDps: number;
  totalDamage: number;
  critRatePct: number;
  hits: number;
}

export interface SaveTransferPreview {
  version: string;
  highestChapterCleared: number;
  selectedHeroId: HeroId;
  gold: number;
  gems: number;
  gearCount: number;
  bestTowerFloor: number;
}

export interface SynergyCodexEntry {
  id: SkillSynergyId;
  name: string;
  buildTag: 'aoe' | 'boss' | 'sustain';
  groupALabels: string[];
  groupBLabels: string[];
  shortEffect: string;
  accentColor: string;
  discovered: boolean;
  pickCount: number;
}

export interface BossCodexEntry {
  chapterId: number;
  chapterName: string;
  bossName: string;
  bossKey: string;
  hasPhaseThree: boolean;
  punishBonusPct: number;
  tacticalTip: string;
  loreExcerpt: string;
  phasesSummary: [string, string, string];
  interruptTip: string;
  starsEarned: number;
  maxStars: number;
  cleared: boolean;
  attempts: number;
  highestNightmareTier: number;
}

// ============================================================================
// AAA WAVE 7 TYPES: RESONANCE TRAPS, COMBAT MEDALS & RUN HIGHLIGHTS
// ============================================================================

export type ResonanceTrapKind = 'storm_pylon' | 'ember_crucible' | 'wind_beacon';

export interface CombatMedalBadge {
  id: string;
  title: string;
  subtitle: string;
  accentHex: string;
}

export interface RunCombatHighlights {
  weakPointHits?: number;
  trapsTriggered?: number;
  perfectDodgesCount?: number;
  bountiesCompleted?: number;
  bossBreakCount?: number;
  peakCritDamage?: number;
  elementalReactionsCount?: number;
  damageTakenCount?: number;
  castInterrupts?: number;
  arenaMechanismsTriggered?: number;
}

// ============================================================================
// WAVE 6 TYPES: WEATHER, BOSS PACE SPLITS, CO-OP ROLES, LIVE GUILD BOSS & CUP
// ============================================================================

export type WeatherBiomeKind = 'ember_ash' | 'starlight_snow' | 'storm_rain' | 'celestial_dust';

export type CoopAiRole = 'dps' | 'control' | 'guardian';

export interface CoopRoleSynergySummary {
  roles: [CoopAiRole, CoopAiRole];
  teamBadge: string;
  bossDamageBonus: number;
  enemyProjectileSlowPct: number;
  periodicHealPct: number;
  damageReductionBonus: number;
}

export type AutoOptimizeGoal = 'campaign' | 'boss' | 'arena';

export interface BossPaceHudSnapshot {
  referenceLabel: string;
  elapsedMs: number;
  referenceTargetMs: number;
  deltaSec: number;
  ahead: boolean;
  checkpointsReached: number;
  splitsMs: Array<number | null>;
}

export interface LiveGuildBossContributor {
  id: string;
  displayName: string;
  isHuman: boolean;
  heroId: HeroId;
  damage: number;
  attacks: number;
  lastHitAt: number;
}

export interface LiveGuildBossMilestone {
  tierId: string;
  label: string;
  damageRequired: number;
  rewardGold: number;
  rewardGems: number;
  rewardGuildCoins: number;
}

export interface LiveGuildBossState {
  dateKey: string;
  bossName: string;
  bossTitle: string;
  maxHp: number;
  currentHp: number;
  totalDamage: number;
  defeatedCount: number;
  contributors: LiveGuildBossContributor[];
  milestones: LiveGuildBossMilestone[];
  claimedMilestoneIds: string[];
  lastUpdatedAt: number;
}

export interface LiveMiniCupParticipant {
  id: string;
  displayName: string;
  isHuman: boolean;
  heroId: HeroId;
  powerRating: number;
  duelRating: number;
}

export interface LiveMiniCupMatch {
  matchId: string;
  round: 1 | 2 | 3;
  slotIndex: number;
  fighterA: LiveMiniCupParticipant | null;
  fighterB: LiveMiniCupParticipant | null;
  winnerId: string | null;
  status: 'pending' | 'ready' | 'completed';
  summary?: string;
}

export interface LiveMiniCupState {
  cupId: string;
  playerName: string;
  createdAt: number;
  status: 'active' | 'champion' | 'eliminated';
  currentRound: 1 | 2 | 3;
  matches: LiveMiniCupMatch[];
  championName?: string;
  prizeClaimed: boolean;
  rewardGems: number;
  rewardGold: number;
  rewardTitleLabel?: string;
}

// ---------------------------------------------------------------------------
// WAVE 7 — GUARD BREAK, STYLE RANK, FREE GEAR TRANSFER & LIVE SERVER BOUNTY
// ---------------------------------------------------------------------------

export type CombatStyleGrade = 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface GearUpgradeTransferResult {
  ok: boolean;
  reason?: string;
  sourceUid: string;
  targetUid: string;
  previousTargetLevel: number;
  nextTargetLevel: number;
  powerDelta: number;
  nextSave: SaveData;
}

export interface LiveServerBountyContributor {
  id: string;
  displayName: string;
  isHuman: boolean;
  heroId: HeroId;
  points: number;
  lastContributedAt: number;
}

export interface LiveServerBountyState {
  bountyId: string;
  dateKey: string;
  title: string;
  subtitle: string;
  objectiveLabel: string;
  targetPoints: number;
  currentPoints: number;
  completed: boolean;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  claimedByPlayer: boolean;
  contributors: LiveServerBountyContributor[];
  lastUpdatedAt: number;
}

// ---------------------------------------------------------------------------
// WAVE 12 — 60s E5430 FPS 1% LOW BENCHMARK & TRAINING PRESET DPS COMPARISON
// ---------------------------------------------------------------------------

export type FrameBenchmarkVerdict =
  | 'DAT_E5430_60FPS'
  | 'DAT_E5430_30FPS_ON_DINH'
  | 'CAN_TOI_UU_THEM';

export interface FrameBenchmarkLiveSnapshot {
  running: boolean;
  durationSec: number;
  elapsedSec: number;
  progressPct: number;
  sampleCount: number;
  liveAvgFps: number;
  liveEst1LowFps: number;
  liveDrawCalls: number;
  liveTriangles: number;
  activePointLights: number;
  liteActive: boolean;
  watchdogStage: number;
}

export interface FrameBenchmarkReport {
  schemaVersion: string;
  generatedAtIso: string;
  durationRequestedSec: number;
  elapsedSec: number;
  sampleCount: number;
  avgFps: number;
  fps1Low: number;
  avgFrameMs: number;
  p95FrameMs: number;
  p99FrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  jankFramesOver33ms: number;
  jankFramesOver50ms: number;
  avgDrawCalls: number;
  peakDrawCalls: number;
  avgTriangles: number;
  peakTriangles: number;
  activePointLights: number;
  liteActive: boolean;
  watchdogStage: number;
  gpuRenderer: string;
  chapterId: number;
  heroId: string;
  verdict: FrameBenchmarkVerdict;
}

export interface TrainingPresetDpsRecord {
  slotId: LoadoutPresetSlotId;
  presetName: string;
  dps5s: number;
  peakDps: number;
  critRatePct: number;
  totalDamage: number;
  hits: number;
  mvpSkillLabel: string;
  recordedAt: number;
}

export interface TrainingPresetComparisonRow extends TrainingPresetDpsRecord {
  deltaDpsPct: number;
  isBaseline: boolean;
  isLeader: boolean;
}

// ============================================================================
// WAVE 18: ZODIAC VOWS, SKILL DRAFT FOCUS PITY & 1-CLICK ACCESSIBILITY PRESETS
// ============================================================================

export type ZodiacVowId = 'vow_ferocity' | 'vow_haste' | 'vow_austerity';

export interface ZodiacVowDefinition {
  id: ZodiacVowId;
  title: string;
  name: string;
  shortLabel: string;
  glyph: string;
  challengeText: string;
  description: string;
  rewardText: string;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemyCadenceMult: number;
  healEffectivenessMult: number;
  goldBonusPct: number;
  starDustBonusPct: number;
}

export type AccessibilityPresetId =
  | 'standard'
  | 'colorblind'
  | 'comfort_antiflash'
  | 'large_captions';

export interface SkillDraftFocusBadge {
  kind: 'synergy_unlock' | 'synergy_tier_up' | 'synergy_progress' | 'build_focus';
  label: string;
  accentColor: string;
}

// ============================================================================
// LIVING VIRTUAL CHARACTER AI (PHASE 2 — MEMORY, 1-ON-1 DM, COACH & CALLOUTS)
// ============================================================================

export type VirtualRelationshipTier =
  | 'stranger'
  | 'acquaintance'
  | 'ally'
  | 'rival'
  | 'mentor';

export type VirtualMemoryKind =
  | 'arena_win'
  | 'arena_loss'
  | 'coop_clear'
  | 'dm_chat'
  | 'coach_advice';

export interface VirtualMemoryEntry {
  id: string;
  kind: VirtualMemoryKind;
  summaryVi: string;
  timestampMs: number;
}

export interface VirtualDmMessage {
  id: string;
  sender: 'player' | 'ai';
  text: string;
  timestampMs: number;
  source?: AiInferenceSource;
}

export interface VirtualPlayerRelationshipMemory {
  aiPlayerId: string;
  aiName: string;
  affinityScore: number; // -100..100
  tier: VirtualRelationshipTier;
  memories: VirtualMemoryEntry[]; // max 6
  dmMessages: VirtualDmMessage[]; // max 12
  updatedAtMs: number;
}

export type VirtualCompanionCommandId =
  | 'focus_boss'
  | 'protect_player'
  | 'sync_burst';

export interface VirtualCompanionCalloutResult {
  allyName: string;
  command: VirtualCompanionCommandId;
  calloutVi: string;
  source: AiInferenceSource;
  model: string;
}

export interface VirtualPostMatchCommentaryResult {
  aiPlayerId: string;
  aiName: string;
  aiTitle: string;
  relationshipTier: VirtualRelationshipTier;
  affinityScore: number;
  affinityDelta: number;
  commentVi: string;
  source: AiInferenceSource;
  model: string;
}

export interface VirtualBuildCoachResult {
  aiPlayerId: string;
  aiName: string;
  headlineVi: string;
  tipsVi: string[];
  recommendedActionVi: string;
  source: AiInferenceSource;
  model: string;
}








