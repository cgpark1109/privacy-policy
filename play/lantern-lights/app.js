/* Lantern Lights (browser game): turn the tiles so the light from the flame reaches every lantern.
   A new game made for this site. Source: _src/lantern/app.js, copied to play/lantern-lights/ by build.py.
   The page is an ordinary site page (/play/lantern-lights/, /ko/play/lantern-lights/); this script fills #ln-app.
   The board is plain HTML buttons, so it works with a keyboard and screen readers. */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var T = {
    en: {
      daily: "Today's puzzle", practice: 'Practice', size: '{n} × {n}', newp: 'New puzzle', restart: 'Start over',
      time: 'Time', moves: 'Moves', lit: 'Lanterns lit', streak: 'Streak: {n} days', streak1: 'Streak: 1 day', best: "Today's best: {t}",
      solved: 'All lanterns are lit!', solved_sub: '{t} · {m} moves', share: 'Copy result', copied: 'Copied!',
      share_text: 'Lantern Lights {d}: {t}, {m} moves', come_back: 'A new puzzle arrives at midnight.',
      cell: 'Row {r}, column {c}: {kind}{lit}', lit_on: ', lit', kinds: { source: 'flame', lantern: 'lantern', end: 'end', straight: 'straight path', corner: 'corner', tee: 'three-way path', cross: 'crossing' },
      help: 'Click or tap a tile to turn it. Arrow keys move, Enter or Space turns, Shift turns back.',
    },
    ko: {
      daily: '오늘의 퍼즐', practice: '연습', size: '{n} × {n}', newp: '새 퍼즐', restart: '처음부터',
      time: '시간', moves: '회전', lit: '켜진 랜턴', streak: '연속 {n}일', best: '오늘 최고 기록: {t}',
      solved: '모든 랜턴에 불이 켜졌어요!', solved_sub: '{t} · {m}번 회전', share: '결과 복사하기', copied: '복사했어요!',
      share_text: '랜턴 잇기 {d}: {t}, {m}번 회전', come_back: '새 퍼즐은 자정에 나와요.',
      cell: '{r}행 {c}열: {kind}{lit}', lit_on: ', 켜짐', kinds: { source: '불씨', lantern: '랜턴', end: '끝', straight: '직선 길', corner: '꺾인 길', tee: '세 갈래 길', cross: '네 갈래 길' },
      help: '칸을 누르면 돌아가요. 방향키로 이동, Enter나 스페이스로 회전, Shift를 누르고 돌리면 반대로 돌아요.',
    },
  }[LANG];
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  /* ---------- storage ---------- */
  var KEY = 'kys_lantern';
  var P = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  P.days = P.days || {};  // date -> best seconds
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* private mode */ } }
  function today(off) {
    var d = new Date(); if (off) d.setDate(d.getDate() + off);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  // days in a row with today's puzzle solved (counting from yesterday if today isn't solved yet)
  function streak() { var off = P.days[today()] != null ? 0 : -1, n = 0; while (P.days[today(off - n)] != null) n++; return n; }

  /* ---------- puzzle ---------- */
  var N = 1, E = 2, S = 4, Wd = 8, DIRS = [[N, -1, 0, S], [E, 0, 1, Wd], [S, 1, 0, N], [Wd, 0, -1, E]];
  function rot(m, k) { k = ((k % 4) + 4) % 4; while (k--) m = ((m << 1) | (m >> 3)) & 15; return m; }
  function bits(m) { return (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1); }
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () { h = (h + 0x6D2B79F5) | 0; var x = Math.imul(h ^ h >>> 15, 1 | h); x = (x + Math.imul(x ^ x >>> 7, 61 | x)) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
  }
  // A random spanning tree grown from the centre, so every tile is part of one path network with no loops.
  function generate(n, rnd) {
    var base = [], i, sr = Math.floor(n / 2), sc = Math.floor(n / 2);
    for (i = 0; i < n * n; i++) base.push(0);
    var inTree = base.map(function () { return false; }), front = [];
    function add(r, c) { inTree[r * n + c] = true; DIRS.forEach(function (d) { var rr = r + d[1], cc = c + d[2]; if (rr >= 0 && rr < n && cc >= 0 && cc < n && !inTree[rr * n + cc]) front.push([r, c, d]); }); }
    add(sr, sc);
    while (front.length) {
      // mostly extend from a recent cell (long winding paths), sometimes from anywhere (branches)
      var k = rnd() < 0.6 ? front.length - 1 - Math.floor(rnd() * Math.min(3, front.length)) : Math.floor(rnd() * front.length);
      var f = front.splice(k, 1)[0], r = f[0], c = f[1], d = f[2], r2 = r + d[1], c2 = c + d[2];
      if (inTree[r2 * n + c2]) continue;
      // keep crossings rare: a cell that already has three paths usually waits until nothing else can grow
      var busy = bits(base[r * n + c]) >= 3;
      if (busy && rnd() < 0.8 && front.some(function (x) { return bits(base[x[0] * n + x[1]]) < 3 && !inTree[(x[0] + x[2][1]) * n + x[1] + x[2][2]]; })) { front.unshift(f); continue; }
      base[r * n + c] |= d[0]; base[r2 * n + c2] |= d[3];
      add(r2, c2);
    }
    var turns = base.map(function () { return Math.floor(rnd() * 4); });
    var puzzle = { n: n, base: base, turn: turns, deg: turns.map(function (t) { return t * 90; }), src: sr * n + sc, moves: 0 };
    if (solved(puzzle)) puzzle.turn[0] = (puzzle.turn[0] + 1) % 4;
    return puzzle;
  }
  function mask(p, i) { return rot(p.base[i], p.turn[i]); }
  function litSet(p) {
    var n = p.n, seen = {}, stack = [p.src]; seen[p.src] = true;
    while (stack.length) {
      var i = stack.pop(), r = Math.floor(i / n), c = i % n, m = mask(p, i);
      DIRS.forEach(function (d) {
        if (!(m & d[0])) return;
        var r2 = r + d[1], c2 = c + d[2], j = r2 * n + c2;
        if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= n || seen[j]) return;
        if (mask(p, j) & d[3]) { seen[j] = true; stack.push(j); }
      });
    }
    return seen;
  }
  function solved(p) {
    var n = p.n, lit = litSet(p);
    if (Object.keys(lit).length !== n * n) return false;
    for (var i = 0; i < n * n; i++) {
      var r = Math.floor(i / n), c = i % n, m = mask(p, i);
      for (var k = 0; k < 4; k++) {
        var d = DIRS[k]; if (!(m & d[0])) continue;
        var r2 = r + d[1], c2 = c + d[2];
        if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= n || !(mask(p, r2 * n + c2) & d[3])) return false;
      }
    }
    return true;
  }
  function kindOf(p, i) {
    if (i === p.src) return 'source';
    var m = p.base[i], b = bits(m);
    if (b === 1) return 'lantern';
    if (b === 4) return 'cross';
    if (b === 3) return 'tee';
    return (m === 5 || m === 10) ? 'straight' : 'corner';
  }

  /* ---------- state and page ---------- */
  var mode = 'daily', size = 6, game = null, start = 0, timer = null, done = false, focusIdx = 0;
  var app = document.getElementById('ln-app');
  function say(t) { var l = document.getElementById('live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); } }
  function clock(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

  function newGame(keepTurns) {
    var rnd = mode === 'daily' ? seeded('lantern-' + today()) : seeded('p-' + Date.now() + '-' + Math.random());
    game = generate(mode === 'daily' ? 6 : size, rnd);
    start = 0; done = false; clearInterval(timer); timer = null;
    render();
  }
  function lanterns() { var t = 0; for (var i = 0; i < game.n * game.n; i++) if (kindOf(game, i) === 'lantern') t++; return t; }

  function tileSVG(p, i) {
    var m = p.base[i], k = kindOf(p, i), arms = '';
    if (m & N) arms += '<line x1="50" y1="50" x2="50" y2="-2"/>';
    if (m & E) arms += '<line x1="50" y1="50" x2="102" y2="50"/>';
    if (m & S) arms += '<line x1="50" y1="50" x2="50" y2="102"/>';
    if (m & Wd) arms += '<line x1="50" y1="50" x2="-2" y2="50"/>';
    var center = k === 'source'
      ? '<circle class="sun" cx="50" cy="50" r="20"/><path class="flame" d="M50 34c7 9 10 14 10 19a10 10 0 0 1-20 0c0-5 3-10 10-19z"/>'
      : k === 'lantern'
        ? '<rect class="lamp" x="34" y="32" width="32" height="38" rx="12"/><rect class="cap" x="40" y="26" width="20" height="7" rx="3"/><rect class="cap" x="40" y="69" width="20" height="6" rx="3"/>'
        : '<circle class="node" cx="50" cy="50" r="8"/>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><g class="arms" style="transform:rotate(' + p.deg[i] + 'deg)">' + arms + '</g>' + center + '</svg>';
  }

  function streakText() { var n = streak(); return fmt(n === 1 && T.streak1 ? T.streak1 : T.streak, { n: n }); }
  function statsHTML() {
    if (mode !== 'daily') return '';
    return '<span>' + streakText() + '</span>' + (P.days[today()] != null ? '<span>' + fmt(T.best, { t: clock(P.days[today()]) }) + '</span>' : '');
  }
  function render() {
    var stats = '<span id="ln-stats">' + statsHTML() + '</span>';
    var sizes = mode === 'practice' ? '<div class="ln-sizes" role="group">' + [5, 6, 7].map(function (n) {
      return '<button class="ln-chip" data-size="' + n + '" aria-pressed="' + (size === n) + '">' + fmt(T.size, { n: n }) + '</button>'; }).join('') +
      '<button class="ln-chip" data-act="new">' + T.newp + '</button></div>' : '';
    var cells = '';
    for (var i = 0; i < game.n * game.n; i++) cells += '<button class="ln-cell" data-i="' + i + '" tabindex="' + (i === focusIdx ? 0 : -1) + '">' + tileSVG(game, i) + '</button>';
    app.innerHTML =
      '<div class="ln-tabs" role="tablist"><button role="tab" class="ln-tab" data-mode="daily" aria-selected="' + (mode === 'daily') + '">' + T.daily + ' · ' + today() + '</button>' +
      '<button role="tab" class="ln-tab" data-mode="practice" aria-selected="' + (mode === 'practice') + '">' + T.practice + '</button></div>' +
      sizes +
      '<div class="ln-bar"><span>' + T.time + ' <b id="ln-time">0:00</b></span><span>' + T.moves + ' <b id="ln-moves">0</b></span><span>' + T.lit + ' <b id="ln-lit"></b></span></div>' +
      '<div class="ln-board-wrap"><div class="ln-board" id="ln-board" role="grid" style="--n:' + game.n + '">' + cells + '</div>' +
      '<div class="ln-win" id="ln-win" hidden></div></div>' +
      '<div class="ln-foot">' + stats + '<button class="ln-chip" data-act="restart">' + T.restart + '</button></div>' +
      '<p class="ln-help">' + T.help + '</p>';
    update();
  }
  function update() {
    var lit = litSet(game), n = game.n, on = 0, total = 0;
    var cells = app.querySelectorAll('.ln-cell');
    for (var i = 0; i < cells.length; i++) {
      var isLit = !!lit[i], k = kindOf(game, i);
      cells[i].classList.toggle('lit', isLit);
      if (k === 'lantern') { total++; if (isLit) on++; }
      cells[i].setAttribute('aria-label', fmt(T.cell, { r: Math.floor(i / n) + 1, c: i % n + 1, kind: T.kinds[k], lit: isLit ? T.lit_on : '' }));
    }
    document.getElementById('ln-lit').textContent = on + ' / ' + total;
    document.getElementById('ln-moves').textContent = game.moves;
  }
  function turn(i, back) {
    if (done) return;
    if (i === game.src && bits(game.base[i]) === 4) return;
    game.turn[i] = (game.turn[i] + (back ? 3 : 1)) % 4;
    game.deg[i] += back ? -90 : 90;  // keeps counting, so the tile always turns the short way
    game.moves++;
    if (!start) { start = Date.now(); timer = setInterval(tickClock, 250); }
    var cell = app.querySelector('[data-i="' + i + '"]');
    cell.querySelector('.arms').style.transform = 'rotate(' + game.deg[i] + 'deg)';
    update();
    if (solved(game)) win();
  }
  function tickClock() { if (start && !done) document.getElementById('ln-time').textContent = clock((Date.now() - start) / 1000); }
  function win() {
    done = true; clearInterval(timer);
    var secs = Math.max(1, (Date.now() - start) / 1000), t = clock(secs);
    document.getElementById('ln-time').textContent = t;
    if (mode === 'daily') { var prev = P.days[today()]; if (prev == null || secs < prev) P.days[today()] = Math.round(secs); var keys = Object.keys(P.days).sort(); while (keys.length > 60) delete P.days[keys.shift()]; save(); document.getElementById('ln-stats').innerHTML = statsHTML(); }
    var w = document.getElementById('ln-win');
    w.hidden = false;
    w.innerHTML = '<b>' + T.solved + '</b><span>' + fmt(T.solved_sub, { t: t, m: game.moves }) + '</span>' +
      (mode === 'daily' ? '<span>' + streakText() + ' · ' + T.come_back + '</span>' + (navigator.clipboard ? '<button class="btn" data-act="share">' + T.share + '</button>' : '') :
        '<button class="btn" data-act="new">' + T.newp + '</button>');
    app.querySelector('.ln-board').classList.add('won');
    say(T.solved + ' ' + fmt(T.solved_sub, { t: t, m: game.moves }));
    var b = w.querySelector('button'); if (b) b.focus();
  }

  /* ---------- input ---------- */
  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-i],[data-mode],[data-size],[data-act]');
    if (!el) return;
    if (el.hasAttribute('data-i')) { focusIdx = +el.getAttribute('data-i'); return turn(focusIdx, e.shiftKey); }
    if (el.hasAttribute('data-mode')) { mode = el.getAttribute('data-mode'); focusIdx = 0; return newGame(); }
    if (el.hasAttribute('data-size')) { size = +el.getAttribute('data-size'); focusIdx = 0; return newGame(); }
    var a = el.getAttribute('data-act');
    if (a === 'new') newGame();
    else if (a === 'restart') { if (mode === 'daily') newGame(); else { game.turn = game.turn.map(function () { return Math.floor(Math.random() * 4); }); game.deg = game.turn.map(function (t) { return t * 90; }); game.moves = 0; start = 0; done = false; clearInterval(timer); render(); } }
    else if (a === 'share') {
      var t = document.getElementById('ln-time').textContent;
      navigator.clipboard.writeText(fmt(T.share_text, { d: today(), t: t, m: game.moves }) + ' 🏮\n' + location.origin + location.pathname)
        .then(function () { el.textContent = T.copied; say(T.copied); }, function () {});
    }
  });
  app.addEventListener('contextmenu', function (e) { var el = e.target.closest('[data-i]'); if (el) { e.preventDefault(); turn(+el.getAttribute('data-i'), true); } });
  app.addEventListener('keydown', function (e) {
    var el = e.target.closest && e.target.closest('[data-i]');
    if (!el) return;
    var n = game.n, i = +el.getAttribute('data-i'), r = Math.floor(i / n), c = i % n, j = i;
    if (e.key === 'ArrowUp') j = Math.max(0, r - 1) * n + c;
    else if (e.key === 'ArrowDown') j = Math.min(n - 1, r + 1) * n + c;
    else if (e.key === 'ArrowLeft') j = r * n + Math.max(0, c - 1);
    else if (e.key === 'ArrowRight') j = r * n + Math.min(n - 1, c + 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(i, e.shiftKey); return; }
    else return;
    e.preventDefault();
    el.tabIndex = -1; focusIdx = j;
    var nx = app.querySelector('[data-i="' + j + '"]'); nx.tabIndex = 0; nx.focus();
  });

  newGame();
  window.__lantern = { game: function () { return game; }, solved: function () { return solved(game); }, generate: generate, seeded: seeded, turn: turn, rot: rot, litSet: litSet };
})();
