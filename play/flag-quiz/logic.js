/* Quiz rules shared by Flag Quiz and Capital Quiz (browser versions).
   Plain functions, no DOM: the games load this file as a script (window.QuizLogic),
   and _src/webgames/test_logic.mjs runs the same file under Node.
   Ported from the Flutter apps (lib/services/progress_service.dart, quiz_screen.dart, result_screen.dart). */
(function (root) {
  'use strict';

  var QUESTIONS_PER_LEVEL = 5; // quiz_screen.dart: _questionsPerLevel
  var CHOICES = 4;

  /* Countries are { code, lookalikes, ... } in countries.json and { c, look, ... } in the games' data.js. */
  function codeOf(c) { return c.code || c.c; }
  function lookOf(c) { return c.lookalikes || c.look || []; }

  /* result_screen.dart: 0 wrong = 3 stars, 1 wrong = 2 stars, otherwise 1 star. */
  function starsFor(wrongCount) {
    if (wrongCount <= 0) return 3;
    if (wrongCount === 1) return 2;
    return 1;
  }

  function emptyModeProgress() {
    return { max: 1, stars: {} }; // progress_service.dart: max_unlocked_level defaults to 1
  }

  function normalizeProgress(raw, modes) {
    var p = { v: 1, modes: {} };
    var src = raw && typeof raw === 'object' && raw.modes && typeof raw.modes === 'object' ? raw.modes : {};
    modes.forEach(function (m) {
      var s = src[m] || {};
      var mp = emptyModeProgress();
      var max = parseInt(s.max, 10);
      if (max >= 1) mp.max = max;
      if (s.stars && typeof s.stars === 'object') {
        Object.keys(s.stars).forEach(function (k) {
          var lv = parseInt(k, 10);
          var st = parseInt(s.stars[k], 10);
          if (lv >= 1 && st >= 1) mp.stars[lv] = Math.min(3, st);
        });
      }
      p.modes[m] = mp;
    });
    return p;
  }

  /* progress_service.dart: saveStars keeps the best result (clamped 0..3);
     result_screen.dart always calls unlockNextLevel(level) after a finished level, whatever the score.
     The next level is capped at levelCount so the map never points past the last level. */
  function recordResult(progress, mode, level, stars, levelCount) {
    var mp = progress.modes[mode] || (progress.modes[mode] = emptyModeProgress());
    var s = Math.max(0, Math.min(3, stars | 0));
    if (s > (mp.stars[level] || 0)) mp.stars[level] = s;
    var next = Math.min(level + 1, levelCount);
    if (next > mp.max) mp.max = next;
    return progress;
  }

  /* home_screen.dart _getLevelState: locked above the max unlocked level, done with stars, otherwise current. */
  function levelState(modeProgress, level) {
    if (level > modeProgress.max) return 'locked';
    if ((modeProgress.stars[level] || 0) > 0) return 'done';
    return 'current';
  }

  function isUnlocked(modeProgress, level) {
    return level >= 1 && level <= modeProgress.max;
  }

  function summary(modeProgress, levelCount) {
    var completed = 0;
    var stars = 0;
    var perfect = 0;
    for (var lv = 1; lv <= levelCount; lv++) {
      var s = modeProgress.stars[lv] || 0;
      if (s > 0) completed++;
      if (s === 3) perfect++;
      stars += s;
    }
    return {
      unlocked: Math.min(modeProgress.max, levelCount),
      completed: completed,
      perfect: perfect,
      stars: stars,
      maxStars: levelCount * 3,
      levelCount: levelCount,
    };
  }

  /* The level to suggest on the home screen: the newest unlocked level that has no stars yet,
     else the first level without 3 stars, else level 1. */
  function suggestedLevel(modeProgress, levelCount) {
    var newest = Math.min(modeProgress.max, levelCount);
    if (!(modeProgress.stars[newest] > 0)) return newest;
    for (var lv = 1; lv <= levelCount; lv++) {
      if ((modeProgress.stars[lv] || 0) < 3) return lv;
    }
    return 1;
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  /* How many look-alike flags may replace same-group wrong choices (flag games only):
     none in the first 5 levels, one up to level 15 (the apps' 75), two from level 16. */
  function lookalikeSlots(level) {
    if (level <= 5) return 0;
    if (level <= 15) return 1;
    return 2;
  }

  /* Wrong choices. Base rule from the apps' data: wrong choices come from the same level group.
     Options:
       groupOf(c)      -> group id of a country (flag: levelGroup, capital: capitalLevel)
       keyOf(c)        -> the text that must be distinct between choices (capital names)
       lookalikes      -> true to prefer look-alike flags (up to lookalikeSlots(level), from any level)
       level           -> the level being played */
  function pickWrong(answer, pool, opts, rng) {
    var keyOf = opts.keyOf || codeOf;
    var used = {};
    used[keyOf(answer)] = true;
    used['#' + codeOf(answer)] = true;
    var picks = [];
    function take(c) {
      if (picks.length >= CHOICES - 1) return;
      var k = keyOf(c);
      if (used[k] || used['#' + codeOf(c)]) return;
      used[k] = true;
      used['#' + codeOf(c)] = true;
      picks.push(c);
    }
    var byCode = opts.byCode || {};
    var group = opts.groupOf(answer);
    var sameGroup = shuffle(pool.filter(function (c) { return codeOf(c) !== codeOf(answer) && opts.groupOf(c) === group; }), rng);

    if (opts.lookalikes && lookOf(answer).length) {
      var slots = lookalikeSlots(opts.level || 1);
      var look = shuffle(lookOf(answer).map(function (code) { return byCode[code]; }).filter(Boolean), rng);
      // look-alikes in the same group first: they cost no slot because they satisfy the base rule anyway
      look.forEach(function (c) { if (opts.groupOf(c) === group) take(c); });
      var extra = 0;
      look.forEach(function (c) {
        if (extra < slots && opts.groupOf(c) !== group && picks.length < CHOICES - 1) {
          var before = picks.length;
          take(c);
          if (picks.length > before) extra++;
        }
      });
    }
    sameGroup.forEach(take);
    if (picks.length < CHOICES - 1) {
      throw new Error('Not enough wrong choices for ' + codeOf(answer));
    }
    return picks;
  }

  /* One level: the level's countries shuffled, the first 5 asked (quiz_screen.dart _initQuiz),
     each with 3 wrong choices and the 4 choices shuffled. */
  function buildLevel(pool, level, opts, rng) {
    rng = rng || Math.random;
    var levelOf = opts.levelOf;
    var inLevel = pool.filter(function (c) { return levelOf(c) === level; });
    if (inLevel.length < QUESTIONS_PER_LEVEL) throw new Error('Not enough countries for level ' + level);
    var byCode = {};
    pool.forEach(function (c) { byCode[codeOf(c)] = c; });
    var o = {
      groupOf: opts.groupOf,
      keyOf: opts.keyOf,
      lookalikes: !!opts.lookalikes,
      level: level,
      byCode: byCode,
    };
    return shuffle(inLevel, rng).slice(0, QUESTIONS_PER_LEVEL).map(function (answer) {
      var wrong = pickWrong(answer, pool, o, rng);
      var choices = shuffle([answer].concat(wrong), rng);
      return { answer: answer, choices: choices };
    });
  }

  /* 50:50 hint (the apps' rewarded-ad hint): two of the remaining wrong choices to disable. */
  function hintRemovals(choices, answer, disabled, rng) {
    var idx = [];
    choices.forEach(function (c, i) {
      if (codeOf(c) !== codeOf(answer) && !(disabled && disabled[i])) idx.push(i);
    });
    return shuffle(idx, rng || Math.random).slice(0, 2);
  }

  function levelCountOf(pool, levelOf) {
    var max = 0;
    pool.forEach(function (c) { var l = levelOf(c); if (l > max) max = l; });
    return max;
  }

  var api = {
    QUESTIONS_PER_LEVEL: QUESTIONS_PER_LEVEL,
    CHOICES: CHOICES,
    starsFor: starsFor,
    emptyModeProgress: emptyModeProgress,
    normalizeProgress: normalizeProgress,
    recordResult: recordResult,
    levelState: levelState,
    isUnlocked: isUnlocked,
    summary: summary,
    suggestedLevel: suggestedLevel,
    mulberry32: mulberry32,
    shuffle: shuffle,
    lookalikeSlots: lookalikeSlots,
    pickWrong: pickWrong,
    buildLevel: buildLevel,
    hintRemovals: hintRemovals,
    levelCountOf: levelCountOf,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuizLogic = api;
})(this);
