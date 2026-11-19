import { computeComboHitPitch } from './audioCurves';
import {
  computeAdaptiveCombatIntensity,
  computeTimeScaleAudioFilter,
} from './aaaAudioMix';
import { computeBossBgmStepDuration } from '../engine/zodiacArena';

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
  private bossIntensity: 1 | 2 | 3 = 1;
  private combatCombo = 0;
  private combatHpRatio = 1;
  private combatSlowMo = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmNextNoteTime = 0;

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

  /**
   * Feeds live combat telemetry (combo tier, HP ratio, Perfect Dodge slow-mo)
   * into the adaptive BGM layer mixer and dynamic master low-pass filter.
   */
  public setCombatTelemetry(comboCount: number, hpRatio: number, slowMoActive: boolean): void {
    this.combatCombo = Math.max(0, Math.floor(comboCount));
    this.combatHpRatio = Math.max(0, Math.min(1, hpRatio));
    this.combatSlowMo = slowMoActive;
    if (this.ctx && this.masterFilter) {
      const targetHz = computeTimeScaleAudioFilter(this.combatSlowMo, this.combatHpRatio);
      this.masterFilter.frequency.setTargetAtTime(
        targetHz,
        this.ctx.currentTime,
        slowMoActive ? 0.045 : 0.14
      );
    }
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
      this.stopBgmScheduler();
      return;
    }
    if (this.ctx) {
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
    const stepDur =
      this.bgmMode === 'boss'
        ? computeBossBgmStepDuration(this.bossIntensity)
        : this.bgmMode === 'combat'
        ? 0.24
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
      // Adaptive Heroic Action Pulse: layers evolve dynamically with Combo Tier (0..3) + Low-HP heartbeat
      const adaptive = computeAdaptiveCombatIntensity(this.combatCombo, this.combatHpRatio);
      const melody = [
        293.66, 0, 349.23, 440.0, 523.25, 0, 440.0, 392.0,
        293.66, 0, 349.23, 440.0, 587.33, 523.25, 440.0, 392.0,
      ];
      const mFreq = melody[step];
      if (mFreq > 0) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const g = ctx.createGain();
        osc.type = adaptive.tier >= 2 ? 'sawtooth' : 'triangle';
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
        const root = step >= 8 ? 110 : 146.83;
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
      // Subtle Low-HP adrenaline heartbeat sub-pulse
      if (adaptive.lowHpPulse && (step === 0 || step === 1 || step === 8 || step === 9)) {
        const hb = ctx.createOscillator();
        const hbg = ctx.createGain();
        hb.type = 'sine';
        hb.frequency.setValueAtTime(step % 2 === 0 ? 78 : 64, time);
        hb.frequency.exponentialRampToValueAtTime(38, time + 0.09);
        hbg.gain.setValueAtTime(0.14, time);
        hbg.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        hb.connect(hbg);
        hbg.connect(dest);
        hb.start(time);
        hb.stop(time + 0.11);
      }
      return;
    }

    // Boss Encounter: Adaptive 3-phase orchestral minor ostinato + brassy power fifths + war drum
    const intensity = this.bossIntensity;
    const bossSeq = [
      220, 220, 261.63, 220, 293.66, 220, 329.63, 293.66,
      196, 196, 246.94, 196, 261.63, 246.94, 220, 196,
    ];
    const osc = ctx.createOscillator();
    const fifth = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    fifth.type = intensity >= 3 ? 'sawtooth' : 'triangle';
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterStart = intensity === 3 ? 1750 : intensity === 2 ? 1320 : 980;
    filter.frequency.setValueAtTime(filterStart, time);
    filter.frequency.exponentialRampToValueAtTime(Math.round(filterStart * 0.52), time + stepDur * 0.8);
    osc.frequency.setValueAtTime(bossSeq[step], time);
    fifth.frequency.setValueAtTime(bossSeq[step] * 1.498, time);
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

    // Phase III heroic high brass octave counter-line on accent steps
    if (intensity === 3 && (step % 4 === 0 || step === 6 || step === 14)) {
      const lead = ctx.createOscillator();
      const lg = ctx.createGain();
      lead.type = 'triangle';
      lead.frequency.setValueAtTime(bossSeq[step] * 2, time);
      lg.gain.setValueAtTime(0.065, time);
      lg.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.15);
      lead.connect(lg);
      lg.connect(dest);
      lead.start(time);
      lead.stop(time + stepDur * 1.2);
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
      sg.gain.setValueAtTime(isDownbeat ? 0.25 : 0.15, time);
      sg.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      sub.connect(sg);
      sg.connect(dest);
      sub.start(time);
      sub.stop(time + 0.18);
    }

    // Crisp battle snare transient on backbeats in Phase II & III
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
        1.6
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
  public playBowShoot(pitchShift = 1, pan = 0): void {
    const dest = this.getSfxDest(pan, false);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Taut bowstring release twang + crisp filtered air whoosh
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360 * pitchShift, now);
    osc.frequency.exponentialRampToValueAtTime(132 * pitchShift, now + 0.08);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.088);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.095);

    this.playNoiseBurst(ctx, dest, now, 0.065, 'bandpass', 2400 * pitchShift, 980 * pitchShift, 0.055, 2.2);
  }

  public playHit(isCrit: boolean, comboCount = 0, pan = 0): void {
    const dest = this.getSfxDest(pan, isCrit);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const comboPitch = computeComboHitPitch(comboCount);

    // Impact body thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCrit ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime((isCrit ? 580 : 215) * comboPitch, now);
    osc.frequency.exponentialRampToValueAtTime((isCrit ? 260 : 88) * comboPitch, now + 0.09);

    gain.gain.setValueAtTime(isCrit ? 0.115 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.1);

    // Subtle crisp hit transient
    this.playNoiseBurst(ctx, dest, now, 0.04, 'highpass', isCrit ? 2200 : 1500, 900, isCrit ? 0.055 : 0.03, 1.0);

    if (isCrit) {
      // Sub-bass punch + crystalline golden harmonic ping
      const sub = ctx.createOscillator();
      const sGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(130, now);
      sub.frequency.exponentialRampToValueAtTime(48, now + 0.085);
      sGain.gain.setValueAtTime(0.11, now);
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
      cGain.gain.setValueAtTime(0.065, now);
      cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
      chime.connect(cGain);
      cGain.connect(dest);
      chime.start(now);
      chime.stop(now + 0.135);
    }
  }

  public playPlayerHurt(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playDash(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Airy celestial wind whoosh + upward kinetic sweep
    this.playNoiseBurst(ctx, dest, now, 0.14, 'bandpass', 720, 2600, 0.075, 1.6);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);

    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.135);
  }

  public playEnemyDefeated(isMajor = false, pan = 0): void {
    const dest = this.getSfxDest(pan, isMajor);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    // Harmonic starlight shatter chord (deeper imperial triad for Elite/Boss)
    const freqs = isMajor ? [261.63, 392.0, 523.25, 783.99] : [329.63, 493.88, 659.25];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.025;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + (isMajor ? 0.22 : 0.12));
      gain.gain.setValueAtTime(isMajor ? 0.085 : 0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isMajor ? 0.24 : 0.14));
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + (isMajor ? 0.26 : 0.15));
    });
    this.playNoiseBurst(ctx, dest, now, isMajor ? 0.14 : 0.07, 'highpass', 1800, 620, isMajor ? 0.06 : 0.035, 1.2);
  }

  public playPickup(isGem = false): void {
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
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.22);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playVictory(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const notes = [392, 493.88, 587.33, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.46);
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
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.25);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.27);
    this.playNoiseBurst(ctx, dest, now, 0.18, 'lowpass', 640, 140, 0.12, 1.1);
  }

  public playSwordStrike(): void {
    const dest = this.getSfxDest();
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.075);
    gain.gain.setValueAtTime(0.07, now);
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
    const dest = this.getSfxDest(pan, true);
    const ctx = this.ctx;
    if (!ctx || !dest) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    gain.gain.setValueAtTime(0.11, now);
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

  public playEliteAffixTrigger(kind: 'volatile' | 'frost' | 'aegis' = 'volatile'): void {
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
    } else if (kind === 'aegis') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
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
}

export const soundEngine = new SoundEngine();
