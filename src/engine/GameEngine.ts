import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeObjectResources } from './resources';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import { HERO_MAP } from '../data/heroesData';
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
import {
  ArenaOpponent,
  ChapterDefinition,
  ComputedPlayerStats,
  CoopAllySummary,
  CoopRaidDifficulty,
  DailyRiftMutatorPair,
  DamageBreakdown,
  ElementalTowerId,
  EnemyKind,
  FloatingDamage,
  GamePhase,
  GraphicsQuality,
  HeroId,
  HudSnapshot,
  JoystickState,
  LobbyCameraPreset,
  PetId,
  RuneId,
  SkillId,
  StageEventAfter,
  WheelOutcome,
} from '../types/game';
import {
  createCompanionModel,
  createEnemyModel,
  createHeroModel,
  createPetModel,
  createPillarModel,
  createPortalModel,
  createShrineModel,
  createSpiritCrystalModel,
  createUrnModel,
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

// Pre-allocated math helpers for zero GC in tick
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _dummy = new THREE.Object3D();

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
  bossPhase: 1 | 2;
  phaseTransitioned: boolean;
  burnTimer: number;
  burnDps: number;
  poisonDps: number;
  chillTimer: number;
  hitFlashTimer: number;
  phaseAngle: number;
  model: EnemyModelRefs;
  shadow: THREE.Mesh;
  telegraphGroup: THREE.Group;
  telegraphFill: THREE.Mesh;
  laserLine: THREE.Line;
}

