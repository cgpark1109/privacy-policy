// Tests for the quiz rules in shared/logic.js (the same file the games load).
//   node _src/webgames/test_logic.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('./shared/logic.js');
const C = JSON.parse(fs.readFileSync(path.join(HERE, 'countries.json'), 'utf8')).countries;
const MODES = ['classic', 'reverse'];

let passed = 0;
const failed = [];
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); } catch (e) { failed.push(name); console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('stars: 0 wrong = 3, 1 wrong = 2, 2..5 wrong = 1 (result_screen.dart)', () => {
  assert.equal(L.starsFor(0), 3);
  assert.equal(L.starsFor(1), 2);
  for (const w of [2, 3, 4, 5]) assert.equal(L.starsFor(w), 1);
});

test('new progress: level 1 unlocked, no stars, separate per mode', () => {
  const p = L.normalizeProgress(null, MODES);
  for (const m of MODES) {
    assert.equal(p.modes[m].max, 1);
    assert.deepEqual(p.modes[m].stars, {});
    assert.equal(L.levelState(p.modes[m], 1), 'current');
    assert.equal(L.levelState(p.modes[m], 2), 'locked');
  }
});

test('finishing a level unlocks the next one whatever the score (unlockNextLevel)', () => {
  const p = L.normalizeProgress(null, MODES);
  L.recordResult(p, 'classic', 1, L.starsFor(5), 39);
  assert.equal(p.modes.classic.max, 2);
  assert.equal(p.modes.classic.stars[1], 1);
  assert.equal(L.levelState(p.modes.classic, 1), 'done');
  assert.equal(L.levelState(p.modes.classic, 2), 'current');
  assert.equal(p.modes.reverse.max, 1, 'the other mode is untouched');
});

test('stars keep the best result (saveStars only if higher)', () => {
  const p = L.normalizeProgress(null, MODES);
  L.recordResult(p, 'classic', 1, 2, 39);
  L.recordResult(p, 'classic', 1, 1, 39);
  assert.equal(p.modes.classic.stars[1], 2);
  L.recordResult(p, 'classic', 1, 3, 39);
  assert.equal(p.modes.classic.stars[1], 3);
  L.recordResult(p, 'classic', 1, 9, 39);
  assert.equal(p.modes.classic.stars[1], 3, 'clamped to 3');
});

test('replaying an old level never lowers the unlocked level; last level caps it', () => {
  const p = L.normalizeProgress(null, MODES);
  for (let lv = 1; lv <= 5; lv++) L.recordResult(p, 'classic', lv, 3, 39);
  assert.equal(p.modes.classic.max, 6);
  L.recordResult(p, 'classic', 2, 1, 39);
  assert.equal(p.modes.classic.max, 6);
  L.recordResult(p, 'reverse', 38, 3, 38);
  assert.equal(p.modes.reverse.max, 38);
});

test('summary and suggested level', () => {
  const p = L.normalizeProgress(null, MODES);
  assert.equal(L.suggestedLevel(p.modes.classic, 39), 1);
  L.recordResult(p, 'classic', 1, 3, 39);
  L.recordResult(p, 'classic', 2, 2, 39);
  const s = L.summary(p.modes.classic, 39);
  assert.deepEqual(s, { unlocked: 3, completed: 2, perfect: 1, stars: 5, maxStars: 117, levelCount: 39 });
  assert.equal(L.suggestedLevel(p.modes.classic, 39), 3, 'newest unlocked level without stars');
  const q = L.normalizeProgress({ modes: { classic: { max: 3, stars: { 1: 3, 2: 2, 3: 3 } } } }, MODES);
  assert.equal(L.suggestedLevel(q.modes.classic, 3), 2, 'all done: first level without 3 stars');
});

test('stored progress is validated (bad or foreign data cannot break the game)', () => {
  const p = L.normalizeProgress({ modes: { classic: { max: 'x', stars: { 1: 7, a: 2, 2: -1 } }, other: {} } }, MODES);
  assert.equal(p.modes.classic.max, 1);
  assert.deepEqual(p.modes.classic.stars, { 1: 3 });
  assert.ok(p.modes.reverse && !p.modes.other);
  assert.deepEqual(L.normalizeProgress('garbage', MODES).modes.classic, { max: 1, stars: {} });
});

test('a level asks its 5 countries, each with 4 distinct choices including the answer', () => {
  const rng = L.mulberry32(7);
  const qs = L.buildLevel(C, 3, { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true }, rng);
  assert.equal(qs.length, 5);
  assert.deepEqual(qs.map((q) => q.answer.code).sort(), ['CN', 'ES', 'IN', 'MX', 'RU']);
  for (const q of qs) {
    assert.equal(new Set(q.choices.map((c) => c.code)).size, 4);
    assert.ok(q.choices.includes(q.answer));
  }
});

test('levels 1-5 use only the level group (no look-alikes from other levels)', () => {
  for (let seed = 1; seed < 40; seed++) {
    const qs = L.buildLevel(C, 2, { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true }, L.mulberry32(seed));
    for (const q of qs) for (const c of q.choices) assert.equal(c.level, 2);
  }
});

test('look-alike flags: up to 1 from another level in levels 6-15, up to 2 from level 16', () => {
  const opts = { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true };
  let sawLook = 0;
  for (let seed = 1; seed < 60; seed++) {
    for (const lv of [7, 11, 29]) {
      for (const q of L.buildLevel(C, lv, opts, L.mulberry32(seed))) {
        const outside = q.choices.filter((c) => c.level !== lv);
        assert.ok(outside.length <= L.lookalikeSlots(lv));
        for (const c of outside) assert.ok(q.answer.lookalikes.includes(c.code));
        sawLook += outside.length;
      }
    }
  }
  assert.ok(sawLook > 0, 'look-alikes do appear');
  // Chad (level 11) always gets one of its look-alikes (Romania, Andorra or Moldova)
  const td = C.find((c) => c.code === 'TD');
  const byCode = Object.fromEntries(C.map((c) => [c.code, c]));
  for (let seed = 1; seed < 20; seed++) {
    const w = L.pickWrong(td, C, { ...opts, level: 11, byCode }, L.mulberry32(seed));
    assert.ok(w.some((c) => td.lookalikes.includes(c.code)));
  }
});

test('capital choices are distinct capital names from the same level', () => {
  const pool = C.filter((c) => c.capital);
  const opts = { levelOf: (c) => c.capitalLevel, groupOf: (c) => c.capitalLevel, keyOf: (c) => c.capital.en };
  for (let lv = 1; lv <= 38; lv++) {
    for (const q of L.buildLevel(pool, lv, opts, L.mulberry32(lv))) {
      assert.equal(new Set(q.choices.map((c) => c.capital.en)).size, 4);
      for (const c of q.choices) assert.equal(c.capitalLevel, lv);
    }
  }
  assert.ok(!pool.some((c) => c.code === 'IL' || c.code === 'PS'));
});

test('50:50 hint removes two wrong choices and never the answer', () => {
  const qs = L.buildLevel(C, 12, { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true }, L.mulberry32(3));
  for (let seed = 0; seed < 30; seed++) {
    const q = qs[seed % 5];
    const rm = L.hintRemovals(q.choices, q.answer, {}, L.mulberry32(seed));
    assert.equal(rm.length, 2);
    for (const i of rm) assert.notEqual(q.choices[i].code, q.answer.code);
  }
});

test('the same seed gives the same level (deterministic with an injected rng)', () => {
  const opts = { levelOf: (c) => c.level, groupOf: (c) => c.levelGroup, lookalikes: true };
  const a = L.buildLevel(C, 20, opts, L.mulberry32(42)).map((q) => q.choices.map((c) => c.code).join());
  const b = L.buildLevel(C, 20, opts, L.mulberry32(42)).map((q) => q.choices.map((c) => c.code).join());
  assert.deepEqual(a, b);
});

console.log(`\n${failed.length ? 'FAILED' : 'OK'}: ${passed} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
