/* Flag Quiz / Capital Quiz (browser versions): shared engine.
   Copied into each game by _src/webgames/build.mjs. Game-specific settings and text are in game.js (window.GAME),
   the countries in data.js (window.COUNTRIES), the rules in logic.js (window.QuizLogic). No frameworks, no build step. */
(function () {
  'use strict';

  var G = window.GAME;
  var DATA = window.COUNTRIES;
  var L = window.QuizLogic;
  var MODES = ['classic', 'reverse'];
  var LEVELS = L.levelCountOf(DATA, function (c) { return c.lv; });
  var BY_CODE = {};
  DATA.forEach(function (c) { BY_CODE[c.c] = c; });

  /* ---------- storage (keys prefixed kys_flag_ / kys_capital_; the site origin is shared by all games) ---------- */
  var store = {
    get: function (key) {
      try { var v = localStorage.getItem(G.prefix + key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem(G.prefix + key, JSON.stringify(value)); } catch (e) { /* private mode or blocked */ }
    },
    remove: function (key) {
      try { localStorage.removeItem(G.prefix + key); } catch (e) { /* ignore */ }
    },
  };

  function browserLang() {
    var langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    return String(langs[0] || 'en').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en';
  }
  var settings = (function () {
    var s = store.get('settings') || {};
    return {
      lang: s.lang === 'ko' || s.lang === 'en' ? s.lang : browserLang(),
      theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
      sound: s.sound === true,
      vibration: s.vibration !== false,
      autoNext: s.autoNext !== false,
      mode: MODES.indexOf(s.mode) >= 0 ? s.mode : 'classic',
    };
  })();
  function saveSettings() { store.set('settings', settings); }
  var progress = L.normalizeProgress(store.get('progress'), MODES);
  function saveProgress() { store.set('progress', progress); }

  /* ---------- text ---------- */
  var COMMON = {
    en: {
      skip: 'Skip to content', settings: 'Settings', studio: "ggook's studio", games: 'Browser games', privacy: 'Privacy Policy',
      flag_credit: 'Flag images', lang_switch: '한국어', lang_switch_label: '한국어로 보기',
      levels: 'Levels', levels_range: 'Levels {a}–{b}', level_n: 'Level {n}', continue_level: 'Play level {n}', unlocked: 'Unlocked', completed: 'Completed', stars: 'Stars',
      perfect: 'Perfect levels', progress: 'Progress', mode: 'Quiz mode', overall: '{a} of {b} stars',
      level_locked: 'Level {n}, locked', level_aria: 'Level {n}, {s} of 3 stars', level_new: 'Level {n}, new', new_badge: 'New',
      back_levels: 'Back to levels', question_of: 'Question {i} of {n}', hint: '50:50', hint_label: '50:50 hint: remove two wrong answers',
      hint_used: 'Hint used for this level', wrong_count: 'Wrong: {n}', pick: 'Choose an answer', keys_help: 'Keys 1–4 to answer, Enter for next, Esc to go back.',
      correct: 'Correct!', not_quite: 'Not quite.', next: 'Next', see_result: 'See result', option_n: 'Option {n}',
      result: 'Result', level_complete: 'Level {n} complete', msg3: 'Perfect!', msg2: 'Well done!', msg1: 'Good try!',
      sub3: 'No wrong answers!', sub2: '1 wrong answer · try for 3 stars!', sub1: '{n} wrong answers · try again!',
      correct_label: 'Correct', wrong_label: 'Wrong', time: 'Time', retry: 'Retry', next_level: 'Next level', all_done: 'All levels done!',
      to_levels: 'Levels', mistakes: 'Review your mistakes', no_mistakes: 'No mistakes in this level. Great job!', all_questions: 'All questions',
      you_chose: 'You chose: {x}', answer_is: 'Answer: {x}',
      secs: '{s}s', mins: '{m}m {s}s',
      set_display: 'Display', set_lang: 'Language', set_theme: 'Theme', theme_system: 'System', theme_light: 'Light', theme_dark: 'Dark',
      set_play: 'Play', set_auto: 'Auto-advance', set_auto_desc: 'Go to the next question after a correct answer', set_sound: 'Sound effects',
      set_sound_desc: 'Short tones for right and wrong answers', set_vibration: 'Vibration', set_vibration_desc: 'Buzz on a wrong answer (supported phones)',
      set_data: 'Progress', reset: 'Reset progress', reset_desc: 'Clears stars and unlocked levels in both modes on this device.',
      reset_title: 'Reset progress?', reset_body: 'All stars and unlocked levels for both quiz modes will be deleted from this browser. This cannot be undone.',
      cancel: 'Cancel', reset_done: 'Progress reset', set_about: 'About', saved_note: 'Progress is saved in this browser only.',
      version: 'Version', search: 'Search', search_ph: 'Search countries…', all_regions: 'All', shown: '{n} of {t} shown', none: 'No countries match your search.',
      play: 'Play', look_like: 'Looks like:', region: 'Region', flag_of: 'Flag of {x}', flag_unknown: 'Flag to identify',
      r_africa: 'Africa', 'r_asia': 'Asia', 'r_europe': 'Europe', 'r_north-america': 'North America', 'r_south-america': 'South America', r_oceania: 'Oceania',
    },
    ko: {
      skip: '본문으로 건너뛰기', settings: '설정', studio: 'ggook\'s studio', games: '브라우저 게임', privacy: '개인정보처리방침',
      flag_credit: '국기 이미지', lang_switch: 'English', lang_switch_label: 'View in English',
      levels: '레벨', levels_range: '레벨 {a}–{b}', level_n: '레벨 {n}', continue_level: '레벨 {n} 플레이', unlocked: '열린 레벨', completed: '완료', stars: '별',
      perfect: '만점 레벨', progress: '진행 상황', mode: '퀴즈 모드', overall: '별 {b}개 중 {a}개',
      level_locked: '레벨 {n}, 잠김', level_aria: '레벨 {n}, 별 3개 중 {s}개', level_new: '레벨 {n}, 새 레벨', new_badge: 'New',
      back_levels: '레벨 목록으로', question_of: '{n}문제 중 {i}번', hint: '50:50', hint_label: '50:50 힌트: 오답 두 개 지우기',
      hint_used: '이 레벨의 힌트를 사용했어요', wrong_count: '오답 {n}', pick: '답을 고르세요', keys_help: '1–4 키로 답하고, Enter로 다음, Esc로 돌아가요.',
      correct: '정답!', not_quite: '아쉬워요.', next: '다음', see_result: '결과 보기', option_n: '{n}번 보기',
      result: '결과', level_complete: '레벨 {n} 완료', msg3: '완벽해요!', msg2: '잘했어요!', msg1: '좋은 시도예요!',
      sub3: '틀린 문제가 없어요!', sub2: '1문제 틀렸어요 · 별 3개에 도전해 보세요!', sub1: '{n}문제 틀렸어요 · 다시 도전해 보세요!',
      correct_label: '정답', wrong_label: '오답', time: '시간', retry: '다시 하기', next_level: '다음 레벨', all_done: '모든 레벨 완료!',
      to_levels: '레벨 목록', mistakes: '틀린 문제 복습', no_mistakes: '이 레벨에서 틀린 문제가 없어요. 훌륭해요!', all_questions: '전체 문제',
      you_chose: '내 답: {x}', answer_is: '정답: {x}',
      secs: '{s}초', mins: '{m}분 {s}초',
      set_display: '화면', set_lang: '언어', set_theme: '테마', theme_system: '시스템', theme_light: '라이트', theme_dark: '다크',
      set_play: '플레이', set_auto: '자동으로 넘기기', set_auto_desc: '정답을 맞히면 다음 문제로 자동으로 넘어가요', set_sound: '효과음',
      set_sound_desc: '정답과 오답에 짧은 소리를 내요', set_vibration: '진동', set_vibration_desc: '오답일 때 진동해요 (지원하는 휴대폰)',
      set_data: '진행 상황', reset: '진행 상황 초기화', reset_desc: '이 기기에 저장된 두 모드의 별과 열린 레벨을 지워요.',
      reset_title: '진행 상황을 초기화할까요?', reset_body: '두 퀴즈 모드의 별과 열린 레벨이 이 브라우저에서 모두 삭제돼요. 되돌릴 수 없어요.',
      cancel: '취소', reset_done: '진행 상황을 초기화했어요', set_about: '정보', saved_note: '진행 상황은 이 브라우저에만 저장돼요.',
      version: '버전', search: '검색', search_ph: '나라 검색…', all_regions: '전체', shown: '{t}개 중 {n}개', none: '검색 결과가 없어요.',
      play: '플레이', look_like: '비슷한 국기:', region: '지역', flag_of: '{x} 국기', flag_unknown: '맞혀야 할 국기',
      r_africa: '아프리카', r_asia: '아시아', r_europe: '유럽', 'r_north-america': '북아메리카', 'r_south-america': '남아메리카', r_oceania: '오세아니아',
    },
  };

  function t(key, vars) {
    var s = (G.str[settings.lang] && G.str[settings.lang][key]) || COMMON[settings.lang][key];
    if (s == null) s = (G.str.en && G.str.en[key]) || COMMON.en[key] || key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    }
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  var LI = function () { return settings.lang === 'ko' ? 1 : 0; };
  function nameOf(c) { return c.n[LI()]; }
  /* in an English sentence: "the United States", "the Netherlands"... */
  function nameIn(c) { return (settings.lang === 'en' && c.the ? 'the ' : '') + nameOf(c); }
  function capOf(c) { return c.cap ? c.cap[LI()] : ''; }
  function noteOf(c) { return c.note ? c.note[LI()] : ''; }
  function flagSrc(c) { return 'flags/' + c.c.toLowerCase() + '.svg'; }

  /* Korean particles: 은/는, 이/가 depending on the final consonant of the last Hangul syllable. */
  function josa(word, withBatchim, without) {
    var w = String(word).replace(/[\s.()]+$/, '');
    var ch = w.charCodeAt(w.length - 1);
    if (ch >= 0xac00 && ch <= 0xd7a3) return word + ((ch - 0xac00) % 28 ? withBatchim : without);
    return word + without; // Latin ending (only "워싱턴 D.C.", read 디시): no final consonant
  }

  var ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4-6-6 6-6z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
    lock: '<svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM9 8V6a3 3 0 0 1 6 0v2H9z"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    bad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19a7 7 0 0 0-4 12.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26A7 7 0 0 0 12 2z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
  };
  function starsHtml(n, label) {
    var h = '<span class="stars"' + (label ? ' role="img" aria-label="' + esc(label) + '"' : ' aria-hidden="true"') + '>';
    for (var i = 1; i <= 3; i++) h += '<span class="' + (i <= n ? 'on' : '') + '">' + ICON.star + '</span>';
    return h + '</span>';
  }

  /* ---------- theme, language, document meta ---------- */
  var root = document.documentElement;
  function applyTheme() {
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }
  function setMeta(sel, attr, value) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute(attr, value);
  }
  function applyLang() {
    root.lang = settings.lang;
    var page = document.body.getAttribute('data-page');
    if (page === 'list') {
      document.title = t('list_title') + ' – ' + t('title');
      setMeta('meta[name="description"]', 'content', t('list_desc'));
    } else {
      document.title = t('doc_title');
      setMeta('meta[name="description"]', 'content', t('description'));
    }
    var nodes = document.querySelectorAll('[data-t]');
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-t'));
    var attrs = document.querySelectorAll('[data-t-attr]');
    for (var j = 0; j < attrs.length; j++) {
      var spec = attrs[j].getAttribute('data-t-attr').split(':');
      attrs[j].setAttribute(spec[0], t(spec[1]));
    }
    var about = document.getElementById('about');
    if (about && G.str[settings.lang].about_html) about.innerHTML = G.str[settings.lang].about_html;
  }
  function setLang(lang) {
    settings.lang = lang;
    saveSettings();
    applyLang();
    if (document.body.getAttribute('data-page') === 'list') listRender();
    else render(true);
  }

  /* ---------- feedback: sound and vibration (only when switched on) ---------- */
  var audioCtx = null;
  function tone(ok) {
    if (!settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var now = audioCtx.currentTime;
      var notes = ok ? [660, 880] : [220, 180];
      notes.forEach(function (f, i) {
        var o = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        o.type = ok ? 'sine' : 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + i * 0.11);
        g.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.06, now + i * 0.11 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.16);
        o.connect(g).connect(audioCtx.destination);
        o.start(now + i * 0.11);
        o.stop(now + i * 0.11 + 0.18);
      });
    } catch (e) { /* no audio */ }
  }
  function buzz() {
    // Browsers refuse (and log an error) before the visitor has tapped the page
    var tapped = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (settings.vibration && navigator.vibrate && tapped) {
      try { navigator.vibrate(80); } catch (e) { /* ignore */ }
    }
  }

  var live = document.getElementById('live');
  function announce(msg) {
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }
  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }

  function preload(codes) {
    codes.forEach(function (code) {
      var img = new Image();
      img.src = 'flags/' + code.toLowerCase() + '.svg';
    });
  }

  /* =====================================================================
     Single-page game (index.html): routes #/ , #/play/<mode>/<level>, #/result, #/settings
     ===================================================================== */
  var view = document.getElementById('view');
  var quiz = null;      // current level being played
  var lastResult = null; // finished level, for the result screen
  var advanceTimer = null;

  function route() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts[0] === 'play' && MODES.indexOf(parts[1]) >= 0) {
      var lv = parseInt(parts[2], 10);
      if (lv >= 1 && lv <= LEVELS) return { name: 'quiz', mode: parts[1], level: lv };
    }
    if (parts[0] === 'result') return { name: 'result' };
    if (parts[0] === 'settings') return { name: 'settings' };
    return { name: 'home' };
  }
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  var current = null;
  function render(langOnly) {
    clearTimeout(advanceTimer);
    var r = route();
    var about = document.getElementById('about');
    if (about) about.hidden = r.name !== 'home';
    if (r.name === 'quiz') {
      var mp = progress.modes[r.mode];
      if (!L.isUnlocked(mp, r.level)) { location.replace('#/'); return; }
      if (langOnly && quiz && quiz.mode === r.mode && quiz.level === r.level) { renderQuiz(true); return; }
      startQuiz(r.mode, r.level);
    } else if (r.name === 'result') {
      if (!lastResult) { location.replace('#/'); return; }
      renderResult(langOnly);
    } else if (r.name === 'settings') {
      renderSettings(langOnly);
    } else {
      renderHome(langOnly);
    }
    var changed = !current || current.name !== r.name;
    current = r;
    if (!langOnly && changed) window.scrollTo(0, 0);
  }

  /* ---------- home: mode, progress, level map ---------- */
  function renderHome(keepFocus) {
    var mode = settings.mode;
    var mp = progress.modes[mode];
    var sum = L.summary(mp, LEVELS);
    var next = L.suggestedLevel(mp, LEVELS);
    var modesHtml = MODES.map(function (m) {
      var s = L.summary(progress.modes[m], LEVELS);
      return '<button class="mode" role="radio" aria-checked="' + (m === mode) + '" data-action="mode" data-mode="' + m + '" tabindex="' + (m === mode ? 0 : -1) + '">' +
        '<span class="dot" aria-hidden="true"></span><span><span class="m-title">' + esc(t('mode_' + m)) + '</span>' +
        '<span class="m-desc">' + esc(t('mode_' + m + '_desc')) + '</span></span>' +
        '<span class="m-stat" aria-label="' + esc(t('overall', { a: s.stars, b: s.maxStars })) + '">' + ICON.star + s.stars + '</span></button>';
    }).join('');
    var pct = Math.round((sum.stars / sum.maxStars) * 100);
    var tiers = [[1, Math.min(G.appLevels, LEVELS), 'tier1'], [G.appLevels + 1, LEVELS, 'tier2']];
    var tiersHtml = tiers.filter(function (x) { return x[0] <= x[1]; }).map(function (tier) {
      var cells = '';
      for (var lv = tier[0]; lv <= tier[1]; lv++) cells += levelCell(mp, lv);
      return '<section class="tier" aria-labelledby="tier-' + tier[2] + '"><div class="tier-head"><h2 id="tier-' + tier[2] + '">' + esc(t(tier[2])) + '</h2>' +
        '<span>' + esc(t('levels_range', { a: tier[0], b: tier[1] })) + ' · ' + esc(t(tier[2] + '_desc')) + '</span></div>' +
        '<div class="levels">' + cells + '</div></section>';
    }).join('');

    view.innerHTML =
      '<div class="wrap">' +
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="/">' + esc(t('studio')) + '</a><span aria-hidden="true">›</span><a href="/play/">' + esc(t('games')) + '</a><span aria-hidden="true">›</span><span aria-current="page">' + esc(t('title')) + '</span></nav>' +
      '<div class="home">' +
      '<div class="side">' +
      '<section class="card">' +
      '<div class="hero"><img src="favicon.svg" alt="" width="64" height="64"><div><h1 tabindex="-1" id="home-title">' + esc(t('title')) + '</h1><p>' + esc(t('tagline')) + '</p></div></div>' +
      '<div class="modes" role="radiogroup" aria-label="' + esc(t('mode')) + '">' + modesHtml + '</div>' +
      '<div class="progress-box" aria-label="' + esc(t('progress')) + '">' +
      '<div class="bar-label"><span>' + esc(t('progress')) + '</span><span>' + esc(t('overall', { a: sum.stars, b: sum.maxStars })) + '</span></div>' +
      '<div class="bar" role="progressbar" aria-label="' + esc(t('stars')) + '" aria-valuemin="0" aria-valuemax="' + sum.maxStars + '" aria-valuenow="' + sum.stars + '"><i style="width:' + pct + '%"></i></div>' +
      '<div class="stat-row"><div class="stat"><b>' + sum.unlocked + '/' + LEVELS + '</b><span>' + esc(t('unlocked')) + '</span></div>' +
      '<div class="stat"><b>' + sum.completed + '</b><span>' + esc(t('completed')) + '</span></div>' +
      '<div class="stat"><b>' + sum.perfect + '</b><span>' + esc(t('perfect')) + '</span></div></div></div>' +
      '<div class="home-actions"><a class="btn primary" href="#/play/' + mode + '/' + next + '">' + ICON.play + esc(t('continue_level', { n: next })) + '</a></div>' +
      '</section>' +
      '<a class="card browse-link" href="' + G.listPage + '">' + ICON.grid + '<span><b>' + esc(t('browse')) + '</b><small>' + esc(t('browse_desc')) + '</small></span>' + ICON.chev + '</a>' +
      '</div>' +
      '<section class="card levels-card" aria-labelledby="levels-title"><h2 class="visually-hidden" id="levels-title">' + esc(t('levels')) + '</h2>' + tiersHtml + '</section>' +
      '</div></div>';
    if (!keepFocus) focusView();
  }
  function levelCell(mp, lv) {
    var state = L.levelState(mp, lv);
    var stars = mp.stars[lv] || 0;
    if (state === 'locked') {
      return '<button class="level locked" disabled aria-label="' + esc(t('level_locked', { n: lv })) + '">' + ICON.lock + '</button>';
    }
    var isNew = state === 'current' && lv === Math.min(mp.max, LEVELS);
    var label = isNew ? t('level_new', { n: lv }) : t('level_aria', { n: lv, s: stars });
    return '<button class="level ' + state + ' s' + stars + '" data-action="level" data-level="' + lv + '" aria-label="' + esc(label) + '">' +
      (isNew ? '<span class="new" aria-hidden="true">' + esc(t('new_badge')) + '</span>' : '') +
      '<span aria-hidden="true">' + lv + '</span>' + starsHtml(stars) + '</button>';
  }

  /* ---------- quiz ---------- */
  function startQuiz(mode, level) {
    var opts = {
      levelOf: function (c) { return c.lv; },
      groupOf: function (c) { return c.g; },
      keyOf: G.id === 'capital' ? (mode === 'classic' ? function (c) { return c.cap[0]; } : function (c) { return c.c; }) : null,
      lookalikes: !!G.lookalikes,
    };
    var questions = L.buildLevel(DATA, level, opts, Math.random);
    var codes = [];
    questions.forEach(function (q) { q.choices.forEach(function (c) { codes.push(c.c); }); });
    preload(codes);
    quiz = {
      mode: mode, level: level, questions: questions, index: 0, answered: false, picked: -1,
      wrong: 0, results: [], hintUsed: false, out: {}, start: Date.now(),
    };
    renderQuiz();
  }

  function questionHtml(q) {
    var a = q.answer;
    var m = quiz.mode;
    if (G.id === 'flag') {
      if (m === 'classic') {
        return '<h2 class="prompt" id="q-prompt" tabindex="-1">' + esc(t('prompt_classic')) + '</h2>' +
          '<div class="qflag"><img src="' + flagSrc(a) + '" alt="' + esc(quiz.answered ? t('flag_of', { x: nameOf(a) }) : t('flag_unknown')) + '" width="440" height="330"></div>';
      }
      return '<p class="prompt" id="q-prompt">' + esc(t('prompt_reverse')) + '</p><h2 class="qname" tabindex="-1" id="q-focus">' + esc(nameOf(a)) + '</h2>';
    }
    if (m === 'classic') {
      return '<div class="qflag small"><img src="' + flagSrc(a) + '" alt="' + esc(t('flag_of', { x: nameOf(a) })) + '" width="112" height="84"></div>' +
        '<h2 class="qname" tabindex="-1" id="q-focus">' + esc(nameOf(a)) + '</h2><p class="prompt" id="q-prompt">' + esc(t('prompt_classic')) + '</p>';
    }
    return '<p class="prompt" id="q-prompt">' + esc(t('prompt_reverse')) + '</p><h2 class="qname" tabindex="-1" id="q-focus">' + esc(capOf(a)) + '</h2>';
  }

  function choiceHtml(c, i) {
    var key = '<span class="key" aria-hidden="true">' + (i + 1) + '</span>';
    var mark = '<span class="mark" aria-hidden="true"></span>';
    var attrs = 'class="choice" data-action="choose" data-i="' + i + '"';
    if (G.id === 'flag' && quiz.mode === 'reverse') {
      return '<button ' + attrs + ' aria-label="' + esc(t('option_n', { n: i + 1 })) + '">' + key + mark +
        '<span class="fimg"><img src="' + flagSrc(c) + '" alt="" width="200" height="150"></span><span class="caption" aria-hidden="true"></span></button>';
    }
    var label = G.id === 'flag' ? nameOf(c) : (quiz.mode === 'classic' ? capOf(c) : nameOf(c));
    var mini = G.id === 'capital' && quiz.mode === 'reverse' ? '<span class="mini"><img src="' + flagSrc(c) + '" alt="" width="36" height="27"></span>' : '';
    return '<button ' + attrs + '>' + key + mini + '<span class="label">' + esc(label) + '</span>' + mark + '</button>';
  }

  function renderQuiz(langOnly) {
    var q = quiz.questions[quiz.index];
    var n = quiz.questions.length;
    var dots = '';
    for (var i = 0; i < n; i++) {
      var cls = i < quiz.results.length ? (quiz.results[i].ok ? 'ok' : 'bad') : (i === quiz.index ? 'now' : '');
      dots += '<i class="' + cls + '"></i>';
    }
    var flagChoices = G.id === 'flag' && quiz.mode === 'reverse';
    view.innerHTML =
      '<div class="wrap"><div class="quiz">' +
      '<div class="quiz-top"><a class="icon-btn" href="#/" aria-label="' + esc(t('back_levels')) + '">' + ICON.back + '</a>' +
      '<div class="qtitle">' + esc(t('level_n', { n: quiz.level })) + ' · ' + esc(t('mode_' + quiz.mode)) +
      '<small>' + esc(t('question_of', { i: quiz.index + 1, n: n })) + '</small></div>' +
      '<button class="hint-btn" data-action="hint" aria-label="' + esc(quiz.hintUsed ? t('hint_used') : t('hint_label')) + '"' + (quiz.hintUsed || quiz.answered ? ' disabled' : '') + '>' + ICON.bulb + esc(t('hint')) + '</button></div>' +
      '<div class="dots" role="img" aria-label="' + esc(t('question_of', { i: quiz.index + 1, n: n })) + '">' + dots + '</div>' +
      '<section class="card qcard" aria-labelledby="q-prompt">' + questionHtml(q) + '</section>' +
      '<div class="answer-col">' +
      '<div class="choices' + (flagChoices ? ' flags' : '') + '" role="group" aria-labelledby="q-prompt">' + q.choices.map(choiceHtml).join('') + '</div>' +
      '<div class="card feedback" id="feedback"></div>' +
      '<div class="quiz-meta"><span class="chip' + (quiz.wrong ? ' bad' : '') + '" id="wrong-chip">' + esc(t('wrong_count', { n: quiz.wrong })) + '</span></div>' +
      '<p class="kbd-help muted" style="text-align:center;font-size:13px">' + esc(t('keys_help')) + '</p>' +
      '</div></div></div>';
    // restore state after a language switch
    Object.keys(quiz.out).forEach(function (k) { markOut(+k); });
    if (quiz.answered) paintAnswer(false);
    else paintIdle();
    if (!langOnly) {
      var f = document.getElementById('q-focus') || document.getElementById('q-prompt');
      if (f) f.focus({ preventScroll: true });
      else focusView();
      announce(t('question_of', { i: quiz.index + 1, n: n }) + '. ' + (G.id === 'flag' && quiz.mode === 'classic' ? t('prompt_classic') : ''));
    }
  }

  function paintIdle() {
    var fb = document.getElementById('feedback');
    fb.className = 'card feedback';
    fb.innerHTML = '<p class="fb-idle">' + esc(t('pick')) + '</p>';
  }

  function choiceButtons() { return view.querySelectorAll('.choice'); }

  function markOut(i) {
    var b = choiceButtons()[i];
    if (b) { b.classList.add('is-out'); b.disabled = true; }
  }

  function feedbackText(q, ok) {
    var a = q.answer;
    var name = nameIn(a);
    if (G.id === 'flag') {
      if (quiz.mode === 'classic') return t(ok ? 'fb_classic_ok' : 'fb_classic_bad', { x: name });
      return t(ok ? 'fb_reverse_ok' : 'fb_reverse_bad', { x: name });
    }
    var cap = capOf(a);
    return t(ok ? 'fb_ok' : 'fb_bad', {
      x: name, c: cap,
      cj: josa(cap, '은', '는'),
      cy: josa(cap, '이에요', '예요'),
    });
  }

  function paintAnswer(withEffects) {
    var q = quiz.questions[quiz.index];
    var res = quiz.results[quiz.index];
    var ok = res.ok;
    var btns = choiceButtons();
    q.choices.forEach(function (c, i) {
      var b = btns[i];
      b.disabled = true;
      var isAns = c.c === q.answer.c;
      if (isAns) {
        b.classList.add('is-correct');
        b.querySelector('.mark').innerHTML = ICON.ok;
      } else if (i === quiz.picked) {
        b.classList.add('is-wrong');
        b.querySelector('.mark').innerHTML = ICON.bad;
      } else {
        b.classList.add('is-dim');
      }
      var cap = b.querySelector('.caption');
      if (cap) {
        cap.textContent = nameOf(c);
        cap.removeAttribute('aria-hidden');
        b.setAttribute('aria-label', t('option_n', { n: i + 1 }) + ': ' + nameOf(c) + (isAns ? ' ✓' : ''));
      }
    });
    var img = view.querySelector('.qflag img');
    if (img && G.id === 'flag') img.alt = t('flag_of', { x: nameOf(q.answer) });
    var hintBtn = view.querySelector('.hint-btn');
    if (hintBtn) hintBtn.disabled = true;
    var chip = document.getElementById('wrong-chip');
    chip.textContent = t('wrong_count', { n: quiz.wrong });
    chip.className = 'chip' + (quiz.wrong ? ' bad' : '');
    var dot = view.querySelectorAll('.dots i')[quiz.index];
    if (dot) dot.className = ok ? 'ok' : 'bad';

    var last = quiz.index === quiz.questions.length - 1;
    var note = G.id === 'capital' ? noteOf(q.answer) : lookNote(q.answer);
    var msg = feedbackText(q, ok);
    var fb = document.getElementById('feedback');
    fb.className = 'card feedback ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = '<div class="fb-msg">' + (ok ? ICON.ok : ICON.bad) + '<div><strong>' + esc(ok ? t('correct') : t('not_quite')) + '</strong><span>' + esc(msg) + '</span></div></div>' +
      (note ? '<p class="fb-note">' + esc(note) + '</p>' : '') +
      '<button class="btn primary" data-action="next" id="next-btn">' + esc(last ? t('see_result') : t('next')) + ' <span class="kbd-hint" aria-hidden="true">Enter</span></button>';
    if (withEffects) {
      announce((ok ? t('correct') : t('not_quite')) + ' ' + msg + (note ? ' ' + note : ''));
      document.getElementById('next-btn').focus({ preventScroll: true });
      if (ok) {
        tone(true);
        if (settings.autoNext) advanceTimer = setTimeout(nextQuestion, note ? 2200 : 1100);
      } else {
        tone(false);
        buzz();
      }
    }
  }

  function lookNote(c) {
    if (!c.look || !c.look.length) return '';
    var names = c.look.map(function (code) { return BY_CODE[code] ? nameOf(BY_CODE[code]) : code; });
    return t('look_note', { x: names.join(', ') });
  }

  function choose(i) {
    if (!quiz || quiz.answered || quiz.out[i]) return;
    var q = quiz.questions[quiz.index];
    if (!q.choices[i]) return;
    var ok = q.choices[i].c === q.answer.c;
    quiz.answered = true;
    quiz.picked = i;
    if (!ok) quiz.wrong++;
    quiz.results.push({ answer: q.answer, picked: q.choices[i], ok: ok });
    paintAnswer(true);
  }

  function useHint() {
    if (!quiz || quiz.answered || quiz.hintUsed) return;
    var q = quiz.questions[quiz.index];
    var rm = L.hintRemovals(q.choices, q.answer, quiz.out, Math.random);
    quiz.hintUsed = true;
    rm.forEach(function (i) { quiz.out[i] = true; markOut(i); });
    var hb = view.querySelector('.hint-btn');
    if (hb) { hb.disabled = true; hb.setAttribute('aria-label', t('hint_used')); }
    announce(t('hint_label'));
    var first = view.querySelector('.choice:not(:disabled)');
    if (first) first.focus();
  }

  function nextQuestion() {
    clearTimeout(advanceTimer);
    if (!quiz || !quiz.answered) return;
    if (quiz.index < quiz.questions.length - 1) {
      quiz.index++;
      quiz.answered = false;
      quiz.picked = -1;
      quiz.out = {};
      renderQuiz();
      return;
    }
    finishLevel();
  }

  function finishLevel() {
    var stars = L.starsFor(quiz.wrong);
    var prevMax = progress.modes[quiz.mode].max;
    L.recordResult(progress, quiz.mode, quiz.level, stars, LEVELS);
    saveProgress();
    lastResult = {
      mode: quiz.mode, level: quiz.level, wrong: quiz.wrong, stars: stars, results: quiz.results,
      seconds: Math.round((Date.now() - quiz.start) / 1000),
      unlockedNew: progress.modes[quiz.mode].max > prevMax,
    };
    quiz = null;
    go('#/result');
  }

  /* ---------- result ---------- */
  function fmtTime(s) {
    return s < 60 ? t('secs', { s: s }) : t('mins', { m: Math.floor(s / 60), s: s % 60 });
  }
  function reviewRow(r, showOk) {
    var a = r.answer;
    var main;
    var sub = '';
    if (G.id === 'flag') {
      main = nameOf(a);
      if (!r.ok) sub = t('you_chose', { x: nameOf(r.picked) });
    } else if (lastResult.mode === 'classic') {
      main = nameOf(a) + ' — ' + capOf(a);
      if (!r.ok) sub = t('you_chose', { x: capOf(r.picked) });
    } else {
      main = capOf(a) + ' — ' + nameOf(a);
      if (!r.ok) sub = t('you_chose', { x: nameOf(r.picked) });
    }
    var note = !r.ok && !showOk ? (G.id === 'capital' ? noteOf(a) : lookNote(a)) : '';
    var pickedThumb = !r.ok && G.id === 'flag' ? '<span class="thumb" style="width:36px"><img src="' + flagSrc(r.picked) + '" alt="' + esc(t('flag_of', { x: nameOf(r.picked) })) + '" loading="lazy" width="36" height="27"></span>' : '';
    return '<li><span class="thumb"><img src="' + flagSrc(a) + '" alt="' + esc(t('flag_of', { x: nameOf(a) })) + '" loading="lazy" width="48" height="36"></span>' +
      '<div class="r-body"><div class="r-main">' + esc(main) + '</div>' +
      (sub ? '<div class="r-sub bad">' + esc(sub) + '</div>' : '') +
      (note ? '<div class="r-note">' + esc(note) + '</div>' : '') + '</div>' + pickedThumb +
      (showOk ? '<span class="tag ' + (r.ok ? 'ok' : 'bad') + '">' + esc(r.ok ? t('correct_label') : t('wrong_label')) + '</span>' : '') + '</li>';
  }
  function renderResult(keepFocus) {
    var R = lastResult;
    var n = R.results.length;
    var mistakes = R.results.filter(function (r) { return !r.ok; });
    var last = R.level >= LEVELS;
    var nextBtn = last
      ? '<a class="btn primary" href="#/" id="res-primary">' + esc(t('all_done')) + '</a>'
      : '<a class="btn primary" href="#/play/' + R.mode + '/' + (R.level + 1) + '" id="res-primary">' + esc(t('next_level')) + ' ' + ICON.chev + '</a>';
    view.innerHTML =
      '<div class="wrap"><div class="result">' +
      '<div class="res-left">' +
      '<div class="quiz-top"><a class="icon-btn" href="#/" aria-label="' + esc(t('back_levels')) + '">' + ICON.back + '</a><div class="qtitle">' + esc(t('result')) + '<small>' + esc(t('mode_' + R.mode)) + '</small></div></div>' +
      '<section class="card res-hero"><span class="res-level">' + esc(t('level_complete', { n: R.level })) + '</span>' +
      '<h1 tabindex="-1" id="res-title">' + esc(t('msg' + R.stars)) + '</h1>' + starsHtml(R.stars, t('level_aria', { n: R.level, s: R.stars })) +
      '<p>' + esc(R.stars === 3 ? t('sub3') : R.stars === 2 ? t('sub2') : t('sub1', { n: R.wrong })) + '</p></section>' +
      '<div class="res-stats"><div class="stat ok card"><b>' + (n - R.wrong) + '/' + n + '</b><span>' + esc(t('correct_label')) + '</span></div>' +
      '<div class="stat bad card"><b>' + R.wrong + '</b><span>' + esc(t('wrong_label')) + '</span></div>' +
      '<div class="stat card"><b>' + esc(fmtTime(R.seconds)) + '</b><span>' + esc(t('time')) + '</span></div></div>' +
      '<div class="btn-row"><a class="btn" href="#/play/' + R.mode + '/' + R.level + '" data-action="retry">' + ICON.retry + esc(t('retry')) + '</a>' + nextBtn + '</div>' +
      '<a class="btn" href="#/">' + esc(t('to_levels')) + '</a>' +
      '<!-- Ad slot hook (result screen). Empty, hidden and takes no space. No ad code is loaded on this page. -->' +
      '<div class="ad-slot" data-ad-slot="result" hidden></div>' +
      '</div>' +
      '<div class="res-right">' +
      '<section class="card review" aria-labelledby="mistakes-h"><h2 id="mistakes-h">' + esc(t('mistakes')) + '</h2>' +
      (mistakes.length ? '<ul>' + mistakes.map(function (r) { return reviewRow(r, false); }).join('') + '</ul>'
        : '<p class="all-clear">' + ICON.ok + esc(t('no_mistakes')) + '</p>') + '</section>' +
      '<section class="card review" aria-labelledby="all-h"><h2 id="all-h">' + esc(t('all_questions')) + '</h2><ul>' +
      R.results.map(function (r) { return reviewRow(r, true); }).join('') + '</ul></section>' +
      '</div></div></div>';
    if (!keepFocus) {
      var h = document.getElementById('res-title');
      if (h) h.focus({ preventScroll: true });
      announce(t('level_complete', { n: R.level }) + '. ' + t('msg' + R.stars) + ' ' + t('level_aria', { n: R.level, s: R.stars }));
    }
  }

  /* ---------- settings ---------- */
  function seg(name, value, options) {
    return '<div class="seg" role="radiogroup" aria-label="' + esc(t(name === 'lang' ? 'set_lang' : 'set_theme')) + '">' + options.map(function (o) {
      var on = o[0] === value;
      return '<button role="radio" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-action="seg" data-name="' + name + '" data-value="' + o[0] + '"' +
        (o[2] ? ' lang="' + o[2] + '"' : '') + '>' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function sw(name, label, desc) {
    return '<div class="set-row sw-row"><span id="sl-' + name + '"><span class="s-label">' + esc(t(label)) + '</span><span class="s-desc">' + esc(t(desc)) + '</span></span>' +
      '<button class="switch" role="switch" aria-checked="' + !!settings[name] + '" aria-labelledby="sl-' + name + '" data-action="toggle" data-name="' + name + '"></button></div>';
  }
  function renderSettings(keepFocus) {
    var vib = 'vibrate' in navigator ? sw('vibration', 'set_vibration', 'set_vibration_desc') : '';
    view.innerHTML =
      '<div class="wrap"><div class="settings">' +
      '<div class="page-head"><a class="icon-btn" href="#/" aria-label="' + esc(t('back_levels')) + '">' + ICON.back + '</a><h1 tabindex="-1" id="set-title">' + esc(t('settings')) + '</h1></div>' +
      '<section class="card set-group"><h2>' + esc(t('set_display')) + '</h2>' +
      '<div class="set-row"><span class="s-label">' + esc(t('set_lang')) + '</span>' + seg('lang', settings.lang, [['en', 'English', 'en'], ['ko', '한국어', 'ko']]) + '</div>' +
      '<div class="set-row"><span class="s-label">' + esc(t('set_theme')) + '</span>' + seg('theme', settings.theme, [['system', t('theme_system')], ['light', t('theme_light')], ['dark', t('theme_dark')]]) + '</div></section>' +
      '<section class="card set-group"><h2>' + esc(t('set_play')) + '</h2>' + sw('autoNext', 'set_auto', 'set_auto_desc') + sw('sound', 'set_sound', 'set_sound_desc') + vib + '</section>' +
      '<section class="card set-group"><h2>' + esc(t('set_data')) + '</h2><div class="set-row"><span><span class="s-label">' + esc(t('reset')) + '</span><span class="s-desc">' + esc(t('reset_desc')) + '</span></span>' +
      '<button class="btn danger" data-action="reset">' + esc(t('reset')) + '</button></div></section>' +
      '<section class="card set-group"><h2>' + esc(t('set_about')) + '</h2><ul class="links-list">' +
      '<li><a href="' + G.listPage + '">' + esc(t('browse')) + ICON.chev + '</a></li>' +
      '<li><a href="/play/">' + esc(t('games')) + ICON.chev + '</a></li>' +
      '<li><a href="/">' + esc(t('studio')) + ICON.chev + '</a></li>' +
      '<li><a href="/privacy.html">' + esc(t('privacy')) + ICON.chev + '</a></li>' +
      '<li><a href="LICENSE-flags.txt">' + esc(t('flag_credit')) + ' (flag-icons, MIT)' + ICON.chev + '</a></li></ul>' +
      '<p class="credit">' + esc(t('saved_note')) + ' ' + esc(t('version')) + ' ' + esc(G.version) + '</p></section>' +
      '</div></div>' +
      '<dialog id="reset-dialog" aria-labelledby="reset-h"><h2 id="reset-h">' + esc(t('reset_title')) + '</h2><p>' + esc(t('reset_body')) + '</p>' +
      '<div class="btn-row"><button class="btn" data-action="reset-cancel">' + esc(t('cancel')) + '</button><button class="btn danger" data-action="reset-confirm">' + esc(t('reset')) + '</button></div></dialog>';
    if (!keepFocus) {
      var h = document.getElementById('set-title');
      if (h) h.focus({ preventScroll: true });
    }
  }

  function focusView() {
    var h = view.querySelector('h1[tabindex="-1"]');
    if (h) h.focus({ preventScroll: true });
  }

  /* ---------- events ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var act = el.getAttribute('data-action');
    if (act === 'mode') {
      settings.mode = el.getAttribute('data-mode');
      saveSettings();
      renderHome(true);
      var b = view.querySelector('.mode[aria-checked="true"]');
      if (b) b.focus();
    } else if (act === 'level') {
      go('#/play/' + settings.mode + '/' + el.getAttribute('data-level'));
    } else if (act === 'choose') {
      choose(parseInt(el.getAttribute('data-i'), 10));
    } else if (act === 'hint') {
      useHint();
    } else if (act === 'next') {
      nextQuestion();
    } else if (act === 'retry') {
      e.preventDefault();
      var R = lastResult;
      if (location.hash === '#/play/' + R.mode + '/' + R.level) render(); else location.hash = '#/play/' + R.mode + '/' + R.level;
    } else if (act === 'seg') {
      var name = el.getAttribute('data-name');
      var val = el.getAttribute('data-value');
      if (name === 'lang') { setLang(val); }
      else { settings.theme = val; saveSettings(); applyTheme(); renderSettings(true); }
      var again = view.querySelector('[data-action="seg"][data-name="' + name + '"][aria-checked="true"]');
      if (again) again.focus();
    } else if (act === 'toggle') {
      var key = el.getAttribute('data-name');
      settings[key] = !settings[key];
      saveSettings();
      el.setAttribute('aria-checked', String(settings[key]));
      if (key === 'sound' && settings.sound) tone(true);
    } else if (act === 'reset') {
      var d = document.getElementById('reset-dialog');
      if (d && d.showModal) d.showModal();
      else if (window.confirm(t('reset_body'))) doReset();
    } else if (act === 'reset-cancel') {
      document.getElementById('reset-dialog').close();
    } else if (act === 'reset-confirm') {
      document.getElementById('reset-dialog').close();
      doReset();
    } else if (act === 'lang-toggle') {
      setLang(settings.lang === 'ko' ? 'en' : 'ko');
    }
  }
  function doReset() {
    progress = L.normalizeProgress(null, MODES);
    store.remove('progress');
    lastResult = null;
    toast(t('reset_done'));
  }

  /* arrow keys inside radio groups (mode cards, segmented controls) */
  function radioArrows(e) {
    var el = e.target;
    if (!el || el.getAttribute('role') !== 'radio') return false;
    var k = e.key;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].indexOf(k) < 0) return false;
    var group = el.closest('[role="radiogroup"]');
    var items = Array.prototype.slice.call(group.querySelectorAll('[role="radio"]'));
    var idx = items.indexOf(el);
    var nextIdx = (idx + (k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    e.preventDefault();
    items[nextIdx].click();
    return true;
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector('dialog[open]')) return;
    var tag = (e.target && e.target.tagName) || '';
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (radioArrows(e)) return;
    var r = current || route();
    if (e.key === 'Escape') {
      if (r.name !== 'home') { e.preventDefault(); go('#/'); }
      return;
    }
    if (typing) return;
    if (r.name === 'quiz' && quiz) {
      if (!quiz.answered && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        choose(parseInt(e.key, 10) - 1);
        return;
      }
      if (quiz.answered && (e.key === 'Enter' || e.key === ' ')) {
        var onControl = e.target.closest && e.target.closest('button, a');
        if (!onControl || e.target.id === 'next-btn') {
          e.preventDefault();
          nextQuestion();
        }
      }
    }
  }

  /* =====================================================================
     List page (all-flags.html / all-capitals.html): static content, enhanced with search and filters
     ===================================================================== */
  var listState = { q: '', region: 'all' };
  function norm(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
      .replace(/[^0-9a-zㄱ-ㆎ가-힣]+/g, ' ').trim();
  }
  function listInit() {
    var input = document.getElementById('q');
    var chips = document.getElementById('regions');
    if (!input || !chips) return;
    input.addEventListener('input', function () { listState.q = input.value; listFilter(); });
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-region]');
      if (!b) return;
      listState.region = b.getAttribute('data-region');
      var all = chips.querySelectorAll('button');
      for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', String(all[i] === b));
      listFilter();
    });
    var items = document.querySelectorAll('#list > li');
    for (var i = 0; i < items.length; i++) items[i].setAttribute('data-norm', norm(items[i].getAttribute('data-search') || ''));
    // a "looks like" link to a country hidden by the current search or region: clear the filters first
    window.addEventListener('hashchange', function () {
      var target = document.getElementById(location.hash.slice(1));
      if (!target || target.tagName !== 'LI' || !target.hidden) return;
      input.value = '';
      listState.q = '';
      listState.region = 'all';
      var all = chips.querySelectorAll('button');
      for (var j = 0; j < all.length; j++) all[j].setAttribute('aria-pressed', String(all[j].getAttribute('data-region') === 'all'));
      listFilter();
      target.scrollIntoView({ block: 'center' });
    });
    listRender();
  }
  function listRender() {
    // sort by the current language
    var ul = document.getElementById('list');
    if (!ul) return;
    var items = Array.prototype.slice.call(ul.children);
    var k = settings.lang === 'ko' ? 'data-ko' : 'data-en';
    var coll = new Intl.Collator(settings.lang);
    items.sort(function (a, b) { return coll.compare(a.getAttribute(k), b.getAttribute(k)); });
    items.forEach(function (li) { ul.appendChild(li); });
    listFilter();
    // re-sorting moves the entries: bring a linked country (all-flags.html#td) back into view
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && target.tagName === 'LI') target.scrollIntoView({ block: 'center' });
  }
  function listFilter() {
    var q = norm(listState.q);
    var items = document.querySelectorAll('#list > li');
    var n = 0;
    for (var i = 0; i < items.length; i++) {
      var li = items[i];
      var show = (listState.region === 'all' || li.getAttribute('data-region') === listState.region) &&
        (!q || li.getAttribute('data-norm').indexOf(q) >= 0);
      li.hidden = !show;
      if (show) n++;
    }
    var count = document.getElementById('count');
    if (count) count.textContent = t('shown', { n: n, t: items.length });
    var empty = document.getElementById('empty');
    if (empty) empty.hidden = n > 0;
  }

  /* ---------- boot ---------- */
  applyTheme();
  applyLang();
  document.addEventListener('click', function (e) {
    var skip = e.target.closest('.skip-link');
    if (skip && view) {
      // the game uses the URL hash for screens: move focus without changing it
      e.preventDefault();
      var h = view.querySelector('h1, h2[tabindex="-1"], .prompt[tabindex="-1"]');
      if (h && h.hasAttribute('tabindex')) h.focus(); else view.focus();
      return;
    }
    var el = e.target.closest('[data-action="lang-toggle"]');
    if (el) { e.preventDefault(); setLang(settings.lang === 'ko' ? 'en' : 'ko'); }
  });
  if (document.body.getAttribute('data-page') === 'list') {
    listInit();
  } else if (view) {
    view.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', function () { render(); });
    render();
  }
})();
