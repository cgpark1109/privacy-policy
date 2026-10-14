/*
 * Korean Word Quiz (web) - core rules.
 *
 * Plain functions and small services that mirror the Flutter app 1.6.0
 * (lib/constants, lib/models, lib/services, lib/utils). No DOM access here so
 * the rules can be tested in Node (tests/logic.test.js).
 *
 * Storage keys and value formats match the app's SharedPreferences keys
 * (lib/constants/prefs_keys.dart) and the old web version's localStorage
 * format (ints/bools as plain strings, lists as JSON).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KWQCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- constants

  var LEVELS = ['nouns', 'verbs', 'adjectives'];

  var LEVEL_INFO = {
    nouns: { displayName: 'Nouns', partOfSpeech: 'Noun' },
    verbs: { displayName: 'Verbs', partOfSpeech: 'Verb' },
    adjectives: { displayName: 'Adjectives', partOfSpeech: 'Adjective' },
  };

  function isLevel(value) {
    return LEVELS.indexOf(value) !== -1;
  }

  var DAILY_QUESTION_COUNT = 10;
  var DAILY_MIXED_LEVEL = 'mixed';

  /** lib/constants/quiz_review_limits.dart */
  var QuizReviewLimits = {
    defaultCount: 10,
    minCount: 5,
    maxCount: 20,
    quickReviewCount: 5,
    fullReviewCount: 20,
    clampFullReview: function (count) { return clamp(count, 1, 20); },
    clampQuickReview: function (count) { return clamp(count, 1, 5); },
    clampForQuery: function (count) { return clamp(count, 5, 20); },
    /** Allowed URI count values; others fall back to defaultCount. */
    parseCount: function (countParam) {
      return countParam === 5 || countParam === 20 ? countParam : 10;
    },
  };

  /** lib/constants/quiz_scoring.dart */
  var QuizScoring = {
    pointsForCorrect: function (streak) {
      var bonus = 0;
      if (streak >= 5) bonus = 10;
      else if (streak >= 3) bonus = 5;
      return 10 + bonus;
    },
    starsFor: function (correctCount, total) {
      if (total <= 0) return 0;
      var ratio = correctCount / total;
      if (ratio >= 0.9) return 3;
      if (ratio >= 0.6) return 2;
      if (ratio >= 0.3) return 1;
      return 0;
    },
  };

  /** lib/models/bonus_mission_type.dart (order matters). */
  var BONUS_MISSIONS = [
    { type: 'wrongReview5', id: 'wrong5', title: 'Review 5 Wrong Words', description: 'Clear 5 saved wrong answers' },
    { type: 'extraWords10', id: 'extra10', title: 'Learn 10 More Words', description: 'Practice 10 new random words' },
    { type: 'perfectChallenge', id: 'perfect', title: 'Perfect Challenge', description: 'Score 10/10 on a quiz' },
  ];

  function bonusMissionById(id) {
    for (var i = 0; i < BONUS_MISSIONS.length; i++) {
      if (BONUS_MISSIONS[i].id === id) return BONUS_MISSIONS[i];
    }
    return null;
  }

  /** lib/widgets/weekly_challenge_card.dart + weekly_challenge_service.dart */
  var WEEKLY_CHALLENGES = [
    { type: 'attendance5', title: '5-day attendance', target: 5 },
    { type: 'wrongReview30', title: 'Clear 30 wrong words', target: 30 },
    { type: 'newWords100', title: 'Learn 100 new words', target: 100 },
  ];

  /** lib/constants/prefs_keys.dart */
  var Keys = {
    statsQuizzesPlayed: 'stats_quizzes_played',
    statsQuestionsAnswered: 'stats_questions_answered',
    statsQuestionsCorrect: 'stats_questions_correct',
    statsLastCorrect: 'stats_last_correct',
    statsLastTotal: 'stats_last_total',
    wordMastery: 'word_mastery',
    expertLearned: 'learned_expert',
    expertWrong: 'review_wrong_expert',
    wrongWords: function (level) { return 'review_wrong_' + level; },
    learnedWords: function (level) { return 'learned_' + level; },
    attendanceLastDate: 'attendance_last_date',
    attendanceStreak: 'attendance_streak',
    attendanceBest: 'attendance_best',
    attendanceTotal: 'attendance_total',
    streakCurrent: 'streak_current',
    streakBest: 'streak_best',
    lastPlayedDate: 'last_played_date',
    dailySessionKeyPrefix: 'daily_quiz_session_',
    dailyActivity: function (date) { return 'daily_activity_' + date; },
    dailyCompleted: function (date) { return 'daily_completed_' + date; },
    dailyAnswered: function (level, date) { return 'daily_answered_' + level + '_' + date; },
    weeklyActiveKey: 'weekly_active_key',
    weeklyAttendance: function (week) { return 'weekly_attendance_' + week; },
    weeklyWrongReview: function (week) { return 'weekly_wrong_review_' + week; },
    weeklyLearnedBaseline: function (week) { return 'weekly_learned_baseline_' + week; },
    weeklyLearnedCurrent: function (week) { return 'weekly_learned_current_' + week; },
    bonusCompleted: function (typeId, date) { return 'bonus_completed_' + typeId + '_' + date; },
    ttsEnabled: 'settings_tts_enabled',
    ttsRate: 'settings_tts_rate',
    hasCompletedOnboarding: 'settings_has_completed_onboarding',
    lastOpenDate: 'settings_last_open_date',
    themeMode: 'settings_theme_mode',
    noticeSeen: function (id, revision) { return 'notice_seen_' + id + '_r' + revision; },
    // Web-only keys.
    quizDirection: 'web_quiz_direction',
    migrationDone: 'web_migrated_v2',
  };

  // ------------------------------------------------------------------ helpers

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = '0' + s;
    return s;
  }

  /** `YYYY-MM-DD` in the device local calendar (DateKeys.localDateKey). */
  function localDateKey(date) {
    var d = date || new Date();
    return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }

  /**
   * Monday-start week key: the local date of that week's Monday
   * (DateKeys.weekKey). Uses calendar arithmetic so DST changes can't shift it.
   */
  function weekKey(date) {
    var d = date || new Date();
    var offset = (d.getDay() + 6) % 7; // Monday = 0
    return localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset));
  }

  /** Whole local days between two `YYYY-MM-DD` keys (DateKeys.diffDays). */
  function diffDays(fromDate, toDate) {
    var from = parseDateKey(fromDate);
    var to = parseDateKey(toDate);
    if (!from || !to) return NaN;
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  function parseDateKey(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  /** Thousands separators, e.g. 1284 -> "1,284" (utils/number_format.dart). */
  function formatCount(value) {
    var negative = value < 0;
    var digits = String(Math.abs(Math.trunc(value)));
    var out = '';
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
      out += digits[i];
    }
    return (negative ? '-' : '') + out;
  }

  /** Seedable PRNG (mulberry32) for tests; Math.random by default. */
  function createRng(seed) {
    if (seed === undefined || seed === null) {
      return { next: Math.random, nextBool: function () { return Math.random() < 0.5; }, nextInt: function (n) { return Math.floor(Math.random() * n); } };
    }
    var a = seed >>> 0;
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return { next: next, nextBool: function () { return next() < 0.5; }, nextInt: function (n) { return Math.floor(next() * n); } };
  }

  function shuffle(list, rng) {
    var r = rng || createRng();
    for (var i = list.length - 1; i > 0; i--) {
      var j = r.nextInt(i + 1);
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function uniq(list) {
    var seen = new Set();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      if (!seen.has(list[i])) {
        seen.add(list[i]);
        out.push(list[i]);
      }
    }
    return out;
  }

  /** FNV-1a over UTF-16 code units (must match tools/sync_from_app.py). */
  function fnv1a32(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function wordId(korean, english) {
    return korean + '__' + english;
  }

  function koreanOfId(id) {
    var i = String(id).indexOf('__');
    return i === -1 ? String(id) : String(id).slice(0, i);
  }

  // --------------------------------------------------------- text sanitizing

  var TRAILING_KOREAN_PAREN = /\s*\([^)]*[가-힣][^)]*\)\s*$/;
  var KOREAN_PAREN_ALL = /\s*\([^()]*[가-힣][^()]*\)/g;
  var TRAILING_ENGLISH_GLOSS = /\s*\([A-Za-z][^)]*\)\s*$/;

  /** utils/quiz_text_sanitizer.dart sanitizeQuizDefinition */
  function sanitizeQuizDefinition(text) {
    var original = String(text || '').trim();
    var result = original;
    if (!result) return result;
    while (TRAILING_KOREAN_PAREN.test(result)) {
      result = result.replace(TRAILING_KOREAN_PAREN, '').trim();
    }
    return result || original;
  }

  /** utils/quiz_text_sanitizer.dart sanitizeQuizExample */
  function sanitizeQuizExample(text) {
    var original = String(text || '').trim();
    var result = original;
    if (!result) return result;
    var prev = '';
    while (result !== prev) {
      prev = result;
      result = result.replace(KOREAN_PAREN_ALL, '').trim();
    }
    while (TRAILING_ENGLISH_GLOSS.test(result)) {
      result = result.replace(TRAILING_ENGLISH_GLOSS, '').trim();
    }
    return result || original;
  }

  // -------------------------------------------------------------- quiz engine

  /**
   * services/quiz_engine.dart QuizEngine.buildQuestion.
   * word: {level, korean, english, example}
   * direction preference (web setting): 'mixed' (app behaviour), 'ko-en', 'en-ko'.
   * Verbs are always Korean -> English, like the app.
   */
  function buildQuestion(word, levelPool, fallbackPool, rng, directionPref) {
    var r = rng || createRng();
    var supportsDirection = word.level === 'nouns' || word.level === 'adjectives';
    var direction;
    if (!supportsDirection) direction = 'koToEn';
    else if (directionPref === 'ko-en') direction = 'koToEn';
    else if (directionPref === 'en-ko') direction = 'enToKo';
    else direction = r.nextBool() ? 'koToEn' : 'enToKo';

    var correct;
    var distractors;
    var prompt;
    if (direction === 'koToEn') {
      correct = sanitizeQuizDefinition(word.english);
      distractors = pickDistractors(levelPool, fallbackPool || [], r, function (pool, existing) {
        return collect(pool, function (w) { return w.english; }, function (v) {
          return v !== word.english;
        }, sanitizeQuizDefinition, function (v) { return v !== correct; }, existing, r);
      });
      prompt = word.korean;
    } else {
      correct = word.korean;
      distractors = pickDistractors(levelPool, fallbackPool || [], r, function (pool, existing) {
        return collect(pool, function (w) { return w.korean; }, function (v) {
          return v !== correct;
        }, null, null, existing, r);
      });
      prompt = sanitizeQuizDefinition(word.english);
    }

    var choices = shuffle([correct].concat(distractors), r);
    return {
      word: word,
      direction: direction,
      prompt: prompt,
      choices: choices,
      correctChoice: correct,
      feedbackText: word.example ? sanitizeQuizExample(word.example) : sanitizeQuizDefinition(word.english),
    };
  }

  function pickDistractors(pool, fallbackPool, rng, collectFn) {
    var first = collectFn(pool, new Set());
    if (first.length >= 3) return first.slice(0, 3);
    var inPool = new Set(pool);
    var merged = pool.concat(fallbackPool.filter(function (w) { return !inPool.has(w); }));
    var extra = collectFn(merged, new Set(first));
    return first.concat(extra).slice(0, 3);
  }

  function collect(pool, pick, rawFilter, transform, valueFilter, existing, rng) {
    var values = [];
    for (var i = 0; i < pool.length; i++) {
      var v = pick(pool[i]);
      if (!v || !rawFilter(v)) continue;
      if (transform) v = transform(v);
      if (!v || (valueFilter && !valueFilter(v))) continue;
      if (existing.has(v)) continue;
      values.push(v);
    }
    return shuffle(uniq(values), rng);
  }

  /** services/expert_quiz_engine.dart. word: {korean, meanings:[{english,emoji,example}]} */
  function buildExpertQuestion(word, pool, rng) {
    var r = rng || createRng();
    var target = word.meanings[r.nextInt(word.meanings.length)];
    var correct = target.english;
    var all = [];
    for (var i = 0; i < pool.length; i++) {
      for (var j = 0; j < pool[i].meanings.length; j++) {
        var e = pool[i].meanings[j].english;
        if (e && e !== correct) all.push(e);
      }
    }
    var distractors = shuffle(uniq(all), r).slice(0, 3);
    return {
      word: word,
      targetMeaning: target,
      choices: shuffle([correct].concat(distractors), r),
      correctChoice: correct,
      hintText: target.emoji + '  ' + target.example,
    };
  }

  /** Hint (app: rewarded ad; web: free): hide two random wrong choices. */
  function pickChoicesToHide(question, rng) {
    var wrong = question.choices.filter(function (c) { return c !== question.correctChoice; });
    return shuffle(wrong, rng || createRng()).slice(0, 2);
  }

  // ------------------------------------------------------------- quiz config

  /** models/quiz_config.dart. mode: 'random' | 'wrong' | 'learned' */
  function makeQuizConfig(opts) {
    var o = opts || {};
    var config = {
      mode: o.mode === 'wrong' || o.mode === 'learned' ? o.mode : 'random',
      level: isLevel(o.level) ? o.level : null,
      count: typeof o.count === 'number' ? o.count : QuizReviewLimits.defaultCount,
      bonus: o.bonus && bonusMissionById(o.bonus) ? o.bonus : null,
      expert: !!o.expert,
    };
    return config;
  }

  function isDailyPractice(config) {
    return !config.expert && config.mode === 'random' && !config.bonus;
  }

  function quizConfigToQuery(config) {
    var parts = ['mode=' + config.mode, 'count=' + QuizReviewLimits.clampForQuery(config.count)];
    if (!config.expert) {
      if (config.level) parts.push('level=' + config.level);
      if (config.bonus) parts.push('bonus=' + config.bonus);
    }
    return (config.expert ? '/quiz/expert?' : '/quiz?') + parts.join('&');
  }

  /** params: plain object of query values (strings). */
  function quizConfigFromQuery(params, expert) {
    var p = params || {};
    var countNum = parseInt(p.count, 10);
    return makeQuizConfig({
      mode: p.mode,
      level: expert ? null : p.level,
      count: QuizReviewLimits.parseCount(isNaN(countNum) ? null : countNum),
      bonus: expert ? null : p.bonus,
      expert: !!expert,
    });
  }

  function bonusQuizConfig(id) {
    if (id === 'wrong5') return makeQuizConfig({ mode: 'wrong', count: QuizReviewLimits.quickReviewCount, bonus: id });
    return makeQuizConfig({ mode: 'random', count: QuizReviewLimits.defaultCount, bonus: id });
  }

  // ------------------------------------------------------------------- prefs

  /**
   * SharedPreferences-like wrapper. backend: {getItem, setItem, removeItem, keys()}.
   * Values are stored as strings: ints "12", bools "true", lists as JSON.
   */
  function Prefs(backend) {
    this.backend = backend;
  }
  Prefs.prototype.getString = function (key) {
    var v = this.backend.getItem(key);
    return v === undefined ? null : v;
  };
  Prefs.prototype.getInt = function (key) {
    var v = this.backend.getItem(key);
    if (v === null || v === undefined || v === '') return null;
    var n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };
  Prefs.prototype.getDouble = function (key) {
    var v = this.backend.getItem(key);
    if (v === null || v === undefined || v === '') return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  };
  Prefs.prototype.getBool = function (key) {
    var v = this.backend.getItem(key);
    if (v === 'true') return true;
    if (v === 'false') return false;
    return null;
  };
  Prefs.prototype.getJson = function (key) {
    var v = this.backend.getItem(key);
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch (e) {
      return null;
    }
  };
  Prefs.prototype.getStringList = function (key) {
    var v = this.getJson(key);
    if (!Array.isArray(v)) return null;
    return v.map(String).filter(function (s) { return s.length > 0; });
  };
  Prefs.prototype.setString = function (key, value) { this.backend.setItem(key, String(value)); };
  Prefs.prototype.setInt = function (key, value) { this.backend.setItem(key, String(Math.trunc(value))); };
  Prefs.prototype.setDouble = function (key, value) { this.backend.setItem(key, String(value)); };
  Prefs.prototype.setBool = function (key, value) { this.backend.setItem(key, value ? 'true' : 'false'); };
  Prefs.prototype.setJson = function (key, value) { this.backend.setItem(key, JSON.stringify(value)); };
  Prefs.prototype.setStringList = function (key, list) { this.setJson(key, list); };
  Prefs.prototype.remove = function (key) { this.backend.removeItem(key); };
  Prefs.prototype.containsKey = function (key) {
    var v = this.backend.getItem(key);
    return v !== null && v !== undefined;
  };
  Prefs.prototype.keys = function () { return this.backend.keys(); };

  function memoryBackend(initial) {
    var map = new Map();
    if (initial) Object.keys(initial).forEach(function (k) { map.set(k, String(initial[k])); });
    return {
      map: map,
      getItem: function (k) { return map.has(k) ? map.get(k) : null; },
      setItem: function (k, v) { map.set(k, String(v)); },
      removeItem: function (k) { map.delete(k); },
      keys: function () { return Array.from(map.keys()); },
    };
  }

  // -------------------------------------------------------- progress service

  var MASTERY_REQUIRED_STREAK = 2;

  /** services/progress_service.dart */
  function ProgressService(prefs, clock) {
    this.prefs = prefs;
    this.now = clock || function () { return new Date(); };
  }
  ProgressService.prototype._readIds = function (key) {
    return this.prefs.getStringList(key) || [];
  };
  ProgressService.prototype._writeIds = function (key, ids) {
    var list = Array.from(new Set(ids)).sort();
    this.prefs.setJson(key, list);
  };
  ProgressService.prototype.wrongWordIds = function (level) { return this._readIds(Keys.wrongWords(level)); };
  ProgressService.prototype.learnedWordIds = function (level) { return this._readIds(Keys.learnedWords(level)); };
  ProgressService.prototype.expertWrongWordIds = function () { return this._readIds(Keys.expertWrong); };
  ProgressService.prototype.expertLearnedWordIds = function () { return this._readIds(Keys.expertLearned); };
  ProgressService.prototype.countExpertWrong = function () { return this.expertWrongWordIds().length; };
  ProgressService.prototype.countExpertLearned = function () { return this.expertLearnedWordIds().length; };
  ProgressService.prototype.countWrong = function () {
    var self = this;
    return LEVELS.reduce(function (sum, l) { return sum + self.wrongWordIds(l).length; }, 0);
  };
  ProgressService.prototype.countLearned = function () {
    var self = this;
    return LEVELS.reduce(function (sum, l) { return sum + self.learnedWordIds(l).length; }, 0);
  };
  ProgressService.prototype.learnedCountByLevel = function () {
    var out = {};
    for (var i = 0; i < LEVELS.length; i++) out[LEVELS[i]] = this.learnedWordIds(LEVELS[i]).length;
    return out;
  };
  ProgressService.prototype.stats = function () {
    var p = this.prefs;
    var answered = p.getInt(Keys.statsQuestionsAnswered) || 0;
    var correct = p.getInt(Keys.statsQuestionsCorrect) || 0;
    var lastCorrect = p.getInt(Keys.statsLastCorrect) || 0;
    var lastTotal = p.getInt(Keys.statsLastTotal) || 0;
    return {
      learnedCount: this.countLearned(),
      wrongCount: this.countWrong(),
      quizzesPlayed: p.getInt(Keys.statsQuizzesPlayed) || 0,
      questionsAnswered: answered,
      questionsCorrect: correct,
      lastSessionCorrect: lastCorrect,
      lastSessionTotal: lastTotal,
      overallAccuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
      lastSessionAccuracy: lastTotal === 0 ? 0 : Math.round((lastCorrect / lastTotal) * 100),
    };
  };
  ProgressService.prototype.recordQuizSession = function (correctCount, total) {
    if (total <= 0) return;
    var p = this.prefs;
    p.setInt(Keys.statsQuizzesPlayed, (p.getInt(Keys.statsQuizzesPlayed) || 0) + 1);
    p.setInt(Keys.statsQuestionsAnswered, (p.getInt(Keys.statsQuestionsAnswered) || 0) + total);
    p.setInt(Keys.statsQuestionsCorrect, (p.getInt(Keys.statsQuestionsCorrect) || 0) + correctCount);
    p.setInt(Keys.statsLastCorrect, correctCount);
    p.setInt(Keys.statsLastTotal, total);
  };
  ProgressService.prototype.markExpertWrong = function (id) {
    this._writeIds(Keys.expertWrong, this.expertWrongWordIds().concat([id]));
    this._writeIds(Keys.expertLearned, this.expertLearnedWordIds().filter(function (x) { return x !== id; }));
  };
  ProgressService.prototype.markExpertLearned = function (id) {
    this._writeIds(Keys.expertLearned, this.expertLearnedWordIds().concat([id]));
    this._writeIds(Keys.expertWrong, this.expertWrongWordIds().filter(function (x) { return x !== id; }));
  };
  ProgressService.prototype.markWrong = function (level, id) {
    this._writeIds(Keys.wrongWords(level), this.wrongWordIds(level).concat([id]));
    this._writeIds(Keys.learnedWords(level), this.learnedWordIds(level).filter(function (x) { return x !== id; }));
    this._setMastery(this.wordKey(level, id), 0, true);
  };
  ProgressService.prototype.markLearned = function (level, id) {
    this._writeIds(Keys.learnedWords(level), this.learnedWordIds(level).concat([id]));
    this._writeIds(Keys.wrongWords(level), this.wrongWordIds(level).filter(function (x) { return x !== id; }));
    this._setMastery(this.wordKey(level, id), MASTERY_REQUIRED_STREAK, false);
  };
  /**
   * A correct answer marks a word learned, except for a saved wrong word,
   * which needs 2 correct answers in a row. A wrong answer saves it as wrong.
   */
  ProgressService.prototype.recordAnswer = function (level, id, isCorrect) {
    var key = this.wordKey(level, id);
    var wasWrong = this.wrongWordIds(level).indexOf(id) !== -1;
    if (isCorrect) {
      var nextStreak = this._getMastery(key).correctStreak + 1;
      this._setMastery(key, nextStreak, false);
      if (wasWrong) {
        if (nextStreak >= MASTERY_REQUIRED_STREAK) this.markLearned(level, id);
      } else {
        this.markLearned(level, id);
      }
      return;
    }
    this.markWrong(level, id);
  };
  ProgressService.prototype.wrongAnswerCount = function (level, id) {
    return this._getMastery(this.wordKey(level, id)).wrongCount;
  };
  ProgressService.prototype.lastWrongAt = function (level, id) {
    return this._getMastery(this.wordKey(level, id)).lastWrongAt || null;
  };
  ProgressService.prototype.wordKey = function (level, id) { return level + ':' + id; };
  ProgressService.prototype._readMastery = function () {
    var v = this.prefs.getJson(Keys.wordMastery);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  };
  ProgressService.prototype._getMastery = function (key) {
    var raw = this._readMastery()[key];
    if (!raw || typeof raw !== 'object') return { wrongCount: 0, correctStreak: 0, lastWrongAt: '' };
    return {
      wrongCount: raw.wrongCount | 0,
      correctStreak: raw.correctStreak | 0,
      lastWrongAt: typeof raw.lastWrongAt === 'string' ? raw.lastWrongAt : '',
    };
  };
  ProgressService.prototype._setMastery = function (key, correctStreak, bumpWrong) {
    var all = this._readMastery();
    var current = this._getMastery(key);
    all[key] = {
      wrongCount: bumpWrong ? current.wrongCount + 1 : current.wrongCount,
      correctStreak: correctStreak === null || correctStreak === undefined ? current.correctStreak : correctStreak,
      lastWrongAt: bumpWrong ? localDateKey(this.now()) : current.lastWrongAt,
    };
    this.prefs.setJson(Keys.wordMastery, all);
  };
  ProgressService.prototype.resetWrongWords = function () {
    for (var i = 0; i < LEVELS.length; i++) this.prefs.remove(Keys.wrongWords(LEVELS[i]));
    this.prefs.remove(Keys.expertWrong);
  };
  ProgressService.prototype.resetLearnedWords = function () {
    for (var i = 0; i < LEVELS.length; i++) this.prefs.remove(Keys.learnedWords(LEVELS[i]));
    this.prefs.remove(Keys.expertLearned);
  };
  ProgressService.prototype.resetStatistics = function () {
    var p = this.prefs;
    [Keys.statsQuizzesPlayed, Keys.statsQuestionsAnswered, Keys.statsQuestionsCorrect, Keys.statsLastCorrect, Keys.statsLastTotal]
      .forEach(function (k) { p.remove(k); });
  };
  ProgressService.prototype.resetAll = function () {
    this.resetWrongWords();
    this.resetLearnedWords();
    this.resetStatistics();
    this.prefs.remove(Keys.wordMastery);
  };
  /**
   * Web version of pruneMissingWords(): called when one data chunk of a level
   * is loaded. Saved IDs that belong to that chunk (inChunk(id)) but are not
   * in it (validIds) were removed from the word bank and are dropped.
   * Returns the number of removed learned IDs.
   */
  ProgressService.prototype.pruneChunk = function (level, inChunk, validIds) {
    if (!validIds || validIds.size === 0) return 0;
    var learned = this.learnedWordIds(level);
    var keptLearned = learned.filter(function (id) { return !inChunk(id) || validIds.has(id); });
    var removed = learned.length - keptLearned.length;
    if (removed > 0) this._writeIds(Keys.learnedWords(level), keptLearned);
    var wrong = this.wrongWordIds(level);
    var keptWrong = wrong.filter(function (id) { return !inChunk(id) || validIds.has(id); });
    if (keptWrong.length !== wrong.length) this._writeIds(Keys.wrongWords(level), keptWrong);
    return removed;
  };

  // ----------------------------------------------------------- daily service

  /** services/daily_challenge_service.dart */
  function DailyService(prefs, clock) {
    this.prefs = prefs;
    this.now = clock || function () { return new Date(); };
  }
  DailyService.prototype.today = function () { return localDateKey(this.now()); };
  DailyService.prototype.isDailyCompletedToday = function () {
    return this.prefs.getBool(Keys.dailyCompleted(this.today())) || false;
  };
  DailyService.prototype.hasPlayHistory = function () {
    if (this.prefs.getString(Keys.attendanceLastDate) !== null) return true;
    if (this.prefs.getString(Keys.lastPlayedDate) !== null) return true;
    return (this.prefs.getInt(Keys.statsQuizzesPlayed) || 0) > 0;
  };
  DailyService.prototype.getAttendanceStatus = function () {
    var p = this.prefs;
    return {
      lastDate: p.getString(Keys.attendanceLastDate) || '',
      streak: p.getInt(Keys.attendanceStreak) || 0,
      best: p.getInt(Keys.attendanceBest) || 0,
      total: p.getInt(Keys.attendanceTotal) || 0,
    };
  };
  DailyService.prototype.getPlayStreak = function () {
    var p = this.prefs;
    return {
      current: p.getInt(Keys.streakCurrent) || 0,
      best: p.getInt(Keys.streakBest) || 0,
      lastPlayedDate: p.getString(Keys.lastPlayedDate) || '',
    };
  };
  /**
   * Home hero status. The app shows the stored attendance streak as-is (it
   * only resets on the next check-in); the web shows 0 once a day was missed
   * so the "N-day streak" chip never overstates. Stored values are unchanged.
   */
  DailyService.prototype.getStatus = function () {
    var attendance = this.getAttendanceStatus();
    var completed = this.isDailyCompletedToday();
    var answered = this._getAnswered(DAILY_MIXED_LEVEL);
    return {
      completed: completed,
      answered: answered,
      inProgress: !completed && answered > 0,
      attendanceStreak: this.isStreakAlive(attendance.lastDate) ? attendance.streak : 0,
      attendanceBest: attendance.best,
      playStreak: this.getPlayStreak().current,
    };
  };
  /** True if a streak whose last day is lastDate can still continue today. */
  DailyService.prototype.isStreakAlive = function (lastDate) {
    if (!lastDate) return false;
    var d = diffDays(lastDate, this.today());
    return d === 0 || d === 1;
  };
  DailyService.prototype.checkInToday = function () {
    var today = this.today();
    var status = this.getAttendanceStatus();
    if (status.lastDate === today) {
      return { checked: true, alreadyChecked: true, streak: status.streak, best: status.best, total: status.total };
    }
    var nextStreak = 1;
    if (status.lastDate) {
      nextStreak = diffDays(status.lastDate, today) === 1 ? status.streak + 1 : 1;
    }
    var nextBest = nextStreak > status.best ? nextStreak : status.best;
    var nextTotal = status.total + 1;
    this.prefs.setString(Keys.attendanceLastDate, today);
    this.prefs.setInt(Keys.attendanceStreak, nextStreak);
    this.prefs.setInt(Keys.attendanceBest, nextBest);
    this.prefs.setInt(Keys.attendanceTotal, nextTotal);
    return { checked: true, alreadyChecked: false, streak: nextStreak, best: nextBest, total: nextTotal };
  };
  DailyService.prototype.updatePlayStreak = function () {
    var today = this.today();
    var last = this.prefs.getString(Keys.lastPlayedDate);
    var current = this.prefs.getInt(Keys.streakCurrent) || 0;
    var best = this.prefs.getInt(Keys.streakBest) || 0;
    var changed = false;
    if (!last) {
      current = 1;
      changed = true;
    } else if (last !== today) {
      current = diffDays(last, today) === 1 ? current + 1 : 1;
      changed = true;
    }
    if (current > best) best = current;
    if (changed) {
      this.prefs.setInt(Keys.streakCurrent, current);
      this.prefs.setInt(Keys.streakBest, best);
      this.prefs.setString(Keys.lastPlayedDate, today);
    }
    return { current: current, best: best, changed: changed };
  };
  DailyService.prototype._normalizeLevel = function (level) {
    return isLevel(level) || level === DAILY_MIXED_LEVEL ? level : DAILY_MIXED_LEVEL;
  };
  DailyService.prototype._getAnswered = function (level) {
    return this.prefs.getInt(Keys.dailyAnswered(this._normalizeLevel(level), this.today())) || 0;
  };
  DailyService.prototype.setDailyAnsweredCount = function (answered, level) {
    var safe = this._normalizeLevel(level || DAILY_MIXED_LEVEL);
    var next = clamp(answered, 0, DAILY_QUESTION_COUNT);
    this.prefs.setInt(Keys.dailyAnswered(safe, this.today()), next);
    if (next >= DAILY_QUESTION_COUNT) this.prefs.setBool(Keys.dailyCompleted(this.today()), true);
  };
  DailyService.prototype.recordQuestionsAnswered = function (count, level) {
    if (count <= 0) return;
    var safe = this._normalizeLevel(level || DAILY_MIXED_LEVEL);
    this.setDailyAnsweredCount(clamp(this._getAnswered(safe) + count, 0, DAILY_QUESTION_COUNT), safe);
  };
  DailyService.prototype.recordSingleQuestionAnswered = function () {
    this.recordQuestionsAnswered(1, DAILY_MIXED_LEVEL);
  };
  DailyService.prototype._sessionKey = function (date) {
    return Keys.dailySessionKeyPrefix + (date || this.today());
  };
  DailyService.prototype.loadSavedSession = function (date) {
    var v = this.prefs.getJson(this._sessionKey(date));
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    return {
      wordRefs: Array.isArray(v.wordRefs) ? v.wordRefs.map(String) : [],
      index: v.index | 0,
      score: v.score | 0,
      correctCount: v.correctCount | 0,
      streak: v.streak | 0,
      bestStreak: v.bestStreak | 0,
    };
  };
  DailyService.prototype.saveSession = function (session, date) {
    this.prefs.setJson(this._sessionKey(date), {
      wordRefs: session.wordRefs,
      index: session.index,
      score: session.score,
      correctCount: session.correctCount,
      streak: session.streak,
      bestStreak: session.bestStreak,
    });
  };
  DailyService.prototype.clearSavedSession = function (date) {
    this.prefs.remove(this._sessionKey(date));
  };
  DailyService.prototype.hasResumableSession = function () {
    if (this.isDailyCompletedToday()) return false;
    var s = this.loadSavedSession();
    return !!s && s.wordRefs.length > 0 && s.index < s.wordRefs.length;
  };
  DailyService.prototype.markDailyCompleted = function () {
    this.prefs.setInt(Keys.dailyAnswered(DAILY_MIXED_LEVEL, this.today()), DAILY_QUESTION_COUNT);
    this.prefs.setBool(Keys.dailyCompleted(this.today()), true);
  };
  DailyService.prototype.hasDailyActivityToday = function () {
    return this.prefs.getBool(Keys.dailyActivity(this.today())) || false;
  };
  DailyService.prototype.recordDailyActivity = function () {
    this.prefs.setBool(Keys.dailyActivity(this.today()), true);
  };
  DailyService.prototype.resetDailyState = function () {
    var today = this.today();
    var p = this.prefs;
    p.remove(Keys.dailyCompleted(today));
    [DAILY_MIXED_LEVEL].concat(LEVELS).forEach(function (l) { p.remove(Keys.dailyAnswered(l, today)); });
    p.remove(Keys.dailyActivity(today));
    this.clearSavedSession(today);
  };
  DailyService.prototype.resetAllProgress = function () {
    this.resetDailyState();
    var p = this.prefs;
    [Keys.attendanceLastDate, Keys.attendanceStreak, Keys.attendanceBest, Keys.attendanceTotal,
      Keys.streakCurrent, Keys.streakBest, Keys.lastPlayedDate].forEach(function (k) { p.remove(k); });
  };

  // ---------------------------------------------------------- weekly service

  /** services/weekly_challenge_service.dart */
  function WeeklyService(prefs, clock) {
    this.prefs = prefs;
    this.now = clock || function () { return new Date(); };
  }
  WeeklyService.prototype.week = function () { return weekKey(this.now()); };
  WeeklyService.prototype.getCurrentChallenges = function () {
    var week = this.week();
    var p = this.prefs;
    var attendance = (p.getStringList(Keys.weeklyAttendance(week)) || []).length;
    var wrongReview = p.getInt(Keys.weeklyWrongReview(week)) || 0;
    var baseline = p.getInt(Keys.weeklyLearnedBaseline(week)) || 0;
    var current = p.getInt(Keys.weeklyLearnedCurrent(week));
    var learnedNow = current === null ? baseline : current;
    var newWords = clamp(learnedNow - baseline, 0, 99999);
    var values = { attendance5: attendance, wrongReview30: wrongReview, newWords100: newWords };
    return WEEKLY_CHALLENGES.map(function (c) {
      var value = values[c.type];
      return {
        type: c.type,
        title: c.title,
        current: value,
        target: c.target,
        completed: value >= c.target,
        progress: c.target === 0 ? 0 : clamp(value / c.target, 0, 1),
      };
    });
  };
  WeeklyService.prototype.allCompleted = function () {
    return this.getCurrentChallenges().every(function (c) { return c.completed; });
  };
  WeeklyService.prototype.syncLearnedCount = function (learnedCount) {
    var week = this.week();
    var p = this.prefs;
    if (p.getString(Keys.weeklyActiveKey) !== week) {
      p.setString(Keys.weeklyActiveKey, week);
      p.setInt(Keys.weeklyLearnedBaseline(week), learnedCount);
      p.setInt(Keys.weeklyLearnedCurrent(week), learnedCount);
      return;
    }
    if (!p.containsKey(Keys.weeklyLearnedBaseline(week))) p.setInt(Keys.weeklyLearnedBaseline(week), learnedCount);
    p.setInt(Keys.weeklyLearnedCurrent(week), learnedCount);
  };
  WeeklyService.prototype.lowerLearnedBaseline = function (removed) {
    var key = Keys.weeklyLearnedBaseline(this.week());
    var baseline = this.prefs.getInt(key);
    if (baseline === null || removed <= 0) return;
    this.prefs.setInt(key, clamp(baseline - removed, 0, baseline));
  };
  WeeklyService.prototype.recordDailyCompleted = function () {
    var key = Keys.weeklyAttendance(this.week());
    var dates = this.prefs.getStringList(key) || [];
    var today = localDateKey(this.now());
    if (dates.indexOf(today) === -1) {
      dates.push(today);
      this.prefs.setStringList(key, dates);
    }
  };
  WeeklyService.prototype.recordWrongReviewCorrect = function (count) {
    if (count <= 0) return;
    var key = Keys.weeklyWrongReview(this.week());
    this.prefs.setInt(key, (this.prefs.getInt(key) || 0) + count);
  };
  WeeklyService.prototype.resetAll = function () {
    var p = this.prefs;
    p.keys().filter(function (k) { return k.indexOf('weekly_') === 0; }).forEach(function (k) { p.remove(k); });
    p.remove(Keys.weeklyActiveKey);
  };

  // ----------------------------------------------------------- bonus service

  /** services/bonus_mission_service.dart */
  function BonusService(prefs, progress, daily, clock) {
    this.prefs = prefs;
    this.progress = progress;
    this.daily = daily;
    this.now = clock || function () { return new Date(); };
  }
  BonusService.prototype._key = function (id) { return Keys.bonusCompleted(id, localDateKey(this.now())); };
  BonusService.prototype.isCompleted = function (id) { return this.prefs.getBool(this._key(id)) || false; };
  BonusService.prototype.getTodayMissions = function () {
    var wrongCount = this.progress.countWrong();
    var self = this;
    return BONUS_MISSIONS.map(function (m) {
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        completed: self.isCompleted(m.id),
        available: m.id === 'wrong5' ? wrongCount >= 1 : true,
      };
    });
  };
  BonusService.prototype.completedCount = function () {
    var self = this;
    return BONUS_MISSIONS.filter(function (m) { return self.isCompleted(m.id); }).length;
  };
  BonusService.prototype.allCompleted = function () { return this.completedCount() >= BONUS_MISSIONS.length; };
  BonusService.prototype.nextIncompleteMission = function () {
    var missions = this.getTodayMissions();
    for (var i = 0; i < missions.length; i++) {
      if (!missions[i].completed && missions[i].available) return missions[i].id;
    }
    return null;
  };
  BonusService.prototype.markCompleted = function (id) {
    this.prefs.setBool(this._key(id), true);
    this.daily.recordDailyActivity();
  };
  BonusService.prototype.resetAll = function () {
    for (var i = 0; i < BONUS_MISSIONS.length; i++) this.prefs.remove(this._key(BONUS_MISSIONS[i].id));
  };

  // -------------------------------------------------------- settings service

  var TTS_DEFAULT_RATE = 0.45;

  function SettingsService(prefs, clock) {
    this.prefs = prefs;
    this.now = clock || function () { return new Date(); };
  }
  SettingsService.prototype.themeMode = function () {
    var v = this.prefs.getString(Keys.themeMode);
    return v === 'light' || v === 'dark' ? v : 'system';
  };
  SettingsService.prototype.setThemeMode = function (mode) {
    this.prefs.setString(Keys.themeMode, mode === 'light' || mode === 'dark' ? mode : 'system');
  };
  SettingsService.prototype.ttsEnabled = function () {
    var v = this.prefs.getBool(Keys.ttsEnabled);
    return v === null ? true : v;
  };
  SettingsService.prototype.setTtsEnabled = function (v) { this.prefs.setBool(Keys.ttsEnabled, !!v); };
  /** flutter_tts rate (0.25-0.75, default 0.45). */
  SettingsService.prototype.ttsRate = function () {
    var v = this.prefs.getDouble(Keys.ttsRate);
    return v === null ? TTS_DEFAULT_RATE : clamp(v, 0.25, 0.75);
  };
  SettingsService.prototype.setTtsRate = function (v) { this.prefs.setDouble(Keys.ttsRate, clamp(v, 0.25, 0.75)); };
  SettingsService.prototype.hasCompletedOnboarding = function () {
    return this.prefs.getBool(Keys.hasCompletedOnboarding) || false;
  };
  SettingsService.prototype.setHasCompletedOnboarding = function (v) { this.prefs.setBool(Keys.hasCompletedOnboarding, !!v); };
  SettingsService.prototype.recordAppOpen = function () { this.prefs.setString(Keys.lastOpenDate, localDateKey(this.now())); };
  /** Web-only: 'mixed' (app behaviour), 'ko-en', 'en-ko'. */
  SettingsService.prototype.quizDirection = function () {
    var v = this.prefs.getString(Keys.quizDirection);
    return v === 'ko-en' || v === 'en-ko' ? v : 'mixed';
  };
  SettingsService.prototype.setQuizDirection = function (v) {
    this.prefs.setString(Keys.quizDirection, v === 'ko-en' || v === 'en-ko' ? v : 'mixed');
  };
  SettingsService.prototype.hasSeenNotice = function (notice) {
    return this.prefs.getBool(Keys.noticeSeen(notice.id, noticeRevision(notice))) || false;
  };
  SettingsService.prototype.markNoticeSeen = function (notice) {
    this.prefs.setBool(Keys.noticeSeen(notice.id, noticeRevision(notice)), true);
  };

  /** flutter_tts speech rate (0.5 = normal on Android) -> Web Speech rate (1 = normal). */
  function webSpeechRate(flutterRate) {
    return clamp(flutterRate * 2, 0.5, 1.5);
  }

  // ------------------------------------------------------------------ notices

  function noticeRevision(notice) {
    var n = parseInt(notice && notice.revision, 10);
    return isNaN(n) ? 1 : n;
  }

  /** data/notice_repository.dart: active notices sorted by date desc, plus banner line. */
  function parseNotices(json) {
    var data = json && typeof json === 'object' ? json : {};
    var list = Array.isArray(data.notices) ? data.notices : [];
    var notices = list
      .filter(function (n) { return n && typeof n === 'object'; })
      .map(function (n) {
        return {
          id: n.id === undefined || n.id === null ? '' : String(n.id),
          revision: noticeRevision(n),
          title: n.title === undefined || n.title === null ? '' : String(n.title),
          message: n.message === undefined || n.message === null ? '' : String(n.message),
          date: n.date === undefined || n.date === null ? '' : String(n.date),
          button: n.button === undefined || n.button === null ? 'OK' : String(n.button),
          active: n.active !== false,
        };
      })
      .filter(function (n) { return n.active && n.id; });
    // Dart's List.sort is not stable; a stable sort keeps file order for ties.
    notices.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var banner = data.banner && typeof data.banner === 'object' ? data.banner : null;
    var bannerText = banner && banner.active === true ? String(banner.message || '').trim() : '';
    var bannerLine = bannerText || (notices.length ? noticeSummary(notices[0]) : '');
    return { notices: notices, bannerLine: bannerLine };
  }

  function noticeSummary(notice) {
    var t = notice.title.trim();
    var m = notice.message.trim();
    if (t && m) return t + ' — ' + m;
    return t || m;
  }

  // ------------------------------------------------------ session finishing

  /**
   * services/quiz_session_controller.dart QuizSessionController.finish().
   * services: {progress, daily, weekly, bonus}. Returns the result object.
   */
  function finishSession(services, config, score, correctCount, total, bestStreak) {
    var progress = services.progress;
    var daily = services.daily;
    var weekly = services.weekly;
    var bonus = services.bonus;

    progress.recordQuizSession(correctCount, total);

    var playStreakCurrent = 0;
    var attendanceStreak = 0;
    var wasDailyPractice = false;
    var completedBonusMission = null;

    if (config.expert) {
      // Expert quiz (expert_quiz_screen.dart) only records quiz stats.
    } else if (isDailyPractice(config)) {
      wasDailyPractice = true;
      var checkIn = daily.checkInToday();
      attendanceStreak = checkIn.streak;
      playStreakCurrent = daily.updatePlayStreak().current;
      daily.markDailyCompleted();
      daily.recordDailyActivity();
      weekly.recordDailyCompleted();
    } else if (config.bonus) {
      var missionComplete = config.bonus === 'perfect' ? correctCount === total : true;
      if (missionComplete) {
        bonus.markCompleted(config.bonus);
        completedBonusMission = config.bonus;
      }
      daily.recordDailyActivity();
    } else if (config.mode !== 'random') {
      daily.recordDailyActivity();
      if (config.mode === 'wrong') weekly.recordWrongReviewCorrect(correctCount);
    }

    if (!config.expert) {
      weekly.syncLearnedCount(progress.countLearned());
      if (isDailyPractice(config)) daily.clearSavedSession();
    }

    return {
      score: score,
      correctCount: correctCount,
      total: total,
      bestStreak: bestStreak,
      replayPath: quizConfigToQuery(config),
      expert: !!config.expert,
      playStreakCurrent: playStreakCurrent,
      attendanceStreak: attendanceStreak,
      wasDailyPractice: wasDailyPractice,
      completedBonusMission: completedBonusMission,
      hasRemainingBonusMissions: !config.expert && daily.isDailyCompletedToday() && !bonus.allCompleted(),
      isPerfect: total > 0 && correctCount === total,
    };
  }

  /** Builds all services on one prefs store. */
  function createServices(prefs, clock) {
    var progress = new ProgressService(prefs, clock);
    var daily = new DailyService(prefs, clock);
    var weekly = new WeeklyService(prefs, clock);
    var bonus = new BonusService(prefs, progress, daily, clock);
    var settings = new SettingsService(prefs, clock);
    return { prefs: prefs, progress: progress, daily: daily, weekly: weekly, bonus: bonus, settings: settings };
  }

  /** progress_reset_service.dart resetAll(). */
  function resetAllProgress(services) {
    services.progress.resetAll();
    services.daily.resetAllProgress();
    services.bonus.resetAll();
    services.weekly.resetAll();
  }

  /** share_service.dart buildResultShareText(), pointing at the web version. */
  function buildResultShareText(result, learnedCount, totalWordsLabel, url) {
    var accuracy = result.total > 0 ? Math.round((result.correctCount / result.total) * 100) : 0;
    var lines = ['I just practiced Korean on Korean Word Quiz!'];
    if (result.total > 0 && result.correctCount === result.total) lines.push('💯 Perfect score!');
    lines.push('📊 ' + result.correctCount + '/' + result.total + ' correct (' + accuracy + '%)');
    if (result.attendanceStreak > 0) lines.push('🔥 ' + result.attendanceStreak + '-day streak');
    lines.push('📚 ' + learnedCount + ' words learned · ' + totalWordsLabel + ' total');
    lines.push('Try it: ' + url);
    return lines.join('\n');
  }

  return {
    LEVELS: LEVELS,
    LEVEL_INFO: LEVEL_INFO,
    isLevel: isLevel,
    DAILY_QUESTION_COUNT: DAILY_QUESTION_COUNT,
    QuizReviewLimits: QuizReviewLimits,
    QuizScoring: QuizScoring,
    BONUS_MISSIONS: BONUS_MISSIONS,
    bonusMissionById: bonusMissionById,
    WEEKLY_CHALLENGES: WEEKLY_CHALLENGES,
    Keys: Keys,
    clamp: clamp,
    localDateKey: localDateKey,
    weekKey: weekKey,
    diffDays: diffDays,
    formatCount: formatCount,
    createRng: createRng,
    shuffle: shuffle,
    fnv1a32: fnv1a32,
    wordId: wordId,
    koreanOfId: koreanOfId,
    sanitizeQuizDefinition: sanitizeQuizDefinition,
    sanitizeQuizExample: sanitizeQuizExample,
    buildQuestion: buildQuestion,
    buildExpertQuestion: buildExpertQuestion,
    pickChoicesToHide: pickChoicesToHide,
    makeQuizConfig: makeQuizConfig,
    isDailyPractice: isDailyPractice,
    quizConfigToQuery: quizConfigToQuery,
    quizConfigFromQuery: quizConfigFromQuery,
    bonusQuizConfig: bonusQuizConfig,
    Prefs: Prefs,
    memoryBackend: memoryBackend,
    ProgressService: ProgressService,
    DailyService: DailyService,
    WeeklyService: WeeklyService,
    BonusService: BonusService,
    SettingsService: SettingsService,
    webSpeechRate: webSpeechRate,
    parseNotices: parseNotices,
    noticeSummary: noticeSummary,
    finishSession: finishSession,
    createServices: createServices,
    resetAllProgress: resetAllProgress,
    buildResultShareText: buildResultShareText,
  };
});
