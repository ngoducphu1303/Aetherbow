import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGpuWatchdogState,
  getGpuWatchdogBudget,
  handleGpuWatchdogContextLost,
  stepGpuThermalWatchdog,
} from '../src/engine/gpuThermalWatchdog.ts';
import { classifyGpuCapability } from '../src/engine/aaaVisualPipeline.ts';

test('Dell Latitude E5430 (Intel HD Graphics 4000) starts at Stage 2 safety floor with bloom & shadows off', () => {
  const e5430Profile = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    4,
    4,
    { maxTextureSize: 4096 }
  );
  const wd = createGpuWatchdogState(e5430Profile, true);
  assert.ok(wd.stage >= 2, `Expected E5430 floor stage >= 2, got ${wd.stage}`);
  const budget = getGpuWatchdogBudget(wd.stage);
  assert.equal(budget.bloomAllowed, false);
  assert.equal(budget.shadowsAllowed, false);
});

test('Sustained GPU lag steps down progressively through stages 0->1->2->3->4 and persists safe latch at stage 4', () => {
  let state = createGpuWatchdogState(null, true);
  assert.equal(state.stage, 0);

  let latched = false;
  const reachedStages = new Set([0]);
  // Feed sustained 70ms frames (~14 FPS)
  for (let i = 0; i < 200; i++) {
    const res = stepGpuThermalWatchdog(state, 70);
    state = res.next;
    reachedStages.add(state.stage);
    if (res.shouldPersistSafeLatch) latched = true;
  }

  assert.equal(state.stage, 4);
  assert.equal(latched, true);
  assert.ok(reachedStages.has(1) && reachedStages.has(2) && reachedStages.has(3) && reachedStages.has(4));
  const finalBudget = getGpuWatchdogBudget(4);
  assert.equal(finalBudget.forceLiteSafety, true);
  assert.ok(finalBudget.dprCap <= 0.7);
});

test('Single GC frame spike never triggers premature downgrade, and healthy FPS recovers with hysteresis', () => {
  let state = createGpuWatchdogState(null, true);
  // 2 brief spikes should not downgrade
  for (let i = 0; i < 2; i++) {
    const res = stepGpuThermalWatchdog(state, 85);
    state = res.next;
  }
  assert.equal(state.stage, 0);

  // Force stage 2 manually, then feed 12s of smooth 60 FPS (16ms) to verify 1-stage recovery
  state = { ...state, stage: 2, ewmaFrameMs: 16.5, lagAccumSec: 0, healthyAccumSec: 0 };
  for (let i = 0; i < 750; i++) {
    const res = stepGpuThermalWatchdog(state, 16);
    state = res.next;
    if (res.direction === 'recover') break;
  }
  assert.equal(state.stage, 1);
});

test('WebGL context lost immediately jumps to Stage 4 Emergency Lite Mode and requests safe latch', () => {
  const initial = createGpuWatchdogState(null, true);
  const res = handleGpuWatchdogContextLost(initial);
  assert.equal(res.next.stage, 4);
  assert.equal(res.next.minFloorStage, 4);
  assert.equal(res.shouldPersistSafeLatch, true);
  assert.ok(res.notice && res.notice.includes('Lite'));
});
