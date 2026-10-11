const test = require('node:test');
const assert = require('node:assert/strict');
const { PATTERNS, playPattern, createPlayer } = require('../src/sound.js');

function fakeCtx() {
  const oscs = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  return {
    oscs,
    currentTime: 0,
    state: 'running',
    destination: {},
    createGain: () => ({ gain: param(), connect() {} }),
    createOscillator() {
      const o = { frequency: { value: 0 }, type: '', connect() {}, start(t) { o.startAt = t; }, stop() {} };
      oscs.push(o);
      return o;
    },
  };
}

test('必要な効果音が定義されている', () => {
  ['correct', 'wrong', 'tick', 'tickUrgent', 'timeup', 'countdown', 'go', 'drumroll', 'fanfare', 'reveal'].forEach((name) => {
    assert.ok(PATTERNS[name], `${name} がない`);
    assert.ok(PATTERNS[name].notes.length > 0);
  });
});

test('playPattern: 定義した音数ぶんオシレーターを鳴らし、周波数が一致する', () => {
  const ctx = fakeCtx();
  const end = playPattern(ctx, 'fanfare');
  assert.equal(ctx.oscs.length, PATTERNS.fanfare.notes.length);
  assert.deepEqual(ctx.oscs.map((o) => o.frequency.value), PATTERNS.fanfare.notes.map((n) => n.freq));
  assert.ok(end > 1, '表彰のファンファーレは1秒以上続く');
});

test('tickUrgent は tick より高く、timeup は低いブザー音', () => {
  assert.ok(PATTERNS.tickUrgent.notes[0].freq > PATTERNS.tick.notes[0].freq);
  assert.ok(PATTERNS.timeup.notes[0].freq < 300);
});

test('ミュート中は鳴らさず false を返し、解除すると鳴る', () => {
  const ctx = fakeCtx();
  const player = createPlayer(() => ctx);
  player.setMuted(true);
  assert.equal(player.play('tick'), false);
  assert.equal(ctx.oscs.length, 0);
  player.setMuted(false);
  assert.equal(player.play('tick'), true);
  assert.equal(ctx.oscs.length, PATTERNS.tick.notes.length);
});

test('未定義の効果音名はエラー', () => {
  assert.throws(() => playPattern(fakeCtx(), 'nope'), /unknown sound/);
});

test('unlock: ユーザー操作時にAudioContextを作って再開しておく(自動再生制限対策)', () => {
  let created = 0;
  let resumed = 0;
  const ctx = { ...fakeCtx(), state: 'suspended', resume() { resumed += 1; } };
  const player = createPlayer(() => { created += 1; return ctx; });
  player.unlock();
  assert.equal(created, 1);
  assert.equal(resumed, 1);
  player.play('tick');
  assert.equal(created, 1, '2回目以降は作り直さない');
});
