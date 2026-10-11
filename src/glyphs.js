(function (root) {
  // 教材「音楽の約束」の表に近い形で、音符・休符・演奏記号を SVG で描く。
  // フォントによって形が変わる Unicode の音楽記号の代わりに使う。
  let maskSeq = 0;

  const svg = (viewBox, body, cls = '') =>
    `<svg class="sym ${cls}" viewBox="${viewBox}" fill="currentColor" stroke="none" aria-hidden="true">${body}</svg>`;

  const rot = (cx, cy, deg) => `rotate(${deg} ${cx} ${cy})`;

  // 黒い符頭
  const solidHead = (cx, cy) => `<ellipse cx="${cx}" cy="${cy}" rx="5.8" ry="4.1" transform="${rot(cx, cy, -22)}"/>`;

  // 白い符頭（中が斜めに抜けている）
  function openHead(cx, cy, rx, ry, holeRx, holeRy, holeDeg) {
    const id = `gm${++maskSeq}`;
    return (
      `<mask id="${id}"><rect x="0" y="0" width="100" height="100" fill="#fff"/>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${holeRx}" ry="${holeRy}" transform="${rot(cx, cy, holeDeg)}" fill="#000"/></mask>` +
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="${rot(cx, cy, -18)}" mask="url(#${id})"/>`
    );
  }

  const stem = (x, y1, y2) =>
    `<rect x="${x - 0.8}" y="${Math.min(y1, y2)}" width="1.6" height="${Math.abs(y2 - y1)}"/>`;

  const flag = (x, y) =>
    `<path d="M${x - 0.8} ${y} C${x + 1} ${y + 8} ${x + 10} ${y + 10} ${x + 6.5} ${y + 21} ` +
    `C${x + 7} ${y + 12} ${x + 1} ${y + 10} ${x - 0.8} ${y + 6} Z"/>`;

  // 符幹つきの音符（符頭は (10,34)、符幹は右側を上向き）
  const NOTE_VIEW = '0 0 30 50';
  const noteBody = (kind) => {
    if (kind === 'half') return openHead(10, 34, 6.4, 4.6, 4.8, 2.3, -48) + stem(15.4, 33, 6);
    if (kind === 'quarter') return solidHead(10, 34) + stem(15.4, 33, 6);
    if (kind === 'eighth') return solidHead(10, 34) + stem(15.4, 33, 6) + flag(15.4, 6);
    return solidHead(10, 34) + stem(15.4, 33, 6) + flag(15.4, 6) + flag(15.4, 13);
  };

  // 5本の五線（y = 12..36）
  const STAFF_VIEW = '0 0 44 48';
  const staff = () =>
    [12, 18, 24, 30, 36].map((y) => `<rect x="1" y="${y - 0.6}" width="42" height="1.2" opacity="0.75"/>`).join('');

  const stroke = (d, w = 2.4) =>
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  const dotTail = (x, y, tx, ty) =>
    `<circle cx="${x}" cy="${y}" r="2.3"/>` + stroke(`M${x + 2} ${y - 1} Q${x + 6} ${y - 1} ${tx} ${ty}`, 1.8);

  const GLYPHS = {
    'whole-note': () => svg(NOTE_VIEW, openHead(15, 34, 9.5, 6, 3.8, 4.6, -40), 'note'),
    'half-note': () => svg(NOTE_VIEW, noteBody('half'), 'note'),
    'quarter-note': () => svg(NOTE_VIEW, noteBody('quarter'), 'note'),
    'eighth-note': () => svg(NOTE_VIEW, noteBody('eighth'), 'note'),
    'sixteenth-note': () => svg(NOTE_VIEW, noteBody('sixteenth'), 'note'),

    // 全休符は第4線から下がる、2分休符は第3線の上に乗る
    'whole-rest': () => svg(STAFF_VIEW, staff() + '<rect x="15" y="18" width="14" height="3"/>', 'rest'),
    'half-rest': () => svg(STAFF_VIEW, staff() + '<rect x="15" y="21" width="14" height="3"/>', 'rest'),
    'quarter-rest': () =>
      svg(STAFF_VIEW, staff() + stroke('M25 12 L18 20 L24.5 27 Q17 27 19.5 35 Q22 33 23.5 35', 2.6), 'rest'),
    'eighth-rest': () =>
      svg(STAFF_VIEW, staff() + dotTail(19, 21, 26.5, 18.5) + stroke('M27 18.5 L21 36', 2), 'rest'),
    'sixteenth-rest': () =>
      svg(
        STAFF_VIEW,
        staff() + dotTail(20, 19, 27.5, 16.5) + dotTail(18, 26, 25.5, 23.5) + stroke('M28 16.5 L20.5 38', 2),
        'rest'
      ),

    // 音符の下に点・線・>
    staccato: () => svg('0 0 30 56', solidHead(10, 34) + stem(15.4, 33, 6) + '<circle cx="10" cy="46" r="2.4"/>', 'note'),
    tenuto: () => svg('0 0 30 56', solidHead(10, 34) + stem(15.4, 33, 6) + '<rect x="4" y="44.8" width="12" height="2.4"/>', 'note'),
    accent: () =>
      svg('0 0 30 56', solidHead(10, 34) + stem(15.4, 33, 6) + stroke('M3.5 42 L16.5 46 L3.5 50', 2.2), 'note'),

    fermata: () =>
      svg('0 0 44 34', stroke('M4 26 C4 4 40 4 40 26', 3) + '<circle cx="22" cy="21" r="3.2"/>', 'fermata'),

    // 同じ高さの2音をタイでつなぐ
    tie: () =>
      svg(
        '0 0 84 58',
        staff().replace(/width="42"/g, 'width="82"') +
          solidHead(18, 30) + stem(23.4, 29, 4) + solidHead(58, 30) + stem(63.4, 29, 4) +
          stroke('M18 39 Q38 52 58 39', 2.2),
        'staff-sym'
      ),
    // 高さの違う2音をスラーでつなぐ
    slur: () =>
      svg(
        '0 0 84 58',
        staff().replace(/width="42"/g, 'width="82"') +
          solidHead(18, 33) + stem(23.4, 32, 6) + solidHead(58, 21) + stem(63.4, 20, -4) +
          stroke('M18 42 Q38 54 58 30', 2.2),
        'staff-sym'
      ),

    // 強弱の < と >
    cresc: () => svg('0 0 60 40', stroke('M4 20 L56 6 M4 20 L56 34', 2.4), 'hairpin'),
    decresc: () => svg('0 0 60 40', stroke('M4 6 L56 20 L4 34', 2.4), 'hairpin'),
  };

  function svgFor(id) {
    const draw = GLYPHS[id];
    return draw ? draw() : null;
  }

  const api = { svgFor, GLYPH_IDS: Object.keys(GLYPHS) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicGlyphs = api;
})(typeof window !== 'undefined' ? window : globalThis);
