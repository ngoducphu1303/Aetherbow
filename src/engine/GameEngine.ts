import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeObjectResources } from './resources';
import { createArtemisMotion } from './artemisMotion';
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
  ComputedPlayerStats,
  CoopAllySummary,
  CoopRaidDifficulty,
  ArenaHazardType,
  DailyRiftMutatorPair,
  DamageBreakdown,
  DefeatCauseInfo,
  ElementalTowerId,
  EliteAffix,
  EnemyKind,
  FloatingDamage,
  GamePhase,
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
  RuneId,
  SanctuaryFloorId,
  SkillId,
  SkillSynergyId,
  StageEventAfter,
  WheelOutcome,
} from '../types/game';
import {
  createAncientDragonBossModel,
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
  createUrnModel,
  createVaultCrystalPillarModel,
  EnemyModelRefs,
  HeroModelRefs,
  HeroVisualConfig,
  SpiritCrystalRefs,
} from './models';
import {
  createContactShadowTexture,
  createStoneBumpTexture,
  createStoneTileTexture,
  createTargetReticleTexture,
} from './textures';

// Pre-allocated math & color helpers for zero GC in tick
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _dummy = new THREE.Object3D();
const _skyCol = new THREE.Color();
const _fogCol = new THREE.Color();
const _keyCol = new THREE.Color();
const _hemiSkyCol = new THREE.Color();
const _hemiGndCol = new THREE.Color();
const _starCol = new THREE.Color();

const ARENA_HALF_W = 10.5;
const ARENA_HALF_D = 12.2;

interface ObstacleBox {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
}

interface BreakableUrn {
  x: number;
  z: number;
  radius: number;
  alive: boolean;
  mesh: THREE.Group;
  shadow: THREE.Mesh;
}

interface EnemyEntity {
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
  isVaultPillar?: boolean;
  isGoldenPillar?: boolean;
  isTrainingDummy?: boolean;
  burnTimer: number;
  burnDps: number;
  poisonDps: number;
  chillTimer: number;
  hitFlashTimer: number;
  phaseAngle: number;
  model: EnemyModelRefs;
  shadow: THREE.Mesh;
  telegraphGroup: THREE.Group;
  telegraphOuterRing?: THREE.Mesh;
  telegraphFill: THREE.Mesh;
  punishRingMesh?: THREE.Mesh;
  eliteAffix?: EliteAffix;
  eliteAffixes?: EliteAffix[];
  eliteShieldHp?: number;
  eliteFrostPulseTimer?: number;
  eliteAuraRingMesh?: THREE.Mesh;
  eliteAuraRingMesh2?: THREE.Mesh;
  laserLine: THREE.Line;
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
  mesh: THREE.Mesh;
  trailMesh?: THREE.Mesh;
}

interface CoopAllyEntity {
  heroId: HeroId;
  name: string;
  accentHex: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facing: number;
  attackTimer: number;
  ultCharge: number;
  damageDealt: number;
  phaseAngle: number;
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

export interface EngineCallbacks {
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
      maxCombo?: number;
      damageBreakdown?: DamageBreakdown;
      defeatCause?: DefeatCauseInfo;
      activeSynergies?: SkillSynergyId[];
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
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private lowEndGpu = false;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envRenderTarget: THREE.WebGLRenderTarget;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private heroLight: THREE.PointLight;

  private arenaGroup = new THREE.Group();
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
  private dragonMount?: THREE.Group;
  private dragonMountLoading = false;
  private heroShadow!: THREE.Mesh;
  private heroShieldMesh!: THREE.Mesh;
  private lobbyHaloGroup: THREE.Group | null = null;
  private combatAuraGroup: THREE.Group | null = null;
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
  };

  private obstacles: ObstacleBox[] = [];
  private urns: BreakableUrn[] = [];
  private enemies: EnemyEntity[] = [];
  private arrowPool: Projectile[] = [];
  private enemyOrbPool: Projectile[] = [];
  private meteorPool: MeteorStrike[] = [];
  private particlePool: Particle[] = [];
  private lootOrbs: LootOrb[] = [];
  private lightningPool: LightningArc[] = [];
  private shockwavePool: ShockwaveRing[] = [];
  private dangerLanePool: DangerLane[] = [];
  private ultColumnPool: Array<{
    active: boolean;
    life: number;
    maxLife: number;
    mesh: THREE.Mesh;
  }> = [];

  private phase: GamePhase = GamePhase.TITLE;
  private lobbyViewMode: 'battle' | 'gear' | 'heroes' | 'vault' = 'battle';
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
  private ultCharge = 55;
  private alexOverdriveTimer = 0;
  private wukongOverdriveTimer = 0;
  private stageIndex = 0;
  private waveIndex = 0;
  private portalOpen = false;
  private attackCooldown = 0;
  private volleyQueue: Array<{ delay: number; angleOffset: number; backward?: boolean; lateral?: number }> = [];
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
  private perfectDodgeInternalCd = 0;
  private perfectDodgeBuffTimer = 0;
  private perfectDodgeBannerTimer = 0;
  private perfectDodgeSlowTimer = 0;
  private perfectDodgeCount = 0;
  private nightmareTier = 0;
  private nightmareConfig: NightmareTierConfig = getNightmareTierConfig(1, 0);
  private isTrainingMode = false;
  private trainingTargetMode: TrainingTargetMode = 'single';
  private trainingDpsState: TrainingDpsState = createTrainingDpsState();
  private trainingClockSec = 0;

  // Hero Passive & Skill Periodic Timers
  private markedEnemyIds = new Set<number>();
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
  private shakeIntensity = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private readonly comboWindow = 3.2;
  private maxRunCombo = 0;
  private graphicsQuality: GraphicsQuality = 'high';
  private screenShakeEnabled = true;
  private showDamageNumbersEnabled = true;
  private particleDensityScale = 1.0;
  private elapsed = 0;
  private hudSyncTimer = 0;
  private nextEntityId = 1;
  private nextDmgId = 1;

  // Input state
  private keys: Record<string, boolean> = {};
  private dashBufferTimer = 0;
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

