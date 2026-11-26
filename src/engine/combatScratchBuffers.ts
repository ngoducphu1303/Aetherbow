/**
 * Zero-GC Combat Frame Scratch Buffers (Wave 9 AAAA Performance Overhaul)
 *
 * Pre-allocates and reuses typed plain-object pools across 60Hz combat loops
 * (AutoPilot, Co-op AI Companions, Arena AI Rival arrow dodging, and Elemental/Chain AoE
 * victim collection) so hot paths produce ZERO heap array/object allocations per frame
 * after initial warmup — protecting Dell Latitude E5430 / Intel HD 4000 frame pacing.
 */

export interface ScratchArrowSnapshot {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface ScratchTelegraphSnapshot {
  kind: 'slam' | 'lane' | 'lunge' | 'spiral';
  x: number;
  z: number;
  radius: number;
  timeRemainingSec: number;
  endX?: number;
  endZ?: number;
}

export interface ScratchCoopTelegraphSnapshot {
  kind: 'slam' | 'lunge' | 'spiral';
  x: number;
  z: number;
  radius: number;
  timeRemainingSec: number;
}

export interface ScratchBulletSnapshot {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface ScratchHealOrbSnapshot {
  x: number;
  z: number;
}

export interface ScratchObstacleSnapshot {
  x: number;
  z: number;
  radius: number;
}

export interface ScratchAutoPilotEnemySnapshot {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  radius: number;
  staggerBroken: boolean;
}

export interface ScratchResonanceTrapSnapshot {
  x: number;
  z: number;
  ready: boolean;
  aoeRadius: number;
  label: string;
}

export interface ScratchCoopCandidateSnapshot<TEnemy> {
  id: number;
  x: number;
  z: number;
  isBoss: boolean;
  isElite: boolean;
  hp: number;
  alive: boolean;
  ref: TEnemy;
}

export interface ArrowSourceLike {
  active: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export interface EnemyOrbSourceLike {
  active: boolean;
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export interface LootOrbSourceLike {
  active: boolean;
  kind: string;
  x: number;
  z: number;
}

export interface ObstacleSourceLike {
  x: number;
  z: number;
  radius: number;
  intact?: boolean;
}

export interface EnemySourceLike {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  isElite: boolean;
  isTrainingDummy?: boolean;
  dead?: boolean;
  radius: number;
  spawnTimer: number;
  stunTimer?: number;
  telegraphType: string;
  telegraphTimer: number;
  slamX: number;
  slamZ: number;
  slamRadius: number;
  aimX: number;
  aimZ: number;
  laneAngles?: number[];
}

export interface ResonanceTrapSourceLike {
  x: number;
  z: number;
  cooldown: number;
  kind: string;
}

/**
 * Reusable object-pool backed scratch arrays for 60Hz combat loops.
 * Each list keeps a backing `pool` of plain objects and exposes a trimmed `view`
 * array whose `.length` matches the active count for the current frame.
 */
export class CombatFrameScratchPool<TEnemy extends EnemySourceLike> {
  private readonly arrowPoolBacking: ScratchArrowSnapshot[] = [];
  public readonly activeArrows: ScratchArrowSnapshot[] = [];

  private readonly bulletPoolBacking: ScratchBulletSnapshot[] = [];
  public readonly incomingBullets: ScratchBulletSnapshot[] = [];

  private readonly coopTelegraphPoolBacking: ScratchCoopTelegraphSnapshot[] = [];
  public readonly coopTelegraphs: ScratchCoopTelegraphSnapshot[] = [];

  private readonly coopCandidatePoolBacking: Array<ScratchCoopCandidateSnapshot<TEnemy>> = [];
  public readonly coopCandidates: Array<ScratchCoopCandidateSnapshot<TEnemy>> = [];

  private readonly autoTelegraphPoolBacking: ScratchTelegraphSnapshot[] = [];
  public readonly autoTelegraphs: ScratchTelegraphSnapshot[] = [];

  private readonly autoHealPoolBacking: ScratchHealOrbSnapshot[] = [];
  public readonly autoHealOrbs: ScratchHealOrbSnapshot[] = [];

  private readonly autoEnemyPoolBacking: ScratchAutoPilotEnemySnapshot[] = [];
  public readonly autoEnemies: ScratchAutoPilotEnemySnapshot[] = [];

  private readonly autoTrapPoolBacking: ScratchResonanceTrapSnapshot[] = [];
  public readonly autoTraps: ScratchResonanceTrapSnapshot[] = [];

  private readonly obstaclePoolBacking: ScratchObstacleSnapshot[] = [];
  public readonly intactObstacles: ScratchObstacleSnapshot[] = [];

  // Isolated non-aliasing scratch arrays for nested AoE/Elemental/Chain/Mechanism kills
  public readonly reactionScanScratch: TEnemy[] = [];
  public readonly reactionKillScratch: TEnemy[] = [];
  public readonly resonanceScanScratch: TEnemy[] = [];
  public readonly resonanceKillScratch: TEnemy[] = [];
  public readonly chainScanScratch: TEnemy[] = [];
  public readonly chainKillScratch: TEnemy[] = [];
  public readonly mechanismScanScratch: TEnemy[] = [];

  public fillActiveArrows(
    arrows: ReadonlyArray<ArrowSourceLike>,
    radius = 0.42
  ): ScratchArrowSnapshot[] {
    const out = this.activeArrows;
    out.length = 0;
    let count = 0;
    for (let i = 0; i < arrows.length; i++) {
      const a = arrows[i];
      if (!a.active) continue;
      let item = this.arrowPoolBacking[count];
      if (!item) {
        item = { x: a.x, z: a.z, vx: a.vx, vz: a.vz, radius };
        this.arrowPoolBacking.push(item);
      } else {
        item.x = a.x;
        item.z = a.z;
        item.vx = a.vx;
        item.vz = a.vz;
        item.radius = radius;
      }
      out.push(item);
      count += 1;
    }
    return out;
  }

  public fillIncomingBullets(
    orbs: ReadonlyArray<EnemyOrbSourceLike>,
    radius: number
  ): ScratchBulletSnapshot[] {
    const out = this.incomingBullets;
    out.length = 0;
    let count = 0;
    for (let i = 0; i < orbs.length; i++) {
      const o = orbs[i];
      if (!o.active) continue;
      let item = this.bulletPoolBacking[count];
      if (!item) {
        item = { x: o.x, z: o.z, vx: o.vx, vz: o.vz, radius };
        this.bulletPoolBacking.push(item);
      } else {
        item.x = o.x;
        item.z = o.z;
        item.vx = o.vx;
        item.vz = o.vz;
        item.radius = radius;
      }
      out.push(item);
      count += 1;
    }
    return out;
  }

  public fillIntactObstacles(obstacles: ReadonlyArray<ObstacleSourceLike>): ScratchObstacleSnapshot[] {
    const out = this.intactObstacles;
    out.length = 0;
    let count = 0;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.intact === false) continue;
      let item = this.obstaclePoolBacking[count];
      if (!item) {
        item = { x: o.x, z: o.z, radius: o.radius };
        this.obstaclePoolBacking.push(item);
      } else {
        item.x = o.x;
        item.z = o.z;
        item.radius = o.radius;
      }
      out.push(item);
      count += 1;
    }
    return out;
  }

