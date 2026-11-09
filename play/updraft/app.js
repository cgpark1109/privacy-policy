/* Updraft (browser version): aim, power up and launch a paper plane, then ride the air as far as it goes.
   Source: _src/updraft/app.js, copied to play/updraft/ by build.py (build_updraft). The page is an ordinary site page
   (/play/updraft/ in English, /ko/play/updraft/ in Korean); this script draws the game on a canvas in #ud-app.
   World units are meters and seconds. The sky (layout and wind) is the same for everyone on a given day. */
(function () {
  'use strict';

  var LANG = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  var STR = {
    en: {
      aim: 'Tap to set the angle', power: 'Tap to stop the power gauge', flying: 'Flying…', ready: 'Ready',
      launch: 'Launch', set_angle: 'Set angle', set_power: 'Throw!', again: 'Fly again',
      distance: 'Distance', best: 'Best', coins: 'Coins', height: 'Height',
      wind: "Today's wind", tail: 'tailwind', head: 'headwind', calm: 'calm',
      goal: "Today's goal: fly {n} m", goal_done: "Today's goal done! +{c} coins", goal_bonus: 'Goal reached! +{c} coins',
      result: '{d} m', new_best: 'New best!', earned: '+{c} coins', hit: 'Bonk! The fold held.',
      landed: 'Landed in the {z}', crashed: 'Crashed into {o} in the {z}',
      upgrades: 'Upgrades', level: 'Lv {n}', max: 'Max', buy: 'Upgrade for {c}', need: '{c} coins',
      zones: ['Park', 'City', 'Sea', 'Mountains', 'Clouds'],
      zones_in: ['park', 'city', 'sea', 'mountains', 'clouds'],
      obstacles: { tree: 'a tree', building: 'a building', mast: 'a ship', peak: 'a peak', storm: 'a storm cloud' },
      up: [
        ['Strong arm', 'Throw harder: more launch speed.'],
        ['Wide wings', 'Glide farther before sinking.'],
        ['Light paper', 'Feel less pull from gravity.'],
        ['Draft catcher', 'Updrafts lift you higher.'],
        ['Coin magnet', 'Grab coins from farther away.'],
        ['Sturdy fold', 'Survive one more bump.'],
      ],
      canvas: 'Paper plane flight. Use the button below or press Space.',
      keys: 'Space or Enter: set angle, stop power, launch again.',
    },
    ko: {
      aim: '눌러서 각도를 정하세요', power: '눌러서 힘 게이지를 멈추세요', flying: '비행 중…', ready: '준비',
      launch: '날리기', set_angle: '각도 정하기', set_power: '던지기!', again: '다시 날리기',
      distance: '거리', best: '최고', coins: '코인', height: '높이',
      wind: '오늘의 바람', tail: '뒷바람', head: '맞바람', calm: '잔잔함',
      goal: '오늘의 목표: {n}m 날리기', goal_done: '오늘의 목표 달성! +{c} 코인', goal_bonus: '목표 달성! +{c} 코인',
      result: '{d}m', new_best: '최고 기록!', earned: '+{c} 코인', hit: '쿵! 튼튼하게 접어서 버텼어요.',
      landed: '{z}에 착지했어요', crashed: '{z}에서 {o}에 부딪혔어요',
      upgrades: '업그레이드', level: 'Lv {n}', max: '최대', buy: '{c} 코인으로 강화', need: '{c} 코인 필요',
      zones: ['공원', '도시', '바다', '산', '구름 위'],
      zones_in: ['공원', '도시', '바다', '산', '구름 위'],
      obstacles: { tree: '나무', building: '건물', mast: '배', peak: '산봉우리', storm: '먹구름' },
      up: [
        ['힘센 팔', '더 세게 던져요: 발사 속도 증가'],
        ['넓은 날개', '천천히 내려오며 더 멀리 활공해요'],
        ['가벼운 종이', '중력을 덜 받아요'],
        ['기류 잡기', '상승기류에서 더 높이 올라가요'],
        ['코인 자석', '더 멀리 있는 코인도 모아요'],
        ['튼튼한 접기', '부딪혀도 한 번 더 버텨요'],
      ],
      canvas: '종이비행기 비행 화면. 아래 버튼을 누르거나 스페이스 키를 누르세요.',
      keys: '스페이스나 Enter: 각도 정하기, 힘 멈추기, 다시 날리기',
    },
  };
  var T = STR[LANG];
  function fmt(s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); }

  /* ---------- storage ---------- */
  var KEY = 'kys_updraft';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  var save0 = load() || {};
  var P = { coins: save0.coins || 0, best: save0.best || 0, up: (save0.up || [0, 0, 0, 0, 0, 0]).slice(0, 6), goal: save0.goal || '' };
  while (P.up.length < 6) P.up.push(0);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* private mode */ } }

  /* ---------- the day's sky ---------- */
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () {
      h = (h + 0x6D2B79F5) | 0;
      var x = Math.imul(h ^ h >>> 15, 1 | h);
      x = (x + Math.imul(x ^ x >>> 7, 61 | x)) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }
  var DAY = today();
  var rnd = seeded('updraft-' + DAY);
  function rr(a, b) { return a + (b - a) * rnd(); }
  var WIND = Math.round(rr(-2.5, 3.5) * 2) / 2;  // m/s, positive = tailwind
  var GOAL = Math.round(rr(12, 30)) * 10;         // today's goal in meters
  var GOAL_COINS = 60;

  // Zones by distance: Park, City, Sea, Mountains, Clouds
  var ZONE_AT = [0, 300, 750, 1250, 1900];
  var LENGTH = 4000;
  function zoneOf(x) { var z = 0; for (var i = 0; i < ZONE_AT.length; i++) if (x >= ZONE_AT[i]) z = i; return z; }
  // ground (or cloud floor) height
  var hills = [];
  for (var hi = 0; hi < 12; hi++) hills.push([rr(0, Math.PI * 2), rr(0.004, 0.02), rr(6, 22)]);
  function groundAt(x) {
    var z = zoneOf(x);
    if (z < 3) return 0;
    if (z === 3) {
      var h = 10, t = Math.min(1, (x - ZONE_AT[3]) / 120);
      for (var i = 0; i < hills.length; i++) h += Math.sin(x * hills[i][1] + hills[i][0]) * hills[i][2] * 0.25;
      return Math.max(2, h) * t;
    }
    return 28 + Math.sin(x * 0.01) * 3;  // the top of the cloud sea
  }
  var drafts = [], obstacles = [], coinsW = [];
  (function build() {
    for (var x = 60; x < LENGTH; x += rr(55, 110)) {
      var z = zoneOf(x), r = rnd();
      var upP = [0.42, 0.38, 0.45, 0.5, 0.55][z], downP = [0.12, 0.18, 0.15, 0.22, 0.25][z];
      if (r < upP) drafts.push({ x: x, w: rr(14, 32), s: rr(2.4, 4.4) * (z === 4 ? 1.2 : 1), top: rr(60, 110) });
      else if (r < upP + downP) drafts.push({ x: x, w: rr(14, 26), s: -rr(1.5, 3), top: 200 });
      if (rnd() < 0.45) {  // an arc of coins
        var cy = groundAt(x) + rr(6, 35);
        for (var k = 0; k < 5; k++) coinsW.push({ x: x + k * 4, y: cy + Math.sin(k / 4 * Math.PI) * 4, got: false });
      }
    }
    for (var ox = 140; ox < LENGTH; ) {
      var zz = zoneOf(ox), g = groundAt(ox);
      if (zz === 0) { obstacles.push({ k: 'tree', x: ox, w: 4, h: rr(4, 7.5), y: 0 }); ox += rr(45, 95); }
      else if (zz === 1) { var bw = rr(10, 22); obstacles.push({ k: 'building', x: ox, w: bw, h: rr(10, 34), y: 0 }); ox += bw + rr(30, 75); }
      else if (zz === 2) { if (rnd() < 0.5) obstacles.push({ k: 'mast', x: ox, w: 3, h: rr(8, 15), y: 0 }); ox += rr(70, 140); }
      else if (zz === 3) { obstacles.push({ k: 'peak', x: ox, w: rr(10, 18), h: rr(10, 26), y: g }); ox += rr(70, 130); }
      else { obstacles.push({ k: 'storm', x: ox, w: rr(16, 30), h: rr(8, 14), y: g + rr(12, 45) }); ox += rr(80, 150); }
    }
  })();
  function draftAt(x, y) {
    for (var i = 0; i < drafts.length; i++) {
      var d = drafts[i];
      if (Math.abs(x - d.x) < d.w / 2 && y < d.top) {
        var edge = 1 - Math.pow(Math.abs(x - d.x) / (d.w / 2), 2);
        return d.s * edge * (d.s > 0 ? 1 + 0.2 * P.up[3] : 1);
      }
    }
    return 0;
  }

  /* ---------- flight physics ---------- */
  // An arcade glide model rather than real aerodynamics, so a paper plane never loops: lift pushes straight up
  // and grows with forward speed, climbing costs forward speed and sinking gives some back, and the flat paper
  // damps vertical motion. The plane carries x, y and its velocity relative to the air (rx, ry).
  var C = { cl: 0.05, damp: 1.1, ke: 0.5, v0: 17, v0up: 2.4, cd: 0.003, cdup: 0.3, gup: 0.045 };
  function params() {
    return {
      v0: C.v0 + C.v0up * P.up[0],
      cd: C.cd / (1 + C.cdup * P.up[1]),
      g: 9.8 * (1 - C.gup * P.up[2]),
      magnet: 1.5 + P.up[4],
      shields: P.up[5],
    };
  }
  function step(s, k, dt) {
    var vx = Math.max(0.5, s.rx);
    var ax = -k.cd * vx * vx - C.ke * s.ry;
    var ay = Math.min(C.cl * vx * vx, 2.2 * k.g) - k.g - C.damp * s.ry;
    s.rx = Math.max(0.5, s.rx + ax * dt);
    s.ry += ay * dt;
    var w = draftAt(s.x, s.y);
    s.x += (s.rx + WIND) * dt;
    s.y += (s.ry + w) * dt;
    s.t += dt;
  }

  /* ---------- state ---------- */
  var phase = 'aim', angle = 25, power = 0.5, osc = 0, plane = null, k = null, flight = null, last = 0;
  var canvas, ctx, W = 0, H = 0, dpr = 1;
  var app = document.getElementById('ud-app');
  app.innerHTML =
    '<div class="ud-stage card"><canvas id="ud-canvas" role="img" aria-label="' + T.canvas + '"></canvas>' +
    '<div class="ud-hud"><span id="ud-dist"></span><span id="ud-best"></span><span id="ud-coins"></span></div>' +
    '<div class="ud-msg" id="ud-msg"></div></div>' +
    '<div class="ud-controls"><button class="btn ud-main" id="ud-main"></button>' +
    '<p class="ud-info" id="ud-info"></p><p class="ud-keys">' + T.keys + '</p></div>' +
    '<div class="card ud-up"><div class="ud-up-head"><h2>' + T.upgrades + '</h2><span id="ud-wallet"></span></div><ul id="ud-list"></ul></div>';
  canvas = document.getElementById('ud-canvas');
  ctx = canvas.getContext('2d');
  var mainBtn = document.getElementById('ud-main'), msgEl = document.getElementById('ud-msg'), live = document.getElementById('live');

  function say(text) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = text; }, 30); } }
  function windText() {
    if (!WIND) return T.wind + ': ' + T.calm;
    return T.wind + ': ' + Math.abs(WIND) + ' m/s ' + (WIND > 0 ? T.tail : T.head);
  }
  function goalText() { return P.goal === DAY ? fmt(T.goal_done, { c: GOAL_COINS }) : fmt(T.goal, { n: GOAL }); }
  function cost(i) { return Math.round([30, 30, 40, 40, 25, 60][i] * Math.pow(1.7, P.up[i])); }
  var MAXLV = [5, 5, 5, 5, 5, 3];

  function renderUpgrades() {
    document.getElementById('ud-wallet').textContent = T.coins + ': ' + P.coins;
    document.getElementById('ud-list').innerHTML = T.up.map(function (u, i) {
      var lv = P.up[i], maxed = lv >= MAXLV[i], c = cost(i), can = !maxed && P.coins >= c && phase !== 'fly';
      return '<li><div><b>' + u[0] + '</b> <span class="lv">' + fmt(T.level, { n: lv }) + '</span><small>' + u[1] + '</small></div>' +
        '<button class="btn ' + (can ? '' : 'ghost') + '" data-up="' + i + '"' + (can ? '' : ' disabled') + '>' +
        (maxed ? T.max : can ? fmt(T.buy, { c: c }) : fmt(T.need, { c: c })) + '</button></li>';
    }).join('');
  }
  function hud() {
    var d = plane ? Math.max(0, Math.round(plane.x)) : 0;
    document.getElementById('ud-dist').textContent = T.distance + ' ' + d + ' m';
    document.getElementById('ud-best').textContent = T.best + ' ' + P.best + ' m';
    document.getElementById('ud-coins').textContent = T.coins + ' ' + P.coins + (flight ? ' (+' + flight.coins + ')' : '');
  }
  function setPhase(p) {
    phase = p;
    mainBtn.textContent = p === 'aim' ? T.set_angle : p === 'power' ? T.set_power : p === 'fly' ? T.flying : T.again;
    mainBtn.disabled = p === 'fly';
    document.getElementById('ud-info').textContent = windText() + ' · ' + goalText();
    if (p === 'aim') { msgEl.textContent = T.aim; say(T.aim); }
    if (p === 'power') { msgEl.textContent = T.power; say(T.power); }
    if (p === 'fly') msgEl.textContent = '';
    renderUpgrades();
    hud();
  }
  function launch() {
    k = params();
    var v = k.v0 * (0.45 + 0.55 * power), a = angle * Math.PI / 180;
    plane = { x: 0, y: 2, rx: v * Math.cos(a), ry: v * Math.sin(a), t: 0 };
    flight = { coins: 0, shields: k.shields, max: 2 };
    setPhase('fly');
  }
  function land(reason) {
    var d = Math.max(0, Math.round(plane.x)), z = zoneOf(plane.x);
    var earned = Math.floor(d / 10) + flight.coins, lines = [];
    lines.push(fmt(T.result, { d: d }));
    if (d > P.best) { P.best = d; lines.push(T.new_best); }
    if (d >= GOAL && P.goal !== DAY) { P.goal = DAY; earned += GOAL_COINS; lines.push(fmt(T.goal_bonus, { c: GOAL_COINS })); }
    P.coins += earned;
    lines.push(fmt(T.earned, { c: earned }));
    lines.push(reason ? fmt(T.crashed, { o: T.obstacles[reason], z: T.zones_in[z] }) : fmt(T.landed, { z: T.zones_in[z] }));
    save();
    flight.done = lines;
    msgEl.innerHTML = '<b>' + lines[0] + '</b>' + lines.slice(1).map(function (l) { return '<span>' + l + '</span>'; }).join('');
    say(lines.join('. '));
    setPhase('done');
    mainBtn.focus();
  }
  function advance() {
    if (phase === 'aim') setPhase('power');
    else if (phase === 'power') launch();
    else if (phase === 'done') { plane = null; flight = null; msgEl.textContent = ''; setPhase('aim'); }
  }

  /* ---------- loop ---------- */
  function tick(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    osc += dt;
    if (phase === 'aim') angle = 32 + 27 * Math.sin(osc * 1.6);        // 5..59 degrees
    if (phase === 'power') power = 0.5 - 0.5 * Math.cos(osc * 2.4);     // 0..1
    if (phase === 'fly') {
      for (var i = 0; i < 4 && phase === 'fly'; i++) {
        step(plane, k, dt / 4);
        flight.max = Math.max(flight.max, plane.y);
        // coins
        for (var c = 0; c < coinsW.length; c++) {
          var cn = coinsW[c];
          if (!cn.got && Math.abs(cn.x - plane.x) < 60 && Math.hypot(cn.x - plane.x, cn.y - plane.y) < k.magnet) { cn.got = true; flight.coins += 5; }
        }
        // obstacles
        for (var o = 0; o < obstacles.length; o++) {
          var ob = obstacles[o];
          if (plane.x > ob.x && plane.x < ob.x + ob.w && plane.y > ob.y && plane.y < ob.y + ob.h && !ob.hit) {
            if (flight.shields > 0) {
              flight.shields--; ob.hit = true; plane.rx *= 0.55; plane.ry = Math.abs(plane.ry) * 0.3 + 2;
              msgEl.textContent = T.hit;
            } else { land(ob.k); return requestAnimationFrame(tick); }
          }
        }
        if (plane.y <= groundAt(plane.x) || plane.x < -5 || plane.x > LENGTH - 50) { land(null); return requestAnimationFrame(tick); }
      }
      hud();
    }
    draw();
    requestAnimationFrame(tick);
  }

  /* ---------- drawing ---------- */
  var SKY = [['#9CC7F0', '#E8F4FF'], ['#8FB3E6', '#E3ECFA'], ['#7FB8E6', '#DFF3FF'], ['#8AA6D8', '#E9E3F5'], ['#5F7BD0', '#C9C7F0']];
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(300, r.width); H = Math.max(220, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function draw() {
    var px = plane ? plane.x : 0, py = plane ? plane.y : 2;
    var ppm = H / 42;                                     // pixels per meter
    var camX = px - (W * 0.32) / ppm;
    var camY = Math.max(-2.5, py - 26, groundAt(px) - 6);  // bottom of the view, in meters
    function sx(x) { return (x - camX) * ppm; }
    function sy(y) { return H - (y - camY) * ppm; }
    var z = zoneOf(Math.max(0, px));
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, SKY[z][0]); grad.addColorStop(1, SKY[z][1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    var x0 = camX - 10, x1 = camX + W / ppm + 10;
    // distant clouds, moving at a third of the speed (parallax)
    if (z < 4) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (var ci = 0; ci < 7; ci++) {
        var cxp = ((ci * 173 - camX * ppm * 0.3) % (W + 200) + W + 200) % (W + 200) - 100, cyp = 30 + (ci * 47) % (H * 0.45);
        ctx.beginPath(); ctx.ellipse(cxp, cyp, 38, 13, 0, 0, 7); ctx.ellipse(cxp + 24, cyp - 7, 26, 12, 0, 0, 7); ctx.fill();
      }
    }
    // drafts
    drafts.forEach(function (d) {
      if (d.x + d.w < x0 || d.x - d.w > x1) return;
      ctx.fillStyle = d.s > 0 ? 'rgba(255,255,255,0.22)' : 'rgba(43,49,85,0.12)';
      ctx.fillRect(sx(d.x - d.w / 2), sy(d.top), d.w * ppm, (d.top - camY + 5) * ppm);
      ctx.strokeStyle = d.s > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(43,49,85,0.35)';
      ctx.lineWidth = 2;
      for (var j = 0; j < 3; j++) {
        var ax = d.x - d.w / 4 + j * d.w / 4, phaseY = ((osc * 6 * Math.sign(d.s)) % 10 + 10) % 10;
        for (var yy = camY + phaseY; yy < Math.min(d.top, camY + 75); yy += 10) {
          var dir = d.s > 0 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(sx(ax) - 4, sy(yy)); ctx.lineTo(sx(ax), sy(yy + 2.5 * dir)); ctx.lineTo(sx(ax) + 4, sy(yy)); ctx.stroke();
        }
      }
    });
    // ground / sea / mountains / cloud floor
    ctx.beginPath(); ctx.moveTo(0, H);
    for (var gx = 0; gx <= W; gx += 6) { var wx = camX + gx / ppm; ctx.lineTo(gx, sy(groundAt(wx))); }
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = ['#7CC47A', '#9AA3B8', '#3E8ED0', '#8C8A78', '#FFFFFF'][z];
    if (z === 2) { var sea = ctx.createLinearGradient(0, sy(0), 0, H); sea.addColorStop(0, '#4FA3E0'); sea.addColorStop(1, '#2E6FB0'); ctx.fillStyle = sea; }
    ctx.fill();
    // obstacles
    obstacles.forEach(function (ob) {
      if (ob.x + ob.w < x0 || ob.x > x1) return;
      var X = sx(ob.x), Y = sy(ob.y + ob.h), Wd = ob.w * ppm, Hd = ob.h * ppm;
      if (ob.k === 'tree') {
        ctx.fillStyle = '#8A5A3B'; ctx.fillRect(X + Wd * 0.38, Y + Hd * 0.45, Wd * 0.24, Hd * 0.55);
        ctx.fillStyle = '#3F9B4F'; ctx.beginPath(); ctx.arc(X + Wd / 2, Y + Hd * 0.35, Math.max(Wd, Hd * 0.45) * 0.75, 0, 7); ctx.fill();
      } else if (ob.k === 'building') {
        ctx.fillStyle = '#5B6584'; ctx.fillRect(X, Y, Wd, Hd);
        ctx.fillStyle = 'rgba(255,230,150,0.75)';
        for (var wy = Y + 6; wy < Y + Hd - 6; wy += 12) for (var wxx = X + 5; wxx < X + Wd - 6; wxx += 10) ctx.fillRect(wxx, wy, 5, 6);
      } else if (ob.k === 'mast') {
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(X - Wd * 2, sy(1.5), Wd * 5, 1.5 * ppm);
        ctx.fillStyle = '#6B4A35'; ctx.fillRect(X + Wd * 0.3, Y, Wd * 0.4, Hd);
        ctx.fillStyle = '#FF6B5B'; ctx.beginPath(); ctx.moveTo(X + Wd * 0.7, Y + 4); ctx.lineTo(X + Wd * 3, Y + Hd * 0.5); ctx.lineTo(X + Wd * 0.7, Y + Hd * 0.6); ctx.fill();
      } else if (ob.k === 'peak') {
        ctx.fillStyle = '#6E6C5E'; ctx.beginPath(); ctx.moveTo(X, sy(ob.y)); ctx.lineTo(X + Wd / 2, Y); ctx.lineTo(X + Wd, sy(ob.y)); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(X + Wd * 0.38, Y + Hd * 0.25); ctx.lineTo(X + Wd / 2, Y); ctx.lineTo(X + Wd * 0.62, Y + Hd * 0.25); ctx.fill();
      } else {
        ctx.fillStyle = '#5A5F7A';
        for (var b = 0; b < 4; b++) { ctx.beginPath(); ctx.arc(X + Wd * (0.2 + b * 0.2), Y + Hd * (b % 2 ? 0.4 : 0.6), Hd * 0.45, 0, 7); ctx.fill(); }
      }
    });
    // coins
    coinsW.forEach(function (cn) {
      if (cn.got || cn.x < x0 || cn.x > x1) return;
      ctx.fillStyle = '#F2B300'; ctx.beginPath(); ctx.arc(sx(cn.x), sy(cn.y), Math.max(4, 0.9 * ppm), 0, 7); ctx.fill();
      ctx.strokeStyle = '#C98A00'; ctx.lineWidth = 1.5; ctx.stroke();
    });
    // zone markers
    for (var zi = 1; zi < ZONE_AT.length; zi++) {
      var zx = ZONE_AT[zi];
      if (zx < x0 || zx > x1) continue;
      ctx.fillStyle = 'rgba(43,49,85,0.75)'; ctx.font = '600 13px Poppins, "Noto Sans KR", sans-serif';
      ctx.fillText(T.zones[zi] + ' · ' + zx + ' m', sx(zx) + 4, 22);
      ctx.fillRect(sx(zx), 0, 2, H);
    }
    // launcher: a small figure at x = 0
    if (0 > x0 && 0 < x1) {
      ctx.fillStyle = '#2B3155';
      ctx.beginPath(); ctx.arc(sx(-1), sy(2.6), 0.45 * ppm, 0, 7); ctx.fill();
      ctx.fillRect(sx(-1.3), sy(2.1), 0.6 * ppm, 2.1 * ppm);
    }
    // aim line and power gauge
    if (phase === 'aim' || phase === 'power') {
      var a = angle * Math.PI / 180, len = Math.min(110, W * 0.25);
      ctx.strokeStyle = '#FF6B5B'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(sx(0), sy(2)); ctx.lineTo(sx(0) + Math.cos(a) * len, sy(2) - Math.sin(a) * len); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2B3155'; ctx.font = '700 14px Poppins, sans-serif';
      ctx.fillText(Math.round(angle) + '°', sx(0) + Math.cos(a) * len + 6, sy(2) - Math.sin(a) * len);
      if (phase === 'power') {
        var gxp = 14, gyp = 14, gw = Math.min(200, W * 0.45);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(gxp, gyp, gw, 16);
        var pg = ctx.createLinearGradient(gxp, 0, gxp + gw, 0); pg.addColorStop(0, '#7FD18B'); pg.addColorStop(0.7, '#F2B300'); pg.addColorStop(1, '#FF6B5B');
        ctx.fillStyle = pg; ctx.fillRect(gxp, gyp, gw * power, 16);
        ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 2; ctx.strokeRect(gxp, gyp, gw, 16);
      }
    }
    // the plane
    var pa = plane ? Math.atan2(plane.ry, plane.rx) : angle * Math.PI / 180;
    var PX = sx(px), PY = sy(py);
    ctx.save(); ctx.translate(PX, PY); ctx.rotate(-pa);
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -7); ctx.lineTo(-6, 0); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, 0); ctx.stroke();
    ctx.restore();
    if (plane && phase === 'fly') {
      ctx.fillStyle = 'rgba(43,49,85,0.8)'; ctx.font = '600 12px Poppins, sans-serif';
      ctx.fillText(T.height + ' ' + Math.round(plane.y) + ' m', 12, H - 12);
    }
  }

  /* ---------- input ---------- */
  mainBtn.addEventListener('click', advance);
  canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); advance(); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && !(e.target.closest && e.target.closest('button,a,input'))) { e.preventDefault(); advance(); }
  });
  document.getElementById('ud-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-up]');
    if (!b || b.disabled) return;
    var i = +b.getAttribute('data-up'), c = cost(i);
    if (P.coins < c || P.up[i] >= MAXLV[i] || phase === 'fly') return;
    P.coins -= c; P.up[i]++; save(); renderUpgrades(); hud();
    var again = document.querySelector('[data-up="' + i + '"]'); if (again && !again.disabled) again.focus();
  });
  window.addEventListener('resize', resize);
  resize();
  setPhase('aim');
  requestAnimationFrame(tick);

  // exposed for automated tests only
  window.__updraft = { launchWith: function (a, pw) { angle = a; power = pw; launch(); }, C: C, step: step, params: params, P: P, groundAt: groundAt, drafts: drafts, obstacles: obstacles, WIND: WIND, GOAL: GOAL, zoneOf: zoneOf };
})();
