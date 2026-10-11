// 先生用画面: ゲーム作成 → 参加者の確認 → 開始 → 回答状況の監視 → 結果発表
(function () {
  const { CATEGORIES } = window.MusicData;
  const B = window.MusicBattle;
  const C = window.MusicCommon;

  const SESSION_KEY = 'music-symbol-quest-teacher-session';
  const START_DELAY_MS = 5000; // 「開始」を押してから1問目までのカウントダウン
  const STALE_ROOM_MS = 12 * 60 * 60 * 1000; // 古い部屋のコードは再利用してよい

  const $ = (id) => document.getElementById(id);
  const player = C.createPlayer($('btn-sound'));
  const confetti = window.MusicConfetti.createConfetti($('confetti'));

  let store = null;
  let code = null;
  let room = null;
  let unwatch = null;
  let loop = 0;
  let cancelReveal = null;
  let resultsShown = false;
  let tableIndex = -2; // 表で強調中の問題番号(再描画の判定用)

  function show(name) {
    $('screen-setup').hidden = name !== 'setup';
    $('screen-main').hidden = name !== 'main';
  }
  const playersOf = (r) => Object.keys((r && r.players) || {});
  const roundsOf = (r) => (r && r.rounds) || B.ROUNDS;

  // ---------- ゲーム作成 ----------
  function renderSetup() {
    const sel = $('sel-category');
    sel.textContent = '';
    [{ id: 'all', label: 'ぜんぶ混ぜて', icon: '🌟' }, ...CATEGORIES].forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.label}（${Math.min(B.ROUNDS, C.poolFor(c.id).length)}問）`;
      sel.appendChild(opt);
    });
    show('setup');
  }

  function setSetupError(message) {
    const el = $('setup-error');
    el.hidden = !message;
    el.textContent = message || '';
  }

  async function createRoom() {
    const category = $('sel-category').value;
    setSetupError('');
    try {
      for (let i = 0; i < 20; i++) {
        const next = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        const data = {
          status: 'lobby',
          category,
          rounds: Math.min(B.ROUNDS, C.poolFor(category).length),
          seed: Math.floor(Math.random() * 2 ** 31),
          createdAt: store.now(),
        };
        const ok = await store.claim(`rooms/${next}`, (cur) =>
          cur && store.now() - (cur.createdAt || 0) < STALE_ROOM_MS ? undefined : data);
        if (ok) return begin(next);
      }
      setSetupError('コードを作れませんでした。もう一度試してください。');
    } catch (e) {
      setSetupError('ゲームを作成できませんでした。通信を確かめてください。');
    }
  }

  function begin(next) {
    end();
    code = next;
    C.tab.set(SESSION_KEY, JSON.stringify({ code }));
    resultsShown = false;
    tableIndex = -2;
    $('result-area').hidden = true;
    $('t-code').textContent = code;
    $('t-url').textContent = new URL('index.html', window.location.href).href;
    show('main');
    unwatch = store.watch(`rooms/${code}`, onRoom);
    loop = setInterval(tick, 200);
  }

  function end() {
    if (loop) clearInterval(loop);
    loop = 0;
    if (unwatch) unwatch();
    unwatch = null;
    if (cancelReveal) cancelReveal();
    cancelReveal = null;
    room = null;
    code = null;
  }

  function newGame() {
    end();
    C.tab.del(SESSION_KEY);
    renderSetup();
  }

  // ---------- 表示 ----------
  function onRoom(r) {
    room = r;
    if (!room) return newGame();
    render();
    tick();
  }

  function currentPhase() {
    if (!room || room.status === 'lobby' || room.startAt == null) return null;
    return B.phaseAt(room.startAt, store.now(), roundsOf(room));
  }

  function td(text, cls) {
    const el = document.createElement('td');
    el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }

  // 参加者 × 問題 の回答状況の表
  function renderTable(currentIndex) {
    tableIndex = currentIndex;
    const rounds = roundsOf(room);
    const prog = B.classProgress(playersOf(room), room.results || {}, rounds);
    const table = $('t-table');
    table.textContent = '';

    const head = document.createElement('tr');
    head.appendChild(td('出席番号'));
    for (let i = 0; i < rounds; i++) head.appendChild(td(String(i + 1), i === currentIndex ? 'now' : ''));
    ['回答', '正答率', '得点'].forEach((t) => head.appendChild(td(t)));
    const thead = document.createElement('thead');
    thead.appendChild(head);
    table.appendChild(thead);

    const body = document.createElement('tbody');
    if (prog.rows.length === 0) {
      const tr = document.createElement('tr');
      const cell = td('まだ誰も参加していません。生徒が出席番号でエントリーするとここに表示されます。', 'empty');
      cell.colSpan = rounds + 4;
      tr.appendChild(cell);
      body.appendChild(tr);
    }
    prog.rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.appendChild(td(`${row.number}番`, 'num'));
      row.cells.forEach((c, i) => {
        const cls = [c === true ? 'ok' : c === false ? 'ng' : 'none', i === currentIndex ? 'now' : ''].join(' ');
        tr.appendChild(td(c === true ? '○' : c === false ? '×' : '・', cls));
      });
      tr.appendChild(td(`${row.answered} / ${rounds}`));
      tr.appendChild(td(row.rate === null ? '-' : `${row.rate}%`, 'rate'));
      tr.appendChild(td(`${C.fmt(row.score)}`, 'pts'));
      body.appendChild(tr);
    });
    table.appendChild(body);

    if (prog.rows.length) {
      const foot = document.createElement('tfoot');
      const tr = document.createElement('tr');
      tr.appendChild(td('正答率'));
      prog.perQuestion.forEach((q, i) => {
        tr.appendChild(td(q.rate === null ? '-' : `${q.rate}%`, i === currentIndex ? 'now' : ''));
      });
      tr.appendChild(td(`${prog.overall.answered}`));
      tr.appendChild(td(prog.overall.rate === null ? '-' : `${prog.overall.rate}%`, 'rate'));
      tr.appendChild(td(''));
      foot.appendChild(tr);
      table.appendChild(foot);
    }
    return prog;
  }

  function render() {
    const phase = currentPhase();
    const idx = phase && phase.phase === 'question' ? phase.index : -1;
    const prog = renderTable(idx);
    $('s-players').textContent = `${playersOf(room).length}人`;
    $('s-rate').textContent = prog.overall.rate === null ? '-' : `${prog.overall.rate}%（${prog.overall.correct}/${prog.overall.answered}）`;
    renderAction();
    if (room.status === 'revealed') showResults(prog);
  }

  function renderAction() {
    const btn = $('btn-action');
    if (room.status === 'revealed') { btn.hidden = true; return; }
    btn.hidden = false;
    if (room.status === 'lobby') {
      btn.textContent = '▶ ゲーム開始';
      btn.disabled = playersOf(room).length === 0;
    } else {
      btn.textContent = '🏆 結果発表';
      const phase = currentPhase();
      btn.disabled = !phase || phase.phase !== 'done';
    }
  }

  // 1問ごとに変わる数値を更新する(100〜200msごと)
  function tick() {
    if (!room || room.status === 'revealed') return;
    const rounds = roundsOf(room);
    const state = $('s-state');
    if (room.status === 'lobby') {
      state.textContent = '参加受付中';
      $('s-q').textContent = '-';
      $('s-time').textContent = '-';
      $('s-answered').textContent = '-';
      return;
    }
    const p = currentPhase();
    if (!p) return;
    if (p.phase === 'countdown') {
      state.textContent = 'まもなく開始';
      $('s-q').textContent = '-';
      $('s-time').textContent = `${Math.ceil(p.remainingMs / 1000)}`;
      $('s-answered').textContent = '-';
      return;
    }
    if (p.phase === 'done') {
      state.textContent = '全問終了';
      $('s-q').textContent = `${rounds} / ${rounds} 問`;
      $('s-time').textContent = '-';
      $('s-answered').textContent = '-';
      renderAction();
      if (tableIndex !== -1) render();
      return;
    }
    state.textContent = '出題中';
    $('s-q').textContent = `${p.index + 1} / ${rounds} 問`;
    $('s-time').textContent = `${Math.ceil(p.remainingMs / 1000)} 秒`;
    const total = playersOf(room).length;
    const answered = Object.values(room.results || {})
      .filter((r) => r && r.answers && r.answers[p.index]).length;
    $('s-answered').textContent = `${answered} / ${total}人`;
    if (tableIndex !== p.index) render();
  }

  async function onAction() {
    if (!room) return;
    const btn = $('btn-action');
    btn.disabled = true;
    if (room.status === 'lobby') {
      await store.update(`rooms/${code}`, { status: 'playing', startAt: store.now() + START_DELAY_MS });
    } else if (room.status === 'playing') {
      await store.update(`rooms/${code}`, { status: 'revealed', revealedAt: store.now() });
    }
  }

  // ---------- 結果発表 ----------
  function showResults() {
    $('s-state').textContent = '結果発表';
    $('result-area').hidden = false;
    if (resultsShown) return;
    resultsShown = true;
    const ranked = B.rankPlayers(playersOf(room), room.results || {}, roundsOf(room));
    cancelReveal = window.MusicResults.reveal({ ranked, myNumber: null, player, confetti });
    $('result-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('btn-create').addEventListener('click', createRoom);
  $('btn-action').addEventListener('click', onAction);
  $('btn-new').addEventListener('click', newGame);

  // ---------- 起動 ----------
  async function boot() {
    renderSetup();
    store = await C.initStore($('mode-note'));
    // 再読み込みしても、進行中のゲームに戻れるようにする
    let saved = null;
    try { saved = JSON.parse(C.tab.get(SESSION_KEY)); } catch (e) { saved = null; }
    if (saved && saved.code) {
      const data = await store.get(`rooms/${saved.code}`).catch(() => null);
      if (data) return begin(saved.code);
      C.tab.del(SESSION_KEY);
    }
  }
  boot();
})();