  public fillCoopFrameSnapshots(
    enemies: ReadonlyArray<TEnemy>,
    enemyOrbs: ReadonlyArray<EnemyOrbSourceLike>,
    obstacles: ReadonlyArray<ObstacleSourceLike>
  ): void {
    const teleOut = this.coopTelegraphs;
    teleOut.length = 0;
    let teleCount = 0;

    const candOut = this.coopCandidates;
    candOut.length = 0;
    let candCount = 0;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (
        e.spawnTimer <= 0 &&
        (e.telegraphType === 'slam' || e.telegraphType === 'lunge' || e.telegraphType === 'spiral')
      ) {
        let tItem = this.coopTelegraphPoolBacking[teleCount];
        const tx = e.telegraphType === 'slam' ? e.slamX : e.x;
        const tz = e.telegraphType === 'slam' ? e.slamZ : e.z;
        const tr = Math.max(2.2, e.slamRadius || 3.0);
        const rem = Math.max(0, e.telegraphTimer);
        if (!tItem) {
          tItem = {
            kind: e.telegraphType,
            x: tx,
            z: tz,
            radius: tr,
            timeRemainingSec: rem,
          };
          this.coopTelegraphPoolBacking.push(tItem);
        } else {
          tItem.kind = e.telegraphType;
          tItem.x = tx;
          tItem.z = tz;
          tItem.radius = tr;
          tItem.timeRemainingSec = rem;
        }
        teleOut.push(tItem);
        teleCount += 1;
      }

      let cItem = this.coopCandidatePoolBacking[candCount];
      const alive = e.hp > 0 && e.spawnTimer <= 0;
      if (!cItem) {
        cItem = {
          id: e.id,
          x: e.x,
          z: e.z,
          isBoss: e.isBoss,
          isElite: e.isElite,
          hp: e.hp,
          alive,
          ref: e,
        };
        this.coopCandidatePoolBacking.push(cItem);
      } else {
        cItem.id = e.id;
        cItem.x = e.x;
        cItem.z = e.z;
        cItem.isBoss = e.isBoss;
        cItem.isElite = e.isElite;
        cItem.hp = e.hp;
        cItem.alive = alive;
        cItem.ref = e;
      }
      candOut.push(cItem);
      candCount += 1;
    }

