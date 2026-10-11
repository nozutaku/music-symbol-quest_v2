(function (root) {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('ja-JP');
  const nameOf = (number) => `${number}番`;

  // 同順位は同じカードにまとめる(1〜3位のみ)
  function podiumGroups(ranked) {
    const groups = [];
    ranked.forEach((row) => {
      if (row.rank > 3) return;
      let g = groups.find((x) => x.rank === row.rank);
      if (!g) { g = { rank: row.rank, rows: [] }; groups.push(g); }
      g.rows.push(row);
    });
    return groups;
  }

  function renderMeCard(ranked, myNumber) {
    const card = $('rs-me');
    const me = myNumber && ranked.find((r) => r.number === myNumber);
    card.textContent = '';
    if (!me) { card.hidden = true; return; }
    [
      [`あなた（${nameOf(me.number)}）`, 'who'],
      [`${ranked.length}人中 ${me.rank}位`, 'place'],
      [`${fmt(me.score)} 点（${me.correct}問正解）`, 'pts'],
    ].forEach(([text, cls]) => {
      const p = document.createElement('p');
      p.className = cls;
      p.textContent = text;
      card.appendChild(p);
    });
    card.classList.toggle('top3', me.rank <= 3);
    card.hidden = false;
  }

  function renderTop10(ranked, myNumber) {
    const list = $('rs-list');
    list.textContent = '';
    const top = ranked.slice(0, 10);
    top.forEach((row) => {
      const isMe = myNumber && row.number === myNumber;
      const li = document.createElement('li');
      if (isMe) li.className = 'me';
      const rank = document.createElement('span');
      rank.className = 'r';
      rank.textContent = `${row.rank}位`;
      const who = document.createElement('span');
      who.className = 'n';
      who.textContent = nameOf(row.number) + (isMe ? '（あなた）' : '');
      const pts = document.createElement('span');
      pts.className = 'p';
      pts.textContent = `${fmt(row.score)}点`;
      li.append(rank, who, pts);
      list.appendChild(li);
    });
    const me = myNumber && ranked.find((r) => r.number === myNumber);
    const meRow = $('rs-me-row');
    const outside = me && !top.includes(me);
    meRow.hidden = !outside;
    if (outside) meRow.textContent = `${nameOf(me.number)}（あなた）: ${me.rank}位 ／ ${fmt(me.score)}点`;
    $('rs-top10').hidden = false;
  }

  // 太鼓 → 3位・2位・1位を順に発表(1位は紙吹雪とファンファーレ) → 上位10人の一覧。
  // myNumber が null なら先生用(「あなた」の表示なし)。戻り値は演出を中止する関数。
  function reveal({ ranked, myNumber, player, confetti, onDone }) {
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const drum = $('rs-drum');
    const podium = $('rs-podium');
    $('rs-me').hidden = true;
    $('rs-top10').hidden = true;
    podium.hidden = true;
    podium.textContent = '';
    drum.hidden = false;

    if (ranked.length === 0) {
      drum.textContent = '参加者がいませんでした。';
      if (onDone) onDone();
      return () => {};
    }
    drum.textContent = '結果発表…';
    player.play('drumroll');

    const STEP = 2600;
    let t = 1600;
    later(t - 100, () => { drum.hidden = true; podium.hidden = false; });
    podiumGroups(ranked).sort((a, b) => b.rank - a.rank).forEach((g) => { // 下位から発表
      later(t, () => {
        const card = document.createElement('div');
        card.className = `podium-card place-${g.rank}`;
        const head = document.createElement('div');
        head.className = 'medal';
        head.textContent = `${['', '🥇', '🥈', '🥉'][g.rank]} ${g.rank}位`;
        card.appendChild(head);
        g.rows.forEach((row) => {
          const line = document.createElement('div');
          line.className = 'who';
          line.textContent = `${nameOf(row.number)}  ${fmt(row.score)}点`;
          card.appendChild(line);
        });
        podium.prepend(card);
        if (g.rank === 1) {
          player.play('fanfare');
          confetti.burst(220);
          later(1200, () => confetti.burst(140));
        } else {
          player.play('reveal');
          if (g.rank === 2) confetti.burst(60);
        }
      });
      t += STEP;
    });
    later(t + 600, () => {
      renderMeCard(ranked, myNumber);
      renderTop10(ranked, myNumber);
      if (onDone) onDone();
    });
    return () => timers.forEach(clearTimeout);
  }

  root.MusicResults = { reveal, podiumGroups };
})(window);
