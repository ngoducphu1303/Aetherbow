export type SfxEventCategory =
  | 'boss_interrupt'
  | 'boss_guard_break'
  | 'boss_phase_stinger'
  | 'boss_alarm'
  | 'perfect_dodge'
  | 'arena_mechanism'
  | 'set_proc'
  | 'ultimate'
  | 'player_hurt'
  | 'crit_hit'
  | 'enemy_defeated'
  | 'meteor_impact'
  | 'shockwave'
  | 'hit'
  | 'shield_hit'
  | 'bow_shoot'
  | 'dash'
  | 'sword_strike'
  | 'footstep'
  | 'pickup'
  | 'ui_click';

export type SfxPriorityTier = 1 | 2 | 3 | 4 | 5;

export interface SfxCategoryRule {
  priority: SfxPriorityTier;
  dedupeWindowMs: number;
  durationMs: number;
  pitchVariants: readonly number[];
  filterShiftVariants: readonly number[];
  baseGainScale: number;
}

export const SFX_CATEGORY_RULES: Record<SfxEventCategory, SfxCategoryRule> = {
  boss_interrupt: {
    priority: 5,
    dedupeWindowMs: 0,
    durationMs: 360,
    pitchVariants: [1.0, 1.03],
    filterShiftVariants: [1.0, 1.08],
    baseGainScale: 1.05,
  },
  boss_guard_break: {
    priority: 5,
    dedupeWindowMs: 40,
    durationMs: 320,
    pitchVariants: [1.0, 1.04],
    filterShiftVariants: [1.0, 1.06],
    baseGainScale: 1.0,
  },
  boss_phase_stinger: {
    priority: 5,
    dedupeWindowMs: 120,
    durationMs: 480,
    pitchVariants: [1.0],
    filterShiftVariants: [1.0],
    baseGainScale: 1.0,
  },
  boss_alarm: {
    priority: 5,
    dedupeWindowMs: 180,
    durationMs: 320,
    pitchVariants: [1.0],
    filterShiftVariants: [1.0],
    baseGainScale: 1.0,
  },
  perfect_dodge: {
    priority: 4,
    dedupeWindowMs: 60,
    durationMs: 300,
    pitchVariants: [0.99, 1.02, 1.05],
    filterShiftVariants: [1.0, 1.08, 1.12],
    baseGainScale: 1.0,
  },
  arena_mechanism: {
    priority: 4,
    dedupeWindowMs: 80,
    durationMs: 280,
    pitchVariants: [0.98, 1.02, 1.06],
    filterShiftVariants: [0.95, 1.05, 1.1],
    baseGainScale: 1.0,
  },
  set_proc: {
    priority: 4,
    dedupeWindowMs: 70,
    durationMs: 260,
    pitchVariants: [0.98, 1.03, 1.07],
    filterShiftVariants: [1.0, 1.1, 0.94],
    baseGainScale: 0.98,
  },
  ultimate: {
    priority: 4,
    dedupeWindowMs: 100,
    durationMs: 380,
    pitchVariants: [1.0],
    filterShiftVariants: [1.0],
    baseGainScale: 1.0,
  },
  player_hurt: {
    priority: 4,
    dedupeWindowMs: 90,
    durationMs: 200,
    pitchVariants: [0.96, 1.0, 1.04],
    filterShiftVariants: [0.95, 1.0, 1.06],
    baseGainScale: 1.0,
  },
  crit_hit: {
    priority: 3,
    dedupeWindowMs: 28,
    durationMs: 145,
    pitchVariants: [0.97, 1.01, 1.05, 0.99, 1.07],
    filterShiftVariants: [0.94, 1.04, 1.12, 0.98, 1.08],
    baseGainScale: 0.96,
  },
  enemy_defeated: {
    priority: 3,
    dedupeWindowMs: 45,
    durationMs: 190,
    pitchVariants: [0.96, 1.0, 1.05, 1.09],
    filterShiftVariants: [0.96, 1.04, 1.1, 1.0],
    baseGainScale: 0.95,
  },
  meteor_impact: {
    priority: 3,
    dedupeWindowMs: 55,
    durationMs: 250,
    pitchVariants: [0.94, 1.0, 1.06],
    filterShiftVariants: [0.92, 1.0, 1.08],
    baseGainScale: 0.95,
  },
  shockwave: {
    priority: 3,
    dedupeWindowMs: 55,
    durationMs: 180,
    pitchVariants: [0.95, 1.0, 1.05],
    filterShiftVariants: [0.95, 1.04, 1.08],
    baseGainScale: 0.92,
  },
  hit: {
    priority: 2,
    dedupeWindowMs: 34,
    durationMs: 110,
    pitchVariants: [0.93, 0.98, 1.03, 1.08, 0.96],
    filterShiftVariants: [0.9, 1.0, 1.08, 0.95, 1.05],
    baseGainScale: 0.9,
  },
  shield_hit: {
    priority: 2,
    dedupeWindowMs: 38,
    durationMs: 120,
    pitchVariants: [0.94, 1.0, 1.06, 1.11],
    filterShiftVariants: [0.92, 1.06, 1.14, 0.98],
    baseGainScale: 0.92,
  },
  bow_shoot: {
    priority: 2,
    dedupeWindowMs: 42,
    durationMs: 95,
    pitchVariants: [0.95, 1.0, 1.04, 0.98, 1.06],
    filterShiftVariants: [0.94, 1.02, 1.08, 0.97, 1.05],
    baseGainScale: 0.88,
  },
  dash: {
    priority: 2,
    dedupeWindowMs: 65,
    durationMs: 135,
    pitchVariants: [0.97, 1.02, 1.06],
    filterShiftVariants: [0.96, 1.04, 1.1],
    baseGainScale: 0.94,
  },
  sword_strike: {
    priority: 2,
    dedupeWindowMs: 48,
    durationMs: 90,
    pitchVariants: [0.94, 1.0, 1.06, 1.12],
    filterShiftVariants: [0.95, 1.05, 1.1, 0.98],
    baseGainScale: 0.86,
  },
  footstep: {
    priority: 1,
    dedupeWindowMs: 85,
    durationMs: 65,
    pitchVariants: [0.91, 0.98, 1.05, 0.94],
    filterShiftVariants: [0.88, 1.0, 1.08, 0.94],
    baseGainScale: 0.8,
  },
  pickup: {
    priority: 1,
    dedupeWindowMs: 36,
    durationMs: 110,
    pitchVariants: [0.98, 1.03, 1.08, 1.13],
    filterShiftVariants: [1.0, 1.04, 1.08, 1.12],
    baseGainScale: 0.85,
  },
  ui_click: {
    priority: 1,
    dedupeWindowMs: 25,
    durationMs: 60,
    pitchVariants: [1.0],
    filterShiftVariants: [1.0],
    baseGainScale: 1.0,
  },
};

