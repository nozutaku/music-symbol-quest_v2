const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../src/battle.js');

test('定数: 1問10秒・10問・問題間の待ち時間なし', () => {
  assert.equal(B.QUESTION_MS, 10000);
  assert.equal(B.ROUNDS, 10);
  assert.equal(B.SLOT_MS, B.QUESTION_MS);
});

test('scoreFor: 不正解は経過時間に関係なく0点', () => {
  assert.equal(B.scoreFor(false, 0), 0);
  assert.equal(B.scoreFor(false, 5000), 0);
});

test('scoreFor: 即答なら1000+500=1500点、10秒ちょうどなら1000点', () => {
  assert.equal(B.scoreFor(true, 0), 1500);
  assert.equal(B.scoreFor(true, 10000), 1000);
});

test('scoreFor: 5秒(制限時間の半分)で正解なら1250点、速いほど高得点', () => {
  assert.equal(B.scoreFor(true, 5000), 1250);
  assert.ok(B.scoreFor(true, 2000) > B.scoreFor(true, 3000));
});

test('scoreFor: 範囲外の経過時間は丸める(負→1500、10秒超→1000)', () => {
  assert.equal(B.scoreFor(true, -300), 1500);
  assert.equal(B.scoreFor(true, 12345), 1000);
});

test('phaseAt: 開始前はカウントダウンで残りミリ秒を返す', () => {
  assert.deepEqual(B.phaseAt(100000, 97000), { phase: 'countdown', index: 0, remainingMs: 3000 });
});

test('phaseAt: 開始ちょうどは1問目の出題0ms', () => {
  assert.deepEqual(B.phaseAt(100000, 100000), { phase: 'question', index: 0, elapsedMs: 0, remainingMs: 10000 });
});

test('phaseAt: 出題中は経過時間と残り時間を返す', () => {
  assert.deepEqual(B.phaseAt(100000, 103500), { phase: 'question', index: 0, elapsedMs: 3500, remainingMs: 6500 });
});

test('phaseAt: 10秒たつと待ち時間なしで次の問題に切り替わる', () => {
  assert.deepEqual(B.phaseAt(100000, 109999), { phase: 'question', index: 0, elapsedMs: 9999, remainingMs: 1 });
  assert.deepEqual(B.phaseAt(100000, 110000), { phase: 'question', index: 1, elapsedMs: 0, remainingMs: 10000 });
});

test('phaseAt: 10問目の出題中と、全体の終了後(100秒)', () => {
  assert.equal(B.phaseAt(0, 9 * 10000 + 1).index, 9);
  assert.equal(B.phaseAt(0, 9 * 10000 + 1).phase, 'question');
  assert.equal(B.phaseAt(0, 99999).phase, 'question');
  assert.equal(B.phaseAt(0, 100000).phase, 'done');
});

test('phaseAt: 問題数を指定すると、その数で終了する', () => {
  assert.equal(B.phaseAt(0, 7 * 10000 - 1, 7).phase, 'question');
  assert.equal(B.phaseAt(0, 7 * 10000, 7).phase, 'done');
});

test('summarize: 回答から得点・正答数・合計時間を集計(未回答は10秒扱い)', () => {
  const answers = {
    0: { c: 1, ms: 2000, ok: true }, // 1400
    1: { c: 0, ms: 3000, ok: false }, // 0
    // 2問目以降は未回答
  };
  const r = B.summarize(answers, 3);
  assert.equal(r.score, 1400);
  assert.equal(r.correct, 1);
  assert.equal(r.answered, 2);
  assert.equal(r.totalMs, 2000 + 3000 + 10000);
});

test('summarize: 回答が空なら0点・全問10秒扱い', () => {
  assert.deepEqual(B.summarize({}, 10), { score: 0, correct: 0, answered: 0, totalMs: 100000 });
  assert.deepEqual(B.summarize(undefined, 10), { score: 0, correct: 0, answered: 0, totalMs: 100000 });
});

