/**
 * Priority-based SFX Voice Cap & Anti-Clipping Mixer.
 * Runs purely in deterministic math before Web Audio oscillator allocation so
 * rapid multi-shot / AoE chains never clip or overload CPU on low-end laptops
 * (e.g. Dell Latitude E5430).
 */

export type SfxEventCategory =
  | 'boss_interrupt'
  | 'boss_guard_break'
  | 'boss_phase_stinger'
  | 'perfect_dodge'
  | 'arena_mechanism'
  | 'set_proc'
  | 'player_hurt'
  | 'meteor_impact'
  | 'shockwave'
  | 'crit_hit'
  | 'sword_strike'
  | 'enemy_defeated'
  | 'shield_hit'
  | 'dash'
  | 'bow_shoot'
  | 'hit'
  | 'pickup'
  | 'footstep';

export interface SfxCategorySpec {
  priority: number;
  dedupeMs: number;
  durationMs: number;
  maxConcurrent: number;
  pitchSpread: number;
  filterSpread: number;
}

export interface SfxMixDecision {
  allowed: boolean;
  reason: 'played' | 'preempted_lower' | 'deduped' | 'category_capped' | 'voice_capped';
  category: SfxEventCategory;
  priority: number;
  variantIndex: number;
  pitchMult: number;
  filterShift: number;
  gainScale: number;
  activeVoices: number;
}

export interface SfxMixerStats {
  lowEndMode: boolean;
  maxVoices: number;
  activeVoices: number;
  totalRequested: number;
  totalPlayed: number;
  totalDropped: number;
  totalPreempted: number;
}

interface ActiveVoiceEntry {
  category: SfxEventCategory;
  priority: number;
  startedAtMs: number;
  expiresAtMs: number;
}

export const SFX_CATEGORY_SPECS: Record<SfxEventCategory, SfxCategorySpec> = {
  boss_interrupt: {
    priority: 100,
    dedupeMs: 90,
    durationMs: 420,
    maxConcurrent: 2,
    pitchSpread: 0.02,
    filterSpread: 0.04,
  },
  boss_guard_break: {
    priority: 98,
    dedupeMs: 110,
    durationMs: 460,
    maxConcurrent: 2,
    pitchSpread: 0.02,
    filterSpread: 0.05,
  },
  boss_phase_stinger: {
    priority: 95,
    dedupeMs: 250,
    durationMs: 520,
    maxConcurrent: 1,
    pitchSpread: 0.015,
    filterSpread: 0.03,
  },
  perfect_dodge: {
    priority: 92,
    dedupeMs: 120,
    durationMs: 320,
    maxConcurrent: 2,
    pitchSpread: 0.03,
    filterSpread: 0.05,
  },
  arena_mechanism: {
    priority: 90,
    dedupeMs: 140,
    durationMs: 360,
    maxConcurrent: 2,
    pitchSpread: 0.03,
    filterSpread: 0.05,
  },
  set_proc: {
    priority: 86,
    dedupeMs: 110,
    durationMs: 280,
    maxConcurrent: 2,
    pitchSpread: 0.035,
    filterSpread: 0.06,
  },
  player_hurt: {
    priority: 84,
    dedupeMs: 100,
    durationMs: 220,
    maxConcurrent: 2,
    pitchSpread: 0.04,
    filterSpread: 0.06,
  },
  meteor_impact: {
    priority: 76,
    dedupeMs: 75,
    durationMs: 260,
    maxConcurrent: 3,
    pitchSpread: 0.05,
    filterSpread: 0.08,
  },
  shockwave: {
    priority: 72,
    dedupeMs: 70,
    durationMs: 230,
    maxConcurrent: 3,
    pitchSpread: 0.05,
    filterSpread: 0.07,
  },
  crit_hit: {
    priority: 70,
    dedupeMs: 42,
    durationMs: 150,
    maxConcurrent: 4,
    pitchSpread: 0.06,
    filterSpread: 0.08,
  },
  sword_strike: {
    priority: 64,
    dedupeMs: 55,
    durationMs: 160,
    maxConcurrent: 3,
    pitchSpread: 0.06,
    filterSpread: 0.09,
  },
  enemy_defeated: {
    priority: 60,
    dedupeMs: 55,
    durationMs: 180,
    maxConcurrent: 3,
    pitchSpread: 0.07,
    filterSpread: 0.08,
  },
  shield_hit: {
    priority: 56,
    dedupeMs: 48,
    durationMs: 130,
    maxConcurrent: 3,
    pitchSpread: 0.06,
    filterSpread: 0.08,
  },
  dash: {
    priority: 52,
    dedupeMs: 85,
    durationMs: 150,
    maxConcurrent: 2,
    pitchSpread: 0.045,
    filterSpread: 0.07,
  },
  bow_shoot: {
    priority: 46,
    dedupeMs: 46,
    durationMs: 110,
    maxConcurrent: 3,
    pitchSpread: 0.065,
    filterSpread: 0.09,
  },
  hit: {
    priority: 40,
    dedupeMs: 38,
    durationMs: 105,
    maxConcurrent: 4,
    pitchSpread: 0.075,
    filterSpread: 0.1,
  },
  pickup: {
    priority: 30,
    dedupeMs: 55,
    durationMs: 120,
    maxConcurrent: 3,
    pitchSpread: 0.06,
    filterSpread: 0.06,
  },
  footstep: {
    priority: 15,
    dedupeMs: 140,
    durationMs: 75,
    maxConcurrent: 1,
    pitchSpread: 0.08,
    filterSpread: 0.1,
  },
};

