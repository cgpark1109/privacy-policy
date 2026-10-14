/*
 * Korean Word Quiz (web) - screens, routing and interaction.
 * Screen flow mirrors lib/router/app_router.dart of the Flutter app 1.6.0:
 *   #/                 home            #/quiz?mode=&count=&level=&bonus=
 *   #/onboarding       onboarding      #/quiz/expert?mode=&count=
 *   #/result           result          #/words/wrong[?level=]
 *   #/words/learned    learned hub     #/words/learned/<nouns|verbs|adjectives>
 *   #/settings         settings        #/notices
 */
(function () {
  'use strict';

  var Core = window.KWQCore;
  var KData = window.KWQData;
  var TTS = window.KWQTTS;
  var Legacy = window.KWQLegacy;
  var M = window.KWQ_MANIFEST;

  var WEB_BUILD = '2026.10.14';
  var SITE_URL = 'https://kysystemstudio.com/play/korean-word-quiz/';
  var PLAY_URL = 'https://play.google.com/store/apps/details?id=com.kysystemstudio.hangulchallenge&referrer=utm_source%3Dkysystemstudio%26utm_medium%3Dwebapp%26utm_campaign%3Dweb_version';
  var STUDIO_URL = 'https://kysystemstudio.com/games/korean-word-quiz/';
  var PRIVACY_URL = 'https://kysystemstudio.com/privacy.html';
  /**
   * The app ships the 300 homophones but hides the expert quiz in 1.6.0
   * (AppConfig.enableExpertMode = false). The web keeps it as an extra card.
   */
  var ENABLE_EXPERT = true;
  var TOTAL_LABEL = Core.formatCount(M.totalWords);
  var LIST_PAGE = 60;

  // ------------------------------------------------------------- storage

  var storageOk = true;
  function createBackend() {
    try {
      var ls = window.localStorage;
      var probe = '__kwq_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return {
        getItem: function (k) { return ls.getItem(k); },
        setItem: function (k, v) {
          try {
            ls.setItem(k, v);
          } catch (e) {
            showToast('Could not save progress: browser storage is full.');
          }
        },
        removeItem: function (k) { ls.removeItem(k); },
        keys: function () {
          var out = [];
          for (var i = 0; i < ls.length; i++) out.push(ls.key(i));
          return out;
        },
      };
    } catch (e) {
      storageOk = false;
      return Core.memoryBackend();
    }
  }

  var prefs = new Core.Prefs(createBackend());
  var services = Core.createServices(prefs);
  var progress = services.progress;
  var dailySvc = services.daily;
  var weekly = services.weekly;
  var bonus = services.bonus;
  var settings = services.settings;

  function fetchJson(path) {
    return fetch(path, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + path);
      return res.json();
    });
  }

  var store = new KData.WordStore(M, fetchJson, function (level, index, ids, inChunk) {
    var removed = progress.pruneChunk(level, inChunk, ids);
    if (removed > 0) weekly.lowerLearnedBaseline(removed);
  });

  var noticeState = { notices: [], bannerLine: '', loaded: false };
  var noticePromise = fetchJson('notice.json')
    .then(function (json) {
      var parsed = Core.parseNotices(json);
      noticeState = { notices: parsed.notices, bannerLine: parsed.bannerLine, loaded: true };
    })
    .catch(function () {
      noticeState.loaded = true;
    });

  // ------------------------------------------------------------- helpers

  var $app = document.getElementById('app');
  var $dialog = document.getElementById('dialog');
  var $toast = document.getElementById('toast');
  var root = document.documentElement;

  function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#i-' + name + '"></use></svg>';
  }

  function fmt(n) {
    return Core.formatCount(n);
  }

  function wordsLabel(n) {
    return fmt(n) + ' ' + (n === 1 ? 'word' : 'words');
  }

  function speakButton(text, small) {
    return '<button type="button" class="speak' + (small ? ' sm' : '') + '" data-speak="' + esc(text) + '" aria-label="Listen to ' + esc(text) + '" title="Listen (S)">' + icon('volume') + '</button>';
  }

  function speak(text) {
    if (!settings.ttsEnabled()) return;
    TTS.speak(text, Core.webSpeechRate(settings.ttsRate()));
  }

  function updateTtsClass() {
    root.classList.toggle('tts-on', TTS.available() && settings.ttsEnabled());
  }

  function hasKorean(text) {
    return /[가-힣]/.test(String(text || ''));
  }

  function langAttr(text) {
    return hasKorean(text) ? ' lang="ko"' : '';
  }

  function setTitle(title) {
    document.title = title ? title + ' · Korean Word Quiz' : 'Korean Word Quiz – learn 30,000+ Korean words, 10 a day';
  }

  var toastTimer = null;
  function showToast(message) {
    $toast.textContent = message;
    $toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      $toast.classList.remove('show');
    }, 2800);
  }

  function topbar(title, backFallback) {
    return (
      '<header class="topbar">' +
      '<button type="button" class="icon-btn" data-back="' + esc(backFallback || '/') + '" aria-label="Back">' + icon('back') + '</button>' +
      '<h1 class="serif" tabindex="-1">' + esc(title) + '</h1><span></span></header>'
    );
  }

  function progressBar(value, cls, label) {
    var pct = Math.round(Core.clamp(value, 0, 1) * 1000) / 10;
    return '<div class="progress ' + (cls || '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"' + (label ? ' aria-label="' + esc(label) + '"' : '') + '><span style="width:' + pct + '%"></span></div>';
  }

  function emptyState(iconName, title, subtitle, action) {
    return (
      '<div class="empty"><div class="well big">' + icon(iconName) + '</div>' +
      '<h2 class="serif">' + esc(title) + '</h2>' +
      (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') +
      (action || '') +
      '</div>'
    );
  }

  function loadingBlock(message) {
    return '<div class="loading" role="status"><div class="spinner" aria-hidden="true"></div><span>' + esc(message || 'Loading...') + '</span></div>';
  }

  function errorBlock(message) {
    return emptyState('campaign', 'Something went wrong', message || 'Could not load words. Check your connection and try again.',
      '<button type="button" class="btn" data-action="retry">' + icon('replay') + 'Try again</button>');
  }

  function learnedSets() {
    var out = {};
    Core.LEVELS.forEach(function (l) { out[l] = new Set(progress.learnedWordIds(l)); });
    return out;
  }

  function playLink(label) {
    return '<a class="play-link" href="' + esc(PLAY_URL) + '" target="_blank" rel="noopener">' + icon('phone') + esc(label || 'Get it on Google Play') + '</a>';
  }

  // -------------------------------------------------------------- theme

  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function applyTheme() {
    var mode = settings.themeMode();
    var dark = mode === 'dark' || (mode === 'system' && darkQuery && darkQuery.matches);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    // Chrome may keep stale currentColor inside <use> shadow trees after a
    // theme switch; re-setting href forces the icons to repaint.
    var uses = document.querySelectorAll('svg use');
    for (var u = 0; u < uses.length; u++) uses[u].setAttribute('href', uses[u].getAttribute('href'));
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      if (mode === 'system') {
        metas[i].setAttribute('content', /dark/.test(metas[i].getAttribute('media') || '') ? '#111317' : '#F6F2EA');
      } else {
        metas[i].setAttribute('content', dark ? '#111317' : '#F6F2EA');
      }
    }
  }

  if (darkQuery) {
    var onScheme = function () { if (settings.themeMode() === 'system') applyTheme(); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onScheme);
    else if (darkQuery.addListener) darkQuery.addListener(onScheme);
  }

  // -------------------------------------------------------------- dialogs

  var dialogResolve = null;

  /** opts: {title, date, message, actions:[{label, value, danger}]} -> Promise<value|null> */
  function openDialog(opts) {
    if (dialogResolve) closeDialog(null);
    var actions = (opts.actions || [{ label: 'OK', value: true }]).map(function (a, i) {
      return '<button type="button" class="btn btn-text' + (a.danger ? ' danger' : '') + '" data-dialog-value="' + i + '">' + esc(a.label) + '</button>';
    }).join('');
    $dialog.innerHTML =
      '<div class="dialog-body"><h2 class="serif" id="dialog-title">' + esc(opts.title) + '</h2>' +
      (opts.date ? '<p class="date">' + esc(opts.date) + '</p>' : '') +
      '<p class="msg"' + langAttr(opts.message) + '>' + esc(opts.message) + '</p></div>' +
      '<div class="dialog-actions">' + actions + '</div>';
    var lastFocus = document.activeElement;
    return new Promise(function (resolve) {
      dialogResolve = function (value) {
        dialogResolve = null;
        resolve(value);
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
      };
      $dialog.onclick = function (e) {
        var btn = e.target.closest('[data-dialog-value]');
        if (btn) closeDialog(opts.actions ? opts.actions[Number(btn.getAttribute('data-dialog-value'))].value : true);
      };
      if (typeof $dialog.showModal === 'function') $dialog.showModal();
      else $dialog.setAttribute('open', '');
      var focusTarget = $dialog.querySelector('[data-dialog-value]:last-child');
      if (focusTarget) focusTarget.focus();
    });
  }

  function closeDialog(value) {
    if ($dialog.open && typeof $dialog.close === 'function') $dialog.close();
    else $dialog.removeAttribute('open');
    if (dialogResolve) dialogResolve(value);
  }

  $dialog.addEventListener('cancel', function (e) {
    e.preventDefault();
    closeDialog(null);
  });

  function confirmReset(title, message) {
    return openDialog({
      title: title,
      message: message,
      actions: [{ label: 'Cancel', value: false }, { label: 'Reset', value: true, danger: true }],
    }).then(function (v) { return v === true; });
  }

  // -------------------------------------------------------------- routing

  var current = { cleanup: null, keys: null, raw: null };
  var firstRender = true;

  function depth() {
    return (history.state && history.state.kwqDepth) || 0;
  }

  function nav(path, opts) {
    var o = opts || {};
    var url = '#' + path;
    try {
      if (o.replace) history.replaceState({ kwqDepth: depth() }, '', url);
      else history.pushState({ kwqDepth: depth() + 1 }, '', url);
    } catch (e) {
      if (o.replace) location.replace(url);
      else location.hash = path;
      return;
    }
    render();
  }

  var pendingHome = false;

  /** Back to the home entry of this tab's history (like context.go('/home')). */
  function goHome() {
    var d = depth();
    if (d > 0) {
      pendingHome = true;
      history.go(-d);
    } else {
      nav('/', { replace: true });
    }
  }

  function goBack(fallback) {
    if (depth() > 0) history.back();
    else nav(fallback || '/', { replace: true });
  }

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var q = raw.indexOf('?');
    var path = q === -1 ? raw : raw.slice(0, q);
    var params = {};
    if (q !== -1) {
      new URLSearchParams(raw.slice(q + 1)).forEach(function (v, k) { params[k] = v; });
    }
    if (path.charAt(0) !== '/') path = '/' + path;
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return { raw: raw, path: path, params: params };
  }

  var ROUTES = [
    [/^\/$/, function () { renderHome(); }],
    [/^\/home$/, function () { nav('/', { replace: true }); }],
    [/^\/onboarding$/, function () { renderOnboarding(); }],
    [/^\/quiz$/, function (p) { renderQuiz(Core.quizConfigFromQuery(p, false)); }],
    [/^\/quiz\/expert$/, function (p) {
      if (!ENABLE_EXPERT) nav('/', { replace: true });
      else renderQuiz(Core.quizConfigFromQuery(p, true));
    }],
    [/^\/result$/, function () { renderResult(); }],
    [/^\/words\/wrong$/, function (p) { renderWrongList(p); }],
    [/^\/words\/learned$/, function () { renderLearnedHub(); }],
    [/^\/words\/learned\/(nouns|verbs|adjectives)$/, function (p, m) { renderLearnedList(m[1]); }],
    [/^\/settings$/, function () { renderSettings(); }],
    [/^\/notices$/, function () { renderNotices(); }],
  ];

  function render() {
    var h = parseHash();
    if (pendingHome) {
      pendingHome = false;
      if (h.path !== '/') {
        nav('/', { replace: true });
        return;
      }
    }
    if (h.raw === current.raw) return;
    if (current.cleanup) {
      try { current.cleanup(); } catch (e) { /* ignore */ }
    }
    current = { cleanup: null, keys: null, raw: h.raw };
    if (dialogResolve) closeDialog(null);
    TTS.stop();
    $app.onclick = null;
    $app.oninput = null;
    $app.onchange = null;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i][0].exec(h.path);
      if (m) {
        window.scrollTo(0, 0);
        ROUTES[i][1](h.params, m);
        if (!firstRender) focusHeading();
        firstRender = false;
        return;
      }
    }
    nav('/', { replace: true });
  }

  function focusHeading() {
    var target = $app.querySelector('[data-autofocus]') || $app.querySelector('h1[tabindex]');
    if (target) target.focus({ preventScroll: true });
  }

  function mount(html, opts) {
    var o = opts || {};
    $app.innerHTML = html;
    setTitle(o.title);
    current.keys = o.keys || null;
    current.cleanup = o.cleanup || null;
    $app.onclick = o.onClick || null;
  }

  // Global link/button handling (works for every screen).
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var speakEl = e.target.closest('[data-speak]');
    if (speakEl) {
      speak(speakEl.getAttribute('data-speak'));
      return;
    }
    var back = e.target.closest('[data-back]');
    if (back) {
      e.preventDefault();
      goBack(back.getAttribute('data-back'));
      return;
    }
    var link = e.target.closest('[data-nav]');
    if (link && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) {
      e.preventDefault();
      nav(link.getAttribute('data-nav'));
    }
  });

  document.addEventListener('keydown', function (e) {
    if ($dialog.open) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (current.keys && current.keys(e) === true) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      var back = $app.querySelector('[data-back]');
      if (back) {
        e.preventDefault();
        goBack(back.getAttribute('data-back'));
      }
    }
  });

  window.addEventListener('popstate', render);
  window.addEventListener('hashchange', render);

  // ---------------------------------------------------------------- home

  function renderHome() {
    if (!settings.hasCompletedOnboarding()) {
      nav('/onboarding', { replace: true });
      return;
    }
    finishPendingDaily();

    var status = dailySvc.getStatus();
    var hasHistory = dailySvc.hasPlayHistory();
    var wrongCount = progress.countWrong();
    var learnedCount = progress.countLearned();
    var goals = weekly.getCurrentChallenges();
    var goalsDone = goals.filter(function (g) { return g.completed; }).length;
    var missions = bonus.getTodayMissions();
    var total = Core.DAILY_QUESTION_COUNT;
    var completed = status.completed;

    var heroTitle = completed ? "Today's practice is done"
      : status.inProgress ? status.answered + ' of ' + total + ' words'
        : !hasHistory ? 'Start your first quiz'
          : total + ' words for today';
    var heroDesc = completed ? 'Bonus missions keep you learning.'
      : 'Random nouns, verbs, and adjectives from ' + TOTAL_LABEL + ' words';
    var buttonLabel = completed ? 'Completed' : status.inProgress ? 'Continue quiz' : 'Start quiz';
    var progressValue = completed ? 1 : status.answered / total;

    var notice = noticeState.bannerLine
      ? '<a class="banner o-notice" href="#/notices" data-nav="/notices">' + '<span class="lead">' + icon('campaign', 'icon-sm') + '</span>' +
        '<span class="msg">' + esc(noticeState.bannerLine) + '</span><span class="trail">' + icon('chevron', 'icon-sm') + '</span></a>'
      : '';

    var hero =
      '<section class="hero o-hero" aria-labelledby="hero-title">' +
      '<div class="hero-top"><span class="kicker">Daily practice</span>' +
      (status.attendanceStreak > 0 ? '<span class="streak-chip">' + icon('flame') + status.attendanceStreak + '-day streak</span>' : '') +
      '</div>' +
      '<h2 class="serif hero-title" id="hero-title">' + esc(heroTitle) + '</h2>' +
      '<p class="hero-desc">' + esc(heroDesc) + '</p>' +
      progressBar(progressValue, '', "Today's progress") +
      '<div class="hero-meta"><span>' + (completed ? total : status.answered) + ' / ' + total + ' today</span>' +
      (status.attendanceBest > 0 ? '<span>Best ' + status.attendanceBest + ' ' + (status.attendanceBest === 1 ? 'day' : 'days') + '</span>' : '<span></span>') +
      '</div>' +
      '<button type="button" class="btn btn-accent" data-action="daily"' + (completed ? ' disabled' : '') + '>' +
      icon(completed ? 'check' : 'play') + esc(buttonLabel) + '</button>' +
      '</section>';

    var bonusCard = '';
    if (completed) {
      var doneCount = missions.filter(function (m) { return m.completed; }).length;
      var allDone = doneCount >= missions.length;
      bonusCard =
        '<section class="card flush o-bonus" aria-labelledby="bonus-title">' +
        '<div style="padding:12px 16px 4px" class="card-title"><h2 class="serif" id="bonus-title">' + (allDone ? 'All bonus missions done' : 'Bonus missions') + '</h2><span class="count">' + doneCount + ' / ' + missions.length + '</span></div>' +
        '<p class="sub" style="padding:0 16px 8px">' + (allDone ? 'Come back tomorrow for a new daily practice.' : "Extra rounds to strengthen today's words.") + '</p>' +
        missions.map(function (m) {
          var unavailable = !m.available && !m.completed;
          var iconName = m.completed ? 'check' : m.id === 'wrong5' ? 'replay' : m.id === 'extra10' ? 'book' : 'trophy';
          var endIcon = m.completed ? icon('check-circle', 'end-icon done') : unavailable ? icon('lock', 'end-icon') : icon('chevron', 'end-icon');
          return '<hr class="divider">' +
            '<button type="button" class="row mission' + (unavailable ? ' is-disabled' : '') + '" data-mission="' + m.id + '"' + (m.completed || unavailable ? ' disabled' : '') + '>' +
            '<span class="well' + (m.completed ? ' done' : '') + '">' + icon(iconName) + '</span>' +
            '<span class="grow"><span class="title">' + esc(m.title) + '</span><span class="subtitle">' + esc(unavailable ? 'No wrong words saved yet' : m.description) + '</span></span>' +
            endIcon +
            '<span class="visually-hidden">' + (m.completed ? ' (done)' : unavailable ? ' (locked)' : '') + '</span></button>';
        }).join('') +
        '</section>';
    }

    var stats =
      '<div class="stats-row o-stats">' +
      '<div class="card stat-tile"><div class="label">Learned</div><div class="value serif">' + fmt(learnedCount) + '</div><div class="caption">of ' + TOTAL_LABEL + ' words</div></div>' +
      '<div class="card stat-tile"><div class="label">This week</div><div class="value serif">' + goalsDone + ' / ' + goals.length + '</div><div class="caption">goals done</div></div>' +
      '</div>';

    var weeklyCard =
      '<section class="card o-weekly" aria-labelledby="weekly-title">' +
      '<div class="card-title"><h2 class="serif" id="weekly-title">' + (goalsDone === goals.length ? 'Weekly goals complete' : 'Weekly goals') + '</h2><span class="count">' + goalsDone + ' / ' + goals.length + '</span></div>' +
      '<div style="margin-top:12px">' +
      goals.map(function (g) {
        return '<div class="goal' + (g.completed ? ' done' : '') + '"><div class="goal-head">' + (g.completed ? icon('check-circle') : '') +
          '<span class="name">' + esc(g.title) + '</span><span class="num">' + fmt(g.current) + ' / ' + g.target + '</span></div>' +
          progressBar(g.progress, g.completed ? 'done' : '', g.title) + '</div>';
      }).join('') +
      '</div></section>';

    var expertCard = '';
    if (ENABLE_EXPERT) {
      var expertWrong = progress.countExpertWrong();
      expertCard =
        '<section class="card o-expert" aria-labelledby="expert-title">' +
        '<div class="card-title"><h2 class="serif" id="expert-title">Homophone challenge</h2></div>' +
        '<p style="margin-top:6px;color:var(--text-2);line-height:1.35">' + fmt(M.counts.expert) + ' homophones · emoji hint + example → pick the meaning</p>' +
        '<div class="btn-row" style="margin-top:14px">' +
        '<button type="button" class="btn" data-nav="' + esc(Core.quizConfigToQuery(Core.makeQuizConfig({ expert: true }))) + '">Start expert quiz</button>' +
        (expertWrong > 0
          ? '<button type="button" class="btn btn-outline" data-nav="' + esc(Core.quizConfigToQuery(Core.makeQuizConfig({ expert: true, mode: 'wrong', count: Core.QuizReviewLimits.clampFullReview(expertWrong) }))) + '">' + icon('replay') + 'Review ' + expertWrong + ' expert wrong</button>'
          : '') +
        '</div></section>';
    }

    var savedCard =
      '<section class="card flush o-saved" aria-label="Saved words">' +
      savedRow('wrong', wrongCount) + '<hr class="divider">' + savedRow('learned', learnedCount) +
      '</section>';

    var appCard =
      '<section class="card app-card o-app" aria-label="Android app">' +
      '<img src="assets/img/app-mark-144.png" alt="" width="44" height="44" loading="lazy">' +
      '<div class="grow"><div class="name">Korean Word Quiz for Android</div><div class="sub">Daily reminders and offline practice</div></div>' +
      playLink() + '</section>';

    var html =
      '<div class="page page-wide">' +
      (storageOk ? '' : '<p class="storage-note">This browser is not saving data (private mode or blocked storage). Progress will be lost when you close the tab.</p>') +
      '<header class="home-header">' +
      '<img class="brand-mark" src="assets/img/app-mark-144.png" alt="" width="36" height="36">' +
      '<div class="titles"><h1 class="serif" tabindex="-1">Korean Word Quiz</h1><p class="tagline">One step a day</p></div>' +
      '<nav class="header-actions" aria-label="Main">' +
      '<a class="header-link" href="#/words/learned" data-nav="/words/learned">Learned words</a>' +
      '<a class="header-link" href="#/notices" data-nav="/notices">Notices</a>' +
      '<a class="icon-btn muted" href="#/settings" data-nav="/settings" aria-label="Settings" title="Settings">' + icon('settings') + '</a>' +
      '</nav></header>' +
      '<div class="home-grid">' + notice +
      '<div class="home-col">' + hero + bonusCard + savedCard + '</div>' +
      '<div class="home-col">' + stats + weeklyCard + expertCard + appCard + '</div>' +
      '</div>' + footer() + '</div>';

    mount(html, {
      title: '',
      onClick: function (e) {
        var el = e.target.closest('[data-action],[data-mission]');
        if (!el || el.disabled) return;
        var action = el.getAttribute('data-action');
        if (el.hasAttribute('data-mission')) {
          nav(Core.quizConfigToQuery(Core.bonusQuizConfig(el.getAttribute('data-mission'))));
        } else if (action === 'daily') {
          nav('/quiz');
        } else if (action === 'review-wrong') {
          nav(Core.quizConfigToQuery(Core.makeQuizConfig({ mode: 'wrong' })));
        } else if (action === 'review-learned') {
          nav(Core.quizConfigToQuery(Core.makeQuizConfig({ mode: 'learned', count: Core.QuizReviewLimits.clampFullReview(progress.countLearned()) })));
        }
      },
    });
  }

  function savedRow(kind, count) {
    var wrong = kind === 'wrong';
    var title = wrong ? 'Wrong answers' : 'Learned words';
    var subtitle = count === 0
      ? (wrong ? 'Words you miss show up here' : 'Words you get right show up here')
      : wordsLabel(count);
    var target = wrong ? '/words/wrong' : '/words/learned';
    var main = count === 0
      ? '<div class="row is-disabled">'
      : '<a class="row" href="#' + target + '" data-nav="' + target + '">';
    return '<div class="row-split">' + main +
      '<span class="well ' + (wrong ? 'wrong' : 'correct') + '">' + icon(wrong ? 'close' : 'check') + '</span>' +
      '<span class="grow"><span class="title">' + title + '</span><span class="subtitle">' + subtitle + '</span></span>' +
      (count === 0 ? '</div>' : '</a>') +
      '<button type="button" class="btn btn-text" data-action="review-' + kind + '"' + (count === 0 ? ' disabled' : '') + ' aria-label="Review ' + title.toLowerCase() + '">' + icon('replay', 'icon-sm') + 'Review</button>' +
      '</div>';
  }

  function footer() {
    return '<footer class="site-footer"><nav aria-label="Links">' +
      '<a href="' + esc(PLAY_URL) + '" target="_blank" rel="noopener">Get it on Google Play</a>' +
      '<a href="' + esc(STUDIO_URL) + '" target="_blank" rel="noopener">Studio page</a>' +
      '<a href="' + esc(PRIVACY_URL) + '" target="_blank" rel="noopener">Privacy Policy</a>' +
      '<a href="#/notices" data-nav="/notices">Notices</a>' +
      '</nav><p>Korean Word Quiz by GGOOK\'s Studio · progress is saved in this browser</p></footer>';
  }

  /** Daily session with every question answered but never finished (tab closed, left early). */
  function finishPendingDaily() {
    var s = dailySvc.loadSavedSession();
    if (!s || !s.wordRefs.length || s.index < s.wordRefs.length) return null;
    return Core.finishSession(services, Core.makeQuizConfig({}), s.score, s.correctCount, s.wordRefs.length, s.bestStreak);
  }

  // ---------------------------------------------------------- onboarding

  var ONBOARDING = [
    { icon: 'book', title: 'Learn ' + TOTAL_LABEL + ' Korean words', text: 'Nouns, verbs, and adjectives, each with a short English meaning. Verbs and adjectives come with a Korean example sentence.' },
    { icon: 'target', title: 'Quiz, save, and review', text: 'Miss a word? It goes to Wrong Answers. Get it right? It moves to Learned Words for easy review.' },
    { icon: 'flame', title: 'Build a daily habit', text: 'Complete 10 words a day to grow your streak and reach your weekly goals.' },
  ];

  function renderOnboarding() {
    var page = 0;
    function paint() {
      var p = ONBOARDING[page];
      var last = page === ONBOARDING.length - 1;
      var html =
        '<div class="onboarding">' +
        '<img class="brand-mark" src="assets/img/app-mark-144.png" alt="Korean Word Quiz" width="56" height="56">' +
        '<div class="ob-slides"><section class="ob-slide" aria-live="polite" aria-roledescription="slide" aria-label="' + (page + 1) + ' of ' + ONBOARDING.length + '">' +
        '<div class="well">' + icon(p.icon) + '</div>' +
        '<h1 class="serif" tabindex="-1">' + esc(p.title) + '</h1><p>' + esc(p.text) + '</p></section></div>' +
        '<div class="ob-dots" aria-hidden="true">' + ONBOARDING.map(function (_, i) { return '<span class="' + (i === page ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
        '<div class="ob-actions">' +
        (last
          ? '<button type="button" class="btn" data-ob="finish" data-autofocus>Start learning</button>' +
            '<p class="ob-note">Want a daily reminder? <a href="' + esc(PLAY_URL) + '" target="_blank" rel="noopener">Get the Android app</a></p>'
          : '<button type="button" class="btn" data-ob="next" data-autofocus>Next</button>' +
            '<button type="button" class="btn btn-text" data-ob="finish">Skip</button>') +
        '</div></div>';
      mount(html, {
        title: 'Welcome',
        onClick: function (e) {
          var b = e.target.closest('[data-ob]');
          if (!b) return;
          if (b.getAttribute('data-ob') === 'next') go(1);
          else finish();
        },
        keys: function (e) {
          if (e.key === 'ArrowRight') { go(1); return true; }
          if (e.key === 'ArrowLeft') { go(-1); return true; }
          return false;
        },
      });
      var f = $app.querySelector('[data-autofocus]');
      if (f && !firstRender) f.focus({ preventScroll: true });
    }
    function go(delta) {
      var next = Core.clamp(page + delta, 0, ONBOARDING.length - 1);
      if (next === page) return;
      page = next;
      paint();
      var f = $app.querySelector('[data-autofocus]');
      if (f) f.focus({ preventScroll: true });
    }
    function finish() {
      settings.setHasCompletedOnboarding(true);
      nav('/', { replace: true });
    }
    paint();
  }

  // ---------------------------------------------------------------- quiz

  var activeQuiz = null;

  function renderQuiz(config) {
    var q = {
      config: config,
      daily: Core.isDailyPractice(config),
      questions: [],
      index: 0,
      score: 0,
      correct: 0,
      streak: 0,
      best: 0,
      selected: null,
      answered: false,
      hint: false,
      hidden: [],
      finished: false,
      rng: Core.createRng(),
    };
    activeQuiz = q;

    mount('<div class="quiz">' + quizTopbar(0, 0) + loadingBlock('Loading...') + '</div>', {
      title: 'Quiz',
      cleanup: function () {
        TTS.stop();
        if (activeQuiz === q) activeQuiz = null;
        // Daily practice fully answered but "See results" not pressed: answering
        // the 10th word already marks the day complete, so record the session too.
        if (q.daily && !q.finished && q.questions.length && q.answered && q.index >= q.questions.length - 1) finishQuiz(q, true);
      },
      onClick: function (e) { onQuizClick(q, e); },
      keys: function (e) { return onQuizKey(q, e); },
    });

    loadQuestions(q).then(function () {
      if (activeQuiz !== q) return;
      if (!q.questions.length) {
        var empty = q.config.mode === 'wrong' ? (q.config.expert ? 'No expert wrong words to review yet.' : 'No wrong words to review yet.')
          : q.config.mode === 'learned' ? (q.config.expert ? 'No expert learned words to review yet.' : 'No learned words to review yet.')
            : 'No word data found.';
        $app.innerHTML = '<div class="page">' + topbar('Quiz') + emptyState('book', empty, '', '<button type="button" class="btn" data-action="home">Back to home</button>') + '</div>';
        return;
      }
      if (q.index >= q.questions.length) {
        // Resumed a daily session whose questions were all answered.
        finishQuiz(q, false);
        return;
      }
      paintQuestion(q, false);
    }).catch(function () {
      if (activeQuiz !== q) return;
      $app.innerHTML = '<div class="page">' + topbar('Quiz') + errorBlock('Could not load quiz. Check your connection and try again.') + '</div>';
      $app.onclick = function (e) {
        if (e.target.closest('[data-action="retry"]')) {
          current.raw = null;
          render();
        }
      };
    });
  }

  function loadQuestions(q) {
    var c = q.config;
    var rng = q.rng;
    if (c.expert) {
      return store.loadExpert().then(function (pool) {
        var words;
        if (c.mode === 'wrong' || c.mode === 'learned') {
          var ids = c.mode === 'wrong' ? progress.expertWrongWordIds() : progress.expertLearnedWordIds();
          var byId = new Map(pool.map(function (w) { return [w.id, w]; }));
          words = ids.map(function (id) { return byId.get(id); }).filter(Boolean);
          words = Core.shuffle(words, rng).slice(0, Core.clamp(c.count, 1, Math.max(1, words.length)));
        } else {
          var learned = new Set(progress.expertLearnedWordIds());
          var fresh = Core.shuffle(pool.filter(function (w) { return !learned.has(w.id); }), rng);
          var known = Core.shuffle(pool.filter(function (w) { return learned.has(w.id); }), rng);
          words = fresh.concat(known).slice(0, Core.clamp(c.count, 1, pool.length));
        }
        q.questions = words.map(function (w) { return Core.buildExpertQuestion(w, pool, rng); });
      });
    }

    var resumed = null;
    var wordsPromise;
    if (q.daily) {
      resumed = dailySvc.loadSavedSession();
      if (resumed && resumed.wordRefs.length) {
        wordsPromise = store.wordsFromRefs(resumed.wordRefs);
      } else {
        resumed = null;
        wordsPromise = store.randomWords(c.count, c.level, learnedSets(), rng).then(function (words) {
          if (words.length) {
            dailySvc.saveSession({ wordRefs: store.refsForWords(words), index: 0, score: 0, correctCount: 0, streak: 0, bestStreak: 0 });
          }
          return words;
        });
      }
    } else if (c.mode === 'wrong') {
      wordsPromise = wrongReviewWords(c.count, c.level);
    } else if (c.mode === 'learned') {
      var refs = [];
      (c.level ? [c.level] : Core.LEVELS).forEach(function (l) {
        progress.learnedWordIds(l).forEach(function (id) { refs.push(l + ':' + id); });
      });
      wordsPromise = store.randomFromRefs(refs, c.count, rng);
    } else {
      wordsPromise = store.randomWords(c.count, c.level, learnedSets(), rng);
    }

    return wordsPromise.then(function (words) {
      var levels = [];
      words.forEach(function (w) { if (levels.indexOf(w.level) === -1) levels.push(w.level); });
      return store.ensurePools(levels, rng).then(function () {
        var fallback = store.allLoaded();
        var direction = settings.quizDirection();
        q.questions = words.map(function (w) {
          return Core.buildQuestion(w, store.pool(w.level), fallback, rng, direction);
        });
        if (resumed) {
          q.index = resumed.index;
          q.score = resumed.score;
          q.correct = resumed.correctCount;
          q.streak = resumed.streak;
          q.best = resumed.bestStreak;
        }
      });
    });
  }

  /** data/word_repository.dart wrongReviewQuestions(): most-missed first, then most recent. */
  function wrongReviewWords(count, level) {
    var refs = [];
    (level ? [level] : Core.LEVELS).forEach(function (l) {
      progress.wrongWordIds(l).forEach(function (id) { refs.push(l + ':' + id); });
    });
    return store.wordsFromRefs(refs).then(function (words) {
      words.sort(function (a, b) {
        var diff = progress.wrongAnswerCount(b.level, b.id) - progress.wrongAnswerCount(a.level, a.id);
        if (diff !== 0) return diff;
        var ad = progress.lastWrongAt(a.level, a.id);
        var bd = progress.lastWrongAt(b.level, b.id);
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return bd < ad ? -1 : bd > ad ? 1 : 0;
      });
      return words.slice(0, Core.clamp(count, 1, Math.max(1, words.length)));
    });
  }

  function quizTopbar(index, total) {
    var value = total <= 0 ? 0 : (index + 1) / total;
    return '<header class="quiz-top"><button type="button" class="icon-btn" data-action="close" aria-label="Close quiz" title="Close (Esc)">' + icon('close') + '</button>' +
      progressBar(value, 'thick', 'Question progress') +
      '<span class="pos" aria-hidden="true">' + (total ? index + 1 + '/' + total : '') + '</span></header>';
  }

  function modeLabel(c) {
    if (c.expert) return 'Expert · homophones';
    if (c.bonus) return Core.bonusMissionById(c.bonus).title;
    if (Core.isDailyPractice(c)) return 'Daily practice';
    if (c.mode === 'wrong') return 'Wrong review';
    if (c.mode === 'learned') return 'Learned review';
    return (c.level ? Core.LEVEL_INFO[c.level].displayName : 'Mixed') + ' quiz';
  }

  function questionView(q) {
    var question = q.questions[q.index];
    var expert = q.config.expert;
    var koToEn = expert || question.direction === 'koToEn';
    var label = expert ? 'What does this mean?' : koToEn ? Core.LEVEL_INFO[question.word.level].partOfSpeech : 'Which Korean word means';
    var speakText = koToEn ? question.word.korean : null;
    return { question: question, expert: expert, koToEn: koToEn, label: label, speakText: speakText };
  }

  function statusRow(q) {
    return '<span class="label">' + esc(modeLabel(q.config)) + '</span>' +
      (q.streak >= 2 ? '<span class="streak" aria-label="' + q.streak + ' in a row">' + icon('flame') + q.streak + '</span>' : '') +
      '<span>Score ' + q.score + '</span>';
  }

  function paintQuestion(q) {
    var v = questionView(q);
    var question = v.question;
    var total = q.questions.length;
    var prompt = v.expert ? question.word.korean : question.prompt;
    var promptIsKo = v.koToEn;
    var long = promptIsKo ? prompt.length > 8 : prompt.length > 40;

    var choices = question.choices.map(function (choice, i) {
      return '<button type="button" class="choice' + (promptIsKo ? '' : ' ko') + '" data-choice="' + i + '">' +
        '<span class="key" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="txt"' + langAttr(choice) + '>' + esc(choice) + '</span>' +
        '<span class="sr visually-hidden"></span>' +
        '<svg class="icon mark" aria-hidden="true" focusable="false"><use href="#i-check-circle"></use></svg>' +
        '</button>';
    }).join('');

    var hintSlot = v.expert ? '' :
      '<div class="hint-slot" id="hint-slot"><button type="button" class="btn btn-text" data-action="hint" title="Hint (H)">' + icon('bulb', 'icon-sm') + 'Get a hint</button></div>';

    var html =
      '<div class="quiz">' + quizTopbar(q.index, total) +
      '<div class="status-row" id="status-row">' + statusRow(q) + '</div>' +
      '<section class="prompt-card" aria-labelledby="prompt">' +
      '<span class="label" id="prompt-label">' + esc(v.label) + '</span>' +
      '<h1 class="prompt ' + (promptIsKo ? 'ko ko-serif' : 'en') + (long ? ' long' : '') + '" id="prompt" tabindex="-1"' + langAttr(prompt) + ' aria-describedby="prompt-label">' + esc(prompt) + '</h1>' +
      (v.expert ? '<p class="hint"' + langAttr(question.hintText) + '>' + esc(question.hintText) + '</p>' : '') +
      (v.speakText ? speakButton(v.speakText) : '') +
      '</section>' + hintSlot +
      '<p class="choices-label" id="choices-label">' + (v.koToEn ? 'Choose the meaning' : 'Choose the Korean word') + '</p>' +
      '<div class="choices" role="group" aria-labelledby="choices-label">' + choices + '</div>' +
      '<p class="kbd-help"><kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>Enter</kbd> next' + (v.expert ? '' : ' · <kbd>H</kbd> hint') + ' · <kbd>S</kbd> listen · <kbd>Esc</kbd> close</p>' +
      '<div class="feedback-slot" id="feedback-slot" aria-live="polite"></div>' +
      '</div>';
    $app.innerHTML = html;
    setTitle('Question ' + (q.index + 1) + ' of ' + total);
    var heading = document.getElementById('prompt');
    if (heading && !firstRender) heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function onQuizClick(q, e) {
    var el = e.target.closest('[data-choice],[data-action]');
    if (!el) return;
    if (el.hasAttribute('data-choice')) {
      answerQuestion(q, Number(el.getAttribute('data-choice')));
      return;
    }
    var action = el.getAttribute('data-action');
    if (action === 'close') closeQuiz(q);
    else if (action === 'home') goHome();
    else if (action === 'hint') useHint(q);
    else if (action === 'next') nextQuestion(q);
  }

  function onQuizKey(q, e) {
    if (!q.questions.length || q.finished) return false;
    var key = e.key;
    if (key === 'Escape') {
      closeQuiz(q);
      return true;
    }
    if (/^[1-4]$/.test(key)) {
      if (!q.answered) answerQuestion(q, Number(key) - 1);
      return true;
    }
    if (key === 'Enter' || key === ' ') {
      var tag = e.target && e.target.tagName;
      if (tag === 'BUTTON' || tag === 'A') return false; // native activation
      if (q.answered) {
        nextQuestion(q);
        return true;
      }
      return false;
    }
    var lower = key.toLowerCase();
    if (lower === 'h' && !q.config.expert) {
      useHint(q);
      return true;
    }
    if (lower === 's' || lower === 'p') {
      var v = questionView(q);
      if (v.speakText || q.answered) speak(v.question.word.korean);
      return true;
    }
    return false;
  }

  function useHint(q) {
    if (q.answered || q.hint || q.config.expert) return;
    var question = q.questions[q.index];
    q.hint = true;
    q.hidden = Core.pickChoicesToHide(question, q.rng);
    var example = question.word.example ? Core.sanitizeQuizExample(question.word.example) : '';
    var slot = document.getElementById('hint-slot');
    if (slot) {
      slot.innerHTML = '<div class="hint-box" role="status">' + icon('bulb') + '<span' + langAttr(example) + '>' + esc(example || 'Two wrong answers removed') + '</span></div>';
    }
    var buttons = $app.querySelectorAll('[data-choice]');
    var firstVisible = null;
    for (var i = 0; i < buttons.length; i++) {
      var choice = question.choices[i];
      if (q.hidden.indexOf(choice) !== -1) {
        buttons[i].classList.add('is-hidden');
        buttons[i].setAttribute('aria-hidden', 'true');
        buttons[i].tabIndex = -1;
      } else if (!firstVisible) {
        firstVisible = buttons[i];
      }
    }
  }

  function answerQuestion(q, index) {
    if (q.answered || q.finished) return;
    var question = q.questions[q.index];
    var choice = question.choices[index];
    if (choice === undefined || q.hidden.indexOf(choice) !== -1) return;
    var ok = choice === question.correctChoice;
    q.selected = choice;
    q.answered = true;

    if (q.config.expert) {
      if (ok) progress.markExpertLearned(question.word.id);
      else progress.markExpertWrong(question.word.id);
    } else {
      progress.recordAnswer(question.word.level, question.word.id, ok);
    }
    if (ok) {
      q.streak += 1;
      if (q.streak > q.best) q.best = q.streak;
      q.score += Core.QuizScoring.pointsForCorrect(q.streak);
      q.correct += 1;
    } else {
      q.streak = 0;
    }
    if (q.daily) {
      dailySvc.recordSingleQuestionAnswered();
      saveDailySession(q, q.index + 1);
    }

    // Update in place so nothing above or among the choices moves.
    var buttons = $app.querySelectorAll('[data-choice]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var c = question.choices[i];
      b.setAttribute('aria-disabled', 'true');
      var mark = b.querySelector('.mark use');
      var sr = b.querySelector('.sr');
      if (c === question.correctChoice) {
        b.classList.add('is-correct');
        sr.textContent = ' (correct answer)';
      } else if (c === choice) {
        b.classList.add('is-wrong');
        if (mark) mark.setAttribute('href', '#i-cancel');
        sr.textContent = ' (your answer, wrong)';
      } else {
        b.classList.add('is-dim');
      }
    }
    var slot = document.getElementById('hint-slot');
    if (slot && !q.hint) slot.classList.add('hidden');
    var status = document.getElementById('status-row');
    if (status) status.innerHTML = statusRow(q);

    var v = questionView(q);
    var last = q.index >= q.questions.length - 1;
    var detail;
    var serifDetail = false;
    if (v.expert) {
      detail = "All meanings of '" + question.word.korean + "':\n" + question.word.meanings.map(function (m) {
        return m.emoji + ' ' + m.english + ' — ' + m.example;
      }).join('\n');
    } else {
      detail = question.feedbackText;
      serifDetail = !!(question.word.example && question.word.example.trim());
    }
    var feedback =
      '<div class="feedback ' + (ok ? 'ok' : 'no') + '">' +
      '<div class="feedback-head">' + icon(ok ? 'check' : 'close') + '<span class="verdict">' + (ok ? 'Correct' : 'Not quite') + '</span>' +
      (v.expert ? '' : speakButton(question.word.korean, true)) + '</div>' +
      (ok ? '' : '<p class="answer">Answer: <span' + langAttr(question.correctChoice) + '>' + esc(question.correctChoice) + '</span></p>') +
      (detail ? '<p class="detail' + (serifDetail ? ' ko-serif' : '') + '"' + langAttr(detail) + '>' + esc(detail) + '</p>' : '') +
      '<button type="button" class="btn" data-action="next">' + (last ? 'See results' : 'Next') + '</button>' +
      '</div>';
    var fslot = document.getElementById('feedback-slot');
    fslot.innerHTML = feedback;
    var next = fslot.querySelector('[data-action="next"]');
    if (next) next.focus({ preventScroll: true });
  }

  function saveDailySession(q, nextIndex) {
    if (!q.daily || !q.questions.length) return;
    dailySvc.saveSession({
      wordRefs: store.refsForWords(q.questions.map(function (x) { return x.word; })),
      index: nextIndex,
      score: q.score,
      correctCount: q.correct,
      streak: q.streak,
      bestStreak: q.best,
    });
  }

  function nextQuestion(q) {
    if (!q.answered || q.finished) return;
    TTS.stop();
    if (q.index >= q.questions.length - 1) {
      finishQuiz(q, false);
      return;
    }
    q.index += 1;
    q.selected = null;
    q.answered = false;
    q.hint = false;
    q.hidden = [];
    paintQuestion(q);
    var heading = document.getElementById('prompt');
    if (heading) heading.focus({ preventScroll: true });
  }

  function finishQuiz(q, silent) {
    if (q.finished) return;
    q.finished = true;
    TTS.stop();
    var result = Core.finishSession(services, q.config, q.score, q.correct, q.questions.length, q.best);
    lastResult = result;
    try {
      sessionStorage.setItem('kwq_last_result', JSON.stringify(result));
    } catch (e) { /* ignore */ }
    if (!silent) nav('/result', { replace: true });
  }

  function closeQuiz(q) {
    TTS.stop();
    goBack('/');
  }

  // -------------------------------------------------------------- result

  var lastResult = null;

  function renderResult() {
    var result = lastResult;
    if (!result) {
      try {
        result = JSON.parse(sessionStorage.getItem('kwq_last_result') || 'null');
      } catch (e) {
        result = null;
      }
    }
    if (!result) {
      nav('/', { replace: true });
      return;
    }
    var stars = Core.QuizScoring.starsFor(result.correctCount, result.total);
    var wrongCount = result.expert ? progress.countExpertWrong() : progress.countWrong();
    var showWrong = wrongCount > 0 && result.correctCount < result.total;
    var showShare = result.isPerfect;
    var showBonus = result.hasRemainingBonusMissions;
    var streakDays = result.attendanceStreak > 0 ? result.attendanceStreak : result.playStreakCurrent;
    var quick = Core.QuizReviewLimits.clampQuickReview(wrongCount);

    var buttons = '';
    if (showWrong) buttons += '<button type="button" class="btn" data-action="wrong" data-autofocus>' + icon('replay') + 'Review ' + quick + ' wrong ' + (quick === 1 ? 'word' : 'words') + '</button>';
    if (showShare) buttons += '<button type="button" class="btn" data-action="share"' + (showWrong ? '' : ' data-autofocus') + '>' + icon('share') + 'Share result</button>';
    if (showBonus) buttons += '<button type="button" class="btn" data-action="bonus"' + (showWrong || showShare ? '' : ' data-autofocus') + '>' + icon('flag') + 'Start bonus mission</button>';
    if (!showWrong && !showShare && !showBonus) buttons += '<button type="button" class="btn" data-action="again" data-autofocus>Play again</button>';
    buttons += '<button type="button" class="btn btn-outline" data-action="home">Back to home</button>';

    var html =
      '<div class="result">' +
      '<div class="spacer-2"></div>' +
      '<div class="stars" role="img" aria-label="' + stars + ' of 3 stars">' +
      [0, 1, 2].map(function (i) { return icon(i < stars ? 'star' : 'star-outline', i < stars ? 'on' : ''); }).join('') + '</div>' +
      '<h1 class="serif" tabindex="-1">' + (result.isPerfect ? 'Perfect!' : 'Quiz complete') + '</h1>' +
      '<p class="lead">' + result.correctCount + ' of ' + result.total + ' correct</p>' +
      (result.completedBonusMission ? '<span class="pill good">' + icon('flag') + 'Bonus mission done: ' + esc(Core.bonusMissionById(result.completedBonusMission).title) + '</span>' : '') +
      (streakDays > 0 ? '<span class="pill flame">' + icon('flame') + streakDays + '-day streak. Keep going</span>' : '') +
      '<div class="card result-stats">' +
      '<div><div class="value serif">' + result.score + '</div><div class="label">Score</div></div>' +
      '<div><div class="value serif">' + result.correctCount + '</div><div class="label">Correct</div></div>' +
      '<div><div class="value serif">' + result.bestStreak + '</div><div class="label">Best streak</div></div>' +
      '</div>' +
      '<div class="spacer-3"></div>' +
      '<div class="btn-row">' + buttons + '</div>' +
      '</div>';

    mount(html, {
      title: 'Result',
      onClick: function (e) {
        var b = e.target.closest('[data-action]');
        if (!b) return;
        var a = b.getAttribute('data-action');
        if (a === 'home') goHome();
        else if (a === 'again') nav(result.replayPath || '/quiz', { replace: true });
        else if (a === 'wrong') {
          nav(Core.quizConfigToQuery(Core.makeQuizConfig({ expert: result.expert, mode: 'wrong', count: quick })), { replace: true });
        } else if (a === 'bonus') {
          var next = bonus.nextIncompleteMission();
          nav(next ? Core.quizConfigToQuery(Core.bonusQuizConfig(next)) : '/', { replace: true });
        } else if (a === 'share') shareResult(result);
      },
      keys: function (e) {
        if (e.key === 'Escape') {
          goHome();
          return true;
        }
        return false;
      },
    });
    var f = $app.querySelector('[data-autofocus]');
    if (f) f.focus({ preventScroll: true });
  }

  function shareResult(result) {
    var text = Core.buildResultShareText(result, progress.countLearned(), TOTAL_LABEL, SITE_URL);
    shareText(text);
  }

  function shareText(text) {
    if (navigator.share) {
      navigator.share({ title: 'Korean Word Quiz', text: text }).catch(function () { /* cancelled */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Copied to clipboard');
      }, function () {
        showToast('Could not copy. Share link: ' + SITE_URL);
      });
      return;
    }
    showToast('Share link: ' + SITE_URL);
  }

  // ---------------------------------------------------------- word lists

  function wordTile(word, opts) {
    var o = opts || {};
    var example = word.example ? String(word.example).trim() : '';
    return '<li class="word-tile' + (o.compact ? ' compact' : '') + '"><div class="grow">' +
      (o.showLevel ? '<div class="pos">' + Core.LEVEL_INFO[word.level].partOfSpeech + '</div>' : '') +
      '<div class="ko ko-serif" lang="ko">' + esc(word.korean) + '</div>' +
      '<div class="en">' + esc(word.english) + '</div>' +
      (example ? '<div class="ex"' + langAttr(example) + '>' + esc(example) + '</div>' : '') +
      '</div>' + speakButton(word.korean, o.compact) + '</li>';
  }

  /** Shared list body with search + "show more". entries: words. */
  function mountWordList(container, entries, opts) {
    var shown = LIST_PAGE;
    var query = '';
    function filtered() {
      if (!query) return entries;
      var needle = query.toLowerCase();
      return entries.filter(function (w) {
        return w.korean.indexOf(query) !== -1 || w.english.toLowerCase().indexOf(needle) !== -1;
      });
    }
    function paint() {
      var list = filtered();
      var html = '';
      if (!list.length) html = '<p class="list-meta">No words match “' + esc(query) + '”.</p>';
      else {
        html = '<ul class="word-list">' + list.slice(0, shown).map(function (w) { return wordTile(w, opts); }).join('') + '</ul>';
        if (list.length > shown) {
          html += '<div style="margin-top:14px"><button type="button" class="btn btn-outline" data-action="more">Show more (' + fmt(list.length - shown) + ' left)</button></div>';
        }
      }
      container.innerHTML = html;
    }
    paint();
    return {
      setQuery: function (value) {
        query = value.trim();
        shown = LIST_PAGE;
        paint();
      },
      more: function () {
        shown += LIST_PAGE * 2;
        paint();
      },
    };
  }

  function listSearch(count) {
    if (count <= 12) return '';
    return '<label class="visually-hidden" for="word-search">Search saved words</label>' +
      '<input id="word-search" class="search" type="search" placeholder="Search Korean or English" autocomplete="off" spellcheck="false">';
  }

  var pendingFocus = null;

  function renderWrongList(params) {
    var filter = Core.isLevel(params.level) ? params.level : null;
    var levels = filter ? [filter] : Core.LEVELS;
    var counts = {};
    Core.LEVELS.forEach(function (l) { counts[l] = progress.wrongWordIds(l).length; });
    var totalAll = counts.nouns + counts.verbs + counts.adjectives;

    var shell = '<div class="page page-list">' + topbar('Wrong answers') + '<div id="list-body">' + loadingBlock() + '</div></div>';
    mount(shell, { title: 'Wrong answers' });

    var refs = [];
    levels.forEach(function (l) { progress.wrongWordIds(l).forEach(function (id) { refs.push(l + ':' + id); }); });
    var body = document.getElementById('list-body');
    store.wordsFromRefs(refs).then(function (words) {
      if (!document.contains(body)) return;
      if (!totalAll || (!words.length && !filter)) {
        body.innerHTML = emptyState('close', 'No words saved yet', 'Words you miss in quizzes will appear here.');
        return;
      }
      var chips = '<div class="chips" role="group" aria-label="Filter by part of speech">' +
        [null].concat(Core.LEVELS).map(function (l) {
          var n = l ? counts[l] : totalAll;
          return '<button type="button" class="chip" data-filter="' + (l || '') + '" aria-pressed="' + (filter === l) + '">' + (l ? Core.LEVEL_INFO[l].displayName : 'All') + ' · ' + fmt(n) + '</button>';
        }).join('') + '</div>';
      var reviewCount = Core.QuizReviewLimits.clampFullReview(words.length);
      body.innerHTML =
        '<div class="stack">' +
        (words.length ? '<button type="button" class="btn" data-action="review">' + icon('replay') + 'Review ' + fmt(words.length) + ' wrong ' + (words.length === 1 ? 'word' : 'words') + '</button>' : '') +
        chips + listSearch(words.length) +
        '<div id="word-list-host">' + (words.length ? '' : '<p class="list-meta">No ' + Core.LEVEL_INFO[filter].displayName.toLowerCase() + ' in your wrong answers.</p>') + '</div></div>';
      var list = words.length ? mountWordList(document.getElementById('word-list-host'), words, { showLevel: true }) : null;
      if (pendingFocus) {
        var again = $app.querySelector(pendingFocus);
        pendingFocus = null;
        if (again) again.focus({ preventScroll: true });
      }
      $app.oninput = function (e) {
        if (e.target.id === 'word-search' && list) list.setQuery(e.target.value);
      };
      $app.onclick = function (e) {
        var chip = e.target.closest('[data-filter]');
        if (chip) {
          var lv = chip.getAttribute('data-filter');
          pendingFocus = '[data-filter="' + lv + '"]';
          nav('/words/wrong' + (lv ? '?level=' + lv : ''), { replace: true });
          return;
        }
        var b = e.target.closest('[data-action]');
        if (!b) return;
        if (b.getAttribute('data-action') === 'review') {
          nav(Core.quizConfigToQuery(Core.makeQuizConfig({ mode: 'wrong', level: filter, count: reviewCount })));
        } else if (b.getAttribute('data-action') === 'more' && list) list.more();
      };
    }).catch(function () {
      body.innerHTML = errorBlock();
      $app.onclick = function (e) {
        if (e.target.closest('[data-action="retry"]')) { current.raw = null; render(); }
      };
    });
  }

  function renderLearnedHub() {
    var total = progress.countLearned();
    var html = '<div class="page">' + topbar('Learned words');
    if (!total) {
      html += emptyState('book', 'No learned words yet', 'Complete quizzes to start building your list.');
    } else {
      html += '<div class="stack"><button type="button" class="btn" data-action="review-all">' + icon('replay') + 'Review ' + fmt(total) + ' learned words</button>' +
        '<section class="card flush" aria-label="Learned words by part of speech">' +
        Core.LEVELS.map(function (l, i) {
          var n = progress.learnedWordIds(l).length;
          var info = Core.LEVEL_INFO[l];
          var main = n === 0 ? '<div class="row is-disabled">' : '<a class="row" href="#/words/learned/' + l + '" data-nav="/words/learned/' + l + '">';
          return (i ? '<hr class="divider">' : '') + '<div class="row-split">' + main +
            '<span class="well">' + icon(l) + '</span>' +
            '<span class="grow"><span class="title">' + info.displayName + '</span><span class="subtitle">' + (n === 0 ? 'No learned words yet' : wordsLabel(n)) + '</span></span>' +
            (n === 0 ? '</div>' : '</a>') +
            '<button type="button" class="btn btn-text" data-review="' + l + '"' + (n === 0 ? ' disabled' : '') + ' aria-label="Review learned ' + info.displayName.toLowerCase() + '">' + icon('replay', 'icon-sm') + 'Review</button></div>';
        }).join('') +
        '</section></div>';
    }
    html += '</div>';
    mount(html, {
      title: 'Learned words',
      onClick: function (e) {
        var b = e.target.closest('[data-action="review-all"],[data-review]');
        if (!b || b.disabled) return;
        var level = b.getAttribute('data-review');
        var n = level ? progress.learnedWordIds(level).length : progress.countLearned();
        nav(Core.quizConfigToQuery(Core.makeQuizConfig({ mode: 'learned', level: level || null, count: Core.QuizReviewLimits.clampFullReview(n) })));
      },
    });
  }

  function renderLearnedList(level) {
    var info = Core.LEVEL_INFO[level];
    var ids = progress.learnedWordIds(level);
    var shell = '<div class="page page-list">' + topbar('Learned · ' + info.displayName, '/words/learned') + '<div id="list-body">' + loadingBlock(ids.length > 400 ? 'Loading ' + fmt(ids.length) + ' words...' : 'Loading...') + '</div></div>';
    mount(shell, { title: 'Learned ' + info.displayName.toLowerCase() });
    var body = document.getElementById('list-body');
    store.wordsForIds(level, ids).then(function (words) {
      if (!document.contains(body)) return;
      if (!words.length) {
        body.innerHTML = emptyState('book', 'No words saved yet', 'Words you answer correctly will appear here.');
        return;
      }
      var reviewCount = Core.QuizReviewLimits.clampFullReview(words.length);
      body.innerHTML = '<div class="stack"><button type="button" class="btn" data-action="review">' + icon('replay') + 'Review ' + fmt(words.length) + ' learned words</button>' +
        listSearch(words.length) + '<div id="word-list-host"></div></div>';
      var list = mountWordList(document.getElementById('word-list-host'), words, { compact: true });
      $app.oninput = function (e) {
        if (e.target.id === 'word-search') list.setQuery(e.target.value);
      };
      $app.onclick = function (e) {
        var b = e.target.closest('[data-action]');
        if (!b) return;
        if (b.getAttribute('data-action') === 'review') {
          nav(Core.quizConfigToQuery(Core.makeQuizConfig({ mode: 'learned', level: level, count: reviewCount })));
        } else if (b.getAttribute('data-action') === 'more') list.more();
      };
    }).catch(function () {
      body.innerHTML = errorBlock();
      $app.onclick = function (e) {
        if (e.target.closest('[data-action="retry"]')) { current.raw = null; render(); }
      };
    });
  }

  // ------------------------------------------------------------ settings

  var moreApps = null;

  function renderSettings() {
    var focusId = document.activeElement && document.activeElement.id;
    var s = progress.stats();
    var mode = settings.themeMode();
    var dir = settings.quizDirection();
    var ttsReady = TTS.available();
    var ttsOn = settings.ttsEnabled();
    var rate = settings.ttsRate();
    var anyProgress = s.learnedCount > 0 || s.wrongCount > 0 || s.quizzesPlayed > 0;

    function seg(name, value, label, iconName, checked) {
      return '<button type="button" role="radio" id="' + name + '-' + value + '" data-' + name + '="' + value + '" aria-checked="' + checked + '" tabindex="' + (checked ? 0 : -1) + '">' +
        (iconName ? icon(iconName) : '') + label + '</button>';
    }
    function statLine(k, v) {
      return '<div class="stat-line"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>';
    }
    function tile(opts) {
      var tag = opts.href ? 'a' : 'button';
      var attrs = opts.href ? ' href="' + esc(opts.href) + '"' + (opts.external ? ' target="_blank" rel="noopener"' : '') + (opts.nav ? ' data-nav="' + esc(opts.nav) + '"' : '') : ' type="button"' + (opts.action ? ' data-action="' + opts.action + '"' : '') + (opts.disabled ? ' disabled' : '');
      var trail = opts.trail ? '<span class="trail">' + esc(opts.trail) + '</span>' : opts.external ? icon('open', 'icon-sm trail') : opts.arrow === false ? '' : icon('chevron', 'trail');
      return '<' + tag + ' class="setting-tile' + (opts.danger ? ' danger' : '') + '"' + (opts.id ? ' id="' + opts.id + '"' : '') + attrs + '><span class="grow">' + esc(opts.title) + (opts.sub ? '<span class="subtitle" style="display:block;margin-top:2px;color:var(--text-muted);font-size:13px">' + esc(opts.sub) + '</span>' : '') + '</span>' + trail + '</' + tag + '>';
    }
    function staticTile(title, trail) {
      return '<div class="setting-tile"><span class="grow">' + esc(title) + '</span><span class="trail">' + esc(trail) + '</span></div>';
    }
    var div = '<hr class="divider">';

    var appsHtml = '';
    if (moreApps && moreApps.length) {
      appsHtml = '<h2 class="section-label">More from GGOOK\'s Studio</h2><div class="card list">' +
        moreApps.map(function (a, i) {
          return (i ? div : '') + tile({ title: a.name, sub: a.subtitle, href: 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(a.packageId), external: true });
        }).join('') + '</div>';
    }

    var html =
      '<div class="page">' + topbar('Settings') +
      '<h2 class="section-label" id="appearance-label">Appearance</h2>' +
      '<div class="card" style="padding:12px"><div class="segmented" role="radiogroup" aria-labelledby="appearance-label">' +
      seg('mode', 'system', 'System', 'auto', mode === 'system') + seg('mode', 'light', 'Light', 'sun', mode === 'light') + seg('mode', 'dark', 'Dark', 'moon', mode === 'dark') +
      '</div></div>' +

      '<h2 class="section-label" id="direction-label">Quiz direction</h2>' +
      '<div class="card" style="padding:12px"><div class="segmented" role="radiogroup" aria-labelledby="direction-label">' +
      seg('dir', 'mixed', 'Mixed', '', dir === 'mixed') + seg('dir', 'ko-en', '<span lang="ko">한</span>&nbsp;→ EN', '', dir === 'ko-en') + seg('dir', 'en-ko', 'EN →&nbsp;<span lang="ko">한</span>', '', dir === 'en-ko') +
      '</div><p class="setting-note">Mixed asks nouns and adjectives both ways, like the app. Verbs are always Korean → English.</p></div>' +

      '<h2 class="section-label">Learning stats</h2>' +
      '<div class="card" style="padding:14px 16px">' +
      statLine('Learned words', fmt(s.learnedCount)) + statLine('Wrong words', fmt(s.wrongCount)) +
      statLine('Quizzes played', fmt(s.quizzesPlayed)) +
      statLine('Overall accuracy', s.questionsAnswered === 0 ? '—' : s.overallAccuracy + '%') +
      (s.lastSessionTotal > 0 ? statLine('Last quiz', s.lastSessionCorrect + '/' + s.lastSessionTotal + ' (' + s.lastSessionAccuracy + '%)') : '') +
      statLine('Best streak', (function () { var b = dailySvc.getAttendanceStatus().best; return b + ' ' + (b === 1 ? 'day' : 'days'); })()) +
      '</div>' +

      '<h2 class="section-label">Audio</h2>' +
      '<div class="card list">' +
      '<div class="toggle-row"><span class="grow"><span class="title" id="tts-label">Pronunciation (TTS)</span><span class="subtitle">' +
      (ttsReady ? 'Play Korean audio on speaker buttons' : TTS.supported() && !TTS.ready() ? 'Checking for a Korean voice…' : 'No Korean voice in this browser. Try Chrome, Edge or Safari, or add a Korean voice in your system settings.') +
      '</span></span><button type="button" class="switch" role="switch" id="tts-switch" aria-labelledby="tts-label" aria-checked="' + (ttsReady && ttsOn) + '"' + (ttsReady ? '' : ' disabled') + '></button></div>' +
      (ttsReady && ttsOn
        ? div + '<div class="slider-row"><label for="tts-rate"><span>Speech speed</span><output id="tts-rate-out">' + rate.toFixed(2) + '</output></label>' +
          '<input type="range" id="tts-rate" min="0.25" max="0.75" step="0.05" value="' + rate + '" aria-valuetext="' + rate.toFixed(2) + '">' +
          '<button type="button" class="btn btn-text" data-speak="안녕하세요" style="margin-top:4px">' + icon('volume', 'icon-sm') + 'Test: <span lang="ko">안녕하세요</span></button></div>'
        : '') +
      '</div>' +

      '<h2 class="section-label">Daily reminder</h2>' +
      '<div class="card list">' + tile({ title: 'Daily practice reminder', sub: 'Reminders are available in the Android app', href: PLAY_URL, external: true }) + '</div>' +

      '<h2 class="section-label">Reset progress</h2>' +
      '<div class="card list">' +
      tile({ id: 'reset-wrong', title: 'Reset wrong words', action: 'reset-wrong', disabled: s.wrongCount === 0 && progress.countExpertWrong() === 0, danger: true, arrow: false }) + div +
      tile({ id: 'reset-learned', title: 'Reset learned words', action: 'reset-learned', disabled: s.learnedCount === 0 && progress.countExpertLearned() === 0, danger: true, arrow: false }) + div +
      tile({ id: 'reset-all', title: 'Reset all progress', action: 'reset-all', disabled: !anyProgress && !dailySvc.hasPlayHistory(), danger: true, arrow: false }) +
      '</div>' +

      '<h2 class="section-label">About</h2>' +
      '<div class="card list">' +
      staticTile('Word bank', TOTAL_LABEL + ' words · app ' + M.appVersion) + div +
      staticTile('Web version', WEB_BUILD) + div +
      staticTile('Developer', "GGOOK's Studio") + div +
      tile({ title: 'Studio page', href: STUDIO_URL, external: true }) +
      '</div>' +

      '<h2 class="section-label">Legal</h2>' +
      '<div class="card list">' +
      tile({ title: 'Notices', href: '#/notices', nav: '/notices' }) + div +
      tile({ title: 'Privacy policy', href: PRIVACY_URL, external: true }) +
      '</div>' +

      '<h2 class="section-label">Support</h2>' +
      '<div class="card list">' +
      tile({ id: 'share-app', title: 'Share with friends', action: 'share-app' }) + div +
      tile({ title: 'Get it on Google Play', href: PLAY_URL, external: true }) +
      '</div>' + appsHtml +
      '</div>';

    mount(html, {
      title: 'Settings',
      onClick: function (e) {
        var t = e.target.closest('[data-mode],[data-dir],#tts-switch,[data-action]');
        if (!t) return;
        if (t.hasAttribute('data-mode')) {
          settings.setThemeMode(t.getAttribute('data-mode'));
          applyTheme();
          rerender();
        } else if (t.hasAttribute('data-dir')) {
          settings.setQuizDirection(t.getAttribute('data-dir'));
          rerender();
        } else if (t.id === 'tts-switch') {
          if (t.disabled) return;
          settings.setTtsEnabled(!settings.ttsEnabled());
          if (!settings.ttsEnabled()) TTS.stop();
          updateTtsClass();
          rerender();
        } else {
          var a = t.getAttribute('data-action');
          if (a === 'reset-wrong') {
            confirmReset('Reset wrong words?', 'All saved wrong answers will be removed. This cannot be undone.').then(function (ok) {
              if (!ok) return;
              progress.resetWrongWords();
              showToast('Wrong words reset');
              rerender();
            });
          } else if (a === 'reset-learned') {
            confirmReset('Reset learned words?', 'All saved learned words will be removed. This cannot be undone.').then(function (ok) {
              if (!ok) return;
              progress.resetLearnedWords();
              showToast('Learned words reset');
              rerender();
            });
          } else if (a === 'reset-all') {
            confirmReset('Reset everything?', 'Word progress, streaks, goals and quiz statistics will be cleared. This cannot be undone.').then(function (ok) {
              if (!ok) return;
              Core.resetAllProgress(services);
              showToast('All progress reset');
              rerender();
            });
          } else if (a === 'share-app') {
            shareText('Learn Korean vocabulary step by step with Korean Word Quiz!\n• ' + TOTAL_LABEL + ' words\n• 10 words a day + streaks\n• Auto wrong-answer review\n' + SITE_URL);
          }
        }
      },
      keys: function (e) {
        var radio = e.target.closest && e.target.closest('[role="radio"]');
        if (radio && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          var group = Array.prototype.slice.call(radio.parentNode.querySelectorAll('[role="radio"]'));
          var i = group.indexOf(radio);
          var next = group[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : group.length - 1)) % group.length];
          next.click();
          var again = document.getElementById(next.id);
          if (again) again.focus();
          return true;
        }
        return false;
      },
    });
    $app.oninput = function (e) {
      if (e.target.id === 'tts-rate') {
        var v = Number(e.target.value);
        settings.setTtsRate(v);
        e.target.setAttribute('aria-valuetext', v.toFixed(2));
        var out = document.getElementById('tts-rate-out');
        if (out) out.textContent = v.toFixed(2);
      }
    };
    $app.onchange = function (e) {
      if (e.target.id === 'tts-rate') speak('안녕하세요');
    };
    if (focusId) {
      var el = document.getElementById(focusId);
      if (el) el.focus({ preventScroll: true });
    }

    function rerender() {
      var y = window.scrollY;
      var id = document.activeElement && document.activeElement.id;
      current.raw = null;
      render();
      window.scrollTo(0, y);
      if (id && document.getElementById(id)) document.getElementById(id).focus({ preventScroll: true });
    }

    if (moreApps === null) {
      moreApps = [];
      fetchJson('more-apps.json').then(function (json) {
        moreApps = (json && Array.isArray(json.apps) ? json.apps : []).filter(function (a) { return a && a.active !== false && a.packageId && a.name; });
        if (moreApps.length && parseHash().path === '/settings') rerender();
      }).catch(function () { /* optional */ });
    }
  }

  // ------------------------------------------------------------- notices

  function renderNotices() {
    function paint() {
      var list = noticeState.notices;
      var html = '<div class="page">' + topbar('Notices');
      if (!noticeState.loaded) html += loadingBlock();
      else if (!list.length) html += emptyState('campaign', 'No notices available yet.', 'Updates and announcements will appear here.');
      else {
        html += '<ul class="stack" style="list-style:none;margin:0;padding:0">' + list.map(function (n, i) {
          var unseen = !settings.hasSeenNotice(n);
          return '<li><button type="button" class="notice-item' + (unseen ? ' unseen' : '') + '" data-notice="' + i + '">' +
            '<span class="grow"><span class="t">' + esc(Core.noticeSummary(n)) + '</span>' + (n.date ? '<span class="d">' + esc(n.date) + '</span>' : '') + '</span>' +
            (unseen ? '<span class="dot" role="img" aria-label="New"></span>' : icon('chevron', 'trail')) + '</button></li>';
        }).join('') + '</ul>';
      }
      html += '</div>';
      mount(html, {
        title: 'Notices',
        onClick: function (e) {
          var b = e.target.closest('[data-notice]');
          if (!b) return;
          var n = noticeState.notices[Number(b.getAttribute('data-notice'))];
          openDialog({
            title: n.title.trim() || 'Notice',
            date: n.date,
            message: n.message.trim() || n.title,
            actions: [{ label: n.button || 'OK', value: true }],
          }).then(function () {
            settings.markNoticeSeen(n);
            var idx = b.getAttribute('data-notice');
            paint();
            var again = $app.querySelector('[data-notice="' + idx + '"]');
            if (again) again.focus();
          });
        },
      });
    }
    paint();
    if (!noticeState.loaded) {
      noticePromise.then(function () {
        if (parseHash().path === '/notices') paint();
      });
    }
  }

  // ------------------------------------------------------------ bootstrap

  function refreshIfStale() {
    var today = Core.localDateKey();
    if (today !== refreshIfStale.day) {
      refreshIfStale.day = today;
      weekly.syncLearnedCount(progress.countLearned());
      var path = parseHash().path;
      if (path === '/' || path === '/settings') {
        current.raw = null;
        render();
      }
    }
  }
  refreshIfStale.day = Core.localDateKey();

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshIfStale();
  });
  window.addEventListener('focus', refreshIfStale);

  function boot() {
    applyTheme();
    TTS.onChange(function () {
      updateTtsClass();
      if (parseHash().path === '/settings') {
        var y = window.scrollY;
        current.raw = null;
        render();
        window.scrollTo(0, y);
      }
    });
    TTS.init();
    updateTtsClass();
    if (!history.state || typeof history.state.kwqDepth !== 'number') {
      try { history.replaceState({ kwqDepth: 0 }, '', location.href); } catch (e) { /* ignore */ }
    }

    var migration = Legacy.migrate(services, fetchJson).catch(function () { return null; });
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 1500); });
    Promise.all([Promise.race([migration, timeout]), Promise.race([noticePromise, timeout])]).then(function () {
      settings.recordAppOpen();
      weekly.syncLearnedCount(progress.countLearned());
      render();
      // A late notice file only adds the banner; refresh home once it arrives.
      if (!noticeState.loaded) {
        noticePromise.then(function () {
          if (parseHash().path === '/') {
            current.raw = null;
            render();
          }
        });
      }
    });
  }

  boot();
})();
