/* Pass or Splash (browser version): a wall full of holes rushes toward you. Read the puzzle and slide your buddy
   in front of the right answer before it arrives. Wrong hole? Splash!
   A browser take on our Android game. Source: _src/pass-or-splash/app.js, copied to play/pass-or-splash/ by build.py.
   The page is an ordinary site page (/play/pass-or-splash/, /ko/play/pass-or-splash/); this script fills #ps-app. */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var T = {
    en: {
      worlds: ['Pool', 'Mud', 'Cream', 'Ball pit', 'Springs'],
      stage: 'Stage {n}', wall: 'Wall {i}/{n}', start: 'Play stage {n}', next: 'Next stage', retry: 'Try again', map: 'Stages',
      locked: 'Locked', pass: 'PASS!', splash: ['SPLASH!', 'SPLAT!', 'SPLODGE!', 'BOING… PLOP!', 'BOING!'],
      clear: 'Stage clear!', fail: 'Stage failed', mistakes: '{n} wrong', perfect: 'No mistakes!',
      q_add: '{a} + {b} = ?', q_sub: '{a} − {b} = ?', q_mul: '{a} × {b} = ?', q_ops: '{a} + {b} × {c} = ?',
      q_big: 'Which is biggest?', q_small: 'Which is smallest?', q_count: 'How many dots?', q_shape: 'Find the same shape', q_cup: 'Follow the star!',
      hint: 'Drag, tap a hole, or use ← → keys.', hearts: '{n} tries left', stars: '{n} of 3 stars',
      total: '{a} / {b} stars', sound: 'Sound', on: 'On', off: 'Off',
      canvas: 'Pass or Splash: a wall with holes is coming. Move to the hole with the right answer.',
    },
    ko: {
      worlds: ['수영장', '진흙탕', '크림', '볼풀', '스프링'],
      stage: '스테이지 {n}', wall: '벽 {i}/{n}', start: '스테이지 {n} 시작', next: '다음 스테이지', retry: '다시 하기', map: '스테이지 목록',
      locked: '잠김', pass: '통과!', splash: ['풍덩!', '철퍼덕!', '푸슉!', '보잉… 퐁!', '띠용!'],
      clear: '스테이지 클리어!', fail: '스테이지 실패', mistakes: '{n}번 틀림', perfect: '실수 없이 통과!',
      q_add: '{a} + {b} = ?', q_sub: '{a} − {b} = ?', q_mul: '{a} × {b} = ?', q_ops: '{a} + {b} × {c} = ?',
      q_big: '가장 큰 수는?', q_small: '가장 작은 수는?', q_count: '점은 몇 개?', q_shape: '같은 도형을 찾으세요', q_cup: '별을 따라가세요!',
      hint: '드래그하거나 구멍을 누르거나 ← → 키를 쓰세요.', hearts: '남은 기회 {n}번', stars: '별 3개 중 {n}개',
      total: '별 {a} / {b}', sound: '소리', on: '켜짐', off: '꺼짐',
      canvas: 'Pass or Splash: 구멍 뚫린 벽이 다가와요. 정답 구멍 앞으로 이동하세요.',
    },
  }[LANG];
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  /* ---------- progress ---------- */
  var KEY = 'kys_passsplash';
  var P = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  P.stars = P.stars || {}; if (P.sound == null) P.sound = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* private mode */ } }
  var WORLDS = 5, PER = 6, STAGES = WORLDS * PER, WALLS = 6, TRIES = 3;
  function unlocked(i) { return i === 0 || (P.stars[i - 1] || 0) > 0; }

  /* ---------- puzzles ---------- */
  function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = ri(0, i), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // numeric choices: the answer plus nearby wrong numbers, all different and not negative
  function numChoices(ans, n, spread) {
    var set = [ans];
    while (set.length < n) {
      var c = ans + (Math.random() < 0.5 ? -1 : 1) * ri(1, spread);
      if (c >= 0 && set.indexOf(c) < 0) set.push(c);
    }
    return shuffle(set);
  }
  var SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
  var KINDS = [ // puzzle kinds per world
    ['add', 'count', 'sub'],
    ['add', 'sub', 'big', 'small', 'count'],
    ['mul', 'shape', 'big', 'small', 'add'],
    ['ops', 'mul', 'shape', 'sub', 'count'],
    ['cup', 'ops', 'shape', 'mul', 'cup'],
  ];
  function makePuzzle(stage) {
    var w = Math.floor(stage / PER), lvl = stage % PER, n = w < 2 ? 3 : 4;
    var kind = KINDS[w][ri(0, KINDS[w].length - 1)], p = { kind: kind, n: n };
    var big = 10 + w * 10 + lvl * 3;
    if (kind === 'add') { var a = ri(1, big), b = ri(1, big); p.q = fmt(T.q_add, { a: a, b: b }); p.ans = a + b; p.opts = numChoices(a + b, n, 3); }
    else if (kind === 'sub') { var a2 = ri(3, big + 5), b2 = ri(1, a2); p.q = fmt(T.q_sub, { a: a2, b: b2 }); p.ans = a2 - b2; p.opts = numChoices(a2 - b2, n, 3); }
    else if (kind === 'mul') { var a3 = ri(2, 5 + lvl), b3 = ri(2, 9); p.q = fmt(T.q_mul, { a: a3, b: b3 }); p.ans = a3 * b3; p.opts = numChoices(a3 * b3, n, Math.max(3, a3)); }
    else if (kind === 'ops') { // multiplication first; (a + b) × c is the classic wrong answer, so it's always offered
      var a4 = ri(1, 9), b4 = ri(2, 6), c4 = ri(2, 6); p.q = fmt(T.q_ops, { a: a4, b: b4, c: c4 }); p.ans = a4 + b4 * c4;
      var set4 = [p.ans], wrong4 = (a4 + b4) * c4; if (wrong4 !== p.ans) set4.push(wrong4);
      while (set4.length < n) { var x4 = p.ans + (Math.random() < 0.5 ? -1 : 1) * ri(1, 6); if (x4 >= 0 && set4.indexOf(x4) < 0) set4.push(x4); }
      p.opts = shuffle(set4);
    }
    else if (kind === 'big' || kind === 'small') {
      var maxN = w < 2 ? 50 : 999, set = [];
      while (set.length < n) { var v = ri(w < 2 ? 1 : 100, maxN); if (set.indexOf(v) < 0) set.push(v); }
      p.q = kind === 'big' ? T.q_big : T.q_small; p.opts = set;
      p.ans = kind === 'big' ? Math.max.apply(null, set) : Math.min.apply(null, set);
    }
    else if (kind === 'count') { var c = ri(3, 8 + w * 2); p.q = T.q_count; p.dots = c; p.ans = c; p.opts = numChoices(c, n, 2); }
    else if (kind === 'shape') {
      var sh = shuffle(SHAPES.slice()).slice(0, n), pick = sh[ri(0, n - 1)];
      p.q = T.q_shape; p.shape = pick; p.ans = pick; p.opts = sh; p.shapes = true;
    }
    else if (kind === 'cup') { // a star under one cup; the cups swap places while the wall comes
      p.q = T.q_cup; p.cups = true; p.n = 3 + (lvl > 2 ? 1 : 0);
      p.order = []; for (var k = 0; k < p.n; k++) p.order.push(k);  // order[slot] = cup id
      p.star = ri(0, p.n - 1); p.swaps = [];
      var sw = 3 + lvl; for (var s = 0; s < sw; s++) { var i1 = ri(0, p.n - 1), i2 = (i1 + ri(1, p.n - 1)) % p.n; p.swaps.push([i1, i2]); }
      p.opts = []; for (var o = 0; o < p.n; o++) p.opts.push(o);
    }
    p.correct = p.cups ? null : p.opts.indexOf(p.ans);
    return p;
  }
  function wallTime(stage) { var w = Math.floor(stage / PER), lvl = stage % PER; return Math.max(4.2, 8 - w * 0.7 - lvl * 0.15); }

  /* ---------- page ---------- */
  var app = document.getElementById('ps-app');
  var screen = 'map', S = null, canvas, ctx, W = 0, H = 0;
  function say(t) { var l = document.getElementById('live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); } }
  function star(on) { return '<i class="' + (on ? 'on' : '') + '">★</i>'; }
  function totalStars() { var t = 0; for (var k in P.stars) t += P.stars[k]; return t; }

  function renderMap() {
    screen = 'map';
    var next = 0; for (var i = 0; i < STAGES; i++) if (unlocked(i) && (P.stars[i] || 0) < 3) { next = i; break; }
    var html = '<div class="card ps-map"><div class="ps-map-head"><h2 id="ps-title" tabindex="-1">' + T.map + '</h2><span>' + fmt(T.total, { a: totalStars(), b: STAGES * 3 }) + '</span></div>';
    for (var w = 0; w < WORLDS; w++) {
      html += '<h3 class="ps-world w' + w + '">' + (w + 1) + '. ' + T.worlds[w] + '</h3><div class="ps-stages">';
      for (var s = 0; s < PER; s++) {
        var idx = w * PER + s, st = P.stars[idx] || 0, open = unlocked(idx);
        html += '<button class="ps-stage w' + w + (idx === next ? ' current' : '') + '" data-stage="' + idx + '"' + (open ? '' : ' disabled') +
          ' aria-label="' + fmt(T.stage, { n: idx + 1 }) + (open ? ', ' + fmt(T.stars, { n: st }) : ', ' + T.locked) + '">' +
          '<b>' + (idx + 1) + '</b><span class="ps-st">' + (open ? star(st > 0) + star(st > 1) + star(st > 2) : '🔒') + '</span></button>';
      }
      html += '</div>';
    }
    html += '<button class="btn ps-go" data-stage="' + next + '">' + fmt(T.start, { n: next + 1 }) + '</button>' +
      '<button class="ps-sound" id="ps-sound">' + T.sound + ': ' + (P.sound ? T.on : T.off) + '</button></div>';
    app.innerHTML = html;
    var stat = document.getElementById('ps-static'); if (stat) stat.hidden = false;
  }

  function startStage(i) {
    screen = 'play';
    S = { stage: i, wall: 0, tries: TRIES, wrong: 0, t: 0, x: 0.5, phase: 'come', fx: null };
    S.p = makePuzzle(i);
    app.innerHTML = '<div class="ps-top"><button class="ps-back" data-act="map">← ' + T.map + '</button><span id="ps-where"></span><span id="ps-hearts"></span></div>' +
      '<div class="card ps-stage-box"><canvas id="ps-canvas" role="img" aria-label="' + T.canvas + '"></canvas></div><p class="ps-hint">' + T.hint + '</p>';
    var stat = document.getElementById('ps-static'); if (stat) stat.hidden = true;
    canvas = document.getElementById('ps-canvas'); ctx = canvas.getContext('2d');
    resize(); bindCanvas(); top(); announce();
    if (app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start' });
  }
  function top() {
    document.getElementById('ps-where').textContent = T.worlds[Math.floor(S.stage / PER)] + ' · ' + fmt(T.stage, { n: S.stage + 1 }) + ' · ' + fmt(T.wall, { i: S.wall + 1, n: WALLS });
    var h = ''; for (var k = 0; k < TRIES; k++) h += k < S.tries ? '❤' : '♡';
    var el = document.getElementById('ps-hearts'); el.textContent = h; el.setAttribute('aria-label', fmt(T.hearts, { n: S.tries }));
  }
  function announce() {
    var p = S.p, opts = p.cups ? '' : ': ' + p.opts.map(function (o) { return p.shapes ? o : String(o); }).join(', ');
    say(p.q + (p.dots ? ' (' + p.dots + ')' : '') + opts);
  }
  function lanes() { return S.p.n; }
  function laneOf(x) { return Math.max(0, Math.min(lanes() - 1, Math.floor(x * lanes()))); }
  function laneX(i) { return (i + 0.5) / lanes(); }

  function renderResult() {
    screen = 'result';
    var ok = S.tries > 0, st = ok ? (S.wrong === 0 ? 3 : S.wrong === 1 ? 2 : 1) : 0;
    if (st > (P.stars[S.stage] || 0)) { P.stars[S.stage] = st; save(); }
    var hasNext = ok && S.stage + 1 < STAGES;
    app.innerHTML = '<div class="card ps-result"><h2 id="ps-title" tabindex="-1">' + (ok ? T.clear : T.fail) + '</h2>' +
      '<p class="ps-stars">' + star(st > 0) + star(st > 1) + star(st > 2) + '</p>' +
      '<p>' + (ok ? (S.wrong ? fmt(T.mistakes, { n: S.wrong }) : T.perfect) : fmt(T.mistakes, { n: S.wrong })) + '</p>' +
      '<div class="ps-actions"><button class="btn ghost" data-stage="' + S.stage + '">' + T.retry + '</button>' +
      (hasNext ? '<button class="btn" data-stage="' + (S.stage + 1) + '">' + T.next + '</button>' : '<button class="btn" data-act="map">' + T.map + '</button>') + '</div></div>';
    document.getElementById('ps-title').focus();
    say((ok ? T.clear : T.fail) + '. ' + fmt(T.stars, { n: st }));
  }

  /* ---------- game loop ---------- */
  function arrive() {
    var p = S.p, lane = laneOf(S.x), ok;
    if (p.cups) { var slot = p.order.indexOf(p.star); ok = lane === slot; p.correct = slot; }
    else ok = lane === p.correct;
    S.phase = ok ? 'pass' : 'splash'; S.t = 0;
    S.fx = { ok: ok, drops: [] };
    if (!ok) {
      S.tries--; S.wrong++;
      for (var d = 0; d < 26; d++) S.fx.drops.push({ x: S.x, y: 0.85, vx: (Math.random() - 0.5) * 0.9, vy: -Math.random() * 1.6 - 0.4, c: d });
      tone([300, 180], 0.12);
      say(T.splash[Math.floor(S.stage / PER)]);
    } else { tone([660, 880], 0.08); say(T.pass); }
    top();
  }
  function afterFx() {
    if (S.tries <= 0) return renderResult();
    S.wall++;
    if (S.wall >= WALLS) return renderResult();
    S.p = makePuzzle(S.stage); S.phase = 'come'; S.t = 0; S.fx = null;
    top(); announce();
  }
  var last = 0;
  function tick(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (screen === 'play' && S) {
      S.t += dt;
      var dur = wallTime(S.stage);
      if (S.phase === 'come') {
        var p = S.p;
        if (p.cups) { // show the star for the first 22% of the time, then swap cups
          var k = Math.floor(Math.max(0, S.t / dur - 0.25) / 0.6 * p.swaps.length);
          while ((p.done || 0) < Math.min(k, p.swaps.length)) { var sw = p.swaps[p.done || 0], tmp = p.order[sw[0]]; p.order[sw[0]] = p.order[sw[1]]; p.order[sw[1]] = tmp; p.done = (p.done || 0) + 1; }
        }
        if (S.t >= dur) arrive();
      } else if (S.t > 1.2) afterFx();
      if (S.fx) S.fx.drops.forEach(function (d) { d.x += d.vx * dt * 0.5; d.y += d.vy * dt * 0.5; d.vy += 2.4 * dt; });
      draw(dur);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- drawing ---------- */
  var THEMES = [ // sky, floor, wall, wall edge, splash colour
    ['#BFE6FF', '#7FD0F2', '#FFB86B', '#E58E3C', '#3DA5E0'],
    ['#E9DCC9', '#A27B5C', '#9AD0A3', '#6DA97A', '#7A5536'],
    ['#FFE3EC', '#FFFFFF', '#B9A2E3', '#9179C9', '#FFF7F0'],
    ['#E3F1FF', '#FFE08A', '#FF8FA3', '#E06A80', 'multi'],
    ['#E6F7E9', '#C8E6C9', '#7FB8E6', '#4F8DC4', '#FF6B5B'],
  ];
  function resize() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(300, r.width); H = Math.max(300, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function shapePath(name, cx, cy, r) {
    ctx.beginPath();
    if (name === 'circle') ctx.arc(cx, cy, r, 0, 7);
    else if (name === 'square') ctx.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
    else if (name === 'triangle') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy + r * 0.8); ctx.lineTo(cx - r, cy + r * 0.8); ctx.closePath(); }
    else if (name === 'diamond') { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.75, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.75, cy); ctx.closePath(); }
    else if (name === 'star') { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); }
    else if (name === 'heart') { ctx.moveTo(cx, cy + r * 0.8); ctx.bezierCurveTo(cx - r * 1.4, cy - r * 0.2, cx - r * 0.5, cy - r * 1.2, cx, cy - r * 0.4); ctx.bezierCurveTo(cx + r * 0.5, cy - r * 1.2, cx + r * 1.4, cy - r * 0.2, cx, cy + r * 0.8); }
  }
  function draw(dur) {
    var w = Math.floor(S.stage / PER), th = THEMES[w], p = S.p;
    ctx.fillStyle = th[0]; ctx.fillRect(0, 0, W, H);
    var floorY = H * 0.62;
    ctx.fillStyle = th[1]; ctx.fillRect(0, floorY, W, H - floorY);
    if (w === 0) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; for (var lx = 0; lx < W; lx += 40) { ctx.beginPath(); ctx.moveTo(lx, floorY + 10); ctx.quadraticCurveTo(lx + 10, floorY + 4, lx + 20, floorY + 10); ctx.stroke(); } }
    // the wall, growing as it comes
    var prog = S.phase === 'come' ? Math.min(1, S.t / dur) : 1;
    var sc = p.cups ? 0.62 + 0.38 * prog * prog : 0.3 + 0.7 * prog * prog;  // cups need to be big enough to follow
    var top0 = p.dots || p.shapes ? 118 : 76;  // the wall never covers the puzzle
    var ww = W * 0.94 * sc, wh = (floorY + H * 0.06 - top0) * sc, wx = (W - ww) / 2, wy = floorY - wh + H * 0.06 * sc;
    ctx.fillStyle = th[2]; roundRect(wx, wy, ww, wh, 12 * sc); ctx.fill();
    ctx.strokeStyle = th[3]; ctx.lineWidth = Math.max(2, 6 * sc); ctx.stroke();
    var n = p.n, hw = ww / n * 0.62, hh = wh * 0.62;
    for (var i = 0; i < n; i++) {
      var hx = wx + ww * (i + 0.5) / n - hw / 2, hy = wy + wh - hh - wh * 0.06;
      ctx.fillStyle = th[0]; ctx.beginPath(); ctx.moveTo(hx, hy + hh); ctx.lineTo(hx, hy + hw / 2); ctx.arc(hx + hw / 2, hy + hw / 2, hw / 2, Math.PI, 0); ctx.lineTo(hx + hw, hy + hh); ctx.closePath(); ctx.fill();
      var lcx = hx + hw / 2, lcy = hy + hh * 0.45;
      if (S.phase !== 'come' && i === (p.cups ? p.order.indexOf(p.star) : p.correct)) { ctx.strokeStyle = '#3BAA6A'; ctx.lineWidth = Math.max(3, 6 * sc); ctx.stroke(); }
      if (p.cups) { /* drawn after the holes, so they can slide between them */ }
      else if (p.shapes) {
        ctx.fillStyle = '#2B3155'; shapePath(p.opts[i], lcx, lcy, Math.min(hw, hh) * 0.28); ctx.fill();
      } else {
        ctx.fillStyle = '#2B3155'; ctx.font = '700 ' + Math.max(12, Math.min(hw * 0.38, 46)) + 'px Poppins, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(String(p.opts[i]), lcx, lcy + Math.min(hw * 0.14, 16));
      }
    }
    // cups: each swap slides two cups past each other (one over, one under) so you can follow them
    if (p.cups) {
      var span = 0.6 * dur / p.swaps.length, tt = S.t - 0.25 * dur, cur = p.done || 0, f = 0;
      if (S.phase === 'come' && tt > 0 && cur < p.swaps.length) f = Math.max(0, Math.min(1, (tt - cur * span) / span));
      var ease = f * f * (3 - 2 * f), cw = ww / n * 0.62 * 0.6, cy0 = wy + wh - hh - wh * 0.06 + hh * 0.45;
      var slotX = function (k) { return wx + ww * (k + 0.5) / n; };
      var showStar = (S.phase === 'come' && S.t / dur < 0.22) || S.phase !== 'come';
      for (var c = 0; c < n; c++) {
        var sl = p.order.indexOf(c), cx = slotX(sl), cyy = cy0;
        var sw = cur < p.swaps.length ? p.swaps[cur] : null;
        if (sw && f > 0 && (sl === sw[0] || sl === sw[1])) {
          var other = sl === sw[0] ? sw[1] : sw[0];
          cx = slotX(sl) + (slotX(other) - slotX(sl)) * ease;
          cyy = cy0 + Math.sin(Math.PI * f) * cw * 0.6 * (sl === sw[0] ? -1 : 1);
        }
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - cw / 2, cyy + cw * 0.5); ctx.lineTo(cx - cw * 0.35, cyy - cw * 0.5); ctx.lineTo(cx + cw * 0.35, cyy - cw * 0.5); ctx.lineTo(cx + cw / 2, cyy + cw * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (showStar && c === p.star) { ctx.fillStyle = '#F2B300'; shapePath('star', cx, cyy - cw * 0.85, cw * 0.32); ctx.fill(); }
      }
    }
    // the puzzle banner
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; roundRect(W / 2 - Math.min(W * 0.45, 230), 10, Math.min(W * 0.9, 460), 52, 16); ctx.fill();
    ctx.fillStyle = '#2B3155'; ctx.textAlign = 'center'; ctx.font = '700 ' + (W < 420 ? 20 : 24) + 'px Poppins, "Noto Sans KR", sans-serif';
    ctx.fillText(p.q, W / 2, 45);
    if (p.dots) { ctx.fillStyle = '#FF6B5B'; var cols = Math.min(p.dots, 6); for (var d = 0; d < p.dots; d++) { var dx = W / 2 + ((d % cols) - (cols - 1) / 2) * 18, dy = 76 + Math.floor(d / cols) * 18; ctx.beginPath(); ctx.arc(dx, dy, 6, 0, 7); ctx.fill(); } }
    if (p.shapes) { ctx.fillStyle = '#FF6B5B'; shapePath(p.shape, W / 2, 92, 16); ctx.fill(); }
    // the buddy
    var bx = S.x * W, by = H * 0.86, br = Math.min(30, W * 0.06);
    if (S.phase === 'splash') { by += Math.min(1, S.t * 1.5) * 20; }
    if (S.phase === 'pass') { by -= Math.sin(Math.min(1, S.t) * Math.PI) * 30; }
    ctx.fillStyle = 'rgba(43,49,85,0.18)'; ctx.beginPath(); ctx.ellipse(bx, H * 0.86 + br, br, br * 0.25, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFD166'; ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2B3155'; ctx.beginPath(); ctx.arc(bx - br * 0.32, by - br * 0.1, br * 0.12, 0, 7); ctx.arc(bx + br * 0.32, by - br * 0.1, br * 0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(bx, by + br * 0.2, br * 0.3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    // lane markers on the floor
    for (var m = 0; m < n; m++) { ctx.fillStyle = laneOf(S.x) === m ? 'rgba(255,107,91,0.55)' : 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(laneX(m) * W, H * 0.96, W / n * 0.3, 6, 0, 0, 7); ctx.fill(); }
    // effects
    if (S.fx) {
      if (!S.fx.ok) {
        S.fx.drops.forEach(function (dd) {
          ctx.fillStyle = th[4] === 'multi' ? ['#FF6B5B', '#F2B300', '#3DA5E0', '#3BAA6A', '#B9A2E3'][dd.c % 5] : th[4];
          ctx.beginPath(); ctx.arc(dd.x * W, dd.y * H, 7, 0, 7); ctx.fill();
        });
        if (w === 2) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(bx, by - br * 0.2, br * 0.9, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = S.fx.ok ? '#1E7A45' : '#C8392B'; ctx.font = '800 ' + (W < 420 ? 30 : 40) + 'px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(S.fx.ok ? T.pass : T.splash[w], W / 2, H * 0.4);
    }
    ctx.textAlign = 'left';
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------- sound ---------- */
  var audio = null;
  function tone(fs, len) {
    if (!P.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      fs.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + i * len;
        o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + len + 0.02);
      });
    } catch (e) { /* no audio */ }
  }

  /* ---------- input ---------- */
  function bindCanvas() {
    var dragging = false;
    function setX(e) { var r = canvas.getBoundingClientRect(); S.x = Math.max(0.02, Math.min(0.98, (e.clientX - r.left) / r.width)); }
    canvas.addEventListener('pointerdown', function (e) { if (S.phase !== 'come') return; dragging = true; canvas.setPointerCapture(e.pointerId); setX(e); var lane = laneOf(S.x); S.x = laneX(lane); });
    canvas.addEventListener('pointermove', function (e) { if (dragging && S.phase === 'come') setX(e); });
    canvas.addEventListener('pointerup', function () { dragging = false; if (S.phase === 'come') S.x = laneX(laneOf(S.x)); });
  }
  document.addEventListener('keydown', function (e) {
    if (screen !== 'play' || !S || S.phase !== 'come') return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      var lane = laneOf(S.x) + (e.key === 'ArrowLeft' ? -1 : 1);
      S.x = laneX(Math.max(0, Math.min(lanes() - 1, lane)));
    } else if (/^[1-4]$/.test(e.key) && +e.key <= lanes()) { S.x = laneX(+e.key - 1); }
  });
  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-stage],[data-act],#ps-sound');
    if (!el || el.disabled) return;
    if (el.id === 'ps-sound') { P.sound = !P.sound; save(); el.textContent = T.sound + ': ' + (P.sound ? T.on : T.off); return; }
    if (el.hasAttribute('data-stage')) return startStage(+el.getAttribute('data-stage'));
    if (el.getAttribute('data-act') === 'map') { renderMap(); document.getElementById('ps-title').focus(); }
  });
  window.addEventListener('resize', resize);

  renderMap();
  requestAnimationFrame(tick);
  window.__passsplash = { makePuzzle: makePuzzle, state: function () { return S; }, screen: function () { return screen; }, arrive: arrive };
})();
