/* Updraft (browser version): aim, power up and launch a paper plane, then ride the air as far as it goes.
   Source: _src/updraft/app.js, copied to play/updraft/ by build.py (build_updraft). The page is an ordinary site page
   (/play/updraft/ in English, /ko/play/updraft/ in Korean); this script draws the game on a canvas in #ud-app.
   The camera follows the plane from behind. World units are meters and seconds. The sky (layout and wind) is the same for everyone on a given day. */
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
  function fly(dt) {
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
            } else { land(ob.k); return; }
          }
        }
        if (plane.y <= groundAt(plane.x) || plane.x < -5 || plane.x > LENGTH - 50) { land(null); return; }
      }
      hud();
    }
  }
  function tick(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    osc += dt;
    if (phase === 'aim') angle = 32 + 27 * Math.sin(osc * 1.6);        // 5..59 degrees
    if (phase === 'power') power = 0.5 - 0.5 * Math.cos(osc * 2.4);     // 0..1
    fly(dt);
    draw();
    requestAnimationFrame(tick);
  }

  /* ---------- drawing: a chase camera behind the plane ---------- */
  // x runs forward (the distance), y is up and z is sideways; the flight itself only uses x and y, and the plane
  // just sways a little sideways for the look of it. Scenery beside the flight line is decoration.
  var SKY = [['#9CC7F0', '#E8F4FF'], ['#8FB3E6', '#E3ECFA'], ['#7FB8E6', '#DFF3FF'], ['#8AA6D8', '#E9E3F5'], ['#5F7BD0', '#C9C7F0']];
  var LAND = [['#86CC84', '#7CC47A'], ['#A3ABBE', '#9AA3B8'], ['#4FA3E0', '#4597D6'], ['#959383', '#8C8A78'], ['#FFFFFF', '#F1F0FA']];
  var F = 1, HZ = 0, BACK = 10, FAR = 320, cam = null;
  function resize() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(300, r.width); H = Math.max(240, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.min(W * 0.9, H * 1.05);
  }
  function hash(n) { var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function sway(t) { return { z: Math.sin(t * 0.8) * 0.9, roll: Math.cos(t * 0.8) * 0.18 }; }
  function pj(x, y, z) { var dz = Math.max(0.4, x - cam.x), k = F / dz; return [W / 2 + (z - cam.z) * k, HZ - (y - cam.y) * k, k]; }
  function poly(pts, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function fogA(x) { return Math.max(0, Math.min(1, (x - cam.x) / FAR)); }
  function draw() {
    var px = plane ? plane.x : 0, py = plane ? plane.y : 2, sw = plane ? sway(plane.t) : { z: 0, roll: 0 };
    var pitch = plane ? Math.atan2(plane.ry, plane.rx) : (phase === 'aim' || phase === 'power' ? angle * Math.PI / 180 * 0.5 : 0);
    if (!cam || !plane) cam = { x: px - BACK, y: py + 2.4, z: 0, p: pitch };
    cam.x = px - BACK; cam.y += (Math.max(py + 2.4, groundAt(px) + 3) - cam.y) * 0.15; cam.z += (sw.z * 0.5 - cam.z) * 0.1;
    cam.p += (Math.max(-0.5, Math.min(0.5, pitch)) - cam.p) * 0.06;
    HZ = H * 0.42 + cam.p * H * 0.3;  // tilting with the flight: climbing shows more sky, diving more ground
    var z = zoneOf(Math.max(0, px));
    // sky, with clouds drifting past
    var grad = ctx.createLinearGradient(0, 0, 0, Math.max(10, HZ));
    grad.addColorStop(0, SKY[z][0]); grad.addColorStop(1, SKY[z][1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (var ci = 0; ci < 6; ci++) {
      var cxp = ((ci * 173 - cam.z * 40 - px * 0.6) % (W + 200) + W + 200) % (W + 200) - 100, cyp = HZ - 30 - (ci * 47) % Math.max(20, HZ * 0.8);
      if (cyp < -20) continue;
      ctx.beginPath(); ctx.ellipse(cxp, cyp, 38, 12, 0, 0, 7); ctx.ellipse(cxp + 24, cyp - 7, 26, 11, 0, 0, 7); ctx.fill();
    }
    // far hills on the horizon (none over the sea or above the clouds)
    if (z !== 2 && z !== 4) {
      ctx.fillStyle = z === 3 ? '#A9A6C4' : z === 1 ? '#B4BBD0' : '#A7CFA0';
      ctx.beginPath(); ctx.moveTo(0, HZ + 1);
      for (var fx = 0; fx <= W + 8; fx += 8) {
        var u = fx + cam.z * 30 + px * 0.05;
        ctx.lineTo(fx, HZ - Math.max(0, Math.sin(u * 0.012) * (z === 3 ? 34 : 16) + Math.sin(u * 0.031) * 7));
      }
      ctx.lineTo(W, HZ + 1); ctx.fill();
    }
    // the ground (or sea, or cloud sea) in bands from far to near, each filled down to the bottom of the view
    var xs = [], gx = cam.x + 1;
    while (gx < cam.x + FAR) { xs.push(gx); gx += 1.2 + (gx - cam.x) * 0.04; }
    xs.push(cam.x + FAR);
    for (var bi = xs.length - 2; bi >= 0; bi--) {
      var xa = xs[bi], xb = xs[bi + 1], gz = zoneOf(Math.max(0, xa));
      var ya = pj(xa, groundAt(xa), 0)[1], yb = pj(xb, groundAt(xb), 0)[1];
      var top = Math.min(ya, yb);
      if (top > H) continue;
      var band = Math.floor((xa + xb) / 2 / 10) % 2;
      ctx.fillStyle = LAND[gz][band];
      ctx.fillRect(0, top, W, H - top + 1);
      ctx.globalAlpha = fogA(xa) * 0.75; ctx.fillStyle = SKY[gz][1]; ctx.fillRect(0, top, W, H - top + 1); ctx.globalAlpha = 1;
    }
    // the things in the world, from far to near; the plane goes in at its own distance
    var items = [];
    var CH = 14;
    for (var c = Math.floor(cam.x / CH); c * CH < cam.x + FAR; c++) {
      if (c * CH < -40) continue;
      items.push({ x: c * CH + hash(c) * CH, f: scenery, c: c });
    }
    drafts.forEach(function (d) { if (d.x > cam.x + 2 && d.x < cam.x + FAR) items.push({ x: d.x, f: drawDraft, o: d }); });
    obstacles.forEach(function (ob) { if (ob.x + ob.w > cam.x + 1 && ob.x < cam.x + FAR) items.push({ x: ob.x + ob.w, f: drawObstacle, o: ob }); });  // sorted by the far side, so a plane inside one stays in view
    coinsW.forEach(function (cn) { if (!cn.got && cn.x > cam.x + 1 && cn.x < cam.x + FAR * 0.6) items.push({ x: cn.x, f: drawCoin, o: cn }); });
    for (var zi = 1; zi < ZONE_AT.length; zi++) if (ZONE_AT[zi] > cam.x + 2 && ZONE_AT[zi] < cam.x + FAR) items.push({ x: ZONE_AT[zi], f: drawGate, o: zi });
    items.push({ x: px, f: drawPlane });
    items.sort(function (a, b2) { return b2.x - a.x; });
    items.forEach(function (it) { it.f(it); });

    function scenery(it) {
      // a pair of things on either side of the flight line: trees, buildings, buoys, rocks or cloud puffs
      var x = it.x, gzz = zoneOf(Math.max(0, x)), g = groundAt(x), fa = fogA(x);
      for (var side = -1; side <= 1; side += 2) {
        var h1 = hash(it.c * 2 + side), h2 = hash(it.c * 3 + side * 7);
        var zz = side * (9 + h1 * 45), base = pj(x, g, zz), k = base[2];
        if (base[0] < -200 || base[0] > W + 200) continue;
        ctx.globalAlpha = 1 - fa * 0.8;
        if (gzz === 0) {
          var th = (4 + h2 * 4) * k;
          ctx.fillStyle = '#8A5A3B'; ctx.fillRect(base[0] - 0.3 * k, base[1] - th * 0.5, 0.6 * k, th * 0.5);
          ctx.fillStyle = h2 > 0.5 ? '#3F9B4F' : '#58AE5C'; ctx.beginPath(); ctx.arc(base[0], base[1] - th * 0.62, th * 0.36, 0, 7); ctx.fill();
        } else if (gzz === 1) {
          var bw = (6 + h2 * 8) * k, bh = (10 + h1 * 30) * k;
          ctx.fillStyle = h2 > 0.5 ? '#6B7596' : '#7F89A8'; ctx.fillRect(base[0] - bw / 2, base[1] - bh, bw, bh);
          if (k > 2) {
            ctx.fillStyle = 'rgba(255,230,150,0.7)';
            for (var wy = base[1] - bh + 0.8 * k; wy < base[1] - k; wy += 2.4 * k) for (var wx = base[0] - bw / 2 + 0.8 * k; wx < base[0] + bw / 2 - k; wx += 2 * k) ctx.fillRect(wx, wy, 0.9 * k, 1.1 * k);
          }
        } else if (gzz === 2) {
          if (h2 < 0.6) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(base[0] - 2 * k, base[1] - 0.15 * k, 4 * k, 0.3 * k); }
          else { ctx.fillStyle = '#FF6B5B'; ctx.beginPath(); ctx.arc(base[0], base[1] - 0.5 * k, 0.6 * k, 0, 7); ctx.fill(); }
        } else if (gzz === 3) {
          var rh = (6 + h2 * 18) * k, rw = (8 + h1 * 10) * k;
          poly([[base[0] - rw / 2, base[1]], [base[0], base[1] - rh], [base[0] + rw / 2, base[1]]], h2 > 0.5 ? '#7B7967' : '#8C8A78');
          poly([[base[0] - rw * 0.14, base[1] - rh * 0.72], [base[0], base[1] - rh], [base[0] + rw * 0.14, base[1] - rh * 0.72]], '#FFFFFF');
        } else {
          var cr = (2.5 + h2 * 3) * k;
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.ellipse(base[0], base[1] - cr * 0.2, cr * 1.6, cr * 0.6, 0, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    function drawDraft(it) {
      var d = it.o, near = pj(d.x, groundAt(d.x), 0), topP = pj(d.x, d.top, 0), k = near[2];
      var half = Math.max(3, d.w * 0.3) * k, up = d.s > 0;
      var y0 = Math.max(-10, topP[1]), y1 = Math.min(H + 10, near[1]);
      if (y1 <= y0) return;
      var gr = ctx.createLinearGradient(near[0] - half, 0, near[0] + half, 0);
      var c1 = up ? 'rgba(255,255,255,' : 'rgba(43,49,85,';
      gr.addColorStop(0, c1 + '0)'); gr.addColorStop(0.5, c1 + (up ? '0.32)' : '0.16)')); gr.addColorStop(1, c1 + '0)');
      ctx.fillStyle = gr; ctx.fillRect(near[0] - half, y0, half * 2, y1 - y0);
      // chevrons moving up (or down) the column
      ctx.strokeStyle = up ? 'rgba(255,255,255,0.85)' : 'rgba(43,49,85,0.4)'; ctx.lineWidth = Math.max(1.2, Math.min(3, k * 0.25));
      var step = 6, ph = ((osc * 5 * (up ? 1 : -1)) % step + step) % step, ar = Math.min(half * 0.5, 2 * k);
      for (var yy = groundAt(d.x) + ph; yy < d.top; yy += step) {
        var q = pj(d.x, yy, 0);
        if (q[1] < -10 || q[1] > H + 10) continue;
        var dir = up ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(q[0] - ar, q[1]); ctx.lineTo(q[0], q[1] + dir * ar * 0.6); ctx.lineTo(q[0] + ar, q[1]); ctx.stroke();
      }
    }
    function drawObstacle(it) {
      var ob = it.o, x = Math.max(ob.x, cam.x + 1), fa = fogA(x);
      ctx.globalAlpha = 1 - fa * 0.7;
      if (ob.k === 'building') {
        var hw = 7, A = pj(x, ob.y, -hw), B = pj(x, ob.y + ob.h, hw), back = pj(ob.x + ob.w, ob.y + ob.h, -hw), backR = pj(ob.x + ob.w, ob.y + ob.h, hw);
        if (cam.y > ob.y + ob.h) poly([[A[0], B[1]], [B[0], B[1]], [backR[0], backR[1]], [back[0], back[1]]], '#8A93B0');  // the roof
        ctx.fillStyle = '#5B6584'; ctx.fillRect(A[0], B[1], B[0] - A[0], A[1] - B[1]);
        var k = A[2];
        if (k > 1.5) {
          ctx.fillStyle = 'rgba(255,230,150,0.75)';
          for (var wy = B[1] + k; wy < A[1] - k; wy += 3 * k) for (var wx = A[0] + k; wx < B[0] - k; wx += 2.6 * k) ctx.fillRect(wx, wy, 1.2 * k, 1.5 * k);
        }
      } else {
        var mid = pj(ob.x + ob.w / 2, ob.y, 0), k2 = mid[2], top = mid[1] - ob.h * k2;
        if (ob.k === 'tree') {
          ctx.fillStyle = '#8A5A3B'; ctx.fillRect(mid[0] - 0.45 * k2, mid[1] - ob.h * 0.5 * k2, 0.9 * k2, ob.h * 0.5 * k2);
          ctx.fillStyle = '#2F8A45'; ctx.beginPath(); ctx.arc(mid[0], top + ob.h * 0.36 * k2, ob.h * 0.4 * k2, 0, 7); ctx.fill();
        } else if (ob.k === 'mast') {
          ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mid[0] - 3 * k2, mid[1] - 1.2 * k2, 6 * k2, 1.2 * k2);
          ctx.fillStyle = '#6B4A35'; ctx.fillRect(mid[0] - 0.2 * k2, top, 0.4 * k2, ob.h * k2);
          poly([[mid[0] + 0.3 * k2, top + 0.5 * k2], [mid[0] + 3.5 * k2, top + ob.h * 0.55 * k2], [mid[0] + 0.3 * k2, top + ob.h * 0.65 * k2]], '#FF6B5B');
        } else if (ob.k === 'peak') {
          var pw = (ob.w + 14) * k2 / 2;
          poly([[mid[0] - pw, mid[1]], [mid[0], top], [mid[0] + pw, mid[1]]], '#6E6C5E');
          poly([[mid[0] - pw * 0.24, top + ob.h * 0.24 * k2], [mid[0], top], [mid[0] + pw * 0.24, top + ob.h * 0.24 * k2]], '#FFFFFF');
        } else {
          ctx.fillStyle = '#5A5F7A';
          for (var bb = 0; bb < 5; bb++) { ctx.beginPath(); ctx.arc(mid[0] + (bb - 2) * ob.h * 0.45 * k2, top + ob.h * (bb % 2 ? 0.4 : 0.6) * k2, ob.h * 0.45 * k2, 0, 7); ctx.fill(); }
        }
      }
      ctx.globalAlpha = 1;
    }
    function drawCoin(it) {
      var q = pj(it.o.x, it.o.y, 0), r = Math.max(2, 0.9 * q[2]);
      if (q[1] < -r || q[1] > H + r) return;
      ctx.fillStyle = '#F2B300'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r * Math.abs(Math.cos(osc * 3 + it.o.x)) + 1, r, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#C98A00'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    function drawGate(it) {
      var x = it.x, g = groundAt(x), L = pj(x, g, -14), R2 = pj(x, g + 12, 14), k = L[2];
      ctx.fillStyle = 'rgba(43,49,85,0.75)';
      ctx.fillRect(L[0] - 0.4 * k, R2[1], 0.8 * k, L[1] - R2[1]); ctx.fillRect(R2[0] - 0.4 * k, R2[1], 0.8 * k, L[1] - R2[1]);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(L[0], R2[1], R2[0] - L[0], 2.2 * k);
      if (k > 0.6) {
        ctx.fillStyle = '#2B3155'; ctx.font = '700 ' + Math.min(26, Math.max(9, 1.5 * k)) + 'px Poppins, "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(T.zones[it.o] + ' · ' + ZONE_AT[it.o] + ' m', (L[0] + R2[0]) / 2, R2[1] + 1.65 * k); ctx.textAlign = 'left';
      }
    }
    function drawPlane() {
      // its shadow on the ground, then the plane seen from behind: two wings and the fold below
      var g = groundAt(px), sh = pj(px, g, sw.z), q = pj(px, py, sw.z), k = q[2];
      if (sh[1] < H + 20 && sh[1] > q[1]) {
        var fade = Math.max(0.15, 1 - (py - g) / 40);
        ctx.fillStyle = 'rgba(43,49,85,' + (0.25 * fade).toFixed(3) + ')'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 1.1 * k, 0.35 * k, 0, 0, 7); ctx.fill();
      }
      var s = 1.25 * k, lift = Math.sin(pitch) * 0.5;
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(sw.roll);
      ctx.lineJoin = 'round'; ctx.strokeStyle = '#2B3155'; ctx.lineWidth = Math.max(1.5, s * 0.05);
      poly([[0, -s * 0.06], [0, s * (0.42 + lift * 0.3)], [-s * 0.08, s * 0.05]], '#D9DCEC'); ctx.stroke();
      poly([[0, -s * 0.06], [-s, -s * (0.16 + lift * 0.2)], [-s * 0.95, -s * (0.05 + lift * 0.2)], [0, s * 0.12]], '#FFFFFF'); ctx.stroke();
      poly([[0, -s * 0.06], [s, -s * (0.16 + lift * 0.2)], [s * 0.95, -s * (0.05 + lift * 0.2)], [0, s * 0.12]], '#F4F5FB'); ctx.stroke();
      ctx.restore();
    }

    // aiming: a dotted path along the launch angle, the angle gauge and the power gauge
    if (phase === 'aim' || phase === 'power') {
      var a = angle * Math.PI / 180;
      ctx.fillStyle = '#FF6B5B';
      for (var dd = 3; dd < 40; dd += 2.5) { var p3 = pj(dd * Math.cos(a), 2 + dd * Math.sin(a), 0); ctx.beginPath(); ctx.arc(p3[0], p3[1], Math.max(1.5, Math.min(5, 0.25 * p3[2])), 0, 7); ctx.fill(); }
      var gx0 = 18, gy0 = H - 18, gr2 = Math.min(70, H * 0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.88)'; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.arc(gx0, gy0, gr2 + 8, -Math.PI / 2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0 + Math.cos(a) * gr2, gy0 - Math.sin(a) * gr2); ctx.stroke();
      ctx.fillStyle = '#2B3155'; ctx.font = '700 15px Poppins, sans-serif'; ctx.fillText(Math.round(angle) + '°', gx0 + 10, gy0 - 8);
      if (phase === 'power') {
        var gw = Math.min(200, W * 0.45), gxp = W / 2 - gw / 2, gyp = H - 34;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(gxp, gyp, gw, 16);
        var pg = ctx.createLinearGradient(gxp, 0, gxp + gw, 0); pg.addColorStop(0, '#7FD18B'); pg.addColorStop(0.7, '#F2B300'); pg.addColorStop(1, '#FF6B5B');
        ctx.fillStyle = pg; ctx.fillRect(gxp, gyp, gw * power, 16);
        ctx.strokeStyle = '#2B3155'; ctx.lineWidth = 2; ctx.strokeRect(gxp, gyp, gw, 16);
      }
    }
    if (plane && phase === 'fly') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(8, H - 30, 108, 22);
      ctx.fillStyle = '#2B3155'; ctx.font = '600 12px Poppins, "Noto Sans KR", sans-serif';
      ctx.fillText(T.height + ' ' + Math.round(plane.y - groundAt(plane.x)) + ' m', 16, H - 15);
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
  window.__updraft = { fly: fly, plane: function () { return plane; }, phase: function () { return phase; }, launchWith: function (a, pw) { angle = a; power = pw; launch(); }, C: C, step: step, params: params, P: P, groundAt: groundAt, drafts: drafts, obstacles: obstacles, WIND: WIND, GOAL: GOAL, zoneOf: zoneOf };
})();
