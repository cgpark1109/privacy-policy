/* Hangul Quiz (browser game): eight stages from single letters to whole words.
   Source: _src/hangul_quiz/app.js, copied to play/hangul-quiz/ by build.py (build_hangul_quiz). The page is an
   ordinary site page in English (/play/hangul-quiz/); this script renders the game into #hq-app.
   Romanization follows the Revised Romanization of Korean, as in the Learn Hangul guides. No frameworks. */
(function () {
  'use strict';

  var PER_STAGE = 8;

  /* ---------- data ---------- */
  // Letters: k = the letter, r = its sound (as a choice), w = shown when asking for the letter (if different), n = note
  var VOWELS = [
    { k: 'ㅏ', r: 'a' }, { k: 'ㅑ', r: 'ya' }, { k: 'ㅓ', r: 'eo' }, { k: 'ㅕ', r: 'yeo' }, { k: 'ㅗ', r: 'o' },
    { k: 'ㅛ', r: 'yo' }, { k: 'ㅜ', r: 'u' }, { k: 'ㅠ', r: 'yu' }, { k: 'ㅡ', r: 'eu' }, { k: 'ㅣ', r: 'i' },
  ];
  var CONSONANTS = [
    { k: 'ㄱ', r: 'g', n: 'ㄱ sounds like g at the start of a syllable and k at the end.' },
    { k: 'ㄴ', r: 'n' },
    { k: 'ㄷ', r: 'd', n: 'ㄷ sounds like d at the start of a syllable and t at the end.' },
    { k: 'ㄹ', r: 'r / l', n: 'ㄹ sounds like r at the start of a syllable and l at the end.' },
    { k: 'ㅁ', r: 'm' },
    { k: 'ㅂ', r: 'b', n: 'ㅂ sounds like b at the start of a syllable and p at the end.' },
    { k: 'ㅅ', r: 's' },
    { k: 'ㅇ', r: 'silent / ng', n: 'ㅇ is silent at the start of a syllable and sounds like ng at the end.', readOnly: true },
    { k: 'ㅈ', r: 'j' }, { k: 'ㅊ', r: 'ch' }, { k: 'ㅋ', r: 'k' }, { k: 'ㅌ', r: 't' }, { k: 'ㅍ', r: 'p' }, { k: 'ㅎ', r: 'h' },
  ];
  var TENSE = [
    { k: 'ㄲ', r: 'kk', n: 'ㄲ (kk) is the tense partner of ㄱ: a tight k with no puff of air.' },
    { k: 'ㄸ', r: 'tt', n: 'ㄸ (tt) is the tense partner of ㄷ: a tight t with no puff of air.' },
    { k: 'ㅃ', r: 'pp', n: 'ㅃ (pp) is the tense partner of ㅂ: a tight p with no puff of air.' },
    { k: 'ㅆ', r: 'ss', n: 'ㅆ (ss) is the tense partner of ㅅ: a sharper, tighter s.' },
    { k: 'ㅉ', r: 'jj', n: 'ㅉ (jj) is the tense partner of ㅈ: a tight j with no puff of air.' },
    { k: 'ㅋ', r: 'k', n: 'ㅋ (k) is the aspirated partner of ㄱ, with a strong puff of air.' },
    { k: 'ㅌ', r: 't', n: 'ㅌ (t) is the aspirated partner of ㄷ, with a strong puff of air.' },
    { k: 'ㅍ', r: 'p', n: 'ㅍ (p) is the aspirated partner of ㅂ, with a strong puff of air.' },
    { k: 'ㅊ', r: 'ch', n: 'ㅊ (ch) is the aspirated partner of ㅈ, with a strong puff of air.' },
  ];
  // plain letters used only as wrong choices in the tense stage
  var PLAIN = [{ k: 'ㄱ', r: 'g' }, { k: 'ㄷ', r: 'd' }, { k: 'ㅂ', r: 'b' }, { k: 'ㅅ', r: 's' }, { k: 'ㅈ', r: 'j' }];
  var COMPOUND = [
    { k: 'ㅐ', r: 'ae' }, { k: 'ㅒ', r: 'yae' }, { k: 'ㅔ', r: 'e', n: 'ㅔ (e) and ㅐ (ae) sound almost the same in everyday Seoul Korean.' },
    { k: 'ㅖ', r: 'ye' }, { k: 'ㅘ', r: 'wa', n: 'ㅘ is ㅗ + ㅏ said quickly together: wa.' }, { k: 'ㅙ', r: 'wae' },
    { k: 'ㅚ', r: 'oe' }, { k: 'ㅝ', r: 'wo', n: 'ㅝ is ㅜ + ㅓ said quickly together: wo.' }, { k: 'ㅞ', r: 'we' },
    { k: 'ㅟ', r: 'wi' }, { k: 'ㅢ', r: 'ui' },
  ];
  // Syllables and words: k = Korean, r = romanization, m = meaning (for the meaning stage), n = note
  var OPEN = [
    { k: '가', r: 'ga' }, { k: '나', r: 'na' }, { k: '다', r: 'da' }, { k: '라', r: 'ra' }, { k: '마', r: 'ma' },
    { k: '바', r: 'ba' }, { k: '사', r: 'sa' }, { k: '아', r: 'a', n: 'The ㅇ in 아 is silent, so 아 is just a.' },
    { k: '자', r: 'ja' }, { k: '차', r: 'cha' }, { k: '하', r: 'ha' }, { k: '고', r: 'go' }, { k: '누', r: 'nu' },
    { k: '도', r: 'do' }, { k: '머', r: 'meo' }, { k: '서', r: 'seo' }, { k: '여', r: 'yeo' }, { k: '그', r: 'geu' },
    { k: '쿠', r: 'ku' }, { k: '토', r: 'to' }, { k: '피', r: 'pi' }, { k: '휴', r: 'hyu' },
  ];
  var CLOSED = [
    { k: '각', r: 'gak' }, { k: '난', r: 'nan' }, { k: '달', r: 'dal', n: 'ㄹ at the end sounds like l.' },
    { k: '감', r: 'gam' }, { k: '밥', r: 'bap', n: 'ㅂ at the end sounds like p.' }, { k: '산', r: 'san' },
    { k: '강', r: 'gang', n: 'ㅇ at the end sounds like ng.' }, { k: '물', r: 'mul' }, { k: '김', r: 'gim' },
    { k: '손', r: 'son' }, { k: '문', r: 'mun' }, { k: '집', r: 'jip' }, { k: '국', r: 'guk', n: 'ㄱ at the end sounds like k.' },
    { k: '맛', r: 'mat', n: 'ㅅ at the end sounds like t, one of the seven end sounds.' },
    { k: '꽃', r: 'kkot', n: 'ㅊ at the end sounds like t, one of the seven end sounds.' },
    { k: '앞', r: 'ap', n: 'ㅍ at the end sounds like p.' }, { k: '몸', r: 'mom' }, { k: '길', r: 'gil' },
  ];
  var WORDS = [
    { k: '한국', r: 'hanguk', m: 'Korea' }, { k: '서울', r: 'seoul', m: 'Seoul' },
    { k: '김치', r: 'gimchi', m: 'kimchi', n: 'The usual English spelling is kimchi; the official romanization is gimchi.' },
    { k: '사랑', r: 'sarang', m: 'love' }, { k: '친구', r: 'chingu', m: 'friend' },
    { k: '학교', r: 'hakgyo', m: 'school' }, { k: '커피', r: 'keopi', m: 'coffee' }, { k: '바나나', r: 'banana', m: 'banana' },
    { k: '우유', r: 'uyu', m: 'milk' }, { k: '가방', r: 'gabang', m: 'bag' }, { k: '부산', r: 'busan', m: 'Busan' },
    { k: '비빔밥', r: 'bibimbap', m: 'bibimbap' }, { k: '한글', r: 'hangeul', m: 'Hangul' }, { k: '노래', r: 'norae', m: 'song' },
    { k: '나무', r: 'namu', m: 'tree' }, { k: '고양이', r: 'goyangi', m: 'cat' }, { k: '사과', r: 'sagwa', m: 'apple' },
    { k: '시계', r: 'sigye', m: 'clock' }, { k: '의자', r: 'uija', m: 'chair' }, { k: '전화', r: 'jeonhwa', m: 'phone' },
  ];
  var MEANINGS = [
    { k: '물', m: 'water' }, { k: '밥', m: 'rice, a meal' }, { k: '집', m: 'house, home' }, { k: '책', m: 'book' },
    { k: '사람', m: 'person' }, { k: '친구', m: 'friend' }, { k: '학교', m: 'school' }, { k: '엄마', m: 'mom' },
    { k: '아빠', m: 'dad' }, { k: '고양이', m: 'cat' }, { k: '개', m: 'dog' }, { k: '사과', m: 'apple' },
    { k: '우유', m: 'milk' }, { k: '나무', m: 'tree' }, { k: '바다', m: 'sea' }, { k: '하늘', m: 'sky' },
    { k: '손', m: 'hand' }, { k: '꽃', m: 'flower' }, { k: '의자', m: 'chair' }, { k: '빵', m: 'bread' },
    { k: '산', m: 'mountain' }, { k: '별', m: 'star' }, { k: '달', m: 'moon' }, { k: '이름', m: 'name' },
  ];

  // kind: 'letter' (sound <-> letter), 'read' (Korean -> romanization), 'mean' (Korean -> meaning)
  var STAGES = [
    { title: 'Basic vowels', desc: 'ㅏ, ㅓ, ㅗ, ㅜ and friends', kind: 'letter', items: VOWELS, guide: ['korean-vowels', 'Korean Vowels'] },
    { title: 'Basic consonants', desc: 'The 14 basic consonants', kind: 'letter', items: CONSONANTS, guide: ['korean-consonants', 'Korean Consonants'] },
    { title: 'Tense and aspirated', desc: 'ㄲ, ㄸ, ㅃ, ㅆ, ㅉ and ㅋ, ㅌ, ㅍ, ㅊ', kind: 'letter', items: TENSE, extra: PLAIN, guide: ['plain-aspirated-tense', 'Plain, Aspirated and Tense'] },
    { title: 'Compound vowels', desc: 'ㅐ, ㅔ, ㅘ, ㅝ, ㅢ and more', kind: 'letter', items: COMPOUND, guide: ['korean-vowels', 'Korean Vowels'] },
    { title: 'First syllables', desc: 'A consonant and a vowel: 가, 나, 도', kind: 'read', items: OPEN, guide: ['how-hangul-works', 'How Hangul Works'] },
    { title: 'Final consonants', desc: 'Syllables with batchim: 밥, 국, 꽃', kind: 'read', items: CLOSED, guide: ['batchim', 'Batchim'] },
    { title: 'Reading words', desc: '한국, 서울, 김치 and more', kind: 'read', items: WORDS, guide: ['two-week-plan', 'A Two-Week Plan to Learn Hangul'] },
    { title: 'Word meanings', desc: 'Read the word, pick its meaning', kind: 'mean', items: MEANINGS, guide: ['', 'all Learn Hangul guides'] },
  ];

  /* ---------- storage ---------- */
  var KEY = 'kys_hangul_progress';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ } }
  var progress = load();
  if (typeof progress !== 'object' || !progress.stars) progress = { stars: {} };
  function starsOf(i) { return progress.stars[i] || 0; }
  function unlocked(i) { return i === 0 || starsOf(i - 1) > 0; }
  function starsFor(score) { return score >= PER_STAGE ? 3 : score >= PER_STAGE - 1 ? 2 : score >= PER_STAGE - 3 ? 1 : 0; }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  var canSpeak = 'speechSynthesis' in window;
  function speak(text) {
    if (!canSpeak) return;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z"/></svg>';
  var SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  function starRow(n, label) {
    var h = '<span class="hq-stars" role="img" aria-label="' + esc(label || (n + ' of 3 stars')) + '">';
    for (var i = 1; i <= 3; i++) h += '<i class="' + (i <= n ? 'on' : '') + '">' + STAR + '</i>';
    return h + '</span>';
  }

  /* ---------- questions ---------- */
  function answerOf(stage, item) { return stage.kind === 'mean' ? item.m : item.r; }
  function makeQuestions(si) {
    var st = STAGES[si];
    var picks = shuffle(st.items.slice());
    while (picks.length < PER_STAGE) picks = picks.concat(shuffle(st.items.slice()));
    picks = picks.slice(0, PER_STAGE);
    var pool = st.items.concat(st.extra || []);
    return picks.map(function (item, i) {
      // letter stages alternate: show the letter and ask for its sound, or the other way round
      var write = st.kind === 'letter' && !item.readOnly && i % 2 === 1;
      var key = write ? function (x) { return x.k; } : function (x) { return answerOf(st, x); };
      var seen = {};
      seen[key(item)] = true;
      var wrong = shuffle(pool.filter(function (x) {
        if (x.readOnly && write) return false;
        var v = key(x);
        if (seen[v]) return false;
        seen[v] = true;
        return true;
      })).slice(0, 3);
      var choices = shuffle([item].concat(wrong)).map(key);
      return { item: item, write: write, choices: choices, answer: key(item) };
    });
  }

  /* ---------- state and rendering ---------- */
  var S = { screen: 'home' };
  var app = document.getElementById('hq-app');

  function renderHome() {
    var next = 0;
    for (var i = 0; i < STAGES.length; i++) if (unlocked(i) && starsOf(i) < 3) { next = i; break; }
    var total = 0;
    var cells = STAGES.map(function (st, i) {
      var s = starsOf(i);
      total += s;
      if (!unlocked(i)) {
        return '<li><button class="hq-stage locked" disabled aria-label="Stage ' + (i + 1) + ', ' + esc(st.title) + ', locked">' +
          '<span class="num">' + LOCK + '</span><span class="txt"><b>' + esc(st.title) + '</b><small>' + esc(st.desc) + '</small></span></button></li>';
      }
      return '<li><button class="hq-stage' + (i === next ? ' current' : '') + '" data-stage="' + i + '">' +
        '<span class="num">' + (i + 1) + '</span><span class="txt"><b>' + esc(st.title) + '</b><small>' + esc(st.desc) + '</small></span>' +
        starRow(s, s + ' of 3 stars') + '</button></li>';
    }).join('');
    return '<div class="card hq-home"><div class="hq-home-head"><h2 id="hq-title" tabindex="-1">Stages</h2>' +
      '<span class="hq-total">' + STAR + ' ' + total + ' / ' + STAGES.length * 3 + '</span></div>' +
      '<ol class="hq-stages">' + cells + '</ol>' +
      '<button class="btn hq-start" data-stage="' + next + '">Play stage ' + (next + 1) + ': ' + esc(STAGES[next].title) + '</button>' +
      '<p class="hq-note">Progress is saved in this browser only.</p></div>';
  }

  function prompt(q, st) {
    if (q.write) return { ask: 'Which letter makes this sound?', big: q.item.r, latin: true };
    if (st.kind === 'letter') return { ask: 'What sound does this letter make?', big: q.item.k };
    if (st.kind === 'mean') return { ask: 'What does this word mean?', big: q.item.k, say: q.item.k };
    return { ask: 'How do you read this?', big: q.item.k, say: q.item.k };
  }

  function renderQuiz() {
    var st = STAGES[S.stage], q = S.qs[S.i], p = prompt(q, st);
    var dots = S.qs.map(function (x, i) {
      var c = i < S.results.length ? (S.results[i] ? 'ok' : 'bad') : i === S.i ? 'now' : '';
      return '<i class="' + c + '"></i>';
    }).join('');
    var answered = S.picked != null;
    var choices = q.choices.map(function (c, i) {
      var cls = 'hq-choice' + (q.write ? ' ko' : '');
      if (answered) {
        if (c === q.answer) cls += ' ok';
        else if (c === S.picked) cls += ' bad';
      }
      return '<button class="' + cls + '" data-choice="' + i + '"' + (answered ? ' disabled' : '') + '><span class="key">' + (i + 1) + '</span><span>' + esc(c) + '</span></button>';
    }).join('');
    var fb = '';
    if (answered) {
      var ok = S.picked === q.answer;
      var line = st.kind === 'mean' ? q.item.k + ' means "' + q.item.m + '".' :
        st.kind === 'read' ? q.item.k + ' is read ' + q.item.r + (st.items === WORDS ? ' (' + q.item.m + ').' : '.') :
        q.item.k + ' sounds like ' + q.item.r + '.';
      // a letter's note already says how it sounds, so it replaces the plain line
      var text = st.kind === 'letter' && q.item.n ? q.item.n : line + (q.item.n ? ' ' + q.item.n : '');
      fb = '<div class="hq-feedback ' + (ok ? 'ok' : 'bad') + '" id="hq-fb"><p class="verdict">' + (ok ? 'Correct!' : 'Not quite.') + '</p>' +
        '<p>' + esc(text) + '</p>' +
        '<button class="btn" id="hq-next" data-action="next">' + (S.i + 1 < S.qs.length ? 'Next' : 'See result') + '</button></div>';
    }
    var sayBtn = p.say && canSpeak ? '<button class="hq-say" data-action="say" aria-label="Listen">' + SPEAKER + '</button>' : '';
    return '<div class="hq-quiz"><div class="hq-top"><button class="hq-back" data-action="home">← Stages</button>' +
      '<span class="hq-where">Stage ' + (S.stage + 1) + ': ' + esc(st.title) + ' · ' + (S.i + 1) + '/' + S.qs.length + '</span></div>' +
      '<div class="hq-dots" aria-hidden="true">' + dots + '</div>' +
      '<div class="card hq-q"><p class="hq-ask" id="hq-ask" tabindex="-1">' + esc(p.ask) + '</p>' +
      '<p class="hq-big' + (p.latin ? ' latin' : '') + '" lang="' + (p.latin ? 'en' : 'ko') + '">' + esc(p.big) + sayBtn + '</p></div>' +
      '<div class="hq-choices">' + choices + '</div>' + fb +
      '<p class="hq-keys">Keys 1–4 to answer, Enter for next.</p></div>';
  }

  function renderResult() {
    var st = STAGES[S.stage], score = S.results.filter(Boolean).length, s = starsFor(score);
    var nextOpen = S.stage + 1 < STAGES.length && unlocked(S.stage + 1);
    var msg = s === 3 ? 'Perfect!' : s === 2 ? 'Well done!' : s === 1 ? 'Stage cleared!' : 'Keep practicing!';
    var sub = s === 0 ? 'Get at least ' + (PER_STAGE - 3) + ' right to clear the stage.' : score + ' of ' + PER_STAGE + ' correct.';
    var mistakes = S.qs.filter(function (q, i) { return !S.results[i]; }).map(function (q) {
      var it = q.item;
      return '<li><span class="ko-big" lang="ko">' + esc(it.k) + '</span><span>' + esc(st.kind === 'mean' ? it.m : it.r) + (it.n ? '<small>' + esc(it.n) + '</small>' : '') + '</span></li>';
    }).join('');
    return '<div class="hq-result"><div class="card hq-res"><h2 id="hq-res" tabindex="-1">' + msg + '</h2>' + starRow(s) +
      '<p class="hq-score">' + score + ' / ' + PER_STAGE + '</p><p>' + esc(sub) + '</p>' +
      '<div class="hq-actions"><button class="btn ghost" data-stage="' + S.stage + '">Try again</button>' +
      (nextOpen ? '<button class="btn" data-stage="' + (S.stage + 1) + '">Next stage</button>' : '<button class="btn" data-action="home">Stages</button>') + '</div>' +
      '<p class="hq-guide">Review: <a href="/learn/' + (st.guide[0] ? st.guide[0] + '/' : '') + '">' + esc(st.guide[1]) + '</a></p></div>' +
      (mistakes ? '<div class="card"><h2>Review your mistakes</h2><ul class="hq-review">' + mistakes + '</ul></div>' : '') + '</div>';
  }

  function render(focusId) {
    app.innerHTML = S.screen === 'quiz' ? renderQuiz() : S.screen === 'result' ? renderResult() : renderHome();
    var extra = document.getElementById('hq-static');
    if (extra) extra.hidden = S.screen !== 'home';
    if (focusId) { var f = document.getElementById(focusId); if (f) f.focus({ preventScroll: true }); }
  }
  function scrollToApp() {
    if (app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start' });
  }
  function start(si) {
    S = { screen: 'quiz', stage: si, qs: makeQuestions(si), i: 0, results: [], picked: null };
    render('hq-ask');
    scrollToApp();
  }
  function pick(i) {
    if (S.screen !== 'quiz' || S.picked != null) return;
    var q = S.qs[S.i];
    S.picked = q.choices[i];
    S.results.push(S.picked === q.answer);
    render('hq-next');
    var live = document.getElementById('live');
    if (live) live.textContent = (S.picked === q.answer ? 'Correct. ' : 'Not quite. ') + q.answer;
  }
  function next() {
    if (S.picked == null) return;
    if (S.i + 1 < S.qs.length) { S.i++; S.picked = null; render('hq-ask'); return; }
    var s = starsFor(S.results.filter(Boolean).length);
    if (s > starsOf(S.stage)) { progress.stars[S.stage] = s; save(); }
    S.screen = 'result';
    render('hq-res');
    scrollToApp();
  }

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-stage],[data-choice],[data-action]');
    if (!el || el.disabled) return;
    if (el.hasAttribute('data-stage')) return start(+el.getAttribute('data-stage'));
    if (el.hasAttribute('data-choice')) return pick(+el.getAttribute('data-choice'));
    var a = el.getAttribute('data-action');
    if (a === 'next') next();
    else if (a === 'say') speak(S.qs[S.i].item.k);
    else if (a === 'home') { S = { screen: 'home' }; render('hq-title'); scrollToApp(); }
  });
  document.addEventListener('keydown', function (e) {
    if (S.screen !== 'quiz' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-4]$/.test(e.key)) { e.preventDefault(); pick(+e.key - 1); }
    else if (e.key === 'Enter' && S.picked != null && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); next(); }
  });

  render();
})();
