/* Hilltop Roll (browser version): a ball rolls down an endless floating road, seen from behind.
   The ball rolls and jumps on its own; you steer it (drag or arrow keys) through zigzag roads, tilted roads
   and forks, and land in the middle of the road for a PERFECT boost. A take on our Android game, not a copy of it.
   Source: _src/hilltop/app.js, copied to play/hilltop-roll/ by build.py. The page is an ordinary site page
   (/play/hilltop-roll/ and /ko/play/hilltop-roll/); this script draws the game on a canvas in #hr-app.
   World units are meters and seconds: s runs forward along the road, x is sideways, y is up. */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var T = {
    en: {
      start: 'Start', again: 'Roll again', rolling: 'Rolling…',
      tip: 'Drag sideways or use ← → to steer. Stay on the road!',
      distance: 'Distance', best: 'Best', combo: 'Combo',
      perfect: 'PERFECT', good: 'Nice', rough: 'Bumpy',
      over_gap: 'You fell into a gap', over_edge: 'You rolled off the road',
      new_best: 'New best!', perfects: '{n} perfect landings', max_combo: 'Best combo: {n}',
      canvas: 'Hilltop Roll game, seen from behind the ball. Drag sideways on the game or use the arrow keys to steer.',
      keys: 'Steer with ← → (or A and D), or drag sideways with the mouse. Space starts a run.',
      touch: 'Drag sideways on the game to steer.',
      sound: 'Sound', on: 'On', off: 'Off',
    },
    ko: {
      start: '시작하기', again: '다시 굴리기', rolling: '굴러가는 중…',
      tip: '옆으로 드래그하거나 ← →로 조종하세요. 길에서 떨어지지 마세요!',
      distance: '거리', best: '최고', combo: '콤보',
      perfect: 'PERFECT', good: '좋아요', rough: '덜컹',
      over_gap: '낭떠러지에 떨어졌어요', over_edge: '길 밖으로 굴러떨어졌어요',
      new_best: '최고 기록!', perfects: 'PERFECT 착지 {n}번', max_combo: '최고 콤보: {n}',
      canvas: 'Hilltop Roll 게임 화면. 공 뒤에서 보는 시점이에요. 게임 화면을 옆으로 드래그하거나 방향키로 조종해요.',
      keys: '← →(또는 A, D)나 마우스 드래그로 조종해요. 스페이스로 시작해요.',
      touch: '게임 화면을 옆으로 드래그하면 조종돼요.',
      sound: '소리', on: '켜짐', off: '꺼짐',
    },
  }[LANG];
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  var KEY = 'kys_hilltop';
  var store = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  var best = store.best || 0, soundOn = store.sound !== false;
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ best: best, sound: soundOn })); } catch (e) { /* private mode */ } }

  /* ---------- the road ---------- */
  // Segments along s. kind (the height profile): 'hill' (cosine ease), 'ramp' (steepest at its end: a launch lip),
  // 'land' (steepest at its start: a downhill landing), 'gap' (no road). Each segment also eases the road's
  // sideways position (X0 -> X1), width (w0 -> w1) and tilt (b0 -> b1, radians); 'fork' > 0 opens a hole of
  // that width in the middle, so the road splits into two lanes.
  var segs = [], rand = Math.random;
  function rr(a, b) { return a + (b - a) * rand(); }
  function addSeg(kind, len, y1, o) {
    var last = segs[segs.length - 1];
    o = o || {};
    segs.push({ kind: kind, s0: last.s1, s1: last.s1 + len, y0: last.y1, y1: y1,
      X0: last.X1, X1: o.X != null ? o.X : last.X1, w0: last.w1, w1: o.w || last.w1,
      b0: last.b1, b1: o.b || 0, fork: o.fork || 0 });
  }
  function resetTerrain(seed) {
    var st = seed;
    rand = function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
    segs = [{ kind: 'hill', s0: -60, s1: 0, y0: 30, y1: 30, X0: 0, X1: 0, w0: 8, w1: 8, b0: 0, b1: 0, fork: 0 }];
    addSeg('hill', 40, 18);
    addSeg('hill', 50, 4);
    while (segs[segs.length - 1].s1 < 600) more();
  }
  function more() {
    var last = segs[segs.length - 1], s = last.s1, y = last.y1, X = last.X1;
    var difficulty = Math.min(1.8, s / 1800);  // more gaps, narrower roads and sharper turns the farther you go
    var w = Math.max(5, 8 - 1.7 * difficulty);
    if (s > 250 && rand() < 0.15 + 0.12 * difficulty && last.kind !== 'gap' && !last.fork) {
      // a straight downhill run-up, a ramp, the gap, and a long downhill to land on
      var low = y - rr(10, 16), rampUp = rr(5, 8);
      addSeg('hill', rr(38, 52), low, { w: w + 1 });
      addSeg('ramp', rr(16, 22), low + rampUp);
      addSeg('gap', rr(10, 15) + 14 * difficulty, low + rampUp);
      addSeg('land', rr(45, 60), low - rr(10, 18), { w: w + 2 });
      return;
    }
    var len = rr(30, 55), ny = Math.max(-30, Math.min(40, y + (rand() < 0.5 ? -1 : 1) * rr(3, 8 + 5 * difficulty)));
    var r = rand(), o = { w: w, X: X };
    if (s > 420 && r < 0.16 && !last.fork && Math.abs(last.b1) < 0.01) {
      // a fork: the road widens and splits around a hole; pick a lane
      o.w = w + 4.5; o.fork = rr(2.4, 3.2) + difficulty * 0.4; len = rr(45, 60);
      ny = y + rr(-4, 2);
    } else if (s > 300 && r < 0.36) {
      o.b = (rand() < 0.5 ? -1 : 1) * rr(0.14, 0.22 + 0.06 * difficulty);  // a tilted road
    } else if (s > 60 && r < 0.78) {
      // a zigzag: the road swings sideways, so steer to follow it
      var shift = rr(4, 7 + 3 * difficulty) * (rand() < 0.5 ? -1 : 1);
      if (Math.abs(X + shift) > 24) shift = -shift;
      o.X = X + shift;
    }
    addSeg('hill', len, ny, o);
  }
  function segAt(s) {
    for (var i = segs.length - 1; i >= 0; i--) if (s >= segs[i].s0) return s < segs[i].s1 ? segs[i] : null;
    return null;
  }
  function ease(t) { return (1 - Math.cos(Math.PI * t)) / 2; }
  // height profile along the road's middle: height, slope (dy/ds) and second derivative; null over a gap
  function profile(sg, s) {
    if (!sg || sg.kind === 'gap') return null;
    var L = sg.s1 - sg.s0, t = (s - sg.s0) / L, d = sg.y1 - sg.y0, y, dy, ddy;
    if (sg.kind === 'ramp') { y = sg.y0 + d * t * t; dy = 2 * d * t / L; ddy = 2 * d / (L * L); }
    else if (sg.kind === 'land') { var u = 1 - t; y = sg.y0 + d * (1 - u * u); dy = 2 * d * u / L; ddy = -2 * d / (L * L); }
    else { y = sg.y0 + d * ease(t); dy = d * Math.PI * Math.sin(Math.PI * t) / (2 * L); ddy = d * Math.PI * Math.PI * Math.cos(Math.PI * t) / (2 * L * L); }
    return { y: y, dy: dy, ddy: ddy };
  }
  // the road's cross-section at s: middle X, width w, tilt b and the fork hole's half width h
  function shape(sg, s) {
    var t = Math.max(0, Math.min(1, (s - sg.s0) / (sg.s1 - sg.s0))), e = ease(t);
    var h = 0;
    if (sg.fork) h = sg.fork / 2 * Math.max(0, Math.min(1, t / 0.18, (1 - t) / 0.18));  // pointed at both ends, like a split in the road
    return { X: sg.X0 + (sg.X1 - sg.X0) * e, w: sg.w0 + (sg.w1 - sg.w0) * e, b: sg.b0 + (sg.b1 - sg.b0) * e, h: h };
  }
  // the road under (s, x): its height there, the slope along s and the tilt; null if there's no road under you
  function ground(s, x) {
    var sg = segAt(s), p = profile(sg, s);
    if (!p) return null;
    var c = shape(sg, s), off = x - c.X;
    if (Math.abs(off) > c.w / 2 || Math.abs(off) < c.h) return null;
    return { y: p.y + off * Math.tan(c.b), dy: p.dy, ddy: p.ddy, b: c.b, X: c.X };
  }

  /* ---------- the ball ---------- */
  var G = 26, R = 1.2;
  var b, state = 'ready', time = 0, minSpeed = 12, stats, popups = [];
  var steerKeys = 0, dragDX = 0;  // -1/0/1 from the arrow keys; meters dragged since the last step
  function reset() {
    resetTerrain((Date.now() & 0xffffff) + 7);
    b = { s: 0, x: 0, y: ground(0, 0).y + R, v: 14, vs: 14, vy: 0, lv: 0, air: false, spin: 0, airT: 0, lastY: 0, under: false };
    b.lastY = b.y - R;
    time = 0; minSpeed = 12; popups = []; dragDX = 0;
    stats = { perfect: 0, combo: 0, maxCombo: 0 };
  }
  function maxSpeed() { return Math.min(55, 32 + time * 0.2); }
  function steer(dt) {
    // arrow keys push sideways toward 10 m/s; a drag moves the ball directly and leaves it some sideways speed
    if (steerKeys) b.lv += (steerKeys * 10 - b.lv) * Math.min(1, dt * (b.air ? 3 : 7));
    else if (!b.air) b.lv *= Math.exp(-5 * dt);
    if (dragDX) {
      var mv = Math.max(-1.2, Math.min(1.2, dragDX));
      b.x += mv; dragDX -= mv;
      b.lv += (Math.max(-8, Math.min(8, mv / dt)) - b.lv) * 0.12;
    }
  }
  function physics(dt) {
    time += dt;
    minSpeed = Math.min(18, 10 + Math.floor(time / 10));  // the road speeds up every 10 seconds
    while (segs[segs.length - 1].s1 < b.s + 400) more();
    while (segs.length > 4 && segs[1].s1 < b.s - 80) segs.shift();
    var g = G;
    steer(dt);
    if (!b.air) {
      var gr = ground(b.s, b.x);
      if (!gr) { b.air = true; b.airT = 0; b.vs = b.v; b.vy = 0; return; }  // rolled off the edge or into a hole
      var th = Math.atan(gr.dy), cos = Math.cos(th);
      // along the slope: gravity pulls downhill, a little rolling friction
      b.v += (-g * Math.sin(th) - 0.03 * b.v - 0.0015 * b.v * b.v) * dt;
      if (b.v < minSpeed) b.v += (minSpeed - b.v) * Math.min(1, dt * 1.5);
      b.v = Math.max(minSpeed * 0.6, Math.min(b.v, maxSpeed()));  // never stalls, never runs away
      b.lv += -G * Math.sin(gr.b) * 0.55 * dt;  // a tilted road pulls you toward its low side
      var ns = b.s + b.v * cos * dt, nx = b.x + b.lv * dt, ng = ground(ns, nx);
      // leave the ground over a crest when light, or at the end of a ramp
      var curv = gr.ddy / Math.pow(1 + gr.dy * gr.dy, 1.5);
      if (!ng || (curv < 0 && b.v * b.v * -curv > g * cos)) {
        b.air = true; b.airT = 0; b.vs = b.v * cos; b.vy = b.v * Math.sin(th);
        var here = segAt(b.s);
        if (here && here.kind === 'ramp') overGap(here, th);
        b.s = ns; b.x = nx;
      } else {
        b.s = ns; b.x = nx; b.y = ng.y + R; b.vs = b.v * cos; b.vy = b.v * Math.sin(Math.atan(ng.dy)); b.lastY = ng.y;
      }
    } else {
      b.vy -= g * dt; b.airT += dt;
      b.vs *= 1 - 0.04 * dt;  // a little air drag
      var py = b.y;
      b.s += b.vs * dt; b.x += b.lv * dt; b.y += b.vy * dt;
      var gr2 = ground(b.s, b.x);
      // land only when coming down onto the top of the road, never from underneath it
      if (gr2 && !b.under && b.y <= gr2.y + R && py >= gr2.y + R - 1.2) land(gr2);
      else if (gr2 && b.y < gr2.y) b.under = true;
      if (b.y < b.lastY - 24) over();
    }
    b.spin += (b.air ? b.vs : b.v) * dt / R;
  }
  // a ramp throws the ball just hard enough to reach the first third of the landing slope across the gap
  function overGap(ramp, th) {
    var gap = segAt(ramp.s1 + 0.01), landing = gap && gap.kind === 'gap' ? segAt(gap.s1 + 0.01) : null;
    if (!landing || landing.kind === 'gap') return;
    var at = gap.s1 + (landing.s1 - landing.s0) * 0.3, D = at - b.s, dh = profile(landing, at).y + R - b.y;
    var c = Math.cos(th), den = 2 * c * c * (D * Math.tan(th) - dh);
    if (den <= 0) return;
    var v = Math.max(Math.hypot(b.vs, b.vy), Math.sqrt(G * D * D / den) * 1.03);  // a little extra for the air drag
    b.vs = v * c; b.vy = v * Math.sin(th);
  }
  // landings are judged by where you come down: the middle of the road (or of your lane at a fork) is PERFECT
  function land(gr) {
    var th = Math.atan(gr.dy), va = Math.atan2(b.vy, b.vs), diff = Math.abs(va - th);
    var sp = Math.hypot(b.vs, b.vy) * Math.cos(Math.min(diff, 1.2));
    b.air = false; b.y = gr.y + R; b.lastY = gr.y;
    if (b.airT < 0.35) { b.v = sp; return; }  // a small hop, not a landing
    var sg = segAt(b.s), c = shape(sg, b.s), off = b.x - c.X, mid = 0, half = c.w / 2;
    if (c.h > 0) { half = (c.w / 2 - c.h) / 2; mid = (off < 0 ? -1 : 1) * (c.h + half); }
    var rel = Math.abs(off - mid) / half;
    if (rel < 0.3) {
      stats.combo++; stats.perfect++; stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
      b.v = Math.min(maxSpeed(), sp * 1.04 + 1.2 + Math.min(stats.combo, 8) * 0.4);
      popup(T.perfect + (stats.combo > 1 ? ' ×' + stats.combo : ''), '#FF6B5B'); beep(880, 0.08);
    } else if (rel < 0.7) {
      stats.combo = 0; b.v = sp; popup(T.good, '#2B3155'); beep(520, 0.05);
    } else {
      stats.combo = 0; b.v = Math.max(minSpeed, sp * 0.85); popup(T.rough, '#6B7192'); beep(200, 0.06);
    }
  }
  function popup(text, color) { popups = [{ text: text, color: color, t: 0 }]; }
  function over() {
    if (state !== 'play') return;
    state = 'over'; btn.disabled = false;
    var sg = segAt(b.s), why = sg && sg.kind === 'gap' ? T.over_gap : T.over_edge;
    var d = Math.round(b.s), nb = d > best;
    if (nb) { best = d; save(); }
    var lines = [d + ' m', why];
    if (nb) lines.push(T.new_best);
    lines.push(fmt(T.perfects, { n: stats.perfect }) + ' · ' + fmt(T.max_combo, { n: stats.maxCombo }));
    msg.innerHTML = '<b>' + lines[0] + '</b>' + lines.slice(1).map(function (l) { return '<span>' + l + '</span>'; }).join('');
    say(lines.join('. '));
    btn.textContent = T.again; btn.focus();
    beep(150, 0.25);
  }

  /* ---------- sound: short tones, with a switch ---------- */
  var audio = null;
  function beep(f, len) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), gn = audio.createGain(), t0 = audio.currentTime;
      o.frequency.value = f; o.type = 'sine';
      gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(0.12, t0 + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.connect(gn).connect(audio.destination); o.start(t0); o.stop(t0 + len + 0.02);
    } catch (e) { /* no audio */ }
  }

  /* ---------- page ---------- */
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var app = document.getElementById('hr-app');
  app.innerHTML = '<div class="hr-stage card"><canvas id="hr-canvas" role="img" aria-label="' + T.canvas + '"></canvas>' +
    '<div class="hr-hud"><span id="hr-dist"></span><span id="hr-best"></span><span id="hr-combo"></span></div>' +
    '<div class="hr-msg" id="hr-msg"></div></div>' +
    '<div class="hr-controls"><button class="btn hr-main" id="hr-main"></button>' +
    '<button class="hr-sound" id="hr-sound" aria-pressed="' + soundOn + '"></button>' +
    '<p class="hr-keys">' + (touch ? T.touch : T.keys) + '</p></div>';
  var canvas = document.getElementById('hr-canvas'), ctx = canvas.getContext('2d');
  var btn = document.getElementById('hr-main'), msg = document.getElementById('hr-msg'), live = document.getElementById('live');
  var soundBtn = document.getElementById('hr-sound');
  function say(text) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 30); } }
  function soundLabel() { soundBtn.textContent = T.sound + ': ' + (soundOn ? T.on : T.off); soundBtn.setAttribute('aria-pressed', soundOn); }
  var W = 0, H = 0, F = 1, HZ = 0;
  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(300, r.width); H = Math.max(240, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.min(W * 0.9, H * 1.0); HZ = H * 0.3;
  }

  function start() {
    if (state === 'play') return;
    reset(); state = 'play'; msg.innerHTML = ''; btn.textContent = T.rolling; btn.disabled = true; cam = null;
    say(T.tip);
  }
  // touching the game only steers; it starts a run when none is going
  var dragX = null;
  btn.addEventListener('click', start);
  canvas.addEventListener('pointerdown', function (e) {
    e.preventDefault(); dragX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* old browser */ }
    if (state !== 'play') start();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (dragX == null || state !== 'play') return;
    // move the ball about as far as the finger moves on the road near the ball
    dragDX += (e.clientX - dragX) * 1.3 * (cam ? cam.d : BACK) / F;
    dragX = e.clientX;
  });
  function up() { dragX = null; }
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  var held = {};
  function keyDir() { steerKeys = (held.r ? 1 : 0) - (held.l ? 1 : 0); }
  document.addEventListener('keydown', function (e) {
    var tg = e.target.closest ? e.target : document.body;
    if (tg.closest('input,textarea')) return;
    var k = e.key;
    if (k === ' ' && !e.repeat && !tg.closest('a,button')) { e.preventDefault(); start(); }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (state === 'play') e.preventDefault(); held.l = true; keyDir(); }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (state === 'play') e.preventDefault(); held.r = true; keyDir(); }
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { held.l = false; keyDir(); }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { held.r = false; keyDir(); }
  });
  window.addEventListener('blur', function () { held = {}; keyDir(); });
  soundBtn.addEventListener('click', function () { soundOn = !soundOn; save(); soundLabel(); });

  /* ---------- drawing: a chase camera behind the ball ---------- */
  var WORLDS = [ // pastel palettes that shift as you go: sky top, sky bottom, far land, road, road stripe, road edge, road side
    ['#9FC3F2', '#FDE3EC', '#C9C7F0', '#A8E0B4', '#9AD6A8', '#FFFFFF', '#6FBF85'],
    ['#F7B9A6', '#FFF1D6', '#F2CFC2', '#F6D29C', '#EFC487', '#FFFFFF', '#D9A15D'],
    ['#A9D8E8', '#EAF7F2', '#BFE3DA', '#9FDACB', '#8ED0BF', '#FFFFFF', '#5DAF9C'],
    ['#C7B8EE', '#FCE4F0', '#DCCDF4', '#C4B0EA', '#B8A1E3', '#FFFFFF', '#9179C9'],
  ];
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function mixRGB(a, c, t) { return [0, 1, 2].map(function (i) { return a[i] + (c[i] - a[i]) * t; }); }
  function css(c) { return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'; }
  function palette(s) {
    var w = Math.max(0, s) / 1000, i = Math.floor(w) % WORLDS.length, j = (i + 1) % WORLDS.length, t = Math.max(0, (w % 1) * 5 - 4);
    return WORLDS[i].map(function (c, k) { return mixRGB(rgb(c), rgb(WORLDS[j][k]), t); });
  }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  var cam = null, BACK = 12, UP = 4.6, FAR = 190, CORAL = [255, 107, 91];
  function P(s, x, y) { var dz = Math.max(0.3, s - cam.s), k = F / dz; return [W / 2 + (x - cam.x) * k, HZ - (y - cam.y) * k]; }
  function quad(a, c, d, e2, color) {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.stroke();  // hides hairline seams between strips
  }
  // one strip of road between sa (near) and sb (far): the slab's visible sides, its top and white edge lines
  function drawStrip(sg, sa, sb, pal, f) {
    var ca = shape(sg, sa), cb = shape(sg, sb), pa = profile(sg, sa), pb = profile(sg, Math.min(sb, sg.s1 - 1e-4));
    var fog = pal[1], fk = Math.min(1, f * f * 1.6);
    var stripe = Math.floor((sa + sb) / 6) % 2 === 0;
    var top = css(mixRGB(stripe ? pal[3] : pal[4], fog, fk)), side = css(mixRGB(pal[6], fog, fk)), edge = css(mixRGB(pal[5], fog, fk));
    if (sg.kind === 'ramp' && sg.s1 - sb < 3) top = css(mixRGB(CORAL, fog, fk));  // the ramp's red lip
    function pt(c, p, s, off, dy) { return P(s, c.X + off, p.y + off * Math.tan(c.b) + (dy || 0)); }
    // the road, or its two lanes around a fork's hole: [left offset, right offset] at a and at b
    var pieces = ca.h > 0 || cb.h > 0
      ? [[-ca.w / 2, -ca.h, -cb.w / 2, -cb.h, true, false], [ca.h, ca.w / 2, cb.h, cb.w / 2, false, true]]
      : [[-ca.w / 2, ca.w / 2, -cb.w / 2, cb.w / 2, true, true]];
    var before = segAt(sa - 0.05), front = sa === sg.s0 && (!before || before.kind === 'gap'), depth = 2.6;
    pieces.forEach(function (pc) {
      var la = pc[0], ra = pc[1], lb = pc[2], rb = pc[3];
      var A = pt(ca, pa, sa, la), B = pt(ca, pa, sa, ra), C = pt(cb, pb, sb, rb), D = pt(cb, pb, sb, lb);
      if (cam.x < ca.X + la) quad(A, D, pt(cb, pb, sb, lb, -depth), pt(ca, pa, sa, la, -depth), side);
      if (cam.x > ca.X + ra) quad(B, C, pt(cb, pb, sb, rb, -depth), pt(ca, pa, sa, ra, -depth), side);
      if (front) quad(A, B, pt(ca, pa, sa, ra, -depth), pt(ca, pa, sa, la, -depth), side);
      quad(A, B, C, D, top);
      var e = 0.3;
      if (pc[4]) quad(A, pt(ca, pa, sa, la + e), pt(cb, pb, sb, lb + e), D, edge);
      if (pc[5]) quad(pt(ca, pa, sa, ra - e), B, C, pt(cb, pb, sb, rb - e), edge);
    });
  }
  function drawBall(gy) {
    var c = P(b.s, b.x, b.y), k = F / Math.max(0.3, b.s - cam.s), r = R * k;
    if (gy && !b.under) {  // shadow on the road, smaller the higher you are
      var sh = P(b.s, b.x, gy.y), hgt = Math.max(0, b.y - R - gy.y), sc = Math.max(0.3, 1 - hgt / 14);
      ctx.fillStyle = 'rgba(43,49,85,' + (0.22 * sc).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(sh[0], sh[1], r * sc * 1.05, r * sc * 0.32, 0, 0, 7); ctx.fill();
    }
    var g2 = ctx.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r);
    g2.addColorStop(0, '#FFFFFF'); g2.addColorStop(1, '#C9CEE6');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 7); ctx.fill();
    // a coral band rolling away from the camera shows the spin
    var ph = b.spin % (Math.PI * 2), by = Math.cos(ph);
    if (Math.sin(ph) > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, 7); ctx.clip();
      ctx.fillStyle = '#FF6B5B';
      ctx.beginPath(); ctx.ellipse(c[0], c[1] - by * r * 0.8, r * Math.sqrt(1 - by * by * 0.64), r * 0.16, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  function draw() {
    // the camera trails the ball, a little above it, and follows its sideways moves with a short lag
    var gy = ground(b.s, b.x), floorY = Math.max(b.y, b.lastY + R - 6);
    if (!cam) cam = { s: b.s - BACK, x: b.x, y: floorY + UP, d: BACK };
    cam.s = b.s - BACK; cam.x += (b.x - cam.x) * 0.18; cam.y += (floorY + UP + (b.air && !b.under ? 3.5 : 0) - cam.y) * 0.1;  // a little higher in the air, to see where you'll land
    cam.d = b.s - cam.s;
    var pal = palette(b.s);
    // sky, far hills, and the land far below the floating road
    var gr = ctx.createLinearGradient(0, 0, 0, HZ); gr.addColorStop(0, css(pal[0])); gr.addColorStop(1, css(pal[1]));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, HZ + 1);
    var low = ctx.createLinearGradient(0, HZ, 0, H); low.addColorStop(0, css(mixRGB(pal[2], pal[1], 0.5))); low.addColorStop(1, css(pal[2]));
    ctx.fillStyle = low; ctx.fillRect(0, HZ, W, H - HZ);
    ctx.fillStyle = css(mixRGB(pal[2], pal[1], 0.25));
    ctx.beginPath(); ctx.moveTo(0, HZ + 2);
    for (var fx = 0; fx <= W + 8; fx += 8) {
      var u = fx + cam.x * 2 + b.s * 0.15;
      ctx.lineTo(fx, HZ - 6 - Math.max(0, Math.sin(u * 0.011) * 22 + Math.sin(u * 0.027) * 9));
    }
    ctx.lineTo(W, HZ + 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (var ci = 0; ci < 5; ci++) {
      var cxp = ((ci * 197 - cam.x * 3 - b.s * 0.4) % (W + 160) + W + 160) % (W + 160) - 80, cyp = 16 + (ci * 37) % (HZ * 0.55);
      ctx.beginPath(); ctx.ellipse(cxp, cyp, 34, 11, 0, 0, 7); ctx.ellipse(cxp + 20, cyp - 6, 22, 10, 0, 0, 7); ctx.fill();
    }
    // puffy clouds drifting below and beside the road give a sense of depth and speed
    var CH = 18;
    for (var c = Math.floor(cam.s / CH) + Math.ceil(FAR / CH); c >= Math.floor(cam.s / CH); c--) {
      var h1 = hash(c), h2 = hash(c + 0.37), h3 = hash(c + 0.71);
      var cs = c * CH + h1 * CH, dz = cs - cam.s;
      if (dz < 2 || dz > FAR) continue;
      var csg = segAt(cs) || segAt(cs - 30), base = csg ? Math.min(csg.y0, csg.y1) : b.lastY;
      var cx = (csg ? csg.X0 : 0) + (h2 < 0.5 ? -1 : 1) * (13 + h3 * 34), cy = base - 8 - h2 * 22, k = F / dz;
      var q = P(cs, cx, cy), rad = (3 + h3 * 4) * k;
      if (q[0] < -rad * 2 || q[0] > W + rad * 2 || q[1] > H + rad) continue;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.85 * (1 - Math.min(1, dz / FAR) * 0.7)).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(q[0], q[1], rad * 1.6, rad * 0.55, 0, 0, 7);
      ctx.ellipse(q[0] + rad * 0.7, q[1] - rad * 0.35, rad * 0.9, rad * 0.5, 0, 0, 7); ctx.fill();
    }
    // the road from far to near, with the ball drawn in its place so a falling ball goes behind the road
    var pts = [], s0 = cam.s + 0.6, z;
    for (z = s0; z < cam.s + FAR; z += 0.8 + (z - cam.s) * 0.035) pts.push(z);
    segs.forEach(function (sg) { if (sg.s0 > s0 && sg.s0 < cam.s + FAR) pts.push(sg.s0); });
    pts.sort(function (a, c) { return a - c; });
    var ballDrawn = false;
    for (var i = pts.length - 2; i >= 0; i--) {
      var sa = pts[i], sb = pts[i + 1];
      if (sb - sa < 0.01) continue;
      var sg = segAt((sa + sb) / 2);
      if (sg && sg.kind !== 'gap') drawStrip(sg, sa, sb, pal, (sa - cam.s) / FAR);
      if (!ballDrawn && sa <= b.s) { drawBall(gy); ballDrawn = true; }
    }
    if (!ballDrawn) drawBall(gy);
    // popups above the ball
    popups = popups.filter(function (p) { return p.t < 1.1; });
    var bp = P(b.s, b.x, b.y);
    popups.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.t);
      ctx.fillStyle = p.color; ctx.font = '700 20px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, bp[0], bp[1] - 46 - p.t * 30);
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    });
    if (state === 'ready') {
      ctx.font = '600 15px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      var tw = Math.min(W - 24, ctx.measureText(T.tip).width + 24);
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.fillRect(W / 2 - tw / 2, H * 0.86 - 20, tw, 30);
      ctx.fillStyle = '#2B3155'; ctx.fillText(T.tip, W / 2, H * 0.86, W - 36); ctx.textAlign = 'left';
    }
  }
  function hud() {
    document.getElementById('hr-dist').textContent = T.distance + ' ' + Math.max(0, Math.round(b.s)) + ' m';
    document.getElementById('hr-best').textContent = T.best + ' ' + best + ' m';
    document.getElementById('hr-combo').textContent = T.combo + ' ' + stats.combo;
  }

  var last = 0;
  function tick(now) {
    var dt = Math.min(0.04, (now - (last || now)) / 1000); last = now;
    if (state === 'play') {
      for (var i = 0; i < 4 && state === 'play'; i++) physics(dt / 4);
      popups.forEach(function (p) { p.t += dt; });
    }
    draw(); hud();
    requestAnimationFrame(tick);
  }

  reset();
  btn.textContent = T.start;
  soundLabel();
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(tick);

  // for automated tests only
  window.__hilltop = { start: start, physics: physics, ball: function () { return b; }, ground: ground, segAt: segAt, shape: shape,
    profile: profile, snapCam: function () { cam = null; }, setSteer: function (d) { steerKeys = d; },
    state: function () { return state; }, stats: function () { return stats; } };
})();