interface Projectile {
  active: boolean;
  isEnemy: boolean;
  isSword: boolean;
  homing: boolean;
  source?: 'basic' | 'ultimate' | 'pet' | 'elemental';
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
    skills: Partial<Record<SkillId, number>>
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
      maxCombo?: number;
      damageBreakdown?: DamageBreakdown;
    }
  ) => void;
  onProgressEvent?: (ev: {
    killsDelta?: number;
    stageCleared?: boolean;
    bossKilled?: boolean;
    maxCombo?: number;
    seenEnemyKind?: EnemyKind;
  }) => void;
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
  private heroShadow!: THREE.Mesh;
  private heroShieldMesh!: THREE.Mesh;
  private lobbyHaloGroup: THREE.Group | null = null;
  private combatAuraGroup: THREE.Group | null = null;
  private petModel: THREE.Group | null = null;
  private builtPetId: PetId | null = null;
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
  private currentChapter: ChapterDefinition = CHAPTERS[0];
  private isTowerMode = false;
  private towerFloor = 0;
  private towerWaveDefs: Array<Array<{ kind: EnemyKind; count: number; isElite?: boolean }>> = [];
  private isBossRushMode = false;
  private bossRushRound = 0;
  private readonly bossRushTotalRounds = 5;
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
    const laneOuterGeo = new THREE.PlaneGeometry(1.18, 16);
    laneOuterGeo.translate(0, 0, 8);
    const laneFillGeo = new THREE.PlaneGeometry(1.04, 16);
    laneFillGeo.translate(0, 0, 8);
    for (let i = 0; i < 8; i++) {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(
        laneOuterGeo,
        new THREE.MeshBasicMaterial({
          color: 0xef4444,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      outer.rotation.x = -Math.PI / 2;

      const fillMesh = new THREE.Mesh(
        laneFillGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        })
      );
      fillMesh.rotation.x = -Math.PI / 2;
      fillMesh.position.y = 0.01;
      fillMesh.scale.set(0.1, 1, 1);

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

  private buildHero(): void {
    if (this.hero) {
      this.releaseObject(this.hero.root);
      this.releaseObject(this.heroShadow);
    }

    this.hero = createHeroModel(this.heroVisualCfg);
    this.hero.root.position.set(this.px, 0, this.pz);
    this.entitiesGroup.add(this.hero.root);

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

    if (this.lobbyHaloGroup) {
      this.releaseObject(this.lobbyHaloGroup);
    }
    const auraPrimary = this.heroVisualCfg.auraPrimaryHex ?? 0xfbbf24;
    const auraSecondary = this.heroVisualCfg.auraSecondaryHex ?? this.weaponAccentHex;
    const pedestalTint = this.heroVisualCfg.pedestalTintHex ?? this.currentChapter.trimHex;
    const constellationLevels = this.heroVisualCfg.constellationLevels ?? this.baseStats.constellationLevels ?? [];

    this.lobbyHaloGroup = new THREE.Group();
    this.lobbyHaloGroup.position.set(0, 0.035, 4.5);

    // Tiered Star Pedestal (Sảnh 3D Đổi Bệ Tinh Tú)
    const pedestalBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 1.32, 0.14, 32),
      new THREE.MeshStandardMaterial({
        color: 0x0b1024,
        roughness: 0.32,
        metalness: 0.84,
      })
    );
    pedestalBase.position.y = -0.08;
    pedestalBase.receiveShadow = true;

    const pedestalTrim = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.034, 8, 40),
      new THREE.MeshStandardMaterial({
        color: pedestalTint,
        emissive: pedestalTint,
        emissiveIntensity: 0.95,
        roughness: 0.22,
        metalness: 0.85,
      })
    );
    pedestalTrim.rotation.x = Math.PI / 2;
    pedestalTrim.position.y = -0.005;

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

    // 12 Constellation Orbital Star Crystals (Hào Quang 12 Chòm Sao)
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
        Math.cos(ang) * 1.44,
        isLit ? 0.18 + (i % 2) * 0.05 : 0.08,
        Math.sin(ang) * 1.44
      );
      this.lobbyHaloGroup.add(gem);
    }

    this.lobbyHaloGroup.add(pedestalBase, pedestalTrim, outerHalo, innerHalo);
    this.lobbyHaloGroup.visible = this.phase === GamePhase.TITLE;
    this.entitiesGroup.add(this.lobbyHaloGroup);

    if (this.combatAuraGroup) {
      this.releaseObject(this.combatAuraGroup);
    }
    this.combatAuraGroup = new THREE.Group();
    const combatRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.76, 0.86, 32),
      new THREE.MeshBasicMaterial({
        color: auraPrimary,
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
    if (desiredPet !== this.builtPetId) {
      if (this.petModel) {
        this.releaseObject(this.petModel);
        this.petModel = null;
      }
      this.builtPetId = desiredPet;
      if (desiredPet) {
        this.petModel = createPetModel(desiredPet);
        this.petModel.position.set(-1.12, 1.05, 4.75);
        this.entitiesGroup.add(this.petModel);
      }
    }
  }

  public updateLoadoutAppearance(
    stats: ComputedPlayerStats,
    visualCfg: HeroVisualConfig
  ): void {
    const visualChanged = JSON.stringify(this.heroVisualCfg) !== JSON.stringify(visualCfg);
    const companionsChanged = this.baseStats.heroId !== stats.heroId ||
      this.baseStats.equippedPetId !== stats.equippedPetId ||
      this.baseStats.equippedRunes.includes('healing_sprite') !== stats.equippedRunes.includes('healing_sprite');
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

  public startChapter(chapterId: number, stats: ComputedPlayerStats): void {
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
    this.currentChapter = ch;
    this.baseStats = stats;

    this.buildArena(ch);
    this.resetRunState(stats);

    this.rebuildCompanions();
    this.loadStage(0);
    this.phase = GamePhase.PLAYING;
    this.syncHudImmediate();
  }

  public startEndlessTower(stats: ComputedPlayerStats): void {
    this.isTowerMode = true;
    this.towerFloor = 1;
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

  public startBossRush(stats: ComputedPlayerStats): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = true;
    this.bossRushRound = 1;
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

  public startDailyRift(stats: ComputedPlayerStats, riftPair: DailyRiftMutatorPair): void {
    this.isTowerMode = false;
    this.towerFloor = 0;
    this.isBossRushMode = false;
    this.bossRushRound = 0;
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

  private resetRunState(stats: ComputedPlayerStats): void {
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

  public rotateLobbyHero(deltaRad: number): void {
    this.lobbyTargetYaw += deltaRad;
    this.lobbyAutoSpinIdleTimer = 3.2;
  }

  public resetLobbyHeroRotation(): void {
    this.lobbyTargetYaw = 0.18;
    this.lobbyAutoSpinIdleTimer = 0;
  }

  public applySkillChoice(skillId: SkillId): void {
    const current = this.activeSkills[skillId] ?? 0;
    this.activeSkills[skillId] = current + 1;

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
      this.shield += Math.round(this.maxHp * 0.45);
    } else if (skillId === 'revive') {
      this.revivesLeft += 1;
      this.hasFullRevive = true;
    } else if (skillId === 'bomb_sprite' || skillId === 'laser_sprite') {
      this.rebuildCompanions();
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
      this.releaseObject(e.laserLine);
    });
    this.enemies = [];

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
    const hpMult = 0.95 + round * 0.42;
    const dmgMult = 0.95 + round * 0.22;

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
    const enemyHpScale = this.dailyRiftPair?.enemyHpMult ?? 1.2;
    const bossScale = this.dailyRiftPair?.bossScaleMult ?? 1.2;
    const stageScale = 1 + this.dailyRiftStageIdx * 0.25;
    const hpMult = 1.15 * stageScale * enemyHpScale * (this.dailyRiftStageIdx >= 2 ? bossScale : 1);
    const dmgMult = 1.05 + this.dailyRiftStageIdx * 0.2;
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
      stageShield += Math.round(this.maxHp * 0.5);
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

    const hpMult = 0.9 + this.towerFloor * 0.22;
    const dmgMult = 0.92 + this.towerFloor * 0.11;
    const bossTitle = `Thủ Lĩnh Tầng ${this.towerFloor} · ${this.currentChapter.bossName}`;
    this.spawnEnemyGroups(groups, hpMult, dmgMult, bossTitle);
  }

  private spawnWave(waveIdx: number): void {
    const stage = this.currentChapter.stages[this.stageIndex];
    const wave = stage.waves[waveIdx];
    if (!wave) return;
    this.waveIndex = waveIdx;

    const stageMult = 1 + this.stageIndex * 0.14;
    const hpMult = this.currentChapter.hpScale * stageMult;
    const dmgMult = this.currentChapter.dmgScale * (1 + this.stageIndex * 0.085);
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
    telegraphGroup.position.set(x, 0.05, z);
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

    const speedScale = this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.enemySpeedMult : 1.0;
    const eliteMult = isElite && !isBoss ? 1.75 : 1.0;
    const finalHp = Math.round(baseHp * hpMult * eliteMult);
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
      speed: speed * speedScale,
      damage: Math.round(damage * dmgMult * (isElite ? 1.25 : 1.0)),
      xpValue: Math.round(xpValue * (isElite ? 1.5 : 1.0)),
      goldValue: Math.round(goldValue * this.currentChapter.goldBonusMult * (isElite ? 1.6 : 1.0)),
      isBoss,
      spawnTimer: 0.48,
      attackTimer: 0.7 + Math.random() * 0.9,
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

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
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
    } else if ((code === 'KeyQ' || code === 'KeyE') && !this.keys[code]) {
      this.triggerHeroUltimate();
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

  private onPointerDown = (e: PointerEvent) => {
    if (this.phase === GamePhase.TITLE) {
      soundEngine.unlock();
      this.lobbyDragActive = true;
      this.lobbyDragPointerId = e.pointerId;
      this.lobbyDragLastX = e.clientX;
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
      this.lobbyDragLastX = e.clientX;
      this.rotateLobbyHero(dx * 0.013);
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
      const sway = Math.sin(this.elapsed * 0.45) * 0.45;
      let targetCamX = sway;
      let targetCamY = 2.45;
      let targetCamZ = 8.6;
      let lookX = 0;
      let lookY = 0.72;

      if (this.lobbyCameraPreset === 'closeup') {
        targetCamX = sway * 0.25;
        targetCamY = 1.92;
        targetCamZ = 6.95;
        lookX = 0;
        lookY = 0.92;
      } else if (this.lobbyCameraPreset === 'wardrobe') {
        targetCamX = 0.85 + sway * 0.16;
        targetCamY = 2.1;
        targetCamZ = 7.45;
        lookX = 0.9;
        lookY = 0.85;
      } else if (this.lobbyViewMode === 'gear') {
        targetCamX = sway * 0.35;
        targetCamY = 2.18;
        targetCamZ = 7.95;
        lookX = 0;
        lookY = 0.05;
      } else if (this.lobbyViewMode === 'heroes') {
        targetCamX = 0.95 + sway * 0.2;
        targetCamY = 2.15;
        targetCamZ = 7.9;
        lookX = 1.05;
        lookY = 0.15;
      }

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 4.5, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 4.5, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, 4.5, dt);
      this.camera.lookAt(lookX, lookY, 4.4);

      if (this.lobbyAutoSpinIdleTimer > 0) {
        this.lobbyAutoSpinIdleTimer -= dt;
      } else if (!this.lobbyDragActive) {
        this.lobbyTargetYaw += dt * 0.28;
      }
      this.lobbyYaw = THREE.MathUtils.damp(this.lobbyYaw, this.lobbyTargetYaw, 8.5, dt);

      const mountOffset = this.hero.mountGroup ? 0.68 : 0;
      this.hero.root.rotation.y = this.lobbyYaw;
      this.hero.bodyGroup.position.y = mountOffset + Math.sin(this.elapsed * 2.2) * 0.04;
      this.hero.capeTail.rotation.x = 0.22 + Math.sin(this.elapsed * 3.1) * 0.07;
      if (this.hero.leftWingPivot && this.hero.rightWingPivot) {
        const flap = Math.sin(this.elapsed * 3.2) * 0.24;
        this.hero.leftWingPivot.rotation.y = 0.22 + flap;
        this.hero.rightWingPivot.rotation.y = -0.22 - flap;
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
      if (this.hero.artifactGroup) {
        this.hero.artifactGroup.rotation.y += dt * 1.35;
        this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 2.6) * 0.07;
      }
      this.hero.magicOrb.visible = true;
      this.hero.magicOrb.rotation.z += dt * 2.8;
      this.hero.bowGroup.visible = false;
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

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    if (this.stageBannerTimer > 0) {
      this.stageBannerTimer -= dt;
      if (this.stageBannerTimer <= 0) {
        this.stageBannerText = null;
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        this.comboCount = 0;
      }
    }

    this.updateStarfallWeather(dt);
    this.updatePlayer(dt);
    this.updateCoopAllies(dt);
    this.updatePassivesAndPeriodicSkills(dt);
    this.updateOrbitOrbs(dt);
    this.updateCompanions(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateMeteors(dt);
    this.updateLootOrbs(dt);
    this.updateParticles(dt);
    this.updateShockwaves(dt);
    this.updateUltColumns(dt);
    this.updateLightning(dt);
    this.updatePortalAndShrine(dt);
    this.updateCamera(dt);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.syncHudImmediate();
    }
  }

  private updateStarfallWeather(dt: number): void {
    if (!this.starfallEnabled || !this.starfallMesh) return;
    for (let i = 0; i < this.STARFALL_COUNT; i++) {
      const s = this.starfallSeeds[i];
      s.y += s.vy * dt;
      s.x += s.vx * dt;
      if (s.y < 0.3) {
        s.y = 14 + Math.random() * 3.5;
        s.x = (Math.random() - 0.5) * 30;
        s.z = (Math.random() - 0.5) * 32;
      }
      _dummy.position.set(s.x, s.y, s.z);
      _dummy.rotation.y = this.elapsed * 1.9 + s.phase;
      _dummy.scale.setScalar(s.scale * (0.75 + 0.25 * Math.sin(this.elapsed * 3.6 + s.phase)));
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
      mult *= 1.35;
    }
    if (this.hasRune('star_of_fury') && this.hp < this.maxHp * 0.6) {
      mult *= 1.25;
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
    if (this.wukongOverdriveTimer > 0) this.wukongOverdriveTimer -= dt;

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

    const moveMult = this.isDailyRiftMode && this.dailyRiftPair ? this.dailyRiftPair.playerSpeedMult : 1.0;
    const effectiveMoveSpeed = this.baseStats.moveSpeed * moveMult;

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

    if (this.hero.weaponAuraGroup) {
      this.hero.weaponAuraGroup.rotation.z += dt * 2.2;
      this.hero.weaponAuraGroup.rotation.y += dt * 1.25;
    }
    if (this.hero.artifactGroup) {
      this.hero.artifactGroup.rotation.y += dt * 1.65;
      this.hero.artifactGroup.position.y = 1.38 + Math.sin(this.elapsed * 3.1) * 0.08;
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
      (this.alexOverdriveTimer > 0 ? 0.45 : 0);
    const attackInterval = Math.max(
      0.13,
      0.56 / (this.baseStats.attackSpeedMult * speedBonus)
    );

    const canFire = !isMoving || isThor;
    if (canFire && nearest && nearest.spawnTimer <= 0) {
      if (this.attackCooldown <= 0) {
        this.attackCooldown = attackInterval;
        this.queuePlayerVolley();
      }
      const drawProgress = Math.max(0, 1 - this.attackCooldown / attackInterval);
      this.hero.nockedArrow.position.z = 0.2 - drawProgress * 0.26;
      this.hero.drawArm.position.z = 0.08 - drawProgress * 0.16;
      this.hero.bowGroup.position.z = 0.46 - drawProgress * 0.04;
    } else {
      this.hero.nockedArrow.position.z = 0.1;
      this.hero.drawArm.position.z = 0.06;
      this.hero.bowGroup.position.z = 0.46;
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
    proj.vx = dirX * this.baseStats.arrowSpeed;
    proj.vz = dirZ * this.baseStats.arrowSpeed;
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
      if (this.artemisMarkTimer >= 2.2) {
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

    // 2. Flying Swords / Sword of Time
    const swordStacks = (this.activeSkills.flying_swords ?? 0) + (this.hasRune('sword_of_time') ? 1 : 0);
    if (swordStacks > 0) {
      this.swordStrikeTimer += dt;
      const interval = this.hasRune('sword_of_time') ? 1.45 : 1.7;
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
          proj.damage = this.baseStats.attack * this.getCurrentAtkMultiplier() * 1.22;
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
    const radius = isGiant ? 3.2 : 2.3;
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
    const orbitR = 2.45;
    const speed = (this.activeSkills.super_circle ?? 0) > 0 ? 4.8 : 3.8;
    const baseAngle = this.elapsed * speed;
    const sawRune = this.hasRune('sawblade_circle');
    const dmgMult = 0.72 * (sawRune ? 1.55 : 1.0);

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
        if (this.petFireTimer >= pDef.fireInterval) {
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

      if (hasSprites && this.spriteFireTimer >= 1.45) {
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
    colorHex = 0xf43f5e
  ): void {
    const proj = this.enemyOrbPool.find((p) => !p.active);
    if (!proj) return;
    proj.active = true;
    proj.isEnemy = true;
    proj.x = x;
    proj.y = 0.98;
    proj.z = z;
    proj.vx = vx;
    proj.vz = vz;
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
      if (e.hp <= 0) {
        this.killEnemy(i);
        continue;
      }

      const superFreeze = (this.activeSkills.super_freeze ?? 0) > 0;
      const slowMult = e.chillTimer > 0 ? (superFreeze ? 0.42 : 0.58) : 1.0;
      if (e.chillTimer > 0) e.chillTimer -= dt;

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

      const isEnraged = e.isBoss && e.bossPhase === 2;

      // Hide danger lanes each frame unless active enemy lane telegraph refreshes them
      if (e.telegraphType !== 'none') {
        e.telegraphTimer -= dt * slowMult;
        const progress = Math.min(
          1,
          1 - e.telegraphTimer / Math.max(0.01, e.telegraphDuration)
        );
        const pulse = 0.65 + 0.35 * Math.sin(this.elapsed * 20);

        if (e.telegraphType === 'shot') {
          e.laserLine.visible = true;
          const posAttr = e.laserLine.geometry.getAttribute(
            'position'
          ) as THREE.BufferAttribute;
          posAttr.setXYZ(0, e.x, 0.95, e.z);
          posAttr.setXYZ(1, e.x + e.aimX * 14, 0.95, e.z + e.aimZ * 14);
          posAttr.needsUpdate = true;
        } else if (e.telegraphType === 'slam' || e.telegraphType === 'lunge') {
          e.telegraphGroup.visible = true;
          e.telegraphGroup.position.set(e.slamX, 0.05, e.slamZ);
          e.telegraphGroup.scale.setScalar(e.slamRadius * (0.98 + pulse * 0.03));
          e.telegraphFill.scale.setScalar(0.15 + progress * 0.85);
        } else if (e.telegraphType === 'lane') {
          e.laneAngles.forEach((ang, lIdx) => {
            const lane = this.dangerLanePool[lIdx % this.dangerLanePool.length];
            if (!lane) return;
            lane.active = true;
            lane.mesh.visible = true;
            lane.mesh.position.set(e.x, 0.04, e.z);
            lane.mesh.rotation.y = ang;
            lane.fillMesh.scale.set(0.1 + progress * 0.9, 1, 1);
            (lane.fillMesh.material as THREE.MeshBasicMaterial).opacity = 0.38 + pulse * 0.32;
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
          e.attackTimer = e.isBoss
            ? isEnraged
              ? 1.05
              : 1.45
            : 1.85 + Math.random() * 0.8;
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
            const roll = Math.random();
            const baseYaw = Math.atan2(dirX, dirZ);
            if (roll < 0.34) {
              e.telegraphType = 'lane';
              e.telegraphDuration = isEnraged ? 0.75 : 0.88;
              e.telegraphTimer = e.telegraphDuration;
              e.laneAngles = isEnraged
                ? [baseYaw - 0.36, baseYaw, baseYaw + 0.36]
                : [baseYaw - 0.22, baseYaw + 0.22];
              soundEngine.playBossTelegraph();
            } else if (roll < 0.62) {
              e.telegraphType = 'shot';
              e.telegraphDuration = isEnraged ? 0.56 : 0.72;
              e.telegraphTimer = e.telegraphDuration;
              e.aimX = dirX;
              e.aimZ = dirZ;
            } else if (roll < 0.86) {
              e.telegraphType = 'slam';
              e.telegraphDuration = isEnraged ? 0.75 : 0.9;
              e.telegraphTimer = e.telegraphDuration;
              e.slamX = this.px;
              e.slamZ = this.pz;
              e.slamRadius = e.kind === EnemyKind.ZODIAC_BOSS || isEnraged ? 3.8 : 3.0;
              soundEngine.playBossTelegraph();
            } else {
              e.telegraphType = 'spiral';
              e.telegraphDuration = 0.62;
              e.telegraphTimer = 0.62;
              e.aimX = dirX;
              e.aimZ = dirZ;
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
        this.damagePlayer(e.damage);
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
        this.damagePlayer(e.damage);
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
            e.kind === EnemyKind.ZODIAC_BOSS ? this.currentChapter.trimHex : 0xa855f7
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
            0xf97316
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
            : 0xf43f5e
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
            0xf43f5e
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
          this.damagePlayer(e.damage * 1.15);
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
          e.kind === EnemyKind.ZODIAC_BOSS ? this.currentChapter.trimHex : 0xf97316
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
                const novaDmg = this.baseStats.attack * this.getCurrentAtkMultiplier() * 2.6;
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
            p.damage *= 0.85;
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
        this.damagePlayer(p.damage);
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
    let mult = 1.0;
    if (this.markedEnemyIds.has(e.id)) mult += 0.25;
    if (e.isBoss && (this.baseStats.bossDamageBonus ?? 0) > 0) {
      mult += this.baseStats.bossDamageBonus;
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

    const finalDmg = Math.max(1, Math.round(amount * mult));
    e.hp -= finalDmg;
    e.hitFlashTimer = 0.1;

    if (this.isGuildBossMode && e.isBoss) {
      this.guildBossTotalDamage += finalDmg;
    }
    if (this.isWorldBossMode && e.isBoss) {
      this.worldBossTotalDamage += finalDmg;
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

    // Boss Phase II Transition (< 55% HP)
    if (e.isBoss && !e.phaseTransitioned && e.hp > 0 && e.hp <= e.maxHp * 0.55) {
      e.phaseTransitioned = true;
      e.bossPhase = 2;
      e.telegraphType = 'none';
      e.laserLine.visible = false;
      e.telegraphGroup.visible = false;
      this.dangerLanePool.forEach((l) => {
        l.active = false;
        l.mesh.visible = false;
      });
      e.attackTimer = 0.55;
      this.hitstopTimer = 0.085;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.52);
      soundEngine.playBossPhaseRoar();
      this.spawnShockwave(e.x, e.z, 0xf43f5e, 6.2, 0.52);
      this.spawnParticles(e.x, 1.2, e.z, 0xf43f5e, 34);
      this.emitFloatingNumber(e.x, 2.4, e.z, 0, true, false, 'fire', 'PHA II · CUỒNG NỘ!');
    }

    // Dracoola Lifesteal (4% damage dealt)
    if (this.baseStats.heroId === 'dracoola' && this.hp < this.maxHp) {
      const leach = Math.max(1, Math.round(finalDmg * 0.04));
      this.hp = Math.min(this.maxHp, this.hp + leach);
    }

    const flameRuneMult = this.hasRune('rune_flame') ? 1.6 : 1.0;
    if (blaze) {
      const superMult = (this.activeSkills.super_blaze ?? 0) > 0 ? 2.2 : 1.0;
      e.burnTimer = 2.8;
      e.burnDps = Math.max(e.burnDps, finalDmg * 0.26 * superMult * flameRuneMult);
    }
    if (poison) {
      e.poisonDps = Math.max(e.poisonDps, finalDmg * 0.22 * flameRuneMult);
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
      label,
      isSuperCrit
    );

    // Chain Lightning (Storm Skill or Thor Crit Passive)
    const shouldChain =
      storm || (isCrit && this.baseStats.heroId === 'thor');
    if (shouldChain) {
      const maxChains =
        this.baseStats.heroId === 'thor' || (this.activeSkills.super_bolt ?? 0) > 0
          ? 3
          : 1;
      const chainExclude = new Set<number>([e.id]);
      let currX = e.x;
      let currZ = e.z;
      for (let c = 0; c < maxChains; c++) {
        const nearby = this.findNearestEnemy(currX, currZ, chainExclude, 6.2);
        if (!nearby) break;
        chainExclude.add(nearby.id);
        const arcDmg = Math.max(
          2,
          Math.round(finalDmg * (this.hasRune('rune_frost') ? 0.6 : 0.45))
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

    // Bloodthirst / Healing Sprite heal on kill
    const vamp = (this.activeSkills.bloodthirst ?? 0) + (this.hasRune('healing_sprite') ? 0.6 : 0);
    if (vamp > 0) {
      const healAmt = Math.round(4 + this.maxHp * 0.025 * vamp);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      this.emitFloatingNumber(this.px, 1.9, this.pz, healAmt, false, true);
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

    this.releaseObject(e.model.root);
    this.releaseObject(e.shadow);
    this.releaseObject(e.telegraphGroup);
    this.releaseObject(e.laserLine);
    this.enemies.splice(index, 1);

    if (this.enemies.length === 0) {
      if (this.isBloodMoonMode) {
        this.bloodMoonSpawnTimer = Math.min(this.bloodMoonSpawnTimer, 0.45);
      } else if (this.isGuildWarMode) {
        this.guildWarSpawnTimer = Math.min(this.guildWarSpawnTimer, 0.55);
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

  private damagePlayer(rawAmount: number): void {
    if (this.invulnTimer > 0 || this.phase !== GamePhase.PLAYING) return;
    this.invulnTimer = 0.55;
    this.hitFlashTimer = 0.22;
    this.lastPlayerHitAt = performance.now();
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.28);
    soundEngine.playPlayerHurt();

    if (this.baseStats.heroId === 'alex') {
      this.alexGuaranteedCrit = true;
    }

    let dmg = Math.max(2, Math.round(rawAmount * (1 - this.baseStats.damageReduction)));
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
        stageReached: this.isAbyssalMode
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
        artifactShards: this.isAbyssalMode
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
        this.callbacks.onRequestEncounter(this.shrineKind, { ...this.activeSkills });
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
    const boss = this.enemies.find((e) => e.isBoss && !e.isArenaRival);
    const rival = this.enemies.find((e) => e.isArenaRival);
    const heroDef = HERO_MAP[this.baseStats.heroId] ?? HERO_MAP.artemis;
    const elemDef = this.isElementalTowerMode ? ELEMENTAL_TOWER_MAP[this.elementalTowerId] : null;
    const isBossFloor = this.isArenaMode
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
      stageName: this.isAbyssalMode
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
      chapterName: this.isAbyssalMode
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
        : `${this.currentChapter.zodiacIcon} ${this.currentChapter.zodiacName}`,
      heroName: this.baseStats.heroName,
      enemiesRemaining: this.enemies.length,
      portalOpen: this.portalOpen,
      isBossStage: isBossFloor,
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
        : null,
      bossHp: boss ? boss.hp : 0,
      bossMaxHp: boss ? boss.maxHp : 0,
      bossPhase: boss ? boss.bossPhase : 1,
      bossLayers: boss ? (this.isWorldBossMode || this.isGuildBossMode ? 8 : 5) : undefined,
      bossCurrentLayer: boss
        ? Math.max(
            1,
            Math.ceil(
              (Math.max(0, boss.hp) / Math.max(1, boss.maxHp)) *
                (this.isWorldBossMode || this.isGuildBossMode ? 8 : 5)
            )
          )
        : undefined,
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
      activeSkills: { ...this.activeSkills },
      stageBannerText: this.stageBannerText,
      comboCount: this.comboCount,
      comboTimerRatio: this.comboCount > 0 ? Math.max(0, this.comboTimer / this.comboWindow) : 0,
      comboTierLabel: this.getComboTierLabel(this.comboCount),
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
      },
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
    dom.removeEventListener('webglcontextlost', this.onContextLost);
    dom.removeEventListener('webglcontextrestored', this.onContextRestored);

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