    this.fillIncomingBullets(enemyOrbs, 0.35);
    this.fillIntactObstacles(obstacles);
  }

  public fillAutoPilotFrameSnapshots(
    enemies: ReadonlyArray<TEnemy>,
    enemyOrbs: ReadonlyArray<EnemyOrbSourceLike>,
    lootOrbs: ReadonlyArray<LootOrbSourceLike>,
    obstacles: ReadonlyArray<ObstacleSourceLike>,
    resonanceTraps: ReadonlyArray<ResonanceTrapSourceLike>,
    resolveTrapMeta: (kind: string) => { aoeRadius: number; label: string }
  ): void {
    const teleOut = this.autoTelegraphs;
    teleOut.length = 0;
    let teleCount = 0;

    const enemyOut = this.autoEnemies;
    enemyOut.length = 0;
    let enemyCount = 0;

    const pushTele = (
      kind: 'slam' | 'lane' | 'lunge' | 'spiral',
      x: number,
      z: number,
      radius: number,
      timeRemainingSec: number,
      endX?: number,
      endZ?: number
    ) => {
      let item = this.autoTelegraphPoolBacking[teleCount];
      if (!item) {
        item = { kind, x, z, radius, timeRemainingSec, endX, endZ };
        this.autoTelegraphPoolBacking.push(item);
      } else {
        item.kind = kind;
        item.x = x;
        item.z = z;
        item.radius = radius;
        item.timeRemainingSec = timeRemainingSec;
        item.endX = endX;
        item.endZ = endZ;
      }
      teleOut.push(item);
      teleCount += 1;
    };

    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (en.spawnTimer > 0) continue;

      if (!en.isTrainingDummy) {
        let eItem = this.autoEnemyPoolBacking[enemyCount];
        const broken = Boolean(en.stunTimer && en.stunTimer > 0);
        if (!eItem) {
          eItem = {
            id: en.id,
            x: en.x,
            z: en.z,
            hp: en.hp,
            maxHp: en.maxHp,
            isBoss: en.isBoss,
            radius: en.radius,
            staggerBroken: broken,
          };
          this.autoEnemyPoolBacking.push(eItem);
        } else {
          eItem.id = en.id;
          eItem.x = en.x;
          eItem.z = en.z;
          eItem.hp = en.hp;
          eItem.maxHp = en.maxHp;
          eItem.isBoss = en.isBoss;
          eItem.radius = en.radius;
          eItem.staggerBroken = broken;
        }
        enemyOut.push(eItem);
        enemyCount += 1;
      }

      if (en.telegraphType === 'none') continue;
      const rem = Math.max(0, en.telegraphTimer);
      if (en.telegraphType === 'slam') {
        pushTele('slam', en.slamX, en.slamZ, Math.max(2.2, en.slamRadius), rem);
      } else if (en.telegraphType === 'lane' && en.laneAngles && en.laneAngles.length > 0) {
        for (let aIdx = 0; aIdx < en.laneAngles.length; aIdx++) {
          const ang = en.laneAngles[aIdx];
          pushTele(
            'lane',
            en.x,
            en.z,
            1.55,
            rem,
            en.x + Math.sin(ang) * 18,
            en.z + Math.cos(ang) * 18
          );
        }
      } else if (en.telegraphType === 'lunge') {
        pushTele(
          'lunge',
          en.x,
          en.z,
          1.65,
          rem,
          en.x + en.aimX * 10,
          en.z + en.aimZ * 10
        );
      } else if (en.telegraphType === 'spiral') {
        pushTele('spiral', en.x, en.z, 3.6, rem);
      }
    }