export interface ActiveSfxVoice {
  id: number;
  category: SfxEventCategory;
  priority: SfxPriorityTier;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface SfxPriorityMixerConfig {
  maxVoices: number;
  lowEndMode: boolean;
}

export interface SfxMixDecision {
  allowed: boolean;
  reason: 'ok' | 'stolen_voice' | 'deduped' | 'voice_cap';
  priority: SfxPriorityTier;
  variantIndex: number;
  pitchMult: number;
  filterShift: number;
  gainScale: number;
  activeVoiceCount: number;
  stolenCategory: SfxEventCategory | null;
}

export interface SfxMixerStats {
  activeVoices: number;
  maxVoices: number;
  acceptedCount: number;
  dedupedCount: number;
  droppedByCapCount: number;
  stolenVoiceCount: number;
}

/**
 * Pure deterministic Priority SFX Mixer & Hit Variant director (Phase 4 Pillar 1).
 * Runs ahead of Web Audio node creation to enforce voice caps, priority preemption,
 * short dedupe windows, and pitch/timbre hit variation with zero browser dependency.
 */
export class SfxPriorityMixer {
  private maxVoices: number;
  private lowEndMode: boolean;
  private voices: ActiveSfxVoice[] = [];
  private lastTriggeredMs = new Map<SfxEventCategory, number>();
  private variantCursor = new Map<SfxEventCategory, number>();
  private nextVoiceId = 1;

  private acceptedCount = 0;
  private dedupedCount = 0;
  private droppedByCapCount = 0;
  private stolenVoiceCount = 0;

  constructor(config?: Partial<SfxPriorityMixerConfig>) {
    this.lowEndMode = Boolean(config?.lowEndMode);
    const defaultCap = this.lowEndMode ? 6 : 10;
    this.maxVoices = Math.max(3, Math.min(18, Math.floor(config?.maxVoices ?? defaultCap)));
  }

