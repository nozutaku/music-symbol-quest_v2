const test = require('node:test');
const assert = require('node:assert/strict');
const { createLocalStore } = require('../src/store.js');

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
  };
}

test('set/get: 深い階層に保存して読み出せる', async () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 1000 });
  await s.set('rooms/1234/players/05', { clientId: 'a' });
  assert.deepEqual(await s.get('rooms/1234/players/05'), { clientId: 'a' });
  assert.deepEqual(await s.get('rooms/1234'), { players: { '05': { clientId: 'a' } } });
  assert.equal(await s.get('rooms/9999'), null);
});

test('update: 既存の値を保ったまま一部だけ書き換える', async () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 0 });
  await s.set('rooms/1234', { status: 'lobby', category: 'all' });
  await s.update('rooms/1234', { status: 'playing', startAt: 5000 });
  assert.deepEqual(await s.get('rooms/1234'), { status: 'playing', category: 'all', startAt: 5000 });
});

test('claim: 空きなら取得でき、他人が使用中なら取得できない', async () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 0 });
  const take = (id) => (cur) => (cur && cur.clientId !== id ? undefined : { clientId: id });
  assert.equal(await s.claim('rooms/1234/players/05', take('a')), true);
  assert.equal(await s.claim('rooms/1234/players/05', take('b')), false);
  assert.equal(await s.claim('rooms/1234/players/05', take('a')), true);
  assert.deepEqual(await s.get('rooms/1234/players/05'), { clientId: 'a' });
});

test('watch: 登録時に現在値、変更のたびに通知され、解除後は通知されない', async () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 0 });
  const seen = [];
  await s.set('rooms/1234/players/01', { clientId: 'x' });
  const off = s.watch('rooms/1234/players', (v) => seen.push(v));
  await s.set('rooms/1234/players/02', { clientId: 'y' });
  off();
  await s.set('rooms/1234/players/03', { clientId: 'z' });
  assert.equal(seen.length, 2);
  assert.deepEqual(Object.keys(seen[0]), ['01']);
  assert.deepEqual(Object.keys(seen[1]).sort(), ['01', '02']);
});

test('now: 注入した時計の値を返す', () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 777 });
  assert.equal(s.now(), 777);
});

test('get: 返した値を書き換えても保存内容は変わらない', async () => {
  const s = createLocalStore({ storage: memoryStorage(), clock: () => 0 });
  await s.set('a', { n: 1 });
  const v = await s.get('a');
  v.n = 99;
  assert.deepEqual(await s.get('a'), { n: 1 });
});