    this.fillIncomingBullets(enemyOrbs, 0.42);

    const healOut = this.autoHealOrbs;
    healOut.length = 0;
    let healCount = 0;
    for (let i = 0; i < lootOrbs.length; i++) {
      const orb = lootOrbs[i];
      if (!orb.active || orb.kind !== 'heal') continue;
      let hItem = this.autoHealPoolBacking[healCount];
      if (!hItem) {
        hItem = { x: orb.x, z: orb.z };
        this.autoHealPoolBacking.push(hItem);
      } else {
        hItem.x = orb.x;
        hItem.z = orb.z;
      }
      healOut.push(hItem);
      healCount += 1;
    }

    this.fillIntactObstacles(obstacles);

    const trapOut = this.autoTraps;
    trapOut.length = 0;
    for (let i = 0; i < resonanceTraps.length; i++) {
      const t = resonanceTraps[i];
      const meta = resolveTrapMeta(t.kind);
      let trItem = this.autoTrapPoolBacking[i];
      if (!trItem) {
        trItem = {
          x: t.x,
          z: t.z,
          ready: t.cooldown <= 0,
          aoeRadius: meta.aoeRadius,
          label: meta.label,
        };
        this.autoTrapPoolBacking.push(trItem);
      } else {
        trItem.x = t.x;
        trItem.z = t.z;
        trItem.ready = t.cooldown <= 0;
        trItem.aoeRadius = meta.aoeRadius;
        trItem.label = meta.label;
      }
      trapOut.push(trItem);
    }
  }

  /**
   * Copies active enemy references into an isolated pre-allocated scratch array
   * so AoE loops can safely iterate while collecting kills without `[...this.enemies]`.
   */
  public copyEnemiesInto(source: ReadonlyArray<TEnemy>, target: TEnemy[]): TEnemy[] {
    target.length = 0;
    for (let i = 0; i < source.length; i++) {
      target.push(source[i]);
    }
    return target;
  }
}

export interface HazardPoolSlotLike {
  active: boolean;
  life: number;
}

/**
 * Zero-GC slot selector for Boss hazard pools.
 * Respects `maxActiveHazards` (Dell E5430 Lite-mode cap) by recycling the oldest active slot
 * in a single linear pass with zero temporary arrays or sorts.
 */
export function selectBossHazardSlot<T extends HazardPoolSlotLike>(
  pool: ReadonlyArray<T>,
  maxActiveHazards: number
): T | undefined {
  if (pool.length === 0) return undefined;
  const cap = Math.max(1, Math.floor(maxActiveHazards));
  let activeCount = 0;
  let freeSlot: T | undefined;
  let oldestActive: T | undefined;

  for (let i = 0; i < pool.length; i++) {
    const slot = pool[i];
    if (slot.active) {
      activeCount += 1;
      if (!oldestActive || slot.life < oldestActive.life) {
        oldestActive = slot;
      }
    } else if (!freeSlot) {
      freeSlot = slot;
    }
  }

  if (freeSlot && activeCount < cap) {
    return freeSlot;
  }
  return oldestActive ?? freeSlot ?? pool[0];
}

