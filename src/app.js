(function () {
  const { CATEGORIES, SYMBOLS } = window.MusicData;
  const { createGame } = window.MusicGame;
  const BEST_KEY = 'music-symbol-quest-best';
  const MUTE_KEY = 'music-symbol-quest-muted';
  const player = window.MusicSound.createPlayer(() => {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  });
  try { player.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (e) { /* 既定は音あり */ }
  const TYPE_LABELS = {
    meaning: 'この記号の意味は？',
    reading: 'この記号の読み方は？',
    symbol: 'この意味・読み方の記号は？',
  };

  const $ = (id) => document.getElementById(id);
  const screens = { start: $('screen-start'), play: $('screen-play'), result: $('screen-result') };
  let game = null;
  let currentCategory = 'all';

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest(score) {
    try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) { /* 保存できない環境では無視 */ }
  }

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  }

  function renderMenu() {
    const box = $('categories');
    box.textContent = '';
    const items = [{ id: 'all', label: 'ぜんぶ混ぜて挑戦', icon: '🌟' }, ...CATEGORIES];
    items.forEach((c) => {
      const count = c.id === 'all' ? SYMBOLS.length : SYMBOLS.filter((s) => s.category === c.id).length;
      const btn = document.createElement('button');
      btn.type = 'button';
      if (c.id === 'all') btn.className = 'all';
      btn.textContent = `${c.icon} ${c.label}（${count}個）`;
      btn.addEventListener('click', () => start(c.id));
      box.appendChild(btn);
    });
    $('best-score').textContent = loadBest();
    show('start');
  }

  function start(categoryId) {
    currentCategory = categoryId;
    const pool = categoryId === 'all' ? SYMBOLS : SYMBOLS.filter((s) => s.category === categoryId);
    // カテゴリ内だけでは選択肢が足りない場合に備え、全記号を選択肢の候補にする
    game = createGame({ symbols: pool.length >= 4 ? pool : SYMBOLS });
    renderQuestion();
    show('play');
  }

  function renderStatus() {
    const st = game.state;
    $('st-progress').textContent = `${Math.min(st.index + 1, st.total)} / ${st.total} 問`;
    $('st-lives').textContent = '❤️'.repeat(Math.max(st.lives, 0)) + '🖤'.repeat(Math.max(3 - st.lives, 0));
    $('st-score').textContent = `${st.score} 点`;
    $('st-combo').textContent = st.combo >= 2 ? `🔥 ${st.combo} 連続` : '';
  }

  // 記号の表記（display）を、図が用意されていれば SVG、なければ文字で表示する
  function setSymbol(el, display) {
    const sym = SYMBOLS.find((x) => x.display === display);
    const svg = sym && window.MusicGlyphs.svgFor(sym.id);
    if (svg) {
      el.innerHTML = svg;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', sym.reading);
    } else {
      el.textContent = display;
      el.removeAttribute('role');
      el.removeAttribute('aria-label');
    }
  }

  function renderQuestion() {
    const q = game.current();
    renderStatus();
    $('feedback').hidden = true;
    $('q-label').textContent = TYPE_LABELS[q.type];
    const main = $('q-main');
    if (q.type === 'symbol') {
      main.textContent = q.prompt.main;
      main.removeAttribute('role');
      main.removeAttribute('aria-label');
    } else {
      setSymbol(main, q.prompt.main);
    }
    main.classList.toggle('text-size', q.type === 'symbol');
    $('q-sub').textContent = q.prompt.sub;

    const box = $('choices');
    box.textContent = '';
    box.classList.toggle('glyph', q.type === 'symbol');
    q.choices.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      if (q.type !== 'symbol') {
        const key = document.createElement('span');
        key.className = 'key';
        key.textContent = String(i + 1);
        btn.appendChild(key);
      }
      if (q.type === 'symbol') {
        const glyph = document.createElement('span');
        setSymbol(glyph, text);
        btn.appendChild(glyph);
      } else {
        btn.appendChild(document.createTextNode(text));
      }
      btn.addEventListener('click', () => choose(i));
      box.appendChild(btn);
    });
  }

  function choose(index) {
    if (game.state.answered) return;
    const res = game.answer(index);
    player.play(res.isCorrect ? 'correct' : 'wrong');
    const buttons = $('choices').querySelectorAll('button');
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === res.correctIndex) b.classList.add('correct');
      else if (i === index) b.classList.add('wrong');
    });
    const fbText = $('fb-text');
    fbText.textContent = res.isCorrect ? `⭕ 正解！ +${res.gained}点` : '❌ ざんねん…';
    fbText.className = res.isCorrect ? 'ok' : 'ng';
    const sym = res.symbol;
    const detail = $('fb-detail');
    detail.textContent = '';
    const glyph = document.createElement('span');
    glyph.className = 'fb-glyph';
    setSymbol(glyph, sym.display);
    detail.append(glyph, `　${sym.reading}：${sym.meaning}`);
    $('feedback').hidden = false;
    $('btn-next').focus();
    renderStatus();
  }

  function next() {
    game.next();
    if (game.state.finished) finish();
    else renderQuestion();
  }

  function finish() {
    const r = game.result();
    const best = loadBest();
    const isNew = r.score > best;
    if (isNew) saveBest(r.score);
    $('rs-title').textContent = r.cleared ? 'クリア！' : 'ゲームオーバー';
    $('rs-rank').textContent = r.rank;
    $('rs-detail').textContent =
      `${r.total}問中 ${r.correct}問正解 ／ スコア ${r.score}点 ／ 最大 ${r.maxCombo} 連続`;
    $('rs-new').hidden = !isNew;
    show('result');
  }

  function renderSoundToggle() {
    const btn = $('btn-sound');
    btn.textContent = player.muted ? '🔇' : '🔊';
    btn.setAttribute('aria-pressed', String(!player.muted));
  }
  $('btn-sound').addEventListener('click', () => {
    player.setMuted(!player.muted);
    try { localStorage.setItem(MUTE_KEY, player.muted ? '1' : '0'); } catch (e) { /* 保存不可は無視 */ }
    renderSoundToggle();
  });
  renderSoundToggle();

  $('btn-next').addEventListener('click', next);
  $('btn-retry').addEventListener('click', () => start(currentCategory));
  $('btn-menu').addEventListener('click', renderMenu);

  // キーボード: 1-4 で回答、Enter/Space は「次へ」ボタンのクリックに任せる
  document.addEventListener('keydown', (e) => {
    if (screens.play.hidden || !game || game.state.answered) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) choose(n - 1);
  });

  renderMenu();
})();
