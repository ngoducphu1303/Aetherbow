import {
  FrameBenchmarkLiveSnapshot,
  FrameBenchmarkReport,
  FrameBenchmarkVerdict,
  LoadoutPresetSlotId,
  TrainingPresetComparisonRow,
  TrainingPresetDpsRecord,
} from '../types/game';

export interface FrameBenchmarkMeta {
  durationRequestedSec: number;
  elapsedSec: number;
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
}

/**
 * Pure statistical computation of FPS, 1% Low FPS, P95, P99 and E5430 hardware verdict.
 */
export function computeFrameBenchmarkReport(
  samples: ArrayLike<number>,
  sampleCount: number,
  meta: FrameBenchmarkMeta
): FrameBenchmarkReport {
  const n = Math.max(0, Math.min(sampleCount, samples.length));
  if (n === 0) {
    return {
      schemaVersion: 'wave12.e5430.v1',
      generatedAtIso: new Date().toISOString(),
      durationRequestedSec: meta.durationRequestedSec,
      elapsedSec: Number(meta.elapsedSec.toFixed(2)),
      sampleCount: 0,
      avgFps: 0,
      fps1Low: 0,
      avgFrameMs: 0,
      p95FrameMs: 0,
      p99FrameMs: 0,
      minFrameMs: 0,
      maxFrameMs: 0,
      jankFramesOver33ms: 0,
      jankFramesOver50ms: 0,
      avgDrawCalls: meta.avgDrawCalls,
      peakDrawCalls: meta.peakDrawCalls,
      avgTriangles: meta.avgTriangles,
      peakTriangles: meta.peakTriangles,
      activePointLights: meta.activePointLights,
      liteActive: meta.liteActive,
      watchdogStage: meta.watchdogStage,
      gpuRenderer: meta.gpuRenderer,
      chapterId: meta.chapterId,
      heroId: meta.heroId,
      verdict: 'CAN_TOI_UU_THEM',
    };
  }

  const sorted = new Float32Array(n);
  let sumMs = 0;
  let jank33 = 0;
  let jank50 = 0;
  for (let i = 0; i < n; i++) {
    const ms = Math.max(1.0, Math.min(500.0, Number(samples[i]) || 16.67));
    sorted[i] = ms;
    sumMs += ms;
    if (ms > 33.34) jank33 += 1;
    if (ms > 50.0) jank50 += 1;
  }
  sorted.sort();

  const avgFrameMs = sumMs / n;
  const avgFps = 1000 / Math.max(1, avgFrameMs);
  const minFrameMs = sorted[0];
  const maxFrameMs = sorted[n - 1];
  const p95Idx = Math.min(n - 1, Math.floor((n - 1) * 0.95));
  const p99Idx = Math.min(n - 1, Math.floor((n - 1) * 0.99));
  const p95FrameMs = sorted[p95Idx];
  const p99FrameMs = sorted[p99Idx];

  // Standard 1% Low FPS: mean frame time of the slowest 1% frames
  const slowCount = Math.max(1, Math.ceil(n * 0.01));
  let slowSum = 0;
  for (let i = n - slowCount; i < n; i++) {
    slowSum += sorted[i];
  }
  const slowAvgMs = slowSum / slowCount;
  const fps1Low = 1000 / Math.max(1, slowAvgMs);

  let verdict: FrameBenchmarkVerdict = 'CAN_TOI_UU_THEM';
  if (avgFps >= 55 && fps1Low >= 38 && meta.activePointLights === 0) {
    verdict = 'DAT_E5430_60FPS';
  } else if (avgFps >= 30 && fps1Low >= 22) {
    verdict = 'DAT_E5430_30FPS_ON_DINH';
  }

  return {
    schemaVersion: 'wave12.e5430.v1',
    generatedAtIso: new Date().toISOString(),
    durationRequestedSec: meta.durationRequestedSec,
    elapsedSec: Number(meta.elapsedSec.toFixed(2)),
    sampleCount: n,
    avgFps: Number(avgFps.toFixed(1)),
    fps1Low: Number(fps1Low.toFixed(1)),
    avgFrameMs: Number(avgFrameMs.toFixed(2)),
    p95FrameMs: Number(p95FrameMs.toFixed(2)),
    p99FrameMs: Number(p99FrameMs.toFixed(2)),
    minFrameMs: Number(minFrameMs.toFixed(2)),
    maxFrameMs: Number(maxFrameMs.toFixed(2)),
    jankFramesOver33ms: jank33,
    jankFramesOver50ms: jank50,
    avgDrawCalls: Math.round(meta.avgDrawCalls),
    peakDrawCalls: Math.round(meta.peakDrawCalls),
    avgTriangles: Math.round(meta.avgTriangles),
    peakTriangles: Math.round(meta.peakTriangles),
    activePointLights: meta.activePointLights,
    liteActive: meta.liteActive,
    watchdogStage: meta.watchdogStage,
    gpuRenderer: meta.gpuRenderer,
    chapterId: meta.chapterId,
    heroId: meta.heroId,
    verdict,
  };
}

/**
 * Zero-GC fixed-capacity Float32Array benchmark sampler designed for 15s/60s E5430 field QA.
 * Allocates zero heap objects during `recordFrame`.
 */
export class FrameBenchmarkSampler {
  private readonly buffer: Float32Array;
  private running = false;
  private durationSec = 60;
  private elapsedSec = 0;
  private count = 0;
  private sumFrameMs = 0;
  private worstFrameMs = 0;
  private sumDrawCalls = 0;
  private peakDrawCalls = 0;
  private sumTriangles = 0;
  private peakTriangles = 0;
  private lastDrawCalls = 0;
  private lastTriangles = 0;

