const test = require('node:test');
const assert = require('node:assert/strict');
const { createRng, buildQuestions } = require('../src/game.js');
const { SYMBOLS } = require('../src/symbols.js');

test('buildQuestions: 同じシードなら全員に同じ問題・同じ選択肢順が出る', () => {
  const a = buildQuestions({ symbols: SYMBOLS, rounds: 10, rng: createRng(4242) });
  const b = buildQuestions({ symbols: SYMBOLS, rounds: 10, rng: createRng(4242) });
  assert.equal(a.length, 10);
  assert.deepEqual(
    a.map((q) => [q.type, q.symbol.id, q.choices, q.correctIndex]),
    b.map((q) => [q.type, q.symbol.id, q.choices, q.correctIndex])
  );
});

test('buildQuestions: シードが違えば問題が変わる', () => {
  const a = buildQuestions({ symbols: SYMBOLS, rounds: 10, rng: createRng(1) });
  const b = buildQuestions({ symbols: SYMBOLS, rounds: 10, rng: createRng(2) });
  assert.notDeepEqual(a.map((q) => q.symbol.id), b.map((q) => q.symbol.id));
});

test('buildQuestions: 各問題は4択で正解の位置が正しく、同じ記号は重複しない', () => {
  const qs = buildQuestions({ symbols: SYMBOLS, rounds: 10, rng: createRng(99) });
  const ids = new Set(qs.map((q) => q.symbol.id));
  assert.equal(ids.size, 10);
  qs.forEach((q) => {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    const correctText = q.type === 'meaning' ? q.symbol.meaning : q.type === 'reading' ? q.symbol.reading : q.symbol.display;
    assert.equal(q.choices[q.correctIndex], correctText);
  });
});

test('buildQuestions: 問題数より記号が少ない場合は記号数までに収まる', () => {
  const few = SYMBOLS.slice(0, 6);
  const qs = buildQuestions({ symbols: few, rounds: 10, rng: createRng(5) });
  assert.equal(qs.length, 6);
});

test('buildQuestions: 選択肢を作れないほど記号が少ないとエラー', () => {
  assert.throws(() => buildQuestions({ symbols: SYMBOLS.slice(0, 3), rounds: 10, rng: createRng(5) }), /not enough symbols/);
});
