import { computeComboHitPitch } from './audioCurves';
import {
  computeAdaptiveCombatIntensity,
  computeTimeScaleAudioFilter,
} from './aaaAudioMix';
import { computeBossBgmStepDuration } from '../engine/zodiacArena';
import { resolveBossAudioLayers } from '../engine/aaaWave5Director';
import {
  buildInterruptFanfareNotes,
  resolveBossPhaseTransitionStinger,
  resolveChapterBossStepDuration,
  resolveChapterEndingCadence,
  resolveDynamicMusicLayers,
  resolveZodiacChapterMusic,
} from './zodiacMusicDirector';
import {
  computeComboPitchStep,
  SfxPriorityMixer,
  type SfxEventCategory,
  type SfxMixDecision,
  type SfxMixerStats,
} from './sfxPriorityMixer';

export type BgmMode = 'silent' | 'lobby' | 'combat' | 'boss';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private reverbInput: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public muted = false;
  private masterVol = 0.85;
  private bgmVol = 0.55;
  private sfxVol = 0.9;

  private bgmMode: BgmMode = 'silent';
  private chapterThemeId = 1;
  private adaptiveChapterMusic = true;
  private bossIntensity: 1 | 2 | 3 = 1;
  private combatCombo = 0;
  private combatHpRatio = 1;
  private combatSlowMo = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmNextNoteTime = 0;
  private lastFootstepAt = 0;
  private lastBowCreakAt = 0;
  private lastPortalHumAt = 0;
  private readonly sfxMixer = new SfxPriorityMixer();

  public setLowEndAudioMode(lowEnd: boolean): void {
    this.sfxMixer.setLowEndMode(lowEnd);
  }

  public getSfxMixerStats(): SfxMixerStats {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return this.sfxMixer.getStats(nowMs);
  }

  private gateSfx(category: SfxEventCategory, distanceUnits?: number): SfxMixDecision | null {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const verdict = this.sfxMixer.requestPlay(category, nowMs, distanceUnits);
    return verdict.allowed ? verdict : null;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.bgmGain = this.ctx.createGain();

        // AAA Mastering Bus: Dynamic Filter (Slow-Mo focus) -> Dynamics Compressor (zero clipping) -> Destination
        this.masterFilter = this.ctx.createBiquadFilter();
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.value = 18000;
        this.masterFilter.Q.value = 0.7;

        this.masterCompressor = this.ctx.createDynamicsCompressor();
        this.masterCompressor.threshold.value = -14;
        this.masterCompressor.knee.value = 18;
        this.masterCompressor.ratio.value = 4.5;
        this.masterCompressor.attack.value = 0.005;
        this.masterCompressor.release.value = 0.14;

        // Procedural Celestial Temple Reverb Send (damped stereo feedback delay)
        this.reverbInput = this.ctx.createGain();
        this.reverbInput.gain.value = 0.22;
        const delayA = this.ctx.createDelay(0.5);
        delayA.delayTime.value = 0.115;
        const delayB = this.ctx.createDelay(0.5);
        delayB.delayTime.value = 0.187;
        const dampFilter = this.ctx.createBiquadFilter();
        dampFilter.type = 'lowpass';
        dampFilter.frequency.value = 2400;
        const fbGain = this.ctx.createGain();
        fbGain.gain.value = 0.32;
        const wetGain = this.ctx.createGain();
        wetGain.gain.value = 0.28;

        this.reverbInput.connect(delayA);
        delayA.connect(dampFilter);
        dampFilter.connect(delayB);
        delayB.connect(fbGain);
        fbGain.connect(delayA);
        dampFilter.connect(wetGain);
        wetGain.connect(this.masterGain);

        this.sfxGain.connect(this.masterGain);
        this.bgmGain.connect(this.masterGain);
        this.bgmGain.connect(this.reverbInput);

        this.masterGain.connect(this.masterFilter);
        this.masterFilter.connect(this.masterCompressor);
        this.masterCompressor.connect(this.ctx.destination);

        // Pre-bake a 0.25s white noise buffer once for crisp zero-GC transients
        const bufLen = Math.floor(this.ctx.sampleRate * 0.25);
        this.noiseBuffer = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
        const channel = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          channel[i] = Math.random() * 2 - 1;
        }
        this.applyGains();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playNoiseBurst(
    ctx: AudioContext,
    dest: AudioNode,
    startTime: number,
    duration: number,
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    peakGain: number,
    q = 1.4
  ): void {
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, endFreq), startTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.012, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(startTime);
    src.stop(startTime + duration + 0.01);
  }

  private getSfxDest(pan = 0, sendReverb = false): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const baseDest = this.sfxGain ?? ctx.destination;
    if (sendReverb && this.reverbInput && Math.abs(pan) < 0.02) {
      const split = ctx.createGain();
      split.connect(baseDest);
      split.connect(this.reverbInput);
      return split;
    }
    if (Math.abs(pan) >= 0.02 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.75, Math.min(0.75, pan));
      panner.connect(baseDest);
      if (sendReverb && this.reverbInput) {
        panner.connect(this.reverbInput);
      }
      return panner;
    }
    return baseDest;
  }

  private applyGains(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.masterVol, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol, now, 0.03);
    this.bgmGain.gain.setTargetAtTime(this.bgmVol * 0.28, now, 0.08);
  }

  public setVolumes(master: number, bgm: number, sfx: number): void {
    this.masterVol = Math.max(0, Math.min(1, master));
    this.bgmVol = Math.max(0, Math.min(1, bgm));
    this.sfxVol = Math.max(0, Math.min(1, sfx));
    this.applyGains();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGains();
    if (muted) {
      this.stopBgmScheduler();
    } else if (this.bgmMode !== 'silent' && this.ctx) {
      this.startBgmScheduler();
    }
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    this.applyGains();
    if (ctx && this.bgmMode !== 'silent' && !this.muted) {
      this.startBgmScheduler();
    }
  }

  public setBossIntensity(phase: 1 | 2 | 3): void {
    this.bossIntensity = phase;
  }

  public setChapterTheme(chapterId: number): void {
    const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
    this.chapterThemeId = clamped;
  }

  public setAdaptiveChapterMusic(enabled: boolean): void {
    this.adaptiveChapterMusic = Boolean(enabled);
  }

  public playInterruptFanfare(): void {
    const mix = this.gateSfx('boss_interrupt');
    if (!mix) return;
    const ctx = this.ensureContext();
    const dest = this.getSfxDest(0, true);
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = buildInterruptFanfareNotes();
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = n.wave;
      osc.frequency.setValueAtTime(n.freq, now + n.delay);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, now + n.delay);
      g.gain.setValueAtTime(0.001, now + n.delay);
      g.gain.linearRampToValueAtTime(n.gain, now + n.delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(dest);
      osc.start(now + n.delay);
      osc.stop(now + n.delay + n.dur + 0.02);
    }
    this.playNoiseBurst(ctx, dest, now, 0.12, 'bandpass', 2400, 900, 0.1, 1.5);
  }

  /**
   * Feeds live combat telemetry (combo tier, HP ratio, Perfect Dodge slow-mo)
   * into the adaptive BGM layer mixer and dynamic master low-pass filter.
   */
  public setCombatTelemetry(
    comboCount: number,
    hpRatio: number,
    slowMoActive: boolean,
    reducedMotion = false
  ): void {
    this.combatCombo = Math.max(0, Math.floor(comboCount));
    this.combatHpRatio = Math.max(0, Math.min(1, hpRatio));
    this.combatSlowMo = slowMoActive;
    if (this.ctx && this.masterFilter) {
      const targetHz = computeTimeScaleAudioFilter(
        this.combatSlowMo,
        this.combatHpRatio,
        reducedMotion
      );
      this.masterFilter.frequency.setTargetAtTime(
        targetHz,
        this.ctx.currentTime,
        slowMoActive ? 0.04 : 0.14
      );
    }
  }

  /**
   * Wave 15: Explicit master low-pass sweep for Perfect Dodge slow-mo focus
   * (820 Hz immersive / 2400 Hz reducedMotion) with instant reset to 18 kHz on exit/pause.
   */
  public setTimeDilationAudioFilter(active: boolean, reducedMotion = false): void {
    this.combatSlowMo = active;
    if (this.ctx && this.masterFilter) {
      const targetHz = active ? (reducedMotion ? 2400 : 820) : 18000;
      this.masterFilter.frequency.setTargetAtTime(
        targetHz,
        this.ctx.currentTime,
        active ? 0.035 : 0.12
      );
    }
  }

  /**
   * Wave 15: Heavy stone/pillar Wall-Slam Impact SFX (sub-thud + crunch noise).
   */
  public playWallSlamImpact(pan = 0, distanceUnits?: number): void {
    const mix = this.gateSfx('wall_slam_impact', distanceUnits);
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;

    // Heavy stone impact sub-thud
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(135 * mix.pitchMult, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.22);
    sg.gain.setValueAtTime(0.001, now);
    sg.gain.linearRampToValueAtTime(0.24 * mix.gainScale, now + 0.01);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.25);

    if (!lowEnd) {
      const crack = ctx.createOscillator();
      const cg = ctx.createGain();
      crack.type = 'sawtooth';
      crack.frequency.setValueAtTime(340 * mix.pitchMult, now);
      crack.frequency.exponentialRampToValueAtTime(92, now + 0.11);
      cg.gain.setValueAtTime(0.09 * mix.gainScale, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      crack.connect(cg);
      cg.connect(dest);
      crack.start(now);
      crack.stop(now + 0.13);
    }

    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.16,
      'bandpass',
      980 * mix.filterShift,
      210,
      0.14 * mix.gainScale,
      1.3
    );
  }

  /**
   * Wave 15: Resonant Boss Weak-Point / Guard-Break Shatter Chord tuned to the
   * current Zodiac chapter's modal scale (respects lowEndMode voice cap).
   */
  public playBossWeakpointShatterChord(chapterId?: number): void {
    const mix = this.gateSfx('boss_weakpoint_shatter');
    if (!mix) return;
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;
    const cadence = resolveChapterEndingCadence(chapterId ?? this.chapterThemeId, true);
    const chordNotes = lowEnd ? cadence.notes.slice(0, 2) : cadence.notes.slice(0, 3);

    chordNotes.forEach((n, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.025;
      const shimmerFreq = Math.min(2200, n.freq * 1.5 * mix.pitchMult);
      osc.frequency.setValueAtTime(shimmerFreq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.11 * mix.gainScale, t + 0.014);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.38);
    });

    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.14,
      'highpass',
      3200 * mix.filterShift,
      1400,
      0.09 * mix.gainScale,
      1.6
    );
  }

  public getVolumes(): { master: number; bgm: number; sfx: number } {
    return { master: this.masterVol, bgm: this.bgmVol, sfx: this.sfxVol };
  }

  /**
   * Wave 6 Pillar 1/2: Crisp golden time-warp chime + resonant counter chord
   * fired when the player triggers a Perfect Dodge Counter-Window.
   */
  public playPerfectDodgeCounter(): void {
    const mix = this.gateSfx('perfect_dodge');
    if (!mix) return;
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Brief time-warp downward sweep
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(640, now);
    sweep.frequency.exponentialRampToValueAtTime(195, now + 0.14);
    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.22, now + 0.015);
    sweepGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.18);
    sweep.connect(sweepGain).connect(dest);
    sweep.start(now);
    sweep.stop(now + 0.19);

    // Shimmering golden harmonic fifth chime (C6 + G6)
    const freqs = [1046.5, 1567.98];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t0 = now + 0.03 + idx * 0.035;
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.001, t0);
      g.gain.linearRampToValueAtTime(0.14, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.34);
      osc.connect(g).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  /**
   * Wave 6 Pillar 1/2: Dramatic brass-like boss phase escalation stinger (Phase 2 / Phase 3)
   * layered cleanly over the procedural BGM sequencer.
   */
  public playBossPhaseStinger(phase: 2 | 3): void {
    this.setBossIntensity(phase);
    if (this.adaptiveChapterMusic) {
      this.playBossPhaseTransitionStinger(this.chapterThemeId, phase);
      return;
    }
    const mix = this.gateSfx('boss_phase_stinger');
    if (!mix) return;
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const notes = phase === 3 ? [146.83, 174.61, 220, 293.66] : [130.81, 164.81, 196];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(phase === 3 ? 1650 : 1200, now);
      const t0 = now + i * 0.055;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.45);
      osc.connect(filter).connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + 0.48);
    });
  }

  /**
   * Wave 18: 12-Chapter Modal Boss Phase Transition Stinger (Phase II / III),
   * derived from each Zodiac chapter's bespoke musical scale and CPU-capped on low-end laptops.
   */
  public playBossPhaseTransitionStinger(chapterId: number, targetPhase: 2 | 3): void {
    this.setBossIntensity(targetPhase);
    const mix = this.gateSfx('boss_phase_stinger');
    if (!mix) return;
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;
    const stinger = resolveBossPhaseTransitionStinger(chapterId, targetPhase, lowEnd);
    const now = ctx.currentTime;

    stinger.notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = note.wave;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(targetPhase === 3 ? 1720 : 1280, now);
      const t0 = now + note.delay;
      osc.frequency.setValueAtTime(note.freq, t0);
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(note.gain * mix.gainScale, t0 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + note.dur);
      osc.connect(filter).connect(gain).connect(dest);
      osc.start(t0);
      osc.stop(t0 + note.dur + 0.03);
    });
  }

  public playBossEntranceFanfare(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Imperial brass fifth chord + rising gold horn + timpani boom
    const notes = [
      { freq: 146.83, delay: 0, dur: 0.65, gain: 0.14 },
      { freq: 220.0, delay: 0.08, dur: 0.62, gain: 0.12 },
      { freq: 293.66, delay: 0.16, dur: 0.72, gain: 0.11 },
      { freq: 440.0, delay: 0.24, dur: 0.82, gain: 0.09 },
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.freq, now + n.delay);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now + n.delay);
      filter.frequency.exponentialRampToValueAtTime(520, now + n.delay + n.dur);
      g.gain.setValueAtTime(0.001, now + n.delay);
      g.gain.linearRampToValueAtTime(n.gain, now + n.delay + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + n.delay + n.dur);
      osc.connect(filter);
      filter.connect(g);
      g.connect(dest);
      osc.start(now + n.delay);
      osc.stop(now + n.delay + n.dur + 0.02);
    }
    this.playNoiseBurst(ctx, dest, now, 0.22, 'lowpass', 420, 120, 0.18, 1.0);
  }

  public setBgmMode(mode: BgmMode): void {
    if (this.bgmMode === mode) return;
    this.bgmMode = mode;
    this.bgmStep = 0;
    if (mode !== 'boss') {
      this.bossIntensity = 1;
    }
    if (mode === 'silent' || this.muted) {
      if (this.ctx && this.bgmGain) {
        const now = this.ctx.currentTime;
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setTargetAtTime(0.0001, now, 0.08);
      }
      this.stopBgmScheduler();
      return;
    }
    if (this.ctx) {
      if (this.bgmGain) {
        const now = this.ctx.currentTime;
        const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;
        const layers = resolveDynamicMusicLayers({
          mode: mode === 'boss' ? 'boss' : mode === 'combat' ? 'combat' : 'menu',
          bossPhase: this.bossIntensity,
          hpRatio: this.combatHpRatio,
          combo: this.combatCombo,
          lowEndMode: lowEnd,
        });
        const targetGain = Math.max(0.0001, this.bgmVol * 0.42);
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(Math.max(0.0001, targetGain * 0.28), now);
        this.bgmGain.gain.linearRampToValueAtTime(targetGain, now + layers.crossfadeSec);
      }
      this.bgmNextNoteTime = this.ctx.currentTime + 0.06;
      this.startBgmScheduler();
    }
  }

  private stopBgmScheduler(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private startBgmScheduler(): void {
    if (this.bgmTimer !== null) return;
    const ctx = this.ctx;
    if (!ctx) return;
    this.bgmNextNoteTime = Math.max(this.bgmNextNoteTime, ctx.currentTime + 0.05);
    this.bgmTimer = window.setInterval(() => {
      this.scheduleBgmWindow();
    }, 110);
  }

  private scheduleBgmWindow(): void {
    if (this.muted || this.bgmMode === 'silent' || this.bgmVol <= 0.01) return;
    const ctx = this.ctx;
    const dest = this.bgmGain;
    if (!ctx || !dest || ctx.state !== 'running') return;

    const lookAhead = 0.26;
    const chapterProfile = this.adaptiveChapterMusic
      ? resolveZodiacChapterMusic(this.chapterThemeId)
      : null;
    const stepDur =
      this.bgmMode === 'boss'
        ? chapterProfile
          ? resolveChapterBossStepDuration(this.chapterThemeId, this.bossIntensity)
          : computeBossBgmStepDuration(this.bossIntensity)
        : this.bgmMode === 'combat'
        ? chapterProfile
          ? chapterProfile.combatStepSec
          : 0.24
        : 0.36;

    while (this.bgmNextNoteTime < ctx.currentTime + lookAhead) {
      this.triggerBgmNote(ctx, dest, this.bgmNextNoteTime, this.bgmStep, stepDur);
      this.bgmNextNoteTime += stepDur;
      this.bgmStep = (this.bgmStep + 1) % 16;
    }
  }

  private triggerBgmNote(
    ctx: AudioContext,
    dest: AudioNode,
    time: number,
    step: number,
    stepDur: number
  ): void {
    if (this.bgmMode === 'lobby') {
      // Mystical Celestial C-minor Dorian harp arpeggio + warm harmonic fifth pad
      const arp = [261.63, 311.13, 392.0, 466.16, 523.25, 466.16, 392.0, 349.23];
      const freq = arp[step % arp.length];
      if (step % 2 === 0) {
        const osc = ctx.createOscillator();
        const shimmer = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = 'triangle';
        shimmer.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        shimmer.frequency.setValueAtTime(freq * 2, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1850, time);
        filter.frequency.exponentialRampToValueAtTime(680, time + stepDur * 1.6);
        g.gain.setValueAtTime(0.001, time);
        g.gain.linearRampToValueAtTime(0.11, time + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.75);
        osc.connect(filter);
        shimmer.connect(filter);
        filter.connect(g);
        g.connect(dest);
        osc.start(time);
        shimmer.start(time);
        osc.stop(time + stepDur * 1.8);
        shimmer.stop(time + stepDur * 1.8);
      }
      if (step % 8 === 0) {
        const chordRoots = step === 0 ? [130.81, 196.0] : [116.54, 174.61];
        for (const bassFreq of chordRoots) {
          const pad = ctx.createOscillator();
          const pg = ctx.createGain();
          pad.type = 'sine';
          pad.frequency.setValueAtTime(bassFreq, time);
          pg.gain.setValueAtTime(0.001, time);
          pg.gain.linearRampToValueAtTime(0.11, time + 0.28);
          pg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 7.6);
          pad.connect(pg);
          pg.connect(dest);
          pad.start(time);
          pad.stop(time + stepDur * 7.8);
        }
      }
      return;
    }

    if (this.bgmMode === 'combat') {
      // Adaptive Chapter Zodiac Action Pulse: unique biome melody/bass + Combo Tier (0..3) + Low-HP heartbeat
      const adaptive = computeAdaptiveCombatIntensity(this.combatCombo, this.combatHpRatio);
      const chapterProfile = this.adaptiveChapterMusic
        ? resolveZodiacChapterMusic(this.chapterThemeId)
        : null;
      const melody = chapterProfile
        ? chapterProfile.combatMelody
        : [
            293.66, 0, 349.23, 440.0, 523.25, 0, 440.0, 392.0,
            293.66, 0, 349.23, 440.0, 587.33, 523.25, 440.0, 392.0,
          ];
      const mFreq = melody[step % melody.length];
      if (mFreq > 0) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type =
          adaptive.tier >= 2
            ? 'sawtooth'
            : chapterProfile
            ? chapterProfile.leadWave
            : 'triangle';
        osc.frequency.setValueAtTime(mFreq, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(adaptive.filterCutoffHz, time);
        g.gain.setValueAtTime(adaptive.tier >= 2 ? 0.095 : 0.11, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.9);
        osc.connect(filter);
        filter.connect(g);
        g.connect(dest);
        osc.start(time);
        osc.stop(time + stepDur * 0.95);

        // Adaptive Combo Tier 1+ radiant upper-octave harmonic counter-layer
        if (adaptive.harmonicGain > 0 && (step % 2 === 0 || adaptive.tier >= 3)) {
          const harm = ctx.createOscillator();
          const hg = ctx.createGain();
          harm.type = 'sine';
          harm.frequency.setValueAtTime(mFreq * (adaptive.tier >= 3 ? 2 : 1.5), time);
          hg.gain.setValueAtTime(adaptive.harmonicGain, time);
          hg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.85);
          harm.connect(hg);
          hg.connect(dest);
          harm.start(time);
          harm.stop(time + stepDur * 0.9);
        }
      }
      if (step % 2 === 0) {
        const barIdx = Math.floor(step / 4) % 4;
        const root = chapterProfile
          ? chapterProfile.combatBass[barIdx]
          : step >= 8
          ? 110
          : 146.83;
        const bass = ctx.createOscillator();
        const bg = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(root, time);
        bg.gain.setValueAtTime(0.15, time);
        bg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.8);
        bass.connect(bg);
        bg.connect(dest);
        bass.start(time);
        bass.stop(time + stepDur * 0.85);
      }
      if (step % 4 === 0) {
        const kick = ctx.createOscillator();
        const kg = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(125, time);
        kick.frequency.exponentialRampToValueAtTime(48, time + 0.11);
        kg.gain.setValueAtTime(0.17, time);
        kg.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        kick.connect(kg);
        kg.connect(dest);
        kick.start(time);
        kick.stop(time + 0.13);
      }
      // Adaptive Combo Tier 1+ crisp battle hi-hat / snare groove
      if (adaptive.percGain > 0 && (step % 4 === 2 || (adaptive.tier >= 2 && step % 2 === 1))) {
        this.playNoiseBurst(
          ctx,
          dest,
          time,
          step % 4 === 2 ? 0.065 : 0.032,
          'highpass',
          step % 4 === 2 ? 1900 : 4200,
          1200,
          adaptive.percGain,
          1.4
        );
      }
      // Wave 12: Dynamic Phase-Layered Combat Tension Counter-Arpeggio (low-end CPU capped)
      const lowEndMusic = this.sfxMixer.getStats(performance.now()).lowEndMode;
      const dynCombat = resolveDynamicMusicLayers({
        mode: 'combat',
        bossPhase: 1,
        hpRatio: this.combatHpRatio,
        combo: this.combatCombo,
        lowEndMode: lowEndMusic,
      });
      if (dynCombat.enableTensionArp && dynCombat.tensionCounterGain > 0 && step % 4 === 1) {
        const cFreq = chapterProfile ? chapterProfile.combatMelody[(step + 2) % 16] : 523.25;
        if (cFreq > 0) {
          const tOsc = ctx.createOscillator();
          const tGain = ctx.createGain();
          tOsc.type = 'triangle';
          tOsc.frequency.setValueAtTime(cFreq * 1.5, time);
          tGain.gain.setValueAtTime(dynCombat.tensionCounterGain, time);
          tGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.65);
          tOsc.connect(tGain);
          tGain.connect(dest);
          tOsc.start(time);
          tOsc.stop(time + stepDur * 0.7);
        }
      }
      // Subtle Low-HP adrenaline heartbeat sub-pulse
      if ((adaptive.lowHpPulse || dynCombat.enableLowHpHeartbeat) && (step === 0 || step === 1 || step === 8 || step === 9)) {
        const hb = ctx.createOscillator();
        const hbg = ctx.createGain();
        hb.type = 'sine';
        hb.frequency.setValueAtTime(step % 2 === 0 ? 78 : 64, time);
        hb.frequency.exponentialRampToValueAtTime(38, time + 0.09);
        hbg.gain.setValueAtTime(Math.max(0.11, dynCombat.lowHpPulseGain || 0.14), time);
        hbg.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        hb.connect(hbg);
        hbg.connect(dest);
        hb.start(time);
        hb.stop(time + 0.11);
      }
      return;
    }

    // Boss Encounter: Chapter-themed Adaptive 3-phase orchestral ostinato + power fifths + cathedral choir + war drum
    const intensity = this.bossIntensity;
    const lowEndBossMusic = this.sfxMixer.getStats(performance.now()).lowEndMode;
    const dynBoss = resolveDynamicMusicLayers({
      mode: 'boss',
      bossPhase: intensity,
      hpRatio: this.combatHpRatio,
      combo: this.combatCombo,
      lowEndMode: lowEndBossMusic,
    });
    const bossMix = resolveBossAudioLayers(intensity, this.combatCombo, this.combatHpRatio);
    const chapterBossProfile = this.adaptiveChapterMusic
      ? resolveZodiacChapterMusic(this.chapterThemeId)
      : null;
    const bossSeq = chapterBossProfile
      ? chapterBossProfile.bossMelody
      : [
          220, 220, 261.63, 220, 293.66, 220, 329.63, 293.66,
          196, 196, 246.94, 196, 261.63, 246.94, 220, 196,
        ];
    const osc = ctx.createOscillator();
    const fifth = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = chapterBossProfile ? chapterBossProfile.bossWave : 'sawtooth';
    fifth.type = intensity >= 3 ? 'sawtooth' : 'triangle';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterStart = bossMix.filterPeakHz;
    filter.frequency.setValueAtTime(filterStart, time);
    filter.frequency.exponentialRampToValueAtTime(Math.round(filterStart * 0.52), time + stepDur * 0.8);
    const bossFreq = bossSeq[step % bossSeq.length];
    osc.frequency.setValueAtTime(bossFreq, time);
    fifth.frequency.setValueAtTime(
      bossFreq * (intensity >= 3 && chapterBossProfile ? chapterBossProfile.phase3HarmonicRatio : 1.498),
      time
    );
    g.gain.setValueAtTime(intensity === 3 ? 0.09 : intensity === 2 ? 0.082 : 0.075, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.82);
    osc.connect(filter);
    fifth.connect(filter);
    filter.connect(g);
    g.connect(dest);
    osc.start(time);
    fifth.start(time);
    osc.stop(time + stepDur * 0.85);
    fifth.stop(time + stepDur * 0.85);

    // AAA Wave 5 + Wave 12: Cathedral Choir harmonic swell (capped on low-end CPUs)
    if (!lowEndBossMusic && bossMix.choirGain > 0 && step % 8 === 0) {
      const choirNotes = step === 0 ? [220, 261.63, 329.63] : [196, 246.94, 293.66];
      const choirFilter = ctx.createBiquadFilter();
      choirFilter.type = 'bandpass';
      choirFilter.frequency.setValueAtTime(intensity === 3 ? 920 : 760, time);
      choirFilter.Q.setValueAtTime(1.8, time);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.001, time);
      cg.gain.linearRampToValueAtTime(bossMix.choirGain, time + stepDur * 1.4);
      cg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 7.6);
      choirFilter.connect(cg);
      cg.connect(dest);
      for (const cf of choirNotes) {
        const cOsc = ctx.createOscillator();
        cOsc.type = 'triangle';
        cOsc.frequency.setValueAtTime(cf, time);
        cOsc.connect(choirFilter);
        cOsc.start(time);
        cOsc.stop(time + stepDur * 7.8);
      }
    }

    // Phase II/III dynamic tension counter-line (respects lowEndMode voice budget)
    if (dynBoss.enableTensionArp && dynBoss.tensionCounterGain > 0 && (step % 4 === 0 || step === 6 || step === 14)) {
      const lead = ctx.createOscillator();
      const lg = ctx.createGain();
      lead.type = 'triangle';
      lead.frequency.setValueAtTime(bossSeq[step % bossSeq.length] * 2, time);
      lg.gain.setValueAtTime(dynBoss.tensionCounterGain, time);
      lg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.1);
      lead.connect(lg);
      lg.connect(dest);
      lead.start(time);
      lead.stop(time + stepDur * 1.15);
    }

    // Wave 12: Low-HP Boss tension sub-pulse
    if (dynBoss.enableLowHpHeartbeat && dynBoss.lowHpPulseGain > 0 && (step === 2 || step === 10)) {
      const hb = ctx.createOscillator();
      const hbg = ctx.createGain();
      hb.type = 'sine';
      hb.frequency.setValueAtTime(74, time);
      hb.frequency.exponentialRampToValueAtTime(36, time + 0.1);
      hbg.gain.setValueAtTime(dynBoss.lowHpPulseGain, time);
      hbg.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
      hb.connect(hbg);
      hbg.connect(dest);
      hb.start(time);
      hb.stop(time + 0.12);
    }

    // War drum (4/4 in Phase I; driving double-time in Phase II & III)
    const hitDrum = intensity >= 2 ? step % 2 === 0 : step % 4 === 0;
    if (hitDrum) {
      const isDownbeat = step % 4 === 0;
      const sub = ctx.createOscillator();
      const sg = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(isDownbeat ? 114 : 92, time);
      sub.frequency.exponentialRampToValueAtTime(48, time + 0.14);
      sg.gain.setValueAtTime(isDownbeat ? bossMix.subWeight : bossMix.subWeight * 0.62, time);
      sg.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      sub.connect(sg);
      sg.connect(dest);
      sub.start(time);
      sub.stop(time + 0.18);
    }

    // Crisp battle snare transient on backbeats + driving tension hi-hat in Phase II & III
    if (intensity >= 2 && step % 4 === 2) {
      this.playNoiseBurst(
        ctx,
        dest,
        time,
        0.075,
        'bandpass',
        intensity === 3 ? 2100 : 1650,
        920,
        intensity === 3 ? 0.095 : 0.068,
        1.5
      );
    } else if (bossMix.hihatDrive > 0 && step % 2 === 1) {
      this.playNoiseBurst(
        ctx,
        dest,
        time,
        0.028,
        'highpass',
        4600,
        2400,
        bossMix.hihatDrive,
        1.3
      );
    }
  }

  // === UI & COMMERCIAL GAME SFX ===
  public playUiClick(pitch = 1): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(960 * pitch, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playCardFlip(isHighRarity = false): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = isHighRarity ? [523.25, 659.25, 1046.5] : [440, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isHighRarity ? 'triangle' : 'sine';
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(isHighRarity ? 0.09 : 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playAchievement(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  // === COMBAT SFX ===
  public playBowShoot(pitchShift = 1, pan = 0, heroId?: string): void {
    const mix = this.gateSfx('bow_shoot');
    if (!mix) return;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const pitch = pitchShift * mix.pitchMult;
    const gainScale = mix.gainScale;

    // Taut bowstring release twang + crisp filtered air whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = heroId === 'bellona' ? 'sawtooth' : 'triangle';
    const startFreq =
      heroId === 'bellona'
        ? 410
        : heroId === 'sylvia'
          ? 325
          : heroId === 'celeste'
            ? 395
            : 360;
    const endFreq = heroId === 'sylvia' ? 148 : 132;
    osc.frequency.setValueAtTime(startFreq * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq * pitch, now + 0.08);
    gain.gain.setValueAtTime((heroId === 'bellona' ? 0.082 : 0.1) * gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.088);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.095);

    // Distinct 4-hero Zodiac weapon harmonic signature
    if (heroId === 'bellona') {
      // Thunder snap overtone
      const snap = ctx.createOscillator();
      const sGain = ctx.createGain();
      snap.type = 'square';
      snap.frequency.setValueAtTime(620 * pitch, now);
      snap.frequency.exponentialRampToValueAtTime(220 * pitch, now + 0.055);
      sGain.gain.setValueAtTime(0.032 * gainScale, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.062);
      snap.connect(sGain);
      sGain.connect(dest);
      snap.start(now);
      snap.stop(now + 0.068);
    } else if (heroId === 'sylvia') {
      // Jade wind chime overtone
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(840 * pitch, now);
      chime.frequency.exponentialRampToValueAtTime(1120 * pitch, now + 0.075);
      cGain.gain.setValueAtTime(0.03 * gainScale, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      chime.connect(cGain);
      cGain.connect(dest);
      chime.start(now);
      chime.stop(now + 0.092);
    } else if (heroId === 'celeste') {
      // Twin-mirror lunar shimmer
      [960, 1440].forEach((freq, idx) => {
        const mirror = ctx.createOscillator();
        const mGain = ctx.createGain();
        const t = now + idx * 0.014;
        mirror.type = 'sine';
        mirror.frequency.setValueAtTime(freq * pitch, t);
        mirror.frequency.exponentialRampToValueAtTime(freq * 0.82 * pitch, t + 0.068);
        mGain.gain.setValueAtTime(0.024 * gainScale, t);
        mGain.gain.exponentialRampToValueAtTime(0.001, t + 0.074);
        mirror.connect(mGain);
        mGain.connect(dest);
        mirror.start(t);
        mirror.stop(t + 0.08);
      });
    } else if (heroId === 'aurelia') {
      // Solar golden harmonic ping
      const solar = ctx.createOscillator();
      const solGain = ctx.createGain();
      solar.type = 'sine';
      solar.frequency.setValueAtTime(720 * pitch, now);
      solar.frequency.exponentialRampToValueAtTime(540 * pitch, now + 0.068);
      solGain.gain.setValueAtTime(0.03 * gainScale, now);
      solGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      solar.connect(solGain);
      solGain.connect(dest);
      solar.start(now);
      solar.stop(now + 0.082);
    }

    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.065,
      'bandpass',
      (heroId === 'bellona' ? 2800 : 2400) * pitch * mix.filterShift,
      980 * pitch,
      0.055 * gainScale,
      2.2
    );
  }

  public playHit(isCrit: boolean, comboCount = 0, pan = 0, distanceUnits?: number): void {
    const mix = this.gateSfx(isCrit ? 'crit_hit' : 'hit', distanceUnits);
    if (!mix) return;
    const dest = this.getSfxDest(pan, isCrit);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const comboPitch = computeComboHitPitch(comboCount) * mix.pitchMult;
    const gainScale = mix.gainScale;

    // Impact body thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : mix.variantIndex % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime((isCrit ? 580 : 215) * comboPitch, now);
    osc.frequency.exponentialRampToValueAtTime((isCrit ? 260 : 88) * comboPitch, now + 0.09);

    gain.gain.setValueAtTime((isCrit ? 0.115 : 0.08) * gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.1);

    // Subtle crisp hit transient
    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.04,
      'highpass',
      (isCrit ? 2200 : 1500) * mix.filterShift,
      900,
      (isCrit ? 0.055 : 0.03) * gainScale,
      1.0
    );

    if (isCrit) {
      // Sub-bass punch + crystalline golden harmonic ping
      const sub = ctx.createOscillator();
      const sGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(130, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 0.085);
      sGain.gain.setValueAtTime(0.11 * gainScale, now);
      sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      sub.connect(sGain);
      sGain.connect(dest);
      sub.start(now);
      sub.stop(now + 0.1);

      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(980 * comboPitch, now);
      chime.frequency.exponentialRampToValueAtTime(1380 * comboPitch, now + 0.11);
      cGain.gain.setValueAtTime(0.065 * gainScale, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
      chime.connect(cGain);
      cGain.connect(dest);
      chime.start(now);
      chime.stop(now + 0.135);
    }
  }

  public playShieldHit(pan = 0, distanceUnits?: number): void {
    const mix = this.gateSfx('shield_hit', distanceUnits);
    if (!mix) return;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(410 * mix.pitchMult, now + 0.09);
    gain.gain.setValueAtTime(0.085 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);

    // Metallic deflection ring so front-shield / Boss-guard blocks read unmistakably
    const clang = ctx.createOscillator();
    const clangGain = ctx.createGain();
    clang.type = 'sine';
    clang.frequency.setValueAtTime(1280 * mix.pitchMult, now);
    clang.frequency.exponentialRampToValueAtTime(860 * mix.pitchMult, now + 0.085);
    clangGain.gain.setValueAtTime(0.055 * mix.gainScale, now);
    clangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    clang.connect(clangGain);
    clangGain.connect(dest);
    clang.start(now);
    clang.stop(now + 0.105);

    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.045,
      'bandpass',
      2600 * mix.filterShift,
      1300,
      0.045 * mix.gainScale,
      2.0
    );
  }

  public playAttackDodged(pan = 0, distanceUnits?: number): void {
    const mix = this.gateSfx('attack_dodged', distanceUnits);
    if (!mix) return;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(540 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(310 * mix.pitchMult, now + 0.075);
    gain.gain.setValueAtTime(0.055 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.082);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.09);

    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.07,
      'bandpass',
      1900 * mix.filterShift,
      680,
      0.05 * mix.gainScale,
      1.8
    );
  }

  public playSetProc(pan = 0): void {
    const mix = this.gateSfx('set_proc');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 1 ? 'triangle' : 'sine';
      const t = now + idx * 0.032;
      osc.frequency.setValueAtTime(freq * mix.pitchMult, t);
      gain.gain.setValueAtTime(0.085 * mix.gainScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  public playArenaMechanismTrigger(pan = 0): void {
    const mix = this.gateSfx('arena_mechanism');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [392.0, 587.33, 880.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq * mix.pitchMult, t);
      gain.gain.setValueAtTime(0.095 * mix.gainScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.24);
    });
    this.playNoiseBurst(ctx, dest, now, 0.11, 'bandpass', 1800 * mix.filterShift, 680, 0.07 * mix.gainScale, 1.5);
  }

  public playPlayerHurt(): void {
    const mix = this.gateSfx('player_hurt');
    if (!mix) return;
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(55 * mix.pitchMult, now + 0.18);

    gain.gain.setValueAtTime(0.16 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playDash(): void {
    const mix = this.gateSfx('dash');
    if (!mix) return;
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Airy celestial wind whoosh + upward kinetic sweep
    this.playNoiseBurst(ctx, dest, now, 0.14, 'bandpass', 720 * mix.filterShift, 2600, 0.075 * mix.gainScale, 1.6);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(520 * mix.pitchMult, now + 0.11);

    gain.gain.setValueAtTime(0.085 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.135);
  }

  public playEnemyDefeated(isMajor = false, pan = 0, comboCount?: number): void {
    const mix = this.gateSfx('enemy_defeated');
    if (!mix) return;
    const dest = this.getSfxDest(pan, isMajor);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const comboStep = computeComboPitchStep(comboCount ?? this.combatCombo);

    // Harmonic starlight shatter chord (deeper imperial triad for Elite/Boss)
    const freqs = isMajor ? [261.63, 392.0, 523.25, 783.99] : [329.63, 493.88, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.025;
      const pitched = freq * mix.pitchMult * comboStep;
      osc.frequency.setValueAtTime(pitched, t);
      osc.frequency.exponentialRampToValueAtTime(pitched * 1.12, t + (isMajor ? 0.22 : 0.12));
      gain.gain.setValueAtTime((isMajor ? 0.085 : 0.065) * mix.gainScale, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isMajor ? 0.24 : 0.14));
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + (isMajor ? 0.26 : 0.15));
    });
    this.playNoiseBurst(
      ctx,
      dest,
      now,
      isMajor ? 0.14 : 0.07,
      'highpass',
      1800 * mix.filterShift,
      620,
      (isMajor ? 0.06 : 0.035) * mix.gainScale,
      1.2
    );
  }

  public playPickup(isGem = false): void {
    const mix = this.gateSfx('pickup');
    if (!mix) return;
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGem ? 880 : 660, now);
    osc.frequency.setValueAtTime(isGem ? 1320 : 880, now + 0.045);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playLevelUp(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playBossTelegraph(): void {
    this.playBossTelegraphPing('normal', 0, 0);
  }

  /**
   * Wave 12: Crisp metallic Boss telegraph warning ping routed through SfxPriorityMixer.
   */
  public playBossTelegraphPing(
    severity: 'normal' | 'lethal' = 'normal',
    pan = 0,
    distanceUnits = 0
  ): void {
    const mix = this.gateSfx('boss_telegraph_ping', distanceUnits);
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = severity === 'lethal' ? 'sawtooth' : 'triangle';
    const startHz = (severity === 'lethal' ? 680 : 490) * mix.pitchMult;
    const endHz = (severity === 'lethal' ? 980 : 340) * mix.pitchMult;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + 0.19);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime((severity === 'lethal' ? 0.11 : 0.082) * mix.gainScale, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);

    if (severity === 'lethal') {
      const overtone = ctx.createOscillator();
      const og = ctx.createGain();
      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(1320 * mix.pitchMult, now + 0.05);
      og.gain.setValueAtTime(0.055 * mix.gainScale, now + 0.05);
      og.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      overtone.connect(og);
      og.connect(dest);
      overtone.start(now + 0.05);
      overtone.stop(now + 0.27);
    }
  }

  /**
   * Wave 12: Rarity-escalating loot chime for Epic / Legendary / Mythic drops.
   */
  public playLootRarityChime(
    rarity: 'EPIC' | 'LEGENDARY' | 'MYTHIC' | string,
    pan = 0
  ): void {
    const norm = String(rarity || 'EPIC').toUpperCase();
    const cat: SfxEventCategory =
      norm === 'MYTHIC'
        ? 'loot_rarity_mythic'
        : norm === 'LEGENDARY'
          ? 'loot_rarity_legendary'
          : 'loot_rarity_epic';
    const mix = this.gateSfx(cat);
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const notes =
      cat === 'loot_rarity_mythic'
        ? [523.25, 659.25, 783.99, 1046.5, 1567.98]
        : cat === 'loot_rarity_legendary'
          ? [523.25, 659.25, 783.99, 1046.5]
          : [440, 554.37, 659.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cat === 'loot_rarity_mythic' && idx >= 3 ? 'triangle' : 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq * mix.pitchMult, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime((cat === 'loot_rarity_mythic' ? 0.11 : 0.085) * mix.gainScale, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (cat === 'loot_rarity_mythic' ? 0.36 : 0.24));
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  /**
   * Wave 12: Sub-bass impact drop + celestial ring when landing an Execution Finisher / Boss KO.
   */
  public playExecutionFinisherDrop(pan = 0): void {
    const mix = this.gateSfx('execution_finisher_drop');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.34);
    sg.gain.setValueAtTime(0.24 * mix.gainScale, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.4);

    const chord = [523.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + 0.04 + idx * 0.03;
      osc.frequency.setValueAtTime(f * mix.pitchMult, t);
      g.gain.setValueAtTime(0.075 * mix.gainScale, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playVictory(chapterId?: number): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;
    const cadence = resolveChapterEndingCadence(chapterId ?? this.chapterThemeId, true);
    const notes = lowEnd ? cadence.notes.slice(0, 3) : cadence.notes;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave;
      const t = now + n.delay;
      osc.frequency.setValueAtTime(n.freq, t);
      gain.gain.setValueAtTime(n.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + n.dur + 0.02);
    });
  }

  /**
   * Wave 15: Chapter-specific descending modal resolution stinger played on defeat.
   */
  public playDefeatCadence(chapterId?: number): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    this.setTimeDilationAudioFilter(false);
    const lowEnd = this.sfxMixer.getStats(performance.now()).lowEndMode;
    const cadence = resolveChapterEndingCadence(chapterId ?? this.chapterThemeId, false);
    const notes = lowEnd ? cadence.notes.slice(0, 3) : cadence.notes;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.wave;
      const t = now + n.delay;
      osc.frequency.setValueAtTime(n.freq, t);
      gain.gain.setValueAtTime(n.gain, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.dur);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + n.dur + 0.02);
    });
  }

  public playWheelTick(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playMeteorImpact(pan = 0): void {
    const mix = this.gateSfx('meteor_impact');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(42 * mix.pitchMult, now + 0.25);
    gain.gain.setValueAtTime(0.14 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.27);
    this.playNoiseBurst(ctx, dest, now, 0.18, 'lowpass', 640 * mix.filterShift, 140, 0.12 * mix.gainScale, 1.1);
  }

  public playSwordStrike(): void {
    const mix = this.gateSfx('sword_strike');
    if (!mix) return;
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(420 * mix.pitchMult, now + 0.075);
    gain.gain.setValueAtTime(0.07 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playChestRoll(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [330, 392, 493.88, 587.33, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === notes.length - 1 ? 'triangle' : 'sine';
      const t = now + idx * 0.085;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(idx === notes.length - 1 ? 0.13 : 0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playBossAlarm(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + offset;
      osc.frequency.setValueAtTime(165, t);
      osc.frequency.linearRampToValueAtTime(110, t + 0.16);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playUltimate(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const chord = [392, 523.25, 659.25, 1046.5];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.32);
      gain.gain.setValueAtTime(idx === 0 ? 0.1 : 0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playBossPhaseRoar(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.48);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playShockwave(pan = 0): void {
    const mix = this.gateSfx('shockwave');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 * mix.pitchMult, now);
    osc.frequency.exponentialRampToValueAtTime(38 * mix.pitchMult, now + 0.16);
    gain.gain.setValueAtTime(0.11 * mix.gainScale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playSalvage(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [820, 610, 440];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.09);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  public playForgeCraft(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Resonant anvil strike + celestial arpeggio
    const anvil = ctx.createOscillator();
    const aGain = ctx.createGain();
    anvil.type = 'triangle';
    anvil.frequency.setValueAtTime(280, now);
    anvil.frequency.exponentialRampToValueAtTime(110, now + 0.16);
    aGain.gain.setValueAtTime(0.14, now);
    aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    anvil.connect(aGain);
    aGain.connect(dest);
    anvil.start(now);
    anvil.stop(now + 0.19);

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + 0.08 + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.27);
    });
  }

  public playPowerUp(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  private lastPunishHitSfxAt = 0;

  public playPunishHit(): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastPunishHitSfxAt < 240) return;
    this.lastPunishHitSfxAt = nowMs;
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Emerald counter-strike resonant chime + crisp punch
    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(784, now);
    chime.frequency.exponentialRampToValueAtTime(1174.66, now + 0.085);
    cGain.gain.setValueAtTime(0.11, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    chime.connect(cGain);
    cGain.connect(dest);
    chime.start(now);
    chime.stop(now + 0.14);

    const punch = ctx.createOscillator();
    const pGain = ctx.createGain();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(210, now);
    punch.frequency.exponentialRampToValueAtTime(82, now + 0.06);
    pGain.gain.setValueAtTime(0.12, now);
    pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    punch.connect(pGain);
    pGain.connect(dest);
    punch.start(now);
    punch.stop(now + 0.075);
  }

  public playSynergyUnlock(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Golden ascending harmonic triad fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playBossPhaseTwo(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Deep dramatic sub-bass drop + brassy sawtooth warning horn
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.42);
    sGain.gain.setValueAtTime(0.24, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    sub.connect(sGain);
    sGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.48);

    const horn = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const hGain = ctx.createGain();
    horn.type = 'sawtooth';
    horn.frequency.setValueAtTime(196, now + 0.04);
    horn.frequency.linearRampToValueAtTime(146.83, now + 0.38);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, now + 0.04);
    filter.frequency.exponentialRampToValueAtTime(340, now + 0.42);
    hGain.gain.setValueAtTime(0.001, now + 0.04);
    hGain.gain.linearRampToValueAtTime(0.12, now + 0.09);
    hGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    horn.connect(filter);
    filter.connect(hGain);
    hGain.connect(dest);
    horn.start(now + 0.04);
    horn.stop(now + 0.46);
  }

  public playEliteAffixTrigger(
    kind: 'volatile' | 'frost' | 'aegis' | 'vanguard_link' | 'quake_pulse' = 'volatile'
  ): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === 'frost') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1120, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.18);
    } else if (kind === 'aegis' || kind === 'vanguard_link') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(kind === 'vanguard_link' ? 520 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(kind === 'vanguard_link' ? 780 : 660, now + 0.14);
    } else if (kind === 'quake_pulse') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.22);
    }
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playBossPhaseThree(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Deep tectonic sub drop
    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.56);
    sGain.gain.setValueAtTime(0.28, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    sub.connect(sGain);
    sGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.62);

    // Resonant royal-crimson power chord swell (D3 - A3 - D4)
    const chord = [146.83, 220.0, 293.66];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = idx === 2 ? 'triangle' : 'sawtooth';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.03, t + 0.45);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, t);
      filter.frequency.exponentialRampToValueAtTime(420, t + 0.52);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.54);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.56);
    });
  }

  public playArenaHazardWarn(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playArenaHazardTrigger(kind: 'solar_eruption' | 'frost_zone' | 'void_pulse'): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (kind === 'solar_eruption') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.24);
    } else if (kind === 'frost_zone') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.22);
    } else {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.28);
    }
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.29);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playLoadoutSwitch(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [587.33, 880];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playHeroActiveSkill(heroId: string): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const baseFreqMap: Record<string, number[]> = {
      artemis: [659.25, 987.77, 1318.5],
      alex: [440, 554.37, 880],
      dracoola: [311.13, 466.16, 622.25],
      rolla: [880, 1174.66, 1567.98],
      cleo: [293.66, 440, 587.33],
      thor: [523.25, 783.99, 1396.91],
      atreus: [220, 329.63, 440],
      wukong: [392, 587.33, 783.99],
      van_tich: [369.99, 554.37, 1108.73],
      hatsune_miku: [493.88, 659.25, 987.77],
      aurelia: [587.33, 880.0, 1174.66],
    };
    const notes = baseFreqMap[heroId] ?? [523.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.038;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.16);
      gain.gain.setValueAtTime(idx === 0 ? 0.085 : 0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  public playVanTichCompassShot(pitchShift = 1, pan = 0): void {
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Airy teal wind slice + crisp crystalline compass chime
    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.07,
      'bandpass',
      1750 * pitchShift,
      3400 * pitchShift,
      0.048,
      2.6
    );

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(740 * pitchShift, now);
    osc.frequency.exponentialRampToValueAtTime(1180 * pitchShift, now + 0.045);
    osc.frequency.exponentialRampToValueAtTime(520 * pitchShift, now + 0.095);
    gain.gain.setValueAtTime(0.072, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.105);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playVanTichWindDash(pan = 0): void {
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Swirling breeze vortex sweep + dual wind-chime shimmer
    this.playNoiseBurst(ctx, dest, now, 0.2, 'bandpass', 480, 2900, 0.09, 2.0);
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.024;
      osc.frequency.setValueAtTime(freq * 0.9, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.14);
      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playVanTichConvergence(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Wind draw-in + crisp electric thunder snap + storm seal triad
    this.playNoiseBurst(ctx, dest, now, 0.18, 'bandpass', 620, 3200, 0.095, 2.2);
    this.playNoiseBurst(ctx, dest, now + 0.03, 0.09, 'highpass', 1800, 900, 0.075, 1.2);

    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(165, now);
    punch.frequency.exponentialRampToValueAtTime(52, now + 0.15);
    punchGain.gain.setValueAtTime(0.13, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    punch.connect(punchGain);
    punchGain.connect(dest);
    punch.start(now);
    punch.stop(now + 0.17);

    [554.37, 830.61, 1108.73].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      const t = now + idx * 0.028;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.18);
      gain.gain.setValueAtTime(idx === 0 ? 0.065 : 0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  public playVanTichStormChartStart(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Compass chart unfurl: wide ascending gale + celestial storm chord
    this.playNoiseBurst(ctx, dest, now, 0.28, 'bandpass', 420, 2600, 0.1, 1.8);
    [369.99, 554.37, 739.99, 1108.73].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.032;
      osc.frequency.setValueAtTime(freq * 0.88, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.28);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  public playVanTichStormPulse(pulseIndex: number, pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const stepMult = 1 + Math.max(0, Math.min(2, pulseIndex)) * 0.14;

    // Thunder strike rumble + sharp lightning crack + harmonic storm chime
    this.playNoiseBurst(ctx, dest, now, 0.14, 'highpass', 1900 * stepMult, 750, 0.09, 1.1);
    this.playNoiseBurst(ctx, dest, now, 0.22, 'lowpass', 420, 120, 0.085, 1.2);

    const sub = ctx.createOscillator();
    const sGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145 * stepMult, now);
    sub.frequency.exponentialRampToValueAtTime(46, now + 0.18);
    sGain.gain.setValueAtTime(0.14, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    sub.connect(sGain);
    sGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.2);

    const chime = ctx.createOscillator();
    const cGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(659.25 * stepMult, now);
    chime.frequency.exponentialRampToValueAtTime(987.77 * stepMult, now + 0.15);
    cGain.gain.setValueAtTime(0.075, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    chime.connect(cGain);
    cGain.connect(dest);
    chime.start(now);
    chime.stop(now + 0.19);
  }

  public playPerfectDodge(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    // Platinum crystalline harmonic shimmer
    [1046.5, 1318.51, 1567.98, 2093].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.025;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.075, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  public playNightmareActivate(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [146.83, 185, 220].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.26);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playTrainingReset(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.11);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  private lastTargetLockSfxAt = 0;

  public playTargetLockTick(isPriorityTarget = false): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    if (now - this.lastTargetLockSfxAt < 0.24) return;
    this.lastTargetLockSfxAt = now;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = isPriorityTarget ? 1180 : 940;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.22, now + 0.04);
    gain.gain.setValueAtTime(isPriorityTarget ? 0.042 : 0.024, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playImpactScorchThump(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(112, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.26);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Multi-layered Boss Guard Break Shatter: tectonic sub-drop + crystalline gold chord + crackle burst.
   */
  public playBossBreakShatter(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(155, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.36);
    sg.gain.setValueAtTime(0.24, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.4);

    this.playNoiseBurst(ctx, dest, now, 0.16, 'highpass', 3200, 960, 0.12, 1.5);

    [587.33, 880.0, 1174.66, 1760.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.022;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, t + 0.24);
      g.gain.setValueAtTime(0.095, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * Crisp ceramic/crystal Zodiac Urn shatter with spatial pan and golden chime glint.
   */
  public playUrnShatter(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    this.playNoiseBurst(ctx, dest, now, 0.11, 'bandpass', 2400, 900, 0.14, 1.8);

    [987.77, 1318.51, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.018;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.84, t + 0.11);
      g.gain.setValueAtTime(0.065, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.14);
    });
  }

  /**
   * Epic Boss Kill Execution Slow-Mo boom: time-dilation pitch drop + radiant mythic triad.
   */
  public playBossFinisherBoom(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.72);
    sg.gain.setValueAtTime(0.28, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.8);

    this.playNoiseBurst(ctx, dest, now, 0.24, 'lowpass', 1800, 260, 0.15, 0.9);

    [293.66, 440.0, 587.33, 880.0, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      const t = now + 0.04 + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.62);
    });
  }

  /**
   * Cinematic Gacha meteor descent & celestial light pillar impact chord scaled by rarity.
   */
  public playGachaMeteorReveal(
    tier: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' = 'rare'
  ): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // 1) Meteor streak whoosh
    this.playNoiseBurst(ctx, dest, now, 0.28, 'bandpass', 600, 2400, 0.1, 1.4);

    // 2) Celestial pillar impact at +0.26s
    const impactAt = now + 0.26;
    const isHigh = tier === 'epic' || tier === 'legendary' || tier === 'mythic';
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isHigh ? 165 : 130, impactAt);
    sub.frequency.exponentialRampToValueAtTime(40, impactAt + 0.34);
    sg.gain.setValueAtTime(isHigh ? 0.22 : 0.14, impactAt);
    sg.gain.exponentialRampToValueAtTime(0.001, impactAt + 0.36);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(impactAt);
    sub.stop(impactAt + 0.38);

    const chord =
      tier === 'mythic'
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
        : tier === 'legendary'
        ? [440, 554.37, 659.25, 880, 1108.73]
        : tier === 'epic'
        ? [392, 493.88, 587.33, 783.99]
        : [392, 523.25, 659.25];

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const t = impactAt + idx * 0.032;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(isHigh ? 0.095 : 0.068, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + (isHigh ? 0.52 : 0.3));
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.56);
    });
  }

  /**
   * AAA Wave 3: Non-blocking Ultimate Cut-in cinematic sub-drop + crystalline rising triad.
   */
  public playUltimateCutin(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(150, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.36);
    sg.gain.setValueAtTime(0.24, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    sub.connect(sg);
    sg.connect(dest);
    sub.start(now);
    sub.stop(now + 0.42);

    this.playNoiseBurst(ctx, dest, now, 0.22, 'bandpass', 720, 2600, 0.095, 1.5);

    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      const t = now + 0.02 + idx * 0.032;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.085, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  /**
   * AAA Wave 3: Layered Boss Phase II / III transformation shockwave roar + brass swell.
   */
  public playBossPhaseShift(phase: 2 | 3 = 2): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const baseFreq = phase === 3 ? 115 : 145;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.62);
    g.gain.setValueAtTime(phase === 3 ? 0.24 : 0.19, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.66);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.7);

    const brass = ctx.createOscillator();
    const bg = ctx.createGain();
    brass.type = 'triangle';
    brass.frequency.setValueAtTime(phase === 3 ? 233.08 : 293.66, now + 0.05);
    brass.frequency.exponentialRampToValueAtTime(phase === 3 ? 185.0 : 220.0, now + 0.56);
    bg.gain.setValueAtTime(0.001, now + 0.05);
    bg.gain.linearRampToValueAtTime(0.11, now + 0.14);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    brass.connect(bg);
    bg.connect(dest);
    brass.start(now + 0.05);
    brass.stop(now + 0.62);

    this.playNoiseBurst(ctx, dest, now, 0.34, 'lowpass', 1400, 180, 0.14, 1.0);
  }

  /**
   * AAA Wave 3: Interactive 3D Lobby Hero bow-draw tension + arcane string resonance.
   */
  public playLobbyBowEmote(): void {
    const dest = this.getSfxDest(0, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const tension = ctx.createOscillator();
    const tg = ctx.createGain();
    tension.type = 'triangle';
    tension.frequency.setValueAtTime(210, now);
    tension.frequency.exponentialRampToValueAtTime(420, now + 0.36);
    tg.gain.setValueAtTime(0.001, now);
    tg.gain.linearRampToValueAtTime(0.065, now + 0.18);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    tension.connect(tg);
    tg.connect(dest);
    tension.start(now);
    tension.stop(now + 0.45);

    [659.25, 987.77, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + 0.24 + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  /**
   * AAA Wave 4: Distinct harmonic stings for 3D Elemental Reactions
   * (Melt, Superconduct, Overload, Venom Detonation).
   */
  public playElementalReaction(
    kind:
      | 'melt'
      | 'superconduct'
      | 'overload'
      | 'venom_detonation'
      | 'electro_venom'
      | 'cryo_blight',
    pan = 0
  ): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    if (kind === 'melt') {
      // Crystalline steam hiss + warm golden chord
      this.playNoiseBurst(ctx, dest, now, 0.22, 'bandpass', 2600, 900, 0.12, 1.4);
      [523.25, 783.99, 1046.5].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        const t = now + idx * 0.03;
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.26);
      });
      return;
    }

    if (kind === 'superconduct' || kind === 'electro_venom') {
      // High-voltage crystalline crackle + descending armor-shred / corrosive arc zap
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(kind === 'electro_venom' ? 1420 : 1680, now);
      osc.frequency.exponentialRampToValueAtTime(kind === 'electro_venom' ? 310 : 240, now + 0.28);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.32);
      this.playNoiseBurst(ctx, dest, now, 0.16, 'highpass', 3200, 1400, 0.09, 1.2);
      return;
    }

    if (kind === 'cryo_blight') {
      // Crystalline frost fracture + resonant armor-sunder chime
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1240, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.24);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.28);
      this.playNoiseBurst(ctx, dest, now, 0.18, 'bandpass', 2800, 1100, 0.09, 1.6);
      return;
    }

    if (kind === 'overload') {
      // Punchy sub-bass detonation + bright spark snap
      const sub = ctx.createOscillator();
      const sg = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(38, now + 0.32);
      sg.gain.setValueAtTime(0.24, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      sub.connect(sg);
      sg.connect(dest);
      sub.start(now);
      sub.stop(now + 0.38);
      this.playNoiseBurst(ctx, dest, now, 0.24, 'lowpass', 2200, 260, 0.15, 1.0);
      return;
    }

    // venom_detonation: acidic bubble pop + resonant burst
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.28);
    g.gain.setValueAtTime(0.13, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.32);
    this.playNoiseBurst(ctx, dest, now + 0.04, 0.18, 'bandpass', 1500, 500, 0.1, 1.3);
  }

  /**
   * AAA Wave 4: High-velocity golden piercing Counter-Shot release after Perfect Dodge.
   */
  public playCounterShotRelease(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const twang = ctx.createOscillator();
    const tg = ctx.createGain();
    twang.type = 'sawtooth';
    twang.frequency.setValueAtTime(520, now);
    twang.frequency.exponentialRampToValueAtTime(1320, now + 0.09);
    twang.frequency.exponentialRampToValueAtTime(420, now + 0.26);
    tg.gain.setValueAtTime(0.12, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    twang.connect(tg);
    tg.connect(dest);
    twang.start(now);
    twang.stop(now + 0.3);

    const chime = ctx.createOscillator();
    const cg = ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(1567.98, now + 0.02);
    cg.gain.setValueAtTime(0.085, now + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    chime.connect(cg);
    cg.connect(dest);
    chime.start(now + 0.02);
    chime.stop(now + 0.32);
  }

  /**
   * AAA Wave 4: Metallic anvil strike + shimmering forged gold resonance for gear upgrades.
   */
  public playForgeAnvilImpact(): void {
    const dest = this.getSfxDest(0, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Metallic inharmonic bell partials for authentic hammer-on-anvil ring
    [880, 1345, 2110, 2980].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.992, now + 0.45);
      const amp = 0.095 / (idx + 1);
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0008, now + 0.48 - idx * 0.06);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.5);
    });
    this.playNoiseBurst(ctx, dest, now, 0.08, 'highpass', 3600, 1800, 0.11, 1.5);
  }

  /**
   * AAA Wave 5 Foley: Crisp temple-stone footstep transient synced to sprint stride.
   */
  public playFootstep(pan = 0): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastFootstepAt < 210) return;
    const mix = this.gateSfx('footstep');
    if (!mix) return;
    this.lastFootstepAt = nowMs;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(
      ctx,
      dest,
      now,
      0.042,
      'bandpass',
      640 * mix.pitchMult * mix.filterShift,
      240,
      0.045 * mix.gainScale,
      2.2
    );
  }

  /**
   * AAA Wave 5 Foley: Subtle bowstring tension creak when aiming/charging a volley.
   */
  public playBowDrawCreak(pan = 0): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastBowCreakAt < 340) return;
    this.lastBowCreakAt = nowMs;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(215, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.09);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.032, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * AAA Wave 5 Foley: Spatialized rift hum when enemies materialize from 3D summon portals.
   */
  public playSummonPortalHum(pan = 0): void {
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastPortalHumAt < 380) return;
    this.lastPortalHumAt = nowMs;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.22);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.065, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  /**
   * AAA Wave 5 Foley: Faceted Zodiac crystal cover pillar shatter burst.
   */
  public playCrystalPillarShatter(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [1380, 1940, 2680].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.025;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.62, t + 0.22);
      g.gain.setValueAtTime(0.075 / (idx + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.26);
    });
    this.playNoiseBurst(ctx, dest, now, 0.16, 'bandpass', 2400, 720, 0.13, 1.4);
  }

  /**
   * AAA Wave 5 Foley: Heavy resonant metallic armor-crack & Boss stagger roar on Break-Shield shatter.
   */
  public playBossStaggerRoar(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const roar = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const rg = ctx.createGain();
    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(142, now);
    roar.frequency.exponentialRampToValueAtTime(54, now + 0.42);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(780, now);
    filter.frequency.exponentialRampToValueAtTime(210, now + 0.44);
    rg.gain.setValueAtTime(0.14, now);
    rg.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    roar.connect(filter);
    filter.connect(rg);
    rg.connect(dest);
    roar.start(now);
    roar.stop(now + 0.48);
  }

  /**
   * AAA Wave 5 Foley: Tactile camera shutter click when capturing a 3D Photo Snapshot.
   */
  public playPhotoShutter(): void {
    const dest = this.getSfxDest(0, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    this.playNoiseBurst(ctx, dest, now, 0.032, 'highpass', 3200, 1400, 0.12, 1.6);
    this.playNoiseBurst(ctx, dest, now + 0.048, 0.026, 'bandpass', 2200, 900, 0.09, 1.8);
  }

  /**
   * AAA Wave 6: Shimmering harmonic chime when Astral Overcharge reaches 100%.
   */
  public playOverchargeReady(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.16);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.014);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * AAA Wave 6: Resonant piercing Astral Overcharge bow release.
   */
  public playOverchargeRelease(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(1480, now + 0.075);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.24);
    g.gain.setValueAtTime(0.115, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.28);
    this.playNoiseBurst(ctx, dest, now, 0.11, 'bandpass', 2800, 1100, 0.08, 1.9);
  }

  /**
   * AAA Wave 6: Airy twin-harmonic swoop chord when Companions perform a Synergy Dive.
   */
  public playCompanionSynergy(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.03;
      osc.frequency.setValueAtTime(freq * 0.85, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.22, t + 0.22);
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * AAA Wave 6: Celebratory 3-note astral fanfare on Tactical Room Bounty completion.
   */
  public playBountyComplete(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.095, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /**
   * AAA Wave 6: Crisp tactile click when cycling combat camera presets via [C].
   */
  public playCameraCycleClick(): void {
    const dest = this.getSfxDest(0, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(1120, now + 0.045);
    g.gain.setValueAtTime(0.055, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * AAA Wave 7: Crystalline high-impact shatter + sub-punch when piercing a Boss Weak-Point.
   */
  public playWeakPointShatter(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [1318.51, 1760.0, 2349.32].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.022;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.18, t + 0.14);
      g.gain.setValueAtTime(0.095, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.24);
    });
    this.playNoiseBurst(ctx, dest, now, 0.13, 'highpass', 3200, 1400, 0.09, 1.4);
  }

  /**
   * AAA Wave 7: Distinct elemental detonation SFX for interactive 3D Arena Resonance Traps.
   */
  public playResonanceTrapDetonate(
    kind: 'storm_pylon' | 'ember_crucible' | 'wind_beacon',
    pan = 0
  ): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    if (kind === 'storm_pylon') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.26);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.3);
      this.playNoiseBurst(ctx, dest, now, 0.16, 'bandpass', 2400, 900, 0.09, 2.2);
    } else if (kind === 'ember_crucible') {
      const sub = ctx.createOscillator();
      const sg = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(145, now);
      sub.frequency.exponentialRampToValueAtTime(42, now + 0.36);
      sg.gain.setValueAtTime(0.18, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      sub.connect(sg);
      sg.connect(dest);
      sub.start(now);
      sub.stop(now + 0.4);
      this.playNoiseBurst(ctx, dest, now, 0.24, 'lowpass', 1100, 320, 0.12, 1.2);
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.22);
      g.gain.setValueAtTime(0.09, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.28);
      this.playNoiseBurst(ctx, dest, now, 0.2, 'bandpass', 1600, 3200, 0.08, 1.5);
    }
  }

  /**
   * AAA Wave 7: Subtle airy focus swoosh when entering or exiting 360° Sanctuary Inspect mode.
   */
  public playInspectFocusWhoosh(entering: boolean): void {
    const dest = this.getSfxDest(0, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(entering ? 360 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(entering ? 680 : 320, now + 0.14);
    g.gain.setValueAtTime(0.055, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  /**
   * AAA Wave 7: Crisp royal stamp chord when exporting the AAA Medal Card PNG.
   */
  public playMedalCardSaved(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.05;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * AAA Wave 4: Directional spatial Boss Telegraph windup cue so players can read
   * incoming slams, charges, and barrages even during dense visual effects.
   */
  public playBossTelegraphWarning(
    kind: 'sweep' | 'charge' | 'slam' | 'barrage',
    panX = 0
  ): void {
    const dest = this.getSfxDest(panX, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const baseFreq =
      kind === 'slam' ? 190 : kind === 'charge' ? 280 : kind === 'barrage' ? 360 : 240;
    const peakFreq = kind === 'slam' ? 420 : kind === 'charge' ? 680 : 540;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = kind === 'slam' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.24);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.085, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * AAA Wave 4: Crisp crystalline lock chime when Overcharge (Tụ Lực) hits 100%.
   */
  public playOverchargeFullLock(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.065, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  /**
   * AAA Wave 4: Triumphant harmony chord when Co-op Ult Resonance (+25% Boss DMG) triggers.
   */
  public playCoopResonanceChord(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.085, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  }

  /**
   * Pillar 2 World-Class Game Feel: Escalating celestial harmonic lift on Combo Style Rank promotion (B -> A -> S -> SS -> SSS).
   */
  public playComboRankUp(pitchBoost = 1.0): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const scale = Math.max(0.85, Math.min(1.55, pitchBoost));
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 3 ? 'sine' : 'triangle';
      const t = now + idx * 0.028;
      osc.frequency.setValueAtTime(freq * scale, t);
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  /**
   * Wave 7 Pillar 1/2: Crystalline armor-shatter chord + sub-bass drop on Boss Guard Break (Phá Giáp).
   */
  public playBossGuardBreak(pan = 0): void {
    const mix = this.gateSfx('boss_guard_break');
    if (!mix) return;
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Deep sub-bass drop
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(145, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.34);
    subG.gain.setValueAtTime(0.18, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    sub.connect(subG);
    subG.connect(dest);
    sub.start(now);
    sub.stop(now + 0.38);

    // Metallic glass shatter arpeggio
    [987.77, 1318.51, 1567.98, 2093.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.025;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.22);
      g.gain.setValueAtTime(0.085, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.3);
    });
    this.playNoiseBurst(ctx, dest, now, 0.14, 'highpass', 1800, 900, 0.09, 1.4);
  }

  /**
   * Wave 7 Pillar 5: Crisp double-ping tactical signal for Co-op 3D AI Squad commands.
   */
  public playCoopTacticalPing(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [740, 1108.73].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.055;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  /**
   * Combat Overhaul: Heavy Guard-Break Cleave [F] with deep sub-bass punch, metallic ring & shockwave snap.
   */
  public playHeavyBreakStrike(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + 0.28);
    subG.gain.setValueAtTime(0.24, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    sub.connect(subG).connect(dest);
    sub.start(now);
    sub.stop(now + 0.32);

    const slash = ctx.createOscillator();
    const slashG = ctx.createGain();
    slash.type = 'sawtooth';
    slash.frequency.setValueAtTime(520, now);
    slash.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    slashG.gain.setValueAtTime(0.08, now);
    slashG.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    slash.connect(slashG).connect(dest);
    slash.start(now);
    slash.stop(now + 0.22);

    this.playNoiseBurst(ctx, dest, now, 0.16, 'bandpass', 1400, 380, 0.14, 1.2);
  }

  /**
   * Combat Overhaul: 4th-Beat Combo Crescent Finisher release chime + wind snap.
   */
  public playComboFinisherShot(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.018;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.075, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.2);
    });
    this.playNoiseBurst(ctx, dest, now, 0.09, 'highpass', 1900, 750, 0.08, 1.5);
  }

  /**
   * Combat Overhaul: Explosive Crystal Chain-Detonation burst on enemy kill.
   */
  public playChainExplosion(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const thump = ctx.createOscillator();
    const thumpG = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(118, now);
    thump.frequency.exponentialRampToValueAtTime(38, now + 0.2);
    thumpG.gain.setValueAtTime(0.16, now);
    thumpG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thump.connect(thumpG).connect(dest);
    thump.start(now);
    thump.stop(now + 0.24);

    this.playNoiseBurst(ctx, dest, now, 0.13, 'lowpass', 1650, 240, 0.11, 1.1);
  }

  /**
   * Combat Overhaul: Surprise Ambush Bounty Mini-Boss siren drop.
   */
  public playAmbushSiren(): void {
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    [0, 0.18].forEach((offset) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + offset;
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.14);
      g.gain.setValueAtTime(0.075, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  /**
   * Combat Overhaul: Boss Phase 2 Shield Totem shatter chime.
   */
  public playBossShieldShatter(pan = 0): void {
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    [1318.51, 1567.98, 2093.0].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.024;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * Wave 18: Crystalline Ricochet Resonance ping scaling with bounce index.
   */
  public playRicochetPing(bounceCount = 1, pan = 0): void {
    const mix = this.gateSfx('ricochet_ping');
    if (!mix) return;
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const bounceStep = 1 + Math.min(3, Math.max(0, bounceCount)) * 0.12;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 920 * bounceStep * mix.pitchMult;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.28, now + 0.09);
    g.gain.setValueAtTime(0.068 * mix.gainScale, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(g).connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Wave 18: Imperial Zodiac Vow oath seal chime when toggling or locking difficulty vows.
   */
  public playVowSealChime(vowCount = 1): void {
    const mix = this.gateSfx('vow_seal_chime');
    if (!mix) return;
    const dest = this.getSfxDest(0, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const countBoost = 1 + Math.min(3, Math.max(0, vowCount - 1)) * 0.08;
    [392.0, 587.33].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq * countBoost * mix.pitchMult, t);
      g.gain.setValueAtTime(0.08 * mix.gainScale, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }
}

export const soundEngine = new SoundEngine();