    // Software WebGL detection from GPU renderer string
    this.isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      const memory = (navigator as Navigator & {deviceMemory?: number}).deviceMemory;
      this.lowEndGpu = /Intel.*(?:HD|UHD|Iris)|SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu) ||
        (memory !== undefined && memory <= 4) || navigator.hardwareConcurrency <= 4;
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.lowEndGpu,
      powerPreference: 'low-power',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && !this.lowEndGpu;
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

    // Mandatory studio environment reflection
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.envRenderTarget = this.pmremGenerator.fromScene(environment, 0.04);
    environment.dispose();
    this.scene.environment = this.envRenderTarget.texture;

    // 3-point lighting rig + warm/cool contrast
    this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x26352e, 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe4b8, 1.85);
    this.keyLight.position.set(12, 22, 10);
    this.keyLight.castShadow = !this.isSoftwareGl && !this.lowEndGpu;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 55;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 18;
    this.keyLight.shadow.camera.bottom = -18;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    this.rimLight.position.set(-12, 10, -14);
    this.scene.add(this.rimLight);

    this.heroLight = new THREE.PointLight(0x38bdf8, 1.2, 9, 2);
    this.heroLight.position.set(0, 2.2, 8);
    this.scene.add(this.heroLight);

    this.scene.add(
      this.arenaGroup,
      this.entitiesGroup,
      this.projectilesGroup,
      this.particlesGroup
    );

    this.contactShadowTex = createContactShadowTexture();

    this.initPools();
    this.buildHero();
    this.buildArena(this.currentChapter);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private hasRune(id: RuneId): boolean {
    return this.baseStats.equippedRunes.includes(id);
  }

  private initPools(): void {
    // Player projectile pool + sleek elemental trail cones
    const arrowGeo = new THREE.ConeGeometry(0.12, 0.75, 6);
    arrowGeo.rotateX(Math.PI / 2);
    const trailGeo = new THREE.ConeGeometry(0.11, 1.15, 5);
    trailGeo.rotateX(-Math.PI / 2);
    trailGeo.translate(0, 0, -0.68);
    for (let i = 0; i < 85; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(arrowGeo, mat);
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const trailMesh = new THREE.Mesh(trailGeo, trailMat);
      mesh.add(trailMesh);
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
      });
    }

    // Enemy orb pool
    const orbGeo = new THREE.SphereGeometry(0.24, 10, 8);
    for (let i = 0; i < 75; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfb7185,
        emissive: 0xf43f5e,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      });
      const mesh = new THREE.Mesh(orbGeo, mat);
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

    // Particle pool
    const partGeo = new THREE.OctahedronGeometry(0.14, 0);
    for (let i = 0; i < 140; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
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

    // 3D Red Danger Lane pool (Boss linear / cross danger corridors)
    const laneOuterGeo = new THREE.PlaneGeometry(1.32, 16);
    laneOuterGeo.translate(0, 0, 8);
    const laneFillGeo = new THREE.PlaneGeometry(1.06, 16);
    laneFillGeo.translate(0, 0, 8);
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(
        laneOuterGeo,
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.42,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      outer.rotation.x = -Math.PI / 2;
      outer.renderOrder = 7;

      const fillMesh = new THREE.Mesh(
        laneFillGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.68,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
        })
      );
      fillMesh.rotation.x = -Math.PI / 2;
      fillMesh.position.y = 0.015;
      fillMesh.scale.set(0.1, 1, 1);
      fillMesh.renderOrder = 8;

      group.add(outer, fillMesh);
      group.visible = false;
      this.particlesGroup.add(group);
      this.dangerLanePool.push({ active: false, mesh: group, fillMesh });
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
  }

  private useArtemisModel(): void {
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

    if (this.artemisModelLoading) return;
    this.artemisModelLoading = true;
    new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/heroes/golden-dress-girl.glb`)
      .then(({ scene }) => {
        if (this.disposed) {
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
        this.artemisMotion = createArtemisMotion(scene);
        this.artemisModel = scene;
        if (this.baseStats.heroId === 'artemis') this.useArtemisModel();
      })
      .catch((error) => console.warn('Could not load the Artemis appearance.', error))
      .finally(() => { this.artemisModelLoading = false; });
  }

  private useDragonMount(): void {
    const mount = this.hero.mountGroup;
    if (!mount || this.heroVisualCfg.mountId !== 'azure_dragon' || this.heroVisualCfg.astralSteedId) return;

    if (this.dragonMount) {
      for (const part of mount.children) part.visible = false;
      mount.add(this.dragonMount);
      return;
    }

    if (this.dragonMountLoading) return;
    this.dragonMountLoading = true;
    new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}assets/mounts/dragon.glb`)
      .then(({ scene }) => {
        if (this.disposed) {
          this.releaseObject(scene);
          return;
        }

        scene.scale.setScalar(9.2);
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) object.castShadow = true;
        });
        const saddle = new THREE.Mesh(
          new THREE.SphereGeometry(1, 20, 12),
          new THREE.MeshStandardMaterial({ color: 0x462d27, roughness: 0.78 })
        );
        saddle.scale.set(0.34, 0.075, 0.24);
        saddle.position.set(0, 0.87, -0.36);
        saddle.castShadow = true;

        this.dragonMount = new THREE.Group();
        this.dragonMount.name = 'Thanh Long';
        this.dragonMount.add(scene, saddle);
        this.useDragonMount();
      })
      .catch((error) => console.warn('Could not load the Thanh Long mount.', error))
      .finally(() => { this.dragonMountLoading = false; });
  }

  private updateDragonRide(moving: boolean): number {
    const artemis = this.artemisModel?.parent === this.hero.bodyGroup;
    const bob = moving
      ? 0.065 + Math.sin(this.elapsed * 13) * 0.055
      : Math.sin(this.elapsed * 2.7) * 0.018;
    if (this.dragonMount) this.dragonMount.position.y = bob;
    this.hero.bodyGroup.position.z = -0.36;
    if (!artemis) {
      this.hero.leftLeg.rotation.set(-0.88, 0, -0.54);
      this.hero.rightLeg.rotation.set(-0.88, 0, 0.54);
    }
    return (artemis ? -0.03 : 0.43) + bob;
  }

  private buildHero(): void {
    if (this.hero) {
      this.artemisModel?.removeFromParent();
      this.dragonMount?.removeFromParent();
      this.releaseObject(this.hero.root);
      this.releaseObject(this.heroShadow);
    }

    this.hero = createHeroModel(this.heroVisualCfg);
    this.hero.root.position.set(this.px, 0, this.pz);
    this.entitiesGroup.add(this.hero.root);
    if (this.baseStats.heroId === 'artemis') this.useArtemisModel();
    this.useDragonMount();

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

    if (this.combatAuraGroup) {
      this.releaseObject(this.combatAuraGroup);
    }
    this.combatAuraGroup = new THREE.Group();
    const combatRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 0.86, 32),
      new THREE.MeshBasicMaterial({
        color: this.heroVisualCfg.auraPrimaryHex ?? 0x38bdf8,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    combatRingOuter.rotation.x = -Math.PI / 2;
    this.combatAuraGroup.add(combatRingOuter);
    this.combatAuraGroup.position.set(this.px, 0.04, this.pz);
    this.combatAuraGroup.visible = this.phase !== GamePhase.TITLE;
    this.entitiesGroup.add(this.combatAuraGroup);

    this.rebuildCompanions();
  }

  private rebuildCompanions(): void {
    this.companionModels.forEach((c) => this.releaseObject(c));
    this.companionModels = [];

    if (this.baseStats.heroId === 'wukong') {
      for (let i = 0; i < 2; i++) {
        const clone = createCompanionModel('wukong');
        clone.visible = this.phase !== GamePhase.TITLE;
        this.entitiesGroup.add(clone);
        this.companionModels.push(clone);
      }
    }

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
  }

  private rebuildLobbyPedestal(): void {
    if (this.lobbyHaloGroup) {
      this.releaseObject(this.lobbyHaloGroup);
    }
    const floorTheme = SANCTUARY_FLOOR_MAP[this.sanctuaryFloorThemeId] ?? SANCTUARY_FLOOR_MAP.marble_gold;
    const auraPrimary = this.heroVisualCfg.auraPrimaryHex ?? floorTheme.ringHex;
    const auraSecondary = this.heroVisualCfg.auraSecondaryHex ?? floorTheme.pillarGlowHex;
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

    const outerHalo = new THREE.Mesh(
      new THREE.RingGeometry(1.22, 1.38, 48),
      new THREE.MeshBasicMaterial({
        color: auraPrimary,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    outerHalo.rotation.x = -Math.PI / 2;
    outerHalo.position.y = 0.02;

    const innerHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.84, 0.96, 36),
      new THREE.MeshBasicMaterial({
        color: auraSecondary,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    innerHalo.rotation.x = -Math.PI / 2;
    innerHalo.position.y = 0.025;

    // 12 Constellation Orbital Star Crystals
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

    this.lobbyHaloGroup.add(outerHalo, innerHalo);
    this.lobbyHaloGroup.visible = this.phase === GamePhase.TITLE;
    this.entitiesGroup.add(this.lobbyHaloGroup);
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
    const visualChanged = JSON.stringify(this.heroVisualCfg) !== JSON.stringify(visualCfg);
    const companionsChanged =
      this.baseStats.heroId !== stats.heroId ||
      this.baseStats.equippedPetId !== stats.equippedPetId ||
      Boolean(this.baseStats.equippedPetEvolved) !== Boolean(stats.equippedPetEvolved) ||
      this.baseStats.equippedRunes.includes('healing_sprite') !==
        stats.equippedRunes.includes('healing_sprite');
    this.baseStats = stats;
    this.heroVisualCfg = visualCfg;
    this.weaponAccentHex = visualCfg.weaponAccentHex;
    // Tiến độ/tiền thưởng cập nhật save không đồng nghĩa ngoại hình thay đổi.
    if (visualChanged) this.buildHero();
    else if (companionsChanged) this.rebuildCompanions();
  }

  private buildArena(chapter: ChapterDefinition): void {
    while (this.arenaGroup.children.length > 0) {
      this.releaseObject(this.arenaGroup.children[0]);
    }

    this.scene.background = new THREE.Color(chapter.skyHex);
    this.scene.fog = new THREE.FogExp2(chapter.fogHex, 0.019);
    this.keyLight.color.setHex(chapter.keyLightHex);
    this.hemiLight.color.setHex(chapter.hemiSkyHex);
    this.hemiLight.groundColor.setHex(chapter.hemiGroundHex);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const floorTex = createStoneTileTexture(
      chapter.floorPrimary,
      chapter.floorAccent,
      maxAniso
    );
    const bumpTex = createStoneBumpTexture(maxAniso);

    const floorGeo = new THREE.BoxGeometry(ARENA_HALF_W * 2 + 1.6, 1.4, ARENA_HALF_D * 2 + 1.6);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      bumpMap: bumpTex,
      bumpScale: 0.04,
      roughness: 0.82,
      metalness: 0.08,
    });
    this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.floorMesh.position.set(0, -0.7, 0);
    this.floorMesh.receiveShadow = true;
    this.arenaGroup.add(this.floorMesh);

    const terraceMat = new THREE.MeshStandardMaterial({
      color: chapter.stoneHex,
      roughness: 0.88,
      metalness: 0.05,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: chapter.trimHex,
      roughness: 0.3,
      metalness: 0.82,
    });

    const outerTerrace = new THREE.Mesh(
      new THREE.BoxGeometry(ARENA_HALF_W * 2 + 4.8, 1.2, ARENA_HALF_D * 2 + 4.8),
      terraceMat
    );
    outerTerrace.position.set(0, -1.25, 0);
    outerTerrace.receiveShadow = true;
    this.arenaGroup.add(outerTerrace);

    const borderThick = 0.35;
    const hBorderGeo = new THREE.BoxGeometry(ARENA_HALF_W * 2 + 1.8, 0.14, borderThick);
    const vBorderGeo = new THREE.BoxGeometry(borderThick, 0.14, ARENA_HALF_D * 2 + 1.8);
    const nEdge = new THREE.Mesh(hBorderGeo, trimMat);
    nEdge.position.set(0, 0.05, -ARENA_HALF_D - 0.75);
    const sEdge = new THREE.Mesh(hBorderGeo, trimMat);
    sEdge.position.set(0, 0.05, ARENA_HALF_D + 0.75);
    const wEdge = new THREE.Mesh(vBorderGeo, trimMat);
    wEdge.position.set(-ARENA_HALF_W - 0.75, 0.05, 0);
    const eEdge = new THREE.Mesh(vBorderGeo, trimMat);
    eEdge.position.set(ARENA_HALF_W + 0.75, 0.05, 0);
    this.arenaGroup.add(nEdge, sEdge, wEdge, eEdge);

    const postGeo = new THREE.CylinderGeometry(0.32, 0.38, 1.45, 8);
    const postPositions: Array<[number, number]> = [];
    for (let x = -10; x <= 10; x += 2.5) {
      if (Math.abs(x) > 1.8) postPositions.push([x, -ARENA_HALF_D - 1.1]);
      postPositions.push([x, ARENA_HALF_D + 1.1]);
    }
    for (let z = -10; z <= 10; z += 2.5) {
      postPositions.push([-ARENA_HALF_W - 1.1, z]);
      postPositions.push([ARENA_HALF_W + 1.1, z]);
    }
    const postsInstanced = new THREE.InstancedMesh(
      postGeo,
      terraceMat,
      postPositions.length
    );
    postsInstanced.castShadow = !this.isSoftwareGl;
    postsInstanced.receiveShadow = true;
    postPositions.forEach(([px, pz], idx) => {
      _dummy.position.set(px, 0.72, pz);
      _dummy.scale.set(1, 0.9 + (idx % 3) * 0.08, 1);
      _dummy.rotation.y = idx * 0.4;
      _dummy.updateMatrix();
      postsInstanced.setMatrixAt(idx, _dummy.matrix);
    });
    postsInstanced.instanceMatrix.needsUpdate = true;
    postsInstanced.computeBoundingSphere();
    this.arenaGroup.add(postsInstanced);

    const monolithGeo = new THREE.CylinderGeometry(1.1, 2.2, 16, 6);
    const monoliths = new THREE.InstancedMesh(monolithGeo, terraceMat, 22);
    for (let i = 0; i < 22; i++) {
      const ang = (i / 22) * Math.PI * 2;
      const dist = 23 + (i % 4) * 5.5;
      _dummy.position.set(
        Math.cos(ang) * dist,
        -6 + (i % 3) * 2.5,
        Math.sin(ang) * dist
      );
      _dummy.scale.set(0.8 + (i % 3) * 0.35, 0.75 + (i % 4) * 0.28, 0.8 + (i % 2) * 0.3);
      _dummy.rotation.set(0, ang, (i % 2 === 0 ? 1 : -1) * 0.04);
      _dummy.updateMatrix();
      monoliths.setMatrixAt(i, _dummy.matrix);
    }
    monoliths.instanceMatrix.needsUpdate = true;
    monoliths.computeBoundingSphere();
    this.arenaGroup.add(monoliths);

    this.portal = createPortalModel(chapter.trimHex);
    this.portal.group.position.set(0, 0, -ARENA_HALF_D - 0.65);
    this.arenaGroup.add(this.portal.group);
  }

  public startChapter(chapterId: number, stats: ComputedPlayerStats, nightmareTier = 0): void {
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
    this.isBloodMoonMode = false;
    this.isAbyssalMode = false;
    this.isGuildWarMode = false;
    this.isTrainingMode = false;
    this.nightmareTier = Math.max(0, Math.min(5, Math.floor(nightmareTier || 0)));
    this.nightmareConfig = getNightmareTierConfig(ch.id, this.nightmareTier);
    this.currentChapter = ch;
    this.baseStats = stats;

    this.buildArena(ch);
    this.resetRunState(stats);

    this.rebuildCompanions();
    this.loadStage(0);
    if (this.nightmareTier > 0) {
      soundEngine.playNightmareActivate();
      const mutLabel = this.nightmareConfig.mutators.map((m) => m.name).join(' + ');
      this.stageBannerText = `${this.nightmareConfig.label.toUpperCase()} · ${mutLabel}`;
      this.stageBannerTimer = 2.6;
    }
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
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
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
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
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
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

  public startCoopRaid(stats: ComputedPlayerStats, difficulty: CoopRaidDifficulty): void {
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
    this.ultCharge = 80;
    this.rebuildCompanions();
    this.setupStageArena(
      'sanctum',
      true,
      `PHÓ BẢN HỢP TÁC AI 3D · ${diffCfg.name.toUpperCase()}`
    );

    // Spawn 2 autonomous AI Hero Allies flanking player
    const allies = selectCoopAiAllies(stats.heroId);
    allies.forEach((allyDef, idx) => {
      const ax = idx === 0 ? -4.2 : 4.2;
      const az = 5.4;
      const allyWeaponArchetype =
        allyDef.id === 'cleo' || allyDef.id === 'rolla'
          ? 'staff'
          : allyDef.id === 'wukong' || allyDef.id === 'dracoola'
          ? 'claw'
          : 'bow';
      const allyModel = createHeroModel({
        weaponAccentHex: allyDef.accentHex,
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
        name: allyDef.name,
        accentHex: allyDef.accentHex,
        x: ax,
        z: az,
        vx: 0,
        vz: 0,
        facing: Math.PI,
        attackTimer: 0.35 + idx * 0.25,
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

  public startArenaDuel(stats: ComputedPlayerStats, opponent: ArenaOpponent): void {
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
    this.arenaTimeLeft = 45;
    this.arenaOpponentName = opponent.name;
    this.currentChapter = CHAPTERS[9] ?? CHAPTERS[CHAPTERS.length - 1] ?? CHAPTERS[0];
    this.baseStats = stats;

    this.buildArena(this.currentChapter);
    this.resetRunState(stats);
    this.ultCharge = 75;
    this.rebuildCompanions();
    this.setupStageArena('sanctum', true, `ĐẤU TRƯỜNG 1V1 · ${opponent.name}`);

    // Place player & spawn AI 3D Rival Hero across the arena
    this.px = 0;
    this.pz = 6.0;
    this.pFacing = Math.PI;
    this.hero.root.position.set(this.px, 0, this.pz);
    this.heroShadow.position.set(this.px, 0.02, this.pz);

    const oppHeroDef = HERO_MAP[opponent.heroId] ?? HERO_MAP.artemis;
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

    const oppHeroDef = HERO_MAP[rivalDef.heroId] ?? HERO_MAP.artemis;
    const rivalHeroRefs = createHeroModel({
      weaponAccentHex: rivalDef.accentHex,
      cloakColorHex: rivalDef.cloakHex,
      hairColorHex: rivalDef.hairHex,
      eyeColor: oppHeroDef.eyeColor,
      cheekColor: oppHeroDef.cheekColor,
      crownStyle: oppHeroDef.crownStyle,
      weaponArchetype: rivalDef.weaponArchetype,
      wingId: roundIdx >= 1 ? 'seraph_zodiac' : undefined,
      wingLevel: 3 + roundIdx * 2,
      haloId: roundIdx >= 2 ? 'seraphim_glory' : 'solar_crown',
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
    const heroDef = HERO_MAP[heroId] ?? HERO_MAP.artemis;
    const hx = this.hero.root.position.x;
    const hz = this.hero.root.position.z;
    soundEngine.unlock();
    soundEngine.playUltimate();
    this.spawnUltColumn(hx, hz, heroDef.accentHex, 0.6);
    this.spawnShockwave(hx, hz, heroDef.accentHex, 4.9, 0.55);
    this.spawnShockwave(hx, hz, 0xfbbf24, 3.2, 0.42);
    this.spawnParticles(hx, 1.25, hz, heroDef.accentHex, 34);
    this.spawnParticles(hx, 1.85, hz, 0xfde047, 16);
    if (heroId === 'artemis' || heroId === 'thor' || heroId === 'atreus') {
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

    this.spawnShockwave(0, -5.8, 0xf97316, 8.5, 0.62);
    soundEngine.playBossPhaseRoar();
    this.triggerBossWarning('CỔ LONG TINH GIỚI 3D', 'LÃNH ĐỊA RỒNG CỔ · NÉ HƠI THỞ ĐỎ RỰC');
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

      this.spawnShockwave(0, -5.6, 0x38bdf8, 8.2, 0.58);
      soundEngine.playBossPhaseRoar();
      this.triggerBossWarning('THIÊN SỨ TRƯỞNG KHÔNG TRUNG', 'BOSS KHÔNG CHIẾN 3D · ĐỘT PHÁ LÔNG VŨ THẦN QUANG');
    } else {
      this.stageBannerText = `KHÔNG CHIẾN TINH GIỚI · ĐỢT ${waveNum}/3`;
      this.stageBannerTimer = 2.0;
    }
  }

  private resetRunState(stats: ComputedPlayerStats): void {
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
    this.ultCharge = 55;
    this.alexOverdriveTimer = 0;
    this.wukongOverdriveTimer = 0;
    this.activeSkillCooldown = 0;
    this.activeSkillMaxCooldown = getHeroActiveSkill(stats.heroId).cooldownSec;
    this.alexCadenceTimer = 0;
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
    this.peakCritDmg = 0;
    this.runElapsedSeconds = 0;
  }

  public setPhase(phase: GamePhase): void {
    this.phase = phase;
    if (this.lobbyHaloGroup) {
      this.lobbyHaloGroup.visible = phase === GamePhase.TITLE;
    }
    if (phase === GamePhase.TITLE) {
      this.clearCombatEntities();
      this.px = 0;
      this.pz = 4.5;
      this.pFacing = 0;
      this.hero.root.position.set(0, 0, 4.5);
      this.heroShadow.position.set(0, 0.02, 4.5);
      this.reticleMesh.visible = false;
      this.companionModels.forEach((c) => (c.visible = false));
    }
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

  public setLobbyViewMode(mode: 'battle' | 'gear' | 'heroes' | 'vault'): void {
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
    }
  }

  public capturePhotoDataUrl(): string | null {
    if (this.disposed || this.contextLost) return null;
    try {
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
      if (e.eliteAuraRingMesh) this.releaseObject(e.eliteAuraRingMesh);
      if (e.eliteAuraRingMesh2) this.releaseObject(e.eliteAuraRingMesh2);
      this.releaseObject(e.laserLine);
    });
    this.enemies = [];

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
    this.bossPhaseTwoBannerTimer = 0;
    this.bossPhaseThreeBannerTimer = 0;
    this.playerFrostSlowTimer = 0;

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
    this.dangerLanePool.forEach((l) => {
      l.active = false;
      l.mesh.visible = false;
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
    if (this.baseStats.heroId === 'atreus') {
      stageShield += Math.round(this.maxHp * 0.32);
    }
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

    pillarCoords.forEach(([ox, oz]) => {
      const mesh = createPillarModel(
        this.currentChapter.stoneHex,
        this.currentChapter.trimHex
      );
      mesh.position.set(ox, 0, oz);
      this.entitiesGroup.add(mesh);
      this.obstacles.push({ x: ox, z: oz, radius: 0.92, mesh });
    });

    const urnSpots: Array<[number, number]> = [
      [-8.5, -8.5],
      [8.5, -8.5],
      [-8.5, 6.5],
      [8.5, 6.5],
    ];
    urnSpots.slice(0, isBossStage ? 2 : 3).forEach(([ux, uz]) => {
      const mesh = createUrnModel(this.currentChapter.trimHex);
      mesh.position.set(ux, 0, uz);
      this.entitiesGroup.add(mesh);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.95),
        new THREE.MeshBasicMaterial({
          map: this.contactShadowTex,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(ux, 0.02, uz);
      this.entitiesGroup.add(shadow);
      this.urns.push({ x: ux, z: uz, radius: 0.55, alive: true, mesh, shadow });
    });
  }

  private loadStage(idx: number): void {
    this.stageIndex = idx;
    const stage = this.currentChapter.stages[idx];
    const banner = stage.isBossStage
      ? `CẢNH BÁO BOSS · ${stage.bossTitle || stage.name}`
      : `Phòng ${stage.stageNumber}/${this.currentChapter.stages.length} · ${stage.name}`;
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
      spawnPoints.push([x, -8.5]);
      spawnPoints.push([x, -4.5]);
      if (Math.abs(x) > 3) spawnPoints.push([x, 0.5]);
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
    model.root.position.set(x, 0, z);
    this.entitiesGroup.add(model.root);
    this.callbacks.onProgressEvent?.({ seenEnemyKind: kind });

    const isBoss =
      kind === EnemyKind.WARDEN_BOSS ||
      kind === EnemyKind.TITAN_BOSS ||
      kind === EnemyKind.ZODIAC_BOSS;

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
      new THREE.RingGeometry(0.8, 1.07, 28),
      new THREE.MeshBasicMaterial({
        color: 0x090d18,
        transparent: true,
        opacity: 0.56,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    backingRing.rotation.x = -Math.PI / 2;
    backingRing.renderOrder = 7;

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.84, 1.02, 28),
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.renderOrder = 9;

    const telegraphFill = new THREE.Mesh(
      new THREE.CircleGeometry(1, 28),
      new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      })
    );
    telegraphFill.rotation.x = -Math.PI / 2;
    telegraphFill.scale.setScalar(0.15);
    telegraphFill.renderOrder = 8;

    telegraphGroup.add(backingRing, outerRing, telegraphFill);
    telegraphGroup.position.set(x, 0.06, z);
    telegraphGroup.visible = false;
    this.entitiesGroup.add(telegraphGroup);

    let punishRingMesh: THREE.Mesh | undefined;
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
        damage = 42;
        xpValue = 95;
        goldValue = 55;
        break;
      case EnemyKind.TITAN_BOSS:
        baseHp = 1950;
        speed = 2.45;
        damage = 54;
        xpValue = 145;
        goldValue = 95;
        break;
      case EnemyKind.ZODIAC_BOSS:
        baseHp = 2750;
        speed = 2.75;
        damage = 64;
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
      damage: Math.round(damage * dmgMult * (isElite ? 1.25 : 1.0)),
      xpValue: Math.round(xpValue * (isElite ? 1.5 : 1.0)),
      goldValue: Math.round(goldValue * this.currentChapter.goldBonusMult * (isElite ? 1.6 : 1.0)),
      isBoss,
      spawnTimer: 0.48,
      attackTimer: (0.7 + Math.random() * 0.9) * (hasHasteAffix ? 0.8 : 1.0),
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
      telegraphFill,
      punishRingMesh,
      eliteAffix,
      eliteAffixes,
      eliteShieldHp,
      eliteFrostPulseTimer: hasFrostAffix ? 2.6 : undefined,
      eliteAuraRingMesh,
      eliteAuraRingMesh2,
      laserLine,
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    dom.addEventListener('webglcontextlost', this.onContextLost);
    dom.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    // Context đã mất tự hủy các sync handle cũ.
    this.pendingGpuSync = null;
  };

  private onContextRestored = () => this.resumeAfterContextRestore();

  private resumeAfterContextRestore(): void {
    if (this.disposed || !this.contextLost) return;
    this.contextLost = false;
    this.startLoop();
  }

  private getTargetPixelRatio(): number {
    const low = this.isSoftwareGl || this.lowEndGpu || this.graphicsQuality === 'low';
    const cap = low ? 1 : this.graphicsQuality === 'medium' ? 1.5 : 2;
    const pixels = Math.max(1, this.container.clientWidth * this.container.clientHeight);
    const budget = low ? 1_500_000 : 2_500_000;
    return Math.min(window.devicePixelRatio || 1, cap, Math.sqrt(budget / pixels));
  }

  public applyRuntimeSettings(cfg: {
    graphicsQuality: GraphicsQuality;
    screenShake: boolean;
    showDamageNumbers: boolean;
    starfallWeather?: boolean;
  }): void {
    const quality = this.isSoftwareGl || this.lowEndGpu ? 'low' : cfg.graphicsQuality;
    this.graphicsQuality = quality;
    this.screenShakeEnabled = cfg.screenShake;
    this.showDamageNumbersEnabled = cfg.showDamageNumbers;
    this.starfallEnabled = !this.lowEndGpu && !this.isSoftwareGl && cfg.starfallWeather !== false;
    if (this.starfallMesh) {
      this.starfallMesh.visible = this.starfallEnabled;
    }
    this.particleDensityScale =
      quality === 'low' ? 0.45 : quality === 'medium' ? 0.75 : 1.0;

    if (!this.isSoftwareGl) {
      const shadowsOn = quality !== 'low';
      this.renderer.shadowMap.enabled = shadowsOn;
      this.keyLight.castShadow = shadowsOn;
    }
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
  }

  private onResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.getTargetPixelRatio());
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.phase !== GamePhase.PLAYING) return;
    const code = e.code;
    if (
      (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') &&
      !this.keys[code]
    ) {
      this.dashBufferTimer = 0.14;
    } else if (code === 'KeyQ' && !this.keys[code]) {
      this.triggerHeroUltimate();
    } else if (code === 'KeyE' && !this.keys[code]) {
      this.triggerHeroActiveSkill();
    }
    this.keys[code] = true;
  };

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
      this.lobbyDragActive = false;
      this.lobbyDragPointerId = null;
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
    }
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

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if (!prefersReducedMotion) {
      this.perfectDodgeSlowTimer = PERFECT_DODGE_SLOWMO_DURATION;
    }

    soundEngine.playPerfectDodge();
    this.spawnShockwave(this.px, this.pz, 0xe0f2fe, 3.6, 0.34);
    this.spawnParticles(this.px, 0.9, this.pz, 0x38bdf8, 16);
    this.emitFloatingNumber(this.px, 2.25, this.pz, 0, true, false, 'ice', 'NÉ HOÀN HẢO!');
    this.syncHudImmediate();
  }

  public triggerHeroActiveSkill(): void {
    if (this.phase !== GamePhase.PLAYING || this.activeSkillCooldown > 0) return;

    const skillDef = getHeroActiveSkill(this.baseStats.heroId);
    this.activeSkillMaxCooldown = skillDef.cooldownSec;
    this.activeSkillCooldown = skillDef.cooldownSec;

    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const skillDmg = Math.max(1, Math.round(atkPower * skillDef.damageMult));
    const liveEnemies = this.enemies.filter((e) => e.spawnTimer <= 0);
    const nearest = this.findNearestEnemy(this.px, this.pz);

    soundEngine.playHeroActiveSkill(this.baseStats.heroId);
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
      case 'valiant_cadence': {
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
            this.damageEnemy(e, skillDmg, false, false, false, false, false, 'DŨNG KHÍ', 'ultimate');
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
    }

    this.syncHudImmediate();
  }

  public triggerHeroUltimate(): void {
    if (this.phase !== GamePhase.PLAYING || this.ultCharge < 100) return;
    this.ultCharge = 0;

    const heroDef = HERO_MAP[this.baseStats.heroId] ?? HERO_MAP.artemis;
    const atkPower = this.baseStats.attack * this.getCurrentAtkMultiplier();
    const liveEnemies = this.enemies.filter((e) => e.spawnTimer <= 0);

    soundEngine.playUltimate();
    this.invulnTimer = Math.max(this.invulnTimer, 0.75);
    this.hitstopTimer = 0.045;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.36);
    this.spawnUltColumn(this.px, this.pz, this.weaponAccentHex, 0.58);
    this.spawnShockwave(this.px, this.pz, this.weaponAccentHex, 6.2, 0.48);
    this.spawnShockwave(this.px, this.pz, 0xfde047, 3.8, 0.36);
    this.spawnParticles(this.px, 1.1, this.pz, this.weaponAccentHex, 30);
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
      case 'alex': {
        this.alexOverdriveTimer = 5.0;
        this.spawnShockwave(this.px, this.pz, 0x38bdf8, 6.2, 0.48);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.spawnTimer > 0) continue;
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
      case 'thor': {
        const targets = liveEnemies.slice(0, 6);
        for (let i = 0; i < 6; i++) {
          const target = targets[i % Math.max(1, targets.length)];
          if (!target) break;
          this.spawnLightningArc(target.x, 9.5, target.z, target.x, 0.3, target.z);
          this.spawnShockwave(target.x, target.z, 0x38bdf8, 2.6, 0.38);
          target.chillTimer = Math.max(target.chillTimer, 2.4);
          this.damageEnemy(target, atkPower * 2.6, true, false, true, true, false, 'MJOLNIR!', 'ultimate');
        }
        break;
      }
      case 'wukong': {
        this.wukongOverdriveTimer = 4.5;
        this.spawnShockwave(this.px, this.pz, 0xf59e0b, 6.4, 0.48);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.spawnTimer > 0) continue;
          if (Math.hypot(e.x - this.px, e.z - this.pz) <= 6.2) {
            this.damageEnemy(e, atkPower * 2.75, true, true, false, false, false, 'KIM CÔ!', 'ultimate');
          }
        }
        break;
      }
      case 'cleo': {
        for (let i = 0; i < 5; i++) {
          const target = liveEnemies[i % Math.max(1, liveEnemies.length)];
          const tx = target ? target.x : (Math.random() - 0.5) * 8;
          const tz = target ? target.z : (Math.random() - 0.5) * 8;
          this.spawnMeteor(tx, tz, false);
        }
        break;
      }
      case 'rolla': {
        this.spawnShockwave(this.px, this.pz, 0x67e8f9, 8.5, 0.55);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.spawnTimer > 0) continue;
          e.chillTimer = Math.max(e.chillTimer, 4.2);
          this.damageEnemy(e, atkPower * 1.9, true, false, true, false, false, 'ĐÓNG BĂNG!', 'ultimate');
        }
        for (let i = 0; i < 4; i++) {
          const target = liveEnemies[i % Math.max(1, liveEnemies.length)];
          const tx = target ? target.x : (Math.random() - 0.5) * 8;
          const tz = target ? target.z : (Math.random() - 0.5) * 8;
          this.spawnMeteor(tx, tz, true);
        }
        break;
      }
      case 'atreus': {
        this.shield += Math.round(this.maxHp * 0.35);
        this.spawnShockwave(this.px, this.pz, 0xf43f5e, 5.2, 0.45);
        for (let i = 0; i < 12; i++) {
          const yaw = (i / 12) * Math.PI * 2;
          this.firePlayerArrow(yaw, 0, true, 'ultimate');
        }
        break;
      }
      case 'dracoola': {
        this.spawnShockwave(this.px, this.pz, 0xfb7185, 7.2, 0.5);
        let hitCount = 0;
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.spawnTimer > 0) continue;
          if (Math.hypot(e.x - this.px, e.z - this.pz) <= 7.2) {
            hitCount++;
            this.damageEnemy(e, atkPower * 2.45, true, false, false, false, true, 'HUYẾT NGUYỆT!', 'ultimate');
          }
        }
        const healAmt = Math.round(this.maxHp * Math.min(0.35, 0.14 + hitCount * 0.04));
        this.hp = Math.min(this.maxHp, this.hp + healAmt);
        this.emitFloatingNumber(this.px, 2.0, this.pz, healAmt, false, true);
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
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      // Chỉ giữ tối đa một frame đang xử lý, kể cả GPU phần cứng chậm.
      this.afterDraw(() => { this.frameId = requestAnimationFrame(tick); });
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
        const fps = this.isSoftwareGl ? 12 : this.phase === GamePhase.TITLE ? 20 : 30;
        const delay = Math.max(0, 1000 / fps - (performance.now() - this.lastTime));
        this.frameId = window.setTimeout(cb, delay);
      }
    };
    this.frameId = window.setTimeout(poll, 8);
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.phase === GamePhase.TITLE) {
      const sway = Math.sin(this.elapsed * 0.45) * 0.32;
      const hasMount = Boolean(this.hero.mountGroup);
      const mountExtraZ = hasMount ? 1.55 : 0;
      const mountExtraY = hasMount ? 0.34 : 0;
      const mountLookY = hasMount ? 0.24 : 0;
      const aspectExtraZ = Math.max(0, (1.45 - this.camera.aspect) * 2.5);

      let targetCamX = sway * 0.35;
      let targetCamY = 2.42 + mountExtraY;
      let targetCamZ = 13.8 + mountExtraZ + aspectExtraZ;
      let lookX = 0;
      let lookY = -0.18 + mountLookY;

      if (this.lobbyPhotoMode) {
        if (this.lobbyPhotoAngle === 'closeup') {
          targetCamX = sway * 0.12;
          targetCamY = 2.05 + mountExtraY;
          targetCamZ = 10.1 + mountExtraZ + aspectExtraZ * 0.55;
          lookX = 0;
          lookY = 0.72 + mountLookY;
        } else if (this.lobbyPhotoAngle === 'hero_wide') {
          targetCamX = -0.95 + sway * 0.25;
          targetCamY = 2.85 + mountExtraY;
          targetCamZ = 15.2 + mountExtraZ + aspectExtraZ;
          lookX = 0;
          lookY = 0.45 + mountLookY;
        } else {
          targetCamX = sway * 0.18;
          targetCamY = 2.25 + mountExtraY;
          targetCamZ = 12.1 + mountExtraZ + aspectExtraZ * 0.8;
          lookX = 0;
          lookY = 0.42 + mountLookY;
        }
      } else if (this.lobbyCameraPreset === 'closeup') {
        targetCamX = sway * 0.2;
        targetCamY = 2.18 + mountExtraY;
        targetCamZ = 11.6 + mountExtraZ + aspectExtraZ * 0.7;
        lookX = 0;
        lookY = -0.14 + mountLookY;
      } else if (this.lobbyCameraPreset === 'wardrobe') {
        targetCamX = 0.55 + sway * 0.14;
        targetCamY = 2.28 + mountExtraY;
        targetCamZ = 12.8 + mountExtraZ + aspectExtraZ;
        lookX = 0.55;
        lookY = -0.24 + mountLookY;
      } else if (this.lobbyViewMode === 'gear') {
        targetCamX = sway * 0.25;
        targetCamY = 2.32 + mountExtraY;
        targetCamZ = 13.2 + mountExtraZ + aspectExtraZ;
        lookX = 0;
        lookY = -0.38 + mountLookY;
      } else if (this.lobbyViewMode === 'heroes') {
        targetCamX = 1.18 + sway * 0.16;
        targetCamY = 2.3 + mountExtraY;
        targetCamZ = 13.1 + mountExtraZ + aspectExtraZ;
        lookX = 1.25;
        lookY = -0.34 + mountLookY;
      }

      // Wave 14: Smooth 360° Lobby Pitch & Zoom Damping
      this.lobbyOrbitPitch = THREE.MathUtils.damp(this.lobbyOrbitPitch, this.lobbyTargetPitch, 6.5, dt);
      this.lobbyOrbitZoom = THREE.MathUtils.damp(this.lobbyOrbitZoom, this.lobbyTargetZoom, 6.5, dt);
      targetCamY += this.lobbyOrbitPitch * 2.4;
      targetCamZ = Math.max(8.2, targetCamZ + this.lobbyOrbitZoom);

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 4.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 4.5, dt);
      this.camera.lookAt(lookX, lookY, 4.5);

      if (this.lobbyAutoSpinIdleTimer > 0) {
        this.lobbyAutoSpinIdleTimer -= dt;
      } else if (!this.lobbyDragActive) {
        this.lobbyTargetYaw += dt * 0.28;
      }
      this.lobbyYaw = THREE.MathUtils.damp(this.lobbyYaw, this.lobbyTargetYaw, 8.5, dt);

      // Wave 14: Project hero head to screen space for 3D Floating Royal Title (throttled ~20Hz)
      this.lobbyHeadSyncTimer -= dt;
      if (this.lobbyHeadSyncTimer <= 0 && this.callbacks.onLobbyHeadPos) {
        this.lobbyHeadSyncTimer = 0.05;
        const headWorldY = (hasMount ? 3.25 : 2.55) + (this.lobbyHeroPose === 'astral_float' ? 0.35 : 0);
        _v2.set(0, headWorldY, 4.5).project(this.camera);
        const cw = this.container.clientWidth || window.innerWidth;
        const ch = this.container.clientHeight || window.innerHeight;
        const sx = ((_v2.x + 1) * 0.5) * cw;
        const sy = ((-_v2.y + 1) * 0.5) * ch;
        this.callbacks.onLobbyHeadPos({
          x: sx,
          y: sy,
          visible: _v2.z < 1 && sx > 40 && sx < cw - 40 && sy > 48 && sy < ch - 120,
        });
      }

      const onDragon = Boolean(this.dragonMount && this.dragonMount.parent === this.hero.mountGroup);
      const mountOffset = onDragon ? this.updateDragonRide(false) : this.hero.mountGroup ? 0.68 : 0;
      const poseFloatY = this.lobbyHeroPose === 'astral_float' ? 0.34 + Math.sin(this.elapsed * 3.2) * 0.1 : Math.sin(this.elapsed * 2.2) * 0.04;
      const targetBodyTiltX = this.lobbyHeroPose === 'aim_ready' ? 0.1 : this.lobbyHeroPose === 'astral_float' ? -0.08 : 0;
      const targetDrawArmX = this.lobbyHeroPose === 'victory_salute' ? -1.15 : this.lobbyHeroPose === 'aim_ready' ? -0.45 : 0;
      const showWeaponInLobby =
        this.lobbyHeroPose === 'aim_ready' ||
        this.lobbyHeroPose === 'victory_salute' ||
        (this.heroVisualCfg.mythicWeaponTier ?? 0) >= 1;

      this.hero.root.rotation.y = this.lobbyYaw;
      this.hero.bodyGroup.position.y = THREE.MathUtils.damp(this.hero.bodyGroup.position.y, mountOffset + (onDragon ? 0 : poseFloatY), 6, dt);
      this.hero.bodyGroup.rotation.x = THREE.MathUtils.damp(this.hero.bodyGroup.rotation.x, targetBodyTiltX, 6, dt);
      this.hero.drawArm.rotation.x = THREE.MathUtils.damp(this.hero.drawArm.rotation.x, targetDrawArmX, 6, dt);
      this.hero.capeTail.rotation.x = 0.22 + Math.sin(this.elapsed * 3.1) * 0.07;
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
      if (this.hero.mountLegs) {
        this.hero.mountLegs.forEach((leg, lIdx) => {
          leg.rotation.x = Math.sin(this.elapsed * 2.4 + lIdx * 1.4) * 0.09;
        });
      }
      if (this.hero.weaponAuraGroup) {
        this.hero.weaponAuraGroup.rotation.z += dt * 1.9;
        this.hero.weaponAuraGroup.rotation.y += dt * 1.1;
      }
      if (this.hero.mythicCrownGroup) {
        this.hero.mythicCrownGroup.rotation.z += dt * 2.1;
      }
      if (this.hero.warBannerCloth) {
        this.hero.warBannerCloth.rotation.x = 0.08 + Math.sin(this.elapsed * 3.4) * 0.1;
        this.hero.warBannerCloth.rotation.y = Math.cos(this.elapsed * 2.1) * 0.08;
      }
      if (this.hero.artifactGroup) {
        this.hero.artifactGroup.rotation.y += dt * 1.35;
        this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 2.6) * 0.07;
      }
      if (this.hero.haloGroup) {
        this.hero.haloGroup.rotation.z += dt * 0.95;
        this.hero.haloGroup.position.y = 1.34 + Math.sin(this.elapsed * 2.2) * 0.04;
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
      this.hero.magicOrb.visible = !showWeaponInLobby;
      this.hero.magicOrb.rotation.z += dt * 2.8;
      this.hero.bowGroup.visible = showWeaponInLobby;
      if (this.artemisModel?.parent === this.hero.bodyGroup) {
        this.hero.nockedArrow.visible = showWeaponInLobby;
        this.artemisMotion?.update(dt, this.elapsed, 0, showWeaponInLobby, 0.35, this.hero.bowGroup, onDragon);
      }
      if (this.lobbyHaloGroup) {
        this.lobbyHaloGroup.visible = true;
        this.lobbyHaloGroup.rotation.y += dt * 0.55;
      }
      if (this.combatAuraGroup) {
        this.combatAuraGroup.visible = false;
      }
      if (this.petModel) {
        this.petModel.visible = true;
        const petBob = Math.sin(this.elapsed * 3.0) * 0.11;
        this.petModel.position.set(-1.14, 1.08 + petBob, 4.78);
        this.petModel.rotation.y = this.lobbyYaw * 0.6 + Math.sin(this.elapsed * 1.4) * 0.25;
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
    if (this.combatAuraGroup) {
      this.combatAuraGroup.visible = this.phase === GamePhase.PLAYING;
      this.combatAuraGroup.position.set(this.px, 0.04, this.pz);
      this.combatAuraGroup.rotation.y += dt * 1.35;
    }

    this.hero.bowGroup.visible = true;
    this.hero.magicOrb.visible = false;

    if (this.phase !== GamePhase.PLAYING) {
      return;
    }

    this.runElapsedSeconds += dt;

    if (this.isArenaMode) {
      this.arenaTimeLeft = Math.max(0, this.arenaTimeLeft - dt);
      if (this.arenaTimeLeft <= 0) {
        const rival = this.enemies.find((en) => en.isArenaRival);
        const rivalPct = rival ? rival.hp / Math.max(1, rival.maxHp) : 0;
        const playerPct = this.hp / Math.max(1, this.maxHp);
        const victory = playerPct >= rivalPct;
        if (victory) soundEngine.playVictory();
        else soundEngine.playPlayerHurt();
        this.phase = victory ? GamePhase.VICTORY : GamePhase.GAME_OVER;
        this.syncHudImmediate();
        this.callbacks.onRunEnded(victory, {
          chapterId: this.currentChapter.id,
          stageReached: 1,
          kills: victory ? 1 : 0,
          gold: this.runGold + (victory ? 160 : 50),
          gems: this.runGems + (victory ? 12 : 2),
          isArenaMode: true,
          arenaOpponentName: this.arenaOpponentName,
          maxCombo: this.maxRunCombo,
          damageBreakdown: this.getDamageBreakdownSnapshot(),
        });
        return;
      }
    }

    if (this.isGuildBossMode) {
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

    if (this.isWorldBossMode) {
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
          isGuildWarMode: true,
          guildWarScore: finalScore,
          guildWarNodes: this.guildWarNodesCaptured,
          guildCoins,
          artifactShards,
          mysticTokens,
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
        this.spawnParticles(vb.x, 0.7, vb.z, 0xf97316, 22);
        if (Math.hypot(this.px - vb.x, this.pz - vb.z) <= vb.radius + 0.35) {
          this.damagePlayer(vb.damage, {
            code: 'boss_slam',
            label: 'Vụ Nổ Tinh Anh Hỏa Bộc',
            killerName: 'Tinh Anh Hỏa Bộc',
            tip: 'Tránh vòng nổ Hỏa Bộc trên sàn sau khi hạ Quái Tinh Anh.',
          });
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
    if (this.isSkyCitadelMode) {
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
    if (this.isDragonLairMode) {
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
              this.damagePlayer(breathDmg);
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

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    let simDt = dt;
    if (this.perfectDodgeSlowTimer > 0) {
      this.perfectDodgeSlowTimer = Math.max(0, this.perfectDodgeSlowTimer - dt);
      simDt = dt * PERFECT_DODGE_SLOWMO_SCALE;
    }
    if (this.perfectDodgeBannerTimer > 0) {
      this.perfectDodgeBannerTimer = Math.max(0, this.perfectDodgeBannerTimer - dt);
    }
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

    this.updateStarfallWeather(simDt);
    this.updatePlayer(simDt);
    this.updateCoopAllies(simDt);
    this.updatePassivesAndPeriodicSkills(simDt);
    this.updateOrbitOrbs(simDt);
    this.updateCompanions(simDt);
    this.updateEnemies(simDt);
    this.updateProjectiles(simDt);
    this.updateMeteors(simDt);
    this.updateLootOrbs(simDt);
    this.updateParticles(simDt);
    this.updateShockwaves(simDt);
    this.updateUltColumns(simDt);
    this.updateLightning(simDt);
    this.updatePortalAndShrine(simDt);
    this.updateCamera(dt);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.syncHudImmediate();
    }
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
        this.spawnParticles(hz.x, 0.75, hz.z, meta.colorHex, 20);
        const dist = Math.hypot(this.px - hz.x, this.pz - hz.z);
        if (dist <= hz.radius + 0.32 && this.dashTimer > 0 && this.invulnTimer > 0) {
          this.tryTriggerPerfectDodge();
        } else if (dist <= hz.radius + 0.32 && this.invulnTimer <= 0) {
          if (hz.kind === 'solar_eruption') {
            this.damagePlayer(hz.damage, {
              code: 'boss_slam',
              label: 'Bẫy Phun Trào Thái Dương',
              killerName: 'Bẫy Sàn Thái Dương',
              tip: 'Lướt né vòng cảnh báo cam trên sàn trước khi cột lửa bùng nổ.',
            });
          } else if (hz.kind === 'frost_zone') {
            this.playerFrostSlowTimer = Math.max(this.playerFrostSlowTimer, 1.8);
            this.emitFloatingNumber(this.px, 2.0, this.pz, 0, false, false, 'ice', 'BẪY HÀN BĂNG!');
            this.damagePlayer(Math.max(8, Math.round(hz.damage * 0.72)), {
              code: 'boss_slam',
              label: 'Bẫy Vùng Hàn Băng',
              killerName: 'Bẫy Sàn Hàn Băng',
              tip: 'Di chuyển khỏi vùng băng xanh để tránh bị làm chậm và trúng sát thương.',
            });
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
            this.damagePlayer(Math.max(8, Math.round(hz.damage * 0.85)), {
              code: 'boss_slam',
              label: 'Bẫy Xung Hư Không',
              killerName: 'Bẫy Sàn Hư Không',
              tip: 'Dùng Lướt đúng thời điểm để vô hiệu hóa lực kéo của Xung Hư Không.',
            });
          }
        }
        this.releaseObject(hz.ring);
        this.releaseObject(hz.fill);
        this.arenaHazards.splice(i, 1);
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
    const mode = this.phase === GamePhase.TITLE ? this.lobbyWeatherId : 'meteor_shower';
    for (let i = 0; i < this.STARFALL_COUNT; i++) {
      const s = this.starfallSeeds[i];
      if (mode === 'golden_embers') {
        s.y += Math.abs(s.vy) * 0.85 * dt;
        s.x += Math.sin(this.elapsed * 2.1 + s.phase) * 0.65 * dt;
        if (s.y > 16.5) {
          s.y = 0.2 + Math.random() * 1.4;
          s.x = (Math.random() - 0.5) * 28;
          s.z = (Math.random() - 0.5) * 28;
        }
        _dummy.scale.setScalar(s.scale * (0.85 + 0.35 * Math.sin(this.elapsed * 6 + s.phase)));
      } else if (mode === 'starlight_snow') {
        s.y += s.vy * 0.48 * dt;
        s.x += Math.sin(this.elapsed * 1.4 + s.phase) * 0.55 * dt;
        if (s.y < 0.2) {
          s.y = 14 + Math.random() * 3.5;
          s.x = (Math.random() - 0.5) * 30;
          s.z = (Math.random() - 0.5) * 30;
        }
        _dummy.scale.setScalar(s.scale * 1.18);
      } else if (mode === 'sakura_petals') {
        s.y += s.vy * 0.52 * dt;
        s.x += (0.85 + Math.cos(this.elapsed * 2.2 + s.phase) * 0.7) * dt;
        if (s.y < 0.2 || s.x > 16) {
          s.y = 13 + Math.random() * 4;
          s.x = -14 + Math.random() * 24;
          s.z = (Math.random() - 0.5) * 30;
        }
        _dummy.scale.set(s.scale * 1.5, s.scale * 0.35, s.scale * 1.1);
      } else {
        // meteor_shower
        s.y += s.vy * 1.35 * dt;
        s.x += (s.vx - 1.35) * dt;
        if (s.y < 0.3) {
          s.y = 14 + Math.random() * 3.5;
          s.x = (Math.random() - 0.5) * 30 + 4;
          s.z = (Math.random() - 0.5) * 32;
        }
        _dummy.scale.set(s.scale * 0.65, s.scale * 2.4, s.scale * 0.65);
      }
      _dummy.position.set(s.x, s.y, s.z);
      _dummy.rotation.set(
        mode === 'sakura_petals' ? this.elapsed * 1.8 + s.phase : 0,
        this.elapsed * 1.9 + s.phase,
        mode === 'meteor_shower' ? 0.38 : 0
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
    if (this.baseStats.heroId === 'dracoola' && this.hp >= this.maxHp * 0.9) {
      mult *= 1.18;
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
    return mult;
  }

  private updatePlayer(dt: number): void {
    let moveX = this.joyVecX;
    let moveZ = this.joyVecZ;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
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
      soundEngine.playDash();
      this.spawnParticles(this.px, 0.7, this.pz, this.weaponAccentHex, 10);
    }

    const moveMult =
      (this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.playerSpeedMult : 1.0) *
      (this.alexCadenceTimer > 0 ? 1.15 : 1.0);
    const frostSlowMult = this.playerFrostSlowTimer > 0 ? 0.72 : 1.0;
    const effectiveMoveSpeed = this.baseStats.moveSpeed * moveMult * frostSlowMult;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpeed = effectiveMoveSpeed * 2.75;
      this.pvx = this.dashDirX * dashSpeed;
      this.pvz = this.dashDirZ * dashSpeed;
      if (Math.random() < 0.65) {
        this.spawnParticles(this.px, 0.6, this.pz, this.weaponAccentHex, 1);
      }
    } else {
      const targetVx = moveX * effectiveMoveSpeed;
      const targetVz = moveZ * effectiveMoveSpeed;
      this.pvx = THREE.MathUtils.damp(this.pvx, targetVx, 18, dt);
      this.pvz = THREE.MathUtils.damp(this.pvz, targetVz, 18, dt);
    }

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

    const speedMag = Math.hypot(this.pvx, this.pvz);
    const isMoving = inputLen > 0.12 || this.dashTimer > 0;
    const isThor = this.baseStats.heroId === 'thor';

    const nearest = this.findNearestEnemy(this.px, this.pz);

    const onDragon = Boolean(this.dragonMount && this.dragonMount.parent === this.hero.mountGroup);
    const mountOffset = this.hero.mountGroup ? 0.68 : 0;

    if (isMoving) {
      if (speedMag > 0.3) {
        const moveYaw = Math.atan2(this.pvx, this.pvz);
        this.pFacing = this.lerpAngle(this.pFacing, moveYaw, 1 - Math.exp(-16 * dt));
      }
      const stride = Math.sin(this.elapsed * 16) * 0.52;
      this.hero.leftLeg.rotation.x = stride;
      this.hero.rightLeg.rotation.x = -stride;
      this.hero.bodyGroup.position.y = mountOffset + Math.abs(Math.sin(this.elapsed * 16)) * 0.09;
      this.hero.bodyGroup.rotation.x = this.dashTimer > 0 ? 0.32 : 0.1;
      this.hero.capeTail.rotation.x = 0.34 + Math.sin(this.elapsed * 14) * 0.14;
      if (this.hero.mountLegs) {
        this.hero.mountLegs.forEach((leg, lIdx) => {
          const phaseOffset = lIdx === 0 || lIdx === 3 ? 0 : Math.PI;
          leg.rotation.x = Math.sin(this.elapsed * 17 + phaseOffset) * 0.58;
        });
      }
      if (!isThor) {
        this.volleyQueue = [];
      }
    } else {
      this.hero.leftLeg.rotation.x = THREE.MathUtils.damp(this.hero.leftLeg.rotation.x, 0, 14, dt);
      this.hero.rightLeg.rotation.x = THREE.MathUtils.damp(this.hero.rightLeg.rotation.x, 0, 14, dt);
      this.hero.bodyGroup.position.y = THREE.MathUtils.damp(this.hero.bodyGroup.position.y, mountOffset, 14, dt);
      this.hero.bodyGroup.rotation.x = THREE.MathUtils.damp(this.hero.bodyGroup.rotation.x, 0, 14, dt);
      this.hero.capeTail.rotation.x = THREE.MathUtils.damp(
        this.hero.capeTail.rotation.x,
        0.14 + Math.sin(this.elapsed * 2.5) * 0.05,
        10,
        dt
      );
      if (this.hero.mountLegs) {
        this.hero.mountLegs.forEach((leg) => {
          leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, 0, 12, dt);
        });
      }

      if (nearest) {
        const aimYaw = Math.atan2(nearest.x - this.px, nearest.z - this.pz);
        this.pFacing = this.lerpAngle(this.pFacing, aimYaw, 1 - Math.exp(-22 * dt));
      }
    }

    if (onDragon) {
      this.hero.bodyGroup.position.y = this.updateDragonRide(isMoving);
      this.hero.bodyGroup.rotation.x = isMoving ? 0.07 : 0;
    }

    if (this.hero.weaponAuraGroup) {
      this.hero.weaponAuraGroup.rotation.z += dt * 2.2;
      this.hero.weaponAuraGroup.rotation.y += dt * 1.25;
    }
    if (this.hero.artifactGroup) {
      this.hero.artifactGroup.rotation.y += dt * 1.65;
      this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 3.1) * 0.08;
    }
    if (this.hero.haloGroup) {
      this.hero.haloGroup.rotation.z += dt * 1.35;
      this.hero.haloGroup.position.y = 1.34 + Math.sin(this.elapsed * 2.8) * 0.045;
    }

    if (this.hero.leftWingPivot && this.hero.rightWingPivot) {
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

    if (nearest && nearest.spawnTimer <= 0) {
      this.reticleMesh.visible = true;
      this.reticleMesh.position.set(nearest.x, 0.04, nearest.z);
      this.reticleMesh.rotation.z += dt * 2.2;
      const rScale = nearest.isBoss ? 1.75 : 1.05;
      this.reticleMesh.scale.setScalar(rScale);
    } else {
      this.reticleMesh.visible = false;
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const speedBonus =
      1 +
      (this.activeSkills.aspd_boost ?? 0) * 0.24 +
      (this.activeSkills.power_trio ?? 0) * 0.2 +
      (this.alexAspdBuffTimer > 0 ? 0.15 : 0) +
      (this.alexCadenceTimer > 0 ? 0.28 : 0) +
      (this.alexOverdriveTimer > 0 ? 0.45 : 0);
    const attackInterval = Math.max(
      0.13,
      0.56 / (this.baseStats.attackSpeedMult * speedBonus)
    );

    const canFire = !isMoving || isThor;
    const aimingBow = canFire && nearest !== null && nearest.spawnTimer <= 0;
    let drawProgress = 0;
    if (aimingBow) {
      if (this.attackCooldown <= 0) {
        this.attackCooldown = attackInterval;
        this.queuePlayerVolley();
      }
      drawProgress = Math.max(0, 1 - this.attackCooldown / attackInterval);
      this.hero.nockedArrow.position.z = 0.2 - drawProgress * 0.26;
      this.hero.drawArm.position.z = 0.08 - drawProgress * 0.16;
      this.hero.bowGroup.position.z = 0.46 - drawProgress * 0.04;
    } else {
      this.hero.nockedArrow.position.z = 0.1;
      this.hero.drawArm.position.z = 0.06;
      this.hero.bowGroup.position.z = 0.46;
    }

    if (this.artemisModel?.parent === this.hero.bodyGroup) {
      this.hero.nockedArrow.visible = aimingBow;
      this.artemisMotion?.update(
        dt, this.elapsed, isMoving && !onDragon ? 1 : 0, aimingBow, drawProgress, this.hero.bowGroup, onDragon
      );
    }

    if (this.volleyQueue.length > 0 && nearest) {
      for (let i = this.volleyQueue.length - 1; i >= 0; i--) {
        this.volleyQueue[i].delay -= dt;
        if (this.volleyQueue[i].delay <= 0) {
          const item = this.volleyQueue.splice(i, 1)[0];
          const aimYaw = Math.atan2(nearest.x - this.px, nearest.z - this.pz);
          this.firePlayerArrow(
            aimYaw + item.angleOffset + (item.backward ? Math.PI : 0),
            item.lateral ?? 0
          );
        }
      }
    }
  }

  private queuePlayerVolley(): void {
    const multi = this.activeSkills.multishot ?? 0;
    const front = this.activeSkills.front_arrow ?? 0;
    const diag = this.activeSkills.diag_arrow ?? 0;
    const rear = this.activeSkills.rear_arrow ?? 0;

    const volleys = 1 + multi;
    for (let v = 0; v < volleys; v++) {
      const delay = v * 0.065;
      const frontCount = 1 + front;
      for (let f = 0; f < frontCount; f++) {
        const lat = (f - (frontCount - 1) / 2) * 0.42;
        this.volleyQueue.push({ delay, angleOffset: 0, lateral: lat });
      }
      for (let d = 1; d <= diag; d++) {
        const ang = d * 0.45;
        this.volleyQueue.push({ delay, angleOffset: ang });
        this.volleyQueue.push({ delay, angleOffset: -ang });
      }
      if (rear > 0) {
        this.volleyQueue.push({ delay, angleOffset: 0, backward: true });
      }
    }

    // Atreus every 4th shot bonus piercing wave trigger handled on arrow launch
    this.atreusShotCount++;
  }

  private firePlayerArrow(
    yaw: number,
    lateralOffset = 0,
    bonusShadow = false,
    dmgSource: 'basic' | 'ultimate' | 'pet' | 'elemental' = 'basic'
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
      (this.activeSkills.super_blaze ?? 0) > 0 ||
      this.baseStats.heroId === 'cleo';
    const frost =
      (this.activeSkills.ice_arrow ?? 0) > 0 ||
      (this.activeSkills.super_freeze ?? 0) > 0 ||
      this.baseStats.heroId === 'rolla';
    const storm =
      (this.activeSkills.lightning_arrow ?? 0) > 0 ||
      (this.activeSkills.super_bolt ?? 0) > 0;
    const poison = (this.activeSkills.venom_arrow ?? 0) > 0;

    const isAtreusOrb =
      bonusShadow || (this.baseStats.heroId === 'atreus' && this.atreusShotCount % 4 === 0);

    proj.active = true;
    proj.isEnemy = false;
    proj.isSword = false;
    proj.source = dmgSource;
    proj.coopAllyIndex = undefined;
    proj.homing =
      this.baseStats.innateHoming ||
      (this.activeSkills.tracking_eye ?? 0) > 0 ||
      this.baseStats.weaponArchetype === 'staff';
    proj.x = this.px + dirX * 0.65 + perpX * lateralOffset;
    proj.y = 1.02;
    proj.z = this.pz + dirZ * 0.65 + perpZ * lateralOffset;
    const hasPiercingVolley = evaluateActiveSynergies(this.activeSkills).includes('piercing_volley');
    const finalArrowSpeed = this.baseStats.arrowSpeed * (hasPiercingVolley ? 1.15 : 1.0);
    proj.vx = dirX * finalArrowSpeed;
    proj.vz = dirZ * finalArrowSpeed;
    proj.damage = isAtreusOrb ? rawDamage * 1.15 : rawDamage;
    proj.radius = this.baseStats.weaponArchetype === 'claw' ? 0.45 : 0.3;
    proj.life = 2.2;
    proj.pierceLeft =
      (this.activeSkills.pierce ?? 0) * 2 +
      (this.baseStats.innatePierce ? 2 : 0) +
      (this.baseStats.weaponArchetype === 'claw' ? 1 : 0) +
      (isAtreusOrb ? 3 : 0);
    proj.ricochetLeft = (this.activeSkills.ricochet ?? 0) * 2;
    proj.wallBounceLeft = (this.activeSkills.bouncy_wall ?? 0) * 2;
    proj.hitEnemyIds.clear();
    proj.blaze = blaze;
    proj.frost = frost;
    proj.storm = storm;
    proj.poison = poison;

    const mat = proj.mesh.material as THREE.MeshStandardMaterial;
    const color = isAtreusOrb
      ? 0xf43f5e
      : blaze
      ? 0xf97316
      : frost
      ? 0x67e8f9
      : storm
      ? 0xa78bfa
      : poison
      ? 0x4ade80
      : this.weaponAccentHex;
    mat.color.setHex(color);
    mat.emissive.setHex(color);
    if (proj.trailMesh) {
      const trailMat = proj.trailMesh.material as THREE.MeshBasicMaterial;
      trailMat.color.setHex(color);
      trailMat.opacity = dmgSource === 'ultimate' ? 0.78 : 0.56;
      proj.trailMesh.visible = true;
    }

    if (this.baseStats.weaponArchetype === 'claw') {
      proj.mesh.scale.set(1.85, 0.58, 1.15);
    } else if (this.baseStats.weaponArchetype === 'staff') {
      proj.mesh.scale.set(1.4, 1.4, 1.1);
    } else {
      proj.mesh.scale.set(1.05, 1.05, 1.35);
    }

    proj.mesh.position.set(proj.x, proj.y, proj.z);
    proj.mesh.rotation.set(0, yaw, 0);
    proj.mesh.visible = true;

    soundEngine.playBowShoot(0.95 + Math.random() * 0.12);
  }

  private updatePassivesAndPeriodicSkills(dt: number): void {
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
        soundEngine.playMeteorImpact();
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
        this.spawnShockwave(m.x, m.z, m.isFrost ? 0x67e8f9 : 0xf97316, m.radius * 1.15, 0.4);
        this.spawnParticles(m.x, 0.6, m.z, m.isFrost ? 0x67e8f9 : 0xf97316, 20);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.spawnTimer > 0) continue;
          if (Math.hypot(e.x - m.x, e.z - m.z) <= m.radius + e.radius) {
            this.damageEnemy(e, m.damage, true, !m.isFrost, m.isFrost, false, false, undefined, 'elemental');
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

      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (!e || e.spawnTimer > 0 || e.hitFlashTimer > 0) continue;
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

    // 3D Zodiac Pet Companion update & firing
    if (this.petModel && this.builtPetId) {
      this.petModel.visible = true;
      const pDef = PET_MAP[this.builtPetId];
      const targetX = this.px - Math.cos(this.pFacing) * 1.15 - Math.sin(this.pFacing) * 0.45;
      const targetZ = this.pz + Math.sin(this.pFacing) * 1.15 - Math.cos(this.pFacing) * 0.45;
      const petY = 1.18 + Math.sin(this.elapsed * 3.8) * 0.14;
      this.petModel.position.set(
        THREE.MathUtils.damp(this.petModel.position.x, targetX, 9, dt),
        petY,
        THREE.MathUtils.damp(this.petModel.position.z, targetZ, 9, dt)
      );
      if (nearest) {
        this.petModel.rotation.y = Math.atan2(
          nearest.x - this.petModel.position.x,
          nearest.z - this.petModel.position.z
        );
      } else {
        this.petModel.rotation.y = this.pFacing;
      }

      if (pDef && nearest && nearest.spawnTimer <= 0) {
        this.petFireTimer += dt;
        const evolvedMult = getEvolvedPetMultiplier(Boolean(this.baseStats.equippedPetEvolved));
        const effectiveInterval = pDef.fireInterval * evolvedMult.fireRateMult;
        if (this.petFireTimer >= effectiveInterval) {
          this.petFireTimer = 0;
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
    }

    if (this.companionModels.length === 0) return;

    this.wukongFireTimer += dt;
    this.spriteFireTimer += dt;

    const count = this.companionModels.length;

    for (let i = 0; i < count; i++) {
      const comp = this.companionModels[i];
      const ang = this.elapsed * 1.4 + (i * Math.PI * 2) / count;
      const dist = 1.65;
      const cx = this.px + Math.cos(ang) * dist;
      const cz = this.pz + Math.sin(ang) * dist;
      comp.position.set(cx, 0.95 + Math.sin(this.elapsed * 4 + i) * 0.12, cz);
      if (nearest) {
        comp.rotation.y = Math.atan2(nearest.x - cx, nearest.z - cz);
      } else {
        comp.rotation.y += dt * 2;
      }
    }

    if (nearest && nearest.spawnTimer <= 0) {
      const cloneInterval = this.wukongOverdriveTimer > 0 ? 0.48 : 1.25;
      if (this.baseStats.heroId === 'wukong' && this.wukongFireTimer >= cloneInterval) {
        this.wukongFireTimer = 0;
        for (let i = 0; i < Math.min(2, count); i++) {
          const comp = this.companionModels[i];
          const yaw = Math.atan2(nearest.x - comp.position.x, nearest.z - comp.position.z);
          this.spawnCompanionShot(
            comp.position.x,
            comp.position.z,
            yaw,
            this.baseStats.attack * this.getCurrentAtkMultiplier() * 0.56,
            0xfbbf24,
            this.wukongOverdriveTimer > 0,
            'basic'
          );
        }
      }

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
    proj.mesh.scale.set(0.95, 0.95, 1.15);
    proj.mesh.position.set(x, 1.05, z);
    proj.mesh.rotation.set(0, yaw, 0);
    proj.mesh.visible = true;
  }

  private updateCoopAllies(dt: number): void {
    if (!this.isCoopRaidMode || this.coopAllies.length === 0) return;
    const nearest = this.findNearestEnemy(this.px, this.pz);

    for (let idx = 0; idx < this.coopAllies.length; idx++) {
      const ally = this.coopAllies[idx];
      const target = nearest ? this.findNearestEnemy(ally.x, ally.z) ?? nearest : null;

      let steerX = 0;
      let steerZ = 0;
      if (target && target.spawnTimer <= 0) {
        const dx = target.x - ally.x;
        const dz = target.z - ally.z;
        const dist = Math.hypot(dx, dz);
        const dirX = dist > 0.01 ? dx / dist : 0;
        const dirZ = dist > 0.01 ? dz / dist : 1;
        // Maintain agile mid-range orbit while dodging active boss slams
        const radial = dist < 4.8 ? -0.9 : dist > 7.8 ? 0.85 : 0;
        const strafeDir = idx === 0 ? 1 : -1;
        const wave = Math.cos(this.elapsed * 1.45 + ally.phaseAngle);
        steerX = dirX * radial - dirZ * strafeDir * wave * 0.85;
        steerZ = dirZ * radial + dirX * strafeDir * wave * 0.85;

        for (const e of this.enemies) {
          if (e.telegraphType === 'slam' || e.telegraphType === 'lunge') {
            const sx = ally.x - e.slamX;
            const sz = ally.z - e.slamZ;
            const sd = Math.hypot(sx, sz);
            if (sd < e.slamRadius + 1.4 && sd > 0.01) {
              steerX += (sx / sd) * 1.8;
              steerZ += (sz / sd) * 1.8;
            }
          }
        }
      } else {
        // Follow near player
        const fx = this.px + (idx === 0 ? -2.8 : 2.8) - ally.x;
        const fz = this.pz + 1.2 - ally.z;
        const fd = Math.hypot(fx, fz);
        if (fd > 0.6) {
          steerX = fx / fd;
          steerZ = fz / fd;
        }
      }

      const steerMag = Math.hypot(steerX, steerZ);
      const allySpeed = 6.4;
      const targetVx = steerMag > 0.08 ? (steerX / steerMag) * allySpeed : 0;
      const targetVz = steerMag > 0.08 ? (steerZ / steerMag) * allySpeed : 0;
      ally.vx = THREE.MathUtils.damp(ally.vx, targetVx, 10, dt);
      ally.vz = THREE.MathUtils.damp(ally.vz, targetVz, 10, dt);

      ally.x = THREE.MathUtils.clamp(ally.x + ally.vx * dt, -ARENA_HALF_W + 0.7, ARENA_HALF_W - 0.7);
      ally.z = THREE.MathUtils.clamp(ally.z + ally.vz * dt, -ARENA_HALF_D + 0.7, ARENA_HALF_D - 0.7);

      for (const obs of this.obstacles) {
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

      if (target && target.spawnTimer <= 0) {
        ally.attackTimer -= dt;
        if (ally.attackTimer <= 0) {
          ally.attackTimer = 0.52 + (idx % 2) * 0.08;
          ally.ultCharge = Math.min(100, ally.ultCharge + 12);
          const yaw = Math.atan2(target.x - ally.x, target.z - ally.z);
          const dmg = this.baseStats.attack * (0.78 + idx * 0.08);
          const isFire = ally.heroId === 'cleo';
          const isIce = ally.heroId === 'rolla';
          const isStorm = ally.heroId === 'thor';

          // Trigger Ally Ultimate when ready
          if (ally.ultCharge >= 100) {
            ally.ultCharge = 0;
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
    const mat = proj.mesh.material as THREE.MeshStandardMaterial;
    mat.color.setHex(colorHex);
    mat.emissive.setHex(colorHex);
    proj.mesh.visible = true;
  }

  private updateEnemies(dt: number): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.spawnTimer > 0) {
        e.spawnTimer -= dt;
        const p = 1 - Math.max(0, e.spawnTimer / 0.48);
        e.model.root.scale.setScalar(Math.max(0.05, p));
        continue;
      }
      e.model.root.scale.setScalar(1);

      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;
      const flash = e.hitFlashTimer > 0;
      for (const hm of e.model.hitMeshes) {
        const mat = hm.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(flash ? 0xffffff : e.chillTimer > 0 ? 0x22d3ee : 0x000000);
        mat.emissiveIntensity = flash ? 0.95 : e.chillTimer > 0 ? 0.35 : 0;
      }

      // Burn & Poison DoT
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        const tickDmg = e.burnDps * dt;
        e.hp -= tickDmg;
        this.dmgElemental += tickDmg;
        if (Math.random() < 0.2) {
          this.spawnParticles(e.x, 1.0, e.z, 0xf97316, 1);
        }
      }
      if (e.poisonDps > 0) {
        const tickDmg = e.poisonDps * dt;
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
        this.killEnemy(i);
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

      // Wave 12: Boss Break-Shield Stun freezes movement & attacks for 3s
      if (e.stunTimer && e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        e.vx = 0;
        e.vz = 0;
        e.telegraphType = 'none';
        e.telegraphGroup.visible = false;
        e.laserLine.visible = false;
        e.punishWindowTimer = 0;
        if (e.punishRingMesh) e.punishRingMesh.visible = false;
        e.model.bodyGroup.rotation.z = Math.sin(this.elapsed * 26) * 0.12;
        if (e.stunTimer <= 0) {
          e.model.bodyGroup.rotation.z = 0;
          if (e.maxBreakShield) {
            e.breakShield = e.maxBreakShield;
          }
        }
        continue;
      }

      const superFreeze = (this.activeSkills.super_freeze ?? 0) > 0;
      const slowMult = e.chillTimer > 0 ? (superFreeze ? 0.42 : 0.58) : 1.0;
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

      const isEnraged = e.isBoss && e.bossPhase >= 2;

      // Hide danger lanes each frame unless active enemy lane telegraph refreshes them
      if (e.telegraphType !== 'none') {
        e.telegraphTimer -= dt * slowMult;
        const progress = Math.min(
          1,
          1 - e.telegraphTimer / Math.max(0.01, e.telegraphDuration)
        );
        const pulse = 0.65 + 0.35 * Math.sin(this.elapsed * 20);
        const isImpactFlash = e.telegraphTimer <= 0.12;

        if (e.telegraphType === 'shot') {
          e.laserLine.visible = true;
          const posAttr = e.laserLine.geometry.getAttribute(
            'position'
          ) as THREE.BufferAttribute;
          posAttr.setXYZ(0, e.x, 0.95, e.z);
          posAttr.setXYZ(1, e.x + e.aimX * 14, 0.95, e.z + e.aimZ * 14);
          posAttr.needsUpdate = true;
          const lMat = e.laserLine.material as THREE.LineBasicMaterial;
          lMat.color.setHex(isImpactFlash ? 0xffffff : 0xf43f5e);
          lMat.opacity = isImpactFlash ? 1.0 : 0.78;
        } else if (e.telegraphType === 'slam' || e.telegraphType === 'lunge') {
          e.telegraphGroup.visible = true;
          e.telegraphGroup.position.set(e.slamX, 0.05, e.slamZ);
          e.telegraphGroup.scale.setScalar(
            e.slamRadius * (isImpactFlash ? 1.05 : 0.98 + pulse * 0.03)
          );
          e.telegraphFill.scale.setScalar(0.15 + progress * 0.85);
          const fillMat = e.telegraphFill.material as THREE.MeshBasicMaterial;
          fillMat.color.setHex(isImpactFlash ? 0xfef08a : 0xf43f5e);
          fillMat.opacity = isImpactFlash ? 0.68 : 0.28 + progress * 0.28;
          if (e.telegraphOuterRing) {
            const outMat = e.telegraphOuterRing.material as THREE.MeshBasicMaterial;
            outMat.color.setHex(isImpactFlash ? 0xffffff : 0xfef08a);
            outMat.opacity = isImpactFlash ? 1.0 : 0.92;
          }
        } else if (e.telegraphType === 'lane') {
          e.laneAngles.forEach((ang, lIdx) => {
            const lane = this.dangerLanePool[lIdx % this.dangerLanePool.length];
            if (!lane) return;
            lane.active = true;
            lane.mesh.visible = true;
            lane.mesh.position.set(e.x, 0.04, e.z);
            lane.mesh.rotation.y = ang;
            lane.fillMesh.scale.set(0.1 + progress * 0.9, 1, 1);
            const laneMat = lane.fillMesh.material as THREE.MeshBasicMaterial;
            laneMat.color.setHex(isImpactFlash ? 0xfef08a : 0xf43f5e);
            laneMat.opacity = isImpactFlash ? 0.92 : 0.42 + pulse * 0.34;
          });
        }

        if (e.telegraphTimer <= 0) {
          e.laserLine.visible = false;
          e.telegraphGroup.visible = false;
          if (e.telegraphType === 'lane') {
            this.dangerLanePool.forEach((l) => {
              l.active = false;
              l.mesh.visible = false;
            });
          }
          this.executeEnemyAttack(e, isEnraged);
          e.telegraphType = 'none';
          // Deliberate punish recovery windows per boss archetype so players can dodge then counterattack cleanly
          e.attackTimer = e.isBoss
            ? e.bossPhase === 3
              ? 1.0
              : isEnraged
              ? 1.15
              : e.kind === EnemyKind.WARDEN_BOSS
              ? 1.55
              : e.kind === EnemyKind.TITAN_BOSS
              ? 1.5
              : 1.45
            : 1.85 + Math.random() * 0.8;
          if (e.isBoss) {
            e.punishWindowMax = e.attackTimer;
            e.punishWindowTimer = e.attackTimer;
          }
        }
      } else {
        e.attackTimer -= dt * slowMult;

        if (e.kind === EnemyKind.SKIRMISHER || e.kind === EnemyKind.SHADOW_STALKER) {
          e.vx = dirX * e.speed * slowMult;
          e.vz = dirZ * e.speed * slowMult;
          if (e.kind === EnemyKind.SHADOW_STALKER && e.attackTimer <= 0) {
            e.telegraphType = 'shot';
            e.telegraphDuration = 0.5;
            e.telegraphTimer = 0.5;
            e.aimX = dirX;
            e.aimZ = dirZ;
          } else if (e.kind === EnemyKind.SKIRMISHER && e.attackTimer <= 0 && distToHero < 4.5) {
            e.telegraphType = 'lunge';
            e.telegraphDuration = 0.42;
            e.telegraphTimer = 0.42;
            e.aimX = dirX;
            e.aimZ = dirZ;
            e.slamX = e.x + dirX * 2.5;
            e.slamZ = e.z + dirZ * 2.5;
            e.slamRadius = 1.2;
          }
        } else if (e.kind === EnemyKind.IMP_ARCHER) {
          if (distToHero < 5.5) {
            e.vx = -dirX * e.speed * 0.7 * slowMult;
            e.vz = -dirZ * e.speed * 0.7 * slowMult;
          } else if (distToHero > 10.5) {
            e.vx = dirX * e.speed * slowMult;
            e.vz = dirZ * e.speed * slowMult;
          } else {
            e.vx = Math.cos(e.phaseAngle + this.elapsed) * 1.1 * slowMult;
            e.vz = Math.sin(e.phaseAngle + this.elapsed) * 1.1 * slowMult;
          }
          if (e.attackTimer <= 0) {
            e.telegraphType = 'shot';
            e.telegraphDuration = 0.62;
            e.telegraphTimer = 0.62;
            e.aimX = dirX;
            e.aimZ = dirZ;
            e.vx = 0;
            e.vz = 0;
          }
        } else if (e.kind === EnemyKind.GOLEM) {
          e.vx = dirX * e.speed * slowMult;
          e.vz = dirZ * e.speed * slowMult;
          if (e.attackTimer <= 0) {
            e.telegraphType = 'slam';
            e.telegraphDuration = 0.85;
            e.telegraphTimer = 0.85;
            e.slamX = e.x;
            e.slamZ = e.z;
            e.slamRadius = 2.9;
            e.vx = 0;
            e.vz = 0;
          }
        } else if (e.kind === EnemyKind.WISP || e.kind === EnemyKind.DRAGON_WHELP) {
          const strafeX = -dirZ;
          const strafeZ = dirX;
          const w = Math.sin(this.elapsed * 3.5 + e.phaseAngle);
          e.vx = (dirX * 0.75 + strafeX * w * 0.65) * e.speed * slowMult;
          e.vz = (dirZ * 0.75 + strafeZ * w * 0.65) * e.speed * slowMult;
          if (e.attackTimer <= 0 && distToHero < 9.5) {
            e.telegraphType = 'shot';
            e.telegraphDuration = 0.48;
            e.telegraphTimer = 0.48;
            e.aimX = dirX;
            e.aimZ = dirZ;
          }
        } else if (e.isArenaRival) {
          const strafeX = -dirZ;
          const strafeZ = dirX;
          const dodgeWave = Math.sin(this.elapsed * 2.7 + e.phaseAngle);
          const radialBias = distToHero < 5.5 ? -0.75 : distToHero > 8.8 ? 0.72 : 0.05;
          e.vx = (dirX * radialBias + strafeX * dodgeWave * 0.92) * e.speed * slowMult;
          e.vz = (dirZ * radialBias + strafeZ * dodgeWave * 0.92) * e.speed * slowMult;
          if (e.attackTimer <= 0) {
            const roll = Math.random();
            const baseYaw = Math.atan2(dirX, dirZ);
            if (roll < 0.45) {
              e.telegraphType = 'shot';
              e.telegraphDuration = 0.42;
              e.telegraphTimer = 0.42;
              e.aimX = dirX;
              e.aimZ = dirZ;
            } else if (roll < 0.78) {
              e.telegraphType = 'lane';
              e.telegraphDuration = 0.58;
              e.telegraphTimer = 0.58;
              e.laneAngles = [baseYaw - 0.16, baseYaw + 0.16];
            } else {
              e.telegraphType = 'spiral';
              e.telegraphDuration = 0.5;
              e.telegraphTimer = 0.5;
              e.aimX = dirX;
              e.aimZ = dirZ;
            }
          }
        } else if (e.isBoss) {
          e.vx = dirX * e.speed * (isEnraged ? 0.92 : 0.68) * slowMult;
          e.vz = dirZ * e.speed * (isEnraged ? 0.92 : 0.68) * slowMult;
          if (e.attackTimer <= 0) {
            const baseYaw = Math.atan2(dirX, dirZ);
            const step = e.patternCounter ?? 0;
            e.patternCounter = step + 1;

            // Signature readable boss pattern cycles:
            // WARDEN_BOSS (Ares, St.4): Slam <-> 3-Shot Fan (teaches circle telegraph & counter window)
            // TITAN_BOSS (Boreas, St.8): Dual/Triple Lanes -> 5-Shot Fan -> Slam (teaches lane sidestep)
            // ZODIAC_BOSS (Solar Lion, St.12): Phase I Lane -> Slam -> Fan; Phase II 3-Lane -> Slam -> Spiral
            let chosenPattern: 'lane' | 'shot' | 'slam' | 'spiral';
            if (e.kind === EnemyKind.WARDEN_BOSS) {
              chosenPattern = step % 2 === 0 ? 'slam' : 'shot';
            } else if (e.kind === EnemyKind.TITAN_BOSS) {
              const cycle: Array<'lane' | 'shot' | 'slam'> = ['lane', 'shot', 'slam'];
              chosenPattern = cycle[step % cycle.length];
            } else if (e.kind === EnemyKind.ZODIAC_BOSS) {
              const cycle: Array<'lane' | 'shot' | 'slam' | 'spiral'> = isEnraged
                ? ['lane', 'slam', 'spiral']
                : ['lane', 'slam', 'shot'];
              chosenPattern = cycle[step % cycle.length];
            } else {
              const roll = Math.random();
              chosenPattern =
                roll < 0.34 ? 'lane' : roll < 0.62 ? 'shot' : roll < 0.86 ? 'slam' : 'spiral';
            }

            if (chosenPattern === 'lane') {
              e.telegraphType = 'lane';
              e.telegraphDuration = isEnraged ? 0.76 : 0.9;
              e.telegraphTimer = e.telegraphDuration;
              e.laneAngles = isEnraged
                ? [baseYaw - 0.36, baseYaw, baseYaw + 0.36]
                : [baseYaw - 0.24, baseYaw + 0.24];
              soundEngine.playBossTelegraph();
            } else if (chosenPattern === 'shot') {
              e.telegraphType = 'shot';
              e.telegraphDuration = isEnraged ? 0.58 : 0.72;
              e.telegraphTimer = e.telegraphDuration;
              e.aimX = dirX;
              e.aimZ = dirZ;
            } else if (chosenPattern === 'slam') {
              e.telegraphType = 'slam';
              e.telegraphDuration = isEnraged ? 0.76 : 0.94;
              e.telegraphTimer = e.telegraphDuration;
              e.slamX = this.px;
              e.slamZ = this.pz;
              e.slamRadius = e.kind === EnemyKind.ZODIAC_BOSS || isEnraged ? 3.6 : 3.0;
              soundEngine.playBossTelegraph();
            } else {
              e.telegraphType = 'spiral';
              e.telegraphDuration = 0.64;
              e.telegraphTimer = 0.64;
              e.aimX = dirX;
              e.aimZ = dirZ;
              soundEngine.playBossTelegraph();
            }
            e.vx = 0;
            e.vz = 0;
          }
        }

        e.x += e.vx * dt;
        e.z += e.vz * dt;
      }

      e.x = THREE.MathUtils.clamp(e.x, -ARENA_HALF_W + e.radius, ARENA_HALF_W - e.radius);
      e.z = THREE.MathUtils.clamp(e.z, -ARENA_HALF_D + e.radius, ARENA_HALF_D - e.radius);

      for (const obs of this.obstacles) {
        const odx = e.x - obs.x;
        const odz = e.z - obs.z;
        const minD = e.radius + obs.radius;
        const d = Math.hypot(odx, odz);
        if (d < minD && d > 0.001) {
          e.x = obs.x + (odx / d) * minD;
          e.z = obs.z + (odz / d) * minD;
        }
      }

      for (let j = i - 1; j >= 0; j--) {
        const o = this.enemies[j];
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
              }
        );
      }

      e.model.root.position.set(e.x, 0, e.z);
      e.model.root.rotation.y = Math.atan2(dirX, dirZ);
      e.shadow.position.set(e.x, 0.02, e.z);

      if (e.hitFlashTimer > 0) {
        const s = 1 + e.hitFlashTimer * 1.1;
        e.model.root.scale.set(s, 1 / Math.sqrt(s), s);
      } else {
        e.model.root.scale.set(1, 1, 1);
      }

      if (e.model.weaponOrRing) {
        e.model.weaponOrRing.rotation.z += dt * (e.isBoss ? 1.8 : 2.6);
        if (e.kind === EnemyKind.WISP || e.kind === EnemyKind.DRAGON_WHELP) {
          e.model.weaponOrRing.rotation.x += dt * 1.8;
        }
      }

      if (e.model.wings) {
        const flap = Math.sin(this.elapsed * 14 + e.phaseAngle) * 0.38;
        e.model.wings.forEach((w, idx) => {
          w.rotation.y = (idx % 2 === 0 ? 1 : -1) * flap;
        });
      }

      if (
        e.kind === EnemyKind.WISP ||
        e.kind === EnemyKind.DRAGON_WHELP ||
        e.kind === EnemyKind.IMP_ARCHER
      ) {
        e.model.bodyGroup.position.y = Math.sin(this.elapsed * 4.2 + e.phaseAngle) * 0.14;
      } else {
        const moving = Math.hypot(e.vx, e.vz) > 0.2;
        e.model.bodyGroup.position.y = moving
          ? Math.abs(Math.sin(this.elapsed * 10 + e.phaseAngle)) * 0.08
          : 0;
      }
    }
  }

  private executeEnemyAttack(e: EnemyEntity, isEnraged: boolean): void {
    if (e.telegraphType === 'lunge') {
      e.x += e.aimX * 2.4;
      e.z += e.aimZ * 2.4;
      this.spawnParticles(e.x, 0.6, e.z, 0xfacc15, 6);
      if (Math.hypot(this.px - e.x, this.pz - e.z) < e.radius + 0.9) {
        this.damagePlayer(e.damage, {
          code: 'melee_swarm',
          label: 'Cú lao tới của quái cận chiến',
          tip: 'Bước ngang khi vòng báo màu vàng xuất hiện dưới chân quái rồi bắn phản công.',
        });
      }
    } else if (e.telegraphType === 'shot') {
      const baseYaw = Math.atan2(e.aimX, e.aimZ);
      if (e.isBoss) {
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
            Math.sin(a) * 11.2,
            Math.cos(a) * 11.2,
            e.damage,
            e.kind === EnemyKind.ZODIAC_BOSS ? this.currentChapter.trimHex : 0xa855f7,
            'boss_projectile'
          );
        }
      } else if (e.kind === EnemyKind.DRAGON_WHELP) {
        for (let k = -1; k <= 1; k += 2) {
          const a = baseYaw + k * 0.18;
          this.fireEnemyOrb(
            e.x,
            e.z,
            Math.sin(a) * 10.2,
            Math.cos(a) * 10.2,
            e.damage,
            0xf97316,
            'ranged_barrage'
          );
        }
      } else {
        const speed = e.kind === EnemyKind.WISP ? 11.5 : 9.6;
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
      }
    } else if (e.telegraphType === 'lane') {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
      soundEngine.playMeteorImpact();
      e.laneAngles.forEach((ang) => {
        for (let b = 0; b < (isEnraged ? 3 : 2); b++) {
          const speed = 13.5 + b * 2.2;
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
      });
    } else if (e.telegraphType === 'slam' || e.telegraphType === 'spiral') {
      if (e.telegraphType === 'slam') {
        this.spawnShockwave(e.slamX, e.slamZ, 0xf97316, e.slamRadius + 0.6, 0.42);
        this.spawnParticles(e.slamX, 0.4, e.slamZ, 0xf97316, 22);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.34);
        soundEngine.playMeteorImpact();
        if (Math.hypot(this.px - e.slamX, this.pz - e.slamZ) <= e.slamRadius + 0.35) {
          this.damagePlayer(e.damage * 1.15, {
            code: 'boss_slam',
            label: `Vòng Chấn Động của ${e.bossTitle ?? 'Boss'}`,
            tip: 'Rời khỏi vòng cảnh báo vàng-đỏ trước khi vòng đầy, sau đó tận dụng 1.5s hồi chiêu để xả đạn.',
            killerName: e.bossTitle,
          });
        }
      }
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
          Math.sin(a) * 8.4,
          Math.cos(a) * 8.4,
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
          urn.alive = false;
          this.releaseObject(urn.mesh);
          this.releaseObject(urn.shadow);
          this.spawnParticles(urn.x, 0.5, urn.z, 0xd97706, 12);
          this.spawnLootOrb(urn.x, urn.z, Math.random() < 0.45 ? 'heal' : 'gold', 18);
          soundEngine.playHit(false);
        }
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.spawnTimer > 0 || p.hitEnemyIds.has(e.id)) continue;
        if (Math.hypot(p.x - e.x, p.z - e.z) < e.radius + p.radius) {
          p.hitEnemyIds.add(e.id);

          const critStacks = this.activeSkills.crit_mastery ?? 0;
          let critChance = Math.min(
            0.9,
            this.baseStats.critChance +
              critStacks * 0.12 +
              (this.alexOverdriveTimer > 0 ? 0.25 : 0) +
              (this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.critBonus : 0)
          );
          if (this.hasRune('rune_flame') && (e.burnTimer > 0 || e.poisonDps > 0)) {
            critChance = Math.min(0.95, critChance + 0.1);
          }

          let isCrit = Math.random() < critChance;
          if (this.baseStats.heroId === 'alex' && this.alexGuaranteedCrit) {
            isCrit = true;
            this.alexGuaranteedCrit = false;
          }
          if (isCrit && this.baseStats.heroId === 'alex') {
            this.alexAspdBuffTimer = 5.0;
          }

          let critMult = this.baseStats.critDamage + critStacks * 0.35;
          if (this.baseStats.heroId === 'atreus' && this.shield > 0) {
            critMult += 0.18;
          }
          const activeSynergies = evaluateActiveSynergies(this.activeSkills);
          if (e.chillTimer > 0 && activeSynergies.includes('frost_shatter')) {
            critMult += 0.25;
          }
          const dmg = p.damage * (isCrit ? critMult : 1);

          this.damageEnemy(
            e,
            dmg,
            isCrit,
            p.blaze,
            p.frost,
            p.storm,
            p.poison,
            undefined,
            p.source ?? (p.isSword ? 'elemental' : 'basic'),
            p.coopAllyIndex
          );

          // Hero on-hit passives
          if (!p.isSword) {
            if (this.baseStats.heroId === 'artemis') {
              this.markedEnemyIds.add(e.id);
            }
            if (this.baseStats.heroId === 'cleo') {
              this.cleoHitCount++;
              if (this.cleoHitCount % 8 === 0) {
                const novaDmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * 2.0;
                this.spawnShockwave(e.x, e.z, 0xf97316, 3.6, 0.35);
                this.spawnParticles(e.x, 1.0, e.z, 0xf97316, 26);
                soundEngine.playMeteorImpact();
                for (let k = this.enemies.length - 1; k >= 0; k--) {
                  const o = this.enemies[k];
                  if (o && Math.hypot(o.x - e.x, o.z - e.z) <= 3.5) {
                    this.damageEnemy(o, novaDmg, true, true, false, false, false, 'LỬA THÁNH!', 'elemental');
                  }
                }
              }
            }
            if (this.baseStats.heroId === 'rolla' && e.chillTimer > 0 && Math.random() < 0.35) {
              this.spawnMeteor(e.x, e.z, true);
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

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      if (Math.abs(p.x) >= ARENA_HALF_W || Math.abs(p.z) >= ARENA_HALF_D) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      let blocked = false;
      for (const obs of this.obstacles) {
        if (Math.hypot(p.x - obs.x, p.z - obs.z) < obs.radius + p.radius) {
          this.spawnParticles(p.x, p.y, p.z, 0xf43f5e, 5);
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
        this.damagePlayer(p.damage, orbCause);
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
    coopAllyIndex?: number
  ): void {
    const activeSynergies = evaluateActiveSynergies(this.activeSkills);
    let mult = 1.0;
    if (this.markedEnemyIds.has(e.id)) mult += 0.2;
    if (e.isBoss && (this.baseStats.bossDamageBonus ?? 0) > 0) {
      mult += this.baseStats.bossDamageBonus;
    }
    if ((e.isBoss || e.isElite) && activeSynergies.includes('boss_barrage')) {
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
        blaze || this.baseStats.heroId === 'cleo' || this.baseStats.equippedPetId === 'solar_phoenix';
      const iceMatch =
        frost || this.baseStats.heroId === 'rolla' || this.baseStats.equippedPetId === 'frost_owl';
      const stormMatch =
        storm || this.baseStats.heroId === 'thor' || this.baseStats.equippedPetId === 'storm_dragonet';
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
    if (e.isBoss && e.stunTimer && e.stunTimer > 0) {
      mult *= 1.45;
    } else if (e.isBoss && e.punishWindowTimer && e.punishWindowTimer > 0) {
      const basePunish =
        e.bossPhase === 3 ? PUNISH_WINDOW_PHASE3_BONUS : PUNISH_WINDOW_DAMAGE_BONUS;
      const punishBonus =
        basePunish * (this.nightmareTier > 0 ? this.nightmareConfig.punishBonusMult : 1);
      mult *= 1 + punishBonus;
      soundEngine.playPunishHit();
      if (!resolvedLabel && isCrit) {
        resolvedLabel = e.bossPhase === 3 ? 'PHẢN ĐÒN TỐI THƯỢNG!' : 'PHẢN ĐÒN!';
      }
    }

    const finalDmg = Math.max(1, Math.round(amount * mult));
    if (e.isTrainingDummy) {
      recordTrainingHit(this.trainingDpsState, this.trainingClockSec, finalDmg, isCrit);
      e.hp = e.maxHp;
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

    // Wave 12: Boss Break-Shield Mechanic (Lazy init & Shatter Stun 3s)
    if (e.isBoss && e.hp > 0 && !e.isTrainingDummy) {
      if (e.maxBreakShield === undefined) {
        e.maxBreakShield = Math.max(120, Math.round(e.maxHp * 0.42));
        e.breakShield = e.maxBreakShield;
      }
      if (!e.stunTimer || e.stunTimer <= 0) {
        const breakMult =
          (isCrit ? 1.8 : 1.0) *
          (dmgSource === 'ultimate' ? 2.1 : 1.0) *
          (1 + (this.baseStats.mythicWeaponTier ?? 0) * 0.14);
        e.breakShield = Math.max(0, (e.breakShield ?? e.maxBreakShield) - finalDmg * breakMult);
        if (e.breakShield <= 0) {
          e.stunTimer = 3.0;
          e.punishWindowTimer = 0;
          if (e.punishRingMesh) e.punishRingMesh.visible = false;
          e.telegraphType = 'none';
          e.telegraphGroup.visible = false;
          e.laserLine.visible = false;
          this.dangerLanePool.forEach((l) => {
            l.active = false;
            l.mesh.visible = false;
          });
          this.bossBrokenBannerTimer = 2.6;
          this.hitstopTimer = Math.max(this.hitstopTimer, 0.085);
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.55);
          soundEngine.playBossPhaseRoar();
          this.spawnShockwave(e.x, e.z, 0xfde047, 6.8, 0.54);
          this.spawnParticles(e.x, 1.3, e.z, 0xfde047, 36);
          this.emitFloatingNumber(e.x, 2.55, e.z, 0, true, false, 'fire', 'PHÁ GIÁP! +45% ST', true);
        }
      }
    }

    if (this.isGuildBossMode && e.isBoss) {
      this.guildBossTotalDamage += finalDmg;
    }
    if (this.isWorldBossMode && e.isBoss) {
      this.worldBossTotalDamage += finalDmg;
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

    if (isCrit && finalDmg > this.peakCritDmg && coopAllyIndex === undefined) {
      this.peakCritDmg = finalDmg;
    }

    this.ultCharge = Math.min(100, this.ultCharge + (e.isBoss ? 5.5 : 4.2));
    this.comboCount += 1;
    this.comboTimer = this.comboWindow;
    if (this.comboCount > this.maxRunCombo) {
      this.maxRunCombo = this.comboCount;
      if (this.comboCount === 10 || this.comboCount === 20 || this.comboCount === 35 || this.comboCount === 50 || this.comboCount % 25 === 0) {
        this.callbacks.onProgressEvent?.({ maxCombo: this.maxRunCombo });
      }
    }

    // Boss Phase II Transition (<= 50% HP)
    if (e.isBoss && !e.phaseTransitioned && e.hp > 0 && e.hp <= e.maxHp * 0.5) {
      e.phaseTransitioned = true;
      e.bossPhase = 2;
      e.punishWindowTimer = 0;
      if (e.punishRingMesh) e.punishRingMesh.visible = false;
      e.telegraphType = 'none';
      e.laserLine.visible = false;
      e.telegraphGroup.visible = false;
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
      e.attackTimer = 0.5;
      this.bossPhaseTwoBannerTimer = 2.6;
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.045);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.52);
      }
      soundEngine.playBossPhaseTwo();
      this.spawnShockwave(e.x, e.z, 0xf43f5e, 6.8, 0.54);
      this.spawnParticles(e.x, 1.2, e.z, 0xf43f5e, 34);
      this.emitFloatingNumber(e.x, 2.4, e.z, 0, true, false, 'fire', 'PHA II · CUỒNG NỘ!', true);
      this.triggerBossWarning(
        e.bossTitle || this.currentChapter.bossName,
        'PHA II CUỒNG NỘ · CẢNH BÁO TĂNG TỐC ĐÒN ĐÁNH'
      );
    }

    // Phase 4: Boss Phase III Transition (<= 25% HP) for Ch.10–12 final bosses & Tower Floor 20+
    const canEnterPhaseThree =
      (!this.isTowerMode && this.currentChapter.id >= 10) ||
      (this.isTowerMode && this.towerFloor >= 20);
    if (
      e.isBoss &&
      e.phaseTransitioned &&
      !e.phaseThreeTransitioned &&
      canEnterPhaseThree &&
      e.hp > 0 &&
      e.hp <= e.maxHp * 0.25
    ) {
      e.phaseThreeTransitioned = true;
      e.bossPhase = 3;
      e.punishWindowTimer = 0;
      if (e.punishRingMesh) e.punishRingMesh.visible = false;
      e.telegraphType = 'none';
      e.laserLine.visible = false;
      e.telegraphGroup.visible = false;
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
      e.attackTimer = 0.45;
      this.bossPhaseThreeBannerTimer = 2.8;
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reducedMotion) {
        this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.62);
      }
      soundEngine.playBossPhaseThree();
      this.spawnShockwave(e.x, e.z, 0xfbbf24, 7.6, 0.56);
      this.spawnShockwave(e.x, e.z, 0xe11d48, 5.4, 0.42);
      this.spawnParticles(e.x, 1.35, e.z, 0xfbbf24, 42);
      this.emitFloatingNumber(e.x, 2.55, e.z, 0, true, false, 'fire', 'PHA III · TỐI THƯỢNG!', true);
      this.triggerBossWarning(
        e.bossTitle || this.currentChapter.bossName,
        'PHA III TỐI THƯỢNG · PHẢN ĐÒN +24% SÁT THƯƠNG'
      );
    }

    // Dracoola + Wave 12 Mythic Golden Stat Lifesteal
    const totalLifesteal =
      (this.baseStats.heroId === 'dracoola' ? 0.03 : 0) + (this.baseStats.lifeStealPct ?? 0);
    if (totalLifesteal > 0 && this.hp < this.maxHp && coopAllyIndex === undefined) {
      const leach = Math.max(1, Math.round(finalDmg * totalLifesteal));
      this.hp = Math.min(this.maxHp, this.hp + leach);
    }

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

    soundEngine.playHit(isCrit);
    this.spawnParticles(
      e.x,
      1.05,
      e.z,
      isCrit ? 0xfbbf24 : blaze ? 0xf97316 : frost ? 0x67e8f9 : poison ? 0x4ade80 : 0x38bdf8,
      isCrit ? 12 : 7
    );

    if (isCrit && (blaze || frost || storm)) {
      const ringColor = blaze ? 0xf97316 : frost ? 0x67e8f9 : 0xa78bfa;
      this.spawnShockwave(e.x, e.z, ringColor, 1.85, 0.24);
    }

    if (isCrit) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.032);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
    }

    const isSuperCrit =
      isCrit && (dmgSource === 'ultimate' || finalDmg >= this.baseStats.attack * 3.1);

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

    // Chain Lightning (Storm Skill or Thor Crit Passive + Storm Chain Synergy)
    const shouldChain =
      storm || (isCrit && this.baseStats.heroId === 'thor');
    if (shouldChain) {
      const hasStormChain = activeSynergies.includes('storm_chain');
      const maxChains =
        (this.baseStats.heroId === 'thor' || (this.activeSkills.super_bolt ?? 0) > 0
          ? 3
          : 1) + (hasStormChain ? 1 : 0);
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
        if (this.baseStats.heroId === 'thor') {
          nearby.chillTimer = Math.max(nearby.chillTimer, 0.7);
        }
        this.spawnLightningArc(currX, 1.0, currZ, nearby.x, 1.0, nearby.z);
        this.emitFloatingNumber(nearby.x, 1.5, nearby.z, arcDmg, false, false, 'storm');
        currX = nearby.x;
        currZ = nearby.z;
        const idx = this.enemies.indexOf(nearby);
        if (nearby.hp <= 0 && idx !== -1) {
          this.killEnemy(idx);
        }
      }
    }

    const myIdx = this.enemies.indexOf(e);
    if (e.hp <= 0 && myIdx !== -1) {
      this.killEnemy(myIdx);
    }
  }

  private killEnemy(index: number): void {
    const e = this.enemies[index];
    if (!e) return;

    this.kills++;
    this.ultCharge = Math.min(100, this.ultCharge + (e.isBoss ? 35 : 14));
    this.callbacks.onProgressEvent?.({
      killsDelta: 1,
      bossKilled: e.isBoss,
      maxCombo: this.maxRunCombo,
    });
    this.markedEnemyIds.delete(e.id);
    soundEngine.playEnemyDefeated();

    const burstColor = e.isBoss ? 0xfbbf24 : e.isElite ? 0xc084fc : 0x38bdf8;
    this.spawnParticles(e.x, 1.0, e.z, burstColor, e.isBoss ? 44 : e.isElite ? 28 : 20);
    this.spawnShockwave(e.x, e.z, burstColor, e.isBoss ? 5.6 : e.isElite ? 3.2 : 2.1, e.isBoss ? 0.5 : 0.32);

    if (e.isBoss) {
      soundEngine.playShockwave();
      this.hitstopTimer = 0.09;
      this.shakeIntensity = 0.52;
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
    } else if (e.isElite) {
      soundEngine.playShockwave();
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.036);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.24);
    } else {
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

    // Phase 3–4: Elite Volatile Affix spawns 0.85s ground telegraph blast on death
    if (e.eliteAffix === 'volatile' || e.eliteAffixes?.includes('volatile')) {
      const blastRadius = 2.85;
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
        timer: 0.85,
        maxTimer: 0.85,
        damage: Math.round(e.damage * 1.15),
        ring,
        fill,
      });
    }

    const goldAmt = Math.max(1, Math.round(e.goldValue * this.baseStats.goldGainMult));
    this.spawnLootOrb(e.x, e.z, 'xp', e.xpValue);
    this.spawnLootOrb(e.x + 0.35, e.z - 0.25, 'gold', goldAmt);
    if (e.isBoss || Math.random() < 0.14) {
      this.spawnLootOrb(
        e.x - 0.35,
        e.z + 0.25,
        'gem',
        e.isBoss ? (this.isTowerMode ? 15 + Math.floor(this.towerFloor / 3) * 3 : 12) : 2
      );
    }
    if (Math.random() < 0.15) {
      this.spawnLootOrb(e.x, e.z + 0.4, 'heal', Math.round(this.maxHp * 0.12));
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

    this.releaseObject(e.model.root);
    this.releaseObject(e.shadow);
    this.releaseObject(e.telegraphGroup);
    if (e.punishRingMesh) this.releaseObject(e.punishRingMesh);
    if (e.eliteAuraRingMesh) this.releaseObject(e.eliteAuraRingMesh);
    if (e.eliteAuraRingMesh2) this.releaseObject(e.eliteAuraRingMesh2);
    this.releaseObject(e.laserLine);
    this.enemies.splice(index, 1);

    if (this.enemies.length === 0) {
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
        if (this.waveIndex + 1 < stage.waves.length) {
          this.spawnWave(this.waveIndex + 1);
        } else {
          this.onStageCleared();
        }
      }
    }
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
      soundEngine.playVictory();
      this.phase = GamePhase.VICTORY;
      this.syncHudImmediate();
      this.callbacks.onRunEnded(true, {
        chapterId: this.currentChapter.id,
        stageReached: 1,
        kills: 1,
        gold: this.runGold + 160,
        gems: this.runGems + 12,
        isArenaMode: true,
        arenaOpponentName: this.arenaOpponentName,
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
        isTowerMode: false,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
        activeSynergies: evaluateActiveSynergies(this.activeSkills),
      });
      return;
    }

    this.portalOpen = true;
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

  private damagePlayer(rawAmount: number, cause?: DefeatCauseInfo): void {
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
    this.invulnTimer = 0.55;
    this.hitFlashTimer = 0.22;
    this.lastPlayerHitAt = performance.now();
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
    soundEngine.playPlayerHurt();

    if (this.baseStats.heroId === 'alex') {
      this.alexGuaranteedCrit = true;
    }

    const effectiveDr = Math.min(
      0.8,
      this.baseStats.damageReduction + (this.isChampionshipMode ? this.championshipDrBonus : 0)
    );
    let dmg = Math.max(2, Math.round(rawAmount * (1 - effectiveDr)));
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
        starDust: this.isDailyRiftMode
          ? Math.max(15, this.dailyRiftStageIdx * 28)
          : this.isElementalTowerMode
          ? Math.max(0, (this.elementalTowerFloor - 1) * 18)
          : 0,
        petEssence: this.isDailyRiftMode
          ? Math.max(4, this.dailyRiftStageIdx * 8)
          : this.isElementalTowerMode
          ? Math.max(0, (this.elementalTowerFloor - 1) * 6)
          : 0,
        maxCombo: this.maxRunCombo,
        damageBreakdown: this.getDamageBreakdownSnapshot(),
        defeatCause: this.lastDamageSource ?? undefined,
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
          const xpBonus = this.baseStats.heroId === 'alex' ? 1.12 : 1.0;
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

  private updatePortalAndShrine(dt: number): void {
    const vortexMat = this.portal.vortex.material as THREE.MeshBasicMaterial;
    if (this.portalOpen) {
      vortexMat.opacity = THREE.MathUtils.damp(vortexMat.opacity, 0.78, 6, dt);
      this.portal.ringMat.emissiveIntensity = 1.6 + Math.sin(this.elapsed * 5) * 0.4;
      this.portal.vortex.rotation.z += dt * 2.8;

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
    const targetCamX = THREE.MathUtils.clamp(this.px * 0.55, -5.5, 5.5);
    const targetCamZ = THREE.MathUtils.clamp(this.pz * 0.7 + 12.2, 6.5, 22.0);
    const targetCamY = 16.5;

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

    if (this.shakeIntensity > 0.005) {
      if (this.screenShakeEnabled) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      }
      this.shakeIntensity *= Math.exp(-14 * dt);
    } else {
      this.shakeIntensity = 0;
    }

    _v1.set(
      THREE.MathUtils.clamp(this.px * 0.45, -4, 4),
      0.5,
      THREE.MathUtils.clamp(this.pz * 0.72 - 1.4, -7, 7)
    );
    this.camera.lookAt(_v1);
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
      if (excludeIds?.has(e.id)) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
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
    const sx = ((_v2.x + 1) / 2) * w;
    const sy = ((-_v2.y + 1) / 2) * h;

    this.callbacks.onFloatingDamage({
      id: this.nextDmgId++,
      x: sx,
      y: sy,
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
    const rival = this.enemies.find((e) => e.isArenaRival);
    const heroDef = HERO_MAP[this.baseStats.heroId] ?? HERO_MAP.artemis;
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
        ? '💎 Hầm Mỏ Kho Báu'
        : this.isChampionshipMode
        ? '🏆 Giải Đấu Quán Quân'
        : this.isPantheonMode
        ? '👑 Điện Thần 3D'
        : this.isAbyssalMode
        ? '🟣 Hố Sâu Đột Biến'
        : this.isGuildWarMode
        ? '🏰 Chiến Trường Bang'
        : this.isBloodMoonMode
        ? '🌑 Đêm Trăng Máu'
        : this.isCrystalDefenseMode
        ? '💎 Thủ Thành Pha Lê'
        : this.isWorldBossMode
        ? '🐉 Boss Thế Giới'
        : this.isCoopRaidMode
        ? '🤝 Co-op AI 3D'
        : this.isElementalTowerMode && elemDef
        ? `💠 ${elemDef.name}`
        : this.isArenaMode
        ? '⚔️ Arena 1v1'
        : this.isGuildBossMode
        ? '🛡️ Boss Bang'
        : this.isDailyRiftMode
        ? `🌌 Bí Cảnh`
        : this.isBossRushMode
        ? `⚔️ Săn Boss`
        : this.isTowerMode
        ? `🗼 Tháp Vô Tận`
        : this.nightmareTier > 0
        ? `${this.currentChapter.zodiacIcon} ${this.currentChapter.zodiacName} · ${this.nightmareConfig.label}`
        : `${this.currentChapter.zodiacIcon} ${this.currentChapter.zodiacName}`,
      heroName: this.baseStats.heroName,
      enemiesRemaining: this.enemies.length,
      portalOpen: this.portalOpen,
      isBossStage: isBossFloor || this.isPantheonMode || this.isChampionshipMode,
      lastPlayerHitAt: this.lastPlayerHitAt,
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
      activeSkillReady: this.activeSkillCooldown <= 0.05,
      perfectDodgeBannerTimer:
        this.perfectDodgeBannerTimer > 0 ? this.perfectDodgeBannerTimer : undefined,
      perfectDodgeBuffTimer:
        this.perfectDodgeBuffTimer > 0 ? Number(this.perfectDodgeBuffTimer.toFixed(1)) : undefined,
      perfectDodgeCount: this.perfectDodgeCount,
      nightmareTier: this.nightmareTier > 0 ? this.nightmareTier : undefined,
      nightmareMutatorLabels:
        this.nightmareTier > 0 ? this.nightmareConfig.mutators.map((m) => m.name) : undefined,
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
    });
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
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
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

    if (this.artemisModel) {
      this.releaseObject(this.artemisModel);
      this.artemisModel = undefined;
      this.artemisMotion = undefined;
    }
    if (this.dragonMount) {
      this.releaseObject(this.dragonMount);
      this.dragonMount = undefined;
    }
    this.releaseObject(this.scene);
    this.contactShadowTex.dispose();
    this.keyLight.shadow.dispose();
    this.envRenderTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
    void _mat4;
    void _v3;
  }
}
