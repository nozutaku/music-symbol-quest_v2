(function (root) {
  // 出題範囲は教材「音楽の約束（音符・休符・記号・用語）」の表に載っている読み方・意味・記号のみ
  const CATEGORIES = [
    { id: 'notes', label: '音符・休符', icon: '🎼' },
    { id: 'tempo', label: '速度に関するもの', icon: '⏱️' },
    { id: 'performance', label: '演奏の仕方', icon: '🎻' },
    { id: 'dynamics', label: '音の強弱', icon: '🔊' },
    { id: 'notation', label: '音高の変化・反復', icon: '🔁' },
  ];

  const s = (id, category, display, reading, meaning) => ({ id, category, display, reading, meaning });

  const SYMBOLS = [
    // 音符と休符（長さの割合は4分音符を1とした場合）
    s('whole-note', 'notes', '𝅝', '全音符', '長さの割合は4'),
    s('half-note', 'notes', '𝅗𝅥', '2分音符', '長さの割合は2'),
    s('quarter-note', 'notes', '𝅘𝅥', '4分音符', '長さの割合は1'),
    s('eighth-note', 'notes', '𝅘𝅥𝅮', '8分音符', '長さの割合は1/2'),
    s('sixteenth-note', 'notes', '𝅘𝅥𝅯', '16分音符', '長さの割合は1/4'),
    s('whole-rest', 'notes', '𝄻', '全休符', '長さの割合は4の休符'),
    s('half-rest', 'notes', '𝄼', '2分休符', '長さの割合は2の休符'),
    s('quarter-rest', 'notes', '𝄽', '4分休符', '長さの割合は1の休符'),
    s('eighth-rest', 'notes', '𝄾', '8分休符', '長さの割合は1/2の休符'),
    s('sixteenth-rest', 'notes', '𝄿', '16分休符', '長さの割合は1/4の休符'),

    // 速度に関するもの
    s('largo', 'tempo', 'Largo', 'ラルゴ', '幅広く緩やかに'),
    s('adagio', 'tempo', 'Adagio', 'アダージョ', '緩やかに'),
    s('lento', 'tempo', 'Lento', 'レント', '緩やかに'),
    s('andante', 'tempo', 'Andante', 'アンダンテ', 'ゆっくり歩くような速さで'),
    s('moderato', 'tempo', 'Moderato', 'モデラート', '中ぐらいの速さで'),
    s('allegretto', 'tempo', 'Allegretto', 'アレグレット', 'やや速く'),
    s('allegro', 'tempo', 'Allegro', 'アレグロ', '速く'),
    s('presto', 'tempo', 'Presto', 'プレスト', '急速に'),
    s('rit', 'tempo', 'ritardando (rit.)', 'リタルダンド', 'だんだん遅く'),
    s('accel', 'tempo', 'accelerando (accel.)', 'アッチェレランド', 'だんだん速く'),
    s('atempo', 'tempo', 'a tempo', 'ア テンポ', 'もとの速さで'),

    // 演奏の仕方に関するもの
    s('staccato', 'performance', '♩̇', 'スタッカート', 'その音を短く切って'),
    s('tenuto', 'performance', '♩̱', 'テヌート', 'その音の長さをじゅうぶんに保って'),
    s('accent', 'performance', '♩>', 'アクセント', 'その音を目立たせて、強調して'),
    s('fermata', 'performance', '𝄐', 'フェルマータ', 'その音符(休符)をほどよく延ばして'),
    s('tie', 'performance', '♩⁀♩', 'タイ', '隣り合った同じ高さの音符をつなぎ、1つの音に'),
    s('slur', 'performance', '♩⁀♪', 'スラー', '高さの違う2つ以上の音符を滑らかに'),
    s('legato', 'performance', 'legato', 'レガート', '滑らかに'),

    // 音の強弱に関するもの
    s('pp', 'dynamics', 'pp', 'ピアニッシモ', 'とても弱く'),
    s('p', 'dynamics', 'p', 'ピアノ', '弱く'),
    s('mp', 'dynamics', 'mp', 'メッゾ ピアノ', '少し弱く'),
    s('mf', 'dynamics', 'mf', 'メッゾ フォルテ', '少し強く'),
    s('f', 'dynamics', 'f', 'フォルテ', '強く'),
    s('ff', 'dynamics', 'ff', 'フォルティッシモ', 'とても強く'),
    s('cresc', 'dynamics', 'crescendo (cresc.)', 'クレシェンド', 'だんだん強く'),
    s('decresc', 'dynamics', 'decrescendo (decresc.)', 'デクレシェンド', 'だんだん弱く'),
    s('dim', 'dynamics', 'diminuendo (dim.)', 'ディミヌエンド', 'だんだん弱く'),

    // 音高の変化・反復の仕方に関するもの
    s('sharp', 'notation', '♯', 'シャープ', '半音上げる'),
    s('flat', 'notation', '♭', 'フラット', '半音下げる'),
    s('natural', 'notation', '♮', 'ナチュラル', 'もとの高さで'),
    s('dc', 'notation', 'D.C.', 'ダ カーポ', '始めから'),
    s('ds', 'notation', 'D.S.', 'ダル セーニョ', '𝄋から'),
    s('fine', 'notation', 'Fine', 'フィーネ', '終わり'),
    s('coda', 'notation', 'Coda', 'コーダ', '結び'),
  ];

  const api = { CATEGORIES, SYMBOLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MusicData = api;
})(typeof window !== 'undefined' ? window : globalThis);
