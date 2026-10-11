(function (root) {
  // freq: Hz / start: 開始秒 / duration: 長さ秒
  const PATTERNS = {
    // ピンポーン: 高い「ピン」のあと、やや低い「ポーン」を長めに響かせる
    correct: {
      wave: 'sine',
      volume: 0.6,
      notes: [
        { freq: 1760, start: 0, duration: 0.25 },
        { freq: 1318.51, start: 0.25, duration: 1.1 },
      ],
    },
    // ブッブー: 低い同じ高さのブザー音を、短く・長くの2回
    wrong: {
      wave: 'sawtooth',
      volume: 0.18,
      hold: true,
      notes: [
        { freq: 150, start: 0, duration: 0.18 },
        { freq: 150, start: 0.26, duration: 0.5 },
      ],
    },
    // シンキングタイム: 1秒ごとの時計の音。残り3秒からは高く鋭くして焦らせる
    tick: {
      wave: 'triangle',
      volume: 0.25,
      notes: [{ freq: 1000, start: 0, duration: 0.07 }],
    },
    tickUrgent: {
      wave: 'square',
      volume: 0.12,
      notes: [{ freq: 1800, start: 0, duration: 0.09 }],
    },
    // 時間切れ: 低く長いブザー
    timeup: {
      wave: 'sawtooth',
      volume: 0.2,
      hold: true,
      notes: [{ freq: 110, start: 0, duration: 0.8 }],
    },
    // 開始前の「3・2・1」と「スタート」
    countdown: {
      wave: 'sine',
      volume: 0.45,
      notes: [{ freq: 660, start: 0, duration: 0.18 }],
    },
    go: {
      wave: 'sine',
      volume: 0.5,
      notes: [{ freq: 1320, start: 0, duration: 0.6 }],
    },
    // 結果発表: 太鼓の連打 → 順位ごとのチャイム → ファンファーレ
    drumroll: {
      wave: 'triangle',
      volume: 0.35,
      notes: Array.from({ length: 16 }, (_, i) => ({ freq: 140, start: i * 0.075, duration: 0.07 })),
    },
    reveal: {
      wave: 'sine',
      volume: 0.5,
      notes: [
        { freq: 784, start: 0, duration: 0.18 },
        { freq: 1046.5, start: 0.15, duration: 0.7 },
      ],
    },
    fanfare: {
      wave: 'square',
      volume: 0.14,
      notes: [
        { freq: 523.25, start: 0, duration: 0.18 },
        { freq: 523.25, start: 0.2, duration: 0.18 },
        { freq: 523.25, start: 0.4, duration: 0.18 },
        { freq: 659.25, start: 0.6, duration: 0.3 },
        { freq: 783.99, start: 0.95, duration: 0.3 },
        { freq: 1046.5, start: 1.3, duration: 0.9 },
        { freq: 1318.51, start: 1.3, duration: 0.9 },
      ],
    },
  };

  // AudioContext を受け取りパターンを再生する。再生終了予定の秒数を返す。
  function playPattern(ctx, name) {
    const pattern = PATTERNS[name];
    if (!pattern) throw new Error(`unknown sound: ${name}`);
    const t0 = ctx.currentTime;
    let end = 0;
    for (const n of pattern.notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = pattern.wave;
      osc.frequency.value = n.freq;
      // クリックノイズ防止のため、短いフェードイン・フェードアウトを付ける
      gain.gain.setValueAtTime(0.0001, t0 + n.start);
      gain.gain.linearRampToValueAtTime(pattern.volume, t0 + n.start + 0.01);
      // ブザー音は音量を保ったまま切り、チャイム音は余韻として減衰させる
      if (pattern.hold) gain.gain.setValueAtTime(pattern.volume, t0 + n.start + n.duration - 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.start);
      osc.stop(t0 + n.start + n.duration + 0.02);
      end = Math.max(end, n.start + n.duration);
    }
    return end;
  }

  function createPlayer(contextFactory) {
    let ctx = null;
    let muted = false;
    return {
      get muted() { return muted; },
      setMuted(v) { muted = Boolean(v); },
      // ブラウザは操作前の音を禁止するため、最初のタップ時に呼んで再生可能にしておく
      unlock() {
        try {
          if (!ctx) ctx = contextFactory();
          if (ctx && ctx.state === 'suspended' && ctx.resume) ctx.resume();
        } catch (e) { /* 音が出せない環境は無視 */ }
      },
      play(name) {
        if (muted) return false;
        try {
          if (!ctx) ctx = contextFactory();
          if (!ctx) return false;
          if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
          playPattern(ctx, name);
          return true;
        } catch (e) {
          if (e && /^unknown sound/.test(e.message)) throw e;
          return false; // 音が出せない環境でもゲームは続行する
        }
      },
    };
  }

  const api = { PATTERNS, playPattern, createPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicSound = api;
})(typeof window !== 'undefined' ? window : globalThis);
