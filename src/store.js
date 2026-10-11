(function (root) {
  // 共有データベースの共通インターフェース。
  //   now()               サーバー時刻(ms)。全端末で同じ時計として使う
  //   get(path)           値を1回読む
  //   set(path, value)    値を置き換える
  //   update(path, obj)   一部だけ書き換える
  //   claim(path, fn)     fn(現在値) が undefined なら中止、それ以外はその値を原子的に保存。保存できたら true
  //   watch(path, cb)     登録時と変更のたびに cb(値) を呼ぶ。戻り値は解除関数
  const DB_KEY = 'music-symbol-quest-battle-db';

  const clone = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
  const split = (path) => path.split('/').filter(Boolean);

  function readAt(data, path) {
    let cur = data;
    for (const key of split(path)) {
      if (cur === null || typeof cur !== 'object' || !(key in cur)) return null;
      cur = cur[key];
    }
    return cur === undefined ? null : cur;
  }

  function writeAt(data, path, value) {
    const keys = split(path);
    if (keys.length === 0) return value;
    const result = data && typeof data === 'object' ? data : {};
    let cur = result;
    keys.slice(0, -1).forEach((key) => {
      if (cur[key] === null || typeof cur[key] !== 'object') cur[key] = {};
      cur = cur[key];
    });
    cur[keys[keys.length - 1]] = value;
    return result;
  }

  // 同じブラウザ内(タブ間)だけで共有する簡易版。設定前のお試し用・テスト用。
  function createLocalStore({ storage, clock = Date.now, win = null } = {}) {
    const listeners = new Set();
    const load = () => {
      try { return JSON.parse(storage.getItem(DB_KEY)) || {}; } catch (e) { return {}; }
    };
    const save = (data) => storage.setItem(DB_KEY, JSON.stringify(data));
    const notify = () => listeners.forEach((fn) => fn());
    if (win) win.addEventListener('storage', (e) => { if (e.key === DB_KEY) notify(); });

    return {
      kind: 'local',
      now: () => clock(),
      async get(path) { return clone(readAt(load(), path)); },
      async set(path, value) {
        save(writeAt(load(), path, clone(value)));
        notify();
      },
      async update(path, obj) {
        let data = load();
        Object.entries(obj).forEach(([key, value]) => { data = writeAt(data, `${path}/${key}`, clone(value)); });
        save(data);
        notify();
      },
      async claim(path, fn) {
        const data = load();
        const next = fn(clone(readAt(data, path)));
        if (next === undefined) return false;
        save(writeAt(data, path, clone(next)));
        notify();
        return true;
      },
      watch(path, cb) {
        let last;
        const fire = () => {
          const value = clone(readAt(load(), path));
          const text = JSON.stringify(value);
          if (text === last) return;
          last = text;
          cb(value);
        };
        listeners.add(fire);
        fire();
        return () => listeners.delete(fire);
      },
    };
  }

  // Firebase Realtime Database(compat SDK)版。複数端末間で共有できる。
  function createFirebaseStore(firebase, config) {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    const db = firebase.database(app);
    let offset = 0;
    db.ref('.info/serverTimeOffset').on('value', (snap) => { offset = snap.val() || 0; });
    const ref = (path) => db.ref(path);
    return {
      kind: 'firebase',
      now: () => Date.now() + offset,
      async get(path) { return (await ref(path).once('value')).val(); },
      set: (path, value) => ref(path).set(value),
      update: (path, obj) => ref(path).update(obj),
      async claim(path, fn) {
        const res = await ref(path).transaction((cur) => fn(cur === undefined ? null : cur));
        return res.committed;
      },
      watch(path, cb) {
        const r = ref(path);
        const handler = (snap) => cb(snap.val());
        r.on('value', handler);
        return () => r.off('value', handler);
      },
    };
  }

  const api = { createLocalStore, createFirebaseStore };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
