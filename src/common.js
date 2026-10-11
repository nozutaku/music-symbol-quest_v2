(function (root) {
  const FIREBASE_VERSION = '10.12.5';
  const MUTE_KEY = 'music-symbol-quest-muted';

  const fmt = (n) => Number(n).toLocaleString('ja-JP');
  const randomId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

  function makeStorage(getArea) {
    return {
      get(k) { try { return getArea().getItem(k); } catch (e) { return null; } },
      set(k, v) { try { getArea().setItem(k, v); } catch (e) { /* 保存不可は無視 */ } },
      del(k) { try { getArea().removeItem(k); } catch (e) { /* 無視 */ } },
    };
  }
  // local: 端末に残す設定 / tab: タブ単位(再読み込みでは戻れるが、別タブとは混ざらない)
  const local = makeStorage(() => localStorage);
  const tab = makeStorage(() => sessionStorage);

  function clientId() {
    let id = tab.get('music-symbol-quest-client');
    if (!id) { id = randomId(); tab.set('music-symbol-quest-client', id); }
    return id;
  }

  function poolFor(categoryId) {
    const { SYMBOLS } = root.MusicData;
    const pool = categoryId === 'all' ? SYMBOLS : SYMBOLS.filter((s) => s.category === categoryId);
    return pool.length >= 4 ? pool : SYMBOLS;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`load failed: ${src}`));
      document.head.appendChild(s);
    });
  }

  // Firebase の設定があれば複数端末で共有、なければ同じブラウザ内だけの「お試しモード」
  async function initStore(noteEl) {
    const cfg = root.FIREBASE_CONFIG || {};
    const note = (text) => { if (noteEl) { noteEl.hidden = false; noteEl.textContent = text; } };
    if (cfg.databaseURL) {
      try {
        const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
        await loadScript(`${base}/firebase-app-compat.js`);
        await loadScript(`${base}/firebase-database-compat.js`);
        return root.MusicStore.createFirebaseStore(root.firebase, cfg);
      } catch (e) {
        note('⚠ Firebase に接続できませんでした。お試しモード(同じブラウザ内のみ)で動いています。');
      }
    } else {
      note('お試しモード: 同じブラウザ内のタブ同士でのみ対戦できます。複数の端末で使うには Firebase の設定が必要です(README参照)。');
    }
    return root.MusicStore.createLocalStore({ storage: localStorage, win: window });
  }

  function createPlayer(btn) {
    const player = root.MusicSound.createPlayer(() => {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      return Ctor ? new Ctor() : null;
    });
    player.setMuted(local.get(MUTE_KEY) === '1');
    const render = () => {
      btn.textContent = player.muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(!player.muted));
    };
    btn.addEventListener('click', () => {
      player.setMuted(!player.muted);
      local.set(MUTE_KEY, player.muted ? '1' : '0');
      render();
    });
    render();
    document.addEventListener('pointerdown', () => player.unlock(), { once: true });
    return player;
  }

  const api = { fmt, local, tab, clientId, poolFor, initStore, createPlayer };
  root.MusicCommon = api;
})(window);
