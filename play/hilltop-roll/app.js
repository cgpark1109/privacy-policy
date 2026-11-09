/* Hilltop Roll (browser version): hold to roll heavy down the hills, let go to fly off the tops, land along the
   slope for a PERFECT boost. A 2D take on our Android game, not a copy of it.
   Source: _src/hilltop/app.js, copied to play/hilltop-roll/ by build.py. The page is an ordinary site page
   (/play/hilltop-roll/ and /ko/play/hilltop-roll/); this script draws the game on a canvas in #hr-app.
   World units are meters (y up) and seconds. */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var T = {
    en: {
      start: 'Start', again: 'Roll again', hold: 'Hold', release: 'Let go',
      tip: 'Hold to roll heavy, let go to fly. Land along the slope!',
      distance: 'Distance', best: 'Best', combo: 'Combo', speed: 'Speed',
      perfect: 'PERFECT', good: 'Nice', rough: 'Bumpy',
      over: 'You fell into a gap', new_best: 'New best!', perfects: '{n} perfect landings', max_combo: 'Best combo: {n}',
      canvas: 'Hilltop Roll game. Hold the button, the screen or the Space key to roll heavy; let go to fly.',
      keys: 'Hold Space (or the screen) to roll heavy, let go to fly.',
      sound: 'Sound', on: 'On', off: 'Off',
    },
    ko: {
      start: '시작하기', again: '다시 굴리기', hold: '누르는 중', release: '떼는 중',
      tip: '누르면 무겁게 굴러가고, 떼면 날아올라요. 경사를 따라 착지하세요!',
      distance: '거리', best: '최고', combo: '콤보', speed: '속도',
      perfect: 'PERFECT', good: '좋아요', rough: '덜컹',
      over: '낭떠러지에 떨어졌어요', new_best: '최고 기록!', perfects: 'PERFECT 착지 {n}번', max_combo: '최고 콤보: {n}',
      canvas: 'Hilltop Roll 게임 화면. 버튼이나 화면, 스페이스 키를 누르고 있으면 무겁게 구르고, 떼면 날아올라요.',
      keys: '스페이스(또는 화면)를 누르고 있으면 무겁게, 떼면 날아올라요.',
      sound: '소리', on: '켜짐', off: '꺼짐',
    },
  }[LANG];
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  var KEY = 'kys_hilltop';
  var store = (function () { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } })();
  var best = store.best || 0, soundOn = store.sound !== false;
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ best: best, sound: soundOn })); } catch (e) { /* private mode */ } }

  /* ---------- terrain ---------- */
  // Segments between control points. kind: 'hill' (cosine ease), 'ramp' (steepest at its end: a launch lip),
  // 'land' (steepest at its start: a downhill landing), 'gap' (no ground).
  var segs = [], rand = Math.random;
  function rr(a, b) { return a + (b - a) * rand(); }
  function addSeg(kind, len, y1) {
    var last = segs[segs.length - 1];
    segs.push({ kind: kind, x0: last.x1, x1: last.x1 + len, y0: last.y1, y1: y1 });
  }
  function resetTerrain(seed) {
    var s = seed;
    rand = function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    segs = [{ kind: 'hill', x0: -60, x1: 0, y0: 30, y1: 30 }];
    addSeg('hill', 40, 18);
    addSeg('hill', 50, 4);
    while (segs[segs.length - 1].x1 < 600) more();
  }
  var gapsMade = 0;
  function more() {
    var last = segs[segs.length - 1], x = last.x1, y = last.y1;
    var difficulty = Math.min(1.8, x / 1800);  // gaps get wider and more frequent the farther you go
    if (x > 250 && rand() < 0.16 + 0.12 * difficulty && last.kind !== 'gap') {
      // a ramp, a gap and a downhill landing a little lower
      // a downhill run-up, a ramp, the gap, and a long downhill to land on
      var low = y - rr(10, 16);
      addSeg('hill', rr(38, 52), low);
      var rampUp = rr(5, 8);
      addSeg('ramp', rr(16, 22), low + rampUp);
      addSeg('gap', rr(10, 15) + 14 * difficulty, low + rampUp);
      addSeg('land', rr(45, 60), low - rr(10, 18));
      gapsMade++;
      return;
    }
    var len = rr(30, 55), ny = Math.max(-30, Math.min(40, y + (rand() < 0.5 ? -1 : 1) * rr(3, 8 + 5 * difficulty)));
    addSeg('hill', len, ny);
  }
  function segAt(x) {
    for (var i = segs.length - 1; i >= 0; i--) if (x >= segs[i].x0) return x < segs[i].x1 ? segs[i] : null;
    return null;
  }
  // ground height, slope (dy/dx) and second derivative at x; null over a gap
  function ground(x) {
    var s = segAt(x);
    if (!s || s.kind === 'gap') return null;
    var L = s.x1 - s.x0, t = (x - s.x0) / L, d = s.y1 - s.y0, y, dy, ddy;
    if (s.kind === 'ramp') { y = s.y0 + d * t * t; dy = 2 * d * t / L; ddy = 2 * d / (L * L); }
    else if (s.kind === 'land') { var u = 1 - t; y = s.y0 + d * (1 - u * u); dy = 2 * d * u / L; ddy = -2 * d / (L * L); }
    else { y = s.y0 + d * (1 - Math.cos(Math.PI * t)) / 2; dy = d * Math.PI * Math.sin(Math.PI * t) / (2 * L); ddy = d * Math.PI * Math.PI * Math.cos(Math.PI * t) / (2 * L * L); }
    return { y: y, dy: dy, ddy: ddy };
  }

  /* ---------- the ball ---------- */
  var G = 18, HEAVY = 2.6, R = 1.2;
  var b, holding = false, state = 'ready', time = 0, minSpeed = 12, stats, popups = [];
  function reset() {
    resetTerrain((Date.now() & 0xffffff) + 7);
    b = { x: 0, y: ground(0).y + R, v: 14, vx: 14, vy: 0, air: false, spin: 0 };
    time = 0; minSpeed = 12; popups = [];
    stats = { perfect: 0, combo: 0, maxCombo: 0 };
  }
  function maxSpeed() { return Math.min(55, 32 + time * 0.2); }
  function physics(dt) {
    time += dt;
    minSpeed = Math.min(18, 10 + Math.floor(time / 10));  // the road speeds up every 10 seconds
    while (segs[segs.length - 1].x1 < b.x + 400) more();
    while (segs.length > 4 && segs[1].x1 < b.x - 80) segs.shift();
    var g = G * (holding ? HEAVY : 1);
    if (!b.air) {
      var gr = ground(b.x);
      if (!gr) { b.air = true; b.airT = 0; return; }  // rolled off the ramp lip into the air
      var th = Math.atan(gr.dy), cos = Math.cos(th);
      // along the slope: gravity pulls downhill, a little rolling friction
      b.v += (-g * Math.sin(th) - 0.03 * b.v - 0.0015 * b.v * b.v) * dt;
      if (b.v < minSpeed) b.v += (minSpeed - b.v) * Math.min(1, dt * 1.5);
      b.v = Math.max(minSpeed * 0.6, Math.min(b.v, maxSpeed()));  // never stalls, never runs away
      var vxg = b.v * cos;
      var nx = b.x + vxg * dt, ng = ground(nx);
      // leave the ground over a crest when light, or at the end of a ramp
      var curv = gr.ddy / Math.pow(1 + gr.dy * gr.dy, 1.5);
      if (!ng || (curv < 0 && b.v * b.v * -curv > g * cos)) {
        b.air = true; b.airT = 0; b.vx = b.v * cos; b.vy = b.v * Math.sin(th);
      } else {
        b.x = nx; b.y = ng.y + R; b.vx = vxg; b.vy = b.v * Math.sin(Math.atan(ng.dy));
      }
    } else {
      b.vy -= g * dt; b.airT += dt;
      b.vx *= 1 - 0.04 * dt;  // a little air drag
      b.x += b.vx * dt; b.y += b.vy * dt;
      var gr2 = ground(b.x);
      if (gr2 && b.y <= gr2.y + R) land(gr2);
      if (b.y < -80) over();
    }
    b.spin += (b.air ? b.vx : b.v) * dt / R;
  }
  function land(gr) {
    var th = Math.atan(gr.dy), va = Math.atan2(b.vy, b.vx), diff = Math.abs(va - th) * 180 / Math.PI;
    var sp = Math.hypot(b.vx, b.vy);
    b.air = false; b.y = gr.y + R;
    if (b.airT < 0.35) { b.v = sp * Math.cos(diff * Math.PI / 180); return; }  // a small hop, not a landing
    if (diff < 14) {
      stats.combo++; stats.perfect++; stats.maxCombo = Math.max(stats.maxCombo, stats.combo);
      b.v = Math.min(maxSpeed(), sp * Math.cos(diff * Math.PI / 180) * 1.06 + 1.2 + Math.min(stats.combo, 8) * 0.4);
      popup(T.perfect + (stats.combo > 1 ? ' ×' + stats.combo : ''), '#FF6B5B'); beep(880, 0.08);
    } else if (diff < 32) {
      stats.combo = 0; b.v = sp * Math.cos(diff * Math.PI / 180); popup(T.good, '#2B3155'); beep(520, 0.05);
    } else {
      stats.combo = 0; b.v = Math.max(sp * 0.55, sp * Math.cos(diff * Math.PI / 180) * 0.85); popup(T.rough, '#6B7192'); beep(200, 0.06);
    }
  }
  function popup(text, color) { popups.push({ text: text, color: color, x: b.x, y: b.y + 4, t: 0 }); }
  function over() {
    if (state !== 'play') return;
    state = 'over';
    var d = Math.round(b.x), nb = d > best;
    if (nb) { best = d; save(); }
    var lines = [fmt(T.over, {}), d + ' m'];
    if (nb) lines.push(T.new_best);
    lines.push(fmt(T.perfects, { n: stats.perfect }) + ' · ' + fmt(T.max_combo, { n: stats.maxCombo }));
    msg.innerHTML = '<b>' + lines[1] + '</b><span>' + lines[0] + '</span>' + lines.slice(2).map(function (l) { return '<span>' + l + '</span>'; }).join('');
    say(lines.join('. '));
    btn.textContent = T.again; btn.focus();
    beep(150, 0.25);
  }

  /* ---------- sound (short tones, off by default on first visit? no: on, with a switch) ---------- */
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
  var app = document.getElementById('hr-app');
  app.innerHTML = '<div class="hr-stage card"><canvas id="hr-canvas" role="img" aria-label="' + T.canvas + '"></canvas>' +
    '<div class="hr-hud"><span id="hr-dist"></span><span id="hr-best"></span><span id="hr-combo"></span></div>' +
    '<div class="hr-msg" id="hr-msg"></div></div>' +
    '<div class="hr-controls"><button class="btn hr-main" id="hr-main"></button>' +
    '<button class="hr-sound" id="hr-sound" aria-pressed="' + soundOn + '"></button>' +
    '<p class="hr-keys">' + T.keys + '</p></div>';
  var canvas = document.getElementById('hr-canvas'), ctx = canvas.getContext('2d');
  var btn = document.getElementById('hr-main'), msg = document.getElementById('hr-msg'), live = document.getElementById('live');
  var soundBtn = document.getElementById('hr-sound');
  function say(text) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 30); } }
  function soundLabel() { soundBtn.textContent = T.sound + ': ' + (soundOn ? T.on : T.off); soundBtn.setAttribute('aria-pressed', soundOn); }
  var W = 0, H = 0;
  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(300, r.width); H = Math.max(220, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function start() {
    reset(); state = 'play'; holding = false; msg.innerHTML = ''; btn.textContent = T.hold;
    say(T.tip);
  }
  function press(on) {
    if (state !== 'play') { if (on) start(); return; }
    holding = on;
    btn.textContent = on ? T.hold : T.release;
    btn.classList.toggle('down', on);
  }
  btn.addEventListener('pointerdown', function (e) { e.preventDefault(); press(true); });
  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); press(true); });
  window.addEventListener('pointerup', function () { if (state === 'play') press(false); });
  window.addEventListener('pointercancel', function () { if (state === 'play') press(false); });
  btn.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); press(true); } });
  btn.addEventListener('keyup', function (e) { if (e.key === 'Enter') press(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ' && !e.repeat && !(e.target.closest && e.target.closest('input,textarea,a'))) { e.preventDefault(); press(true); }
  });
  document.addEventListener('keyup', function (e) { if (e.key === ' ') { e.preventDefault(); if (state === 'play') press(false); } });
  soundBtn.addEventListener('click', function () { soundOn = !soundOn; save(); soundLabel(); });

  /* ---------- drawing ---------- */
  var WORLDS = [ // pastel palettes that shift as you go: sky top, sky bottom, far hills, ground, ground edge
    ['#9FC3F2', '#FDE3EC', '#C9C7F0', '#9ED9A9', '#6FBF85'],
    ['#F7B9A6', '#FFF1D6', '#F2CFC2', '#F4C98E', '#D9A15D'],
    ['#A9D8E8', '#EAF7F2', '#BFE3DA', '#8FD1C1', '#5DAF9C'],
    ['#C7B8EE', '#FCE4F0', '#DCCDF4', '#B9A2E3', '#9179C9'],
  ];
  function mix(a, c, t) {
    var p = function (h, i) { return parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); };
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(p(a, i) + (p(c, i) - p(a, i)) * t); }).join(',') + ')';
  }
  function palette(x) {
    var w = x / 1000, i = Math.floor(w) % WORLDS.length, j = (i + 1) % WORLDS.length, t = Math.max(0, (w % 1) * 5 - 4);
    return WORLDS[i].map(function (c, k) { return mix(c, WORLDS[j][k], t); });
  }
  function draw() {
    var ppm = H / 46, camX = b.x - (W * 0.3) / ppm;
    var gy = ground(b.x), target = Math.max(b.y - 14, (gy ? gy.y : b.y) - 12);
    draw.camY = draw.camY == null ? target : draw.camY + (target - draw.camY) * 0.08;
    var camY = draw.camY;
    function sx(x) { return (x - camX) * ppm; }
    function sy(y) { return H - (y - camY) * ppm; }
    var pal = palette(b.x);
    var gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, pal[0]); gr.addColorStop(1, pal[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // far hills (parallax)
    ctx.fillStyle = pal[2];
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var fx = 0; fx <= W; fx += 8) ctx.lineTo(fx, H * 0.62 + Math.sin((fx + camX * ppm * 0.25) * 0.012) * 26 + Math.sin((fx + camX * ppm * 0.25) * 0.031) * 10);
    ctx.lineTo(W, H); ctx.fill();
    // ground
    var x0 = camX - 5, x1 = camX + W / ppm + 5;
    // ground: one shape per stretch between gaps, so there are no seams between segments
    var runs = [], cur = null;
    for (var x = x0; x <= x1; x += 0.6) {
      var g = ground(x);
      if (g) { if (!cur) { cur = []; runs.push(cur); } cur.push([sx(x), sy(g.y)]); } else cur = null;
    }
    runs.forEach(function (pts) {
      ctx.beginPath(); ctx.moveTo(pts[0][0], H);
      pts.forEach(function (q) { ctx.lineTo(q[0], q[1]); });
      ctx.lineTo(pts[pts.length - 1][0], H); ctx.closePath();
      ctx.fillStyle = pal[3]; ctx.fill();
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(function (q) { ctx.lineTo(q[0], q[1]); });
      ctx.strokeStyle = pal[4]; ctx.lineWidth = 5; ctx.stroke();
    });
    segs.forEach(function (s) {  // a red edge on each ramp lip
      if (s.kind !== 'ramp' || s.x1 < x0 || s.x1 > x1) return;
      var e = ground(s.x1 - 0.01); ctx.fillStyle = '#FF6B5B'; ctx.fillRect(sx(s.x1) - 6, sy(e.y) - 2, 6, 10);
    });
    // popups
    popups = popups.filter(function (p) { return p.t < 1.1; });
    popups.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, 1 - p.t);
      ctx.fillStyle = p.color; ctx.font = '700 18px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, sx(p.x), sy(p.y + p.t * 4));
      ctx.globalAlpha = 1; ctx.textAlign = 'left';
    });
    // ball
    var BX = sx(b.x), BY = sy(b.y), BR = R * ppm;
    ctx.fillStyle = 'rgba(43,49,85,0.15)';
    if (gy) { ctx.beginPath(); ctx.ellipse(BX, sy(gy.y), BR, BR * 0.3, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(BX, BY); ctx.rotate(b.spin);
    ctx.fillStyle = holding ? '#2B3155' : '#FFFFFF'; ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, BR * (holding ? 1.06 : 1), 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FF6B5B'; ctx.beginPath(); ctx.arc(BR * 0.45, 0, BR * 0.28, 0, 7); ctx.fill();
    ctx.restore();
    if (state === 'ready') {
      ctx.fillStyle = 'rgba(43,49,85,0.85)'; ctx.font = '600 15px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(T.tip, W / 2, H * 0.3); ctx.textAlign = 'left';
    }
  }
  function hud() {
    document.getElementById('hr-dist').textContent = T.distance + ' ' + Math.max(0, Math.round(b.x)) + ' m';
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
  window.__hilltop = { start: start, physics: physics, ball: function () { return b; }, ground: ground, setHold: function (h) { holding = h; },
    state: function () { return state; }, stats: function () { return stats; } };
})();
