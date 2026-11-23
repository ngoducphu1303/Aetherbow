import { getEnemyLabel } from '../data/assetRegistry';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { disposeObjectResources } from './resources';
import {
  AaaMobKind,
  AaaMobSkillId,
  computeAaaMobSteering,
  computeDirectionalHitImpulse,
  computeHadesTelegraphCue,
  computeProceduralEnemyAaaPose,
  computeSafeFlankBlinkTarget,
  dampShortestYaw,
  getAaaMobVfxBudget,
  planAaaMobSkill,
  resolveChapterMobSkillTheme,
  stepDirectionalRecoil,
  stepMobPhysicalDash,
} from './aaaEnemyCombatEngine';
import {
  AUTO_RIG_CALIBRATION,
  AutoRigInstance,
  updateAutoRigPose,
} from './aaaAutoRigSystem';
import {
  BoneTrailController,
  createBoneTrailController,
  disposeBoneTrailController,
  updateBoneTrailController,
} from './aaaBoneTrails';
import {
  buildPlayerVolley,
  drainReadyVolleyShots,
  resolvePrimaryArrowEnhancement,
  VolleyShotEntry,
} from './volleySystem';
import {
  createFixedTimestepClock,
  createSeededRng,
  FIXED_SIM_DT,
  FixedTimestepClock,
  MAX_FRAME_DT,
  MAX_SIM_SUBSTEPS,
  stepFixedTimestep,
} from './fixedTimestep';
import {
  advanceKinestheticsTick,
  AI_COMPANION_ROLES,
  computeAiCompanionDecision,
  computeAiRivalDuelDecision,
  computeAutoPilotDecision,
  createDeterministicKinestheticsClock,
  DeterministicKinestheticsClock,
  shouldManualOverride,
  triggerDeterministicHitStop,
  triggerDeterministicPerfectDodgeBurst,
} from './aiCombatBrain';
import {
  clearCombatInputBuffer,
  CombatInputBufferState,
  CombatLightingMood,
  CombatLightingState,
  computeEqualizedArenaStats,
  consumeBufferedAction,
  createCombatInputBuffer,
  createCombatLightingState,
  evaluateAdaptiveResolutionScale,
  evaluateComboRankPromotion,
  getWeaponKineticSignature,
  queueBufferedAction,
  stepCombatLightingMood,
} from './aaaFivePillarsDirector';
import type { WeeklyBossSchedule } from '../data/weeklyBossData';
import {
  computeEffectiveRenderPixelRatio,
  MythicZodiacGradeShader,
  resolvePostFxConfig,
  resolveSystemLiteBudget,
} from './aaaVisualPipeline';
import { sanitizeLoadedObjectForBudget } from './assetSanitizer';
import {
  CombatFlashKind,
  computeHitstopMicroJitter,
  computeImpactLightPulse,
  computeKnockbackImpulse,
  computePostFxImpulse,
  PostFxImpulseEvent,
} from './aaaCombatJuice';
import {
  computeBossKillSlowMoState,
  computeBowStringPose,
  computeCloakWavePose,
  computeZodiacUrnPlacements,
  ElementalGroundKind,
  evaluateElementalZoneEffect,
} from './aaaCombatDirector';
import {
  computeArenaEntryFlyBlend,
  computeEdgeThreatIndicators,
  computeLobbyEmotePose,
  computeUltimateCutinState,
  RawThreatSample,
  resolveChapterBiomeAtmosphere,
} from './aaaWave3Director';
import {
  computeBrazierFlamePose,
  computeCompanionSynergyOrbit,
  computeMountBankTilt,
  createFpsSampler,
  createRoomBounty,
  cycleCombatCameraPreset,
  DEFAULT_COMBAT_KEYBINDS,
  getZodiacConstellationGeometry,
  normalizeCombatKeybinds,
  pushFpsSample,
  readFpsMetrics,
  RoomBountyEvent,
  RoomBountyState,
  stepAstralOvercharge,
  toRoomBountySnapshot,
  updateRoomBountyProgress,
} from './aaaWave6Director';
import {
  applyBossStaggerDamage,
  BossStaggerState,
  createBossStaggerState,
  createStyleMomentumState,
  getStyleFillRatio,
  GUARD_BREAK_DURATION_SEC,
  pickCoopPingAiReply,
  recordStyleAction,
  recordStyleDamageTaken,
  stepBossStaggerState,
  stepStyleMomentum,
  StyleMomentumState,
} from './wave7CombatSystems';
import {
  AiRivalAttackPattern,
  AiRivalCombatState,
  buildLethalDefeatReport,
  computeArenaSuddenDeath,
  computeLethalArenaMatchConfig,
  computePvEIntensityProfile,
  createAiRivalCombatState,
  LethalArenaMatchConfig,
  stepAiRivalCombatBrain,
} from './wave8LethalAiSystems';
import type {
  AiDuelDifficultyTier,
  Chapter1MapMode,
  CombatStyleGrade,
  LowEndSafetyMode,
} from '../types/game';
import {
  advanceElementalResonance,
  AiDominantElement,
  AiPlayerAdaptationProfile,
  applyBossPartDamage,
  BossBreakablePart,
  BossPartId,
  computeAdaptiveAiCounterAdjustments,
  computeDynamicSkyShaderTargets,
  createBossBreakableParts,
  createInitialElementalResonanceState,
  ElementalResonanceState,
  EQUALIZED_TRIAL_KITS,
  EqualizedTrialKitId,
  GuildWarBastionId,
  mapReactionToResonanceElement,
  PlayerCombatTelemetryInput,
  tickElementalResonanceTimers,
} from './wave10FivePillars';
import {
  activateWeaponOverdrive,
  AI_SQUAD_FORMATIONS,
  AiSquadFormationId,
  chargeWeaponOverdrive,
  CinematicCameraState,
  computeEqualizedRiftModifiers,
  createIdleCinematicCameraState,
  createInitialWeaponOverdriveState,
  damageInteractiveHazard,
  formatSquadPingBanner,
  generateInteractiveBattlefieldHazards,
  getDailyRiftMutators,
  getUtcDateKeyWave11,
  InteractiveHazardSpec,
  normalizeAiSquadFormation,
  OverdriveWeaponArchetype,
  stepCinematicCamera,
  stepWeaponOverdrive,
  triggerCinematicCamera,
  WeaponOverdriveBuffs,
  WeaponOverdriveState,
} from './wave11FivePillars';
import {
  computePowerPressure,
  getTowerRecommendedPower,
  PowerPressureEvaluation,
} from '../data/fairProgression30Day';
import {
  BossWeakPointState,
  ChapterWeatherProfile,
  checkBossWeakPointHit,
  computeResonanceTrapPlacements,
  computeSanctuaryAtmosphereWave,
  computeStuckArrowLocalOffset,
  createBossWeakPointWindow,
  evaluateTargetLockState,
  getBossWeakPointWorldPos,
  getChapterWeatherProfile,
  LobbyInspectRigState,
  RESONANCE_TRAP_CONFIGS,
  stepBossWeakPointWindow,
  stepFootstepRippleDistance,
  stepLobbyInspectRig,
} from './aaaWave7Director';
import { computeSpatialPan } from '../audio/aaaAudioMix';
import {
  CoopSynergyClock,
  createCoopSynergyClock,
  getCoopResonanceDamageMult,
  mapBossTelegraphToHud,
  onCoopAllyUltimateCast,
  onPlayerUltimateCastInCoop,
  stepCoopSynergyClock,
  toHudCoopSynergy,
} from './coopSynergy';
import {
  BOSS_GUARD_BREAK_STUN_SEC,
  BOSS_STUN_IMMUNITY_SEC,
  BossAiRuntimeState,
  BossHazardKind,
  BossPendingVolley,
  BossTimedEnrageModifiers,
  clampBossChillSlowMult,
  clearBossAiTransientCombat,
  computeBossEnrageModifiers,
  computeBossInnateArmorReduction,
  computeBossPhaseDamageMult,
  computeSafeBlinkDestination,
  createBossAiRuntimeState,
  getBossPerformanceBudget,
  getBossRecoveryDuration,
  planNextBossSkill,
  scaleOrbCountForBudget,
  stepBossMovement,
  ZODIAC_BOSS_PROFILES,
} from './zodiacBossAi';
import {
  CHAPTER1_ROSTER_ASSET_IDS,
  CampaignRosterAssetId,
  CHAPTER2_ROSTER_ASSET_IDS,
  CHAPTER3_ROSTER_ASSET_IDS,
  getCampaignRosterArchetype,
  Chapter1RosterBurstType,
  disposeChapter1RosterTemplateCache,
  getCachedChapter1RosterTemplateSync,
  instantiateChapter1RosterModel,
  loadChapter1RosterTemplate,
  resolveCampaignRosterAssetId,
  resolveCampaignRosterVisualTheme,
  updateChapter1RosterMotion,
} from './chapter1RosterAssets';
import {
  AdaptiveFpsGovernor,
  BOSS_FINISHER_DURATION_SEC,
  BOSS_PHASE_ATMOSPHERE,
  COOP_TACTICAL_ORDERS,
  CombatElementKind,
  computeBossFinisherPresentation,
  createAdaptiveFpsGovernor,
  ELEMENTAL_IMPACT_VFX,
  getAdaptiveFpsModifiers,
  sampleAdaptiveFpsFrame,
  selectCoopAllyTarget,
  shouldCoopAllyHoldUlt,
  WAVE9_COOP_QUICK_ORDERS,
} from './wave5CombatSystems';
import {
  ARENA_PROP_CONFIGS,
  ArenaPropKind,
  BOSS_PHASE_2_HP_RATIO,
  BOSS_PHASE_3_HP_RATIO,
  BOSS_PHASE_COUNTER_WINDOW_SEC,
  computeBossPhaseCounterPresentation,
  computeCoopPrimerCallout,
  computeExecutionFinisherPresentation,
  computeWave9ArenaPropPlacements,
  evaluateCoopSanctuaryRescue,
  EXECUTION_FINISHER_DURATION_SEC,
  isExecutionFinisherEligible,
  resolveArenaPropActivation,
} from './wave9FivePillars';
import {
  BossPaceTrackerState,
  COOP_AI_ROLE_DEFS,
  PerfectDodgeCounterState,
  WEATHER_BIOME_PROFILES,
  computeCoopRoleSynergy,
  computeCounterVisualTimeScale,
  computeWeatherInstanceBudget,
  consumePerfectDodgeCounterShot,
  createBossPaceTracker,
  createPerfectDodgeCounterState,
  resolveWeatherBiome,
  stepPerfectDodgeCounter,
  triggerPerfectDodgeCounter,
  updateBossPaceTracker,
} from './wave6CombatSystems';
import { createArtemisMotion } from './artemisMotion';
import {
  HEAVY_BREAK_COOLDOWN_SEC,
  type EnemyTacticalRole,
  type RoomChaosEventDef,
  advanceComboBeat,
  computeBossPhase2TotemPositions,
  computeChainDetonationSplash,
  computeHeavyBreakStrikeSpec,
  isHitBlockedByFrontShield,
  resolveEnemyTacticalRole,
  resolveMoveShootIntervalMult,
  rollRoomChaosEvent,
  shouldTriggerSurpriseAmbush,
} from './funCombatOverhaul';

import {
  disposeSolarLeoTemplateCache,
  getCachedSolarLeoTemplateSync,
  InstantiatedSolarLeoModel,
  instantiateSolarLeoModel,
  loadSolarLeoTemplate,
  resolveSolarLeoHeroAssetId,
  SOLAR_LEO_ARTIFACT_OFFSET,
  SolarLeoVariant,
  updateSolarLeoArtifactPose,
  updateSolarLeoHaloPose,
  updateSolarLeoHumanoidPose,
  updateSolarLeoMountPose,
  updateSolarLeoPetPose,
  updateSolarLeoWingsPose,
} from './solarLeoAssets';
import {
  getChapter1MapAssetUrl,
  getChapter1MapLiteAssetUrl,
  prepareChapter1MapModel,
} from './chapter1Map';
import {
  createChapter2WarForgeAtmosphere,
  getChapter2MapHighAssetUrl,
  getChapter2MapLiteAssetUrl,
  prepareChapter2MapModel,
  updateChapter2WarForgeAtmosphere,
  type Chapter2ForgeAtmosphereRig,
} from './chapter2Map';
import {
  createChapter3EmeraldSanctuaryAtmosphere,
  getChapter3MapHighAssetUrl,
  getChapter3MapLiteAssetUrl,
  prepareChapter3MapModel,
  updateChapter3EmeraldSanctuaryAtmosphere,
  type Chapter3SanctuaryAtmosphereRig,
} from './chapter3Map';
import {
  downloadChapter1BossArrayBuffer,
  getChapter1BossAssetUrl,
  isSolarLionBossEncounter,
  prepareChapter1BossModel,
  updateChapter1BossMotion,
} from './chapter1Boss';
import {
  clearBoss3dLoadInFlight,
  clearChapter1MapLoadInFlight,
  clearHeavyAssetLoadInFlight,
  detectStartupGpuProfile,
  isLowEndSafetyModeActive,
  markBoss3dLoadInFlight,
  markChapter1MapLoadInFlight,
  markHeavyAssetLoadInFlight,
  readPersistedChapter1MapMode,
  readPersistedLowEndSafetyMode,
  refreshStartupGpuProfile,
  resetGpuCrashSentinel,
  resolveBoss3dModelVariant,
  resolveChapter1MapVariant,
  tripGpuCrashSentinel,
} from './gpuSafetyGuard';
import {
  discardChapter1MapDownload,
  discardChapter2MapDownload,
  discardChapter3MapDownload,
  discardModelDownload,
  downloadChapter1Map,
  downloadChapter2Map,
  downloadChapter3Map,
  downloadModel,
  getModelAssetUrl,
  type ModelAsset,
} from './modelAssets';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import {
  getEndlessTowerScaling,
  getSideModeScaling,
  PUNISH_WINDOW_DAMAGE_BONUS,
  PUNISH_WINDOW_PHASE3_BONUS,
} from '../data/earlyProgressionData';
import { HERO_MAP } from '../data/heroesData';
import {
  computeTrainingDpsSnapshot,
  createTrainingDpsState,
  getHeroActiveSkill,
  getNightmareTierConfig,
  PERFECT_DODGE_DAMAGE_BONUS,
  PERFECT_DODGE_SLOWMO_DURATION,
  PERFECT_DODGE_SLOWMO_SCALE,
  recordTrainingHit,
  resolvePerfectDodgeTrigger,
  TrainingDpsState,
} from '../data/phase5Data';
import { evaluateActiveSynergies, SKILL_SYNERGY_MAP } from '../data/skillsData';
import { PET_MAP } from '../data/wave3Data';
import {
  CONSTELLATIONS,
  CONSTELLATION_ELEMENT_META,
  COOP_DIFFICULTY_MAP,
  ELEMENTAL_TOWER_MAP,
  selectCoopAiAllies,
} from '../data/wave6Data';
import {
  CRYSTAL_DEFENSE_TOTAL_WAVES,
  computeWorldBossLiveRank,
} from '../data/wave7Data';
import { BLOOD_MOON_DURATION_SEC } from '../data/wave8Data';
import {
  ABYSSAL_GAUNTLET_TOTAL_WAVES,
  GUILD_WAR_DURATION_SEC,
} from '../data/wave9Data';
import { PANTHEON_TOTAL_STAGES } from '../data/wave10Data';
import {
  CHAMPIONSHIP_RIVALS,
  CHAMPIONSHIP_TACTICS,
  CHAMPIONSHIP_TOTAL_ROUNDS,
  getEvolvedPetMultiplier,
  LOBBY_SKY_THEME_MAP,
} from '../data/wave11Data';
import { CRYSTAL_VAULT_DURATION_SEC, getComboTierMeta } from '../data/wave12Data';
import { DRAGON_LAIR_DURATION_SEC, LOBBY_WEATHER_DEFS } from '../data/wave13Data';
import { SANCTUARY_FLOOR_MAP } from '../data/wave14Data';
import {
  ArenaOpponent,
  ChampionshipTacticDef,
  ChampionshipTacticId,
  ChapterDefinition,
  CombatCameraPreset,
  CombatKeybinds,
  ComputedPlayerStats,
  CoopAllySummary,
  CoopRaidDifficulty,
  CoopTacticalOrder,
  ArenaHazardType,
  DailyRiftMutatorPair,
  DamageBreakdown,
  DefeatCauseInfo,
  ElementalTowerId,
  EliteAffix,
  EnemyKind,
  FloatingDamage,
  GamePhase,
  GpuProfileSummary,
  GraphicsQuality,
  HeroId,
  HudSnapshot,
  JoystickState,
  LobbyCameraPreset,
  LobbyHeroPoseId,
  LobbySkyThemeId,
  NightmareTierConfig,
  TrainingTargetMode,
  LobbyWeatherId,
  PantheonBlessingDef,
  PetId,
  PhotoLightingPreset,
  ResonanceTrapKind,
  RunCombatHighlights,
  RuneId,
  SanctuaryFloorId,
  SkillId,
  SkillSynergyId,
  StageEventAfter,
  AiAutoPilotTactic,
  AiCompanionRole,
  AiLivePlayerPersonality,
  AiLivePlayerProfile,
  BossPaceHudSnapshot,
  CoopAiRole,
  CoopRoleSynergySummary,
  SystemLiteBudget,
  WeatherBiomeKind,
  WheelOutcome,
} from '../types/game';
import {
  CelestialSanctuaryRefs,
  createAncientDragonBossModel,
  createCelestialSanctuaryBackdrop,
  createCompanionModel,
  createEnemyModel,
  createHeroModel,
  createPetModel,
  createPillarModel,
  createPortalModel,
  createRoyalPedestalDecor,
  createShrineModel,
  createSkySeraphBossModel,
  createSpiritCrystalModel,
  createDestructibleZodiacUrnModel,
  createVaultCrystalPillarModel,
  EnemyModelRefs,
  HeroModelRefs,
  HeroVisualConfig,
  SpiritCrystalRefs,
} from './models';
import {
  createContactShadowTexture,
  createStoneNormalTexture,
  createStoneRoughnessTexture,
  createStoneTileTexture,
  createTargetReticleTexture,
} from './textures';
import { computeKoPose } from './koTransition';
import {
  computeCameraSightline,
  computeTraumaShake,
  projectFloatingScreenPos,
} from './combatFeel';
import { stepGhostRatio } from '../audio/audioCurves';
import {
  computeBossIntroBlend,
  computeCountdownRingScale,
  resolveZodiacArenaStyle,
  ZodiacArenaThemeSpec,
} from './zodiacArena';
import {
  BOSS_ENTRANCE_SUB_DURATION_SEC,
  canDamageEnemyDuringEntrance,
  canPlayerExecuteAttack,
  computeBossEntranceCameraBlend,
  evaluateBossEntranceState,
  isBossEntranceAttackLocked,
  resolveBossEntranceDurationSec,
} from './bossEntrance';
import {
  computeAimSightlineTransform,
  computeHitIndicatorAngleDeg,
  computeImpactDecalState,
  resolveEnemyStatusTint,
} from './combatFeedback';
import {
  computeVictoryOrbitCamera,
  ElementalHitType,
  evaluateElementalReaction,
  GamepadPrevButtons,
  resolveTelegraphPalette,
  sampleGamepadInput,
  triggerHapticPulse,
} from './aaaWave4Director';
import {
  ArmorShardKinematics,
  computeRollingDpsMetrics,
  createRollingDpsTracker,
  recordRollingDpsSample,
  resetRollingDpsTracker,
  resolveCombatCameraConfig,
  resolvePhotoLightingMood,
  stepArmorShardPhysics,
} from './aaaWave5Director';

// Pre-allocated math & color helpers for zero GC in tick
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _scaleOne = new THREE.Vector3(1, 1, 1);
const _mat4 = new THREE.Matrix4();
const _dummy = new THREE.Object3D();
const _skyCol = new THREE.Color();
const _fogCol = new THREE.Color();
const _keyCol = new THREE.Color();
const _hemiSkyCol = new THREE.Color();
const _hemiGndCol = new THREE.Color();
const _starCol = new THREE.Color();
const _nebulaCol = new THREE.Color();
const _auroraCol = new THREE.Color();

const ARENA_HALF_W = 10.5;
const ARENA_HALF_D = 12.2;

interface ObstacleBox {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
  destructible?: boolean;
  intact?: boolean;
  crystalCap?: THREE.Mesh;
}

interface BreakableUrn {
  x: number;
  z: number;
  radius: number;
  alive: boolean;
  variant: 'heal' | 'ult' | 'gold';
  mesh: THREE.Group;
  sealMesh?: THREE.Mesh;
  shadow: THREE.Mesh;
}

interface EnemyEntity {
  stormMarkUntil?: number;
  id: number;
  kind: EnemyKind;
  isElite: boolean;
  isArenaRival?: boolean;
  bossTitle?: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  goldValue: number;
  isBoss: boolean;
  spawnTimer: number;
  spawnDuration?: number;
  attackTimer: number;
  telegraphTimer: number;
  telegraphDuration: number;
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  aimX: number;
  aimZ: number;
  slamX: number;
  slamZ: number;
  slamRadius: number;
  laneAngles: number[];
  bossPhase: 1 | 2 | 3;
  phaseTransitioned: boolean;
  phaseThreeTransitioned?: boolean;
  patternCounter?: number;
  breakShield?: number;
  maxBreakShield?: number;
  stunTimer?: number;
  punishWindowTimer?: number;
  punishWindowMax?: number;
  bossParts?: BossBreakablePart[];
  bossPartMeshes?: Partial<Record<BossPartId, THREE.Mesh[]>>;
  isVaultPillar?: boolean;
  isGoldenPillar?: boolean;
  isTrainingDummy?: boolean;
  burnTimer: number;
  burnDps: number;
  poisonDps: number;
  chillTimer: number;
  reactionCd?: number;
  hitFlashTimer: number;
  phaseAngle: number;
  model: EnemyModelRefs;
  shadow: THREE.Mesh;
  telegraphGroup: THREE.Group;
  telegraphOuterRing?: THREE.Mesh;
  telegraphCountdownRing?: THREE.Mesh;
  telegraphFill: THREE.Mesh;
  punishRingMesh?: THREE.Mesh;
  breakShieldRingMesh?: THREE.Mesh;
  eliteAffix?: EliteAffix;
  eliteAffixes?: EliteAffix[];
  eliteShieldHp?: number;
  eliteFrostPulseTimer?: number;
  eliteAuraRingMesh?: THREE.Mesh;
  eliteAuraRingMesh2?: THREE.Mesh;
  laserLine: THREE.Line;
  baseScale?: number;
  hitSquashY?: number;
  hitStretchXZ?: number;
  knockVx?: number;
  knockVz?: number;
  hpBarGroup?: THREE.Group;
  hpBarFill?: THREE.Mesh;
  hpBarGhost?: THREE.Mesh;
  hpBarGhostRatio?: number;
  hpBarHeight?: number;
  tacticalRole?: EnemyTacticalRole;
  isBossTotem?: boolean;
  totemOwnerId?: number;
  ambushBounty?: boolean;
  chargerCooldown?: number;
  chargerDirX?: number;
  chargerDirZ?: number;
  chargerDashing?: boolean;
  chargerDashTimer?: number;
  solarLionVisualGroup?: THREE.Group;
  solarLionBurstType?: 'none' | 'lunge' | 'slam' | 'roar';
  solarLionBurstTimer?: number;
  roster3dAssetId?: CampaignRosterAssetId;
  roster3dVisualGroup?: THREE.Group;
  roster3dBaseScale?: number;
  roster3dBurstType?: Chapter1RosterBurstType;
  roster3dBurstTimer?: number;
  autoRig?: AutoRigInstance;
  boneTrails?: BoneTrailController;
  bossAiState?: BossAiRuntimeState;
  bossStunImmuneTimer?: number;
  mobActiveSkill?: AaaMobSkillId | '';
  mobSkillCycle?: number;
  mobFlankSign?: number;
  mobDashActive?: boolean;
  mobDashElapsed?: number;
  mobDashDuration?: number;
  mobDashDirX?: number;
  mobDashDirZ?: number;
  mobDashSpeed?: number;
  mobDashHitPlayer?: boolean;
  mobDashHopHeight?: number;
  mobDashColorHex?: number;
  mobVisualHeightY?: number;
  mobSideHopTimer?: number;
  mobSideHopDirX?: number;
  mobSideHopDirZ?: number;
  mobBurstTimer?: number;
  mobNextCooldown?: number;
  hitRecoilX?: number;
  hitRecoilZ?: number;
  bankRoll?: number;
  bankPitch?: number;
  footstepDustTimer?: number;
  dead?: boolean;
}

const ELITE_AFFIX_META: Record<EliteAffix, { label: string; colorHex: number }> = {
  aegis: { label: 'Hộ Thuẫn', colorHex: 0x38bdf8 },
  haste: { label: 'Cuồng Tốc', colorHex: 0xfacc15 },
  volatile: { label: 'Hỏa Bộc', colorHex: 0xf97316 },
  frost: { label: 'Hàn Khí', colorHex: 0x67e8f9 },
};
const ELITE_AFFIX_LIST: EliteAffix[] = ['aegis', 'haste', 'volatile', 'frost'];

const ARENA_HAZARD_META: Record<ArenaHazardType, { label: string; colorHex: number }> = {
  solar_eruption: { label: 'Bẫy Phun Trào Thái Dương', colorHex: 0xf97316 },
  frost_zone: { label: 'Bẫy Vùng Hàn Băng', colorHex: 0x38bdf8 },
  void_pulse: { label: 'Bẫy Xung Hư Không', colorHex: 0xa855f7 },
};

interface Projectile {
  active: boolean;
  isEnemy: boolean;
  isSword: boolean;
  homing: boolean;
  source?: 'basic' | 'ultimate' | 'pet' | 'elemental';
  enemySourceKind?: 'boss_lane' | 'boss_projectile' | 'ranged_barrage';
  coopAllyIndex?: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  radius: number;
  life: number;
  pierceLeft: number;
  ricochetLeft: number;
  wallBounceLeft: number;
  hitEnemyIds: Set<number>;
  blaze: boolean;
  frost: boolean;
  storm: boolean;
  poison: boolean;
  isCounterShot?: boolean;
  isOvercharge?: boolean;
  isComboFinisher?: boolean;
  isChainShot?: boolean;
  mesh: THREE.Mesh;
  trailMesh?: THREE.Mesh;
  compassGroup?: THREE.Group;
}

interface CoopAllyEntity {
  heroId: HeroId;
  name: string;
  role?: AiCompanionRole;
  roleLabel?: string;
  accentHex: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  attackTimer: number;
  supportTimer?: number;
  ultCharge: number;
  damageDealt: number;
  phaseAngle: number;
  calloutText?: string | null;
  calloutTimer?: number;
  model: HeroModelRefs;
  shadow: THREE.Mesh;
}

interface MeteorStrike {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vy: number;
  radius: number;
  damage: number;
  isFrost: boolean;
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  mesh: THREE.Mesh;
}

interface LootOrb {
  active: boolean;
  kind: 'xp' | 'gold' | 'gem' | 'heal';
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  value: number;
  magnetized: boolean;
  mesh: THREE.Mesh;
}

interface LightningArc {
  active: boolean;
  timer: number;
  line: THREE.Line;
}

interface ShockwaveRing {
  active: boolean;
  x: number;
  z: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  mesh: THREE.Mesh;
}

interface DangerLane {
  active: boolean;
  mesh: THREE.Group;
  fillMesh: THREE.Mesh;
}

export type AppearanceStatus = 'loading' | 'ready' | 'error';

export interface EngineCallbacks {
  onAppearanceStatusChange?: (status: AppearanceStatus) => void;
  onChapter1MapStatusChange?: (status: AppearanceStatus) => void;
  onGpuSafetyTriggered?: (profile: GpuProfileSummary) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onFloatingDamage: (dmg: FloatingDamage) => void;
  onJoystickUpdate: (joy: JoystickState) => void;
  onRequestSkillDraft: (skills: Partial<Record<SkillId, number>>) => void;
  onRequestEncounter: (
    kind: StageEventAfter,
    skills: Partial<Record<SkillId, number>>,
    context?: { chapterId: number; stage: number }
  ) => void;
  onRunEnded: (
    victory: boolean,
    summary: {
      chapterId: number;
      stageReached: number;
      kills: number;
      gold: number;
      gems: number;
      isTowerMode?: boolean;
      towerFloor?: number;
      isBossRushMode?: boolean;
      bossRushRound?: number;
      isDailyRiftMode?: boolean;
      isGuildBossMode?: boolean;
      guildBossDamage?: number;
      isArenaMode?: boolean;
      arenaOpponentName?: string;
      isCoopRaidMode?: boolean;
      coopDifficulty?: CoopRaidDifficulty;
      isElementalTowerMode?: boolean;
      elementalTowerId?: ElementalTowerId;
      elementalTowerFloor?: number;
      isCrystalDefenseMode?: boolean;
      crystalWavesCleared?: number;
      crystalHpPct?: number;
      wingFeathers?: number;
      isWorldBossMode?: boolean;
      worldBossDamage?: number;
      worldBossLiveRank?: number;
      isBloodMoonMode?: boolean;
      bloodMoonScore?: number;
      bloodMoonWave?: number;
      mountShards?: number;
      awakeningCrystals?: number;
      starDust?: number;
      petEssence?: number;
      isAbyssalMode?: boolean;
      abyssalWave?: number;
      abyssalScore?: number;
      artifactShards?: number;
      mysticTokens?: number;
      isGuildWarMode?: boolean;
      guildWarScore?: number;
      guildWarNodes?: number;
      guildCoins?: number;
      isPantheonMode?: boolean;
      pantheonStage?: number;
      pantheonScore?: number;
      divineCrystals?: number;
      isChampionshipMode?: boolean;
      championshipRound?: number;
      championshipScore?: number;
      gloryTrophies?: number;
      spiritCores?: number;
      festivalLanterns?: number;
      isCrystalVaultMode?: boolean;
      vaultPillarsBroken?: number;
      vaultGemsLooted?: number;
      vaultReforgeLooted?: number;
      vaultShardsLooted?: number;
      warCrests?: number;
      isDragonLairMode?: boolean;
      dragonDamageDealt?: number;
      dragonScalesLooted?: number;
      dragonPhase?: 1 | 2 | 3;
      isSkyCitadelMode?: boolean;
      skyCitadelScore?: number;
      skyCitadelWave?: number;
      celestialFeathers?: number;
      mythicShards?: number;
      isWeeklyRankedBossMode?: boolean;
      weeklyBossIsPractice?: boolean;
      weeklyBossAttemptId?: string;
      weeklyBossSeed?: string;
      weeklyBossDamage?: number;
      weeklyBossCleared?: boolean;
      weeklyBossSimTicks?: number;
      weeklyBossClearTimeMs?: number;
      weeklyBossRemainingHpPct?: number;
      weeklyBossSplitsMs?: (number | null)[];
      weeklyBossCounterHits?: number;
      weeklyBossGuardBreaks?: number;
      peakStyleGrade?: CombatStyleGrade;
      weeklyBossIsWeekendBlitz?: boolean;
      autoPilotUsed?: boolean;
      liveAiDuelId?: string;
      liveAiPlayerId?: string;
      liveAiDurationSec?: number;
      maxCombo?: number;
      damageBreakdown?: DamageBreakdown;
      defeatCause?: DefeatCauseInfo;
      activeSynergies?: SkillSynergyId[];
      aiDuelTier?: AiDuelDifficultyTier;
      aiRewardBonusPct?: number;
      arenaRivalRemainingHpPct?: number;
      consolationStarDust?: number;
      coachingNote?: string;
      trialGauntletRound?: 1 | 2 | 3;
      trialGauntletKitId?: EqualizedTrialKitId;
      guildWarBastionId?: GuildWarBastionId;
      combatTelemetry?: PlayerCombatTelemetryInput;
      isEqualizedRiftMode?: boolean;
      equalizedRiftFloor?: number;
    }
  ) => void;
  onProgressEvent?: (ev: {
    killsDelta?: number;
    stageCleared?: boolean;
    bossKilled?: boolean;
    maxCombo?: number;
    seenEnemyKind?: EnemyKind;
  }) => void;
  onLobbyHeadPos?: (pos: { x: number; y: number; visible: boolean }) => void;
  onGamepadPause?: () => void;
  onCombatCameraQuickCycle?: (preset: CombatCameraPreset) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private lowEndGpu = false;
  private gpuProfile: GpuProfileSummary;
  private bloomEnabled = true;
  private bloomImpulse = 0;
  private chromaticImpulse = 0;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private heroLight: THREE.PointLight;
  private impactLightPool: Array<{
    light: THREE.PointLight;
    intensity: number;
    decayRate: number;
  }> = [];
  private critStarPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    baseScale: number;
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
  }> = [];
  private arenaLightShafts: THREE.Mesh[] = [];

  private arenaGroup = new THREE.Group();
  private proceduralArenaShell: THREE.Group | null = null;
  private chapter1MapModel: THREE.Group | null = null;
  private chapterMapLoadedChapterId: 1 | 2 | 3 | null = null;
  private chapterMapLoadingChapterId: 1 | 2 | 3 | null = null;
  private chapterMapRequestedVariant: 'none' | 'lite' | 'full' = 'none';
  private chapterMapRequestToken = 0;
  private chapter1MapLoadedVariant: 'none' | 'lite' | 'full' = 'none';
  private chapter1MapLoadingVariant: 'none' | 'lite' | 'full' = 'none';
  private chapter1MapLoading = false;
  private chapter1MapFailCount = 0;
  private chapter1MapStatus: AppearanceStatus = 'loading';
  private chapter1MapMode: Chapter1MapMode = 'auto';
  private lowEndSafetyMode: LowEndSafetyMode = 'auto';
  private systemBudget!: SystemLiteBudget;
  private lastRawFrameDt = 1 / 60;
  private chapter1MapInFlightMarked = false;
  private chapter1MapStableFrames = 0;
  private chapter2ForgeAtmosphere: Chapter2ForgeAtmosphereRig | null = null;
  private chapter3SanctuaryAtmosphere: Chapter3SanctuaryAtmosphereRig | null = null;
  private entitiesGroup = new THREE.Group();
  private projectilesGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private floorMesh!: THREE.Mesh;
  private contactShadowTex: THREE.CanvasTexture;
  private reticleMesh!: THREE.Mesh;

  private hero!: HeroModelRefs;
  private artemisModel?: THREE.Group;
  private artemisMotion?: ReturnType<typeof createArtemisMotion>;
  private artemisModelLoading = false;
  private artemisLoadedAsset?: string;
  private artemisFailedAsset?: string;
  private readonly dragonSeat = new THREE.Vector3();
  private readonly mountedRiderHip = new THREE.Vector3();
  // Chapter 1 Solar Leo 3D Character Pack (Aurelia + 4 skins, Solarius, Wings, Halo, Artifact, Astraeo)
  private solarLeoHeroRig?: InstantiatedSolarLeoModel;
  private solarLeoHeroKey?: string;
  private solarLeoHeroSeq = 0;
  private solarLeoMountRig?: InstantiatedSolarLeoModel;
  private solarLeoMountVariant?: SolarLeoVariant;
  private solarLeoMountSeq = 0;
  private solarLeoWingRig?: InstantiatedSolarLeoModel;
  private solarLeoWingVariant?: SolarLeoVariant;
  private solarLeoWingSeq = 0;
  private solarLeoHaloRig?: InstantiatedSolarLeoModel;
  private solarLeoHaloVariant?: SolarLeoVariant;
  private solarLeoHaloSeq = 0;
  private solarLeoArtifactRig?: InstantiatedSolarLeoModel;
  private solarLeoArtifactVariant?: SolarLeoVariant;
  private solarLeoArtifactSeq = 0;
  private solarLeoPetRig?: InstantiatedSolarLeoModel;
  private solarLeoPetVariant?: SolarLeoVariant;
  private solarLeoPetSeq = 0;
  private solarLeoShootRecoil = 0;
  private solarLeoUltBurst = 0;
  private solarLeoPetAttackRecoil = 0;
  private aureliaSolarShotCount = 0;
  private appearanceBlocked = false;
  private solarLeoHeroFailedAsset?: string;
  private appearanceStatus: AppearanceStatus = 'loading';
  private heroShadow!: THREE.Mesh;
  private heroShieldMesh!: THREE.Mesh;
  private lobbyHaloGroup: THREE.Group | null = null;
  private lobbySanctuary: CelestialSanctuaryRefs | null = null;
  private lobbySanctuaryDustSeeds: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    phase: number;
    scale: number;
  }> = [];
  private arenaDustMesh: THREE.InstancedMesh | null = null;
  private arenaBrazierGems: THREE.Object3D[] = [];
  private arenaThemeSpec: ZodiacArenaThemeSpec = resolveZodiacArenaStyle('leo');
  private bossIntroTimer = 0;
  private bossIntroDuration = 1.55;
  private bossIntroFocusX = 0;
  private bossIntroFocusZ = -5;
  private bossEntranceTimer = 0;
  private bossEntranceDuration = BOSS_ENTRANCE_SUB_DURATION_SEC;
  private bossEntranceBossName: string | null = null;
  private bossEntranceLandingFired = false;
  private bossEntranceHintCd = 0;
  private bossFinisherTimer = 0;
  private bossFinisherDuration = BOSS_FINISHER_DURATION_SEC;
  private bossFinisherFocusX = 0;
  private bossFinisherFocusZ = 0;
  private bossFinisherName: string | null = null;
  private coopTacticalOrder: CoopTacticalOrder = 'focus_boss';
  private adaptiveFpsGovernor: AdaptiveFpsGovernor = createAdaptiveFpsGovernor(true);
  private elementalImpactVfxCd = 0;
  private synergyAwakenedName: string | null = null;
  private synergyAwakenedTimer = 0;
  private elementalZonePool: Array<{
    active: boolean;
    kind: ElementalGroundKind;
    x: number;
    z: number;
    radius: number;
    life: number;
    maxLife: number;
    tickTimer: number;
    baseAtk: number;
    discMesh: THREE.Mesh;
    ringMesh: THREE.Mesh;
  }> = [];
  private elementalZoneSpawnCd = 0;
  // AAA Wave 3 session-only cinematic, atmosphere, threat & lobby emote state
  private ultCutinTimer = 0;
  private ultCutinDuration = 0.75;
  private ultCutinTitle: string | null = null;
  private ultCutinHeroName: string | null = null;
  private ultCutinAccentHex: string | null = null;
  private bossPhaseShiftTimer = 0;
  private bossPhaseShiftLevel: 2 | 3 | null = null;
  private arenaEntryFlyTimer = 0;
  private arenaEntryFlyDuration = 0.55;
  private arenaEntryStartCam = new THREE.Vector3(0, 2.02, 10.65);
  private arenaEntryStartLook = new THREE.Vector3(0, 0.96, 4.5);
  private lobbyEmoteTimer = 0;
  private lobbyEmoteDuration = 1.05;
  private lobbyDragMovedDist = 0;
  private punishHitsCount = 0;
  private threatSamplesBuf: RawThreatSample[] = [];
  private arenaDustSeeds: Array<{
    x: number;
    y: number;
    z: number;
    speed: number;
    phase: number;
    scale: number;
  }> = [];
  private combatAuraGroup: THREE.Group | null = null;
  private heroLightPulse = 0;
  private stridePhase = 0;
  private heroSquashY = 1;
  private lockedTargetId = -1;
  private reticleSnapScale = 1;
  private smoothLookX = 0;
  private smoothLookZ = 0;
  private dashGhostPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    group: THREE.Group;
    mat: THREE.MeshBasicMaterial;
  }> = [];
  private dashGhostEmitTimer = 0;
  private petModel: THREE.Group | null = null;
  private builtPetId: PetId | null = null;
  private builtPetEvolved = false;
  private lobbySkyThemeId: LobbySkyThemeId = 'golden_galaxy';
  private petFireTimer = 0;
  private orbitOrbMeshes: THREE.Mesh[] = [];
  private companionModels: THREE.Group[] = [];
  private shrineGroup: THREE.Group | null = null;
  private shrineKind: StageEventAfter = 'none';
  private shrineUsed = false;

  private portal!: {
    group: THREE.Group;
    vortex: THREE.Mesh;
    ringMat: THREE.MeshStandardMaterial;
    guideChevrons: THREE.Mesh[];
  };

  private obstacles: ObstacleBox[] = [];
  private urns: BreakableUrn[] = [];
  private enemies: EnemyEntity[] = [];
  private killResolutionDepth = 0;
  private dyingCorpses: Array<{
    root: THREE.Group;
    hitMeshes: THREE.Mesh[];
    vx: number;
    vz: number;
    timer: number;
    maxTimer: number;
    baseScale: number;
  }> = [];
  private arrowPool: Projectile[] = [];
  private enemyOrbPool: Projectile[] = [];
  private meteorPool: MeteorStrike[] = [];
  private particlePool: Particle[] = [];
  private lootOrbs: LootOrb[] = [];
  private lightningPool: LightningArc[] = [];
  private shockwavePool: ShockwaveRing[] = [];
  private dangerLanePool: DangerLane[] = [];
  private bossHazardPool: Array<{
    active: boolean;
    kind: BossHazardKind;
    x: number;
    z: number;
    radius: number;
    life: number;
    maxLife: number;
    tickTimer: number;
    damagePerTick: number;
    ownerName: string;
    group: THREE.Group;
    disc: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  private bossMultiSlamPool: Array<{
    active: boolean;
    x: number;
    z: number;
    radius: number;
    delayTimer: number;
    timer: number;
    duration: number;
    damage: number;
    colorHex: number;
    hazardKind?: BossHazardKind;
    hazardDurationSec?: number;
    ownerName: string;
    group: THREE.Group;
    fill: THREE.Mesh;
    outerRing: THREE.Mesh;
    countdownRing: THREE.Mesh;
  }> = [];
  private ultColumnPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
  }> = [];
  private impactDecalPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    baseRadius: number;
    mesh: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  // AAA Wave 5: Pooled 3D Summon Portals, Physical Armor-Shatter Shards, Dash Scorch Trails & Ground Mist
  private summonPortalPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    baseRadius: number;
    group: THREE.Group;
    outerRing: THREE.Mesh;
    innerRing: THREE.Mesh;
    coreDisc: THREE.Mesh;
  }> = [];
  private armorShardPool: Array<{
    active: boolean;
    kin: ArmorShardKinematics;
    mesh: THREE.Mesh;
  }> = [];
  private dashScorchPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
  }> = [];
  private windRingPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    maxRadius: number;
    group: THREE.Group;
    ringMat: THREE.MeshBasicMaterial;
    wispMat: THREE.MeshBasicMaterial;
  }> = [];
  private stormMarkPool: Array<{
    active: boolean;
    group: THREE.Group;
  }> = [];
  private stormChartVisual: {
    group: THREE.Group;
    outerRing: THREE.Mesh;
    compassStar: THREE.Mesh;
    innerRing: THREE.Mesh;
    centerGlow: THREE.Mesh;
    outerMat: THREE.MeshBasicMaterial;
    starMat: THREE.MeshBasicMaterial;
    innerMat: THREE.MeshBasicMaterial;
    glowMat: THREE.MeshBasicMaterial;
  } | null = null;
  private stormChartFadeTimer = 0;
  private stormChartPulseFlash = 0;
  private prevHeroFacing = 0;
  private groundMistMesh!: THREE.InstancedMesh;
  private groundMistSeeds: Array<{
    x: number;
    z: number;
    vx: number;
    vz: number;
    scale: number;
    phase: number;
  }> = [];
  private readonly GROUND_MIST_COUNT = 14;
  private combatCameraPreset: CombatCameraPreset = 'tactical';
  private photoLightingPreset: PhotoLightingPreset = 'golden_hall';
  private rollingDps = createRollingDpsTracker(160);
  private footstepStrideAccum = 0;
  private bowCreakReady = true;
  private lastBossAudioPhase: 1 | 2 | 3 = 1;
  private aimLineMesh!: THREE.Mesh;
  private lastHitAngleDeg: number | null = null;
  // AAA Wave 6: Astral Overcharge, Companion Synergy, Zodiac Constellation Dome, Brazier Flames, Battle Scars, Room Bounties, Keybinds & FPS
  private astralOvercharge = 0;
  private overchargeRingGroup: THREE.Group | null = null;
  private overchargeRingOuter: THREE.Mesh | null = null;
  private overchargeRingInner: THREE.Mesh | null = null;
  private companionSynergyTimer = 0;
  private readonly companionSynergyDuration = 1.05;
  private companionSynergyTargetX = 0;
  private companionSynergyTargetZ = 0;
  private companionSynergyStruck = false;
  private mountBankTiltZ = 0;
  private mountTrailTimer = 0;
  private constellationGroup: THREE.Group | null = null;
  private arenaBrazierFlames: Array<{
    group: THREE.Group;
    outer: THREE.Mesh;
    core: THREE.Mesh;
    baseX: number;
    baseY: number;
    baseZ: number;
  }> = [];
  private battleScarPool: Array<{
    active: boolean;
    group: THREE.Group;
  }> = [];
  private roomBounty: RoomBountyState | null = null;
  private roomBountyBanner: string | null = null;
  private roomBountyBannerTimer = 0;
  private combatKeybinds: CombatKeybinds = { ...DEFAULT_COMBAT_KEYBINDS };
  private showFpsOverlay = false;
  private cameraPresetToast: string | null = null;
  private cameraPresetToastTimer = 0;
  private fpsSampler = createFpsSampler(45);

  // AAA Wave 7: 3D Target Lock Reticle, Boss Weak-Point, Stuck Arrows, Resonance Traps, Chapter Weather, Footstep Ripples, 360° Inspect & Run Highlights
  private targetLockGroup: THREE.Group | null = null;
  private targetLockOuter: THREE.Mesh | null = null;
  private targetLockInner: THREE.Mesh | null = null;
  private bossWeakPointState: BossWeakPointState | null = null;
  private bossWeakPointEnemyId: number | null = null;
  private bossWeakPointGroup: THREE.Group | null = null;
  private bossWeakPointCore: THREE.Mesh | null = null;
  private stuckArrowPool: Array<{
    active: boolean;
    enemyId: number;
    life: number;
    maxLife: number;
    localX: number;
    localY: number;
    localZ: number;
    mesh: THREE.Group;
  }> = [];
  private stuckArrowSeed = 0;
  private resonanceTraps: Array<{
    x: number;
    z: number;
    radius: number;
    kind: ResonanceTrapKind;
    cooldown: number;
    group: THREE.Group;
    crystal: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  private trapTriggerToast: string | null = null;
  private trapTriggerToastTimer = 0;
  private windBeaconSpeedTimer = 0;
  // Wave 9: Interactive 3D Composite Arena Props, Boss Phase Counter, Execution Finisher & Co-op Sanctuary
  private wave9Props: Array<{
    x: number;
    z: number;
    radius: number;
    kind: ArenaPropKind;
    alive: boolean;
    group: THREE.Group;
    core: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  private wave9PropBuffTimer = 0;
  private wave9PropAtkBonusPct = 0;
  private wave9PropAspdBonusPct = 0;
  private wave9PropBuffLabel: string | null = null;
  private bossPhaseCounterTimer = 0;
  private bossPhaseCounterLevel: 2 | 3 | null = null;
  private executionFinisherTimer = 0;
  private executionFinisherFocusX = 0;
  private executionFinisherFocusZ = 0;
  private coopSanctuaryCooldown = 0;
  private coopSanctuaryActiveTimer = 0;
  private coopSanctuaryRing: THREE.Mesh | null = null;
  private coopPrimerBanner: string | null = null;
  private coopPrimerBannerTimer = 0;
  private chapterWeatherPoints: THREE.Points | null = null;
  private chapterWeatherProfile: ChapterWeatherProfile | null = null;
  private footstepRipplePool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
  }> = [];
  private footstepRippleAccum = 0;
  private lobbyInspectActive = false;
  private lobbyInspectAutoRotate = true;
  private lobbyInspectRig: LobbyInspectRigState = {
    blend: 0,
    autoRotateYaw: 0,
    rimLightIntensity: 0.85,
  };
  private runWeakPointHits = 0;
  private runTrapsTriggered = 0;
  private runBountiesCompleted = 0;
  private runBossBreaksCount = 0;
  private runDamageTakenCount = 0;
  // Wave 10: Dynamic Sky Shader, Boss Breakable Parts, Elemental Resonance, Trial Gauntlet, Adaptive AI & Live Guild War Skirmish
  private skyDomeMesh: THREE.Mesh | null = null;
  private skyDomeMat: THREE.ShaderMaterial | null = null;
  private elementalResonance: ElementalResonanceState = createInitialElementalResonanceState();
  private elementalResonanceChargeAccum = 0;
  private bossPartBrokenBanner: string | null = null;
  private bossPartBrokenBannerTimer = 0;
  private runBossPartStarDust = 0;
  private aiAdaptationProfile: AiPlayerAdaptationProfile | null = null;
  private trialGauntletRound: 1 | 2 | 3 | null = null;
  private trialGauntletKitId: EqualizedTrialKitId | null = null;
  private guildWarBastionId: GuildWarBastionId | null = null;
  private guildWarBastionLabel: string | null = null;
  private runLeftDodges = 0;
  private runRightDodges = 0;
  private runDashCount = 0;
  private runDistSum = 0;
  private runDistSamples = 0;
  private runDistSampleTimer = 0;
  private runElemCounts: Record<AiDominantElement, number> = {
    fire: 0,
    ice: 0,
    storm: 0,
    poison: 0,
  };
  // Wave 11: Weapon Overdrive, 3D Interactive Battlefield Hazards, Cinematic Camera, Equalized Rift & Squad Formation
  private weaponOverdrive: WeaponOverdriveState = createInitialWeaponOverdriveState('bow');
  private weaponOverdriveBuffs: WeaponOverdriveBuffs = {
    atkMult: 1,
    aspdMult: 1,
    critChanceBonus: 0,
    pierceBonus: 0,
  };
  private weaponOverdriveRingMesh: THREE.Mesh | null = null;
  private wave11Hazards: Array<{
    spec: InteractiveHazardSpec;
    group: THREE.Group;
    core: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  private cinematicCamera: CinematicCameraState = createIdleCinematicCameraState(false);
  private isEqualizedRiftMode = false;
  private equalizedRiftMutatorsLabel: string | null = null;
  private equalizedRiftOverdriveMult = 1.0;
  private squadFormationId: AiSquadFormationId = 'break_focus';
  private squadPingBanner: string | null = null;
  private squadPingBannerTimer = 0;

  private phase: GamePhase = GamePhase.TITLE;
  private lobbyViewMode: 'battle' | 'gear' | 'heroes' | 'runes' | 'vault' = 'battle';
  private lobbyCameraPreset: LobbyCameraPreset = 'overview';
  private lobbyDragActive = false;
  private lobbyDragPointerId: number | null = null;
  private lobbyDragLastX = 0;
  private lobbyYaw = 0.18;
  private lobbyTargetYaw = 0.18;
  private lobbyAutoSpinIdleTimer = 0;
  private lastDamageSource: DefeatCauseInfo | null = null;
  private currentChapter: ChapterDefinition = CHAPTERS[0];
  private isTowerMode = false;
  private towerFloor = 0;
  private towerHighestCleared = 0;
  private towerWaveDefs: Array<Array<{ kind: EnemyKind; count: number; isElite?: boolean }>> = [];
  private isBossRushMode = false;
  private bossRushRound = 0;
  private readonly bossRushTotalRounds = 5;
  private sideModeHighestCleared = 0;
  private bossPhaseTwoBannerTimer = 0;
  private bossPhaseThreeBannerTimer = 0;
  private playerFrostSlowTimer = 0;
  private arenaHazardSpawnTimer = 5.4;
  private arenaHazards: Array<{
    kind: ArenaHazardType;
    x: number;
    z: number;
    radius: number;
    timer: number;
    maxTimer: number;
    damage: number;
    ring: THREE.Mesh;
    fill: THREE.Mesh;
  }> = [];
  private volatileBlasts: Array<{
    x: number;
    z: number;
    radius: number;
    timer: number;
    maxTimer: number;
    damage: number;
    damagesEnemies?: boolean;
    ring: THREE.Mesh;
    fill: THREE.Mesh;
  }> = [];
  private isDailyRiftMode = false;
  private dailyRiftPair: DailyRiftMutatorPair | null = null;
  private dailyRiftStageIdx = 0;
  private readonly dailyRiftTotalStages = 3;
  private dailyRiftWaveDefs: Array<Array<{ kind: EnemyKind; count: number; isElite?: boolean }>> = [];
  private isGuildBossMode = false;
  private guildBossTimeLeft = 60;
  private guildBossTotalDamage = 0;
  private isArenaMode = false;
  private arenaTimeLeft = 45;
  private arenaOpponentName = '';
  private isCoopRaidMode = false;
  private coopDifficulty: CoopRaidDifficulty = 'normal';
  private coopAllies: CoopAllyEntity[] = [];
  private coopSynergyClock: CoopSynergyClock = createCoopSynergyClock();
  private lastBossTelegraphKey = '';
  private isElementalTowerMode = false;
  private elementalTowerId: ElementalTowerId = 'fire';
  private elementalTowerFloor = 0;
  private elementalWaveDefs: Array<Array<{ kind: EnemyKind; count: number; isElite?: boolean }>> = [];
  private isCrystalDefenseMode = false;
  private crystalWave = 0;
  private crystalHp = 2400;
  private crystalMaxHp = 2400;
  private crystalRefs: SpiritCrystalRefs | null = null;
  private isWorldBossMode = false;
  private worldBossTimeLeft = 60;
  private worldBossTotalDamage = 0;
  private isWeeklyRankedBossMode = false;
  private isWeeklyBossPracticeMode = false;
  private weeklyBossAttemptId: string | null = null;
  private weeklyBossId: string | null = null;
  private weeklyBossSeed: string | null = null;
  private weeklyBossTimeLeft = 90;
  private weeklyBossTotalDamage = 0;
  private weeklyBossMaxHp = 18500;
  private simClock: FixedTimestepClock = createFixedTimestepClock();
  private kinestheticsClock: DeterministicKinestheticsClock =
    createDeterministicKinestheticsClock();
  private combatRng: () => number = Math.random;
  // Pillar 5: Real-Time AI Auto-Pilot, 3D AI Squad & Live AI 1v1 Duel
  private autoPilotEnabled = false;
  private autoPilotTactic: AiAutoPilotTactic = 'balanced';
  private autoPilotUsedInRun = false;
  private autoPilotStatusText: string | null = null;
  private autoPilotManualOverride = false;
  private aiSquadAssistEnabled = false;
  private aiSquadRoles: AiCompanionRole[] = ['vanguard', 'ranger'];
  private liveAiDuelId: string | null = null;
  private liveAiPlayerId: string | null = null;
  private liveAiPersonality: AiLivePlayerPersonality | null = null;
  private liveAiRivalTag: string | null = null;
  // Wave 8: Lethal Adaptive AI Duel & PvE Challenge Intensity
  private aiDuelTier: AiDuelDifficultyTier = 'master';
  private aiWinStreak = 0;
  private pveChallengeEnabled = true;
  private aiRivalBrainState: AiRivalCombatState | null = null;
  private aiRivalMatchConfig: LethalArenaMatchConfig | null = null;
  private aiRivalActivePattern: AiRivalAttackPattern | null = null;
  private aiRivalActiveProjSpeed = 16;
  private aiRivalActiveDmgMult = 1.0;
  private aiRivalNextCooldown = 0.85;
  private isBloodMoonMode = false;
  private bloodMoonTimeLeft = BLOOD_MOON_DURATION_SEC;
  private bloodMoonWave = 0;
  private bloodMoonScore = 0;
  private bloodMoonSpawnTimer = 0;
  private isAbyssalMode = false;
  private abyssalWave = 0;
  private abyssalScore = 0;
  private isGuildWarMode = false;
  private guildWarTimeLeft = GUILD_WAR_DURATION_SEC;
  private guildWarScore = 0;
  private guildWarNodesCaptured = 0;
  private guildWarSpawnTimer = 0;
  private guildWarNodes: Array<{
    x: number;
    z: number;
    progress: number;
    captured: boolean;
    group: THREE.Group;
    core: THREE.Mesh;
    ring: THREE.Mesh;
  }> = [];
  private isPantheonMode = false;
  private pantheonStage = 0;
  private pantheonScore = 0;
  private pantheonBlessing: PantheonBlessingDef | null = null;
  private isChampionshipMode = false;
  private championshipRound = 0;
  private championshipScore = 0;
  private championshipRivalName = '';
  private championshipTacticsOffer: ChampionshipTacticDef[] | null = null;
  private championshipAtkMult = 1.0;
  private championshipDrBonus = 0;
  private isCrystalVaultMode = false;
  private vaultTimeLeft = 0;
  private vaultPillarsBroken = 0;
  private vaultWave = 0;
  private vaultGemsLooted = 0;
  private vaultReforgeLooted = 0;
  private vaultShardsLooted = 0;
  private bossBrokenBannerTimer = 0;
  private lobbyHeroPose: LobbyHeroPoseId = 'heroic';
  private lobbyPhotoMode = false;
  private lobbyPhotoAngle: 'full' | 'closeup' | 'hero_wide' = 'full';
  private lobbyWeatherId: LobbyWeatherId = 'meteor_shower';
  private isDragonLairMode = false;
  private dragonTimeLeft = 0;
  private dragonPhase: 1 | 2 | 3 = 1;
  private dragonBreathCooldown = 6.0;
  private dragonBreathWarningTimer = 0;
  private dragonBreathAngle = 0;
  private dragonBreathCone: THREE.Mesh | null = null;
  private dragonScalesLooted = 0;
  private dragonDamageDealt = 0;
  // Wave 14 state: Sky Citadel 3D, Sanctuary Floor Theme, 360° Lobby Orbit/Zoom, Boss Warning Cut-In
  private isSkyCitadelMode = false;
  private skyCitadelTimeLeft = 0;
  private skyCitadelWave = 1;
  private skyCitadelScore = 0;
  private skyCitadelFeathersLooted = 0;
  private sanctuaryFloorThemeId: SanctuaryFloorId = 'marble_gold';
  private lobbyOrbitPitch = 0;
  private lobbyTargetPitch = 0;
  private lobbyOrbitZoom = 0;
  private lobbyTargetZoom = 0;
  private lobbyDragLastY = 0;
  private lobbyHeadSyncTimer = 0;
  private bossWarningTitle: string | null = null;
  private bossWarningSubtitle: string | null = null;
  private bossWarningTimer = 0;
  private starfallMesh!: THREE.InstancedMesh;
  private starfallEnabled = true;
  private starfallSeeds: Array<{
    x: number;
    y: number;
    z: number;
    vy: number;
    vx: number;
    scale: number;
    phase: number;
  }> = [];
  private readonly STARFALL_COUNT = 72;
  private baseStats!: ComputedPlayerStats;
  private heroVisualCfg!: HeroVisualConfig;
  private weaponAccentHex = 0x10b981;
  private dmgBasic = 0;
  private dmgUltimate = 0;
  private dmgPet = 0;
  private dmgElemental = 0;
  private peakCritDmg = 0;
  private runElapsedSeconds = 0;

  // Player runtime state
  private px = 0;
  private pz = 4.5;
  private pvx = 0;
  private pvz = 0;
  private pFacing = 0;
  private hp = 260;
  private maxHp = 260;
  private shield = 0;
  private xp = 0;
  private xpToNext = 55;
  private level = 1;
  private runGold = 0;
  private runGems = 0;
  private kills = 0;
  private lastPlayerHitAt = 0;
  private ultCharge = 65;
  private alexOverdriveTimer = 0;
  private wukongOverdriveTimer = 0;
  private stageIndex = 0;
  private waveIndex = 0;
  private portalOpen = false;
  private attackCooldown = 0;
  private volleyQueue: VolleyShotEntry[] = [];
  private dashTimer = 0;
  private dashCooldown = 0;
  private dashDirX = 0;
  private dashDirZ = -1;
  private invulnTimer = 0;
  private hitFlashTimer = 0;
  private activeSkills: Partial<Record<SkillId, number>> = {};
  private furyBonusMult = 1.0;
  private revivesLeft = 0;
  private hasFullRevive = false;
  private stageBannerTimer = 0;
  private stageBannerText: string | null = null;

  // Phase 5: 8 Hero Active Skills (KeyE), Perfect Dodge, Nightmare Ascension, 3D Training Grounds
  private activeSkillCooldown = 0;
  private activeSkillMaxCooldown = 9.0;
  private alexCadenceTimer = 0;
  // Fun Combat Overhaul: Heavy Break [F/Right-Click], 4-Beat Combo Finisher, Room Chaos & Ambush
  private heavyBreakCooldown = 0;
  private comboBeat: 1 | 2 | 3 | 4 = 1;
  private pendingBeatMult = 1.0;
  private pendingBeatIsFinisher = false;
  private activeRoomChaosEvent: RoomChaosEventDef | null = null;
  private roomChaosTimer = 2.8;
  private ambushBossTriggeredInRun = false;
  private ambushBossSpawnedInStage = false;
  private perfectDodgeInternalCd = 0;
  private perfectDodgeBuffTimer = 0;
  private perfectDodgeBannerTimer = 0;
  private perfectDodgeSlowTimer = 0;
  private perfectDodgeCount = 0;
  private nightmareTier = 0;
  private nightmareConfig: NightmareTierConfig = getNightmareTierConfig(1, 0);
  private activePowerPressure: PowerPressureEvaluation = computePowerPressure(1, 1);
  private isTrainingMode = false;
  private trainingTargetMode: TrainingTargetMode = 'single';
  private trainingDpsState: TrainingDpsState = createTrainingDpsState();
  private trainingClockSec = 0;

  // Hero Passive & Skill Periodic Timers
  private markedEnemyIds = new Set<number>();
  private stormChart: { x: number; z: number; damage: number; pulses: number; nextPulse: number; pulseIndex?: number } | null = null;
  private artemisMarkTimer = 0;
  private cleoHitCount = 0;
  private atreusShotCount = 0;
  private alexAspdBuffTimer = 0;
  private alexGuaranteedCrit = false;
  private wukongFireTimer = 0;
  private swordStrikeTimer = 0;
  private spriteFireTimer = 0;
  private meteorTimer = 0;
  private arrowRainTimer = 0;

  // Game feel & Combo timers
  private hitstopTimer = 0;
  private hitstopCooldown = 0;
  private shakeIntensity = 0;
  private cameraFovOffset = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private readonly comboWindow = 3.2;
  private maxRunCombo = 0;
  private graphicsQuality: GraphicsQuality = 'high';
  private screenShakeEnabled = true;
  private showDamageNumbersEnabled = true;
  private hapticsEnabled = true;
  private highContrastTelegraphs = false;
  private particleDensityScale = 1.0;
  private elapsed = 0;
  private hudSyncTimer = 0;
  private nextEntityId = 1;
  private nextDmgId = 1;

  // AAA Wave 4: Counter-Shot, Elemental Reactions, 3D Victory Showcase Orbit & Gamepad
  private counterShotTimer = 0;
  private elementalReactionsCount = 0;
  private counterShotsCount = 0;
  // Wave 6: Deterministic Perfect Dodge Counter-Window, Live Boss Pace, Co-op Roles & Weather
  private perfectDodgeCounter: PerfectDodgeCounterState = createPerfectDodgeCounterState();
  private bossPaceTracker: BossPaceTrackerState | null = null;
  private bossPaceHud: BossPaceHudSnapshot | null = null;
  private weeklyBossIsWeekendBlitz = false;
  private coopRoleSynergy: CoopRoleSynergySummary | null = null;
  private coopGuardianHealTicks = 0;
  private activeWeatherBiome: WeatherBiomeKind = 'celestial_dust';
  // Wave 7: Deterministic Boss Stagger/Guard-Break, Style Momentum (B->SSS), Co-op Tactical Pings
  private bossStaggerState: BossStaggerState | null = null;
  private bossStaggerOwnerId: number | null = null;
  private styleMomentum: StyleMomentumState = createStyleMomentumState();
  private coopPingToast: string | null = null;
  private coopPingToastTimer = 0;
  private victoryOrbitClock = 0;
  private gamepadConnected = false;
  private gamepadMoveX = 0;
  private gamepadMoveZ = 0;
  private gamepadPrevButtons: GamepadPrevButtons = {
    dash: false,
    activeSkill: false,
    ultimate: false,
    pause: false,
  };

  // Input state
  private keys: Record<string, boolean> = {};
  private dashBufferTimer = 0;
  private combatInputBuffer: CombatInputBufferState = createCombatInputBuffer();
  private combatLightingState: CombatLightingState = createCombatLightingState();
  private isArenaEqualized = false;
  private adaptiveResolutionGuard = true;
  private adaptiveResScale = 1.0;
  private adaptiveResCheckTimer = 0;
  private pointerDown = false;
  private pointerId: number | null = null;
  private joyOriginX = 0;
  private joyOriginY = 0;
  private joyCurrX = 0;
  private joyCurrY = 0;
  private joyVecX = 0;
  private joyVecZ = 0;

  private frameId = 0;
  private lastTime = performance.now();
  private disposed = false;
  private pendingGpuSync: WebGLSync | null = null;
  private contextLost = false;

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks,
    initialStats: ComputedPlayerStats,
    initialVisualCfg: HeroVisualConfig
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.baseStats = initialStats;
    this.heroVisualCfg = initialVisualCfg;
    this.weaponAccentHex = initialVisualCfg.weaponAccentHex;

    // Auto GPU/CPU/RAM/VRAM detection + crash sentinel (shared across SplashGate, modelAssets & engine)
    const detectedProfile = detectStartupGpuProfile();
    this.gpuProfile = detectedProfile;
    this.isSoftwareGl = detectedProfile.tier === 'software';
    this.chapter1MapMode = readPersistedChapter1MapMode();
    this.lowEndSafetyMode = readPersistedLowEndSafetyMode();
    this.systemBudget = resolveSystemLiteBudget(
      detectedProfile,
      this.lowEndSafetyMode,
      this.chapter1MapMode
    );
    this.lowEndGpu = this.systemBudget.liteActive;
    this.graphicsQuality = this.lowEndGpu ? 'low' : detectedProfile.recommendedQuality;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.systemBudget.deviceTier !== 'ultra_lite',
      powerPreference: this.isSoftwareGl || this.lowEndGpu ? 'low-power' : 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
    this.renderer.shadowMap.enabled =
      !this.isSoftwareGl && !this.lowEndGpu && this.systemBudget.shadowMapSize > 0;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      46,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.5,
      140
    );
    this.camera.position.set(0, 18, 17);
    this.camera.lookAt(0, 0, 2);

    // Studio environment reflection (skipped in ultra-lite/software mode to conserve VRAM & boot time)
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    if (this.systemBudget.environmentReflections) {
      const environment = new RoomEnvironment();
      this.envRenderTarget = this.pmremGenerator.fromScene(environment, 0.04);
      environment.dispose();
      this.scene.environment = this.envRenderTarget.texture;
    }

    // 3-point high-contrast Mythic Zodiac lighting rig
    this.hemiLight = new THREE.HemisphereLight(
      0x7dd3fc,
      0x26352e,
      this.systemBudget.environmentReflections ? 0.88 : 1.16
    );
    this.scene.add(this.hemiLight);

    const initShadowSize = this.systemBudget.shadowMapSize || detectedProfile.shadowMapSize || 1024;
    this.keyLight = new THREE.DirectionalLight(0xffe4b8, 1.92);
    this.keyLight.position.set(12, 22, 10);
    this.keyLight.castShadow =
      !this.isSoftwareGl && !this.lowEndGpu && this.systemBudget.shadowMapSize > 0;
    this.keyLight.shadow.mapSize.set(initShadowSize, initShadowSize);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 55;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 18;
    this.keyLight.shadow.camera.bottom = -18;
    this.keyLight.shadow.bias = -0.00045;
    this.keyLight.shadow.normalBias = 0.022;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0xfde68a, 1.15);
    this.rimLight.position.set(-6.5, 6.2, -3.5);
    this.scene.add(this.rimLight);

    this.heroLight = new THREE.PointLight(0xfff3d1, 1.65, 11, 2);
    this.heroLight.position.set(1.8, 2.55, 7.6);
    this.scene.add(this.heroLight);

    // 2 reusable pooled dynamic combat flash lights (zero GC per frame)
    for (let i = 0; i < 2; i++) {
      const impactLight = new THREE.PointLight(0xfbbf24, 0, 10, 2);
      impactLight.position.set(0, 1.4, 0);
      this.scene.add(impactLight);
      this.impactLightPool.push({ light: impactLight, intensity: 0, decayRate: 12 });
    }

    this.scene.add(
      this.arenaGroup,
      this.entitiesGroup,
      this.projectilesGroup,
      this.particlesGroup
    );

    this.contactShadowTex = createContactShadowTexture();

    this.initPools();
    this.buildHero();
    this.buildArena(this.currentChapter, false);
    // Preload and parse the full Chapter 1 3D GLB map while on SplashGate so
    // entering Chapter 1 displays the 3D temple immediately on frame 1.
    this.ensureChapter1MapLoaded();
    // Start in clean Lobby Sanctuary showcase with combat arena hidden and camera framed directly on hero
    this.arenaGroup.visible = false;
    if (this.lobbySanctuary) {
      this.lobbySanctuary.group.visible = true;
    }
    this.snapCameraToLobby();

    if (!this.isSoftwareGl && !this.lowEndGpu && this.systemBudget.bloomAllowed) {
      this.setupPostProcessing();
    }

    if (!this.isSoftwareGl && !this.appearanceBlocked) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  public getGpuProfile(): GpuProfileSummary {
    return this.gpuProfile;
  }

  private setupPostProcessing(): void {
    if (this.isSoftwareGl || this.lowEndGpu || this.composer) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const dpr = this.getTargetPixelRatio();
    const maxSamples = this.renderer.capabilities.isWebGL2
      ? Math.min(4, this.renderer.capabilities.maxSamples || 0)
      : 0;
    const renderTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(w * dpr)),
      Math.max(1, Math.round(h * dpr)),
      {
        type: THREE.HalfFloatType,
        samples: maxSamples,
      }
    );
    const composer = new EffectComposer(this.renderer, renderTarget);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);

    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5))),
      0.38,
      0.32,
      0.86
    );
    const gradePass = new ShaderPass(MythicZodiacGradeShader);
    gradePass.uniforms.uTexelSize.value = new THREE.Vector2(
      1 / Math.max(1, w * dpr),
      1 / Math.max(1, h * dpr)
    );
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(gradePass);
    composer.addPass(outputPass);

    this.composer = composer;
    this.bloomPass = bloomPass;
    this.gradePass = gradePass;
    this.syncPostProcessingUniforms();
  }

  private disposePostProcessing(): void {
    if (!this.composer) return;
    this.composer.passes.forEach((p) => {
      if ('dispose' in p && typeof (p as { dispose?: () => void }).dispose === 'function') {
        (p as { dispose: () => void }).dispose();
      }
    });
    this.composer.dispose();
    this.composer = null;
    this.bloomPass = null;
    this.gradePass = null;
  }

  private isPostProcessingActive(): boolean {
    if (!this.composer || this.isSoftwareGl || this.lowEndGpu) return false;
    return this.graphicsQuality !== 'low' && this.bloomEnabled;
  }

  private syncPostProcessingUniforms(): void {
    const cfg = resolvePostFxConfig({
      quality: this.graphicsQuality,
      bloomEnabled: this.bloomEnabled,
      isSoftwareGl: this.isSoftwareGl,
      lowEndGpu: this.lowEndGpu,
      bloomImpulse: this.bloomImpulse,
      chromaticImpulse: this.chromaticImpulse,
      isBossStage: this.enemies.some((e) => e.isBoss),
      isLobby: this.phase === GamePhase.TITLE,
      screenShakeEnabled: this.screenShakeEnabled,
    });
    if (this.renderer) {
      this.renderer.toneMappingExposure = cfg.toneMappingExposure;
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = cfg.enabled && cfg.bloomStrength > 0.01;
      this.bloomPass.strength = cfg.bloomStrength;
      this.bloomPass.radius = cfg.bloomRadius;
      this.bloomPass.threshold = cfg.bloomThreshold;
    }
    if (this.gradePass) {
      this.gradePass.enabled = cfg.enabled;
      this.gradePass.uniforms.uVignette.value = cfg.vignetteStrength;
      this.gradePass.uniforms.uChromatic.value = cfg.chromaticAmount;
      this.gradePass.uniforms.uGoldWarmth.value = cfg.goldWarmth;
      if (this.gradePass.uniforms.uSharpness) {
        this.gradePass.uniforms.uSharpness.value = cfg.sharpness;
      }
      if (this.gradePass.uniforms.uTexelSize && this.container) {
        const dpr = this.renderer?.getPixelRatio() || 1;
        const pxW = Math.max(1, this.container.clientWidth * dpr);
        const pxH = Math.max(1, this.container.clientHeight * dpr);
        const texel = this.gradePass.uniforms.uTexelSize.value as THREE.Vector2 | { x: number; y: number };
        if (texel && typeof (texel as THREE.Vector2).set === 'function') {
          (texel as THREE.Vector2).set(1 / pxW, 1 / pxH);
        } else {
          this.gradePass.uniforms.uTexelSize.value = new THREE.Vector2(1 / pxW, 1 / pxH);
        }
      }
    }
  }

  private renderSceneFrame(): void {
    if (this.composer && this.isPostProcessingActive()) {
      this.syncPostProcessingUniforms();
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private triggerPostFxImpulse(event: PostFxImpulseEvent): void {
    const spec = computePostFxImpulse(event);
    this.bloomImpulse = Math.min(0.65, Math.max(this.bloomImpulse, spec.bloomBoost));
    if (this.screenShakeEnabled) {
      this.chromaticImpulse = Math.min(0.012, Math.max(this.chromaticImpulse, spec.chromaticBoost));
      this.cameraFovOffset = Math.max(this.cameraFovOffset, spec.fovKick);
    }
  }

  private spawnImpactLight(x: number, y: number, z: number, kind: CombatFlashKind): void {
    if (this.isSoftwareGl || this.graphicsQuality === 'low' || !this.impactLightPool?.length) return;
    const spec = computeImpactLightPulse(kind);
    // Pick the dimmest slot to avoid popping an active brighter flash
    let slot = this.impactLightPool[0];
    for (let i = 1; i < this.impactLightPool.length; i++) {
      if (this.impactLightPool[i].intensity < slot.intensity) {
        slot = this.impactLightPool[i];
      }
    }
    slot.light.position.set(x, y, z);
    slot.light.color.setHex(spec.colorHex);
    slot.light.distance = spec.distance;
    slot.intensity = spec.peakIntensity;
    slot.decayRate = spec.decayRate;
    slot.light.intensity = spec.peakIntensity;
  }

  private updateImpactLights(dt: number): void {
    if (!this.impactLightPool?.length) return;
    for (let i = 0; i < this.impactLightPool.length; i++) {
      const slot = this.impactLightPool[i];
      if (slot.intensity > 0.02) {
        slot.intensity *= Math.exp(-slot.decayRate * dt);
        slot.light.intensity = slot.intensity > 0.02 ? slot.intensity : 0;
      }
    }
    if (this.bloomImpulse > 0.002) {
      this.bloomImpulse *= Math.exp(-7.5 * dt);
      if (this.bloomImpulse < 0.002) this.bloomImpulse = 0;
    }
    if (this.chromaticImpulse > 0.0001) {
      this.chromaticImpulse *= Math.exp(-11.0 * dt);
      if (this.chromaticImpulse < 0.0001) this.chromaticImpulse = 0;
    }
  }

  private spawnCritStar(x: number, y: number, z: number, colorHex: number, scale = 1.0): void {
    if (!this.critStarPool?.length) return;
    const item = this.critStarPool.find((c) => !c.active);
    if (!item) return;
    item.active = true;
    item.life = 0.22;
    item.maxLife = 0.22;
    item.baseScale = scale;
    item.mat.color.setHex(colorHex);
    item.mat.opacity = 0.96;
    item.group.position.set(x, y, z);
    item.group.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
    item.group.scale.setScalar(0.35 * scale);
    item.group.visible = true;
  }

  private updateCritStars(dt: number): void {
    if (!this.critStarPool?.length) return;
    for (let i = 0; i < this.critStarPool.length; i++) {
      const item = this.critStarPool[i];
      if (!item.active) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.active = false;
        item.group.visible = false;
        continue;
      }
      const p = 1 - item.life / item.maxLife;
      const pop = p < 0.28 ? 0.35 + (p / 0.28) * 1.1 : 1.45 - (p - 0.28) * 0.55;
      item.group.scale.setScalar(Math.max(0.1, pop * item.baseScale));
      item.group.rotation.y += dt * 4.2;
      item.mat.opacity = Math.max(0, (1 - p) * 0.95);
    }
  }

  private hasRune(id: RuneId): boolean {
    return this.baseStats.equippedRunes.includes(id);
  }

  private initPools(): void {
    // Player projectile pool + faceted celestial lance arrowheads & luminous elemental trails
    const arrowGeo = new THREE.ConeGeometry(0.13, 0.88, 6);
    arrowGeo.rotateX(Math.PI / 2);
    const trailGeo = new THREE.ConeGeometry(0.125, 1.55, 6);
    trailGeo.rotateX(-Math.PI / 2);
    trailGeo.translate(0, 0, -0.88);
    const arrowCoreRingGeo = new THREE.TorusGeometry(0.11, 0.02, 6, 12);
    const compassDiscRingGeo = new THREE.TorusGeometry(0.26, 0.032, 6, 18);
    compassDiscRingGeo.rotateX(Math.PI / 2);
    const compassStarGeo = new THREE.OctahedronGeometry(0.19, 0);
    compassStarGeo.scale(1.35, 0.16, 1.35);
    for (let i = 0; i < 85; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.95,
        roughness: 0.14,
        metalness: 0.4,
      });
      const mesh = new THREE.Mesh(arrowGeo, mat);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      const collarRing = new THREE.Mesh(arrowCoreRingGeo, trailMat);
      collarRing.position.z = -0.14;

      const compassGroup = new THREE.Group();
      const compassRingMat = new THREE.MeshBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const compassStarMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.94,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const cRing = new THREE.Mesh(compassDiscRingGeo, compassRingMat);
      const cStarA = new THREE.Mesh(compassStarGeo, compassStarMat);
      const cStarB = new THREE.Mesh(compassStarGeo, compassStarMat);
      cStarB.rotation.y = Math.PI / 4;
      compassGroup.add(cRing, cStarA, cStarB);
      compassGroup.visible = false;

      mesh.add(trailMesh, collarRing, compassGroup);
      mesh.visible = false;
      this.projectilesGroup.add(mesh);
      this.arrowPool.push({
        active: false,
        isEnemy: false,
        isSword: false,
        homing: false,
        coopAllyIndex: undefined,
        x: 0,
        y: 1.0,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 0,
        radius: 0.3,
        life: 0,
        pierceLeft: 0,
        ricochetLeft: 0,
        wallBounceLeft: 0,
        hitEnemyIds: new Set(),
        blaze: false,
        frost: false,
        storm: false,
        poison: false,
        mesh,
        trailMesh,
        compassGroup,
      });
    }

    // Enemy orb pool (dual-layer bullet-hell readability: incandescent core + crimson halo)
    const orbCoreGeo = new THREE.SphereGeometry(0.15, 10, 8);
    const orbHaloGeo = new THREE.SphereGeometry(0.3, 10, 8);
    for (let i = 0; i < 75; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfff7ed,
        emissive: 0xfef08a,
        emissiveIntensity: 1.9,
        roughness: 0.14,
      });
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.58,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(orbCoreGeo, mat);
      const halo = new THREE.Mesh(orbHaloGeo, haloMat);
      mesh.add(halo);
      mesh.visible = false;
      this.projectilesGroup.add(mesh);
      this.enemyOrbPool.push({
        active: false,
        isEnemy: true,
        isSword: false,
        homing: false,
        x: 0,
        y: 1.0,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 0,
        radius: 0.28,
        life: 0,
        pierceLeft: 0,
        ricochetLeft: 0,
        wallBounceLeft: 0,
        hitEnemyIds: new Set(),
        blaze: false,
        frost: false,
        storm: false,
        poison: false,
        mesh,
      });
    }

    // Meteor strike pool
    const meteorGeo = new THREE.DodecahedronGeometry(0.48, 0);
    const ringGeo = new THREE.RingGeometry(0.2, 1.0, 24);
    for (let i = 0; i < 12; i++) {
      const mMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xea580c,
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(meteorGeo, mMat);
      mesh.visible = false;
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, rMat);
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.particlesGroup.add(mesh, ring);
      this.meteorPool.push({
        active: false,
        x: 0,
        y: 10,
        z: 0,
        vy: -22,
        radius: 2.3,
        damage: 0,
        isFrost: false,
        mesh,
        ring,
      });
    }

    // Particle pool (crisp additive starlight sparks)
    const partGeo = new THREE.OctahedronGeometry(0.095, 0);
    for (let i = 0; i < 140; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(partGeo, mat);
      mesh.visible = false;
      this.particlesGroup.add(mesh);
      this.particlePool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
        mesh,
      });
    }

    // Lightning arc pool
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const mat = new THREE.LineBasicMaterial({ color: 0xc4b5fd });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      this.particlesGroup.add(line);
      this.lightningPool.push({ active: false, timer: 0, line });
    }

    // Shockwave Ring pool (Enemy kills, Boss slams, Ultimates)
    const shockGeo = new THREE.RingGeometry(0.45, 0.72, 28);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(shockGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      this.particlesGroup.add(mesh);
      this.shockwavePool.push({
        active: false,
        x: 0,
        z: 0,
        life: 0,
        maxLife: 0.4,
        maxRadius: 3,
        mesh,
      });
    }

    // Celestial Dash Afterimage Echo pool (zero per-frame allocations)
    const ghostCloakGeo = new THREE.CylinderGeometry(0.19, 0.54, 1.52, 10, 1, true);
    ghostCloakGeo.translate(0, 0.78, 0);
    const ghostHaloGeo = new THREE.TorusGeometry(0.38, 0.032, 6, 18);
    const ghostCoreGeo = new THREE.OctahedronGeometry(0.22, 0);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const group = new THREE.Group();
      const cloak = new THREE.Mesh(ghostCloakGeo, mat);
      const halo = new THREE.Mesh(ghostHaloGeo, mat);
      halo.position.set(0, 1.38, -0.18);
      halo.rotation.x = 0.25;
      const core = new THREE.Mesh(ghostCoreGeo, mat);
      core.position.set(0, 1.05, 0);
      group.add(cloak, halo, core);
      group.visible = false;
      this.particlesGroup.add(group);
      this.dashGhostPool.push({
        active: false,
        life: 0,
        maxLife: 0.34,
        group,
        mat,
      });
    }

    // AAA Wave 2: Pooled Elemental Ground Zones (Ember Burn / Frost Slow, zero GC)
    const elemDiscGeo = new THREE.CircleGeometry(1, 24);
    const elemRingGeo = new THREE.RingGeometry(0.84, 1.0, 28);
    for (let i = 0; i < 6; i++) {
      const discMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfdba74,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const discMesh = new THREE.Mesh(elemDiscGeo, discMat);
      discMesh.rotation.x = -Math.PI / 2;
      discMesh.position.y = 0.032;
      discMesh.renderOrder = 3;
      discMesh.visible = false;

      const ringMesh = new THREE.Mesh(elemRingGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.y = 0.036;
      ringMesh.renderOrder = 4;
      ringMesh.visible = false;

      this.particlesGroup.add(discMesh, ringMesh);
      this.elementalZonePool.push({
        active: false,
        kind: 'ember',
        x: 0,
        z: 0,
        radius: 2.2,
        life: 0,
        maxLife: 3.4,
        tickTimer: 0,
        baseAtk: 20,
        discMesh,
        ringMesh,
      });
    }

    // Ultimate Burst Skybeam Column pool (pooled, zero per-frame allocations)
    const ultColGeo = new THREE.CylinderGeometry(0.45, 0.92, 10.5, 16, 1, true);
    ultColGeo.translate(0, 5.25, 0);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(ultColGeo, mat);
      mesh.visible = false;
      this.particlesGroup.add(mesh);
      this.ultColumnPool.push({
        active: false,
        life: 0,
        maxLife: 0.55,
        mesh,
      });
    }

    // Ground Impact Scorch Decal pool (pooled, zero per-frame allocations)
    const decalCoreGeo = new THREE.CircleGeometry(1, 20);
    const decalRingGeo = new THREE.RingGeometry(0.76, 1.0, 24);
    for (let i = 0; i < 10; i++) {
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x09060e,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const mesh = new THREE.Mesh(decalCoreGeo, coreMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      mesh.visible = false;

      const rimMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const ring = new THREE.Mesh(decalRingGeo, rimMat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 4;
      ring.visible = false;

      this.particlesGroup.add(mesh, ring);
      this.impactDecalPool.push({
        active: false,
        life: 0,
        maxLife: 1.6,
        baseRadius: 2.0,
        mesh,
        ring,
      });
    }

    // 3D Crimson-Gold Danger Lane pool (Boss linear / cross danger corridors with glowing side rails)
    const laneOuterGeo = new THREE.PlaneGeometry(1.38, 16);
    laneOuterGeo.translate(0, 0, 8);
    const laneFillGeo = new THREE.PlaneGeometry(1.12, 16);
    laneFillGeo.translate(0, 0, 8);
    const laneRailGeo = new THREE.PlaneGeometry(0.08, 16);
    laneRailGeo.translate(0, 0, 8);
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(
        laneOuterGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      outer.rotation.x = -Math.PI / 2;
      outer.renderOrder = 7;

      const railMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.86,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      });
      const leftRail = new THREE.Mesh(laneRailGeo, railMat);
      leftRail.rotation.x = -Math.PI / 2;
      leftRail.position.set(-0.67, 0.02, 0);
      leftRail.renderOrder = 9;
      const rightRail = new THREE.Mesh(laneRailGeo, railMat);
      rightRail.rotation.x = -Math.PI / 2;
      rightRail.position.set(0.67, 0.025, 0);
      rightRail.renderOrder = 25;

      const fillMesh = new THREE.Mesh(
        laneFillGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        })
      );
      fillMesh.rotation.x = -Math.PI / 2;
      fillMesh.position.y = 0.02;
      fillMesh.scale.set(0.1, 1, 1);
      fillMesh.renderOrder = 24;

      group.add(outer, fillMesh, leftRail, rightRail);
      group.visible = false;
      this.particlesGroup.add(group);
      this.dangerLanePool.push({ active: false, mesh: group, fillMesh });
    }

    // Pooled Boss Ground Hazard Zones (fire / poison / frost / whirlpool — zero runtime allocation, Lite-GPU safe)
    const hazardDiscGeo = new THREE.CircleGeometry(1, 28);
    const hazardRingGeo = new THREE.RingGeometry(0.86, 1.0, 28);
    for (let i = 0; i < 6; i++) {
      const group = new THREE.Group();
      const disc = new THREE.Mesh(
        hazardDiscGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.32,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.renderOrder = 6;

      const ring = new THREE.Mesh(
        hazardRingGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfde047,
          transparent: true,
          opacity: 0.84,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015;
      ring.renderOrder = 8;

      group.add(disc, ring);
      group.visible = false;
      this.particlesGroup.add(group);
      this.bossHazardPool.push({
        active: false,
        kind: 'fire',
        x: 0,
        z: 0,
        radius: 2.4,
        life: 0,
        maxLife: 4,
        tickTimer: 0,
        damagePerTick: 18,
        ownerName: 'Boss',
        group,
        disc,
        ring,
      });
    }

    // Pooled Boss Multi-Slam Delayed Telegraphs (meteor cascades / frost pillars / rune blooms)
    const multiFillGeo = new THREE.CircleGeometry(1, 28);
    const multiOuterGeo = new THREE.RingGeometry(0.9, 1.0, 28);
    const multiCountGeo = new THREE.RingGeometry(0.84, 0.94, 28);
    for (let i = 0; i < 4; i++) {
      const group = new THREE.Group();
      const fill = new THREE.Mesh(
        multiFillGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.34,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      fill.rotation.x = -Math.PI / 2;
      fill.renderOrder = 10;

      const outerRing = new THREE.Mesh(
        multiOuterGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        })
      );
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.position.y = 0.015;
      outerRing.renderOrder = 12;

      const countdownRing = new THREE.Mesh(
        multiCountGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -5,
          polygonOffsetUnits: -5,
        })
      );
      countdownRing.rotation.x = -Math.PI / 2;
      countdownRing.position.y = 0.025;
      countdownRing.renderOrder = 13;

      group.add(fill, outerRing, countdownRing);
      group.visible = false;
      this.particlesGroup.add(group);
      this.bossMultiSlamPool.push({
        active: false,
        x: 0,
        z: 0,
        radius: 2.5,
        delayTimer: 0,
        timer: 0,
        duration: 0.72,
        damage: 40,
        colorHex: 0xf97316,
        ownerName: 'Boss',
        group,
        fill,
        outerRing,
        countdownRing,
      });
    }

    // 3D Starfall Ambient Weather (InstancedMesh)
    const starGeo = new THREE.OctahedronGeometry(0.085, 0);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.76,
    });
    this.starfallMesh = new THREE.InstancedMesh(starGeo, starMat, this.STARFALL_COUNT);
    this.starfallMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.starfallMesh.frustumCulled = false;
    this.starfallSeeds = [];
    for (let i = 0; i < this.STARFALL_COUNT; i++) {
      const s = {
        x: (Math.random() - 0.5) * 30,
        y: 1.5 + Math.random() * 14,
        z: (Math.random() - 0.5) * 32,
        vy: -(0.65 + Math.random() * 0.95),
        vx: -0.35 + Math.random() * 0.7,
        scale: 0.65 + Math.random() * 0.95,
        phase: Math.random() * Math.PI * 2,
      };
      this.starfallSeeds.push(s);
      _dummy.position.set(s.x, s.y, s.z);
      _dummy.scale.setScalar(s.scale);
      _dummy.updateMatrix();
      this.starfallMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.starfallMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.starfallMesh);

    // Target lock reticle
    const reticleTex = createTargetReticleTexture('#fbbf24');
    this.reticleMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({
        map: reticleTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    this.reticleMesh.rotation.x = -Math.PI / 2;
    this.reticleMesh.position.y = 0.04;
    this.reticleMesh.visible = false;
    this.scene.add(this.reticleMesh);

    // 3D Diegetic Bow Aim-Lock Sightline (unit-length ground ribbon scaled per target)
    const aimGeo = new THREE.PlaneGeometry(0.085, 1.0);
    aimGeo.rotateX(-Math.PI / 2);
    this.aimLineMesh = new THREE.Mesh(
      aimGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    this.aimLineMesh.position.y = 0.048;
    this.aimLineMesh.renderOrder = 6;
    this.aimLineMesh.visible = false;
    this.scene.add(this.aimLineMesh);

    // Pooled 3D Crit Star-Burst cross-flares (bloom-ready high-contrast impact sparks)
    const flareBladeGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const grp = new THREE.Group();
      const b1 = new THREE.Mesh(flareBladeGeo, mat);
      b1.scale.set(0.32, 3.4, 0.32);
      const b2 = new THREE.Mesh(flareBladeGeo, mat);
      b2.scale.set(3.4, 0.32, 0.32);
      const b3 = new THREE.Mesh(flareBladeGeo, mat);
      b3.scale.set(0.32, 0.32, 3.4);
      grp.add(b1, b2, b3);
      grp.visible = false;
      this.particlesGroup.add(grp);
      this.critStarPool.push({
        active: false,
        life: 0,
        maxLife: 0.22,
        baseScale: 1,
        group: grp,
        mat,
      });
    }

    // AAA Wave 5: Pooled 3D Celestial Summon Portals (8 counter-rotating rune rings)
    const portalOuterGeo = new THREE.RingGeometry(0.78, 1.0, 24);
    const portalInnerGeo = new THREE.RingGeometry(0.42, 0.58, 6);
    const portalCoreGeo = new THREE.CircleGeometry(0.75, 20);
    for (let i = 0; i < 8; i++) {
      const grp = new THREE.Group();
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outerRing = new THREE.Mesh(portalOuterGeo, outerMat);
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.renderOrder = 6;

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const innerRing = new THREE.Mesh(portalInnerGeo, innerMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.015;
      innerRing.renderOrder = 7;

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coreDisc = new THREE.Mesh(portalCoreGeo, coreMat);
      coreDisc.rotation.x = -Math.PI / 2;
      coreDisc.position.y = -0.005;
      coreDisc.renderOrder = 5;

      grp.add(coreDisc, outerRing, innerRing);
      grp.visible = false;
      this.particlesGroup.add(grp);
      this.summonPortalPool.push({
        active: false,
        life: 0,
        maxLife: 0.56,
        baseRadius: 1.2,
        group: grp,
        outerRing,
        innerRing,
        coreDisc,
      });
    }

    // AAA Wave 5: Pooled 3D Physical Armor-Shatter & Crystal-Pillar Shards (28 bouncing shards)
    const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
    shardGeo.scale(1.25, 0.55, 0.85);
    for (let i = 0; i < 28; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
        roughness: 0.22,
        metalness: 0.82,
      });
      const mesh = new THREE.Mesh(shardGeo, mat);
      mesh.visible = false;
      this.particlesGroup.add(mesh);
      this.armorShardPool.push({
        active: false,
        kin: {
          x: 0,
          y: 0,
          z: 0,
          vx: 0,
          vy: 0,
          vz: 0,
          rx: 0,
          ry: 0,
          rz: 0,
          vrx: 0,
          vry: 0,
          vrz: 0,
          bounces: 0,
          life: 0,
          maxLife: 1.1,
        },
        mesh,
      });
    }

    // AAA Wave 5: Pooled Glowing Dash Scorch Floor Trails (16 streaks)
    const scorchGeo = new THREE.PlaneGeometry(0.68, 1.55);
    scorchGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(scorchGeo, mat);
      mesh.renderOrder = 5;
      mesh.visible = false;
      this.particlesGroup.add(mesh);
      this.dashScorchPool.push({
        active: false,
        life: 0,
        maxLife: 0.62,
        mesh,
      });
    }

    // AAA Wave 5: Lightweight InstancedMesh Low-Lying Arena Ground Mist (14 drifting planes)
    const mistGeo = new THREE.CircleGeometry(1.9, 14);
    mistGeo.rotateX(-Math.PI / 2);
    const mistMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.groundMistMesh = new THREE.InstancedMesh(mistGeo, mistMat, this.GROUND_MIST_COUNT);
    this.groundMistMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.groundMistMesh.frustumCulled = false;
    this.groundMistMesh.renderOrder = 2;
    this.groundMistSeeds = [];
    for (let i = 0; i < this.GROUND_MIST_COUNT; i++) {
      const s = {
        x: (Math.random() - 0.5) * (ARENA_HALF_W * 1.9),
        z: (Math.random() - 0.5) * (ARENA_HALF_D * 1.8),
        vx: (Math.random() - 0.5) * 0.65,
        vz: 0.25 + Math.random() * 0.45,
        scale: 1.05 + Math.random() * 1.15,
        phase: Math.random() * Math.PI * 2,
      };
      this.groundMistSeeds.push(s);
      _dummy.position.set(s.x, 0.08 + (i % 3) * 0.03, s.z);
      _dummy.rotation.set(0, s.phase, 0);
      _dummy.scale.setScalar(s.scale);
      _dummy.updateMatrix();
      this.groundMistMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.groundMistMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.groundMistMesh);

    // AAA Wave 6: Pooled Persistent Battle-Scar Floor Fissures (8 radial scorched cracks, zero GC)
    const scarCoreGeo = new THREE.CircleGeometry(0.95, 14);
    scarCoreGeo.rotateX(-Math.PI / 2);
    const scarCrackGeo = new THREE.PlaneGeometry(0.14, 2.35);
    scarCrackGeo.rotateX(-Math.PI / 2);
    const scarCoreMat = new THREE.MeshBasicMaterial({
      color: 0x050308,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const scarCrackMat = new THREE.MeshBasicMaterial({
      color: 0x1e1120,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const scarEmberMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    for (let i = 0; i < 8; i++) {
      const grp = new THREE.Group();
      const core = new THREE.Mesh(scarCoreGeo, scarCoreMat);
      core.renderOrder = 3;
      grp.add(core);
      for (let b = 0; b < 5; b++) {
        const ang = (b / 5) * Math.PI * 2 + (b % 2) * 0.28;
        const crack = new THREE.Mesh(scarCrackGeo, scarCrackMat);
        crack.rotation.y = ang;
        crack.position.set(Math.sin(ang) * 0.72, 0.004, Math.cos(ang) * 0.72);
        crack.scale.set(1, 1, 0.78 + (b % 3) * 0.22);
        crack.renderOrder = 4;
        grp.add(crack);
        if (b < 3) {
          const ember = new THREE.Mesh(scarCrackGeo, scarEmberMat);
          ember.rotation.y = ang;
          ember.position.set(Math.sin(ang) * 0.56, 0.008, Math.cos(ang) * 0.56);
          ember.scale.set(0.42, 1, 0.56);
          ember.renderOrder = 5;
          grp.add(ember);
        }
      }
      grp.visible = false;
      this.particlesGroup.add(grp);
      this.battleScarPool.push({ active: false, group: grp });
    }

    // AAA Wave 6: Diegetic 3D Astral Overcharge Bow Halo (attached to hero.bowGroup)
    const ocGroup = new THREE.Group();
    const ocOuter = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.022, 8, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const ocInner = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.015, 6, 18),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ocGroup.add(ocOuter, ocInner);
    ocGroup.position.set(0, 0.04, 0.34);
    ocGroup.visible = false;
    this.overchargeRingGroup = ocGroup;
    this.overchargeRingOuter = ocOuter;
    this.overchargeRingInner = ocInner;

    // AAA Wave 7: Diegetic 3D Target Lock-On Reticle (underneath priority enemy)
    const lockGroup = new THREE.Group();
    const lockOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.0, 28),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    lockOuter.rotation.x = -Math.PI / 2;
    const lockInner = new THREE.Mesh(
      new THREE.RingGeometry(0.54, 0.62, 4),
      new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    lockInner.rotation.x = -Math.PI / 2;
    lockInner.position.y = 0.006;
    lockGroup.add(lockOuter, lockInner);
    lockGroup.visible = false;
    this.particlesGroup.add(lockGroup);
    this.targetLockGroup = lockGroup;
    this.targetLockOuter = lockOuter;
    this.targetLockInner = lockInner;

    // AAA Wave 7: Orbiting Boss Weak-Point Crystal
    const wpGroup = new THREE.Group();
    const wpCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.45,
        roughness: 0.16,
        metalness: 0.75,
      })
    );
    const wpHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.54, 0.032, 8, 24),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    wpHalo.rotation.x = Math.PI / 2;
    wpGroup.add(wpCore, wpHalo);
    wpGroup.visible = false;
    this.particlesGroup.add(wpGroup);
    this.bossWeakPointGroup = wpGroup;
    this.bossWeakPointCore = wpCore;

    // AAA Wave 7: Pooled Sticking Arrows (18 slots, zero GC)
    const stuckShaftGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.78, 5);
    stuckShaftGeo.rotateX(Math.PI / 2);
    const stuckShaftMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0.65,
    });
    const stuckFletchGeo = new THREE.ConeGeometry(0.068, 0.16, 4);
    stuckFletchGeo.rotateX(-Math.PI / 2);
    const stuckFletchMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 18; i++) {
      const grp = new THREE.Group();
      const shaft = new THREE.Mesh(stuckShaftGeo, stuckShaftMat);
      const fletch = new THREE.Mesh(stuckFletchGeo, stuckFletchMat);
      fletch.position.z = -0.34;
      grp.add(shaft, fletch);
      grp.visible = false;
      this.particlesGroup.add(grp);
      this.stuckArrowPool.push({
        active: false,
        enemyId: -1,
        life: 0,
        maxLife: 3.2,
        localX: 0,
        localY: 1,
        localZ: 0,
        mesh: grp,
      });
    }

    // AAA Wave 7: Pooled Elemental Footstep Ripples (24 slots, polygonOffset)
    const rippleGeo = new THREE.RingGeometry(0.18, 0.28, 18);
    rippleGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 24; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const rMesh = new THREE.Mesh(rippleGeo, rMat);
      rMesh.visible = false;
      rMesh.renderOrder = 3;
      this.particlesGroup.add(rMesh);
      this.footstepRipplePool.push({
        active: false,
        life: 0,
        maxLife: 0.55,
        mesh: rMesh,
      });
    }

    // Van Tich Signature: Pooled 3D Wind Vortex Rings (10 slots, zero GC)
    const vortexTorusGeo = new THREE.TorusGeometry(0.78, 0.058, 6, 28);
    vortexTorusGeo.rotateX(Math.PI / 2);
    const vortexWispGeo = new THREE.RingGeometry(0.42, 0.84, 22, 1, 0, Math.PI * 1.45);
    vortexWispGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x5eead4,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const wispMat = new THREE.MeshBasicMaterial({
        color: 0x99f6e4,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const outerTorus = new THREE.Mesh(vortexTorusGeo, ringMat);
      const innerWisp = new THREE.Mesh(vortexWispGeo, wispMat);
      innerWisp.position.y = 0.08;
      group.add(outerTorus, innerWisp);
      group.visible = false;
      this.particlesGroup.add(group);
      this.windRingPool.push({
        active: false,
        life: 0,
        maxLife: 0.38,
        maxRadius: 2.35,
        group,
        ringMat,
        wispMat,
      });
    }

    // Van Tich Signature: Pooled 3D Storm-Mark Ground Indicators (18 slots, zero GC)
    const stormMarkOuterGeo = new THREE.RingGeometry(0.58, 0.72, 24);
    stormMarkOuterGeo.rotateX(-Math.PI / 2);
    const stormMarkDiamondGeo = new THREE.RingGeometry(0.34, 0.46, 4);
    stormMarkDiamondGeo.rotateX(-Math.PI / 2);
    const stormMarkOuterMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const stormMarkDiamondMat = new THREE.MeshBasicMaterial({
      color: 0x99f6e4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    for (let i = 0; i < 18; i++) {
      const grp = new THREE.Group();
      const ring = new THREE.Mesh(stormMarkOuterGeo, stormMarkOuterMat);
      ring.renderOrder = 6;
      const diamond = new THREE.Mesh(stormMarkDiamondGeo, stormMarkDiamondMat);
      diamond.position.y = 0.008;
      diamond.renderOrder = 7;
      grp.add(ring, diamond);
      grp.visible = false;
      this.particlesGroup.add(grp);
      this.stormMarkPool.push({ active: false, group: grp });
    }

    // Van Tich Signature Ultimate: Persistent 3D Storm Chart Compass Sigil (4.2m ground ritual chart)
    const chartGroup = new THREE.Group();
    const chartOuterMat = new THREE.MeshBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(3.86, 4.2, 48).rotateX(-Math.PI / 2),
      chartOuterMat
    );
    outerRing.renderOrder = 8;

    const chartStarMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const compassStar = new THREE.Mesh(
      new THREE.RingGeometry(2.45, 2.78, 8).rotateX(-Math.PI / 2),
      chartStarMat
    );
    compassStar.position.y = 0.008;
    compassStar.renderOrder = 9;
    const needleGeo = new THREE.PlaneGeometry(0.18, 7.8);
    needleGeo.rotateX(-Math.PI / 2);
    const needleNS = new THREE.Mesh(needleGeo, chartStarMat);
    const needleEW = new THREE.Mesh(needleGeo, chartStarMat);
    needleEW.rotation.y = Math.PI / 2;
    const starQuadGeo = new THREE.RingGeometry(1.75, 2.15, 4).rotateX(-Math.PI / 2);
    const starQuadA = new THREE.Mesh(starQuadGeo, chartStarMat);
    const starQuadB = new THREE.Mesh(starQuadGeo, chartStarMat);
    starQuadB.rotation.y = Math.PI / 4;
    compassStar.add(needleNS, needleEW, starQuadA, starQuadB);

    const chartInnerMat = new THREE.MeshBasicMaterial({
      color: 0x99f6e4,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.42, 24).rotateX(-Math.PI / 2),
      chartInnerMat
    );
    innerRing.position.y = 0.016;
    innerRing.renderOrder = 10;

    const chartGlowMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const centerGlow = new THREE.Mesh(
      new THREE.CircleGeometry(3.92, 32).rotateX(-Math.PI / 2),
      chartGlowMat
    );
    centerGlow.position.y = -0.004;
    centerGlow.renderOrder = 7;

    chartGroup.add(centerGlow, outerRing, compassStar, innerRing);
    chartGroup.position.set(0, 0.075, 0);
    chartGroup.visible = false;
    this.particlesGroup.add(chartGroup);
    this.stormChartVisual = {
      group: chartGroup,
      outerRing,
      compassStar,
      innerRing,
      centerGlow,
      outerMat: chartOuterMat,
      starMat: chartStarMat,
      innerMat: chartInnerMat,
      glowMat: chartGlowMat,
    };
  }

  private setAppearanceStatus(status: AppearanceStatus): void {
    if (this.appearanceStatus === status) return;
    this.appearanceStatus = status;
    this.callbacks.onAppearanceStatusChange?.(status);
  }

  private wantsRiggedHeroModel(): boolean {
    const visualHeroId = this.heroVisualCfg?.heroId ?? this.baseStats.heroId;
    return visualHeroId === 'artemis' || visualHeroId === 'hatsune_miku';
  }

  private hasDragonRide(): boolean {
    const mount = this.hero.mountGroup;
    return !!mount && this.solarLeoMountRig?.group.parent === mount;
  }

  private getActiveSolarLeoVariant(): SolarLeoVariant {
    const budget = this.getActiveSystemBudget();
    if (
      this.lowEndGpu ||
      this.isSoftwareGl ||
      this.graphicsQuality === 'low' ||
      budget.assetVariant !== 'high'
    ) {
      return 'lite';
    }
    return 'high';
  }

  private getSolarLeoAnisotropy(variant: SolarLeoVariant): number {
    const maxAniso = Math.max(1, this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 2);
    if (variant === 'lite') return Math.min(2, maxAniso);
    return Math.min(8, maxAniso);
  }

  private applySolarLeoHeroRig(rig: InstantiatedSolarLeoModel): void {
    if (!this.hero) return;
    for (const mesh of this.hero.bodyMeshes) mesh.visible = false;
    this.hero.bowGroup.visible = false;
    this.hero.magicOrb.visible = false;
    this.hero.hitMeshes = rig.hitMeshes;
    if (rig.group.parent !== this.hero.bodyGroup) {
      this.hero.bodyGroup.add(rig.group);
    }
  }

  private syncSolarLeoHeroVisual(): void {
    if (!this.hero) return;
    const heroId = this.heroVisualCfg?.heroId ?? this.baseStats.heroId;
    const assetId = resolveSolarLeoHeroAssetId(heroId, this.heroVisualCfg?.skinId);
    if (!assetId) {
      this.solarLeoHeroSeq++;
      if (this.solarLeoHeroRig) {
        this.releaseObject(this.solarLeoHeroRig.group);
        this.solarLeoHeroRig = undefined;
        this.solarLeoHeroKey = undefined;
      }
      return;
    }

    const variant = this.getActiveSolarLeoVariant();
    const key = `${assetId}:${variant}`;
    if (this.solarLeoHeroRig && this.solarLeoHeroKey === key) {
      this.applySolarLeoHeroRig(this.solarLeoHeroRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoHeroSeq++;
      if (this.solarLeoHeroRig) this.releaseObject(this.solarLeoHeroRig.group);
      this.solarLeoHeroRig = instantiateSolarLeoModel(cached, { liteMode: variant === 'lite' });
      this.solarLeoHeroKey = key;
      this.applySolarLeoHeroRig(this.solarLeoHeroRig);
      return;
    }

    if (this.solarLeoHeroRig && this.solarLeoHeroRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoHeroRig.group);
      this.solarLeoHeroRig = undefined;
      this.solarLeoHeroKey = undefined;
    }
    const seq = ++this.solarLeoHeroSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), { baseUrl })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoHeroSeq || !this.hero) return;
        const currentAsset = resolveSolarLeoHeroAssetId(
          this.heroVisualCfg?.heroId ?? this.baseStats.heroId,
          this.heroVisualCfg?.skinId
        );
        if (currentAsset !== assetId) return;
        if (this.solarLeoHeroRig) this.releaseObject(this.solarLeoHeroRig.group);
        this.solarLeoHeroRig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
        this.solarLeoHeroKey = key;
        this.applySolarLeoHeroRig(this.solarLeoHeroRig);
      })
      .catch((err) => {
        if (this.disposed || seq !== this.solarLeoHeroSeq) return;
        this.solarLeoHeroFailedAsset = assetId;
        console.warn(`Không tải được mô hình Anh hùng ${assetId}:`, err);
      })
      .finally(() => {
        if (!this.disposed && seq === this.solarLeoHeroSeq) this.refreshAppearanceGate();
      });
  }

  private syncSolarLeoMountVisual(): void {
    const mount = this.hero?.mountGroup;
    const assetId = this.heroVisualCfg.mountId;
    const wantsSolarius =
      Boolean(mount) &&
      (assetId === 'solarius' || assetId === 'vulcan' || assetId === 'jade_bull') &&
      !this.heroVisualCfg.astralSteedId;

    if (!wantsSolarius || !mount) {
      this.solarLeoMountSeq++;
      if (this.solarLeoMountRig) {
        this.releaseObject(this.solarLeoMountRig.group);
        this.solarLeoMountRig = undefined;
        this.solarLeoMountVariant = undefined;
      }
      return;
    }

    if (this.solarLeoMountRig && this.solarLeoMountRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoMountRig.group);
      this.solarLeoMountRig = undefined;
      this.solarLeoMountVariant = undefined;
    }

    const variant = this.getActiveSolarLeoVariant();
    const attachRig = (rig: InstantiatedSolarLeoModel) => {
      if (!this.hero?.mountGroup) return;
      for (const part of this.hero.mountGroup.children) part.visible = part === rig.group;
      if (rig.group.parent !== this.hero.mountGroup) this.hero.mountGroup.add(rig.group);
      rig.group.visible = true;
    };

    if (this.solarLeoMountRig?.assetId === assetId && this.solarLeoMountVariant === variant) {
      attachRig(this.solarLeoMountRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoMountSeq++;
      if (this.solarLeoMountRig) this.releaseObject(this.solarLeoMountRig.group);
      this.solarLeoMountRig = instantiateSolarLeoModel(cached, { liteMode: variant === 'lite' });
      this.solarLeoMountVariant = variant;
      attachRig(this.solarLeoMountRig);
      return;
    }

    const seq = ++this.solarLeoMountSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), { baseUrl })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoMountSeq || !this.hero?.mountGroup) return;
        if (this.heroVisualCfg.mountId !== assetId || this.heroVisualCfg.astralSteedId) return;
        if (this.solarLeoMountRig) this.releaseObject(this.solarLeoMountRig.group);
        this.solarLeoMountRig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
        this.solarLeoMountVariant = variant;
        attachRig(this.solarLeoMountRig);
      })
      .catch((err) => {
        console.warn('Không tải được thú cưỡi 3D Solarius:', err);
      });
  }

  private syncSolarLeoWingVisual(): void {
    const wingGroup = this.hero?.wingGroup;
    const assetId = this.heroVisualCfg.wingId;
    const wantsSolarWings =
      Boolean(wingGroup) &&
      (assetId === 'solar_zenith' || assetId === 'crimson_ram_wings' || assetId === 'emerald_taurus_wings');
    // Never overlap default blue Celestial Wings behind the full 3D Wings of the Solar Zenith
    if (this.hero?.celestialWingGroup) {
      this.hero.celestialWingGroup.visible = !wantsSolarWings;
    }
    if (!wantsSolarWings || !wingGroup) {
      this.solarLeoWingSeq++;
      if (this.solarLeoWingRig) {
        this.releaseObject(this.solarLeoWingRig.group);
        this.solarLeoWingRig = undefined;
        this.solarLeoWingVariant = undefined;
      }
      return;
    }

    // Immediately hide procedural fallback blades while the 3D Solar Zenith GLB attaches or loads
    for (const part of wingGroup.children) {
      if (part !== this.solarLeoWingRig?.group) part.visible = false;
    }

    if (this.solarLeoWingRig && this.solarLeoWingRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoWingRig.group);
      this.solarLeoWingRig = undefined;
      this.solarLeoWingVariant = undefined;
    }

    const variant = this.getActiveSolarLeoVariant();
    const attachRig = (rig: InstantiatedSolarLeoModel) => {
      if (!this.hero?.wingGroup) return;
      if (this.hero.celestialWingGroup) this.hero.celestialWingGroup.visible = false;
      rig.group.position.set(0, 0.16, -0.06);
      for (const part of this.hero.wingGroup.children) part.visible = part === rig.group;
      if (rig.group.parent !== this.hero.wingGroup) this.hero.wingGroup.add(rig.group);
      rig.group.visible = true;
    };

    if (this.solarLeoWingRig?.assetId === assetId && this.solarLeoWingVariant === variant) {
      attachRig(this.solarLeoWingRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoWingSeq++;
      if (this.solarLeoWingRig) this.releaseObject(this.solarLeoWingRig.group);
      this.solarLeoWingRig = instantiateSolarLeoModel(cached, {
        liteMode: variant === 'lite',
        scaleMultiplier: 1.14,
      });
      this.solarLeoWingVariant = variant;
      attachRig(this.solarLeoWingRig);
      return;
    }

    const seq = ++this.solarLeoWingSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), { baseUrl })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoWingSeq || !this.hero?.wingGroup) return;
        if (this.heroVisualCfg.wingId !== assetId) return;
        if (this.solarLeoWingRig) this.releaseObject(this.solarLeoWingRig.group);
        this.solarLeoWingRig = instantiateSolarLeoModel(tpl, {
          liteMode: variant === 'lite',
          scaleMultiplier: 1.14,
        });
        this.solarLeoWingVariant = variant;
        attachRig(this.solarLeoWingRig);
      })
      .catch((err) => {
        console.warn('Không tải được cánh 3D Thần Dực Đỉnh Thái Dương:', err);
      });
  }

  private syncSolarLeoHaloVisual(): void {
    const haloGroup = this.hero?.haloGroup;
    const assetId = this.heroVisualCfg.haloId;
    const wantsLeoHalo =
      Boolean(haloGroup) &&
      (assetId === 'leo_sovereign' || assetId === 'aries_vanguard' || assetId === 'emerald_taurus_halo');
    if (!wantsLeoHalo || !haloGroup) {
      this.solarLeoHaloSeq++;
      if (this.solarLeoHaloRig) {
        this.releaseObject(this.solarLeoHaloRig.group);
        this.solarLeoHaloRig = undefined;
        this.solarLeoHaloVariant = undefined;
      }
      return;
    }

    if (this.solarLeoHaloRig && this.solarLeoHaloRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoHaloRig.group);
      this.solarLeoHaloRig = undefined;
      this.solarLeoHaloVariant = undefined;
    }

    const variant = this.getActiveSolarLeoVariant();
    const attachRig = (rig: InstantiatedSolarLeoModel) => {
      if (!this.hero?.haloGroup) return;
      rig.group.position.set(0, 0.22, -0.05);
      for (const part of this.hero.haloGroup.children) part.visible = part === rig.group;
      if (rig.group.parent !== this.hero.haloGroup) this.hero.haloGroup.add(rig.group);
      rig.group.visible = true;
    };

    if (this.solarLeoHaloRig?.assetId === assetId && this.solarLeoHaloVariant === variant) {
      attachRig(this.solarLeoHaloRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoHaloSeq++;
      if (this.solarLeoHaloRig) this.releaseObject(this.solarLeoHaloRig.group);
      this.solarLeoHaloRig = instantiateSolarLeoModel(cached, { liteMode: variant === 'lite' });
      this.solarLeoHaloVariant = variant;
      attachRig(this.solarLeoHaloRig);
      return;
    }

    const seq = ++this.solarLeoHaloSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), { baseUrl })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoHaloSeq || !this.hero?.haloGroup) return;
        if (this.heroVisualCfg.haloId !== assetId) return;
        if (this.solarLeoHaloRig) this.releaseObject(this.solarLeoHaloRig.group);
        this.solarLeoHaloRig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
        this.solarLeoHaloVariant = variant;
        attachRig(this.solarLeoHaloRig);
      })
      .catch((err) => {
        console.warn('Không tải được hào quang 3D Hào Quang Sư Tử Chí Tôn:', err);
      });
  }

  private syncSolarLeoArtifactVisual(): void {
    const artifactGroup = this.hero?.artifactGroup;
    const assetId = this.heroVisualCfg.artifactId;
    const wantsAstrolabe =
      Boolean(artifactGroup) &&
      (assetId === 'astrolabe_regulus' || assetId === 'war_horn' || assetId === 'jade_heart_relic');
    if (!wantsAstrolabe || !artifactGroup) {
      this.solarLeoArtifactSeq++;
      if (this.solarLeoArtifactRig) {
        this.releaseObject(this.solarLeoArtifactRig.group);
        this.solarLeoArtifactRig = undefined;
        this.solarLeoArtifactVariant = undefined;
      }
      return;
    }

    if (this.solarLeoArtifactRig && this.solarLeoArtifactRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoArtifactRig.group);
      this.solarLeoArtifactRig = undefined;
      this.solarLeoArtifactVariant = undefined;
    }

    const variant = this.getActiveSolarLeoVariant();
    const attachRig = (rig: InstantiatedSolarLeoModel) => {
      if (!this.hero?.artifactGroup) return;
      this.hero.artifactGroup.position.set(
        SOLAR_LEO_ARTIFACT_OFFSET.x,
        SOLAR_LEO_ARTIFACT_OFFSET.y,
        SOLAR_LEO_ARTIFACT_OFFSET.z
      );
      for (const part of this.hero.artifactGroup.children) part.visible = part === rig.group;
      if (rig.group.parent !== this.hero.artifactGroup) this.hero.artifactGroup.add(rig.group);
      rig.group.visible = true;
    };

    if (this.solarLeoArtifactRig?.assetId === assetId && this.solarLeoArtifactVariant === variant) {
      attachRig(this.solarLeoArtifactRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoArtifactSeq++;
      if (this.solarLeoArtifactRig) this.releaseObject(this.solarLeoArtifactRig.group);
      this.solarLeoArtifactRig = instantiateSolarLeoModel(cached, { liteMode: variant === 'lite' });
      this.solarLeoArtifactVariant = variant;
      attachRig(this.solarLeoArtifactRig);
      return;
    }

    const seq = ++this.solarLeoArtifactSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), {
      baseUrl,
    })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoArtifactSeq || !this.hero?.artifactGroup) return;
        if (this.heroVisualCfg.artifactId !== assetId) return;
        if (this.solarLeoArtifactRig) this.releaseObject(this.solarLeoArtifactRig.group);
        this.solarLeoArtifactRig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
        this.solarLeoArtifactVariant = variant;
        attachRig(this.solarLeoArtifactRig);
      })
      .catch((err) => {
        console.warn('Không tải được thánh khí 3D Tinh Bàn Regulus:', err);
      });
  }

  private syncSolarLeoPetVisual(): void {
    const petModel = this.petModel;
    const assetId = this.builtPetId;
    const wantsAstraeo =
      Boolean(petModel) &&
      (assetId === 'astraeo' || assetId === 'pyro' || assetId === 'jade_calf');
    if (!wantsAstraeo || !petModel) {
      this.solarLeoPetSeq++;
      if (this.solarLeoPetRig) {
        this.releaseObject(this.solarLeoPetRig.group);
        this.solarLeoPetRig = undefined;
        this.solarLeoPetVariant = undefined;
      }
      return;
    }

    if (this.solarLeoPetRig && this.solarLeoPetRig.assetId !== assetId) {
      this.releaseObject(this.solarLeoPetRig.group);
      this.solarLeoPetRig = undefined;
      this.solarLeoPetVariant = undefined;
    }

    const variant = this.getActiveSolarLeoVariant();
    const attachRig = (rig: InstantiatedSolarLeoModel) => {
      if (!this.petModel) return;
      for (const part of this.petModel.children) part.visible = part === rig.group;
      if (rig.group.parent !== this.petModel) this.petModel.add(rig.group);
      rig.group.visible = true;
    };

    if (this.solarLeoPetRig?.assetId === assetId && this.solarLeoPetVariant === variant) {
      attachRig(this.solarLeoPetRig);
      return;
    }

    const cached = getCachedSolarLeoTemplateSync(assetId, variant);
    if (cached) {
      this.solarLeoPetSeq++;
      if (this.solarLeoPetRig) this.releaseObject(this.solarLeoPetRig.group);
      this.solarLeoPetRig = instantiateSolarLeoModel(cached, { liteMode: variant === 'lite' });
      this.solarLeoPetVariant = variant;
      attachRig(this.solarLeoPetRig);
      return;
    }

    const seq = ++this.solarLeoPetSeq;
    const baseUrl = import.meta.env.BASE_URL ?? '/';
    loadSolarLeoTemplate(assetId, variant, this.getSolarLeoAnisotropy(variant), { baseUrl })
      .then((tpl) => {
        if (this.disposed || seq !== this.solarLeoPetSeq || !this.petModel) return;
        if (this.builtPetId !== assetId) return;
        if (this.solarLeoPetRig) this.releaseObject(this.solarLeoPetRig.group);
        this.solarLeoPetRig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
        this.solarLeoPetVariant = variant;
        attachRig(this.solarLeoPetRig);
      })
      .catch((err) => {
        console.warn('Không tải được tinh linh 3D Astraeo:', err);
      });
  }

  private syncSolarLeoVisuals(): void {
    this.syncSolarLeoHeroVisual();
    this.syncSolarLeoMountVisual();
    this.syncSolarLeoWingVisual();
    this.syncSolarLeoHaloVisual();
    this.syncSolarLeoArtifactVisual();
    this.syncSolarLeoPetVisual();
  }

  private refreshAppearanceGate(): void {
    if (!this.hero) return;
    const asset = this.getRiggedHeroAsset();
    const artemisPending = this.wantsRiggedHeroModel() &&
      (this.artemisLoadedAsset !== asset || this.artemisModel?.parent !== this.hero.bodyGroup);

    const heroId = this.heroVisualCfg?.heroId ?? this.baseStats.heroId;
    const solarLeoAsset = resolveSolarLeoHeroAssetId(heroId, this.heroVisualCfg?.skinId);
    const solarLeoPending = Boolean(solarLeoAsset &&
      (this.solarLeoHeroRig?.assetId !== solarLeoAsset || this.solarLeoHeroRig.group.parent !== this.hero.bodyGroup));

    this.appearanceBlocked = artemisPending || solarLeoPending;
    this.hero.root.visible = !this.appearanceBlocked;
    if (this.heroShadow) this.heroShadow.visible = !this.appearanceBlocked;
    if (this.appearanceBlocked) {
      const failed = (artemisPending && this.artemisFailedAsset === asset) ||
        (solarLeoPending && this.solarLeoHeroFailedAsset === solarLeoAsset);
      this.setAppearanceStatus(failed ? 'error' : 'loading');
    } else if (this.appearanceStatus === 'error') {
      this.setAppearanceStatus('loading');
    }
  }

  public retryAppearance(): void {
    this.artemisFailedAsset = undefined;
    this.solarLeoHeroFailedAsset = undefined;
    this.syncSolarLeoHeroVisual();
    this.chapter1MapFailCount = 0;
    if (this.wantsRiggedHeroModel()) this.useArtemisModel();
    this.ensureChapter1MapLoaded();
    this.refreshAppearanceGate();
  }

  private async loadAppearanceAsset(path: ModelAsset) {
    const budget = this.getActiveSystemBudget();
    const url = getModelAssetUrl(path, budget.liteActive);
    const data = await downloadModel(path);
    markHeavyAssetLoadInFlight(path);
    try {
      await MeshoptDecoder.ready;
      const gltf = await new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .parseAsync(data, new URL('.', url).href);
      sanitizeLoadedObjectForBudget(gltf.scene, budget, {
        preserveFaceSharpness: true,
      });
      return gltf;
    } catch (error) {
      discardModelDownload(path, data);
      if (budget.liteActive) {
        // Automatic recovery fallback to full GLB if a Lite asset fails to parse
        const fullUrl = getModelAssetUrl(path, false);
        const resp = await fetch(fullUrl);
        if (resp.ok) {
          const fullBuf = await resp.arrayBuffer();
          await MeshoptDecoder.ready;
          const gltf = await new GLTFLoader()
            .setMeshoptDecoder(MeshoptDecoder)
            .parseAsync(fullBuf, new URL('.', fullUrl).href);
          sanitizeLoadedObjectForBudget(gltf.scene, budget, {
            preserveFaceSharpness: true,
          });
          return gltf;
        }
      }
      throw error;
    } finally {
      clearHeavyAssetLoadInFlight();
    }
  }

  private get hasCadencePassive(): boolean {
    return this.baseStats.heroId === 'hatsune_miku';
  }

  private getRiggedHeroAsset(): ModelAsset {
    const heroId = this.heroVisualCfg.heroId ?? this.baseStats.heroId;
    if (heroId === 'hatsune_miku') return 'heroes/hatsune-miku.glb';
    return 'heroes/golden-dress-girl.glb';
  }

  private useArtemisModel(): void {
    const asset = this.getRiggedHeroAsset();
    if (this.artemisModel && this.artemisLoadedAsset !== asset) {
      this.releaseObject(this.artemisModel);
      this.artemisModel = undefined;
      this.artemisMotion = undefined;
      this.artemisLoadedAsset = undefined;
    }

    if (this.artemisModel) {
      const meshes: THREE.Mesh[] = [];
      this.artemisModel.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) {
          meshes.push(object);
        }
      });
      for (const mesh of this.hero.bodyMeshes) mesh.visible = false;
      this.hero.hitMeshes = meshes;
      this.hero.bodyGroup.add(this.artemisModel);
      return;
    }

    if (this.artemisModelLoading || this.artemisFailedAsset === asset) return;
    this.artemisModelLoading = true;
    this.loadAppearanceAsset(asset)
      .then(({ scene }) => {
        if (this.disposed || this.getRiggedHeroAsset() !== asset || !this.wantsRiggedHeroModel()) {
          this.releaseObject(scene);
          return;
        }
        const bounds = new THREE.Box3().setFromObject(scene);
        const scale = 2.05 / (bounds.max.y - bounds.min.y);
        const center = bounds.getCenter(new THREE.Vector3());
        scene.scale.setScalar(scale);
        scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.castShadow = true;
        });
        this.artemisMotion = createArtemisMotion(
          scene,
          asset === 'heroes/van-tich.glb' ? 'staff' : 'bow',
          asset === 'heroes/hatsune-miku.glb',
          {
            persona: asset === 'heroes/hatsune-miku.glb' ? 'miku' : 'alice',
            liteMode: this.getActiveSolarLeoVariant() === 'lite',
          }
        );
        this.artemisLoadedAsset = asset;
        this.artemisModel = scene;
        this.useArtemisModel();
      })
      .catch((error) => {
        this.artemisFailedAsset = asset;
        console.warn('Could not load the selected hero appearance.', error);
      })
      .finally(() => {
        this.artemisModelLoading = false;
        if (this.disposed) return;
        if (this.wantsRiggedHeroModel() && this.getRiggedHeroAsset() !== asset) {
          this.useArtemisModel();
        }
        this.refreshAppearanceGate();
      });
  }

  private updateDragonRide(
    dt: number,
    speed: number,
    sprint = false,
    mountOptions?: { mode?: 'lobby' | 'combat'; bankAngle?: number; celebrating?: boolean }
  ): number {
    const solarius =
      this.solarLeoMountRig?.group.parent === this.hero.mountGroup ? this.solarLeoMountRig : undefined;
    if (solarius) updateSolarLeoMountPose(solarius, this.elapsed, dt, speed, sprint, mountOptions);
    const saddle = solarius?.saddle;
    if (!saddle) return 0.68;
    saddle.getWorldPosition(this.dragonSeat);
    this.hero.root.worldToLocal(this.dragonSeat);
    this.hero.bodyGroup.position.z = this.dragonSeat.z;

    const artemis = this.artemisModel?.parent === this.hero.bodyGroup;
    const aurelia = this.solarLeoHeroRig?.group.parent === this.hero.bodyGroup;
    if (!artemis && !aurelia) {
      this.hero.leftLeg.rotation.set(-0.84, 0, -0.52);
      this.hero.rightLeg.rotation.set(-0.84, 0, 0.52);
    }
    return this.dragonSeat.y - (artemis || aurelia ? 0.86 : 0.44);
  }

  private alignMountedRider(): void {
    const mount = this.solarLeoMountRig;
    if (!mount?.saddle || !this.hasDragonRide()) return;
    const { root, bodyGroup } = this.hero;
    const hip = this.solarLeoHeroRig?.group.parent === bodyGroup
      ? this.solarLeoHeroRig.bones.pelvis
      : this.artemisModel?.parent === bodyGroup
      ? this.artemisModel.getObjectByName('Torso')
      : undefined;
    if (!hip) return;
    root.worldToLocal(mount.saddle.getWorldPosition(this.dragonSeat));
    root.worldToLocal(hip.getWorldPosition(this.mountedRiderHip));
    // Leave room for the saddle cushion below the pelvis.
    this.dragonSeat.y += 0.05;
    bodyGroup.position.add(this.dragonSeat.sub(this.mountedRiderHip));
  }

  private buildHero(): void {
    if (this.hero) {
      this.artemisModel?.removeFromParent();
      this.solarLeoHeroRig?.group.removeFromParent();
      this.solarLeoMountRig?.group.removeFromParent();
      this.solarLeoWingRig?.group.removeFromParent();
      this.solarLeoHaloRig?.group.removeFromParent();
      this.solarLeoArtifactRig?.group.removeFromParent();
      this.releaseObject(this.hero.root);
      this.releaseObject(this.heroShadow);
    }

    this.hero = createHeroModel(this.heroVisualCfg);
    this.hero.root.position.set(this.px, 0, this.pz);
    this.entitiesGroup.add(this.hero.root);
    if (this.wantsRiggedHeroModel()) this.useArtemisModel();
    this.syncSolarLeoHeroVisual();
    this.syncSolarLeoMountVisual();
    this.syncSolarLeoWingVisual();
    this.syncSolarLeoHaloVisual();
    this.syncSolarLeoArtifactVisual();

    this.heroShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    this.heroShadow.rotation.x = -Math.PI / 2;
    this.heroShadow.position.set(this.px, 0.02, this.pz);
    this.entitiesGroup.add(this.heroShadow);
    this.refreshAppearanceGate();

    this.heroShieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 18, 14),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.18,
        wireframe: true,
      })
    );
    this.heroShieldMesh.position.y = 0.95;
    this.heroShieldMesh.visible = false;
    this.hero.root.add(this.heroShieldMesh);

    // Clear old orbit orbs
    this.orbitOrbMeshes.forEach((m) => this.releaseObject(m));
    this.orbitOrbMeshes = [];
    const bladeGeo = new THREE.OctahedronGeometry(0.24, 0);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.6,
    });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(bladeGeo, bladeMat);
      m.scale.set(0.75, 1.4, 0.45);
      m.visible = false;
      this.entitiesGroup.add(m);
      this.orbitOrbMeshes.push(m);
    }

    this.rebuildLobbyPedestal();

    // 3D ground zodiac aura rings disabled to keep visuals uncluttered and save GPU fill-rate
    if (this.combatAuraGroup) {
      this.releaseObject(this.combatAuraGroup);
      this.combatAuraGroup = null;
    }

    this.rebuildCompanions();
    this.refreshAppearanceGate();
  }

  private rebuildCompanions(): void {
    this.companionModels.forEach((c) => this.releaseObject(c));
    this.companionModels = [];

    const spriteCount =
      (this.activeSkills.bomb_sprite ?? 0) +
      (this.activeSkills.laser_sprite ?? 0) +
      (this.hasRune('healing_sprite') ? 1 : 0);
    for (let i = 0; i < Math.min(3, spriteCount); i++) {
      const sp = createCompanionModel('sprite');
      sp.visible = this.phase !== GamePhase.TITLE;
      this.entitiesGroup.add(sp);
      this.companionModels.push(sp);
    }

    const desiredPet = this.baseStats.equippedPetId ?? null;
    const desiredEvolved = Boolean(this.baseStats.equippedPetEvolved);
    if (desiredPet !== this.builtPetId || desiredEvolved !== this.builtPetEvolved) {
      if (this.petModel) {
        this.solarLeoPetRig?.group.removeFromParent();
        this.releaseObject(this.petModel);
        this.petModel = null;
      }
      this.builtPetId = desiredPet;
      this.builtPetEvolved = desiredEvolved;
      if (desiredPet) {
        this.petModel = createPetModel(desiredPet, desiredEvolved);
        this.petModel.position.set(-1.12, 1.05, 4.75);
        this.entitiesGroup.add(this.petModel);
      }
    }
    this.syncSolarLeoPetVisual();
  }

  private rebuildLobbyPedestal(): void {
    if (this.lobbyHaloGroup) {
      this.releaseObject(this.lobbyHaloGroup);
    }
    const floorTheme = SANCTUARY_FLOOR_MAP[this.sanctuaryFloorThemeId] ?? SANCTUARY_FLOOR_MAP.marble_gold;
    const constellationLevels =
      this.heroVisualCfg.constellationLevels ?? this.baseStats.constellationLevels ?? [];

    this.lobbyHaloGroup = new THREE.Group();
    this.lobbyHaloGroup.position.set(0, 0.035, 4.5);

    // Wave 11 & 14: Multi-part Royal Celestial Pedestal tinted by active 3D Sanctuary Floor
    const royalPedestal = createRoyalPedestalDecor(
      floorTheme.floorHex,
      floorTheme.ringHex,
      floorTheme.pillarGlowHex
    );
    this.lobbyHaloGroup.add(royalPedestal);

    // 12 Constellation Orbital Star Crystals (3D ground zodiac aura rings removed for GPU efficiency)
    const starCrystalGeo = new THREE.OctahedronGeometry(0.085, 0);
    for (let i = 0; i < CONSTELLATIONS.length; i++) {
      const cDef = CONSTELLATIONS[i];
      const starLv = constellationLevels[i] ?? 0;
      const elHex = CONSTELLATION_ELEMENT_META[cDef.element].hexNum;
      const ang = (i / CONSTELLATIONS.length) * Math.PI * 2;
      const isLit = starLv > 0;
      const gemMat = new THREE.MeshStandardMaterial({
        color: isLit ? elHex : 0x334155,
        emissive: isLit ? elHex : 0x0f172a,
        emissiveIntensity: isLit ? 1.2 + starLv * 0.28 : 0.2,
        roughness: 0.2,
        metalness: 0.5,
      });
      const gem = new THREE.Mesh(starCrystalGeo, gemMat);
      const scale = isLit ? 0.85 + starLv * 0.14 : 0.55;
      gem.scale.setScalar(scale);
      gem.position.set(
        Math.cos(ang) * 1.62,
        isLit ? 0.24 + (i % 2) * 0.06 : 0.1,
        Math.sin(ang) * 1.62
      );
      this.lobbyHaloGroup.add(gem);
    }

    this.lobbyHaloGroup.visible = this.phase === GamePhase.TITLE;
    this.entitiesGroup.add(this.lobbyHaloGroup);

    // Ornate 3D Celestial Marble-Gold Sanctuary Backdrop (exclusively visible in Lobby)
    if (this.lobbySanctuary) {
      this.releaseObject(this.lobbySanctuary.group);
      this.lobbySanctuary = null;
    }
    this.lobbySanctuary = createCelestialSanctuaryBackdrop(
      floorTheme.floorHex,
      floorTheme.ringHex,
      floorTheme.pillarGlowHex,
      this.isSoftwareGl || this.lowEndGpu
    );
    this.lobbySanctuary.group.visible = this.phase === GamePhase.TITLE;
    this.scene.add(this.lobbySanctuary.group);
    this.arenaGroup.visible = this.phase !== GamePhase.TITLE;

    this.lobbySanctuaryDustSeeds = [];
    for (let i = 0; i < this.lobbySanctuary.dustCount; i++) {
      const ang = (i / this.lobbySanctuary.dustCount) * Math.PI * 2 + (i % 5) * 0.41;
      const rad = 2.0 + ((i * 1.73) % 7.5);
      this.lobbySanctuaryDustSeeds.push({
        x: Math.cos(ang) * rad,
        y: 0.4 + ((i * 0.67) % 5.4),
        z: 1.8 + Math.sin(ang) * rad * 0.72,
        speed: 0.22 + (i % 4) * 0.08,
        phase: i * 0.9,
        scale: 0.65 + (i % 3) * 0.35,
      });
    }
  }

  public setLobbySkyTheme(themeId: LobbySkyThemeId): void {
    if (this.lobbySkyThemeId === themeId) return;
    this.lobbySkyThemeId = themeId;
    if (this.hero) {
      this.rebuildLobbyPedestal();
    }
  }

  public setLobbyWeather(weatherId: LobbyWeatherId): void {
    this.lobbyWeatherId = weatherId;
    if (this.starfallMesh) {
      this.starfallMesh.visible = this.starfallEnabled && weatherId !== 'clear';
    }
  }

  public setSanctuaryFloorTheme(floorId: SanctuaryFloorId): void {
    this.sanctuaryFloorThemeId = floorId;
    const def = SANCTUARY_FLOOR_MAP[floorId] ?? SANCTUARY_FLOOR_MAP.marble_gold;
    if (this.floorMesh) {
      const mat = this.floorMesh.material as THREE.MeshStandardMaterial;
      if (mat && mat.color) {
        mat.color.setHex(def.floorHex);
        mat.roughness = def.roughness;
        mat.metalness = def.metalness;
        mat.needsUpdate = true;
      }
    }
    if (this.hero) {
      this.rebuildLobbyPedestal();
    }
  }

  public resetLobbyOrbit(): void {
    this.lobbyTargetYaw = 0;
    this.lobbyTargetPitch = 0;
    this.lobbyTargetZoom = 0;
    this.lobbyAutoSpinIdleTimer = 3.5;
  }

  public adjustLobbyZoom(delta: number): void {
    this.lobbyTargetZoom = Math.max(-2.6, Math.min(3.4, this.lobbyTargetZoom + delta));
    this.lobbyAutoSpinIdleTimer = Math.max(this.lobbyAutoSpinIdleTimer, 2.5);
  }

  public setLobbyInspectMode(active: boolean, autoRotate = true): void {
    this.lobbyInspectActive = active;
    this.lobbyInspectAutoRotate = autoRotate;
    if (active) {
      this.lobbyTargetPitch = 0.04;
      this.lobbyTargetZoom = -1.65;
    } else {
      this.lobbyTargetPitch = 0;
      this.lobbyTargetZoom = 0;
    }
    soundEngine.playInspectFocusWhoosh(active);
  }

  public setLobbyInspectAutoRotate(autoRotate: boolean): void {
    this.lobbyInspectAutoRotate = autoRotate;
  }

  public getRunCombatHighlights(): RunCombatHighlights {
    return {
      weakPointHits: this.runWeakPointHits,
      trapsTriggered: this.runTrapsTriggered,
      perfectDodgesCount: this.perfectDodgeCount,
      bountiesCompleted: this.runBountiesCompleted,
      bossBreakCount: this.runBossBreaksCount,
      peakCritDamage: this.peakCritDmg,
      elementalReactionsCount: this.elementalReactionsCount,
      damageTakenCount: this.runDamageTakenCount,
    };
  }

  public triggerRoyalEntranceVfx(accentHex = 0xfbbf24): void {
    const x = this.phase === GamePhase.TITLE ? 0 : this.px;
    const z = this.phase === GamePhase.TITLE ? 4.5 : this.pz;
    this.spawnUltColumn(x, z, accentHex, 0.85);
    this.spawnShockwave(x, z, accentHex, 5.2, 0.62);
    this.spawnShockwave(x, z, 0x38bdf8, 3.4, 0.48);
    this.spawnParticles(x, 0.9, z, accentHex, 32);
    this.spawnParticles(x, 1.8, z, 0xfef08a, 18);
    soundEngine.playPickup(true);
  }

  private triggerBossWarning(title: string, subtitle: string): void {
    this.bossWarningTitle = title;
    this.bossWarningSubtitle = subtitle;
    this.bossWarningTimer = 2.45;
  }

  public updateLoadoutAppearance(
    stats: ComputedPlayerStats,
    visualCfg: HeroVisualConfig
  ): void {
    const heroChanged = this.baseStats.heroId !== stats.heroId;
    const skinChanged = this.heroVisualCfg?.skinId !== visualCfg.skinId;
    const visualChanged = JSON.stringify(this.heroVisualCfg) !== JSON.stringify(visualCfg);
    const companionsChanged =
      heroChanged ||
      this.baseStats.equippedPetId !== stats.equippedPetId ||
      Boolean(this.baseStats.equippedPetEvolved) !== Boolean(stats.equippedPetEvolved) ||
      this.baseStats.equippedRunes.includes('healing_sprite') !==
        stats.equippedRunes.includes('healing_sprite');
    this.baseStats = stats;
    this.heroVisualCfg = visualCfg;
    this.weaponAccentHex = visualCfg.weaponAccentHex;
    // Tiến độ/tiền thưởng cập nhật save không đồng nghĩa ngoại hình thay đổi.
    if (visualChanged || heroChanged) {
      this.buildHero();
      this.refreshAppearanceGate();
      // Play a cheerful showcase flourish whenever the player switches Hero or Outfit in Lobby
      if ((heroChanged || skinChanged) && this.phase === GamePhase.TITLE && !this.disposed) {
        this.lobbyEmoteTimer = Math.max(this.lobbyEmoteTimer, 1.85);
        const { x, y, z } = this.hero.root.position;
        this.spawnShockwave(x, z, this.weaponAccentHex, 2.1, 0.36);
        this.spawnParticles(x, y + 1.15, z, this.weaponAccentHex, this.getActiveSolarLeoVariant() === 'lite' ? 8 : 16);
      }
    } else if (companionsChanged) {
      this.rebuildCompanions();
    }
  }

  private setChapter1MapStatus(status: AppearanceStatus): void {
    if (this.chapter1MapStatus === status) return;
    this.chapter1MapStatus = status;
    this.callbacks.onChapter1MapStatusChange?.(status);
  }

  private getActiveSystemBudget(): SystemLiteBudget {
    if (!this.systemBudget) {
      this.systemBudget = resolveSystemLiteBudget(
        this.gpuProfile,
        this.lowEndSafetyMode,
        this.chapter1MapMode
      );
    }
    return this.systemBudget;
  }

  private getActiveChapter1MapVariant(): 'none' | 'lite' | 'full' {
    return resolveChapter1MapVariant(
      this.gpuProfile,
      this.chapter1MapMode,
      this.lowEndSafetyMode
    );
  }

  private getActiveBoss3dModelVariant(): 'none' | 'lite' | 'high' {
    return resolveBoss3dModelVariant(
      this.gpuProfile,
      this.lowEndSafetyMode,
      this.chapter1MapMode
    );
  }

  private isSideModeActiveForBossModel(): boolean {
    return (
      this.isTowerMode ||
      this.isBossRushMode ||
      this.isDailyRiftMode ||
      this.isGuildBossMode ||
      this.isArenaMode ||
      this.isCoopRaidMode ||
      this.isElementalTowerMode ||
      this.isCrystalDefenseMode ||
      this.isWorldBossMode ||
      this.isBloodMoonMode ||
      this.isAbyssalMode ||
      this.isGuildWarMode ||
      this.isPantheonMode ||
      this.isChampionshipMode ||
      this.isCrystalVaultMode ||
      this.isDragonLairMode ||
      this.isSkyCitadelMode ||
      this.isTrainingMode ||
      this.isEqualizedRiftMode
    );
  }

  private prefetchSolarLionBossModel(): void {
    const variant = this.getActiveBoss3dModelVariant();
    if (variant === 'none') return;
    const baseUrl =
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    void downloadChapter1BossArrayBuffer(variant, {
      baseUrl,
      baseUri: document.baseURI,
    }).catch(() => {});
  }

  private attachSolarLionBossModel(entity: EnemyEntity): void {
    const variant = this.getActiveBoss3dModelVariant();
    if (variant === 'none') return;
    const baseUrl =
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const assetUrl = getChapter1BossAssetUrl(variant, baseUrl, document.baseURI);

    void (async () => {
      try {
        const data = await downloadChapter1BossArrayBuffer(variant, {
          baseUrl,
          baseUri: document.baseURI,
        });
        if (this.disposed || entity.dead || entity.hp <= 0 || !this.enemies.includes(entity)) {
          return;
        }
        markBoss3dLoadInFlight();
        let gltfScene: THREE.Group | null = null;
        try {
          const gltf = await new GLTFLoader().parseAsync(data, new URL('.', assetUrl).href);
          gltfScene = gltf.scene;
        } finally {
          clearBoss3dLoadInFlight();
        }
        if (
          !gltfScene ||
          this.disposed ||
          entity.dead ||
          entity.hp <= 0 ||
          !this.enemies.includes(entity)
        ) {
          if (gltfScene) this.releaseObject(gltfScene);
          return;
        }

        const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
        const prepared = prepareChapter1BossModel(gltfScene, maxAniso, {
          liteMode: variant === 'lite',
        });

        // Keep breakable boss weak-point meshes visible while hiding the procedural body parts
        const preservedPartMeshes = new Set<THREE.Object3D>();
        if (entity.bossPartMeshes) {
          for (const list of Object.values(entity.bossPartMeshes)) {
            list?.forEach((m) => preservedPartMeshes.add(m));
          }
        }
        if (entity.model.bossAuraRing) preservedPartMeshes.add(entity.model.bossAuraRing);

        for (const child of entity.model.bodyGroup.children) {
          if (!preservedPartMeshes.has(child)) {
            child.visible = false;
          }
        }

        entity.model.bodyGroup.add(prepared.group);
        entity.solarLionVisualGroup = prepared.group;
        entity.autoRig = prepared.rigInstance;
        entity.solarLionBurstType = 'roar';
        entity.solarLionBurstTimer = 0.45;
        if (prepared.rigInstance.primaryTrailAnchors.length > 0) {
          const cal = AUTO_RIG_CALIBRATION.solar_lion_boss;
          entity.boneTrails = createBoneTrailController(
            prepared.rigInstance.primaryTrailAnchors,
            {
              colorHex: cal.trailColorHex,
              accentHex: cal.trailAccentHex,
              width: cal.trailWidth,
              liteMode: this.lowEndGpu,
            }
          );
          this.scene.add(entity.boneTrails.group);
        }
        if (prepared.hitMeshes.length > 0) {
          entity.model.hitMeshes = prepared.hitMeshes;
        }
      } catch (error) {
        clearBoss3dLoadInFlight();
        if (!this.disposed) {
          console.warn(
            `Không tải được Boss Sư Tử 3D (${variant}); giữ mô hình Boss dự phòng.`,
            error
          );
        }
      }
    })();
  }

  private prefetchCampaignRosterModels(chapterId: number): void {
    const assets: readonly CampaignRosterAssetId[] =
      chapterId === 3
        ? CHAPTER3_ROSTER_ASSET_IDS
        : chapterId === 2
        ? CHAPTER2_ROSTER_ASSET_IDS
        : CHAPTER1_ROSTER_ASSET_IDS;
    const variant = this.getActiveBoss3dModelVariant();
    if (variant === 'none') return;
    const baseUrl =
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    if (variant === 'lite') {
      // Sequential preload in Lite mode avoids CPU/RAM spikes on low-end laptops (e.g. Dell E5430)
      void (async () => {
        for (const assetId of assets) {
          if (this.disposed) return;
          try {
            await loadChapter1RosterTemplate(assetId, variant, maxAniso, {
              baseUrl,
              baseUri: document.baseURI,
            });
          } catch {
            // Keep procedural fallback cleanly if an asset fails to preload
          }
        }
      })();
      return;
    }

    for (const assetId of assets) {
      void loadChapter1RosterTemplate(assetId, variant, maxAniso, {
        baseUrl,
        baseUri: document.baseURI,
      }).catch(() => {});
    }
  }

  private mountChapter1RosterInstance(
    entity: EnemyEntity,
    assetId: CampaignRosterAssetId,
    template: NonNullable<ReturnType<typeof getCachedChapter1RosterTemplateSync>>
  ): void {
    const visualTheme = resolveCampaignRosterVisualTheme(assetId);
    const isStage8Titan = entity.kind === EnemyKind.TITAN_BOSS;
    const heightMultiplier = isStage8Titan ? 1.18 : entity.isElite && !entity.isBoss ? 1.12 : 1.0;
    const emissiveTintHex = isStage8Titan
      ? visualTheme.titanTintHex
      : entity.isElite && !entity.isBoss
      ? 0x4c1d95
      : undefined;
    const inst = instantiateChapter1RosterModel(template, {
      heightMultiplier,
      emissiveTintHex,
      emissiveIntensity: isStage8Titan ? 0.22 : 0.16,
    });

    const preservedPartMeshes = new Set<THREE.Object3D>();
    if (entity.bossPartMeshes) {
      for (const list of Object.values(entity.bossPartMeshes)) {
        list?.forEach((m) => preservedPartMeshes.add(m));
      }
    }
    if (entity.model.bossAuraRing) preservedPartMeshes.add(entity.model.bossAuraRing);

    for (const child of entity.model.bodyGroup.children) {
      if (!preservedPartMeshes.has(child)) {
        child.visible = false;
      }
    }

    entity.model.bodyGroup.add(inst.group);
    entity.roster3dAssetId = assetId;
    entity.roster3dVisualGroup = inst.group;
    entity.autoRig = inst.rigInstance;
    entity.roster3dBaseScale = heightMultiplier;
    entity.roster3dBurstType = entity.isBoss ? 'roar' : 'none';
    entity.roster3dBurstTimer = entity.isBoss ? 0.42 : 0;
    if (inst.rigInstance.primaryTrailAnchors.length > 0) {
      const cal = AUTO_RIG_CALIBRATION[visualTheme.archetype];
      entity.boneTrails = createBoneTrailController(
        inst.rigInstance.primaryTrailAnchors,
        {
          colorHex: visualTheme.trailColorHex,
          accentHex: visualTheme.trailAccentHex,
          width: cal.trailWidth * heightMultiplier,
          liteMode: this.lowEndGpu,
        }
      );
      this.scene.add(entity.boneTrails.group);
    }
    if (inst.hitMeshes.length > 0) {
      entity.model.hitMeshes = inst.hitMeshes;
    }
  }

  private attachChapter1RosterModel(
    entity: EnemyEntity,
    assetId: CampaignRosterAssetId
  ): void {
    const variant = this.getActiveBoss3dModelVariant();
    if (variant === 'none') return;

    const cached = getCachedChapter1RosterTemplateSync(assetId, variant);
    if (cached) {
      this.mountChapter1RosterInstance(entity, assetId, cached);
      return;
    }

    const baseUrl =
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    void (async () => {
      markBoss3dLoadInFlight();
      try {
        const template = await loadChapter1RosterTemplate(assetId, variant, maxAniso, {
          baseUrl,
          baseUri: document.baseURI,
        });
        clearBoss3dLoadInFlight();
        if (this.disposed || entity.dead || entity.hp <= 0 || !this.enemies.includes(entity)) {
          return;
        }
        if (entity.roster3dVisualGroup) return;
        this.mountChapter1RosterInstance(entity, assetId, template);
      } catch (error) {
        clearBoss3dLoadInFlight();
        if (!this.disposed) {
          console.warn(
            `Không tải được mô hình chiến dịch 3D (${assetId}:${variant}); giữ mô hình dự phòng.`,
            error
          );
        }
      }
    })();
  }

  private unloadChapter1MapModel(): void {
    if (this.chapter1MapInFlightMarked) {
      clearChapter1MapLoadInFlight();
      clearHeavyAssetLoadInFlight();
      this.chapter1MapInFlightMarked = false;
      this.chapter1MapStableFrames = 0;
    }
    if (this.chapter1MapModel) {
      if (this.chapter1MapModel.parent === this.arenaGroup) {
        this.arenaGroup.remove(this.chapter1MapModel);
      }
      this.releaseObject(this.chapter1MapModel);
      this.chapter1MapModel = null;
    }
    this.chapterMapLoadedChapterId = null;
    this.chapterMapRequestedVariant = 'none';
    this.chapter1MapLoadedVariant = 'none';
    if (this.proceduralArenaShell) {
      this.proceduralArenaShell.visible = true;
    }
  }

  public resetGpuCrashGuard(): GpuProfileSummary {
    resetGpuCrashSentinel();
    this.gpuProfile = refreshStartupGpuProfile();
    this.isSoftwareGl = this.gpuProfile.tier === 'software';
    this.systemBudget = resolveSystemLiteBudget(
      this.gpuProfile,
      this.lowEndSafetyMode,
      this.chapter1MapMode
    );
    this.lowEndGpu = this.systemBudget.liteActive;
    this.chapter1MapFailCount = 0;
    this.ensureEnvironmentReflections();
    this.syncCanvasResolution();
    if (!this.isSoftwareGl && !this.lowEndGpu && this.graphicsQuality !== 'low' && this.bloomEnabled && !this.composer) {
      this.setupPostProcessing();
    }
    this.syncSolarLeoVisuals();
    this.syncPostProcessingUniforms();
    this.callbacks.onGpuSafetyTriggered?.(this.gpuProfile);
    return this.gpuProfile;
  }

  private getCustomMapChapterId(chapterId = this.currentChapter.id): 1 | 2 | 3 | null {
    return chapterId === 1 || chapterId === 2 || chapterId === 3 ? chapterId : null;
  }

  private applyChapter1MapState(): void {
    const targetVariant = this.getActiveChapter1MapVariant();
    const activeChapterId = this.getCustomMapChapterId();
    const wantsCustomMap =
      activeChapterId !== null &&
      targetVariant !== 'none' &&
      this.chapterMapLoadedChapterId === activeChapterId &&
      this.chapterMapRequestedVariant === targetVariant &&
      !!this.chapter1MapModel;
    if (wantsCustomMap && this.chapter1MapModel) {
      if (this.chapter1MapModel.parent !== this.arenaGroup) {
        this.arenaGroup.add(this.chapter1MapModel);
      }
      this.chapter1MapModel.visible = true;
      if (this.proceduralArenaShell) {
        this.proceduralArenaShell.visible = false;
      }
    } else {
      if (this.chapter1MapModel?.parent === this.arenaGroup) {
        this.arenaGroup.remove(this.chapter1MapModel);
      }
      if (this.proceduralArenaShell) {
        this.proceduralArenaShell.visible = true;
      }
    }
  }

  private ensureChapter1MapLoaded(explicitChapterId?: number): void {
    const targetChapterId = this.getCustomMapChapterId(explicitChapterId);
    const targetVariant = this.getActiveChapter1MapVariant();
    if (targetChapterId === null || targetVariant === 'none') {
      // Single-VRAM residency: unload heavy custom arena maps on chapters without custom GLB
      // or when Light Arena / Safe Mode is active.
      this.chapterMapRequestToken += 1;
      this.unloadChapter1MapModel();
      if (targetChapterId === 1 || targetVariant === 'none') {
        this.setChapter1MapStatus('ready');
      }
      this.applyChapter1MapState();
      return;
    }
    if (
      this.chapter1MapModel &&
      this.chapterMapLoadedChapterId === targetChapterId &&
      this.chapterMapRequestedVariant === targetVariant
    ) {
      if (targetChapterId === 1) {
        this.setChapter1MapStatus('ready');
      }
      this.applyChapter1MapState();
      return;
    }
    if (
      this.chapter1MapModel &&
      (this.chapterMapLoadedChapterId !== targetChapterId ||
        this.chapterMapRequestedVariant !== targetVariant)
    ) {
      // Release previous chapter's 3D map before allocating the next one (max 1 map in VRAM)
      this.unloadChapter1MapModel();
    }
    if (
      (this.chapter1MapLoading &&
        this.chapterMapLoadingChapterId === targetChapterId &&
        this.chapter1MapLoadingVariant === targetVariant) ||
      this.chapter1MapFailCount >= 3
    ) {
      return;
    }

    const requestToken = ++this.chapterMapRequestToken;
    this.chapter1MapLoading = true;
    this.chapterMapLoadingChapterId = targetChapterId;
    this.chapter1MapLoadingVariant = targetVariant;
    if (targetChapterId === 1) {
      this.setChapter1MapStatus('loading');
    }

    const baseUrl =
      (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    const baseUri = typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/';

    void (async () => {
      let data: ArrayBuffer | undefined;
      let resolvedVariant: 'lite' | 'full' = targetVariant;
      try {
        let assetUrl: URL;
        if (targetChapterId === 1) {
          assetUrl =
            targetVariant === 'lite'
              ? getChapter1MapLiteAssetUrl(baseUrl, baseUri)
              : getChapter1MapAssetUrl(baseUrl, baseUri);
          data = await downloadChapter1Map(targetVariant);
        } else if (targetChapterId === 2) {
          const ch2Result = await downloadChapter2Map(targetVariant);
          data = ch2Result.buffer;
          resolvedVariant = ch2Result.resolvedVariant;
          assetUrl =
            resolvedVariant === 'lite'
              ? getChapter2MapLiteAssetUrl(baseUrl, baseUri)
              : getChapter2MapHighAssetUrl(baseUrl, document.baseURI);
        } else {
          const ch3Result = await downloadChapter3Map(targetVariant);
          data = ch3Result.buffer;
          resolvedVariant = ch3Result.resolvedVariant;
          assetUrl =
            resolvedVariant === 'lite'
              ? getChapter3MapLiteAssetUrl(baseUrl, baseUri)
              : getChapter3MapHighAssetUrl(baseUrl, baseUri);
        }

        if (
          this.disposed ||
          this.chapterMapRequestToken !== requestToken ||
          this.getActiveChapter1MapVariant() !== targetVariant
        ) {
          if (!this.disposed && targetChapterId === 1 && this.getActiveChapter1MapVariant() === 'none') {
            this.setChapter1MapStatus('ready');
          }
          return;
        }

        // Latch crash sentinel right before decoding GLB geometry & uploading textures.
        // Cleared automatically after 2 stable frames render without webglcontextlost.
        if (targetChapterId === 1) {
          markChapter1MapLoadInFlight();
        } else if (targetChapterId === 2) {
          markHeavyAssetLoadInFlight('Bản Đồ 3D Chương 2 · Lò Rèn Bạch Dương');
        } else {
          markHeavyAssetLoadInFlight('Bản Đồ 3D Chương 3 · Thánh Địa Ngọc Lục Bảo');
        }
        this.chapter1MapInFlightMarked = true;
        this.chapter1MapStableFrames = 0;

        const parseBaseHref =
          assetUrl.protocol === 'http:' || assetUrl.protocol === 'https:'
            ? new URL('.', assetUrl).href
            : '';
        const gltf = await new GLTFLoader().parseAsync(data, parseBaseHref);
        if (
          this.disposed ||
          this.chapterMapRequestToken !== requestToken ||
          this.getActiveChapter1MapVariant() !== targetVariant
        ) {
          this.releaseObject(gltf.scene);
          clearChapter1MapLoadInFlight();
          clearHeavyAssetLoadInFlight();
          this.chapter1MapInFlightMarked = false;
          if (!this.disposed && targetChapterId === 1 && this.getActiveChapter1MapVariant() === 'none') {
            this.setChapter1MapStatus('ready');
          }
          return;
        }

        const budget = this.getActiveSystemBudget();
        const maxAniso = budget.liteActive ? 1 : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
        const useLiteMaterial = resolvedVariant === 'lite' || budget.liteActive;
        const prepared =
          targetChapterId === 1
            ? prepareChapter1MapModel(gltf.scene, maxAniso, { liteMode: useLiteMaterial })
            : targetChapterId === 2
              ? prepareChapter2MapModel(gltf.scene, maxAniso, { liteMode: useLiteMaterial })
              : prepareChapter3MapModel(gltf.scene, maxAniso, { liteMode: useLiteMaterial });
        sanitizeLoadedObjectForBudget(prepared.group, budget, { disableShadows: true });

        this.unloadChapter1MapModel();
        // Re-arm in-flight sentinel latch until 2 stable rendered frames confirm no GPU TDR
        if (targetChapterId === 1) {
          markChapter1MapLoadInFlight();
        } else if (targetChapterId === 2) {
          markHeavyAssetLoadInFlight('Bản Đồ 3D Chương 2 · Lò Rèn Bạch Dương');
        } else {
          markHeavyAssetLoadInFlight('Bản Đồ 3D Chương 3 · Thánh Địa Ngọc Lục Bảo');
        }
        this.chapter1MapInFlightMarked = true;
        this.chapter1MapStableFrames = 0;

        this.chapter1MapModel = prepared.group;
        this.chapterMapLoadedChapterId = targetChapterId;
        this.chapterMapRequestedVariant = targetVariant;
        this.chapter1MapLoadedVariant = resolvedVariant;
        this.chapter1MapFailCount = 0;
        this.applyChapter1MapState();
        if (targetChapterId === 1) {
          this.setChapter1MapStatus('ready');
        }
      } catch (error) {
        clearChapter1MapLoadInFlight();
        clearHeavyAssetLoadInFlight();
        this.chapter1MapInFlightMarked = false;
        if (data) {
          if (targetChapterId === 1) {
            discardChapter1MapDownload(targetVariant, data);
          } else if (targetChapterId === 2) {
            discardChapter2MapDownload(targetVariant, data);
          } else {
            discardChapter3MapDownload(targetVariant, data);
          }
        }
        if (
          !this.disposed &&
          this.chapterMapRequestToken === requestToken &&
          this.getActiveChapter1MapVariant() === targetVariant
        ) {
          this.chapter1MapFailCount += 1;
          if (targetChapterId === 1) {
            this.setChapter1MapStatus('error');
          }
          console.warn(
            `Không tải được Map Chương ${targetChapterId} GLB (${targetVariant}); giữ sân đấu mặc định.`,
            error
          );
        }
      } finally {
        if (this.chapterMapRequestToken === requestToken) {
          this.chapter1MapLoading = false;
          this.chapterMapLoadingChapterId = null;
          this.chapter1MapLoadingVariant = 'none';
        }
      }
    })();
  }

  private buildArena(chapter: ChapterDefinition, loadCustomMap = true): void {
    this.arenaBrazierGems = [];
    this.arenaBrazierFlames = [];
    this.arenaLightShafts = [];
    this.constellationGroup = null;
    this.chapterWeatherPoints = null;
    this.chapterWeatherProfile = null;
    this.skyDomeMesh = null;
    this.skyDomeMat = null;
    this.proceduralArenaShell = null;
    this.chapter2ForgeAtmosphere = null;
    this.chapter3SanctuaryAtmosphere = null;
    // Keep cached custom 3D map detached only if it matches the chapter being built;
    // otherwise unload it immediately so at most one heavy 3D arena resides in VRAM.
    if (this.chapter1MapModel && this.chapterMapLoadedChapterId !== chapter.id) {
      this.unloadChapter1MapModel();
    } else if (this.chapter1MapModel?.parent === this.arenaGroup) {
      this.arenaGroup.remove(this.chapter1MapModel);
    }
    while (this.arenaGroup.children.length > 0) {
      this.releaseObject(this.arenaGroup.children[0]);
    }

    const themeSpec = resolveZodiacArenaStyle(chapter.zodiacId);
    this.arenaThemeSpec = themeSpec;
    this.scene.background = new THREE.Color(chapter.skyHex);
    this.scene.fog = new THREE.FogExp2(chapter.fogHex, 0.0175);
    this.keyLight.color.setHex(chapter.keyLightHex);
    this.hemiLight.color.setHex(chapter.hemiSkyHex);
    this.hemiLight.groundColor.setHex(chapter.hemiGroundHex);
    this.rimLight.color.setHex(themeSpec.rimLightHex);
    if (this.arenaDustMesh) {
      const dustMat = this.arenaDustMesh.material as THREE.MeshBasicMaterial;
      if (dustMat && 'color' in dustMat) dustMat.color.setHex(themeSpec.dustHex);
    }

    // Wave 10: Dynamic 3D Procedural GLSL Sky Dome (biome + boss phase + resonance reactive)
    const skyTargets = computeDynamicSkyShaderTargets({
      skyHex: chapter.skyHex,
      fogHex: chapter.fogHex,
      rimLightHex: themeSpec.rimLightHex,
      bossPhase: 1,
      resonanceRatio: 0,
    });
    this.skyDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uZenithColor: { value: new THREE.Color(skyTargets.zenithHex) },
        uHorizonColor: { value: new THREE.Color(skyTargets.horizonHex) },
        uNebulaColor: { value: new THREE.Color(skyTargets.nebulaHex) },
        uAuroraColor: { value: new THREE.Color(skyTargets.auroraHex) },
        uTurbulence: { value: skyTargets.turbulence },
        uPhaseIntensity: { value: skyTargets.phaseIntensity },
        uSimpleMode: { value: this.isSoftwareGl || this.lowEndGpu ? 1.0 : 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uZenithColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uNebulaColor;
        uniform vec3 uAuroraColor;
        uniform float uTurbulence;
        uniform float uPhaseIntensity;
        uniform float uSimpleMode;
        varying vec3 vWorldDir;

        void main() {
          float h = smoothstep(-0.08, 0.74, vWorldDir.y);
          vec3 col = mix(uHorizonColor, uZenithColor, h);
          float angle = atan(vWorldDir.z, vWorldDir.x);

          if (uSimpleMode > 0.5) {
            float band = sin(angle * 3.0 + uTime * 0.28) * 0.5 + 0.5;
            float ribbon = smoothstep(0.05, 0.45, vWorldDir.y) * (1.0 - smoothstep(0.45, 0.85, vWorldDir.y));
            col += uAuroraColor * band * ribbon * (0.12 + uPhaseIntensity * 0.16);
          } else {
            float waveA = sin(angle * 4.0 + uTime * 0.35 * uTurbulence + vWorldDir.y * 5.0);
            float waveB = cos(angle * 7.0 - uTime * 0.48 * uTurbulence + vWorldDir.y * 8.0);
            float nebulaBand = smoothstep(-0.2, 0.65, waveA * 0.55 + waveB * 0.45);
            float horizonMask = smoothstep(0.02, 0.36, vWorldDir.y) * (1.0 - smoothstep(0.55, 0.96, vWorldDir.y));
            col += uNebulaColor * nebulaBand * horizonMask * (0.14 + uPhaseIntensity * 0.24);
            float aurora = pow(max(0.0, sin(angle * 2.0 + vWorldDir.y * 4.5 - uTime * 0.4)), 3.0) * horizonMask;
            col += uAuroraColor * aurora * (0.18 + uPhaseIntensity * 0.22);
            float starSeed = fract(sin(dot(floor(vWorldDir * 68.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            float starMask = step(0.992, starSeed) * smoothstep(0.18, 0.75, vWorldDir.y);
            col += vec3(0.95, 0.97, 1.0) * starMask * (0.55 + 0.45 * sin(uTime * 2.2 + starSeed * 31.4));
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const arenaBudget = this.getActiveSystemBudget();
    this.skyDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(92, arenaBudget.liteActive ? 16 : 32, arenaBudget.liteActive ? 10 : 20),
      this.skyDomeMat
    );
    this.skyDomeMesh.renderOrder = -10;
    this.arenaGroup.add(this.skyDomeMesh);

    const maxAniso = arenaBudget.liteActive
      ? 1
      : Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    const floorTex = createStoneTileTexture(
      chapter.floorPrimary,
      chapter.floorAccent,
      maxAniso
    );
    const normalTex = arenaBudget.liteActive ? null : createStoneNormalTexture(maxAniso);
    const roughnessTex = arenaBudget.liteActive ? null : createStoneRoughnessTexture(maxAniso);

    const proceduralShell = new THREE.Group();
    proceduralShell.name = 'ProceduralArenaShell';
    this.proceduralArenaShell = proceduralShell;
    this.arenaGroup.add(proceduralShell);

    // 1. High-Contrast Mythic PBR Marble Temple Arena Floor (Lite skips tangent-space normal/roughness maps)
    const floorGeo = new THREE.BoxGeometry(ARENA_HALF_W * 2 + 1.6, 1.4, ARENA_HALF_D * 2 + 1.6);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      ...(normalTex ? { normalMap: normalTex, normalScale: new THREE.Vector2(0.85, 0.85) } : {}),
      ...(roughnessTex ? { roughnessMap: roughnessTex } : {}),
      roughness: 0.92,
      metalness: arenaBudget.liteActive ? 0.14 : 0.28,
      envMapIntensity: arenaBudget.environmentReflections ? 1.45 : 0.6,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, -0.7, 0);
    this.floorMesh.receiveShadow = !arenaBudget.liteActive && arenaBudget.shadowMapSize > 0;
    proceduralShell.add(this.floorMesh);

    const marbleMat = new THREE.MeshStandardMaterial({
      color: chapter.stoneHex,
      roughness: 0.44,
      metalness: 0.22,
      envMapIntensity: 1.15,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfcd34d,
      roughness: 0.2,
      metalness: 0.94,
      envMapIntensity: 1.55,
    });
    const chapterGlowMat = new THREE.MeshStandardMaterial({
      color: chapter.trimHex,
      emissive: chapter.trimHex,
      emissiveIntensity: 1.55,
      roughness: 0.12,
      metalness: 0.32,
    });

    // 2. Flush Inlaid Celestial Astrolabe Floor Medallion (Center spatial orientation)
    const compassGroup = new THREE.Group();
    compassGroup.position.y = 0.018;
    const outerCompass = new THREE.Mesh(
      new THREE.RingGeometry(4.45, 4.66, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfcd34d,
        transparent: true,
        opacity: 0.34,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    outerCompass.rotation.x = -Math.PI / 2;
    const innerCompass = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.26, 36),
      new THREE.MeshBasicMaterial({
        color: chapter.trimHex,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    innerCompass.rotation.x = -Math.PI / 2;
    compassGroup.add(outerCompass, innerCompass);
    const spokeGeo = new THREE.PlaneGeometry(0.11, 8.8);
    const spokeMat = new THREE.MeshBasicMaterial({
      color: 0xfcd34d,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.x = -Math.PI / 2;
      spoke.rotation.z = (s * Math.PI) / 4;
      compassGroup.add(spoke);
    }
    proceduralShell.add(compassGroup);

    // 3. Stepped Sanctuary Terrace & Double Gilded Cornice Perimeter
    const outerTerrace = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA_HALF_W * 2 + 5.4, 1.3, ARENA_HALF_D * 2 + 5.4),
      marbleMat
    );
    outerTerrace.position.set(0, -1.3, 0);
    outerTerrace.receiveShadow = true;
    proceduralShell.add(outerTerrace);

    const borderThick = 0.38;
    const hBorderGeo = new THREE.BoxGeometry(ARENA_HALF_W * 2 + 1.9, 0.16, borderThick);
    const vBorderGeo = new THREE.BoxGeometry(borderThick, 0.16, ARENA_HALF_D * 2 + 1.9);
    const nEdge = new THREE.Mesh(hBorderGeo, goldTrimMat);
    nEdge.position.set(0, 0.06, -ARENA_HALF_D - 0.78);
    const sEdge = new THREE.Mesh(hBorderGeo, goldTrimMat);
    sEdge.position.set(0, 0.06, ARENA_HALF_D + 0.78);
    const wEdge = new THREE.Mesh(vBorderGeo, goldTrimMat);
    wEdge.position.set(-ARENA_HALF_W - 0.78, 0.06, 0);
    const eEdge = new THREE.Mesh(vBorderGeo, goldTrimMat);
    eEdge.position.set(ARENA_HALF_W + 0.78, 0.06, 0);
    proceduralShell.add(nEdge, sEdge, wEdge, eEdge);

    // 4. Perimeter Gilded Temple Colonnade (4 batched InstancedMeshes for ultra-low draw calls)
    const postPositions: Array<[number, number]> = [];
    for (let x = -10; x <= 10; x += 2.5) {
      if (Math.abs(x) > 1.8) postPositions.push([x, -ARENA_HALF_D - 1.18]);
      postPositions.push([x, ARENA_HALF_D + 1.18]);
    }
    for (let z = -10; z <= 10; z += 2.5) {
      postPositions.push([-ARENA_HALF_W - 1.18, z]);
      postPositions.push([ARENA_HALF_W + 1.18, z]);
    }
    const postCount = postPositions.length;
    const plinthInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.46, 0.54, 0.34, 8),
      marbleMat,
      postCount
    );
    const shaftInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.28, 0.34, 1.55, 10),
      marbleMat,
      postCount
    );
    const collarInst = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.42, 0.36, 0.14, 8),
      goldTrimMat,
      postCount
    );
    const finialInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.16, 0),
      chapterGlowMat,
      postCount
    );
    shaftInst.castShadow = !this.isSoftwareGl && arenaBudget.shadowMapSize > 0;
    shaftInst.receiveShadow = !arenaBudget.liteActive && arenaBudget.shadowMapSize > 0;
    plinthInst.receiveShadow = !arenaBudget.liteActive && arenaBudget.shadowMapSize > 0;

    postPositions.forEach(([px, pz], idx) => {
      const isSouthCutaway = pz > ARENA_HALF_D;
      const hScale = isSouthCutaway ? 0.24 : 0.94 + (idx % 3) * 0.07;
      _dummy.rotation.set(0, idx * 0.35, 0);

      _dummy.position.set(px, 0.17, pz);
      _dummy.scale.set(1, isSouthCutaway ? 0.65 : 1, 1);
      _dummy.updateMatrix();
      plinthInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(px, (isSouthCutaway ? 0.22 : 0.34) + 0.775 * hScale, pz);
      _dummy.scale.set(1, hScale, 1);
      _dummy.updateMatrix();
      shaftInst.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(px, (isSouthCutaway ? 0.22 : 0.34) + 1.56 * hScale, pz);
      _dummy.scale.set(1, isSouthCutaway ? 0.75 : 1, 1);
      _dummy.updateMatrix();
      collarInst.setMatrixAt(idx, _dummy.matrix);

      if (isSouthCutaway) {
        _dummy.position.set(px, -5, pz);
        _dummy.scale.set(0.001, 0.001, 0.001);
      } else {
        _dummy.position.set(px, 0.62 + 1.56 * hScale, pz);
        _dummy.scale.set(0.85, 1.35, 0.85);
      }
      _dummy.updateMatrix();
      finialInst.setMatrixAt(idx, _dummy.matrix);
    });
    for (const inst of [plinthInst, shaftInst, collarInst, finialInst]) {
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      proceduralShell.add(inst);
    }

    // 5. Four Corner 12-Zodiac Elemental Shrines (4 distinct architectural silhouettes)
    const cornerCoords: Array<[number, number]> = [
      [-ARENA_HALF_W - 1.25, -ARENA_HALF_D - 1.25],
      [ARENA_HALF_W + 1.25, -ARENA_HALF_D - 1.25],
      [-ARENA_HALF_W - 1.25, ARENA_HALF_D + 1.25],
      [ARENA_HALF_W + 1.25, ARENA_HALF_D + 1.25],
    ];
    const shrineStyle = themeSpec.style;
    const brazierBaseGeo = new THREE.CylinderGeometry(0.65, 0.88, 0.72, 8);
    const brazierBowlGeo = new THREE.TorusGeometry(0.56, 0.08, 8, 18);
    const brazierGemGeo = new THREE.OctahedronGeometry(0.4, 0);
    const frostPetalGeo = new THREE.ConeGeometry(0.2, 0.75, 4);
    const orreryRingGeo = new THREE.TorusGeometry(0.58, 0.045, 6, 20);
    const monolithShaftGeo = new THREE.CylinderGeometry(0.32, 0.46, 1.35, 6);
    const monolithCrownGeo = new THREE.CylinderGeometry(0.54, 0.44, 0.16, 6);

    for (const [cx, cz] of cornerCoords) {
      const bBase = new THREE.Mesh(brazierBaseGeo, marbleMat);
      bBase.position.set(cx, 0.36, cz);
      const bRing = new THREE.Mesh(brazierBowlGeo, goldTrimMat);
      bRing.rotation.x = Math.PI / 2;
      bRing.position.set(cx, 0.8, cz);
      proceduralShell.add(bBase, bRing);

      const topper = new THREE.Group();
      topper.position.set(cx, 1.5, cz);

      if (shrineStyle === 'solar_obelisk') {
        const core = new THREE.Mesh(brazierGemGeo, chapterGlowMat);
        core.scale.set(0.82, 1.75, 0.82);
        const solarHalo = new THREE.Mesh(orreryRingGeo, goldTrimMat);
        solarHalo.rotation.x = Math.PI / 2;
        solarHalo.scale.setScalar(0.88);
        topper.add(core, solarHalo);
      } else if (shrineStyle === 'frost_lotus') {
        const spire = new THREE.Mesh(brazierGemGeo, chapterGlowMat);
        spire.scale.set(0.7, 1.5, 0.7);
        topper.add(spire);
        for (let p = 0; p < 4; p++) {
          const petal = new THREE.Mesh(frostPetalGeo, chapterGlowMat);
          const ang = (p * Math.PI) / 2;
          petal.position.set(Math.cos(ang) * 0.34, -0.18, Math.sin(ang) * 0.34);
          petal.rotation.z = -Math.cos(ang) * 0.55;
          petal.rotation.x = Math.sin(ang) * 0.55;
          topper.add(petal);
        }
      } else if (shrineStyle === 'astral_orrery') {
        const core = new THREE.Mesh(brazierGemGeo, chapterGlowMat);
        core.scale.setScalar(0.72);
        const outerGyro = new THREE.Mesh(orreryRingGeo, goldTrimMat);
        outerGyro.rotation.set(0.65, 0.4, 0);
        const innerGyro = new THREE.Mesh(orreryRingGeo, chapterGlowMat);
        innerGyro.scale.setScalar(0.72);
        innerGyro.rotation.set(-0.75, 0.8, 0.4);
        topper.add(core, outerGyro, innerGyro);
      } else {
        // earth_monolith
        const pillar = new THREE.Mesh(monolithShaftGeo, marbleMat);
        pillar.position.set(cx, 1.02, cz);
        const crown = new THREE.Mesh(monolithCrownGeo, goldTrimMat);
        crown.position.set(cx, 1.72, cz);
        proceduralShell.add(pillar, crown);
        const keystone = new THREE.Mesh(brazierGemGeo, chapterGlowMat);
        keystone.scale.set(0.92, 1.28, 0.92);
        topper.position.set(cx, 2.22, cz);
        topper.add(keystone);
      }

      this.arenaBrazierGems.push(topper);
      proceduralShell.add(topper);

      // AAA Wave 6: Flickering Dynamic Brazier Flames reacting to Boss Phase rage (skipped in Lite mode)
      if (arenaBudget.enableBrazierFlames) {
        const flameGroup = new THREE.Group();
        const flameBaseY = shrineStyle === 'earth_monolith' ? 2.66 : 1.04;
        flameGroup.position.set(cx, flameBaseY, cz);
        const outerFlameGeo = new THREE.ConeGeometry(0.32, 0.95, 7);
        outerFlameGeo.translate(0, 0.45, 0);
        const outerFlameMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.74,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);

        const coreFlameGeo = new THREE.ConeGeometry(0.16, 0.56, 6);
        coreFlameGeo.translate(0, 0.28, 0);
        const coreFlameMat = new THREE.MeshBasicMaterial({
          color: 0xfffbeb,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const coreFlame = new THREE.Mesh(coreFlameGeo, coreFlameMat);
        flameGroup.add(outerFlame, coreFlame);
        proceduralShell.add(flameGroup);
        this.arenaBrazierFlames.push({
          group: flameGroup,
          outer: outerFlame,
          core: coreFlame,
          baseX: cx,
          baseY: flameBaseY,
          baseZ: cz,
        });
      }
    }

    // 6. Distant Obsidian Temple Spires & Crown Crystals (scaled to SystemLiteBudget across all 12 chapters)
    const monolithCount = Math.max(4, arenaBudget.arenaMonolithCount);
    const spireGeo = new THREE.CylinderGeometry(0.95, 2.05, 16, 6);
    const spireTipGeo = new THREE.OctahedronGeometry(1.1, 0);
    const monoliths = new THREE.InstancedMesh(spireGeo, marbleMat, monolithCount);
    const monolithTips = new THREE.InstancedMesh(spireTipGeo, chapterGlowMat, monolithCount);
    for (let i = 0; i < monolithCount; i++) {
      const ang = (i / monolithCount) * Math.PI * 2;
      const dist = 24 + (i % 4) * 5.5;
      const baseY = -5.5 + (i % 3) * 2.4;
      const sy = 0.78 + (i % 4) * 0.28;
      _dummy.position.set(Math.cos(ang) * dist, baseY, Math.sin(ang) * dist);
      _dummy.scale.set(0.8 + (i % 3) * 0.3, sy, 0.8 + (i % 2) * 0.28);
      _dummy.rotation.set(0, ang, (i % 2 === 0 ? 1 : -1) * 0.03);
      _dummy.updateMatrix();
      monoliths.setMatrixAt(i, _dummy.matrix);

      _dummy.position.set(Math.cos(ang) * dist, baseY + 8.3 * sy, Math.sin(ang) * dist);
      _dummy.scale.set(0.7, 1.35, 0.7);
      _dummy.rotation.set(0, ang, 0);
      _dummy.updateMatrix();
      monolithTips.setMatrixAt(i, _dummy.matrix);
    }
    monoliths.instanceMatrix.needsUpdate = true;
    monoliths.computeBoundingSphere();
    monolithTips.instanceMatrix.needsUpdate = true;
    monolithTips.computeBoundingSphere();
    proceduralShell.add(monoliths, monolithTips);

    // 7. Drifting Ambient Celestial Temple Dust Motes (single InstancedMesh, budget-scaled across all chapters)
    const arenaDustCount = arenaBudget.arenaDustCount;
    this.arenaDustSeeds = [];
    this.arenaDustMesh = null;
    if (arenaDustCount > 0) {
      const arenaDustMat = new THREE.MeshBasicMaterial({
        color: chapter.trimHex,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.arenaDustMesh = new THREE.InstancedMesh(
        new THREE.OctahedronGeometry(0.055, 0),
        arenaDustMat,
        arenaDustCount
      );
      this.arenaDustMesh.frustumCulled = false;
      for (let i = 0; i < arenaDustCount; i++) {
        this.arenaDustSeeds.push({
          x: ((i * 7.31) % (ARENA_HALF_W * 2)) - ARENA_HALF_W,
          y: (i * 0.47) % 4.8,
          z: ((i * 5.83) % (ARENA_HALF_D * 2)) - ARENA_HALF_D,
          speed: 0.28 + (i % 4) * 0.09,
          phase: i * 1.13,
          scale: 0.65 + (i % 3) * 0.28,
        });
      }
      this.arenaGroup.add(this.arenaDustMesh);
    }

    // 8. AAA Wave 7: Chapter-Specific Dynamic 3D Weather Emitter (single THREE.Points, quality-scaled)
    const weatherProfile = getChapterWeatherProfile(chapter.id, this.graphicsQuality);
    this.chapterWeatherProfile = weatherProfile;
    const wCount = weatherProfile.particleCount;
    const wPositions = new Float32Array(wCount * 3);
    const wColors = new Float32Array(wCount * 3);
    const c1 = new THREE.Color(weatherProfile.colorPrimaryHex);
    const c2 = new THREE.Color(weatherProfile.colorSecondaryHex);
    for (let i = 0; i < wCount; i++) {
      wPositions[i * 3] = (((i * 11.37) % (ARENA_HALF_W * 2.4)) - ARENA_HALF_W * 1.2);
      wPositions[i * 3 + 1] = ((i * 1.93) % 10.5) + 0.4;
      wPositions[i * 3 + 2] = (((i * 9.19) % (ARENA_HALF_D * 2.4)) - ARENA_HALF_D * 1.2);
      const col = i % 3 === 0 ? c2 : c1;
      wColors[i * 3] = col.r;
      wColors[i * 3 + 1] = col.g;
      wColors[i * 3 + 2] = col.b;
    }
    const weatherGeo = new THREE.BufferGeometry();
    weatherGeo.setAttribute('position', new THREE.BufferAttribute(wPositions, 3));
    weatherGeo.setAttribute('color', new THREE.BufferAttribute(wColors, 3));
    const weatherMat = new THREE.PointsMaterial({
      size: weatherProfile.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: weatherProfile.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
    weatherPoints.frustumCulled = false;
    this.arenaGroup.add(weatherPoints);
    this.chapterWeatherPoints = weatherPoints;

    this.portal = createPortalModel(chapter.trimHex);
    this.portal.group.position.set(0, 0, -ARENA_HALF_D - 0.65);
    this.arenaGroup.add(this.portal.group);

    // 8. Volumetric-Feel Zodiac Sanctuary Light Shafts (skipped on Lite/Software GPUs)
    if (!this.isSoftwareGl && !arenaBudget.liteActive) {
      const shaftGeo = new THREE.ConeGeometry(2.8, 17, 14, 1, true);
      const shaftCoords: Array<[number, number, number, number]> = [
        [-7.8, 7.6, -ARENA_HALF_D + 1.4, 0.22],
        [7.8, 7.6, -ARENA_HALF_D + 1.4, -0.22],
        [0, 8.2, -ARENA_HALF_D + 0.6, 0.0],
      ];
      shaftCoords.forEach(([sx, sy, sz, rz], idx) => {
        const shaftMat = new THREE.MeshBasicMaterial({
          color: idx === 2 ? chapter.keyLightHex : themeSpec.rimLightHex,
          transparent: true,
          opacity: idx === 2 ? 0.068 : 0.052,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const shaft = new THREE.Mesh(shaftGeo, shaftMat);
        shaft.position.set(sx, sy, sz);
        shaft.rotation.z = rz;
        shaft.rotation.x = 0.14;
        shaft.userData.baseOpacity = idx === 2 ? 0.068 : 0.052;
        this.arenaLightShafts.push(shaft);
        this.arenaGroup.add(shaft);
      });
    }

    // 9. AAA Wave 6: Procedural Overhead 3D Zodiac Constellation Sky Dome (skipped in ultra-lite mode)
    if (arenaBudget.enableConstellationLines) {
      const constSpec = getZodiacConstellationGeometry(chapter.zodiacId);
      const constGroup = new THREE.Group();
      const starPositions = new Float32Array(constSpec.stars.length * 3);
      for (let i = 0; i < constSpec.stars.length; i++) {
        starPositions[i * 3] = constSpec.stars[i][0];
        starPositions[i * 3 + 1] = constSpec.stars[i][1];
        starPositions[i * 3 + 2] = constSpec.stars[i][2];
      }
      const starPtsGeo = new THREE.BufferGeometry();
      starPtsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starPtsMat = new THREE.PointsMaterial({
        color: chapter.trimHex,
        size: 0.85,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const starPoints = new THREE.Points(starPtsGeo, starPtsMat);
      constGroup.add(starPoints);

      const linePositions = new Float32Array(constSpec.edges.length * 6);
      for (let i = 0; i < constSpec.edges.length; i++) {
        const [aIdx, bIdx] = constSpec.edges[i];
        const a = constSpec.stars[aIdx] ?? constSpec.stars[0];
        const b = constSpec.stars[bIdx] ?? constSpec.stars[0];
        linePositions[i * 6] = a[0];
        linePositions[i * 6 + 1] = a[1];
        linePositions[i * 6 + 2] = a[2];
        linePositions[i * 6 + 3] = b[0];
        linePositions[i * 6 + 4] = b[1];
        linePositions[i * 6 + 5] = b[2];
      }
      const constLineGeo = new THREE.BufferGeometry();
      constLineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const constLineMat = new THREE.LineBasicMaterial({
        color: chapter.keyLightHex,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const constLines = new THREE.LineSegments(constLineGeo, constLineMat);
      constGroup.add(constLines);
      this.constellationGroup = constGroup;
      this.arenaGroup.add(constGroup);
    }

    if (chapter.id === 2) {
      // Chapter 2 Aries War-Forge Arena: warm lava perimeter glow + rising embers & drifting ash
      this.chapter2ForgeAtmosphere = createChapter2WarForgeAtmosphere({
        liteActive: arenaBudget.liteActive,
        isSoftwareGl: this.isSoftwareGl,
      });
      this.arenaGroup.add(this.chapter2ForgeAtmosphere.group);
      this.keyLight.color.setHex(0xffd2a6);
      this.hemiLight.color.setHex(0xffb48a);
      this.hemiLight.groundColor.setHex(0x4a120a);
    } else if (chapter.id === 3) {
      // Chapter 3 Taurus Emerald Sanctuary: emerald crystal motes, golden pollen & soft jade sanctuary glow
      this.chapter3SanctuaryAtmosphere = createChapter3EmeraldSanctuaryAtmosphere({
        liteActive: arenaBudget.liteActive,
        isSoftwareGl: this.isSoftwareGl,
      });
      this.arenaGroup.add(this.chapter3SanctuaryAtmosphere.group);
      this.keyLight.color.setHex(0xd8fbe8);
      this.hemiLight.color.setHex(0x86efac);
      this.hemiLight.groundColor.setHex(0x0b2a1c);
    }

    if ((chapter.id === 1 || chapter.id === 2 || chapter.id === 3) && loadCustomMap) {
      this.ensureChapter1MapLoaded(chapter.id);
    } else {
      this.applyChapter1MapState();
    }

    this.arenaGroup.visible = this.phase !== GamePhase.TITLE;
  }

  public startChapter(
    chapterId: number,
    stats: ComputedPlayerStats,
    nightmareTier = 0,
    initialStageIndex = 0
  ): void {
    const ch = CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0];
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isWeeklyRankedBossMode = false;
    this.weeklyBossAttemptId = null;
    this.weeklyBossSeed = null;
    this.combatRng = Math.random;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isTrainingMode = false;
    this.nightmareTier = Math.max(0, Math.min(5, Math.floor(nightmareTier || 0)));
    this.nightmareConfig = getNightmareTierConfig(ch.id, this.nightmareTier);
    this.currentChapter = ch;
    this.baseStats = stats;

    this.buildArena(ch);
    if (ch.id === 2 || ch.id === 3) {
      this.prefetchCampaignRosterModels(ch.id);
    }
    this.resetRunState(stats);
    if (ch.id === 1) {
      this.prefetchSolarLionBossModel();
      this.prefetchCampaignRosterModels(1);
    }
    const chapterRecPower = Math.round(ch.recommendedPower * (1 + this.nightmareTier * 0.35));
    this.activePowerPressure = computePowerPressure(stats.powerRating, chapterRecPower);

    this.rebuildCompanions();
    const clampedStageIdx = Math.max(
      0,
      Math.min(ch.stages.length - 1, Math.floor(initialStageIndex || 0))
    );
    this.loadStage(clampedStageIdx);
    if (this.nightmareTier > 0) {
      soundEngine.playNightmareActivate();
      const mutLabel = this.nightmareConfig.mutators.map((m) => m.name).join(' + ');
      this.stageBannerText = `${this.nightmareConfig.label.toUpperCase()} · ${mutLabel}`;
      this.stageBannerTimer = 1.55;
    }
    this.phase = GamePhase.SKILL_DRAFT;
    this.keys = {};
    this.syncHudImmediate();
    this.callbacks.onRequestSkillDraft({ ...this.activeSkills });
  }

  public startTrainingGrounds(
    stats: ComputedPlayerStats,
    targetMode: TrainingTargetMode = 'single'
  ): void {
    const ch = CHAPTERS[0];
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.nightmareTier = 0;
    this.nightmareConfig = getNightmareTierConfig(1, 0);
    this.isTrainingMode = true;
    this.trainingTargetMode = targetMode;
    this.trainingDpsState = createTrainingDpsState();
    this.trainingClockSec = 0;
    this.currentChapter = ch;
    this.baseStats = stats;

    this.buildArena(ch);
    this.resetRunState(stats);
    this.clearCombatEntities();
    this.rebuildCompanions();

    this.px = 0;
    this.pz = 4.2;
    this.pvx = 0;
    this.pvz = 0;
    this.pFacing = Math.PI;
    this.portalOpen = false;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    this.spawnTrainingDummies(targetMode);
    this.stageBannerText =
      targetMode === 'single'
        ? 'SÂN TẬP 3D · MỤC TIÊU BOSS ĐƠN'
        : 'SÂN TẬP 3D · CỤM 3 HÌNH NHÂN AOE';
    this.stageBannerTimer = 2.0;
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public setTrainingTargetMode(mode: TrainingTargetMode): void {
    if (!this.isTrainingMode) return;
    this.trainingTargetMode = mode;
    this.trainingDpsState = createTrainingDpsState();
    this.trainingClockSec = 0;
    this.clearCombatEntities();
    this.spawnTrainingDummies(mode);
    soundEngine.playTrainingReset();
    this.stageBannerText =
      mode === 'single' ? 'CHẾ ĐỘ ĐƠN MỤC TIÊU (BOSS)' : 'CHẾ ĐỘ 3 MỤC TIÊU (AOE)';
    this.stageBannerTimer = 1.6;
    this.syncHudImmediate();
  }

  public resetTrainingMetrics(): void {
    if (!this.isTrainingMode) return;
    this.trainingDpsState = createTrainingDpsState();
    this.trainingClockSec = 0;
    this.activeSkillCooldown = 0;
    this.ultCharge = 100;
    this.perfectDodgeCount = 0;
    soundEngine.playTrainingReset();
    this.syncHudImmediate();
  }

  public refreshTrainingStats(stats: ComputedPlayerStats, visualCfg?: HeroVisualConfig): void {
    if (!this.isTrainingMode) return;
    this.baseStats = stats;
    this.maxHp = stats.maxHp;
    this.hp = stats.maxHp;
    this.activeSkillCooldown = 0;
    this.activeSkillMaxCooldown = getHeroActiveSkill(stats.heroId).cooldownSec;
    if (visualCfg) {
      this.heroVisualCfg = visualCfg;
      this.weaponAccentHex = visualCfg.weaponAccentHex;
      this.buildHero();
      this.hero.root.position.set(this.px, 0, this.pz);
    }
    this.rebuildCompanions();
    this.trainingDpsState = createTrainingDpsState();
    this.trainingClockSec = 0;
    this.syncHudImmediate();
  }

  public exitTrainingGrounds(): void {
    this.isTrainingMode = false;
    this.trainingDpsState = createTrainingDpsState();
    this.trainingClockSec = 0;
    this.setPhase(GamePhase.TITLE);
  }

  private spawnTrainingDummies(mode: TrainingTargetMode): void {
    const coords: Array<[number, number, boolean]> =
      mode === 'single'
        ? [[0, -2.6, true]]
        : [
            [-2.9, -2.8, false],
            [0, -3.5, true],
            [2.9, -2.8, false],
          ];

    coords.forEach(([x, z, isBossScaled], idx) => {
      const root = new THREE.Group();
      const bodyGroup = new THREE.Group();
      root.add(bodyGroup);
      const hitMeshes: THREE.Mesh[] = [];

      // Composite 5-part grounded Zodiac Training Dummy (varied roughness/metalness, bottom-center at Y=0)
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.78,
        metalness: 0.25,
      });
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.76, 0.92, 0.28, 12),
        pedestalMat
      );
      pedestal.position.y = 0.14;
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      bodyGroup.add(pedestal);

      const postMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.85,
        metalness: 0.08,
      });
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.45, 10), postMat);
      post.position.y = 0.95;
      post.castShadow = true;
      bodyGroup.add(post);

      const torsoMat = new THREE.MeshStandardMaterial({
        color: isBossScaled ? 0xd97706 : 0x38bdf8,
        roughness: 0.34,
        metalness: 0.76,
      });
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.56, 0.44, 1.02, 12),
        torsoMat
      );
      torso.position.y = 1.24;
      torso.castShadow = true;
      bodyGroup.add(torso);
      hitMeshes.push(torso);

      const shoulderMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.28,
        metalness: 0.82,
      });
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.2, 0.22), shoulderMat);
      crossbar.position.y = 1.56;
      crossbar.castShadow = true;
      bodyGroup.add(crossbar);
      hitMeshes.push(crossbar);

      const head = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.38, 1),
        new THREE.MeshStandardMaterial({
          color: isBossScaled ? 0xfbbf24 : 0x7dd3fc,
          roughness: 0.22,
          metalness: 0.86,
        })
      );
      head.position.y = 2.04;
      head.castShadow = true;
      bodyGroup.add(head);
      hitMeshes.push(head);

      const targetRing = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.22, 28),
        new THREE.MeshBasicMaterial({
          color: isBossScaled ? 0xf59e0b : 0x38bdf8,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.position.y = 0.03;
      root.add(targetRing);

      root.position.set(x, 0, z);
      this.entitiesGroup.add(root);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.3, 2.3),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(x, 0.02, z);
      this.entitiesGroup.add(shadow);

      const telegraphGroup = new THREE.Group();
      telegraphGroup.visible = false;
      this.entitiesGroup.add(telegraphGroup);
      const telegraphFill = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      telegraphGroup.add(telegraphFill);
      const laserLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]),
        new THREE.LineBasicMaterial({ visible: false })
      );
      laserLine.visible = false;
      this.entitiesGroup.add(laserLine);

      this.enemies.push({
        id: this.nextEntityId++,
        kind: EnemyKind.GOLEM,
        isElite: false,
        isTrainingDummy: true,
        x,
        z,
        vx: 0,
        vz: 0,
        radius: 0.9,
        hp: 9999999,
        maxHp: 9999999,
        speed: 0,
        damage: 0,
        xpValue: 0,
        goldValue: 0,
        isBoss: isBossScaled,
        bossTitle: isBossScaled ? 'Hình Nhân Hoàng Đạo' : undefined,
        spawnTimer: 0,
        attackTimer: 999,
        telegraphTimer: 0,
        telegraphDuration: 1,
        telegraphType: 'none',
        aimX: 0,
        aimZ: 1,
        slamX: x,
        slamZ: z,
        slamRadius: 1,
        laneAngles: [],
        bossPhase: 1,
        phaseTransitioned: false,
        burnTimer: 0,
        burnDps: 0,
        poisonDps: 0,
        chillTimer: 0,
        hitFlashTimer: 0,
        phaseAngle: idx * 1.4,
        model: {
          root,
          bodyGroup,
          headOrCore: head,
          hitMeshes,
          weaponOrRing: targetRing,
        },
        shadow,
        telegraphGroup,
        telegraphFill,
        laserLine,
      });
    });
  }

  public startEndlessTower(stats: ComputedPlayerStats, highestChapterCleared = 0): void {
    this.isTowerMode = true;
    this.towerFloor = 1;
    this.towerHighestCleared = highestChapterCleared;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.currentChapter = CHAPTERS[0];
    this.baseStats = stats;

    this.resetRunState(stats);
    this.rebuildCompanions();
    this.loadTowerFloor(1);
    this.phase = GamePhase.SKILL_DRAFT;
    this.keys = {};
    this.syncHudImmediate();
    this.callbacks.onRequestSkillDraft({ ...this.activeSkills });
  }

  public startBossRush(stats: ComputedPlayerStats, highestChapterCleared = 0): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = true;
    this.bossRushRound = 1;
    this.sideModeHighestCleared = highestChapterCleared;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.currentChapter = CHAPTERS[0];
    this.baseStats = stats;

    this.resetRunState(stats);
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.loadBossRushRound(1);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startDailyRift(
    stats: ComputedPlayerStats,
    riftPair: DailyRiftMutatorPair,
    highestChapterCleared = 0
  ): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.sideModeHighestCleared = highestChapterCleared;
    this.isDailyRiftMode = true;
    this.dailyRiftPair = riftPair;
    this.dailyRiftStageIdx = 0;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.currentChapter = CHAPTERS[2] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.rebuildCompanions();
    this.loadDailyRiftStage(0);
    this.phase = GamePhase.SKILL_DRAFT;
    this.keys = {};
    this.syncHudImmediate();
    this.callbacks.onRequestSkillDraft({ ...this.activeSkills });
  }

  public startGuildBossRaid(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = true;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.guildBossTimeLeft = 60;
    this.guildBossTotalDamage = 0;
    this.currentChapter = CHAPTERS[11] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      'BOSS BANG HỘI · 60 GIÂY PHÁ KỶ LỤC SÁT THƯƠNG!'
    );
    this.spawnEnemyGroups(
      [{ kind: EnemyKind.ZODIAC_BOSS, count: 1 }],
      210,
      1.35,
      'Thái Cổ Ma Long Hoàng Đạo'
    );
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startCoopRaid(
    stats: ComputedPlayerStats,
    difficulty: CoopRaidDifficulty,
    liveTeammates?: AiLivePlayerProfile[],
    coopRoles?: [CoopAiRole, CoopAiRole]
  ): void {
    const diffCfg = COOP_DIFFICULTY_MAP[difficulty];
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = true;
    this.coopDifficulty = difficulty;
    const resolvedRoles: [CoopAiRole, CoopAiRole] = coopRoles ?? ['dps', 'guardian'];
    this.coopRoleSynergy = computeCoopRoleSynergy(resolvedRoles);
    this.coopGuardianHealTicks = 0;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;

    const chIdx = difficulty === 'mythic' ? 11 : difficulty === 'heroic' ? 8 : 5;
    this.currentChapter = CHAPTERS[chIdx] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.activePowerPressure = computePowerPressure(stats.powerRating, diffCfg.recommendedPower);
    this.ultCharge = 80;
    this.rebuildCompanions();

    const activeLiveSquad = (liveTeammates ?? []).slice(0, 2);
    const bannerSubtitle =
      activeLiveSquad.length > 0
        ? `CO-OP 3D · ${diffCfg.name.toUpperCase()} · ${this.coopRoleSynergy.teamBadge.toUpperCase()}`
        : `PHÓ BẢN HỢP TÁC AI 3D · ${diffCfg.name.toUpperCase()} · ${this.coopRoleSynergy.teamBadge.toUpperCase()}`;

    this.setupStageArena('sanctum', true, bannerSubtitle);

    // Spawn 2 autonomous AI Hero Allies flanking player (prefer live online [AI Live] players)
    const fallbackAllies = selectCoopAiAllies(stats.heroId);
    const resolvedAllies = [0, 1].map((idx) => {
      const liveAi = activeLiveSquad[idx];
      if (liveAi) {
        const heroDef = HERO_MAP[liveAi.heroId] ?? fallbackAllies[idx] ?? HERO_MAP.aurelia;
        return {
          heroDef,
          displayName: `${liveAi.displayName} [AI Live]`,
        };
      }
      const fallback = fallbackAllies[idx] ?? HERO_MAP.aurelia;
      return {
        heroDef: fallback,
        displayName: fallback.name,
      };
    });

    resolvedAllies.forEach(({ heroDef: allyDef, displayName }, idx) => {
      const roleKey = resolvedRoles[idx] ?? (idx === 0 ? 'dps' : 'guardian');
      const roleDef = COOP_AI_ROLE_DEFS[roleKey];
      const companionRole: AiCompanionRole =
        roleKey === 'guardian' ? 'vanguard' : roleKey === 'control' ? 'mystic' : 'ranger';
      const ax = idx === 0 ? -4.2 : 4.2;
      const az = 5.4;
      const allyWeaponArchetype = 'bow' as const;
      const allyModel = createHeroModel({
        weaponAccentHex: roleDef.accentHex,
        cloakColorHex: allyDef.cloakHex,
        hairColorHex: allyDef.hairHex,
        eyeColor: allyDef.eyeColor,
        cheekColor: allyDef.cheekColor,
        crownStyle: allyDef.crownStyle,
        weaponArchetype: allyWeaponArchetype,
      });
      allyModel.magicOrb.visible = false;
      allyModel.bowGroup.visible = true;
      allyModel.root.position.set(ax, 0, az);
      allyModel.root.scale.setScalar(0.94);
      this.entitiesGroup.add(allyModel.root);

      const allyShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.2),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
        })
      );
      allyShadow.rotation.x = -Math.PI / 2;
      allyShadow.position.set(ax, 0.02, az);
      this.entitiesGroup.add(allyShadow);

      this.coopAllies.push({
        heroId: allyDef.id,
        name: displayName,
        role: companionRole,
        roleLabel: roleDef.shortLabel,
        accentHex: roleDef.accentHex,
        x: ax,
        z: az,
        vx: 0,
        vz: 0,
        facing: Math.PI,
        attackTimer: (0.35 + idx * 0.25) / roleDef.fireRateMult,
        supportTimer: roleKey === 'guardian' ? 7.5 : roleKey === 'control' ? 8.5 : undefined,
        ultCharge: 35 + idx * 15,
        damageDealt: 0,
        phaseAngle: idx * 2.1,
        model: allyModel,
        shadow: allyShadow,
      });
    });

    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      difficulty === 'mythic'
        ? [
            { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2, isElite: true },
          ]
        : difficulty === 'heroic'
        ? [
            { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
            { kind: EnemyKind.DRAGON_WHELP, count: 2, isElite: true },
          ]
        : [
            { kind: EnemyKind.TITAN_BOSS, count: 1 },
            { kind: EnemyKind.IMP_ARCHER, count: 2 },
          ];

    this.spawnEnemyGroups(
      groups,
      diffCfg.hpMult * 1.45,
      diffCfg.dmgMult,
      difficulty === 'mythic'
        ? 'Ma Thần Liên Giới Tối Thượng'
        : difficulty === 'heroic'
        ? 'Hộ Vệ Tinh Giới Hư Không'
        : 'Cự Thần Đền Nguyệt Thực'
    );
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startElementalTower(
    stats: ComputedPlayerStats,
    towerId: ElementalTowerId,
    startFloor = 1
  ): void {
    const tDef = ELEMENTAL_TOWER_MAP[towerId];
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = true;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.elementalTowerId = towerId;
    this.elementalTowerFloor = Math.max(1, startFloor);
    this.currentChapter = CHAPTERS[(tDef.chapterId - 1) % CHAPTERS.length] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.rebuildCompanions();
    this.loadElementalTowerFloor(this.elementalTowerFloor);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public setAiChallengeConfig(
    tier: AiDuelDifficultyTier,
    winStreak = 0,
    pveChallengeEnabled = true
  ): void {
    this.aiDuelTier = tier;
    this.aiWinStreak = Math.max(0, Math.floor(winStreak));
    this.pveChallengeEnabled = pveChallengeEnabled;
  }

  public setAiAdaptationProfile(profile: AiPlayerAdaptationProfile | null): void {
    this.aiAdaptationProfile = profile;
  }

  public startEqualizedTrialDuel(
    stats: ComputedPlayerStats,
    opponent: ArenaOpponent,
    kitId: EqualizedTrialKitId,
    round: 1 | 2 | 3
  ): void {
    const kit = EQUALIZED_TRIAL_KITS[kitId] ?? EQUALIZED_TRIAL_KITS.assassin_counter;
    const eqStats: ComputedPlayerStats = {
      ...stats,
      heroId: kit.heroId,
      maxHp: kit.baseMaxHp,
      attack: kit.baseAttack,
      attackSpeedMult: kit.attackSpeedMult,
      moveSpeed: kit.moveSpeed,
      critChance: kit.baseCritChance,
      critDamage: kit.baseCritDamage,
      damageReduction: 0.1,
    };
    const tier: AiDuelDifficultyTier =
      round === 3 ? 'mythic' : round === 2 ? 'master' : 'challenger';
    const eqOpponent: ArenaOpponent = {
      ...opponent,
      maxHp: kit.baseMaxHp,
      attack: Math.round(kit.baseAttack * (round === 3 ? 1.06 : round === 2 ? 1.0 : 0.94)),
      speedMult: round === 3 ? 1.08 : 1.0,
    };
    this.startArenaDuel(eqStats, eqOpponent, true, tier);
    this.trialGauntletRound = round;
    this.trialGauntletKitId = kit.id;
    this.stageBannerText = `THỬ NGHIỆM ĐỒNG BỘ · VÒNG ${round}/3 · ${kit.name.toUpperCase()}`;
    this.stageBannerTimer = 2.8;
    this.syncHudImmediate();
  }

  public startGuildWarBastionSkirmish(
    stats: ComputedPlayerStats,
    bastionId: GuildWarBastionId,
    bastionLabel: string
  ): void {
    this.startGuildWarBattle(stats);
    this.guildWarBastionId = bastionId;
    this.guildWarBastionLabel = bastionLabel;
    this.guildWarTimeLeft = 36;
    this.stageBannerText = `CHIẾN TRƯỜNG BANG HỘI · XUNG KÍCH ${bastionLabel.toUpperCase()}`;
    this.stageBannerTimer = 2.8;
    this.syncHudImmediate();
  }

  public startEqualizedRiftRun(
    stats: ComputedPlayerStats,
    kitId: EqualizedTrialKitId,
    dateKey = getUtcDateKeyWave11()
  ): void {
    const kit = EQUALIZED_TRIAL_KITS[kitId] ?? EQUALIZED_TRIAL_KITS.assassin_counter;
    const mutators = getDailyRiftMutators(dateKey);
    const mods = computeEqualizedRiftModifiers(1, mutators);
    const eqStats: ComputedPlayerStats = {
      ...stats,
      heroId: kit.heroId,
      maxHp: kit.baseMaxHp,
      attack: Math.round(kit.baseAttack * mods.playerAtkMult),
      attackSpeedMult: Number((kit.attackSpeedMult * mods.playerAspdMult).toFixed(3)),
      moveSpeed: kit.moveSpeed,
      critChance: kit.baseCritChance,
      critDamage: kit.baseCritDamage,
      damageReduction: 0.1,
    };
    this.startEndlessTower(eqStats, 3);
    this.isEqualizedRiftMode = true;
    this.equalizedRiftMutatorsLabel = mods.summaryLabel;
    this.equalizedRiftOverdriveMult = mods.overdriveChargeMult;
    this.stageBannerText = `THÁP VÔ HẠN ĐỒNG BỘ · TẦNG 1 · ${mods.summaryLabel.toUpperCase()}`;
    this.stageBannerTimer = 3.2;
    this.syncHudImmediate();
  }

  public triggerWeaponOverdrive(): boolean {
    if (this.phase !== GamePhase.PLAYING) return false;
    const arch: OverdriveWeaponArchetype =
      this.baseStats.weaponArchetype === 'staff'
        ? 'staff'
        : this.baseStats.weaponArchetype === 'claw'
        ? 'claw'
        : 'bow';
    const res = activateWeaponOverdrive(this.weaponOverdrive, arch);
    if (!res.activated) return false;
    this.weaponOverdrive = res.nextState;
    this.weaponOverdriveBuffs = {
      atkMult: 1.28,
      aspdMult: 1.32,
      critChanceBonus: 0.18,
      pierceBonus: 2,
    };
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    this.spawnShockwave(this.px, this.pz, this.weaponOverdrive.auraHex, 5.2, 0.44);
    this.spawnParticles(this.px, 1.1, this.pz, this.weaponOverdrive.auraHex, 24);
    this.spawnImpactLight(this.px, 1.5, this.pz, 'ultimate');
    soundEngine.playCoopResonanceChord();
    if (res.calloutText) {
      this.emitFloatingNumber(this.px, 2.55, this.pz, 0, true, false, 'storm', res.calloutText, true);
    }
    if (!this.weaponOverdriveRingMesh) {
      this.weaponOverdriveRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1.26, 32),
        new THREE.MeshBasicMaterial({
          color: this.weaponOverdrive.auraHex,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      this.weaponOverdriveRingMesh.rotation.x = -Math.PI / 2;
      this.entitiesGroup.add(this.weaponOverdriveRingMesh);
    } else {
      (this.weaponOverdriveRingMesh.material as THREE.MeshBasicMaterial).color.setHex(
        this.weaponOverdrive.auraHex
      );
      this.weaponOverdriveRingMesh.visible = true;
    }
    this.syncHudImmediate();
    return true;
  }

  public setSquadFormation(formationId: AiSquadFormationId): void {
    const safeId = normalizeAiSquadFormation(formationId);
    this.squadFormationId = safeId;
    const mappedOrder: CoopTacticalOrder =
      safeId === 'guard_sustain'
        ? 'protect_player'
        : safeId === 'elemental_chain'
        ? 'focus_boss'
        : 'break_guard';
    this.coopTacticalOrder = mappedOrder;
    const allyName = this.coopAllies[0]?.name ?? 'Tổ Đội AI';
    this.squadPingBanner = formatSquadPingBanner(safeId, allyName);
    this.squadPingBannerTimer = 3.0;
    if (this.phase === GamePhase.PLAYING) {
      soundEngine.playCoopTacticalPing();
      this.emitFloatingNumber(
        this.px,
        2.35,
        this.pz,
        0,
        true,
        false,
        undefined,
        `ĐỘI HÌNH: ${AI_SQUAD_FORMATIONS[safeId].shortLabel.toUpperCase()}`
      );
      this.syncHudImmediate();
    }
  }

  public startArenaDuel(
    stats: ComputedPlayerStats,
    opponent: ArenaOpponent,
    equalized = false,
    tierOverride?: AiDuelDifficultyTier
  ): void {
    const activeTier = tierOverride ?? this.aiDuelTier ?? 'master';
    this.aiDuelTier = activeTier;
    const eq = equalized ? computeEqualizedArenaStats(stats, opponent) : null;
    const effectiveStats = eq ? eq.playerStats : stats;
    const effectiveOpponent = eq ? eq.opponent : opponent;
    const matchCfg = computeLethalArenaMatchConfig({
      playerStats: effectiveStats,
      opponent: effectiveOpponent,
      tier: activeTier,
      playerWinStreak: this.aiWinStreak,
      equalized,
    });
    this.aiRivalMatchConfig = matchCfg;
    this.aiRivalActivePattern = null;
    this.aiRivalActiveProjSpeed = 16;
    this.aiRivalActiveDmgMult = 1.0;
    this.aiRivalNextCooldown = 0.72;
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isArenaMode = true;
    this.isArenaEqualized = equalized;
    this.isWeeklyRankedBossMode = false;
    this.isWeeklyBossPracticeMode = false;
    this.arenaTimeLeft = 45;
    this.arenaOpponentName = effectiveOpponent.name;
    this.liveAiDuelId = null;
    this.liveAiPlayerId = null;
    this.liveAiPersonality = 'tactical';
    this.liveAiRivalTag = null;
    this.trialGauntletRound = null;
    this.trialGauntletKitId = null;
    this.guildWarBastionId = null;
    this.guildWarBastionLabel = null;
    this.currentChapter = CHAPTERS[9] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = effectiveStats;

    this.buildArena(this.currentChapter);
    this.resetRunState(effectiveStats);
    clearCombatInputBuffer(this.combatInputBuffer);
    // Wave 8 Fair Lethality: No free campaign revives or pet ganks in 1v1 duels
    if (matchCfg.disableFreeRevives) {
      this.revivesLeft = 0;
    }
    this.ultCharge = matchCfg.startingPlayerUltCharge;
    if (!matchCfg.disableCompanionsInDuel) {
      this.rebuildCompanions();
    }
    this.aiRivalBrainState = createAiRivalCombatState(
      activeTier,
      this.liveAiPersonality ?? 'tactical',
      matchCfg.startingRivalUltCharge,
      matchCfg.rivalShieldHp
    );
    this.setupStageArena(
      'sanctum',
      true,
      equalized
        ? `ĐẤU CÂN BẰNG 1V1 (${matchCfg.tierLabel.toUpperCase()}) · ${effectiveOpponent.name}`
        : `ĐẤU TRƯỜNG 1V1 (${matchCfg.tierLabel.toUpperCase()}) · ${effectiveOpponent.name}`
    );
    opponent = {
      ...effectiveOpponent,
      maxHp: matchCfg.rivalMaxHp,
      attack: matchCfg.rivalAttack,
      speedMult: matchCfg.rivalSpeedMult,
    };

    // Place player & spawn AI 3D Rival Hero across the arena
    this.px = 0;
    this.pz = 6.0;
    this.pFacing = Math.PI;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    const oppHeroDef = HERO_MAP[opponent.heroId] ?? HERO_MAP.aurelia;
    const rivalHeroRefs = createHeroModel({
      weaponAccentHex: opponent.accentHex,
      cloakColorHex: opponent.cloakHex,
      hairColorHex: opponent.hairHex,
      eyeColor: oppHeroDef.eyeColor,
      cheekColor: oppHeroDef.cheekColor,
      crownStyle: oppHeroDef.crownStyle,
      weaponArchetype: opponent.weaponArchetype,
    });
    rivalHeroRefs.magicOrb.visible = false;
    rivalHeroRefs.bowGroup.visible = true;
    const rx = 0;
    const rz = -6.0;
    rivalHeroRefs.root.position.set(rx, 0, rz);
    rivalHeroRefs.root.scale.setScalar(1.12);
    this.entitiesGroup.add(rivalHeroRefs.root);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.65, 1.65),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(rx, 0.02, rz);
    this.entitiesGroup.add(shadow);

    const telegraphGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1.0, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.78,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    const telegraphFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    telegraphFill.rotation.x = -Math.PI / 2;
    telegraphFill.scale.setScalar(0.15);
    telegraphGroup.add(outerRing, telegraphFill);
    telegraphGroup.position.set(rx, 0.05, rz);
    telegraphGroup.visible = false;
    this.entitiesGroup.add(telegraphGroup);

    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.9, 0),
      new THREE.Vector3(0, 0.9, 5),
    ]);
    const laserLine = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.75 })
    );
    laserLine.visible = false;
    this.entitiesGroup.add(laserLine);

    this.enemies.push({
      id: this.nextEntityId++,
      kind: EnemyKind.ZODIAC_BOSS,
      isElite: true,
      isArenaRival: true,
      bossTitle: `${opponent.name} · LC ${opponent.powerRating}`,
      x: rx,
      z: rz,
      vx: 0,
      vz: 0,
      radius: 0.72,
      hp: opponent.maxHp,
      maxHp: opponent.maxHp,
      speed: 4.35 * opponent.speedMult,
      damage: opponent.attack,
      xpValue: 0,
      goldValue: 0,
      isBoss: true,
      spawnTimer: 0.35,
      attackTimer: 0.75,
      telegraphTimer: 0,
      telegraphDuration: 0.55,
      telegraphType: 'none',
      aimX: 0,
      aimZ: 1,
      slamX: rx,
      slamZ: rz,
      slamRadius: 2.5,
      laneAngles: [],
      bossPhase: 1,
      phaseTransitioned: false,
      burnTimer: 0,
      burnDps: 0,
      poisonDps: 0,
      chillTimer: 0,
      hitFlashTimer: 0,
      phaseAngle: 0,
      model: {
        root: rivalHeroRefs.root,
        bodyGroup: rivalHeroRefs.bodyGroup,
        headOrCore: rivalHeroRefs.hoodGem,
        hitMeshes: rivalHeroRefs.hitMeshes,
      },
      shadow,
      telegraphGroup,
      telegraphFill,
      laserLine,
    });

    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startCrystalDefense(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isCrystalDefenseMode = true;
    this.crystalWave = 1;
    const baseCrystalHp = Math.round(1800 + stats.maxHp * 1.65);
    this.crystalMaxHp = baseCrystalHp;
    this.crystalHp = baseCrystalHp;
    this.currentChapter = CHAPTERS[4] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.ultCharge = 70;
    this.rebuildCompanions();
    this.setupStageArena(
      'courtyard',
      true,
      `THỦ THÀNH PHA LÊ TINH LINH · ĐỢT 1/${CRYSTAL_DEFENSE_TOTAL_WAVES}`
    );

    this.px = 0;
    this.pz = 3.8;
    this.pFacing = Math.PI;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    this.crystalRefs = createSpiritCrystalModel();
    this.crystalRefs.group.position.set(0, 0, 0);
    this.entitiesGroup.add(this.crystalRefs.group);

    this.spawnCrystalDefenseWave(1);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnCrystalDefenseWave(waveNum: number): void {
    this.crystalWave = waveNum;
    this.stageBannerText = `ĐỢT ${waveNum}/${CRYSTAL_DEFENSE_TOTAL_WAVES} · BẢO VỆ PHA LÊ TINH LINH!`;
    this.stageBannerTimer = 2.6;

    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      waveNum === 1
        ? [
            { kind: EnemyKind.SKIRMISHER, count: 4 },
            { kind: EnemyKind.IMP_ARCHER, count: 2 },
          ]
        : waveNum === 2
        ? [
            { kind: EnemyKind.SKIRMISHER, count: 4 },
            { kind: EnemyKind.GOLEM, count: 2 },
            { kind: EnemyKind.WISP, count: 2 },
          ]
        : waveNum === 3
        ? [
            { kind: EnemyKind.SHADOW_STALKER, count: 3, isElite: true },
            { kind: EnemyKind.DRAGON_WHELP, count: 2 },
            { kind: EnemyKind.WARDEN_BOSS, count: 1 },
          ]
        : waveNum === 4
        ? [
            { kind: EnemyKind.GOLEM, count: 3, isElite: true },
            { kind: EnemyKind.IMP_ARCHER, count: 3 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2 },
          ]
        : waveNum === 5
        ? [
            { kind: EnemyKind.DRAGON_WHELP, count: 4, isElite: true },
            { kind: EnemyKind.SKIRMISHER, count: 4 },
            { kind: EnemyKind.TITAN_BOSS, count: 1 },
          ]
        : [
            { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 3, isElite: true },
            { kind: EnemyKind.GOLEM, count: 2 },
          ];

    const hpMult = 0.85 + waveNum * 0.34;
    const dmgMult = 0.9 + waveNum * 0.16;
    const bossTitle =
      waveNum >= 6
        ? 'Chúa Tể Công Thành Pha Lê'
        : waveNum === 5
        ? 'Cự Thần Phá Thành'
        : 'Tiên Phong Phá Pha Lê';
    this.spawnEnemyGroups(groups, hpMult, dmgMult, bossTitle);
    this.syncHudImmediate();
  }

  public startWorldBoss(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isWorldBossMode = true;
    this.isWeeklyRankedBossMode = false;
    this.weeklyBossAttemptId = null;
    this.weeklyBossSeed = null;
    this.combatRng = Math.random;
    this.worldBossTimeLeft = 60;
    this.worldBossTotalDamage = 0;
    this.currentChapter = CHAPTERS[11] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      'BOSS THẾ GIỚI LIÊN SERVER · 60 GIÂY ĐUA TOP SÁT THƯƠNG!'
    );
    this.spawnEnemyGroups(
      [{ kind: EnemyKind.ZODIAC_BOSS, count: 1 }],
      360,
      1.38,
      'Hắc Long Tinh Giới Liên Server'
    );
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public setAutoPilot(enabled: boolean, tactic?: AiAutoPilotTactic): void {
    if (tactic) {
      this.autoPilotTactic = tactic;
    }
    if (this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode) {
      this.autoPilotEnabled = false;
      this.autoPilotStatusText = 'Khóa AI trong Tính Hạng';
      this.syncHudImmediate();
      return;
    }
    this.autoPilotEnabled = enabled;
    if (enabled && this.phase === GamePhase.PLAYING) {
      this.autoPilotUsedInRun = true;
    }
    if (!enabled) {
      this.autoPilotStatusText = null;
      this.autoPilotManualOverride = false;
    }
    this.syncHudImmediate();
  }

  public setAutoPilotTactic(tactic: AiAutoPilotTactic): void {
    this.autoPilotTactic = tactic;
    this.syncHudImmediate();
  }

  public setAiSquadConfig(enabled: boolean, roles: AiCompanionRole[]): void {
    this.aiSquadAssistEnabled = enabled;
    this.aiSquadRoles = roles.length > 0 ? roles.slice(0, 2) : ['vanguard', 'ranger'];
    if (
      this.phase === GamePhase.PLAYING &&
      !this.isCoopRaidMode &&
      !this.isArenaMode &&
      !(this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode)
    ) {
      this.syncAiSquadAllies();
      this.syncHudImmediate();
    }
  }

  private clearAiAllies(): void {
    for (const ally of this.coopAllies) {
      this.entitiesGroup.remove(ally.model.root);
      this.entitiesGroup.remove(ally.shadow);
      disposeObjectResources(ally.model.root);
      disposeObjectResources(ally.shadow);
    }
    this.coopAllies = [];
  }

  private syncAiSquadAllies(): void {
    if (
      !this.aiSquadAssistEnabled ||
      this.isCoopRaidMode ||
      this.isArenaMode ||
      (this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode)
    ) {
      if (!this.isCoopRaidMode) {
        this.clearAiAllies();
      }
      return;
    }
    this.clearAiAllies();
    const rolesToSpawn = this.aiSquadRoles.slice(0, 2);
    rolesToSpawn.forEach((role, idx) => {
      const cfg = AI_COMPANION_ROLES[role];
      const allyDef = HERO_MAP[cfg.heroId] ?? HERO_MAP.aurelia;
      const ax = this.px + (idx === 0 ? -3.0 : 3.0);
      const az = Math.min(ARENA_HALF_D - 1.2, this.pz + 1.4);
      const allyModel = createHeroModel({
        weaponAccentHex: cfg.accentHex,
        cloakColorHex: allyDef.cloakHex,
        hairColorHex: allyDef.hairHex,
        eyeColor: allyDef.eyeColor,
        cheekColor: allyDef.cheekColor,
        crownStyle: allyDef.crownStyle,
        weaponArchetype: role === 'mystic' ? 'staff' : 'bow',
      });
      allyModel.magicOrb.visible = role === 'mystic';
      allyModel.bowGroup.visible = role !== 'mystic';
      allyModel.root.position.set(ax, 0, az);
      allyModel.root.scale.setScalar(0.92);
      this.entitiesGroup.add(allyModel.root);

      const allyShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 1.15),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      allyShadow.rotation.x = -Math.PI / 2;
      allyShadow.position.set(ax, 0.02, az);
      this.entitiesGroup.add(allyShadow);

      this.coopAllies.push({
        heroId: allyDef.id,
        name: cfg.name,
        role,
        roleLabel: cfg.roleLabel,
        accentHex: cfg.accentHex,
        x: ax,
        z: az,
        vx: 0,
        vz: 0,
        facing: Math.PI,
        attackTimer: 0.35 + idx * 0.14,
        supportTimer: 4.5 + idx * 1.5,
        ultCharge: 35,
        damageDealt: 0,
        phaseAngle: idx * 2.1,
        calloutText: `${cfg.roleLabel} sẵn sàng!`,
        calloutTimer: 2.2,
        model: allyModel,
        shadow: allyShadow,
      });
    });
  }

  public startLiveAiDuel(
    stats: ComputedPlayerStats,
    opponent: AiLivePlayerProfile,
    duelId: string,
    equalized = false,
    tierOverride?: AiDuelDifficultyTier
  ): void {
    const activeTier = tierOverride ?? this.aiDuelTier ?? 'master';
    const oppHero = HERO_MAP[opponent.heroId] ?? HERO_MAP.aurelia;
    const powerRatio = Math.max(0.85, Math.min(1.45, opponent.powerRating / Math.max(1200, stats.powerRating)));
    const syntheticOpponent: ArenaOpponent = {
      id: opponent.id,
      name: `${opponent.displayName} ${opponent.tag}`,
      title: opponent.personality === 'assassin' ? 'Sát Thủ Real-Time' : opponent.personality === 'aggressive' ? 'Chiến Binh Real-Time' : 'Chiến Thuật Real-Time',
      heroId: opponent.heroId,
      rating: opponent.duelRating,
      powerRating: opponent.powerRating,
      maxHp: Math.round(stats.maxHp * 2.1 * powerRatio),
      attack: Math.round(stats.attack * 1.15 * powerRatio),
      speedMult: opponent.personality === 'assassin' ? 1.16 : opponent.personality === 'aggressive' ? 1.08 : 1.03,
      weaponArchetype: 'bow',
      accentHex: oppHero.accentHex,
      cloakHex: oppHero.cloakHex,
      hairHex: oppHero.hairHex,
      rewardPoints: 24,
      rewardArenaCoins: 85,
    };
    this.startArenaDuel(stats, syntheticOpponent, equalized, activeTier);
    this.liveAiDuelId = duelId;
    this.liveAiPlayerId = opponent.id;
    this.liveAiPersonality = opponent.personality;
    this.liveAiRivalTag = opponent.tag;
    if (this.aiRivalBrainState) {
      this.aiRivalBrainState.personality = opponent.personality;
    }
    const tierLbl = (this.aiRivalMatchConfig?.tierLabel ?? 'Cao Thủ').toUpperCase();
    this.stageBannerText = equalized
      ? `ĐẤU CÂN BẰNG 1V1 (${tierLbl}) · ${opponent.displayName.toUpperCase()} [AI LIVE]`
      : `THÁCH ĐẤU 1V1 LIVE (${tierLbl}) · ${opponent.displayName.toUpperCase()} [AI LIVE]`;
    this.stageBannerTimer = 2.6;
    this.syncHudImmediate();
  }

  public startWeeklyRankedBoss(
    schedule: WeeklyBossSchedule,
    attemptId: string,
    options?: {
      practice?: boolean;
      isWeekendBlitz?: boolean;
      top1ClearTimeMs?: number | null;
      top1SplitsMs?: number[] | null;
      personalBestClearTimeMs?: number | null;
      personalBestSplitsMs?: number[] | null;
    }
  ): void {
    const isPractice = Boolean(options?.practice);
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.coopRoleSynergy = null;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isPantheonMode = false;
    this.isChampionshipMode = false;
    this.isCrystalVaultMode = false;
    this.isDragonLairMode = false;
    this.isSkyCitadelMode = false;
    this.isTrainingMode = false;

    this.isWeeklyRankedBossMode = true;
    this.isWeeklyBossPracticeMode = isPractice;
    this.weeklyBossIsWeekendBlitz = Boolean(options?.isWeekendBlitz);
    this.weeklyBossAttemptId = isPractice ? null : attemptId;
    this.weeklyBossId = schedule.bossId;
    if (
      isSolarLionBossEncounter({
        chapterId: 1,
        enemyKind: EnemyKind.ZODIAC_BOSS,
        isWeeklyRankedBossMode: true,
        weeklyBossId: schedule.bossId,
      })
    ) {
      this.prefetchSolarLionBossModel();
    }
    this.weeklyBossSeed = schedule.seed;
    this.weeklyBossTimeLeft = schedule.timeLimitSec;
    this.weeklyBossTotalDamage = 0;
    this.weeklyBossMaxHp = schedule.bossMaxHp;
    this.bossPaceTracker = createBossPaceTracker({
      timeLimitSec: schedule.timeLimitSec,
      top1ClearTimeMs: options?.top1ClearTimeMs,
      top1SplitsMs: options?.top1SplitsMs,
      personalBestClearTimeMs: options?.personalBestClearTimeMs,
      personalBestSplitsMs: options?.personalBestSplitsMs,
    });
    this.bossPaceHud = updateBossPaceTracker(this.bossPaceTracker, 1, 0);
    this.combatRng = createSeededRng(schedule.seed);
    this.simClock = createFixedTimestepClock();
    this.kinestheticsClock = createDeterministicKinestheticsClock();

    // Fair-Play Gate: hard-lock AI Auto-Pilot & Squad OFF for official ranked attempts
    if (!isPractice) {
      this.autoPilotEnabled = false;
      this.autoPilotUsedInRun = false;
      this.autoPilotStatusText = 'Khóa AI trong Tính Hạng';
    }

    const ch =
      CHAPTERS[schedule.chapterVisualIndex % CHAPTERS.length] ?? CHAPTERS[0];
    this.currentChapter = ch;
    const standardizedStats: ComputedPlayerStats = {
      ...schedule.loanerStats,
      equippedRunes: [],
      equippedPetId: null,
      equippedWingId: null,
      equippedMountId: null,
      equippedHaloId: null,
      equippedArtifactId: null,
      equippedWarBannerId: null,
    };
    this.baseStats = standardizedStats;

    this.buildArena(this.currentChapter);
    this.resetRunState(standardizedStats);
    // Strip mounts/wings/pets visually during standardized duel so fair-play arena is clean
    if (this.hero.mountGroup) this.hero.mountGroup.visible = false;
    if (this.hero.leftWingPivot) this.hero.leftWingPivot.visible = false;
    if (this.hero.rightWingPivot) this.hero.rightWingPivot.visible = false;
    this.ultCharge = 50;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      isPractice
        ? `TẬP LUYỆN BOSS TUẦN · ${schedule.weekId} · KHÔNG TỐN LƯỢT`
        : `BOSS TUẦN XẾP HẠNG · ${schedule.weekId} · BỘ ĐỒ SỬ THI CHUẨN HÓA`
    );

    const hpScaleForBoss = schedule.bossMaxHp / 1850;
    this.spawnEnemyGroups(
      [{ kind: EnemyKind.ZODIAC_BOSS, count: 1 }],
      hpScaleForBoss,
      1.12,
      schedule.bossName
    );
    const boss = this.enemies.find((e) => e.isBoss);
    if (boss) {
      boss.maxHp = schedule.bossMaxHp;
      boss.hp = schedule.bossMaxHp;
    }
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startBloodMoonSurvival(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isBloodMoonMode = true;
    this.bloodMoonTimeLeft = BLOOD_MOON_DURATION_SEC;
    this.bloodMoonWave = 0;
    this.bloodMoonScore = 0;
    this.bloodMoonSpawnTimer = 0;
    this.currentChapter = CHAPTERS[10] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    // Crimson Blood Moon atmosphere override
    this.scene.background = new THREE.Color(0x22040b);
    this.scene.fog = new THREE.FogExp2(0x2d0710, 0.021);
    this.keyLight.color.setHex(0xfb7185);
    this.hemiLight.color.setHex(0xf43f5e);

    this.resetRunState(stats);
    this.ultCharge = 80;
    this.rebuildCompanions();
    this.setupStageArena(
      'pillars',
      false,
      'ĐÊM TRĂNG MÁU · SINH TỒN 90 GIÂY SĂN HUYẾT TINH!'
    );
    this.spawnNextBloodMoonWave();
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnNextBloodMoonWave(): void {
    this.bloodMoonWave += 1;
    this.bloodMoonSpawnTimer = 11.5;
    const w = this.bloodMoonWave;
    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      w % 3 === 0
        ? [
            { kind: EnemyKind.WARDEN_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2 + Math.min(3, Math.floor(w / 2)), isElite: true },
            { kind: EnemyKind.WISP, count: 2 },
          ]
        : [
            { kind: EnemyKind.SKIRMISHER, count: 3 + Math.min(4, w) },
            { kind: EnemyKind.DRAGON_WHELP, count: 1 + Math.min(3, Math.floor(w / 2)), isElite: w >= 4 },
            { kind: EnemyKind.IMP_ARCHER, count: 2 },
          ];
    const hpMult = 0.85 + w * 0.24;
    const dmgMult = 0.92 + w * 0.14;
    const bossTitle = w >= 6 ? 'Thống Soái Nhật Thực Trăng Máu' : 'Tướng Quân Huyết Nguyệt';
    this.spawnEnemyGroups(groups, hpMult, dmgMult, bossTitle);
    this.stageBannerText = `ĐÊM TRĂNG MÁU · ĐỢT ${w}`;
    this.stageBannerTimer = 2.0;
    this.syncHudImmediate();
  }

  public startAbyssalGauntlet(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isGuildWarMode = false;
    this.isAbyssalMode = true;
    this.abyssalWave = 0;
    this.abyssalScore = 0;
    this.currentChapter = CHAPTERS[8] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    // Deep Abyssal Violet atmosphere
    this.scene.background = new THREE.Color(0x110724);
    this.scene.fog = new THREE.FogExp2(0x1b0b38, 0.02);
    this.keyLight.color.setHex(0xc084fc);
    this.hemiLight.color.setHex(0xa855f7);

    this.resetRunState(stats);
    this.ultCharge = 90;
    this.rebuildCompanions();
    this.setupStageArena(
      'gauntlet',
      true,
      `HỐ SÂU ĐỘT BIẾN 3D · VƯỢT ${ABYSSAL_GAUNTLET_TOTAL_WAVES} ĐỢT SĂN MẢNH THÁNH KHÍ!`
    );
    this.spawnNextAbyssalWave();
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnNextAbyssalWave(): void {
    this.abyssalWave += 1;
    const w = this.abyssalWave;
    const isBossWave = w % 3 === 0 || w === ABYSSAL_GAUNTLET_TOTAL_WAVES;
    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      w === ABYSSAL_GAUNTLET_TOTAL_WAVES
        ? [
            { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 3, isElite: true },
            { kind: EnemyKind.DRAGON_WHELP, count: 2, isElite: true },
          ]
        : isBossWave
        ? [
            { kind: w >= 6 ? EnemyKind.TITAN_BOSS : EnemyKind.WARDEN_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2, isElite: true },
            { kind: EnemyKind.WISP, count: 2 },
          ]
        : [
            { kind: EnemyKind.SKIRMISHER, count: 3 + Math.min(3, Math.floor(w / 2)) },
            { kind: EnemyKind.IMP_ARCHER, count: 2 + Math.min(2, Math.floor(w / 3)) },
            { kind: w >= 5 ? EnemyKind.GOLEM : EnemyKind.DRAGON_WHELP, count: 2, isElite: w >= 4 },
          ];
    const hpMult = 0.92 + w * 0.28;
    const dmgMult = 0.95 + w * 0.14;
    const bossTitle =
      w === ABYSSAL_GAUNTLET_TOTAL_WAVES
        ? 'Chúa Tể Hố Sâu Đột Biến'
        : w >= 6
        ? 'Dị Chủ Hư Không Tầng Sâu'
        : 'Thống Soái Đột Biến';
    this.spawnEnemyGroups(groups, hpMult, dmgMult, bossTitle);
    this.stageBannerText = `HỐ SÂU ĐỘT BIẾN · ĐỢT ${w}/${ABYSSAL_GAUNTLET_TOTAL_WAVES}`;
    this.stageBannerTimer = 2.4;
    this.syncHudImmediate();
  }

  public startGuildWarBattle(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = true;
    this.guildWarTimeLeft = GUILD_WAR_DURATION_SEC;
    this.guildWarScore = 0;
    this.guildWarNodesCaptured = 0;
    this.guildWarSpawnTimer = 0;
    this.currentChapter = CHAPTERS[6] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.ultCharge = 90;
    this.rebuildCompanions();
    this.setupStageArena(
      'courtyard',
      true,
      'CHIẾN TRƯỜNG BANG HỘI 3D · ĐỨNG TRONG VÒNG CHIẾM 3 TRỤ TINH THỂ!'
    );

    // Build 3 capturable Guild Citadel shrines
    const shrineSpots: Array<[number, number]> = [
      [-5.2, -3.6],
      [5.2, -3.6],
      [0, 3.8],
    ];
    this.guildWarNodes = shrineSpots.map(([nx, nz]) => {
      const group = new THREE.Group();
      group.position.set(nx, 0, nz);
      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.85, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.35 })
      );
      plinth.position.y = 0.12;
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 1.4,
          roughness: 0.15,
        })
      );
      core.scale.set(0.85, 1.5, 0.85);
      core.position.y = 1.25;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.15, 2.38, 36),
        new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.65,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(plinth, core, ring);
      this.entitiesGroup.add(group);
      return { x: nx, z: nz, progress: 0, captured: false, group, core, ring };
    });

    this.px = 0;
    this.pz = 7.4;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    this.spawnGuildWarWave(1);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnGuildWarWave(waveNum: number): void {
    this.guildWarSpawnTimer = 14;
    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      waveNum % 2 === 0
        ? [
            { kind: EnemyKind.WARDEN_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2, isElite: true },
            { kind: EnemyKind.IMP_ARCHER, count: 2 },
          ]
        : [
            { kind: EnemyKind.SKIRMISHER, count: 4 },
            { kind: EnemyKind.GOLEM, count: 2, isElite: waveNum >= 3 },
            { kind: EnemyKind.WISP, count: 2 },
          ];
    this.spawnEnemyGroups(
      groups,
      0.95 + waveNum * 0.22,
      0.95 + waveNum * 0.12,
      'Thống Soái Đồn Trú Bang Địch'
    );
  }

  public startPantheonExpedition(
    stats: ComputedPlayerStats,
    blessing: PantheonBlessingDef
  ): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isPantheonMode = true;
    this.pantheonStage = 0;
    this.pantheonScore = 0;
    this.pantheonBlessing = blessing;
    this.currentChapter = CHAPTERS[11] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];

    const blessedStats: ComputedPlayerStats = {
      ...stats,
      attack: Math.round(stats.attack * (1 + blessing.atkBonusPct)),
      critChance: Math.min(0.95, stats.critChance + blessing.critBonus),
      damageReduction: Math.min(0.75, stats.damageReduction + blessing.drBonus),
    };
    this.baseStats = blessedStats;

    this.buildArena(this.currentChapter);
    this.scene.background = new THREE.Color(0x0c0a20);
    this.scene.fog = new THREE.FogExp2(0x141036, 0.019);
    this.keyLight.color.setHex(0xfde047);
    this.hemiLight.color.setHex(0xc084fc);

    this.resetRunState(blessedStats);
    this.isPantheonMode = true;
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      `ĐIỆN THẦN HOÀNG ĐẠO 3D · ${blessing.name.toUpperCase()} KÍCH HOẠT!`
    );
    this.spawnNextPantheonStage();
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnNextPantheonStage(): void {
    this.pantheonStage += 1;
    const s = this.pantheonStage;
    const groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }> =
      s === 1
        ? [
            { kind: EnemyKind.WARDEN_BOSS, count: 1 },
            { kind: EnemyKind.WISP, count: 2, isElite: true },
          ]
        : s === 2
        ? [
            { kind: EnemyKind.TITAN_BOSS, count: 1 },
            { kind: EnemyKind.DRAGON_WHELP, count: 2, isElite: true },
          ]
        : [
            { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
            { kind: EnemyKind.SHADOW_STALKER, count: 2, isElite: true },
          ];
    const deityTitles = [
      'Cổ Thần Nhật Nguyệt · Tầng I',
      'Cổ Thần Tinh Hà · Tầng II',
      'Chúa Tể Điện Thần Tối Thượng · Tầng III',
    ];
    this.spawnEnemyGroups(
      groups,
      1.25 + s * 0.45,
      1.05 + s * 0.18,
      deityTitles[s - 1] ?? 'Chúa Tể Điện Thần'
    );
    this.stageBannerText = `ĐIỆN THẦN 3D · ẢI ${s}/${PANTHEON_TOTAL_STAGES}: ${deityTitles[s - 1]}`;
    this.stageBannerTimer = 2.6;
    this.syncHudImmediate();
  }

  public startChampionshipGauntlet(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isPantheonMode = false;
    this.currentChapter = CHAPTERS[11] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.scene.background = new THREE.Color(0x160f2d);
    this.scene.fog = new THREE.FogExp2(0x1e1342, 0.018);
    this.keyLight.color.setHex(0xfde68a);
    this.hemiLight.color.setHex(0xfbbf24);

    this.resetRunState(stats);
    this.isChampionshipMode = true;
    this.championshipRound = 0;
    this.championshipScore = 0;
    this.championshipAtkMult = 1.0;
    this.championshipDrBonus = 0;
    this.championshipTacticsOffer = null;
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      `GIẢI ĐẤU QUÁN QUÂN 3 HIỆP 3D · CHINH PHỤC CÚP VINH QUANG!`
    );
    this.spawnChampionshipRound(0);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnChampionshipRound(roundIdx: number): void {
    const rivalDef = CHAMPIONSHIP_RIVALS[roundIdx] ?? CHAMPIONSHIP_RIVALS[0];
    this.championshipRound = roundIdx + 1;
    this.championshipRivalName = `${rivalDef.name} · ${rivalDef.title}`;

    // Reposition player to South side of Championship ring
    this.px = 0;
    this.pz = 6.0;
    this.pFacing = Math.PI;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    const oppHeroDef = HERO_MAP[rivalDef.heroId] ?? HERO_MAP.aurelia;
    const rivalHeroRefs = createHeroModel({
      weaponAccentHex: rivalDef.accentHex,
      cloakColorHex: rivalDef.cloakHex,
      hairColorHex: rivalDef.hairHex,
      eyeColor: oppHeroDef.eyeColor,
      cheekColor: oppHeroDef.cheekColor,
      crownStyle: oppHeroDef.crownStyle,
      weaponArchetype: rivalDef.weaponArchetype,
      wingId: roundIdx >= 1 ? 'solar_zenith' : undefined,
      wingLevel: 3 + roundIdx * 2,
      haloId: 'leo_sovereign',
      haloLevel: 2 + roundIdx * 2,
    });
    rivalHeroRefs.magicOrb.visible = false;
    rivalHeroRefs.bowGroup.visible = true;
    const rx = 0;
    const rz = -6.0;
    rivalHeroRefs.root.position.set(rx, 0, rz);
    rivalHeroRefs.root.scale.setScalar(1.16 + roundIdx * 0.06);
    this.entitiesGroup.add(rivalHeroRefs.root);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.75),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(rx, 0.02, rz);
    this.entitiesGroup.add(shadow);

    const telegraphGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.88, 1.0, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    const telegraphFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    telegraphFill.rotation.x = -Math.PI / 2;
    telegraphFill.scale.setScalar(0.15);
    telegraphGroup.add(outerRing, telegraphFill);
    telegraphGroup.position.set(rx, 0.05, rz);
    telegraphGroup.visible = false;
    this.entitiesGroup.add(telegraphGroup);

    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.9, 0),
      new THREE.Vector3(0, 0.9, 5),
    ]);
    const laserLine = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 })
    );
    laserLine.visible = false;
    this.entitiesGroup.add(laserLine);

    const scaledHp = Math.round(
      Math.max(this.baseStats.attack * 24, this.baseStats.maxHp * 2.15) * rivalDef.hpMult
    );
    const scaledAtk = Math.max(24, Math.round(this.baseStats.maxHp * 0.095 * rivalDef.atkMult));

    this.enemies.push({
      id: this.nextEntityId++,
      kind: EnemyKind.ZODIAC_BOSS,
      isElite: true,
      isArenaRival: true,
      bossTitle: `Hiệp ${this.championshipRound}/${CHAMPIONSHIP_TOTAL_ROUNDS} · ${rivalDef.name} (${rivalDef.title})`,
      x: rx,
      z: rz,
      vx: 0,
      vz: 0,
      radius: 0.78,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: 4.3 + roundIdx * 0.45,
      damage: scaledAtk,
      xpValue: 0,
      goldValue: 160 + roundIdx * 90,
      isBoss: true,
      spawnTimer: 0.35,
      attackTimer: 0.7,
      telegraphTimer: 0,
      telegraphDuration: 0.55,
      telegraphType: 'none',
      aimX: 0,
      aimZ: 1,
      slamX: rx,
      slamZ: rz,
      slamRadius: 2.6,
      laneAngles: [],
      bossPhase: 1,
      phaseTransitioned: false,
      burnTimer: 0,
      burnDps: 0,
      poisonDps: 0,
      chillTimer: 0,
      hitFlashTimer: 0,
      phaseAngle: 0,
      model: {
        root: rivalHeroRefs.root,
        bodyGroup: rivalHeroRefs.bodyGroup,
        headOrCore: rivalHeroRefs.hoodGem,
        hitMeshes: rivalHeroRefs.hitMeshes,
      },
      shadow,
      telegraphGroup,
      telegraphFill,
      laserLine,
    });

    this.stageBannerText = `HIỆP ${this.championshipRound}/${CHAMPIONSHIP_TOTAL_ROUNDS} · ${rivalDef.name.toUpperCase()} (${rivalDef.title})`;
    this.stageBannerTimer = 2.6;
    this.spawnShockwave(rx, rz, 0xfbbf24, 5.2, 0.52);
    this.syncHudImmediate();
  }

  public applyChampionshipTactic(tacticId: ChampionshipTacticId): void {
    if (!this.isChampionshipMode || !this.championshipTacticsOffer) return;
    const chosen = CHAMPIONSHIP_TACTICS.find((t) => t.id === tacticId);
    if (chosen) {
      if (chosen.atkBonusPct) {
        this.championshipAtkMult *= 1 + chosen.atkBonusPct;
      }
      if (chosen.critBonus) {
        this.baseStats = {
          ...this.baseStats,
          critChance: Math.min(0.95, this.baseStats.critChance + chosen.critBonus),
        };
      }
      if (chosen.aspdBonus) {
        this.baseStats = {
          ...this.baseStats,
          attackSpeedMult: this.baseStats.attackSpeedMult * (1 + chosen.aspdBonus),
        };
      }
      if (chosen.drBonus) {
        this.championshipDrBonus = Math.min(0.35, this.championshipDrBonus + chosen.drBonus);
      }
      if (chosen.healPct) {
        const healAmt = Math.round(this.maxHp * chosen.healPct);
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.emitFloatingNumber(this.px, 2.2, this.pz, healAmt, false, true, undefined, chosen.name.toUpperCase());
      } else {
        this.emitFloatingNumber(this.px, 2.2, this.pz, 0, true, false, undefined, chosen.name.toUpperCase());
      }
      if (chosen.shieldPct) {
        this.shield += Math.round(this.maxHp * chosen.shieldPct);
      }
      if (chosen.ultFill) {
        this.ultCharge = Math.min(100, this.ultCharge + chosen.ultFill);
      }
      this.spawnParticles(this.px, 1.2, this.pz, 0xfbbf24, 28);
      soundEngine.playVictory();
    }
    this.championshipTacticsOffer = null;
    this.spawnChampionshipRound(this.championshipRound);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public previewLobbyUltimate(heroId: HeroId): void {
    if (this.phase !== GamePhase.TITLE) return;
    const heroDef = HERO_MAP[heroId] ?? HERO_MAP.aurelia;
    const hx = this.hero.root.position.x;
    const hz = this.hero.root.position.z;
    soundEngine.unlock();
    soundEngine.playUltimate();
    this.spawnUltColumn(hx, hz, heroDef.accentHex, 0.6);
    this.spawnShockwave(hx, hz, heroDef.accentHex, 4.9, 0.55);
    this.spawnShockwave(hx, hz, 0xfbbf24, 3.2, 0.42);
    this.spawnParticles(hx, 1.25, hz, heroDef.accentHex, 34);
    this.spawnParticles(hx, 1.85, hz, 0xfde047, 16);
    if (heroId === 'artemis') {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        const tx = hx + Math.cos(a) * 2.1;
        const tz = hz + Math.sin(a) * 2.1;
        this.spawnLightningArc(tx, 7.6, tz, tx, 0.2, tz);
      }
    }
    this.emitFloatingNumber(
      hx,
      2.35,
      hz,
      0,
      true,
      false,
      undefined,
      heroDef.ultName.toUpperCase()
    );
  }

  public startCrystalVault(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isPantheonMode = false;
    this.currentChapter = CHAPTERS[4] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.scene.background = new THREE.Color(0x141024);
    this.scene.fog = new THREE.FogExp2(0x1f1733, 0.017);
    this.keyLight.color.setHex(0xfde68a);
    this.hemiLight.color.setHex(0xfbbf24);

    this.resetRunState(stats);
    this.isCrystalVaultMode = true;
    this.vaultTimeLeft = CRYSTAL_VAULT_DURATION_SEC;
    this.vaultPillarsBroken = 0;
    this.vaultWave = 0;
    this.vaultGemsLooted = 0;
    this.vaultReforgeLooted = 0;
    this.vaultShardsLooted = 0;
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      'HẦM MỎ KHO BÁU 3D · PHÁ TRỤ PHA LÊ SĂN NGỌC HỒN & ĐÁ ĐÚC!'
    );
    this.spawnCrystalVaultWave(1);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnCrystalVaultWave(waveNum: number): void {
    this.vaultWave = waveNum;
    const spots: Array<[number, number, boolean]> = [
      [-6.5, -5.0, false],
      [6.5, -5.0, false],
      [0, -6.8, true],
      [-5.8, 2.2, false],
      [5.8, 2.2, true],
    ];
    const basePillarHp = Math.round(Math.max(160, this.baseStats.attack * 6.5) * (1 + (waveNum - 1) * 0.35));

    for (const [px, pz, isGolden] of spots) {
      const model = createVaultCrystalPillarModel(isGolden);
      model.root.position.set(px, 0, pz);
      this.entitiesGroup.add(model.root);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.65, 1.65),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(px, 0.02, pz);
      this.entitiesGroup.add(shadow);

      const telegraphGroup = new THREE.Group();
      const telegraphFill = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      telegraphGroup.visible = false;
      this.entitiesGroup.add(telegraphGroup);

      const laserLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
        new THREE.LineBasicMaterial({ visible: false })
      );
      laserLine.visible = false;
      this.entitiesGroup.add(laserLine);

      const hp = isGolden ? Math.round(basePillarHp * 1.45) : basePillarHp;
      this.enemies.push({
        id: this.nextEntityId++,
        kind: EnemyKind.GOLEM,
        isElite: isGolden,
        isBoss: false,
        isVaultPillar: true,
        isGoldenPillar: isGolden,
        x: px,
        z: pz,
        vx: 0,
        vz: 0,
        radius: 0.85,
        hp,
        maxHp: hp,
        speed: 0,
        damage: 0,
        xpValue: 16,
        goldValue: isGolden ? 140 : 85,
        spawnTimer: 0.25,
        attackTimer: 99,
        telegraphTimer: 0,
        telegraphDuration: 1,
        telegraphType: 'none',
        aimX: 0,
        aimZ: 1,
        slamX: px,
        slamZ: pz,
        slamRadius: 1,
        laneAngles: [],
        bossPhase: 1,
        phaseTransitioned: false,
        burnTimer: 0,
        burnDps: 0,
        poisonDps: 0,
        chillTimer: 0,
        hitFlashTimer: 0,
        phaseAngle: Math.random() * Math.PI * 2,
        model,
        shadow,
        telegraphGroup,
        telegraphFill,
        laserLine,
      });
    }

    // Spawn Vault Guardian Sentinel Boss on every wave to pressure player & allow Break Shield
    this.spawnEnemyGroups(
      [{ kind: EnemyKind.WARDEN_BOSS, count: 1 }],
      0.88 + waveNum * 0.28,
      0.72 + waveNum * 0.12,
      `Thủ Hộ Hầm Mỏ Đợt ${waveNum}`
    );

    this.stageBannerText = `HẦM MỎ PHA LÊ · ĐỢT ${waveNum} (PHÁ TRỤ SĂN NGỌC HỒN!)`;
    this.stageBannerTimer = 2.2;
    this.spawnShockwave(0, -4.5, 0xfbbf24, 6.4, 0.48);
  }

  public startDragonLair(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
    this.isDailyRiftMode = false;
    this.dailyRiftPair = null;
    this.isGuildBossMode = false;
    this.isArenaMode = false;
    this.isCoopRaidMode = false;
    this.isElementalTowerMode = false;
    this.isCrystalDefenseMode = false;
    this.isWorldBossMode = false;
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isPantheonMode = false;
    this.currentChapter = CHAPTERS[4] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.scene.background = new THREE.Color(0x1b0b12);
    this.scene.fog = new THREE.FogExp2(0x2b1019, 0.017);
    this.keyLight.color.setHex(0xfb923c);
    this.hemiLight.color.setHex(0xf97316);
    this.hemiLight.groundColor.setHex(0x1c1917);

    this.resetRunState(stats);
    this.isDragonLairMode = true;
    this.dragonTimeLeft = DRAGON_LAIR_DURATION_SEC;
    this.dragonPhase = 1;
    this.dragonBreathCooldown = 5.5;
    this.dragonBreathWarningTimer = 0;
    this.dragonScalesLooted = 0;
    this.dragonDamageDealt = 0;
    this.ultCharge = 100;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      'LÃNH ĐỊA RỒNG CỔ 3D · NÉ HƠI THỞ RỒNG & SĂN VẢY RỒNG CỔ!'
    );

    // Spawn Composite 3D Ancient Celestial Dragon Boss
    const dragonModel = createAncientDragonBossModel();
    dragonModel.root.position.set(0, 0, -5.8);
    this.entitiesGroup.add(dragonModel.root);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.02, -5.8);
    this.entitiesGroup.add(shadow);

    const telegraphGroup = new THREE.Group();
    const telegraphFill = new THREE.Mesh(
      new THREE.CircleGeometry(0.1, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    telegraphGroup.visible = false;
    this.entitiesGroup.add(telegraphGroup);

    const laserLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ visible: false })
    );
    laserLine.visible = false;
    this.entitiesGroup.add(laserLine);

    // Reusable 3D crimson telegraphed Dragon Breath cone on arena floor
    const coneGeo = new THREE.CircleGeometry(10.5, 22, -0.44, 0.88);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.rotation.x = -Math.PI / 2;
    coneMesh.position.set(0, 0.06, -5.8);
    coneMesh.visible = false;
    this.entitiesGroup.add(coneMesh);
    this.dragonBreathCone = coneMesh;

    const dragonHp = Math.round(Math.max(4800, stats.attack * 56));
    const dragonDmg = Math.round(Math.max(38, stats.maxHp * 0.14));
    const bossShieldMax = Math.round(dragonHp * 0.24);

    this.enemies.push({
      id: this.nextEntityId++,
      kind: EnemyKind.TITAN_BOSS,
      isElite: true,
      isBoss: true,
      x: 0,
      z: -5.8,
      vx: 0,
      vz: 0,
      radius: 1.95,
      hp: dragonHp,
      maxHp: dragonHp,
      speed: 2.35,
      damage: dragonDmg,
      xpValue: 180,
      goldValue: 950,
      spawnTimer: 0.4,
      attackTimer: 1.8,
      telegraphTimer: 0,
      telegraphDuration: 1.1,
      telegraphType: 'none',
      aimX: 0,
      aimZ: 1,
      slamX: 0,
      slamZ: -5.8,
      slamRadius: 3.4,
      laneAngles: [],
      bossPhase: 1,
      phaseTransitioned: false,
      breakShield: bossShieldMax,
      maxBreakShield: bossShieldMax,
      stunTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      poisonDps: 0,
      chillTimer: 0,
      hitFlashTimer: 0,
      phaseAngle: 0,
      model: dragonModel,
      shadow,
      telegraphGroup,
      telegraphFill,
      laserLine,
    });

    const dragonEntity = this.enemies[this.enemies.length - 1];
    this.triggerBossWarning('CỔ LONG TINH GIỚI 3D', 'LÃNH ĐỊA RỒNG CỔ · CHỜ THỦ LĨNH XUẤT HIỆN XONG');
    if (dragonEntity) {
      this.startBossEntranceSequence(dragonEntity, 'Cổ Long Tinh Giới 3D', 0xf97316);
    }
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startSkyCitadel(stats: ComputedPlayerStats): void {
    this.baseStats = stats;
    this.currentChapter = CHAPTERS[1] ?? CHAPTERS[0];
    this.resetRunState(stats);
    this.isSkyCitadelMode = true;
    this.skyCitadelTimeLeft = 70;
    this.skyCitadelWave = 1;
    this.skyCitadelScore = 0;
    this.skyCitadelFeathersLooted = 0;

    this.buildArena(this.currentChapter);
    // High-altitude celestial sky atmosphere
    this.scene.background = new THREE.Color(0x091636);
    this.scene.fog = new THREE.FogExp2(0x0c214a, 0.014);
    this.keyLight.color.setHex(0xfef3c7);
    this.hemiLight.color.setHex(0x7dd3fc);
    this.hemiLight.groundColor.setHex(0x1e293b);

    this.px = 0;
    this.pz = 6.2;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.portal.group.visible = false;
    this.spawnSkyCitadelWave(1);
    this.triggerRoyalEntranceVfx(0x38bdf8);
    this.stageBannerText = 'KHÔNG CHIẾN TINH GIỚI · ĐỢT 1/3';
    this.stageBannerTimer = 2.4;
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private spawnSkyCitadelWave(waveNum: number): void {
    this.skyCitadelWave = waveNum;
    const atkScale = Math.max(1, this.baseStats.attack / 55);
    const hpMult = Math.max(1.2, 1.35 + waveNum * 0.45 + atkScale * 0.15);
    const dmgMult = Math.max(1.0, 1.05 + waveNum * 0.18);

    const scoutCount = waveNum === 3 ? 3 : 4 + waveNum;
    for (let i = 0; i < scoutCount; i++) {
      const ang = (i / scoutCount) * Math.PI * 2;
      const sx = Math.cos(ang) * 6.8;
      const sz = -2.2 + Math.sin(ang) * 4.2;
      const kind = i % 2 === 0 ? EnemyKind.WISP : EnemyKind.DRAGON_WHELP;
      this.createEnemy(kind, sx, sz, hpMult, dmgMult, i === 0);
    }

    if (waveNum >= 3) {
      const seraphHp = Math.round(Math.max(4400, this.baseStats.attack * 52 * Math.min(2.2, 0.9 + atkScale * 0.12)));
      const seraphDmg = Math.round(Math.max(36, this.baseStats.maxHp * 0.13));
      const shieldMax = Math.round(seraphHp * 0.25);
      const seraphModel = createSkySeraphBossModel();
      seraphModel.root.position.set(0, 0, -5.6);
      this.entitiesGroup.add(seraphModel.root);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3.8, 3.8),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(0, 0.02, -5.6);
      this.entitiesGroup.add(shadow);

      const telegraphGroup = new THREE.Group();
      const telegraphFill = new THREE.Mesh(
        new THREE.CircleGeometry(1, 24),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      telegraphFill.rotation.x = -Math.PI / 2;
      telegraphGroup.add(telegraphFill);
      telegraphGroup.visible = false;
      this.entitiesGroup.add(telegraphGroup);

      const laserGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const laserLine = new THREE.Line(
        laserGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8 })
      );
      laserLine.visible = false;
      this.entitiesGroup.add(laserLine);

      this.enemies.push({
        id: this.nextEntityId++,
        kind: EnemyKind.WARDEN_BOSS,
        bossTitle: 'Thiên Sứ Trưởng Không Trung',
        isElite: true,
        isBoss: true,
        x: 0,
        z: -5.6,
        vx: 0,
        vz: 0,
        radius: 1.7,
        hp: seraphHp,
        maxHp: seraphHp,
        speed: 2.65,
        damage: seraphDmg,
        xpValue: 180,
        goldValue: 980,
        spawnTimer: 0.4,
        attackTimer: 1.5,
        telegraphTimer: 0,
        telegraphDuration: 1.0,
        telegraphType: 'none',
        aimX: 0,
        aimZ: 1,
        slamX: 0,
        slamZ: -5.6,
        slamRadius: 3.1,
        laneAngles: [],
        bossPhase: 1,
        phaseTransitioned: false,
        breakShield: shieldMax,
        maxBreakShield: shieldMax,
        stunTimer: 0,
        burnTimer: 0,
        burnDps: 0,
        poisonDps: 0,
        chillTimer: 0,
        hitFlashTimer: 0,
        phaseAngle: 0,
        model: seraphModel,
        shadow,
        telegraphGroup,
        telegraphFill,
        laserLine,
      });

      const seraphEntity = this.enemies[this.enemies.length - 1];
      this.triggerBossWarning('THIÊN SỨ TRƯỞNG KHÔNG TRUNG', 'BOSS KHÔNG CHIẾN 3D · CHỜ THỦ LĨNH XUẤT HIỆN XONG');
      if (seraphEntity) {
        this.startBossEntranceSequence(seraphEntity, 'Thiên Sứ Trưởng Không Trung', 0x38bdf8);
      }
    } else {
      this.stageBannerText = `KHÔNG CHIẾN TINH GIỚI · ĐỢT ${waveNum}/3`;
      this.stageBannerTimer = 2.0;
    }
  }

  private resetRunState(stats: ComputedPlayerStats): void {
    this.activePowerPressure = computePowerPressure(1, 1);
    this.isPantheonMode = false;
    this.isChampionshipMode = false;
    this.isCrystalVaultMode = false;
    this.isDragonLairMode = false;
    this.isSkyCitadelMode = false;
    this.skyCitadelTimeLeft = 0;
    this.skyCitadelWave = 1;
    this.skyCitadelScore = 0;
    this.skyCitadelFeathersLooted = 0;
    this.bossWarningTitle = null;
    this.bossWarningSubtitle = null;
    this.bossWarningTimer = 0;
    this.bossEntranceTimer = 0;
    this.bossEntranceDuration = BOSS_ENTRANCE_SUB_DURATION_SEC;
    this.bossEntranceBossName = null;
    this.bossEntranceLandingFired = false;
    this.bossEntranceHintCd = 0;
    this.dragonTimeLeft = 0;
    this.dragonPhase = 1;
    this.dragonBreathCooldown = 6.0;
    this.dragonBreathWarningTimer = 0;
    this.dragonBreathCone = null;
    this.dragonScalesLooted = 0;
    this.dragonDamageDealt = 0;
    this.vaultTimeLeft = 0;
    this.vaultPillarsBroken = 0;
    this.vaultWave = 0;
    this.vaultGemsLooted = 0;
    this.vaultReforgeLooted = 0;
    this.vaultShardsLooted = 0;
    this.bossBrokenBannerTimer = 0;
    this.championshipRound = 0;
    this.championshipScore = 0;
    this.championshipTacticsOffer = null;
    this.championshipAtkMult = 1.0;
    this.championshipDrBonus = 0;
    this.hp = stats.maxHp;
    this.maxHp = stats.maxHp;
    this.shield = 0;
    this.xp = 0;
    this.xpToNext = 55;
    this.level = 1;
    this.runGold = 0;
    this.runGems = 0;
    this.kills = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxRunCombo = 0;
    this.lastPlayerHitAt = 0;
    this.ultCharge = 65;
    this.coopSynergyClock = createCoopSynergyClock();
    this.lastBossTelegraphKey = '';
    this.kinestheticsClock = createDeterministicKinestheticsClock();
    this.autoPilotUsedInRun =
      this.autoPilotEnabled &&
      !(this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode);
    if (!this.isArenaMode) {
      this.liveAiDuelId = null;
      this.liveAiPlayerId = null;
      this.liveAiPersonality = null;
      this.liveAiRivalTag = null;
      this.trialGauntletRound = null;
      this.trialGauntletKitId = null;
    }
    if (!this.isGuildWarMode) {
      this.guildWarBastionId = null;
      this.guildWarBastionLabel = null;
    }
    this.elementalResonance = createInitialElementalResonanceState();
    this.elementalResonanceChargeAccum = 0;
    this.bossPartBrokenBanner = null;
    this.bossPartBrokenBannerTimer = 0;
    this.runBossPartStarDust = 0;
    const initOverdriveArch: OverdriveWeaponArchetype =
      stats.weaponArchetype === 'staff'
        ? 'staff'
        : stats.weaponArchetype === 'claw'
        ? 'claw'
        : 'bow';
    this.weaponOverdrive = createInitialWeaponOverdriveState(initOverdriveArch);
    this.weaponOverdriveBuffs = { atkMult: 1, aspdMult: 1, critChanceBonus: 0, pierceBonus: 0 };
    if (this.weaponOverdriveRingMesh) {
      this.weaponOverdriveRingMesh.visible = false;
    }
    const reducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    this.cinematicCamera = createIdleCinematicCameraState(reducedMotion);
    if (!this.isTowerMode) {
      this.isEqualizedRiftMode = false;
      this.equalizedRiftMutatorsLabel = null;
      this.equalizedRiftOverdriveMult = 1.0;
    }
    this.squadPingBanner = null;
    this.squadPingBannerTimer = 0;
    this.runLeftDodges = 0;
    this.runRightDodges = 0;
    this.runDashCount = 0;
    this.runDistSum = 0;
    this.runDistSamples = 0;
    this.runDistSampleTimer = 0;
    this.runElemCounts = { fire: 0, ice: 0, storm: 0, poison: 0 };
    this.alexOverdriveTimer = 0;
    this.wukongOverdriveTimer = 0;
    this.activeSkillCooldown = 0;
    this.activeSkillMaxCooldown = getHeroActiveSkill(stats.heroId).cooldownSec;
    this.alexCadenceTimer = 0;
    this.heavyBreakCooldown = 0;
    this.comboBeat = 1;
    this.pendingBeatMult = 1.0;
    this.pendingBeatIsFinisher = false;
    this.activeRoomChaosEvent = null;
    this.roomChaosTimer = 2.8;
    this.ambushBossTriggeredInRun = false;
    this.ambushBossSpawnedInStage = false;
    this.perfectDodgeInternalCd = 0;
    this.perfectDodgeBuffTimer = 0;
    this.perfectDodgeBannerTimer = 0;
    this.perfectDodgeSlowTimer = 0;
    this.perfectDodgeCount = 0;
    this.stageIndex = 0;
    this.waveIndex = 0;
    this.activeSkills = {};
    this.furyBonusMult = 1.0;
    this.revivesLeft = this.hasRune('rune_valkyrie') ? 1 : 0;
    this.hasFullRevive = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invulnTimer = 0;
    this.volleyQueue = [];
    this.attackCooldown = 0;
    this.markedEnemyIds.clear();
    this.artemisMarkTimer = 0;
    this.cleoHitCount = 0;
    this.atreusShotCount = 0;
    this.alexAspdBuffTimer = 0;
    this.alexGuaranteedCrit = false;
    this.petFireTimer = 0;
    this.dmgBasic = 0;
    this.dmgUltimate = 0;
    this.dmgPet = 0;
    this.dmgElemental = 0;
    resetRollingDpsTracker(this.rollingDps);
    this.footstepStrideAccum = 0;
    this.bowCreakReady = true;
    this.lastBossAudioPhase = 1;
    soundEngine.setBossIntensity(1);
    this.restoreDefaultLights();
    this.peakCritDmg = 0;
    this.punishHitsCount = 0;
    this.counterShotTimer = 0;
    this.elementalReactionsCount = 0;
    this.counterShotsCount = 0;
    this.perfectDodgeCounter = createPerfectDodgeCounterState();
    this.coopGuardianHealTicks = 0;
    if (!this.isCoopRaidMode) {
      this.coopRoleSynergy = null;
    }
    if (!this.isWeeklyRankedBossMode) {
      this.bossPaceTracker = null;
      this.bossPaceHud = null;
      this.weeklyBossIsWeekendBlitz = false;
    }
    this.victoryOrbitClock = 0;
    this.runElapsedSeconds = 0;
    this.runWeakPointHits = 0;
    this.runTrapsTriggered = 0;
    this.runBountiesCompleted = 0;
    this.runBossBreaksCount = 0;
    this.runDamageTakenCount = 0;
    this.bossStaggerState = null;
    this.bossStaggerOwnerId = null;
    this.styleMomentum = createStyleMomentumState();
    this.coopPingToast = null;
    this.coopPingToastTimer = 0;
    this.windBeaconSpeedTimer = 0;
    this.trapTriggerToast = null;
    this.trapTriggerToastTimer = 0;
    if (this.phase === GamePhase.TITLE) {
      this.beginArenaEntryFly();
    }
  }

  private beginArenaEntryFly(): void {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !this.camera) {
      this.arenaEntryFlyTimer = 0;
      return;
    }
    this.arenaEntryStartCam.copy(this.camera.position);
    this.arenaEntryStartLook.set(0, 1.05, 4.5);
    this.arenaEntryFlyTimer = this.arenaEntryFlyDuration;
  }

  public triggerLobbyHeroEmote(): void {
    if (this.phase !== GamePhase.TITLE || this.disposed) return;
    this.lobbyEmoteTimer = this.lobbyEmoteDuration;
    this.lobbyAutoSpinIdleTimer = Math.max(this.lobbyAutoSpinIdleTimer, 2.4);
    soundEngine.playLobbyBowEmote();
    const { x, y, z } = this.hero.root.position;
    this.spawnShockwave(x, z, this.weaponAccentHex, 2.6, 0.42);
    this.spawnCritStar(x, y + 1.45, z, 0xfde047, 1.5);
    this.spawnParticles(x, y + 1.15, z, this.weaponAccentHex, 22);
  }

  public setPhase(phase: GamePhase): void {
    const prevPhase = this.phase;
    this.phase = phase;
    const isTitle = phase === GamePhase.TITLE;
    if (this.lobbyHaloGroup) {
      this.lobbyHaloGroup.visible = isTitle;
    }
    if (this.lobbySanctuary) {
      this.lobbySanctuary.group.visible = isTitle;
    }
    this.arenaGroup.visible = !isTitle;

    if (isTitle) {
      this.clearCombatEntities();
      soundEngine.setCombatTelemetry(0, 1, false);
      this.px = 0;
      this.pz = 4.5;
      this.pFacing = 0;
      this.hero.root.position.set(0, 0, 4.5);
      this.hero.bodyGroup.scale.set(1, 1, 1);
      this.heroSquashY = 1;
      this.stridePhase = 0;
      this.lockedTargetId = -1;
      this.heroShadow.position.set(0, 0.02, 4.5);
      this.reticleMesh.visible = false;
      if (this.aimLineMesh) this.aimLineMesh.visible = false;
      this.companionModels.forEach((c) => (c.visible = false));
      // Warm gilded rim + ivory fill light tailored for Lobby Sanctuary hero showcase
      this.rimLight.color.setHex(0xfde68a);
      this.rimLight.intensity = 1.05;
      this.rimLight.position.set(-6.5, 6.2, -3.5);
      this.heroLight.color.setHex(0xfff3d1);
      this.heroLight.intensity = 1.55;
      this.heroLight.position.set(1.8, 2.55, 7.6);
      if (this.hero.mountGroup) this.hero.mountGroup.visible = true;
      if (this.hero.leftWingPivot) this.hero.leftWingPivot.visible = true;
      if (this.hero.rightWingPivot) this.hero.rightWingPivot.visible = true;
      this.isWeeklyRankedBossMode = false;
      this.snapCameraToLobby();
      this.syncCanvasResolution();
    } else {
      // Restore crisp Zodiac-matched combat arena lighting
      this.syncCanvasResolution();
      this.rimLight.color.setHex(this.arenaThemeSpec?.rimLightHex ?? 0x93c5fd);
      this.rimLight.intensity = 0.72;
      this.rimLight.position.set(-12, 10, -14);
      this.heroLight.color.setHex(0x38bdf8);
      this.heroLight.intensity = 1.2;
      if (phase === GamePhase.PLAYING) {
        this.heroSquashY = 1;
        this.stridePhase = 0;
        this.lockedTargetId = -1;
        this.reticleSnapScale = 1;
        if (prevPhase === GamePhase.TITLE && this.arenaEntryFlyTimer <= 0) {
          this.beginArenaEntryFly();
        }
        if (this.arenaEntryFlyTimer <= 0) {
          const snapX = THREE.MathUtils.clamp(this.px * 0.55, -5.5, 5.5);
          const snapZ = THREE.MathUtils.clamp(this.pz * 0.7 + 12.2, 6.5, 22.0);
          this.smoothLookX = THREE.MathUtils.clamp(this.px * 0.45, -4, 4);
          this.smoothLookZ = THREE.MathUtils.clamp(this.pz * 0.72 - 1.55, -7, 7);
          this.camera.position.set(snapX, 16.5, snapZ);
          this.camera.lookAt(this.smoothLookX, 0.5, this.smoothLookZ);
        }
      }
    }
  }

  private snapCameraToLobby(): void {
    const hasMount = Boolean(this.hero?.mountGroup);
    const mountExtraZ = hasMount ? 1.85 : 0;
    const mountExtraY = hasMount ? 0.56 : 0;
    const mountLookY = hasMount ? 0.46 : 0;
    const aspectExtraZ = Math.max(0, (1.42 - this.camera.aspect) * 2.35);
    const isSplit =
      this.lobbyViewMode === 'gear' ||
      this.lobbyViewMode === 'heroes' ||
      this.lobbyViewMode === 'runes';
    const targetCamZ = (isSplit ? 11.1 : 10.65) + mountExtraZ + aspectExtraZ;
    const halfHeightAtHero = Math.tan((46 * Math.PI) / 360) * (targetCamZ - 4.5);
    const splitOffsetX =
      isSplit && this.camera.aspect >= 1.08
        ? Math.min(3.15, 0.56 * halfHeightAtHero * this.camera.aspect)
        : 0;

    this.cameraFovOffset = 0;
    if (Math.abs(this.camera.fov - 46) > 0.01) {
      this.camera.fov = 46;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.set(
      splitOffsetX,
      (isSplit ? 1.98 : 2.02) + mountExtraY,
      targetCamZ
    );
    this.camera.lookAt(splitOffsetX, (isSplit ? 0.95 : 0.96) + mountLookY, 4.5);
  }

  public selectChapterPreview(chapterId: number): void {
    const ch = CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0];
    if (ch.id !== this.currentChapter.id) {
      this.currentChapter = ch;
      this.buildArena(ch);
      if (this.phase === GamePhase.TITLE) {
        this.heroVisualCfg = {
          ...this.heroVisualCfg,
          pedestalTintHex: ch.trimHex,
        };
        this.buildHero();
      }
    }
  }

  public setLobbyViewMode(mode: 'battle' | 'gear' | 'heroes' | 'runes' | 'vault'): void {
    this.lobbyViewMode = mode;
  }

  public setLobbyCameraPreset(preset: LobbyCameraPreset): void {
    this.lobbyCameraPreset = preset;
  }

  public setLobbyHeroPose(pose: LobbyHeroPoseId): void {
    this.lobbyHeroPose = pose;
  }

  public setLobbyPhotoMode(active: boolean, angle: 'full' | 'closeup' | 'hero_wide' = 'full'): void {
    this.lobbyPhotoMode = active;
    this.lobbyPhotoAngle = angle;
    if (active) {
      this.lobbyAutoSpinIdleTimer = 999;
    } else {
      this.lobbyAutoSpinIdleTimer = 1.4;
      this.restoreDefaultLights();
    }
  }

  private restoreDefaultLights(): void {
    this.hemiLight?.color.setHex(0x7dd3fc);
    this.hemiLight?.groundColor.setHex(0x26352e);
    if (this.keyLight) {
      this.keyLight.color.setHex(0xffe4b8);
      this.keyLight.intensity = 1.92;
    }
    if (this.rimLight) {
      this.rimLight.color.setHex(0xfde68a);
      this.rimLight.intensity = 1.15;
    }
    if (this.renderer) {
      this.renderer.toneMappingExposure = 1.12;
    }
  }

  public setPhotoLightingPreset(preset: PhotoLightingPreset): void {
    this.photoLightingPreset = preset;
  }

  public capturePhotoDataUrl(): string | null {
    if (this.disposed || this.contextLost || this.appearanceStatus !== 'ready') return null;
    try {
      soundEngine.playPhotoShutter();
      this.renderer.render(this.scene, this.camera);
      return this.renderer.domElement.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  public rotateLobbyHero(deltaRad: number): void {
    this.lobbyTargetYaw += deltaRad;
    this.lobbyAutoSpinIdleTimer = 3.2;
  }

  public resetLobbyHeroRotation(): void {
    this.lobbyTargetYaw = 0.18;
    this.lobbyAutoSpinIdleTimer = 0;
  }

  public applySkillChoice(skillId: SkillId): void {
    const prevSynergies = new Set(evaluateActiveSynergies(this.activeSkills));
    const current = this.activeSkills[skillId] ?? 0;
    this.activeSkills[skillId] = current + 1;
    const nextSynergies = evaluateActiveSynergies(this.activeSkills);
    const newlyUnlocked = nextSynergies.filter((id) => !prevSynergies.has(id));

    if (skillId === 'fountain_of_life') {
      const addHp = Math.round(this.baseStats.maxHp * 0.25);
      this.maxHp += addHp;
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.4));
    } else if (skillId === 'power_trio') {
      const addHp = Math.round(this.baseStats.maxHp * 0.2);
      this.maxHp += addHp;
      this.hp = Math.min(this.maxHp, this.hp + addHp);
      this.furyBonusMult += 0.15;
    } else if (skillId === 'sacred_protection') {
      const aegisMult = nextSynergies.includes('aegis_sanctuary') ? 1.25 : 1.0;
      this.shield += Math.round(this.maxHp * 0.45 * aegisMult);
    } else if (skillId === 'revive') {
      this.revivesLeft += 1;
      this.hasFullRevive = true;
    } else if (skillId === 'bomb_sprite' || skillId === 'laser_sprite') {
      this.rebuildCompanions();
    }

    if (newlyUnlocked.includes('aegis_sanctuary') && (this.activeSkills.sacred_protection ?? 0) > 0) {
      this.shield += Math.round(this.maxHp * 0.12);
    }

    if (newlyUnlocked.length > 0) {
      const syn = SKILL_SYNERGY_MAP[newlyUnlocked[0]];
      if (syn) {
        soundEngine.playSynergyUnlock();
        this.synergyAwakenedName = syn.name;
        this.synergyAwakenedTimer = 2.6;
        this.spawnParticles(this.px, 1.3, this.pz, 0xfbbf24, 24);
        this.spawnShockwave(this.px, this.pz, 0xfbbf24, 3.4, 0.4);
        this.emitFloatingNumber(
          this.px,
          2.25,
          this.pz,
          0,
          true,
          false,
          undefined,
          `CỘNG HƯỞNG · ${syn.name.toUpperCase()}!`,
          true
        );
      }
    }

    this.updateOrbitOrbVisibility();
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public applyAngelChoice(choice: 'max_hp' | 'heal'): void {
    if (choice === 'max_hp') {
      const addHp = Math.round(this.maxHp * 0.18);
      this.maxHp += addHp;
      this.hp = Math.min(this.maxHp, this.hp + addHp);
      this.emitFloatingNumber(this.px, 2.0, this.pz, addHp, false, true, undefined, '+Max HP!');
    } else {
      const healAmt = Math.round(this.maxHp * 0.65);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.emitFloatingNumber(this.px, 2.0, this.pz, healAmt, false, true);
    }
    this.spawnParticles(this.px, 1.0, this.pz, 0x34d399, 20);
    this.closeShrineAndResume();
  }

  public applyDevilPact(acceptSkill?: SkillId): void {
    if (acceptSkill) {
      this.maxHp = Math.max(40, Math.round(this.maxHp * 0.85));
      this.hp = Math.min(this.hp, this.maxHp);
      this.applySkillChoice(acceptSkill);
      this.spawnParticles(this.px, 1.0, this.pz, 0xf43f5e, 22);
    }
    this.closeShrineAndResume();
  }

  public applyWheelOutcome(outcome: WheelOutcome): void {
    if (outcome.kind === 'gold') {
      this.runGold += outcome.amount;
    } else if (outcome.kind === 'gems') {
      this.runGems += outcome.amount;
    } else if (outcome.kind === 'heal') {
      const healAmt = Math.round(this.maxHp * (outcome.amount / 100));
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.emitFloatingNumber(this.px, 2.0, this.pz, healAmt, false, true);
    } else if (outcome.kind === 'atk') {
      this.furyBonusMult += outcome.amount / 100;
    }
    this.spawnParticles(this.px, 1.1, this.pz, 0xfbbf24, 24);
    this.closeShrineAndResume();
  }

  public resumeFromDraft(): void {
    this.closeShrineAndResume();
  }

  private closeShrineAndResume(): void {
    this.shrineUsed = true;
    if (this.shrineGroup) {
      this.releaseObject(this.shrineGroup);
      this.shrineGroup = null;
    }
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  private getOrbitOrbCount(): number {
    const circleOrbs = (this.activeSkills.orbit_orbs ?? 0) * 2;
    const superOrbs = (this.activeSkills.super_circle ?? 0) * 4;
    const runeOrbs = this.hasRune('ability_circle') ? 2 : 0;
    return Math.min(8, circleOrbs + superOrbs + runeOrbs);
  }

  private updateOrbitOrbVisibility(): void {
    const count = this.getOrbitOrbCount();
    for (let i = 0; i < this.orbitOrbMeshes.length; i++) {
      this.orbitOrbMeshes[i].visible = i < count;
    }
  }

  private releaseObject(root: THREE.Object3D): void {
    const retained = new Set<THREE.Texture>([this.contactShadowTex]);
    if (this.envRenderTarget) retained.add(this.envRenderTarget.texture);
    disposeObjectResources(root, retained);
  }

  private clearCombatEntities(): void {
    this.stormChart = null;
    this.stormChartFadeTimer = 0;
    this.stormChartPulseFlash = 0;
    if (this.stormChartVisual) {
      this.stormChartVisual.group.visible = false;
    }
    this.obstacles.forEach((o) => this.releaseObject(o.mesh));
    this.obstacles = [];

    this.urns.forEach((u) => {
      this.releaseObject(u.mesh);
      this.releaseObject(u.shadow);
    });
    this.urns = [];

    this.enemies.forEach((e) => {
      this.releaseObject(e.model.root);
      this.releaseObject(e.shadow);
      this.releaseObject(e.telegraphGroup);
      if (e.punishRingMesh) this.releaseObject(e.punishRingMesh);
      if (e.breakShieldRingMesh) this.releaseObject(e.breakShieldRingMesh);
      if (e.eliteAuraRingMesh) this.releaseObject(e.eliteAuraRingMesh);
      if (e.eliteAuraRingMesh2) this.releaseObject(e.eliteAuraRingMesh2);
      if (e.hpBarGroup) this.releaseObject(e.hpBarGroup);
      this.releaseObject(e.laserLine);
      if (e.boneTrails) {
        disposeBoneTrailController(e.boneTrails);
        e.boneTrails = undefined;
      }
    });
    this.enemies = [];
    this.killResolutionDepth = 0;
    this.dyingCorpses?.forEach((c) => this.releaseObject(c.root));
    this.dyingCorpses = [];

    this.volatileBlasts?.forEach((vb) => {
      this.releaseObject(vb.ring);
      this.releaseObject(vb.fill);
    });
    this.volatileBlasts = [];
    this.arenaHazards?.forEach((hz) => {
      this.releaseObject(hz.ring);
      this.releaseObject(hz.fill);
    });
    this.arenaHazards = [];
    this.arenaHazardSpawnTimer = 5.4;
    this.bossIntroTimer = 0;
    this.bossEntranceTimer = 0;
    this.bossEntranceDuration = BOSS_ENTRANCE_SUB_DURATION_SEC;
    this.bossEntranceBossName = null;
    this.bossEntranceLandingFired = false;
    this.bossEntranceHintCd = 0;
    this.bossFinisherTimer = 0;
    this.bossFinisherName = null;
    this.synergyAwakenedTimer = 0;
    this.synergyAwakenedName = null;
    this.elementalZoneSpawnCd = 0;
    this.ultCutinTimer = 0;
    this.ultCutinTitle = null;
    this.ultCutinHeroName = null;
    this.ultCutinAccentHex = null;
    this.bossPhaseShiftTimer = 0;
    this.bossPhaseShiftLevel = null;
    this.arenaEntryFlyTimer = 0;
    this.bossPhaseTwoBannerTimer = 0;
    this.bossPhaseThreeBannerTimer = 0;
    this.counterShotTimer = 0;
    this.victoryOrbitClock = 0;
    this.playerFrostSlowTimer = 0;
    this.lastHitAngleDeg = null;
    this.roomChaosTimer = 2.8;
    this.ambushBossSpawnedInStage = false;
    if (this.aimLineMesh) this.aimLineMesh.visible = false;
    this.impactDecalPool?.forEach((d) => {
      d.active = false;
      d.mesh.visible = false;
      d.ring.visible = false;
    });
    this.elementalZonePool?.forEach((ez) => {
      ez.active = false;
      ez.discMesh.visible = false;
      ez.ringMesh.visible = false;
    });
    this.critStarPool?.forEach((c) => {
      c.active = false;
      c.group.visible = false;
    });
    this.impactLightPool?.forEach((slot) => {
      slot.intensity = 0;
      slot.light.intensity = 0;
    });
    this.summonPortalPool?.forEach((sp) => {
      sp.active = false;
      sp.group.visible = false;
    });
    this.armorShardPool?.forEach((sh) => {
      sh.active = false;
      sh.mesh.visible = false;
    });
    this.dashScorchPool?.forEach((ds) => {
      ds.active = false;
      ds.mesh.visible = false;
    });
    this.battleScarPool?.forEach((sc) => {
      sc.active = false;
      sc.group.visible = false;
    });
    this.windRingPool?.forEach((wr) => {
      wr.active = false;
      wr.group.visible = false;
    });
    this.stormMarkPool?.forEach((sm) => {
      sm.active = false;
      sm.group.visible = false;
    });
    this.simClock = createFixedTimestepClock();
    this.astralOvercharge = 0;
    if (this.overchargeRingGroup) {
      this.overchargeRingGroup.visible = false;
      this.overchargeRingGroup.renderOrder = 6;
    }
    this.companionSynergyTimer = 0;
    this.companionSynergyStruck = false;
    this.mountBankTiltZ = 0;
    this.roomBounty = null;
    this.roomBountyBanner = null;
    this.roomBountyBannerTimer = 0;
    this.bossWeakPointState = null;
    this.bossWeakPointEnemyId = null;
    if (this.bossWeakPointGroup) this.bossWeakPointGroup.visible = false;
    if (this.targetLockGroup) this.targetLockGroup.visible = false;
    this.stuckArrowPool?.forEach((sa) => {
      sa.active = false;
      sa.enemyId = -1;
      sa.mesh.visible = false;
    });
    this.footstepRipplePool?.forEach((fr) => {
      fr.active = false;
      fr.mesh.visible = false;
    });
    this.resonanceTraps?.forEach((t) => this.releaseObject(t.group));
    this.resonanceTraps = [];
    this.wave9Props?.forEach((p) => this.releaseObject(p.group));
    this.wave9Props = [];
    this.wave11Hazards?.forEach((h) => this.releaseObject(h.group));
    this.wave11Hazards = [];
    if (this.weaponOverdriveRingMesh) {
      this.releaseObject(this.weaponOverdriveRingMesh);
      this.weaponOverdriveRingMesh = null;
    }
    this.wave9PropBuffTimer = 0;
    this.wave9PropAtkBonusPct = 0;
    this.wave9PropAspdBonusPct = 0;
    this.wave9PropBuffLabel = null;
    this.bossPhaseCounterTimer = 0;
    this.bossPhaseCounterLevel = null;
    this.executionFinisherTimer = 0;
    this.coopSanctuaryCooldown = 0;
    this.coopSanctuaryActiveTimer = 0;
    this.coopPrimerBanner = null;
    this.coopPrimerBannerTimer = 0;
    if (this.coopSanctuaryRing) {
      this.releaseObject(this.coopSanctuaryRing);
      this.coopSanctuaryRing = null;
    }
    this.trapTriggerToast = null;
    this.trapTriggerToastTimer = 0;
    this.windBeaconSpeedTimer = 0;

    this.lootOrbs.forEach((o) => this.releaseObject(o.mesh));
    this.lootOrbs = [];

    this.coopAllies?.forEach((a) => {
      this.releaseObject(a.model.root);
      this.releaseObject(a.shadow);
    });
    this.coopAllies = [];

    if (this.shrineGroup) {
      this.releaseObject(this.shrineGroup);
      this.shrineGroup = null;
    }

    if (this.crystalRefs) {
      this.releaseObject(this.crystalRefs.group);
      this.crystalRefs = null;
    }

    this.guildWarNodes?.forEach((n) => this.releaseObject(n.group));
    this.guildWarNodes = [];

    this.arrowPool.forEach((p) => {
      p.active = false;
      p.coopAllyIndex = undefined;
      p.mesh.visible = false;
    });
    this.enemyOrbPool.forEach((p) => {
      p.active = false;
      p.mesh.visible = false;
    });
    this.meteorPool.forEach((m) => {
      m.active = false;
      m.mesh.visible = false;
      m.ring.visible = false;
    });
    this.shockwavePool.forEach((s) => {
      s.active = false;
      s.mesh.visible = false;
    });
    this.ultColumnPool?.forEach((c) => {
      c.active = false;
      c.mesh.visible = false;
    });
    this.dashGhostPool?.forEach((g) => {
      g.active = false;
      g.group.visible = false;
    });
    this.dangerLanePool.forEach((l) => {
      l.active = false;
      l.mesh.visible = false;
    });
    this.bossHazardPool?.forEach((h) => {
      h.active = false;
      h.group.visible = false;
    });
    this.bossMultiSlamPool?.forEach((m) => {
      m.active = false;
      m.group.visible = false;
    });
    this.orbitOrbMeshes.forEach((m) => (m.visible = false));
  }

  private loadElementalTowerFloor(floor: number): void {
    const tDef = ELEMENTAL_TOWER_MAP[this.elementalTowerId];
    this.elementalTowerFloor = floor;
    const isBossFloor = floor % 3 === 0;
    const presets: Array<'courtyard' | 'pillars' | 'cross' | 'gauntlet' | 'sanctum'> = [
      'courtyard',
      'pillars',
      'cross',
      'gauntlet',
      'sanctum',
    ];
    const preset = presets[(floor - 1) % presets.length];

    const poolByElement: Record<ElementalTowerId, EnemyKind[]> = {
      fire: [EnemyKind.DRAGON_WHELP, EnemyKind.SKIRMISHER, EnemyKind.IMP_ARCHER, EnemyKind.GOLEM],
      ice: [EnemyKind.WISP, EnemyKind.GOLEM, EnemyKind.IMP_ARCHER, EnemyKind.SHADOW_STALKER],
      storm: [EnemyKind.SHADOW_STALKER, EnemyKind.WISP, EnemyKind.SKIRMISHER, EnemyKind.DRAGON_WHELP],
    };
    const ePool = poolByElement[this.elementalTowerId];
    const k1 = ePool[floor % ePool.length];
    const k2 = ePool[(floor + 1) % ePool.length];

    if (isBossFloor) {
      const bossKind =
        this.elementalTowerId === 'storm'
          ? EnemyKind.ZODIAC_BOSS
          : this.elementalTowerId === 'fire'
          ? EnemyKind.TITAN_BOSS
          : EnemyKind.WARDEN_BOSS;
      this.elementalWaveDefs = [
        [
          { kind: bossKind, count: 1 },
          { kind: k1, count: Math.min(3, 1 + Math.floor(floor / 4)), isElite: floor >= 4 },
        ],
      ];
    } else {
      const baseCount = Math.min(6, 2 + Math.floor(floor / 3));
      this.elementalWaveDefs = [
        [
          { kind: k1, count: baseCount },
          { kind: k2, count: Math.max(1, baseCount - 1), isElite: floor >= 3 },
        ],
      ];
    }

    this.setupStageArena(
      preset,
      isBossFloor,
      isBossFloor
        ? `THỦ LĨNH ${tDef.name.toUpperCase()} · TẦNG ${floor}`
        : `${tDef.name} · Tầng ${floor} (+50% ST ${tDef.shortName})`
    );
    this.spawnElementalTowerWave(0);
    this.syncHudImmediate();
  }

  private spawnElementalTowerWave(waveIdx: number): void {
    const groups = this.elementalWaveDefs[waveIdx];
    if (!groups) return;
    this.waveIndex = waveIdx;
    const hpMult = 0.95 + this.elementalTowerFloor * 0.25;
    const dmgMult = 0.95 + this.elementalTowerFloor * 0.12;
    const tDef = ELEMENTAL_TOWER_MAP[this.elementalTowerId];
    this.spawnEnemyGroups(
      groups,
      hpMult,
      dmgMult,
      `Hộ Vệ ${tDef.name} · Tầng ${this.elementalTowerFloor}`
    );
  }

  private loadTowerFloor(floor: number): void {
    const ch = CHAPTERS[(floor - 1) % CHAPTERS.length];
    if (ch.id !== this.currentChapter.id) {
      this.currentChapter = ch;
      this.buildArena(ch);
    }

    this.towerFloor = floor;
    this.activePowerPressure = computePowerPressure(
      this.baseStats.powerRating,
      getTowerRecommendedPower(floor)
    );
    const isBossFloor = floor % 3 === 0;
    const presets: Array<'courtyard' | 'pillars' | 'cross' | 'gauntlet' | 'sanctum'> = [
      'courtyard',
      'pillars',
      'cross',
      'gauntlet',
      'sanctum',
    ];
    const preset = presets[(floor - 1) % presets.length];

    const kindsPool: EnemyKind[] = [
      EnemyKind.SKIRMISHER,
      EnemyKind.IMP_ARCHER,
      EnemyKind.GOLEM,
      EnemyKind.WISP,
      EnemyKind.DRAGON_WHELP,
      EnemyKind.SHADOW_STALKER,
    ];
    const k1 = kindsPool[(floor * 2) % kindsPool.length];
    const k2 = kindsPool[(floor * 2 + 1) % kindsPool.length];
    const k3 = kindsPool[(floor * 2 + 3) % kindsPool.length];

    if (isBossFloor) {
      const bossKind =
        floor % 9 === 0
          ? EnemyKind.ZODIAC_BOSS
          : floor % 6 === 0
          ? EnemyKind.TITAN_BOSS
          : EnemyKind.WARDEN_BOSS;
      this.towerWaveDefs = [
        [
          { kind: bossKind, count: 1 },
          { kind: k1, count: Math.min(3, 1 + Math.floor(floor / 6)), isElite: floor >= 6 },
        ],
      ];
    } else {
      const baseCount = Math.min(6, 2 + Math.floor(floor / 3));
      this.towerWaveDefs = [
        [
          { kind: k1, count: baseCount },
          { kind: k2, count: Math.max(1, baseCount - 1) },
        ],
        [
          { kind: k2, count: baseCount },
          { kind: k3, count: Math.max(1, Math.floor(baseCount / 2)), isElite: floor >= 2 },
        ],
      ];
    }

    this.setupStageArena(
      preset,
      isBossFloor,
      isBossFloor
        ? `CẢNH BÁO BOSS · Tầng ${floor} (${ch.bossName})`
        : `Tháp Vô Tận · Tầng ${floor} (${ch.zodiacName})`
    );
    this.spawnTowerWave(0);
    this.syncHudImmediate();
  }

  private loadBossRushRound(round: number): void {
    const chapterMap = [0, 3, 6, 9, 11];
    const ch = CHAPTERS[chapterMap[Math.min(round - 1, chapterMap.length - 1)]] ?? CHAPTERS[0];
    if (ch.id !== this.currentChapter.id) {
      this.currentChapter = ch;
      this.buildArena(ch);
    }

    this.bossRushRound = round;
    const sideScale = getSideModeScaling(this.sideModeHighestCleared);
    const hpMult = (0.9 + round * 0.36) * sideScale.enemyHpScale;
    const dmgMult = (0.9 + round * 0.18) * sideScale.enemyDmgScale;

    const roundConfigs: Array<{
      title: string;
      preset: 'courtyard' | 'pillars' | 'cross' | 'gauntlet' | 'sanctum';
      groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }>;
    }> = [
      {
        title: `Vòng 1/5 · Hộ Vệ Thánh Điện`,
        preset: 'courtyard',
        groups: [
          { kind: EnemyKind.WARDEN_BOSS, count: 1 },
          { kind: EnemyKind.SKIRMISHER, count: 2 },
        ],
      },
      {
        title: `Vòng 2/5 · Chiến Thần Titan`,
        preset: 'pillars',
        groups: [
          { kind: EnemyKind.TITAN_BOSS, count: 1 },
          { kind: EnemyKind.IMP_ARCHER, count: 2, isElite: true },
        ],
      },
      {
        title: `Vòng 3/5 · Chúa Tể Hoàng Đạo`,
        preset: 'cross',
        groups: [
          { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
          { kind: EnemyKind.WISP, count: 2, isElite: true },
        ],
      },
      {
        title: `Vòng 4/5 · Song Trùng Hộ Vệ`,
        preset: 'gauntlet',
        groups: [
          { kind: EnemyKind.WARDEN_BOSS, count: 1 },
          { kind: EnemyKind.TITAN_BOSS, count: 1 },
        ],
      },
      {
        title: `Vòng 5/5 · Tối Thượng Nhật Thực`,
        preset: 'sanctum',
        groups: [
          { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
          { kind: EnemyKind.SHADOW_STALKER, count: 2, isElite: true },
        ],
      },
    ];

    const cfg = roundConfigs[Math.min(round - 1, roundConfigs.length - 1)];
    this.setupStageArena(cfg.preset, true, `SĂN BOSS · ${cfg.title}`);
    this.spawnEnemyGroups(cfg.groups, hpMult, dmgMult, cfg.title);
    this.syncHudImmediate();
  }

  private loadDailyRiftStage(idx: number): void {
    this.dailyRiftStageIdx = idx;
    const chIdx = (idx * 3 + 2) % CHAPTERS.length;
    const ch = CHAPTERS[chIdx] ?? CHAPTERS[0];
    if (ch.id !== this.currentChapter.id) {
      this.currentChapter = ch;
      this.buildArena(ch);
    }

    const isBoss = idx >= this.dailyRiftTotalStages - 1;
    const presets: Array<'courtyard' | 'pillars' | 'sanctum'> = ['courtyard', 'pillars', 'sanctum'];
    if (idx === 0) {
      this.dailyRiftWaveDefs = [
        [
          { kind: EnemyKind.SKIRMISHER, count: 3 },
          { kind: EnemyKind.IMP_ARCHER, count: 2 },
        ],
        [
          { kind: EnemyKind.GOLEM, count: 1, isElite: true },
          { kind: EnemyKind.WISP, count: 3 },
        ],
      ];
    } else if (idx === 1) {
      this.dailyRiftWaveDefs = [
        [
          { kind: EnemyKind.DRAGON_WHELP, count: 2, isElite: true },
          { kind: EnemyKind.SHADOW_STALKER, count: 2 },
        ],
        [
          { kind: EnemyKind.GOLEM, count: 2, isElite: true },
          { kind: EnemyKind.IMP_ARCHER, count: 3 },
        ],
      ];
    } else {
      this.dailyRiftWaveDefs = [
        [
          { kind: EnemyKind.ZODIAC_BOSS, count: 1 },
          { kind: EnemyKind.WISP, count: 2, isElite: true },
        ],
      ];
    }

    const riftTitle = this.dailyRiftPair?.title ?? 'Bí Cảnh Hoàng Đạo';
    this.setupStageArena(
      presets[idx % presets.length],
      isBoss,
      isBoss
        ? `BOSS BÍ CẢNH · ${riftTitle}`
        : `Bí Cảnh ${idx + 1}/${this.dailyRiftTotalStages} · ${this.dailyRiftPair?.playerBuffTitle ?? ''}`
    );
    this.spawnDailyRiftWave(0);
    this.syncHudImmediate();
  }

  private spawnDailyRiftWave(waveIdx: number): void {
    const groups = this.dailyRiftWaveDefs[waveIdx];
    if (!groups) return;
    this.waveIndex = waveIdx;
    const sideScale = getSideModeScaling(this.sideModeHighestCleared);
    const enemyHpScale = this.dailyRiftPair?.enemyHpMult ?? 1.2;
    const bossScale = this.dailyRiftPair?.bossScaleMult ?? 1.2;
    const stageScale = 1 + this.dailyRiftStageIdx * 0.22;
    const hpMult =
      0.95 * stageScale * enemyHpScale * sideScale.enemyHpScale * (this.dailyRiftStageIdx >= 2 ? bossScale : 1);
    const dmgMult = (0.95 + this.dailyRiftStageIdx * 0.16) * sideScale.enemyDmgScale;
    this.spawnEnemyGroups(
      groups,
      hpMult,
      dmgMult,
      `Hộ Vệ Bí Cảnh · ${this.dailyRiftPair?.enemyChallengeTitle ?? 'Hoàng Đạo'}`
    );
  }

  private setupStageArena(
    obstaclePreset: 'courtyard' | 'pillars' | 'cross' | 'gauntlet' | 'sanctum',
    isBossStage: boolean,
    bannerText: string
  ): void {
    this.clearCombatEntities();
    this.waveIndex = 0;
    this.portalOpen = false;
    this.shrineUsed = false;
    this.shrineKind = 'none';
    this.volleyQueue = [];
    this.markedEnemyIds.clear();
    this.updateOrbitOrbVisibility();
    this.companionModels.forEach((c) => (c.visible = true));

    let stageShield = 0;
    if (this.hasRune('rootguard')) {
      stageShield += Math.round(this.maxHp * 0.2);
    }
    if ((this.activeSkills.sacred_protection ?? 0) > 0) {
      stageShield += Math.round(
        this.maxHp * 0.45 * (this.activeSkills.sacred_protection ?? 0)
      );
    }
    this.shield = Math.max(this.shield, stageShield);

    this.px = 0;
    this.pz = ARENA_HALF_D - 2.3;
    this.pvx = 0;
    this.pvz = 0;
    this.pFacing = Math.PI;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    this.stageBannerText = bannerText;
    this.stageBannerTimer = 2.6;
    if (isBossStage) {
      soundEngine.playBossAlarm();
    }

    // AAA Wave 6: Spawn optional 1-line Tactical Room Bounty for standard/tower/rift combat rooms
    const supportsRoomBounty =
      !this.isTrainingMode &&
      !this.isArenaMode &&
      !this.isGuildBossMode &&
      !this.isWorldBossMode &&
      !this.isCrystalVaultMode &&
      !this.isBloodMoonMode &&
      !this.isGuildWarMode &&
      !this.isDragonLairMode &&
      !this.isSkyCitadelMode;
    if (supportsRoomBounty) {
      const hasElemental =
        (this.activeSkills.fire_arrow ?? 0) > 0 ||
        (this.activeSkills.ice_arrow ?? 0) > 0 ||
        (this.activeSkills.lightning_arrow ?? 0) > 0 ||
        (this.activeSkills.venom_arrow ?? 0) > 0;
      const bountySeed =
        this.currentChapter.id * 17 + this.stageIndex * 5 + (this.towerFloor || 0) * 3;
      this.roomBounty = createRoomBounty(bountySeed, isBossStage, hasElemental);
      this.activeRoomChaosEvent = rollRoomChaosEvent(
        this.currentChapter.id,
        this.stageIndex,
        isBossStage,
        Math.random()
      );
      this.roomChaosTimer = 2.6;
      this.ambushBossSpawnedInStage = false;
      if (this.activeRoomChaosEvent) {
        this.stageBannerText = `${bannerText} · ${this.activeRoomChaosEvent.title}`;
        this.stageBannerTimer = 2.9;
      }
    } else {
      this.roomBounty = null;
      this.activeRoomChaosEvent = null;
      this.ambushBossSpawnedInStage = false;
    }

    const pillarCoords: Array<[number, number]> = [];
    if (obstaclePreset === 'courtyard') {
      pillarCoords.push([-5.2, -2.5], [5.2, -2.5], [-5.2, 4.2], [5.2, 4.2]);
    } else if (obstaclePreset === 'pillars') {
      pillarCoords.push([-4.8, -5.5], [4.8, -5.5], [0, -0.5], [-4.8, 4.5], [4.8, 4.5]);
    } else if (obstaclePreset === 'cross') {
      pillarCoords.push([0, -5.5], [-5.8, 0], [5.8, 0], [0, 4.2]);
    } else if (obstaclePreset === 'gauntlet') {
      pillarCoords.push([-4.2, -6.2], [4.2, -6.2], [-4.2, 0], [4.2, 0], [-4.2, 5.4], [4.2, 5.4]);
    } else if (obstaclePreset === 'sanctum') {
      pillarCoords.push([-6.5, -5.5], [6.5, -5.5], [-6.5, 4.5], [6.5, 4.5]);
    }

    pillarCoords.forEach(([ox, oz], pIdx) => {
      const mesh = createPillarModel(
        this.currentChapter.stoneHex,
        this.currentChapter.trimHex
      );
      const isCrystalCover = pIdx % 2 === 0;
      let crystalCap: THREE.Mesh | undefined;
      if (isCrystalCover) {
        const capGeo = new THREE.OctahedronGeometry(0.42, 0);
        capGeo.scale(1, 1.55, 1);
        const capMat = new THREE.MeshStandardMaterial({
          color: 0x67e8f9,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.35,
          roughness: 0.14,
          metalness: 0.25,
          transparent: true,
          opacity: 0.88,
        });
        crystalCap = new THREE.Mesh(capGeo, capMat);
        crystalCap.position.y = 2.62;
        mesh.add(crystalCap);
      }
      mesh.position.set(ox, 0, oz);
      this.entitiesGroup.add(mesh);
      this.obstacles.push({
        x: ox,
        z: oz,
        radius: 0.92,
        mesh,
        destructible: isCrystalCover,
        intact: true,
        crystalCap,
      });
    });

    const urnSeed =
      this.currentChapter.id * 31 + this.stageIndex * 7 + (this.towerFloor || 0) * 3;
    const urnPlacements = computeZodiacUrnPlacements(urnSeed, this.obstacles);
    urnPlacements.slice(0, isBossStage ? 2 : 3).forEach((spot) => {
      const { group: mesh, sealMesh } = createDestructibleZodiacUrnModel(spot.variant);
      mesh.position.set(spot.x, 0, spot.z);
      this.entitiesGroup.add(mesh);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.08, 1.08),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.44,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(spot.x, 0.02, spot.z);
      this.entitiesGroup.add(shadow);
      this.urns.push({
        x: spot.x,
        z: spot.z,
        radius: 0.62,
        alive: true,
        variant: spot.variant,
        mesh,
        sealMesh,
        shadow,
      });
    });

    // AAA Wave 7: Interactive 3D Arena Resonance Traps (shootable elemental totems)
    if (
      !this.isTrainingMode &&
      !this.isArenaMode &&
      !this.isChampionshipMode &&
      !this.isSkyCitadelMode
    ) {
      const trapPlacements = computeResonanceTrapPlacements(
        urnSeed + 17,
        ARENA_HALF_W,
        ARENA_HALF_D,
        this.obstacles.map((o) => ({ x: o.x, z: o.z, r: o.radius })),
        isBossStage
      );
      trapPlacements.forEach((tp) => {
        const cfg = RESONANCE_TRAP_CONFIGS[tp.kind];
        const grp = new THREE.Group();
        grp.position.set(tp.x, 0, tp.z);

        const basePedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.62, 0.42, 6),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.45,
            metalness: 0.55,
          })
        );
        basePedestal.position.y = 0.21;
        const runeCollar = new THREE.Mesh(
          new THREE.TorusGeometry(0.44, 0.045, 8, 18),
          new THREE.MeshStandardMaterial({
            color: cfg.primaryHex,
            emissive: cfg.primaryHex,
            emissiveIntensity: 0.9,
            roughness: 0.25,
            metalness: 0.8,
          })
        );
        runeCollar.rotation.x = Math.PI / 2;
        runeCollar.position.y = 0.44;
        const crystal = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.34, 0),
          new THREE.MeshStandardMaterial({
            color: cfg.accentHex,
            emissive: cfg.primaryHex,
            emissiveIntensity: 1.35,
            roughness: 0.14,
            metalness: 0.72,
          })
        );
        crystal.position.y = 1.15;
        const groundRing = new THREE.Mesh(
          new THREE.RingGeometry(0.76, 0.92, 24),
          new THREE.MeshBasicMaterial({
            color: cfg.primaryHex,
            transparent: true,
            opacity: 0.62,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          })
        );
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = 0.03;

        grp.add(basePedestal, runeCollar, crystal, groundRing);
        this.entitiesGroup.add(grp);
        this.resonanceTraps.push({
          x: tp.x,
          z: tp.z,
          radius: 0.78,
          kind: tp.kind,
          cooldown: 0,
          group: grp,
          crystal,
          ring: groundRing,
        });
      });

      // Wave 9: Interactive 3D Destructible/Activatable Composite PBR Arena Props along flanks
      const propPlacements = computeWave9ArenaPropPlacements(
        urnSeed + 43,
        ARENA_HALF_W,
        ARENA_HALF_D,
        [
          ...this.obstacles.map((o) => ({ x: o.x, z: o.z, r: o.radius })),
          ...this.resonanceTraps.map((t) => ({ x: t.x, z: t.z, r: t.radius })),
        ],
        isBossStage
      );
      propPlacements.forEach((pp) => {
        const cfg = ARENA_PROP_CONFIGS[pp.kind];
        const propGroup = new THREE.Group();
        propGroup.position.set(pp.x, 0, pp.z);

        // Part 1: Matte stone hexagonal plinth grounded cleanly at y = 0
        const plinth = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.56, 0.24, 6),
          new THREE.MeshStandardMaterial({
            color: cfg.stoneHex,
            roughness: 0.86,
            metalness: 0.14,
          })
        );
        plinth.position.y = 0.12;
        plinth.castShadow = true;
        plinth.receiveShadow = true;

        // Part 2: Mid-column or relic chest body
        const bodyGeo =
          pp.kind === 'relic_crate'
            ? new THREE.BoxGeometry(0.68, 0.54, 0.56)
            : new THREE.CylinderGeometry(0.28, 0.36, 0.72, 8);
        const body = new THREE.Mesh(
          bodyGeo,
          new THREE.MeshStandardMaterial({
            color: cfg.stoneHex,
            roughness: 0.78,
            metalness: 0.18,
          })
        );
        body.position.y = pp.kind === 'relic_crate' ? 0.51 : 0.6;
        body.castShadow = true;

        // Part 3: Polished metallic trim band
        const trimMesh = new THREE.Mesh(
          pp.kind === 'relic_crate'
            ? new THREE.BoxGeometry(0.74, 0.1, 0.62)
            : new THREE.TorusGeometry(0.35, 0.045, 8, 18),
          new THREE.MeshStandardMaterial({
            color: cfg.metalHex,
            roughness: 0.22,
            metalness: 0.88,
          })
        );
        if (pp.kind !== 'relic_crate') {
          trimMesh.rotation.x = Math.PI / 2;
          trimMesh.position.y = 0.82;
        } else {
          trimMesh.position.y = 0.64;
        }

        // Part 4: Emissive celestial core
        const coreGeo =
          pp.kind === 'celestial_obelisk'
            ? new THREE.OctahedronGeometry(0.26, 0)
            : pp.kind === 'crimson_brazier'
            ? new THREE.DodecahedronGeometry(0.24, 0)
            : new THREE.OctahedronGeometry(0.2, 0);
        const core = new THREE.Mesh(
          coreGeo,
          new THREE.MeshStandardMaterial({
            color: cfg.accentHex,
            emissive: cfg.primaryHex,
            emissiveIntensity: 1.55,
            roughness: 0.16,
            metalness: 0.42,
          })
        );
        core.position.y = pp.kind === 'relic_crate' ? 1.02 : 1.24;

        // Part 5: Ground locator halo ring
        const groundBeacon = new THREE.Mesh(
          new THREE.RingGeometry(0.72, 0.86, 24),
          new THREE.MeshBasicMaterial({
            color: cfg.primaryHex,
            transparent: true,
            opacity: 0.58,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        groundBeacon.rotation.x = -Math.PI / 2;
        groundBeacon.position.y = 0.03;

        propGroup.add(plinth, body, trimMesh, core, groundBeacon);
        this.entitiesGroup.add(propGroup);
        this.wave9Props.push({
          x: pp.x,
          z: pp.z,
          radius: pp.radius,
          kind: pp.kind,
          alive: true,
          group: propGroup,
          core,
          ring: groundBeacon,
        });
      });
    }

    // Wave 11: Composite 5-part PBR 3D Interactive Battlefield Hazards (Frost Crystal / Magma Brazier / Volt Obelisk)
    if (!this.isTrainingMode && !this.isArenaMode) {
      const hazardSpecs = generateInteractiveBattlefieldHazards(
        this.currentChapter.id,
        this.stageIndex,
        {
          isBossRoom:
            this.isTowerMode
              ? this.towerFloor % 3 === 0
              : this.stageIndex >= this.currentChapter.stages.length - 1,
          arenaHalfW: ARENA_HALF_W,
          arenaHalfD: ARENA_HALF_D,
        }
      );
      hazardSpecs.forEach((spec) => {
        const group = new THREE.Group();
        group.position.set(spec.x, 0, spec.z);

        // Part 1: Grounded hexagonal stone pedestal (matte stone, high roughness)
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.54, 0.72, 0.24, 6),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.88,
            metalness: 0.14,
          })
        );
        base.position.y = 0.12;
        base.castShadow = true;
        base.receiveShadow = true;

        // Part 2: Metallic collar trim (high metalness, low roughness for >= 0.25 delta)
        const collar = new THREE.Mesh(
          new THREE.TorusGeometry(0.46, 0.06, 8, 18),
          new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            roughness: 0.24,
            metalness: 0.86,
          })
        );
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.28;

        // Part 3: Reactive elemental spire/vessel
        const coreGeo =
          spec.kind === 'frost_crystal'
            ? new THREE.ConeGeometry(0.38, 1.15, 6)
            : spec.kind === 'magma_brazier'
            ? new THREE.DodecahedronGeometry(0.42, 0)
            : new THREE.OctahedronGeometry(0.42, 0);
        const core = new THREE.Mesh(
          coreGeo,
          new THREE.MeshStandardMaterial({
            color: spec.primaryHex,
            emissive: spec.primaryHex,
            emissiveIntensity: 1.4,
            roughness: 0.2,
            metalness: 0.35,
          })
        );
        core.position.y = 0.92;
        core.castShadow = true;

        // Part 4: Floating crown ring
        const crown = new THREE.Mesh(
          new THREE.TorusGeometry(0.32, 0.035, 8, 16),
          new THREE.MeshStandardMaterial({
            color: spec.accentHex,
            emissive: spec.accentHex,
            emissiveIntensity: 1.15,
            roughness: 0.22,
            metalness: 0.72,
          })
        );
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 1.48;

        // Part 5: Ground blast indicator ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.78, 0.96, 24),
          new THREE.MeshBasicMaterial({
            color: spec.primaryHex,
            transparent: true,
            opacity: 0.54,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;

        group.add(base, collar, core, crown, ring);
        this.entitiesGroup.add(group);
        this.wave11Hazards.push({ spec, group, core, ring });
      });
    }
  }

  private loadStage(idx: number): void {
    this.stageIndex = idx;
    const stage = this.currentChapter.stages[idx];
    const cleanStageLabel = stage.name.replace(/\s*·\s*Phòng\s+\d+$/i, '');
    const banner = stage.isBossStage
      ? `CẢNH BÁO BOSS · ${stage.bossTitle || cleanStageLabel}`
      : `Phòng ${stage.stageNumber}/${this.currentChapter.stages.length} · ${cleanStageLabel}`;
    this.setupStageArena(stage.obstaclePreset, stage.isBossStage, banner);
    this.spawnWave(0);
    this.syncHudImmediate();
  }

  private spawnTowerWave(waveIdx: number): void {
    const groups = this.towerWaveDefs[waveIdx];
    if (!groups) return;
    this.waveIndex = waveIdx;

    const towerScale = getEndlessTowerScaling(this.towerFloor, this.towerHighestCleared);
    const hpMult = towerScale.enemyHpScale;
    const dmgMult = towerScale.enemyDmgScale;
    const bossTitle = `Thủ Lĩnh Tầng ${this.towerFloor} · ${this.currentChapter.bossName}`;
    this.spawnEnemyGroups(groups, hpMult, dmgMult, bossTitle);
  }

  private spawnWave(waveIdx: number): void {
    const stage = this.currentChapter.stages[this.stageIndex];
    const wave = stage.waves[waveIdx];
    if (!wave) return;
    this.waveIndex = waveIdx;

    const stageMult = 1 + this.stageIndex * 0.14;
    const nmHpMult = this.nightmareTier > 0 ? this.nightmareConfig.enemyHpMult : 1;
    const nmDmgMult = this.nightmareTier > 0 ? this.nightmareConfig.enemyDmgMult : 1;
    const hpMult = this.currentChapter.hpScale * stageMult * nmHpMult;
    const dmgMult = this.currentChapter.dmgScale * (1 + this.stageIndex * 0.085) * nmDmgMult;
    this.spawnEnemyGroups(wave.enemies, hpMult, dmgMult, stage.bossTitle);
  }

  private spawnEnemyGroups(
    groups: Array<{ kind: EnemyKind; count: number; isElite?: boolean }>,
    hpMult: number,
    dmgMult: number,
    bossTitle?: string
  ): void {
    const spawnPoints: Array<[number, number]> = [];
    for (let x = -7.5; x <= 7.5; x += 3) {
      spawnPoints.push([x, -6.8]);
      spawnPoints.push([x, -3.2]);
      if (Math.abs(x) > 3) spawnPoints.push([x, 0.4]);
    }
    let spIdx = 0;
    let bossSpawnIndex = 0;
    const totalBossesInWave = groups.reduce((acc, g) => {
      const isB =
        g.kind === EnemyKind.WARDEN_BOSS ||
        g.kind === EnemyKind.TITAN_BOSS ||
        g.kind === EnemyKind.ZODIAC_BOSS;
      return acc + (isB ? g.count : 0);
    }, 0);

    groups.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        let sx = 0;
        let sz = -6.5;
        const isBossKind =
          group.kind === EnemyKind.WARDEN_BOSS ||
          group.kind === EnemyKind.TITAN_BOSS ||
          group.kind === EnemyKind.ZODIAC_BOSS;

        if (isBossKind) {
          sx = totalBossesInWave > 1 ? (bossSpawnIndex === 0 ? -3.4 : 3.4) : 0;
          sz = -6.0;
          bossSpawnIndex++;
        } else {
          const pt = spawnPoints[(spIdx * 5 + i * 3) % spawnPoints.length];
          sx = pt[0] + (Math.random() - 0.5) * 1.4;
          sz = pt[1] + (Math.random() - 0.5) * 1.4;
          spIdx++;
        }
        this.createEnemy(
          group.kind,
          sx,
          sz,
          hpMult,
          dmgMult,
          Boolean(group.isElite),
          isBossKind ? bossTitle : undefined
        );
        if (isBossKind && bossSpawnIndex === 1) {
          this.triggerBossWarning(
            bossTitle || this.currentChapter.bossName,
            'CẢNH BÁO THỦ LĨNH XUẤT HIỆN · SẴN SÀNG NÉ ĐÒN'
          );
        }
      }
    });
  }

  private createEnemy(
    kind: EnemyKind,
    x: number,
    z: number,
    hpMult: number,
    dmgMult: number,
    isElite: boolean,
    bossTitle?: string
  ): void {
    const model = createEnemyModel(kind, this.currentChapter.trimHex, isElite);
    const isBoss =
      kind === EnemyKind.WARDEN_BOSS ||
      kind === EnemyKind.TITAN_BOSS ||
      kind === EnemyKind.ZODIAC_BOSS;

    const tacticalRole = resolveEnemyTacticalRole(kind, isBoss, isElite, this.nextEntityId);

    // Crisp ARPG silhouette readability from the isometric combat camera
    const baseScale = isBoss ? 1.08 : isElite ? 1.24 : 1.38;
    model.root.scale.setScalar(baseScale);
    if (!isBoss) {
      const threatRing = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.56, 20),
        new THREE.MeshBasicMaterial({
          color:
            tacticalRole === 'detonator'
              ? 0xf97316
              : tacticalRole === 'shield_bearer'
              ? 0x38bdf8
              : tacticalRole === 'charger'
              ? 0xf43f5e
              : tacticalRole === 'arcane_sniper'
              ? 0xc084fc
              : isElite
              ? 0xc084fc
              : 0xf43f5e,
          transparent: true,
          opacity: tacticalRole !== 'standard' || isElite ? 0.65 : 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      );
      threatRing.rotation.x = -Math.PI / 2;
      threatRing.position.y = 0.035;
      model.root.add(threatRing);

      if (tacticalRole === 'shield_bearer') {
        const frontShield = new THREE.Mesh(
          new THREE.BoxGeometry(0.98, 1.05, 0.14),
          new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.72,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
            metalness: 0.65,
          })
        );
        frontShield.position.set(0, 0.85, 0.72);
        model.bodyGroup.add(frontShield);
      } else if (tacticalRole === 'detonator') {
        const coreBomb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.32, 0),
          new THREE.MeshStandardMaterial({
            color: 0xfb923c,
            emissive: 0xf97316,
            emissiveIntensity: 1.5,
            roughness: 0.2,
          })
        );
        coreBomb.position.set(0, 1.62, 0);
        model.bodyGroup.add(coreBomb);
      } else if (tacticalRole === 'charger') {
        for (const sx of [-0.26, 0.26]) {
          const horn = new THREE.Mesh(
            new THREE.ConeGeometry(0.11, 0.45, 6),
            new THREE.MeshStandardMaterial({
              color: 0xf43f5e,
              emissive: 0xe11d48,
              emissiveIntensity: 0.9,
            })
          );
          horn.rotation.x = Math.PI * 0.42;
          horn.position.set(sx, 1.38, 0.46);
          model.bodyGroup.add(horn);
        }
      } else if (tacticalRole === 'arcane_sniper') {
        const sniperHalo = new THREE.Mesh(
          new THREE.TorusGeometry(0.34, 0.05, 6, 16),
          new THREE.MeshBasicMaterial({ color: 0xc084fc })
        );
        sniperHalo.position.set(0, 1.72, 0);
        model.bodyGroup.add(sniperHalo);
      }
    }

    model.root.position.set(x, 0, z);
    this.entitiesGroup.add(model.root);
    this.callbacks.onProgressEvent?.({ seenEnemyKind: kind });

    const baseRadius =
      kind === EnemyKind.ZODIAC_BOSS
        ? 1.48
        : kind === EnemyKind.TITAN_BOSS
        ? 1.35
        : kind === EnemyKind.WARDEN_BOSS
        ? 1.08
        : kind === EnemyKind.GOLEM
        ? 0.85
        : 0.58;
    const radius = isElite && !isBoss ? baseRadius * 1.2 : baseRadius;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(radius * 2.4, radius * 2.4),
      new THREE.MeshBasicMaterial({
        map: this.contactShadowTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, z);
    this.entitiesGroup.add(shadow);

    const telegraphGroup = new THREE.Group();
    const backingRing = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 1.09, 32),
      new THREE.MeshBasicMaterial({
        color: 0x050814,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    backingRing.rotation.x = -Math.PI / 2;
    backingRing.renderOrder = 22;

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.84, 1.03, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.renderOrder = 24;

    const telegraphFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      })
    );
    telegraphFill.rotation.x = -Math.PI / 2;
    telegraphFill.scale.setScalar(0.15);
    telegraphFill.renderOrder = 23;

    const telegraphCountdownRing = new THREE.Mesh(
      new THREE.RingGeometry(0.89, 1.0, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -5,
        polygonOffsetUnits: -5,
      })
    );
    telegraphCountdownRing.rotation.x = -Math.PI / 2;
    telegraphCountdownRing.renderOrder = 25;

    telegraphGroup.add(backingRing, outerRing, telegraphFill, telegraphCountdownRing);
    telegraphGroup.position.set(x, 0.09, z);
    telegraphGroup.visible = false;
    this.entitiesGroup.add(telegraphGroup);

    let punishRingMesh: THREE.Mesh | undefined;
    let breakShieldRingMesh: THREE.Mesh | undefined;
    if (isBoss) {
      punishRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.92, 1.16, 28),
        new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.78,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      punishRingMesh.rotation.x = -Math.PI / 2;
      punishRingMesh.position.set(x, 0.055, z);
      punishRingMesh.renderOrder = 8;
      punishRingMesh.visible = false;
      this.entitiesGroup.add(punishRingMesh);

      breakShieldRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(radius + 0.48, radius + 0.7, 32),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.58,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      breakShieldRingMesh.rotation.x = -Math.PI / 2;
      breakShieldRingMesh.position.set(x, 0.052, z);
      breakShieldRingMesh.renderOrder = 7;
      this.entitiesGroup.add(breakShieldRingMesh);
    }

    const laserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.9, 0),
      new THREE.Vector3(0, 0.9, 5),
    ]);
    const laserLine = new THREE.Line(
      laserGeo,
      new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.75 })
    );
    laserLine.visible = false;
    this.entitiesGroup.add(laserLine);

    let baseHp = 95;
    let speed = 3.2;
    let damage = 24;
    let xpValue = 18;
    let goldValue = 8;

    switch (kind) {
      case EnemyKind.SKIRMISHER:
        baseHp = 90;
        speed = 3.85;
        damage = 22;
        xpValue = 16;
        goldValue = 8;
        break;
      case EnemyKind.IMP_ARCHER:
        baseHp = 76;
        speed = 2.0;
        damage = 25;
        xpValue = 20;
        goldValue = 10;
        break;
      case EnemyKind.GOLEM:
        baseHp = 225;
        speed = 2.0;
        damage = 34;
        xpValue = 32;
        goldValue = 15;
        break;
      case EnemyKind.WISP:
        baseHp = 72;
        speed = 4.6;
        damage = 21;
        xpValue = 19;
        goldValue = 9;
        break;
      case EnemyKind.DRAGON_WHELP:
        baseHp = 135;
        speed = 3.6;
        damage = 28;
        xpValue = 24;
        goldValue = 12;
        break;
      case EnemyKind.SHADOW_STALKER:
        baseHp = 115;
        speed = 4.2;
        damage = 29;
        xpValue = 26;
        goldValue = 13;
        break;
      case EnemyKind.WARDEN_BOSS:
        baseHp = 1150;
        speed = 2.65;
        damage = 57;
        xpValue = 95;
        goldValue = 55;
        break;
      case EnemyKind.TITAN_BOSS:
        baseHp = 1950;
        speed = 2.45;
        damage = 73;
        xpValue = 145;
        goldValue = 95;
        break;
      case EnemyKind.ZODIAC_BOSS:
        baseHp = 2750;
        speed = 2.75;
        damage = 86;
        xpValue = 210;
        goldValue = 150;
        break;
    }

    const nmSpeedMult = this.nightmareTier > 0 ? this.nightmareConfig.enemySpeedMult : 1.0;
    const speedScale =
      (this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.enemySpeedMult : 1.0) *
      nmSpeedMult;
    const eliteMult = isElite && !isBoss ? 1.75 : 1.0;
    const finalHp = Math.round(baseHp * hpMult * eliteMult);

    // Phase 3–5: Elite Affixes (Single from Ch.2+, Dual-Affix from Ch.7+, Tower Floor 12+, or Nightmare Empowered Elites)
    let eliteAffix: EliteAffix | undefined;
    let eliteAffixes: EliteAffix[] | undefined;
    let eliteShieldHp: number | undefined;
    let eliteAuraRingMesh: THREE.Mesh | undefined;
    let eliteAuraRingMesh2: THREE.Mesh | undefined;
    const allowEliteAffix =
      isElite &&
      !isBoss &&
      (this.currentChapter.id >= 2 ||
        this.nightmareTier > 0 ||
        this.isDailyRiftMode ||
        this.isBossRushMode ||
        (this.isTowerMode && this.towerFloor >= 2));
    const allowDualAffix =
      allowEliteAffix &&
      ((!this.isTowerMode && this.currentChapter.id >= 7) ||
        (this.nightmareTier > 0 && this.nightmareConfig.extraEliteAffix) ||
        (this.isTowerMode && this.towerFloor >= 12));
    if (allowEliteAffix) {
      const idx1 = this.nextEntityId % ELITE_AFFIX_LIST.length;
      eliteAffix = ELITE_AFFIX_LIST[idx1];
      eliteAffixes = [eliteAffix];
      const affixMeta = ELITE_AFFIX_META[eliteAffix];
      eliteAuraRingMesh = new THREE.Mesh(
        new THREE.RingGeometry(0.86, 1.06, 24),
        new THREE.MeshBasicMaterial({
          color: affixMeta.colorHex,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      eliteAuraRingMesh.rotation.x = -Math.PI / 2;
      eliteAuraRingMesh.position.set(x, 0.04, z);
      eliteAuraRingMesh.scale.setScalar(radius * 1.32);
      eliteAuraRingMesh.renderOrder = 6;
      this.entitiesGroup.add(eliteAuraRingMesh);

      if (allowDualAffix) {
        const idx2 = (idx1 + 1 + (this.nextEntityId % 2)) % ELITE_AFFIX_LIST.length;
        const affix2 = ELITE_AFFIX_LIST[idx2];
        if (affix2 !== eliteAffix) {
          eliteAffixes.push(affix2);
          const affixMeta2 = ELITE_AFFIX_META[affix2];
          eliteAuraRingMesh2 = new THREE.Mesh(
            new THREE.RingGeometry(1.14, 1.3, 24),
            new THREE.MeshBasicMaterial({
              color: affixMeta2.colorHex,
              transparent: true,
              opacity: 0.68,
              side: THREE.DoubleSide,
              depthWrite: false,
              polygonOffset: true,
              polygonOffsetFactor: -3,
              polygonOffsetUnits: -3,
            })
          );
          eliteAuraRingMesh2.rotation.x = -Math.PI / 2;
          eliteAuraRingMesh2.position.set(x, 0.045, z);
          eliteAuraRingMesh2.scale.setScalar(radius * 1.36);
          eliteAuraRingMesh2.renderOrder = 7;
          this.entitiesGroup.add(eliteAuraRingMesh2);
        }
      }

      if (eliteAffixes.includes('aegis')) {
        eliteShieldHp = Math.round(finalHp * 0.3);
      }
    }

    const hasHasteAffix = Boolean(eliteAffixes?.includes('haste'));
    const hasFrostAffix = Boolean(eliteAffixes?.includes('frost'));

    let hpBarGroup: THREE.Group | undefined;
    let hpBarFill: THREE.Mesh | undefined;
    let hpBarGhost: THREE.Mesh | undefined;
    let hpBarHeight: number | undefined;
    if (!isBoss) {
      hpBarGroup = new THREE.Group();
      const barW = isElite ? 1.38 : 1.06;
      const barH = isElite ? 0.145 : 0.12;
      const border = new THREE.Mesh(
        new THREE.PlaneGeometry(barW + 0.14, barH + 0.11),
        new THREE.MeshBasicMaterial({
          color: isElite ? 0xfbbf24 : 0xcbd5e1,
          transparent: true,
          opacity: isElite ? 0.94 : 0.62,
          depthTest: false,
        })
      );
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(barW + 0.06, barH + 0.05),
        new THREE.MeshBasicMaterial({
          color: 0x050814,
          transparent: true,
          opacity: 0.92,
          depthTest: false,
        })
      );
      bg.position.set(0, 0, 0.002);
      const fillGeo = new THREE.PlaneGeometry(barW, barH);
      fillGeo.translate(barW * 0.5, 0, 0);
      hpBarGhost = new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.9,
          depthTest: false,
        })
      );
      hpBarGhost.position.set(-barW * 0.5, 0, 0.006);
      hpBarFill = new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({
          color: isElite ? 0xc084fc : 0xf43f5e,
          depthTest: false,
        })
      );
      hpBarFill.position.set(-barW * 0.5, 0, 0.012);
      border.renderOrder = 19;
      bg.renderOrder = 20;
      hpBarGhost.renderOrder = 21;
      hpBarFill.renderOrder = 22;
      hpBarGroup.add(border, bg, hpBarGhost, hpBarFill);
      hpBarHeight = (kind === EnemyKind.GOLEM ? 2.45 : 2.05) * (isElite ? 1.12 : 1.0);
      hpBarGroup.position.set(x, hpBarHeight, z);
      hpBarGroup.visible = false;
      this.entitiesGroup.add(hpBarGroup);
    }

    let bossParts: BossBreakablePart[] | undefined;
    let bossPartMeshes: Partial<Record<BossPartId, THREE.Mesh[]>> | undefined;
    if (isBoss && !this.isTrainingMode) {
      const isMajor = kind === EnemyKind.ZODIAC_BOSS || kind === EnemyKind.TITAN_BOSS;
      bossParts = createBossBreakableParts(finalHp, isMajor);
      bossPartMeshes = {};
      const hornMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.75,
        roughness: 0.22,
        metalness: 0.78,
      });
      const hornMeshes: THREE.Mesh[] = [];
      for (const side of [-1, 1]) {
        const hMesh = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.56, 6), hornMat);
        hMesh.position.set(side * 0.44, 2.02, 0.24);
        hMesh.rotation.z = side * -0.42;
        hMesh.rotation.x = 0.28;
        model.bodyGroup.add(hMesh);
        hornMeshes.push(hMesh);
      }
      bossPartMeshes.armor_horn = hornMeshes;

      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.45,
        roughness: 0.14,
        metalness: 0.45,
      });
      const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), coreMat);
      coreMesh.position.set(0, 1.32, 0.62);
      model.bodyGroup.add(coreMesh);
      bossPartMeshes.arcane_core = [coreMesh];

      if (isMajor) {
        const wingMat = new THREE.MeshStandardMaterial({
          color: 0xc084fc,
          emissive: 0x7e22ce,
          emissiveIntensity: 0.85,
          roughness: 0.22,
          metalness: 0.6,
        });
        const wingMeshes: THREE.Mesh[] = [];
        for (const side of [-1, 1]) {
          const wMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.34), wingMat);
          wMesh.position.set(side * 0.92, 1.56, -0.24);
          wMesh.rotation.z = side * 0.38;
          model.bodyGroup.add(wMesh);
          wingMeshes.push(wMesh);
        }
        bossPartMeshes.astral_wing = wingMeshes;
      }
    }

    this.enemies.push({
      id: this.nextEntityId++,
      kind,
      isElite,
      bossTitle,
      x,
      z,
      vx: 0,
      vz: 0,
      radius,
      hp: finalHp,
      maxHp: finalHp,
      speed: speed * speedScale * (hasHasteAffix ? 1.25 : 1.0),
      damage: Math.round(
        damage *
          dmgMult *
          (isElite ? 1.25 : 1.0) *
          (!this.isTrainingMode && !this.isArenaMode && !this.isWeeklyRankedBossMode
            ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).enemyDamageMult
            : 1.0)
      ),
      xpValue: Math.round(xpValue * (isElite ? 1.5 : 1.0)),
      goldValue: Math.round(goldValue * this.currentChapter.goldBonusMult * (isElite ? 1.6 : 1.0)),
      isBoss,
      spawnTimer: 0.48,
      attackTimer:
        (0.7 + Math.random() * 0.9) *
        (hasHasteAffix ? 0.8 : 1.0) *
        (!this.isTrainingMode && !this.isArenaMode && !this.isWeeklyRankedBossMode
          ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).enemyCooldownMult
          : 1.0),
      telegraphTimer: 0,
      telegraphDuration: 0.65,
      telegraphType: 'none',
      aimX: 0,
      aimZ: 1,
      slamX: x,
      slamZ: z,
      slamRadius: 2.6,
      laneAngles: [],
      bossPhase: 1,
      phaseTransitioned: false,
      phaseThreeTransitioned: false,
      bossParts,
      bossPartMeshes,
      burnTimer: 0,
      burnDps: 0,
      poisonDps: 0,
      chillTimer: 0,
      hitFlashTimer: 0,
      phaseAngle: Math.random() * Math.PI * 2,
      model,
      shadow,
      telegraphGroup,
      telegraphOuterRing: outerRing,
      telegraphCountdownRing,
      telegraphFill,
      punishRingMesh,
      breakShieldRingMesh,
      eliteAffix,
      eliteAffixes,
      eliteShieldHp,
      eliteFrostPulseTimer: hasFrostAffix ? 2.6 : undefined,
      eliteAuraRingMesh,
      eliteAuraRingMesh2,
      laserLine,
      baseScale,
      hpBarGroup,
      hpBarFill,
      hpBarGhost,
      hpBarGhostRatio: 1,
      hpBarHeight,
      tacticalRole,
      chargerCooldown: tacticalRole === 'charger' ? 2.1 : undefined,
      bossAiState:
        isBoss && !this.isTrainingMode && !this.isArenaMode
          ? this.buildBossAiStateForKind(kind)
          : undefined,
    });

    const spawnedEntity = this.enemies[this.enemies.length - 1];
    if (
      spawnedEntity &&
      isSolarLionBossEncounter({
        chapterId: this.currentChapter.id,
        enemyKind: kind,
        isWeeklyRankedBossMode: this.isWeeklyRankedBossMode,
        weeklyBossId: this.weeklyBossId,
        isSideModeActive: this.isSideModeActiveForBossModel(),
      })
    ) {
      this.attachSolarLionBossModel(spawnedEntity);
    } else if (spawnedEntity) {
      const rosterAssetId = resolveCampaignRosterAssetId({
        chapterId: this.currentChapter.id,
        enemyKind: kind,
        isSideModeActive: this.isSideModeActiveForBossModel() ||
          this.isWeeklyRankedBossMode || this.isWeeklyBossPracticeMode,
        isTrainingDummy: spawnedEntity.isTrainingDummy,
        isArenaRival: spawnedEntity.isArenaRival,
      });
      if (rosterAssetId) {
        this.attachChapter1RosterModel(spawnedEntity, rosterAssetId);
      }
    }

    // AAA Wave 5: Rotating Celestial Summon Portal underneath spawning enemies
    if (!this.isTrainingMode && !isBoss) {
      const portalColor = isElite ? 0xc084fc : 0x38bdf8;
      this.spawnSummonPortal(
        x,
        z,
        radius * 1.35,
        portalColor,
        0.56
      );
      soundEngine.playSummonPortalHum(computeSpatialPan(x, ARENA_HALF_W));
    }

    // Dramatic 6–7s Boss Entrance Sequence across all chapters & boss modes
    // Player/pet/ally attacks & boss damage remain strictly locked until the Boss finishes appearing.
    if (isBoss && !this.isTrainingMode && !this.isArenaMode && spawnedEntity) {
      this.startBossEntranceSequence(
        spawnedEntity,
        bossTitle || this.currentChapter.bossName,
        this.currentChapter.trimHex
      );
    }
  }

  private isBossEntranceLocked(): boolean {
    return isBossEntranceAttackLocked(this.bossEntranceTimer);
  }

  private notifyBossEntranceLockedHint(): void {
    if (this.bossEntranceHintCd > 0) return;
    this.bossEntranceHintCd = 0.85;
    this.emitFloatingNumber(
      this.px,
      2.22,
      this.pz,
      0,
      false,
      false,
      'fire',
      'CHỜ BOSS XUẤT HIỆN!'
    );
  }

  private startBossEntranceSequence(
    bossEntity: EnemyEntity,
    title: string,
    accentHex: number
  ): void {
    const isMajor =
      bossEntity.kind === EnemyKind.ZODIAC_BOSS ||
      this.isDragonLairMode ||
      this.isSkyCitadelMode ||
      this.isWorldBossMode ||
      this.isGuildBossMode ||
      this.isWeeklyRankedBossMode;
    const duration = resolveBossEntranceDurationSec(isMajor);
    const baseScale = bossEntity.baseScale ?? 1;

    bossEntity.spawnDuration = duration;
    bossEntity.spawnTimer = duration;
    bossEntity.model.root.position.set(bossEntity.x, 7.4, bossEntity.z);
    bossEntity.model.root.scale.setScalar(0.22 * baseScale);
    bossEntity.model.root.rotation.y = Math.atan2(
      this.px - bossEntity.x,
      this.pz - bossEntity.z
    );

    // Sync any existing boss in a dual-boss wave to the same entrance completion time
    if (this.bossEntranceTimer < duration) {
      this.bossEntranceDuration = duration;
      this.bossEntranceTimer = duration;
      this.bossEntranceBossName = title;
      this.bossEntranceLandingFired = false;
    }

    // Clear queued player shots and active player projectiles so nothing hits an appearing Boss
    this.volleyQueue.length = 0;
    this.attackCooldown = Math.max(this.attackCooldown, 0.25);
    for (let i = 0; i < this.arrowPool.length; i++) {
      const p = this.arrowPool[i];
      if (p.active && !p.isEnemy) {
        p.active = false;
        p.mesh.visible = false;
        if (p.trailMesh) p.trailMesh.visible = false;
      }
    }

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.bossIntroFocusX = bossEntity.x;
    this.bossIntroFocusZ = bossEntity.z;
    this.bossIntroDuration = duration;
    if (!reducedMotion) {
      this.bossIntroTimer = duration;
      this.cinematicCamera = triggerCinematicCamera('boss_intro', bossEntity.x, bossEntity.z, false);
    }

    this.spawnSummonPortal(
      bossEntity.x,
      bossEntity.z,
      bossEntity.radius * 2.1,
      0xfbbf24,
      duration * 0.85
    );
    this.spawnUltColumn(bossEntity.x, bossEntity.z, accentHex, Math.min(2.2, duration * 0.35));
    this.spawnShockwave(bossEntity.x, bossEntity.z, 0xfbbf24, 5.6, 0.65);
    soundEngine.playSummonPortalHum(computeSpatialPan(bossEntity.x, ARENA_HALF_W));
    soundEngine.playBossEntranceFanfare();
    this.syncHudImmediate();
  }

  private spawnBossPhase2Totems(boss: EnemyEntity): void {
    if (this.isTrainingMode || this.isArenaMode) return;
    const spots = computeBossPhase2TotemPositions(boss.x, boss.z, ARENA_HALF_W, ARENA_HALF_D);
    const totemHp = Math.max(140, Math.round(boss.maxHp * 0.14));
    spots.forEach((spot, idx) => {
      const root = new THREE.Group();
      const bodyGroup = new THREE.Group();
      root.add(bodyGroup);
      const hitMeshes: THREE.Mesh[] = [];

      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.72, 0.36, 8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.7 })
      );
      pedestal.position.y = 0.18;
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.48, 0),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 1.4,
          roughness: 0.15,
          metalness: 0.4,
        })
      );
      crystal.scale.set(0.85, 1.85, 0.85);
      crystal.position.y = 1.15;
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.06, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.15;
      bodyGroup.add(pedestal, crystal, halo);
      hitMeshes.push(crystal, pedestal);
      root.position.set(spot.x, 0, spot.z);
      this.entitiesGroup.add(root);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(spot.x, 0.02, spot.z);
      this.entitiesGroup.add(shadow);

      const telegraphGroup = new THREE.Group();
      telegraphGroup.visible = false;
      const telegraphFill = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      telegraphGroup.add(telegraphFill);
      const laserLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)]),
        new THREE.LineBasicMaterial({ visible: false })
      );
      laserLine.visible = false;
      this.entitiesGroup.add(telegraphGroup, laserLine);

      const hpBarGroup = new THREE.Group();
      const barW = 1.2;
      const barH = 0.13;
      const bg = new THREE.Mesh(
        new THREE.PlaneGeometry(barW + 0.06, barH + 0.06),
        new THREE.MeshBasicMaterial({ color: 0x020617, depthTest: false })
      );
      const fillGeo = new THREE.PlaneGeometry(barW, barH);
      fillGeo.translate(barW * 0.5, 0, 0);
      const hpBarFill = new THREE.Mesh(
        fillGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false })
      );
      hpBarFill.position.set(-barW * 0.5, 0, 0.01);
      hpBarGroup.add(bg, hpBarFill);
      hpBarGroup.position.set(spot.x, 2.35, spot.z);
      this.entitiesGroup.add(hpBarGroup);

      this.enemies.push({
        id: this.nextEntityId++,
        kind: EnemyKind.GOLEM,
        isElite: false,
        isBoss: false,
        isBossTotem: true,
        totemOwnerId: boss.id,
        tacticalRole: 'standard',
        x: spot.x,
        z: spot.z,
        vx: 0,
        vz: 0,
        radius: 0.78,
        hp: totemHp,
        maxHp: totemHp,
        speed: 0,
        damage: 0,
        xpValue: 20,
        goldValue: 18,
        spawnTimer: 0.35,
        attackTimer: 999,
        telegraphTimer: 0,
        telegraphDuration: 1,
        telegraphType: 'none',
        aimX: 0,
        aimZ: 1,
        slamX: spot.x,
        slamZ: spot.z,
        slamRadius: 1,
        laneAngles: [],
        bossPhase: 1,
        phaseTransitioned: false,
        burnTimer: 0,
        burnDps: 0,
        poisonDps: 0,
        chillTimer: 0,
        hitFlashTimer: 0,
        phaseAngle: idx * Math.PI,
        model: {
          root,
          bodyGroup,
          headOrCore: crystal,
          hitMeshes,
          weaponOrRing: halo,
        },
        shadow,
        telegraphGroup,
        telegraphFill,
        laserLine,
        hpBarGroup,
        hpBarFill,
        hpBarHeight: 2.35,
      });
      this.spawnShockwave(spot.x, spot.z, 0x38bdf8, 2.8, 0.36);
      this.spawnParticles(spot.x, 1.1, spot.z, 0x38bdf8, 16);
    });
    this.emitFloatingNumber(
      boss.x,
      3.1,
      boss.z,
      0,
      true,
      false,
      'ice',
      'PHÁ 2 TRỤ HỘ THUẪN (-30% ST)!',
      true
    );
  }

  private spawnSurpriseAmbushBoss(): void {
    const sx = (Math.random() < 0.5 ? -1 : 1) * 4.2;
    const sz = -4.2;
    const hpMult = this.currentChapter.hpScale * (1 + this.stageIndex * 0.16) * 1.45;
    const dmgMult = this.currentChapter.dmgScale * (1 + this.stageIndex * 0.1);
    this.createEnemy(EnemyKind.SHADOW_STALKER, sx, sz, hpMult, dmgMult, true, 'Sát Thủ Truy Nã');
    const spawned = this.enemies[this.enemies.length - 1];
    if (spawned) {
      spawned.ambushBounty = true;
      spawned.radius *= 1.15;
    }
    soundEngine.playAmbushSiren();
    this.spawnUltColumn(sx, sz, 0xf43f5e, 0.72);
    this.spawnShockwave(sx, sz, 0xf43f5e, 4.8, 0.45);
    this.stageBannerText = 'PHỤC KÍCH TRUY NÃ! HẠ SÁT THỦ NHẬN +5💎 & CHỌN KỸ NĂNG';
    this.stageBannerTimer = 2.8;
    this.syncHudImmediate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextMenu = (e: MouseEvent) => {
    if (this.phase === GamePhase.PLAYING) {
      e.preventDefault();
      this.triggerHeavyBreakStrike();
    }
  };

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    // Context đã mất tự hủy các sync handle cũ.
    this.pendingGpuSync = null;

    // Immediately trip persistent GPU Safe Mode so a WebGL crash / driver TDR reset
    // automatically drops heavy 3D assets across the entire game and caps at Lite 30 FPS.
    tripGpuCrashSentinel(
      'Phát hiện mất kết nối WebGL / quá tải GPU · Đã tự chuyển sang Chế Độ Lite toàn hệ thống'
    );
    this.gpuProfile = refreshStartupGpuProfile();
    this.chapter1MapMode = 'light';
    this.lowEndSafetyMode = 'on';
    this.systemBudget = resolveSystemLiteBudget(
      this.gpuProfile,
      this.lowEndSafetyMode,
      this.chapter1MapMode
    );
    this.lowEndGpu = true;
    this.graphicsQuality = 'low';
    this.unloadChapter1MapModel();
    this.setChapter1MapStatus('ready');
    this.callbacks.onGpuSafetyTriggered?.(this.gpuProfile);
  };

  private onContextRestored = () => this.resumeAfterContextRestore();

  private resumeAfterContextRestore(): void {
    if (this.disposed || !this.contextLost) return;
    this.contextLost = false;
    if (this.composer && this.container) {
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.composer.setSize(w, h);
    }
    this.startLoop();
  }

  private ensureEnvironmentReflections(): void {
    const budget = this.getActiveSystemBudget();
    if (budget.environmentReflections) {
      if (!this.scene.environment && this.pmremGenerator) {
        const environment = new RoomEnvironment();
        this.envRenderTarget = this.pmremGenerator.fromScene(environment, 0.04);
        environment.dispose();
        this.scene.environment = this.envRenderTarget.texture;
      }
      if (this.hemiLight && this.phase === GamePhase.TITLE) {
        this.hemiLight.intensity = 0.88;
      }
    }
  }

  private syncCanvasResolution(): void {
    if (this.disposed || !this.renderer || !this.container) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const targetDpr = this.getTargetPixelRatio();
    this.renderer.setPixelRatio(targetDpr);
    if (this.composer) {
      this.composer.setPixelRatio(targetDpr);
      this.composer.setSize(w, h);
    }
    this.syncPostProcessingUniforms();
  }

  private getTargetPixelRatio(): number {
    const budget = this.getActiveSystemBudget();
    return computeEffectiveRenderPixelRatio({
      viewportWidth: this.container?.clientWidth || 1280,
      viewportHeight: this.container?.clientHeight || 720,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      budget,
      graphicsQuality: this.graphicsQuality,
      isSoftwareGl: this.isSoftwareGl,
      isLobby: this.phase === GamePhase.TITLE,
      adaptiveResolutionGuard: this.adaptiveResolutionGuard,
      adaptiveResScale: this.adaptiveResScale,
      governorDprScale: getAdaptiveFpsModifiers(this.adaptiveFpsGovernor).dprScale,
    });
  }

  public applyRuntimeSettings(cfg: {
    graphicsQuality: GraphicsQuality;
    screenShake: boolean;
    showDamageNumbers: boolean;
    starfallWeather?: boolean;
    bloomEnabled?: boolean;
    hapticsEnabled?: boolean;
    highContrastTelegraphs?: boolean;
    combatCameraPreset?: CombatCameraPreset;
    photoLightingPreset?: PhotoLightingPreset;
    keybinds?: Partial<CombatKeybinds>;
    showFpsOverlay?: boolean;
    adaptiveResolutionGuard?: boolean;
    chapter1MapMode?: Chapter1MapMode;
    lowEndSafetyMode?: LowEndSafetyMode;
  }): void {
    const prevLiteActive = this.systemBudget?.liteActive ?? this.lowEndGpu;
    if (cfg.lowEndSafetyMode) {
      this.lowEndSafetyMode = cfg.lowEndSafetyMode;
    }
    const prevVariant = this.getActiveChapter1MapVariant();
    if (cfg.chapter1MapMode) {
      this.chapter1MapMode = cfg.chapter1MapMode;
    }
    if (this.gpuProfile) {
      this.systemBudget = resolveSystemLiteBudget(
        this.gpuProfile,
        this.lowEndSafetyMode,
        this.chapter1MapMode
      );
      this.lowEndGpu = this.systemBudget.liteActive;
    }
    const budget = this.getActiveSystemBudget();
    const nextVariant = this.getActiveChapter1MapVariant();
    if (nextVariant !== prevVariant) {
      this.chapter1MapFailCount = 0;
      if (nextVariant === 'none') {
        this.unloadChapter1MapModel();
        this.setChapter1MapStatus('ready');
      } else {
        this.ensureChapter1MapLoaded(this.currentChapter.id);
      }
      this.applyChapter1MapState();
    }

    const quality = this.isSoftwareGl || this.lowEndGpu || budget.liteActive ? 'low' : cfg.graphicsQuality;
    this.graphicsQuality = quality;
    this.screenShakeEnabled = cfg.screenShake;
    this.showDamageNumbersEnabled = cfg.showDamageNumbers;
    this.hapticsEnabled = cfg.hapticsEnabled !== false;
    this.highContrastTelegraphs = Boolean(cfg.highContrastTelegraphs);
    if (cfg.combatCameraPreset) {
      this.combatCameraPreset = cfg.combatCameraPreset;
    }
    if (cfg.photoLightingPreset) {
      this.photoLightingPreset = cfg.photoLightingPreset;
    }
    if (cfg.keybinds) {
      this.combatKeybinds = normalizeCombatKeybinds(cfg.keybinds);
    }
    if (typeof cfg.showFpsOverlay === 'boolean') {
      this.showFpsOverlay = cfg.showFpsOverlay;
    }
    if (typeof cfg.adaptiveResolutionGuard === 'boolean') {
      this.adaptiveResolutionGuard = cfg.adaptiveResolutionGuard;
      this.adaptiveFpsGovernor.enabled = cfg.adaptiveResolutionGuard;
      if (!cfg.adaptiveResolutionGuard) {
        this.adaptiveResScale = 1.0;
        this.adaptiveFpsGovernor.tier = 'full';
      }
    }
    this.bloomEnabled = budget.bloomAllowed && cfg.bloomEnabled !== false;
    this.starfallEnabled = !this.lowEndGpu && !this.isSoftwareGl && !budget.liteActive && cfg.starfallWeather !== false;
    if (this.starfallMesh) {
      this.starfallMesh.visible = this.starfallEnabled;
    }
    const baseParticleDensity =
      (quality === 'low' ? 0.45 : quality === 'medium' ? 0.75 : 1.0) * budget.particleBudgetMult;
    const govMods = getAdaptiveFpsModifiers(this.adaptiveFpsGovernor);
    this.particleDensityScale = Math.max(0.2, baseParticleDensity * govMods.particleScale);

    if (!this.isSoftwareGl) {
      const shadowsOn = quality !== 'low' && budget.shadowMapSize > 0;
      this.renderer.shadowMap.enabled = shadowsOn;
      this.keyLight.castShadow = shadowsOn;
      const desiredShadowSize = Math.min(budget.shadowMapSize || 1024, quality === 'high' ? 2048 : 1024);
      if (shadowsOn && this.keyLight.shadow.mapSize.width !== desiredShadowSize) {
        this.keyLight.shadow.mapSize.set(desiredShadowSize, desiredShadowSize);
        this.keyLight.shadow.map?.dispose();
        this.keyLight.shadow.map = null;
      }
    }
    this.ensureEnvironmentReflections();
    const targetDpr = this.getTargetPixelRatio();
    this.renderer.setPixelRatio(targetDpr);
    if (!this.isSoftwareGl && !this.lowEndGpu && quality !== 'low' && this.bloomEnabled && !this.composer) {
      this.setupPostProcessing();
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = this.bloomEnabled && !budget.liteActive;
    }
    if (this.composer) {
      const w = Math.max(1, this.container.clientWidth);
      const h = Math.max(1, this.container.clientHeight);
      this.composer.setPixelRatio(targetDpr);
      this.composer.setSize(w, h);
    }
    if (prevLiteActive !== budget.liteActive && this.phase === GamePhase.TITLE) {
      this.buildArena(this.currentChapter, this.currentChapter.id === 1);
    }
    this.syncSolarLeoVisuals();
    this.syncPostProcessingUniforms();
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const targetDpr = this.getTargetPixelRatio();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(targetDpr);
    if (this.composer) {
      this.composer.setPixelRatio(targetDpr);
      this.composer.setSize(w, h);
      if (this.bloomPass) {
        this.bloomPass.resolution.set(Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.5)));
      }
      this.syncPostProcessingUniforms();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.phase !== GamePhase.PLAYING) return;
    const code = e.code;
    const kb = this.combatKeybinds;
    const isDashKey =
      code === kb.dash ||
      (kb.dash === 'Space' && (code === 'ShiftLeft' || code === 'ShiftRight'));
    if (isDashKey && !this.keys[code]) {
      this.dashBufferTimer = 0.14;
    } else if ((code === 'KeyF' || code === 'KeyJ') && !this.keys[code]) {
      this.triggerHeavyBreakStrike();
    } else if (code === kb.ultimate && !this.keys[code]) {
      this.triggerHeroUltimate();
    } else if (code === kb.activeSkill && !this.keys[code]) {
      this.triggerHeroActiveSkill();
    } else if (code === kb.cycleCamera && !this.keys[code]) {
      this.quickCycleCombatCamera();
    } else if (code === 'KeyX' && !this.keys[code]) {
      this.triggerWeaponOverdrive();
    } else if ((this.isCoopRaidMode || this.coopAllies.length > 0) && !this.keys[code]) {
      if (code === 'Digit1') {
        this.setCoopTacticalOrder('focus_boss');
      } else if (code === 'Digit2') {
        this.setCoopTacticalOrder('break_guard');
      } else if (code === 'Digit3') {
        this.setCoopTacticalOrder('protect_player');
      } else if (code === 'Digit4') {
        this.setSquadFormation('break_focus');
      } else if (code === 'Digit5') {
        this.setSquadFormation('guard_sustain');
      } else if (code === 'Digit6') {
        this.setSquadFormation('elemental_chain');
      }
    }
    this.keys[code] = true;
  };

  public setCoopTacticalOrder(order: CoopTacticalOrder): void {
    this.coopTacticalOrder = order;
    const meta =
      WAVE9_COOP_QUICK_ORDERS.find((o) => o.id === order) ??
      COOP_TACTICAL_ORDERS.find((o) => o.id === order);
    if (meta && (this.isCoopRaidMode || this.coopAllies.length > 0)) {
      soundEngine.playCoopTacticalPing();
      for (const ally of this.coopAllies) {
        ally.calloutText = meta.shortLabel;
        ally.calloutTimer = 2.4;
      }
      const responder =
        this.coopAllies[0]?.name ?? 'Đồng Đội [AI Live]';
      this.coopPingToast = pickCoopPingAiReply(order, responder);
      this.coopPingToastTimer = 3.2;
      this.coopPrimerBanner = meta.callout;
      this.coopPrimerBannerTimer = 2.6;
      this.emitFloatingNumber(
        this.px,
        2.45,
        this.pz,
        0,
        true,
        false,
        undefined,
        meta.callout
      );
      this.syncHudImmediate();
    }
  }

  public triggerCoopTacticalPing(order: CoopTacticalOrder): void {
    this.setCoopTacticalOrder(order);
  }

  public quickCycleCombatCamera(): void {
    const cycled = cycleCombatCameraPreset(this.combatCameraPreset);
    this.combatCameraPreset = cycled.next;
    this.cameraPresetToast = cycled.toastLabel;
    this.cameraPresetToastTimer = 1.65;
    soundEngine.playCameraCycleClick();
    this.callbacks.onCombatCameraQuickCycle?.(cycled.next);
    this.syncHudImmediate();
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onWindowBlur = () => {
    this.keys = {};
    this.pointerDown = false;
    this.pointerId = null;
    this.joyVecX = 0;
    this.joyVecZ = 0;
    this.callbacks.onJoystickUpdate({
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  private onWheel = (e: WheelEvent) => {
    if (this.phase !== GamePhase.TITLE) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.55 : -0.55;
    this.adjustLobbyZoom(delta);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase === GamePhase.TITLE) {
      soundEngine.unlock();
      this.lobbyDragActive = true;
      this.lobbyDragPointerId = e.pointerId;
      this.lobbyDragLastX = e.clientX;
      this.lobbyDragLastY = e.clientY;
      this.lobbyDragMovedDist = 0;
      return;
    }
    if (this.phase !== GamePhase.PLAYING) return;
    soundEngine.unlock();
    this.pointerDown = true;
    this.pointerId = e.pointerId;
    this.joyOriginX = e.clientX;
    this.joyOriginY = e.clientY;
    this.joyCurrX = e.clientX;
    this.joyCurrY = e.clientY;
    this.joyVecX = 0;
    this.joyVecZ = 0;
    this.callbacks.onJoystickUpdate({
      active: true,
      originX: this.joyOriginX,
      originY: this.joyOriginY,
      currentX: this.joyCurrX,
      currentY: this.joyCurrY,
    });
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.phase === GamePhase.TITLE && this.lobbyDragActive && e.pointerId === this.lobbyDragPointerId) {
      const dx = e.clientX - this.lobbyDragLastX;
      const dy = e.clientY - this.lobbyDragLastY;
      this.lobbyDragLastX = e.clientX;
      this.lobbyDragLastY = e.clientY;
      this.lobbyDragMovedDist += Math.hypot(dx, dy);
      this.rotateLobbyHero(dx * 0.013);
      this.lobbyTargetPitch = Math.max(-0.26, Math.min(0.55, this.lobbyTargetPitch + dy * 0.0045));
      return;
    }
    if (!this.pointerDown || e.pointerId !== this.pointerId) return;
    const dx = e.clientX - this.joyOriginX;
    const dy = e.clientY - this.joyOriginY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 56;
    if (dist > 6) {
      const clamped = Math.min(dist, maxDist);
      this.joyVecX = (dx / dist) * (clamped / maxDist);
      this.joyVecZ = (dy / dist) * (clamped / maxDist);
      this.joyCurrX = this.joyOriginX + (dx / dist) * clamped;
      this.joyCurrY = this.joyOriginY + (dy / dist) * clamped;
    } else {
      this.joyVecX = 0;
      this.joyVecZ = 0;
      this.joyCurrX = e.clientX;
      this.joyCurrY = e.clientY;
    }
    this.callbacks.onJoystickUpdate({
      active: true,
      originX: this.joyOriginX,
      originY: this.joyOriginY,
      currentX: this.joyCurrX,
      currentY: this.joyCurrY,
    });
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.lobbyDragActive && e.pointerId === this.lobbyDragPointerId) {
      const wasTap = this.phase === GamePhase.TITLE && this.lobbyDragMovedDist < 8;
      this.lobbyDragActive = false;
      this.lobbyDragPointerId = null;
      if (wasTap) {
        this.triggerLobbyHeroEmote();
      }
    }
    if (!this.pointerDown || e.pointerId !== this.pointerId) return;
    this.pointerDown = false;
    this.pointerId = null;
    this.joyVecX = 0;
    this.joyVecZ = 0;
    this.callbacks.onJoystickUpdate({
      active: false,
      originX: 0,
      originY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  public triggerDash(): void {
    if (this.phase === GamePhase.PLAYING) {
      this.dashBufferTimer = 0.14;
      queueBufferedAction(this.combatInputBuffer, 'dash', performance.now());
    }
  }

  public triggerHeavyBreakStrike(): void {
    if (this.phase !== GamePhase.PLAYING || this.heavyBreakCooldown > 0) return;
    if (this.isBossEntranceLocked()) {
      this.notifyBossEntranceLockedHint();
      return;
    }
    const nearest = this.findNearestEnemy(this.px, this.pz);
    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const spec = computeHeavyBreakStrikeSpec(atkPower, this.comboCount, Boolean(nearest?.isBoss));
    this.heavyBreakCooldown = HEAVY_BREAK_COOLDOWN_SEC;
    this.invulnTimer = Math.max(this.invulnTimer, 0.24);

    let aimX = Math.sin(this.pFacing);
    let aimZ = Math.cos(this.pFacing);
    if (nearest) {
      const dx = nearest.x - this.px;
      const dz = nearest.z - this.pz;
      const d = Math.hypot(dx, dz) || 1;
      aimX = dx / d;
      aimZ = dz / d;
      this.pFacing = Math.atan2(aimX, aimZ);
    }

    const step = spec.lungeDistance * 0.6;
    this.px = THREE.MathUtils.clamp(this.px + aimX * step, -ARENA_HALF_W + 0.6, ARENA_HALF_W - 0.6);
    this.pz = THREE.MathUtils.clamp(this.pz + aimZ * step, -ARENA_HALF_D + 0.6, ARENA_HALF_D - 0.6);
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);
    this.heroSquashY = 1.24;

    const strikeX = this.px + aimX * 1.45;
    const strikeZ = this.pz + aimZ * 1.45;
    const pan = computeSpatialPan(strikeX, ARENA_HALF_W);
    soundEngine.playHeavyBreakStrike(pan);
    triggerHapticPulse('boss_break', this.hapticsEnabled);
    this.hitstopTimer = Math.max(this.hitstopTimer, spec.hitstopSec);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.42);
    this.cameraFovOffset = spec.fovKick;

    this.spawnShockwave(strikeX, strikeZ, 0x38bdf8, spec.radius, 0.34);
    this.spawnShockwave(strikeX, strikeZ, 0xfde047, spec.radius * 0.72, 0.28);
    this.spawnCritStar(strikeX, 1.2, strikeZ, 0xfde047, 2.0);
    this.spawnParticles(strikeX, 1.0, strikeZ, 0x38bdf8, 22);
    this.spawnArmorShards(strikeX, 1.1, strikeZ, 0xfbbf24, 10);
    this.emitFloatingNumber(this.px, 2.3, this.pz, 0, true, false, 'storm', 'PHÁ GIÁP TRẢM!', true);

    for (const e of [...this.enemies]) {
      if (!e || e.dead || e.spawnTimer > 0) continue;
      const dx = e.x - strikeX;
      const dz = e.z - strikeZ;
      const d = Math.hypot(dx, dz);
      if (d <= spec.radius + e.radius) {
        if (e.isBoss && e.maxBreakShield && e.breakShield && e.breakShield > 0) {
          e.breakShield = Math.max(0, e.breakShield - e.maxBreakShield * spec.bossShieldDamageRatio);
        }
        if (e.eliteShieldHp && e.eliteShieldHp > 0) {
          e.eliteShieldHp = 0;
          soundEngine.playEliteAffixTrigger('aegis');
        }
        if (!e.isBoss && !e.isTrainingDummy && !e.isVaultPillar && !e.isBossTotem && d > 0.05) {
          e.knockVx = (e.knockVx ?? 0) + (dx / d) * spec.knockbackForce;
          e.knockVz = (e.knockVz ?? 0) + (dz / d) * spec.knockbackForce;
        }
        this.damageEnemy(
          e,
          spec.damage,
          true,
          false,
          false,
          true,
          false,
          'PHÁ GIÁP TRẢM!',
          'basic',
          undefined,
          { attackerX: this.px, attackerZ: this.pz, bypassShield: true }
        );
      }
    }
    this.tryTriggerExecutionFinisherFromStrike(strikeX, strikeZ, 4.4);
    this.syncHudImmediate();
  }

  private tryTriggerPerfectDodge(): void {
    const res = resolvePerfectDodgeTrigger({
      internalCooldown: this.perfectDodgeInternalCd,
      activeSkillCooldown: this.activeSkillCooldown,
      ultCharge: this.ultCharge,
    });
    if (!res.triggered) return;

    this.perfectDodgeInternalCd = res.nextInternalCooldown;
    this.perfectDodgeBuffTimer = res.buffDuration;
    this.perfectDodgeBannerTimer = 1.9;
    this.activeSkillCooldown = res.nextActiveSkillCooldown;
    this.ultCharge = res.nextUltCharge;
    this.perfectDodgeCount += 1;
    this.counterShotTimer = 3.5;
    triggerPerfectDodgeCounter(this.perfectDodgeCounter);
    const dodgeStyleRes = recordStyleAction(this.styleMomentum, 'perfect_dodge');
    if (dodgeStyleRes.promoted) {
      soundEngine.playComboRankUp(dodgeStyleRes.pitchBoost);
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (!prefersReducedMotion) {
      this.perfectDodgeSlowTimer = PERFECT_DODGE_SLOWMO_DURATION;
    }
    // Deterministic fixed-tick Perfect Dodge micro time-dilation (12/30/60 FPS parity)
    triggerDeterministicPerfectDodgeBurst(this.kinestheticsClock, 12);

    soundEngine.playPerfectDodge();
    triggerHapticPulse('dash', this.hapticsEnabled);
    this.spawnImpactLight(this.px, 1.3, this.pz, 'perfect_dodge');
    this.spawnCritStar(this.px, 1.25, this.pz, 0x34d399, 1.65);
    this.triggerPostFxImpulse('perfect_dodge');
    this.spawnDashGhost(this.px - this.dashDirX * 0.45, this.pz - this.dashDirZ * 0.45, this.pFacing, 0x34d399);
    this.spawnDashGhost(this.px, this.pz, this.pFacing, 0xfde047);
    this.spawnShockwave(this.px, this.pz, 0xe0f2fe, 3.6, 0.34);
    this.spawnShockwave(this.px, this.pz, 0xfde047, 4.15, 0.36);
    this.spawnParticles(this.px, 0.9, this.pz, 0x38bdf8, 16);
    this.emitFloatingNumber(this.px, 2.25, this.pz, 0, true, false, 'ice', 'PHẢN KÍCH THỜI GIAN! ×2');
    this.syncHudImmediate();
  }

  public triggerHeroActiveSkill(): void {
    if (this.phase !== GamePhase.PLAYING) return;
    if (this.isBossEntranceLocked()) {
      this.notifyBossEntranceLockedHint();
      return;
    }
    if (this.activeSkillCooldown > 0) {
      queueBufferedAction(this.combatInputBuffer, 'activeSkill', performance.now());
      return;
    }

    const skillDef = getHeroActiveSkill(this.baseStats.heroId);
    const convergenceTarget = skillDef.effectKind === 'storm_convergence'
      ? this.enemies.filter((enemy) => !enemy.dead && enemy.spawnTimer <= 0 &&
          (enemy.stormMarkUntil ?? 0) > this.elapsed &&
          Math.hypot(enemy.x - this.px, enemy.z - this.pz) <= skillDef.radius)
        .sort((a, b) => Math.hypot(a.x - this.px, a.z - this.pz) - Math.hypot(b.x - this.px, b.z - this.pz))[0]
      : undefined;
    if (skillDef.effectKind === 'storm_convergence' && !convergenceTarget) {
      this.emitFloatingNumber(this.px, 2.1, this.pz, 0, false, false, undefined, 'CẦN DẤU DẪN');
      return;
    }
    this.activeSkillMaxCooldown = skillDef.cooldownSec;
    this.activeSkillCooldown = skillDef.cooldownSec;

    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const skillDmg = Math.max(1, Math.round(atkPower * skillDef.damageMult));
    const liveEnemies = this.enemies.filter((e) => e.spawnTimer <= 0);
    const nearest = this.findNearestEnemy(this.px, this.pz);

    if (skillDef.effectKind === 'storm_convergence') {
      soundEngine.playVanTichConvergence(computeSpatialPan(this.px, ARENA_HALF_W));
    } else {
      soundEngine.playHeroActiveSkill(this.baseStats.heroId);
    }
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.18);
    this.spawnShockwave(this.px, this.pz, skillDef.accentHex, Math.min(5.2, skillDef.radius), 0.34);
    this.spawnParticles(this.px, 1.0, this.pz, skillDef.accentHex, 18);
    this.emitFloatingNumber(
      this.px,
      2.18,
      this.pz,
      0,
      true,
      false,
      undefined,
      skillDef.shortLabel.toUpperCase()
    );

    switch (skillDef.effectKind) {
      case 'moon_fan_mark': {
        const baseYaw = nearest
          ? Math.atan2(nearest.x - this.px, nearest.z - this.pz)
          : this.pFacing;
        [-0.24, 0, 0.24].forEach((offset) => {
          this.firePlayerArrow(baseYaw + offset, 0, false, 'ultimate');
        });
        liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .slice(0, 4)
          .forEach((e) => {
            this.markedEnemyIds.add(e.id);
            this.spawnShockwave(e.x, e.z, skillDef.accentHex, 1.8, 0.26);
            this.damageEnemy(e, skillDmg, true, false, false, false, false, 'NGUYỆT ẤN', 'ultimate');
          });
        break;
      }
      case 'valiant_cadence':
      case 'stage_crescendo': {
        if (skillDef.effectKind === 'stage_crescendo') {
          this.spawnShockwave(this.px, this.pz, skillDef.accentHex, skillDef.radius * 0.55, 0.3);
          this.spawnShockwave(this.px, this.pz, 0xf9a8d4, skillDef.radius * 0.78, 0.36);
        }
        this.alexCadenceTimer = skillDef.durationSec ?? 3.5;
        liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .forEach((e) => {
            if (!e.isBoss && !e.isTrainingDummy) {
              const dx = e.x - this.px;
              const dz = e.z - this.pz;
              const d = Math.max(0.1, Math.hypot(dx, dz));
              e.x = THREE.MathUtils.clamp(e.x + (dx / d) * 1.4, -ARENA_HALF_W + 0.8, ARENA_HALF_W - 0.8);
              e.z = THREE.MathUtils.clamp(e.z + (dz / d) * 1.4, -ARENA_HALF_D + 0.8, ARENA_HALF_D - 0.8);
            }
            this.damageEnemy(e, skillDmg, false, false, false, false, false, skillDef.shortLabel.toLocaleUpperCase('vi'), 'ultimate');
          });
        break;
      }
      case 'crimson_swarm': {
        const healAmt = Math.round(this.maxHp * 0.08);
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.emitFloatingNumber(this.px, 1.85, this.pz, healAmt, false, true);
        liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .slice(0, 6)
          .forEach((e) => {
            this.spawnParticles(e.x, 1.0, e.z, skillDef.accentHex, 8);
            this.damageEnemy(e, skillDmg, false, false, false, false, false, 'HUYẾT DƠI', 'ultimate');
          });
        break;
      }
      case 'glacial_spire': {
        const cx = nearest ? nearest.x : this.px;
        const cz = nearest ? nearest.z : this.pz - 3.2;
        this.spawnUltColumn(cx, cz, skillDef.accentHex, 0.42);
        this.spawnShockwave(cx, cz, skillDef.accentHex, skillDef.radius, 0.36);
        liveEnemies
          .filter((e) => Math.hypot(e.x - cx, e.z - cz) <= skillDef.radius)
          .forEach((e) => {
            e.chillTimer = Math.max(e.chillTimer, skillDef.durationSec ?? 1.6);
            this.damageEnemy(e, skillDmg, true, false, true, false, false, 'BĂNG TRỤ', 'ultimate');
          });
        break;
      }
      case 'ember_nova': {
        this.spawnShockwave(this.px, this.pz, 0xf97316, skillDef.radius, 0.4);
        liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .forEach((e) => {
            e.burnTimer = Math.max(e.burnTimer, 3.2);
            e.burnDps = Math.max(e.burnDps, atkPower * 0.42);
            this.damageEnemy(e, skillDmg, false, true, false, false, false, 'HỎA NGỤC', 'ultimate');
          });
        break;
      }
      case 'storm_convergence': {
        if (!convergenceTarget) break;
        this.artemisMotion?.cast(0.55);
        const center = convergenceTarget;
        center.stormMarkUntil = 0;
        const nearby = liveEnemies.filter((enemy) => enemy !== center && !enemy.dead &&
          Math.hypot(enemy.x - center.x, enemy.z - center.z) <= 3.8)
          .sort((a, b) => Math.hypot(a.x - center.x, a.z - center.z) - Math.hypot(b.x - center.x, b.z - center.z))
          .slice(0, 2);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.26);
        this.spawnSummonPortal(center.x, center.z, 2.35, 0x5eead4, 0.72);
        this.spawnWindRing(center.x, center.z, 0x5eead4, 2.8, 0.14);
        this.spawnShockwave(center.x, center.z, 0x2dd4bf, 3.4, 0.36);
        this.spawnUltColumn(center.x, center.z, 0x99f6e4, 0.24);
        this.spawnParticles(center.x, 1.1, center.z, 0x5eead4, 20);
        this.spawnLightningArc(this.px, 1.4, this.pz, center.x, 0.8, center.z);
        this.damageEnemy(center, skillDmg, false, false, false, true, false, 'HỘI TỤ!', 'ultimate');
        for (const enemy of nearby) {
          this.spawnLightningArc(center.x, 0.8, center.z, enemy.x, 0.8, enemy.z);
          this.spawnShockwave(enemy.x, enemy.z, 0x5eead4, 1.85, 0.26);
          this.spawnParticles(enemy.x, 0.9, enemy.z, 0x99f6e4, 12);
          this.damageEnemy(enemy, skillDmg * 0.70, false, false, false, true, false, 'SÉT LAN!', 'ultimate');
        }
        break;
      }
      case 'thunder_arc': {
        const targets = liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .slice(0, 4);
        let prevX = this.px;
        let prevZ = this.pz;
        targets.forEach((e) => {
          this.spawnLightningArc(prevX, 1.3, prevZ, e.x, 1.1, e.z);
          prevX = e.x;
          prevZ = e.z;
          this.damageEnemy(e, skillDmg, true, false, false, true, false, 'LÔI ĐÌNH', 'ultimate');
        });
        break;
      }
      case 'abyssal_aegis': {
        const shieldAdd = Math.round(this.maxHp * 0.16);
        this.shield = Math.min(Math.round(this.maxHp * 0.65), this.shield + shieldAdd);
        this.emitFloatingNumber(this.px, 1.85, this.pz, shieldAdd, false, true, 'ice', 'KHIÊN HẮC ÁM');
        liveEnemies
          .filter((e) => Math.hypot(e.x - this.px, e.z - this.pz) <= skillDef.radius)
          .forEach((e) => {
            this.damageEnemy(e, skillDmg, false, false, false, false, false, 'HẮC GAI', 'ultimate');
          });
        break;
      }
      case 'cudgel_vault': {
        this.wukongOverdriveTimer = Math.max(this.wukongOverdriveTimer, skillDef.durationSec ?? 3.5);
        const cx = nearest ? nearest.x : this.px;
        const cz = nearest ? nearest.z : this.pz - 3.0;
        this.spawnUltColumn(cx, cz, 0xf59e0b, 0.36);
        this.spawnShockwave(cx, cz, 0xf59e0b, skillDef.radius, 0.38);
        liveEnemies
          .filter((e) => Math.hypot(e.x - cx, e.z - cz) <= skillDef.radius)
          .forEach((e) => {
            this.damageEnemy(e, skillDmg, true, false, false, false, false, 'KIM CÔ!', 'ultimate');
          });
        break;
      }
      case 'electro_rose_lantern': {
        const cx = nearest ? nearest.x : this.px;
        const cz = nearest ? nearest.z : this.pz - 2.6;
        this.spawnUltColumn(cx, cz, 0xa855f7, 0.4);
        this.spawnShockwave(cx, cz, 0xa855f7, skillDef.radius, 0.4);
        const targets = liveEnemies
          .filter((e) => Math.hypot(e.x - cx, e.z - cz) <= skillDef.radius)
          .slice(0, 5);
        let prevX = this.px;
        let prevZ = this.pz;
        targets.forEach((e) => {
          this.spawnLightningArc(prevX, 1.35, prevZ, e.x, 1.1, e.z);
          this.spawnParticles(e.x, 1.05, e.z, 0xc084fc, 8);
          prevX = e.x;
          prevZ = e.z;
          this.damageEnemy(e, skillDmg, true, false, false, true, false, 'TỬ LÔI!', 'ultimate');
        });
        break;
      }
    }

    this.syncHudImmediate();
  }

  public triggerHeroUltimate(): void {
    if (this.phase !== GamePhase.PLAYING) return;
    if (this.isBossEntranceLocked()) {
      this.notifyBossEntranceLockedHint();
      return;
    }
    if (this.ultCharge < 100) {
      queueBufferedAction(this.combatInputBuffer, 'ultimate', performance.now());
      return;
    }
    this.ultCharge = 0;

    const heroDef = HERO_MAP[this.baseStats.heroId] ?? HERO_MAP.aurelia;
    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const liveEnemies = this.enemies.filter((e) => e.spawnTimer <= 0);

    soundEngine.playUltimate();
    soundEngine.playUltimateCutin();
    this.ultCutinTimer = this.ultCutinDuration;
    this.ultCutinTitle = heroDef.ultName;
    this.ultCutinHeroName = heroDef.name;
    this.ultCutinAccentHex = `#${this.weaponAccentHex.toString(16).padStart(6, '0')}`;
    this.invulnTimer = Math.max(this.invulnTimer, 0.75);
    this.hitstopTimer = 0.045;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    this.spawnImpactLight(this.px, 1.8, this.pz, 'ultimate');
    this.spawnCritStar(this.px, 1.5, this.pz, 0xfde047, 2.2);
    this.triggerPostFxImpulse('ultimate');
    this.spawnUltColumn(this.px, this.pz, this.weaponAccentHex, 0.58);
    this.spawnShockwave(this.px, this.pz, this.weaponAccentHex, 6.2, 0.48);
    this.spawnShockwave(this.px, this.pz, 0xfde047, 3.8, 0.36);
    this.spawnParticles(this.px, 1.1, this.pz, this.weaponAccentHex, 30);
    this.triggerCompanionSynergyStrike();
    this.tryTriggerExecutionFinisherFromStrike(this.px, this.pz, 9.5);
    if (this.isCoopRaidMode) {
      const resonance = onPlayerUltimateCastInCoop(this.coopSynergyClock);
      if (resonance.triggeredResonance) {
        soundEngine.playCoopResonanceChord();
        this.spawnShockwave(this.px, this.pz, 0xfde047, 7.6, 0.56);
        this.emitFloatingNumber(
          this.px,
          2.8,
          this.pz,
          0,
          true,
          false,
          undefined,
          'CỘNG HƯỞNG LIÊN KÍCH +25% ST!'
        );
      }
    }
    this.emitFloatingNumber(
      this.px,
      2.3,
      this.pz,
      0,
      true,
      false,
      undefined,
      heroDef.ultName.toUpperCase()
    );

    switch (this.baseStats.heroId) {
      case 'artemis': {
        for (let i = 0; i < 14; i++) {
          const yaw = (i / 14) * Math.PI * 2;
          this.firePlayerArrow(yaw, 0, true, 'ultimate');
        }
        liveEnemies.slice(0, 5).forEach((target) => {
          this.spawnLightningArc(target.x, 8.2, target.z, target.x, 0.4, target.z);
          this.spawnShockwave(target.x, target.z, 0x10b981, 2.2, 0.35);
          this.damageEnemy(target, atkPower * 2.4, true, false, false, false, false, 'TRĂNG BẠC!', 'ultimate');
        });
        break;
      }
      case 'hatsune_miku': {
        this.alexOverdriveTimer = 5.0;
        this.spawnShockwave(this.px, this.pz, heroDef.accentHex, 6.2, 0.48);
        for (const e of [...this.enemies]) {
          if (!e || e.dead || e.spawnTimer > 0) continue;
          const dx = e.x - this.px;
          const dz = e.z - this.pz;
          const d = Math.hypot(dx, dz);
          if (d <= 6.2) {
            if (!e.isBoss && d > 0.01) {
              e.x += (dx / d) * 3.0;
              e.z += (dz / d) * 3.0;
            }
            this.damageEnemy(e, atkPower * 2.1, true, false, false, false, false, undefined, 'ultimate');
          }
        }
        break;
      }
      case 'bellona': {
        this.spawnShockwave(this.px, this.pz, 0xff682e, 6.2, 0.55);
        for (const enemy of liveEnemies) {
          if (enemy.dead || Math.hypot(enemy.x - this.px, enemy.z - this.pz) > 6.2) continue;
          enemy.burnTimer = Math.max(enemy.burnTimer, 3);
          enemy.burnDps = Math.max(enemy.burnDps, atkPower * 0.35);
          this.damageEnemy(enemy, atkPower * 2.4, true, false, false, false, false, 'PHÁN QUYẾT!', 'ultimate');
        }
        break;
      }
      case 'sylvia': {
        this.solarLeoUltBurst = 1.0;
        this.shield = Math.min(this.maxHp * 0.45, this.shield + this.maxHp * 0.18);
        this.spawnUltColumn(this.px, this.pz, 0x10b981, 1.0);
        this.spawnShockwave(this.px, this.pz, 0x34d399, 6.6, 0.55);
        this.spawnParticles(this.px, 1.3, this.pz, 0x6ee7b7, 20);
        for (const enemy of liveEnemies) {
          if (enemy.dead || Math.hypot(enemy.x - this.px, enemy.z - this.pz) > 6.6) continue;
          enemy.stunTimer = Math.max(enemy.stunTimer ?? 0, enemy.isBoss ? 0.65 : 1.4);
          this.damageEnemy(enemy, atkPower * 2.55, true, false, false, false, false, 'THÁNH ĐỊA!', 'ultimate');
        }
        break;
      }
      case 'aurelia': {
        this.solarLeoUltBurst = 1.0;
        this.alexOverdriveTimer = Math.max(this.alexOverdriveTimer, 5.0);
        this.shield = Math.min(this.maxHp * 0.4, this.shield + this.maxHp * 0.15);
        this.spawnUltColumn(this.px, this.pz, 0xf59e0b, 1.05);
        this.spawnShockwave(this.px, this.pz, 0xfbbf24, 6.8, 0.55);
        this.spawnParticles(this.px, 1.35, this.pz, 0xfef08a, 24);
        for (let i = 0; i < 12; i++) {
          const yaw = (i / 12) * Math.PI * 2;
          this.firePlayerArrow(yaw, 0, true, 'ultimate');
        }
        for (const e of [...this.enemies]) {
          if (!e || e.dead || e.spawnTimer > 0) continue;
          const d = Math.hypot(e.x - this.px, e.z - this.pz);
          if (d <= 6.8) {
            this.spawnShockwave(e.x, e.z, 0xf59e0b, 2.0, 0.32);
            this.damageEnemy(e, atkPower * 2.6, true, false, false, false, false, 'NHẬT LUÂN!', 'ultimate');
          }
        }
        break;
      }
    }

    this.syncHudImmediate();
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      if (document.hidden) {
        // Tab ẩn không mô phỏng/render, tránh tiêu thụ GPU khi không chơi.
        this.lastTime = now;
        this.frameId = window.setTimeout(tick, 250);
        return;
      }
      try {
        const rawDt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.lastRawFrameDt = Math.min(Math.max(rawDt, 0.001), 0.5);
        if (this.fpsSampler) pushFpsSample(this.fpsSampler, rawDt);
        const dt = Math.min(Math.max(rawDt, 0.001), MAX_FRAME_DT);
        // Keep the lobby interactive while models load. Hold combat simulation until the rider is visible.
        if (!this.appearanceBlocked || this.phase === GamePhase.TITLE) this.update(dt);
        this.renderSceneFrame();
        if (this.chapter1MapInFlightMarked && this.chapter1MapModel && !this.contextLost) {
          this.chapter1MapStableFrames += 1;
          if (this.chapter1MapStableFrames >= 2) {
            clearChapter1MapLoadInFlight();
            clearHeavyAssetLoadInFlight();
            this.chapter1MapInFlightMarked = false;
          }
        }
        if (!this.appearanceBlocked && this.appearanceStatus === 'loading') {
          this.setAppearanceStatus('ready');
        }
      } catch (err) {
        console.error('[GameEngine] Frame tick error:', err);
      } finally {
        if (!this.disposed) {
          // Chỉ giữ tối đa một frame đang xử lý, kể cả GPU phần cứng chậm.
          this.afterDraw(() => {
            this.frameId = requestAnimationFrame(tick);
          });
        }
      }
    };
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl.isContextLost()) return;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    this.pendingGpuSync = sync;
    gl.flush();
    const poll = () => {
      if (this.disposed || gl.isContextLost()) {
        if (sync && this.pendingGpuSync === sync) gl.deleteSync(sync);
        this.pendingGpuSync = null;
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 8);
      } else {
        if (sync) gl.deleteSync(sync);
        this.pendingGpuSync = null;
        const budget = this.getActiveSystemBudget();
        const fps = this.isSoftwareGl
          ? 12
          : this.phase === GamePhase.TITLE
          ? budget.targetLobbyFps
          : budget.targetCombatFps;
        const delay = Math.max(0, 1000 / fps - (performance.now() - this.lastTime));
        this.frameId = window.setTimeout(cb, delay);
      }
    };
    this.frameId = window.setTimeout(poll, 8);
  }

  private update(frameDt: number): void {
    const visualDt = Math.min(Math.max(frameDt, 0.001), 0.05);
    if (this.phase !== GamePhase.PLAYING) {
      this.elapsed += visualDt;
    }
    const dt = visualDt;

    if (this.phase === GamePhase.TITLE) {
      this.hero.root.position.set(0, 0, 4.5);
      this.heroShadow.position.set(0, 0.025, 4.5);
      const sway = Math.sin(this.elapsed * 0.45) * 0.24;
      const hasMount = Boolean(this.hero.mountGroup);
      const mountExtraZ = hasMount ? 1.85 : 0;
      const mountExtraY = hasMount ? 0.56 : 0;
      const mountLookY = hasMount ? 0.46 : 0;
      const aspectExtraZ = Math.max(0, (1.42 - this.camera.aspect) * 2.35);

      // Minimalist Hero-First Battle Lobby: full-body hero centered prominently in open viewport
      let targetCamX = sway * 0.3;
      let targetCamY = 2.02 + mountExtraY;
      let targetCamZ = 10.65 + mountExtraZ + aspectExtraZ;
      let lookX = 0;
      let lookY = 0.96 + mountLookY;

      if (this.lobbyPhotoMode) {
        if (this.lobbyPhotoAngle === 'closeup') {
          targetCamX = sway * 0.1;
          targetCamY = 1.98 + mountExtraY;
          targetCamZ = 8.45 + mountExtraZ * 0.72 + aspectExtraZ * 0.5;
          lookX = 0;
          lookY = 1.42 + mountLookY;
        } else if (this.lobbyPhotoAngle === 'hero_wide') {
          targetCamX = -0.82 + sway * 0.22;
          targetCamY = 2.48 + mountExtraY;
          targetCamZ = 12.6 + mountExtraZ + aspectExtraZ;
          lookX = 0;
          lookY = 1.05 + mountLookY;
        } else {
          targetCamX = sway * 0.16;
          targetCamY = 2.04 + mountExtraY;
          targetCamZ = 10.2 + mountExtraZ + aspectExtraZ * 0.75;
          lookX = 0;
          lookY = 1.08 + mountLookY;
        }
      } else if (this.lobbyCameraPreset === 'closeup') {
        targetCamX = sway * 0.16;
        targetCamY = 1.98 + mountExtraY;
        targetCamZ = 8.65 + mountExtraZ * 0.75 + aspectExtraZ * 0.6;
        lookX = 0;
        lookY = 1.38 + mountLookY;
      } else if (this.lobbyCameraPreset === 'wardrobe') {
        targetCamX = 0.48 + sway * 0.12;
        targetCamY = 2.06 + mountExtraY;
        targetCamZ = 10.9 + mountExtraZ + aspectExtraZ;
        lookX = 0.48;
        lookY = 0.92 + mountLookY;
      } else if (
        this.lobbyViewMode === 'gear' ||
        this.lobbyViewMode === 'heroes' ||
        this.lobbyViewMode === 'runes'
      ) {
        // AAA Left-Right Split framing: project 3D Hero dead center inside the left 42% showcase column
        targetCamZ = 11.1 + mountExtraZ + aspectExtraZ;
        const halfHeightAtHero = Math.tan((46 * Math.PI) / 360) * (targetCamZ - 4.5);
        const splitOffsetX =
          this.camera.aspect >= 1.08
            ? Math.min(3.15, 0.56 * halfHeightAtHero * this.camera.aspect)
            : 0;
        targetCamX = splitOffsetX + sway * 0.12;
        targetCamY = 1.98 + mountExtraY;
        lookX = splitOffsetX;
        lookY = 0.95 + mountLookY;
      }

      // Wave 14 + AAA Wave 7: Smooth 360° Lobby Pitch, Zoom & Studio Inspect Turntable Damping
      this.lobbyInspectRig = stepLobbyInspectRig(
        this.lobbyInspectRig,
        this.lobbyInspectActive,
        this.lobbyInspectAutoRotate,
        dt
      );
      const inspectBlend = this.lobbyInspectRig.blend;
      const sanctuaryWave = computeSanctuaryAtmosphereWave(this.elapsed);

      this.lobbyOrbitPitch = THREE.MathUtils.damp(this.lobbyOrbitPitch, this.lobbyTargetPitch, 6.5, dt);
      this.lobbyOrbitZoom = THREE.MathUtils.damp(this.lobbyOrbitZoom, this.lobbyTargetZoom, 6.5, dt);
      targetCamY += this.lobbyOrbitPitch * 2.1;
      targetCamZ = Math.max(6.8, targetCamZ + this.lobbyOrbitZoom);

      if (inspectBlend > 0.005) {
        targetCamX = THREE.MathUtils.lerp(targetCamX, 0, inspectBlend);
        targetCamY = THREE.MathUtils.lerp(targetCamY, 1.72 + (hasMount ? 0.58 : 0) + this.lobbyOrbitPitch * 1.8, inspectBlend);
        targetCamZ = THREE.MathUtils.lerp(targetCamZ, Math.max(6.6, 8.35 + (hasMount ? 1.2 : 0) + this.lobbyOrbitZoom * 0.6), inspectBlend);
        lookX = THREE.MathUtils.lerp(lookX, 0, inspectBlend);
        lookY = THREE.MathUtils.lerp(lookY, 1.24 + (hasMount ? 0.42 : 0), inspectBlend);
      }

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 5.2, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 5.2, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 5.2, dt);
      this.camera.lookAt(lookX, lookY, 4.5);
      this.heroLight.position.set(1.8, 2.55, 7.6);

      if (this.lobbyPhotoMode) {
        this.applyPhotoStudioLighting(dt);
      } else {
        this.rimLight.intensity = THREE.MathUtils.damp(
          this.rimLight.intensity,
          this.lobbyInspectRig.rimLightIntensity * sanctuaryWave.sunBreathIntensity,
          5.5,
          dt
        );
      }
      if (this.chapterWeatherPoints) {
        this.chapterWeatherPoints.visible = false;
      }
      if (this.groundMistMesh) {
        this.groundMistMesh.visible = false;
      }

      if (this.lobbyAutoSpinIdleTimer > 0) {
        this.lobbyAutoSpinIdleTimer -= dt;
      } else if (!this.lobbyDragActive) {
        const spinSpeed = this.lobbyInspectActive
          ? this.lobbyInspectAutoRotate
            ? 0.58
            : 0
          : 0.24;
        this.lobbyTargetYaw += dt * spinSpeed;
      }
      this.lobbyYaw = THREE.MathUtils.damp(this.lobbyYaw, this.lobbyTargetYaw, 8.5, dt);

      // Wave 14: Project hero head to screen space for 3D Floating Royal Title (throttled ~20Hz)
      this.lobbyHeadSyncTimer -= dt;
      if (this.lobbyHeadSyncTimer <= 0 && this.callbacks.onLobbyHeadPos) {
        this.lobbyHeadSyncTimer = 0.05;
        const headWorldY = (hasMount ? 3.28 : 2.52) + (this.lobbyHeroPose === 'astral_float' ? 0.35 : 0);
        _v2.set(0, headWorldY, 4.5).project(this.camera);
        const cw = this.container.clientWidth || window.innerWidth;
        const ch = this.container.clientHeight || window.innerHeight;
        const sx = ((_v2.x + 1) * 0.5) * cw;
        const sy = ((-_v2.y + 1) * 0.5) * ch;
        this.callbacks.onLobbyHeadPos({
          x: sx,
          y: sy,
          visible: _v2.z < 1 && sx > 40 && sx < cw - 40 && sy > 52 && sy < ch - 135,
        });
      }

      if (this.lobbyEmoteTimer > 0) {
        this.lobbyEmoteTimer = Math.max(0, this.lobbyEmoteTimer - dt);
      }
      const emotePose = computeLobbyEmotePose(this.lobbyEmoteTimer, this.lobbyEmoteDuration);
      const onDragon = this.hasDragonRide();
      const mountOffset = onDragon
        ? this.updateDragonRide(dt, 0, false, {
            mode: 'lobby',
            celebrating: emotePose.active || this.lobbyEmoteTimer > 0.05,
          })
        : this.hero.mountGroup
        ? 0.68
        : 0;
      const poseFloatY =
        (this.lobbyHeroPose === 'astral_float'
          ? 0.34 + Math.sin(this.elapsed * 3.2) * 0.1
          : Math.sin(this.elapsed * 2.2) * 0.04) + emotePose.liftY;
      const targetBodyTiltX = emotePose.active
        ? 0.08 * emotePose.drawProgress
        : this.lobbyHeroPose === 'aim_ready'
        ? 0.1
        : this.lobbyHeroPose === 'astral_float'
        ? -0.08
        : 0;
      const targetDrawArmX = emotePose.active
        ? -0.58 * emotePose.drawProgress
        : this.lobbyHeroPose === 'victory_salute'
        ? -1.15
        : this.lobbyHeroPose === 'aim_ready'
        ? -0.45
        : 0;
      const showWeaponInLobby =
        this.lobbyInspectActive ||
        this.lobbyHeroPose === 'aim_ready' ||
        this.lobbyHeroPose === 'victory_salute';

      this.hero.root.rotation.y = this.lobbyYaw;
      if (!hasMount) {
        this.hero.leftLeg.rotation.x = THREE.MathUtils.damp(this.hero.leftLeg.rotation.x, 0, 14, dt);
        this.hero.rightLeg.rotation.x = THREE.MathUtils.damp(this.hero.rightLeg.rotation.x, 0, 14, dt);
      }
      this.hero.bodyGroup.position.y = onDragon
        ? mountOffset
        : THREE.MathUtils.damp(this.hero.bodyGroup.position.y, mountOffset + poseFloatY, 6, dt);
      this.hero.bodyGroup.rotation.x = THREE.MathUtils.damp(this.hero.bodyGroup.rotation.x, targetBodyTiltX, 6, dt);
      this.hero.drawArm.rotation.x = THREE.MathUtils.damp(this.hero.drawArm.rotation.x, targetDrawArmX, 8, dt);
      this.hero.capeTail.rotation.x = 0.22 + Math.sin(this.elapsed * 3.1) * 0.07 + emotePose.drawProgress * 0.14;
      this.heroLight.intensity = 1.55 + emotePose.glowBoost * 1.15;
      if (this.hero.bowStringTop && this.hero.bowStringBottom) {
        const bowPose = computeBowStringPose(emotePose.active ? emotePose.drawProgress : 0);
        this.hero.bowStringTop.position.set(0, bowPose.topPosY, bowPose.topPosZ);
        this.hero.bowStringBottom.position.set(0, bowPose.bottomPosY, bowPose.bottomPosZ);
        this.hero.bowStringTop.rotation.x = bowPose.topRotX;
        this.hero.bowStringBottom.rotation.x = bowPose.bottomRotX;
        this.hero.bowStringTop.scale.y = bowPose.segmentScaleY;
        this.hero.bowStringBottom.scale.y = bowPose.segmentScaleY;
        this.hero.nockedArrow.visible = showWeaponInLobby && (emotePose.active || this.lobbyHeroPose === 'aim_ready');
        this.hero.nockedArrow.position.z = bowPose.nockZ;
        if (this.hero.nockedArrowTipMat) {
          this.hero.nockedArrowTipMat.emissiveIntensity = bowPose.tipEmissiveIntensity;
        }
      }
      if (this.hero.leftWingPivot && this.hero.rightWingPivot) {
        const flap = Math.sin(this.elapsed * 3.2) * 0.24;
        this.hero.leftWingPivot.rotation.y = 0.22 + flap;
        this.hero.rightWingPivot.rotation.y = -0.22 - flap;
      }
      if (this.hero.celestialWingLeft && this.hero.celestialWingRight) {
        const cFlap = Math.sin(this.elapsed * 2.8) * 0.3;
        this.hero.celestialWingLeft.rotation.y = 0.28 + cFlap;
        this.hero.celestialWingRight.rotation.y = -0.28 - cFlap;
        this.hero.celestialWingLeft.rotation.z = Math.cos(this.elapsed * 2.8) * 0.06;
        this.hero.celestialWingRight.rotation.z = -Math.cos(this.elapsed * 2.8) * 0.06;
      }
      if (this.hero.mountLegs && !onDragon) {
        this.hero.mountLegs.forEach((leg, lIdx) => {
          leg.rotation.x = Math.sin(this.elapsed * 2.4 + lIdx * 1.4) * 0.09;
        });
      }
      if (this.hero.weaponAuraGroup) {
        this.hero.weaponAuraGroup.rotation.z += dt * (1.9 + emotePose.glowBoost * 3.2);
        this.hero.weaponAuraGroup.rotation.y += dt * (1.1 + emotePose.glowBoost * 2.0);
      }
      if (this.hero.mythicCrownGroup) {
        this.hero.mythicCrownGroup.rotation.z += dt * 2.1;
      }
      if (this.hero.warBannerCloth) {
        this.hero.warBannerCloth.rotation.x = 0.08 + Math.sin(this.elapsed * 3.4) * 0.1;
        this.hero.warBannerCloth.rotation.y = Math.cos(this.elapsed * 2.1) * 0.08;
      }
      if (this.hero.artifactGroup) {
        if (this.solarLeoArtifactRig?.group.parent === this.hero.artifactGroup) {
          this.hero.artifactGroup.rotation.y = 0;
          this.hero.artifactGroup.position.set(
            SOLAR_LEO_ARTIFACT_OFFSET.x,
            SOLAR_LEO_ARTIFACT_OFFSET.y,
            SOLAR_LEO_ARTIFACT_OFFSET.z
          );
          updateSolarLeoArtifactPose(this.solarLeoArtifactRig, this.elapsed, dt, {
            mode: 'lobby',
            energyBurst: emotePose.active ? emotePose.glowBoost * 0.75 : 0,
            celebrating: emotePose.active || this.lobbyEmoteTimer > 0.05,
          });
        } else {
          this.hero.artifactGroup.rotation.y += dt * 1.35;
          this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 2.6) * 0.07;
        }
      }
      if (this.hero.haloGroup) {
        if (this.solarLeoHaloRig?.group.parent === this.hero.haloGroup) {
          this.hero.haloGroup.rotation.z = 0;
          this.hero.haloGroup.position.y = 1.34;
          updateSolarLeoHaloPose(this.solarLeoHaloRig, this.elapsed, dt, {
            mode: 'lobby',
            ultBurst: emotePose.active ? emotePose.glowBoost * 0.7 : 0,
            celebrating: emotePose.active || this.lobbyEmoteTimer > 0.05,
          });
        } else {
          this.hero.haloGroup.rotation.z += dt * 0.95;
          this.hero.haloGroup.position.y = 1.34 + Math.sin(this.elapsed * 2.2) * 0.04;
        }
      }
      if (this.solarLeoWingRig && this.solarLeoWingRig.group.parent === this.hero.wingGroup) {
        updateSolarLeoWingsPose(
          this.solarLeoWingRig,
          this.elapsed,
          dt,
          0,
          false,
          emotePose.active ? 0.65 : 0,
          {
            mode: 'lobby',
            celebrating: emotePose.active || this.lobbyEmoteTimer > 0.05,
          }
        );
      }
      if (this.hero.soulRingNodes) {
        for (const node of this.hero.soulRingNodes) {
          const sp = (node.userData?.speed as number) ?? 0.9;
          node.rotation.z += dt * sp;
        }
      }
      if (this.hero.astralSteedWings) {
        const sFlap = Math.sin(this.elapsed * 3.8) * 0.28;
        this.hero.astralSteedWings.forEach((wp, idx) => {
          wp.rotation.z = idx === 0 ? sFlap : -sFlap;
        });
      }
      const hasRealisticArtemis = this.artemisModel?.parent === this.hero.bodyGroup;
      const hasSolarLeoHero = this.solarLeoHeroRig?.group.parent === this.hero.bodyGroup;
      this.hero.magicOrb.visible = !showWeaponInLobby && !hasRealisticArtemis && !hasSolarLeoHero;
      if (this.hero.magicOrb.userData?.uprightLantern) {
        this.hero.magicOrb.rotation.y += dt * 1.45;
      } else {
        this.hero.magicOrb.rotation.z += dt * 2.8;
      }
      this.hero.bowGroup.visible = showWeaponInLobby && !hasSolarLeoHero;
      const lobbyCelebrating = emotePose.active || this.lobbyEmoteTimer > 0.05;
      if (hasRealisticArtemis) {
        const lobbyAimingBow = this.lobbyHeroPose === 'aim_ready';
        this.hero.nockedArrow.visible = showWeaponInLobby && lobbyAimingBow;
        this.artemisMotion?.update(
          dt,
          this.elapsed,
          0,
          lobbyAimingBow,
          lobbyAimingBow ? 0.55 : 0,
          this.hero.bowGroup,
          onDragon || (this.artemisLoadedAsset === 'heroes/van-tich.glb' && Boolean(this.hero.mountGroup)),
          false,
          0,
          'lobby',
          lobbyCelebrating
        );
      } else if (hasSolarLeoHero && this.solarLeoHeroRig) {
        updateSolarLeoHumanoidPose(this.solarLeoHeroRig, {
          elapsed: this.elapsed,
          dt,
          speed: 0,
          shooting: this.lobbyHeroPose === 'aim_ready',
          shootRecoil: this.lobbyHeroPose === 'aim_ready' && emotePose.active ? emotePose.drawProgress : 0,
          dashing: false,
          riding: onDragon || Boolean(this.hero.mountGroup),
          ultBurst: lobbyCelebrating ? emotePose.glowBoost * 0.45 : 0,
          mode: 'lobby',
          celebrating: lobbyCelebrating,
          lobbyPose: this.lobbyHeroPose,
        });
      }
      if (onDragon) this.alignMountedRider();
      if (this.lobbyHaloGroup) {
        this.lobbyHaloGroup.visible = true;
        this.lobbyHaloGroup.rotation.y += dt * 0.55;
      }
      this.arenaGroup.visible = false;
      if (this.lobbySanctuary) {
        this.lobbySanctuary.group.visible = true;
        this.lobbySanctuary.outerArchRing.rotation.z += dt * 0.14;
        this.lobbySanctuary.innerArchRing.rotation.z -= dt * 0.26;
        this.lobbySanctuary.archVeil.rotation.z += dt * 0.085;
        for (let i = 0; i < this.lobbySanctuary.floatingCrystals.length; i++) {
          const fc = this.lobbySanctuary.floatingCrystals[i];
          const baseY = (fc.userData.baseY as number | undefined) ?? 2.2;
          fc.position.y = baseY + Math.sin(this.elapsed * 1.9 + i * 1.35) * 0.14;
          fc.rotation.y += dt * 0.75;
        }
        const seeds = this.lobbySanctuaryDustSeeds;
        for (let i = 0; i < seeds.length; i++) {
          const s = seeds[i];
          const yCycle = ((s.y + this.elapsed * s.speed) % 6.2) + 0.35;
          const driftX = s.x + Math.sin(this.elapsed * 0.65 + s.phase) * 0.35;
          const driftZ = s.z + Math.cos(this.elapsed * 0.52 + s.phase) * 0.28;
          const pulse = s.scale * (0.72 + Math.sin(this.elapsed * 2.4 + s.phase) * 0.28);
          _dummy.position.set(driftX, yCycle, driftZ);
          _dummy.rotation.set(this.elapsed * 0.8 + s.phase, this.elapsed * 1.1, 0);
          _dummy.scale.setScalar(pulse);
          _dummy.updateMatrix();
          this.lobbySanctuary.dustMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.lobbySanctuary.dustMesh.instanceMatrix.needsUpdate = true;
      }
      if (this.combatAuraGroup) {
        this.combatAuraGroup.visible = false;
      }
      if (this.petModel) {
        this.petModel.visible = true;
        const hasSolarPet = this.solarLeoPetRig?.group.parent === this.petModel;
        if (hasSolarPet && this.solarLeoPetRig) {
          // Anchor cleanly beside hero; visualRoot drives playful figure-8 swoops, hops, spins & wingbeats
          this.petModel.position.set(-1.32, 1.32, 5.02);
          this.petModel.rotation.y = Math.sin(this.elapsed * 1.1) * 0.08;
          updateSolarLeoPetPose(this.solarLeoPetRig, this.elapsed, dt, 0, {
            mode: 'lobby',
            celebrating: this.lobbyEmoteTimer > 0.05,
          });
        } else {
          const petBob = Math.sin(this.elapsed * 3.0) * 0.11;
          this.petModel.position.set(-1.14, 1.08 + petBob, 4.78);
          this.petModel.rotation.y = Math.sin(this.elapsed * 1.4) * 0.08;
        }
      }
      // Wave 11 & Wave 13: Smooth Lobby 3D Sky & Weather Theme Damping (zero allocations)
      const skyTheme = LOBBY_SKY_THEME_MAP[this.lobbySkyThemeId] ?? LOBBY_SKY_THEME_MAP.golden_galaxy;
      const weatherDef = LOBBY_WEATHER_DEFS.find((w) => w.id === this.lobbyWeatherId);
      const dampAlpha = 1 - Math.exp(-3.5 * dt);
      if (this.scene.background instanceof THREE.Color) {
        _skyCol.setHex(skyTheme.skyHex);
        this.scene.background.lerp(_skyCol, dampAlpha);
      }
      if (this.scene.fog instanceof THREE.FogExp2) {
        _fogCol.setHex(skyTheme.fogHex);
        this.scene.fog.color.lerp(_fogCol, dampAlpha);
      }
      _keyCol.setHex(skyTheme.keyLightHex);
      this.keyLight.color.lerp(_keyCol, dampAlpha);
      _hemiSkyCol.setHex(skyTheme.hemiSkyHex);
      this.hemiLight.color.lerp(_hemiSkyCol, dampAlpha);
      _hemiGndCol.setHex(skyTheme.hemiGroundHex);
      this.hemiLight.groundColor.lerp(_hemiGndCol, dampAlpha);
      const starMat = this.starfallMesh?.material as THREE.MeshBasicMaterial | undefined;
      if (starMat?.color) {
        const targetParticleHex =
          this.lobbyWeatherId !== 'clear' && weatherDef
            ? weatherDef.particleHex
            : skyTheme.starfallHex;
        _starCol.setHex(targetParticleHex);
        starMat.color.lerp(_starCol, dampAlpha);
      }

      this.portal.vortex.rotation.z += dt * 0.9;
      this.updateStarfallWeather(dt);
      this.updateParticles(dt);
      this.updateShockwaves(dt);
      this.updateUltColumns(dt);
      this.updateLightning(dt);
      return;
    }

    if (this.lobbyHaloGroup) {
      this.lobbyHaloGroup.visible = false;
    }
    if (this.lobbySanctuary && this.lobbySanctuary.group.visible) {
      this.lobbySanctuary.group.visible = false;
      this.rimLight.color.setHex(0x93c5fd);
      this.rimLight.intensity = 0.65;
      this.rimLight.position.set(-12, 10, -14);
      this.heroLight.color.setHex(0x38bdf8);
      this.heroLight.intensity = 1.2;
    }
    if (!this.arenaGroup.visible) {
      this.arenaGroup.visible = true;
    }
    if (this.combatAuraGroup) {
      this.combatAuraGroup.visible = this.phase === GamePhase.PLAYING;
      this.combatAuraGroup.position.set(this.px, 0.04, this.pz);
      this.combatAuraGroup.rotation.y += dt * 1.35;
    }

    // Pillar 1: Dynamic Combat Lighting Mood Director (Normal -> Boss Enrage -> Victory Golden Hour)
    const activeBossForMood = this.enemies.find((e) => e.isBoss && e.hp > 0);
    const desiredLightingMood: CombatLightingMood =
      this.phase === GamePhase.VICTORY
        ? 'victory_golden'
        : activeBossForMood && (activeBossForMood.bossPhase ?? 1) >= 2
        ? 'boss_enrage'
        : 'normal';
    this.combatLightingState = stepCombatLightingMood(
      this.combatLightingState,
      desiredLightingMood,
      dt
    );
    if (this.rimLight && this.arenaGroup.visible) {
      this.rimLight.intensity = 0.72 * this.combatLightingState.rimIntensity;
      if (this.combatLightingState.enrageBlend > 0.05) {
        this.rimLight.color.setHex(0xfb7185);
      } else if (this.combatLightingState.victoryBlend > 0.05) {
        this.rimLight.color.setHex(0xfde047);
      } else {
        this.rimLight.color.setHex(this.arenaThemeSpec?.rimLightHex ?? 0x93c5fd);
      }
    }
    if (this.hemiLight && this.arenaGroup.visible) {
      this.hemiLight.intensity = 0.88 * this.combatLightingState.hemiIntensity;
    }

    // Pillar 1: System-Wide Progressive Adaptive FPS Governor + Resolution Guard (works for 24/30/45/60 FPS)
    this.elementalImpactVfxCd = Math.max(0, this.elementalImpactVfxCd - dt);
    const activeBudget = this.getActiveSystemBudget();
    const activeTargetFps = activeBudget.targetCombatFps;
    const govStep = sampleAdaptiveFpsFrame(
      this.adaptiveFpsGovernor,
      this.lastRawFrameDt,
      activeTargetFps
    );
    if (this.adaptiveResolutionGuard && !this.isSoftwareGl) {
      if (govStep.tierChanged) {
        const baseParticleDensity =
          (this.graphicsQuality === 'low' ? 0.45 : this.graphicsQuality === 'medium' ? 0.75 : 1.0) *
          activeBudget.particleBudgetMult;
        this.particleDensityScale = Math.max(0.2, baseParticleDensity * govStep.modifiers.particleScale);
        const nextDpr = this.getTargetPixelRatio();
        this.renderer.setPixelRatio(nextDpr);
        if (this.composer) {
          this.composer.setPixelRatio(nextDpr);
        }
        // Progressive secondary VFX shedding on severe GPU load (and smooth restoration on recovery)
        const inGuard = this.adaptiveFpsGovernor.tier === 'performance_guard';
        const inBalanced = this.adaptiveFpsGovernor.tier === 'balanced';
        if (this.bloomPass) {
          this.bloomPass.enabled = !inGuard && this.bloomEnabled && activeBudget.bloomAllowed;
        }
        if (this.starfallMesh) {
          this.starfallMesh.visible = !inGuard && !inBalanced && this.starfallEnabled;
        }
        if (this.arenaDustMesh) {
          this.arenaDustMesh.visible = !inGuard;
        }
        if (this.chapterWeatherPoints) {
          this.chapterWeatherPoints.visible = !inGuard;
        }
        if (this.chapter2ForgeAtmosphere) {
          if (this.chapter2ForgeAtmosphere.emberMesh) {
            this.chapter2ForgeAtmosphere.emberMesh.visible = !inGuard;
          }
          if (this.chapter2ForgeAtmosphere.ashMesh) {
            this.chapter2ForgeAtmosphere.ashMesh.visible = !inGuard;
          }
        }
        if (this.chapter3SanctuaryAtmosphere) {
          if (this.chapter3SanctuaryAtmosphere.moteMesh) {
            this.chapter3SanctuaryAtmosphere.moteMesh.visible = !inGuard;
          }
          if (this.chapter3SanctuaryAtmosphere.pollenMesh) {
            this.chapter3SanctuaryAtmosphere.pollenMesh.visible = !inGuard;
          }
        }
        if (activeBudget.shadowMapSize > 0 && this.graphicsQuality !== 'low') {
          const allowShadows = !inGuard;
          this.renderer.shadowMap.enabled = allowShadows;
          this.keyLight.castShadow = allowShadows;
        }
      }
      this.adaptiveResCheckTimer += dt;
      if (this.adaptiveResCheckTimer >= 1.2) {
        this.adaptiveResCheckTimer = 0;
        const fpsRead = readFpsMetrics(this.fpsSampler);
        if (fpsRead.frameTimeMs > 0) {
          const nextScale = evaluateAdaptiveResolutionScale(
            fpsRead.frameTimeMs,
            this.adaptiveResScale,
            this.adaptiveResolutionGuard,
            activeTargetFps,
            activeBudget.minAdaptiveDprScale
          );
          if (Math.abs(nextScale - this.adaptiveResScale) >= 0.04) {
            this.adaptiveResScale = nextScale;
            const nextDpr = this.getTargetPixelRatio();
            this.renderer.setPixelRatio(nextDpr);
            if (this.composer) {
              this.composer.setPixelRatio(nextDpr);
            }
          }
        }
      }
    }
    if (this.arenaDustMesh && this.arenaDustSeeds.length > 0 && this.arenaGroup.visible) {
      for (let i = 0; i < this.arenaDustSeeds.length; i++) {
        const s = this.arenaDustSeeds[i];
        const yCycle = ((s.y + this.elapsed * s.speed) % 4.8) + 0.25;
        const dx = s.x + Math.sin(this.elapsed * 0.7 + s.phase) * 0.4;
        const dz = s.z + Math.cos(this.elapsed * 0.55 + s.phase) * 0.35;
        const pulse = s.scale * (0.7 + Math.sin(this.elapsed * 2.5 + s.phase) * 0.3);
        _dummy.position.set(dx, yCycle, dz);
        _dummy.rotation.set(this.elapsed * 0.9 + s.phase, this.elapsed * 1.2, 0);
        _dummy.scale.setScalar(pulse);
        _dummy.updateMatrix();
        this.arenaDustMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.arenaDustMesh.instanceMatrix.needsUpdate = true;
    }
    if (this.chapter2ForgeAtmosphere && this.arenaGroup.visible) {
      updateChapter2WarForgeAtmosphere(this.chapter2ForgeAtmosphere, this.elapsed);
    }
    if (this.chapter3SanctuaryAtmosphere && this.arenaGroup.visible) {
      updateChapter3EmeraldSanctuaryAtmosphere(this.chapter3SanctuaryAtmosphere, this.elapsed);
    }

    this.hero.bowGroup.visible = true;
    this.hero.magicOrb.visible = false;

    // AAA Wave 4: Poll HTML5 Gamepad across PLAYING and PAUSED phases
    if (
      (this.phase === GamePhase.PLAYING || this.phase === GamePhase.PAUSED) &&
      typeof navigator !== 'undefined' &&
      typeof navigator.getGamepads === 'function'
    ) {
      const pads = navigator.getGamepads();
      let activePad: Gamepad | null = null;
      for (let gi = 0; gi < pads.length; gi++) {
        const gp = pads[gi];
        if (gp && gp.connected) {
          activePad = gp;
          break;
        }
      }
      if (activePad) {
        const gpSample = sampleGamepadInput(
          activePad.axes,
          activePad.buttons,
          this.gamepadPrevButtons
        );
        this.gamepadPrevButtons = gpSample.nextPrev;
        this.gamepadConnected = true;
        this.gamepadMoveX = gpSample.moveX;
        this.gamepadMoveZ = gpSample.moveZ;
        if (gpSample.pausePressed) {
          this.callbacks.onGamepadPause?.();
        } else if (this.phase === GamePhase.PLAYING) {
          if (gpSample.dashPressed) this.triggerDash();
          if (gpSample.activeSkillPressed) this.triggerHeroActiveSkill();
          if (gpSample.ultimatePressed) this.triggerHeroUltimate();
        }
      } else {
        this.gamepadConnected = false;
        this.gamepadMoveX = 0;
        this.gamepadMoveZ = 0;
      }
    } else {
      this.gamepadMoveX = 0;
      this.gamepadMoveZ = 0;
    }

    if (this.phase !== GamePhase.PLAYING) {
      if (this.phase === GamePhase.VICTORY) {
        this.victoryOrbitClock += dt;
        const prefersReducedMotion =
          typeof window !== 'undefined' &&
          Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        const vPose = computeVictoryOrbitCamera(
          this.px,
          this.pz,
          this.victoryOrbitClock,
          prefersReducedMotion
        );
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, vPose.camX, 3.6, dt);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, vPose.camY, 3.6, dt);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, vPose.camZ, 3.6, dt);
        this.camera.lookAt(vPose.lookX, vPose.lookY, vPose.lookZ);

        // Heroic victory salute & companion celebration while orbiting
        this.hero.drawArm.rotation.x = THREE.MathUtils.damp(this.hero.drawArm.rotation.x, -1.05, 5.5, dt);
        this.hero.capeTail.rotation.x = 0.24 + Math.sin(this.elapsed * 3.4) * 0.08;
        this.heroLight.intensity = 1.9 + Math.sin(this.elapsed * 4.2) * 0.22;
        if (this.hero.leftWingPivot && this.hero.rightWingPivot) {
          const flap = Math.sin(this.elapsed * 3.4) * 0.26;
          this.hero.leftWingPivot.rotation.y = 0.24 + flap;
          this.hero.rightWingPivot.rotation.y = -0.24 - flap;
        }
        this.applyPhotoStudioLighting(dt);
        this.updateCompanions(dt);
        this.updateParticles(dt);
        this.updateShockwaves(dt);
        this.updateWave5Effects(dt);
        this.updateStarfallWeather(dt);
        for (let si = 0; si < this.arenaLightShafts.length; si++) {
          const shaft = this.arenaLightShafts[si];
          const smat = shaft.material as THREE.MeshBasicMaterial;
          const baseOp = (shaft.userData.baseOpacity as number) ?? 0.055;
          smat.opacity = baseOp * (1.1 + Math.sin(this.elapsed * 1.1 + si * 1.9) * 0.2);
        }
      }
      return;
    }

    // Decouple combat simulation from display FPS (12 / 30 / 60 FPS) using fixed 60Hz ticks
    this.simClock ??= createFixedTimestepClock();
    stepFixedTimestep(
      this.simClock,
      frameDt,
      (fixedDt) => {
        if (this.phase !== GamePhase.PLAYING) return;
        this.stepCombatSimulation(fixedDt);
      },
      FIXED_SIM_DT,
      MAX_SIM_SUBSTEPS
    );

    this.updateCamera(visualDt);
    this.hudSyncTimer += visualDt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.syncHudImmediate();
    }
  }

  private stepCombatSimulation(dt: number): void {
    this.elapsed += dt;
    this.runElapsedSeconds += dt;

    const chart = this.stormChart;
    if (this.stormChartVisual) {
      if (chart) {
        const sc = this.stormChartVisual;
        sc.group.visible = true;
        sc.group.position.set(chart.x, 0.075, chart.z);
        const curScale = sc.group.scale.x;
        const nextScale = THREE.MathUtils.damp(curScale, 1.0, 14, dt);
        sc.group.scale.setScalar(nextScale);
        sc.outerRing.rotation.y += dt * 1.45;
        sc.compassStar.rotation.y -= dt * 2.2;
        sc.innerRing.rotation.y += dt * 3.35;
        this.stormChartPulseFlash = Math.max(0, this.stormChartPulseFlash - dt * 2.6);
        sc.outerMat.opacity = 0.72 + this.stormChartPulseFlash * 0.28;
        sc.starMat.opacity = 0.64 + this.stormChartPulseFlash * 0.34;
        sc.innerMat.opacity = 0.75 + this.stormChartPulseFlash * 0.25;
        sc.glowMat.opacity = 0.14 + this.stormChartPulseFlash * 0.22;
      } else if (this.stormChartFadeTimer > 0) {
        this.stormChartFadeTimer = Math.max(0, this.stormChartFadeTimer - dt);
        const sc = this.stormChartVisual;
        const fade = this.stormChartFadeTimer / 0.45;
        sc.outerRing.rotation.y += dt * 2.0;
        sc.compassStar.rotation.y -= dt * 2.8;
        sc.group.scale.setScalar(0.85 + 0.15 * fade);
        sc.outerMat.opacity = 0.75 * fade;
        sc.starMat.opacity = 0.65 * fade;
        sc.innerMat.opacity = 0.75 * fade;
        sc.glowMat.opacity = 0.16 * fade;
        if (this.stormChartFadeTimer <= 0) {
          sc.group.visible = false;
        }
      }
    }
    if (chart && this.elapsed >= chart.nextPulse) {
      const pIdx = chart.pulseIndex ?? 0;
      chart.pulseIndex = pIdx + 1;
      chart.nextPulse += 0.60;
      chart.pulses--;
      this.stormChartPulseFlash = 1.0;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
      soundEngine.playVanTichStormPulse(pIdx, computeSpatialPan(chart.x, ARENA_HALF_W));
      this.spawnShockwave(chart.x, chart.z, 0x5eead4, 4.2, 0.42);
      this.spawnSummonPortal(chart.x, chart.z, 4.2, 0x5eead4, 0.52);
      this.spawnWindRing(chart.x, chart.z, 0x99f6e4, 3.85, 0.22);
      let hitAny = false;
      for (const enemy of [...this.enemies]) {
        if (enemy.dead || enemy.spawnTimer > 0 || (enemy.stormMarkUntil ?? 0) <= this.elapsed ||
            Math.hypot(enemy.x - chart.x, enemy.z - chart.z) > 4.2) continue;
        hitAny = true;
        this.spawnLightningArc(enemy.x, 5.8, enemy.z, enemy.x, 0.5, enemy.z);
        this.spawnLightningArc(chart.x, 0.4, chart.z, enemy.x, 0.7, enemy.z);
        this.spawnParticles(enemy.x, 0.9, enemy.z, 0x5eead4, 10);
        this.damageEnemy(enemy, chart.damage, false, false, false, true, false, 'BẢN ĐỒ GIÔNG!', 'ultimate');
      }
      if (!hitAny) {
        this.spawnLightningArc(chart.x, 6.8, chart.z, chart.x, 0.35, chart.z);
        this.spawnParticles(chart.x, 0.75, chart.z, 0x99f6e4, 14);
      }
      if (chart.pulses === 0) {
        this.stormChart = null;
        this.stormChartFadeTimer = 0.45;
      }
    }

    if (this.isWeeklyRankedBossMode) {
      this.weeklyBossTimeLeft = Math.max(0, this.weeklyBossTimeLeft - dt);
      if (this.bossPaceTracker) {
        const rankedBoss = this.enemies.find((en) => en.isBoss);
        const bossHpRatio = rankedBoss
          ? Math.max(0, rankedBoss.hp / Math.max(1, rankedBoss.maxHp))
          : Math.max(0, 1 - this.weeklyBossTotalDamage / Math.max(1, this.weeklyBossMaxHp));
        this.bossPaceHud = updateBossPaceTracker(
          this.bossPaceTracker,
          bossHpRatio,
          Math.round(this.simClock.totalSimTime * 1000)
        );
      }
      if (this.weeklyBossTimeLeft <= 0) {
        const totalDmg = Math.min(this.weeklyBossMaxHp, Math.round(this.weeklyBossTotalDamage));
        soundEngine.playPlayerHurt();
        this.phase = GamePhase.GAME_OVER;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(false, {
          chapterId: this.currentChapter.id,
          stageReached: 1,
          kills: this.kills,
          gold: 0,
          gems: 0,
          isWeeklyRankedBossMode: true,
          weeklyBossIsPractice: this.isWeeklyBossPracticeMode,
          weeklyBossIsWeekendBlitz: this.weeklyBossIsWeekendBlitz,
          weeklyBossAttemptId: this.weeklyBossAttemptId ?? undefined,
          weeklyBossSeed: this.weeklyBossSeed ?? undefined,
          weeklyBossDamage: totalDmg,
          weeklyBossCleared: false,
          weeklyBossSimTicks: this.simClock.totalTicks,
          weeklyBossClearTimeMs: Math.round(this.simClock.totalSimTime * 1000),
          weeklyBossRemainingHpPct: Math.max(0, this.hp / Math.max(1, this.maxHp)),
          weeklyBossSplitsMs: this.bossPaceTracker ? [...this.bossPaceTracker.currentSplitsMs] : undefined,
          weeklyBossCounterHits: this.perfectDodgeCounter.totalCountersLanded,
          weeklyBossGuardBreaks: this.runBossBreaksCount,
          peakStyleGrade: this.styleMomentum.peakGrade,
          autoPilotUsed: this.autoPilotUsedInRun,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    // Wave 6 + Wave 7: Deterministic Perfect Dodge Counter-Window, Style Momentum, Boss Stagger & Co-op Ping Decay
    stepPerfectDodgeCounter(this.perfectDodgeCounter, dt);
    stepStyleMomentum(this.styleMomentum, dt);
    if (this.coopPingToastTimer > 0) {
      this.coopPingToastTimer = Math.max(0, this.coopPingToastTimer - dt);
      if (this.coopPingToastTimer <= 0) {
        this.coopPingToast = null;
      }
    }
    if (this.bossStaggerState) {
      const staggerTick = stepBossStaggerState(this.bossStaggerState, dt);
      if (staggerTick.recovered) {
        const activeBoss = this.enemies.find((en) => en.id === this.bossStaggerOwnerId);
        if (activeBoss) {
          activeBoss.maxBreakShield = this.bossStaggerState.max;
          activeBoss.breakShield = this.bossStaggerState.max;
        }
      }
    }
    if (this.isCoopRaidMode && this.coopRoleSynergy && this.coopRoleSynergy.periodicHealPct > 0) {
      this.coopGuardianHealTicks += 1;
      if (this.coopGuardianHealTicks >= 480) {
        this.coopGuardianHealTicks = 0;
        if (this.hp > 0 && this.hp < this.maxHp) {
          const healAmt = Math.max(4, Math.round(this.maxHp * this.coopRoleSynergy.periodicHealPct));
          this.hp = Math.min(this.maxHp, this.hp + healAmt);
          this.spawnParticles(this.px, 1.0, this.pz, 0x34d399, 8);
          this.emitFloatingNumber(this.px, 2.05, this.pz, healAmt, false, true);
        }
      }
    }

    if (this.isArenaMode) {
      this.arenaTimeLeft = Math.max(0, this.arenaTimeLeft - dt);
      if (this.arenaTimeLeft <= 0) {
        const rival = this.enemies.find((en) => en.isArenaRival);
        const rivalPct = rival ? rival.hp / Math.max(1, rival.maxHp) : 0;
        const playerPct = this.hp / Math.max(1, this.maxHp);
        const victory = playerPct >= rivalPct;
        const bonusPct = this.aiRivalMatchConfig?.rewardBonusPct ?? 0;
        const bonusMult = 1 + bonusPct / 100;
        const defeatReport = !victory
          ? buildLethalDefeatReport({
              rivalName: this.arenaOpponentName || 'Đối Thủ AI',
              rivalRemainingHpPct: Math.round(rivalPct * 100),
              tier: this.aiDuelTier,
              lastPattern: this.aiRivalActivePattern,
              suddenDeathActive: true,
              perfectDodges: this.perfectDodgeCount,
              durationSec: this.runElapsedSeconds,
            })
          : null;
        if (victory) soundEngine.playVictory();
        else soundEngine.playPlayerHurt();
        this.phase = victory ? GamePhase.VICTORY : GamePhase.GAME_OVER;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(victory, {
          chapterId: this.currentChapter.id,
          stageReached: 1,
          kills: victory ? 1 : 0,
          gold: victory
            ? Math.round((this.runGold + 160) * bonusMult)
            : this.runGold + (defeatReport?.consolationGold ?? 60),
          gems: this.runGems + (victory ? Math.round(12 * bonusMult) : 2),
          starDust:
            (victory ? Math.round(10 * bonusMult) : defeatReport?.consolationStarDust ?? 3) +
            this.runBossPartStarDust,
          isArenaMode: true,
          arenaOpponentName: this.arenaOpponentName,
          liveAiDuelId: this.liveAiDuelId ?? undefined,
          liveAiPlayerId: this.liveAiPlayerId ?? undefined,
          liveAiDurationSec: Math.max(1, Math.round(this.runElapsedSeconds)),
          aiDuelTier: this.aiDuelTier,
          aiRewardBonusPct: bonusPct,
          arenaRivalRemainingHpPct: Math.round(rivalPct * 100),
          consolationStarDust: defeatReport?.consolationStarDust,
          coachingNote: defeatReport?.coachingNote,
          defeatCause: defeatReport?.cause,
          trialGauntletRound: this.trialGauntletRound ?? undefined,
          trialGauntletKitId: this.trialGauntletKitId ?? undefined,
          combatTelemetry: this.getCombatTelemetrySnapshot(),
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isGuildBossMode && !this.isBossEntranceLocked()) {
      this.guildBossTimeLeft = Math.max(0, this.guildBossTimeLeft - dt);
      if (this.guildBossTimeLeft <= 0) {
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: 1,
          kills: this.kills,
          gold: this.runGold + 180,
          gems: this.runGems + 8,
          isGuildBossMode: true,
          guildBossDamage: Math.round(this.guildBossTotalDamage),
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isWorldBossMode && !this.isBossEntranceLocked()) {
      this.worldBossTimeLeft = Math.max(0, this.worldBossTimeLeft - dt);
      if (this.worldBossTimeLeft <= 0) {
        const totalDmg = Math.round(this.worldBossTotalDamage);
        const liveRank = computeWorldBossLiveRank(totalDmg);
        const feathers = Math.max(6, Math.min(28, 6 + Math.floor(totalDmg / 28000) * 2));
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: 1,
          kills: this.kills,
          gold: this.runGold + 240 + Math.floor(totalDmg / 2500),
          gems: this.runGems + 14 + Math.max(0, 10 - liveRank) * 2,
          wingFeathers: feathers,
          isWorldBossMode: true,
          worldBossDamage: totalDmg,
          worldBossLiveRank: liveRank,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isBloodMoonMode) {
      this.bloodMoonTimeLeft = Math.max(0, this.bloodMoonTimeLeft - dt);
      this.bloodMoonSpawnTimer -= dt;
      if (this.bloodMoonTimeLeft > 2 && (this.bloodMoonSpawnTimer <= 0 || this.enemies.length === 0)) {
        this.spawnNextBloodMoonWave();
      }
      if (this.bloodMoonTimeLeft <= 0) {
        const finalScore = Math.max(0, Math.round(this.bloodMoonScore + this.bloodMoonWave * 65));
        const shards = Math.max(5, Math.min(26, 4 + Math.floor(finalScore / 140)));
        const crystals = Math.max(3, Math.min(18, 2 + Math.floor(finalScore / 200)));
        const feathers = Math.max(4, Math.min(18, 3 + Math.floor(finalScore / 220)));
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: this.bloodMoonWave,
          kills: this.kills,
          gold: this.runGold + 220 + Math.floor(finalScore * 0.45),
          gems: this.runGems + 14 + Math.min(30, Math.floor(finalScore / 150) * 2),
          mountShards: shards,
          awakeningCrystals: crystals,
          wingFeathers: feathers,
          isBloodMoonMode: true,
          bloodMoonScore: finalScore,
          bloodMoonWave: this.bloodMoonWave,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isCrystalDefenseMode && this.crystalRefs) {
      this.crystalRefs.coreMesh.rotation.y += dt * 1.15;
      this.crystalRefs.coreMesh.position.y = 1.65 + Math.sin(this.elapsed * 2.6) * 0.12;
      this.crystalRefs.outerRing.rotation.x += dt * 0.9;
      this.crystalRefs.outerRing.rotation.z += dt * 0.7;
      this.crystalRefs.shards.forEach((sh, sIdx) => {
        const ang = this.elapsed * 2.1 + (sIdx * Math.PI) / 2;
        sh.position.set(
          Math.cos(ang) * 1.18,
          1.55 + Math.sin(this.elapsed * 3.4 + sIdx) * 0.16,
          Math.sin(ang) * 1.18
        );
        sh.rotation.y = -ang;
      });
    }

    if (this.isGuildWarMode) {
      this.guildWarTimeLeft = Math.max(0, this.guildWarTimeLeft - dt);
      this.guildWarSpawnTimer -= dt;
      if (this.guildWarTimeLeft > 3 && (this.guildWarSpawnTimer <= 0 || this.enemies.length === 0)) {
        const waveNum = Math.max(1, Math.ceil((GUILD_WAR_DURATION_SEC - this.guildWarTimeLeft) / 14) + 1);
        this.spawnGuildWarWave(waveNum);
      }

      for (const node of this.guildWarNodes) {
        node.core.rotation.y += dt * (node.captured ? 2.4 : 1.1);
        node.core.position.y = 1.25 + Math.sin(this.elapsed * 2.5 + node.x) * 0.1;
        const dist = Math.hypot(this.px - node.x, this.pz - node.z);
        if (node.captured) {
          this.guildWarScore += dt * 14;
        } else if (dist <= 2.4) {
          node.progress = Math.min(100, node.progress + dt * 48);
          if (node.progress >= 100) {
            node.captured = true;
            this.guildWarNodesCaptured += 1;
            this.guildWarScore += 320;
            const cMat = node.core.material as THREE.MeshStandardMaterial;
            cMat.color.setHex(0x10b981);
            cMat.emissive.setHex(0x059669);
            const rMat = node.ring.material as THREE.MeshBasicMaterial;
            rMat.color.setHex(0x34d399);
            this.spawnShockwave(node.x, node.z, 0x34d399, 4.2, 0.45);
            this.spawnParticles(node.x, 1.3, node.z, 0x34d399, 24);
            this.emitFloatingNumber(node.x, 2.2, node.z, 320, true, false, undefined, 'CHIẾM TRỤ +320!');
            soundEngine.playPickup(true);
          }
        }
      }

      if (this.guildWarTimeLeft <= 0) {
        const finalScore = Math.max(120, Math.round(this.guildWarScore));
        const guildCoins = 120 + this.guildWarNodesCaptured * 45 + Math.floor(finalScore / 20);
        const artifactShards = Math.max(4, Math.min(18, 4 + Math.floor(finalScore / 260)));
        const mysticTokens = Math.max(6, Math.min(26, 6 + Math.floor(finalScore / 180)));
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: this.guildWarNodesCaptured,
          kills: this.kills,
          gold: this.runGold + 240 + Math.floor(finalScore * 0.25),
          gems: this.runGems + 18 + this.guildWarNodesCaptured * 5,
          starDust: this.runBossPartStarDust > 0 ? this.runBossPartStarDust : undefined,
          isGuildWarMode: true,
          guildWarScore: finalScore,
          guildWarNodes: this.guildWarNodesCaptured,
          guildCoins,
          artifactShards,
          mysticTokens,
          guildWarBastionId: this.guildWarBastionId ?? undefined,
          combatTelemetry: this.getCombatTelemetrySnapshot(),
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    // Wave 12 & 13: Combat Banner, Mythic Crown, Soul Rings & Astral Steed Animation
    if (this.hero.mythicCrownGroup) {
      this.hero.mythicCrownGroup.rotation.z += dt * 2.6;
    }
    if (this.hero.warBannerCloth) {
      this.hero.warBannerCloth.rotation.x = 0.14 + Math.sin(this.elapsed * 4.5) * 0.14;
    }
    if (this.hero.soulRingNodes) {
      for (const node of this.hero.soulRingNodes) {
        const sp = (node.userData?.speed as number) ?? 1.05;
        node.rotation.z += dt * sp * 1.25;
      }
    }
    if (this.hero.astralSteedWings) {
      const sFlap = Math.sin(this.elapsed * 5.2) * 0.3;
      this.hero.astralSteedWings.forEach((wp, idx) => {
        wp.rotation.z = idx === 0 ? sFlap : -sFlap;
      });
    }
    if (this.hero.celestialWingLeft && this.hero.celestialWingRight) {
      const speedMul = this.isSkyCitadelMode ? 6.2 : 4.4;
      const cFlap = Math.sin(this.elapsed * speedMul) * 0.34;
      this.hero.celestialWingLeft.rotation.y = 0.32 + cFlap;
      this.hero.celestialWingRight.rotation.y = -0.32 - cFlap;
    }
    if (this.bossBrokenBannerTimer > 0) {
      this.bossBrokenBannerTimer = Math.max(0, this.bossBrokenBannerTimer - dt);
    }
    if (this.bossPhaseTwoBannerTimer > 0) {
      this.bossPhaseTwoBannerTimer = Math.max(0, this.bossPhaseTwoBannerTimer - dt);
    }
    if (this.bossPhaseThreeBannerTimer > 0) {
      this.bossPhaseThreeBannerTimer = Math.max(0, this.bossPhaseThreeBannerTimer - dt);
    }
    if (this.playerFrostSlowTimer > 0) {
      this.playerFrostSlowTimer = Math.max(0, this.playerFrostSlowTimer - dt);
    }
    this.updateArenaHazards(dt);
    // Phase 3: Update Elite Volatile death ground blasts
    for (let vi = this.volatileBlasts.length - 1; vi >= 0; vi--) {
      const vb = this.volatileBlasts[vi];
      vb.timer -= dt;
      const progress = Math.max(0, Math.min(1, 1 - vb.timer / vb.maxTimer));
      vb.fill.scale.setScalar(Math.max(0.08, progress * vb.radius));
      const ringMat = vb.ring.material as THREE.MeshBasicMaterial;
      if (vb.timer <= 0.12) {
        ringMat.color.setHex(0xffffff);
        ringMat.opacity = 0.95;
      } else {
        ringMat.color.setHex(0xf97316);
        ringMat.opacity = 0.65 + progress * 0.25;
      }
      if (vb.timer <= 0) {
        this.spawnShockwave(vb.x, vb.z, 0xf97316, vb.radius * 1.15, 0.3);
        this.spawnImpactDecal(vb.x, vb.z, 0xf97316, vb.radius * 0.92, 1.55);
        this.spawnParticles(vb.x, 0.7, vb.z, 0xf97316, 22);
        if (vb.damagesEnemies) {
          for (const en of [...this.enemies]) {
            if (!en || en.dead || en.spawnTimer > 0 || en.isBossTotem) continue;
            if (Math.hypot(en.x - vb.x, en.z - vb.z) <= vb.radius + en.radius + 0.35) {
              this.damageEnemy(
                en,
                Math.round(vb.damage * 2.2),
                true,
                true,
                false,
                false,
                false,
                'KÍCH NỔ!',
                'elemental',
                undefined,
                { bypassShield: true, fromChain: true }
              );
            }
          }
        }
        if (Math.hypot(this.px - vb.x, this.pz - vb.z) <= vb.radius + 0.35) {
          this.damagePlayer(
            vb.damage,
            {
              code: 'boss_slam',
              label: 'Vụ Nổ Tinh Anh Hỏa Bộc',
              killerName: 'Tinh Anh Hỏa Bộc',
              tip: 'Tránh vòng nổ Hỏa Bộc trên sàn sau khi hạ Quái Tinh Anh.',
            },
            vb.x,
            vb.z
          );
        }
        this.releaseObject(vb.ring);
        this.releaseObject(vb.fill);
        this.volatileBlasts.splice(vi, 1);
      }
    }
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer = Math.max(0, this.bossWarningTimer - dt);
      if (this.bossWarningTimer <= 0) {
        this.bossWarningTitle = null;
        this.bossWarningSubtitle = null;
      }
    }

    // Wave 14: Sky Citadel Aerial Arena 3D Timer & Victory Resolution
    if (this.isSkyCitadelMode && !this.isBossEntranceLocked()) {
      this.skyCitadelTimeLeft = Math.max(0, this.skyCitadelTimeLeft - dt);
      if (this.skyCitadelTimeLeft <= 0) {
        const totalFeathers = Math.max(6, this.skyCitadelFeathersLooted + Math.floor(this.skyCitadelScore / 450));
        const totalShards = Math.max(3, Math.floor(this.skyCitadelScore / 800));
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: this.skyCitadelWave,
          kills: this.kills,
          gold: this.runGold + 460 + Math.floor(this.skyCitadelScore * 0.25),
          gems: this.runGems + 24 + totalShards * 2,
          isSkyCitadelMode: true,
          skyCitadelScore: Math.round(this.skyCitadelScore),
          skyCitadelWave: this.skyCitadelWave,
          celestialFeathers: totalFeathers,
          mythicShards: totalShards,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    // Wave 13: Ancient Dragon Lair 3D Multi-Phase & Telegraphed Dragon Breath Cone
    if (this.isDragonLairMode && !this.isBossEntranceLocked()) {
      this.dragonTimeLeft = Math.max(0, this.dragonTimeLeft - dt);
      const dragonBoss = this.enemies.find((en) => en.isBoss);
      if (dragonBoss) {
        const hpRatio = dragonBoss.hp / Math.max(1, dragonBoss.maxHp);
        const nextPhase: 1 | 2 | 3 = hpRatio <= 0.3 ? 3 : hpRatio <= 0.65 ? 2 : 1;
        if (nextPhase > this.dragonPhase) {
          this.dragonPhase = nextPhase;
          const phaseScaleBonus = nextPhase === 2 ? 4 : 6;
          this.dragonScalesLooted += phaseScaleBonus;
          this.stageBannerText =
            nextPhase === 2
              ? `CỔ LONG PHA II · HƠI THỞ DUNG NHAM (+${phaseScaleBonus} Vảy Rồng!)`
              : `CỔ LONG PHA III · NỘ LONG THIÊN THẠCH (+${phaseScaleBonus} Vảy Rồng!)`;
          this.stageBannerTimer = 2.6;
          soundEngine.playBossPhaseRoar();
          this.spawnShockwave(dragonBoss.x, dragonBoss.z, 0xf97316, 7.6, 0.55);
          this.emitFloatingNumber(
            dragonBoss.x,
            3.1,
            dragonBoss.z,
            phaseScaleBonus,
            true,
            false,
            'fire',
            `+${phaseScaleBonus} VẢY RỒNG`,
            true
          );
        }

        // Telegraphed Dragon Breath Cone attack
        if (this.dragonBreathWarningTimer > 0) {
          this.dragonBreathWarningTimer -= dt;
          if (this.dragonBreathCone) {
            this.dragonBreathCone.visible = true;
            this.dragonBreathCone.position.set(dragonBoss.x, 0.06, dragonBoss.z);
            this.dragonBreathCone.rotation.z = -this.dragonBreathAngle + Math.PI / 2;
            const cMat = this.dragonBreathCone.material as THREE.MeshBasicMaterial;
            cMat.opacity = 0.24 + Math.abs(Math.sin(this.elapsed * 14)) * 0.34;
          }
          if (this.dragonBreathWarningTimer <= 0) {
            if (this.dragonBreathCone) this.dragonBreathCone.visible = false;
            // Execute sweeping molten breath check
            const dx = this.px - dragonBoss.x;
            const dz = this.pz - dragonBoss.z;
            const dist = Math.hypot(dx, dz);
            const playerAng = Math.atan2(dz, dx);
            let angDiff = playerAng - this.dragonBreathAngle;
            while (angDiff > Math.PI) angDiff -= Math.PI * 2;
            while (angDiff < -Math.PI) angDiff += Math.PI * 2;
            soundEngine.playShockwave();
            this.spawnShockwave(dragonBoss.x, dragonBoss.z, 0xf43f5e, 9.2, 0.45);
            this.spawnParticles(dragonBoss.x, 1.8, dragonBoss.z, 0xf97316, 28);
            if (dist < 10.2 && Math.abs(angDiff) < 0.48 && this.dashTimer <= 0) {
              const breathDmg = Math.round(dragonBoss.damage * (this.dragonPhase === 3 ? 1.45 : 1.15));
              this.damagePlayer(breathDmg, undefined, dragonBoss.x, dragonBoss.z);
            }
            this.dragonBreathCooldown = this.dragonPhase === 3 ? 4.4 : this.dragonPhase === 2 ? 5.6 : 7.0;
          }
        } else {
          if (this.dragonBreathCone) this.dragonBreathCone.visible = false;
          this.dragonBreathCooldown -= dt;
          if (this.dragonBreathCooldown <= 0 && (dragonBoss.stunTimer ?? 0) <= 0) {
            this.dragonBreathAngle = Math.atan2(this.pz - dragonBoss.z, this.px - dragonBoss.x);
            this.dragonBreathWarningTimer = 1.75;
            soundEngine.playBossPhaseRoar();
          }
        }
      }

      if (this.dragonTimeLeft <= 0) {
        const finalScales = Math.max(4, this.dragonScalesLooted + Math.floor(this.dragonDamageDealt / 1800));
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: this.dragonPhase,
          kills: this.kills,
          gold: this.runGold + 420 + finalScales * 45,
          gems: this.runGems + 22 + finalScales * 2,
          isDragonLairMode: true,
          dragonDamageDealt: Math.round(this.dragonDamageDealt),
          dragonScalesLooted: finalScales,
          dragonPhase: this.dragonPhase,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isCrystalVaultMode) {
      this.vaultTimeLeft = Math.max(0, this.vaultTimeLeft - dt);
      if (this.vaultTimeLeft <= 0) {
        const totalVaultGems = Math.max(12, this.vaultGemsLooted + this.vaultWave * 8);
        const totalReforge = Math.max(4, this.vaultReforgeLooted + this.vaultWave * 2);
        const totalShards = Math.max(3, this.vaultShardsLooted + this.vaultWave * 2);
        const warCrests = Math.max(4, Math.floor(this.vaultPillarsBroken * 0.9) + 3);
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: this.vaultWave,
          kills: this.kills,
          gold: this.runGold + 280 + this.vaultPillarsBroken * 65,
          gems: this.runGems + totalVaultGems,
          isCrystalVaultMode: true,
          vaultPillarsBroken: this.vaultPillarsBroken,
          vaultGemsLooted: totalVaultGems,
          vaultReforgeLooted: totalReforge,
          vaultShardsLooted: totalShards,
          warCrests,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.hitstopCooldown > 0) {
      this.hitstopCooldown = Math.max(0, this.hitstopCooldown - dt);
    }
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      // AAA Micro-Vibration Hit-Stop: hit-flashing targets vibrate kinetically during impact freeze
      const jitter = computeHitstopMicroJitter(this.hitstopTimer, this.elapsed, this.screenShakeEnabled ? 1.0 : 0.35);
      for (let ei = 0; ei < this.enemies.length; ei++) {
        const e = this.enemies[ei];
        if (e.hitFlashTimer > 0) {
          e.model.root.position.set(e.x + jitter.x, 0, e.z + jitter.z);
        }
      }
      this.updateImpactLights(dt);
      this.updateCritStars(dt);
      this.updateCamera(dt);
      return;
    }

    let timeScale = 1;
    const kinTick = advanceKinestheticsTick(this.kinestheticsClock);
    timeScale = Math.min(timeScale, kinTick.entityTimeScale);
    if (this.perfectDodgeSlowTimer > 0) {
      this.perfectDodgeSlowTimer = Math.max(0, this.perfectDodgeSlowTimer - dt);
      timeScale = Math.min(timeScale, PERFECT_DODGE_SLOWMO_SCALE);
    }
    if (this.perfectDodgeCounter.visualSlowMoRemainingSec > 0) {
      const reducedMotion =
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      if (!reducedMotion) {
        timeScale = Math.min(timeScale, computeCounterVisualTimeScale(this.perfectDodgeCounter));
      }
    }
    if (this.bossFinisherTimer > 0) {
      this.bossFinisherTimer = Math.max(0, this.bossFinisherTimer - dt);
      if (this.bossFinisherTimer <= 0) {
        this.bossFinisherName = null;
      }
    }
    if (this.executionFinisherTimer > 0) {
      this.executionFinisherTimer = Math.max(0, this.executionFinisherTimer - dt);
    }
    const execFinisher = computeExecutionFinisherPresentation(
      this.executionFinisherTimer,
      EXECUTION_FINISHER_DURATION_SEC
    );
    const finisherKinematics = computeBossKillSlowMoState(
      this.bossFinisherTimer,
      this.bossFinisherDuration
    );
    const wave5Finisher = computeBossFinisherPresentation(
      this.bossFinisherTimer,
      this.bossFinisherDuration
    );
    if (finisherKinematics.active || wave5Finisher.active || execFinisher.active) {
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      if (!prefersReducedMotion) {
        if (execFinisher.active) {
          timeScale = Math.min(timeScale, execFinisher.visualTimeScale);
        }
        if (finisherKinematics.active || wave5Finisher.active) {
          timeScale = Math.min(
            timeScale,
            wave5Finisher.active ? wave5Finisher.visualTimeScale : finisherKinematics.timeScale
          );
        }
      }
    }
    const simDt = dt * timeScale;
    this.elementalResonance = tickElementalResonanceTimers(this.elementalResonance, simDt);
    const odStep = stepWeaponOverdrive(this.weaponOverdrive, simDt);
    this.weaponOverdrive = odStep.nextState;
    this.weaponOverdriveBuffs = odStep.buffs;
    if (this.weaponOverdriveRingMesh) {
      this.weaponOverdriveRingMesh.visible = this.weaponOverdrive.active;
      if (this.weaponOverdrive.active) {
        this.weaponOverdriveRingMesh.position.set(this.px, 0.08, this.pz);
        this.weaponOverdriveRingMesh.rotation.z += simDt * 3.8;
        const pulse = 1 + Math.sin(this.elapsed * 9) * 0.1;
        this.weaponOverdriveRingMesh.scale.setScalar(pulse);
      }
    }
    if (odStep.finisherSurgeTriggered) {
      const surgeDmg = Math.max(85, Math.round(this.baseStats.attack * 2.4));
      this.spawnShockwave(this.px, this.pz, this.weaponOverdrive.auraHex, 6.2, 0.46);
      this.spawnParticles(this.px, 1.15, this.pz, this.weaponOverdrive.auraHex, 26);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.34);
      this.emitFloatingNumber(
        this.px,
        2.5,
        this.pz,
        surgeDmg,
        true,
        false,
        'storm',
        'XUNG KÍCH THỨC TỈNH!',
        true
      );
      soundEngine.playImpactScorchThump(computeSpatialPan(this.px, ARENA_HALF_W));
      for (const en of [...this.enemies]) {
        if (!en || en.dead || en.spawnTimer > 0) continue;
        if (Math.hypot(en.x - this.px, en.z - this.pz) <= 6.2 + en.radius) {
          this.damageEnemy(en, surgeDmg, true, false, false, true, false, 'XUNG KÍCH', 'ultimate');
        }
      }
    }
    if (this.squadPingBannerTimer > 0) {
      this.squadPingBannerTimer = Math.max(0, this.squadPingBannerTimer - dt);
      if (this.squadPingBannerTimer <= 0) {
        this.squadPingBanner = null;
      }
    }
    if (this.bossPartBrokenBannerTimer > 0) {
      this.bossPartBrokenBannerTimer = Math.max(0, this.bossPartBrokenBannerTimer - dt);
      if (this.bossPartBrokenBannerTimer <= 0) {
        this.bossPartBrokenBanner = null;
      }
    }
    // Dynamic Arena Rim Lighting shift per Boss Phase (Pillar 1 visual polish)
    const activePhaseBoss = this.enemies.find((en) => en.isBoss && !en.isArenaRival && !en.isTrainingDummy);
    if (activePhaseBoss && this.hemiLight) {
      const targetHex =
        activePhaseBoss.bossPhase === 3
          ? 0xff7b7b
          : activePhaseBoss.bossPhase === 2
          ? 0xfcd34d
          : 0x9ec5ff;
      _keyCol.setHex(targetHex);
      this.hemiLight.color.lerp(_keyCol, Math.min(1, dt * 2.5));
    }
    if (this.perfectDodgeBannerTimer > 0) {
      this.perfectDodgeBannerTimer = Math.max(0, this.perfectDodgeBannerTimer - dt);
    }
    if (this.synergyAwakenedTimer > 0) {
      this.synergyAwakenedTimer = Math.max(0, this.synergyAwakenedTimer - dt);
      if (this.synergyAwakenedTimer <= 0) {
        this.synergyAwakenedName = null;
      }
    }
    if (this.elementalZoneSpawnCd > 0) {
      this.elementalZoneSpawnCd = Math.max(0, this.elementalZoneSpawnCd - dt);
    }
    if (this.ultCutinTimer > 0) {
      this.ultCutinTimer = Math.max(0, this.ultCutinTimer - dt);
      if (this.ultCutinTimer <= 0) {
        this.ultCutinTitle = null;
        this.ultCutinHeroName = null;
        this.ultCutinAccentHex = null;
      }
    }
    if (this.bossPhaseShiftTimer > 0) {
      this.bossPhaseShiftTimer = Math.max(0, this.bossPhaseShiftTimer - dt);
      if (this.bossPhaseShiftTimer <= 0) {
        this.bossPhaseShiftLevel = null;
      }
    }
    if (this.bossPhaseCounterTimer > 0) {
      this.bossPhaseCounterTimer = Math.max(0, this.bossPhaseCounterTimer - dt);
      if (this.bossPhaseCounterTimer <= 0) {
        this.bossPhaseCounterLevel = null;
      }
    }
    if (this.wave9PropBuffTimer > 0) {
      this.wave9PropBuffTimer = Math.max(0, this.wave9PropBuffTimer - dt);
      if (this.wave9PropBuffTimer <= 0) {
        this.wave9PropAtkBonusPct = 0;
        this.wave9PropAspdBonusPct = 0;
        this.wave9PropBuffLabel = null;
      }
    }
    if (this.arenaEntryFlyTimer > 0) {
      this.arenaEntryFlyTimer = Math.max(0, this.arenaEntryFlyTimer - dt);
    }
    const ultCutin = computeUltimateCutinState(this.ultCutinTimer, this.ultCutinDuration);
    this.keyLight.intensity = 1.92 * (1 - ultCutin.eclipseDarken);
    this.hemiLight.intensity = 0.88 * (1 - ultCutin.eclipseDarken * 0.72);
    soundEngine.setCombatTelemetry(
      this.comboCount,
      this.hp / Math.max(1, this.maxHp),
      this.perfectDodgeSlowTimer > 0 || finisherKinematics.active
    );
    if (this.isTrainingMode) {
      this.trainingClockSec += dt;
    }

    if (this.stageBannerTimer > 0) {
      this.stageBannerTimer -= dt;
      if (this.stageBannerTimer <= 0) {
        this.stageBannerText = null;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= simDt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.comboCount = 0;
      }
    }

    if (this.heavyBreakCooldown > 0) {
      this.heavyBreakCooldown = Math.max(0, this.heavyBreakCooldown - dt);
    }
    this.updateChapterAtmosphere(dt);
    this.updateStarfallWeather(simDt);
    this.updateRoomChaosEvent(simDt);
    this.updatePlayer(simDt);
    this.updateCoopAllies(simDt);
    this.updatePassivesAndPeriodicSkills(simDt);
    this.updateOrbitOrbs(simDt);
    this.updateCompanions(simDt);
    this.updateEnemies(simDt);
    this.updateBossGroundHazardsAndMultiSlams(simDt);
    this.updateDyingCorpses(simDt);
    this.updateProjectiles(simDt);
    this.updateMeteors(simDt);
    this.updateElementalZones(simDt);
    this.updateLootOrbs(simDt);
    this.updateParticles(simDt);
    this.updateShockwaves(simDt);
    this.updateImpactDecals(simDt);
    this.updateWave5Effects(simDt);
    this.updateUltColumns(simDt);
    this.updateDashGhosts(simDt);
    this.updateLightning(simDt);
    this.updateCritStars(dt);
    this.updateImpactLights(dt);
    this.updatePortalAndShrine(simDt);
    for (let oi = 0; oi < this.obstacles.length; oi++) {
      const obs = this.obstacles[oi];
      if (obs.intact !== false && obs.crystalCap) {
        obs.crystalCap.rotation.y += simDt * 1.45;
        obs.crystalCap.position.y = 2.62 + Math.sin(this.elapsed * 2.6 + oi * 1.4) * 0.07;
      }
    }
    for (let ui = 0; ui < this.urns.length; ui++) {
      const urn = this.urns[ui];
      if (!urn.alive || !urn.sealMesh) continue;
      urn.sealMesh.rotation.y += simDt * 2.4;
      urn.sealMesh.position.y = 1.48 + Math.sin(this.elapsed * 3.2 + ui * 1.9) * 0.08;
    }
    if (this.bossEntranceHintCd > 0) {
      this.bossEntranceHintCd = Math.max(0, this.bossEntranceHintCd - dt);
    }
    if (this.bossEntranceTimer > 0) {
      this.bossEntranceTimer = Math.max(0, this.bossEntranceTimer - dt);
      if (this.bossEntranceTimer <= 0) {
        this.bossEntranceBossName = null;
        this.bossEntranceLandingFired = false;
        soundEngine.playTargetLockTick(true);
        this.spawnShockwave(this.px, this.pz, this.weaponAccentHex, 3.2, 0.34);
        this.emitFloatingNumber(
          this.px,
          2.35,
          this.pz,
          0,
          true,
          false,
          'storm',
          'KHAI CHIẾN!',
          true
        );
        this.syncHudImmediate();
      }
    }
    if (this.bossIntroTimer > 0) {
      this.bossIntroTimer = Math.max(0, this.bossIntroTimer - dt);
    }
    if (this.roomBountyBannerTimer > 0) {
      this.roomBountyBannerTimer = Math.max(0, this.roomBountyBannerTimer - dt);
      if (this.roomBountyBannerTimer <= 0) this.roomBountyBanner = null;
    }
    if (this.cameraPresetToastTimer > 0) {
      this.cameraPresetToastTimer = Math.max(0, this.cameraPresetToastTimer - dt);
      if (this.cameraPresetToastTimer <= 0) this.cameraPresetToast = null;
    }
    if (this.roomBounty && this.roomBounty.status === 'active' && !this.portalOpen) {
      this.advanceRoomBounty({ type: 'tick', dt: simDt });
    }
    const baseShrineY = this.arenaThemeSpec.style === 'earth_monolith' ? 2.22 : 1.5;
    for (let bi = 0; bi < this.arenaBrazierGems.length; bi++) {
      const gem = this.arenaBrazierGems[bi];
      gem.rotation.y += simDt * this.arenaThemeSpec.brazierSpinSpeed;
      gem.position.y =
        baseShrineY +
        Math.sin(this.elapsed * 2.5 + bi * 1.57) * this.arenaThemeSpec.brazierBobAmp;
    }
    // AAA Wave 6: Dynamic flickering brazier flames reacting to active Boss Phase rage
    const activeBossForFlame = this.enemies.find((en) => en.isBoss && !en.isTrainingDummy);
    const activeBossPhase: 1 | 2 | 3 = activeBossForFlame ? activeBossForFlame.bossPhase : 1;
    for (let fi = 0; fi < this.arenaBrazierFlames.length; fi++) {
      const bf = this.arenaBrazierFlames[fi];
      const pose = computeBrazierFlamePose(this.elapsed, fi, activeBossPhase);
      bf.group.position.set(bf.baseX + pose.swayX, bf.baseY, bf.baseZ + pose.swayZ);
      bf.outer.scale.set(pose.scaleX, pose.scaleY, pose.scaleZ);
      bf.core.scale.set(pose.scaleX * 0.9, pose.scaleY * 0.92, pose.scaleZ * 0.9);
      const oMat = bf.outer.material as THREE.MeshBasicMaterial;
      oMat.color.setHex(pose.colorHex);
      oMat.opacity = pose.opacity;
      (bf.core.material as THREE.MeshBasicMaterial).color.setHex(pose.coreColorHex);
    }
    if (this.constellationGroup) {
      this.constellationGroup.rotation.y = Math.sin(this.elapsed * 0.08) * 0.06;
    }
    for (let si = 0; si < this.arenaLightShafts.length; si++) {
      const shaft = this.arenaLightShafts[si];
      const smat = shaft.material as THREE.MeshBasicMaterial;
      const baseOp = (shaft.userData.baseOpacity as number) ?? 0.055;
      smat.opacity = baseOp * (0.84 + Math.sin(this.elapsed * 0.9 + si * 2.1) * 0.16);
    }
    this.updateWave7ArenaSystems(simDt, dt);
  }

  private updateArenaHazards(dt: number): void {
    if (this.isTrainingMode) return;
    const isCampaignEndgame =
      !this.isTowerMode &&
      !this.isBossRushMode &&
      !this.isDailyRiftMode &&
      !this.isGuildBossMode &&
      !this.isArenaMode &&
      !this.isCoopRaidMode &&
      !this.isElementalTowerMode &&
      !this.isCrystalDefenseMode &&
      !this.isWorldBossMode &&
      !this.isBloodMoonMode &&
      !this.isAbyssalMode &&
      !this.isGuildWarMode &&
      !this.isPantheonMode &&
      !this.isChampionshipMode &&
      !this.isCrystalVaultMode &&
      !this.isDragonLairMode &&
      !this.isSkyCitadelMode &&
      (this.currentChapter.id >= 7 ||
        (this.nightmareTier > 0 && this.nightmareConfig.hazardIntervalMult < 1));
    const isTowerEndgame = this.isTowerMode && this.towerFloor >= 10;

    if ((isCampaignEndgame || isTowerEndgame) && this.enemies.length > 0 && this.arenaHazards.length < 2) {
      this.arenaHazardSpawnTimer -= dt;
      if (this.arenaHazardSpawnTimer <= 0) {
        const baseInterval = this.isTowerMode
          ? Math.max(4.0, 5.6 - Math.floor(this.towerFloor / 10) * 0.35)
          : Math.max(4.2, 5.8 - Math.max(0, this.currentChapter.id - 7) * 0.25);
        this.arenaHazardSpawnTimer =
          baseInterval * (this.nightmareTier > 0 ? this.nightmareConfig.hazardIntervalMult : 1);

        const kinds: ArenaHazardType[] = ['solar_eruption', 'frost_zone', 'void_pulse'];
        const kind: ArenaHazardType = this.isTowerMode
          ? kinds[this.towerFloor % kinds.length]
          : kinds[Math.abs(this.currentChapter.id - 7) % kinds.length];
        const meta = ARENA_HAZARD_META[kind];

        const angle = Math.random() * Math.PI * 2;
        const offsetDist = 1.8 + Math.random() * 2.8;
        const hx = THREE.MathUtils.clamp(
          this.px + Math.cos(angle) * offsetDist,
          -ARENA_HALF_W + 2.4,
          ARENA_HALF_W - 2.4
        );
        const hz = THREE.MathUtils.clamp(
          this.pz + Math.sin(angle) * offsetDist,
          -ARENA_HALF_D + 2.6,
          ARENA_HALF_D - 2.6
        );
        const radius = kind === 'frost_zone' ? 2.75 : 2.45;
        const baseDmg = this.isTowerMode
          ? Math.round(28 * getEndlessTowerScaling(this.towerFloor, this.towerHighestCleared).enemyDmgScale)
          : Math.round(26 * this.currentChapter.dmgScale);

        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius - 0.16, radius, 28),
          new THREE.MeshBasicMaterial({
            color: meta.colorHex,
            transparent: true,
            opacity: 0.78,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(hx, 0.055, hz);
        ring.renderOrder = 7;

        const fill = new THREE.Mesh(
          new THREE.CircleGeometry(1, 24),
          new THREE.MeshBasicMaterial({
            color: meta.colorHex,
            transparent: true,
            opacity: 0.24,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          })
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(hx, 0.05, hz);
        fill.scale.setScalar(0.12);
        fill.renderOrder = 6;

        this.entitiesGroup.add(ring, fill);
        soundEngine.playArenaHazardWarn();
        this.arenaHazards.push({
          kind,
          x: hx,
          z: hz,
          radius,
          timer: 1.25,
          maxTimer: 1.25,
          damage: baseDmg,
          ring,
          fill,
        });
      }
    }

    for (let i = this.arenaHazards.length - 1; i >= 0; i--) {
      const hz = this.arenaHazards[i];
      hz.timer -= dt;
      const meta = ARENA_HAZARD_META[hz.kind];
      const progress = Math.max(0, Math.min(1, 1 - hz.timer / hz.maxTimer));
      hz.fill.scale.setScalar(Math.max(0.1, progress * hz.radius));
      const ringMat = hz.ring.material as THREE.MeshBasicMaterial;
      if (hz.timer <= 0.14) {
        ringMat.color.setHex(0xffffff);
        ringMat.opacity = 0.96;
      } else {
        ringMat.color.setHex(meta.colorHex);
        ringMat.opacity = 0.62 + progress * 0.28;
      }

      if (hz.timer <= 0) {
        soundEngine.playArenaHazardTrigger(hz.kind);
        this.spawnShockwave(hz.x, hz.z, meta.colorHex, hz.radius * 1.15, 0.34);
        this.spawnImpactDecal(hz.x, hz.z, meta.colorHex, hz.radius * 0.9, 1.65);
        this.spawnParticles(hz.x, 0.75, hz.z, meta.colorHex, 20);
        const dist = Math.hypot(this.px - hz.x, this.pz - hz.z);
        if (dist <= hz.radius + 0.32 && this.dashTimer > 0 && this.invulnTimer > 0) {
          this.tryTriggerPerfectDodge();
        } else if (dist <= hz.radius + 0.32 && this.invulnTimer <= 0) {
          if (hz.kind === 'solar_eruption') {
            this.damagePlayer(
              hz.damage,
              {
                code: 'boss_slam',
                label: 'Bẫy Phun Trào Thái Dương',
                killerName: 'Bẫy Sàn Thái Dương',
                tip: 'Lướt né vòng cảnh báo cam trên sàn trước khi cột lửa bùng nổ.',
              },
              hz.x,
              hz.z
            );
          } else if (hz.kind === 'frost_zone') {
            this.playerFrostSlowTimer = Math.max(this.playerFrostSlowTimer, 1.8);
            this.emitFloatingNumber(this.px, 2.0, this.pz, 0, false, false, 'ice', 'BẪY HÀN BĂNG!');
            this.damagePlayer(
              Math.max(8, Math.round(hz.damage * 0.72)),
              {
                code: 'boss_slam',
                label: 'Bẫy Vùng Hàn Băng',
                killerName: 'Bẫy Sàn Hàn Băng',
                tip: 'Di chuyển khỏi vùng băng xanh để tránh bị làm chậm và trúng sát thương.',
              },
              hz.x,
              hz.z
            );
          } else {
            const dx = hz.x - this.px;
            const dz = hz.z - this.pz;
            const dLen = Math.max(0.01, Math.hypot(dx, dz));
            this.px = THREE.MathUtils.clamp(
              this.px + (dx / dLen) * 1.1,
              -ARENA_HALF_W + 0.6,
              ARENA_HALF_W - 0.6
            );
            this.pz = THREE.MathUtils.clamp(
              this.pz + (dz / dLen) * 1.1,
              -ARENA_HALF_D + 0.6,
              ARENA_HALF_D - 0.6
            );
            this.emitFloatingNumber(this.px, 2.0, this.pz, 0, false, false, 'storm', 'XUNG HƯ KHÔNG!');
            this.damagePlayer(
              Math.max(8, Math.round(hz.damage * 0.85)),
              {
                code: 'boss_slam',
                label: 'Bẫy Xung Hư Không',
                killerName: 'Bẫy Sàn Hư Không',
                tip: 'Dùng Lướt đúng thời điểm để vô hiệu hóa lực kéo của Xung Hư Không.',
              },
              hz.x,
              hz.z
            );
          }
        }
        this.releaseObject(hz.ring);
        this.releaseObject(hz.fill);
        this.arenaHazards.splice(i, 1);
      }
    }
  }

  private updateChapterAtmosphere(dt: number): void {
    if (this.phase === GamePhase.TITLE) return;
    const boss = this.enemies.find((e) => e.isBoss);
    const biome = resolveChapterBiomeAtmosphere(this.currentChapter.zodiacId, boss?.bossPhase ?? 1);
    const alpha = 1 - Math.exp(-3.2 * dt);

    if (this.scene.background instanceof THREE.Color) {
      _skyCol.setHex(biome.skyHex);
      this.scene.background.lerp(_skyCol, alpha);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      _fogCol.setHex(biome.fogHex);
      this.scene.fog.color.lerp(_fogCol, alpha);
      this.scene.fog.density = THREE.MathUtils.damp(this.scene.fog.density, biome.fogDensity, 3.0, dt);
    }
    _keyCol.setHex(biome.rimLightHex);
    this.rimLight.color.lerp(_keyCol, alpha);
    const starMat = this.starfallMesh?.material as THREE.MeshBasicMaterial | undefined;
    if (starMat?.color) {
      _starCol.setHex(biome.weatherColorHex);
      starMat.color.lerp(_starCol, alpha);
    }
    const bossPhase = (boss?.bossPhase ?? 1) as 1 | 2 | 3;
    if (bossPhase !== this.lastBossAudioPhase) {
      this.lastBossAudioPhase = bossPhase;
      soundEngine.setBossIntensity(bossPhase);
    }
    if (this.skyDomeMat) {
      const resonanceRatio = Math.min(
        1,
        Math.max(
          this.elementalResonance.stack / Math.max(1, this.elementalResonance.maxStack),
          this.elementalResonance.burstBannerTimerSec > 0 ? 1 : 0
        )
      );
      const skyTargets = computeDynamicSkyShaderTargets({
        skyHex: biome.skyHex,
        fogHex: biome.fogHex,
        rimLightHex: biome.rimLightHex,
        bossPhase,
        resonanceRatio,
      });
      const u = this.skyDomeMat.uniforms;
      u.uTime.value = this.elapsed;
      _skyCol.setHex(skyTargets.zenithHex);
      (u.uZenithColor.value as THREE.Color).lerp(_skyCol, alpha);
      _fogCol.setHex(skyTargets.horizonHex);
      (u.uHorizonColor.value as THREE.Color).lerp(_fogCol, alpha);
      _nebulaCol.setHex(skyTargets.nebulaHex);
      (u.uNebulaColor.value as THREE.Color).lerp(_nebulaCol, alpha);
      _auroraCol.setHex(skyTargets.auroraHex);
      (u.uAuroraColor.value as THREE.Color).lerp(_auroraCol, alpha);
      u.uTurbulence.value = THREE.MathUtils.damp(
        Number(u.uTurbulence.value ?? 1),
        skyTargets.turbulence,
        3.0,
        dt
      );
      u.uPhaseIntensity.value = THREE.MathUtils.damp(
        Number(u.uPhaseIntensity.value ?? 0.35),
        skyTargets.phaseIntensity,
        3.0,
        dt
      );
      u.uSimpleMode.value =
        this.isSoftwareGl || this.lowEndGpu || this.graphicsQuality === 'low' ? 1.0 : 0.0;
    }
    for (let si = 0; si < this.arenaLightShafts.length; si++) {
      const smat = this.arenaLightShafts[si].material as THREE.MeshBasicMaterial;
      if (smat?.color) {
        smat.color.lerp(_keyCol, alpha);
      }
    }
    if (this.groundMistMesh) {
      const mistMat = this.groundMistMesh.material as THREE.MeshBasicMaterial;
      if (mistMat?.color) {
        mistMat.color.lerp(_keyCol, alpha);
      }
    }
  }

  private updateStarfallWeather(dt: number): void {
    if (!this.starfallEnabled || !this.starfallMesh) return;
    if (this.phase === GamePhase.TITLE && this.lobbyWeatherId === 'clear') {
      this.starfallMesh.visible = false;
      return;
    }
    this.starfallMesh.visible = true;
    const biomeKind = resolveWeatherBiome({
      chapterIndex: Math.max(0, (this.currentChapter?.id ?? 1) - 1),
      isWeeklyBoss: this.isWeeklyRankedBossMode,
      isWeekendBlitz: this.weeklyBossIsWeekendBlitz,
      isLobby: this.phase === GamePhase.TITLE,
    });
    this.activeWeatherBiome = biomeKind;
    const profile = WEATHER_BIOME_PROFILES[biomeKind];
    const activeBudget = Math.min(
      this.STARFALL_COUNT,
      computeWeatherInstanceBudget(profile, this.adaptiveFpsGovernor.tier, this.isSoftwareGl)
    );
    this.starfallMesh.count = activeBudget;

    const starMat = this.starfallMesh.material as THREE.MeshBasicMaterial | undefined;
    if (starMat?.color && this.phase !== GamePhase.TITLE) {
      _starCol.setHex(profile.particleHex);
      starMat.color.lerp(_starCol, Math.min(1, dt * 3.0));
    }

    for (let i = 0; i < activeBudget; i++) {
      const s = this.starfallSeeds[i];
      if (biomeKind === 'ember_ash') {
        s.y += Math.abs(profile.fallSpeed) * (0.75 + (s.scale * 0.35)) * dt;
        s.x += Math.sin(this.elapsed * 2.1 + s.phase) * profile.driftX * dt;
        s.z += Math.cos(this.elapsed * 1.5 + s.phase) * profile.driftZ * dt;
        if (s.y > 16.5) {
          s.y = 0.25 + ((i * 0.37) % 1.4);
          s.x = ((i * 7.3) % 28) - 14;
          s.z = ((i * 11.1) % 28) - 14;
        }
        const flicker = 0.8 + 0.35 * Math.sin(this.elapsed * 6 + s.phase);
        _dummy.scale.set(s.scale * flicker, s.scale * flicker, s.scale * flicker);
      } else if (biomeKind === 'starlight_snow') {
        s.y -= profile.fallSpeed * (0.45 + s.scale * 0.25) * dt;
        s.x += Math.sin(this.elapsed * 1.4 + s.phase) * profile.driftX * dt;
        s.z += Math.cos(this.elapsed * 1.1 + s.phase) * profile.driftZ * dt;
        if (s.y < 0.2) {
          s.y = 14 + ((i * 0.61) % 3.5);
          s.x = ((i * 9.7) % 30) - 15;
          s.z = ((i * 13.3) % 30) - 15;
        }
        _dummy.scale.setScalar(s.scale * 1.16);
      } else if (biomeKind === 'storm_rain') {
        s.y -= profile.fallSpeed * (0.85 + s.scale * 0.22) * dt;
        s.x -= profile.driftX * dt;
        if (s.y < 0.25) {
          s.y = 14.5 + ((i * 0.73) % 3.5);
          s.x = ((i * 8.9) % 30) - 12;
          s.z = ((i * 12.7) % 32) - 16;
        }
        _dummy.scale.set(s.scale * 0.48, s.scale * 3.1, s.scale * 0.48);
      } else {
        // celestial_dust
        s.y += Math.abs(profile.fallSpeed) * (0.55 + s.scale * 0.28) * dt;
        s.x += Math.sin(this.elapsed * 1.3 + s.phase) * profile.driftX * dt;
        s.z += Math.cos(this.elapsed * 1.1 + s.phase) * profile.driftZ * dt;
        if (s.y > 15.5) {
          s.y = 0.4 + ((i * 0.53) % 2.1);
          s.x = ((i * 10.3) % 28) - 14;
          s.z = ((i * 14.1) % 28) - 14;
        }
        const pulse = 0.85 + 0.28 * Math.sin(this.elapsed * 3.2 + s.phase);
        _dummy.scale.setScalar(s.scale * pulse);
      }
      _dummy.position.set(s.x, s.y, s.z);
      _dummy.rotation.set(
        biomeKind === 'storm_rain' ? 0 : this.elapsed * 1.1 + s.phase,
        this.elapsed * 1.6 + s.phase,
        biomeKind === 'storm_rain' ? 0.24 : 0
      );
      _dummy.updateMatrix();
      this.starfallMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.starfallMesh.instanceMatrix.needsUpdate = true;
  }

  private getCurrentAtkMultiplier(): number {
    const atkStacks = this.activeSkills.atk_boost ?? 0;
    const warriorStacks = this.activeSkills.warriors_soul ?? 0;
    const trioStacks = this.activeSkills.power_trio ?? 0;
    let mult =
      (1 + atkStacks * 0.24 + warriorStacks * 0.3 + trioStacks * 0.15) *
      this.furyBonusMult;

    if (this.isDailyRiftMode && this.dailyRiftPair) {
      mult *= this.dailyRiftPair.atkMult;
    }
    if (this.hasRune('star_of_fury') && this.hp < this.maxHp * 0.6) {
      mult *= 1.25;
    }
    if (this.isChampionshipMode) {
      mult *= this.championshipAtkMult;
    }
    if (this.perfectDodgeBuffTimer > 0) {
      mult *= 1 + PERFECT_DODGE_DAMAGE_BONUS;
    }
    if (this.wave9PropBuffTimer > 0 && this.wave9PropAtkBonusPct > 0) {
      mult *= 1 + this.wave9PropAtkBonusPct / 100;
    }
    if (this.weaponOverdriveBuffs.atkMult > 1) {
      mult *= this.weaponOverdriveBuffs.atkMult;
    }
    return mult;
  }

  private updatePlayer(dt: number): void {
    // Spawn 3D AI Squad Assist dynamically on eligible modes if configured
    if (
      this.aiSquadAssistEnabled &&
      this.coopAllies.length === 0 &&
      !this.isCoopRaidMode &&
      !this.isArenaMode &&
      !(this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode)
    ) {
      this.syncAiSquadAllies();
    }

    let moveX = this.joyVecX + this.gamepadMoveX;
    let moveZ = this.joyVecZ + this.gamepadMoveZ;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const manualActive = shouldManualOverride(moveX, moveZ);
    const rankedLocksAi = this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode;

    if (this.autoPilotEnabled && !rankedLocksAi) {
      this.autoPilotUsedInRun = true;
      if (manualActive) {
        // Zero-latency instant manual takeover whenever player touches joystick/WASD
        this.autoPilotManualOverride = true;
        this.autoPilotStatusText = 'Ưu tiên điều khiển tay';
      } else {
        this.autoPilotManualOverride = false;
        const telegraphs: Array<{
          kind: 'slam' | 'lunge' | 'lane' | 'spiral' | 'shot';
          x: number;
          z: number;
          radius: number;
          timeRemainingSec: number;
          endX?: number;
          endZ?: number;
        }> = [];
        for (const en of this.enemies) {
          if (en.spawnTimer > 0 || en.telegraphType === 'none') continue;
          if (en.telegraphType === 'slam') {
            telegraphs.push({
              kind: 'slam',
              x: en.slamX,
              z: en.slamZ,
              radius: Math.max(2.2, en.slamRadius),
              timeRemainingSec: Math.max(0, en.telegraphTimer),
            });
          } else if (en.telegraphType === 'lane' && en.laneAngles && en.laneAngles.length > 0) {
            for (const ang of en.laneAngles) {
              telegraphs.push({
                kind: 'lane',
                x: en.x,
                z: en.z,
                endX: en.x + Math.sin(ang) * 18,
                endZ: en.z + Math.cos(ang) * 18,
                radius: 1.55,
                timeRemainingSec: Math.max(0, en.telegraphTimer),
              });
            }
          } else if (en.telegraphType === 'lunge') {
            telegraphs.push({
              kind: 'lunge',
              x: en.x,
              z: en.z,
              endX: en.x + en.aimX * 10,
              endZ: en.z + en.aimZ * 10,
              radius: 1.65,
              timeRemainingSec: Math.max(0, en.telegraphTimer),
            });
          } else if (en.telegraphType === 'spiral') {
            telegraphs.push({
              kind: 'spiral',
              x: en.x,
              z: en.z,
              radius: 3.6,
              timeRemainingSec: Math.max(0, en.telegraphTimer),
            });
          }
        }

        const incomingBullets = this.enemyOrbPool
          .filter((orb) => orb.active)
          .map((orb) => ({
            x: orb.x,
            z: orb.z,
            vx: orb.vx,
            vz: orb.vz,
            radius: 0.42,
          }));

        const healOrbs = this.lootOrbs
          .filter((orb) => orb.active && orb.kind === 'heal')
          .map((orb) => ({ x: orb.x, z: orb.z }));

        const activeBossWp = this.bossWeakPointState?.active && this.bossWeakPointEnemyId !== null
          ? (() => {
              const b = this.enemies.find((en) => en.id === this.bossWeakPointEnemyId && en.hp > 0);
              if (!b || !this.bossWeakPointState) return null;
              const wp = getBossWeakPointWorldPos(b.x, b.z, this.bossWeakPointState);
              return { x: wp.x, z: wp.z, active: true };
            })()
          : null;

        const decision = computeAutoPilotDecision({
          tactic: this.autoPilotTactic,
          simTimeSec: this.simClock.totalSimTime,
          playerX: this.px,
          playerZ: this.pz,
          hpRatio: this.hp / Math.max(1, this.maxHp),
          ultCharge: this.ultCharge,
          dashReady: this.dashCooldown <= 0.05 && this.dashTimer <= 0,
          activeSkillReady: this.activeSkillCooldown <= 0.05,
          overchargeRatio: this.astralOvercharge,
          counterShotReady: this.counterShotTimer > 0,
          portalOpen: this.portalOpen,
          portalX: 0,
          portalZ: -ARENA_HALF_D + 1.4,
          arenaHalfW: ARENA_HALF_W,
          arenaHalfD: ARENA_HALF_D,
          enemies: this.enemies
            .filter((en) => en.spawnTimer <= 0 && !en.isTrainingDummy)
            .map((en) => ({
              id: en.id,
              x: en.x,
              z: en.z,
              hp: en.hp,
              maxHp: en.maxHp,
              isBoss: en.isBoss,
              radius: en.radius,
              staggerBroken: Boolean(en.stunTimer && en.stunTimer > 0),
            })),
          telegraphs,
          incomingBullets,
          healOrbs,
          obstacles: this.obstacles
            .filter((o) => o.intact !== false)
            .map((o) => ({ x: o.x, z: o.z, radius: o.radius })),
          bossWeakPoint: activeBossWp,
          resonanceTraps: this.resonanceTraps.map((t) => ({
            x: t.x,
            z: t.z,
            ready: t.cooldown <= 0,
            aoeRadius: RESONANCE_TRAP_CONFIGS[t.kind].aoeRadius,
            label: RESONANCE_TRAP_CONFIGS[t.kind].label,
          })),
        });

        moveX = decision.moveX;
        moveZ = decision.moveZ;
        this.autoPilotStatusText = decision.statusLabel;

        if (decision.wantDash) {
          this.dashBufferTimer = 0.14;
        }
        if (!this.isBossEntranceLocked()) {
          if (decision.wantUltimate && this.ultCharge >= 100) {
            this.triggerHeroUltimate();
          } else if (decision.wantActiveSkill && this.activeSkillCooldown <= 0.05) {
            this.triggerHeroActiveSkill();
          }
        }
      }
    } else {
      this.autoPilotManualOverride = false;
    }

    // Pillar 2: Drain 120ms buffered combat inputs for frame-perfect responsiveness
    const bufferNowMs = performance.now();
    if (!this.isBossEntranceLocked()) {
      if (this.activeSkillCooldown <= 0 && consumeBufferedAction(this.combatInputBuffer, 'activeSkill', bufferNowMs)) {
        this.triggerHeroActiveSkill();
      }
      if (this.ultCharge >= 100 && consumeBufferedAction(this.combatInputBuffer, 'ultimate', bufferNowMs)) {
        this.triggerHeroUltimate();
      }
    }
    if (this.dashCooldown <= 0 && this.dashTimer <= 0 && consumeBufferedAction(this.combatInputBuffer, 'dash', bufferNowMs)) {
      this.dashBufferTimer = Math.max(this.dashBufferTimer, 0.14);
    }

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    // Allow players to smoothly cancel non-entrance Boss intro sweep or Lobby-to-Arena entry fly-through on move/dash.
    // During an active 5–10s Boss Entrance, the Boss must finish appearing before combat unlocks.
    if (!this.isBossEntranceLocked() && this.bossIntroTimer > 0.22 && (inputLen > 0.15 || this.dashBufferTimer > 0)) {
      this.bossIntroTimer = 0.22;
    }
    if (this.arenaEntryFlyTimer > 0 && (inputLen > 0.15 || this.dashBufferTimer > 0)) {
      this.arenaEntryFlyTimer = 0;
    }

    if (this.dashCooldown > 0) this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    if (this.dashBufferTimer > 0) this.dashBufferTimer -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    if (this.alexAspdBuffTimer > 0) this.alexAspdBuffTimer -= dt;
    if (this.alexOverdriveTimer > 0) this.alexOverdriveTimer -= dt;
    if (this.alexCadenceTimer > 0) this.alexCadenceTimer -= dt;
    if (this.wukongOverdriveTimer > 0) this.wukongOverdriveTimer -= dt;
    if (this.activeSkillCooldown > 0) this.activeSkillCooldown = Math.max(0, this.activeSkillCooldown - dt);
    if (this.perfectDodgeInternalCd > 0) {
      this.perfectDodgeInternalCd = Math.max(0, this.perfectDodgeInternalCd - dt);
    }
    if (this.perfectDodgeBuffTimer > 0) {
      this.perfectDodgeBuffTimer = Math.max(0, this.perfectDodgeBuffTimer - dt);
    }
    if (this.counterShotTimer > 0) {
      this.counterShotTimer = Math.max(0, this.counterShotTimer - dt);
    }

    if (this.dashBufferTimer > 0 && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.dashBufferTimer = 0;
      this.dashTimer = 0.2;
      this.dashCooldown = 1.25;
      this.invulnTimer = 0.28;
      if (inputLen > 0.1) {
        this.dashDirX = moveX / Math.max(0.01, inputLen);
        this.dashDirZ = moveZ / Math.max(0.01, inputLen);
      } else {
        this.dashDirX = Math.sin(this.pFacing);
        this.dashDirZ = Math.cos(this.pFacing);
      }
      this.runDashCount += 1;
      const dodgeThreat = this.findNearestEnemy(this.px, this.pz);
      if (dodgeThreat) {
        const toThreatX = dodgeThreat.x - this.px;
        const toThreatZ = dodgeThreat.z - this.pz;
        const cross = toThreatX * this.dashDirZ - toThreatZ * this.dashDirX;
        if (cross >= 0) {
          this.runRightDodges += 1;
        } else {
          this.runLeftDodges += 1;
        }
      }
      const dashAccentHex = this.weaponAccentHex;
      soundEngine.playDash();
      this.heroSquashY = 1.18;
      this.cameraFovOffset = Math.max(this.cameraFovOffset, 3.2);
      this.spawnShockwave(this.px, this.pz, dashAccentHex, 1.65, 0.22);
      this.spawnParticles(this.px, 0.7, this.pz, dashAccentHex, 12);
      this.dashGhostEmitTimer = 0;
      this.spawnDashGhost(this.px, this.pz, this.pFacing, dashAccentHex);
      this.spawnDashScorch(this.px, this.pz, Math.atan2(this.dashDirX, this.dashDirZ), dashAccentHex);
    }

    if (this.windBeaconSpeedTimer > 0) {
      this.windBeaconSpeedTimer = Math.max(0, this.windBeaconSpeedTimer - dt);
    }
    const moveMult =
      (this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.playerSpeedMult : 1.0) *
      (this.alexCadenceTimer > 0 ? 1.15 : 1.0) *
      (this.windBeaconSpeedTimer > 0 ? 1.22 : 1.0) *
      (this.activeRoomChaosEvent?.id === 'wind_frenzy' ? 1.22 : 1.0);
    const frostSlowMult = this.playerFrostSlowTimer > 0 ? 0.72 : 1.0;
    const effectiveMoveSpeed = this.baseStats.moveSpeed * moveMult * frostSlowMult;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpeed = effectiveMoveSpeed * 2.75;
      this.pvx = this.dashDirX * dashSpeed;
      this.pvz = this.dashDirZ * dashSpeed;
      this.dashGhostEmitTimer -= dt;
      if (this.dashGhostEmitTimer <= 0) {
        this.dashGhostEmitTimer = 0.045;
        const trailHex = this.weaponAccentHex;
        this.spawnDashGhost(this.px, this.pz, this.pFacing, trailHex);
        this.spawnDashScorch(this.px, this.pz, Math.atan2(this.dashDirX, this.dashDirZ), trailHex);
      }
      if (Math.random() < 0.65) {
        this.spawnParticles(this.px, 0.6, this.pz, this.weaponAccentHex, 1);
      }
      // Wave 9: Dashing into an Interactive 3D Arena Prop activates & shatters it
      for (const prop of this.wave9Props) {
        if (!prop.alive) continue;
        if (Math.hypot(this.px - prop.x, this.pz - prop.z) <= prop.radius + 0.92) {
          this.triggerWave9ArenaProp(prop);
        }
      }
    } else {
      const targetVx = moveX * effectiveMoveSpeed;
      const targetVz = moveZ * effectiveMoveSpeed;
      this.pvx = THREE.MathUtils.damp(this.pvx, targetVx, 18, dt);
      this.pvz = THREE.MathUtils.damp(this.pvz, targetVz, 18, dt);
    }

    const beforeMoveX = this.px;
    const beforeMoveZ = this.pz;
    this.px += this.pvx * dt;
    this.pz += this.pvz * dt;

    const pRadius = 0.52;
    this.px = THREE.MathUtils.clamp(
      this.px,
      -ARENA_HALF_W + pRadius,
      ARENA_HALF_W - pRadius
    );
    this.pz = THREE.MathUtils.clamp(
      this.pz,
      -ARENA_HALF_D + pRadius,
      ARENA_HALF_D - pRadius
    );

    for (const obs of this.obstacles) {
      if (obs.intact === false) continue;
      const dx = this.px - obs.x;
      const dz = this.pz - obs.z;
      const minD = pRadius + obs.radius;
      const d = Math.hypot(dx, dz);
      if (d < minD && d > 0.0001) {
        this.px = obs.x + (dx / d) * minD;
        this.pz = obs.z + (dz / d) * minD;
      }
    }

    if (this.isCrystalDefenseMode && this.crystalRefs) {
      const cd = Math.hypot(this.px, this.pz);
      const minCrystalD = 1.58;
      if (cd < minCrystalD && cd > 0.0001) {
        this.px = (this.px / cd) * minCrystalD;
        this.pz = (this.pz / cd) * minCrystalD;
      }
    }

    const travelDist = Math.hypot(this.px - beforeMoveX, this.pz - beforeMoveZ);
    const speedMag = Math.hypot(this.pvx, this.pvz);
    const isMoving = inputLen > 0.12 || this.dashTimer > 0;
    const isThor = false;

    // AAA Wave 7: Emit pooled elemental footstep ripples along movement path
    if (travelDist > 0.004) {
      const stepRes = stepFootstepRippleDistance(
        this.footstepRippleAccum,
        travelDist,
        Boolean(this.hero.mountGroup)
      );
      this.footstepRippleAccum = stepRes.nextAccum;
      if (stepRes.shouldEmit) {
        this.spawnFootstepRipple(this.px, this.pz, this.weaponAccentHex);
      }
    }

    const nearest = this.findNearestEnemy(this.px, this.pz);
    this.runDistSampleTimer += dt;
    if (this.runDistSampleTimer >= 0.5) {
      this.runDistSampleTimer = 0;
      if (nearest && !nearest.isTrainingDummy) {
        this.runDistSum += Math.hypot(nearest.x - this.px, nearest.z - this.pz);
        this.runDistSamples += 1;
      }
    }
    this.updateTargetLockReticle(nearest, dt);

    const onDragon = this.hasDragonRide();
    const mountOffset = this.hero.mountGroup ? 0.68 : 0;

    if (this.dashTimer > 0) {
      for (const urn of this.urns) {
        if (!urn.alive) continue;
        if (Math.hypot(this.px - urn.x, this.pz - urn.z) < urn.radius + 0.65) {
          this.shatterUrn(urn);
        }
      }
    }

    const cloakPose = computeCloakWavePose({
      elapsed: this.elapsed,
      speedMag,
      isDashing: this.dashTimer > 0,
      stridePhase: this.stridePhase,
    });

    const isVanTichHero = false;
    if (isMoving) {
      if (speedMag > 0.3) {
        const moveYaw = Math.atan2(this.pvx, this.pvz);
        this.pFacing = this.lerpAngle(this.pFacing, moveYaw, 1 - Math.exp(-16 * dt));
      }
      this.stridePhase += Math.max(travelDist * 2.55, dt * 1.4);
      if (this.dashTimer <= 0 && !onDragon && speedMag > 1.8) {
        this.footstepStrideAccum += travelDist;
        if (this.footstepStrideAccum >= 1.75) {
          this.footstepStrideAccum = 0;
          soundEngine.playFootstep(computeSpatialPan(this.px, ARENA_HALF_W));
        }
      }
      const strideAmp = Math.min(0.56, 0.2 + (travelDist / Math.max(0.001, dt)) * 0.055);
      const stride = Math.sin(this.stridePhase) * strideAmp;
      this.hero.leftLeg.rotation.x = stride;
      this.hero.rightLeg.rotation.x = -stride;
      if (isVanTichHero && !onDragon && !this.hero.mountGroup) {
        this.hero.bodyGroup.position.y = mountOffset + 0.055 + Math.sin(this.elapsed * 6.2) * 0.025;
        this.hero.bodyGroup.rotation.x = THREE.MathUtils.damp(
          this.hero.bodyGroup.rotation.x,
          this.dashTimer > 0 ? 0.26 : 0.11,
          14,
          dt
        );
      } else {
        this.hero.bodyGroup.position.y = mountOffset + Math.abs(Math.sin(this.stridePhase)) * 0.085;
        this.hero.bodyGroup.rotation.x = this.dashTimer > 0 ? 0.32 : 0.1;
      }
      if (this.hero.mountLegs && !onDragon) {
        this.hero.mountLegs.forEach((leg, lIdx) => {
          const phaseOffset = lIdx === 0 || lIdx === 3 ? 0 : Math.PI;
          leg.rotation.x = Math.sin(this.stridePhase * 1.15 + phaseOffset) * 0.58;
        });
      }
    } else {
      this.footstepStrideAccum = 0;
      this.hero.leftLeg.rotation.x = THREE.MathUtils.damp(this.hero.leftLeg.rotation.x, 0, 14, dt);
      this.hero.rightLeg.rotation.x = THREE.MathUtils.damp(this.hero.rightLeg.rotation.x, 0, 14, dt);
      const idleTargetY = isVanTichHero && !onDragon && !this.hero.mountGroup
        ? mountOffset + 0.03 + Math.sin(this.elapsed * 2.2) * 0.018
        : mountOffset;
      this.hero.bodyGroup.position.y = THREE.MathUtils.damp(this.hero.bodyGroup.position.y, idleTargetY, 14, dt);
      this.hero.bodyGroup.rotation.x = THREE.MathUtils.damp(this.hero.bodyGroup.rotation.x, 0, 14, dt);
      if (this.hero.mountLegs && !onDragon) {
        this.hero.mountLegs.forEach((leg) => {
          leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, 0, 12, dt);
        });
      }

      if (nearest) {
        const aimYaw = Math.atan2(nearest.x - this.px, nearest.z - this.pz);
        this.pFacing = this.lerpAngle(this.pFacing, aimYaw, 1 - Math.exp(-22 * dt));
      }
    }
    const deltaFacing = ((this.pFacing - this.prevHeroFacing + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const heroTurnRate = deltaFacing / Math.max(0.001, dt);
    this.prevHeroFacing = this.pFacing;
    const targetBodyBankZ = isVanTichHero && isMoving && !onDragon && !this.hero.mountGroup
      ? THREE.MathUtils.clamp(-heroTurnRate * 0.045, -0.22, 0.22)
      : 0;
    this.hero.bodyGroup.rotation.z = THREE.MathUtils.damp(this.hero.bodyGroup.rotation.z, targetBodyBankZ, 12, dt);
    this.hero.capeTail.rotation.x = THREE.MathUtils.damp(this.hero.capeTail.rotation.x, cloakPose.rotX, 14, dt);
    this.hero.capeTail.rotation.z = THREE.MathUtils.damp(this.hero.capeTail.rotation.z, cloakPose.rotZ, 14, dt);
    this.hero.capeTail.scale.z = THREE.MathUtils.damp(this.hero.capeTail.scale.z, cloakPose.scaleZ, 12, dt);

    // Subtle volume-preserving squash-and-stretch on dash takeoff and shot release
    this.heroSquashY = THREE.MathUtils.damp(this.heroSquashY, 1, 14, dt);
    if (!onDragon && Math.abs(this.heroSquashY - 1) > 0.002) {
      const xzScale = 1 / Math.sqrt(Math.max(0.7, this.heroSquashY));
      this.hero.bodyGroup.scale.set(xzScale, this.heroSquashY, xzScale);
    } else {
      this.hero.bodyGroup.scale.set(1, 1, 1);
    }

    const combatTurnBank = THREE.MathUtils.clamp(-heroTurnRate * 0.08, -0.38, 0.38);
    if (onDragon) {
      const travelSpeed = travelDist / dt;
      this.hero.bodyGroup.position.y = this.updateDragonRide(dt, travelSpeed, this.dashTimer > 0, {
        mode: 'combat',
        bankAngle: combatTurnBank,
        celebrating: this.phase === GamePhase.VICTORY,
      });
      this.hero.bodyGroup.rotation.x = travelSpeed > 0.3 ? 0.07 : 0;
    } else if (this.hero.mountGroup) {
      // AAA Wave 6: Mount banking tilt on turns + subtle shock-trail accent on fast sprint/dash
      const targetYaw = speedMag > 0.3 ? Math.atan2(this.pvx, this.pvz) : this.pFacing;
      const bankPose = computeMountBankTilt(
        this.pFacing,
        targetYaw,
        speedMag,
        this.dashTimer > 0,
        dt,
        this.mountBankTiltZ
      );
      this.mountBankTiltZ = bankPose.tiltZ;
      this.hero.mountGroup.rotation.z = bankPose.tiltZ;
      this.hero.mountGroup.rotation.x = THREE.MathUtils.damp(
        this.hero.mountGroup.rotation.x,
        bankPose.pitchX,
        12,
        dt
      );
      if (isMoving && speedMag > 4.2) {
        this.mountTrailTimer -= dt;
        if (this.mountTrailTimer <= 0) {
          this.mountTrailTimer = this.dashTimer > 0 ? 0.065 : 0.19;
          this.spawnDashScorch(this.px, this.pz, this.pFacing, this.weaponAccentHex);
        }
      }
    }

    if (this.hero.weaponAuraGroup) {
      this.hero.weaponAuraGroup.rotation.z += dt * 2.2;
      this.hero.weaponAuraGroup.rotation.y += dt * 1.25;
    }
    if (this.hero.artifactGroup) {
      if (this.solarLeoArtifactRig?.group.parent === this.hero.artifactGroup) {
        this.hero.artifactGroup.rotation.y = 0;
        this.hero.artifactGroup.position.set(
          SOLAR_LEO_ARTIFACT_OFFSET.x,
          SOLAR_LEO_ARTIFACT_OFFSET.y,
          SOLAR_LEO_ARTIFACT_OFFSET.z
        );
        updateSolarLeoArtifactPose(this.solarLeoArtifactRig, this.elapsed, dt, {
          mode: 'combat',
          speed: speedMag,
          bankAngle: combatTurnBank,
          dashing: this.dashTimer > 0,
          energyBurst: this.solarLeoUltBurst,
          celebrating: this.phase === GamePhase.VICTORY,
        });
      } else {
        this.hero.artifactGroup.rotation.y += dt * 1.65;
        this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 3.1) * 0.08;
      }
    }
    if (this.hero.haloGroup) {
      if (this.solarLeoHaloRig?.group.parent === this.hero.haloGroup) {
        this.hero.haloGroup.rotation.z = 0;
        this.hero.haloGroup.position.y = 1.34;
        updateSolarLeoHaloPose(this.solarLeoHaloRig, this.elapsed, dt, {
          mode: 'combat',
          speed: speedMag,
          dashing: this.dashTimer > 0,
          ultBurst: this.solarLeoUltBurst,
          celebrating: this.phase === GamePhase.VICTORY,
        });
      } else {
        this.hero.haloGroup.rotation.z += dt * 1.35;
        this.hero.haloGroup.position.y = 1.34 + Math.sin(this.elapsed * 2.8) * 0.045;
      }
    }

    if (this.solarLeoWingRig && this.solarLeoWingRig.group.parent === this.hero.wingGroup) {
      updateSolarLeoWingsPose(
        this.solarLeoWingRig,
        this.elapsed,
        dt,
        speedMag,
        this.dashTimer > 0,
        this.solarLeoUltBurst,
        {
          mode: 'combat',
          bankAngle: combatTurnBank,
          celebrating: this.phase === GamePhase.VICTORY,
        }
      );
    } else if (this.hero.leftWingPivot && this.hero.rightWingPivot) {
      const flapSpeed = isMoving ? 8.5 : 3.6;
      const flapAmp = isMoving ? 0.34 : 0.18;
      const flap = Math.sin(this.elapsed * flapSpeed) * flapAmp;
      this.hero.leftWingPivot.rotation.y = 0.25 + flap;
      this.hero.rightWingPivot.rotation.y = -0.25 - flap;
    }

    this.hero.root.position.set(this.px, 0, this.pz);
    this.hero.root.rotation.y = this.pFacing;
    this.heroShadow.position.set(this.px, 0.02, this.pz);
    this.heroLight.position.set(this.px, 2.2, this.pz);
    if (this.heroLightPulse > 0) {
      this.heroLightPulse = Math.max(0, this.heroLightPulse - dt);
      this.heroLight.intensity = 1.2 + this.heroLightPulse * 3.2;
    } else if (this.heroLight.intensity !== 1.2) {
      this.heroLight.intensity = 1.2;
    }

    this.heroShieldMesh.visible = this.shield > 0;
    if (this.shield > 0) {
      this.heroShieldMesh.rotation.y += dt * 1.1;
    }

    const flash = this.hitFlashTimer > 0;
    for (const m of this.hero.hitMeshes) {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(flash ? 0xff2222 : 0x000000);
      mat.emissiveIntensity = flash ? 0.9 : 0;
    }

    const entranceLocked = this.isBossEntranceLocked();
    if (nearest && nearest.spawnTimer <= 0 && !entranceLocked) {
      if (nearest.id !== this.lockedTargetId) {
        this.lockedTargetId = nearest.id;
        this.reticleSnapScale = 1.48;
        if (nearest.isBoss || nearest.isElite) {
          soundEngine.playTargetLockTick(true);
        }
      }
      this.reticleSnapScale = THREE.MathUtils.damp(this.reticleSnapScale, 1, 12, dt);
      this.reticleMesh.visible = true;
      this.reticleMesh.position.set(nearest.x, 0.04, nearest.z);
      this.reticleMesh.rotation.z += dt * (nearest.isBoss ? 2.8 : 2.1);
      const pulse = 1 + Math.sin(this.elapsed * 6.5) * 0.055;
      const rScale = (nearest.isBoss ? 1.75 : nearest.isElite ? 1.28 : 1.05) * this.reticleSnapScale * pulse;
      this.reticleMesh.scale.setScalar(rScale);
      const rMat = this.reticleMesh.material as THREE.MeshBasicMaterial;
      rMat.color.setHex(nearest.isBoss ? 0xf43f5e : nearest.isElite ? 0xc084fc : 0xfde047);
    } else {
      this.lockedTargetId = -1;
      this.reticleMesh.visible = false;
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const speedBonus =
      (1 +
        (this.activeSkills.aspd_boost ?? 0) * 0.24 +
        (this.activeSkills.power_trio ?? 0) * 0.2 +
        (this.alexAspdBuffTimer > 0 ? 0.15 : 0) +
        (this.alexCadenceTimer > 0 ? 0.28 : 0) +
        (this.alexOverdriveTimer > 0 ? 0.45 : 0) +
        (this.activeRoomChaosEvent?.id === 'wind_frenzy' ? 0.35 : 0)) *
      this.weaponOverdriveBuffs.aspdMult;
    const baseAttackInterval = Math.max(
      0.13,
      0.56 / (this.baseStats.attackSpeedMult * speedBonus)
    );
    const attackInterval = baseAttackInterval * resolveMoveShootIntervalMult(isMoving);

    const canFire = canPlayerExecuteAttack({
      isPlaying: this.phase === GamePhase.PLAYING,
      bossEntranceRemainingSec: this.bossEntranceTimer,
      isDashing: this.dashTimer > 0,
    });
    const aimingBow = canFire && nearest !== null && nearest.spawnTimer <= 0;
    let drawProgress = 0;
    const stringPose = computeBowStringPose(aimingBow ? drawProgress : 0);
    if (aimingBow) {
      if (this.attackCooldown <= 0) {
        this.attackCooldown = attackInterval;
        this.queuePlayerVolley();
      }
      drawProgress = Math.max(0, 1 - this.attackCooldown / attackInterval);
      if (drawProgress > 0.25 && drawProgress < 0.72 && this.bowCreakReady) {
        this.bowCreakReady = false;
        soundEngine.playBowDrawCreak(computeSpatialPan(this.px, ARENA_HALF_W));
      } else if (drawProgress < 0.15) {
        this.bowCreakReady = true;
      }
      const livePose = computeBowStringPose(drawProgress);
      this.hero.nockedArrow.position.z = livePose.nockZ;
      this.hero.drawArm.position.z = 0.08 - drawProgress * 0.16;
      this.hero.bowGroup.position.z = 0.46 - drawProgress * 0.04;
      if (this.hero.bowStringTop && this.hero.bowStringBottom) {
        this.hero.bowStringTop.position.set(0, livePose.topPosY, livePose.topPosZ);
        this.hero.bowStringTop.rotation.x = livePose.topRotX;
        this.hero.bowStringTop.scale.set(1, livePose.segmentScaleY, 1);
        this.hero.bowStringBottom.position.set(0, livePose.bottomPosY, livePose.bottomPosZ);
        this.hero.bowStringBottom.rotation.x = livePose.bottomRotX;
        this.hero.bowStringBottom.scale.set(1, livePose.segmentScaleY, 1);
      }
      if (this.hero.nockedArrowTipMat) {
        const tipHex =
          (this.activeSkills.fire_arrow ?? 0) > 0 || (this.activeSkills.super_blaze ?? 0) > 0
            ? 0xf97316
            : (this.activeSkills.ice_arrow ?? 0) > 0 || (this.activeSkills.super_freeze ?? 0) > 0
            ? 0x38bdf8
            : (this.activeSkills.lightning_arrow ?? 0) > 0 || (this.activeSkills.super_bolt ?? 0) > 0
            ? 0xc084fc
            : (this.activeSkills.venom_arrow ?? 0) > 0
            ? 0x4ade80
            : this.weaponAccentHex;
        this.hero.nockedArrowTipMat.color.setHex(tipHex);
        this.hero.nockedArrowTipMat.emissive.setHex(tipHex);
        this.hero.nockedArrowTipMat.emissiveIntensity = livePose.tipEmissiveIntensity;
      }
      if (this.aimLineMesh && nearest) {
        const sight = computeAimSightlineTransform(
          this.px,
          this.pz,
          nearest.x,
          nearest.z,
          drawProgress
        );
        this.aimLineMesh.visible = sight.visible;
        if (sight.visible) {
          this.aimLineMesh.position.set(sight.midX, 0.048, sight.midZ);
          this.aimLineMesh.rotation.y = sight.yaw;
          this.aimLineMesh.scale.set(1 + drawProgress * 0.55, 1, sight.length);
          const aMat = this.aimLineMesh.material as THREE.MeshBasicMaterial;
          aMat.color.setHex(
            nearest.isBoss ? 0xf43f5e : nearest.isElite ? 0xc084fc : this.weaponAccentHex
          );
          aMat.opacity = sight.opacity;
        }
      }
    } else {
      this.bowCreakReady = true;
      this.hero.nockedArrow.position.z = 0.1;
      this.hero.drawArm.position.z = 0.06;
      this.hero.bowGroup.position.z = 0.46;
      if (this.hero.bowStringTop && this.hero.bowStringBottom) {
        this.hero.bowStringTop.position.set(0, stringPose.topPosY, stringPose.topPosZ);
        this.hero.bowStringTop.rotation.x = 0;
        this.hero.bowStringTop.scale.set(1, 1, 1);
        this.hero.bowStringBottom.position.set(0, stringPose.bottomPosY, stringPose.bottomPosZ);
        this.hero.bowStringBottom.rotation.x = 0;
        this.hero.bowStringBottom.scale.set(1, 1, 1);
      }
      if (this.hero.nockedArrowTipMat) {
        this.hero.nockedArrowTipMat.emissiveIntensity = 0.85;
      }
      if (this.aimLineMesh) this.aimLineMesh.visible = false;
    }

    // AAA Wave 6: Step Astral Overcharge gauge & update diegetic 3D Bow Charge Halo
    const ocStep = stepAstralOvercharge(
      this.astralOvercharge,
      dt,
      isMoving,
      aimingBow,
      nearest !== null && nearest.spawnTimer <= 0
    );
    this.astralOvercharge = ocStep.charge;
    if (ocStep.justCharged) {
      soundEngine.playOverchargeReady();
      soundEngine.playOverchargeFullLock();
      this.spawnParticles(this.px, 1.15, this.pz, 0xfde047, 8);
    }
    if (this.overchargeRingGroup && this.overchargeRingOuter && this.overchargeRingInner) {
      if (this.overchargeRingGroup.parent !== this.hero.bowGroup) {
        this.hero.bowGroup.add(this.overchargeRingGroup);
      }
      const showHalo = this.phase === GamePhase.PLAYING && this.astralOvercharge > 0.12;
      this.overchargeRingGroup.visible = showHalo;
      if (showHalo) {
        const pulse = ocStep.ready ? 1 + Math.sin(this.elapsed * 11) * 0.09 : 1;
        this.overchargeRingGroup.scale.setScalar(ocStep.ringScale * pulse);
        this.overchargeRingOuter.rotation.z += dt * (ocStep.ready ? 4.8 : 2.2);
        this.overchargeRingInner.rotation.z -= dt * (ocStep.ready ? 6.4 : 3.1);
        const outerMat = this.overchargeRingOuter.material as THREE.MeshBasicMaterial;
        outerMat.color.setHex(ocStep.ringColorHex);
        outerMat.opacity = ocStep.ringOpacity * 0.82;
        const innerMat = this.overchargeRingInner.material as THREE.MeshBasicMaterial;
        innerMat.color.setHex(ocStep.ready ? 0xfffbeb : 0xfde047);
        innerMat.opacity = (ocStep.ready ? 0.8 : ocStep.ringOpacity * 0.62);
      }
    }

    this.solarLeoShootRecoil = Math.max(0, this.solarLeoShootRecoil - dt * 5.2);
    this.solarLeoUltBurst = Math.max(0, this.solarLeoUltBurst - dt * 1.15);

    if (this.artemisModel?.parent === this.hero.bodyGroup) {
      this.hero.nockedArrow.visible = aimingBow;
      const seated = onDragon ||
        (this.artemisLoadedAsset === 'heroes/van-tich.glb' && Boolean(this.hero.mountGroup));
      this.artemisMotion?.update(
        dt,
        this.elapsed,
        isMoving && !seated ? 1 : 0,
        aimingBow,
        drawProgress,
        this.hero.bowGroup,
        seated,
        this.dashTimer > 0,
        heroTurnRate,
        'combat',
        false
      );
    } else if (this.solarLeoHeroRig?.group.parent === this.hero.bodyGroup) {
      this.hero.bowGroup.visible = false;
      updateSolarLeoHumanoidPose(this.solarLeoHeroRig, {
        elapsed: this.elapsed,
        dt,
        speed: speedMag,
        shooting: aimingBow,
        shootRecoil: Math.max(this.solarLeoShootRecoil, drawProgress * 0.55),
        dashing: this.dashTimer > 0,
        riding: onDragon || Boolean(this.hero.mountGroup),
        ultBurst: this.solarLeoUltBurst,
        mode: 'combat',
        celebrating: false,
      });
    }

    if (onDragon) this.alignMountedRider();

    if (entranceLocked) {
      this.volleyQueue.length = 0;
    } else if (this.volleyQueue.length > 0 && nearest) {
      const drained = drainReadyVolleyShots(this.volleyQueue, dt);
      this.volleyQueue = drained.remaining;
      for (let i = 0; i < drained.ready.length; i++) {
        const item = drained.ready[i];
        const aimYaw = Math.atan2(nearest.x - this.px, nearest.z - this.pz);
        this.firePlayerArrow(
          aimYaw + item.angleOffset + (item.backward ? Math.PI : 0),
          item.lateral ?? 0,
          false,
          'basic',
          item.isPrimary
        );
      }
    }
  }

  private queuePlayerVolley(): void {
    const entries = buildPlayerVolley(this.activeSkills);
    for (let i = 0; i < entries.length; i++) {
      this.volleyQueue.push(entries[i]);
    }

    const beatRes = advanceComboBeat(this.comboBeat);
    this.comboBeat = beatRes.nextBeat;
    this.pendingBeatMult = beatRes.damageMult;
    this.pendingBeatIsFinisher = beatRes.isFinisher;

    // Atreus every 4th shot bonus piercing wave trigger handled on arrow launch
    this.atreusShotCount++;
    if (this.solarLeoHeroRig?.group.parent === this.hero.bodyGroup) {
      this.solarLeoShootRecoil = 1.0;
    }
  }

  private firePlayerArrow(
    yaw: number,
    lateralOffset = 0,
    bonusShadow = false,
    dmgSource: 'basic' | 'ultimate' | 'pet' | 'elemental' = 'basic',
    isPrimary = false,
    isChainShot = false
  ): void {
    const proj = this.arrowPool.find((p) => !p.active);
    if (!proj) return;

    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const perpX = dirZ;
    const perpZ = -dirX;

    const rawDamage = this.baseStats.attack * this.getCurrentAtkMultiplier();

    const blaze =
      (this.activeSkills.fire_arrow ?? 0) > 0 ||
      (this.activeSkills.super_blaze ?? 0) > 0;
    const frost =
      (this.activeSkills.ice_arrow ?? 0) > 0 ||
      (this.activeSkills.super_freeze ?? 0) > 0;
    const storm =
      (this.activeSkills.lightning_arrow ?? 0) > 0 ||
      (this.activeSkills.super_bolt ?? 0) > 0;
    const poison = (this.activeSkills.venom_arrow ?? 0) > 0;

    const isAtreusOrb = bonusShadow;

    const wave6Counter =
      isPrimary && dmgSource === 'basic'
        ? consumePerfectDodgeCounterShot(this.perfectDodgeCounter)
        : { empowered: false, damageMult: 1, guaranteedCrit: false, piercing: false };

    const enhancement = resolvePrimaryArrowEnhancement({
      isPrimary,
      dmgSource,
      counterShotTimer: wave6Counter.empowered ? 0 : this.counterShotTimer,
      astralOvercharge: this.astralOvercharge,
    });
    const isCounterShot = wave6Counter.empowered || enhancement.isCounterShot;
    const isOvercharge = !wave6Counter.empowered && enhancement.isOvercharge;
    this.counterShotTimer = wave6Counter.empowered
      ? this.perfectDodgeCounter.windowRemainingSec
      : enhancement.nextCounterShotTimer;
    this.astralOvercharge = enhancement.nextAstralOvercharge;

    if (isCounterShot) {
      const weaponSig = getWeaponKineticSignature(this.baseStats.weaponArchetype);
      this.counterShotsCount += 1;
      if (wave6Counter.empowered) {
        soundEngine.playPerfectDodgeCounter();
      } else {
        soundEngine.playCounterShotRelease();
      }
      triggerHapticPulse('crit', this.hapticsEnabled);
      triggerDeterministicHitStop(this.kinestheticsClock, weaponSig.hitstopTicks);
      this.shakeIntensity = Math.max(this.shakeIntensity, weaponSig.recoilKick * 1.35);
      this.spawnShockwave(this.px, this.pz, 0xfde047, 3.0, 0.28);
      this.spawnShockwave(this.px, this.pz, weaponSig.impactHex, 2.0, 0.24);
      this.spawnParticles(this.px, 1.05, this.pz, weaponSig.impactHex, weaponSig.sparkCount + 8);
      this.emitFloatingNumber(
        this.px,
        2.15,
        this.pz,
        0,
        true,
        false,
        undefined,
        wave6Counter.empowered ? 'PHẢN KÍCH HOÀNG KIM!' : 'PHẢN TIỄN TINH QUANG!'
      );
      this.triggerCompanionSynergyStrike();
    } else if (isOvercharge) {
      const weaponSig = getWeaponKineticSignature(this.baseStats.weaponArchetype);
      soundEngine.playOverchargeRelease(computeSpatialPan(this.px, ARENA_HALF_W));
      triggerHapticPulse('crit', this.hapticsEnabled);
      this.shakeIntensity = Math.max(this.shakeIntensity, weaponSig.recoilKick);
      this.spawnShockwave(this.px, this.pz, 0x38bdf8, 1.85, 0.22);
      this.spawnParticles(this.px, 1.05, this.pz, weaponSig.impactHex, weaponSig.sparkCount + 3);
      this.heroSquashY = Math.min(this.heroSquashY, 0.9);
      this.heroLightPulse = Math.max(this.heroLightPulse, 0.34);
    }

    let comboBeatMult = 1.0;
    let isComboFinisher = false;
    if (isPrimary && dmgSource === 'basic' && !isChainShot) {
      comboBeatMult = this.pendingBeatMult;
      isComboFinisher = this.pendingBeatIsFinisher;
      this.pendingBeatMult = 1.0;
      this.pendingBeatIsFinisher = false;
      if (isComboFinisher) {
        this.cameraFovOffset = -2.2;
        soundEngine.playComboFinisherShot(computeSpatialPan(this.px, ARENA_HALF_W));
        this.spawnShockwave(this.px, this.pz, 0x38bdf8, 2.35, 0.24);
      }
    }

    proj.active = true;
    proj.isEnemy = false;
    proj.isSword = false;
    proj.isCounterShot = isCounterShot;
    proj.isOvercharge = isOvercharge;
    proj.isComboFinisher = isComboFinisher;
    proj.isChainShot = isChainShot;
    proj.source = dmgSource;
    proj.coopAllyIndex = undefined;
    proj.homing =
      isCounterShot ||
      this.baseStats.innateHoming ||
      (this.activeSkills.tracking_eye ?? 0) > 0 ||
      this.baseStats.weaponArchetype === 'staff';
    proj.x = this.px + dirX * 0.65 + perpX * lateralOffset;
    proj.y = 1.02;
    proj.z = this.pz + dirZ * 0.65 + perpZ * lateralOffset;
    const hasPiercingVolley = evaluateActiveSynergies(this.activeSkills).includes('piercing_volley');
    const finalArrowSpeed =
      this.baseStats.arrowSpeed *
      (hasPiercingVolley ? 1.15 : 1.0) *
      (isCounterShot ? 1.38 : isOvercharge ? 1.24 : isComboFinisher ? 1.18 : 1.0);
    proj.vx = dirX * finalArrowSpeed;
    proj.vz = dirZ * finalArrowSpeed;
    proj.damage =
      (isAtreusOrb ? rawDamage * 1.15 : rawDamage) *
      (isChainShot ? 0.55 : comboBeatMult) *
      (wave6Counter.empowered
        ? wave6Counter.damageMult
        : isCounterShot
        ? 1.35
        : isOvercharge
        ? 1.22
        : 1.0);
    proj.radius = isCounterShot
      ? 0.46
      : isOvercharge || isComboFinisher
      ? 0.4
      : this.baseStats.weaponArchetype === 'claw'
      ? 0.45
      : 0.3;
    proj.life = 2.2;
    proj.pierceLeft =
      (this.activeSkills.pierce ?? 0) * 2 +
      (this.baseStats.innatePierce ? 2 : 0) +
      (this.baseStats.weaponArchetype === 'claw' ? 1 : 0) +
      (isAtreusOrb ? 3 : 0) +
      (wave6Counter.piercing ? 3 : isCounterShot ? 2 : 0) +
      (isOvercharge ? 2 : isComboFinisher ? 1 : 0);
    proj.ricochetLeft = (this.activeSkills.ricochet ?? 0) * 2;
    proj.wallBounceLeft = (this.activeSkills.bouncy_wall ?? 0) * 2;
    proj.hitEnemyIds.clear();
    proj.blaze = blaze;
    proj.frost = frost;
    proj.storm = storm;
    proj.poison = poison;

    const isVanTich = false;
    const mat = proj.mesh.material as THREE.MeshStandardMaterial;
    const color = isCounterShot
      ? 0xfde047
      : isOvercharge
      ? 0xfef08a
      : isAtreusOrb
      ? 0xf43f5e
      : blaze
      ? 0xf97316
      : frost
      ? 0x67e8f9
      : storm
      ? 0xa78bfa
      : poison
      ? 0x4ade80
      : isVanTich
      ? isComboFinisher
        ? 0x99f6e4
        : 0x5eead4
      : this.weaponAccentHex;
    mat.color.setHex(color);
    mat.emissive.setHex(color);
    if (proj.trailMesh) {
      const trailMat = proj.trailMesh.material as THREE.MeshBasicMaterial;
      trailMat.color.setHex(isOvercharge ? 0x67e8f9 : isVanTich ? 0x2dd4bf : color);
      const isCharged =
        isCounterShot ||
        isOvercharge ||
        dmgSource === 'ultimate' ||
        blaze ||
        frost ||
        storm ||
        hasPiercingVolley;
      trailMat.opacity = isCounterShot
        ? 0.94
        : isOvercharge
        ? 0.92
        : dmgSource === 'ultimate'
        ? 0.88
        : isCharged
        ? 0.78
        : 0.64;
      const trailWidth = isCounterShot
        ? 1.65
        : isOvercharge
        ? 1.55
        : dmgSource === 'ultimate'
        ? 1.5
        : isCharged
        ? 1.28
        : 1.08;
      const trailLen = Math.min(
        2.5,
        Math.max(
          1.15,
          (finalArrowSpeed / 20) * (isCounterShot ? 1.62 : isOvercharge ? 1.56 : isCharged ? 1.42 : 1.18)
        )
      );
      proj.trailMesh.scale.set(trailWidth, trailWidth, trailLen);
      proj.trailMesh.visible = true;
    }

    if (proj.compassGroup) {
      proj.compassGroup.visible = isVanTich;
      if (isVanTich) {
        proj.compassGroup.rotation.y = 0;
        const cRingMesh = proj.compassGroup.children[0] as THREE.Mesh | undefined;
        const cStarMesh = proj.compassGroup.children[1] as THREE.Mesh | undefined;
        if (cRingMesh) {
          (cRingMesh.material as THREE.MeshBasicMaterial).color.setHex(
            isCounterShot ? 0xfde047 : isOvercharge ? 0x99f6e4 : color
          );
        }
        if (cStarMesh) {
          (cStarMesh.material as THREE.MeshBasicMaterial).color.setHex(
            isCounterShot ? 0xfef08a : 0xe0f2fe
          );
        }
      }
    }

    if (isCounterShot) {
      proj.mesh.scale.set(1.52, 1.52, 1.82);
    } else if (isOvercharge) {
      proj.mesh.scale.set(1.38, 1.38, 1.72);
    } else if (isVanTich) {
      proj.mesh.scale.set(1.15, 0.72, 1.05);
    } else if (this.baseStats.weaponArchetype === 'claw') {
      proj.mesh.scale.set(1.85, 0.58, 1.15);
    } else if (this.baseStats.weaponArchetype === 'staff') {
      proj.mesh.scale.set(1.4, 1.4, 1.1);
    } else {
      proj.mesh.scale.set(1.05, 1.05, 1.35);
    }

    proj.mesh.position.set(proj.x, proj.y, proj.z);
    proj.mesh.rotation.set(0, yaw, 0);
    proj.mesh.visible = true;

    if (dmgSource === 'basic' && Math.abs(lateralOffset) < 0.05) {
      this.spawnParticles(proj.x, proj.y, proj.z, color, 3);
      this.heroLightPulse = Math.max(this.heroLightPulse, 0.18);
      this.heroSquashY = Math.min(this.heroSquashY, 0.94);
    }

    if (isVanTich) {
      soundEngine.playVanTichCompassShot(
        0.95 + Math.random() * 0.14,
        computeSpatialPan(this.px, ARENA_HALF_W)
      );
    } else {
      soundEngine.playBowShoot(
        0.95 + Math.random() * 0.12,
        computeSpatialPan(this.px, ARENA_HALF_W)
      );
    }

    if (isComboFinisher && !isChainShot) {
      for (const offset of [-0.14, 0.14]) {
        this.firePlayerArrow(yaw + offset, lateralOffset, false, 'basic', false, true);
      }
    }
  }

  private updateRoomChaosEvent(dt: number): void {
    const evt = this.activeRoomChaosEvent;
    if (!evt || this.portalOpen || this.isBossEntranceLocked()) return;
    const live = this.enemies.filter((en) => !en.dead && en.spawnTimer <= 0 && !en.isBossTotem);
    if (live.length === 0) return;
    this.roomChaosTimer -= dt;
    if (this.roomChaosTimer > 0) return;

    if (evt.id === 'chaos_lightning') {
      this.roomChaosTimer = 3.2;
      const strikes = Math.min(2, live.length);
      for (let s = 0; s < strikes; s++) {
        const pool = live.filter((en) => !en.dead);
        if (pool.length === 0) break;
        const target = pool[Math.floor(Math.random() * pool.length)];
        if (!target || target.dead) continue;
        this.spawnLightningArc(target.x, 8.5, target.z, target.x, 0.4, target.z);
        this.spawnShockwave(target.x, target.z, 0x38bdf8, 2.8, 0.28);
        const dmg = Math.max(12, Math.round(this.baseStats.attack * 1.45));
        if (!target.isBoss && !target.isTrainingDummy) {
          target.stunTimer = Math.max(target.stunTimer ?? 0, 0.55);
        }
        this.damageEnemy(
          target,
          dmg,
          true,
          false,
          false,
          true,
          false,
          'SÉT HỖN MANG!',
          'elemental',
          undefined,
          { bypassShield: true }
        );
      }
    } else if (evt.id === 'gold_meteor_shower') {
      this.roomChaosTimer = 3.6;
      const target = live[Math.floor(Math.random() * live.length)];
      if (target && !target.dead) {
        this.spawnMeteor(target.x, target.z, false);
        this.spawnLootOrb(target.x, target.z, 'gold', Math.max(6, Math.round(10 * this.baseStats.goldGainMult)));
      }
    }
  }

  private updatePassivesAndPeriodicSkills(dt: number): void {
    if (this.isBossEntranceLocked()) return;
    const liveEnemies = this.enemies.filter((e) => e.spawnTimer <= 0);
    if (liveEnemies.length === 0) return;

    // 1. Artemis Silvermoon Falcon Strike on marked enemies
    if (this.baseStats.heroId === 'artemis' && this.markedEnemyIds.size > 0) {
      this.artemisMarkTimer += dt;
      if (this.artemisMarkTimer >= 2.4) {
        this.artemisMarkTimer = 0;
        const target = liveEnemies.find((e) => this.markedEnemyIds.has(e.id));
        if (target) {
          const beamDmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * 1.6;
          this.spawnLightningArc(target.x, 7.5, target.z, target.x, 0.4, target.z);
          this.spawnParticles(target.x, 1.2, target.z, 0x10b981, 14);
          this.damageEnemy(target, beamDmg, true, false, false, false, false, 'NGUYỆT TRẢM!');
        }
      }
    }

    // 2. Flying Swords / Sword of Time (+ Homing Blades Synergy)
    const swordStacks = (this.activeSkills.flying_swords ?? 0) + (this.hasRune('sword_of_time') ? 1 : 0);
    if (swordStacks > 0) {
      const hasHomingBlades = evaluateActiveSynergies(this.activeSkills).includes('homing_blades');
      this.swordStrikeTimer += dt;
      const baseInterval = this.hasRune('sword_of_time') ? 1.45 : 1.7;
      const interval = hasHomingBlades ? baseInterval * 0.8 : baseInterval;
      if (this.swordStrikeTimer >= interval) {
        this.swordStrikeTimer = 0;
        const twinMult = (this.activeSkills.twin_strike ?? 0) > 0 ? 2 : 1;
        const count = Math.min(6, swordStacks * twinMult);
        soundEngine.playSwordStrike();
        for (let i = 0; i < count; i++) {
          const target = liveEnemies[i % liveEnemies.length];
          const proj = this.arrowPool.find((p) => !p.active);
          if (!proj) break;
          const dx = target.x - this.px;
          const dz = target.z - this.pz;
          const yaw = Math.atan2(dx, dz) + (i - (count - 1) / 2) * 0.14;
          proj.active = true;
          proj.isEnemy = false;
          proj.isSword = true;
          proj.source = 'elemental';
          proj.coopAllyIndex = undefined;
          proj.homing = true;
          proj.x = this.px + Math.sin(yaw) * 0.7;
          proj.y = 1.25;
          proj.z = this.pz + Math.cos(yaw) * 0.7;
          proj.vx = Math.sin(yaw) * 26;
          proj.vz = Math.cos(yaw) * 26;
          proj.damage =
            this.baseStats.attack *
            this.getCurrentAtkMultiplier() *
            1.22 *
            (hasHomingBlades ? 1.2 : 1.0);
          proj.radius = 0.35;
          proj.life = 1.8;
          proj.pierceLeft = 1;
          proj.ricochetLeft = 0;
          proj.wallBounceLeft = 0;
          proj.hitEnemyIds.clear();
          proj.blaze = false;
          proj.frost = false;
          proj.storm = false;
          proj.poison = false;
          const mat = proj.mesh.material as THREE.MeshStandardMaterial;
          mat.color.setHex(0x22d3ee);
          mat.emissive.setHex(0x06b6d4);
          if (proj.compassGroup) proj.compassGroup.visible = false;
          proj.mesh.scale.set(0.85, 0.85, 1.8);
          proj.mesh.position.set(proj.x, proj.y, proj.z);
          proj.mesh.rotation.set(0, yaw, 0);
          proj.mesh.visible = true;
        }
      }
    }

    // 3. Super Meteor / Meteor Shower / Star of Fury rune
    const meteorLevel =
      (this.activeSkills.meteor_shower ?? 0) +
      (this.activeSkills.super_meteor ?? 0) * 2 +
      (this.hasRune('star_of_fury') && this.hp < this.maxHp * 0.6 ? 1 : 0);
    if (meteorLevel > 0) {
      this.meteorTimer += dt;
      const interval = Math.max(1.1, 2.8 - meteorLevel * 0.4);
      if (this.meteorTimer >= interval) {
        this.meteorTimer = 0;
        const target = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
        this.spawnMeteor(target.x, target.z, false);
      }
    }

    // 4. Arrow Rain Rune
    if (this.hasRune('arrow_rain')) {
      this.arrowRainTimer += dt;
      if (this.arrowRainTimer >= 3.0) {
        this.arrowRainTimer = 0;
        const target = liveEnemies[0];
        const yaw = Math.atan2(target.x - this.px, target.z - this.pz);
        for (let k = -1; k <= 1; k++) {
          this.firePlayerArrow(yaw + k * 0.18, k * 0.2, false, 'elemental');
        }
      }
    }
  }

  private spawnMeteor(tx: number, tz: number, isFrost: boolean): void {
    const m = this.meteorPool.find((x) => !x.active);
    if (!m) return;
    const isGiant = this.hasRune('giant_meteor');
    const hasInfernoMeteor = evaluateActiveSynergies(this.activeSkills).includes('inferno_meteor');
    const radius = (isGiant ? 3.2 : 2.3) * (hasInfernoMeteor ? 1.25 : 1.0);
    const mult = (isFrost ? 1.5 : 1.85) * (isGiant ? 1.6 : 1.0);

    m.active = true;
    m.x = tx;
    m.y = 11.5;
    m.z = tz;
    m.vy = -24;
    m.radius = radius;
    m.damage = this.baseStats.attack * this.getCurrentAtkMultiplier() * mult;
    m.isFrost = isFrost;

    const mat = m.mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(isFrost ? 0x67e8f9 : 0xf97316);
    mat.emissive.setHex(isFrost ? 0x06b6d4 : 0xea580c);
    m.mesh.scale.setScalar(isGiant ? 1.35 : 1.0);
    m.mesh.position.set(tx, m.y, tz);
    m.mesh.visible = true;

    (m.ring.material as THREE.MeshBasicMaterial).color.setHex(isFrost ? 0x22d3ee : 0xf97316);
    m.ring.position.set(tx, 0.05, tz);
    m.ring.scale.setScalar(radius);
    m.ring.visible = true;
  }

  private updateMeteors(dt: number): void {
    for (const m of this.meteorPool) {
      if (!m.active) continue;
      m.y += m.vy * dt;
      m.mesh.position.set(m.x, Math.max(0.3, m.y), m.z);
      m.mesh.rotation.x += dt * 7;
      m.mesh.rotation.z += dt * 5;

      if (m.y <= 0.4) {
        m.active = false;
        m.mesh.visible = false;
        m.ring.visible = false;
        const meteorPan = computeSpatialPan(m.x, ARENA_HALF_W);
        soundEngine.playMeteorImpact(meteorPan);
        soundEngine.playImpactScorchThump(meteorPan);
        this.spawnImpactLight(m.x, 1.35, m.z, m.isFrost ? 'frost' : 'boss_slam');
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        this.spawnShockwave(m.x, m.z, m.isFrost ? 0x67e8f9 : 0xf97316, m.radius * 1.15, 0.4);
        this.spawnImpactDecal(m.x, m.z, m.isFrost ? 0x22d3ee : 0xf97316, m.radius * 0.86, 1.75);
        this.spawnElementalZone(m.x, m.z, m.isFrost ? 'frost' : 'ember', Math.max(2.1, m.radius * 0.92));
        this.spawnParticles(m.x, 0.6, m.z, m.isFrost ? 0x67e8f9 : 0xf97316, 20);

        for (const e of [...this.enemies]) {
          if (!e || e.dead || e.spawnTimer > 0) continue;
          if (Math.hypot(e.x - m.x, e.z - m.z) <= m.radius + e.radius) {
            this.damageEnemy(e, m.damage, true, !m.isFrost, m.isFrost, false, false, undefined, 'elemental');
          }
        }
      }
    }
  }

  private shatterUrn(urn: BreakableUrn): void {
    if (!urn.alive) return;
    urn.alive = false;
    this.releaseObject(urn.mesh);
    this.releaseObject(urn.shadow);
    const urnPan = computeSpatialPan(urn.x, ARENA_HALF_W);
    soundEngine.playUrnShatter(urnPan);
    const fxColor =
      urn.variant === 'heal' ? 0x34d399 : urn.variant === 'ult' ? 0xc084fc : 0xfbbf24;
    this.spawnParticles(urn.x, 0.65, urn.z, fxColor, 18);
    this.spawnShockwave(urn.x, urn.z, fxColor, 2.25, 0.28);
    this.spawnImpactLight(urn.x, 0.9, urn.z, urn.variant === 'heal' ? 'perfect_dodge' : 'crit');

    if (urn.variant === 'heal') {
      const healAmt = Math.max(12, Math.round(this.maxHp * 0.08));
      this.spawnLootOrb(urn.x, urn.z, 'heal', healAmt);
    } else if (urn.variant === 'ult') {
      this.ultCharge = Math.min(100, this.ultCharge + 10);
      this.emitFloatingNumber(urn.x, 1.75, urn.z, 0, true, false, 'storm', '+10% CHIÊU CUỐI!');
    } else {
      this.spawnLootOrb(urn.x, urn.z, 'gold', 14);
    }
  }

  private spawnElementalZone(
    x: number,
    z: number,
    kind: ElementalGroundKind,
    radius = 2.25
  ): void {
    if (!this.elementalZonePool || this.elementalZonePool.length === 0) return;
    let slot = this.elementalZonePool.find((zSlot) => !zSlot.active);
    if (!slot) {
      // Recycle oldest active zone cleanly
      slot = this.elementalZonePool.reduce((oldest, cur) =>
        cur.life < oldest.life ? cur : oldest
      );
    }
    slot.active = true;
    slot.kind = kind;
    slot.x = x;
    slot.z = z;
    slot.radius = radius;
    slot.maxLife = 3.2;
    slot.life = 3.2;
    slot.tickTimer = 0.15;
    slot.baseAtk = this.baseStats.attack * this.getCurrentAtkMultiplier();

    const isEmber = kind === 'ember';
    const dMat = slot.discMesh.material as THREE.MeshBasicMaterial;
    const rMat = slot.ringMesh.material as THREE.MeshBasicMaterial;
    dMat.color.setHex(isEmber ? 0xf97316 : 0x38bdf8);
    rMat.color.setHex(isEmber ? 0xfde047 : 0xa5f3fc);
    dMat.opacity = 0.24;
    rMat.opacity = 0.65;

    slot.discMesh.position.set(x, 0.032, z);
    slot.discMesh.scale.setScalar(radius);
    slot.discMesh.visible = true;
    slot.ringMesh.position.set(x, 0.036, z);
    slot.ringMesh.scale.setScalar(radius);
    slot.ringMesh.visible = true;
  }

  private updateElementalZones(dt: number): void {
    if (!this.elementalZonePool) return;
    for (const zone of this.elementalZonePool) {
      if (!zone.active) continue;
      zone.life -= dt;
      if (zone.life <= 0) {
        zone.active = false;
        zone.discMesh.visible = false;
        zone.ringMesh.visible = false;
        continue;
      }
      const lifeRatio = Math.max(0, zone.life / zone.maxLife);
      const pulse = 1 + Math.sin(this.elapsed * 6.5) * 0.04;
      zone.ringMesh.scale.setScalar(zone.radius * pulse);
      zone.ringMesh.rotation.z += dt * (zone.kind === 'ember' ? 1.4 : -1.1);
      (zone.discMesh.material as THREE.MeshBasicMaterial).opacity = 0.24 * Math.min(1, lifeRatio * 2.2);
      (zone.ringMesh.material as THREE.MeshBasicMaterial).opacity = 0.65 * Math.min(1, lifeRatio * 2.0);

      zone.tickTimer -= dt;
      if (zone.tickTimer <= 0) {
        zone.tickTimer = 0.45;
        for (const e of [...this.enemies]) {
          if (!e || e.dead || e.spawnTimer > 0) continue;
          const dist = Math.hypot(e.x - zone.x, e.z - zone.z);
          const res = evaluateElementalZoneEffect(zone.kind, zone.baseAtk, dist, zone.radius + e.radius * 0.5);
          if (res.inside) {
            this.damageEnemy(
              e,
              res.tickDamage,
              false,
              res.applyBurn,
              res.applyChill,
              false,
              false,
              undefined,
              'elemental'
            );
          }
        }
      }
    }
  }

  private updateOrbitOrbs(dt: number): void {
    const count = this.getOrbitOrbCount();
    if (count <= 0) return;
    const activeSynergies = evaluateActiveSynergies(this.activeSkills);
    const hasSolarOrbit = activeSynergies.includes('solar_orbit');
    const orbitR = 2.45;
    const speed = ((this.activeSkills.super_circle ?? 0) > 0 ? 4.8 : 3.8) * (hasSolarOrbit ? 1.28 : 1.0);
    const baseAngle = this.elapsed * speed;
    const sawRune = this.hasRune('sawblade_circle');
    const dmgMult = 0.72 * (sawRune ? 1.55 : 1.0) * (hasSolarOrbit ? 1.25 : 1.0);

    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i * Math.PI * 2) / count;
      const bx = this.px + Math.cos(a) * orbitR;
      const bz = this.pz + Math.sin(a) * orbitR;
      const mesh = this.orbitOrbMeshes[i];
      mesh.position.set(bx, 1.0, bz);
      mesh.rotation.y += dt * 9;

      if (this.isBossEntranceLocked()) continue;
      for (const e of [...this.enemies]) {
        if (!e || e.dead || e.spawnTimer > 0 || e.hitFlashTimer > 0) continue;
        if (Math.hypot(e.x - bx, e.z - bz) < e.radius + 0.5) {
          const isCrit = sawRune && Math.random() < this.baseStats.critChance;
          const amt =
            this.baseStats.attack *
            this.getCurrentAtkMultiplier() *
            dmgMult *
            (isCrit ? this.baseStats.critDamage : 1);
          this.damageEnemy(e, amt, isCrit, false, false, false, false, undefined, 'elemental');
        }
      }
    }
  }

  private updateCompanions(dt: number): void {
    const nearest = this.findNearestEnemy(this.px, this.pz);
    let synergyActive = false;
    let synergyProgress = 0;
    if (this.companionSynergyTimer > 0) {
      this.companionSynergyTimer = Math.max(0, this.companionSynergyTimer - dt);
      synergyActive = this.companionSynergyTimer > 0;
      synergyProgress = 1 - this.companionSynergyTimer / this.companionSynergyDuration;
      if (nearest && nearest.spawnTimer <= 0) {
        this.companionSynergyTargetX = nearest.x;
        this.companionSynergyTargetZ = nearest.z;
      }
    }

    // 3D Zodiac Pet Companion update & firing
    if (this.petModel && this.builtPetId) {
      this.petModel.visible = true;
      const pDef = PET_MAP[this.builtPetId];
      const hasSolarPet = this.solarLeoPetRig?.group.parent === this.petModel;
      const prevPetX = this.petModel.position.x;
      const prevPetZ = this.petModel.position.z;
      if (synergyActive) {
        const pose = computeCompanionSynergyOrbit(
          synergyProgress,
          0,
          1 + this.companionModels.length,
          this.px,
          this.pz,
          this.companionSynergyTargetX,
          this.companionSynergyTargetZ
        );
        this.petModel.position.set(pose.x, pose.y, pose.z);
        this.petModel.scale.setScalar(pose.scale);
        if (pose.isImpactApex && !this.companionSynergyStruck) {
          this.companionSynergyStruck = true;
          this.resolveCompanionSynergyImpact(
            this.companionSynergyTargetX,
            this.companionSynergyTargetZ,
            pDef?.primaryHex ?? 0x38bdf8
          );
        }
      } else {
        this.petModel.scale.setScalar(1);
        // Playful flank weaving around the hero's shoulder
        const weaveSide = Math.sin(this.elapsed * 2.1) * 0.28;
        const weaveDepth = Math.cos(this.elapsed * 1.65) * 0.22;
        const targetX =
          this.px -
          Math.cos(this.pFacing) * (1.15 + weaveSide) -
          Math.sin(this.pFacing) * (0.45 + weaveDepth);
        const targetZ =
          this.pz +
          Math.sin(this.pFacing) * (1.15 + weaveSide) -
          Math.cos(this.pFacing) * (0.45 + weaveDepth);
        const petY = hasSolarPet ? 1.18 : 1.18 + Math.sin(this.elapsed * 3.8) * 0.14;
        this.petModel.position.set(
          THREE.MathUtils.damp(this.petModel.position.x, targetX, 8.5, dt),
          petY,
          THREE.MathUtils.damp(this.petModel.position.z, targetZ, 8.5, dt)
        );
      }

      const desiredPetYaw = nearest
        ? Math.atan2(nearest.x - this.petModel.position.x, nearest.z - this.petModel.position.z)
        : this.pFacing;
      const yawDelta =
        ((desiredPetYaw - this.petModel.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) -
        Math.PI;
      this.petModel.rotation.y += yawDelta * (1 - Math.exp(-12 * dt));

      const invDt = dt > 1e-4 ? 1 / dt : 60;
      const petVx = (this.petModel.position.x - prevPetX) * invDt;
      const petVz = (this.petModel.position.z - prevPetZ) * invDt;
      const petMoveSpeed = Math.min(12, Math.hypot(petVx, petVz));
      const rightX = Math.cos(this.petModel.rotation.y);
      const rightZ = -Math.sin(this.petModel.rotation.y);
      const lateralVel = petVx * rightX + petVz * rightZ;
      const bankAngle = THREE.MathUtils.clamp(-lateralVel * 0.085, -0.45, 0.45);

      this.solarLeoPetAttackRecoil = Math.max(0, this.solarLeoPetAttackRecoil - dt * 4.5);
      if (pDef && nearest && nearest.spawnTimer <= 0 && !this.isBossEntranceLocked()) {
        this.petFireTimer += dt;
        const evolvedMult = getEvolvedPetMultiplier(Boolean(this.baseStats.equippedPetEvolved));
        const effectiveInterval = pDef.fireInterval * evolvedMult.fireRateMult;
        if (this.petFireTimer >= effectiveInterval) {
          this.petFireTimer = 0;
          this.solarLeoPetAttackRecoil = 1.0;
          const yaw = Math.atan2(
            nearest.x - this.petModel.position.x,
            nearest.z - this.petModel.position.z
          );
          const petBaseAtk = this.baseStats.petAtk ?? pDef.baseAtk;
          const dmg = (petBaseAtk * 2.2 + this.baseStats.attack * 0.45) * this.getCurrentAtkMultiplier();
          this.spawnCompanionShot(
            this.petModel.position.x,
            this.petModel.position.z,
            yaw,
            dmg,
            pDef.primaryHex,
            pDef.element === 'star' || pDef.element === 'shadow',
            'pet',
            pDef.element === 'fire',
            pDef.element === 'ice',
            pDef.element === 'storm'
          );
        }
      }
      if (hasSolarPet && this.solarLeoPetRig) {
        updateSolarLeoPetPose(this.solarLeoPetRig, this.elapsed, dt, this.solarLeoPetAttackRecoil, {
          mode: 'combat',
          speed: petMoveSpeed,
          bankAngle,
          dashing: this.dashTimer > 0,
          celebrating: this.phase === GamePhase.VICTORY,
        });
      }
    }

    if (this.companionModels.length === 0) return;

    this.wukongFireTimer += dt;
    this.spriteFireTimer += dt;

    const count = this.companionModels.length;

    for (let i = 0; i < count; i++) {
      const comp = this.companionModels[i];
      if (synergyActive) {
        const pose = computeCompanionSynergyOrbit(
          synergyProgress,
          i + (this.petModel ? 1 : 0),
          count + (this.petModel ? 1 : 0),
          this.px,
          this.pz,
          this.companionSynergyTargetX,
          this.companionSynergyTargetZ
        );
        comp.position.set(pose.x, pose.y, pose.z);
        comp.scale.setScalar(pose.scale);
        if (pose.isImpactApex && !this.companionSynergyStruck) {
          this.companionSynergyStruck = true;
          this.resolveCompanionSynergyImpact(
            this.companionSynergyTargetX,
            this.companionSynergyTargetZ,
            0x38bdf8
          );
        }
      } else {
        comp.scale.setScalar(1);
        const ang = this.elapsed * 1.4 + (i * Math.PI * 2) / count;
        const dist = 1.65;
        const cx = this.px + Math.cos(ang) * dist;
        const cz = this.pz + Math.sin(ang) * dist;
        comp.position.set(cx, 0.95 + Math.sin(this.elapsed * 4 + i) * 0.12, cz);
      }
      if (nearest) {
        comp.rotation.y = Math.atan2(nearest.x - comp.position.x, nearest.z - comp.position.z);
      } else {
        comp.rotation.y += dt * 2;
      }
    }

    if (nearest && nearest.spawnTimer <= 0 && !this.isBossEntranceLocked()) {

      const hasSprites =
        (this.activeSkills.bomb_sprite ?? 0) > 0 ||
        (this.activeSkills.laser_sprite ?? 0) > 0 ||
        this.hasRune('healing_sprite');

      const hasVenomEclipse = evaluateActiveSynergies(this.activeSkills).includes('venom_eclipse');
      const spriteInterval = hasVenomEclipse ? 1.16 : 1.45;
      if (hasSprites && this.spriteFireTimer >= spriteInterval) {
        this.spriteFireTimer = 0;
        const comp = this.companionModels[count - 1];
        const yaw = Math.atan2(nearest.x - comp.position.x, nearest.z - comp.position.z);
        const isLaser = (this.activeSkills.laser_sprite ?? 0) > 0;
        this.spawnCompanionShot(
          comp.position.x,
          comp.position.z,
          yaw,
          this.baseStats.attack * this.getCurrentAtkMultiplier() * 0.78,
          isLaser ? 0xe879f9 : 0x38bdf8,
          isLaser,
          'elemental'
        );
      }
    }
  }

  private spawnCompanionShot(
    x: number,
    z: number,
    yaw: number,
    dmg: number,
    colorHex: number,
    pierce: boolean,
    source: 'basic' | 'ultimate' | 'pet' | 'elemental' = 'pet',
    blaze = false,
    frost = false,
    storm = false
  ): void {
    const proj = this.arrowPool.find((p) => !p.active);
    if (!proj) return;
    proj.active = true;
    proj.isEnemy = false;
    proj.isSword = false;
    proj.source = source;
    proj.coopAllyIndex = undefined;
    proj.homing = true;
    proj.x = x;
    proj.y = 1.05;
    proj.z = z;
    proj.vx = Math.sin(yaw) * 21;
    proj.vz = Math.cos(yaw) * 21;
    proj.damage = dmg;
    proj.radius = 0.3;
    proj.life = 1.9;
    proj.pierceLeft = pierce ? 2 : 0;
    proj.ricochetLeft = 0;
    proj.wallBounceLeft = 0;
    proj.hitEnemyIds.clear();
    proj.blaze = blaze;
    proj.frost = frost;
    proj.storm = storm;
    proj.poison = false;
    const mat = proj.mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(colorHex);
    mat.emissive.setHex(colorHex);
    if (proj.compassGroup) proj.compassGroup.visible = false;
    proj.mesh.scale.set(0.95, 0.95, 1.15);
    proj.mesh.position.set(x, 1.05, z);
    proj.mesh.rotation.set(0, yaw, 0);
    proj.mesh.visible = true;
  }

  private updateCoopAllies(dt: number): void {
    if (this.isCoopRaidMode) {
      stepCoopSynergyClock(this.coopSynergyClock, dt);
    }
    if (this.coopSanctuaryCooldown > 0) {
      this.coopSanctuaryCooldown = Math.max(0, this.coopSanctuaryCooldown - dt);
    }
    if (this.coopSanctuaryActiveTimer > 0) {
      this.coopSanctuaryActiveTimer = Math.max(0, this.coopSanctuaryActiveTimer - dt);
      if (this.coopSanctuaryRing) {
        this.coopSanctuaryRing.visible = this.coopSanctuaryActiveTimer > 0;
        this.coopSanctuaryRing.position.set(this.px, 0.04, this.pz);
        this.coopSanctuaryRing.rotation.z += dt * 1.4;
      }
    } else if (this.coopSanctuaryRing && this.coopSanctuaryRing.visible) {
      this.coopSanctuaryRing.visible = false;
    }
    if (this.coopPrimerBannerTimer > 0) {
      this.coopPrimerBannerTimer = Math.max(0, this.coopPrimerBannerTimer - dt);
      if (this.coopPrimerBannerTimer <= 0) this.coopPrimerBanner = null;
    }

    if (this.coopAllies.length === 0) return;
    if (!this.isCoopRaidMode && !this.aiSquadAssistEnabled) return;
    const nearest = this.findNearestEnemy(this.px, this.pz);

    // Wave 9 Pillar 5: Co-op AI Emergency <35% HP Sanctuary Rescue
    const rescue = evaluateCoopSanctuaryRescue({
      playerHp: this.hp,
      playerMaxHp: this.maxHp,
      cooldownSec: this.coopSanctuaryCooldown,
      order: this.coopTacticalOrder,
      allyName: this.coopAllies[0]?.name,
    });
    if (rescue.triggered) {
      this.coopSanctuaryCooldown = rescue.nextCooldownSec;
      this.coopSanctuaryActiveTimer = 3.2;
      this.hp = Math.min(this.maxHp, this.hp + rescue.healAmount);
      this.shield = Math.min(Math.round(this.maxHp * 0.55), this.shield + rescue.shieldAmount);
      this.coopPrimerBanner = rescue.calloutText;
      this.coopPrimerBannerTimer = 2.6;
      if (this.coopAllies[0]) {
        this.coopAllies[0].calloutText = 'Vòng Hộ Mệnh!';
        this.coopAllies[0].calloutTimer = 2.6;
      }
      if (!this.coopSanctuaryRing) {
        const ringGeo = new THREE.RingGeometry(1.75, 2.15, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.72,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        this.coopSanctuaryRing = new THREE.Mesh(ringGeo, ringMat);
        this.coopSanctuaryRing.rotation.x = -Math.PI / 2;
        this.entitiesGroup.add(this.coopSanctuaryRing);
      }
      this.coopSanctuaryRing.visible = true;
      this.coopSanctuaryRing.position.set(this.px, 0.04, this.pz);
      soundEngine.playCoopResonanceChord();
      this.spawnShockwave(this.px, this.pz, 0x34d399, 3.6, 0.44);
      this.spawnParticles(this.px, 0.9, this.pz, 0x6ee7b7, 16);
      this.emitFloatingNumber(
        this.px,
        2.15,
        this.pz,
        rescue.healAmount,
        true,
        true,
        undefined,
        'VÒNG HỘ MỆNH!'
      );
    }

    const activeTelegraphs = this.enemies
      .filter((e) => e.spawnTimer <= 0 && (e.telegraphType === 'slam' || e.telegraphType === 'lunge' || e.telegraphType === 'spiral'))
      .map((e) => ({
        kind: e.telegraphType as 'slam' | 'lunge' | 'spiral',
        x: e.telegraphType === 'slam' ? e.slamX : e.x,
        z: e.telegraphType === 'slam' ? e.slamZ : e.z,
        radius: Math.max(2.2, e.slamRadius || 3.0),
        timeRemainingSec: Math.max(0, e.telegraphTimer),
      }));

    const incomingBullets = this.enemyOrbPool
      .filter((o) => o.active)
      .map((o) => ({ x: o.x, z: o.z, vx: o.vx, vz: o.vz, radius: 0.35 }));

    const coopCandidates = this.enemies.map((e) => ({
      id: e.id,
      x: e.x,
      z: e.z,
      isBoss: e.isBoss,
      isElite: e.isElite,
      hp: e.hp,
      alive: e.hp > 0 && e.spawnTimer <= 0,
      ref: e,
    }));

    for (let idx = 0; idx < this.coopAllies.length; idx++) {
      const ally = this.coopAllies[idx];
      const orderedPick =
        this.isCoopRaidMode || this.coopAllies.length > 0
          ? selectCoopAllyTarget(
              coopCandidates,
              ally.x,
              ally.z,
              this.coopTacticalOrder,
              this.px,
              this.pz
            )?.ref ?? null
          : null;
      const target = orderedPick ?? (nearest ? this.findNearestEnemy(ally.x, ally.z) ?? nearest : null);
      const role = ally.role ?? (idx === 0 ? 'ranger' : 'mystic');
      const roleCfg = AI_COMPANION_ROLES[role];

      if (ally.calloutTimer && ally.calloutTimer > 0) {
        ally.calloutTimer = Math.max(0, ally.calloutTimer - dt);
        if (ally.calloutTimer <= 0) ally.calloutText = null;
      }

      // Role support aura (Vanguard shields player, Mystic heals player periodically)
      if (ally.supportTimer !== undefined) {
        ally.supportTimer -= dt;
        if (ally.supportTimer <= 0 && target && target.spawnTimer <= 0) {
          ally.supportTimer = role === 'vanguard' ? 8.5 : 9.5;
          if (role === 'vanguard') {
            const shieldGain = Math.round(this.maxHp * 0.12);
            this.shield = Math.min(Math.round(this.maxHp * 0.45), this.shield + shieldGain);
            ally.calloutText = 'Dựng khiên bảo hộ!';
            ally.calloutTimer = 2.0;
            this.spawnShockwave(this.px, this.pz, 0x38bdf8, 2.4, 0.28);
          } else if (role === 'mystic' && this.hp < this.maxHp * 0.92) {
            const healAmt = Math.round(this.maxHp * 0.1);
            this.hp = Math.min(this.maxHp, this.hp + healAmt);
            ally.calloutText = `Hồi +${healAmt} HP!`;
            ally.calloutTimer = 2.0;
            this.spawnParticles(this.px, 1.0, this.pz, 0x34d399, 10);
          }
        }
      }

      const allyBossWp =
        this.bossWeakPointState?.active && target?.isBoss
          ? (() => {
              const wp = getBossWeakPointWorldPos(target.x, target.z, this.bossWeakPointState!);
              return { x: wp.x, z: wp.z, active: true };
            })()
          : null;

      const steerDecision = computeAiCompanionDecision({
        role,
        slotIndex: idx,
        simTimeSec: this.simClock.totalSimTime,
        x: ally.x,
        z: ally.z,
        playerX: this.px,
        playerZ: this.pz,
        arenaHalfW: ARENA_HALF_W,
        arenaHalfD: ARENA_HALF_D,
        target:
          target && target.spawnTimer <= 0
            ? {
                id: target.id,
                x: target.x,
                z: target.z,
                hp: target.hp,
                maxHp: target.maxHp,
                isBoss: target.isBoss,
                radius: target.radius,
              }
            : null,
        telegraphs: activeTelegraphs,
        incomingBullets,
        obstacles: this.obstacles
          .filter((o) => o.intact !== false)
          .map((o) => ({ x: o.x, z: o.z, radius: o.radius })),
        bossWeakPoint: allyBossWp,
        bossEnraged: Boolean(target?.isBoss && (target.bossPhase ?? 1) >= 2),
        tacticalOrder: this.coopTacticalOrder,
      });

      if ((steerDecision.evading || steerDecision.tacticalHint) && (!ally.calloutTimer || ally.calloutTimer <= 0)) {
        ally.calloutText = steerDecision.tacticalHint ?? 'Né vùng Boss!';
        ally.calloutTimer = 1.6;
      }
      if (
        idx === 0 &&
        target?.isBoss &&
        !this.coopPrimerBanner &&
        this.coopPrimerBannerTimer <= 0
      ) {
        const shieldRatio =
          target.maxBreakShield && target.maxBreakShield > 0
            ? (target.breakShield ?? 0) / target.maxBreakShield
            : 0;
        const primer = computeCoopPrimerCallout({
          order: this.coopTacticalOrder,
          bossShieldRatio: shieldRatio,
          allyUltCharge: ally.ultCharge,
          allyName: ally.name,
        });
        if (primer) {
          this.coopPrimerBanner = primer;
          this.coopPrimerBannerTimer = 2.4;
        }
      }

      const allySpeed = roleCfg.moveSpeed;
      const targetVx = steerDecision.steerX * allySpeed;
      const targetVz = steerDecision.steerZ * allySpeed;
      ally.vx = THREE.MathUtils.damp(ally.vx, targetVx, 10, dt);
      ally.vz = THREE.MathUtils.damp(ally.vz, targetVz, 10, dt);

      ally.x = THREE.MathUtils.clamp(ally.x + ally.vx * dt, -ARENA_HALF_W + 0.7, ARENA_HALF_W - 0.7);
      ally.z = THREE.MathUtils.clamp(ally.z + ally.vz * dt, -ARENA_HALF_D + 0.7, ARENA_HALF_D - 0.7);

      for (const obs of this.obstacles) {
        if (obs.intact === false) continue;
        const odx = ally.x - obs.x;
        const odz = ally.z - obs.z;
        const minD = 0.55 + obs.radius;
        const od = Math.hypot(odx, odz);
        if (od < minD && od > 0.01) {
          ally.x = obs.x + (odx / od) * minD;
          ally.z = obs.z + (odz / od) * minD;
        }
      }

      const moving = Math.hypot(ally.vx, ally.vz) > 0.25;
      if (target && target.spawnTimer <= 0) {
        ally.facing = Math.atan2(target.x - ally.x, target.z - ally.z);
      } else if (moving) {
        ally.facing = Math.atan2(ally.vx, ally.vz);
      }

      ally.model.root.position.set(ally.x, 0, ally.z);
      ally.model.root.rotation.y = ally.facing;
      ally.shadow.position.set(ally.x, 0.02, ally.z);

      if (moving) {
        const stride = Math.sin(this.elapsed * 14 + ally.phaseAngle) * 0.45;
        ally.model.leftLeg.rotation.x = stride;
        ally.model.rightLeg.rotation.x = -stride;
        ally.model.bodyGroup.position.y = Math.abs(Math.sin(this.elapsed * 14 + ally.phaseAngle)) * 0.07;
      } else {
        ally.model.leftLeg.rotation.x = THREE.MathUtils.damp(ally.model.leftLeg.rotation.x, 0, 12, dt);
        ally.model.rightLeg.rotation.x = THREE.MathUtils.damp(ally.model.rightLeg.rotation.x, 0, 12, dt);
        ally.model.bodyGroup.position.y = THREE.MathUtils.damp(ally.model.bodyGroup.position.y, 0, 12, dt);
      }

      if (target && target.spawnTimer <= 0 && !this.isBossEntranceLocked()) {
        ally.attackTimer -= dt;
        if (ally.attackTimer <= 0) {
          ally.attackTimer = 0.52 + (idx % 2) * 0.08;
          ally.ultCharge = Math.min(100, ally.ultCharge + 12);
          if (
            this.isCoopRaidMode &&
            ally.ultCharge >= 88 &&
            ally.ultCharge < 100 &&
            (!ally.calloutTimer || ally.calloutTimer <= 0)
          ) {
            ally.calloutText = 'Tuyệt Kỹ sẵn sàng · Bấm Q Liên Kích!';
            ally.calloutTimer = 2.2;
          }
          const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
          const dmg = this.baseStats.attack * (0.78 + idx * 0.08);
          const adaptCounters = computeAdaptiveAiCounterAdjustments(this.aiAdaptationProfile);
          const compElem = idx === 0 ? adaptCounters.complementaryCoopElement : null;
          const isFire = compElem === 'fire';
          const isIce = compElem === 'ice';
          const isStorm = compElem === 'storm';

          // Trigger Ally Ultimate when ready (respecting Co-op Tactical Order 'hold_resonance')
          const holdUltForResonance =
            this.isCoopRaidMode &&
            shouldCoopAllyHoldUlt({
              order: this.coopTacticalOrder,
              playerUltRecentRemainingSec: this.coopSynergyClock.playerUltRecentRemainingSec,
              resonanceRemainingSec: this.coopSynergyClock.resonanceRemainingSec,
            });
          if (ally.ultCharge >= 100 && holdUltForResonance) {
            if (!ally.calloutTimer || ally.calloutTimer <= 0) {
              ally.calloutText = 'Đang giữ Tuyệt Kỹ · Bấm Q Liên Kích!';
              ally.calloutTimer = 2.4;
            }
          }
          if (ally.ultCharge >= 100 && !holdUltForResonance) {
            ally.ultCharge = 0;
            if (this.isCoopRaidMode) {
              const allyRes = onCoopAllyUltimateCast(this.coopSynergyClock, ally.name);
              if (allyRes.triggeredResonance) {
                soundEngine.playCoopResonanceChord();
                this.spawnShockwave(this.px, this.pz, 0xfde047, 7.2, 0.52);
                this.emitFloatingNumber(
                  this.px,
                  2.8,
                  this.pz,
                  0,
                  true,
                  false,
                  undefined,
                  'CỘNG HƯỞNG LIÊN KÍCH +25% ST!'
                );
              } else {
                ally.calloutText = 'Đã tung Tuyệt Kỹ! Bấm Q Liên Kích!';
                ally.calloutTimer = 3.2;
              }
            }
            this.spawnShockwave(ally.x, ally.z, ally.accentHex, 4.4, 0.42);
            this.spawnParticles(ally.x, 1.0, ally.z, ally.accentHex, 18);
            this.emitFloatingNumber(
              ally.x,
              2.2,
              ally.z,
              0,
              true,
              false,
              undefined,
              `${ally.name.toUpperCase()} · TUYỆT KỸ!`
            );
            for (let k = -2; k <= 2; k++) {
              this.fireCoopAllyProjectile(
                idx,
                ally.x,
                ally.z,
                yaw + k * 0.16,
                dmg * 1.45,
                ally.accentHex,
                isFire,
                isIce,
                isStorm
              );
            }
          } else {
            this.fireCoopAllyProjectile(
              idx,
              ally.x,
              ally.z,
              yaw,
              dmg,
              ally.accentHex,
              isFire,
              isIce,
              isStorm
            );
          }
        }
      }
    }
  }

  private fireCoopAllyProjectile(
    allyIdx: number,
    x: number,
    z: number,
    yaw: number,
    dmg: number,
    colorHex: number,
    blaze: boolean,
    frost: boolean,
    storm: boolean
  ): void {
    const proj = this.arrowPool.find((p) => !p.active);
    if (!proj) return;
    proj.active = true;
    proj.isEnemy = false;
    proj.isSword = false;
    proj.source = 'basic';
    proj.coopAllyIndex = allyIdx;
    proj.homing = true;
    proj.x = x + Math.sin(yaw) * 0.6;
    proj.y = 1.02;
    proj.z = z + Math.cos(yaw) * 0.6;
    proj.vx = Math.sin(yaw) * 22;
    proj.vz = Math.cos(yaw) * 22;
    proj.damage = dmg;
    proj.radius = 0.32;
    proj.life = 2.0;
    proj.pierceLeft = 1;
    proj.ricochetLeft = 0;
    proj.wallBounceLeft = 0;
    proj.hitEnemyIds.clear();
    proj.blaze = blaze;
    proj.frost = frost;
    proj.storm = storm;
    proj.poison = false;
    const mat = proj.mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(colorHex);
    mat.emissive.setHex(colorHex);
    if (proj.compassGroup) proj.compassGroup.visible = false;
    proj.mesh.scale.set(1.0, 1.0, 1.25);
    proj.mesh.position.set(proj.x, 1.02, proj.z);
    proj.mesh.rotation.set(0, yaw, 0);
    proj.mesh.visible = true;
  }

  private fireEnemyOrb(
    x: number,
    z: number,
    vx: number,
    vz: number,
    damage: number,
    colorHex = 0xf43f5e,
    enemySourceKind: 'boss_lane' | 'boss_projectile' | 'ranged_barrage' = 'ranged_barrage'
  ): void {
    const proj = this.enemyOrbPool.find((p) => !p.active);
    if (!proj) return;
    proj.active = true;
    proj.isEnemy = true;
    proj.enemySourceKind = enemySourceKind;
    proj.x = x;
    proj.y = 0.98;
    proj.z = z;
    const bulletSpeedScale = this.nightmareTier > 0 ? this.nightmareConfig.bulletSpeedMult : 1.0;
    proj.vx = vx * bulletSpeedScale;
    proj.vz = vz * bulletSpeedScale;
    proj.damage = damage;
    proj.life = 4.2;
    proj.mesh.position.set(x, 0.98, z);
    const haloMesh = proj.mesh.children[0] as THREE.Mesh | undefined;
    if (haloMesh) {
      const haloMat = haloMesh.material as THREE.MeshBasicMaterial;
      haloMat.color.setHex(colorHex);
    }
    proj.mesh.visible = true;
  }

  private updateEnemies(dt: number): void {
    const enemySnapshot = [...this.enemies];
    for (let i = enemySnapshot.length - 1; i >= 0; i--) {
      const e = enemySnapshot[i];
      if (!e || e.dead) continue;

      const baseScale = e.baseScale ?? 1;
      if (e.spawnTimer > 0) {
        e.spawnTimer = Math.max(0, e.spawnTimer - dt);
        const totalSpawn = e.spawnDuration ?? 0.48;
        if (e.isBoss && totalSpawn >= 3.0) {
          const entrance = evaluateBossEntranceState(e.spawnTimer, totalSpawn);
          e.model.root.position.set(e.x, entrance.elevationY, e.z);
          e.model.root.scale.set(
            baseScale * entrance.scaleXZ,
            baseScale * entrance.scaleY,
            baseScale * entrance.scaleXZ
          );
          e.model.root.rotation.y = Math.atan2(this.px - e.x, this.pz - e.z);
          e.shadow.position.set(e.x, 0.02, e.z);
          e.shadow.scale.setScalar(entrance.shadowScale);
          const shMat = e.shadow.material as THREE.MeshBasicMaterial | undefined;
          if (shMat) shMat.opacity = entrance.shadowOpacity;

          // Subtle imperial summoning aura shimmer while appearing
          for (let hmIdx = 0; hmIdx < e.model.hitMeshes.length; hmIdx++) {
            const mat = e.model.hitMeshes[hmIdx].material as THREE.MeshStandardMaterial;
            if (mat?.emissive) {
              mat.emissive.setHex(0xfbbf24);
              mat.emissiveIntensity = entrance.auraIntensity * 0.42;
            }
          }

          // One-shot touchdown impact shockwave, camera shake & roar burst
          if (entrance.hasLanded && !this.bossEntranceLandingFired) {
            this.bossEntranceLandingFired = true;
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.48);
            this.spawnShockwave(e.x, e.z, 0xfbbf24, Math.max(5.5, e.radius * 4.2), 0.65);
            this.spawnShockwave(e.x, e.z, this.currentChapter.trimHex, Math.max(3.8, e.radius * 2.8), 0.48);
            this.spawnParticles(e.x, 0.4, e.z, 0xfbbf24, this.lowEndGpu ? 10 : 24);
            soundEngine.playBossPhaseRoar();
            e.solarLionBurstType = 'roar';
            e.solarLionBurstTimer = 1.45;
            e.roster3dBurstType = 'roar';
            e.roster3dBurstTimer = 1.45;
          }

          // Keep 3D boss skeletal/procedural models alive (wing flap / roar) during descent & landing
          if (e.solarLionBurstTimer && e.solarLionBurstTimer > 0) {
            e.solarLionBurstTimer = Math.max(0, e.solarLionBurstTimer - dt);
            if (e.solarLionBurstTimer <= 0) e.solarLionBurstType = 'none';
          }
          if (e.roster3dBurstTimer && e.roster3dBurstTimer > 0) {
            e.roster3dBurstTimer = Math.max(0, e.roster3dBurstTimer - dt);
            if (e.roster3dBurstTimer <= 0) e.roster3dBurstType = 'none';
          }
          if (e.autoRig) {
            updateAutoRigPose(e.autoRig, {
              elapsed: this.elapsed,
              dt,
              phaseAngle: e.phaseAngle,
              speed: entrance.hasLanded ? 0 : 2.6,
              maxSpeed: e.speed,
              lateralSpeed: 0,
              facingYaw: e.model.root.rotation.y,
              targetYaw: e.model.root.rotation.y,
              telegraphType: entrance.stage === 'landing_roar' ? 'slam' : 'none',
              telegraphProgress: entrance.progress,
              burstType: e.roster3dBurstType ?? e.solarLionBurstType ?? 'none',
              burstTimer: Math.max(e.roster3dBurstTimer ?? 0, e.solarLionBurstTimer ?? 0),
              bossPhase: e.bossPhase,
              stunTimer: 0,
              hitFlashTimer: 0,
              recoilPitch: 0,
              recoilRoll: 0,
              isDashing: false,
            });
          } else if (e.solarLionVisualGroup) {
            updateChapter1BossMotion(
              e.solarLionVisualGroup,
              {
                elapsed: this.elapsed,
                phaseAngle: e.phaseAngle,
                speed: entrance.hasLanded ? 0 : 2.4,
                telegraphType: entrance.stage === 'landing_roar' ? 'slam' : 'none',
                telegraphProgress: entrance.progress,
                attackBurstType: e.solarLionBurstType ?? 'none',
                attackBurstTimer: e.solarLionBurstTimer ?? 0,
                bossPhase: e.bossPhase,
                stunTimer: 0,
                hitFlashTimer: 0,
                lateralSpeed: 0,
                recoilPitch: 0,
                recoilRoll: 0,
              },
              dt
            );
          } else if (e.roster3dVisualGroup && e.roster3dAssetId) {
            updateChapter1RosterMotion(
              e.roster3dVisualGroup,
              {
                assetId: e.roster3dAssetId,
                elapsed: this.elapsed,
                phaseAngle: e.phaseAngle,
                speed: entrance.hasLanded ? 0 : 2.4,
                telegraphType: entrance.stage === 'landing_roar' ? 'slam' : 'none',
                telegraphProgress: entrance.progress,
                burstType: e.roster3dBurstType ?? 'none',
                burstTimer: e.roster3dBurstTimer ?? 0,
                bossPhase: e.bossPhase,
                stunTimer: 0,
                hitFlashTimer: 0,
                isSubBossTitan: e.kind === EnemyKind.TITAN_BOSS,
                lateralSpeed: 0,
                recoilPitch: 0,
                recoilRoll: 0,
              },
              e.roster3dBaseScale ?? 1.0,
              dt
            );
          }
          if (e.spawnTimer <= 0) {
            e.model.root.position.set(e.x, 0, e.z);
            e.model.root.scale.setScalar(baseScale);
            e.shadow.scale.setScalar(1);
            if (shMat) shMat.opacity = 0.45;
          }
        } else {
          const p = 1 - Math.max(0, e.spawnTimer / Math.max(0.01, totalSpawn));
          e.model.root.scale.setScalar(Math.max(0.05, p) * baseScale);
        }
        continue;
      }
      // While a Boss is in its 5–10s entrance sequence, hold non-boss wave enemies in standoff
      // so the player is never unfairly attacked while their own attacks are locked.
      if (this.isBossEntranceLocked() && !e.isBoss && !e.isTrainingDummy) {
        e.vx = 0;
        e.vz = 0;
        e.model.root.rotation.y = Math.atan2(this.px - e.x, this.pz - e.z);
        continue;
      }
      // AAA Elastic Hit-Squash & Directional Knockback Recoil Recovery
      if (e.hitSquashY !== undefined && Math.abs(e.hitSquashY - 1) > 0.004) {
        e.hitSquashY = THREE.MathUtils.damp(e.hitSquashY, 1, 15, dt);
        e.hitStretchXZ = THREE.MathUtils.damp(e.hitStretchXZ ?? 1, 1, 15, dt);
        e.model.root.scale.set(
          baseScale * (e.hitStretchXZ ?? 1),
          baseScale * e.hitSquashY,
          baseScale * (e.hitStretchXZ ?? 1)
        );
      } else {
        e.model.root.scale.setScalar(baseScale);
      }
      if ((e.knockVx || e.knockVz) && !e.isTrainingDummy && !e.isVaultPillar) {
        e.x = THREE.MathUtils.clamp(e.x + (e.knockVx ?? 0) * dt, -ARENA_HALF_W + e.radius, ARENA_HALF_W - e.radius);
        e.z = THREE.MathUtils.clamp(e.z + (e.knockVz ?? 0) * dt, -ARENA_HALF_D + e.radius, ARENA_HALF_D - e.radius);
        const damp = Math.exp(-13.5 * dt);
        e.knockVx = Math.abs(e.knockVx ?? 0) > 0.05 ? (e.knockVx ?? 0) * damp : 0;
        e.knockVz = Math.abs(e.knockVz ?? 0) > 0.05 ? (e.knockVz ?? 0) * damp : 0;
      }

      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;
      if (e.reactionCd && e.reactionCd > 0) e.reactionCd = Math.max(0, e.reactionCd - dt);
      if (e.bossStunImmuneTimer && e.bossStunImmuneTimer > 0) {
        e.bossStunImmuneTimer = Math.max(0, e.bossStunImmuneTimer - dt);
      }
      const statusTint = resolveEnemyStatusTint({
        hitFlashTimer: e.hitFlashTimer,
        stunTimer: e.stunTimer,
        chillTimer: e.chillTimer,
        burnTimer: e.burnTimer,
        poisonDps: e.poisonDps,
        isMarked: this.markedEnemyIds.has(e.id) || (e.stormMarkUntil ?? 0) > this.elapsed,
        elapsed: this.elapsed,
      });
      const isTimedEnragedBoss = Boolean(e.isBoss && e.bossAiState?.timedEnrageTriggered);
      const bossRagePulse =
        e.isBoss &&
        ((e.bossPhase ?? 1) >= 2 || isTimedEnragedBoss) &&
        e.hitFlashTimer <= 0 &&
        !(e.stunTimer && e.stunTimer > 0)
          ? (isTimedEnragedBoss ? 0.58 : e.bossPhase === 3 ? 0.42 : 0.24) +
            Math.sin(this.elapsed * (isTimedEnragedBoss ? 13 : 9.5)) * 0.16
          : 0;
      for (const hm of e.model.hitMeshes) {
        const mat = hm.material as THREE.MeshStandardMaterial;
        if (bossRagePulse > 0 && statusTint.intensity <= 0.05) {
          mat.emissive.setHex(
            isTimedEnragedBoss ? 0xe11d48 : e.bossPhase === 3 ? 0xf43f5e : 0xf97316
          );
          mat.emissiveIntensity = bossRagePulse;
        } else {
          mat.emissive.setHex(statusTint.hex);
          mat.emissiveIntensity = statusTint.intensity;
        }
      }

      // Burn & Poison DoT (strictly gated by LC Power Pressure & Boss Innate Armor so DoTs never bypass!)
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        const tickDmg = this.scaleAuxiliaryPlayerDamage(e.burnDps * dt, e);
        e.hp -= tickDmg;
        this.dmgElemental += tickDmg;
        if (Math.random() < 0.2) {
          this.spawnParticles(e.x, 1.0, e.z, 0xf97316, 1);
        }
      }
      if (e.poisonDps > 0) {
        const tickDmg = this.scaleAuxiliaryPlayerDamage(e.poisonDps * dt, e);
        e.hp -= tickDmg;
        this.dmgElemental += tickDmg;
        if (Math.random() < 0.15) {
          this.spawnParticles(e.x, 1.0, e.z, 0x4ade80, 1);
        }
      }
      if (e.isTrainingDummy) {
        e.hp = e.maxHp;
        if (e.model.weaponOrRing) {
          e.model.weaponOrRing.rotation.z += dt * 1.1;
        }
        e.model.bodyGroup.rotation.z =
          e.hitFlashTimer > 0 ? Math.sin(this.elapsed * 42) * 0.14 : THREE.MathUtils.damp(e.model.bodyGroup.rotation.z, 0, 12, dt);
        continue;
      }

      if (e.hp <= 0) {
        const kIdx = this.enemies.indexOf(e);
        if (kIdx !== -1) this.killEnemy(kIdx);
        continue;
      }

      // Wave 12: Stationary Crystal Vault Pillars gently rotate their crown ring and never attack
      if (e.isVaultPillar) {
        if (e.model.weaponOrRing) {
          e.model.weaponOrRing.rotation.z += dt * (e.isGoldenPillar ? 2.4 : 1.5);
        }
        e.model.bodyGroup.position.y = Math.sin(this.elapsed * 3.0 + e.phaseAngle) * 0.04;
        continue;
      }

      if (e.isBossTotem) {
        if (e.model.weaponOrRing) {
          e.model.weaponOrRing.rotation.y += dt * 2.8;
        }
        e.model.bodyGroup.position.y = Math.sin(this.elapsed * 3.5 + e.phaseAngle) * 0.08;
        if (e.hpBarGroup && e.hpBarFill) {
          const liveRatio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
          e.hpBarGroup.visible = e.hp > 0;
          e.hpBarGroup.position.set(e.x, e.hpBarHeight ?? 2.35, e.z);
          e.hpBarGroup.quaternion.copy(this.camera.quaternion);
          e.hpBarFill.scale.x = Math.max(0.01, liveRatio);
        }
        continue;
      }

      // Wave 12 + Wave 5: Boss Break-Shield Stun freezes movement & attacks with dramatic staggered kneel posture
      if (e.stunTimer && e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        e.vx = 0;
        e.vz = 0;
        e.mobDashActive = false;
        e.mobVisualHeightY = 0;
        if (e.telegraphType === 'lane') {
          if (e.isBoss) {
            this.dangerLanePool.forEach((l) => {
              l.active = false;
              l.mesh.visible = false;
            });
          } else {
            e.laneAngles.forEach((_, lIdx) => {
              const lane = this.dangerLanePool[(e.id + lIdx) % this.dangerLanePool.length];
              if (lane) {
                lane.active = false;
                lane.mesh.visible = false;
              }
            });
          }
        }
        e.telegraphType = 'none';
        e.telegraphGroup.visible = false;
        e.laserLine.visible = false;
        e.punishWindowTimer = 0;
        if (e.punishRingMesh) e.punishRingMesh.visible = false;
        e.model.bodyGroup.position.y = THREE.MathUtils.damp(
          e.model.bodyGroup.position.y,
          e.isBoss ? -0.36 : -0.18,
          12,
          dt
        );
        e.model.bodyGroup.rotation.x = THREE.MathUtils.damp(
          e.model.bodyGroup.rotation.x,
          e.isBoss ? 0.28 : 0.14,
          12,
          dt
        );
        e.model.bodyGroup.rotation.z = Math.sin(this.elapsed * 26) * 0.1;
        if (e.autoRig) {
          e.model.bodyGroup.position.y = 0;
          e.model.bodyGroup.rotation.x = 0;
          e.model.bodyGroup.rotation.z = 0;
          updateAutoRigPose(e.autoRig, {
            elapsed: this.elapsed,
            dt,
            phaseAngle: e.phaseAngle,
            speed: 0,
            maxSpeed: e.speed,
            lateralSpeed: 0,
            facingYaw: e.model.root.rotation.y,
            telegraphType: 'none',
            telegraphProgress: 0,
            burstType: 'none',
            burstTimer: 0,
            bossPhase: e.bossPhase,
            stunTimer: e.stunTimer,
            hitFlashTimer: e.hitFlashTimer,
            recoilPitch: 0,
            recoilRoll: 0,
            isDashing: false,
          });
          if (e.boneTrails) {
            e.model.root.updateMatrixWorld(true);
            updateBoneTrailController(e.boneTrails, 0, dt);
          }
        }
        if (e.stunTimer <= 0) {
          e.model.bodyGroup.position.y = 0;
          e.model.bodyGroup.rotation.x = 0;
          e.model.bodyGroup.rotation.z = 0;
          if (e.maxBreakShield) {
            e.breakShield = e.maxBreakShield;
          }
        }
        continue;
      } else if (e.isBoss && Math.abs(e.model.bodyGroup.rotation.x) > 0.005) {
        e.model.bodyGroup.rotation.x = THREE.MathUtils.damp(e.model.bodyGroup.rotation.x, 0, 10, dt);
      }

      const superFreeze = (this.activeSkills.super_freeze ?? 0) > 0;
      const rawSlowMult = e.chillTimer > 0 ? (superFreeze ? 0.42 : 0.58) : 1.0;
      const slowMult = clampBossChillSlowMult(rawSlowMult, e.isBoss && !e.isArenaRival);
      if (e.chillTimer > 0) e.chillTimer -= dt;

      // Phase 2: 3D Boss Punish Window emerald halo tick
      if (e.isBoss && e.punishWindowTimer && e.punishWindowTimer > 0) {
        e.punishWindowTimer = Math.max(0, e.punishWindowTimer - dt);
        if (e.punishRingMesh) {
          const active = e.punishWindowTimer > 0 && e.telegraphType === 'none';
          e.punishRingMesh.visible = active;
          if (active) {
            const pRatio = e.punishWindowMax
              ? Math.max(0, Math.min(1, e.punishWindowTimer / e.punishWindowMax))
              : 1;
            const pulseScale = 1.42 + Math.sin(this.elapsed * 12) * 0.06;
            e.punishRingMesh.position.set(e.x, 0.055, e.z);
            e.punishRingMesh.scale.setScalar(e.radius * pulseScale);
            (e.punishRingMesh.material as THREE.MeshBasicMaterial).opacity =
              0.45 + pRatio * 0.4;
          }
        }
      } else if (e.punishRingMesh && e.punishRingMesh.visible) {
        e.punishRingMesh.visible = false;
      }

      // Phase 3–4: Elite Affix 3D ground ring sync (Single & Dual) & Frost pulse behavior
      const activeAffixes = e.eliteAffixes ?? (e.eliteAffix ? [e.eliteAffix] : []);
      if (e.eliteAuraRingMesh && activeAffixes.length > 0) {
        e.eliteAuraRingMesh.position.set(e.x, 0.04, e.z);
        const pulse = 1.28 + Math.sin(this.elapsed * 5.2 + e.phaseAngle) * 0.07;
        e.eliteAuraRingMesh.scale.setScalar(e.radius * pulse);
        if (activeAffixes[0] === 'aegis') {
          const hasShield = (e.eliteShieldHp ?? 0) > 0;
          e.eliteAuraRingMesh.visible = hasShield;
        }
        if (e.eliteAuraRingMesh2 && activeAffixes[1]) {
          e.eliteAuraRingMesh2.position.set(e.x, 0.045, e.z);
          const pulse2 = 1.34 + Math.cos(this.elapsed * 4.4 + e.phaseAngle) * 0.07;
          e.eliteAuraRingMesh2.scale.setScalar(e.radius * pulse2);
          if (activeAffixes[1] === 'aegis') {
            e.eliteAuraRingMesh2.visible = (e.eliteShieldHp ?? 0) > 0;
          }
        }
        if (activeAffixes.includes('frost') && e.eliteFrostPulseTimer !== undefined) {
          e.eliteFrostPulseTimer -= dt;
          if (e.eliteFrostPulseTimer <= 0) {
            e.eliteFrostPulseTimer = 3.6;
            const dHero = Math.hypot(this.px - e.x, this.pz - e.z);
            if (dHero <= 5.4) {
              soundEngine.playEliteAffixTrigger('frost');
              this.spawnShockwave(e.x, e.z, 0x67e8f9, 4.6, 0.38);
              this.playerFrostSlowTimer = 1.4;
              this.emitFloatingNumber(this.px, 2.0, this.pz, 0, false, false, 'ice', 'HÀN KHÍ CHẬM!');
            }
          }
        }
      }

      const dx = this.px - e.x;
      const dz = this.pz - e.z;
      const distToHero = Math.hypot(dx, dz);
      const distToCrystal = Math.hypot(-e.x, -e.z);
      const targetCrystal =
        this.isCrystalDefenseMode &&
        Boolean(this.crystalRefs) &&
        distToCrystal < distToHero * 1.18;
      const moveDx = targetCrystal ? -e.x : dx;
      const moveDz = targetCrystal ? -e.z : dz;
      const moveDist = targetCrystal ? distToCrystal : distToHero;
      const dirX = moveDist > 0.001 ? moveDx / moveDist : 0;
      const dirZ = moveDist > 0.001 ? moveDz / moveDist : 1;
      const mobTargetX = targetCrystal ? 0 : this.px;
      const mobTargetZ = targetCrystal ? 0 : this.pz;

      if (e.mobSideHopTimer && e.mobSideHopTimer > 0) {
        e.mobSideHopTimer = Math.max(0, e.mobSideHopTimer - dt);
      }
      if (e.mobBurstTimer && e.mobBurstTimer > 0) {
        e.mobBurstTimer = Math.max(0, e.mobBurstTimer - dt);
      }
      if (e.footstepDustTimer && e.footstepDustTimer > 0) {
        e.footstepDustTimer = Math.max(0, e.footstepDustTimer - dt);
      }
      if (e.mobFlankSign === undefined) {
        e.mobFlankSign = e.id % 2 === 0 ? 1 : -1;
      }

      const aaaMobBudget = getAaaMobVfxBudget(this.lowEndGpu);
      const isAaaRegularMob =
        !e.isBoss &&
        !e.isArenaRival &&
        !e.isTrainingDummy &&
        !e.isVaultPillar &&
        (e.kind === EnemyKind.SKIRMISHER ||
          e.kind === EnemyKind.GOLEM ||
          e.kind === EnemyKind.IMP_ARCHER ||
          e.kind === EnemyKind.DRAGON_WHELP ||
          e.kind === EnemyKind.WISP ||
          e.kind === EnemyKind.SHADOW_STALKER);

      const isEnraged = e.isBoss && e.bossPhase >= 2;

      // Ensure every non-rival, non-dummy boss across ALL modes gets dynamic Zodiac Boss AI
      if (
        e.isBoss &&
        !e.isArenaRival &&
        !e.isTrainingDummy &&
        !e.isVaultPillar &&
        !e.bossAiState
      ) {
        e.bossAiState = this.buildBossAiStateForKind(e.kind);
      }

      const bossAi = e.bossAiState;
      const bossEnrageMods = this.getBossTimedEnrageMods(e);
      if (bossAi) {
        if (bossAi.blinkFlashTimer > 0) {
          bossAi.blinkFlashTimer = Math.max(0, bossAi.blinkFlashTimer - dt);
        }
        // Boss Timed Enrage ("CUỒNG NỘ BẠO PHÁT") — ticks on PvE bosses to prevent infinite kiting
        if (this.isTimedEnrageEnabledForBoss(e)) {
          bossAi.timedEnrageElapsed += dt;
          if (!bossAi.timedEnrageTriggered && bossAi.timedEnrageElapsed >= bossAi.timedEnrageLimitSec) {
            bossAi.timedEnrageTriggered = true;
            soundEngine.playBossAlarm();
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.46);
            this.spawnShockwave(e.x, e.z, 0xe11d48, 6.2, 0.48);
            this.emitFloatingNumber(e.x, 2.65, e.z, 0, true, false, 'fire', 'CUỒNG NỘ BẠO PHÁT!', true);
          }
        }
        // Process staggered follow-up projectile / shockwave waves (true rotating spirals, mobile bursts, tectonic rings)
        if (bossAi.pendingVolleys.length > 0) {
          const bossPartSlowPct = e.bossParts
            ? Math.min(0.4, e.bossParts.reduce((s, bp) => s + (bp.broken ? bp.barrageSlowPct : 0), 0))
            : 0;
          const pveProjMult =
            !this.isTrainingMode && !this.isArenaMode && !this.isWeeklyRankedBossMode
              ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).enemyProjectileSpeedMult
              : 1.0;
          const finalProjMult = pveProjMult * (1 - bossPartSlowPct);
          for (let vi = bossAi.pendingVolleys.length - 1; vi >= 0; vi--) {
            const volley = bossAi.pendingVolleys[vi];
            volley.delaySec -= dt * slowMult;
            if (volley.delaySec <= 0) {
              bossAi.pendingVolleys.splice(vi, 1);
              this.fireBossPendingVolley(e, volley, finalProjMult);
            }
          }
        }
      }

      // Active Boss Movement Action (Parabolic Leap Slam / High-Speed Dash Charge / Guard Stance)
      if (bossAi && bossAi.activeAction) {
        const act = bossAi.activeAction;
        act.elapsed += dt * slowMult;
        const progress = Math.min(1, act.elapsed / Math.max(0.05, act.duration));

        if (act.kind === 'leap') {
          const prevX = e.x;
          const prevZ = e.z;
          e.x = act.startX + (act.targetX - act.startX) * progress;
          e.z = act.startZ + (act.targetZ - act.startZ) * progress;
          e.vx = (e.x - prevX) / Math.max(0.001, dt);
          e.vz = (e.z - prevZ) / Math.max(0.001, dt);
          bossAi.visualHeightY = 4 * act.peakHeight * progress * (1 - progress);
          if (progress >= 1) {
            bossAi.visualHeightY = 0;
            bossAi.activeAction = null;
            this.resolveBossLeapLanding(e, act);
            this.scheduleNextBossCooldownOrCombo(e, isEnraged);
          }
        } else if (act.kind === 'dash') {
          const dashSpd = act.speed * slowMult;
          e.vx = act.dirX * dashSpd;
          e.vz = act.dirZ * dashSpd;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          bossAi.visualHeightY = 0;

          const budget = getBossPerformanceBudget(this.lowEndGpu);
          if (Math.random() < (this.lowEndGpu ? 0.35 : 0.7)) {
            this.spawnParticles(e.x, 0.65, e.z, act.colorHex, Math.max(1, Math.round(3 * budget.particleScale)));
          }
          act.trailTimer -= dt;
          if (act.hazardKind && budget.allowTrailHazards && act.trailTimer <= 0) {
            act.trailTimer = this.lowEndGpu ? 0.24 : 0.16;
            this.spawnBossHazardZone({
              kind: act.hazardKind,
              x: e.x,
              z: e.z,
              radius: 1.95,
              durationSec: Math.min(3.8, act.hazardDurationSec ?? 3.4),
              damagePerTick: this.getEffectiveBossAttackDamage(e, 0.42),
              ownerName: e.bossTitle || this.currentChapter.bossName,
            });
          }

          // Contact hit during boss dash charge
          if (!act.hitPlayerDuringDash && Math.hypot(this.px - e.x, this.pz - e.z) < e.radius + 0.75) {
            act.hitPlayerDuringDash = true;
            this.damagePlayer(
              this.getEffectiveBossAttackDamage(e, act.damageMult),
              {
                code: 'boss_lane',
                label: `${bossAi.activeSkillLabel || 'Xung Kích'} của ${e.bossTitle ?? 'Boss'}`,
                tip: 'Lướt ngang vuông góc đường xung kích để dụ Boss đập tường bị choáng!',
                killerName: e.bossTitle,
              },
              e.x,
              e.z
            );
          }

          // Shatter destructible obstacles along charge path; hitting arena boundary staggers the boss (respects stun immunity)!
          for (const obs of this.obstacles) {
            if (obs.intact === false) continue;
            if (Math.hypot(e.x - obs.x, e.z - obs.z) < e.radius + obs.radius + 0.25) {
              if (obs.destructible) {
                this.shatterCrystalObstacle(obs);
              } else {
                bossAi.activeAction = null;
                clearBossAiTransientCombat(bossAi);
                if (!e.bossStunImmuneTimer || e.bossStunImmuneTimer <= 0) {
                  e.stunTimer = 1.5;
                  e.bossStunImmuneTimer = 8.0;
                  this.emitFloatingNumber(e.x, 2.35, e.z, 0, true, false, 'fire', 'CHOÁNG ĐẬP TRỤ!', true);
                } else {
                  this.emitFloatingNumber(e.x, 2.35, e.z, 0, false, false, 'ice', 'KHÁNG CHOÁNG!');
                }
                e.vx = 0;
                e.vz = 0;
                this.openBossWeakPoint(e);
                soundEngine.playBossGuardBreak(computeSpatialPan(e.x, ARENA_HALF_W));
                this.spawnShockwave(e.x, e.z, 0xfbbf24, 3.2, 0.34);
                this.scheduleNextBossCooldownOrCombo(e, isEnraged);
                break;
              }
            }
          }

          if (
            bossAi.activeAction &&
            (Math.abs(e.x) >= ARENA_HALF_W - e.radius - 0.12 ||
              Math.abs(e.z) >= ARENA_HALF_D - e.radius - 0.12)
          ) {
            bossAi.activeAction = null;
            clearBossAiTransientCombat(bossAi);
            if (!e.bossStunImmuneTimer || e.bossStunImmuneTimer <= 0) {
              e.stunTimer = 1.5;
              e.bossStunImmuneTimer = 8.0;
              this.emitFloatingNumber(e.x, 2.35, e.z, 0, true, false, 'fire', 'CHOÁNG ĐẬP TƯỜNG!', true);
            } else {
              this.emitFloatingNumber(e.x, 2.35, e.z, 0, false, false, 'ice', 'KHÁNG CHOÁNG!');
            }
            e.vx = 0;
            e.vz = 0;
            this.openBossWeakPoint(e);
            soundEngine.playBossGuardBreak(computeSpatialPan(e.x, ARENA_HALF_W));
            this.spawnShockwave(e.x, e.z, 0xfbbf24, 3.4, 0.36);
            this.scheduleNextBossCooldownOrCombo(e, isEnraged);
          } else if (bossAi.activeAction && progress >= 1) {
            bossAi.activeAction = null;
            this.spawnShockwave(e.x, e.z, act.colorHex, 2.6, 0.26);
            this.scheduleNextBossCooldownOrCombo(e, isEnraged);
          }
        } else if (act.kind === 'guard') {
          bossAi.guardDamageReduction = 0.35;
          const move = stepBossMovement(bossAi, {
            dt,
            elapsed: this.elapsed,
            bossX: e.x,
            bossZ: e.z,
            playerX: this.px,
            playerZ: this.pz,
            baseSpeed: e.speed,
            slowMult,
            bossPhase: e.bossPhase,
            arenaHalfW: ARENA_HALF_W,
            arenaHalfD: ARENA_HALF_D,
            isTelegraphing: true,
            telegraphMoveMult: 0.64,
            enrageSpeedMult: bossEnrageMods.speedMult,
          });
          e.vx = move.vx;
          e.vz = move.vz;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          if (progress >= 1) {
            bossAi.guardDamageReduction = 0;
            bossAi.activeAction = null;
            this.resolveBossGuardCounterBurst(e, act);
            this.scheduleNextBossCooldownOrCombo(e, isEnraged);
          }
        }
      } else if (e.mobDashActive) {
        // AAA Continuous Physical Mob Dash / Pounce Curve (replaces 1-frame teleport lunges)
        const dashStep = stepMobPhysicalDash({
          x: e.x,
          z: e.z,
          dirX: e.mobDashDirX ?? dirX,
          dirZ: e.mobDashDirZ ?? dirZ,
          speed: (e.mobDashSpeed ?? 16) * slowMult,
          elapsed: e.mobDashElapsed ?? 0,
          duration: e.mobDashDuration ?? 0.28,
          hopHeight: e.mobDashHopHeight ?? 0.5,
          radius: e.radius,
          arenaHalfW: ARENA_HALF_W,
          arenaHalfD: ARENA_HALF_D,
          dt,
          obstacles: this.obstacles,
        });
        e.x = dashStep.x;
        e.z = dashStep.z;
        e.vx = dashStep.vx;
        e.vz = dashStep.vz;
        e.mobDashElapsed = dashStep.elapsed;
        e.mobVisualHeightY = dashStep.hopHeightY;
        e.bankPitch = 0.24 * (1 - dashStep.progress * 0.45);
        e.bankRoll = THREE.MathUtils.damp(e.bankRoll ?? 0, 0, 12, dt);

        if (Math.random() < 0.65 * aaaMobBudget.trailParticleScale) {
          this.spawnParticles(
            e.x,
            0.45 + dashStep.hopHeightY * 0.6,
            e.z,
            e.mobDashColorHex ?? 0xf97316,
            Math.max(1, Math.round(3 * aaaMobBudget.trailParticleScale))
          );
        }

        if (!e.mobDashHitPlayer && Math.hypot(this.px - e.x, this.pz - e.z) < e.radius + 0.85) {
          e.mobDashHitPlayer = true;
          this.damagePlayer(
            e.damage * 1.05,
            {
              code: 'melee_swarm',
              label:
                e.kind === EnemyKind.DRAGON_WHELP
                  ? 'Cú đâm thương xung kích'
                  : e.kind === EnemyKind.SHADOW_STALKER
                  ? 'Ám kích trảm ảnh'
                  : 'Cú vồ lao tốc độ cao',
              tip: 'Lướt vuông góc khỏi làn cảnh báo trắng-vàng ngay trước khi quái phóng tới để Né Hoàn Hảo!',
            },
            e.x,
            e.z
          );
        }

        if (dashStep.finished) {
          e.mobDashActive = false;
          e.mobVisualHeightY = 0;
          if (aaaMobBudget.trailParticleScale >= 0.5) {
            this.spawnParticles(e.x, 0.2, e.z, e.mobDashColorHex ?? 0xfacc15, 4);
          }
        }
      } else if (e.telegraphType !== 'none') {
        e.telegraphTimer -= dt * slowMult;
        const cue = computeHadesTelegraphCue(e.telegraphTimer, e.telegraphDuration);
        const progress = cue.progress;
        const pulse = 0.65 + 0.35 * Math.sin(this.elapsed * 20);
        const isImpactFlash = cue.inStrikeWindow || e.telegraphTimer <= 0.12;
        const strikeFlashHex = 0xfff7ed; // Crisp Hades white-gold flash in final 20%

        const tp = resolveTelegraphPalette(this.highContrastTelegraphs);
        if (e.telegraphType === 'shot') {
          e.laserLine.visible = true;
          const posAttr = e.laserLine.geometry.getAttribute(
            'position'
          ) as THREE.BufferAttribute;
          posAttr.setXYZ(0, e.x, 0.95, e.z);
          posAttr.setXYZ(1, e.x + e.aimX * 14, 0.95, e.z + e.aimZ * 14);
          posAttr.needsUpdate = true;
          const lMat = e.laserLine.material as THREE.LineBasicMaterial;
          lMat.color.setHex(
            cue.inStrikeWindow && aaaMobBudget.allowStrikeRingFlash
              ? strikeFlashHex
              : isImpactFlash
              ? tp.imminentHex
              : tp.laneHex
          );
          lMat.opacity = isImpactFlash ? 1.0 : 0.72 + progress * 0.22;
        } else if (e.telegraphType === 'slam' || e.telegraphType === 'lunge') {
          e.telegraphGroup.visible = true;
          e.telegraphGroup.position.set(e.slamX, 0.09, e.slamZ);
          e.telegraphGroup.scale.setScalar(
            e.slamRadius * (cue.inStrikeWindow ? cue.ringScaleBoost : 0.98 + pulse * 0.03)
          );
          e.telegraphFill.scale.setScalar(0.15 + progress * 0.85);
          const fillMat = e.telegraphFill.material as THREE.MeshBasicMaterial;
          fillMat.color.setHex(
            cue.inStrikeWindow ? strikeFlashHex : isImpactFlash ? tp.ringHex : tp.fillHex
          );
          fillMat.opacity = cue.fillOpacity;
          if (e.telegraphOuterRing) {
            const outMat = e.telegraphOuterRing.material as THREE.MeshBasicMaterial;
            outMat.color.setHex(
              cue.inStrikeWindow ? strikeFlashHex : isImpactFlash ? tp.imminentHex : tp.ringHex
            );
            outMat.opacity = cue.ringOpacity;
          }
          if (e.telegraphCountdownRing) {
            const cd = computeCountdownRingScale(progress);
            e.telegraphCountdownRing.scale.setScalar(Math.min(cd.scale, cue.countdownScale));
            const cdMat = e.telegraphCountdownRing.material as THREE.MeshBasicMaterial;
            cdMat.color.setHex(
              cue.inStrikeWindow ? strikeFlashHex : cd.isImminent ? tp.imminentHex : tp.ringHex
            );
            cdMat.opacity = cue.inStrikeWindow || cd.isImminent ? 1.0 : 0.92;
          }
        } else if (e.telegraphType === 'lane') {
          e.laneAngles.forEach((ang, lIdx) => {
            const laneSlot = e.isBoss
              ? lIdx % this.dangerLanePool.length
              : (e.id + lIdx) % this.dangerLanePool.length;
            const lane = this.dangerLanePool[laneSlot];
            if (!lane) return;
            lane.active = true;
            lane.mesh.visible = true;
            lane.mesh.position.set(e.x, 0.09, e.z);
            lane.mesh.rotation.y = ang;
            lane.fillMesh.scale.set(0.1 + progress * 0.9, 1, 1);
            const laneMat = lane.fillMesh.material as THREE.MeshBasicMaterial;
            laneMat.color.setHex(
              cue.inStrikeWindow ? strikeFlashHex : isImpactFlash ? tp.ringHex : tp.laneHex
            );
            laneMat.opacity = cue.inStrikeWindow ? 0.98 : 0.48 + pulse * 0.34;
          });
        }

        // Bosses stay fluidly mobile during telegraphs (>= 55% speed) instead of freezing like statues
        if (bossAi) {
          const activeSkill =
            bossAi.activeSkillId
              ? ZODIAC_BOSS_PROFILES[bossAi.profileId]?.skills[bossAi.activeSkillId]
              : undefined;
          const teleMoveMult = activeSkill?.telegraphMoveMult ?? 0.64;
          const move = stepBossMovement(bossAi, {
            dt,
            elapsed: this.elapsed,
            bossX: e.x,
            bossZ: e.z,
            playerX: this.px,
            playerZ: this.pz,
            baseSpeed: e.speed,
            slowMult,
            bossPhase: e.bossPhase,
            arenaHalfW: ARENA_HALF_W,
            arenaHalfD: ARENA_HALF_D,
            isTelegraphing: true,
            telegraphMoveMult: teleMoveMult,
            enrageSpeedMult: bossEnrageMods.speedMult,
          });
          e.vx = move.vx;
          e.vz = move.vz;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
        } else if (isAaaRegularMob && e.tacticalRole !== 'charger') {
          // Regular mobs also retain fluid telegraph mobility (never freeze statically)
          const teleSteer = computeAaaMobSteering({
            kind: e.kind as AaaMobKind,
            selfId: e.id,
            x: e.x,
            z: e.z,
            vx: e.vx,
            vz: e.vz,
            radius: e.radius,
            baseSpeed: e.speed,
            facingYaw: e.model.root.rotation.y,
            playerX: mobTargetX,
            playerZ: mobTargetZ,
            flankSign: e.mobFlankSign ?? 1,
            isTelegraphing: true,
            activeSkill: e.mobActiveSkill ?? '',
            sideHopTimer: e.mobSideHopTimer ?? 0,
            sideHopDirX: e.mobSideHopDirX ?? 0,
            sideHopDirZ: e.mobSideHopDirZ ?? 0,
            elapsedTime: this.elapsed,
            dt,
            currentBankRoll: e.bankRoll ?? 0,
            currentBankPitch: e.bankPitch ?? 0,
            neighbors: enemySnapshot,
            obstacles: this.obstacles,
          });
          e.vx = teleSteer.vx * slowMult;
          e.vz = teleSteer.vz * slowMult;
          e.bankRoll = teleSteer.bankRoll;
          e.bankPitch = teleSteer.bankPitch;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          if (
            e.mobActiveSkill === 'juggernaut_advance_slam' ||
            e.mobActiveSkill === 'seismic_fissure_slam' ||
            e.mobActiveSkill === 'spiral_pulse_ring'
          ) {
            e.slamX = e.x;
            e.slamZ = e.z;
          } else if (e.mobActiveSkill === 'flank_crescent_swipe') {
            e.slamX = THREE.MathUtils.clamp(e.x + e.aimX * 1.4, -ARENA_HALF_W + 1.2, ARENA_HALF_W - 1.2);
            e.slamZ = THREE.MathUtils.clamp(e.z + e.aimZ * 1.4, -ARENA_HALF_D + 1.2, ARENA_HALF_D - 1.2);
          }
        }

        if (e.telegraphTimer <= 0) {
          e.laserLine.visible = false;
          e.telegraphGroup.visible = false;
          if (e.telegraphType === 'lane') {
            if (e.isBoss) {
              this.dangerLanePool.forEach((l) => {
                l.active = false;
                l.mesh.visible = false;
              });
            } else {
              e.laneAngles.forEach((_, lIdx) => {
                const lane = this.dangerLanePool[(e.id + lIdx) % this.dangerLanePool.length];
                if (lane) {
                  lane.active = false;
                  lane.mesh.visible = false;
                }
              });
            }
          }
          if (bossAi) {
            const startedActiveMotion = this.executeZodiacBossSkill(e, bossAi, isEnraged);
            e.telegraphType = 'none';
            if (!startedActiveMotion) {
              this.scheduleNextBossCooldownOrCombo(e, isEnraged);
            }
          } else {
            this.executeEnemyAttack(e, isEnraged);
            e.telegraphType = 'none';
            // Deliberate punish recovery windows per archetype; Arena AI Rival uses lethal adaptive cadence
            if (e.isArenaRival) {
              e.attackTimer = this.aiRivalNextCooldown;
            } else {
              const pveProfile =
                !this.isTrainingMode && !this.isWeeklyRankedBossMode
                  ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled)
                  : null;
              const pveCdMult = pveProfile ? pveProfile.enemyCooldownMult : 1.0;
              const plannedCd = e.mobNextCooldown ?? 1.85 + Math.random() * 0.7;
              e.attackTimer = plannedCd * pveCdMult;
            }
          }
        }
        // Wave 8: Lethal AI Rival stays mobile & agile even while telegraphing!
        if (e.isArenaRival && this.aiRivalBrainState) {
          const playerArrows = this.arrowPool
            .filter((a) => a.active)
            .map((a) => ({ x: a.x, z: a.z, vx: a.vx, vz: a.vz, radius: 0.42 }));
          const step = stepAiRivalCombatBrain(this.aiRivalBrainState, {
            dt,
            simTimeSec: this.simClock.totalSimTime,
            rivalX: e.x,
            rivalZ: e.z,
            rivalHpRatio: e.hp / Math.max(1, e.maxHp),
            playerX: this.px,
            playerZ: this.pz,
            playerVx: this.pvx,
            playerVz: this.pvz,
            arenaHalfW: ARENA_HALF_W,
            arenaHalfD: ARENA_HALF_D,
            incomingArrows: playerArrows,
            attackReady: false,
            isTelegraphing: true,
            escalation: this.aiRivalMatchConfig?.escalation,
          });
          e.vx = step.moveX * e.speed * step.speedMult * slowMult;
          e.vz = step.moveZ * e.speed * step.speedMult * slowMult;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
        }
      } else {
        e.attackTimer -= dt * slowMult;
        if (e.chargerCooldown !== undefined && e.chargerCooldown > 0) {
          e.chargerCooldown -= dt * slowMult;
        }

        if (e.chargerDashing) {
          e.chargerDashTimer = (e.chargerDashTimer ?? 0) - dt;
          const dashSpd = e.speed * 3.15 * slowMult;
          e.vx = (e.chargerDirX ?? dirX) * dashSpd;
          e.vz = (e.chargerDirZ ?? dirZ) * dashSpd;
          e.x += e.vx * dt;
          e.z += e.vz * dt;
          if (Math.random() < 0.55 * aaaMobBudget.trailParticleScale) {
            this.spawnParticles(e.x, 0.5, e.z, 0xf43f5e, 2);
          }
          if (
            Math.abs(e.x) >= ARENA_HALF_W - e.radius - 0.1 ||
            Math.abs(e.z) >= ARENA_HALF_D - e.radius - 0.1
          ) {
            e.chargerDashing = false;
            e.stunTimer = 2.1;
            e.chargerCooldown = 4.2;
            soundEngine.playBossGuardBreak(computeSpatialPan(e.x, ARENA_HALF_W));
            this.spawnShockwave(e.x, e.z, 0xfbbf24, 2.4, 0.3);
            this.emitFloatingNumber(e.x, 2.1, e.z, 0, true, false, 'fire', 'CHOÁNG ĐẬP TƯỜNG!');
          } else if ((e.chargerDashTimer ?? 0) <= 0) {
            e.chargerDashing = false;
            e.chargerCooldown = 3.8;
          }
        } else if (e.tacticalRole === 'charger' && (e.chargerCooldown ?? 99) <= 0 && distToHero < 8.5) {
          e.telegraphType = 'lunge';
          e.telegraphDuration = 0.52;
          e.telegraphTimer = 0.52;
          e.aimX = dirX;
          e.aimZ = dirZ;
          e.slamX = e.x + dirX * 3.6;
          e.slamZ = e.z + dirZ * 3.6;
          e.slamRadius = 1.45;
          e.vx *= 0.25;
          e.vz *= 0.25;
        } else if (isAaaRegularMob) {
          // AAA Hades-style Regular Mob Steering: flanking arcs, squad separation, obstacle avoidance & inertia
          const steer = computeAaaMobSteering({
            kind: e.kind as AaaMobKind,
            selfId: e.id,
            x: e.x,
            z: e.z,
            vx: e.vx,
            vz: e.vz,
            radius: e.radius,
            baseSpeed: e.speed,
            facingYaw: e.model.root.rotation.y,
            playerX: mobTargetX,
            playerZ: mobTargetZ,
            flankSign: e.mobFlankSign ?? 1,
            isTelegraphing: false,
            activeSkill: '',
            sideHopTimer: e.mobSideHopTimer ?? 0,
            sideHopDirX: e.mobSideHopDirX ?? 0,
            sideHopDirZ: e.mobSideHopDirZ ?? 0,
            elapsedTime: this.elapsed,
            dt,
            currentBankRoll: e.bankRoll ?? 0,
            currentBankPitch: e.bankPitch ?? 0,
            neighbors: enemySnapshot,
            obstacles: this.obstacles,
          });
          e.vx = steer.vx * slowMult;
          e.vz = steer.vz * slowMult;
          e.bankRoll = steer.bankRoll;
          e.bankPitch = steer.bankPitch;

          // Subtle footstep / cornering skid dust puffs scaled cleanly for Lite vs High GPU
          const spdNow = Math.hypot(e.vx, e.vz);
          if (
            spdNow > e.speed * 0.55 &&
            (e.footstepDustTimer ?? 0) <= 0 &&
            e.kind !== EnemyKind.WISP &&
            e.kind !== EnemyKind.IMP_ARCHER
          ) {
            if (steer.isSkidding && aaaMobBudget.allowSkidDust) {
              this.spawnParticles(e.x, 0.14, e.z, 0xd6d3d1, 2);
              e.footstepDustTimer = 0.26;
            } else if (Math.random() < aaaMobBudget.footstepDustChance) {
              this.spawnParticles(e.x, 0.12, e.z, 0xa8a29e, 1);
              e.footstepDustTimer = this.lowEndGpu ? 0.58 : 0.34;
            } else {
              e.footstepDustTimer = 0.24;
            }
          }

          // Trigger archetype's 2-skill Hades rotation when in engagement range
          const inSkillRange =
            e.kind === EnemyKind.SKIRMISHER
              ? distToHero < 5.8
              : e.kind === EnemyKind.GOLEM
              ? distToHero < 7.2
              : e.kind === EnemyKind.DRAGON_WHELP
              ? distToHero < 10.6
              : e.kind === EnemyKind.SHADOW_STALKER
              ? distToHero < 9.5
              : e.kind === EnemyKind.WISP
              ? distToHero < 11.4
              : distToHero < 13.8;

          if (e.attackTimer <= 0 && inSkillRange) {
            let activeMortars = 0;
            for (let mIdx = 0; mIdx < this.bossMultiSlamPool.length; mIdx++) {
              if (this.bossMultiSlamPool[mIdx].active) activeMortars += 1;
            }
            const plan = planAaaMobSkill({
              kind: e.kind as AaaMobKind,
              skillCycle: e.mobSkillCycle ?? 0,
              enemyX: e.x,
              enemyZ: e.z,
              playerX: this.px,
              playerZ: this.pz,
              playerVx: this.pvx,
              playerVz: this.pvz,
              baseCooldown: 1.85,
              allowMortar: activeMortars < aaaMobBudget.maxMobMortarCircles,
              chapterIndex: this.currentChapter.id,
            });
            e.mobActiveSkill = plan.skillId;
            e.mobSkillCycle = plan.nextSkillCycle;
            e.mobNextCooldown = plan.nextCooldown;
            if (plan.shouldFlipFlank) {
              e.mobFlankSign = -(e.mobFlankSign ?? 1);
            }
            e.aimX = plan.aimX;
            e.aimZ = plan.aimZ;
            e.telegraphDuration = plan.telegraphDuration;
            e.telegraphTimer = plan.telegraphDuration;

            if (plan.telegraphType === 'lane') {
              e.telegraphType = 'lane';
              e.laneAngles = [Math.atan2(plan.aimX, plan.aimZ)];
            } else if (plan.skillId === 'flank_crescent_swipe') {
              e.telegraphType = 'lunge';
              e.slamX = THREE.MathUtils.clamp(
                e.x + plan.aimX * 1.4,
                -ARENA_HALF_W + 1.2,
                ARENA_HALF_W - 1.2
              );
              e.slamZ = THREE.MathUtils.clamp(
                e.z + plan.aimZ * 1.4,
                -ARENA_HALF_D + 1.2,
                ARENA_HALF_D - 1.2
              );
              e.slamRadius = plan.telegraphRadius;
            } else if (
              plan.skillId === 'seismic_fissure_slam' ||
              plan.skillId === 'juggernaut_advance_slam' ||
              plan.skillId === 'spiral_pulse_ring'
            ) {
              e.telegraphType = 'slam';
              e.slamX = e.x;
              e.slamZ = e.z;
              e.slamRadius = plan.telegraphRadius;
            } else if (plan.skillId === 'solar_rune_mortar') {
              e.telegraphType = 'shot';
              e.slamX = THREE.MathUtils.clamp(
                plan.targetX,
                -ARENA_HALF_W + 1.6,
                ARENA_HALF_W - 1.6
              );
              e.slamZ = THREE.MathUtils.clamp(
                plan.targetZ,
                -ARENA_HALF_D + 1.6,
                ARENA_HALF_D - 1.6
              );
              e.slamRadius = plan.telegraphRadius;
            } else {
              e.telegraphType = 'shot';
            }
          }
        } else if (e.isArenaRival) {
          if (!this.aiRivalBrainState) {
            this.aiRivalBrainState = createAiRivalCombatState(
              this.aiDuelTier,
              this.liveAiPersonality ?? 'tactical',
              15,
              0
            );
          }
          const playerArrows = this.arrowPool
            .filter((a) => a.active)
            .map((a) => ({ x: a.x, z: a.z, vx: a.vx, vz: a.vz, radius: 0.42 }));
          const brainStep = stepAiRivalCombatBrain(this.aiRivalBrainState, {
            dt,
            simTimeSec: this.simClock.totalSimTime,
            rivalX: e.x,
            rivalZ: e.z,
            rivalHpRatio: e.hp / Math.max(1, e.maxHp),
            playerX: this.px,
            playerZ: this.pz,
            playerVx: this.pvx,
            playerVz: this.pvz,
            arenaHalfW: ARENA_HALF_W,
            arenaHalfD: ARENA_HALF_D,
            incomingArrows: playerArrows,
            attackReady: e.attackTimer <= 0,
            isTelegraphing: false,
            escalation: this.aiRivalMatchConfig?.escalation,
          });
          const adaptCounters = computeAdaptiveAiCounterAdjustments(this.aiAdaptationProfile);
          if (brainStep.triggeredDash) {
            this.spawnParticles(e.x, 0.9, e.z, 0x38bdf8, 12);
            this.emitFloatingNumber(e.x, 2.25, e.z, 0, false, false, 'ice', 'AI LƯỚT NÉ!');
            soundEngine.playDash();
          }
          if (brainStep.triggeredPhase2Enrage) {
            e.bossPhase = 2;
            this.spawnShockwave(e.x, e.z, 0xf43f5e, 4.8, 0.46);
            this.spawnImpactLight(e.x, 1.5, e.z, 'boss_slam');
            this.emitFloatingNumber(e.x, 2.5, e.z, 0, true, false, 'fire', 'CUỒNG NỘ PHASE 2!');
            soundEngine.playBossAlarm();
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
          }
          const rangeAdjustBias = Math.max(
            -1,
            Math.min(1, (distToHero - adaptCounters.preferredSpacingDist) * 0.25)
          );
          e.vx =
            (brainStep.moveX + dirX * rangeAdjustBias * 0.14) *
            e.speed *
            brainStep.speedMult *
            slowMult;
          e.vz =
            (brainStep.moveZ + dirZ * rangeAdjustBias * 0.14) *
            e.speed *
            brainStep.speedMult *
            slowMult;
          if (brainStep.patternPlan) {
            const plan = brainStep.patternPlan;
            this.aiRivalActivePattern = plan.pattern;
            this.aiRivalActiveProjSpeed = plan.projectileSpeed;
            this.aiRivalActiveDmgMult = plan.damageMult;
            this.aiRivalNextCooldown = Math.max(
              0.38,
              plan.nextCooldown * adaptCounters.dashInterceptCooldownMult
            );
            e.telegraphType = plan.telegraphType;
            e.telegraphDuration = plan.telegraphDuration;
            e.telegraphTimer = plan.telegraphDuration;
            const rawYaw = Math.atan2(plan.aimDirX, plan.aimDirZ);
            const adaptedYaw = rawYaw + adaptCounters.shotLeadAngleOffsetRad;
            e.aimX = Math.sin(adaptedYaw);
            e.aimZ = Math.cos(adaptedYaw);
            const baseYaw = adaptedYaw;
            if (plan.telegraphType === 'lane') {
              e.laneAngles = [baseYaw - 0.24, baseYaw, baseYaw + 0.24];
            } else if (plan.telegraphType === 'slam') {
              e.slamX = plan.targetX;
              e.slamZ = plan.targetZ;
              e.slamRadius = 3.15;
            }
            if (
              plan.pattern === 'crimson_snipe' ||
              plan.pattern === 'ai_ultimate' ||
              plan.pattern === 'hazard_zone'
            ) {
              soundEngine.playBossTelegraph();
            }
            if (plan.pattern === 'ai_ultimate') {
              this.spawnShockwave(e.x, e.z, 0xfbbf24, 3.6, 0.42);
              this.emitFloatingNumber(e.x, 2.5, e.z, 0, true, false, 'fire', 'AI TUYỆT KỸ!');
            }
          }
        } else if (e.isBoss && bossAi) {
          // Active Zodiac Boss Navigation (stalking, micro-dashing, orbiting, flanking — never static!)
          const move = stepBossMovement(bossAi, {
            dt,
            elapsed: this.elapsed,
            bossX: e.x,
            bossZ: e.z,
            playerX: this.px,
            playerZ: this.pz,
            baseSpeed: e.speed,
            slowMult,
            bossPhase: e.bossPhase,
            arenaHalfW: ARENA_HALF_W,
            arenaHalfD: ARENA_HALF_D,
            isTelegraphing: false,
            telegraphMoveMult: 1.0,
            enrageSpeedMult: bossEnrageMods.speedMult,
          });
          e.vx = move.vx;
          e.vz = move.vz;
          if (move.microDashTriggered) {
            const dashBudget = getBossPerformanceBudget(this.lowEndGpu);
            this.spawnParticles(
              e.x,
              0.45,
              e.z,
              bossAi.accentHex,
              Math.max(2, Math.round(5 * dashBudget.particleScale))
            );
          }

          if (e.attackTimer <= 0) {
            const plan = planNextBossSkill(bossAi, {
              bossX: e.x,
              bossZ: e.z,
              playerX: this.px,
              playerZ: this.pz,
              playerVx: this.pvx,
              playerVz: this.pvz,
              bossPhase: e.bossPhase,
              arenaHalfW: ARENA_HALF_W,
              arenaHalfD: ARENA_HALF_D,
              lowEndGpu: this.lowEndGpu,
            });
            e.patternCounter = (e.patternCounter ?? 0) + 1;
            e.punishWindowTimer = 0;
            if (e.punishRingMesh) e.punishRingMesh.visible = false;

            // Blink Strike teleports immediately to a safe flank before telegraphing its cross-lanes!
            if (plan.skill.kind === 'blink_strike') {
              const dest = computeSafeBlinkDestination({
                bossX: e.x,
                bossZ: e.z,
                playerX: this.px,
                playerZ: this.pz,
                playerVx: this.pvx,
                playerVz: this.pvz,
                strafeDir: bossAi.strafeDir,
                arenaHalfW: ARENA_HALF_W,
                arenaHalfD: ARENA_HALF_D,
              });
              const bColor = plan.skill.colorHex ?? bossAi.accentHex;
              const budget = getBossPerformanceBudget(this.lowEndGpu);
              this.spawnParticles(e.x, 1.1, e.z, bColor, Math.max(4, Math.round(14 * budget.particleScale)));
              this.spawnShockwave(e.x, e.z, bColor, 2.4, 0.24);
              e.x = dest.x;
              e.z = dest.z;
              bossAi.blinkFlashTimer = 0.35;
              this.spawnParticles(e.x, 1.1, e.z, bColor, Math.max(4, Math.round(16 * budget.particleScale)));
              this.spawnShockwave(e.x, e.z, bColor, 2.8, 0.28);
              soundEngine.playDash();
              this.emitFloatingNumber(e.x, 2.35, e.z, 0, true, false, 'ice', 'BIẾN ẢNH!');
              // Re-aim lanes from new post-blink position toward hero
              const bdx = this.px - e.x;
              const bdz = this.pz - e.z;
              const bd = Math.hypot(bdx, bdz) || 1;
              plan.aimX = bdx / bd;
              plan.aimZ = bdz / bd;
              const bYaw = Math.atan2(plan.aimX, plan.aimZ);
              if (plan.skill.laneLayout === 'twin_flank') {
                plan.laneAngles = e.bossPhase >= 2 ? [bYaw - 0.24, bYaw, bYaw + 0.24] : [bYaw - 0.24, bYaw + 0.24];
              }
            }

            if (plan.skill.kind === 'guard_counter') {
              // Immediately enter Guard Stance with glowing aura -> counter burst at end of stance
              const guardDur = Math.max(0.56, plan.telegraphDuration);
              bossAi.guardDamageReduction = 0.35;
              bossAi.activeAction = {
                kind: 'guard',
                elapsed: 0,
                duration: guardDur,
                startX: e.x,
                startZ: e.z,
                targetX: e.x,
                targetZ: e.z,
                dirX: plan.aimX,
                dirZ: plan.aimZ,
                speed: 0,
                peakHeight: 0,
                damageMult: plan.skill.damageMult,
                colorHex: plan.skill.colorHex ?? bossAi.accentHex,
                orbCount: scaleOrbCountForBudget(plan.skill.count ?? 12, e.bossPhase, this.lowEndGpu),
                projectileSpeed: plan.skill.projectileSpeed ?? 10.4,
                slamRadius: plan.slamRadius,
                trailTimer: 0,
              };
              this.spawnShockwave(e.x, e.z, plan.skill.colorHex ?? bossAi.accentHex, 3.2, 0.34);
              this.emitFloatingNumber(e.x, 2.4, e.z, 0, true, false, 'ice', plan.skill.label.toUpperCase());
              soundEngine.playBossTelegraph();
            } else if (plan.skill.kind === 'meteor_cascade' && plan.multiSlamPoints.length > 0) {
              // Spawn staggered pooled meteor/pillar/rune circles immediately
              const mColor = plan.skill.colorHex ?? bossAi.accentHex;
              plan.multiSlamPoints.forEach((pt) => {
                this.spawnBossMultiSlam({
                  x: pt.x,
                  z: pt.z,
                  radius: pt.radius,
                  delaySec: pt.delaySec,
                  duration: plan.telegraphDuration,
                  damage: this.getEffectiveBossAttackDamage(e, plan.skill.damageMult),
                  colorHex: mColor,
                  hazardKind: plan.skill.hazardKind,
                  hazardDurationSec: plan.skill.hazardDurationSec,
                  ownerName: e.bossTitle || this.currentChapter.bossName,
                });
              });
              e.telegraphType = 'spiral';
              e.telegraphDuration = plan.telegraphDuration;
              e.telegraphTimer = plan.telegraphDuration;
              e.aimX = plan.aimX;
              e.aimZ = plan.aimZ;
              soundEngine.playBossTelegraph();
            } else {
              e.telegraphType = plan.skill.telegraphChannel;
              e.telegraphDuration = plan.telegraphDuration;
              e.telegraphTimer = plan.telegraphDuration;
              e.aimX = plan.aimX;
              e.aimZ = plan.aimZ;
              e.slamX = plan.slamX;
              e.slamZ = plan.slamZ;
              e.slamRadius = plan.slamRadius;
              e.laneAngles = plan.laneAngles;
              if (
                plan.skill.telegraphChannel === 'lane' ||
                plan.skill.telegraphChannel === 'slam' ||
                plan.skill.telegraphChannel === 'spiral'
              ) {
                soundEngine.playBossTelegraph();
              }
            }
          }
        }

        if (!e.chargerDashing) {
          e.x += e.vx * dt;
          e.z += e.vz * dt;
        }
      }

      e.x = THREE.MathUtils.clamp(e.x, -ARENA_HALF_W + e.radius, ARENA_HALF_W - e.radius);
      e.z = THREE.MathUtils.clamp(e.z, -ARENA_HALF_D + e.radius, ARENA_HALF_D - e.radius);

      for (const obs of this.obstacles) {
        if (obs.intact === false) continue;
        const odx = e.x - obs.x;
        const odz = e.z - obs.z;
        const minD = e.radius + obs.radius;
        const d = Math.hypot(odx, odz);
        if (d < minD && d > 0.001) {
          e.x = obs.x + (odx / d) * minD;
          e.z = obs.z + (odz / d) * minD;
          if (e.chargerDashing) {
            e.chargerDashing = false;
            e.stunTimer = 2.2;
            e.chargerCooldown = 4.2;
            soundEngine.playBossGuardBreak(computeSpatialPan(e.x, ARENA_HALF_W));
            this.spawnShockwave(e.x, e.z, 0xfbbf24, 2.6, 0.32);
            this.emitFloatingNumber(e.x, 2.2, e.z, 0, true, false, 'fire', 'CHOÁNG ĐẬP TRỤ!');
          }
        }
      }

      for (let j = i - 1; j >= 0; j--) {
        const o = enemySnapshot[j];
        if (!o || o.dead) continue;
        const sdx = e.x - o.x;
        const sdz = e.z - o.z;
        const minSep = e.radius + o.radius;
        const d = Math.hypot(sdx, sdz);
        if (d < minSep && d > 0.001) {
          const push = (minSep - d) * 0.5;
          e.x += (sdx / d) * push;
          e.z += (sdz / d) * push;
          o.x -= (sdx / d) * push;
          o.z -= (sdz / d) * push;
        }
      }

      if (this.isCrystalDefenseMode && this.crystalRefs) {
        const cDist = Math.hypot(e.x, e.z);
        const minCrystalDist = 1.32 + e.radius;
        if (cDist < minCrystalDist && cDist > 0.0001) {
          e.x = (e.x / cDist) * minCrystalDist;
          e.z = (e.z / cDist) * minCrystalDist;
        }
        if (cDist <= minCrystalDist + 0.25 && e.attackTimer <= 0) {
          e.attackTimer = 1.35;
          const crystalDmg = Math.max(14, Math.round(e.damage * 1.25));
          this.crystalHp = Math.max(0, this.crystalHp - crystalDmg);
          soundEngine.playPlayerHurt();
          this.spawnParticles(0, 1.5, 0, 0x38bdf8, 12);
          this.emitFloatingNumber(0, 2.2, 0, crystalDmg, false, false, 'playerHit', 'PHA LÊ!');
          if (this.crystalHp <= 0) {
            this.phase = GamePhase.GAME_OVER;
            this.syncHudImmediate();
            this.callbacks.onRunEnded(false, {
              chapterId: this.currentChapter.id,
              stageReached: this.crystalWave,
              kills: this.kills,
              gold: this.runGold,
              gems: this.runGems,
              isCrystalDefenseMode: true,
              crystalWavesCleared: Math.max(0, this.crystalWave - 1),
              crystalHpPct: 0,
              wingFeathers: Math.max(2, (this.crystalWave - 1) * 3),
              maxCombo: this.maxRunCombo,
              damageBreakdown: this.getDamageBreakdownSnapshot(),
            });
            return;
          }
        }
      }

      if (Math.hypot(this.px - e.x, this.pz - e.z) < e.radius + 0.52) {
        this.damagePlayer(
          e.damage,
          e.isBoss
            ? {
                code: 'boss_contact',
                label: `Áp sát trực diện ${e.bossTitle ?? 'Boss'}`,
                tip: 'Thả diều vòng quanh sân, chỉ dừng bắn trong 1.5s ngay sau khi Boss vừa tung chiêu.',
                killerName: e.bossTitle,
              }
            : {
                code: 'melee_swarm',
                label: 'Bị quái cận chiến áp sát',
                tip: 'Di chuyển theo vòng tròn quanh mép sàn và ưu tiên Đạn Nảy hoặc Băng Tiễn để giữ khoảng cách.',
              },
          e.x,
          e.z
        );
      }

      const bossHeightY = e.bossAiState ? e.bossAiState.visualHeightY : 0;
      const entityHeightY = Math.max(bossHeightY, e.mobVisualHeightY ?? 0);
      e.model.root.position.set(e.x, entityHeightY, e.z);
      const isBossDashingNow = e.bossAiState?.activeAction?.kind === 'dash';
      const targetFacingYaw =
        isBossDashingNow && e.bossAiState?.activeAction
          ? Math.atan2(e.bossAiState.activeAction.dirX, e.bossAiState.activeAction.dirZ)
          : e.mobDashActive
          ? Math.atan2(e.mobDashDirX ?? dirX, e.mobDashDirZ ?? dirZ)
          : e.telegraphType !== 'none'
          ? Math.atan2(e.aimX || dirX, e.aimZ || dirZ)
          : Math.atan2(dirX, dirZ);
      const turnLambda = e.mobDashActive || isBossDashingNow ? 16.5 : e.isBoss ? 8.8 : 10.8;
      e.model.root.rotation.y = dampShortestYaw(
        e.model.root.rotation.y,
        targetFacingYaw,
        turnLambda,
        dt
      );
      e.shadow.position.set(e.x, 0.02, e.z);
      if (entityHeightY > 0.01) {
        const airScale = Math.max(0.55, 1 - entityHeightY * 0.14);
        e.shadow.scale.setScalar(airScale);
      } else {
        e.shadow.scale.setScalar(1);
      }

      const recoilStep = stepDirectionalRecoil(
        e.hitRecoilX ?? 0,
        e.hitRecoilZ ?? 0,
        e.model.root.rotation.y,
        dt
      );
      e.hitRecoilX = recoilStep.recoilX;
      e.hitRecoilZ = recoilStep.recoilZ;
      const entitySpeed = Math.hypot(e.vx, e.vz);
      const entityLateralSpeed =
        e.vx * Math.cos(e.model.root.rotation.y) - e.vz * Math.sin(e.model.root.rotation.y);
      const teleProgressAll =
        e.telegraphType !== 'none'
          ? Math.max(0, Math.min(1, 1 - e.telegraphTimer / Math.max(0.01, e.telegraphDuration)))
          : 0;

      const bScale = e.baseScale ?? 1;
      const squashY = e.hitSquashY ?? 1;
      const stretchXZ = e.hitStretchXZ ?? 1;
      if (e.hitFlashTimer > 0) {
        const s = 1 + e.hitFlashTimer * 1.25;
        e.model.root.scale.set(
          bScale * stretchXZ * s,
          bScale * squashY / Math.sqrt(s),
          bScale * stretchXZ * s
        );
      } else if (Math.abs(squashY - 1) > 0.004 || Math.abs(stretchXZ - 1) > 0.004) {
        e.model.root.scale.set(bScale * stretchXZ, bScale * squashY, bScale * stretchXZ);
      } else {
        e.model.root.scale.setScalar(bScale);
      }

      if (e.hpBarGroup && e.hpBarFill) {
        const liveRatio = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
        e.hpBarGhostRatio = stepGhostRatio(e.hpBarGhostRatio ?? 1, liveRatio, dt);
        const showBar = e.hp > 0 && e.hp < e.maxHp;
        e.hpBarGroup.visible = showBar;
        if (showBar) {
          e.hpBarGroup.position.set(e.x, (e.hpBarHeight ?? 2.15) + entityHeightY * 0.65, e.z);
          e.hpBarGroup.quaternion.copy(this.camera.quaternion);
          e.hpBarFill.scale.x = Math.max(0.01, liveRatio);
          if (e.hpBarGhost) {
            e.hpBarGhost.scale.x = Math.max(0.01, e.hpBarGhostRatio);
          }
        }
      }

      if (e.breakShieldRingMesh && e.isBoss) {
        const stunned = Boolean(e.stunTimer && e.stunTimer > 0);
        e.breakShieldRingMesh.visible = !stunned && e.hp > 0;
        if (e.breakShieldRingMesh.visible) {
          const maxBs = e.maxBreakShield ?? Math.max(120, Math.round(e.maxHp * 0.42));
          const curBs = e.breakShield ?? maxBs;
          const bsRatio = Math.max(0, Math.min(1, curBs / Math.max(1, maxBs)));
          e.breakShieldRingMesh.position.set(e.x, 0.052, e.z);
          e.breakShieldRingMesh.rotation.z += dt * (bsRatio < 0.35 ? 2.4 : 0.85);
          e.breakShieldRingMesh.scale.setScalar(0.82 + bsRatio * 0.24);
          const bsMat = e.breakShieldRingMesh.material as THREE.MeshBasicMaterial;
          bsMat.color.setHex(bsRatio < 0.35 ? 0xfbbf24 : 0x38bdf8);
          bsMat.opacity = bsRatio < 0.35 ? 0.65 + Math.sin(this.elapsed * 14) * 0.22 : 0.46;
        }
      }

      if (e.model.weaponOrRing) {
        const phaseSpeedMult = e.isBoss ? (e.bossPhase === 3 ? 2.6 : e.bossPhase === 2 ? 1.85 : 1.0) : 1.0;
        e.model.weaponOrRing.rotation.z += dt * (e.isBoss ? 1.85 * phaseSpeedMult : 2.6);
        if (e.kind === EnemyKind.WISP || e.kind === EnemyKind.DRAGON_WHELP) {
          e.model.weaponOrRing.rotation.x += dt * 1.8;
        }
      }

      if (e.model.eliteCrown) {
        e.model.eliteCrown.rotation.y += dt * 2.2;
        e.model.eliteCrown.position.y += Math.sin(this.elapsed * 4.5 + e.phaseAngle) * 0.0012;
      }

      if (e.model.bossAuraRing) {
        const pRate = e.bossPhase === 3 ? 2.8 : e.bossPhase === 2 ? 1.8 : 0.95;
        e.model.bossAuraRing.rotation.y -= dt * pRate;
        const targetAuraScale =
          (e.bossPhase === 3 ? 1.32 : e.bossPhase === 2 ? 1.16 : 1.0) +
          Math.sin(this.elapsed * (e.bossPhase >= 2 ? 7 : 3)) * 0.04;
        e.model.bossAuraRing.scale.setScalar(targetAuraScale);
      }

      if (e.model.wings) {
        const flap = Math.sin(this.elapsed * 14 + e.phaseAngle) * 0.38;
        e.model.wings.forEach((w, idx) => {
          w.rotation.y = (idx % 2 === 0 ? 1 : -1) * flap;
        });
      }

      if (e.solarLionVisualGroup) {
        if (e.solarLionBurstTimer && e.solarLionBurstTimer > 0) {
          e.solarLionBurstTimer = Math.max(0, e.solarLionBurstTimer - dt);
          if (e.solarLionBurstTimer <= 0) {
            e.solarLionBurstType = 'none';
          }
        }
        if (e.autoRig) {
          const bossDashing = e.bossAiState?.activeAction?.kind === 'dash';
          updateAutoRigPose(e.autoRig, {
            elapsed: this.elapsed,
            dt,
            phaseAngle: e.phaseAngle,
            speed: entitySpeed,
            maxSpeed: e.speed,
            lateralSpeed: entityLateralSpeed,
            facingYaw: e.model.root.rotation.y,
            targetYaw: Math.atan2(this.px - e.x, this.pz - e.z),
            telegraphType: e.telegraphType,
            telegraphProgress: teleProgressAll,
            burstType: e.solarLionBurstType ?? 'none',
            burstTimer: e.solarLionBurstTimer ?? 0,
            bossPhase: e.bossPhase,
            stunTimer: e.stunTimer ?? 0,
            hitFlashTimer: e.hitFlashTimer,
            recoilPitch: recoilStep.recoilPitch,
            recoilRoll: recoilStep.recoilRoll,
            isDashing: bossDashing,
          });
          if (
            e.autoRig.state.footstepTriggered &&
            Math.random() < (this.lowEndGpu ? 0.35 : 0.85)
          ) {
            this.spawnParticles(e.x, 0.14, e.z, 0xfbbf24, this.lowEndGpu ? 1 : 2);
          }
          if (e.boneTrails) {
            const trailEnergy =
              (e.solarLionBurstTimer ?? 0) > 0 || bossDashing
                ? 1.05
                : e.telegraphType !== 'none'
                ? 0.55 + teleProgressAll * 0.4
                : e.bossPhase >= 2
                ? 0.3
                : 0.16;
            e.model.root.updateMatrixWorld(true);
            updateBoneTrailController(e.boneTrails, trailEnergy, dt);
          }
        } else {
          updateChapter1BossMotion(
            e.solarLionVisualGroup,
            {
              elapsed: this.elapsed,
              phaseAngle: e.phaseAngle,
              speed: entitySpeed,
              telegraphType: e.telegraphType,
              telegraphProgress: teleProgressAll,
              attackBurstType: e.solarLionBurstType ?? 'none',
              attackBurstTimer: e.solarLionBurstTimer ?? 0,
              bossPhase: e.bossPhase,
              stunTimer: e.stunTimer ?? 0,
              hitFlashTimer: e.hitFlashTimer,
              lateralSpeed: entityLateralSpeed,
              recoilPitch: recoilStep.recoilPitch,
              recoilRoll: recoilStep.recoilRoll,
            },
            dt
          );
        }
        e.model.bodyGroup.position.y = 0;
      } else if (e.roster3dVisualGroup && e.roster3dAssetId) {
        if (e.roster3dBurstTimer && e.roster3dBurstTimer > 0) {
          e.roster3dBurstTimer = Math.max(0, e.roster3dBurstTimer - dt);
          if (e.roster3dBurstTimer <= 0) {
            e.roster3dBurstType = 'none';
          }
        }
        if (e.autoRig) {
          const isDashingNow = Boolean(
            e.mobDashActive || e.bossAiState?.activeAction?.kind === 'dash'
          );
          updateAutoRigPose(e.autoRig, {
            elapsed: this.elapsed,
            dt,
            phaseAngle: e.phaseAngle,
            speed: entitySpeed,
            maxSpeed: e.speed,
            lateralSpeed: entityLateralSpeed,
            facingYaw: e.model.root.rotation.y,
            targetYaw: Math.atan2(this.px - e.x, this.pz - e.z),
            telegraphType: e.telegraphType,
            telegraphProgress: teleProgressAll,
            burstType: e.roster3dBurstType ?? 'none',
            burstTimer: e.roster3dBurstTimer ?? 0,
            bossPhase: e.bossPhase,
            stunTimer: e.stunTimer ?? 0,
            hitFlashTimer: e.hitFlashTimer,
            recoilPitch: recoilStep.recoilPitch,
            recoilRoll: recoilStep.recoilRoll,
            isDashing: isDashingNow,
          });
          const rosterTheme = resolveCampaignRosterVisualTheme(e.roster3dAssetId);
          if (
            e.autoRig.state.footstepTriggered &&
            !rosterTheme.isFloatingSpirit &&
            Math.random() < aaaMobBudget.footstepDustChance * 1.4
          ) {
            this.spawnParticles(e.x, 0.12, e.z, rosterTheme.dustHex, this.lowEndGpu ? 1 : 2);
          }
          if (e.boneTrails) {
            const trailEnergy =
              (e.roster3dBurstTimer ?? 0) > 0 || isDashingNow
                ? 1.0
                : e.telegraphType !== 'none'
                ? 0.48 + teleProgressAll * 0.4
                : rosterTheme.isWingedSubBoss || e.isBoss
                ? 0.28 + Math.min(0.24, entitySpeed * 0.04)
                : rosterTheme.isFloatingSpirit
                ? 0.24
                : 0.0;
            e.model.root.updateMatrixWorld(true);
            updateBoneTrailController(e.boneTrails, trailEnergy, dt);
          }
        } else {
          updateChapter1RosterMotion(
            e.roster3dVisualGroup,
            {
              assetId: e.roster3dAssetId,
              elapsed: this.elapsed,
              phaseAngle: e.phaseAngle,
              speed: entitySpeed,
              telegraphType: e.telegraphType,
              telegraphProgress: teleProgressAll,
              burstType: e.roster3dBurstType ?? 'none',
              burstTimer: e.roster3dBurstTimer ?? 0,
              bossPhase: e.bossPhase,
              stunTimer: e.stunTimer ?? 0,
              hitFlashTimer: e.hitFlashTimer,
              isSubBossTitan: e.kind === EnemyKind.TITAN_BOSS,
              lateralSpeed: entityLateralSpeed,
              recoilPitch: recoilStep.recoilPitch,
              recoilRoll: recoilStep.recoilRoll,
            },
            e.roster3dBaseScale ?? 1.0,
            dt
          );
        }
        e.model.bodyGroup.position.y = 0;
      } else if (e.isBoss && e.bossAiState) {
        // AAA procedural combat posture for all Chapter 2–12, Sub-Boss & Tower Boss models
        const actKind = e.bossAiState.activeAction?.kind;
        const bossBankPitch =
          actKind === 'dash'
            ? 0.24
            : actKind === 'leap'
            ? -0.18
            : Math.min(0.12, entitySpeed * 0.022);
        const bossBankRoll = THREE.MathUtils.clamp(-entityLateralSpeed * 0.036, -0.18, 0.18);
        const pose = computeProceduralEnemyAaaPose({
          speedRatio: entitySpeed / Math.max(1.5, e.speed),
          isTelegraphing: e.telegraphType !== 'none',
          telegraphProgress: teleProgressAll,
          burstTimer: actKind === 'dash' ? 0.18 : 0,
          bankRoll: bossBankRoll,
          bankPitch: bossBankPitch,
          recoilPitch: recoilStep.recoilPitch,
          recoilRoll: recoilStep.recoilRoll,
          hitSquash: e.hitFlashTimer,
          isBoss: true,
        });
        const strideBob =
          actKind === 'leap'
            ? 0
            : entitySpeed > 0.35
            ? Math.abs(Math.sin(this.elapsed * 9.5 + e.phaseAngle)) * 0.12
            : Math.sin(this.elapsed * 3.2 + e.phaseAngle) * 0.05;
        e.model.bodyGroup.rotation.x = THREE.MathUtils.damp(e.model.bodyGroup.rotation.x, pose.pitchX, 11, dt);
        e.model.bodyGroup.rotation.z = THREE.MathUtils.damp(e.model.bodyGroup.rotation.z, pose.rollZ, 11, dt);
        e.model.bodyGroup.position.y = THREE.MathUtils.damp(
          e.model.bodyGroup.position.y,
          strideBob + pose.crouchOffsetY,
          12,
          dt
        );
        e.model.bodyGroup.position.z = THREE.MathUtils.damp(
          e.model.bodyGroup.position.z,
          pose.lungeOffsetZ,
          12,
          dt
        );
        e.model.bodyGroup.scale.set(
          THREE.MathUtils.damp(e.model.bodyGroup.scale.x, pose.scaleX, 13, dt),
          THREE.MathUtils.damp(e.model.bodyGroup.scale.y, pose.scaleY, 13, dt),
          THREE.MathUtils.damp(e.model.bodyGroup.scale.z, pose.scaleZ, 13, dt)
        );
      } else {
        // AAA procedural combat choreography for Chapters 2–12 & Tower regular mobs
        const isFloatMob =
          e.kind === EnemyKind.WISP ||
          e.kind === EnemyKind.DRAGON_WHELP ||
          e.kind === EnemyKind.IMP_ARCHER;
        const pose = computeProceduralEnemyAaaPose({
          speedRatio: entitySpeed / Math.max(1.5, e.speed),
          isTelegraphing: e.telegraphType !== 'none',
          telegraphProgress: teleProgressAll,
          burstTimer: e.mobBurstTimer ?? 0,
          bankRoll: e.bankRoll ?? 0,
          bankPitch: e.bankPitch ?? 0,
          recoilPitch: recoilStep.recoilPitch,
          recoilRoll: recoilStep.recoilRoll,
          hitSquash: e.hitFlashTimer,
          isBoss: false,
        });
        const baseBob = isFloatMob
          ? Math.sin(this.elapsed * 4.2 + e.phaseAngle) * 0.14
          : entitySpeed > 0.25 && !e.mobDashActive
          ? Math.abs(Math.sin(this.elapsed * 10.5 + e.phaseAngle)) * 0.1
          : Math.sin(this.elapsed * 2.8 + e.phaseAngle) * 0.02;
        e.model.bodyGroup.rotation.x = THREE.MathUtils.damp(e.model.bodyGroup.rotation.x, pose.pitchX, 12, dt);
        e.model.bodyGroup.rotation.z = THREE.MathUtils.damp(e.model.bodyGroup.rotation.z, pose.rollZ, 12, dt);
        e.model.bodyGroup.position.y = THREE.MathUtils.damp(
          e.model.bodyGroup.position.y,
          baseBob + pose.crouchOffsetY,
          13,
          dt
        );
        e.model.bodyGroup.position.z = THREE.MathUtils.damp(
          e.model.bodyGroup.position.z,
          pose.lungeOffsetZ,
          13,
          dt
        );
        e.model.bodyGroup.scale.set(
          THREE.MathUtils.damp(e.model.bodyGroup.scale.x, pose.scaleX, 14, dt),
          THREE.MathUtils.damp(e.model.bodyGroup.scale.y, pose.scaleY, 14, dt),
          THREE.MathUtils.damp(e.model.bodyGroup.scale.z, pose.scaleZ, 14, dt)
        );
      }
    }
  }

  private buildBossAiStateForKind(kind: EnemyKind): BossAiRuntimeState {
    return createBossAiRuntimeState({
      enemyKind: kind,
      chapterId: this.currentChapter.id,
      zodiacId: this.currentChapter.zodiacId,
      weeklyBossId: this.isWeeklyRankedBossMode ? this.weeklyBossId : null,
      weeklyChapterVisualIndex: this.isWeeklyRankedBossMode ? this.currentChapter.id - 1 : null,
      isTowerMode: this.isTowerMode,
      towerFloor: this.towerFloor,
      isBossRushMode: this.isBossRushMode,
      bossRushStage: this.bossRushRound,
      timedEnrageLimitSec: this.activePowerPressure.bossEnrageSec,
    });
  }

  private isTimedEnrageEnabledForBoss(e: EnemyEntity): boolean {
    return Boolean(
      e.isBoss &&
        !e.isArenaRival &&
        !e.isTrainingDummy &&
        !e.isVaultPillar &&
        !this.isTrainingMode &&
        !this.isArenaMode &&
        !this.isWeeklyRankedBossMode &&
        !this.isWorldBossMode &&
        !this.isGuildBossMode
    );
  }

  private getBossTimedEnrageMods(e: EnemyEntity): BossTimedEnrageModifiers {
    if (!e.bossAiState || !this.isTimedEnrageEnabledForBoss(e)) {
      return {
        active: false,
        remainingSec: 999,
        overtimeSec: 0,
        damageMult: 1.0,
        speedMult: 1.0,
        cooldownMult: 1.0,
      };
    }
    return computeBossEnrageModifiers(
      e.bossAiState.timedEnrageElapsed,
      e.bossAiState.timedEnrageLimitSec
    );
  }

  private getEffectiveBossAttackDamage(e: EnemyEntity, skillDamageMult: number): number {
    const phaseMult = e.isBoss ? computeBossPhaseDamageMult(e.bossPhase) : 1.0;
    const enrageMult = this.getBossTimedEnrageMods(e).damageMult;
    return Math.max(12, Math.round(e.damage * skillDamageMult * phaseMult * enrageMult));
  }

  private scaleAuxiliaryPlayerDamage(rawDmg: number, target: EnemyEntity): number {
    if (rawDmg <= 0) return 0;
    let mult = 1.0;
    if (target.isBoss && !target.isArenaRival && !target.isTrainingDummy) {
      mult *= 1 - computeBossInnateArmorReduction(this.currentChapter.id, true);
    }
    if (!target.isArenaRival && !this.isTrainingMode && this.activePowerPressure.enemyDamageTakenMult !== 1.0) {
      mult *= this.activePowerPressure.enemyDamageTakenMult;
    }
    return rawDmg * mult;
  }

  private scheduleNextBossCooldownOrCombo(e: EnemyEntity, isEnraged: boolean): void {
    const bossAi = e.bossAiState;
    if (!bossAi) return;
    const enrageMods = this.getBossTimedEnrageMods(e);
    if (bossAi.comboQueue.length > 0) {
      const prevSkill = bossAi.activeSkillId
        ? ZODIAC_BOSS_PROFILES[bossAi.profileId]?.skills[bossAi.activeSkillId]
        : undefined;
      e.attackTimer = Math.max(
        0.22,
        (prevSkill?.comboGapSec ?? 0.32) * (e.bossPhase === 3 ? 0.85 : 1.0) * enrageMods.cooldownMult
      );
      e.punishWindowTimer = 0;
      if (e.punishRingMesh) e.punishRingMesh.visible = false;
      return;
    }
    const pveProfile =
      !this.isTrainingMode && !this.isWeeklyRankedBossMode
        ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled)
        : null;
    const pveCdMult = pveProfile ? pveProfile.enemyCooldownMult : 1.0;
    const rec = getBossRecoveryDuration(
      bossAi,
      isEnraged ? e.bossPhase : 1,
      pveCdMult,
      enrageMods.cooldownMult
    );
    e.attackTimer = rec;
    e.punishWindowMax = rec;
    e.punishWindowTimer = rec;
    bossAi.activeSkillLabel = '';
    bossAi.activeActionHint = '';
  }

  private executeZodiacBossSkill(
    e: EnemyEntity,
    bossAi: BossAiRuntimeState,
    isEnraged: boolean
  ): boolean {
    const profile = ZODIAC_BOSS_PROFILES[bossAi.profileId];
    const skill =
      (bossAi.activeSkillId ? profile.skills[bossAi.activeSkillId] : undefined) ??
      Object.values(profile.skills)[0];
    const colorHex = skill.colorHex ?? bossAi.accentHex;
    const budget = getBossPerformanceBudget(this.lowEndGpu);
    const bossPartSlowPct = e.bossParts
      ? Math.min(0.4, e.bossParts.reduce((s, bp) => s + (bp.broken ? bp.barrageSlowPct : 0), 0))
      : 0;
    const pveSpdMult =
      !this.isTrainingMode && !this.isArenaMode && !this.isWeeklyRankedBossMode
        ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).enemyProjectileSpeedMult
        : 1.0;
    const projMult = pveSpdMult * (1 - bossPartSlowPct);
    const baseYaw = Math.atan2(e.aimX, e.aimZ);
    const dmg = this.getEffectiveBossAttackDamage(e, skill.damageMult);

    const triggerBossBurst = (burst: Chapter1RosterBurstType, dur: number) => {
      if (e.solarLionVisualGroup) {
        e.solarLionBurstType = burst === 'cast' ? 'roar' : burst;
        e.solarLionBurstTimer = dur;
      }
      if (e.roster3dVisualGroup) {
        e.roster3dBurstType = burst;
        e.roster3dBurstTimer = dur;
      }
    };

    if (skill.kind === 'leap_slam') {
      const leapDur = skill.leapDurationSec ?? 0.34;
      triggerBossBurst('lunge', leapDur);
      bossAi.activeAction = {
        kind: 'leap',
        elapsed: 0,
        duration: leapDur,
        startX: e.x,
        startZ: e.z,
        targetX: e.slamX,
        targetZ: e.slamZ,
        dirX: e.aimX,
        dirZ: e.aimZ,
        speed: 0,
        peakHeight: skill.leapPeakHeight ?? 3.0,
        damageMult: skill.damageMult,
        colorHex,
        orbCount: scaleOrbCountForBudget(skill.count ?? 10, e.bossPhase, this.lowEndGpu),
        projectileSpeed: (skill.projectileSpeed ?? 9.8) * projMult,
        slamRadius: e.slamRadius,
        hazardKind: skill.hazardKind,
        hazardDurationSec: skill.hazardDurationSec,
        trailTimer: 0,
      };
      soundEngine.playDash();
      this.spawnParticles(e.x, 0.4, e.z, colorHex, Math.max(4, Math.round(12 * budget.particleScale)));
      return true;
    }

    if (skill.kind === 'dash_charge') {
      const dashDur = skill.dashDurationSec ?? 0.54;
      triggerBossBurst('lunge', Math.max(0.46, dashDur));
      const laneYaw = e.laneAngles[0] ?? baseYaw;
      bossAi.activeAction = {
        kind: 'dash',
        elapsed: 0,
        duration: dashDur,
        startX: e.x,
        startZ: e.z,
        targetX: e.x,
        targetZ: e.z,
        dirX: Math.sin(laneYaw),
        dirZ: Math.cos(laneYaw),
        speed: (skill.dashSpeed ?? 14.8) * (isEnraged ? 1.08 : 1.0),
        peakHeight: 0,
        damageMult: skill.damageMult,
        colorHex,
        orbCount: 0,
        projectileSpeed: 0,
        slamRadius: 0,
        hazardKind: skill.hazardKind,
        hazardDurationSec: skill.hazardDurationSec,
        trailTimer: 0.06,
      };
      soundEngine.playDash();
      this.spawnShockwave(e.x, e.z, colorHex, 2.4, 0.24);
      return true;
    }

    if (skill.kind === 'lane_sweep' || skill.kind === 'blink_strike') {
      triggerBossBurst('roar', 0.38);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
      soundEngine.playMeteorImpact(computeSpatialPan(e.x, ARENA_HALF_W));
      const baseSpd = (skill.projectileSpeed ?? 14.2) * projMult;
      const bursts = this.lowEndGpu ? 2 : isEnraged ? 3 : 2;
      e.laneAngles.forEach((ang) => {
        for (let b = 0; b < bursts; b++) {
          const speed = baseSpd + b * 2.1;
          this.fireEnemyOrb(
            e.x + Math.sin(ang) * 0.65,
            e.z + Math.cos(ang) * 0.65,
            Math.sin(ang) * speed,
            Math.cos(ang) * speed,
            dmg,
            colorHex,
            'boss_lane'
          );
        }
        const ldx = Math.sin(ang);
        const ldz = Math.cos(ang);
        for (const obs of this.obstacles) {
          if (!obs.destructible || obs.intact === false) continue;
          const relX = obs.x - e.x;
          const relZ = obs.z - e.z;
          const along = relX * ldx + relZ * ldz;
          if (along > 0.5 && along < 15.5 && Math.abs(relX * ldz - relZ * ldx) < 1.45) {
            this.shatterCrystalObstacle(obs);
          }
        }
      });
      return false;
    }

    if (skill.kind === 'petal_spiral') {
      triggerBossBurst('roar', 0.44);
      const orbCount = scaleOrbCountForBudget(skill.count ?? 8, e.bossPhase, this.lowEndGpu);
      const speed = (skill.projectileSpeed ?? 9.8) * projMult;
      const totalWaves = Math.max(1, (skill.waves ?? 3) - (this.lowEndGpu ? 1 : 0));
      const interval = skill.waveIntervalSec ?? 0.24;
      this.fireBossPendingVolley(
        e,
        {
          delaySec: 0,
          kind: 'spiral',
          waveIndex: 0,
          baseYaw,
          count: orbCount,
          projectileSpeed: speed,
          damageMult: skill.damageMult,
          colorHex,
        },
        1.0
      );
      for (let w = 1; w < totalWaves; w++) {
        bossAi.pendingVolleys.push({
          delaySec: w * interval,
          kind: 'spiral',
          waveIndex: w,
          baseYaw,
          count: orbCount,
          projectileSpeed: speed,
          damageMult: skill.damageMult,
          colorHex,
        });
      }
      if (skill.hazardKind) {
        this.spawnBossHazardZone({
          kind: skill.hazardKind,
          x: this.px,
          z: this.pz,
          radius: 2.35,
          durationSec: skill.hazardDurationSec ?? 4.0,
          damagePerTick: Math.max(12, this.getEffectiveBossAttackDamage(e, 0.42)),
          ownerName: e.bossTitle || this.currentChapter.bossName,
        });
      }
      return false;
    }

    if (skill.kind === 'strafe_barrage') {
      triggerBossBurst('cast', 0.38);
      const count = Math.max(3, Math.round((skill.count ?? 5) * budget.orbCountScale));
      const speed = (skill.projectileSpeed ?? 12.0) * projMult;
      const totalWaves = Math.max(1, skill.waves ?? 2);
      const interval = skill.waveIntervalSec ?? 0.24;
      this.fireBossPendingVolley(
        e,
        {
          delaySec: 0,
          kind: 'strafe_shot',
          waveIndex: 0,
          baseYaw,
          count,
          projectileSpeed: speed,
          damageMult: skill.damageMult,
          colorHex,
        },
        1.0
      );
      for (let w = 1; w < totalWaves; w++) {
        bossAi.pendingVolleys.push({
          delaySec: w * interval,
          kind: 'strafe_shot',
          waveIndex: w,
          baseYaw,
          count,
          projectileSpeed: speed,
          damageMult: skill.damageMult,
          colorHex,
        });
      }
      return false;
    }

    if (skill.kind === 'tectonic_pulse') {
      triggerBossBurst('slam', 0.46);
      const waves = Math.max(2, (skill.waves ?? 3) - (this.lowEndGpu ? 1 : 0));
      const interval = skill.waveIntervalSec ?? 0.4;
      const baseRadius = e.slamRadius;
      const orbCount = scaleOrbCountForBudget(skill.count ?? 8, e.bossPhase, this.lowEndGpu);
      const speed = (skill.projectileSpeed ?? 9.2) * projMult;
      this.fireBossPendingVolley(
        e,
        {
          delaySec: 0,
          kind: 'tectonic_ring',
          waveIndex: 0,
          baseYaw,
          count: orbCount,
          projectileSpeed: speed,
          damageMult: skill.damageMult,
          colorHex,
          radius: baseRadius,
        },
        1.0
      );
      for (let w = 1; w < waves; w++) {
        bossAi.pendingVolleys.push({
          delaySec: w * interval,
          kind: 'tectonic_ring',
          waveIndex: w,
          baseYaw,
          count: Math.max(6, orbCount - 2),
          projectileSpeed: speed * 1.05,
          damageMult: skill.damageMult * 0.92,
          colorHex,
          radius: baseRadius + w * 1.45,
        });
      }
      return false;
    }

    if (skill.kind === 'hazard_ring') {
      triggerBossBurst('roar', 0.42);
      const hazardCount = this.lowEndGpu ? 2 : isEnraged ? 3 : 2;
      const hKind = skill.hazardKind ?? bossAi.hazardFlavor;
      for (let h = 0; h < hazardCount; h++) {
        const ang = baseYaw + (h - (hazardCount - 1) / 2) * 1.15;
        const dist = h === 0 ? 0.5 : 3.2;
        const hx = THREE.MathUtils.clamp(this.px + Math.sin(ang) * dist, -ARENA_HALF_W + 2.2, ARENA_HALF_W - 2.2);
        const hz = THREE.MathUtils.clamp(this.pz + Math.cos(ang) * dist, -ARENA_HALF_D + 2.2, ARENA_HALF_D - 2.2);
        this.spawnBossHazardZone({
          kind: hKind,
          x: hx,
          z: hz,
          radius: Math.min(3.0, (skill.radius ?? 2.75) * 0.92),
          durationSec: skill.hazardDurationSec ?? 4.6,
          damagePerTick: Math.max(12, this.getEffectiveBossAttackDamage(e, 0.45)),
          ownerName: e.bossTitle || this.currentChapter.bossName,
        });
      }
      const orbCount = scaleOrbCountForBudget(skill.count ?? 8, e.bossPhase, this.lowEndGpu);
      const speed = (skill.projectileSpeed ?? 10.2) * projMult;
      for (let r = 0; r < orbCount; r++) {
        const a = (r / orbCount) * Math.PI * 2 + baseYaw * 0.2;
        this.fireEnemyOrb(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed, dmg, colorHex, 'boss_projectile');
      }
      this.spawnShockwave(e.x, e.z, colorHex, 3.8, 0.36);
      return false;
    }

    // Meteor cascade already launched pooled delayed circles on telegraph start; add light aimed orb pressure
    if (skill.kind === 'meteor_cascade') {
      triggerBossBurst('cast', 0.4);
      const orbCount = this.lowEndGpu ? 3 : 5;
      const speed = 10.8 * projMult;
      for (let k = 0; k < orbCount; k++) {
        const a = baseYaw + (k - (orbCount - 1) / 2) * 0.24;
        this.fireEnemyOrb(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed, Math.round(dmg * 0.8), colorHex, 'boss_projectile');
      }
      return false;
    }

    this.executeEnemyAttack(e, isEnraged);
    return false;
  }

  private fireBossPendingVolley(
    e: EnemyEntity,
    volley: BossPendingVolley,
    speedMult: number
  ): void {
    const dmg = this.getEffectiveBossAttackDamage(e, volley.damageMult);
    const speed = volley.projectileSpeed * speedMult;
    const budget = getBossPerformanceBudget(this.lowEndGpu);

    if (volley.kind === 'spiral') {
      const twist = volley.waveIndex * 0.28 * (e.bossAiState?.strafeDir ?? 1);
      for (let r = 0; r < volley.count; r++) {
        const a = (r / volley.count) * Math.PI * 2 + volley.baseYaw + twist;
        this.fireEnemyOrb(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed, dmg, volley.colorHex, 'boss_projectile');
      }
      if (volley.waveIndex === 0) {
        this.spawnShockwave(e.x, e.z, volley.colorHex, 3.4, 0.3);
      }
      return;
    }

    if (volley.kind === 'strafe_shot') {
      // Fresh aim toward hero on each burst while boss is moving laterally
      const dx = this.px + this.pvx * 0.28 - e.x;
      const dz = this.pz + this.pvz * 0.28 - e.z;
      const yaw = Math.atan2(dx, dz);
      const spread = 0.2;
      for (let k = 0; k < volley.count; k++) {
        const a = yaw + (k - (volley.count - 1) / 2) * spread;
        this.fireEnemyOrb(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed, dmg, volley.colorHex, 'boss_projectile');
      }
      return;
    }

    if (volley.kind === 'tectonic_ring') {
      const rad = volley.radius ?? 3.4;
      const pan = computeSpatialPan(e.x, ARENA_HALF_W);
      soundEngine.playMeteorImpact(pan);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
      this.spawnShockwave(e.x, e.z, volley.colorHex, rad + 0.5, 0.42);
      this.spawnImpactDecal(e.x, e.z, volley.colorHex, rad * 0.9, 1.5);
      this.spawnParticles(e.x, 0.45, e.z, volley.colorHex, Math.max(6, Math.round(16 * budget.particleScale)));
      if (volley.waveIndex === 0) {
        this.openBossWeakPoint(e);
      }
      const dist = Math.hypot(this.px - e.x, this.pz - e.z);
      const innerSafe = volley.waveIndex === 0 ? 0 : Math.max(0, rad - 2.2);
      if (dist <= rad + 0.3 && dist >= innerSafe) {
        this.damagePlayer(
          dmg,
          {
            code: 'boss_slam',
            label: `${e.bossAiState?.activeSkillLabel || 'Địa Chấn'} của ${e.bossTitle ?? 'Boss'}`,
            tip: 'Chạy lùi ra khỏi nhịp sóng địa chấn lan rộng rồi phản công sau nhịp cuối.',
            killerName: e.bossTitle,
          },
          e.x,
          e.z
        );
      }
      for (let r = 0; r < volley.count; r++) {
        const a = (r / volley.count) * Math.PI * 2 + volley.waveIndex * 0.24;
        this.fireEnemyOrb(e.x, e.z, Math.sin(a) * speed, Math.cos(a) * speed, Math.round(dmg * 0.78), volley.colorHex, 'boss_projectile');
      }
    }
  }

  private resolveBossLeapLanding(
    e: EnemyEntity,
    act: NonNullable<BossAiRuntimeState['activeAction']>
  ): void {
    if (e.solarLionVisualGroup) {
      e.solarLionBurstType = 'slam';
      e.solarLionBurstTimer = 0.42;
    }
    if (e.roster3dVisualGroup) {
      e.roster3dBurstType = 'slam';
      e.roster3dBurstTimer = 0.42;
    }
    const budget = getBossPerformanceBudget(this.lowEndGpu);
    const pan = computeSpatialPan(e.x, ARENA_HALF_W);
    this.spawnShockwave(e.x, e.z, act.colorHex, act.slamRadius + 0.65, 0.44);
    this.spawnImpactDecal(e.x, e.z, act.colorHex, act.slamRadius * 0.92, 1.8);
    this.spawnBattleScar(e.x, e.z, Math.max(0.85, act.slamRadius * 0.4));
    this.spawnParticles(e.x, 0.45, e.z, act.colorHex, Math.max(8, Math.round(22 * budget.particleScale)));
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    soundEngine.playMeteorImpact(pan);
    soundEngine.playImpactScorchThump(pan);
    this.spawnImpactLight(e.x, 1.4, e.z, 'boss_slam');
    this.triggerPostFxImpulse('boss_slam');
    if (e.isBoss && !e.isTrainingDummy) {
      this.openBossWeakPoint(e);
    }
    for (const obs of this.obstacles) {
      if (!obs.destructible || obs.intact === false) continue;
      if (Math.hypot(obs.x - e.x, obs.z - e.z) <= act.slamRadius + 1.2) {
        this.shatterCrystalObstacle(obs);
      }
    }
    const dmg = this.getEffectiveBossAttackDamage(e, act.damageMult);
    if (Math.hypot(this.px - e.x, this.pz - e.z) <= act.slamRadius + 0.35) {
      this.damagePlayer(
        dmg,
        {
          code: 'boss_slam',
          label: `${e.bossAiState?.activeSkillLabel || 'Nhảy Vồ'} của ${e.bossTitle ?? 'Boss'}`,
          tip: 'Lướt (Space) ra khỏi vòng cảnh báo trước khi Boss tiếp đất rồi phản công vào điểm yếu!',
          killerName: e.bossTitle,
        },
        e.x,
        e.z
      );
    }
    for (let r = 0; r < act.orbCount; r++) {
      const a = (r / Math.max(1, act.orbCount)) * Math.PI * 2;
      this.fireEnemyOrb(
        e.x,
        e.z,
        Math.sin(a) * act.projectileSpeed,
        Math.cos(a) * act.projectileSpeed,
        Math.round(dmg * 0.78),
        act.colorHex,
        'boss_projectile'
      );
    }
    if (act.hazardKind) {
      this.spawnBossHazardZone({
        kind: act.hazardKind,
        x: e.x,
        z: e.z,
        radius: Math.min(2.9, act.slamRadius * 0.82),
        durationSec: act.hazardDurationSec ?? 4.2,
        damagePerTick: this.getEffectiveBossAttackDamage(e, 0.42),
        ownerName: e.bossTitle || this.currentChapter.bossName,
      });
    }
  }

  private resolveBossGuardCounterBurst(
    e: EnemyEntity,
    act: NonNullable<BossAiRuntimeState['activeAction']>
  ): void {
    if (e.solarLionVisualGroup) {
      e.solarLionBurstType = 'roar';
      e.solarLionBurstTimer = 0.42;
    }
    if (e.roster3dVisualGroup) {
      e.roster3dBurstType = 'roar';
      e.roster3dBurstTimer = 0.42;
    }
    const budget = getBossPerformanceBudget(this.lowEndGpu);
    soundEngine.playMeteorImpact(computeSpatialPan(e.x, ARENA_HALF_W));
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
    this.spawnShockwave(e.x, e.z, act.colorHex, act.slamRadius + 1.0, 0.44);
    this.spawnParticles(e.x, 1.0, e.z, act.colorHex, Math.max(8, Math.round(20 * budget.particleScale)));
    const dmg = this.getEffectiveBossAttackDamage(e, act.damageMult);
    if (Math.hypot(this.px - e.x, this.pz - e.z) <= act.slamRadius + 0.4) {
      this.damagePlayer(
        dmg,
        {
          code: 'boss_slam',
          label: `${e.bossAiState?.activeSkillLabel || 'Phản Sóng'} của ${e.bossTitle ?? 'Boss'}`,
          tip: 'Khi Boss tụ vỏ giáp phát sáng, hãy giữ cự ly và né vòng sóng phản lực.',
          killerName: e.bossTitle,
        },
        e.x,
        e.z
      );
    }
    for (let r = 0; r < act.orbCount; r++) {
      const a = (r / Math.max(1, act.orbCount)) * Math.PI * 2;
      this.fireEnemyOrb(
        e.x,
        e.z,
        Math.sin(a) * act.projectileSpeed,
        Math.cos(a) * act.projectileSpeed,
        Math.round(dmg * 0.8),
        act.colorHex,
        'boss_projectile'
      );
    }
  }

  private spawnBossHazardZone(params: {
    kind: BossHazardKind;
    x: number;
    z: number;
    radius: number;
    durationSec: number;
    damagePerTick: number;
    ownerName: string;
  }): void {
    const budget = getBossPerformanceBudget(this.lowEndGpu);
    const activeCount = this.bossHazardPool.reduce((c, h) => c + (h.active ? 1 : 0), 0);
    let slot = this.bossHazardPool.find((h) => !h.active);
    if (!slot || activeCount >= budget.maxActiveHazards) {
      // Recycle oldest active hazard so we strictly obey Lite-mode cap
      slot = this.bossHazardPool
        .filter((h) => h.active)
        .sort((a, b) => a.life - b.life)[0] ?? this.bossHazardPool[0];
    }
    if (!slot) return;

    const palette: Record<BossHazardKind, { disc: number; ring: number }> = {
      fire: { disc: 0xf97316, ring: 0xfde047 },
      poison: { disc: 0x9333ea, ring: 0x4ade80 },
      frost: { disc: 0x0ea5e9, ring: 0xbae6fd },
      whirlpool: { disc: 0x0284c7, ring: 0x5eead4 },
    };
    const colors = palette[params.kind];
    slot.active = true;
    slot.kind = params.kind;
    slot.x = THREE.MathUtils.clamp(params.x, -ARENA_HALF_W + 1.5, ARENA_HALF_W - 1.5);
    slot.z = THREE.MathUtils.clamp(params.z, -ARENA_HALF_D + 1.5, ARENA_HALF_D - 1.5);
    slot.radius = params.radius;
    slot.life = params.durationSec;
    slot.maxLife = params.durationSec;
    slot.tickTimer = 0.25;
    slot.damagePerTick = params.damagePerTick;
    slot.ownerName = params.ownerName;

    (slot.disc.material as THREE.MeshBasicMaterial).color.setHex(colors.disc);
    (slot.ring.material as THREE.MeshBasicMaterial).color.setHex(colors.ring);
    slot.group.position.set(slot.x, 0.045, slot.z);
    slot.group.scale.setScalar(slot.radius);
    slot.group.visible = true;
  }

  private spawnBossMultiSlam(params: {
    x: number;
    z: number;
    radius: number;
    delaySec: number;
    duration: number;
    damage: number;
    colorHex: number;
    hazardKind?: BossHazardKind;
    hazardDurationSec?: number;
    ownerName: string;
  }): void {
    const slot = this.bossMultiSlamPool.find((m) => !m.active);
    if (!slot) return;
    slot.active = true;
    slot.x = params.x;
    slot.z = params.z;
    slot.radius = params.radius;
    slot.delayTimer = Math.max(0, params.delaySec);
    slot.timer = Math.max(0.45, params.duration);
    slot.duration = slot.timer;
    slot.damage = params.damage;
    slot.colorHex = params.colorHex;
    slot.hazardKind = params.hazardKind;
    slot.hazardDurationSec = params.hazardDurationSec;
    slot.ownerName = params.ownerName;
    slot.group.position.set(slot.x, 0.085, slot.z);
    slot.group.scale.setScalar(slot.radius);
    slot.group.visible = slot.delayTimer <= 0;
  }

  private updateBossGroundHazardsAndMultiSlams(dt: number): void {
    const budget = getBossPerformanceBudget(this.lowEndGpu);

    // Tick persistent boss ground hazards (fire / poison / frost / whirlpool)
    for (const h of this.bossHazardPool) {
      if (!h.active) continue;
      h.life -= dt;
      if (h.life <= 0) {
        h.active = false;
        h.group.visible = false;
        continue;
      }
      const fade = Math.min(1, h.life / 0.7);
      const pulse = 0.92 + Math.sin(this.elapsed * 6.5 + h.x) * 0.06;
      h.group.scale.setScalar(h.radius * pulse);
      h.ring.rotation.z += dt * (h.kind === 'whirlpool' ? 2.4 : 0.9);
      (h.disc.material as THREE.MeshBasicMaterial).opacity = 0.3 * fade;
      (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.82 * fade;

      const dist = Math.hypot(this.px - h.x, this.pz - h.z);
      if (dist <= h.radius + 0.25) {
        if (h.kind === 'frost') {
          this.playerFrostSlowTimer = Math.max(this.playerFrostSlowTimer, 0.65);
        } else if (h.kind === 'whirlpool' && dist > 0.35) {
          const pull = 2.1 * dt;
          this.px = THREE.MathUtils.clamp(this.px + ((h.x - this.px) / dist) * pull, -ARENA_HALF_W + 0.6, ARENA_HALF_W - 0.6);
          this.pz = THREE.MathUtils.clamp(this.pz + ((h.z - this.pz) / dist) * pull, -ARENA_HALF_D + 0.6, ARENA_HALF_D - 0.6);
        }
        h.tickTimer -= dt;
        if (h.tickTimer <= 0) {
          h.tickTimer = 0.65;
          const labelMap: Record<BossHazardKind, string> = {
            fire: 'Vùng Dung Nham Cháy',
            poison: 'Vũng Độc Hoàng Đạo',
            frost: 'Băng Phong Tỏa Trận',
            whirlpool: 'Xoáy Nước Nguyệt Triều',
          };
          this.damagePlayer(
            h.damagePerTick,
            {
              code: 'boss_slam',
              label: `${labelMap[h.kind]} của ${h.ownerName}`,
              tip: 'Di chuyển rời khỏi vùng địa hình nguy hiểm đang phát sáng trên mặt sân.',
              killerName: h.ownerName,
            },
            h.x,
            h.z
          );
        }
      }
    }

    // Tick staggered multi-slam meteor / frost-pillar / rune circles
    const tp = resolveTelegraphPalette(this.highContrastTelegraphs);
    for (const m of this.bossMultiSlamPool) {
      if (!m.active) continue;
      if (m.delayTimer > 0) {
        m.delayTimer -= dt;
        if (m.delayTimer <= 0) {
          m.group.visible = true;
        }
        continue;
      }
      m.timer -= dt;
      const mCue = computeHadesTelegraphCue(m.timer, m.duration);
      const progress = mCue.progress;
      const isImminent = mCue.inStrikeWindow || m.timer <= 0.12;
      const flashHex = 0xfff7ed;
      m.group.scale.setScalar(m.radius * mCue.ringScaleBoost);
      m.fill.scale.setScalar(0.15 + progress * 0.85);
      (m.fill.material as THREE.MeshBasicMaterial).color.setHex(
        mCue.inStrikeWindow ? flashHex : isImminent ? tp.ringHex : m.colorHex
      );
      (m.fill.material as THREE.MeshBasicMaterial).opacity = mCue.fillOpacity;
      (m.outerRing.material as THREE.MeshBasicMaterial).color.setHex(
        mCue.inStrikeWindow ? flashHex : isImminent ? tp.imminentHex : tp.ringHex
      );
      const cd = computeCountdownRingScale(progress);
      m.countdownRing.scale.setScalar(Math.min(cd.scale, mCue.countdownScale));
      (m.countdownRing.material as THREE.MeshBasicMaterial).color.setHex(
        mCue.inStrikeWindow ? flashHex : cd.isImminent ? tp.imminentHex : tp.ringHex
      );

      if (m.timer <= 0) {
        m.active = false;
        m.group.visible = false;
        const pan = computeSpatialPan(m.x, ARENA_HALF_W);
        soundEngine.playMeteorImpact(pan);
        this.spawnShockwave(m.x, m.z, m.colorHex, m.radius + 0.5, 0.36);
        this.spawnImpactDecal(m.x, m.z, m.colorHex, m.radius * 0.85, 1.4);
        this.spawnParticles(m.x, 0.4, m.z, m.colorHex, Math.max(5, Math.round(14 * budget.particleScale)));
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        if (Math.hypot(this.px - m.x, this.pz - m.z) <= m.radius + 0.3) {
          this.damagePlayer(
            m.damage,
            {
              code: 'boss_slam',
              label: `Mưa Chiêu Thức của ${m.ownerName}`,
              tip: 'Bẻ ngoặt hướng chạy hoặc Lướt (Space) khỏi chuỗi vòng nổ nối tiếp!',
              killerName: m.ownerName,
            },
            m.x,
            m.z
          );
        }
        if (m.hazardKind) {
          this.spawnBossHazardZone({
            kind: m.hazardKind,
            x: m.x,
            z: m.z,
            radius: m.radius * 0.82,
            durationSec: m.hazardDurationSec ?? 4.0,
            damagePerTick: Math.max(11, Math.round(m.damage * 0.36)),
            ownerName: m.ownerName,
          });
        }
      }
    }
  }

  private executeEnemyAttack(e: EnemyEntity, isEnraged: boolean): void {
    // Wave 8: Dedicated Lethal 1v1 AI Rival 5-Pattern Arsenal
    if (e.isArenaRival && this.aiRivalActivePattern) {
      const sd = computeArenaSuddenDeath(this.arenaTimeLeft);
      const pattern = this.aiRivalActivePattern;
      const baseSpd = Math.max(12.5, this.aiRivalActiveProjSpeed);
      const hitDmg = Math.max(20, Math.round(e.damage * this.aiRivalActiveDmgMult * sd.damageMult));
      const baseYaw = Math.atan2(e.aimX, e.aimZ);

      if (pattern === 'crimson_snipe') {
        // High-velocity lead-aimed Crimson Sniper Lance + 2 close tracers
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        soundEngine.playMeteorImpact(computeSpatialPan(e.x, ARENA_HALF_W));
        this.fireEnemyOrb(
          e.x + e.aimX * 0.5,
          e.z + e.aimZ * 0.5,
          e.aimX * (baseSpd * 1.15),
          e.aimZ * (baseSpd * 1.15),
          hitDmg,
          0xf43f5e,
          'boss_lane'
        );
        for (const offset of [-0.12, 0.12]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * (baseSpd * 0.92),
            Math.cos(a) * (baseSpd * 0.92),
            Math.round(hitDmg * 0.72),
            0xfb7185,
            'boss_lane'
          );
        }
        return;
      }

      if (pattern === 'rapid_burst') {
        for (const offset of [-0.1, 0, 0.1]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * baseSpd,
            Math.cos(a) * baseSpd,
            hitDmg,
            0x38bdf8,
            'boss_projectile'
          );
        }
        return;
      }

      if (pattern === 'flank_fan') {
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.18);
        const count = this.aiRivalBrainState?.enraged ? 7 : 5;
        const spread = 0.18;
        for (let k = 0; k < count; k++) {
          const a = baseYaw + (k - (count - 1) / 2) * spread;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * baseSpd,
            Math.cos(a) * baseSpd,
            hitDmg,
            0xf97316,
            'boss_projectile'
          );
        }
        return;
      }

      if (pattern === 'hazard_zone') {
        this.spawnShockwave(e.slamX, e.slamZ, 0xf97316, e.slamRadius + 0.5, 0.42);
        this.spawnImpactDecal(e.slamX, e.slamZ, 0xf97316, e.slamRadius * 0.92, 1.8);
        this.spawnParticles(e.slamX, 0.45, e.slamZ, 0xf97316, 20);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.3);
        soundEngine.playMeteorImpact(computeSpatialPan(e.slamX, ARENA_HALF_W));
        if (Math.hypot(this.px - e.slamX, this.pz - e.slamZ) <= e.slamRadius + 0.38) {
          this.damagePlayer(
            hitDmg,
            {
              code: 'boss_slam',
              label: `Thiên Thạch Phong Tỏa của ${this.arenaOpponentName || 'AI Rival'}`,
              tip: 'AI đặt vòng nổ chặn trước hướng chạy của bạn — hãy bẻ ngoặt ngược lại hoặc Lướt (Space) ngay khi vòng đầy.',
              killerName: this.arenaOpponentName || 'AI Rival',
            },
            e.slamX,
            e.slamZ
          );
        }
        const ringCount = this.aiRivalBrainState?.enraged ? 10 : 8;
        for (let r = 0; r < ringCount; r++) {
          const a = (r / ringCount) * Math.PI * 2 + baseYaw * 0.25;
          this.fireEnemyOrb(
            e.slamX,
            e.slamZ,
            Math.sin(a) * (baseSpd * 0.72),
            Math.cos(a) * (baseSpd * 0.72),
            Math.round(hitDmg * 0.75),
            0xfb923c,
            'boss_projectile'
          );
        }
        return;
      }

      if (pattern === 'ai_ultimate') {
        this.spawnShockwave(e.x, e.z, 0xfbbf24, 5.4, 0.52);
        this.spawnImpactLight(e.x, 1.8, e.z, 'boss_slam');
        this.spawnParticles(e.x, 1.0, e.z, 0xfbbf24, 28);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.38);
        soundEngine.playMeteorImpact(computeSpatialPan(e.x, ARENA_HALF_W));
        // 14-orb cosmic spiral + 3 aimed lethal execution lances
        const spiralCount = this.aiRivalBrainState?.enraged ? 16 : 12;
        for (let r = 0; r < spiralCount; r++) {
          const a = (r / spiralCount) * Math.PI * 2 + this.elapsed * 0.7;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * (baseSpd * 0.78),
            Math.cos(a) * (baseSpd * 0.78),
            Math.round(hitDmg * 0.82),
            0xfbbf24,
            'boss_projectile'
          );
        }
        for (const offset of [-0.14, 0, 0.14]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * (baseSpd * 1.18),
            Math.cos(a) * (baseSpd * 1.18),
            hitDmg,
            0xf43f5e,
            'boss_lane'
          );
        }
        return;
      }
    }

    const pveSpdMult =
      !this.isTrainingMode && !this.isArenaMode && !this.isWeeklyRankedBossMode
        ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).enemyProjectileSpeedMult
        : 1.0;

    // AAA Hades-style 12-Skill Regular Mob Execution across ALL 12 Chapters & Endless Tower
    if (!e.isBoss && !e.isArenaRival && e.tacticalRole !== 'charger' && e.mobActiveSkill) {
      const skill = e.mobActiveSkill;
      e.mobActiveSkill = '';
      const baseYaw = Math.atan2(e.aimX, e.aimZ);
      const vfxBudget = getAaaMobVfxBudget(this.lowEndGpu);
      const sideSign = e.mobFlankSign ?? 1;
      const perpX = -e.aimZ * sideSign;
      const perpZ = e.aimX * sideSign;
      const pan = computeSpatialPan(e.x, ARENA_HALF_W);

      const mobTheme = resolveChapterMobSkillTheme(this.currentChapter.id);

      const triggerBurst = (burst: Chapter1RosterBurstType, dur = 0.32) => {
        e.mobBurstTimer = dur;
        if (e.roster3dVisualGroup) {
          e.roster3dBurstType = burst;
          e.roster3dBurstTimer = dur;
        }
      };

      if (skill === 'pounce_lunge') {
        triggerBurst('lunge', 0.34);
        e.mobDashActive = true;
        e.mobDashElapsed = 0;
        e.mobDashDuration = 0.28;
        e.mobDashDirX = e.aimX;
        e.mobDashDirZ = e.aimZ;
        e.mobDashSpeed = 16.5;
        e.mobDashHitPlayer = false;
        e.mobDashHopHeight = 0.85;
        e.mobDashColorHex = mobTheme.pounceHex;
        soundEngine.playDash();
        this.spawnParticles(e.x, 0.35, e.z, mobTheme.pounceHex, Math.max(3, Math.round(7 * vfxBudget.trailParticleScale)));
        return;
      }

      if (skill === 'flank_crescent_swipe') {
        triggerBurst('lunge', 0.3);
        const cx = THREE.MathUtils.clamp(e.x + e.aimX * 1.4, -ARENA_HALF_W + 1.2, ARENA_HALF_W - 1.2);
        const cz = THREE.MathUtils.clamp(e.z + e.aimZ * 1.4, -ARENA_HALF_D + 1.2, ARENA_HALF_D - 1.2);
        this.spawnShockwave(cx, cz, mobTheme.swipeHex, 2.55, 0.28);
        this.spawnParticles(cx, 0.55, cz, mobTheme.swipeSparkHex, Math.max(4, Math.round(9 * vfxBudget.trailParticleScale)));
        if (Math.hypot(this.px - cx, this.pz - cz) <= 2.35) {
          this.damagePlayer(
            e.damage * 0.95,
            {
              code: 'melee_swarm',
              label: 'Trảm Nguyệt Cận Chiến',
              tip: 'Bước lùi hoặc lướt chéo ngược chiều né cú chém bán nguyệt của quái cận chiến.',
            },
            e.x,
            e.z
          );
        }
        // Short chapter-themed crescent sparks
        for (const offset of [-0.26, 0.26]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x + Math.sin(a) * 0.5,
            e.z + Math.cos(a) * 0.5,
            Math.sin(a) * 9.8 * pveSpdMult,
            Math.cos(a) * 9.8 * pveSpdMult,
            Math.round(e.damage * 0.65),
            mobTheme.swipeHex,
            'ranged_barrage'
          );
        }
        e.mobSideHopTimer = 0.22;
        e.mobSideHopDirX = perpX;
        e.mobSideHopDirZ = perpZ;
        return;
      }

      if (skill === 'seismic_fissure_slam' || skill === 'juggernaut_advance_slam') {
        triggerBurst('slam', 0.4);
        const slamR = skill === 'seismic_fissure_slam' ? 3.55 : 2.85;
        const slamColor = skill === 'seismic_fissure_slam' ? mobTheme.slamHex : mobTheme.tremorHex;
        this.spawnShockwave(e.x, e.z, slamColor, slamR + 0.4, 0.38);
        this.spawnImpactDecal(e.x, e.z, slamColor, slamR * 0.82, 1.4);
        this.spawnParticles(e.x, 0.35, e.z, slamColor, Math.max(5, Math.round(14 * vfxBudget.trailParticleScale)));
        this.shakeIntensity = Math.max(this.shakeIntensity, skill === 'seismic_fissure_slam' ? 0.22 : 0.16);
        soundEngine.playImpactScorchThump(pan);
        if (Math.hypot(this.px - e.x, this.pz - e.z) <= slamR + 0.3) {
          this.damagePlayer(
            e.damage * (skill === 'seismic_fissure_slam' ? 1.15 : 1.0),
            {
              code: 'boss_slam',
              label: skill === 'seismic_fissure_slam' ? 'Địa Chấn Nứt Đất' : 'Giẫm Chấn Giáp Đá',
              tip: 'Thoát khỏi vòng cảnh báo khi vòng lóe sáng trắng-vàng trước khi Golem giậm đất.',
            },
            e.x,
            e.z
          );
        }
        if (skill === 'seismic_fissure_slam') {
          // 3-orb directional seismic fissure wave aimed toward hero
          for (const offset of [-0.24, 0, 0.24]) {
            const a = baseYaw + offset;
            this.fireEnemyOrb(
              e.x + Math.sin(a) * 0.65,
              e.z + Math.cos(a) * 0.65,
              Math.sin(a) * 8.9 * pveSpdMult,
              Math.cos(a) * 8.9 * pveSpdMult,
              Math.round(e.damage * 0.78),
              mobTheme.slamHex,
              'ranged_barrage'
            );
          }
          if (vfxBudget.allowFissureSparks) {
            this.spawnParticles(e.x + e.aimX * 1.6, 0.25, e.z + e.aimZ * 1.6, mobTheme.swipeSparkHex, 6);
          }
        } else {
          // 4-way compact radial tremor orbs
          for (let r = 0; r < 4; r++) {
            const a = baseYaw + (r * Math.PI) / 2 + Math.PI / 4;
            this.fireEnemyOrb(
              e.x,
              e.z,
              Math.sin(a) * 8.2 * pveSpdMult,
              Math.cos(a) * 8.2 * pveSpdMult,
              Math.round(e.damage * 0.72),
              mobTheme.tremorHex,
              'ranged_barrage'
            );
          }
        }
        return;
      }

      if (skill === 'arcane_tri_volley') {
        triggerBurst('cast', 0.34);
        for (const offset of [-0.18, 0, 0.18]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 9.8 * pveSpdMult,
            Math.cos(a) * 9.8 * pveSpdMult,
            Math.round(e.damage * 0.85),
            mobTheme.volleyHex,
            'ranged_barrage'
          );
        }
        // Crisp Hades post-shot lateral hop
        e.mobSideHopTimer = 0.24;
        e.mobSideHopDirX = perpX;
        e.mobSideHopDirZ = perpZ;
        if (e.tacticalRole === 'arcane_sniper') {
          this.spawnParticles(e.x, 1.0, e.z, mobTheme.volleyHex, 8);
        }
        return;
      }

      if (skill === 'solar_rune_mortar') {
        triggerBurst('cast', 0.34);
        const mx = THREE.MathUtils.clamp(e.slamX || this.px, -ARENA_HALF_W + 1.6, ARENA_HALF_W - 1.6);
        const mz = THREE.MathUtils.clamp(e.slamZ || this.pz, -ARENA_HALF_D + 1.6, ARENA_HALF_D - 1.6);
        this.spawnBossMultiSlam({
          x: mx,
          z: mz,
          radius: 2.15,
          delaySec: 0,
          duration: 0.78,
          damage: Math.round(e.damage * 1.05),
          colorHex: mobTheme.mortarHex,
          ownerName: mobTheme.mortarOwnerName,
        });
        this.spawnParticles(e.x, 1.1, e.z, mobTheme.mortarHex, Math.max(3, Math.round(7 * vfxBudget.trailParticleScale)));
        e.mobSideHopTimer = 0.26;
        e.mobSideHopDirX = perpX;
        e.mobSideHopDirZ = perpZ;
        return;
      }

      if (skill === 'spear_thrust_dash') {
        triggerBurst('lunge', 0.34);
        e.mobDashActive = true;
        e.mobDashElapsed = 0;
        e.mobDashDuration = 0.28;
        e.mobDashDirX = e.aimX;
        e.mobDashDirZ = e.aimZ;
        e.mobDashSpeed = 18.2;
        e.mobDashHitPlayer = false;
        e.mobDashHopHeight = 0.24;
        e.mobDashColorHex = mobTheme.spearDashHex;
        soundEngine.playDash();
        // Fast piercing lance bolt straight down the thrust lane
        this.fireEnemyOrb(
          e.x + e.aimX * 0.7,
          e.z + e.aimZ * 0.7,
          e.aimX * 13.0 * pveSpdMult,
          e.aimZ * 13.0 * pveSpdMult,
          Math.round(e.damage * 0.9),
          mobTheme.spearDashHex,
          'ranged_barrage'
        );
        return;
      }

      if (skill === 'sweeping_lance_fan') {
        triggerBurst('cast', 0.32);
        for (const offset of [-0.22, 0, 0.22]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 10.6 * pveSpdMult,
            Math.cos(a) * 10.6 * pveSpdMult,
            Math.round(e.damage * 0.85),
            mobTheme.spearFanHex,
            'ranged_barrage'
          );
        }
        e.mobSideHopTimer = 0.26;
        e.mobSideHopDirX = perpX;
        e.mobSideHopDirZ = perpZ;
        return;
      }

      if (skill === 'phase_dart_blink') {
        triggerBurst('cast', 0.32);
        this.spawnParticles(e.x, 1.0, e.z, 0x22d3ee, Math.max(4, Math.round(9 * vfxBudget.trailParticleScale)));
        const blinkDest = computeSafeFlankBlinkTarget({
          enemyX: e.x,
          enemyZ: e.z,
          playerX: this.px,
          playerZ: this.pz,
          flankSign: sideSign,
          desiredDistance: 6.8,
          minSafeDistance: 3.6,
          radius: e.radius,
          arenaHalfW: ARENA_HALF_W,
          arenaHalfD: ARENA_HALF_D,
          obstacles: this.obstacles,
        });
        e.x = blinkDest.x;
        e.z = blinkDest.z;
        this.spawnParticles(e.x, 1.0, e.z, 0x22d3ee, Math.max(4, Math.round(9 * vfxBudget.trailParticleScale)));
        const newYaw = Math.atan2(this.px - e.x, this.pz - e.z);
        for (const offset of [-0.15, 0, 0.15]) {
          const a = newYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 11.4 * pveSpdMult,
            Math.cos(a) * 11.4 * pveSpdMult,
            Math.round(e.damage * 0.82),
            0x22d3ee,
            'ranged_barrage'
          );
        }
        return;
      }

      if (skill === 'spiral_pulse_ring') {
        triggerBurst('cast', 0.34);
        this.spawnShockwave(e.x, e.z, 0x38bdf8, 3.0, 0.32);
        for (let r = 0; r < 4; r++) {
          const a = baseYaw + (r / 4) * Math.PI * 2 + 0.35;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 8.8 * pveSpdMult,
            Math.cos(a) * 8.8 * pveSpdMult,
            Math.round(e.damage * 0.85),
            0x38bdf8,
            'ranged_barrage'
          );
        }
        return;
      }

      if (skill === 'shadow_step_ambush') {
        triggerBurst('lunge', 0.32);
        this.spawnParticles(e.x, 0.9, e.z, 0xa855f7, Math.max(4, Math.round(10 * vfxBudget.trailParticleScale)));
        const blinkDest = computeSafeFlankBlinkTarget({
          enemyX: e.x,
          enemyZ: e.z,
          playerX: this.px,
          playerZ: this.pz,
          flankSign: sideSign,
          desiredDistance: 4.5,
          minSafeDistance: 3.5,
          radius: e.radius,
          arenaHalfW: ARENA_HALF_W,
          arenaHalfD: ARENA_HALF_D,
          obstacles: this.obstacles,
        });
        e.x = blinkDest.x;
        e.z = blinkDest.z;
        this.spawnParticles(e.x, 0.9, e.z, 0xc084fc, Math.max(4, Math.round(10 * vfxBudget.trailParticleScale)));
        const adx = this.px - e.x;
        const adz = this.pz - e.z;
        const adLen = Math.hypot(adx, adz) || 1;
        e.mobDashActive = true;
        e.mobDashElapsed = 0;
        e.mobDashDuration = 0.24;
        e.mobDashDirX = adx / adLen;
        e.mobDashDirZ = adz / adLen;
        e.mobDashSpeed = 15.8;
        e.mobDashHitPlayer = false;
        e.mobDashHopHeight = 0.45;
        e.mobDashColorHex = 0xa855f7;
        soundEngine.playDash();
        return;
      }

      if (skill === 'twin_shadow_knives') {
        triggerBurst('cast', 0.28);
        for (const offset of [-0.14, 0.14]) {
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 11.2 * pveSpdMult,
            Math.cos(a) * 11.2 * pveSpdMult,
            Math.round(e.damage * 0.85),
            0xc084fc,
            'ranged_barrage'
          );
        }
        e.mobSideHopTimer = 0.24;
        e.mobSideHopDirX = perpX;
        e.mobSideHopDirZ = perpZ;
        return;
      }
    }

    if (e.telegraphType === 'lunge') {
      if (e.solarLionVisualGroup) {
        e.solarLionBurstType = 'lunge';
        e.solarLionBurstTimer = 0.38;
      }
      if (e.roster3dVisualGroup) {
        e.roster3dBurstType = 'lunge';
        e.roster3dBurstTimer = 0.36;
      }
      if (e.tacticalRole === 'charger') {
        e.chargerDashing = true;
        e.chargerDashTimer = 0.62;
        e.chargerDirX = e.aimX;
        e.chargerDirZ = e.aimZ;
        soundEngine.playDash();
        this.spawnParticles(e.x, 0.7, e.z, 0xf43f5e, 10);
      } else {
        e.x += e.aimX * 2.4;
        e.z += e.aimZ * 2.4;
        this.spawnParticles(e.x, 0.6, e.z, 0xfacc15, 6);
        if (Math.hypot(this.px - e.x, this.pz - e.z) < e.radius + 0.9) {
          this.damagePlayer(
            e.damage,
            {
              code: 'melee_swarm',
              label: 'Cú lao tới của quái cận chiến',
              tip: 'Bước ngang khi vòng báo màu vàng xuất hiện dưới chân quái rồi bắn phản công.',
            },
            e.x,
            e.z
          );
        }
      }
    } else if (e.telegraphType === 'shot') {
      const baseYaw = Math.atan2(e.aimX, e.aimZ);
      const partSlowPct =
        e.isBoss && e.bossParts
          ? Math.min(
              0.4,
              e.bossParts.reduce((s, bp) => s + (bp.broken ? bp.barrageSlowPct : 0), 0)
            )
          : 0;
      const bossProjMult = pveSpdMult * (1 - partSlowPct);
      if (e.isBoss) {
        if (e.solarLionVisualGroup) {
          e.solarLionBurstType = 'roar';
          e.solarLionBurstTimer = 0.34;
        }
        const count =
          e.kind === EnemyKind.ZODIAC_BOSS
            ? isEnraged
              ? 7
              : 5
            : e.kind === EnemyKind.TITAN_BOSS
            ? 5
            : 3;
        const spread = 0.25;
        for (let k = 0; k < count; k++) {
          const offset = (k - (count - 1) / 2) * spread;
          const a = baseYaw + offset;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 11.2 * bossProjMult,
            Math.cos(a) * 11.2 * bossProjMult,
            e.damage,
            e.kind === EnemyKind.ZODIAC_BOSS ? this.currentChapter.trimHex : 0xa855f7,
            'boss_projectile'
          );
        }
      } else if (e.kind === EnemyKind.DRAGON_WHELP) {
        if (e.roster3dVisualGroup) {
          e.roster3dBurstType = 'lunge';
          e.roster3dBurstTimer = 0.32;
        }
        for (let k = -1; k <= 1; k += 2) {
          const a = baseYaw + k * 0.18;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 10.2 * pveSpdMult,
            Math.cos(a) * 10.2 * pveSpdMult,
            e.damage,
            0xf97316,
            'ranged_barrage'
          );
        }
      } else {
        if (e.roster3dVisualGroup) {
          e.roster3dBurstType = 'cast';
          e.roster3dBurstTimer = 0.34;
        }
        const speed = (e.kind === EnemyKind.WISP ? 11.5 : 9.6) * pveSpdMult;
        this.fireEnemyOrb(
          e.x,
          e.z,
          e.aimX * speed,
          e.aimZ * speed,
          e.damage,
          e.kind === EnemyKind.WISP
            ? 0x22d3ee
            : e.kind === EnemyKind.SHADOW_STALKER
            ? 0xc084fc
            : 0xf43f5e,
          'ranged_barrage'
        );
        if (e.tacticalRole === 'arcane_sniper') {
          this.spawnParticles(e.x, 1.0, e.z, 0xc084fc, 10);
          const sideSign = Math.random() < 0.5 ? 1 : -1;
          e.x = THREE.MathUtils.clamp(e.x + -e.aimZ * sideSign * 3.0, -ARENA_HALF_W + 1, ARENA_HALF_W - 1);
          e.z = THREE.MathUtils.clamp(e.z + e.aimX * sideSign * 3.0, -ARENA_HALF_D + 1, ARENA_HALF_D - 1);
          this.spawnParticles(e.x, 1.0, e.z, 0xc084fc, 10);
        }
      }
    } else if (e.telegraphType === 'lane') {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
      soundEngine.playMeteorImpact();
      const laneSlowPct =
        e.isBoss && e.bossParts
          ? Math.min(
              0.4,
              e.bossParts.reduce((s, bp) => s + (bp.broken ? bp.barrageSlowPct : 0), 0)
            )
          : 0;
      const laneProjMult = pveSpdMult * (1 - laneSlowPct);
      e.laneAngles.forEach((ang) => {
        for (let b = 0; b < (isEnraged ? 3 : 2); b++) {
          const speed = (13.5 + b * 2.2) * laneProjMult;
          this.fireEnemyOrb(
            e.x + Math.sin(ang) * 0.6,
            e.z + Math.cos(ang) * 0.6,
            Math.sin(ang) * speed,
            Math.cos(ang) * speed,
            e.damage * 1.05,
            0xf43f5e,
            'boss_lane'
          );
        }
        // AAA Wave 5: Boss danger lanes shatter destructible crystal cover pillars along the corridor
        const dirX = Math.sin(ang);
        const dirZ = Math.cos(ang);
        for (const obs of this.obstacles) {
          if (!obs.destructible || obs.intact === false) continue;
          const relX = obs.x - e.x;
          const relZ = obs.z - e.z;
          const along = relX * dirX + relZ * dirZ;
          if (along > 0.5 && along < 15.5) {
            const perp = Math.abs(relX * dirZ - relZ * dirX);
            if (perp < 1.45) {
              this.shatterCrystalObstacle(obs);
            }
          }
        }
      });
    } else if (e.telegraphType === 'slam' || e.telegraphType === 'spiral') {
      if (e.solarLionVisualGroup) {
        e.solarLionBurstType = 'slam';
        e.solarLionBurstTimer = 0.42;
      }
      if (e.roster3dVisualGroup) {
        e.roster3dBurstType = 'slam';
        e.roster3dBurstTimer = 0.42;
      }
      if (e.telegraphType === 'slam') {
        this.spawnShockwave(e.slamX, e.slamZ, 0xf97316, e.slamRadius + 0.6, 0.42);
        this.spawnImpactDecal(e.slamX, e.slamZ, 0xf97316, e.slamRadius * 0.95, 1.85);
        this.spawnBattleScar(e.slamX, e.slamZ, Math.max(0.85, e.slamRadius * 0.42));
        if (e.isBoss && !e.isTrainingDummy) {
          this.openBossWeakPoint(e);
        }
        this.spawnParticles(e.slamX, 0.4, e.slamZ, 0xf97316, 22);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.34);
        const slamPan = computeSpatialPan(e.slamX, ARENA_HALF_W);
        soundEngine.playMeteorImpact(slamPan);
        soundEngine.playImpactScorchThump(slamPan);
        this.spawnImpactLight(e.slamX, 1.4, e.slamZ, 'boss_slam');
        this.triggerPostFxImpulse('boss_slam');
        for (const obs of this.obstacles) {
          if (!obs.destructible || obs.intact === false) continue;
          if (Math.hypot(obs.x - e.slamX, obs.z - e.slamZ) <= e.slamRadius + 1.35) {
            this.shatterCrystalObstacle(obs);
          }
        }
        if (Math.hypot(this.px - e.slamX, this.pz - e.slamZ) <= e.slamRadius + 0.35) {
          this.damagePlayer(
            e.damage * 1.15,
            {
              code: 'boss_slam',
              label: `Vòng Chấn Động của ${e.bossTitle ?? 'Boss'}`,
              tip: 'Rời khỏi vòng cảnh báo vàng-đỏ trước khi vòng đầy, sau đó tận dụng 1.5s hồi chiêu để xả đạn.',
              killerName: e.bossTitle,
            },
            e.slamX,
            e.slamZ
          );
        }
      }
      const spiralSlowPct =
        e.isBoss && e.bossParts
          ? Math.min(
              0.4,
              e.bossParts.reduce((s, bp) => s + (bp.broken ? bp.barrageSlowPct : 0), 0)
            )
          : 0;
      const spiralSpd = 8.4 * (1 - spiralSlowPct);
      const ringCount = e.isBoss
        ? e.kind === EnemyKind.ZODIAC_BOSS
          ? isEnraged
            ? 14
            : 8
          : e.kind === EnemyKind.TITAN_BOSS
          ? isEnraged
            ? 12
            : 8
          : isEnraged
          ? 10
          : 6
        : 4;
      for (let r = 0; r < ringCount; r++) {
        const a = (r / ringCount) * Math.PI * 2 + (isEnraged ? 0.22 : 0);
        this.fireEnemyOrb(
          e.x,
          e.z,
          Math.sin(a) * spiralSpd,
          Math.cos(a) * spiralSpd,
          e.damage * 0.85,
          e.kind === EnemyKind.ZODIAC_BOSS ? this.currentChapter.trimHex : 0xf97316,
          e.isBoss ? 'boss_projectile' : 'ranged_barrage'
        );
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.arrowPool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Homing steering (Tracking Eye / Staff / Swords / Companions)
      if (p.homing) {
        const target = this.findNearestEnemy(p.x, p.z, p.hitEnemyIds, 9.5);
        if (target && target.spawnTimer <= 0) {
          const speed = Math.hypot(p.vx, p.vz);
          const dx = target.x - p.x;
          const dz = target.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.1) {
            const desiredVx = (dx / d) * speed;
            const desiredVz = (dz / d) * speed;
            const turn = Math.min(1, dt * 8.5);
            p.vx += (desiredVx - p.vx) * turn;
            p.vz += (desiredVz - p.vz) * turn;
            const newSpd = Math.hypot(p.vx, p.vz);
            p.vx = (p.vx / newSpd) * speed;
            p.vz = (p.vz / newSpd) * speed;
            p.mesh.rotation.y = Math.atan2(p.vx, p.vz);
          }
        }
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      if (p.compassGroup?.visible) {
        p.compassGroup.rotation.y += dt * 16;
      }

      let bounced = false;
      if (Math.abs(p.x) >= ARENA_HALF_W) {
        if (p.wallBounceLeft > 0) {
          p.wallBounceLeft--;
          p.vx = -p.vx;
          p.x = THREE.MathUtils.clamp(p.x, -ARENA_HALF_W + 0.1, ARENA_HALF_W - 0.1);
          bounced = true;
        } else {
          this.spawnParticles(p.x, p.y, p.z, 0x94a3b8, 4);
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
      }
      if (Math.abs(p.z) >= ARENA_HALF_D) {
        if (p.wallBounceLeft > 0) {
          p.wallBounceLeft--;
          p.vz = -p.vz;
          p.z = THREE.MathUtils.clamp(p.z, -ARENA_HALF_D + 0.1, ARENA_HALF_D - 0.1);
          bounced = true;
        } else {
          this.spawnParticles(p.x, p.y, p.z, 0x94a3b8, 4);
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
      }

      let hitPillar = false;
      for (const obs of this.obstacles) {
        if (obs.intact === false) continue;
        const dx = p.x - obs.x;
        const dz = p.z - obs.z;
        const d = Math.hypot(dx, dz);
        if (d < obs.radius + p.radius) {
          if (p.wallBounceLeft > 0) {
            p.wallBounceLeft--;
            const nx = dx / Math.max(0.01, d);
            const nz = dz / Math.max(0.01, d);
            const dot = p.vx * nx + p.vz * nz;
            p.vx -= 2 * dot * nx;
            p.vz -= 2 * dot * nz;
            p.x = obs.x + nx * (obs.radius + p.radius + 0.05);
            p.z = obs.z + nz * (obs.radius + p.radius + 0.05);
            bounced = true;
          } else {
            this.spawnParticles(p.x, p.y, p.z, 0x94a3b8, 4);
            p.active = false;
            p.mesh.visible = false;
            hitPillar = true;
          }
          break;
        }
      }
      if (hitPillar) continue;
      if (bounced) {
        p.mesh.rotation.y = Math.atan2(p.vx, p.vz);
      }

      for (const urn of this.urns) {
        if (!urn.alive) continue;
        if (Math.hypot(p.x - urn.x, p.z - urn.z) < urn.radius + p.radius) {
          this.shatterUrn(urn);
        }
      }

      // AAA Wave 7: Shootable 3D Arena Resonance Traps
      for (const trap of this.resonanceTraps) {
        if (trap.cooldown > 0) continue;
        if (Math.hypot(p.x - trap.x, p.z - trap.z) < trap.radius + p.radius + 0.18) {
          this.detonateResonanceTrap(trap);
          break;
        }
      }

      // Wave 9: Shootable Interactive 3D Arena Props (Obelisk, Brazier, Relic Crate)
      for (const prop of this.wave9Props) {
        if (!prop.alive) continue;
        if (Math.hypot(p.x - prop.x, p.z - prop.z) < prop.radius + p.radius + 0.22) {
          this.triggerWave9ArenaProp(prop);
          break;
        }
      }

      // Wave 11: Shootable 3D Interactive Battlefield Hazards (Frost Crystal / Magma Brazier / Volt Obelisk)
      let detonatedHazard = false;
      for (const hz of this.wave11Hazards) {
        if (hz.spec.detonated) continue;
        if (Math.hypot(p.x - hz.spec.x, p.z - hz.spec.z) < hz.spec.hitRadius + p.radius + 0.16) {
          const hitRes = damageInteractiveHazard(hz.spec, p.damage, this.baseStats.attack);
          hz.spec = hitRes.nextHazard;
          if (hitRes.overdriveChargeGain > 0) {
            this.weaponOverdrive = chargeWeaponOverdrive(
              this.weaponOverdrive,
              hitRes.overdriveChargeGain,
              {
                styleGrade: this.styleMomentum.grade,
                mutatorMult: this.equalizedRiftOverdriveMult,
              }
            );
          }
          if (hitRes.detonatedNow) {
            hz.group.visible = false;
            detonatedHazard = true;
            const hzPan = computeSpatialPan(hz.spec.x, ARENA_HALF_W);
            soundEngine.playBossBreakShatter(hzPan);
            soundEngine.playImpactScorchThump(hzPan);
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.42);
            this.spawnArmorShards(hz.spec.x, 1.15, hz.spec.z, hz.spec.primaryHex, 14);
            this.spawnShockwave(hz.spec.x, hz.spec.z, hz.spec.primaryHex, hitRes.blastRadius, 0.46);
            this.spawnParticles(hz.spec.x, 1.1, hz.spec.z, hz.spec.accentHex, 24);
            this.emitFloatingNumber(
              hz.spec.x,
              2.35,
              hz.spec.z,
              hitRes.blastDamage,
              true,
              false,
              hitRes.element,
              hitRes.calloutText ?? 'KÍCH NỔ MÔI TRƯỜNG!',
              true
            );
            const resAdv = advanceElementalResonance(
              this.elementalResonance,
              hitRes.element,
              hitRes.blastDamage
            );
            this.elementalResonance = resAdv.nextState;
            for (const en of [...this.enemies]) {
              if (!en || en.dead || en.spawnTimer > 0) continue;
              if (Math.hypot(en.x - hz.spec.x, en.z - hz.spec.z) <= hitRes.blastRadius + en.radius) {
                if (hitRes.stunSec > 0 && !en.isBoss) {
                  en.stunTimer = Math.max(en.stunTimer ?? 0, hitRes.stunSec);
                }
                if (en.isBoss && en.maxBreakShield && en.breakShield && en.breakShield > 0) {
                  const brk = Math.round(en.maxBreakShield * hitRes.breakShieldRatio);
                  en.breakShield = Math.max(0, en.breakShield - brk);
                  if (this.bossStaggerOwnerId === en.id && this.bossStaggerState) {
                    this.bossStaggerState.current = Math.min(
                      this.bossStaggerState.max,
                      this.bossStaggerState.current + brk
                    );
                  }
                }
                this.damageEnemy(
                  en,
                  hitRes.blastDamage,
                  true,
                  hitRes.element === 'fire',
                  hitRes.element === 'ice',
                  hitRes.element === 'storm',
                  false,
                  hz.spec.label,
                  'elemental'
                );
              }
            }
          } else {
            this.spawnParticles(hz.spec.x, 0.95, hz.spec.z, hz.spec.accentHex, 6);
            hz.core.scale.setScalar(1.18);
          }
          p.active = false;
          p.mesh.visible = false;
          break;
        }
      }
      if (detonatedHazard || !p.active) continue;

      // AAA Wave 7: Orbiting Boss Weak-Point Crystal hit check
      if (this.bossWeakPointState && this.bossWeakPointState.active && this.bossWeakPointEnemyId !== null) {
        const wpBoss = this.enemies.find((en) => en.id === this.bossWeakPointEnemyId);
        if (wpBoss && wpBoss.hp > 0) {
          const wpPos = getBossWeakPointWorldPos(wpBoss.x, wpBoss.z, this.bossWeakPointState);
          if (checkBossWeakPointHit(wpPos.x, wpPos.z, p.x, p.z, 1.18)) {
            this.shatterBossWeakPoint(wpBoss, wpPos.x, wpPos.y, wpPos.z, p.damage);
          }
        }
      }

      for (const e of [...this.enemies]) {
        if (!e || e.dead || e.spawnTimer > 0 || p.hitEnemyIds.has(e.id)) continue;
        if (Math.hypot(p.x - e.x, p.z - e.z) < e.radius + p.radius) {
          p.hitEnemyIds.add(e.id);

          const critStacks = this.activeSkills.crit_mastery ?? 0;
          let critChance = Math.min(
            0.95,
            this.baseStats.critChance +
              critStacks * 0.12 +
              (this.alexOverdriveTimer > 0 ? 0.25 : 0) +
              this.weaponOverdriveBuffs.critChanceBonus +
              (this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.critBonus : 0)
          );
          if (this.hasRune('rune_flame') && (e.burnTimer > 0 || e.poisonDps > 0)) {
            critChance = Math.min(0.95, critChance + 0.1);
          }

          let isCrit = p.isCounterShot ? true : Math.random() < critChance;
          if (this.hasCadencePassive && this.alexGuaranteedCrit) {
            isCrit = true;
            this.alexGuaranteedCrit = false;
          }
          if (isCrit && this.hasCadencePassive) {
            this.alexAspdBuffTimer = 5.0;
          }

          let critMult = this.baseStats.critDamage + critStacks * 0.35;
          const activeSynergies = evaluateActiveSynergies(this.activeSkills);
          if (e.chillTimer > 0 && activeSynergies.includes('frost_shatter')) {
            critMult += 0.25;
          }
          const dmg = p.damage * (isCrit ? critMult : 1);

          if (
            p.isOvercharge &&
            e.isBoss &&
            e.maxBreakShield &&
            e.breakShield &&
            e.breakShield > 0
          ) {
            e.breakShield = Math.max(0, e.breakShield - e.maxBreakShield * 0.18);
          }

          const hpBeforeHit = e.hp;
          this.damageEnemy(
            e,
            dmg,
            isCrit,
            p.blaze,
            p.frost,
            p.storm,
            p.poison,
            p.isCounterShot
              ? 'PHẢN TIỄN!'
              : p.isOvercharge
              ? 'TỤ LỰC!'
              : p.isComboFinisher
              ? 'LIÊN HOÀN 4!'
              : undefined,
            p.source ?? (p.isSword ? 'elemental' : 'basic'),
            p.coopAllyIndex,
            {
              attackerX: p.x - p.vx * 0.05,
              attackerZ: p.z - p.vz * 0.05,
              bypassShield: Boolean(
                p.isComboFinisher || p.isCounterShot || p.isOvercharge || p.pierceLeft > 0
              ),
            }
          );

          // AAA Wave 7: Lodge pooled arrow visibly into Boss / Elite / large enemy armor
          if (!p.isSword && (e.isBoss || e.isElite || e.radius >= 0.72) && e.hp > 0) {
            this.spawnStuckArrow(e, Math.atan2(p.vx, p.vz));
          }

          if (isCrit && this.elementalZoneSpawnCd <= 0 && (p.blaze || p.frost)) {
            this.elementalZoneSpawnCd = 1.65;
            this.spawnElementalZone(e.x, e.z, p.blaze ? 'ember' : 'frost', 2.05);
          }

          // Hero on-hit passives
          if (!p.isSword) {
            if (this.baseStats.heroId === 'artemis') {
              this.markedEnemyIds.add(e.id);
            } else if (this.baseStats.heroId === 'aurelia') {
              this.aureliaSolarShotCount++;
              if (this.aureliaSolarShotCount >= 3) {
                this.aureliaSolarShotCount = 0;
                const coronaDmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * 1.45;
                this.shield = Math.min(this.maxHp * 0.35, this.shield + this.maxHp * 0.04);
                this.spawnShockwave(e.x, e.z, 0xf59e0b, 2.8, 0.34);
                this.spawnParticles(e.x, 0.9, e.z, 0xfef08a, 10);
                for (const other of [...this.enemies]) {
                  if (!other || other.dead || other.spawnTimer > 0) continue;
                  if (Math.hypot(other.x - e.x, other.z - e.z) <= 2.8) {
                    this.damageEnemy(other, coronaDmg, true, false, false, false, false, 'ẤN QUANG!', 'elemental');
                  }
                }
              }
            }
            if (
              (this.activeSkills.meteor_shower ?? 0) > 0 &&
              Math.random() < 0.16 * (this.activeSkills.meteor_shower ?? 0)
            ) {
              this.spawnMeteor(e.x, e.z, false);
            }
          }

          if (p.ricochetLeft > 0) {
            const nextTarget = this.findNearestEnemy(e.x, e.z, p.hitEnemyIds, 8.5);
            if (nextTarget) {
              p.ricochetLeft--;
              const speed = Math.hypot(p.vx, p.vz);
              const rx = nextTarget.x - p.x;
              const rz = nextTarget.z - p.z;
              const rd = Math.hypot(rx, rz);
              p.vx = (rx / rd) * speed;
              p.vz = (rz / rd) * speed;
              p.mesh.rotation.y = Math.atan2(p.vx, p.vz);
              break;
            }
          }

          if (p.pierceLeft > 0) {
            p.pierceLeft--;
            p.damage *= activeSynergies.includes('piercing_volley') ? 1.0 : 0.85;
          } else {
            p.active = false;
            p.mesh.visible = false;
            break;
          }
        }
      }
    }

    for (const p of this.enemyOrbPool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const coopProjSpeedMult =
        this.isCoopRaidMode && this.coopRoleSynergy
          ? Math.max(0.55, 1 - this.coopRoleSynergy.enemyProjectileSlowPct)
          : 1;
      p.x += p.vx * dt * coopProjSpeedMult;
      p.z += p.vz * dt * coopProjSpeedMult;
      p.mesh.position.set(p.x, p.y, p.z);

      if (Math.abs(p.x) >= ARENA_HALF_W || Math.abs(p.z) >= ARENA_HALF_D) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      let blocked = false;
      for (const obs of this.obstacles) {
        if (obs.intact === false) continue;
        if (Math.hypot(p.x - obs.x, p.z - obs.z) < obs.radius + p.radius) {
          this.spawnParticles(p.x, p.y, p.z, obs.destructible ? 0x67e8f9 : 0xf43f5e, 5);
          p.active = false;
          p.mesh.visible = false;
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      if (Math.hypot(p.x - this.px, p.z - this.pz) < 0.5 + p.radius) {
        p.active = false;
        p.mesh.visible = false;
        const orbCause: DefeatCauseInfo =
          p.enemySourceKind === 'boss_lane'
            ? {
                code: 'boss_lane',
                label: 'Làn đạn nguy hiểm của Boss',
                tip: 'Bước ngang vuông góc với vệt cảnh báo đỏ-vàng thay vì lùi thẳng theo hướng tia đạn.',
              }
            : p.enemySourceKind === 'boss_projectile'
            ? {
                code: 'boss_projectile',
                label: 'Loạt đạn quạt / vòng xoáy của Boss',
                tip: 'Giữ khoảng cách trung bình để khe hở giữa các viên đạn mở rộng rồi luồn qua nhẹ nhàng.',
              }
            : {
                code: 'ranged_barrage',
                label: 'Mưa đạn từ quái tầm xa',
                tip: 'Tận dụng cột đá làm lá chắn và ưu tiên kỹ năng Đạn Nảy / Tên Chéo để dọn quái tầm xa sớm.',
              };
        this.damagePlayer(p.damage, orbCause, p.x - p.vx * 0.15, p.z - p.vz * 0.15);
      }
    }
  }

  private damageEnemy(
    e: EnemyEntity,
    amount: number,
    isCrit: boolean,
    blaze: boolean,
    frost: boolean,
    storm: boolean,
    poison = false,
    label?: string,
    dmgSource: 'basic' | 'ultimate' | 'pet' | 'elemental' = 'basic',
    coopAllyIndex?: number,
    options?: {
      attackerX?: number;
      attackerZ?: number;
      bypassShield?: boolean;
      fromChain?: boolean;
    }
  ): void {
    if (!e || e.dead) return;
    if (
      !canDamageEnemyDuringEntrance({
        enemySpawnTimer: e.spawnTimer,
        bossEntranceRemainingSec: this.bossEntranceTimer,
        isTrainingDummy: e.isTrainingDummy,
      })
    ) {
      return;
    }
    // Wave 8: Lethal AI Rival Dash I-Frames, PvP Resilience & Opening Aegis Shield
    if (e.isArenaRival && this.aiRivalBrainState) {
      if (this.aiRivalBrainState.dashIFrameTimer > 0) {
        this.spawnParticles(e.x, 1.05, e.z, 0x38bdf8, 8);
        this.emitFloatingNumber(e.x, 2.2, e.z, 0, false, false, 'ice', 'AI NÉ!');
        return;
      }
    }

    const activeSynergies = evaluateActiveSynergies(this.activeSkills);
    let mult = 1.0;
    if (this.markedEnemyIds.has(e.id)) mult += 0.2;
    if (e.isBoss && !e.isArenaRival && (this.baseStats.bossDamageBonus ?? 0) > 0) {
      mult += this.baseStats.bossDamageBonus;
    }
    if (this.isCoopRaidMode && e.isBoss) {
      mult *= getCoopResonanceDamageMult(this.coopSynergyClock);
    }
    if ((e.isBoss || e.isElite) && !e.isArenaRival && activeSynergies.includes('boss_barrage')) {
      mult += 0.14;
    }
    if (e.chillTimer > 0 && ((this.activeSkills.super_freeze ?? 0) > 0 || this.hasRune('rune_frost'))) {
      mult += 0.25;
    }

    // Constellation Elemental Mastery & Elemental Trial Tower Affinity (+50% matching element)
    if (blaze) mult *= 1 + (this.baseStats.constellationFireBonus ?? 0);
    if (frost) mult *= 1 + (this.baseStats.constellationIceBonus ?? 0);
    if (storm) mult *= 1 + (this.baseStats.constellationStormBonus ?? 0);

    if (this.isElementalTowerMode) {
      const fireMatch =
        blaze || this.baseStats.equippedPetId === 'solar_phoenix';
      const iceMatch =
        frost || this.baseStats.equippedPetId === 'frost_owl';
      const stormMatch =
        storm || this.baseStats.equippedPetId === 'storm_dragonet';
      const isMatch =
        (this.elementalTowerId === 'fire' && fireMatch) ||
        (this.elementalTowerId === 'ice' && iceMatch) ||
        (this.elementalTowerId === 'storm' && stormMatch);
      mult *= isMatch ? 1.5 : 0.94;
    }

    // Wave 12: Dynamic Combo Tier Damage Bonus + Boss Stun (+45% DMG) + Phase 2 Punish Window (+18% Counter-Strike)
    const comboMeta = getComboTierMeta(this.comboCount);
    if (comboMeta.dmgBonusPct > 0) {
      mult *= 1 + comboMeta.dmgBonusPct;
    }
    let resolvedLabel = label;
    if (e.tacticalRole === 'shield_bearer' && !(e.stunTimer && e.stunTimer > 0) && !e.isBoss) {
      const bypass =
        Boolean(options?.bypassShield) ||
        dmgSource === 'ultimate' ||
        dmgSource === 'elemental' ||
        Boolean(label && (label.includes('PHẢN') || label.includes('TRẢM') || label.includes('LIÊN HOÀN')));
      const ax = options?.attackerX ?? this.px;
      const az = options?.attackerZ ?? this.pz;
      if (isHitBlockedByFrontShield(e.model.root.rotation.y, ax, az, e.x, e.z, bypass)) {
        mult *= 0.25;
        if (!resolvedLabel) resolvedLabel = 'CHẮN KHIÊN!';
      }
    }
    if (e.isBoss && !e.isArenaRival && !e.isTrainingDummy) {
      const hasTotems = this.enemies.some((t) => t.isBossTotem && t.totemOwnerId === e.id && t.hp > 0);
      if (hasTotems) {
        mult *= 0.7;
      }
      if (e.bossAiState && e.bossAiState.guardDamageReduction > 0) {
        mult *= 1 - e.bossAiState.guardDamageReduction;
        if (!resolvedLabel) resolvedLabel = 'VỎ GIÁP!';
      }
    }
    if (e.isBoss && !e.isArenaRival && e.stunTimer && e.stunTimer > 0) {
      mult *= 1.45;
    } else if (e.isBoss && !e.isArenaRival && e.punishWindowTimer && e.punishWindowTimer > 0) {
      const basePunish =
        e.bossPhase === 3 ? PUNISH_WINDOW_PHASE3_BONUS : PUNISH_WINDOW_DAMAGE_BONUS;
      const punishBonus =
        basePunish * (this.nightmareTier > 0 ? this.nightmareConfig.punishBonusMult : 1);
      mult *= 1 + punishBonus;
      if (coopAllyIndex === undefined) {
        this.punishHitsCount += 1;
      }
      soundEngine.playPunishHit();
      if (!resolvedLabel && isCrit) {
        resolvedLabel = e.bossPhase === 3 ? 'PHẢN ĐÒN TỐI THƯỢNG!' : 'PHẢN ĐÒN!';
      }
    }

    if (this.isCoopRaidMode && this.coopRoleSynergy && e.isBoss) {
      mult *= 1 + this.coopRoleSynergy.bossDamageBonus;
    }

    // Wave 8: Arena 1v1 PvP Resilience + Sudden Death Escalation
    if (e.isArenaRival && this.aiRivalMatchConfig) {
      const sd = computeArenaSuddenDeath(this.arenaTimeLeft);
      mult *= (1 - this.aiRivalMatchConfig.rivalPvpResilience) * sd.damageMult;
    }

    // PvE Boss Innate Astral Armor (16% Ch.1 -> 26% Ch.12)
    if (e.isBoss && !e.isArenaRival && !e.isTrainingDummy) {
      mult *= 1 - computeBossInnateArmorReduction(this.currentChapter.id, true);
    }

    // FINAL MULTIPLICATIVE GATE: Power Pressure applies LAST so additive buffs can NEVER bypass LC suppression!
    if (!e.isArenaRival && !this.isTrainingMode && this.activePowerPressure.enemyDamageTakenMult !== 1.0) {
      mult *= this.activePowerPressure.enemyDamageTakenMult;
    }

    const finalDmg = Math.max(1, Math.round(amount * mult));
    if (e.isTrainingDummy) {
      recordTrainingHit(this.trainingDpsState, this.trainingClockSec, finalDmg, isCrit);
      e.hp = e.maxHp;
      e.hitFlashTimer = 0.1;
    } else if (e.isArenaRival && this.aiRivalBrainState && this.aiRivalBrainState.shieldHp > 0) {
      const absorbed = Math.min(this.aiRivalBrainState.shieldHp, finalDmg);
      this.aiRivalBrainState.shieldHp -= absorbed;
      const overflow = finalDmg - absorbed;
      if (overflow > 0) e.hp -= overflow;
      if (this.aiRivalBrainState.shieldHp <= 0) {
        soundEngine.playEliteAffixTrigger('aegis');
        this.spawnShockwave(e.x, e.z, 0x38bdf8, 2.8, 0.3);
        this.emitFloatingNumber(e.x, 2.25, e.z, 0, true, false, 'ice', 'VỠ HỘ THUẪN AI!');
      }
      e.hitFlashTimer = 0.1;
    } else {
      const hasAegisAffix = e.eliteAffix === 'aegis' || Boolean(e.eliteAffixes?.includes('aegis'));
      if (hasAegisAffix && e.eliteShieldHp && e.eliteShieldHp > 0) {
        const absorbed = Math.min(e.eliteShieldHp, finalDmg);
        e.eliteShieldHp -= absorbed;
        const overflow = finalDmg - absorbed;
        if (overflow > 0) e.hp -= overflow;
        if (e.eliteShieldHp <= 0) {
          soundEngine.playEliteAffixTrigger('aegis');
          this.spawnShockwave(e.x, e.z, 0x38bdf8, 2.4, 0.28);
          this.emitFloatingNumber(e.x, 2.1, e.z, 0, true, false, 'ice', 'VỠ HỘ THUẪN!');
        }
      } else {
        e.hp -= finalDmg;
      }
      e.hitFlashTimer = 0.1;
    }

    // AAA Directional Hit-Flinch Impulse away from incoming arrow / attacker
    if (!e.isVaultPillar) {
      const imp = computeDirectionalHitImpulse(
        e.x,
        e.z,
        options?.attackerX ?? this.px,
        options?.attackerZ ?? this.pz,
        isCrit,
        e.isBoss
      );
      e.hitRecoilX = THREE.MathUtils.clamp((e.hitRecoilX ?? 0) + imp.impulseX, -1.25, 1.25);
      e.hitRecoilZ = THREE.MathUtils.clamp((e.hitRecoilZ ?? 0) + imp.impulseZ, -1.25, 1.25);
    }

    // Wave 5 Pillar 1/2: Elemental Arrow Impact Bursts (fire / ice / lightning / poison)
    if ((blaze || frost || storm || poison) && this.elementalImpactVfxCd <= 0) {
      const elemKind: CombatElementKind = storm
        ? 'lightning'
        : frost
        ? 'ice'
        : blaze
        ? 'fire'
        : 'poison';
      const elemSpec = ELEMENTAL_IMPACT_VFX[elemKind];
      const scaledCount = Math.max(
        4,
        Math.round(elemSpec.particleCount * Math.max(0.45, this.particleDensityScale))
      );
      this.spawnParticles(e.x, 1.05, e.z, elemSpec.primaryHex, scaledCount);
      this.spawnShockwave(e.x, e.z, elemSpec.secondaryHex, elemSpec.ringRadius, 0.24);
      this.elementalImpactVfxCd = 0.09;
    }

    if (coopAllyIndex === undefined && !e.isTrainingDummy) {
      if (blaze) this.runElemCounts.fire += 1;
      if (frost) this.runElemCounts.ice += 1;
      if (storm) this.runElemCounts.storm += 1;
      if (poison) this.runElemCounts.poison += 1;
      const overdriveGain = isCrit ? 6.5 : 3.8;
      this.weaponOverdrive = chargeWeaponOverdrive(this.weaponOverdrive, overdriveGain, {
        styleGrade: this.styleMomentum.grade,
        mutatorMult: this.equalizedRiftOverdriveMult,
      });
    }

    // Wave 7: Deterministic Boss Stagger / Guard-Break Mechanic (4.0s Guard Break & +45% Vulnerability)
    if (e.isBoss && e.hp > 0 && !e.isTrainingDummy) {
      if (this.bossStaggerOwnerId !== e.id || !this.bossStaggerState) {
        this.bossStaggerOwnerId = e.id;
        this.bossStaggerState = createBossStaggerState(e.maxHp);
        e.maxBreakShield = this.bossStaggerState.max;
        e.breakShield = this.bossStaggerState.max;
      }
      const staggerRes = applyBossStaggerDamage(
        this.bossStaggerState,
        finalDmg * (1 + (this.baseStats.mythicWeaponTier ?? 0) * 0.14),
        {
          isCrit,
          isCounterShot: Boolean(resolvedLabel && resolvedLabel.includes('PHẢN')),
          isUltimate: dmgSource === 'ultimate',
        }
      );
      const isBossBroken = this.bossStaggerState.brokenRemainingSec > 0;
      e.maxBreakShield = this.bossStaggerState.max;
      e.breakShield = isBossBroken
        ? 0
        : Math.max(0, Math.round(this.bossStaggerState.max - this.bossStaggerState.current));
      // Wave 10: Breakable 3D Boss Parts (Armor Horn / Arcane Core / Astral Wing)
      if (!e.isArenaRival && e.bossParts && e.bossParts.length > 0 && coopAllyIndex === undefined) {
        const partHit = applyBossPartDamage(e.bossParts, finalDmg, {
          isCrit,
          isBreakerSkill:
            dmgSource === 'ultimate' || Boolean(resolvedLabel && resolvedLabel.includes('PHẢN')),
        });
        e.bossParts = partHit.parts;
        if (partHit.brokenPartNow) {
          const bp = partHit.brokenPartNow;
          const partMeshes = e.bossPartMeshes?.[bp.id];
          if (partMeshes) {
            partMeshes.forEach((m) => {
              m.visible = false;
            });
          }
          if (bp.atkReductionPct > 0) {
            e.damage = Math.max(4, Math.round(e.damage * (1 - bp.atkReductionPct)));
          }
          if (bp.staggerSpikePct > 0 && e.maxBreakShield && e.breakShield > 0) {
            const spike = Math.round(e.maxBreakShield * bp.staggerSpikePct);
            this.bossStaggerState.current = Math.min(
              this.bossStaggerState.max,
              this.bossStaggerState.current + spike
            );
            e.breakShield = Math.max(0, e.breakShield - spike);
          }
          this.runGold += bp.bonusGold;
          this.runBossPartStarDust += bp.bonusStarDust;
          this.bossPartBrokenBanner = `PHÁ VỠ ${bp.label.toUpperCase()} · ${bp.debuffLabel}`;
          this.bossPartBrokenBannerTimer = 2.8;
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
          const partPan = computeSpatialPan(e.x, ARENA_HALF_W);
          soundEngine.playBossBreakShatter(partPan);
          soundEngine.playImpactScorchThump(partPan);
          const partColorHex =
            bp.id === 'armor_horn' ? 0xf59e0b : bp.id === 'arcane_core' ? 0xa855f7 : 0x38bdf8;
          this.spawnArmorShards(e.x, 1.45, e.z, partColorHex, 14);
          this.spawnShockwave(e.x, e.z, partColorHex, 5.4, 0.44);
          this.spawnParticles(e.x, 1.35, e.z, partColorHex, 26);
          this.emitFloatingNumber(
            e.x,
            2.45,
            e.z,
            0,
            true,
            false,
            'fire',
            `VỠ ${bp.label.toUpperCase()}!`,
            true
          );
          recordStyleAction(this.styleMomentum, 'guard_break');
        }
      }
      if (staggerRes.triggeredBreak) {
        const isPveBoss = e.isBoss && !e.isArenaRival;
        if (isPveBoss && (e.bossStunImmuneTimer ?? 0) > 0) {
          // Boss CC Resistance: cannot be stun-locked during 10s post-break immunity window
          this.bossStaggerState.brokenRemainingSec = 0;
          this.bossStaggerState.current = 0;
          e.breakShield = e.maxBreakShield;
          e.punishWindowMax = 1.2;
          e.punishWindowTimer = 1.2;
          this.emitFloatingNumber(e.x, 2.5, e.z, 0, true, false, 'ice', 'KHÁNG CHOÁNG! +PHẢN ĐÒN');
        } else {
          const stunDur = isPveBoss ? BOSS_GUARD_BREAK_STUN_SEC : GUARD_BREAK_DURATION_SEC;
          e.stunTimer = stunDur;
          if (isPveBoss) {
            e.bossStunImmuneTimer = BOSS_STUN_IMMUNITY_SEC;
            this.bossStaggerState.brokenRemainingSec = stunDur;
          }
          e.punishWindowTimer = 0;
          if (e.punishRingMesh) e.punishRingMesh.visible = false;
          e.telegraphType = 'none';
          e.telegraphGroup.visible = false;
          e.laserLine.visible = false;
          if (e.bossAiState) {
            clearBossAiTransientCombat(e.bossAiState);
          }
          this.dangerLanePool.forEach((l) => {
            l.active = false;
            l.mesh.visible = false;
          });
          this.bossBrokenBannerTimer = 2.2;
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.58);
          const breakPan = computeSpatialPan(e.x, ARENA_HALF_W);
          soundEngine.playBossGuardBreak(breakPan);
          soundEngine.playBossBreakShatter(breakPan);
          soundEngine.playBossStaggerRoar(breakPan);
          soundEngine.playImpactScorchThump(breakPan);
          triggerHapticPulse('boss_break', this.hapticsEnabled);
          this.spawnArmorShards(e.x, 1.35, e.z, 0xfbbf24, 16);
          this.spawnImpactLight(e.x, 1.8, e.z, 'super_crit');
          this.spawnCritStar(e.x, 1.5, e.z, 0xfde047, 2.5);
          this.triggerPostFxImpulse('boss_break');
          this.spawnShockwave(e.x, e.z, 0xfde047, 7.2, 0.56);
          this.spawnImpactDecal(e.x, e.z, 0xfde047, 3.3, 2.0);
          this.spawnBattleScar(e.x, e.z, 1.25);
          this.spawnParticles(e.x, 1.3, e.z, 0xfde047, 38);
          this.emitFloatingNumber(e.x, 2.55, e.z, 0, true, false, 'fire', 'PHÁ GIÁP! +45% ST', true);
          this.runBossBreaksCount += 1;
          this.advanceRoomBounty({ type: 'boss_break' });
          const gbStyle = recordStyleAction(this.styleMomentum, 'guard_break');
          if (gbStyle.promoted) {
            soundEngine.playComboRankUp(gbStyle.pitchBoost);
          }
          // Deterministic 4-tick (66ms) Boss Stagger Break hit-stop
          triggerDeterministicHitStop(this.kinestheticsClock, 4);
        }
      }
    }
    if (coopAllyIndex === undefined && !e.isTrainingDummy) {
      const styleEventKind =
        dmgSource === 'ultimate'
          ? 'ultimate'
          : resolvedLabel && resolvedLabel.includes('PHẢN')
          ? 'counter_shot'
          : isCrit
          ? 'crit'
          : 'hit';
      const styleRes = recordStyleAction(this.styleMomentum, styleEventKind);
      if (styleRes.promoted) {
        soundEngine.playComboRankUp(styleRes.pitchBoost);
        this.spawnShockwave(this.px, this.pz, 0xfde047, 2.4, 0.26);
      }
    }
    if (isCrit && coopAllyIndex === undefined && (e.isBoss || finalDmg > this.baseStats.attack * 2.2)) {
      // Crisp 2-tick (33ms) deterministic Crit hit-stop punch
      triggerDeterministicHitStop(this.kinestheticsClock, 2);
    }

    if (this.isGuildBossMode && e.isBoss) {
      this.guildBossTotalDamage += finalDmg;
    }
    if (this.isWorldBossMode && e.isBoss) {
      this.worldBossTotalDamage += finalDmg;
    }
    if (this.isWeeklyRankedBossMode && e.isBoss) {
      this.weeklyBossTotalDamage = Math.min(
        this.weeklyBossMaxHp,
        this.weeklyBossTotalDamage + finalDmg
      );
    }
    if (this.isDragonLairMode && e.isBoss) {
      this.dragonDamageDealt += finalDmg;
    }
    if (this.isSkyCitadelMode) {
      this.skyCitadelScore += Math.round(finalDmg * (e.isBoss ? 0.42 : 0.2));
    }

    if (coopAllyIndex !== undefined && this.coopAllies[coopAllyIndex]) {
      this.coopAllies[coopAllyIndex].damageDealt += finalDmg;
    } else if (dmgSource === 'ultimate') this.dmgUltimate += finalDmg;
    else if (dmgSource === 'pet') this.dmgPet += finalDmg;
    else if (dmgSource === 'elemental') this.dmgElemental += finalDmg;
    else this.dmgBasic += finalDmg;

    if (coopAllyIndex === undefined) {
      recordRollingDpsSample(this.rollingDps, this.runElapsedSeconds, finalDmg, isCrit);
    }

    if (isCrit && finalDmg > this.peakCritDmg && coopAllyIndex === undefined) {
      this.peakCritDmg = finalDmg;
    }

    this.ultCharge = Math.min(100, this.ultCharge + (e.isBoss ? 5.5 : 4.2));
    const prevCombo = this.comboCount;
    this.comboCount += 1;
    this.comboTimer = this.comboWindow;
    const rankPromo = evaluateComboRankPromotion(prevCombo, this.comboCount);
    if (rankPromo.promoted && coopAllyIndex === undefined) {
      soundEngine.playComboRankUp(rankPromo.pitchBoost);
      this.spawnShockwave(this.px, this.pz, 0xfde047, 2.5, 0.28);
      this.heroLightPulse = Math.max(this.heroLightPulse, 0.42);
    }
    if (this.comboCount > this.maxRunCombo) {
      this.maxRunCombo = this.comboCount;
      if (this.comboCount === 10 || this.comboCount === 20 || this.comboCount === 35 || this.comboCount === 50 || this.comboCount % 25 === 0) {
        this.callbacks.onProgressEvent?.({ maxCombo: this.maxRunCombo });
      }
    }

    // Wave 9: Boss Phase Counter Window amplification when striking boss during active 2.5s phase shift window
    if (e.isBoss && this.bossPhaseCounterTimer > 0 && coopAllyIndex === undefined && (isCrit || dmgSource === 'ultimate')) {
      const counterPres = computeBossPhaseCounterPresentation(
        this.bossPhaseCounterTimer,
        this.bossPhaseCounterLevel
      );
      if (counterPres.active) {
        this.bossPhaseCounterTimer = 0;
        this.bossPhaseCounterLevel = null;
        const bonusCounterDmg = Math.round(finalDmg * (counterPres.counterMultiplier - 1));
        if (!e.isTrainingDummy) {
          e.hp -= bonusCounterDmg;
        }
        if (e.maxBreakShield && e.breakShield && e.breakShield > 0) {
          e.breakShield = Math.max(0, e.breakShield - e.maxBreakShield * counterPres.guardBreakBonusRatio);
        }
        this.spawnShockwave(e.x, e.z, 0xfde047, 5.2, 0.38);
        this.emitFloatingNumber(
          e.x,
          2.65,
          e.z,
          bonusCounterDmg,
          true,
          false,
          'storm',
          'PHẢN ĐÒN CHUYỂN PHA!',
          true
        );
      }
    }

    // Boss Phase II Transition (<= 65% HP)
    if (e.isBoss && !e.phaseTransitioned && e.hp > 0 && e.hp <= e.maxHp * BOSS_PHASE_2_HP_RATIO) {
      e.phaseTransitioned = true;
      e.bossPhase = 2;
      e.punishWindowTimer = 0;
      if (e.punishRingMesh) e.punishRingMesh.visible = false;
      e.telegraphType = 'none';
      e.laserLine.visible = false;
      e.telegraphGroup.visible = false;
      if (e.bossAiState) {
        clearBossAiTransientCombat(e.bossAiState);
      }
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
      e.attackTimer = 0.5;
      this.bossPhaseTwoBannerTimer = 2.6;
      this.bossPhaseShiftTimer = 0.65;
      this.bossPhaseShiftLevel = 2;
      this.bossPhaseCounterTimer = BOSS_PHASE_COUNTER_WINDOW_SEC;
      this.bossPhaseCounterLevel = 2;
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.52);
        this.triggerPostFxImpulse('boss_phase');
      }
      soundEngine.playBossPhaseTwo();
      soundEngine.playBossPhaseShift(2);
      soundEngine.playBossPhaseStinger(2);
      this.spawnImpactLight(e.x, 1.8, e.z, 'boss_slam');
      if (e.model.bossCoreMat) {
        e.model.bossCoreMat.emissive.setHex(0xf43f5e);
        e.model.bossCoreMat.emissiveIntensity = 2.85;
      }
      this.spawnUltColumn(e.x, e.z, 0xf43f5e, 0.72);
      this.spawnShockwave(e.x, e.z, BOSS_PHASE_ATMOSPHERE[2].shockHex, 6.8, 0.54);
      if (this.rimLight) {
        this.rimLight.color.setHex(BOSS_PHASE_ATMOSPHERE[2].rimHex);
        this.rimLight.intensity = BOSS_PHASE_ATMOSPHERE[2].rimIntensity;
      }
      this.spawnBattleScar(e.x, e.z, 1.38);
      this.spawnParticles(e.x, 1.2, e.z, 0xf43f5e, 34);
      this.emitFloatingNumber(e.x, 2.4, e.z, 0, true, false, 'fire', 'PHA II · CHUYỂN CẢNH!', true);
      this.triggerBossWarning(
        e.bossTitle || this.currentChapter.bossName,
        'PHA II CUỒNG NỘ · CỬA SỔ PHẢN CÔNG 2.5S!'
      );
      this.spawnBossPhase2Totems(e);
    }

    // Phase 4: Boss Phase III Transition (<= 30% HP) for Ch.10–12 final bosses & Tower Floor 20+
    const canEnterPhaseThree =
      (!this.isTowerMode && this.currentChapter.id >= 10) ||
      (this.isTowerMode && this.towerFloor >= 20);
    if (
      e.isBoss &&
      e.phaseTransitioned &&
      !e.phaseThreeTransitioned &&
      canEnterPhaseThree &&
      e.hp > 0 &&
      e.hp <= e.maxHp * BOSS_PHASE_3_HP_RATIO
    ) {
      e.phaseThreeTransitioned = true;
      e.bossPhase = 3;
      e.punishWindowTimer = 0;
      if (e.punishRingMesh) e.punishRingMesh.visible = false;
      e.telegraphType = 'none';
      e.laserLine.visible = false;
      e.telegraphGroup.visible = false;
      if (e.bossAiState) {
        clearBossAiTransientCombat(e.bossAiState);
      }
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
      e.attackTimer = 0.45;
      this.bossPhaseThreeBannerTimer = 2.8;
      this.bossPhaseShiftTimer = 0.65;
      this.bossPhaseShiftLevel = 3;
      this.bossPhaseCounterTimer = BOSS_PHASE_COUNTER_WINDOW_SEC;
      this.bossPhaseCounterLevel = 3;
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.62);
        this.triggerPostFxImpulse('boss_phase');
      }
      soundEngine.playBossPhaseThree();
      soundEngine.playBossPhaseShift(3);
      soundEngine.playBossPhaseStinger(3);
      if (e.model.bossCoreMat) {
        e.model.bossCoreMat.emissive.setHex(0xfde047);
        e.model.bossCoreMat.emissiveIntensity = 3.4;
      }
      this.spawnUltColumn(e.x, e.z, 0xfbbf24, 0.85);
      this.spawnShockwave(e.x, e.z, 0xfbbf24, 7.6, 0.56);
      this.spawnShockwave(e.x, e.z, BOSS_PHASE_ATMOSPHERE[3].shockHex, 5.4, 0.42);
      if (this.rimLight) {
        this.rimLight.color.setHex(BOSS_PHASE_ATMOSPHERE[3].rimHex);
        this.rimLight.intensity = BOSS_PHASE_ATMOSPHERE[3].rimIntensity;
      }
      this.spawnBattleScar(e.x, e.z, 1.55);
      this.spawnParticles(e.x, 1.35, e.z, 0xfbbf24, 42);
      this.emitFloatingNumber(e.x, 2.55, e.z, 0, true, false, 'fire', 'PHA III · TỐI THƯỢNG!', true);
      this.triggerBossWarning(
        e.bossTitle || this.currentChapter.bossName,
        'PHA III TỐI THƯỢNG · CỬA SỔ PHẢN CÔNG 2.5S!'
      );
    }

    // Wave 12 Mythic Golden Stat Lifesteal
    const totalLifesteal = this.baseStats.lifeStealPct ?? 0;
    if (totalLifesteal > 0 && this.hp < this.maxHp && coopAllyIndex === undefined) {
      const leach = Math.max(1, Math.round(finalDmg * totalLifesteal));
      this.hp = Math.min(this.maxHp, this.hp + leach);
    }

    // AAA Wave 4: 3D Elemental Reactions (Melt, Superconduct, Overload, Venom Detonation)
    const incomingElement: ElementalHitType | null = blaze
      ? 'fire'
      : frost
      ? 'ice'
      : storm
      ? 'storm'
      : poison
      ? 'poison'
      : null;
    const reaction = evaluateElementalReaction(
      {
        burning: e.burnTimer > 0,
        chilled: e.chillTimer > 0,
        poisoned: e.poisonDps > 0,
      },
      incomingElement,
      finalDmg,
      e.reactionCd ?? 0
    );

    const flameRuneMult = this.hasRune('rune_flame') ? 1.6 : 1.0;
    const infernoBurnMult = activeSynergies.includes('inferno_meteor') ? 1.22 : 1.0;
    const venomSynergyMult = activeSynergies.includes('venom_eclipse') ? 1.3 : 1.0;
    if (blaze) {
      const superMult = (this.activeSkills.super_blaze ?? 0) > 0 ? 2.2 : 1.0;
      e.burnTimer = 2.8;
      e.burnDps = Math.max(
        e.burnDps,
        finalDmg * 0.26 * superMult * flameRuneMult * infernoBurnMult
      );
    }
    if (poison) {
      e.poisonDps = Math.max(e.poisonDps, finalDmg * 0.22 * flameRuneMult * venomSynergyMult);
    }
    if (frost) {
      e.chillTimer = 2.6;
    }

    const hitPan = computeSpatialPan(e.x, ARENA_HALF_W);
    if (reaction) {
      const reactionDmg = reaction.bonusDamage;
      e.reactionCd = reaction.cooldownSec;
      this.elementalReactionsCount += 1;
      this.advanceRoomBounty({ type: 'elemental_reaction' });
      if (!e.isTrainingDummy) {
        e.hp -= reactionDmg;
      }
      this.dmgElemental += reactionDmg;
      if (
        e.isBoss &&
        e.maxBreakShield &&
        e.breakShield &&
        e.breakShield > 0 &&
        reaction.breakShieldBonusRatio > 0
      ) {
        e.breakShield = Math.max(
          0,
          e.breakShield - e.maxBreakShield * reaction.breakShieldBonusRatio
        );
      }
      if (reaction.aoeRadius > 0) {
        const reactionKillTargets: EnemyEntity[] = [];
        for (const other of [...this.enemies]) {
          if (!other || other.dead || other.id === e.id || other.spawnTimer > 0) continue;
          const rdx = other.x - e.x;
          const rdz = other.z - e.z;
          const rdist = Math.hypot(rdx, rdz);
          if (rdist <= reaction.aoeRadius) {
            const splashDmg = Math.max(1, Math.round(reaction.bonusDamage * 0.65));
            if (!other.isTrainingDummy) {
              other.hp -= splashDmg;
            }
            this.dmgElemental += splashDmg;
            other.hitFlashTimer = 0.09;
            if (
              reaction.knockbackForce > 0 &&
              !other.isBoss &&
              !other.isTrainingDummy &&
              !other.isVaultPillar &&
              rdist > 0.01
            ) {
              other.knockVx = (other.knockVx ?? 0) + (rdx / rdist) * reaction.knockbackForce * 5.2;
              other.knockVz = (other.knockVz ?? 0) + (rdz / rdist) * reaction.knockbackForce * 5.2;
            }
            if (other.hp <= 0) {
              reactionKillTargets.push(other);
            }
          }
        }
        for (const victim of reactionKillTargets) {
          const rIdx = this.enemies.indexOf(victim);
          if (rIdx !== -1 && !victim.dead) {
            this.killEnemy(rIdx, true);
          }
        }
      }
      soundEngine.playElementalReaction(reaction.id, hitPan);
      triggerHapticPulse('reaction', this.hapticsEnabled);
      this.spawnShockwave(e.x, e.z, reaction.primaryHex, Math.max(2.2, reaction.aoeRadius), 0.34);
      this.spawnCritStar(e.x, 1.32, e.z, reaction.secondaryHex, 1.75);
      this.spawnImpactLight(
        e.x,
        1.4,
        e.z,
        reaction.id === 'superconduct' ? 'storm' : reaction.id === 'melt' ? 'crit' : 'super_crit'
      );
      this.spawnParticles(e.x, 1.1, e.z, reaction.primaryHex, 14);
      this.spawnParticles(e.x, 1.15, e.z, reaction.secondaryHex, 10);
      this.emitFloatingNumber(
        e.x,
        2.12,
        e.z,
        reaction.bonusDamage,
        true,
        false,
        reaction.id === 'superconduct'
          ? 'storm'
          : reaction.id === 'venom_detonation'
          ? 'poison'
          : 'fire',
        reaction.label,
        true
      );
    }

    // Wave 10: Tam Nguyên Hợp Kích (3-Stack Elemental Resonance Convergence Burst)
    let resonanceElem: 'fire' | 'ice' | 'storm' | 'poison' | null = reaction
      ? mapReactionToResonanceElement(reaction.id)
      : null;
    if (!resonanceElem && incomingElement) {
      this.elementalResonanceChargeAccum += 1;
      if (this.elementalResonanceChargeAccum >= 4) {
        this.elementalResonanceChargeAccum = 0;
        resonanceElem = incomingElement;
      }
    }
    if (resonanceElem) {
      // Feed post-pressure finalDmg so Elemental Resonance never bypasses LC suppression!
      const resAdvance = advanceElementalResonance(
        this.elementalResonance,
        resonanceElem,
        finalDmg
      );
      this.elementalResonance = resAdvance.nextState;
      if (resAdvance.burstTriggered && !e.isTrainingDummy) {
        const resKillTargets: EnemyEntity[] = [];
        for (const other of [...this.enemies]) {
          if (!other || other.dead || other.spawnTimer > 0) continue;
          const rdist = Math.hypot(other.x - e.x, other.z - e.z);
          if (rdist <= resAdvance.aoeRadius) {
            const burstDmg = Math.max(1, Math.round(resAdvance.burstDamage));
            if (!other.isTrainingDummy) {
              other.hp -= burstDmg;
            }
            this.dmgElemental += burstDmg;
            other.hitFlashTimer = 0.14;
            if (other.isBoss && other.maxBreakShield && other.breakShield && other.breakShield > 0) {
              const br = Math.round(other.maxBreakShield * resAdvance.breakShieldRatio);
              other.breakShield = Math.max(0, other.breakShield - br);
              if (this.bossStaggerOwnerId === other.id && this.bossStaggerState) {
                this.bossStaggerState.current = Math.min(
                  this.bossStaggerState.max,
                  this.bossStaggerState.current + br
                );
              }
            }
            if (other.hp <= 0) {
              resKillTargets.push(other);
            }
          }
        }
        for (const victim of resKillTargets) {
          const rIdx = this.enemies.indexOf(victim);
          if (rIdx !== -1 && !victim.dead) {
            this.killEnemy(rIdx, true);
          }
        }
        this.spawnShockwave(e.x, e.z, 0xfde047, resAdvance.aoeRadius, 0.48);
        this.spawnShockwave(e.x, e.z, 0x38bdf8, resAdvance.aoeRadius * 0.78, 0.36);
        this.spawnShockwave(e.x, e.z, 0xf97316, resAdvance.aoeRadius * 0.56, 0.28);
        this.spawnImpactLight(e.x, 1.8, e.z, 'super_crit');
        this.spawnParticles(e.x, 1.25, e.z, 0xfde047, 28);
        this.emitFloatingNumber(
          e.x,
          2.6,
          e.z,
          resAdvance.burstDamage,
          true,
          false,
          'storm',
          resAdvance.calloutText ?? 'TAM NGUYÊN HỢP KÍCH!',
          true
        );
        soundEngine.playCoopResonanceChord();
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.48);
        recordStyleAction(this.styleMomentum, 'ultimate');
      }
    }
    soundEngine.playHit(isCrit, this.comboCount, hitPan);
    this.spawnParticles(
      e.x,
      1.05,
      e.z,
      isCrit ? 0xfbbf24 : blaze ? 0xf97316 : frost ? 0x67e8f9 : poison ? 0x4ade80 : 0x38bdf8,
      isCrit ? 12 : 7
    );

    const isSuperCrit =
      isCrit && (dmgSource === 'ultimate' || finalDmg >= this.baseStats.attack * 3.1);

    // AAA Directional Knockback & Elastic Hit-Squash Recoil
    const recoil = computeKnockbackImpulse({
      dirX: e.x - this.px,
      dirZ: e.z - this.pz,
      isCrit,
      isSuperCrit,
      isBoss: e.isBoss,
      isElite: e.isElite,
    });
    e.hitSquashY = recoil.squashY;
    e.hitStretchXZ = recoil.stretchXZ;
    if (!e.isBoss && !e.isTrainingDummy && !e.isVaultPillar) {
      e.knockVx = (e.knockVx ?? 0) * 0.3 + recoil.impulseX;
      e.knockVz = (e.knockVz ?? 0) * 0.3 + recoil.impulseZ;
    }

    if (isCrit && (blaze || frost || storm)) {
      const ringColor = blaze ? 0xf97316 : frost ? 0x67e8f9 : 0xa78bfa;
      this.spawnShockwave(e.x, e.z, ringColor, 1.85, 0.24);
      this.spawnCritStar(e.x, 1.15, e.z, ringColor, isSuperCrit ? 1.55 : 1.15);
      this.spawnImpactLight(e.x, 1.25, e.z, storm ? 'storm' : frost ? 'frost' : 'crit');
    } else if (isSuperCrit) {
      this.spawnShockwave(e.x, e.z, 0xfde047, 1.65, 0.2);
      this.spawnCritStar(e.x, 1.2, e.z, 0xfde047, 1.6);
      this.spawnImpactLight(e.x, 1.35, e.z, 'super_crit');
      this.triggerPostFxImpulse('super_crit');
    } else if (isCrit) {
      this.spawnCritStar(e.x, 1.12, e.z, 0xfbbf24, 1.05);
      this.spawnImpactLight(e.x, 1.2, e.z, 'crit');
    }

    if (isCrit) {
      if (this.hitstopCooldown <= 0) {
        this.hitstopTimer = Math.max(this.hitstopTimer, isSuperCrit ? 0.036 : 0.022);
        this.hitstopCooldown = isSuperCrit ? 0.14 : 0.22;
      }
      this.shakeIntensity = Math.max(this.shakeIntensity, isSuperCrit ? 0.24 : 0.14);
    }

    this.emitFloatingNumber(
      e.x,
      1.7,
      e.z,
      finalDmg,
      isCrit,
      false,
      blaze ? 'fire' : frost ? 'ice' : storm ? 'storm' : poison ? 'poison' : undefined,
      resolvedLabel,
      isSuperCrit
    );

    // Chain Lightning (Storm Skill + Storm Chain Synergy)
    const shouldChain = storm;
    if (shouldChain) {
      const hasStormChain = activeSynergies.includes('storm_chain');
      const maxChains =
        ((this.activeSkills.super_bolt ?? 0) > 0 ? 3 : 1) + (hasStormChain ? 1 : 0);
      const chainExclude = new Set<number>([e.id]);
      let currX = e.x;
      let currZ = e.z;
      for (let c = 0; c < maxChains; c++) {
        const nearby = this.findNearestEnemy(currX, currZ, chainExclude, 6.2);
        if (!nearby) break;
        chainExclude.add(nearby.id);
        const arcDmg = Math.max(
          2,
          Math.round(
            finalDmg *
              (this.hasRune('rune_frost') ? 0.6 : 0.45) *
              (hasStormChain ? 1.2 : 1.0)
          )
        );
        nearby.hp -= arcDmg;
        this.dmgElemental += arcDmg;
        nearby.hitFlashTimer = 0.08;
        this.spawnLightningArc(currX, 1.0, currZ, nearby.x, 1.0, nearby.z);
        this.emitFloatingNumber(nearby.x, 1.5, nearby.z, arcDmg, false, false, 'storm');
        currX = nearby.x;
        currZ = nearby.z;
        const idx = this.enemies.indexOf(nearby);
        if (nearby.hp <= 0 && idx !== -1) {
          this.killEnemy(idx, true);
        }
      }
    }

    const myIdx = this.enemies.indexOf(e);
    if (e.hp <= 0 && !e.dead && myIdx !== -1) {
      this.killEnemy(myIdx, options?.fromChain);
    }
  }

  private killEnemy(index: number, fromChain = false): void {
    const e = this.enemies[index];
    if (!e || e.dead) return;
    e.dead = true;
    this.enemies.splice(index, 1);

    this.killResolutionDepth += 1;
    try {
      this.kills++;
      this.ultCharge = Math.min(100, this.ultCharge + (e.isBoss ? 35 : 14));
      this.callbacks.onProgressEvent?.({
        killsDelta: 1,
        bossKilled: e.isBoss,
        maxCombo: this.maxRunCombo,
      });
      this.markedEnemyIds.delete(e.id);
      const killPan = computeSpatialPan(e.x, ARENA_HALF_W);
      soundEngine.playEnemyDefeated(e.isBoss || e.isElite, killPan);

      const burstColor = e.isBoss ? 0xfbbf24 : e.isElite ? 0xc084fc : 0x38bdf8;
      this.spawnParticles(e.x, 1.0, e.z, burstColor, e.isBoss ? 44 : e.isElite ? 28 : 20);
      this.spawnShockwave(e.x, e.z, burstColor, e.isBoss ? 5.6 : e.isElite ? 3.2 : 2.1, e.isBoss ? 0.5 : 0.32);

      if (e.isBoss) {
        soundEngine.playShockwave(killPan);
        soundEngine.playBossFinisherBoom(killPan);
        triggerHapticPulse('boss_break', this.hapticsEnabled);
        this.spawnImpactLight(e.x, 2.0, e.z, 'ultimate');
        this.spawnCritStar(e.x, 1.6, e.z, 0xfde047, 2.8);
        this.spawnShockwave(e.x, e.z, 0xfde047, 8.2, 0.62);
        this.spawnShockwave(e.x, e.z, 0x38bdf8, 6.0, 0.46);
        this.spawnParticles(e.x, 1.3, e.z, 0xe0f2fe, 24);
        this.triggerPostFxImpulse('boss_break');
        this.hitstopTimer = 0.095;
        this.shakeIntensity = 0.56;
        if (!this.isTrainingMode && !this.isArenaMode) {
          this.bossFinisherTimer = this.bossFinisherDuration;
          this.bossFinisherFocusX = e.x;
          this.bossFinisherFocusZ = e.z;
          this.bossFinisherName = e.bossTitle || this.currentChapter.bossName;
        }
        this.dangerLanePool.forEach((l) => {
          l.active = false;
          l.mesh.visible = false;
        });
        this.bossHazardPool?.forEach((h) => {
          h.active = false;
          h.group.visible = false;
        });
        this.bossMultiSlamPool?.forEach((m) => {
          m.active = false;
          m.group.visible = false;
        });
      } else if (e.isElite) {
        if (e.telegraphType === 'lane') {
          e.laneAngles.forEach((_, lIdx) => {
            const lane = this.dangerLanePool[(e.id + lIdx) % this.dangerLanePool.length];
            if (lane) {
              lane.active = false;
              lane.mesh.visible = false;
            }
          });
        }
        soundEngine.playShockwave(killPan);
        this.spawnImpactLight(e.x, 1.4, e.z, 'super_crit');
        this.spawnParticles(e.x, 1.15, e.z, 0xfde047, 14);
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.036);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
      } else {
        if (e.telegraphType === 'lane') {
          e.laneAngles.forEach((_, lIdx) => {
            const lane = this.dangerLanePool[(e.id + lIdx) % this.dangerLanePool.length];
            if (lane) {
              lane.active = false;
              lane.mesh.visible = false;
            }
          });
        }
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.016);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.11);
      }

      // Bloodthirst / Healing Sprite + Aegis Sanctuary Synergy heal on Elite/Boss kill
      const vamp = (this.activeSkills.bloodthirst ?? 0) + (this.hasRune('healing_sprite') ? 0.6 : 0);
      const hasAegisSanctuary = evaluateActiveSynergies(this.activeSkills).includes('aegis_sanctuary');
      if (vamp > 0) {
        const healAmt = Math.round(4 + this.maxHp * 0.025 * vamp);
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.emitFloatingNumber(this.px, 1.9, this.pz, healAmt, false, true);
      }
      if (hasAegisSanctuary && (e.isBoss || e.isElite)) {
        const synHeal = Math.max(8, Math.round(this.maxHp * 0.06));
        this.hp = Math.min(this.maxHp, this.hp + synHeal);
        this.emitFloatingNumber(this.px, 2.2, this.pz, synHeal, false, true, undefined, 'THÁNH GIÁP!');
      }

      // Phase 3–4 + Fun Overhaul: Elite Volatile / Detonator Role spawns ground blast on death
      const isDetonatorRole = e.tacticalRole === 'detonator' && !e.isBossTotem;
      if (e.eliteAffix === 'volatile' || e.eliteAffixes?.includes('volatile') || isDetonatorRole) {
        const blastRadius = isDetonatorRole ? 3.1 : 2.85;
        const blastDelay = isDetonatorRole ? 0.5 : 0.85;
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(blastRadius - 0.16, blastRadius, 28),
          new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(e.x, 0.06, e.z);
        ring.renderOrder = 7;

        const fill = new THREE.Mesh(
          new THREE.CircleGeometry(1, 24),
          new THREE.MeshBasicMaterial({
            color: 0xf97316,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1,
          })
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.set(e.x, 0.055, e.z);
        fill.scale.setScalar(0.1);
        fill.renderOrder = 6;

        this.entitiesGroup.add(ring, fill);
        soundEngine.playEliteAffixTrigger('volatile');
        this.volatileBlasts.push({
          x: e.x,
          z: e.z,
          radius: blastRadius,
          timer: blastDelay,
          maxTimer: blastDelay,
          damage: Math.round(e.damage * 1.15),
          damagesEnemies: isDetonatorRole,
          ring,
          fill,
        });
      }

      // Boss Phase 2 Shield Totem Shatter -> Stun owner Boss & strip break shield
      if (e.isBossTotem) {
        soundEngine.playBossShieldShatter(killPan);
        this.spawnShockwave(e.x, e.z, 0x38bdf8, 4.4, 0.4);
        const owner = this.enemies.find((b) => !b.dead && b.id === e.totemOwnerId && b.hp > 0);
        if (owner) {
          if (owner.maxBreakShield && owner.breakShield !== undefined) {
            owner.breakShield = Math.max(0, owner.breakShield - owner.maxBreakShield * 0.35);
          }
          owner.stunTimer = Math.max(owner.stunTimer ?? 0, 1.8);
          this.emitFloatingNumber(owner.x, 2.7, owner.z, 0, true, false, 'ice', 'VỠ TRỤ HỘ THUẪN!', true);
        }
      }

      // Chain-Kill Crystal Shatter Splash (collect victims before recursive killEnemy calls)
      if (!fromChain && !e.isBoss && !e.isBossTotem && !e.isTrainingDummy) {
        const chain = computeChainDetonationSplash(
          this.baseStats.attack * this.getCurrentAtkMultiplier(),
          this.comboBeat === 1,
          e.isElite
        );
        if (chain.triggered) {
          soundEngine.playChainExplosion(killPan);
          this.spawnShockwave(e.x, e.z, 0x38bdf8, chain.radius, 0.28);
          this.spawnParticles(e.x, 0.9, e.z, 0xfbbf24, 10);
          const chainVictims: EnemyEntity[] = [];
          for (const other of [...this.enemies]) {
            if (!other || other.dead || other.id === e.id || other.spawnTimer > 0 || other.isTrainingDummy) continue;
            const cdx = other.x - e.x;
            const cdz = other.z - e.z;
            const cd = Math.hypot(cdx, cdz);
            if (cd <= chain.radius + other.radius) {
              const chainDmg = Math.max(
                1,
                Math.round(this.scaleAuxiliaryPlayerDamage(chain.splashDamage, other))
              );
              other.hp -= chainDmg;
              other.hitFlashTimer = 0.08;
              if (!other.isBoss && !other.isBossTotem && cd > 0.05) {
                other.knockVx = (other.knockVx ?? 0) + (cdx / cd) * chain.knockbackForce;
                other.knockVz = (other.knockVz ?? 0) + (cdz / cd) * chain.knockbackForce;
              }
              this.emitFloatingNumber(other.x, 1.5, other.z, chainDmg, true, false, 'storm');
              if (other.hp <= 0) {
                chainVictims.push(other);
              }
            }
          }
          for (const victim of chainVictims) {
            const vIdx = this.enemies.indexOf(victim);
            if (vIdx !== -1 && !victim.dead) {
              this.killEnemy(vIdx, true);
            }
          }
        }
      }

      const goldAmt = Math.max(1, Math.round(e.goldValue * this.baseStats.goldGainMult));
      this.spawnLootOrb(e.x, e.z, 'xp', e.xpValue);
      this.spawnLootOrb(e.x + 0.35, e.z - 0.25, 'gold', goldAmt);
      if (this.activeRoomChaosEvent?.id === 'gold_meteor_shower') {
        this.spawnLootOrb(e.x - 0.2, e.z - 0.35, 'gold', Math.max(3, Math.round(goldAmt * 0.35)));
      }
      if (e.isBoss || Math.random() < 0.14) {
        this.spawnLootOrb(
          e.x - 0.35,
          e.z + 0.25,
          'gem',
          e.isBoss ? (this.isTowerMode ? 15 + Math.floor(this.towerFloor / 3) * 3 : 12) : 2
        );
      }
      if (Math.random() < (this.activeRoomChaosEvent?.id === 'solar_orb_surge' ? 0.45 : 0.15)) {
        this.spawnLootOrb(e.x, e.z + 0.4, 'heal', Math.round(this.maxHp * 0.12));
      }
      if (this.activeRoomChaosEvent?.id === 'solar_orb_surge') {
        this.ultCharge = Math.min(100, this.ultCharge + 22);
      }
      if (e.ambushBounty) {
        this.runGems += 5;
        this.emitFloatingNumber(e.x, 2.3, e.z, 5, true, false, undefined, 'TRUY NÃ! +5💎', true);
      }

      if (this.isBloodMoonMode) {
        this.bloodMoonScore += e.isBoss ? 180 : e.isElite ? 65 : 28;
      }
      if (this.isAbyssalMode) {
        this.abyssalScore += e.isBoss ? 240 : e.isElite ? 85 : 35;
      }
      if (this.isGuildWarMode) {
        this.guildWarScore += e.isBoss ? 220 : e.isElite ? 80 : 32;
      }
      if (this.isPantheonMode) {
        this.pantheonScore += e.isBoss ? 850 + this.pantheonStage * 220 : e.isElite ? 140 : 60;
      }
      if (this.isCrystalVaultMode && e.isVaultPillar) {
        this.vaultPillarsBroken += 1;
        const gemDrop = e.isGoldenPillar ? 9 : 5;
        const reforgeDrop = e.isGoldenPillar ? 3 : 2;
        const shardDrop = e.isGoldenPillar ? 2 : 1;
        this.vaultGemsLooted += gemDrop;
        this.vaultReforgeLooted += reforgeDrop;
        this.vaultShardsLooted += shardDrop;
        this.emitFloatingNumber(
          e.x,
          2.1,
          e.z,
          gemDrop,
          true,
          false,
          undefined,
          `+${gemDrop}💎 +${reforgeDrop} ĐÁ ĐÚC`
        );
        this.spawnShockwave(e.x, e.z, 0xfbbf24, 3.8, 0.36);
        soundEngine.playPickup(true);
      }

      if (this.isSkyCitadelMode) {
        const featherDrop = e.isBoss ? 10 : e.isElite ? 3 : 1;
        this.skyCitadelFeathersLooted += featherDrop;
        this.skyCitadelScore += e.isBoss ? 1800 : e.isElite ? 320 : 120;
        if (e.isBoss || e.isElite) {
          this.emitFloatingNumber(
            e.x,
            2.1,
            e.z,
            featherDrop,
            true,
            false,
            'storm',
            `+${featherDrop} LÔNG VŨ`
          );
        }
      }

      // Hand off defeated model to 3D KO topple + starlight dissolve transition
      const kbDx = e.x - this.px;
      const kbDz = e.z - this.pz;
      const kbDist = Math.hypot(kbDx, kbDz) || 1;
      const kbSpeed = e.isBoss ? 2.4 : e.isElite ? 4.2 : 5.4;
      this.dyingCorpses.push({
        root: e.model.root,
        hitMeshes: e.model.hitMeshes,
        vx: (kbDx / kbDist) * kbSpeed,
        vz: (kbDz / kbDist) * kbSpeed,
        timer: 0,
        maxTimer: e.isBoss ? 0.56 : 0.36,
        baseScale: e.baseScale ?? 1,
      });
      this.releaseObject(e.shadow);
      this.releaseObject(e.telegraphGroup);
      if (e.punishRingMesh) this.releaseObject(e.punishRingMesh);
      if (e.breakShieldRingMesh) this.releaseObject(e.breakShieldRingMesh);
      if (e.eliteAuraRingMesh) this.releaseObject(e.eliteAuraRingMesh);
      if (e.eliteAuraRingMesh2) this.releaseObject(e.eliteAuraRingMesh2);
      if (e.hpBarGroup) this.releaseObject(e.hpBarGroup);
      this.releaseObject(e.laserLine);
      if (e.boneTrails) {
        disposeBoneTrailController(e.boneTrails);
        e.boneTrails = undefined;
      }

      if (e.ambushBounty && this.phase === GamePhase.PLAYING) {
        this.phase = GamePhase.SKILL_DRAFT;
        this.keys = {};
        this.syncHudImmediate();
        this.callbacks.onRequestSkillDraft({ ...this.activeSkills });
      }
    } finally {
      this.killResolutionDepth -= 1;
    }

    if (this.killResolutionDepth === 0 && this.enemies.length === 0) {
      if (this.isSkyCitadelMode) {
        if (this.skyCitadelWave < 3 && this.skyCitadelTimeLeft > 2) {
          this.spawnSkyCitadelWave(this.skyCitadelWave + 1);
        } else {
          const totalFeathers = Math.max(12, this.skyCitadelFeathersLooted + 8 + Math.floor(this.skyCitadelTimeLeft / 7));
          const totalShards = Math.max(6, Math.floor(this.skyCitadelScore / 650) + 4);
          this.skyCitadelScore += 1200;
          soundEngine.playVictory();
          this.phase = GamePhase.VICTORY;
          this.syncHudImmediate();
          this.callbacks.onRunEnded(true, {
            chapterId: this.currentChapter.id,
            stageReached: 3,
            kills: this.kills,
            gold: this.runGold + 880 + Math.floor(this.skyCitadelScore * 0.22),
            gems: this.runGems + 48 + totalShards * 2,
            isSkyCitadelMode: true,
            skyCitadelScore: Math.round(this.skyCitadelScore),
            skyCitadelWave: 3,
            celestialFeathers: totalFeathers,
            mythicShards: totalShards,
            maxCombo: this.maxRunCombo,
            damageBreakdown: this.getDamageBreakdownSnapshot(),
          });
        }
        return;
      } else if (this.isDragonLairMode) {
        if (this.dragonBreathCone) this.dragonBreathCone.visible = false;
        const slayBonusScales = 14 + Math.floor(this.dragonTimeLeft / 8);
        const totalScales = this.dragonScalesLooted + slayBonusScales;
        this.dragonScalesLooted = totalScales;
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: this.currentChapter.id,
          stageReached: 3,
          kills: this.kills,
          gold: this.runGold + 920 + totalScales * 55,
          gems: this.runGems + 45 + totalScales * 2,
          isDragonLairMode: true,
          dragonDamageDealt: Math.round(this.dragonDamageDealt),
          dragonScalesLooted: totalScales,
          dragonPhase: 3,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      } else if (this.isCrystalVaultMode) {
        if (this.vaultTimeLeft > 2) {
          this.spawnCrystalVaultWave(this.vaultWave + 1);
        }
      } else if (this.isBloodMoonMode) {
        this.bloodMoonSpawnTimer = Math.min(this.bloodMoonSpawnTimer, 0.45);
      } else if (this.isGuildWarMode) {
        this.guildWarSpawnTimer = Math.min(this.guildWarSpawnTimer, 0.55);
      } else if (this.isChampionshipMode) {
        this.championshipScore += 950 + this.championshipRound * 550;
        if (this.championshipRound < CHAMPIONSHIP_TOTAL_ROUNDS) {
          const pool = [...CHAMPIONSHIP_TACTICS].sort(() => Math.random() - 0.5);
          this.championshipTacticsOffer = pool.slice(0, 3);
          this.phase = GamePhase.PAUSED;
          soundEngine.playVictory();
          this.syncHudImmediate();
        } else {
          this.onStageCleared();
        }
      } else if (this.isPantheonMode) {
        if (this.pantheonStage < PANTHEON_TOTAL_STAGES) {
          const healAmt = Math.round(this.maxHp * 0.18);
          this.hp = Math.min(this.maxHp, this.hp + healAmt);
          this.emitFloatingNumber(this.px, 2.1, this.pz, healAmt, false, true, undefined, 'THẦN ẤN HỒI PHỤC!');
          this.spawnNextPantheonStage();
        } else {
          this.onStageCleared();
        }
      } else if (this.isAbyssalMode) {
        if (this.abyssalWave < ABYSSAL_GAUNTLET_TOTAL_WAVES) {
          this.spawnNextAbyssalWave();
        } else {
          this.onStageCleared();
        }
      } else if (
        this.isGuildBossMode ||
        this.isCoopRaidMode ||
        this.isArenaMode ||
        this.isWorldBossMode
      ) {
        this.onStageCleared();
      } else if (this.isCrystalDefenseMode) {
        if (this.crystalWave < CRYSTAL_DEFENSE_TOTAL_WAVES) {
          const healCrystal = Math.round(this.crystalMaxHp * 0.12);
          this.crystalHp = Math.min(this.crystalMaxHp, this.crystalHp + healCrystal);
          this.emitFloatingNumber(0, 2.3, 0, healCrystal, false, true, undefined, 'HỒI PHA LÊ!');
          this.spawnCrystalDefenseWave(this.crystalWave + 1);
        } else {
          this.onStageCleared();
        }
      } else if (this.isElementalTowerMode) {
        if (this.waveIndex + 1 < this.elementalWaveDefs.length) {
          this.spawnElementalTowerWave(this.waveIndex + 1);
        } else {
          this.onStageCleared();
        }
      } else if (this.isDailyRiftMode) {
        if (this.waveIndex + 1 < this.dailyRiftWaveDefs.length) {
          this.spawnDailyRiftWave(this.waveIndex + 1);
        } else {
          this.onStageCleared();
        }
      } else if (this.isTowerMode) {
        if (this.waveIndex + 1 < this.towerWaveDefs.length) {
          this.spawnTowerWave(this.waveIndex + 1);
        } else {
          this.onStageCleared();
        }
      } else if (this.isBossRushMode) {
        this.onStageCleared();
      } else {
        const stage = this.currentChapter.stages[this.stageIndex];
        if (
          !this.ambushBossSpawnedInStage &&
          this.waveIndex + 1 < stage.waves.length &&
          shouldTriggerSurpriseAmbush(
            stage.isBossStage,
            this.stageIndex,
            this.ambushBossTriggeredInRun,
            Math.random()
          )
        ) {
          this.ambushBossSpawnedInStage = true;
          this.ambushBossTriggeredInRun = true;
          this.spawnSurpriseAmbushBoss();
          return;
        }
        if (this.waveIndex + 1 < stage.waves.length) {
          this.spawnWave(this.waveIndex + 1);
        } else {
          this.onStageCleared();
        }
      }
    }
  }

  private getCombatTelemetrySnapshot(): PlayerCombatTelemetryInput {
    const entries: Array<[AiDominantElement, number]> = [
      ['fire', this.runElemCounts.fire],
      ['ice', this.runElemCounts.ice],
      ['storm', this.runElemCounts.storm],
      ['poison', this.runElemCounts.poison],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    const dominantElement: AiDominantElement = entries[0][1] > 0 ? entries[0][0] : 'fire';
    const avgDistance =
      this.runDistSamples > 0 ? this.runDistSum / this.runDistSamples : 5.5;
    return {
      leftDodges: this.runLeftDodges,
      rightDodges: this.runRightDodges,
      avgDistance,
      dashCount: this.runDashCount,
      durationSec: Math.max(1, Math.round(this.runElapsedSeconds)),
      dominantElement,
      elementalReactions: this.elementalReactionsCount,
    };
  }

  private getDamageBreakdownSnapshot(): DamageBreakdown {
    const basic = Math.round(this.dmgBasic);
    const ultimate = Math.round(this.dmgUltimate);
    const pet = Math.round(this.dmgPet);
    const elemental = Math.round(this.dmgElemental);
    const playerTotal = basic + ultimate + pet + elemental;

    let coopAlliesSummary: CoopAllySummary[] | undefined;
    if (this.isCoopRaidMode && this.coopAllies.length > 0) {
      const maxAllyDmg = Math.max(...this.coopAllies.map((a) => Math.round(a.damageDealt)));
      const playerIsMvp = playerTotal >= maxAllyDmg;
      coopAlliesSummary = this.coopAllies.map((a) => {
        const d = Math.round(a.damageDealt);
        return {
          heroId: a.heroId,
          name: a.name,
          damage: d,
          isMvp: !playerIsMvp && d === maxAllyDmg,
        };
      });
    }

    return {
      basic,
      ultimate,
      pet,
      elemental,
      peakCrit: Math.round(this.peakCritDmg),
      elapsedSeconds: Math.max(1, Math.round(this.runElapsedSeconds)),
      perfectDodges: this.perfectDodgeCount,
      punishHits: this.punishHitsCount,
      elementalReactions: this.elementalReactionsCount,
      counterShots: this.counterShotsCount,
      coopAllies: coopAlliesSummary,
    };
  }

  private onStageCleared(): void {
    this.callbacks.onProgressEvent?.({ stageCleared: true });
    this.lootOrbs.forEach((o) => {
      if (o.active) o.magnetized = true;
    });

    // Talent: Soul Regeneration per room cleared
    if (this.baseStats.stageHealPct > 0 && this.hp < this.maxHp) {
      const healAmt = Math.max(4, Math.round(this.maxHp * this.baseStats.stageHealPct));
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.emitFloatingNumber(this.px, 2.0, this.pz, healAmt, false, true);
    }

    if (this.isArenaMode) {
      const bonusPct = this.aiRivalMatchConfig?.rewardBonusPct ?? 0;
      const bonusMult = 1 + bonusPct / 100;
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: 1,
        gold: Math.round((this.runGold + 160) * bonusMult),
        gems: this.runGems + Math.round(12 * bonusMult),
        starDust: Math.round(10 * bonusMult) + this.runBossPartStarDust,
        isArenaMode: true,
        arenaOpponentName: this.arenaOpponentName,
        liveAiDuelId: this.liveAiDuelId ?? undefined,
        liveAiPlayerId: this.liveAiPlayerId ?? undefined,
        liveAiDurationSec: Math.max(1, Math.round(this.runElapsedSeconds)),
        aiDuelTier: this.aiDuelTier,
        aiRewardBonusPct: bonusPct,
        arenaRivalRemainingHpPct: 0,
        trialGauntletRound: this.trialGauntletRound ?? undefined,
        trialGauntletKitId: this.trialGauntletKitId ?? undefined,
        combatTelemetry: this.getCombatTelemetrySnapshot(),
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isCoopRaidMode) {
      const diffCfg = COOP_DIFFICULTY_MAP[this.coopDifficulty];
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: this.kills,
        gold: this.runGold + diffCfg.rewardGold,
        gems: this.runGems + diffCfg.rewardGems,
        isCoopRaidMode: true,
        coopDifficulty: this.coopDifficulty,
        starDust: diffCfg.rewardStarDust,
        petEssence: diffCfg.rewardPetEssence,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isElementalTowerMode) {
      this.portalOpen = true;
      const isBossFloor = this.elementalTowerFloor % 3 === 0;
      const tDef = ELEMENTAL_TOWER_MAP[this.elementalTowerId];
      if (isBossFloor) {
        this.runGold += 95 + this.elementalTowerFloor * 18;
        this.runGems += 14;
      }
      const ev: StageEventAfter = isBossFloor ? 'valkyrie' : this.elementalTowerFloor % 2 === 0 ? 'angel' : 'none';
      this.stageBannerText = `Hoàn Thành ${tDef.name} Tầng ${this.elementalTowerFloor}! Bước Vào Cổng Bắc Lên Tầng ${this.elementalTowerFloor + 1}`;
      this.stageBannerTimer = 3.2;

      if (ev !== 'none' && !this.shrineUsed) {
        this.shrineKind = ev;
        this.shrineGroup = createShrineModel(ev);
        this.shrineGroup.position.set(0, 0, -2.5);
        this.entitiesGroup.add(this.shrineGroup);
      }
      this.syncHudImmediate();
      return;
    }

    if (this.isGuildBossMode) {
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: this.kills,
        gold: this.runGold + 240,
        gems: this.runGems + 12,
        isGuildBossMode: true,
        guildBossDamage: Math.round(this.guildBossTotalDamage),
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isCrystalDefenseMode) {
      const crystalHpPct = Math.round((this.crystalHp / Math.max(1, this.crystalMaxHp)) * 100);
      const wingFeathers = 18 + Math.round(crystalHpPct * 0.12);
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: CRYSTAL_DEFENSE_TOTAL_WAVES,
        kills: this.kills,
        gold: this.runGold + 280,
        gems: this.runGems + 26,
        starDust: 65,
        wingFeathers,
        isCrystalDefenseMode: true,
        crystalWavesCleared: CRYSTAL_DEFENSE_TOTAL_WAVES,
        crystalHpPct,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isChampionshipMode) {
      const finalScore = Math.max(2400, Math.round(this.championshipScore + 1200));
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: CHAMPIONSHIP_TOTAL_ROUNDS,
        kills: this.kills,
        gold: this.runGold + 460,
        gems: this.runGems + 42,
        isChampionshipMode: true,
        championshipRound: CHAMPIONSHIP_TOTAL_ROUNDS,
        championshipScore: finalScore,
        gloryTrophies: 3,
        spiritCores: 5,
        festivalLanterns: 28,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isPantheonMode) {
      const finalScore = Math.max(1200, Math.round(this.pantheonScore + PANTHEON_TOTAL_STAGES * 450));
      const divineCrystals = 18 + Math.min(22, Math.floor(finalScore / 280));
      const artifactShards = 10 + Math.min(14, Math.floor(finalScore / 420));
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: PANTHEON_TOTAL_STAGES,
        kills: this.kills,
        gold: this.runGold + 380,
        gems: this.runGems + 38,
        isPantheonMode: true,
        pantheonStage: PANTHEON_TOTAL_STAGES,
        pantheonScore: finalScore,
        divineCrystals,
        artifactShards,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isAbyssalMode) {
      const finalScore = Math.max(0, Math.round(this.abyssalScore + ABYSSAL_GAUNTLET_TOTAL_WAVES * 120));
      const artifactShards = 16 + Math.min(18, Math.floor(finalScore / 260));
      const mysticTokens = 22 + Math.min(24, Math.floor(finalScore / 220));
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: ABYSSAL_GAUNTLET_TOTAL_WAVES,
        kills: this.kills,
        gold: this.runGold + 340,
        gems: this.runGems + 36,
        isAbyssalMode: true,
        abyssalWave: ABYSSAL_GAUNTLET_TOTAL_WAVES,
        abyssalScore: finalScore,
        artifactShards,
        mysticTokens,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isWeeklyRankedBossMode) {
      const totalDmg = Math.min(
        this.weeklyBossMaxHp,
        Math.max(this.weeklyBossMaxHp, Math.round(this.weeklyBossTotalDamage))
      );
      const clearMs = Math.round(this.simClock.totalSimTime * 1000);
      if (this.bossPaceTracker) {
        this.bossPaceHud = updateBossPaceTracker(this.bossPaceTracker, 0, clearMs);
      }
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: this.kills,
        gold: 0,
        gems: 0,
        isWeeklyRankedBossMode: true,
        weeklyBossIsPractice: this.isWeeklyBossPracticeMode,
        weeklyBossIsWeekendBlitz: this.weeklyBossIsWeekendBlitz,
        weeklyBossAttemptId: this.weeklyBossAttemptId ?? undefined,
        weeklyBossSeed: this.weeklyBossSeed ?? undefined,
        weeklyBossDamage: totalDmg,
        weeklyBossCleared: true,
        weeklyBossSimTicks: this.simClock.totalTicks,
        weeklyBossClearTimeMs: clearMs,
        weeklyBossRemainingHpPct: Math.max(0, this.hp / Math.max(1, this.maxHp)),
        weeklyBossSplitsMs: this.bossPaceTracker ? [...this.bossPaceTracker.currentSplitsMs] : undefined,
        weeklyBossCounterHits: this.perfectDodgeCounter.totalCountersLanded,
        weeklyBossGuardBreaks: this.runBossBreaksCount,
        peakStyleGrade: this.styleMomentum.peakGrade,
        autoPilotUsed: this.autoPilotUsedInRun,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isWorldBossMode) {
      const totalDmg = Math.round(this.worldBossTotalDamage);
      const liveRank = computeWorldBossLiveRank(totalDmg);
      const wingFeathers = 16 + Math.max(0, 10 - liveRank) * 2;
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: this.kills,
        gold: this.runGold + 340,
        gems: this.runGems + 30,
        wingFeathers,
        isWorldBossMode: true,
        worldBossDamage: totalDmg,
        worldBossLiveRank: liveRank,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
      });
      return;
    }

    if (this.isDailyRiftMode) {
      const stageStarDust = 35 + this.dailyRiftStageIdx * 20;
      const stageEssence = 10 + this.dailyRiftStageIdx * 6;
      if (this.dailyRiftStageIdx >= this.dailyRiftTotalStages - 1) {
        const totalStarDust = 115;
        const totalEssence = 32;
        this.runGold += 220;
        this.runGems += 28;
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: 1,
          stageReached: this.dailyRiftTotalStages,
          kills: this.kills,
          gold: this.runGold,
          gems: this.runGems,
          isDailyRiftMode: true,
          starDust: totalStarDust,
          petEssence: totalEssence,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }

      this.portalOpen = true;
      const ev: StageEventAfter = this.dailyRiftStageIdx === 0 ? 'valkyrie' : 'angel';
      this.stageBannerText = `Hoàn Thành Bí Cảnh ${this.dailyRiftStageIdx + 1}/${this.dailyRiftTotalStages} (+${stageStarDust} Bụi Tinh Tú · +${stageEssence} Tinh Chất)`;
      this.stageBannerTimer = 3.2;

      if (!this.shrineUsed) {
        this.shrineKind = ev;
        this.shrineGroup = createShrineModel(ev);
        this.shrineGroup.position.set(0, 0, -2.5);
        this.entitiesGroup.add(this.shrineGroup);
      }
      this.syncHudImmediate();
      return;
    }

    if (this.isTowerMode) {
      this.portalOpen = true;
      const isBossFloor = this.towerFloor % 3 === 0;
      const ev: StageEventAfter = isBossFloor
        ? 'valkyrie'
        : this.towerFloor % 2 === 0
        ? 'angel'
        : 'none';
      if (isBossFloor) {
        const bonusGold = Math.round((70 + this.towerFloor * 14) * this.baseStats.goldGainMult);
        this.runGold += bonusGold;
        this.runGems += 12;
      }
      this.stageBannerText =
        ev !== 'none'
          ? `Xong Tầng ${this.towerFloor}! Ghé Đền Thờ hoặc Bước Vào Cổng Bắc`
          : `Xong Tầng ${this.towerFloor} · Bước Vào Cổng Bắc Lên Tầng ${this.towerFloor + 1}`;
      this.stageBannerTimer = 3.2;

      if (ev !== 'none' && !this.shrineUsed) {
        this.shrineKind = ev;
        this.shrineGroup = createShrineModel(ev);
        this.shrineGroup.position.set(0, 0, -2.5);
        this.entitiesGroup.add(this.shrineGroup);
      }
      this.syncHudImmediate();
      return;
    }

    if (this.isBossRushMode) {
      const roundGems = 16 + this.bossRushRound * 6;
      const roundGold = Math.round((130 + this.bossRushRound * 45) * this.baseStats.goldGainMult);
      this.runGems += roundGems;
      this.runGold += roundGold;

      if (this.bossRushRound >= this.bossRushTotalRounds) {
        soundEngine.playVictory();
        this.phase = GamePhase.VICTORY;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(true, {
          chapterId: 1,
          stageReached: this.bossRushRound,
          kills: this.kills,
          gold: this.runGold,
          gems: this.runGems,
          isBossRushMode: true,
          bossRushRound: this.bossRushRound,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }

      this.portalOpen = true;
      const ev: StageEventAfter = this.bossRushRound % 2 === 1 ? 'valkyrie' : 'angel';
      this.stageBannerText = `Hạ Vòng ${this.bossRushRound}/5 (+${roundGems} Ngọc Hồn) · Ghé Đền hoặc Cổng Bắc!`;
      this.stageBannerTimer = 3.2;

      if (!this.shrineUsed) {
        this.shrineKind = ev;
        this.shrineGroup = createShrineModel(ev);
        this.shrineGroup.position.set(0, 0, -2.5);
        this.entitiesGroup.add(this.shrineGroup);
      }
      this.syncHudImmediate();
      return;
    }

    const stage = this.currentChapter.stages[this.stageIndex];
    if (this.stageIndex >= this.currentChapter.stages.length - 1) {
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: stage.stageNumber,
        kills: this.kills,
        gold: this.runGold,
        gems: this.runGems,
        starDust: this.runBossPartStarDust > 0 ? this.runBossPartStarDust : undefined,
        isTowerMode: false,
        combatTelemetry: this.getCombatTelemetrySnapshot(),
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
        activeSynergies: evaluateActiveSynergies(this.activeSkills),
      });
      return;
    }

    this.portalOpen = true;
    this.advanceRoomBounty({ type: 'room_clear' });
    const ev = stage.eventAfter ?? 'none';
    this.stageBannerText =
      ev !== 'none'
        ? 'Đã Dọn Sạch! Ghé Đền Thờ Giữa Sân hoặc Bước Vào Cổng Bắc'
        : 'Đã Dọn Sạch · Bước Vào Cổng Bắc';
    this.stageBannerTimer = 3.2;

    if (ev !== 'none' && !this.shrineUsed) {
      this.shrineKind = ev;
      this.shrineGroup = createShrineModel(ev);
      this.shrineGroup.position.set(0, 0, -2.5);
      this.entitiesGroup.add(this.shrineGroup);
    }

    this.syncHudImmediate();
  }

  private damagePlayer(
    rawAmount: number,
    cause?: DefeatCauseInfo,
    sourceX?: number,
    sourceZ?: number
  ): void {
    if (this.phase !== GamePhase.PLAYING) return;
    if (this.invulnTimer > 0) {
      if (this.dashTimer > 0) {
        this.tryTriggerPerfectDodge();
      }
      return;
    }
    if (cause) {
      this.lastDamageSource = cause;
    } else if (!this.lastDamageSource) {
      this.lastDamageSource = {
        code: 'unknown',
        label: 'Sát thương liên tiếp trong giao tranh',
        tip: 'Di chuyển sau mỗi loạt bắn để tránh bị kẹt góc và giữ lượng máu ổn định trước phòng Boss.',
      };
    }
    this.invulnTimer = this.isArenaMode ? 0.34 : 0.55;
    this.hitFlashTimer = 0.22;
    this.lastPlayerHitAt = performance.now();
    this.lastHitAngleDeg =
      sourceX !== undefined && sourceZ !== undefined
        ? computeHitIndicatorAngleDeg(this.px, this.pz, sourceX, sourceZ)
        : null;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
    this.triggerPostFxImpulse('player_hurt');
    soundEngine.playPlayerHurt();
    triggerHapticPulse('dash', this.hapticsEnabled);
    this.runDamageTakenCount += 1;
    recordStyleDamageTaken(this.styleMomentum);
    this.advanceRoomBounty({ type: 'player_hit' });

    if (this.hasCadencePassive) {
      this.alexGuaranteedCrit = true;
    }

    const drCap = this.isArenaMode
      ? this.aiRivalMatchConfig?.playerArenaDrCap ?? 0.32
      : 0.65;
    const effectiveDr = Math.min(
      drCap,
      this.baseStats.damageReduction +
        (this.isChampionshipMode ? this.championshipDrBonus : 0) +
        (this.isCoopRaidMode && this.coopRoleSynergy ? this.coopRoleSynergy.damageReductionBonus : 0)
    );
    const drPierce =
      !this.isArenaMode && !this.isTrainingMode ? this.activePowerPressure.enemyDrPiercePct : 0;
    const finalDr = effectiveDr * (1 - drPierce);
    const powerPressureMult =
      !this.isArenaMode && !this.isTrainingMode ? this.activePowerPressure.enemyDamageDealtMult : 1.0;
    let dmg = Math.max(2, Math.round(rawAmount * powerPressureMult * (1 - finalDr)));
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }
    this.hp = Math.max(0, this.hp - dmg);
    this.emitFloatingNumber(this.px, 1.9, this.pz, dmg, false, false, 'playerHit');

    if (this.hp <= 0) {
      if (this.revivesLeft > 0) {
        this.revivesLeft--;
        const restorePct = this.hasFullRevive ? 1.0 : 0.55;
        this.hp = Math.round(this.maxHp * restorePct);
        this.invulnTimer = 2.0;
        soundEngine.playVictory();
        this.spawnParticles(this.px, 1.2, this.pz, 0xfde047, 36);
        this.emitFloatingNumber(this.px, 2.2, this.pz, this.hp, true, true, undefined, 'HỒI SINH!');
        // Knock back nearby enemies
        for (const e of this.enemies) {
          const dx = e.x - this.px;
          const dz = e.z - this.pz;
          const d = Math.hypot(dx, dz);
          if (d < 6 && d > 0.01) {
            e.x += (dx / d) * 4.5;
            e.z += (dz / d) * 4.5;
          }
        }
        this.syncHudImmediate();
        return;
      }

      this.phase = GamePhase.GAME_OVER;
      this.syncHudImmediate();
      const stage = this.currentChapter.stages[this.stageIndex];
      this.callbacks.onRunEnded(false, {
        chapterId: this.currentChapter.id,
        stageReached: this.isChampionshipMode
          ? this.championshipRound
          : this.isPantheonMode
          ? this.pantheonStage
          : this.isAbyssalMode
          ? this.abyssalWave
          : this.isGuildWarMode
          ? this.guildWarNodesCaptured
          : this.isBloodMoonMode
          ? this.bloodMoonWave
          : this.isCrystalDefenseMode
          ? this.crystalWave
          : this.isElementalTowerMode
          ? this.elementalTowerFloor
          : this.isDailyRiftMode
          ? this.dailyRiftStageIdx + 1
          : this.isBossRushMode
          ? this.bossRushRound
          : this.isTowerMode
          ? this.towerFloor
          : stage.stageNumber,
        kills: this.kills,
        gold: this.runGold,
        gems: this.runGems,
        isTowerMode: this.isTowerMode,
        towerFloor: this.towerFloor,
        isBossRushMode: this.isBossRushMode,
        bossRushRound: this.bossRushRound,
        isDailyRiftMode: this.isDailyRiftMode,
        isGuildBossMode: this.isGuildBossMode,
        guildBossDamage: this.isGuildBossMode ? Math.round(this.guildBossTotalDamage) : undefined,
        isArenaMode: this.isArenaMode,
        arenaOpponentName: this.isArenaMode ? this.arenaOpponentName : undefined,
        isCoopRaidMode: this.isCoopRaidMode,
        coopDifficulty: this.isCoopRaidMode ? this.coopDifficulty : undefined,
        isElementalTowerMode: this.isElementalTowerMode,
        elementalTowerId: this.isElementalTowerMode ? this.elementalTowerId : undefined,
        elementalTowerFloor: this.isElementalTowerMode ? this.elementalTowerFloor : undefined,
        isCrystalDefenseMode: this.isCrystalDefenseMode,
        crystalWavesCleared: this.isCrystalDefenseMode ? Math.max(0, this.crystalWave - 1) : undefined,
        crystalHpPct: this.isCrystalDefenseMode
          ? Math.round((this.crystalHp / Math.max(1, this.crystalMaxHp)) * 100)
          : undefined,
        wingFeathers: this.isCrystalDefenseMode
          ? Math.max(2, (this.crystalWave - 1) * 3)
          : this.isWorldBossMode
          ? Math.max(4, Math.min(18, 4 + Math.floor(this.worldBossTotalDamage / 35000) * 2))
          : this.isBloodMoonMode
          ? Math.max(2, Math.floor(this.bloodMoonScore / 260))
          : undefined,
        isWorldBossMode: this.isWorldBossMode,
        worldBossDamage: this.isWorldBossMode ? Math.round(this.worldBossTotalDamage) : undefined,
        worldBossLiveRank: this.isWorldBossMode
          ? computeWorldBossLiveRank(Math.round(this.worldBossTotalDamage))
          : undefined,
        isWeeklyRankedBossMode: this.isWeeklyRankedBossMode,
        weeklyBossIsPractice: this.isWeeklyRankedBossMode ? this.isWeeklyBossPracticeMode : undefined,
        weeklyBossIsWeekendBlitz: this.isWeeklyRankedBossMode
          ? this.weeklyBossIsWeekendBlitz
          : undefined,
        weeklyBossAttemptId: this.isWeeklyRankedBossMode ? this.weeklyBossAttemptId ?? undefined : undefined,
        weeklyBossSeed: this.isWeeklyRankedBossMode ? this.weeklyBossSeed ?? undefined : undefined,
        weeklyBossDamage: this.isWeeklyRankedBossMode
          ? Math.min(this.weeklyBossMaxHp, Math.round(this.weeklyBossTotalDamage))
          : undefined,
        weeklyBossCleared: this.isWeeklyRankedBossMode ? false : undefined,
        weeklyBossSimTicks: this.isWeeklyRankedBossMode ? this.simClock.totalTicks : undefined,
        weeklyBossClearTimeMs: this.isWeeklyRankedBossMode
          ? Math.round(this.simClock.totalSimTime * 1000)
          : undefined,
        weeklyBossRemainingHpPct: this.isWeeklyRankedBossMode ? 0 : undefined,
        weeklyBossSplitsMs:
          this.isWeeklyRankedBossMode && this.bossPaceTracker
            ? [...this.bossPaceTracker.currentSplitsMs]
            : undefined,
        weeklyBossCounterHits: this.isWeeklyRankedBossMode
          ? this.perfectDodgeCounter.totalCountersLanded
          : undefined,
        weeklyBossGuardBreaks: this.isWeeklyRankedBossMode ? this.runBossBreaksCount : undefined,
        peakStyleGrade: this.styleMomentum.peakGrade,
        autoPilotUsed: this.autoPilotUsedInRun,
        liveAiDuelId: this.isArenaMode ? this.liveAiDuelId ?? undefined : undefined,
        liveAiPlayerId: this.isArenaMode ? this.liveAiPlayerId ?? undefined : undefined,
        liveAiDurationSec: this.isArenaMode ? Math.max(1, Math.round(this.runElapsedSeconds)) : undefined,
        trialGauntletRound: this.isArenaMode ? this.trialGauntletRound ?? undefined : undefined,
        trialGauntletKitId: this.isArenaMode ? this.trialGauntletKitId ?? undefined : undefined,
        guildWarBastionId: this.isGuildWarMode ? this.guildWarBastionId ?? undefined : undefined,
        combatTelemetry: this.getCombatTelemetrySnapshot(),
        isEqualizedRiftMode: this.isEqualizedRiftMode || undefined,
        equalizedRiftFloor: this.isEqualizedRiftMode ? Math.max(0, this.towerFloor - 1) : undefined,
        isBloodMoonMode: this.isBloodMoonMode,
        bloodMoonScore: this.isBloodMoonMode ? Math.round(this.bloodMoonScore) : undefined,
        bloodMoonWave: this.isBloodMoonMode ? this.bloodMoonWave : undefined,
        isAbyssalMode: this.isAbyssalMode,
        abyssalWave: this.isAbyssalMode ? Math.max(0, this.abyssalWave - 1) : undefined,
        abyssalScore: this.isAbyssalMode ? Math.round(this.abyssalScore) : undefined,
        isDragonLairMode: this.isDragonLairMode,
        dragonDamageDealt: this.isDragonLairMode ? Math.round(this.dragonDamageDealt) : undefined,
        dragonScalesLooted: this.isDragonLairMode
          ? Math.max(3, this.dragonScalesLooted + Math.floor(this.dragonDamageDealt / 2600))
          : undefined,
        dragonPhase: this.isDragonLairMode ? this.dragonPhase : undefined,
        artifactShards: this.isPantheonMode
          ? Math.max(3, (this.pantheonStage - 1) * 4)
          : this.isAbyssalMode
          ? Math.max(3, (this.abyssalWave - 1) * 2)
          : this.isGuildWarMode
          ? Math.max(2, this.guildWarNodesCaptured * 2)
          : undefined,
        mysticTokens: this.isAbyssalMode
          ? Math.max(4, (this.abyssalWave - 1) * 3)
          : this.isGuildWarMode
          ? Math.max(4, Math.floor(this.guildWarScore / 240))
          : undefined,
        isGuildWarMode: this.isGuildWarMode,
        guildWarScore: this.isGuildWarMode ? Math.round(this.guildWarScore) : undefined,
        guildWarNodes: this.isGuildWarMode ? this.guildWarNodesCaptured : undefined,
        guildCoins: this.isGuildWarMode ? Math.max(40, Math.round(this.guildWarScore / 18)) : undefined,
        isPantheonMode: this.isPantheonMode,
        pantheonStage: this.isPantheonMode ? Math.max(0, this.pantheonStage - 1) : undefined,
        pantheonScore: this.isPantheonMode ? Math.round(this.pantheonScore) : undefined,
        divineCrystals: this.isPantheonMode ? Math.max(4, (this.pantheonStage - 1) * 6) : undefined,
        isChampionshipMode: this.isChampionshipMode,
        championshipRound: this.isChampionshipMode ? Math.max(0, this.championshipRound - 1) : undefined,
        championshipScore: this.isChampionshipMode ? Math.round(this.championshipScore) : undefined,
        gloryTrophies: this.isChampionshipMode ? Math.max(1, this.championshipRound - 1) : undefined,
        spiritCores: this.isChampionshipMode ? Math.max(1, this.championshipRound) : undefined,
        festivalLanterns: this.isChampionshipMode ? Math.max(8, this.championshipRound * 8) : undefined,
        mountShards: this.isBloodMoonMode
          ? Math.max(2, Math.floor(this.bloodMoonScore / 180))
          : undefined,
        awakeningCrystals: this.isBloodMoonMode
          ? Math.max(1, Math.floor(this.bloodMoonScore / 240))
          : undefined,
        starDust: this.isArenaMode
          ? buildLethalDefeatReport({
              rivalName: this.arenaOpponentName || 'AI Rival',
              rivalRemainingHpPct: (() => {
                const rv = this.enemies.find((en) => en.isArenaRival);
                return rv ? Math.round((Math.max(0, rv.hp) / Math.max(1, rv.maxHp)) * 100) : 0;
              })(),
              tier: this.aiDuelTier,
              lastPattern: this.aiRivalActivePattern,
              suddenDeathActive: computeArenaSuddenDeath(this.arenaTimeLeft).active,
              perfectDodges: this.perfectDodgeCount,
              durationSec: this.runElapsedSeconds,
            }).consolationStarDust
          : this.isDailyRiftMode
          ? Math.max(15, this.dailyRiftStageIdx * 28)
          : this.isElementalTowerMode
          ? Math.max(0, (this.elementalTowerFloor - 1) * 18)
          : 0,
        petEssence: this.isDailyRiftMode
          ? Math.max(4, this.dailyRiftStageIdx * 8)
          : this.isElementalTowerMode
          ? Math.max(0, (this.elementalTowerFloor - 1) * 6)
          : 0,
        aiDuelTier: this.isArenaMode ? this.aiDuelTier : undefined,
        aiRewardBonusPct: this.isArenaMode ? this.aiRivalMatchConfig?.rewardBonusPct ?? 0 : undefined,
        arenaRivalRemainingHpPct: this.isArenaMode
          ? (() => {
              const rv = this.enemies.find((en) => en.isArenaRival);
              return rv ? Math.round((Math.max(0, rv.hp) / Math.max(1, rv.maxHp)) * 100) : 0;
            })()
          : undefined,
        consolationStarDust: this.isArenaMode
          ? buildLethalDefeatReport({
              rivalName: this.arenaOpponentName || 'AI Rival',
              rivalRemainingHpPct: (() => {
                const rv = this.enemies.find((en) => en.isArenaRival);
                return rv ? Math.round((Math.max(0, rv.hp) / Math.max(1, rv.maxHp)) * 100) : 0;
              })(),
              tier: this.aiDuelTier,
              lastPattern: this.aiRivalActivePattern,
              suddenDeathActive: computeArenaSuddenDeath(this.arenaTimeLeft).active,
              perfectDodges: this.perfectDodgeCount,
              durationSec: this.runElapsedSeconds,
            }).consolationStarDust
          : undefined,
        coachingNote: this.isArenaMode
          ? buildLethalDefeatReport({
              rivalName: this.arenaOpponentName || 'AI Rival',
              rivalRemainingHpPct: (() => {
                const rv = this.enemies.find((en) => en.isArenaRival);
                return rv ? Math.round((Math.max(0, rv.hp) / Math.max(1, rv.maxHp)) * 100) : 0;
              })(),
              tier: this.aiDuelTier,
              lastPattern: this.aiRivalActivePattern,
              suddenDeathActive: computeArenaSuddenDeath(this.arenaTimeLeft).active,
              perfectDodges: this.perfectDodgeCount,
              durationSec: this.runElapsedSeconds,
            }).coachingNote
          : undefined,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
        defeatCause: this.isArenaMode
          ? buildLethalDefeatReport({
              rivalName: this.arenaOpponentName || 'AI Rival',
              rivalRemainingHpPct: (() => {
                const rv = this.enemies.find((en) => en.isArenaRival);
                return rv ? Math.round((Math.max(0, rv.hp) / Math.max(1, rv.maxHp)) * 100) : 0;
              })(),
              tier: this.aiDuelTier,
              lastPattern: this.aiRivalActivePattern,
              suddenDeathActive: computeArenaSuddenDeath(this.arenaTimeLeft).active,
              perfectDodges: this.perfectDodgeCount,
              durationSec: this.runElapsedSeconds,
            }).cause
          : this.lastDamageSource ?? undefined,
        activeSynergies: evaluateActiveSynergies(this.activeSkills),
      });
    }
  }

  private spawnLootOrb(
    x: number,
    z: number,
    kind: LootOrb['kind'],
    value: number
  ): void {
    const color =
      kind === 'xp'
        ? 0x38bdf8
        : kind === 'gold'
        ? 0xfbbf24
        : kind === 'gem'
        ? 0xc084fc
        : 0x34d399;
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(kind === 'gem' ? 0.26 : 0.2, 0),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );
    mesh.position.set(x, 0.45, z);
    this.entitiesGroup.add(mesh);

    const a = Math.random() * Math.PI * 2;
    this.lootOrbs.push({
      active: true,
      kind,
      x,
      y: 0.45,
      z,
      vx: Math.cos(a) * 2.8,
      vz: Math.sin(a) * 2.8,
      value,
      magnetized: false,
      mesh,
    });
  }

  private updateLootOrbs(dt: number): void {
    for (let i = this.lootOrbs.length - 1; i >= 0; i--) {
      const o = this.lootOrbs[i];
      const dx = this.px - o.x;
      const dz = this.pz - o.z;
      const d = Math.hypot(dx, dz);

      if (d < 3.8 || this.portalOpen) {
        o.magnetized = true;
      }

      if (o.magnetized && d > 0.01) {
        const pullSpeed = 14.5;
        o.x += (dx / d) * pullSpeed * dt;
        o.z += (dz / d) * pullSpeed * dt;
      } else {
        o.x += o.vx * dt;
        o.z += o.vz * dt;
        o.vx *= Math.exp(-6 * dt);
        o.vz *= Math.exp(-6 * dt);
      }

      o.mesh.position.set(o.x, 0.45 + Math.sin(this.elapsed * 5 + i) * 0.12, o.z);
      o.mesh.rotation.y += dt * 3.5;

      if (d < 0.72) {
        this.releaseObject(o.mesh);
        this.lootOrbs.splice(i, 1);

        if (o.kind === 'gold') {
          this.runGold += o.value;
          soundEngine.playPickup(false);
        } else if (o.kind === 'gem') {
          this.runGems += o.value;
          soundEngine.playPickup(true);
        } else if (o.kind === 'heal') {
          this.hp = Math.min(this.maxHp, this.hp + o.value);
          this.emitFloatingNumber(this.px, 1.9, this.pz, o.value, false, true);
          soundEngine.playPickup(true);
        } else if (o.kind === 'xp') {
          const xpBonus = this.hasCadencePassive ? 1.12 : 1.0;
          this.xp += Math.round(o.value * xpBonus);
          soundEngine.playPickup(false);
          if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.round(this.xpToNext * 1.32 + 20);
            soundEngine.playLevelUp();
            this.phase = GamePhase.SKILL_DRAFT;
            this.keys = {};
            this.syncHudImmediate();
            this.callbacks.onRequestSkillDraft({ ...this.activeSkills });
            return;
          }
        }
      }
    }
  }

  private updateDyingCorpses(dt: number): void {
    for (let i = this.dyingCorpses.length - 1; i >= 0; i--) {
      const c = this.dyingCorpses[i];
      c.timer += dt;
      if (c.timer >= c.maxTimer) {
        this.releaseObject(c.root);
        this.dyingCorpses.splice(i, 1);
        continue;
      }
      const pose = computeKoPose(c.timer / c.maxTimer, c.baseScale);
      c.root.position.x = THREE.MathUtils.clamp(
        c.root.position.x + c.vx * pose.velocityFactor * dt,
        -ARENA_HALF_W + 0.4,
        ARENA_HALF_W - 0.4
      );
      c.root.position.z = THREE.MathUtils.clamp(
        c.root.position.z + c.vz * pose.velocityFactor * dt,
        -ARENA_HALF_D + 0.4,
        ARENA_HALF_D - 0.4
      );
      c.root.position.y = pose.offsetY;
      c.root.rotation.x = pose.pitchX;
      c.root.scale.setScalar(pose.scale);
      for (const m of c.hitMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && 'emissive' in mat) {
          mat.emissive.setHex(0xfef08a);
          mat.emissiveIntensity = pose.emissiveFlash;
        }
      }
    }
  }

  private updatePortalAndShrine(dt: number): void {
    const vortexMat = this.portal.vortex.material as THREE.MeshBasicMaterial;
    if (this.portalOpen) {
      vortexMat.opacity = THREE.MathUtils.damp(vortexMat.opacity, 0.92, 6, dt);
      this.portal.ringMat.emissiveIntensity = 1.65 + Math.sin(this.elapsed * 5) * 0.4;
      this.portal.vortex.rotation.z += dt * 1.45;
      for (let ci = 0; ci < this.portal.guideChevrons.length; ci++) {
        const chev = this.portal.guideChevrons[ci];
        chev.visible = true;
        // Traveling wave flowing south -> north toward the open gate
        const wave = Math.sin(this.elapsed * 5.2 + ci * 1.35) * 0.5 + 0.5;
        const chevMat = chev.material as THREE.MeshBasicMaterial;
        chevMat.opacity = 0.24 + wave * 0.64;
        const s = 0.92 + wave * 0.14;
        chev.scale.set(s, s, 1);
      }

      if (this.pz < -ARENA_HALF_D + 1.4 && Math.abs(this.px) < 1.85) {
        if (this.isElementalTowerMode) {
          this.loadElementalTowerFloor(this.elementalTowerFloor + 1);
        } else if (this.isDailyRiftMode) {
          this.loadDailyRiftStage(this.dailyRiftStageIdx + 1);
        } else if (this.isBossRushMode) {
          this.loadBossRushRound(this.bossRushRound + 1);
        } else if (this.isTowerMode) {
          this.loadTowerFloor(this.towerFloor + 1);
        } else {
          this.loadStage(this.stageIndex + 1);
        }
      }
    } else {
      vortexMat.opacity = 0.08;
      this.portal.ringMat.emissiveIntensity = 0.25;
      for (let ci = 0; ci < this.portal.guideChevrons.length; ci++) {
        this.portal.guideChevrons[ci].visible = false;
      }
    }

    if (this.shrineGroup && !this.shrineUsed) {
      this.shrineGroup.children[3].rotation.y += dt * 2.2;
      if (Math.hypot(this.px - 0, this.pz - -2.5) < 1.75) {
        this.shrineUsed = true;
        this.keys = {};
        if (this.shrineKind === 'valkyrie') {
          this.phase = GamePhase.VALKYRIE_DRAFT;
        } else if (this.shrineKind === 'wheel') {
          this.phase = GamePhase.LUCKY_WHEEL;
        } else {
          this.phase = GamePhase.ANGEL_DEVIL;
        }
        this.callbacks.onRequestEncounter(this.shrineKind, { ...this.activeSkills }, {
          chapterId: this.currentChapter.id,
          stage: this.stageIndex + 1,
        });
      }
    }
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number
  ): void {
    const scaledCount = Math.max(1, Math.round(count * this.particleDensityScale));
    let spawned = 0;
    for (const pt of this.particlePool) {
      if (pt.active) continue;
      pt.active = true;
      pt.x = x;
      pt.y = y;
      pt.z = z;
      const a = Math.random() * Math.PI * 2;
      const spd = 2.0 + Math.random() * 4.8;
      pt.vx = Math.cos(a) * spd;
      pt.vy = 2.2 + Math.random() * 4.0;
      pt.vz = Math.sin(a) * spd;
      pt.maxLife = 0.28 + Math.random() * 0.24;
      pt.life = pt.maxLife;
      pt.scale = 0.7 + Math.random() * 0.8;
      (pt.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      pt.mesh.position.set(x, y, z);
      pt.mesh.visible = true;
      spawned++;
      if (spawned >= scaledCount) break;
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particlePool) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        pt.mesh.visible = false;
        continue;
      }
      pt.vy -= 14 * dt;
      pt.x += pt.vx * dt;
      pt.y = Math.max(0.05, pt.y + pt.vy * dt);
      pt.z += pt.vz * dt;
      pt.mesh.position.set(pt.x, pt.y, pt.z);
      pt.mesh.scale.setScalar(pt.scale * (pt.life / pt.maxLife));
    }
  }

  private spawnShockwave(
    x: number,
    z: number,
    colorHex: number,
    maxRadius: number,
    duration = 0.38
  ): void {
    const ring = this.shockwavePool.find((r) => !r.active);
    if (!ring) return;
    ring.active = true;
    ring.x = x;
    ring.z = z;
    ring.maxLife = duration;
    ring.life = duration;
    ring.maxRadius = maxRadius;
    const mat = ring.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.9;
    ring.mesh.position.set(x, 0.08, z);
    ring.mesh.scale.setScalar(0.3);
    ring.mesh.visible = true;
  }

  private updateShockwaves(dt: number): void {
    for (const ring of this.shockwavePool) {
      if (!ring.active) continue;
      ring.life -= dt;
      if (ring.life <= 0) {
        ring.active = false;
        ring.mesh.visible = false;
        continue;
      }
      const p = 1 - ring.life / ring.maxLife;
      const eased = 1 - Math.pow(1 - p, 2);
      ring.mesh.scale.setScalar(0.3 + eased * ring.maxRadius);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
    }
  }

  private spawnImpactDecal(
    x: number,
    z: number,
    accentHex: number,
    radius = 2.0,
    duration = 1.7
  ): void {
    if (!this.impactDecalPool || this.impactDecalPool.length === 0) return;
    let slot = this.impactDecalPool.find((d) => !d.active);
    if (!slot) {
      // Recycle oldest active decal cleanly (ring buffer)
      slot = this.impactDecalPool.reduce((oldest, cur) =>
        cur.life < oldest.life ? cur : oldest
      );
    }
    slot.active = true;
    slot.maxLife = duration;
    slot.life = duration;
    slot.baseRadius = radius;
    slot.mesh.position.set(x, 0.025, z);
    slot.ring.position.set(x, 0.028, z);
    (slot.ring.material as THREE.MeshBasicMaterial).color.setHex(accentHex);
    const init = computeImpactDecalState(duration, duration, radius);
    slot.mesh.scale.setScalar(init.scale);
    slot.ring.scale.setScalar(init.scale);
    (slot.mesh.material as THREE.MeshBasicMaterial).opacity = init.opacity * 0.78;
    (slot.ring.material as THREE.MeshBasicMaterial).opacity = init.opacity;
    slot.mesh.visible = true;
    slot.ring.visible = true;
  }

  private updateImpactDecals(dt: number): void {
    if (!this.impactDecalPool) return;
    for (const d of this.impactDecalPool) {
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        d.mesh.visible = false;
        d.ring.visible = false;
        continue;
      }
      const state = computeImpactDecalState(d.life, d.maxLife, d.baseRadius);
      d.mesh.scale.setScalar(state.scale);
      d.ring.scale.setScalar(state.scale);
      (d.mesh.material as THREE.MeshBasicMaterial).opacity = state.opacity * 0.78;
      (d.ring.material as THREE.MeshBasicMaterial).opacity = state.opacity;
    }
  }

  private applyPhotoStudioLighting(dt: number): void {
    const mood = resolvePhotoLightingMood(this.photoLightingPreset);
    const alpha = 1 - Math.exp(-5.5 * dt);
    _keyCol.setHex(mood.keyHex);
    this.keyLight.color.lerp(_keyCol, alpha);
    this.keyLight.intensity = THREE.MathUtils.damp(this.keyLight.intensity, mood.keyIntensity, 5.5, dt);
    _starCol.setHex(mood.rimHex);
    this.rimLight.color.lerp(_starCol, alpha);
    this.rimLight.intensity = THREE.MathUtils.damp(this.rimLight.intensity, mood.rimIntensity, 5.5, dt);
    _hemiSkyCol.setHex(mood.hemiSkyHex);
    _hemiGndCol.setHex(mood.hemiGroundHex);
    this.hemiLight.color.lerp(_hemiSkyCol, alpha);
    this.hemiLight.groundColor.lerp(_hemiGndCol, alpha);
    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      mood.exposure,
      5.5,
      dt
    );
  }

  private spawnSummonPortal(
    x: number,
    z: number,
    radius: number,
    colorHex: number,
    duration = 0.56
  ): void {
    const slot = this.summonPortalPool?.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.maxLife = duration;
    slot.life = duration;
    slot.baseRadius = radius;
    slot.group.position.set(x, 0.055, z);
    slot.group.scale.setScalar(0.15);
    (slot.outerRing.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    (slot.coreDisc.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    slot.group.visible = true;
  }

  private spawnArmorShards(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count = 10
  ): void {
    if (!this.armorShardPool) return;
    let spawned = 0;
    for (let i = 0; i < this.armorShardPool.length && spawned < count; i++) {
      const slot = this.armorShardPool[i];
      if (slot.active) continue;
      slot.active = true;
      const ang = (spawned / Math.max(1, count)) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const spd = 2.8 + Math.random() * 4.4;
      slot.kin.x = x + (Math.random() - 0.5) * 0.4;
      slot.kin.y = y + Math.random() * 0.45;
      slot.kin.z = z + (Math.random() - 0.5) * 0.4;
      slot.kin.vx = Math.cos(ang) * spd;
      slot.kin.vy = 4.2 + Math.random() * 4.2;
      slot.kin.vz = Math.sin(ang) * spd;
      slot.kin.rx = Math.random() * Math.PI;
      slot.kin.ry = Math.random() * Math.PI;
      slot.kin.rz = Math.random() * Math.PI;
      slot.kin.vrx = (Math.random() - 0.5) * 14;
      slot.kin.vry = (Math.random() - 0.5) * 14;
      slot.kin.vrz = (Math.random() - 0.5) * 14;
      slot.kin.bounces = 0;
      slot.kin.maxLife = 0.95 + Math.random() * 0.45;
      slot.kin.life = slot.kin.maxLife;
      const mat = slot.mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(colorHex);
      mat.emissive.setHex(colorHex);
      slot.mesh.position.set(slot.kin.x, slot.kin.y, slot.kin.z);
      slot.mesh.scale.setScalar(0.85 + Math.random() * 0.55);
      slot.mesh.visible = true;
      spawned += 1;
    }
  }

  private spawnDashScorch(x: number, z: number, yaw: number, colorHex: number): void {
    const slot = this.dashScorchPool?.find((d) => !d.active);
    if (!slot) return;
    slot.active = true;
    slot.maxLife = 0.58;
    slot.life = 0.58;
    slot.mesh.position.set(x, 0.042, z);
    slot.mesh.rotation.y = yaw;
    slot.mesh.scale.set(1, 1, 1);
    const mat = slot.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.62;
    slot.mesh.visible = true;
  }

  private spawnWindRing(
    x: number,
    z: number,
    colorHex = 0x5eead4,
    maxRadius = 2.2,
    tiltAngle = 0.24
  ): void {
    const slot = this.windRingPool?.find((w) => !w.active);
    if (!slot) return;
    slot.active = true;
    slot.maxLife = 0.34;
    slot.life = 0.34;
    slot.maxRadius = maxRadius;
    slot.group.position.set(x, 0.72, z);
    slot.group.rotation.set(tiltAngle, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.25);
    slot.group.scale.setScalar(0.38);
    slot.ringMat.color.setHex(colorHex);
    slot.ringMat.opacity = 0.85;
    slot.wispMat.color.setHex(0x99f6e4);
    slot.wispMat.opacity = 0.72;
    slot.group.visible = true;
  }

  private shatterCrystalObstacle(obs: ObstacleBox): void {
    if (obs.intact === false) return;
    obs.intact = false;
    obs.mesh.visible = false;
    const pan = computeSpatialPan(obs.x, ARENA_HALF_W);
    soundEngine.playCrystalPillarShatter(pan);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
    this.spawnArmorShards(obs.x, 1.4, obs.z, 0x67e8f9, 10);
    this.spawnShockwave(obs.x, obs.z, 0x67e8f9, 3.2, 0.36);
    this.spawnImpactDecal(obs.x, obs.z, 0x38bdf8, 1.55, 1.6);
    this.spawnParticles(obs.x, 1.2, obs.z, 0x67e8f9, 18);
    this.spawnLootOrb(obs.x, obs.z, 'heal', Math.max(18, Math.round(this.maxHp * 0.1)));
    this.ultCharge = Math.min(100, this.ultCharge + 8);
    this.emitFloatingNumber(obs.x, 1.9, obs.z, 0, true, false, 'ice', 'TRỤ PHA LÊ VỠ!', false);
  }

  private updateWave5Effects(dt: number): void {
    // 1. Rotating Celestial Summon Portals
    if (this.summonPortalPool) {
      for (let i = 0; i < this.summonPortalPool.length; i++) {
        const sp = this.summonPortalPool[i];
        if (!sp.active) continue;
        sp.life -= dt;
        if (sp.life <= 0) {
          sp.active = false;
          sp.group.visible = false;
          continue;
        }
        const p = 1 - sp.life / sp.maxLife;
        const grow = p < 0.35 ? p / 0.35 : 1 - ((p - 0.35) / 0.65) * 0.25;
        const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
        sp.group.scale.setScalar(Math.max(0.08, sp.baseRadius * grow));
        sp.outerRing.rotation.z += dt * 4.2;
        sp.innerRing.rotation.z -= dt * 6.5;
        (sp.outerRing.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
        (sp.innerRing.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
        (sp.coreDisc.material as THREE.MeshBasicMaterial).opacity = 0.34 * fade;
      }
    }

    // 2. Physical Bouncing Armor & Crystal Shards
    if (this.armorShardPool) {
      for (let i = 0; i < this.armorShardPool.length; i++) {
        const sh = this.armorShardPool[i];
        if (!sh.active) continue;
        if (!stepArmorShardPhysics(sh.kin, dt)) {
          sh.active = false;
          sh.mesh.visible = false;
          continue;
        }
        sh.mesh.position.set(sh.kin.x, sh.kin.y, sh.kin.z);
        sh.mesh.rotation.set(sh.kin.rx, sh.kin.ry, sh.kin.rz);
        const fadeScale = sh.kin.life < 0.25 ? Math.max(0.05, sh.kin.life / 0.25) : 1;
        sh.mesh.scale.setScalar(fadeScale);
      }
    }

    // 3. Fading Glowing Dash Scorch Trails
    if (this.dashScorchPool) {
      for (let i = 0; i < this.dashScorchPool.length; i++) {
        const ds = this.dashScorchPool[i];
        if (!ds.active) continue;
        ds.life -= dt;
        if (ds.life <= 0) {
          ds.active = false;
          ds.mesh.visible = false;
          continue;
        }
        const ratio = ds.life / ds.maxLife;
        (ds.mesh.material as THREE.MeshBasicMaterial).opacity = 0.62 * ratio;
        ds.mesh.scale.set(0.6 + ratio * 0.4, 1, 1 + (1 - ratio) * 0.3);
      }
    }

    // 4. Low-Lying Instanced Ground Mist
    if (this.groundMistMesh) {
      const showMist = this.phase !== GamePhase.TITLE && !this.isSoftwareGl;
      this.groundMistMesh.visible = showMist;
      if (showMist) {
        for (let i = 0; i < this.GROUND_MIST_COUNT; i++) {
          const s = this.groundMistSeeds[i];
          s.x += s.vx * dt;
          s.z += s.vz * dt;
          if (s.x > ARENA_HALF_W) s.x = -ARENA_HALF_W;
          if (s.x < -ARENA_HALF_W) s.x = ARENA_HALF_W;
          if (s.z > ARENA_HALF_D) s.z = -ARENA_HALF_D;
          const pulse = s.scale * (0.92 + Math.sin(this.elapsed * 0.9 + s.phase) * 0.08);
          _dummy.position.set(s.x, 0.08 + (i % 3) * 0.03, s.z);
          _dummy.rotation.set(0, s.phase + this.elapsed * 0.18, 0);
          _dummy.scale.setScalar(pulse);
          _dummy.updateMatrix();
          this.groundMistMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.groundMistMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 5. Van Tich Signature Wind Vortex Rings
    if (this.windRingPool) {
      for (let i = 0; i < this.windRingPool.length; i++) {
        const wr = this.windRingPool[i];
        if (!wr.active) continue;
        wr.life -= dt;
        if (wr.life <= 0) {
          wr.active = false;
          wr.group.visible = false;
          continue;
        }
        const t = 1 - wr.life / wr.maxLife;
        const sc = 0.38 + t * (wr.maxRadius - 0.38);
        wr.group.scale.setScalar(sc);
        wr.group.rotation.y += dt * 11.5;
        wr.ringMat.opacity = 0.85 * (1 - t);
        wr.wispMat.opacity = 0.72 * (1 - t);
      }
    }

    // 6. Van Tich Signature Storm-Mark Ground Indicators on Marked Enemies
    if (this.stormMarkPool) {
      let slotIdx = 0;
      for (let i = 0; i < this.enemies.length && slotIdx < this.stormMarkPool.length; i++) {
        const en = this.enemies[i];
        if (!en || en.dead || en.spawnTimer > 0 || (en.stormMarkUntil ?? 0) <= this.elapsed) {
          continue;
        }
        const slot = this.stormMarkPool[slotIdx++];
        slot.active = true;
        slot.group.visible = true;
        slot.group.position.set(en.x, 0.058, en.z);
        slot.group.scale.setScalar(Math.max(0.85, en.radius * 1.45));
        slot.group.rotation.y += dt * 2.8;
      }
      for (; slotIdx < this.stormMarkPool.length; slotIdx++) {
        const slot = this.stormMarkPool[slotIdx];
        if (slot.active || slot.group.visible) {
          slot.active = false;
          slot.group.visible = false;
        }
      }
    }
  }

  private spawnBattleScar(x: number, z: number, scale = 1.0): void {
    if (!this.battleScarPool || this.battleScarPool.length === 0) return;
    let slot = this.battleScarPool.find((s) => !s.active);
    if (!slot) {
      slot = this.battleScarPool[Math.floor(Math.random() * this.battleScarPool.length)];
    }
    slot.active = true;
    slot.group.position.set(x, 0.022, z);
    slot.group.rotation.y = Math.random() * Math.PI * 2;
    slot.group.scale.setScalar(Math.max(0.65, Math.min(1.85, scale)));
    slot.group.visible = true;
  }

  private triggerCompanionSynergyStrike(): void {
    if (!this.petModel && this.companionModels.length === 0) return;
    const nearest = this.findNearestEnemy(this.px, this.pz);
    if (!nearest || nearest.spawnTimer > 0) return;
    this.companionSynergyTimer = this.companionSynergyDuration;
    this.companionSynergyTargetX = nearest.x;
    this.companionSynergyTargetZ = nearest.z;
    this.companionSynergyStruck = false;
    soundEngine.playCompanionSynergy(computeSpatialPan(nearest.x, ARENA_HALF_W));
  }

  private resolveCompanionSynergyImpact(tx: number, tz: number, colorHex: number): void {
    this.spawnLightningArc(this.px, 1.35, this.pz, tx, 0.85, tz);
    this.spawnShockwave(tx, tz, colorHex, 2.75, 0.34);
    this.spawnParticles(tx, 1.0, tz, colorHex, 14);
    const dmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * 0.65;
    for (const en of [...this.enemies]) {
      if (!en || en.dead || en.spawnTimer > 0) continue;
      if (Math.hypot(en.x - tx, en.z - tz) <= 2.95) {
        this.damageEnemy(en, dmg, true, false, false, false, false, 'HỢP KÍCH!', 'pet');
      }
    }
  }

  private advanceRoomBounty(event: RoomBountyEvent): void {
    if (!this.roomBounty || this.roomBounty.status !== 'active') return;
    const res = updateRoomBountyProgress(this.roomBounty, event);
    this.roomBounty = res.next;
    if (res.justCompleted) {
      this.runBountiesCompleted += 1;
      this.runGold += res.goldReward;
      this.ultCharge = Math.min(100, this.ultCharge + res.ultChargeReward);
      this.roomBountyBanner = res.bannerText;
      this.roomBountyBannerTimer = 2.8;
      soundEngine.playBountyComplete();
      this.spawnCritStar(this.px, 1.75, this.pz, 0xfde047, 2.1);
      this.spawnShockwave(this.px, this.pz, 0xfde047, 3.6, 0.42);
      this.spawnParticles(this.px, 1.25, this.pz, 0xfde047, 22);
      this.emitFloatingNumber(
        this.px,
        2.35,
        this.pz,
        res.goldReward,
        true,
        false,
        undefined,
        'THỬ THÁCH +'
      );
      this.syncHudImmediate();
    }
  }

  private updateTargetLockReticle(target: EnemyEntity | null, dt: number): void {
    if (!this.targetLockGroup || !this.targetLockOuter || !this.targetLockInner) return;
    if (!target || target.spawnTimer > 0 || target.hp <= 0 || this.phase !== GamePhase.PLAYING) {
      this.targetLockGroup.visible = false;
      return;
    }
    const visual = evaluateTargetLockState(target.hp, target.maxHp, target.isBoss);
    const baseRadiusScale = Math.max(0.72, target.radius * 1.15) * visual.ringScale;
    const pulse = 1 + Math.sin(this.elapsed * visual.pulseSpeed) * 0.06;
    this.targetLockGroup.visible = true;
    this.targetLockGroup.position.set(target.x, 0.035, target.z);
    this.targetLockGroup.scale.setScalar(baseRadiusScale * pulse);
    this.targetLockOuter.rotation.z += dt * (visual.isExecuteThreshold ? 2.8 : 1.35);
    this.targetLockInner.rotation.z -= dt * (visual.isExecuteThreshold ? 4.2 : 2.1);
    (this.targetLockOuter.material as THREE.MeshBasicMaterial).color.setHex(visual.reticleColorHex);
    (this.targetLockInner.material as THREE.MeshBasicMaterial).color.setHex(visual.innerColorHex);
  }

  private openBossWeakPoint(boss: EnemyEntity): void {
    if (this.bossWeakPointState?.active) return;
    const angle = Math.atan2(this.pz - boss.z, this.px - boss.x) + (Math.random() - 0.5) * 0.8;
    this.bossWeakPointState = createBossWeakPointWindow(boss.radius, angle);
    this.bossWeakPointEnemyId = boss.id;
    this.syncHudImmediate();
  }

  private shatterBossWeakPoint(
    boss: EnemyEntity,
    wx: number,
    wy: number,
    wz: number,
    baseProjDamage: number
  ): void {
    if (!this.bossWeakPointState || !this.bossWeakPointState.active) return;
    this.bossWeakPointState = { ...this.bossWeakPointState, active: false, shattered: true, remainingSec: 0 };
    if (this.bossWeakPointGroup) this.bossWeakPointGroup.visible = false;
    this.runWeakPointHits += 1;

    const bonusDmg = Math.max(12, baseProjDamage * 1.35 * this.baseStats.critDamage);
    if (boss.maxBreakShield && boss.breakShield && boss.breakShield > 0) {
      boss.breakShield = Math.max(0, boss.breakShield - boss.maxBreakShield * 0.22);
    }
    this.damageEnemy(boss, bonusDmg, true, false, false, false, false, 'ĐIỂM YẾU!', 'basic');
    soundEngine.playWeakPointShatter(computeSpatialPan(wx, ARENA_HALF_W));
    triggerHapticPulse('crit', this.hapticsEnabled);
    this.spawnCritStar(wx, wy, wz, 0xfde047, 2.2);
    this.spawnShockwave(wx, wz, 0x38bdf8, 3.2, 0.36);
    this.spawnParticles(wx, wy, wz, 0xfde047, 24);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.048);
    this.syncHudImmediate();
  }

  private spawnStuckArrow(enemy: EnemyEntity, incomingAngle: number): void {
    if (!this.stuckArrowPool || this.stuckArrowPool.length === 0) return;
    let slot = this.stuckArrowPool.find((s) => !s.active);
    if (!slot) {
      slot = this.stuckArrowPool[this.stuckArrowSeed % this.stuckArrowPool.length];
    }
    const seed = this.stuckArrowSeed++;
    const enemyHeight = enemy.isBoss ? 2.6 : 1.7;
    const off = computeStuckArrowLocalOffset(incomingAngle, enemy.radius, enemyHeight, seed);
    slot.active = true;
    slot.enemyId = enemy.id;
    slot.life = 3.2;
    slot.maxLife = 3.2;
    slot.localX = off.x;
    slot.localY = off.y;
    slot.localZ = off.z;
    slot.mesh.position.set(enemy.x + off.x, off.y, enemy.z + off.z);
    slot.mesh.rotation.set(off.pitch, off.yaw, 0);
    slot.mesh.scale.setScalar(1);
    slot.mesh.visible = true;
  }

  private spawnFootstepRipple(x: number, z: number, colorHex: number): void {
    if (!this.footstepRipplePool || this.footstepRipplePool.length === 0) return;
    const slot = this.footstepRipplePool.find((s) => !s.active);
    if (!slot) return;
    slot.active = true;
    slot.life = 0.52;
    slot.maxLife = 0.52;
    slot.mesh.position.set(x, 0.028, z);
    slot.mesh.scale.setScalar(0.65);
    const mat = slot.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.42;
    slot.mesh.visible = true;
  }

  private detonateResonanceTrap(trap: {
    x: number;
    z: number;
    radius: number;
    kind: ResonanceTrapKind;
    cooldown: number;
    group: THREE.Group;
    crystal: THREE.Mesh;
    ring: THREE.Mesh;
  }): void {
    const cfg = RESONANCE_TRAP_CONFIGS[trap.kind];
    trap.cooldown = cfg.cooldownSec;
    this.runTrapsTriggered += 1;
    this.trapTriggerToast = `${cfg.label} · ${cfg.triggerHint}`;
    this.trapTriggerToastTimer = 2.15;

    const pan = computeSpatialPan(trap.x, ARENA_HALF_W);
    soundEngine.playResonanceTrapDetonate(trap.kind, pan);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
    this.spawnShockwave(trap.x, trap.z, cfg.primaryHex, cfg.aoeRadius, 0.45);
    this.spawnParticles(trap.x, 1.1, trap.z, cfg.accentHex, 24);
    this.spawnImpactLight(trap.x, 1.4, trap.z, 'super_crit');

    if (cfg.heroSpeedBoostSec > 0) {
      this.windBeaconSpeedTimer = Math.max(this.windBeaconSpeedTimer, cfg.heroSpeedBoostSec);
      this.emitFloatingNumber(this.px, 2.2, this.pz, 0, true, false, undefined, 'TĂNG TỐC +22%');
    }
    if (trap.kind === 'ember_crucible') {
      this.spawnElementalZone(trap.x, trap.z, 'ember', 2.4);
    }

    const trapDmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * cfg.damageMultiplier;
    for (const en of [...this.enemies]) {
      if (!en || en.dead || en.spawnTimer > 0) continue;
      const dist = Math.hypot(en.x - trap.x, en.z - trap.z);
      if (dist <= cfg.aoeRadius + en.radius) {
        if (trap.kind === 'storm_pylon') {
          this.spawnLightningArc(trap.x, 1.25, trap.z, en.x, 0.9, en.z);
        }
        if (cfg.knockbackForce > 0 && !en.isBoss && dist > 0.05) {
          const push = cfg.knockbackForce * 0.42;
          en.x = THREE.MathUtils.clamp(
            en.x + ((en.x - trap.x) / dist) * push,
            -ARENA_HALF_W + en.radius,
            ARENA_HALF_W - en.radius
          );
          en.z = THREE.MathUtils.clamp(
            en.z + ((en.z - trap.z) / dist) * push,
            -ARENA_HALF_D + en.radius,
            ARENA_HALF_D - en.radius
          );
        }
        this.damageEnemy(
          en,
          trapDmg,
          true,
          trap.kind === 'ember_crucible',
          false,
          trap.kind === 'storm_pylon',
          false,
          cfg.label.toUpperCase(),
          'elemental'
        );
      }
    }
    this.syncHudImmediate();
  }

  private updateWave7ArenaSystems(simDt: number, realDt: number): void {
    if (this.trapTriggerToastTimer > 0) {
      this.trapTriggerToastTimer = Math.max(0, this.trapTriggerToastTimer - realDt);
      if (this.trapTriggerToastTimer <= 0) this.trapTriggerToast = null;
    }

    // 1. Boss Weak-Point Crystal orbit & visibility
    if (this.bossWeakPointState && this.bossWeakPointState.active && this.bossWeakPointGroup) {
      const boss = this.enemies.find((en) => en.id === this.bossWeakPointEnemyId && en.hp > 0);
      if (!boss) {
        this.bossWeakPointState = null;
        this.bossWeakPointGroup.visible = false;
      } else {
        this.bossWeakPointState = stepBossWeakPointWindow(this.bossWeakPointState, simDt);
        if (!this.bossWeakPointState.active) {
          this.bossWeakPointGroup.visible = false;
        } else {
          const pos = getBossWeakPointWorldPos(boss.x, boss.z, this.bossWeakPointState);
          this.bossWeakPointGroup.visible = true;
          this.bossWeakPointGroup.position.set(pos.x, pos.y, pos.z);
          this.bossWeakPointGroup.rotation.y += realDt * 4.2;
          if (this.bossWeakPointCore) {
            const s = 1 + Math.sin(this.elapsed * 12) * 0.14;
            this.bossWeakPointCore.scale.setScalar(s);
          }
        }
      }
    } else if (this.bossWeakPointGroup && this.bossWeakPointGroup.visible) {
      this.bossWeakPointGroup.visible = false;
    }

    // 2. Pooled Sticking Arrows follow parent enemies & expire smoothly
    if (this.stuckArrowPool) {
      for (let i = 0; i < this.stuckArrowPool.length; i++) {
        const sa = this.stuckArrowPool[i];
        if (!sa.active) continue;
        sa.life -= simDt;
        const host = this.enemies.find((en) => en.id === sa.enemyId && en.hp > 0);
        if (!host || sa.life <= 0) {
          sa.active = false;
          sa.enemyId = -1;
          sa.mesh.visible = false;
          continue;
        }
        sa.mesh.position.set(host.x + sa.localX, sa.localY, host.z + sa.localZ);
        if (sa.life < 0.45) {
          sa.mesh.scale.setScalar(Math.max(0.05, sa.life / 0.45));
        }
      }
    }

    // 3. Interactive Arena Resonance Traps animation & cooldown recharge
    if (this.resonanceTraps) {
      for (let i = 0; i < this.resonanceTraps.length; i++) {
        const t = this.resonanceTraps[i];
        if (t.cooldown > 0) {
          t.cooldown = Math.max(0, t.cooldown - simDt);
        }
        const ready = t.cooldown <= 0;
        t.crystal.rotation.y += simDt * (ready ? 2.4 : 0.45);
        t.crystal.position.y = ready ? 1.15 + Math.sin(this.elapsed * 3.1 + i * 2) * 0.1 : 0.72;
        const cMat = t.crystal.material as THREE.MeshStandardMaterial;
        cMat.emissiveIntensity = ready ? 1.35 : 0.18;
        const rMat = t.ring.material as THREE.MeshBasicMaterial;
        rMat.opacity = ready ? 0.56 + Math.sin(this.elapsed * 4.2 + i) * 0.15 : 0.12;
      }
    }

    // 3b. Wave 9 Interactive 3D Composite Arena Props pulse & rotation
    if (this.wave9Props) {
      for (let i = 0; i < this.wave9Props.length; i++) {
        const prop = this.wave9Props[i];
        if (!prop.alive) continue;
        prop.core.rotation.y += simDt * 2.2;
        prop.core.position.y =
          (prop.kind === 'relic_crate' ? 1.02 : 1.24) +
          Math.sin(this.elapsed * 3.4 + i * 1.7) * 0.08;
        const rMat = prop.ring.material as THREE.MeshBasicMaterial;
        rMat.opacity = 0.52 + Math.sin(this.elapsed * 4.6 + i) * 0.16;
      }
    }

    // 3c. Wave 11 Interactive 3D Battlefield Hazards animation
    if (this.wave11Hazards) {
      for (let i = 0; i < this.wave11Hazards.length; i++) {
        const hz = this.wave11Hazards[i];
        if (hz.spec.detonated) continue;
        hz.core.rotation.y += simDt * 1.9;
        hz.core.scale.lerp(_scaleOne, Math.min(1, realDt * 8));
        const rMat = hz.ring.material as THREE.MeshBasicMaterial;
        rMat.opacity = 0.44 + Math.sin(this.elapsed * 3.8 + i * 1.3) * 0.14;
      }
    }

    // 4. Pooled Elemental Footstep Ripples expand & fade
    if (this.footstepRipplePool) {
      for (let i = 0; i < this.footstepRipplePool.length; i++) {
        const fr = this.footstepRipplePool[i];
        if (!fr.active) continue;
        fr.life -= realDt;
        if (fr.life <= 0) {
          fr.active = false;
          fr.mesh.visible = false;
          continue;
        }
        const progress = 1 - fr.life / fr.maxLife;
        fr.mesh.scale.setScalar(0.65 + progress * 1.45);
        (fr.mesh.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - progress);
      }
    }

    // 5. Chapter-Specific 3D Weather Points advection (zero GC)
    if (this.chapterWeatherPoints && this.chapterWeatherProfile) {
      this.chapterWeatherPoints.visible = true;
      const posAttr = this.chapterWeatherPoints.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const prof = this.chapterWeatherProfile;
      const boundX = ARENA_HALF_W * 1.25;
      const boundZ = ARENA_HALF_D * 1.25;
      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        let x = arr[idx] + prof.velX * realDt;
        let y = arr[idx + 1] + prof.velY * realDt;
        let z = arr[idx + 2] + prof.velZ * realDt;
        if (x > boundX) x = -boundX;
        else if (x < -boundX) x = boundX;
        if (z > boundZ) z = -boundZ;
        else if (z < -boundZ) z = boundZ;
        if (y > 11.2) y = 0.4;
        else if (y < 0.25) y = 10.8;
        arr[idx] = x;
        arr[idx + 1] = y;
        arr[idx + 2] = z;
      }
      posAttr.needsUpdate = true;
    }
  }

  private spawnUltColumn(
    x: number,
    z: number,
    colorHex: number,
    duration = 0.58
  ): void {
    const col = this.ultColumnPool?.find((c) => !c.active);
    if (!col) return;
    col.active = true;
    col.maxLife = duration;
    col.life = duration;
    const mat = col.mesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(colorHex);
    mat.opacity = 0.72;
    col.mesh.position.set(x, 0.05, z);
    col.mesh.scale.set(0.75, 1.0, 0.75);
    col.mesh.visible = true;
  }

  private updateUltColumns(dt: number): void {
    if (!this.ultColumnPool) return;
    for (const col of this.ultColumnPool) {
      if (!col.active) continue;
      col.life -= dt;
      if (col.life <= 0) {
        col.active = false;
        col.mesh.visible = false;
        continue;
      }
      const p = 1 - col.life / col.maxLife;
      const spread = 0.85 + p * 1.15;
      col.mesh.scale.set(spread, 1 + p * 0.25, spread);
      col.mesh.rotation.y += dt * 4.5;
      (col.mesh.material as THREE.MeshBasicMaterial).opacity = 0.72 * (1 - p);
    }
  }

  private spawnDashGhost(x: number, z: number, yaw: number, colorHex: number): void {
    const slot = this.dashGhostPool?.find((g) => !g.active);
    if (!slot) return;
    slot.active = true;
    slot.maxLife = 0.34;
    slot.life = 0.34;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.56;
    slot.group.position.set(x, 0.04, z);
    slot.group.rotation.y = yaw;
    slot.group.scale.set(0.96, 1.04, 0.96);
    slot.group.visible = true;
  }

  private updateDashGhosts(dt: number): void {
    if (!this.dashGhostPool) return;
    for (const g of this.dashGhostPool) {
      if (!g.active) continue;
      g.life -= dt;
      if (g.life <= 0) {
        g.active = false;
        g.group.visible = false;
        continue;
      }
      const p = 1 - g.life / g.maxLife;
      g.mat.opacity = 0.56 * Math.pow(1 - p, 1.45);
      const sx = 0.96 + p * 0.24;
      const sy = 1.04 - p * 0.16;
      g.group.scale.set(sx, sy, sx);
      g.group.position.y = 0.04 + p * 0.18;
    }
  }

  private spawnLightningArc(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
  ): void {
    const arc = this.lightningPool.find((l) => !l.active);
    if (!arc) return;
    arc.active = true;
    arc.timer = 0.14;
    const pos = arc.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, x1, y1, z1);
    pos.setXYZ(
      1,
      (x1 + x2) * 0.5 + (Math.random() - 0.5) * 0.9,
      (y1 + y2) * 0.5 + 0.55,
      (z1 + z2) * 0.5 + (Math.random() - 0.5) * 0.9
    );
    pos.setXYZ(2, x2, y2, z2);
    pos.needsUpdate = true;
    arc.line.visible = true;
  }

  private updateLightning(dt: number): void {
    for (const arc of this.lightningPool) {
      if (!arc.active) continue;
      arc.timer -= dt;
      if (arc.timer <= 0) {
        arc.active = false;
        arc.line.visible = false;
      }
    }
  }

  private updateCamera(dt: number): void {
    const focusEnemy =
      this.enemies.find((e) => e.isBoss) ??
      this.findNearestEnemy(this.px, this.pz);
    const sightline = computeCameraSightline(
      this.px,
      this.pz,
      focusEnemy?.x ?? 0,
      focusEnemy?.z ?? 0,
      Boolean(focusEnemy),
      Boolean(focusEnemy?.isBoss)
    );

    const introBlend = Math.max(
      computeBossIntroBlend(this.bossIntroTimer, this.bossIntroDuration),
      computeBossEntranceCameraBlend(this.bossEntranceTimer, this.bossEntranceDuration)
    );
    const entryFlyBlend = computeArenaEntryFlyBlend(
      this.arenaEntryFlyTimer,
      this.arenaEntryFlyDuration
    );
    const ultCutin = computeUltimateCutinState(this.ultCutinTimer, this.ultCutinDuration);
    const finisherKin = computeBossKillSlowMoState(
      this.bossFinisherTimer,
      this.bossFinisherDuration
    );
    const wave5FinisherCam = computeBossFinisherPresentation(
      this.bossFinisherTimer,
      this.bossFinisherDuration
    );
    const wave9PhaseCounterCam = computeBossPhaseCounterPresentation(
      this.bossPhaseCounterTimer,
      this.bossPhaseCounterLevel
    );
    const wave9ExecCam = computeExecutionFinisherPresentation(
      this.executionFinisherTimer,
      EXECUTION_FINISHER_DURATION_SEC
    );
    const camRig = resolveCombatCameraConfig(this.combatCameraPreset);
    const ridingVisibleMount = Boolean(this.hero?.mountGroup && this.hero.mountGroup.visible);
    const mountCamYOffset = ridingVisibleMount ? 1.15 : 0;
    const mountCamZOffset = ridingVisibleMount ? 1.1 : 0;
    const baseCamX = THREE.MathUtils.clamp(
      this.px * 0.55 + (sightline.lookX - this.px * 0.45) * camRig.lookLeadMult,
      -5.8,
      5.8
    );
    const baseCamZ = THREE.MathUtils.clamp(
      this.pz * 0.7 + camRig.camZOffset + sightline.camZBias + mountCamZOffset,
      5.6,
      24.6
    );
    const baseCamY = camRig.camY + mountCamYOffset;

    const introCamX = THREE.MathUtils.clamp(this.bossIntroFocusX * 0.75, -5.2, 5.2);
    const introCamY = 12.4;
    const introCamZ = THREE.MathUtils.clamp(this.bossIntroFocusZ + 9.2, 3.8, 16.5);

    const finisherCamX = THREE.MathUtils.clamp(this.bossFinisherFocusX * 0.8, -5.4, 5.4);
    const finisherCamY = 11.4;
    const finisherCamZ = THREE.MathUtils.clamp(this.bossFinisherFocusZ + 8.1, 3.4, 15.6);

    let targetCamX = THREE.MathUtils.lerp(baseCamX, introCamX, introBlend);
    let targetCamY = THREE.MathUtils.lerp(baseCamY, introCamY, introBlend);
    let targetCamZ = THREE.MathUtils.lerp(baseCamZ, introCamZ, introBlend);

    const effectiveFinisherBlend = Math.max(
      finisherKin.cameraBlend,
      wave5FinisherCam.cameraZoomBlend * 0.85,
      wave9ExecCam.cameraZoomBlend * 0.75
    );
    if (effectiveFinisherBlend > 0.001) {
      const fxFocusX = wave9ExecCam.active ? this.executionFinisherFocusX : finisherCamX;
      const fxFocusZ = wave9ExecCam.active ? this.executionFinisherFocusZ + 7.2 : finisherCamZ;
      targetCamX = THREE.MathUtils.lerp(targetCamX, THREE.MathUtils.clamp(fxFocusX, -5.4, 5.4), effectiveFinisherBlend);
      targetCamY = THREE.MathUtils.lerp(targetCamY, finisherCamY, effectiveFinisherBlend);
      targetCamZ = THREE.MathUtils.lerp(targetCamZ, THREE.MathUtils.clamp(fxFocusZ, 3.4, 15.6), effectiveFinisherBlend);
    }

    const cinCam = stepCinematicCamera(this.cinematicCamera, dt);
    this.cinematicCamera = cinCam.nextState;
    if (cinCam.active) {
      targetCamX = THREE.MathUtils.lerp(
        targetCamX,
        THREE.MathUtils.clamp(this.cinematicCamera.focusX + Math.sin(cinCam.orbitYawOffset) * 2.6, -6.2, 6.2),
        cinCam.focusBlend
      );
      targetCamY += cinCam.heightOffset;
      targetCamZ = THREE.MathUtils.clamp(targetCamZ + cinCam.zoomOffset, 4.2, 24.6);
    }

    if (entryFlyBlend > 0.001) {
      this.camera.position.x = THREE.MathUtils.lerp(targetCamX, this.arenaEntryStartCam.x, entryFlyBlend);
      this.camera.position.y = THREE.MathUtils.lerp(targetCamY, this.arenaEntryStartCam.y, entryFlyBlend);
      this.camera.position.z = THREE.MathUtils.lerp(targetCamZ, this.arenaEntryStartCam.z, entryFlyBlend);
    } else {
      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        targetCamX,
        7,
        dt
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        targetCamY,
        7,
        dt
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        targetCamZ,
        7,
        dt
      );
    }

    let shakeRollZ = 0;
    if (this.shakeIntensity > 0.005) {
      if (this.screenShakeEnabled) {
        const shake = computeTraumaShake(Math.min(1, this.shakeIntensity * 1.45), this.elapsed);
        this.camera.position.x += shake.offsetX;
        this.camera.position.y += shake.offsetY;
        shakeRollZ = shake.rollZ;
      }
      this.shakeIntensity *= Math.exp(-12.5 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    if (Math.abs(this.cameraFovOffset) > 0.01) {
      this.cameraFovOffset = THREE.MathUtils.damp(this.cameraFovOffset, 0, 8.5, dt);
      if (Math.abs(this.cameraFovOffset) < 0.02) this.cameraFovOffset = 0;
    }
    const desiredFov =
      camRig.fov +
      this.cameraFovOffset -
      introBlend * 3.5 +
      (wave5FinisherCam.active ? wave5FinisherCam.fovDelta : finisherKin.fovBoost) +
      wave9PhaseCounterCam.fovPulseDelta +
      (wave9ExecCam.active ? wave9ExecCam.fovDelta : 0) +
      (cinCam.active ? cinCam.fovDelta : 0) +
      ultCutin.fovPunch;
    if (Math.abs(this.camera.fov - desiredFov) > 0.015) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, desiredFov, 7.5, dt);
      this.camera.updateProjectionMatrix();
    }

    let desiredLookX = THREE.MathUtils.lerp(sightline.lookX, this.bossIntroFocusX, introBlend);
    let desiredLookZ = THREE.MathUtils.lerp(sightline.lookZ, this.bossIntroFocusZ, introBlend);
    let desiredLookY = THREE.MathUtils.lerp(0.5, 1.35, introBlend);
    if (finisherKin.cameraBlend > 0.001) {
      desiredLookX = THREE.MathUtils.lerp(desiredLookX, this.bossFinisherFocusX, finisherKin.cameraBlend);
      desiredLookZ = THREE.MathUtils.lerp(desiredLookZ, this.bossFinisherFocusZ, finisherKin.cameraBlend);
      desiredLookY = THREE.MathUtils.lerp(desiredLookY, 1.25, finisherKin.cameraBlend);
    } else if (wave9ExecCam.active) {
      desiredLookX = THREE.MathUtils.lerp(desiredLookX, this.executionFinisherFocusX, wave9ExecCam.cameraZoomBlend);
      desiredLookZ = THREE.MathUtils.lerp(desiredLookZ, this.executionFinisherFocusZ, wave9ExecCam.cameraZoomBlend);
      desiredLookY = THREE.MathUtils.lerp(desiredLookY, 1.15, wave9ExecCam.cameraZoomBlend);
    }
    if (entryFlyBlend > 0.001) {
      this.smoothLookX = THREE.MathUtils.lerp(desiredLookX, this.arenaEntryStartLook.x, entryFlyBlend);
      this.smoothLookZ = THREE.MathUtils.lerp(desiredLookZ, this.arenaEntryStartLook.z, entryFlyBlend);
      desiredLookY = THREE.MathUtils.lerp(desiredLookY, this.arenaEntryStartLook.y, entryFlyBlend);
    } else {
      this.smoothLookX = THREE.MathUtils.damp(this.smoothLookX, desiredLookX, 6.5, dt);
      this.smoothLookZ = THREE.MathUtils.damp(this.smoothLookZ, desiredLookZ, 6.5, dt);
    }
    _v1.set(this.smoothLookX, desiredLookY, this.smoothLookZ);
    this.camera.lookAt(_v1);
    if (shakeRollZ !== 0) {
      this.camera.rotation.z += shakeRollZ;
    }
  }

  private findNearestEnemy(
    x: number,
    z: number,
    excludeIds?: Set<number>,
    maxDist = Infinity
  ): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = maxDist;
    for (const e of this.enemies) {
      if (e.dead || excludeIds?.has(e.id)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private triggerWave9ArenaProp(prop: {
    x: number;
    z: number;
    radius: number;
    kind: ArenaPropKind;
    alive: boolean;
    group: THREE.Group;
    core: THREE.Mesh;
    ring: THREE.Mesh;
  }): void {
    if (!prop.alive) return;
    prop.alive = false;
    const cfg = ARENA_PROP_CONFIGS[prop.kind];
    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const reward = resolveArenaPropActivation(prop.kind, this.maxHp, atkPower);

    const pan = computeSpatialPan(prop.x, ARENA_HALF_W);
    soundEngine.playResonanceTrapDetonate(
      prop.kind === 'celestial_obelisk' ? 'storm_pylon' : 'ember_crucible',
      pan
    );
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
    this.spawnShockwave(prop.x, prop.z, cfg.primaryHex, reward.aoeRadius, 0.45);
    this.spawnArmorShards(prop.x, 1.0, prop.z, cfg.metalHex, 10);
    this.spawnParticles(prop.x, 1.1, prop.z, cfg.accentHex, 22);
    this.spawnImpactLight(prop.x, 1.4, prop.z, 'super_crit');

    if (reward.healAmount > 0) {
      this.hp = Math.min(this.maxHp, this.hp + reward.healAmount);
      this.emitFloatingNumber(this.px, 2.0, this.pz, reward.healAmount, false, true);
    }
    if (reward.shieldAmount > 0) {
      this.shield = Math.min(Math.round(this.maxHp * 0.55), this.shield + reward.shieldAmount);
    }
    if (reward.ultGain > 0) {
      this.ultCharge = Math.min(100, this.ultCharge + reward.ultGain);
    }
    if (reward.goldBonus > 0) {
      this.runGold += reward.goldBonus;
    }
    if (reward.aspdBonusPct > 0 || reward.atkBonusPct > 0) {
      this.wave9PropBuffTimer = reward.buffDurationSec;
      this.wave9PropAtkBonusPct = Math.max(this.wave9PropAtkBonusPct, reward.atkBonusPct);
      this.wave9PropAspdBonusPct = Math.max(this.wave9PropAspdBonusPct, reward.aspdBonusPct);
      this.wave9PropBuffLabel = reward.calloutText;
      if (reward.aspdBonusPct > 0) {
        this.windBeaconSpeedTimer = Math.max(this.windBeaconSpeedTimer, reward.buffDurationSec);
      }
    } else {
      this.wave9PropBuffTimer = 2.6;
      this.wave9PropBuffLabel = reward.calloutText;
    }

    this.emitFloatingNumber(
      prop.x,
      2.1,
      prop.z,
      0,
      true,
      false,
      'fire',
      `${reward.label.toUpperCase()}!`,
      true
    );

    for (const en of [...this.enemies]) {
      if (!en || en.dead || en.spawnTimer > 0) continue;
      if (Math.hypot(en.x - prop.x, en.z - prop.z) <= reward.aoeRadius + en.radius) {
        this.damageEnemy(
          en,
          reward.aoeDamage,
          true,
          prop.kind === 'crimson_brazier',
          false,
          prop.kind === 'celestial_obelisk',
          false,
          reward.label.toUpperCase(),
          'elemental'
        );
      }
    }

    this.releaseObject(prop.group);
    this.syncHudImmediate();
  }

  private tryTriggerExecutionFinisherFromStrike(
    centerX: number,
    centerZ: number,
    maxRange: number
  ): void {
    const eligible = this.enemies.find((en) => {
      if (!en || en.dead || en.spawnTimer > 0) return false;
      if (en.isBoss && !en.isArenaRival && !this.activePowerPressure.allowInstantExecute) {
        return false;
      }
      if (Math.hypot(en.x - centerX, en.z - centerZ) > maxRange + en.radius) return false;
      const guardBroken = Boolean(
        (en.stunTimer && en.stunTimer > 0) ||
          (this.bossStaggerState &&
            this.bossStaggerOwnerId === en.id &&
            this.bossStaggerState.brokenRemainingSec > 0)
      );
      return isExecutionFinisherEligible({
        hp: en.hp,
        maxHp: en.maxHp,
        isBoss: en.isBoss,
        isElite: en.isElite,
        isTrainingDummy: en.isTrainingDummy,
        isVaultPillar: en.isVaultPillar,
        guardBroken,
      });
    });
    if (!eligible) return;

    this.executionFinisherTimer = EXECUTION_FINISHER_DURATION_SEC;
    this.executionFinisherFocusX = eligible.x;
    this.executionFinisherFocusZ = eligible.z;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    this.cinematicCamera = triggerCinematicCamera(
      'execution_finisher',
      eligible.x,
      eligible.z,
      prefersReducedMotion
    );

    const pan = computeSpatialPan(eligible.x, ARENA_HALF_W);
    soundEngine.playBossFinisherBoom(pan);
    soundEngine.playBossBreakShatter(pan);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.085);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.56);
    this.spawnImpactLight(eligible.x, 2.0, eligible.z, 'ultimate');
    this.spawnCritStar(eligible.x, 1.5, eligible.z, 0xfde047, 2.6);

    // 5 converging Golden Star-Spear beams from overhead arc radii
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const sx = eligible.x + Math.cos(ang) * 3.8;
      const sz = eligible.z + Math.sin(ang) * 3.8;
      this.spawnLightningArc(sx, 7.6, sz, eligible.x, 0.65, eligible.z);
    }
    this.spawnUltColumn(eligible.x, eligible.z, 0xfbbf24, 0.65);
    this.spawnShockwave(eligible.x, eligible.z, 0xfde047, 6.2, 0.5);
    this.spawnArmorShards(eligible.x, 1.2, eligible.z, 0x38bdf8, 14);
    this.spawnParticles(eligible.x, 1.2, eligible.z, 0xfde047, 28);

    const execDmg =
      eligible.hp <= eligible.maxHp * 0.18
        ? Math.max(eligible.hp + 999, this.baseStats.attack * 4.5)
        : this.baseStats.attack * this.getCurrentAtkMultiplier() * 3.8;

    this.damageEnemy(
      eligible,
      execDmg,
      true,
      true,
      false,
      true,
      false,
      'KẾT LIỄU TINH GIỚI!',
      'ultimate',
      undefined,
      { attackerX: this.px, attackerZ: this.pz, bypassShield: true }
    );
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private emitFloatingNumber(
    wx: number,
    wy: number,
    wz: number,
    amount: number,
    isCrit: boolean,
    isHeal: boolean,
    element?: FloatingDamage['element'],
    label?: string,
    isSuperCrit = false
  ): void {
    if (!this.showDamageNumbersEnabled && !label) return;
    _v2.set(wx, wy, wz);
    _v2.project(this.camera);
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const projected = projectFloatingScreenPos(_v2.x, _v2.y, _v2.z, w, h, this.nextDmgId);
    if (!projected.visible) return;

    this.callbacks.onFloatingDamage({
      id: this.nextDmgId++,
      x: projected.x,
      y: projected.y,
      amount,
      isCrit,
      isSuperCrit,
      isHeal,
      label,
      element,
      createdAt: performance.now(),
    });
  }

  private getComboTierLabel(count: number): string {
    if (count >= 50) return 'THẦN THÁNH';
    if (count >= 30) return 'CUỒNG NỘ';
    if (count >= 15) return 'BÙNG NỔ';
    if (count >= 5) return 'LIÊN HOÀN';
    return '';
  }

  private syncHudImmediate(): void {
    const stage = this.currentChapter.stages[this.stageIndex];
    const boss = this.enemies.find((e) => e.isBoss && !e.isArenaRival && !e.isTrainingDummy);
    const nearestTarget = this.findNearestEnemy(this.px, this.pz, undefined, 18);
    const target = nearestTarget && !nearestTarget.isBoss ? nearestTarget : undefined;
    const campaignChapterId =
      (this.currentChapter.id === 1 || this.currentChapter.id === 2 || this.currentChapter.id === 3) &&
      !this.isSideModeActiveForBossModel() && !this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode
        ? this.currentChapter.id
        : undefined;
    const rival = this.enemies.find((e) => e.isArenaRival);
    const heroDef = HERO_MAP[this.baseStats.heroId] ?? HERO_MAP.aurelia;
    const elemDef = this.isElementalTowerMode ? ELEMENTAL_TOWER_MAP[this.elementalTowerId] : null;
    const isBossFloor = this.isTrainingMode || this.isArenaMode
      ? false
      : this.isGuildBossMode || this.isCoopRaidMode || this.isWorldBossMode
      ? true
      : this.isCrystalDefenseMode
      ? this.crystalWave >= 3 && (this.crystalWave === 3 || this.crystalWave >= 5)
      : this.isElementalTowerMode
      ? this.elementalTowerFloor % 3 === 0
      : this.isDailyRiftMode
      ? this.dailyRiftStageIdx >= this.dailyRiftTotalStages - 1
      : this.isBossRushMode
      ? true
      : this.isTowerMode
      ? this.towerFloor % 3 === 0
      : stage.isBossStage;

    const guardAction =
      boss?.bossAiState?.activeAction?.kind === 'guard' ? boss.bossAiState.activeAction : null;
    const activeBossTelegraph =
      boss && boss.spawnTimer <= 0 && (!boss.stunTimer || boss.stunTimer <= 0)
        ? mapBossTelegraphToHud({
            telegraphType: guardAction ? 'spiral' : boss.telegraphType,
            telegraphTimer: guardAction
              ? Math.max(0, guardAction.duration - guardAction.elapsed)
              : boss.telegraphTimer,
            telegraphDuration: guardAction ? guardAction.duration : boss.telegraphDuration,
            bossPhase: boss.bossPhase ?? 1,
            skillLabel: boss.bossAiState?.activeSkillLabel,
            actionHint: boss.bossAiState?.activeActionHint,
          })
        : null;
    if (boss && activeBossTelegraph) {
      const telegraphKey = `${boss.id}:${guardAction ? 'guard' : boss.telegraphType}:${boss.bossAiState?.activeSkillId ?? ''}:${Math.round((guardAction ? guardAction.duration : boss.telegraphDuration) * 10)}`;
      if (telegraphKey !== this.lastBossTelegraphKey) {
        this.lastBossTelegraphKey = telegraphKey;
        const pan = computeSpatialPan(boss.x, this.px);
        soundEngine.playBossTelegraphWarning(activeBossTelegraph.kind, pan);
      }
    } else if (this.lastBossTelegraphKey !== '') {
      this.lastBossTelegraphKey = '';
    }

    this.callbacks.onHudUpdate({
      hp: this.hp,
      maxHp: this.maxHp,
      shield: this.shield,
      xp: this.xp,
      xpToNext: this.xpToNext,
      level: this.level,
      stage:
        this.isArenaMode || this.isGuildBossMode || this.isCoopRaidMode || this.isWorldBossMode || this.isGuildWarMode
          ? 1
          : this.isChampionshipMode
          ? Math.max(1, this.championshipRound)
          : this.isPantheonMode
          ? Math.max(1, this.pantheonStage)
          : this.isAbyssalMode
          ? Math.max(1, this.abyssalWave)
          : this.isBloodMoonMode
          ? Math.max(1, this.bloodMoonWave)
          : this.isCrystalDefenseMode
          ? this.crystalWave
          : this.isElementalTowerMode
          ? this.elementalTowerFloor
          : this.isDailyRiftMode
          ? this.dailyRiftStageIdx + 1
          : this.isBossRushMode
          ? this.bossRushRound
          : this.isTowerMode
          ? this.towerFloor
          : stage.stageNumber,
      totalStages:
        this.isArenaMode || this.isGuildBossMode || this.isCoopRaidMode || this.isWorldBossMode || this.isGuildWarMode
          ? 1
          : this.isChampionshipMode
          ? CHAMPIONSHIP_TOTAL_ROUNDS
          : this.isPantheonMode
          ? PANTHEON_TOTAL_STAGES
          : this.isAbyssalMode
          ? ABYSSAL_GAUNTLET_TOTAL_WAVES
          : this.isBloodMoonMode
          ? Math.max(1, this.bloodMoonWave)
          : this.isCrystalDefenseMode
          ? CRYSTAL_DEFENSE_TOTAL_WAVES
          : this.isElementalTowerMode
          ? this.elementalTowerFloor
          : this.isDailyRiftMode
          ? this.dailyRiftTotalStages
          : this.isBossRushMode
          ? this.bossRushTotalRounds
          : this.isTowerMode
          ? this.towerFloor
          : this.currentChapter.stages.length,
      stageName: this.isTrainingMode
        ? this.trainingTargetMode === 'single'
          ? 'Sân Tập 3D · Đơn Mục Tiêu (Boss)'
          : 'Sân Tập 3D · 3 Mục Tiêu (AoE)'
        : this.isChampionshipMode
        ? `Giải Đấu Quán Quân 3D · Hiệp ${Math.max(1, this.championshipRound)}/${CHAMPIONSHIP_TOTAL_ROUNDS}`
        : this.isPantheonMode
        ? `Viễn Chinh Điện Thần · Tầng ${Math.max(1, this.pantheonStage)}/${PANTHEON_TOTAL_STAGES}`
        : this.isAbyssalMode
        ? `Hố Sâu Đột Biến · Đợt ${Math.max(1, this.abyssalWave)}/${ABYSSAL_GAUNTLET_TOTAL_WAVES}`
        : this.isGuildWarMode
        ? `Chiến Trường Bang · Trụ ${this.guildWarNodesCaptured}/3`
        : this.isBloodMoonMode
        ? `Đêm Trăng Máu · Đợt ${Math.max(1, this.bloodMoonWave)}`
        : this.isCrystalDefenseMode
        ? `Thủ Thành Pha Lê · Đợt ${this.crystalWave}/${CRYSTAL_DEFENSE_TOTAL_WAVES}`
        : this.isWorldBossMode
        ? 'Boss Thế Giới Liên Server · 60s'
        : this.isCoopRaidMode
        ? `Phó Bản Hợp Tác AI · ${COOP_DIFFICULTY_MAP[this.coopDifficulty].name}`
        : this.isElementalTowerMode && elemDef
        ? `${elemDef.name} · Tầng ${this.elementalTowerFloor}`
        : this.isArenaMode
        ? `Đấu Trường Arena · ${this.arenaOpponentName}`
        : this.isGuildBossMode
        ? 'Boss Bang Hội · Đấu Trường 60s'
        : this.isDailyRiftMode
        ? `Bí Cảnh Hằng Ngày · Ải ${this.dailyRiftStageIdx + 1}/${this.dailyRiftTotalStages}`
        : this.isBossRushMode
        ? `Săn Boss Liên Hoàn · Vòng ${this.bossRushRound}/${this.bossRushTotalRounds}`
        : this.isTowerMode
        ? `Tháp Vô Tận · Tầng ${this.towerFloor}`
        : stage.name,
      chapterName: this.isTrainingMode
        ? 'Sân Tập 3D'
        : this.isCrystalVaultMode
        ? 'Hầm Mỏ Kho Báu'
        : this.isChampionshipMode
        ? 'Giải Đấu Quán Quân'
        : this.isPantheonMode
        ? 'Điện Thần 3D'
        : this.isAbyssalMode
        ? 'Hố Sâu Đột Biến'
        : this.isGuildWarMode
        ? 'Chiến Trường Bang'
        : this.isBloodMoonMode
        ? 'Đêm Trăng Máu'
        : this.isCrystalDefenseMode
        ? 'Thủ Thành Pha Lê'
        : this.isWorldBossMode
        ? 'Boss Thế Giới'
        : this.isCoopRaidMode
        ? 'Co-op AI 3D'
        : this.isElementalTowerMode && elemDef
        ? elemDef.name
        : this.isArenaMode
        ? 'Arena 1v1'
        : this.isGuildBossMode
        ? 'Boss Bang'
        : this.isDailyRiftMode
        ? 'Bí Cảnh'
        : this.isBossRushMode
        ? 'Săn Boss'
        : this.isTowerMode
        ? 'Tháp Vô Tận'
        : this.nightmareTier > 0
        ? `${this.currentChapter.zodiacName} · ${this.nightmareConfig.label}`
        : this.currentChapter.zodiacName,
      chapterId: this.currentChapter.id,
      heroName: this.baseStats.heroName,
      heroId: this.baseStats.heroId,
      skinId: this.heroVisualCfg?.skinId ?? 'default',
      enemiesRemaining: this.enemies.length,
      portalOpen: this.portalOpen,
      isBossStage: isBossFloor || this.isPantheonMode || this.isChampionshipMode,
      lastPlayerHitAt: this.lastPlayerHitAt,
      lastHitAngleDeg: this.lastHitAngleDeg,
      runGold: this.runGold,
      runGems: this.runGems,
      kills: this.kills,
      dashCooldownRatio: Math.min(1, this.dashCooldown / 1.25),
      ultCharge: Math.min(100, Math.round(this.ultCharge)),
      ultName: heroDef.ultName,
      revivesLeft: this.revivesLeft,
      bossName: boss
        ? boss.bossTitle ||
          (this.isWorldBossMode
            ? 'Hắc Long Tinh Giới Liên Server'
            : this.isGuildBossMode
            ? 'Thái Cổ Ma Long Hoàng Đạo'
            : this.isDailyRiftMode
            ? `Thủ Lĩnh Bí Cảnh · ${this.dailyRiftPair?.title ?? ''}`
            : this.isBossRushMode
            ? `Boss Vòng ${this.bossRushRound} · ${this.currentChapter.bossName}`
            : this.isTowerMode
            ? `Thủ Lĩnh Tầng ${this.towerFloor} · ${this.currentChapter.bossName}`
            : stage.bossTitle || this.currentChapter.bossName)
        : this.isChampionshipMode && rival
        ? rival.bossTitle || this.championshipRivalName
        : null,
      bossEnemyKind: boss?.kind,
      weeklyBossId:
        this.isWeeklyRankedBossMode || this.isWeeklyBossPracticeMode
          ? this.weeklyBossId ?? undefined
          : undefined,
      activeTargetKind: target?.kind,
      activeTargetChapterId: target && campaignChapterId ? campaignChapterId : undefined,
      activeTargetName: target && campaignChapterId ? getEnemyLabel(target.kind, campaignChapterId) : undefined,
      activeTargetHpPct: target
        ? Math.max(0, Math.min(100, Math.round((target.hp / Math.max(1, target.maxHp)) * 100)))
        : undefined,
      bossHp: boss ? boss.hp : this.isChampionshipMode && rival ? rival.hp : 0,
      bossMaxHp: boss ? boss.maxHp : this.isChampionshipMode && rival ? rival.maxHp : 0,
      bossPhase: boss ? boss.bossPhase : 1,
      bossLayers:
        boss || (this.isChampionshipMode && rival)
          ? this.isWorldBossMode || this.isGuildBossMode || this.isPantheonMode
            ? 8
            : 5
          : undefined,
      bossCurrentLayer:
        boss || (this.isChampionshipMode && rival)
          ? Math.max(
              1,
              Math.ceil(
                (Math.max(0, (boss ?? rival)!.hp) / Math.max(1, (boss ?? rival)!.maxHp)) *
                  (this.isWorldBossMode || this.isGuildBossMode || this.isPantheonMode ? 8 : 5)
              )
            )
          : undefined,
      bossShield: (boss ?? rival)?.breakShield !== undefined ? Math.round((boss ?? rival)!.breakShield!) : undefined,
      bossMaxShield: (boss ?? rival)?.maxBreakShield,
      bossStunTimer: (boss ?? rival)?.stunTimer,
      bossBrokenBannerTimer: this.bossBrokenBannerTimer > 0 ? this.bossBrokenBannerTimer : undefined,
      bossPunishActive: Boolean(
        boss &&
          boss.punishWindowTimer &&
          boss.punishWindowTimer > 0 &&
          boss.telegraphType === 'none' &&
          (!boss.stunTimer || boss.stunTimer <= 0)
      ),
      bossPunishRatio:
        boss && boss.punishWindowMax && boss.punishWindowTimer && boss.punishWindowTimer > 0
          ? Math.max(0, Math.min(1, boss.punishWindowTimer / boss.punishWindowMax))
          : undefined,
      bossPunishBonusPct:
        boss && boss.bossPhase === 3
          ? Math.round(PUNISH_WINDOW_PHASE3_BONUS * 100)
          : Math.round(PUNISH_WINDOW_DAMAGE_BONUS * 100),
      bossPhaseTwoBannerTimer: this.bossPhaseTwoBannerTimer > 0 ? this.bossPhaseTwoBannerTimer : undefined,
      bossPhaseThreeBannerTimer:
        this.bossPhaseThreeBannerTimer > 0 ? this.bossPhaseThreeBannerTimer : undefined,
      activeBossTelegraph,
      activeEliteAffixLabel: (() => {
        const eliteWithAffix = this.enemies.find(
          (en) => en.isElite && !en.isBoss && (en.eliteAffix || (en.eliteAffixes && en.eliteAffixes.length > 0))
        );
        if (!eliteWithAffix) return undefined;
        const list =
          eliteWithAffix.eliteAffixes && eliteWithAffix.eliteAffixes.length > 0
            ? eliteWithAffix.eliteAffixes
            : eliteWithAffix.eliteAffix
            ? [eliteWithAffix.eliteAffix]
            : [];
        return list.length > 0
          ? `Tinh Anh · ${list.map((af) => ELITE_AFFIX_META[af].label).join(' + ')}`
          : undefined;
      })(),
      activeArenaHazardLabel:
        this.arenaHazards.length > 0 ? ARENA_HAZARD_META[this.arenaHazards[0].kind].label : undefined,
      isTowerMode: this.isTowerMode,
      towerFloor: this.towerFloor,
      isBossRushMode: this.isBossRushMode,
      bossRushRound: this.bossRushRound,
      bossRushTotalRounds: this.bossRushTotalRounds,
      isDailyRiftMode: this.isDailyRiftMode,
      dailyRiftTitle: this.dailyRiftPair?.title,
      isGuildBossMode: this.isGuildBossMode,
      guildBossTimeLeft: this.isGuildBossMode ? Math.ceil(this.guildBossTimeLeft) : undefined,
      guildBossTotalDamage: this.isGuildBossMode ? Math.round(this.guildBossTotalDamage) : undefined,
      isArenaMode: this.isArenaMode,
      arenaTimeLeft: this.isArenaMode ? Math.ceil(this.arenaTimeLeft) : undefined,
      arenaOpponentName: this.isArenaMode ? this.arenaOpponentName : undefined,
      arenaOpponentHp: this.isArenaMode ? (rival ? Math.max(0, Math.round(rival.hp)) : 0) : undefined,
      arenaOpponentMaxHp: this.isArenaMode ? (rival ? rival.maxHp : 1) : undefined,
      arenaAiTier: this.isArenaMode ? this.aiDuelTier : undefined,
      arenaAiTierLabel: this.isArenaMode ? this.aiRivalMatchConfig?.tierLabel : undefined,
      arenaAiRewardBonusPct: this.isArenaMode ? this.aiRivalMatchConfig?.rewardBonusPct : undefined,
      arenaOpponentShieldPct:
        this.isArenaMode && this.aiRivalBrainState && this.aiRivalBrainState.shieldMaxHp > 0
          ? Math.round((this.aiRivalBrainState.shieldHp / this.aiRivalBrainState.shieldMaxHp) * 100)
          : 0,
      arenaOpponentUltPct:
        this.isArenaMode && this.aiRivalBrainState
          ? Math.round(this.aiRivalBrainState.ultCharge)
          : undefined,
      arenaAiIntentLabel:
        this.isArenaMode && this.aiRivalBrainState
          ? this.aiRivalBrainState.activeIntentLabel
          : null,
      arenaAiEnraged:
        this.isArenaMode && this.aiRivalBrainState ? this.aiRivalBrainState.enraged : false,
      arenaSuddenDeathLabel: this.isArenaMode
        ? computeArenaSuddenDeath(this.arenaTimeLeft).label
        : null,
      arenaSuddenDeathMult: this.isArenaMode
        ? computeArenaSuddenDeath(this.arenaTimeLeft).damageMult
        : 1.0,
      arenaAiDodgesCount:
        this.isArenaMode && this.aiRivalBrainState
          ? this.aiRivalBrainState.aiDodgesPerformed
          : 0,
      pveChallengeTierLabel:
        !this.isArenaMode && !this.isTrainingMode && this.pveChallengeEnabled
          ? computePvEIntensityProfile(this.aiDuelTier, this.pveChallengeEnabled).tierLabel
          : null,
      isCoopRaidMode: this.isCoopRaidMode,
      coopDifficulty: this.isCoopRaidMode ? this.coopDifficulty : undefined,
      coopAllies: this.isCoopRaidMode
        ? this.coopAllies.map((a) => ({
            heroId: a.heroId,
            name: a.name,
            damage: Math.round(a.damageDealt),
            ultCharge: Math.round(a.ultCharge),
          }))
        : undefined,
      coopSynergy: this.isCoopRaidMode
        ? toHudCoopSynergy(
            this.coopSynergyClock,
            this.coopAllies.filter((a) => a.ultCharge >= 88).map((a) => a.name)
          )
        : null,
      coopTacticalOrder: this.isCoopRaidMode ? this.coopTacticalOrder : undefined,
      adaptiveFpsTier: this.adaptiveFpsGovernor.tier,
      adaptiveFpsAvg: Math.round(this.adaptiveFpsGovernor.avgFps),
      isElementalTowerMode: this.isElementalTowerMode,
      elementalTowerId: this.isElementalTowerMode ? this.elementalTowerId : undefined,
      elementalTowerFloor: this.isElementalTowerMode ? this.elementalTowerFloor : undefined,
      isCrystalDefenseMode: this.isCrystalDefenseMode,
      crystalWave: this.isCrystalDefenseMode ? this.crystalWave : undefined,
      crystalTotalWaves: this.isCrystalDefenseMode ? CRYSTAL_DEFENSE_TOTAL_WAVES : undefined,
      crystalHp: this.isCrystalDefenseMode ? Math.round(this.crystalHp) : undefined,
      crystalMaxHp: this.isCrystalDefenseMode ? Math.round(this.crystalMaxHp) : undefined,
      isWorldBossMode: this.isWorldBossMode,
      worldBossTimeLeft: this.isWorldBossMode ? Math.ceil(this.worldBossTimeLeft) : undefined,
      worldBossTotalDamage: this.isWorldBossMode ? Math.round(this.worldBossTotalDamage) : undefined,
      worldBossRank: this.isWorldBossMode
        ? computeWorldBossLiveRank(Math.round(this.worldBossTotalDamage))
        : undefined,
      isBloodMoonMode: this.isBloodMoonMode,
      bloodMoonTimeLeft: this.isBloodMoonMode ? Math.ceil(this.bloodMoonTimeLeft) : undefined,
      bloodMoonScore: this.isBloodMoonMode ? Math.round(this.bloodMoonScore) : undefined,
      bloodMoonWave: this.isBloodMoonMode ? this.bloodMoonWave : undefined,
      isAbyssalMode: this.isAbyssalMode,
      abyssalWave: this.isAbyssalMode ? this.abyssalWave : undefined,
      abyssalTotalWaves: this.isAbyssalMode ? ABYSSAL_GAUNTLET_TOTAL_WAVES : undefined,
      abyssalScore: this.isAbyssalMode ? Math.round(this.abyssalScore) : undefined,
      isGuildWarMode: this.isGuildWarMode,
      guildWarTimeLeft: this.isGuildWarMode ? Math.ceil(this.guildWarTimeLeft) : undefined,
      guildWarScore: this.isGuildWarMode ? Math.round(this.guildWarScore) : undefined,
      guildWarNodes: this.isGuildWarMode ? this.guildWarNodesCaptured : undefined,
      isPantheonMode: this.isPantheonMode,
      pantheonStage: this.isPantheonMode ? this.pantheonStage : undefined,
      pantheonTotalStages: this.isPantheonMode ? PANTHEON_TOTAL_STAGES : undefined,
      pantheonScore: this.isPantheonMode ? Math.round(this.pantheonScore) : undefined,
      pantheonBlessingTitle: this.isPantheonMode ? this.pantheonBlessing?.name : undefined,
      isChampionshipMode: this.isChampionshipMode,
      championshipRound: this.isChampionshipMode ? this.championshipRound : undefined,
      championshipTotalRounds: this.isChampionshipMode ? CHAMPIONSHIP_TOTAL_ROUNDS : undefined,
      championshipScore: this.isChampionshipMode ? Math.round(this.championshipScore) : undefined,
      championshipRivalName: this.isChampionshipMode ? this.championshipRivalName : undefined,
      championshipTacticsOffer: this.isChampionshipMode
        ? this.championshipTacticsOffer
        : null,
      isCrystalVaultMode: this.isCrystalVaultMode,
      vaultTimeLeft: this.isCrystalVaultMode ? Math.ceil(this.vaultTimeLeft) : undefined,
      vaultPillarsBroken: this.isCrystalVaultMode ? this.vaultPillarsBroken : undefined,
      vaultWave: this.isCrystalVaultMode ? this.vaultWave : undefined,
      vaultGemsLooted: this.isCrystalVaultMode ? this.vaultGemsLooted : undefined,
      vaultReforgeLooted: this.isCrystalVaultMode ? this.vaultReforgeLooted : undefined,
      vaultShardsLooted: this.isCrystalVaultMode ? this.vaultShardsLooted : undefined,
      isDragonLairMode: this.isDragonLairMode,
      dragonTimeLeft: this.isDragonLairMode ? Math.ceil(this.dragonTimeLeft) : undefined,
      dragonPhase: this.isDragonLairMode ? this.dragonPhase : undefined,
      dragonBreathWarning: this.isDragonLairMode ? this.dragonBreathWarningTimer > 0 : undefined,
      dragonScalesLooted: this.isDragonLairMode ? this.dragonScalesLooted : undefined,
      dragonDamageDealt: this.isDragonLairMode ? Math.round(this.dragonDamageDealt) : undefined,
      isSkyCitadelMode: this.isSkyCitadelMode,
      skyCitadelTimeLeft: this.isSkyCitadelMode ? Math.ceil(this.skyCitadelTimeLeft) : undefined,
      skyCitadelWave: this.isSkyCitadelMode ? this.skyCitadelWave : undefined,
      skyCitadelScore: this.isSkyCitadelMode ? Math.round(this.skyCitadelScore) : undefined,
      skyCitadelFeathersLooted: this.isSkyCitadelMode ? this.skyCitadelFeathersLooted : undefined,
      bossWarningTitle: this.bossWarningTimer > 0 ? this.bossWarningTitle : null,
      bossWarningSubtitle: this.bossWarningTimer > 0 ? this.bossWarningSubtitle : null,
      bossWarningTimer: this.bossWarningTimer > 0 ? this.bossWarningTimer : undefined,
      bossEntranceActive: this.isBossEntranceLocked(),
      bossEntranceRemainingSec: this.isBossEntranceLocked()
        ? Number(this.bossEntranceTimer.toFixed(1))
        : 0,
      bossEntranceTotalSec: this.bossEntranceDuration,
      bossEntranceBossName: this.isBossEntranceLocked() ? this.bossEntranceBossName : null,
      bossEntranceStageLabel: this.isBossEntranceLocked()
        ? evaluateBossEntranceState(this.bossEntranceTimer, this.bossEntranceDuration).stageLabel
        : null,
      activeSkills: { ...this.activeSkills },
      activeSynergies: evaluateActiveSynergies(this.activeSkills),
      stageBannerText: this.stageBannerText,
      comboCount: this.comboCount,
      comboTimerRatio: this.comboCount > 0 ? Math.max(0, this.comboTimer / this.comboWindow) : 0,
      comboTierLabel: getComboTierMeta(this.comboCount).tierLabel,
      comboDmgBonusPct: getComboTierMeta(this.comboCount).dmgBonusPct,
      radarData: {
        playerX: Math.max(-1, Math.min(1, this.px / ARENA_HALF_W)),
        playerZ: Math.max(-1, Math.min(1, this.pz / ARENA_HALF_D)),
        playerYaw: this.pFacing,
        portalOpen: this.portalOpen,
        enemies: this.enemies.slice(0, 24).map((en) => ({
          x: Math.max(-1, Math.min(1, en.x / ARENA_HALF_W)),
          z: Math.max(-1, Math.min(1, en.z / ARENA_HALF_D)),
          isBoss: en.isBoss,
          isElite: en.isElite,
        })),
        drops: this.lootOrbs
          .filter((orb) => orb.active && orb.kind !== 'xp')
          .slice(0, 12)
          .map((orb) => ({
            x: Math.max(-1, Math.min(1, orb.x / ARENA_HALF_W)),
            z: Math.max(-1, Math.min(1, orb.z / ARENA_HALF_D)),
            kind: (orb.kind === 'gold' || orb.kind === 'gem' ? orb.kind : 'heal') as 'gold' | 'gem' | 'heal',
          })),
      },
      // Phase 5 HUD telemetry
      activeSkillName: getHeroActiveSkill(this.baseStats.heroId).shortLabel,
      activeSkillCooldownRatio: Math.min(
        1,
        this.activeSkillCooldown / Math.max(0.1, this.activeSkillMaxCooldown)
      ),
      activeSkillCooldownSec:
        this.activeSkillCooldown > 0 ? Number(this.activeSkillCooldown.toFixed(1)) : 0,
      activeSkillReady: this.activeSkillCooldown <= 0.05 && !this.isBossEntranceLocked(),
      perfectDodgeBannerTimer:
        this.perfectDodgeBannerTimer > 0 ? this.perfectDodgeBannerTimer : undefined,
      perfectDodgeBuffTimer:
        this.perfectDodgeBuffTimer > 0 ? Number(this.perfectDodgeBuffTimer.toFixed(1)) : undefined,
      perfectDodgeCount: this.perfectDodgeCount,
      nightmareTier: this.nightmareTier > 0 ? this.nightmareTier : undefined,
      nightmareMutatorLabels:
        this.nightmareTier > 0 ? this.nightmareConfig.mutators.map((m) => m.name) : undefined,
      cinematicBarRatio: Math.max(
        computeBossIntroBlend(this.bossIntroTimer, this.bossIntroDuration),
        computeBossEntranceCameraBlend(this.bossEntranceTimer, this.bossEntranceDuration),
        computeBossKillSlowMoState(this.bossFinisherTimer, this.bossFinisherDuration).letterboxRatio
      ),
      bossFinisherTimer: this.bossFinisherTimer > 0 ? this.bossFinisherTimer : undefined,
      bossFinisherName: this.bossFinisherTimer > 0 ? this.bossFinisherName : null,
      synergyAwakenedName: this.synergyAwakenedTimer > 0 ? this.synergyAwakenedName : null,
      synergyAwakenedTimer: this.synergyAwakenedTimer > 0 ? this.synergyAwakenedTimer : undefined,
      ultCutinTimer: this.ultCutinTimer > 0 ? this.ultCutinTimer : undefined,
      ultCutinTitle: this.ultCutinTimer > 0 ? this.ultCutinTitle : null,
      ultCutinHeroName: this.ultCutinTimer > 0 ? this.ultCutinHeroName : null,
      ultCutinAccentHex: this.ultCutinTimer > 0 ? this.ultCutinAccentHex : null,
      bossPhaseShiftTimer: this.bossPhaseShiftTimer > 0 ? this.bossPhaseShiftTimer : undefined,
      bossPhaseShiftLevel: this.bossPhaseShiftTimer > 0 ? this.bossPhaseShiftLevel : null,
      edgeThreats: (() => {
        if (this.phase !== GamePhase.PLAYING) return undefined;
        this.threatSamplesBuf.length = 0;
        for (let i = 0; i < this.enemies.length; i++) {
          const en = this.enemies[i];
          if (en.spawnTimer > 0 || en.isTrainingDummy) continue;
          if (en.telegraphType !== 'none' || (en.isBoss && en.attackTimer < 0.65)) {
            this.threatSamplesBuf.push({
              x: en.x,
              z: en.z,
              kind: 'boss_charge',
              urgent: en.isBoss || en.telegraphType === 'lunge' || en.telegraphType === 'lane',
            });
          }
        }
        for (let i = 0; i < this.enemyOrbPool.length; i++) {
          const orb = this.enemyOrbPool[i];
          if (!orb.active) continue;
          this.threatSamplesBuf.push({
            x: orb.x,
            z: orb.z,
            kind: 'orb',
            urgent:
              orb.enemySourceKind === 'boss_lane' || orb.enemySourceKind === 'boss_projectile',
          });
        }
        const arrows = computeEdgeThreatIndicators(this.px, this.pz, this.threatSamplesBuf, 4);
        return arrows.length > 0 ? arrows : undefined;
      })(),
      biomeWeatherLabel: resolveChapterBiomeAtmosphere(
        this.currentChapter.zodiacId,
        boss?.bossPhase ?? 1
      ).weatherLabel,
      counterShotReady: this.counterShotTimer > 0,
      counterShotTimer: this.counterShotTimer > 0 ? this.counterShotTimer : undefined,
      gamepadConnected: this.gamepadConnected || undefined,
      elementalReactionsCount: this.elementalReactionsCount || undefined,
      ...(() => {
        const liveDps = computeRollingDpsMetrics(this.rollingDps, this.runElapsedSeconds, 5.0);
        const fpsRead = this.showFpsOverlay ? readFpsMetrics(this.fpsSampler) : null;
        return {
          liveDps5s: liveDps.dps5s,
          livePeakCrit: liveDps.peakCrit,
          astralOverchargeRatio: Number(this.astralOvercharge.toFixed(2)),
          roomBounty: toRoomBountySnapshot(this.roomBounty),
          roomBountyBanner: this.roomBountyBannerTimer > 0 ? this.roomBountyBanner : null,
          cameraPresetToast: this.cameraPresetToastTimer > 0 ? this.cameraPresetToast : null,
          fps: fpsRead?.fps,
          frameTimeMs: fpsRead?.frameTimeMs,
          bossWeakPointActive: Boolean(this.bossWeakPointState?.active),
          bossWeakPointTimer: this.bossWeakPointState?.active
            ? Number(this.bossWeakPointState.remainingSec.toFixed(1))
            : undefined,
          ...(() => {
            if (!boss || !this.isTimedEnrageEnabledForBoss(boss) || !boss.bossAiState) {
              return {};
            }
            const mods = this.getBossTimedEnrageMods(boss);
            return {
              bossEnrageRemainingSec: Number(mods.remainingSec.toFixed(1)),
              bossTimedEnraged: mods.active || undefined,
            };
          })(),
          trapTriggerToast: this.trapTriggerToastTimer > 0 ? this.trapTriggerToast : null,
        };
      })(),
      // Wave 2 AAA + Pillar 5 Real-Time AI & Diagnostics
      autoPilotEnabled:
        this.autoPilotEnabled && !(this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode),
      autoPilotTactic: this.autoPilotTactic,
      autoPilotLockedReason:
        this.isWeeklyRankedBossMode && !this.isWeeklyBossPracticeMode
          ? 'Khóa AI ở Boss Tuần Tính Hạng'
          : null,
      autoPilotStatusText: this.autoPilotStatusText,
      autoPilotManualOverride: this.autoPilotManualOverride || undefined,
      aiSquadAllies:
        this.coopAllies.length > 0
          ? this.coopAllies.map((a, idx) => ({
              role: a.role ?? (idx === 0 ? 'ranger' : 'mystic'),
              roleLabel: a.roleLabel ?? (idx === 0 ? 'Xạ Thủ' : 'Pháp Sư'),
              name: a.name,
              hpPct: 100,
              damage: Math.round(a.damageDealt),
              ultCharge: Math.round(a.ultCharge),
              callout: a.calloutTimer && a.calloutTimer > 0 ? a.calloutText : null,
            }))
          : undefined,
      isWeeklyRankedBossMode: this.isWeeklyRankedBossMode || undefined,
      isWeeklyBossPracticeMode: this.isWeeklyBossPracticeMode || undefined,
      weeklyBossTimeLeft: this.isWeeklyRankedBossMode ? Math.ceil(this.weeklyBossTimeLeft) : undefined,
      weeklyBossTotalDamage: this.isWeeklyRankedBossMode
        ? Math.round(this.weeklyBossTotalDamage)
        : undefined,
      bossStaggerRatio:
        this.bossStaggerState && boss && boss.id === this.bossStaggerOwnerId
          ? this.bossStaggerState.brokenRemainingSec > 0
            ? 1
            : Math.max(
                0,
                Math.min(1, this.bossStaggerState.current / Math.max(1, this.bossStaggerState.max))
              )
          : boss && boss.maxBreakShield && boss.maxBreakShield > 0 && boss.breakShield !== undefined
          ? Math.max(0, Math.min(1, 1 - boss.breakShield / boss.maxBreakShield))
          : undefined,
      bossStaggerBroken: Boolean(
        (this.bossStaggerState &&
          this.bossStaggerState.brokenRemainingSec > 0 &&
          boss &&
          boss.id === this.bossStaggerOwnerId) ||
          (boss && boss.stunTimer && boss.stunTimer > 0)
      ),
      bossStaggerBrokenSec:
        this.bossStaggerState && this.bossStaggerState.brokenRemainingSec > 0
          ? Number(this.bossStaggerState.brokenRemainingSec.toFixed(1))
          : boss && boss.stunTimer && boss.stunTimer > 0
          ? Number(boss.stunTimer.toFixed(1))
          : undefined,
      bossGuardBreaksTotal: this.runBossBreaksCount > 0 ? this.runBossBreaksCount : undefined,
      styleGrade: this.styleMomentum.score > 0 ? this.styleMomentum.grade : undefined,
      styleScore: this.styleMomentum.score > 0 ? Math.round(this.styleMomentum.score) : undefined,
      styleFillRatio:
        this.styleMomentum.score > 0
          ? Number(getStyleFillRatio(this.styleMomentum.score).toFixed(2))
          : undefined,
      coopPingToast: this.coopPingToastTimer > 0 ? this.coopPingToast : null,
      liveAiRivalTag: this.isArenaMode ? this.liveAiRivalTag : null,
      isArenaEqualized: this.isArenaMode ? this.isArenaEqualized : undefined,
      counterWindowRemainingSec:
        this.perfectDodgeCounter.windowRemainingSec > 0
          ? Number(this.perfectDodgeCounter.windowRemainingSec.toFixed(2))
          : undefined,
      counterChargesRemaining:
        this.perfectDodgeCounter.chargesRemaining > 0
          ? this.perfectDodgeCounter.chargesRemaining
          : undefined,
      counterTotalLanded:
        this.perfectDodgeCounter.totalCountersLanded > 0
          ? this.perfectDodgeCounter.totalCountersLanded
          : undefined,
      bossPace: this.isWeeklyRankedBossMode ? this.bossPaceHud : null,
      coopRoleSynergyLabel:
        this.isCoopRaidMode && this.coopRoleSynergy ? this.coopRoleSynergy.teamBadge : null,
      activeWeatherLabel:
        this.starfallEnabled ? WEATHER_BIOME_PROFILES[this.activeWeatherBiome]?.label ?? null : null,
      combatLightingMood: this.combatLightingState.mood,
      perfDrawCalls: this.showFpsOverlay ? this.renderer.info.render.calls : undefined,
      perfSimHz: this.showFpsOverlay ? 60 : undefined,
      isTrainingMode: this.isTrainingMode || undefined,
      trainingTargetMode: this.isTrainingMode ? this.trainingTargetMode : undefined,
      ...(this.isTrainingMode
        ? (() => {
            const snap = computeTrainingDpsSnapshot(this.trainingDpsState, this.trainingClockSec);
            return {
              trainingDps5s: snap.dps5s,
              trainingPeakDps: snap.peakDps,
              trainingTotalDamage: snap.totalDamage,
              trainingCritRatePct: snap.critRatePct,
              trainingHits: snap.hits,
            };
          })()
        : {}),
      heavyBreakCooldownRatio: Math.min(1, this.heavyBreakCooldown / HEAVY_BREAK_COOLDOWN_SEC),
      heavyBreakCooldownSec:
        this.heavyBreakCooldown > 0 ? Number(this.heavyBreakCooldown.toFixed(1)) : 0,
      heavyBreakReady: this.heavyBreakCooldown <= 0.05,
      comboBeat: this.comboBeat,
      comboBeatFinisherReady: this.comboBeat === 4,
      activeRoomEvent: this.activeRoomChaosEvent
        ? {
            id: this.activeRoomChaosEvent.id,
            title: this.activeRoomChaosEvent.title,
            subtitle: this.activeRoomChaosEvent.subtitle,
            accentHex: this.activeRoomChaosEvent.accentHex,
          }
        : null,
      bossTotemsAlive: this.enemies.filter((en) => en.isBossTotem && en.hp > 0).length,
      ambushBossActive: this.enemies.some((en) => Boolean(en.ambushBounty) && en.hp > 0),
      phaseCounterWindowSec:
        this.bossPhaseCounterTimer > 0 ? Number(this.bossPhaseCounterTimer.toFixed(1)) : undefined,
      phaseCounterWindowTotalSec: BOSS_PHASE_COUNTER_WINDOW_SEC,
      phaseCounterReady: this.bossPhaseCounterTimer > 0,
      finisherReadyTargetName: (() => {
        const execCand = this.enemies.find((en) => {
          if (!en || en.dead || en.spawnTimer > 0) return false;
          if (en.isBoss && !en.isArenaRival && !this.activePowerPressure.allowInstantExecute) {
            return false;
          }
          const gb = Boolean(
            (en.stunTimer && en.stunTimer > 0) ||
              (this.bossStaggerState &&
                this.bossStaggerOwnerId === en.id &&
                this.bossStaggerState.brokenRemainingSec > 0)
          );
          return isExecutionFinisherEligible({
            hp: en.hp,
            maxHp: en.maxHp,
            isBoss: en.isBoss,
            isElite: en.isElite,
            isTrainingDummy: en.isTrainingDummy,
            isVaultPillar: en.isVaultPillar,
            guardBroken: gb,
          });
        });
        return execCand
          ? execCand.bossTitle || (execCand.isBoss ? 'Thủ Lĩnh' : 'Tinh Anh')
          : null;
      })(),
      finisherTargetHpPct: (() => {
        const execCand = this.enemies.find((en) => {
          if (!en || en.dead || en.spawnTimer > 0) return false;
          if (en.isBoss && !en.isArenaRival && !this.activePowerPressure.allowInstantExecute) {
            return false;
          }
          const gb = Boolean(
            (en.stunTimer && en.stunTimer > 0) ||
              (this.bossStaggerState &&
                this.bossStaggerOwnerId === en.id &&
                this.bossStaggerState.brokenRemainingSec > 0)
          );
          return isExecutionFinisherEligible({
            hp: en.hp,
            maxHp: en.maxHp,
            isBoss: en.isBoss,
            isElite: en.isElite,
            isTrainingDummy: en.isTrainingDummy,
            isVaultPillar: en.isVaultPillar,
            guardBroken: gb,
          });
        });
        return execCand ? Math.max(1, Math.round((execCand.hp / Math.max(1, execCand.maxHp)) * 100)) : null;
      })(),
      arenaPropsRemaining: this.wave9Props.filter((p) => p.alive).length,
      arenaPropBuffLabel: this.wave9PropBuffTimer > 0 ? this.wave9PropBuffLabel : null,
      coopSanctuaryCooldownSec:
        this.coopSanctuaryCooldown > 0 ? Number(this.coopSanctuaryCooldown.toFixed(1)) : 0,
      coopSanctuaryActiveSec:
        this.coopSanctuaryActiveTimer > 0 ? Number(this.coopSanctuaryActiveTimer.toFixed(1)) : 0,
      coopPrimerBanner: this.coopPrimerBannerTimer > 0 ? this.coopPrimerBanner : null,
      bossParts: (() => {
        const activeBoss = this.enemies.find(
          (en) => en.isBoss && !en.isArenaRival && !en.isTrainingDummy && en.hp > 0
        );
        if (!activeBoss?.bossParts || activeBoss.bossParts.length === 0) return undefined;
        return activeBoss.bossParts.map((bp) => ({
          id: bp.id,
          label: bp.label,
          hp: Math.max(0, Math.round(bp.hp)),
          maxHp: Math.max(1, Math.round(bp.maxHp)),
          broken: bp.broken,
          debuffLabel: bp.debuffLabel,
        }));
      })(),
      bossPartBrokenBanner:
        this.bossPartBrokenBannerTimer > 0 ? this.bossPartBrokenBanner : null,
      elementalResonance: {
        stack: this.elementalResonance.stack,
        maxStack: this.elementalResonance.maxStack,
        recentElements: [...this.elementalResonance.recentElements],
        burstBannerText:
          this.elementalResonance.burstBannerTimerSec > 0
            ? this.elementalResonance.burstBannerText
            : null,
      },
      aiAdaptationBadge: this.aiAdaptationProfile
        ? `${this.aiAdaptationProfile.counterInsightLabel} · né ${
            this.aiAdaptationProfile.dodgeBias === 'left'
              ? 'Trái'
              : this.aiAdaptationProfile.dodgeBias === 'right'
              ? 'Phải'
              : 'Cân bằng'
          }`
        : null,
      trialGauntletRound: this.trialGauntletRound,
      guildWarBastionLabel: this.guildWarBastionLabel,
      weaponOverdrive: {
        charge: Math.round(this.weaponOverdrive.charge),
        active: this.weaponOverdrive.active,
        remainingSec: Number(this.weaponOverdrive.activeRemainingSec.toFixed(1)),
        maxDurationSec: this.weaponOverdrive.maxDurationSec,
        stanceLabel: this.weaponOverdrive.stanceLabel,
      },
      activeRiftMutators: this.isEqualizedRiftMode ? this.equalizedRiftMutatorsLabel : null,
      equalizedRiftFloor: this.isEqualizedRiftMode ? this.towerFloor : null,
      squadFormationId: this.squadFormationId,
      squadPingBanner: this.squadPingBannerTimer > 0 ? this.squadPingBanner : null,
      interactiveHazardsRemaining: this.wave11Hazards.filter((h) => !h.spec.detonated).length,
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.chapter1MapLoading = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.pendingGpuSync) {
      (this.renderer.getContext() as WebGL2RenderingContext).deleteSync(this.pendingGpuSync);
      this.pendingGpuSync = null;
    }

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    if (this.artemisModel) {
      this.releaseObject(this.artemisModel);
      this.artemisModel = undefined;
      this.artemisMotion = undefined;
    }
    if (this.chapter1MapModel) {
      this.releaseObject(this.chapter1MapModel);
      this.chapter1MapModel = null;
    }
    if (this.solarLeoHeroRig) {
      this.releaseObject(this.solarLeoHeroRig.group);
      this.solarLeoHeroRig = undefined;
    }
    if (this.solarLeoMountRig) {
      this.releaseObject(this.solarLeoMountRig.group);
      this.solarLeoMountRig = undefined;
    }
    if (this.solarLeoWingRig) {
      this.releaseObject(this.solarLeoWingRig.group);
      this.solarLeoWingRig = undefined;
    }
    if (this.solarLeoHaloRig) {
      this.releaseObject(this.solarLeoHaloRig.group);
      this.solarLeoHaloRig = undefined;
    }
    if (this.solarLeoArtifactRig) {
      this.releaseObject(this.solarLeoArtifactRig.group);
      this.solarLeoArtifactRig = undefined;
    }
    if (this.solarLeoPetRig) {
      this.releaseObject(this.solarLeoPetRig.group);
      this.solarLeoPetRig = undefined;
    }
    this.releaseObject(this.scene);
    disposeChapter1RosterTemplateCache();
    disposeSolarLeoTemplateCache();
    this.disposePostProcessing();
    this.contactShadowTex.dispose();
    this.keyLight.shadow.dispose();
    this.envRenderTarget?.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
    void _mat4;
    void _v3;
  }
}
