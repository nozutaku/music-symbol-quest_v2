(function (root) {
  const QUESTION_TYPES = ['meaning', 'reading', 'symbol'];
  const BASE_POINTS = 100;
  const COMBO_BONUS = 50;
  const MAX_COMBO_BONUS_STEPS = 5;

  function createRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, rng) {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 問題タイプごとの「問題文」と「選択肢」の表示内容
  function promptOf(sym, type) {
    if (type === 'symbol') return { main: sym.meaning, sub: sym.reading };
    return { main: sym.display, sub: '' };
  }

  function choiceTextOf(sym, type) {
    if (type === 'meaning') return sym.meaning;
    if (type === 'reading') return sym.reading;
    return sym.display;
  }

  function buildQuestion(symbols, target, type, rng, choiceCount = 4) {
    if (!QUESTION_TYPES.includes(type)) throw new Error(`unknown question type: ${type}`);
    const correctText = choiceTextOf(target, type);

    // 同カテゴリを優先して紛らわしい選択肢にし、足りなければ他カテゴリから補う
    const others = symbols.filter((x) => x.id !== target.id);
    const ordered = [
      ...shuffle(others.filter((x) => x.category === target.category), rng),
      ...shuffle(others.filter((x) => x.category !== target.category), rng),
    ];
    const seen = new Set([correctText]);
    const distractors = [];
    for (const sym of ordered) {
      const text = choiceTextOf(sym, type);
      if (seen.has(text)) continue;
      seen.add(text);
      distractors.push(sym);
      if (distractors.length === choiceCount - 1) break;
    }
    if (distractors.length < choiceCount - 1) {
      throw new Error('not enough symbols to build choices');
    }

    const options = shuffle([target, ...distractors], rng);
    const prompt = promptOf(target, type);
    return {
      type,
      symbol: target,
      prompt,
      choices: options.map((o) => choiceTextOf(o, type)),
      correctIndex: options.findIndex((o) => o.id === target.id),
    };
  }

  function calcRank(correct, total) {
    const ratio = total === 0 ? 0 : correct / total;
    if (ratio >= 0.9) return 'S';
    if (ratio >= 0.7) return 'A';
    if (ratio >= 0.5) return 'B';
    return 'C';
  }

  function createGame({ symbols, rounds = 10, lives = 3, rng = Math.random, choiceCount = 4 }) {
    if (symbols.length < choiceCount) throw new Error('not enough symbols to build choices');
    const targets = shuffle(symbols, rng).slice(0, rounds);
    const questions = targets.map((t) =>
      buildQuestion(symbols, t, QUESTION_TYPES[Math.floor(rng() * QUESTION_TYPES.length)], rng, choiceCount)
    );
    const state = { index: 0, score: 0, combo: 0, maxCombo: 0, correct: 0, lives, answered: false };

    function isFinished() {
      return state.lives <= 0 || state.index >= questions.length;
    }

    return {
      get state() { return { ...state, total: questions.length, finished: isFinished() }; },
      current() { return isFinished() ? null : questions[state.index]; },
      answer(choiceIndex) {
        const q = this.current();
        if (!q) throw new Error('game is finished');
        if (state.answered) throw new Error('already answered');
        state.answered = true;
        const isCorrect = choiceIndex === q.correctIndex;
        let gained = 0;
        if (isCorrect) {
          gained = BASE_POINTS + COMBO_BONUS * Math.min(state.combo, MAX_COMBO_BONUS_STEPS);
          state.score += gained;
          state.combo += 1;
          state.correct += 1;
          state.maxCombo = Math.max(state.maxCombo, state.combo);
        } else {
          state.combo = 0;
          state.lives -= 1;
        }
        return { isCorrect, gained, correctIndex: q.correctIndex, symbol: q.symbol };
      },
      next() {
        if (!state.answered) throw new Error('answer the current question first');
        state.index += 1;
        state.answered = false;
      },
      result() {
        return {
          score: state.score,
          correct: state.correct,
          total: questions.length,
          maxCombo: state.maxCombo,
          cleared: state.lives > 0,
          rank: calcRank(state.correct, questions.length),
        };
      },
    };
  }

  const api = { QUESTION_TYPES, createRng, shuffle, buildQuestion, calcRank, createGame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicGame = api;
})(typeof window !== 'undefined' ? window : globalThis);