test('rankPlayers: 得点の高い順に並び、同点なら合計時間の短い方が上位', () => {
  const players = ['05', '12', '30'];
  const results = {
    '05': { score: 5000, correct: 4, totalMs: 60000 },
    '12': { score: 9000, correct: 7, totalMs: 80000 },
    '30': { score: 5000, correct: 4, totalMs: 50000 },
  };
  const ranked = B.rankPlayers(players, results);
  assert.deepEqual(ranked.map((p) => [p.number, p.rank]), [['12', 1], ['30', 2], ['05', 3]]);
});

test('rankPlayers: 得点も時間も同じなら同順位で、次の順位は飛ぶ', () => {
  const players = ['01', '02', '03'];
  const results = {
    '01': { score: 3000, correct: 3, totalMs: 40000 },
    '02': { score: 3000, correct: 3, totalMs: 40000 },
    '03': { score: 1000, correct: 1, totalMs: 40000 },
  };
  const ranked = B.rankPlayers(players, results);
  assert.deepEqual(ranked.map((p) => [p.number, p.rank]), [['01', 1], ['02', 1], ['03', 3]]);
});

test('rankPlayers: 結果のない参加者は0点で最下位に含める', () => {
  const ranked = B.rankPlayers(['07', '08'], { '08': { score: 1200, correct: 1, totalMs: 20000 } });
  assert.deepEqual(ranked.map((p) => [p.number, p.score, p.rank]), [['08', 1200, 1], ['07', 0, 2]]);
});

test('rankPlayers: 参加者が0人なら空配列', () => {
  assert.deepEqual(B.rankPlayers([], {}), []);
});

test('isValidRoomCode / isValidNumber: 形式検証', () => {
  assert.equal(B.isValidRoomCode('0123'), true);
  assert.equal(B.isValidRoomCode('123'), false);
  assert.equal(B.isValidRoomCode('12345'), false);
  assert.equal(B.isValidRoomCode('12a4'), false);
  assert.equal(B.isValidNumber('07'), true);
  assert.equal(B.isValidNumber('99'), true);
  assert.equal(B.isValidNumber('00'), false);
  assert.equal(B.isValidNumber('7'), false);
  assert.equal(B.isValidNumber('100'), false);
});

test('normalizeDigits: 全角数字を半角にし、空白を除く', () => {
  assert.equal(B.normalizeDigits(' １２ ３４ '), '1234');
  assert.equal(B.normalizeDigits('07'), '07');
});

test('classProgress: 参加者ごとの回答状況(○×未)・正答率・得点を出席番号順に返す', () => {
  const results = {
    '12': { answers: { 0: { c: 0, ms: 1000, ok: true }, 1: { c: 2, ms: 2000, ok: false } } },
    '05': { answers: { 0: { c: 1, ms: 4000, ok: true } } },
  };
  const p = B.classProgress(['12', '05', '30'], results, 3);
  assert.deepEqual(p.rows.map((r) => r.number), ['05', '12', '30']);
  assert.deepEqual(p.rows[0].cells, [true, null, null]);
  assert.deepEqual(p.rows[1].cells, [true, false, null]);
  assert.deepEqual(p.rows[2].cells, [null, null, null]);
  assert.equal(p.rows[0].answered, 1);
  assert.equal(p.rows[0].correct, 1);
  assert.equal(p.rows[0].rate, 100);
  assert.equal(p.rows[1].rate, 50);
  assert.equal(p.rows[2].rate, null);
  assert.equal(p.rows[0].score, 1000 + Math.round((500 * 6000) / 10000));
  assert.equal(p.rows[2].score, 0);
});

