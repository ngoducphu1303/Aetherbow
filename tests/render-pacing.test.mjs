import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine/GameEngine.ts';

test('context phục hồi phải khởi động lại đúng một vòng render', () => {
  const engine = Object.create(GameEngine.prototype);
  let starts = 0;
  Object.assign(engine, {disposed: false, contextLost: true, startLoop() {starts++;}});
  assert.equal(typeof engine.resumeAfterContextRestore, 'function', 'thiếu đường phục hồi sau mất context');
  engine.resumeAfterContextRestore();
  engine.resumeAfterContextRestore();
  assert.equal(starts, 1);
  engine.disposed = true;
  engine.contextLost = true;
  engine.resumeAfterContextRestore();
  assert.equal(starts, 1, 'engine đã hủy không được chạy lại');
});

test('poll GPU không gọi frame tiếp theo khi fence chưa hoàn tất', () => {
  const oldWindow = globalThis.window;
  const queue = [], sync = {};
  let state = 1, calls = 0, deleted = 0;
  const gl = {SYNC_GPU_COMMANDS_COMPLETE: 0, SYNC_STATUS: 2, UNSIGNALED: 1,
    isContextLost: () => false, fenceSync: () => sync, flush() {},
    getSyncParameter: () => state, deleteSync() {deleted++;}};
  globalThis.window = {setTimeout(cb) {queue.push(cb); return queue.length;}};
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {disposed: false, renderer: {getContext: () => gl}, lastTime: performance.now(), phase: 'PLAYING'});
  try {
    engine.afterDraw(() => calls++);
    queue.shift()();
    assert.equal(calls, 0);
    assert.equal(engine.pendingGpuSync, sync);
    assert.equal(deleted, 0);
    state = 3;
    queue.shift()();
    assert.equal(deleted, 1);
    assert.equal(engine.pendingGpuSync, null);
    queue.shift()();
    assert.equal(calls, 1);
  } finally {globalThis.window = oldWindow;}
});

test('GPU tích hợp yếu vẫn giới hạn DPR ngay khi save cũ đặt chất lượng cao', () => {
  const oldWindow = globalThis.window;
  globalThis.window = {devicePixelRatio: 2};
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {isSoftwareGl: false, lowEndGpu: true, graphicsQuality: 'high', container: {clientWidth: 1366, clientHeight: 768}});
  try { assert.equal(engine.getTargetPixelRatio(), 1); }
  finally { globalThis.window = oldWindow; }
});

test('GPU phần cứng cũng phải hoàn tất frame trước khi xếp frame tiếp theo', () => {
  const oldRaf = globalThis.requestAnimationFrame;
  const oldDocument = globalThis.document;
  let next, waited = 0, rendered = 0;
  globalThis.document = {hidden: false};
  globalThis.requestAnimationFrame = callback => {next = callback; return 1;};
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {
    disposed: false, isSoftwareGl: false, lastTime: performance.now(),
    scene: {}, camera: {}, renderer: {render() {rendered++;}, isContextLost: () => false},
    update() {}, afterDraw() {waited++;},
  });
  try {
    engine.startLoop();
    next();
    assert.equal(rendered, 1);
    assert.equal(waited, 1, 'không đẩy vô hạn lệnh render lên GPU chậm');
  } finally {globalThis.requestAnimationFrame = oldRaf; globalThis.document = oldDocument;}
});