  public setLowEndMode(lowEnd: boolean, customCap?: number): void {
    this.lowEndMode = Boolean(lowEnd);
    const targetCap = customCap ?? (this.lowEndMode ? 6 : 10);
    this.maxVoices = Math.max(3, Math.min(18, Math.floor(targetCap)));
  }

  public pruneExpired(nowMs: number): void {
    if (this.voices.length === 0) return;
    this.voices = this.voices.filter((v) => v.expiresAtMs > nowMs);
  }

  public reset(): void {
    this.voices = [];
    this.lastTriggeredMs.clear();
    this.variantCursor.clear();
    this.acceptedCount = 0;
    this.dedupedCount = 0;
    this.droppedByCapCount = 0;
    this.stolenVoiceCount = 0;
  }

  public requestPlay(category: SfxEventCategory, nowMs: number): SfxMixDecision {
    const rule = SFX_CATEGORY_RULES[category];
    this.pruneExpired(nowMs);

    const effectiveDedupe = this.lowEndMode
      ? Math.round(rule.dedupeWindowMs * 1.25)
      : rule.dedupeWindowMs;

    const lastAt = this.lastTriggeredMs.get(category);
    if (effectiveDedupe > 0 && lastAt !== undefined && nowMs - lastAt < effectiveDedupe) {
      this.dedupedCount += 1;
      return {
        allowed: false,
        reason: 'deduped',
        priority: rule.priority,
        variantIndex: 0,
        pitchMult: 1,
        filterShift: 1,
        gainScale: 0,
        activeVoiceCount: this.voices.length,
        stolenCategory: null,
      };
    }

    let stolenCategory: SfxEventCategory | null = null;
    if (this.voices.length >= this.maxVoices) {
      // Find lowest-priority, oldest voice strictly below incoming priority
      let victimIdx = -1;
      for (let i = 0; i < this.voices.length; i++) {
        const v = this.voices[i];
        if (v.priority >= rule.priority) continue;
        if (
          victimIdx === -1 ||
          v.priority < this.voices[victimIdx].priority ||
          (v.priority === this.voices[victimIdx].priority &&
            v.startedAtMs < this.voices[victimIdx].startedAtMs)
        ) {
          victimIdx = i;
        }
      }

      if (victimIdx === -1) {
        this.droppedByCapCount += 1;
        return {
          allowed: false,
          reason: 'voice_cap',
          priority: rule.priority,
          variantIndex: 0,
          pitchMult: 1,
          filterShift: 1,
          gainScale: 0,
          activeVoiceCount: this.voices.length,
          stolenCategory: null,
        };
      }

      stolenCategory = this.voices[victimIdx].category;
      this.voices.splice(victimIdx, 1);
      this.stolenVoiceCount += 1;
    }

    const cursor = this.variantCursor.get(category) ?? 0;
    const pitchIdx = cursor % rule.pitchVariants.length;
    const filterIdx = cursor % rule.filterShiftVariants.length;
    this.variantCursor.set(category, cursor + 1);
    this.lastTriggeredMs.set(category, nowMs);

    this.voices.push({
      id: this.nextVoiceId++,
      category,
      priority: rule.priority,
      startedAtMs: nowMs,
      expiresAtMs: nowMs + rule.durationMs,
    });
    this.acceptedCount += 1;

    // Gentle headroom attenuation as voice bus fills up to prevent clipping
    const densityRatio = this.voices.length / Math.max(1, this.maxVoices);
    const headroomScale =
      rule.priority >= 5
        ? 1.0
        : Math.max(0.68, Math.round((1.02 - densityRatio * 0.24) * 100) / 100);

    return {
      allowed: true,
      reason: stolenCategory ? 'stolen_voice' : 'ok',
      priority: rule.priority,
      variantIndex: pitchIdx,
      pitchMult: rule.pitchVariants[pitchIdx],
      filterShift: rule.filterShiftVariants[filterIdx],
      gainScale: Math.round(rule.baseGainScale * headroomScale * 1000) / 1000,
      activeVoiceCount: this.voices.length,
      stolenCategory,
    };
  }

  public getStats(nowMs?: number): SfxMixerStats {
    if (typeof nowMs === 'number') {
      this.pruneExpired(nowMs);
    }
    return {
      activeVoices: this.voices.length,
      maxVoices: this.maxVoices,
      acceptedCount: this.acceptedCount,
      dedupedCount: this.dedupedCount,
      droppedByCapCount: this.droppedByCapCount,
      stolenVoiceCount: this.stolenVoiceCount,
    };
  }
}