  constructor(maxSamples = 7200) {
    this.buffer = new Float32Array(Math.max(120, maxSamples));
  }

  public getCapacity(): number {
    return this.buffer.length;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public start(durationSec: number): void {
    this.durationSec = Math.max(3, Math.min(120, Math.round(durationSec || 60)));
    this.running = true;
    this.elapsedSec = 0;
    this.count = 0;
    this.sumFrameMs = 0;
    this.worstFrameMs = 0;
    this.sumDrawCalls = 0;
    this.peakDrawCalls = 0;
    this.sumTriangles = 0;
    this.peakTriangles = 0;
    this.lastDrawCalls = 0;
    this.lastTriangles = 0;
  }

  /**
   * Records one rendered frame in O(1) with zero heap allocations.
   * Returns true if the requested benchmark duration has just completed.
   */
  public recordFrame(frameMs: number, drawCalls: number, triangles: number): boolean {
    if (!this.running) return false;
    const clampedMs = Math.max(1.0, Math.min(500.0, frameMs));
    this.elapsedSec += clampedMs / 1000;
    if (this.count < this.buffer.length) {
      this.buffer[this.count] = clampedMs;
      this.count += 1;
    } else {
      // Ring overwrite if monitor >120Hz exceeds pre-allocated capacity
      this.buffer[this.count % this.buffer.length] = clampedMs;
      this.count = this.buffer.length;
    }
    this.sumFrameMs += clampedMs;
    if (clampedMs > this.worstFrameMs) this.worstFrameMs = clampedMs;
    this.lastDrawCalls = drawCalls;
    this.lastTriangles = triangles;
    this.sumDrawCalls += drawCalls;
    if (drawCalls > this.peakDrawCalls) this.peakDrawCalls = drawCalls;
    this.sumTriangles += triangles;
    if (triangles > this.peakTriangles) this.peakTriangles = triangles;

    if (this.elapsedSec >= this.durationSec) {
      this.running = false;
      return true;
    }
    return false;
  }

  public stop(): void {
    this.running = false;
  }

  public getLiveSnapshot(activePointLights: number, liteActive: boolean, watchdogStage: number): FrameBenchmarkLiveSnapshot {
    const n = Math.max(1, this.count);
    const avgMs = this.count > 0 ? this.sumFrameMs / n : 16.67;
    const avgFps = this.count > 0 ? 1000 / Math.max(1, avgMs) : 0;
    const approx1Low = this.worstFrameMs > 0 ? 1000 / Math.max(avgMs, this.worstFrameMs * 0.85) : 0;
    const progressPct = this.durationSec > 0 ? Math.min(100, (this.elapsedSec / this.durationSec) * 100) : 0;
    return {
      running: this.running,
      durationSec: this.durationSec,
      elapsedSec: Number(this.elapsedSec.toFixed(1)),
      progressPct: Math.round(progressPct),
      sampleCount: this.count,
      liveAvgFps: Number(avgFps.toFixed(1)),
      liveEst1LowFps: Number(approx1Low.toFixed(1)),
      liveDrawCalls: this.lastDrawCalls,
      liveTriangles: this.lastTriangles,
      activePointLights,
      liteActive,
      watchdogStage,
    };
  }

  public finalizeReport(extra: {
    activePointLights: number;
    liteActive: boolean;
    watchdogStage: number;
    gpuRenderer: string;
    chapterId: number;
    heroId: string;
  }): FrameBenchmarkReport {
    this.running = false;
    const n = Math.max(1, this.count);
    return computeFrameBenchmarkReport(this.buffer, this.count, {
      durationRequestedSec: this.durationSec,
      elapsedSec: this.elapsedSec,
      avgDrawCalls: this.count > 0 ? this.sumDrawCalls / n : 0,
      peakDrawCalls: this.peakDrawCalls,
      avgTriangles: this.count > 0 ? this.sumTriangles / n : 0,
      peakTriangles: this.peakTriangles,
      activePointLights: extra.activePointLights,
      liteActive: extra.liteActive,
      watchdogStage: extra.watchdogStage,
      gpuRenderer: extra.gpuRenderer,
      chapterId: extra.chapterId,
      heroId: extra.heroId,
    });
  }
}

/**
 * Computes side-by-side Sân Tập 3D DPS comparison across Loadout Presets.
 */
export function computeTrainingPresetComparison(
  records: ReadonlyArray<TrainingPresetDpsRecord>,
  baselineSlotId?: LoadoutPresetSlotId
): TrainingPresetComparisonRow[] {
  if (!records || records.length === 0) return [];

  const valid = records.filter((r) => r && typeof r.slotId === 'string');
  if (valid.length === 0) return [];

  const baseline =
    (baselineSlotId ? valid.find((r) => r.slotId === baselineSlotId) : undefined) ?? valid[0];
  const baselineDps = Math.max(0, baseline.dps5s);

  let maxDps = -1;
  for (const r of valid) {
    if (r.dps5s > maxDps) maxDps = r.dps5s;
  }

  return valid.map((r) => {
    const deltaDpsPct =
      baselineDps > 0 ? Number((((r.dps5s - baselineDps) / baselineDps) * 100).toFixed(1)) : 0;
    return {
      ...r,
      deltaDpsPct,
      isBaseline: r.slotId === baseline.slotId,
      isLeader: maxDps > 0 && r.dps5s === maxDps,
    };
  });
}