const VARIATION_CURVE = [-1, 0.35, -0.45, 0.9, 0.1, -0.8, 0.6, -0.2] as const;

export class SfxPriorityMixer {
  private lowEndMode = false;
  private readonly activeVoices: ActiveVoiceEntry[] = [];
  private readonly lastPlayedAt = new Map<SfxEventCategory, number>();
  private readonly variantCounters = new Map<SfxEventCategory, number>();
  private totalRequested = 0;
  private totalPlayed = 0;
  private totalDropped = 0;
  private totalPreempted = 0;

  constructor(options?: { lowEndMode?: boolean }) {
    if (options?.lowEndMode) {
      this.lowEndMode = true;
    }
  }

  public setLowEndMode(lowEnd: boolean): void {
    this.lowEndMode = Boolean(lowEnd);
  }

  public getMaxVoices(): number {
    return this.lowEndMode ? 10 : 18;
  }

  public reset(): void {
    this.activeVoices.length = 0;
    this.lastPlayedAt.clear();
    this.variantCounters.clear();
    this.totalRequested = 0;
    this.totalPlayed = 0;
    this.totalDropped = 0;
    this.totalPreempted = 0;
  }

  private pruneExpired(nowMs: number): void {
    for (let i = this.activeVoices.length - 1; i >= 0; i--) {
      if (this.activeVoices[i].expiresAtMs <= nowMs) {
        this.activeVoices.splice(i, 1);
      }
    }
  }

