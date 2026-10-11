(function (root) {
  const ROUNDS = 10;
  const QUESTION_MS = 10000; // 全問題の制限時間(問題と問題の間の待ち時間はない)
  const SLOT_MS = QUESTION_MS;
  const BASE_POINTS = 1000;
  const MAX_TIME_BONUS = 500;

  function scoreFor(isCorrect, elapsedMs) {
    if (!isCorrect) return 0;
    const e = Math.min(Math.max(elapsedMs, 0), QUESTION_MS);
    return BASE_POINTS + Math.round((MAX_TIME_BONUS * (QUESTION_MS - e)) / QUESTION_MS);
  }

  // 全員が同じ時計(サーバー時刻)で進めるため、現在時刻から今のフェーズを求める
  function phaseAt(startAt, now, rounds = ROUNDS) {
    const t = now - startAt;
    if (t < 0) return { phase: 'countdown', index: 0, remainingMs: -t };
    if (t >= rounds * SLOT_MS) return { phase: 'done', index: rounds - 1, remainingMs: 0 };
    const index = Math.floor(t / SLOT_MS);
    const into = t - index * SLOT_MS;
    return { phase: 'question', index, elapsedMs: into, remainingMs: QUESTION_MS - into };
  }

  // answers: { [問題番号]: { c: 選んだ番号, ms: 回答までの時間, ok: 正解か } }
  function summarize(answers, rounds = ROUNDS) {
    let score = 0;
    let correct = 0;
    let answered = 0;
    let totalMs = 0;
    for (let i = 0; i < rounds; i++) {
      const a = answers && answers[i];
      if (!a) {
        totalMs += QUESTION_MS; // 未回答は制限時間いっぱい使ったものとして扱う
        continue;
      }
      answered += 1;
      totalMs += Math.min(Math.max(a.ms, 0), QUESTION_MS);
      if (a.ok) {
        correct += 1;
        score += scoreFor(true, a.ms);
      }
    }
    return { score, correct, answered, totalMs };
  }

  // 得点が高い順、同点なら合計時間が短い順。得点も時間も同じなら同順位。
  function rankPlayers(numbers, results, rounds = ROUNDS) {
    const rows = numbers.map((number) => {
      const r = (results && results[number]) || {};
      return {
        number,
        score: r.score || 0,
        correct: r.correct || 0,
        totalMs: typeof r.totalMs === 'number' ? r.totalMs : rounds * QUESTION_MS,
      };
    });
    rows.sort((a, b) => b.score - a.score || a.totalMs - b.totalMs || a.number.localeCompare(b.number));
    rows.forEach((row, i) => {
      const prev = rows[i - 1];
      row.rank = prev && prev.score === row.score && prev.totalMs === row.totalMs ? prev.rank : i + 1;
    });
    return rows;
  }

  const percent = (correct, answered) => (answered ? Math.round((correct * 100) / answered) : null);

  // 先生のダッシュボード用: 参加者ごとの回答状況(○=true, ×=false, 未回答=null)と正答率
  function classProgress(numbers, results, rounds = ROUNDS) {
    const perQuestion = Array.from({ length: rounds }, () => ({ answered: 0, correct: 0, rate: null }));
    const rows = numbers.slice().sort().map((number) => {
      const answers = (results && results[number] && results[number].answers) || {};
      const cells = [];
      for (let i = 0; i < rounds; i++) {
        const a = answers[i];
        if (!a) { cells.push(null); continue; }
        cells.push(Boolean(a.ok));
        perQuestion[i].answered += 1;
        if (a.ok) perQuestion[i].correct += 1;
      }
      const sum = summarize(answers, rounds);
      return {
        number, cells, answered: sum.answered, correct: sum.correct,
        rate: percent(sum.correct, sum.answered), score: sum.score,
      };
    });
    perQuestion.forEach((q) => { q.rate = percent(q.correct, q.answered); });
    const answered = perQuestion.reduce((n, q) => n + q.answered, 0);
    const correct = perQuestion.reduce((n, q) => n + q.correct, 0);
    return { rows, perQuestion, overall: { answered, correct, rate: percent(correct, answered) } };
  }

  // 英字で始まる表記(legato, Allegro, pp など)は「用語」。読みを重ねて見せない。
  const isTerm = (sym) => /^[A-Za-z]/.test(sym.display);

  // 正答を大きく見せるための文言。answer は選択肢と同じ表記、note は補足(出さないときは空)。
  function explainAnswer(question) {
    const { symbol, type } = question;
    if (type === 'meaning') return { answer: symbol.meaning, note: isTerm(symbol) ? '' : symbol.reading };
    if (type === 'reading') return { answer: symbol.reading, note: symbol.meaning };
    return { answer: symbol.display, note: '' };
  }

  // 間違えた問題・時間切れの問題を、問題順に返す(結果発表後の振り返り用)
  function reviewItems(questions, answers, rounds = ROUNDS) {
    const items = [];
    for (let i = 0; i < rounds && i < questions.length; i++) {
      const a = answers && answers[i];
      if (a && a.ok) continue;
      const qu = questions[i];
      items.push({
        index: i,
        type: qu.type,
        symbol: qu.symbol,
        prompt: qu.prompt,
        yourChoice: a ? qu.choices[a.c] : null,
        correctChoice: qu.choices[qu.correctIndex],
        timedOut: !a,
      });
    }
    return items;
  }

  function normalizeDigits(text) {
    return String(text)
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, '');
  }
  const isValidRoomCode = (s) => /^\d{4}$/.test(s);
  const isValidNumber = (s) => /^\d{2}$/.test(s) && s !== '00';

  const api = {
    ROUNDS, QUESTION_MS, SLOT_MS, BASE_POINTS, MAX_TIME_BONUS,
    scoreFor, phaseAt, summarize, rankPlayers, classProgress, explainAnswer, reviewItems, normalizeDigits, isValidRoomCode, isValidNumber,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicBattle = api;
})(typeof window !== 'undefined' ? window : globalThis);
