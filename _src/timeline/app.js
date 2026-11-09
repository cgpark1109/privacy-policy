/* History Timeline (browser game): place world history events in order.
   Source: _src/timeline/app.js, copied to play/history-timeline/ by _src/timeline_build.py. The page itself is a
   normal site page (/play/history-timeline/ in English, /ko/play/history-timeline/ in Korean); this script renders the
   game into #tl-app in the page's language. The events are in data.js (window.TL), generated from _src/timeline.py. */
(function () {
  'use strict';

  var TL = window.TL;
  var EVENTS = TL.events;
  var LIVES = 3;
  var DECKS = ['all', 'world', 'korea'];
  var ARTICLE = '/ko/history/';

  /* ---------- storage (keys prefixed kys_timeline_; the site origin is shared by all games) ---------- */
  var store = {
    get: function (key) {
      try { var v = localStorage.getItem('kys_timeline_' + key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set: function (key, value) {
      try { localStorage.setItem('kys_timeline_' + key, JSON.stringify(value)); } catch (e) { /* private mode or blocked */ }
    },
  };
  var settings = store.get('settings') || {};
  settings.lang = document.documentElement.lang === 'ko' ? 'ko' : 'en';
  if (DECKS.indexOf(settings.deck) < 0) settings.deck = 'all';
  var best = store.get('best') || {};

  /* ---------- text ---------- */
  var STR = {
    en: {
      deck: 'Choose a deck', deck_all: 'All of history', deck_all_desc: 'Every event, from the pyramids to 2002',
      deck_world: 'World history', deck_world_desc: 'Events from around the world',
      deck_korea: 'Korean history', deck_korea_desc: 'From Gojoseon to the 2002 World Cup',
      n_events: '{n} events', best: 'Best: {n}', start: 'Start',
      lives: 'Hearts', lives_left: '{n} of 3 hearts left', score: 'Score', cards_left: '{n} cards left', card_left: '1 card left',
      question: 'When did this happen?', place_hint: 'Choose a place on the timeline below.',
      slot_first: 'Place before {b}', slot_last: 'Place after {a}', slot_between: 'Place between {a} and {b}', place_here: 'Place here',
      correct: 'Correct!', wrong: 'Not quite.', was_in: '{x}: {y}', read: 'Read the story (in Korean)', next: 'Next card', finish: 'See result',
      quit: 'End game', end_title: 'Game over', end_win: 'Timeline complete!', end_score: 'You placed {n} cards correctly.', end_score_1: 'You placed 1 card correctly.',
      new_best: 'New best score!', best_is: 'Your best for this deck: {n}', again: 'Play again', change_deck: 'Other decks',
      mistakes: 'Cards to review', no_mistakes: 'No mistakes. Impressive!', your_timeline: 'Your timeline',
      saved_note: 'Best scores are saved in this browser only.',
    },
    ko: {
      deck: '카드 묶음 고르기', deck_all: '역사 전체', deck_all_desc: '피라미드부터 2002년까지 모든 사건',
      deck_world: '세계사', deck_world_desc: '세계 여러 지역의 사건',
      deck_korea: '한국사', deck_korea_desc: '고조선부터 2002년 월드컵까지',
      n_events: '사건 {n}개', best: '최고 {n}점', start: '시작하기',
      lives: '하트', lives_left: '하트 3개 중 {n}개 남음', score: '점수', cards_left: '남은 카드 {n}장', card_left: '남은 카드 1장',
      question: '이 사건은 언제 일어났을까요?', place_hint: '아래 연표에서 들어갈 자리를 고르세요.',
      slot_first: '{b} 앞에 놓기', slot_last: '{a} 뒤에 놓기', slot_between: '{a} 뒤, {b} 앞에 놓기', place_here: '여기에 놓기',
      correct: '정답이에요!', wrong: '아쉬워요.', was_in: '{x}: {y}', read: '이 사건 읽어 보기', next: '다음 카드', finish: '결과 보기',
      quit: '그만하기', end_title: '게임 끝', end_win: '연표 완성!', end_score: '카드 {n}장을 맞게 놓았어요.', end_score_1: '카드 1장을 맞게 놓았어요.',
      new_best: '최고 기록이에요!', best_is: '이 묶음의 최고 기록: {n}점', again: '다시 하기', change_deck: '다른 묶음',
      mistakes: '다시 볼 카드', no_mistakes: '틀린 카드가 없어요. 대단해요!', your_timeline: '내가 만든 연표',
      saved_note: '최고 기록은 이 브라우저에만 저장돼요.',
    },
  };
  function t(key, vars) {
    var s = (STR[settings.lang] && STR[settings.lang][key]) || STR.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function label(ev) { return settings.lang === 'ko' ? ev.ko : ev.en; }
  function year(ev) { return settings.lang === 'ko' ? ev.ko_year : ev.en_year; }
  function mid(ev) { return (ev.lo + ev.hi) / 2; }
  function deckEvents(deck) {
    return EVENTS.filter(function (ev) { return deck === 'all' || (deck === 'korea' ? ev.kr : !ev.kr); });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }

  /* ---------- rules ---------- */
  // A card fits unless some card to its left certainly comes after it, or some card to its right certainly before it.
  function fits(placed, i, ev) {
    for (var j = 0; j < placed.length; j++) {
      if (j < i ? placed[j].lo > ev.hi : placed[j].hi < ev.lo) return false;
    }
    return true;
  }
  function rightIndex(placed, ev) {
    for (var i = 0; i <= placed.length; i++) {
      if (fits(placed, i, ev) && (i === placed.length || mid(placed[i]) >= mid(ev))) return i;
    }
    for (i = 0; i <= placed.length; i++) if (fits(placed, i, ev)) return i;
    return placed.length;
  }

  /* ---------- state ---------- */
  var S = { screen: 'home' };
  function newGame() {
    var deck = shuffle(deckEvents(settings.deck).slice());
    S = { screen: 'play', deck: settings.deck, placed: [deck.shift()], queue: deck, current: null, lives: LIVES, score: 0,
          mistakes: [], result: null, lastIndex: -1, newBest: false };
    S.current = S.queue.shift();
  }
  function place(i) {
    if (!S.current || S.result) return;
    var ev = S.current, ok = fits(S.placed, i, ev);
    var at = ok ? i : rightIndex(S.placed, ev);
    S.placed.splice(at, 0, ev);
    S.lastIndex = at;
    S.result = { ok: ok, ev: ev };
    if (ok) S.score++; else { S.lives--; S.mistakes.push(ev); }
    S.current = null;
    render();
    announce((ok ? t('correct') : t('wrong')) + ' ' + t('was_in', { x: label(ev), y: year(ev) }));
    var fb = document.getElementById('next-btn');
    if (fb) fb.focus();
    var card = document.querySelector('.tl-item.just');
    if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function next() {
    if (S.lives <= 0 || !S.queue.length) return finish();
    S.current = S.queue.shift();
    S.result = null;
    S.lastIndex = -1;
    render();
    var q = document.getElementById('question');
    if (q) q.focus();
  }
  function finish() {
    var prev = best[S.deck] || 0;
    S.newBest = S.score > prev;
    if (S.newBest) { best[S.deck] = S.score; store.set('best', best); }
    S.screen = 'end';
    render();
    var h = document.getElementById('end-title');
    if (h) h.focus();
  }

  /* ---------- rendering ---------- */
  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2l-4.2-4.2-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
  var CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var BOOK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>';

  function articleLink(ev, text) {
    return '<a class="read" href="' + ARTICLE + esc(ev.slug) + '/">' + BOOK + '<span>' + esc(text || t('read')) + '</span></a>';
  }
  function itemHtml(ev, i) {
    var cls = 'tl-item';
    if (i === S.lastIndex && S.result) cls += ' just ' + (S.result.ok ? 'ok' : 'bad');
    return '<li class="' + cls + '"><span class="tl-year">' + esc(year(ev)) + '</span><span class="tl-label">' + esc(label(ev)) + '</span></li>';
  }
  function slotHtml(i) {
    var a = S.placed[i - 1], b = S.placed[i], aria;
    if (!a) aria = t('slot_first', { b: label(b) });
    else if (!b) aria = t('slot_last', { a: label(a) });
    else aria = t('slot_between', { a: label(a), b: label(b) });
    return '<li class="tl-slot"><button type="button" data-place="' + i + '" aria-label="' + esc(aria) + '"><span>+ ' + esc(t('place_here')) + '</span></button></li>';
  }

  function renderHome() {
    var decks = DECKS.map(function (d) {
      var n = deckEvents(d).length, b = best[d];
      return '<button type="button" class="mode" role="radio" aria-checked="' + (settings.deck === d) + '" tabindex="' + (settings.deck === d ? 0 : -1) + '" data-deck="' + d + '">' +
        '<span class="dot"></span><span><span class="m-title">' + esc(t('deck_' + d)) + '</span><span class="m-desc">' +
        esc(t('deck_' + d + '_desc')) + ' · ' + esc(t('n_events', { n: n })) + '</span></span>' +
        (b ? '<span class="m-stat">' + esc(t('best', { n: b })) + '</span>' : '') + '</button>';
    }).join('');
    return '<div class="card tl-home"><h2 id="deck-label" tabindex="-1">' + esc(t('deck')) + '</h2>' +
      '<div class="modes" role="radiogroup" aria-labelledby="deck-label">' + decks + '</div>' +
      '<button type="button" class="btn tl-start" data-action="start">' + esc(t('start')) + '</button>' +
      '<p class="tl-note">' + esc(t('saved_note')) + '</p></div>';
  }

  function renderPlay() {
    var hearts = '';
    for (var h = 0; h < LIVES; h++) hearts += '<i class="' + (h < S.lives ? 'on' : '') + '">' + HEART + '</i>';
    var top = '<div class="tl-top"><span class="hearts" role="img" aria-label="' + esc(t('lives_left', { n: S.lives })) + '">' + hearts + '</span>' +
      '<span class="tl-score">' + esc(t('score')) + ' <b>' + S.score + '</b></span>' +
      '<span class="tl-left">' + esc(t(S.queue.length + (S.current ? 1 : 0) === 1 ? 'card_left' : 'cards_left', { n: S.queue.length + (S.current ? 1 : 0) })) + '</span>' +
      '<button type="button" class="quit" data-action="quit">' + esc(t('quit')) + '</button></div>';
    var panel;
    if (S.current) {
      panel = '<div class="card tl-current" id="question" tabindex="-1"><p class="tl-ask">' + esc(t('question')) + '</p>' +
        '<p class="tl-card">' + esc(label(S.current)) + '</p><p class="tl-hint">' + esc(t('place_hint')) + '</p></div>';
    } else {
      var r = S.result, last = S.lives <= 0 || !S.queue.length;
      panel = '<div class="card tl-feedback ' + (r.ok ? 'ok' : 'bad') + '"><p class="verdict">' + (r.ok ? CHECK : CROSS) + esc(r.ok ? t('correct') : t('wrong')) + '</p>' +
        '<p class="tl-card">' + esc(label(r.ev)) + '</p><p class="tl-when">' + esc(year(r.ev)) + '</p>' +
        '<div class="tl-actions">' + articleLink(r.ev) + '<button type="button" class="btn" id="next-btn" data-action="next">' +
        esc(last ? t('finish') : t('next')) + '</button></div></div>';
    }
    var list = '';
    for (var i = 0; i < S.placed.length; i++) {
      if (S.current) list += slotHtml(i);
      list += itemHtml(S.placed[i], i);
    }
    if (S.current) list += slotHtml(S.placed.length);
    return '<div class="tl-play">' + top + '<div class="tl-sticky">' + panel + '</div><ol class="tl-list' + (S.current ? ' choosing' : '') + '">' + list + '</ol></div>';
  }

  function renderEnd() {
    var win = S.lives > 0 && !S.current && !S.queue.length;
    var mist = S.mistakes.length ? '<ul class="tl-review">' + S.mistakes.map(function (ev) {
      return '<li><span class="tl-year">' + esc(year(ev)) + '</span><span class="tl-label">' + esc(label(ev)) + '</span>' + articleLink(ev) + '</li>';
    }).join('') + '</ul>' : '<p>' + esc(t('no_mistakes')) + '</p>';
    var timeline = S.placed.map(function (ev) {
      return '<li class="tl-item"><span class="tl-year">' + esc(year(ev)) + '</span><a class="tl-label" href="' + ARTICLE + esc(ev.slug) + '/">' + esc(label(ev)) + '</a></li>';
    }).join('');
    return '<div class="tl-end"><div class="card result">' +
      '<h2 id="end-title" tabindex="-1">' + esc(win ? t('end_win') : t('end_title')) + '</h2>' +
      '<p class="big-score">' + S.score + '</p><p>' + esc(t(S.score === 1 ? 'end_score_1' : 'end_score', { n: S.score })) + '</p>' +
      '<p>' + esc(S.newBest ? t('new_best') : t('best_is', { n: best[S.deck] || 0 })) + '</p>' +
      '<div class="tl-actions"><button type="button" class="btn" data-action="start">' + esc(t('again')) + '</button>' +
      '<button type="button" class="btn ghost" data-action="home">' + esc(t('change_deck')) + '</button></div></div>' +
      '<div class="card"><h2>' + esc(t('mistakes')) + '</h2>' + mist + '</div>' +
      '<div class="card"><h2>' + esc(t('your_timeline')) + '</h2><ol class="tl-list done">' + timeline + '</ol></div></div>';
  }

  function render() {
    var view = document.getElementById('tl-app');
    view.innerHTML = S.screen === 'play' ? renderPlay() : S.screen === 'end' ? renderEnd() : renderHome();
    var extra = document.getElementById('tl-static');
    if (extra) extra.hidden = S.screen !== 'home';
  }

  function scrollToApp() {
    var app = document.getElementById('tl-app');
    if (app && app.getBoundingClientRect().top < 0 && app.scrollIntoView) app.scrollIntoView({ block: 'start' });
  }

  function announce(msg) {
    var live = document.getElementById('live');
    if (!live) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 30);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-place],[data-deck],[data-action]');
    if (!el) return;
    if (el.hasAttribute('data-place')) return place(+el.getAttribute('data-place'));
    if (el.hasAttribute('data-deck')) {
      settings.deck = el.getAttribute('data-deck');
      store.set('settings', settings);
      render();
      var sel = document.querySelector('[data-deck="' + settings.deck + '"]');
      if (sel) sel.focus();
      return;
    }
    var act = el.getAttribute('data-action');
    if (act === 'start') { newGame(); render(); var q = document.getElementById('question'); if (q) q.focus(); scrollToApp(); }
    else if (act === 'next') next();
    else if (act === 'quit') finish();
    else if (act === 'home') { S = { screen: 'home' }; render(); var h = document.getElementById('deck-label'); if (h) h.focus(); scrollToApp(); }
  });
  // Arrow keys move between deck choices, as in a radio group.
  document.addEventListener('keydown', function (e) {
    var el = e.target.closest && e.target.closest('[data-deck]');
    if (!el || ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    e.preventDefault();
    var i = DECKS.indexOf(el.getAttribute('data-deck'));
    i = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : DECKS.length - 1)) % DECKS.length;
    settings.deck = DECKS[i];
    store.set('settings', settings);
    render();
    document.querySelector('[data-deck="' + settings.deck + '"]').focus();
  });

  render();
})();