  public requestPlay(category: SfxEventCategory, nowMs: number): SfxMixDecision {
    const safeNow = Number.isFinite(nowMs) ? nowMs : 0;
    this.pruneExpired(safeNow);
    this.totalRequested += 1;

    const spec = SFX_CATEGORY_SPECS[category];
    const dedupeMs = this.lowEndMode ? Math.round(spec.dedupeMs * 1.25) : spec.dedupeMs;
    const prevAt = this.lastPlayedAt.get(category);
    if (prevAt !== undefined && safeNow - prevAt < dedupeMs) {
      this.totalDropped += 1;
      return {
        allowed: false,
        reason: 'deduped',
        category,
        priority: spec.priority,
        variantIndex: this.variantCounters.get(category) ?? 0,
        pitchMult: 1,
        filterShift: 1,
        gainScale: 0,
        activeVoices: this.activeVoices.length,
      };
    }

    let sameCategoryCount = 0;
    for (let i = 0; i < this.activeVoices.length; i++) {
      if (this.activeVoices[i].category === category) sameCategoryCount += 1;
    }
    const catCap = this.lowEndMode
      ? Math.max(1, Math.min(spec.maxConcurrent, spec.priority >= 80 ? 2 : spec.maxConcurrent - 1))
      : spec.maxConcurrent;
    if (sameCategoryCount >= catCap) {
      this.totalDropped += 1;
      return {
        allowed: false,
        reason: 'category_capped',
        category,
        priority: spec.priority,
        variantIndex: this.variantCounters.get(category) ?? 0,
        pitchMult: 1,
        filterShift: 1,
        gainScale: 0,
        activeVoices: this.activeVoices.length,
      };
    }

    const maxVoices = this.getMaxVoices();
    let reason: SfxMixDecision['reason'] = 'played';
    if (this.activeVoices.length >= maxVoices) {
      // Find lowest-priority active voice (tie-break by oldest startedAtMs)
      let victimIdx = -1;
      for (let i = 0; i < this.activeVoices.length; i++) {
        const candidate = this.activeVoices[i];
        if (candidate.priority >= spec.priority) continue;
        if (
          victimIdx === -1 ||
          candidate.priority < this.activeVoices[victimIdx].priority ||
          (candidate.priority === this.activeVoices[victimIdx].priority &&
            candidate.startedAtMs < this.activeVoices[victimIdx].startedAtMs)
        ) {
          victimIdx = i;
        }
      }
      if (victimIdx === -1) {
        this.totalDropped += 1;
        return {
          allowed: false,
          reason: 'voice_capped',
          category,
          priority: spec.priority,
          variantIndex: this.variantCounters.get(category) ?? 0,
          pitchMult: 1,
          filterShift: 1,
          gainScale: 0,
          activeVoices: this.activeVoices.length,
        };
      }
      this.activeVoices.splice(victimIdx, 1);
      this.totalPreempted += 1;
      reason = 'preempted_lower';
    }

    const variantIndex = (this.variantCounters.get(category) ?? 0) + 1;
    this.variantCounters.set(category, variantIndex);
    this.lastPlayedAt.set(category, safeNow);

    this.activeVoices.push({
      category,
      priority: spec.priority,
      startedAtMs: safeNow,
      expiresAtMs: safeNow + spec.durationMs,
    });
    this.totalPlayed += 1;

    const curveSample = VARIATION_CURVE[variantIndex % VARIATION_CURVE.length];
    const filterSample = VARIATION_CURVE[(variantIndex * 3 + 2) % VARIATION_CURVE.length];
    const pitchMult = Number((1 + curveSample * spec.pitchSpread).toFixed(4));
    const filterShift = Number((1 + filterSample * spec.filterSpread).toFixed(4));

    // Smooth anti-clipping ducking as voice density rises, keeping high-priority cues crisp
    const loadRatio = Math.max(0, Math.min(1, (this.activeVoices.length - 1) / Math.max(1, maxVoices)));
    const priorityProtection = spec.priority >= 84 ? 0.14 : 0.34;
    const sameCatAttenuation = sameCategoryCount > 0 ? Math.pow(0.86, sameCategoryCount) : 1;
    const gainScale = Number(
      Math.max(0.45, Math.min(1, (1 - loadRatio * priorityProtection) * sameCatAttenuation)).toFixed(3)
    );

    return {
      allowed: true,
      reason,
      category,
      priority: spec.priority,
      variantIndex,
      pitchMult,
      filterShift,
      gainScale,
      activeVoices: this.activeVoices.length,
    };
  }

  public getStats(nowMs: number): SfxMixerStats {
    this.pruneExpired(Number.isFinite(nowMs) ? nowMs : 0);
    return {
      lowEndMode: this.lowEndMode,
      maxVoices: this.getMaxVoices(),
      activeVoices: this.activeVoices.length,
      totalRequested: this.totalRequested,
      totalPlayed: this.totalPlayed,
      totalDropped: this.totalDropped,
      totalPreempted: this.totalPreempted,
    };
  }
}
