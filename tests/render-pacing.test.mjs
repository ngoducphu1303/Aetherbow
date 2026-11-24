import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine/GameEngine.ts';
import { GamePhase } from '../src/types/game.ts';

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
  try {
    const dpr = engine.getTargetPixelRatio();
    assert.ok(dpr > 0.65 && dpr <= 1, `Expected weak GPU DPR capped in (0.65, 1], got ${dpr}`);
  }
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

test('sảnh vẫn hoạt động khi tải, nhưng chỉ vẽ nhân vật khi đúng mô hình đã sẵn sàng', () => {
  const oldRaf = globalThis.requestAnimationFrame;
  const oldDocument = globalThis.document;
  const events = [];
  let next;
  globalThis.requestAnimationFrame = callback => {next = callback; return 1;};
  globalThis.document = {hidden: false};

  const body = {};
  const hero = {root: {visible: true}, bodyGroup: body};
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {
    disposed: false,
    phase: GamePhase.TITLE,
    hero,
    heroShadow: {visible: true},
    baseStats: {heroId: 'artemis'},
    heroVisualCfg: {heroId: 'artemis', skinId: 'default'},
    appearanceStatus: 'loading',
    callbacks: {onAppearanceStatusChange(status) {events.push(status);}},
    renderer: {render() {events.push(hero.root.visible ? 'rider' : 'arena');}},
    update() {events.push('update');},
    afterDraw() {},
  });

  try {
    engine.refreshAppearanceGate();
    engine.startLoop();
    next();
    assert.deepEqual(events, ['update', 'arena']);

    // Mismatched hero asset must keep hero hidden during transition
    engine.artemisModel = {parent: body};
    engine.artemisLoadedAsset = 'heroes/hatsune-miku.glb';
    engine.refreshAppearanceGate();
    engine.phase = GamePhase.PLAYING;
    next();
    assert.deepEqual(events, ['update', 'arena', 'arena']);

    // Matching hero asset attached unlocks rendering and emits 'ready'
    engine.artemisLoadedAsset = 'heroes/golden-dress-girl.glb';
    engine.refreshAppearanceGate();
    next();
    assert.deepEqual(events, ['update', 'arena', 'arena', 'update', 'rider', 'ready']);
  } finally {
    globalThis.requestAnimationFrame = oldRaf;
    globalThis.document = oldDocument;
  }
});

test('đổi giữa Alice và Hatsune Miku chỉ hiện nhân vật khi đúng mô hình đã gắn vào sảnh', () => {
  const body = {};
  const engine = Object.create(GameEngine.prototype);
  Object.assign(engine, {
    hero: {root: {visible: true}, bodyGroup: body},
    artemisModel: {parent: body},
    artemisLoadedAsset: 'heroes/golden-dress-girl.glb',
    baseStats: {heroId: 'hatsune_miku'},
    heroVisualCfg: {heroId: 'hatsune_miku', skinId: 'default'},
    callbacks: {},
  });

  engine.refreshAppearanceGate();
  assert.equal(engine.hero.root.visible, false);

  engine.artemisLoadedAsset = 'heroes/hatsune-miku.glb';
  engine.refreshAppearanceGate();
  assert.equal(engine.hero.root.visible, true);

  engine.baseStats.heroId = 'artemis';
  engine.heroVisualCfg.heroId = 'artemis';
  engine.refreshAppearanceGate();
  assert.equal(engine.hero.root.visible, false);
});
