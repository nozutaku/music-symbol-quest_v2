// 生徒用画面: 参加 → 出題(全員同時・1問10秒・待ち時間なし) → 結果発表
(function () {
  const { SYMBOLS } = window.MusicData;
  const { createRng, buildQuestions } = window.MusicGame;
  const B = window.MusicBattle;
  const C = window.MusicCommon;

  const SESSION_KEY = 'music-symbol-quest-student-session';
  const TYPE_LABELS = {
    meaning: 'この記号の意味は？',
    reading: 'この記号の読み方は？',
    symbol: 'この意味・読み方の記号は？',
  };

  const $ = (id) => document.getElementById(id);
  const screens = { home: $('screen-home'), wait: $('screen-wait'), play: $('screen-play'), result: $('screen-result') };
  const player = C.createPlayer($('btn-sound'));
  const confetti = window.MusicConfetti.createConfetti($('confetti'));
  const clientId = C.clientId();
  const fmt = C.fmt;

  let store = null;
  let session = null; // { code, number }
  let room = null;
  let unwatch = null;
  let loop = 0;
  let questions = null;
  let rounds = B.ROUNDS;
  let answers = {};
  let ui = {};
  let cancelReveal = null;
  let resultsShown = false;

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
  }
  function setError(message) {
    const el = $('entry-error');
    el.hidden = !message;
    el.textContent = message || '';
  }

  // ---------- 参加 ----------
  function beginSession(next) {
    endSession();
    session = next;
    C.tab.set(SESSION_KEY, JSON.stringify(session));
    resultsShown = false;
    unwatch = store.watch(`rooms/${session.code}`, onRoom);
    loop = setInterval(tick, 100);
  }

  function endSession() {
    if (loop) clearInterval(loop);
    loop = 0;
    if (unwatch) unwatch();
    unwatch = null;
    if (cancelReveal) cancelReveal();
    cancelReveal = null;
    room = null;
    questions = null;
    answers = {};
    ui = {};
    session = null;
  }

  function goHome(message) {
    endSession();
    C.tab.del(SESSION_KEY);
    $('btn-home').hidden = true;
    show('home');
    setError(message || '');
  }

  async function join(code, number) {
    const data = await store.get(`rooms/${code}`);
    if (!data) throw new Error('そのエンターコードのゲームは見つかりません。コードを確かめてください。');
    const existing = data.players && data.players[number];
    const isMe = existing && existing.clientId === clientId;
    if (data.status !== 'lobby' && !isMe) throw new Error('このゲームはもう始まっています。');
    const ok = await store.claim(`rooms/${code}/players/${number}`, (cur) =>
      cur && cur.clientId !== clientId ? undefined : { clientId, joinedAt: store.now() });
    if (!ok) throw new Error(`出席番号 ${number} はすでに使われています。番号を確かめてください。`);
    beginSession({ code, number });
  }

  $('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = B.normalizeDigits($('in-code').value);
    const number = B.normalizeDigits($('in-number').value);
    if (!B.isValidRoomCode(code)) return setError('エンターコードは4桁の数字です。');
    if (!B.isValidNumber(number)) return setError('出席番号は2桁の数字です(例: 05)。');
    setError('');
    try {
      await join(code, number);
    } catch (ex) {
      setError(ex.message || '参加できませんでした。もう一度試してください。');
    }
  });

  // ---------- 部屋の更新 ----------
  function ensureQuestions() {
    if (questions || !room || room.seed == null) return;
    rounds = room.rounds || B.ROUNDS;
    questions = buildQuestions({
      symbols: C.poolFor(room.category || 'all'),
      rounds,
      rng: createRng(room.seed),
    });
  }

  function onRoom(r) {
    room = r;
    if (!room) return goHome('ゲームが終了したか、見つかりません。');
    ensureQuestions();
    if (Object.keys(answers).length === 0) { // 再読み込み後に、送信済みの回答を取り戻す
      const saved = room.results && room.results[session.number] && room.results[session.number].answers;
      if (saved) Object.entries(saved).forEach(([i, a]) => { if (a) answers[i] = a; });
    }
    if (room.status === 'revealed') return showResults();
    if (room.status === 'lobby') renderLobby();
    tick();
  }

  function renderLobby() {
    show('wait');
    const count = Object.keys(room.players || {}).length;
    $('wait-title').textContent = `${session.number}番 エントリー完了！`;
    $('wait-text').textContent = `先生がゲームを始めるのを待っています。(参加者 ${count}人)`;
    $('wait-count').hidden = true;
  }

  // ---------- 出題 ----------
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

  const mySummary = () => B.summarize(answers, rounds);

  function renderQuestion(index) {
    const q = questions[index];
    $('st-progress').textContent = `${index + 1} / ${rounds} 問`;
    $('st-me').textContent = `${session.number}番`;
    $('st-score').textContent = `${fmt(mySummary().score)} 点`;
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
        btn.appendChild(document.createTextNode(text));
      } else {
        const glyph = document.createElement('span');
        setSymbol(glyph, text);
        btn.appendChild(glyph);
      }
      btn.addEventListener('click', () => choose(i));
      box.appendChild(btn);
    });
    if (answers[index]) { // 再読み込みで戻ってきた場合
      markAnswered(index);
      showFeedback(index);
    }
  }

  function markAnswered(index) {
    const q = questions[index];
    const a = answers[index];
    $('choices').querySelectorAll('button').forEach((b, i) => {
      b.disabled = true;
      if (i === q.correctIndex) b.classList.add('correct');
      else if (a && i === a.c) b.classList.add('wrong');
    });
  }

  // 選択肢の表記を、記号なら図、それ以外は文字で表示する
  function setValue(el, type, text) {
    if (type === 'symbol') setSymbol(el, text);
    else el.textContent = text;
  }

  function showFeedback(index) {
    const q = questions[index];
    const a = answers[index];
    const fbText = $('fb-text');
    if (a.ok) {
      fbText.textContent = `⭕ 正解！ +${fmt(B.scoreFor(true, a.ms))}点（${(a.ms / 1000).toFixed(1)}秒）`;
      fbText.className = 'ok';
    } else {
      fbText.textContent = '❌ ざんねん… 0点';
      fbText.className = 'ng';
    }
    const ex = B.explainAnswer(q);
    const box = $('feedback').querySelector('.answer-box');
    box.classList.toggle('glyph', q.type === 'symbol');
    setValue($('fb-answer'), q.type, ex.answer);
    $('fb-note').textContent = ex.note;
    $('fb-note').hidden = !ex.note;
    $('feedback').hidden = false;
  }

  function choose(choiceIndex) {
    if (!room || room.status !== 'playing' || !questions) return;
    const p = B.phaseAt(room.startAt, store.now(), rounds);
    if (p.phase !== 'question' || answers[p.index]) return;
    const ok = choiceIndex === questions[p.index].correctIndex;
    answers[p.index] = { c: choiceIndex, ms: p.elapsedMs, ok };
    player.play(ok ? 'correct' : 'wrong');
    markAnswered(p.index);
    showFeedback(p.index);
    const sum = mySummary();
    $('st-score').textContent = `${fmt(sum.score)} 点`;
    store.set(`rooms/${session.code}/results/${session.number}`, { answers, ...sum })
      .catch(() => { /* 通信が戻れば次の回答で送り直される */ });
  }

  function setTimer(remainingMs) {
    const ratio = Math.max(0, Math.min(1, remainingMs / B.QUESTION_MS));
    const bar = $('timer-bar');
    bar.style.width = `${ratio * 100}%`;
    bar.classList.toggle('urgent', remainingMs <= 3000);
    $('timer-text').textContent = String(Math.ceil(remainingMs / 1000));
  }

  function tick() {
    if (!room || room.status !== 'playing' || room.startAt == null || !session || !questions) return;
    const p = B.phaseAt(room.startAt, store.now(), rounds);

    if (p.phase === 'countdown') {
      show('wait');
      const n = Math.ceil(p.remainingMs / 1000);
      $('wait-title').textContent = 'まもなく開始！';
      $('wait-text').textContent = 'じゅんびはいいかな？';
      const count = $('wait-count');
      count.hidden = false;
      count.textContent = String(n);
      if (ui.lastCount !== n) { ui.lastCount = n; player.play('countdown'); }
      return;
    }

    if (p.phase === 'done') {
      if (ui.finished) return;
      ui.finished = true;
      if (!answers[rounds - 1]) player.play('timeup');
      show('wait');
      const sum = mySummary();
      $('wait-title').textContent = '全問終了！';
      $('wait-text').textContent =
        `あなたの得点は ${fmt(sum.score)} 点（${sum.correct}問正解）。先生の結果発表をお待ちください。`;
      $('wait-count').hidden = true;
      return;
    }

    if (ui.shownIndex !== p.index) {
      if (ui.shownIndex >= 0 && !answers[ui.shownIndex]) player.play('timeup'); // 前の問題を時間切れで終えた
      ui.shownIndex = p.index;
      ui.lastSecond = null;
      show('play');
      if (p.index === 0) player.play('go');
      renderQuestion(p.index);
    }
    setTimer(p.remainingMs);
    const sec = Math.ceil(p.remainingMs / 1000);
    if (!answers[p.index] && ui.lastSecond !== sec) { // シンキングタイムの時計の音
      ui.lastSecond = sec;
      player.play(sec <= 3 ? 'tickUrgent' : 'tick');
    }
  }

  // ---------- 結果発表 ----------
  // 自分が間違えた問題(時間切れ含む)と正答の一覧
  function renderReview() {
    const items = B.reviewItems(questions, answers, rounds);
    const list = $('rv-list');
    list.textContent = '';
    $('rv-title').textContent = items.length
      ? `まちがえた問題（${items.length}問）`
      : '全問正解！ パーフェクト 🎉';
    items.forEach((it) => {
      const li = document.createElement('li');
      const head = document.createElement('div');
      head.className = 'rv-head';
      head.textContent = `第${it.index + 1}問　${TYPE_LABELS[it.type]}`;
      const main = document.createElement('div');
      main.className = 'rv-main';
      if (it.type === 'symbol') main.textContent = it.prompt.main + (it.prompt.sub ? `（${it.prompt.sub}）` : '');
      else setSymbol(main, it.prompt.main);
      const mine = document.createElement('div');
      mine.className = 'rv-row ng';
      const mineLabel = document.createElement('span');
      mineLabel.className = 'rv-label';
      mineLabel.textContent = 'あなたの答え';
      const mineValue = document.createElement('span');
      mineValue.className = 'rv-value';
      if (it.timedOut) mineValue.textContent = '時間切れ';
      else setValue(mineValue, it.type, it.yourChoice);
      mine.append(mineLabel, mineValue);
      const right = document.createElement('div');
      right.className = 'rv-row ok';
      const rightLabel = document.createElement('span');
      rightLabel.className = 'rv-label';
      rightLabel.textContent = '正解';
      const rightValue = document.createElement('span');
      rightValue.className = 'rv-value rv-answer';
      setValue(rightValue, it.type, it.correctChoice);
      right.append(rightLabel, rightValue);
      li.append(head, main, mine, right);
      list.appendChild(li);
    });
    $('rs-review').hidden = false;
  }

  function showResults() {
    show('result');
    $('btn-home').hidden = false;
    if (resultsShown) return;
    resultsShown = true;
    if (loop) clearInterval(loop);
    loop = 0;
    const ranked = B.rankPlayers(Object.keys(room.players || {}), room.results || {}, rounds);
    $('rs-review').hidden = true;
    cancelReveal = window.MusicResults.reveal({
      ranked, myNumber: session.number, player, confetti, onDone: renderReview,
    });
  }

  $('btn-home').addEventListener('click', () => goHome(''));

  document.addEventListener('keydown', (e) => {
    if (screens.play.hidden) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4) choose(n - 1);
  });

  // ---------- 起動 ----------
  async function boot() {
    show('home');
    store = await C.initStore($('mode-note'));
    // 再読み込みしても、参加中のゲームに戻れるようにする
    let saved = null;
    try { saved = JSON.parse(C.tab.get(SESSION_KEY)); } catch (e) { saved = null; }
    if (saved && saved.code && saved.number) {
      const data = await store.get(`rooms/${saved.code}`).catch(() => null);
      const mine = data && data.players && data.players[saved.number];
      if (mine && mine.clientId === clientId) return beginSession(saved);
      C.tab.del(SESSION_KEY);
    }
  }
  boot();
})();