test('classProgress: 問題ごとの回答人数・正解人数・正答率とクラス全体の正答率', () => {
  const results = {
    '01': { answers: { 0: { c: 0, ms: 1000, ok: true }, 1: { c: 1, ms: 1000, ok: true } } },
    '02': { answers: { 0: { c: 3, ms: 1000, ok: false }, 1: { c: 1, ms: 1000, ok: true } } },
    '03': { answers: { 0: { c: 0, ms: 1000, ok: true } } },
  };
  const p = B.classProgress(['01', '02', '03'], results, 3);
  assert.deepEqual(p.perQuestion[0], { answered: 3, correct: 2, rate: 67 });
  assert.deepEqual(p.perQuestion[1], { answered: 2, correct: 2, rate: 100 });
  assert.deepEqual(p.perQuestion[2], { answered: 0, correct: 0, rate: null });
  assert.deepEqual(p.overall, { answered: 5, correct: 4, rate: 80 });
});

test('classProgress: 結果が空でも参加者は一覧に出て、全体の正答率はnull', () => {
  const p = B.classProgress(['07'], undefined, 2);
  assert.equal(p.rows.length, 1);
  assert.deepEqual(p.overall, { answered: 0, correct: 0, rate: null });
});

test('classProgress: Firebaseが配列で返した回答(nullの穴あき)も扱える', () => {
  const results = { '01': { answers: [{ c: 0, ms: 500, ok: true }, null, { c: 1, ms: 900, ok: false }] } };
  const p = B.classProgress(['01'], results, 3);
  assert.deepEqual(p.rows[0].cells, [true, null, false]);
});

// ---- 正答の説明と、間違えた問題の振り返り ----
const { SYMBOLS } = require('../src/symbols.js');
const sym = (id) => SYMBOLS.find((s) => s.id === id);
const q = (type, id, choices = ['a', 'b', 'c', 'd'], correctIndex = 1) => ({ type, symbol: sym(id), choices, correctIndex });

test('explainAnswer: 用語(legato)の「意味」問題では、補足に読み(レガート)を出さない', () => {
  const e = B.explainAnswer(q('meaning', 'legato'));
  assert.equal(e.answer, '滑らかに');
  assert.equal(e.note, '');
});

test('explainAnswer: 用語(Allegro)の「読み方」問題では、正答が読みで、補足は意味', () => {
  const e = B.explainAnswer(q('reading', 'allegro'));
  assert.equal(e.answer, 'アレグロ');
  assert.equal(e.note, '速く');
});

test('explainAnswer: 記号(♯)の「意味」問題では、補足に読み(シャープ)を出す', () => {
  const e = B.explainAnswer(q('meaning', 'sharp'));
  assert.equal(e.answer, '半音上げる');
  assert.equal(e.note, 'シャープ');
});

test('explainAnswer: 「記号を選ぶ」問題の正答は記号の表記で、用語の読みは補足に出さない', () => {
  const e = B.explainAnswer(q('symbol', 'legato'));
  assert.equal(e.answer, 'legato');
  assert.equal(e.note, '');
  const g = B.explainAnswer(q('symbol', 'quarter-note'));
  assert.equal(g.answer, '𝅘𝅥');
  assert.equal(g.note, '');
});

test('reviewItems: 不正解と未回答だけを問題順に返し、正解は含めない', () => {
  const qs = [q('meaning', 'legato', ['x', 'y', 'z', 'w'], 1), q('reading', 'pp', ['a', 'b', 'c', 'd'], 2), q('symbol', 'sharp', ['a', 'b', 'c', 'd'], 3)];
  const answers = { 0: { c: 1, ms: 1000, ok: true }, 1: { c: 0, ms: 2000, ok: false } };
  const items = B.reviewItems(qs, answers, 3);
  assert.deepEqual(items.map((i) => i.index), [1, 2]);
  assert.equal(items[0].yourChoice, 'a');
  assert.equal(items[0].correctChoice, 'c');
  assert.equal(items[0].timedOut, false);
  assert.equal(items[1].yourChoice, null);
  assert.equal(items[1].timedOut, true);
  assert.equal(items[1].correctChoice, 'd');
});

test('reviewItems: 全問正解なら空配列', () => {
  const qs = [q('meaning', 'legato', ['x', 'y', 'z', 'w'], 1)];
  assert.deepEqual(B.reviewItems(qs, { 0: { c: 1, ms: 10, ok: true } }, 1), []);
});
