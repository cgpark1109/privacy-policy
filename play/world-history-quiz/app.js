/*
 * World History Quiz — web version.
 *
 * Mirrors the Flutter app (world_history_quiz 1.2.0): the same stages,
 * unlock rules, scoring, stars and screens. Plain JS, no build step; every
 * path is relative so the site works under any sub-path.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants (keep in sync with the app's lib/constants.dart;
  // tools/sync_from_app.py warns when they differ)
  // ---------------------------------------------------------------------------

  const ERAS = ['ancient', 'medieval', 'early_modern', 'modern1', 'contemporary'];
  const CATEGORIES = ['person', 'year', 'event'];
  const ERA_TOTAL_STAGES = { ancient: 10, medieval: 10, early_modern: 10, modern1: 10, contemporary: 10 };
  const QUESTIONS_PER_SESSION = 10;
  const CLEAR_SCORE_THRESHOLD = 6;
  const AUTO_ADVANCE_MS = 1600;

  const ERA_ACCENTS = {
    ancient: '#B4683F',
    medieval: '#9A4552',
    early_modern: '#3F8088',
    modern1: '#557497',
    contemporary: '#6E8C4E',
  };

  const LINKS = {
    play:
      'https://play.google.com/store/apps/details?id=com.kysystemstudio.historychallenge&referrer=utm_source%3Dkysystemstudio%26utm_medium%3Dwebapp%26utm_campaign%3Dweb_version',
    studio: 'https://kysystemstudio.com/games/world-history-quiz/',
    privacy: 'https://kysystemstudio.com/privacy.html',
  };

  const KEYS = {
    language: 'language',
    resultCount: 'resultCount',
    readNotices: 'readNoticeIds',
    dismissedPopups: 'dismissedNoticePopupIds',
    storageVersion: 'webStorageVersion',
  };
  const STORAGE_VERSION = '2';

  const getTotalStages = (era) => ERA_TOTAL_STAGES[era] ?? 10;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---------------------------------------------------------------------------
  // Strings (from the app's lib/l10n/strings.dart, plus a few web-only ones)
  // ---------------------------------------------------------------------------

  const S = {
    appTitle: ['World History Quiz', '세계사 퀴즈'],
    docTitleHome: ['World History Quiz – 5,250 questions across 5 eras', '세계사 퀴즈 – 5개 시대 5,250문항'],
    settingsTitle: ['Settings', '설정'],
    resetProgress: ['Reset Progress', '진행도 초기화'],
    privacyPolicy: ['Privacy Policy', '개인정보처리방침'],
    progressTitle: ['My Progress', '내 진행도'],
    hintShort: ['Hint', '힌트'],
    hintPrefix: ['Answer starts with', '정답의 첫 글자'],
    score: ['Score', '점수'],
    difficulty: ['Difficulty increases by stage', '스테이지가 올라갈수록 난이도가 상승합니다'],
    stageClear: ['Stage Clear!', '스테이지 클리어!'],
    tryAgain: ['Try Again', '다시 도전해보세요'],
    nextStage: ['Next Stage', '다음 스테이지'],
    retry: ['Retry', '다시하기'],
    stageSelect: ['Stage Select', '스테이지 선택'],
    home: ['Home', '홈'],
    resetSuccess: ['Progress reset!', '진행도가 초기화되었습니다!'],
    confirmResetTitle: ['Reset Progress', '진행도 초기화'],
    confirmResetBody: ['Are you sure you want to reset all progress?', '정말 모든 진행도를 초기화할까요?'],
    cancel: ['Cancel', '취소'],
    confirm: ['Confirm', '확인'],
    continueLabel: ['Continue', '다음'],
    seeResults: ['See Results', '결과 보기'],
    noQuestions: ['Not enough questions for this stage.', '이 스테이지의 문제가 부족합니다.'],
    loadDataError: ['Failed to load quiz data.', '퀴즈 데이터를 불러오지 못했습니다.'],
    loading: ['Loading...', '로딩 중...'],
    noticeNotFound: ['Notice not found.', '공지를 찾을 수 없습니다.'],
    noticesTitle: ['Notices', '공지사항'],
    noticeEmpty: ['No notices yet.', '등록된 공지가 없습니다.'],
    noticeClose: ['Close', '닫기'],
    noticeReadMore: ['Read More', '자세히 보기'],
    noticePopupTag: ['Notice', '공지'],
    openNotices: ['Open notices', '공지사항 열기'],
    openSettings: ['Open settings', '설정 열기'],
    goBack: ['Go back', '뒤로가기'],
    quitQuizTitle: ['Quit Quiz', '퀴즈 종료'],
    quitQuizMessage: ['Your answers in this stage will be lost.', '이번 스테이지에서 푼 기록이 사라집니다. 그만두시겠습니까?'],
    quit: ['Quit', '그만두기'],
    overallProgress: ['Overall progress', '전체 진행도'],
    chooseEra: ['Choose an era', '시대를 선택하세요'],
    explanationTitle: ['Explanation', '해설'],
    appSection: ['App', '앱'],
    // Web-only
    language: ['Language', '언어'],
    links: ['Links', '링크'],
    getOnPlay: ['Get it on Google Play', 'Google Play에서 받기'],
    alsoOnAndroid: ['Also on Android', 'Android 앱으로도 즐겨보세요'],
    aboutGame: ['About this game', '게임 소개'],
    newTab: ['(opens in a new tab)', '(새 탭에서 열림)'],
    unread: ['Unread', '읽지 않음'],
    cleared: ['cleared', '클리어'],
    correctAnnounce: ['Correct!', '정답입니다!'],
    yourAnswerWrong: ['your answer, incorrect', '선택한 답, 오답'],
    correctAnswer: ['correct answer', '정답'],
    keyboardHint: [
      'Keys: 1–4 or A–D to answer · Enter to continue · H for a hint · Esc to go back',
      '단축키: 1–4 또는 A–D 답 선택 · Enter 다음 · H 힌트 · Esc 뒤로',
    ],
    skipLink: ['Skip to content', '본문으로 건너뛰기'],
  };

  let lang = 'en';
  const t = (key) => {
    const pair = S[key];
    if (!pair) return key;
    return lang === 'ko' ? pair[1] : pair[0];
  };
  const tt = (en, ko) => (lang === 'ko' ? ko : en);
  const pick = (map, key, fallback) => (map[key] ? map[key][lang === 'ko' ? 1 : 0] : fallback);

  const ERA_PERIODS = {
    ancient: ['~ 476', '~ 476년'],
    medieval: ['476 – 1453', '476 ~ 1453년'],
    early_modern: ['1453 – 1800', '1453 ~ 1800년'],
    modern1: ['1800 – 1945', '1800 ~ 1945년'],
    contemporary: ['1945 –', '1945년 ~'],
  };
  const ERA_LABELS = {
    ancient: ['Ancient', '고대'],
    medieval: ['Medieval', '중세'],
    early_modern: ['Early Modern', '근대'],
    modern1: ['Modern', '현대 1'],
    contemporary: ['Contemporary', '현대 2'],
  };
  const CATEGORY_LABELS = {
    person: ['Person Quiz', '인물 퀴즈'],
    year: ['Year Quiz', '연도 퀴즈'],
    event: ['Event Quiz', '사건 퀴즈'],
  };
  const PROGRESS_CATEGORY_LABELS = { person: ['Person', '인물'], year: ['Year', '연도'], event: ['Event', '사건'] };

  const L = {
    clearedOf: (c, total) => tt(`${c} of ${total} cleared`, `${total}개 중 ${c}개 클리어`),
    eraPeriod: (era) => pick(ERA_PERIODS, era, ''),
    eraLabel: (era) => pick(ERA_LABELS, era, era),
    categoryLabel: (cat) => pick(CATEGORY_LABELS, cat, cat),
    progressCategoryLabel: (cat) => pick(PROGRESS_CATEGORY_LABELS, cat, cat),
    stageLabel: (stage, { locked = false, cleared = false } = {}) => {
      const base = lang === 'ko' ? `스테이지 ${stage}` : `Stage ${stage}`;
      if (locked) return `${base} ${tt('(locked)', '(잠김)')}`;
      if (cleared) return `${base} ${tt('(cleared)', '(클리어)')}`;
      return base;
    },
    /** [cleared] decides the tone so it never contradicts the heading. */
    resultMessage: (score, total, cleared) => {
      if (score >= total) return tt('Perfect!', '완벽해요!');
      if (cleared) {
        if (score >= total * 0.8) return tt('Great job!', '아주 잘했어요!');
        return tt('Well done!', '잘했어요!');
      }
      if (score >= total * 0.4) return tt('So close! Keep practicing.', '조금만 더! 계속 연습해 보세요.');
      return tt("Don't give up!", '포기하지 마세요!');
    },
    formatNoticeDate: (dateStr) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const month = parseInt(parts[1], 10) || 0;
      const day = parseInt(parts[2], 10) || 0;
      if (lang === 'ko') return `${parts[0]}년 ${month}월 ${day}일`;
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${month >= 1 && month <= 12 ? names[month - 1] : parts[1]} ${day}, ${parts[0]}`;
    },
    questionOf: (i, n) => tt(`Question ${i} of ${n}`, `${n}문제 중 ${i}번째`),
    incorrectAnnounce: (answer) => tt(`Incorrect. The answer is ${answer}.`, `오답입니다. 정답: ${answer}`),
    starsOf: (n) => tt(`${n} of 3 stars`, `별 3개 중 ${n}개`),
    unreadCount: (n) => tt(`${n} unread`, `읽지 않은 공지 ${n}개`),
    webVersion: (v, q) =>
      tt(
        `Web version · the same ${q.toLocaleString('en-US')} questions as app v${v}`,
        `웹 버전 · 앱 v${v}과 같은 ${q.toLocaleString('en-US')}문항`,
      ),
  };

  // ---------------------------------------------------------------------------
  // Storage (localStorage with an in-memory fallback)
  // ---------------------------------------------------------------------------

  const store = (() => {
    const mem = new Map();
    let ls = null;
    try {
      ls = window.localStorage;
      ls.setItem('__whq_test', '1');
      ls.removeItem('__whq_test');
    } catch (_) {
      ls = null;
    }
    return {
      get(key) {
        try {
          if (ls) return ls.getItem(key);
        } catch (_) {
          /* fall through to memory */
        }
        return mem.has(key) ? mem.get(key) : null;
      },
      set(key, value) {
        const v = String(value);
        mem.set(key, v);
        try {
          if (ls) ls.setItem(key, v);
        } catch (_) {
          /* quota or privacy mode: keep the in-memory copy */
        }
      },
      remove(key) {
        mem.delete(key);
        try {
          if (ls) ls.removeItem(key);
        } catch (_) {
          /* ignore */
        }
      },
      keys() {
        const out = new Set(mem.keys());
        try {
          if (ls) for (let i = 0; i < ls.length; i += 1) out.add(ls.key(i));
        } catch (_) {
          /* ignore */
        }
        return [...out];
      },
    };
  })();

  const unlockKey = (era, cat) => `unlockedStage_${era}_${cat}`;

  function readList(key) {
    try {
      const raw = store.get(key);
      if (!raw) return [];
      const decoded = JSON.parse(raw);
      return Array.isArray(decoded) ? decoded.map(String) : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * The July 2026 web version used the same keys as the app (language,
   * resultCount, unlockedStage_<era>_<type>, readNoticeIds,
   * dismissedNoticePopupIds) and the same 10-stage structure, so progress
   * carries over as is. This normalizes the stored values once: unlock values
   * become integers in the app's range (1..stages+1), junk is dropped.
   */
  function migrateStorage() {
    if (store.get(KEYS.storageVersion) === STORAGE_VERSION) return;
    for (const era of ERAS) {
      for (const cat of CATEGORIES) {
        const key = unlockKey(era, cat);
        const raw = store.get(key);
        if (raw === null) continue;
        const v = parseInt(raw, 10);
        if (Number.isFinite(v) && v >= 1) store.set(key, clamp(v, 1, getTotalStages(era) + 1));
        else store.remove(key);
      }
    }
    const rawCount = store.get(KEYS.resultCount);
    if (rawCount !== null && !(parseInt(rawCount, 10) >= 0)) store.set(KEYS.resultCount, 0);
    const language = store.get(KEYS.language);
    if (language !== null && language !== 'en' && language !== 'ko') store.remove(KEYS.language);
    for (const key of [KEYS.readNotices, KEYS.dismissedPopups]) {
      if (store.get(key) !== null && readList(key) === null) store.remove(key);
    }
    store.set(KEYS.storageVersion, STORAGE_VERSION);
  }

  /** Port of the app's ProgressService. */
  const progress = {
    storedUnlock(era, cat) {
      const v = parseInt(store.get(unlockKey(era, cat)), 10);
      return clamp(Number.isFinite(v) ? v : 1, 1, getTotalStages(era) + 1);
    },
    unlockedStage(era, cat) {
      return clamp(this.storedUnlock(era, cat), 1, getTotalStages(era));
    },
    clearedCount(era, cat) {
      return clamp(this.storedUnlock(era, cat) - 1, 0, getTotalStages(era));
    },
    eraCleared(era) {
      return CATEGORIES.reduce((sum, cat) => sum + this.clearedCount(era, cat), 0);
    },
    eraTotal(era) {
      return getTotalStages(era) * CATEGORIES.length;
    },
    unlockNextIfCleared(era, cat, stage, cleared) {
      if (!cleared) return;
      if (this.storedUnlock(era, cat) > stage) return;
      store.set(unlockKey(era, cat), clamp(stage + 1, 1, getTotalStages(era) + 1));
    },
    incrementResultCount() {
      const next = (parseInt(store.get(KEYS.resultCount), 10) || 0) + 1;
      store.set(KEYS.resultCount, next);
      return next;
    },
    reset() {
      for (const key of store.keys()) if (key && key.startsWith('unlockedStage_')) store.remove(key);
      store.set(KEYS.resultCount, 0);
    },
    readNoticeIds: () => readList(KEYS.readNotices) || [],
    isNoticeUnread(id) {
      return !this.readNoticeIds().includes(id);
    },
    markNoticeRead(id) {
      const ids = this.readNoticeIds();
      if (!id || ids.includes(id)) return;
      ids.push(id);
      store.set(KEYS.readNotices, JSON.stringify(ids));
    },
    dismissedPopupIds: () => readList(KEYS.dismissedPopups) || [],
    markPopupDismissed(id) {
      const ids = this.dismissedPopupIds();
      if (!id || ids.includes(id)) return;
      ids.push(id);
      store.set(KEYS.dismissedPopups, JSON.stringify(ids));
    },
  };

  // ---------------------------------------------------------------------------
  // Data (lazy: only the file for the chosen era/type is downloaded)
  // ---------------------------------------------------------------------------

  const dataCache = new Map();
  const str = (v) => (typeof v === 'string' ? v : '');

  function toQuestion(json) {
    return {
      id: Number(json.id) || 0,
      stage: Number(json.stage) || 1,
      questionEn: str(json.question_en),
      questionKo: str(json.question_ko),
      answerEn: str(json.answer_en),
      answerKo: str(json.answer_ko),
      wrong: [
        [json.wrong1_en, json.wrong1_ko],
        [json.wrong2_en, json.wrong2_ko],
        [json.wrong3_en, json.wrong3_ko],
      ],
      explanationEn: str(json.explanation_en),
      explanationKo: str(json.explanation_ko),
      // `image` is ignored, as in the app: no question images are bundled.
    };
  }

  function loadData(era, cat) {
    const key = `${era}_${cat}`;
    if (!dataCache.has(key)) {
      const promise = fetch(`data/${key}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${key}`);
          return res.json();
        })
        .then((list) => (Array.isArray(list) ? list.filter((q) => q && typeof q === 'object').map(toQuestion) : []))
        .catch((error) => {
          dataCache.delete(key);
          throw error;
        });
      dataCache.set(key, promise);
    }
    return dataCache.get(key);
  }

  const questionText = (q) => (lang === 'ko' && q.questionKo ? q.questionKo : q.questionEn);
  const explanationText = (q) => (lang === 'ko' && q.explanationKo.trim() ? q.explanationKo : q.explanationEn).trim();
  const choiceText = (c) => (lang === 'ko' && c.ko ? c.ko : c.en);

  function buildChoice(en, ko) {
    const safeEn = str(en).trim();
    const safeKo = str(ko).trim() ? str(ko).trim() : safeEn;
    return { en: safeEn, ko: safeKo };
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Port of QuizRepository.generateQuestions: 10 questions from the stage's
   * pool (topped up from other stages only if it is short), each with its
   * curated wrong answers; missing slots are filled from other answers.
   */
  function generateQuestions(data, stage) {
    if (!data.length) return [];
    const selected = shuffle(data.filter((q) => q.stage === stage)).slice(0, QUESTIONS_PER_SESSION);
    if (selected.length < QUESTIONS_PER_SESSION) {
      const used = new Set(selected.map((q) => q.id));
      for (const candidate of shuffle([...data])) {
        if (used.has(candidate.id)) continue;
        selected.push(candidate);
        used.add(candidate.id);
        if (selected.length >= QUESTIONS_PER_SESSION) break;
      }
    }
    while (selected.length < QUESTIONS_PER_SESSION) selected.push(data[Math.floor(Math.random() * data.length)]);

    const fillPool = new Map();
    for (const item of data) {
      if (item.stage === stage) continue;
      const choice = buildChoice(item.answerEn, item.answerKo);
      if (!choice.en) continue;
      const key = `${choice.en}__${choice.ko}`;
      if (!fillPool.has(key)) fillPool.set(key, choice);
    }
    const fillChoices = shuffle([...fillPool.values()]);

    return selected.map((question) => {
      const correct = buildChoice(question.answerEn, question.answerKo);
      const wrong = [];
      const addWrong = (choice) => {
        if (wrong.length >= 3) return;
        if (!choice.en || choice.en === correct.en) return;
        if (wrong.some((c) => c.en === choice.en)) return;
        wrong.push(choice);
      };
      for (const [en, ko] of question.wrong) addWrong(buildChoice(en, ko));
      if (wrong.length < 3 && fillChoices.length) {
        const start = Math.floor(Math.random() * fillChoices.length);
        for (let i = 0; i < fillChoices.length && wrong.length < 3; i += 1) {
          addWrong(fillChoices[(start + i) % fillChoices.length]);
        }
      }
      while (wrong.length < 3) wrong.push({ en: '-', ko: '-' });
      const choices = shuffle([correct, ...wrong]);
      const correctIndex = choices.findIndex((c) => c.en === correct.en);
      return { raw: question, choices, correctIndex: correctIndex < 0 ? 0 : correctIndex };
    });
  }

  // ---------------------------------------------------------------------------
  // Notices and manifest
  // ---------------------------------------------------------------------------

  let notices = [];
  let noticesLoaded = false;
  let popupChecked = false;

  async function loadNotices() {
    try {
      const res = await fetch('data/notices.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      notices = (Array.isArray(list) ? list : [])
        .filter((n) => n && typeof n === 'object')
        .map((n) => ({
          id: str(n.id),
          date: str(n.date),
          titleEn: str(n.title_en),
          titleKo: str(n.title_ko),
          bodyEn: str(n.body_en),
          bodyKo: str(n.body_ko),
        }))
        .filter((n) => n.id)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    } catch (error) {
      console.warn('Failed to load notices:', error);
      notices = [];
    }
    noticesLoaded = true;
  }

  const noticeTitle = (n) => (lang === 'ko' && n.titleKo ? n.titleKo : n.titleEn);
  const noticeBody = (n) => (lang === 'ko' && n.bodyKo ? n.bodyKo : n.bodyEn);
  const unreadNoticeCount = () => notices.filter((n) => progress.isNoticeUnread(n.id)).length;
  const latestUnreadNotice = () => notices.find((n) => progress.isNoticeUnread(n.id)) || null;

  let manifestPromise = null;
  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('data/manifest.json')
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
    }
    return manifestPromise;
  }

  // ---------------------------------------------------------------------------
  // HTML helpers
  // ---------------------------------------------------------------------------

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function icon(name, size = 24, cls = '') {
    const d = (window.ICONS && window.ICONS[name]) || '';
    const vb = window.ICON_VIEWBOX || '0 0 512 512';
    return `<svg class="icon ${cls}" viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  }

  const iconBadge = (name, accent, size) =>
    `<span class="icon-badge" style="--accent:${accent};--size:${size}px" aria-hidden="true">${icon(name, Math.round(size * 0.52))}</span>`;

  function progressBar(value, { height = 6, label = '', cls = '' } = {}) {
    const pct = Math.round(clamp(value, 0, 1) * 1000) / 10;
    const aria = label
      ? `role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"`
      : 'aria-hidden="true"';
    return `<div class="bar ${cls}" style="--h:${height}px" ${aria}><span class="bar-fill" style="--v:${pct}%"></span></div>`;
  }

  const backButton = () =>
    `<button type="button" class="icon-btn" data-action="back" aria-label="${esc(t('goBack'))}" title="${esc(t('goBack'))}" aria-keyshortcuts="Escape">${icon(
      'arrow_back',
      22,
    )}</button>`;

  const screenTitle = (text, subtitle) =>
    `<header class="screen-title"><h1 class="display" tabindex="-1" data-autofocus>${esc(text)}</h1>${
      subtitle ? `<p class="screen-subtitle">${esc(subtitle)}</p>` : ''
    }</header>`;

  const externalLink = (href, label, iconName, cls, trailing = false) =>
    `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${iconName ? icon(iconName, 22, 'lead') : ''}<span class="link-label">${esc(
      label,
    )}</span><span class="visually-hidden"> ${esc(t('newTab'))}</span>${trailing ? icon('open_in_new', 18, 'trail') : ''}</a>`;

  function menuCard({ href, label, subtitle, iconName, accent, cleared, total }) {
    const complete = total > 0 && cleared >= total;
    return `<a class="menu-card card" href="${href}" data-nav>
      ${iconBadge(iconName, accent, 48)}
      <span class="menu-body">
        <span class="menu-top">
          <span class="menu-label">${esc(label)}</span>
          <span class="menu-count${complete ? ' is-complete' : ''}">${complete ? icon('star_rounded', 16) : ''}${cleared}/${total}<span class="visually-hidden"> ${esc(
            t('cleared'),
          )}</span></span>
        </span>
        ${subtitle ? `<span class="menu-sub">${esc(subtitle)}</span>` : ''}
        ${progressBar(total ? cleared / total : 0, { height: 5 })}
      </span>
      ${icon('chevron_right', 24, 'chevron')}
    </a>`;
  }

  function languageToggle() {
    const chip = (code, label) =>
      `<button type="button" class="lang-chip" data-action="lang" data-lang="${code}" lang="${code}" aria-pressed="${lang === code}">${label}</button>`;
    return `<div class="lang-toggle" role="group" aria-label="${esc(t('language'))}">${chip('en', 'English')}${chip('ko', '한국어')}</div>`;
  }

  function siteFooter() {
    return `<footer class="site-footer">
      <a class="play-link" href="${esc(LINKS.play)}" target="_blank" rel="noopener">
        ${icon('phone', 24)}
        <span class="play-text"><span class="play-small">${esc(t('alsoOnAndroid'))}</span><span class="play-big">${esc(
          t('getOnPlay'),
        )}</span></span><span class="visually-hidden"> ${esc(t('newTab'))}</span>
      </a>
      <nav class="footer-links" aria-label="${esc(t('links'))}">
        ${externalLink(LINKS.studio, t('aboutGame'), '', 'footer-link')}
        <span class="sep" aria-hidden="true">·</span>
        ${externalLink(LINKS.privacy, t('privacyPolicy'), '', 'footer-link')}
      </nav>
    </footer>`;
  }

  // ---------------------------------------------------------------------------
  // Routing (hash based, so it works under any path)
  //   (no hash)                  home
  //   #/era/<era>                quiz type selection
  //   #/era/<era>/<type>         stages
  //   #/play/<era>/<type>/<n>    quiz
  //   #/result/<era>/<type>/<n>  result (only right after a quiz)
  //   #/settings  #/notices  #/notices/<id>
  // Each history entry stores its depth in the app's own stack so "back" can
  // use the browser history (and the browser back button works the same).
  // ---------------------------------------------------------------------------

  const view = document.getElementById('view');
  const live = document.getElementById('live');

  function parseRoute(hash = location.hash) {
    let parts;
    try {
      parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    } catch (_) {
      return { name: 'unknown' };
    }
    const [head, a, b, c, extra] = parts;
    const validEra = ERAS.includes(a);
    const validCat = CATEGORIES.includes(b);
    const stage = Number(c);
    if (!head) return { name: 'home' };
    if (head === 'era' && validEra && !b) return { name: 'category', era: a };
    if (head === 'era' && validEra && validCat && !c) return { name: 'stages', era: a, cat: b };
    if ((head === 'play' || head === 'result') && validEra && validCat && !extra) {
      if (Number.isInteger(stage) && stage >= 1 && stage <= getTotalStages(a)) {
        return { name: head === 'play' ? 'quiz' : 'result', era: a, cat: b, stage };
      }
    }
    if (head === 'settings' && !a) return { name: 'settings' };
    if (head === 'notices' && !a) return { name: 'notices' };
    if (head === 'notices' && a && !b) return { name: 'notice', id: a };
    return { name: 'unknown' };
  }

  const homeUrl = () => location.pathname + location.search;
  const hashFor = {
    category: (era) => `#/era/${era}`,
    stages: (era, cat) => `#/era/${era}/${cat}`,
    quiz: (era, cat, stage) => `#/play/${era}/${cat}/${stage}`,
    result: (era, cat, stage) => `#/result/${era}/${cat}/${stage}`,
  };

  function parentHash(route) {
    switch (route.name) {
      case 'stages':
        return hashFor.category(route.era);
      case 'quiz':
      case 'result':
        return hashFor.stages(route.era, route.cat);
      case 'notice':
        return '#/notices';
      default:
        return '';
    }
  }

  const currentDepth = () => (history.state && typeof history.state.depth === 'number' ? history.state.depth : 0);

  let leavingQuiz = false;
  let pendingHome = false;

  function navigate(hash, { replace = false, animate = true } = {}) {
    const depth = replace ? currentDepth() : currentDepth() + 1;
    history[replace ? 'replaceState' : 'pushState']({ depth }, '', hash || homeUrl());
    render({ animate });
  }

  function goBack() {
    if (currentDepth() > 0) history.back();
    else navigate(parentHash(parseRoute()), { replace: true });
  }

  /** Like the app's popUntil(isFirst). */
  function goHome() {
    const depth = currentDepth();
    if (depth > 0) {
      pendingHome = true;
      history.go(-depth);
    } else {
      navigate('', { replace: true });
    }
  }

  window.addEventListener('popstate', () => {
    const route = parseRoute();
    // Browser back/forward out of a quiz in progress: stay and ask first,
    // like the app's PopScope.
    if (quizHasProgress() && !leavingQuiz && !(route.name === 'quiz' && quiz.key === quizKey(route))) {
      history.pushState({ depth: currentDepth() + 1 }, '', hashFor.quiz(quiz.era, quiz.cat, quiz.stage));
      if (!dialogStack.length) confirmQuit();
      return;
    }
    closeAllDialogs();
    if (pendingHome) {
      pendingHome = false;
      if (route.name !== 'home') history.replaceState({ depth: 0 }, '', homeUrl());
    }
    render();
  });

  window.addEventListener('beforeunload', (event) => {
    if (quizHasProgress()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  // Older builds of the Android app hosted this page in a WebView and called
  // this on the hardware back button. Kept so such builds still navigate.
  window.handleFlutterBack = () => {
    if (dialogStack.length) {
      closeTopDialog();
      return true;
    }
    if (parseRoute().name === 'home') return false;
    handleBackAction();
    return true;
  };

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  let advanceTimer = null;
  function clearAdvanceTimer() {
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = null;
  }
  function scheduleAdvance() {
    clearAdvanceTimer();
    advanceTimer = setTimeout(nextQuestion, AUTO_ADVANCE_MS);
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setDocumentMeta(title) {
    document.documentElement.lang = lang;
    document.title = title ? `${title} – ${t('appTitle')}` : t('docTitleHome');
    const skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = t('skipLink');
  }

  function redirect(hash, options) {
    history.replaceState({ depth: currentDepth() }, '', hash || homeUrl());
    render(options);
  }

  function render({ animate = true, focus = true } = {}) {
    clearAdvanceTimer();
    leavingQuiz = false;
    const route = parseRoute();
    if (route.name !== 'quiz') quiz = null;

    let html = '';
    let title = '';
    switch (route.name) {
      case 'home':
        html = renderHome();
        break;
      case 'category':
        html = renderCategory(route);
        title = L.eraLabel(route.era);
        break;
      case 'stages':
        html = renderStages(route);
        title = `${L.categoryLabel(route.cat)} · ${L.eraLabel(route.era)}`;
        break;
      case 'quiz':
        if (route.stage > progress.unlockedStage(route.era, route.cat)) {
          redirect(hashFor.stages(route.era, route.cat), { animate, focus });
          return;
        }
        html = renderQuiz(route);
        title = `${L.stageLabel(route.stage)} · ${L.categoryLabel(route.cat)}`;
        break;
      case 'result':
        if (!lastResult || lastResult.key !== quizKey(route)) {
          redirect(hashFor.stages(route.era, route.cat), { animate, focus });
          return;
        }
        html = renderResult();
        title = lastResult.cleared ? t('stageClear') : t('tryAgain');
        break;
      case 'settings':
        html = renderSettings();
        title = t('settingsTitle');
        break;
      case 'notices':
        html = renderNoticeList();
        title = t('noticesTitle');
        break;
      case 'notice':
        html = renderNoticeDetail(route);
        title = t('noticesTitle');
        break;
      default:
        redirect('', { animate, focus });
        return;
    }

    view.innerHTML = html;
    view.dataset.screen = route.name;
    const page = view.firstElementChild;
    if (page && animate && !reducedMotion()) page.classList.add('enter');
    setDocumentMeta(title);
    if (focus) {
      window.scrollTo(0, 0);
      const target = view.querySelector('[data-autofocus]');
      if (target) target.focus({ preventScroll: true });
    }
    afterRender(route);
  }

  function afterRender(route) {
    switch (route.name) {
      case 'home':
        maybeShowNoticePopup();
        break;
      case 'stages':
        loadData(route.era, route.cat).catch(() => {}); // warm the cache before a stage is picked
        break;
      case 'quiz':
        startQuizIfNeeded(route);
        if (quiz && quiz.answered && !quiz.awaitingContinue) scheduleAdvance();
        break;
      case 'result':
        animateResult();
        break;
      case 'notice':
        if (notices.some((n) => n.id === route.id)) progress.markNoticeRead(route.id);
        break;
      case 'settings':
        loadManifest().then((m) => {
          const el = view.querySelector('[data-version]');
          if (el && m && m.appVersion) el.textContent = L.webVersion(String(m.appVersion).split('+')[0], Number(m.totalQuestions) || 0);
        });
        break;
      default:
        break;
    }
  }

  // ---- Home ------------------------------------------------------------------

  function noticeButton() {
    const unread = unreadNoticeCount();
    const label = unread > 0 ? `${t('openNotices')} (${L.unreadCount(unread)})` : t('openNotices');
    return `<a class="icon-btn" href="#/notices" data-nav data-notice-btn aria-label="${esc(label)}" title="${esc(t('noticesTitle'))}">${icon(
      'notifications',
      22,
    )}${unread > 0 ? '<span class="badge-dot" aria-hidden="true"></span>' : ''}</a>`;
  }

  function renderHome() {
    let allCleared = 0;
    let allTotal = 0;
    const cards = ERAS.map((era) => {
      const cleared = progress.eraCleared(era);
      const total = progress.eraTotal(era);
      allCleared += cleared;
      allTotal += total;
      return `<li>${menuCard({
        href: hashFor.category(era),
        label: L.eraLabel(era),
        subtitle: L.eraPeriod(era),
        iconName: era,
        accent: ERA_ACCENTS[era],
        cleared,
        total,
      })}</li>`;
    }).join('');

    return `<div class="page page--home">
      <div class="topbar">
        ${noticeButton()}
        <span class="spacer"></span>
        <a class="icon-btn" href="#/settings" data-nav aria-label="${esc(t('openSettings'))}" title="${esc(t('settingsTitle'))}">${icon(
          'settings',
          22,
        )}</a>
      </div>
      <div class="home-grid">
        <section class="home-hero">
          <img class="emblem" src="assets/emblem.svg" width="112" height="112" alt="" />
          <h1 class="display home-title" tabindex="-1" data-autofocus>${esc(t('appTitle'))}</h1>
          <div class="overall">
            <div class="overall-row">
              ${icon('trophy', 18, 'gold')}
              <span class="overall-label">${esc(t('overallProgress'))}</span>
              <span class="overall-count"><strong>${allCleared}</strong> / ${allTotal}</span>
            </div>
            ${progressBar(allTotal ? allCleared / allTotal : 0, { height: 7, label: `${t('overallProgress')}: ${allCleared} / ${allTotal}` })}
          </div>
        </section>
        <section class="home-eras" aria-labelledby="choose-era">
          <h2 class="section-label" id="choose-era">${esc(t('chooseEra'))}</h2>
          <ul class="menu-list" role="list">${cards}</ul>
        </section>
        <div class="home-lang">${languageToggle()}</div>
        <div class="home-footer">${siteFooter()}</div>
      </div>
    </div>`;
  }

  // ---- Category (quiz type) ----------------------------------------------------

  function renderCategory({ era }) {
    const accent = ERA_ACCENTS[era];
    const total = getTotalStages(era);
    const cards = CATEGORIES.map(
      (cat) =>
        `<li>${menuCard({
          href: hashFor.stages(era, cat),
          label: L.categoryLabel(cat),
          iconName: cat,
          accent,
          cleared: progress.clearedCount(era, cat),
          total,
        })}</li>`,
    ).join('');
    return `<div class="page page--category">
      <div class="topbar">${backButton()}</div>
      <div class="era-head">
        ${iconBadge(era, accent, 64)}
        ${screenTitle(L.eraLabel(era), L.eraPeriod(era))}
      </div>
      <ul class="menu-list menu-list--categories" role="list">${cards}</ul>
    </div>`;
  }

  // ---- Stages ------------------------------------------------------------------

  function renderStages({ era, cat }) {
    const unlocked = progress.unlockedStage(era, cat);
    const cleared = progress.clearedCount(era, cat);
    const total = getTotalStages(era);
    const accent = ERA_ACCENTS[era];
    const tiles = [];
    for (let stage = 1; stage <= total; stage += 1) {
      const isUnlocked = stage <= unlocked;
      const isCleared = stage <= cleared;
      const label = L.stageLabel(stage, { locked: !isUnlocked, cleared: isCleared });
      if (!isUnlocked) {
        tiles.push(
          `<li><button type="button" class="stage-tile is-locked" disabled aria-label="${esc(label)}"><span class="stage-num">${stage}</span>${icon(
            'lock',
            14,
          )}</button></li>`,
        );
      } else {
        const state = isCleared ? 'is-cleared' : 'is-current';
        const mark = isCleared ? icon('star', 16) : icon('play', 18);
        tiles.push(
          `<li><a class="stage-tile ${state}" href="${hashFor.quiz(era, cat, stage)}" data-nav aria-label="${esc(
            label,
          )}"><span class="stage-num">${stage}</span>${mark}</a></li>`,
        );
      }
    }
    return `<div class="page page--stages">
      <div class="topbar">${backButton()}</div>
      ${screenTitle(L.categoryLabel(cat), L.eraLabel(era))}
      <div class="stages-body">
        <div class="card stage-summary">
          ${iconBadge(cat, accent, 40)}
          <div class="stage-summary-body">
            <p class="stage-summary-text">${esc(L.clearedOf(cleared, total))}</p>
            ${progressBar(total ? cleared / total : 0, { label: L.clearedOf(cleared, total) })}
          </div>
        </div>
        <ol class="stage-grid" role="list">${tiles.join('')}</ol>
        <p class="difficulty-note">${icon('trending_up', 16)}<span>${esc(t('difficulty'))}</span></p>
      </div>
    </div>`;
  }

  // ---- Quiz --------------------------------------------------------------------

  /** The running session; null when no quiz is open. */
  let quiz = null;
  /** The finished session shown on the result screen. */
  let lastResult = null;

  const quizKey = (r) => `${r.era}/${r.cat}/${r.stage}`;
  /** Leaving before answering anything loses nothing, so no prompt then. */
  const quizHasProgress = () => !!quiz && !!quiz.items && (quiz.current > 0 || quiz.answered);

  function newSession(route) {
    return {
      key: quizKey(route),
      era: route.era,
      cat: route.cat,
      stage: route.stage,
      items: null,
      loading: false,
      error: false,
      current: 0,
      score: 0,
      answered: false,
      awaitingContinue: false,
      selected: null,
      hintUsed: false,
      hintText: null,
      hidden: new Set(),
    };
  }

  function renderQuiz(route) {
    if (!quiz || quiz.key !== quizKey(route)) quiz = newSession(route);
    return `<div class="page page--quiz">${quizInner()}</div>`;
  }

  function quizInner() {
    const meta = `${L.eraLabel(quiz.era)} · ${L.categoryLabel(quiz.cat)} · ${L.stageLabel(quiz.stage)}`;
    if (!quiz.items) {
      const body = quiz.error
        ? `<div class="card quiz-status" role="alert"><p>${esc(t('loadDataError'))}</p>
             <button type="button" class="btn btn-primary" data-action="reload-quiz">${esc(t('retry'))}${icon('refresh', 20)}</button></div>`
        : `<div class="quiz-status" aria-busy="true"><span class="spinner" aria-hidden="true"></span><p>${esc(t('loading'))}</p></div>`;
      return `<div class="topbar">${backButton()}</div>
        <p class="quiz-meta">${esc(meta)}</p>
        <h1 class="visually-hidden" tabindex="-1" data-autofocus>${esc(meta)}</h1>
        ${body}`;
    }

    const item = quiz.items[quiz.current];
    const total = quiz.items.length;
    const value = clamp((quiz.current + (quiz.answered ? 1 : 0)) / total, 0, 1);
    const isLast = quiz.current + 1 >= total;
    const showHint = !quiz.answered && !quiz.hintUsed;
    const answers = visibleChoices()
      .map((choiceIndex, n) => answerButton(item, choiceIndex, n))
      .join('');

    return `<div class="topbar">
        ${backButton()}
        <span class="spacer"></span>
        <button type="button" class="hint-btn" data-action="hint" aria-keyshortcuts="H"${showHint ? '' : ' hidden'}>${icon(
          'lightbulb',
          18,
        )}<span>${esc(t('hintShort'))}</span></button>
      </div>
      <div class="quiz-layout">
        <div class="quiz-head">
          <div class="quiz-meta-row">
            <p class="quiz-meta">${esc(meta)}</p>
            <p class="quiz-count"><span aria-hidden="true">${quiz.current + 1} / ${total}</span><span class="visually-hidden">${esc(
              L.questionOf(quiz.current + 1, total),
            )}</span></p>
          </div>
          ${progressBar(value, { height: 8, cls: 'quiz-bar' })}
          <p class="pill score-pill">${icon('star_rounded', 15)}<span data-score>${esc(t('score'))}: ${quiz.score}</span></p>
        </div>
        <section class="card question-card" aria-labelledby="question-text">
          <h1 class="question-text" id="question-text" tabindex="-1" data-autofocus>${esc(questionText(item.raw))}</h1>
          ${quiz.hintText ? `<p class="pill hint-pill">${icon('lightbulb', 15)}<span>${esc(quiz.hintText)}</span></p>` : ''}
        </section>
        <div class="quiz-answers">
          <div class="answers" role="group" aria-labelledby="question-text">${answers}</div>
          <div class="after-answer" data-after>${quiz.answered ? afterAnswerHtml(item, isLast) : ''}</div>
          <p class="kbd-hint">${icon('keyboard', 16)}<span>${esc(t('keyboardHint'))}</span></p>
        </div>
      </div>`;
  }

  function visibleChoices() {
    const item = quiz.items[quiz.current];
    return item.choices.map((_, i) => i).filter((i) => !quiz.hidden.has(i));
  }

  function answerState(item, choiceIndex) {
    if (!quiz.answered) return '';
    if (choiceIndex === item.correctIndex) return 'is-correct';
    if (choiceIndex === quiz.selected) return 'is-incorrect';
    return 'is-dimmed';
  }

  const srStateText = (state) =>
    state === 'is-correct' ? `, ${t('correctAnswer')}` : state === 'is-incorrect' ? `, ${t('yourAnswerWrong')}` : '';

  function answerButton(item, choiceIndex, n) {
    const letter = String.fromCharCode(65 + n);
    const state = answerState(item, choiceIndex);
    const sr = srStateText(state);
    return `<button type="button" class="answer ${state}" data-action="answer" data-index="${choiceIndex}" aria-keyshortcuts="${n + 1} ${letter}"${
      quiz.answered ? ' aria-disabled="true"' : ''
    }>
      <span class="answer-badge" aria-hidden="true"><span class="answer-letter">${letter}</span>${icon('check', 20, 'mark-correct')}${icon(
        'close',
        20,
        'mark-incorrect',
      )}</span>
      <span class="answer-label">${esc(choiceText(item.choices[choiceIndex]))}</span>${sr ? `<span class="visually-hidden">${esc(sr)}</span>` : ''}
    </button>`;
  }

  function afterAnswerHtml(item, isLast) {
    const explanation = explanationText(item.raw);
    if (!explanation) return '';
    return `<section class="explanation" aria-labelledby="explanation-title">
        <h2 class="explanation-title" id="explanation-title">${icon('menu_book', 18)}<span>${esc(t('explanationTitle'))}</span></h2>
        <p class="explanation-text">${esc(explanation)}</p>
      </section>
      ${
        quiz.awaitingContinue
          ? `<button type="button" class="btn btn-primary continue-btn" data-action="continue">${esc(
              isLast ? t('seeResults') : t('continueLabel'),
            )}${icon(isLast ? 'flag' : 'arrow_forward', 20)}</button>`
          : ''
      }`;
  }

  async function startQuizIfNeeded(route) {
    if (!quiz || quiz.items || quiz.loading) return;
    const session = quiz;
    session.loading = true;
    session.error = false;
    try {
      const data = await loadData(route.era, route.cat);
      if (quiz !== session) return;
      const items = generateQuestions(data, route.stage);
      if (!items.length) {
        showToast(t('noQuestions'));
        quiz = null;
        redirect(hashFor.stages(route.era, route.cat));
        return;
      }
      session.items = items;
    } catch (error) {
      console.warn(error);
      if (quiz !== session) return;
      session.error = true;
      showToast(t('loadDataError'));
    } finally {
      session.loading = false;
    }
    if (quiz === session) rerenderQuiz({ focus: true });
  }

  function rerenderQuiz({ focus = true } = {}) {
    const page = view.querySelector('.page--quiz');
    if (!page) return;
    page.innerHTML = quizInner();
    if (focus) {
      window.scrollTo(0, 0);
      const target = page.querySelector('[data-autofocus]');
      if (target) target.focus({ preventScroll: true });
    }
  }

  function selectAnswer(choiceIndex) {
    if (!quiz || !quiz.items || quiz.answered) return;
    const item = quiz.items[quiz.current];
    if (!item.choices[choiceIndex] || quiz.hidden.has(choiceIndex)) return;
    const correct = choiceIndex === item.correctIndex;
    quiz.answered = true;
    quiz.selected = choiceIndex;
    if (correct) quiz.score += 1;
    quiz.awaitingContinue = !!explanationText(item.raw);

    if (navigator.vibrate && window.matchMedia('(pointer: coarse)').matches) {
      try {
        navigator.vibrate(correct ? 15 : [20, 40, 20]);
      } catch (_) {
        /* ignore */
      }
    }

    // Update in place so colours and the shake animate, and nothing above
    // the explanation moves.
    const page = view.querySelector('.page--quiz');
    const total = quiz.items.length;
    const isLast = quiz.current + 1 >= total;
    page.querySelectorAll('.answer').forEach((btn) => {
      const state = answerState(item, Number(btn.dataset.index));
      btn.classList.add(state);
      btn.setAttribute('aria-disabled', 'true');
      const sr = srStateText(state);
      if (sr) {
        const span = document.createElement('span');
        span.className = 'visually-hidden';
        span.textContent = sr;
        btn.appendChild(span);
      }
      if (state === 'is-incorrect' && !reducedMotion()) btn.classList.add('shake');
    });
    const hintBtn = page.querySelector('.hint-btn');
    if (hintBtn) hintBtn.hidden = true;
    page.querySelector('[data-score]').textContent = `${t('score')}: ${quiz.score}`;
    page.querySelector('.quiz-bar .bar-fill').style.setProperty('--v', `${((quiz.current + 1) / total) * 100}%`);
    const after = page.querySelector('[data-after]');
    after.innerHTML = afterAnswerHtml(item, isLast);

    announce(correct ? t('correctAnnounce') : L.incorrectAnnounce(choiceText(item.choices[item.correctIndex])));

    if (quiz.awaitingContinue) {
      const btn = after.querySelector('.continue-btn');
      if (btn) {
        btn.focus({ preventScroll: true });
        // Like the app's ensureVisible: bring the button into view.
        btn.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    } else {
      scheduleAdvance();
    }
  }

  function trySkipAdvance() {
    if (!quiz || !quiz.answered || quiz.awaitingContinue) return;
    nextQuestion();
  }

  function onContinue() {
    if (!quiz || !quiz.awaitingContinue) return;
    quiz.awaitingContinue = false;
    nextQuestion();
  }

  function nextQuestion() {
    clearAdvanceTimer();
    if (!quiz || !quiz.items) return;
    if (quiz.current + 1 >= quiz.items.length) {
      finishQuiz();
      return;
    }
    Object.assign(quiz, {
      current: quiz.current + 1,
      answered: false,
      awaitingContinue: false,
      hintUsed: false,
      selected: null,
      hintText: null,
      hidden: new Set(),
    });
    rerenderQuiz({ focus: true });
  }

  function finishQuiz() {
    const { key, era, cat, stage, score } = quiz;
    const total = quiz.items.length;
    const cleared = score >= CLEAR_SCORE_THRESHOLD;
    // Same bookkeeping as AppState.recordStageResult.
    progress.unlockNextIfCleared(era, cat, stage, cleared);
    progress.incrementResultCount();
    lastResult = { key, era, cat, stage, score, total, cleared };
    quiz = null;
    navigate(hashFor.result(era, cat, stage), { replace: true });
  }

  /**
   * The app gates hints behind a rewarded ad. On the web they are free, still
   * one per question: one wrong choice is removed and the first letter shown.
   */
  function useHint() {
    if (!quiz || !quiz.items || quiz.answered || quiz.hintUsed) return;
    const item = quiz.items[quiz.current];
    const wrong = item.choices.map((_, i) => i).filter((i) => i !== item.correctIndex && !quiz.hidden.has(i));
    if (wrong.length) quiz.hidden.add(wrong[Math.floor(Math.random() * wrong.length)]);
    const answer = choiceText(item.choices[item.correctIndex]).trim();
    quiz.hintUsed = true;
    quiz.hintText = `${t('hintPrefix')}: ${answer ? firstGrapheme(answer) : '?'}...`;
    rerenderQuiz({ focus: false });
    const firstAnswer = view.querySelector('.answer');
    if (firstAnswer) firstAnswer.focus({ preventScroll: true });
    announce(quiz.hintText);
  }

  function firstGrapheme(text) {
    if (window.Intl && Intl.Segmenter) {
      const first = new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(text)[Symbol.iterator]().next();
      if (!first.done) return first.value.segment;
    }
    return Array.from(text)[0];
  }

  async function confirmQuit() {
    // A pending auto-advance would move on behind the dialog.
    clearAdvanceTimer();
    const ok = await confirmDialog({
      title: t('quitQuizTitle'),
      message: t('quitQuizMessage'),
      cancel: t('cancel'),
      confirm: t('quit'),
    });
    if (ok) {
      leavingQuiz = true;
      quiz = null;
      goBack();
    } else if (quiz && quiz.answered && !quiz.awaitingContinue) {
      scheduleAdvance();
    }
  }

  // ---- Result ------------------------------------------------------------------

  const RING_R = 79;
  const RING_C = 2 * Math.PI * RING_R;

  /** Same thresholds as ResultScreen: perfect = 3, >= 80% = 2, cleared = 1. */
  function starsFor(score, total, cleared) {
    if (!cleared) return 0;
    if (score >= total) return 3;
    return total && score / total >= 0.8 ? 2 : 1;
  }

  function renderResult() {
    const r = lastResult;
    const ratio = r.total ? r.score / r.total : 0;
    const stars = starsFor(r.score, r.total, r.cleared);
    const showNext = r.cleared && r.stage < getTotalStages(r.era);
    const meta = `${L.eraLabel(r.era)} · ${L.categoryLabel(r.cat)} · ${L.stageLabel(r.stage)}`;
    const starIcons = [0, 1, 2]
      .map((i) => icon(i < stars ? 'star_rounded' : 'star_outline', i === 1 ? 40 : 32, i < stars ? 'star-on' : 'star-off'))
      .join('');
    const sparkles = r.cleared && !reducedMotion() ? sparkleHtml() : '';

    // Exactly one filled button: Next Stage when there is one, otherwise Retry.
    const primary = showNext
      ? `<button type="button" class="btn btn-primary" data-action="next-stage">${esc(t('nextStage'))}${icon('arrow_forward', 20)}</button>
         <button type="button" class="btn btn-secondary" data-action="retry">${esc(t('retry'))}</button>`
      : `<button type="button" class="btn btn-primary" data-action="retry">${esc(t('retry'))}${icon('refresh', 20)}</button>`;

    const fill =
      ratio > 0
        ? `<circle class="ring-fill" cx="84" cy="84" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="${RING_C.toFixed(
            2,
          )}" data-target="${(RING_C * (1 - ratio)).toFixed(2)}" />`
        : '';

    return `<div class="page page--result">
      <div class="result">
        <p class="result-meta">${esc(meta)}</p>
        <div class="ring-wrap${r.cleared ? ' is-cleared' : ''}">
          ${sparkles}
          <svg class="ring" viewBox="0 0 168 168" width="168" height="168" aria-hidden="true">
            <circle class="ring-track" cx="84" cy="84" r="${RING_R}" />${fill}
          </svg>
          <p class="ring-score"><span class="ring-big">${r.score}</span><span class="ring-small"> / ${r.total}</span></p>
        </div>
        <p class="stars" role="img" aria-label="${esc(L.starsOf(stars))}">${starIcons}</p>
        <h1 class="display result-title${r.cleared ? ' is-cleared' : ''}" tabindex="-1" data-autofocus>${esc(
          r.cleared ? t('stageClear') : t('tryAgain'),
        )}</h1>
        <p class="result-message">${esc(L.resultMessage(r.score, r.total, r.cleared))}</p>
        <div class="result-actions">
          ${primary}
          <div class="result-row">
            <button type="button" class="btn btn-secondary" data-action="stage-select">${esc(t('stageSelect'))}</button>
            <button type="button" class="btn btn-secondary" data-action="home">${esc(t('home'))}</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function sparkleHtml() {
    const parts = [];
    const count = 14;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const end = 72 + 34 + (i % 4) * 9;
      const at = (d) => `${(Math.cos(angle) * d).toFixed(1)}px, ${(Math.sin(angle) * d * 0.85).toFixed(1)}px`;
      parts.push(
        `<span class="sparkle ${i % 2 === 0 ? 'gold' : 'cream'}" style="--from: translate(${at(72)}); --to: translate(${at(end)}); --s: ${
          (3 + (i % 3)) * 2
        }px"></span>`,
      );
    }
    return `<span class="sparkles" aria-hidden="true">${parts.join('')}</span>`;
  }

  function animateResult() {
    const fill = view.querySelector('.ring-fill');
    if (fill) {
      const target = fill.dataset.target;
      if (reducedMotion()) fill.style.strokeDashoffset = target;
      else
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            fill.style.strokeDashoffset = target;
          }),
        );
    }
    const r = lastResult;
    announce(`${r.score} / ${r.total}. ${L.starsOf(starsFor(r.score, r.total, r.cleared))}. ${L.resultMessage(r.score, r.total, r.cleared)}`);
  }

  function retryOrNext(stage) {
    if (!lastResult) return;
    const { era, cat } = lastResult;
    navigate(hashFor.quiz(era, cat, stage), { replace: true });
  }

  // ---- Settings ----------------------------------------------------------------

  function renderSettings() {
    const eras = ERAS.map((era) => {
      const total = getTotalStages(era);
      const rows = CATEGORIES.map((cat) => {
        const cleared = progress.clearedCount(era, cat);
        return `<div class="progress-row">
            <span class="progress-row-label">${esc(L.progressCategoryLabel(cat))}</span>
            ${progressBar(total ? cleared / total : 0, {
              height: 8,
              cls: 'bar-strong',
              label: `${L.eraLabel(era)} · ${L.progressCategoryLabel(cat)}: ${cleared}/${total}`,
            })}
            <span class="progress-row-count" aria-hidden="true">${cleared}/${total}</span>
          </div>`;
      }).join('');
      return `<div class="progress-era">
          <h3 class="progress-era-title" style="--accent:${ERA_ACCENTS[era]}">${icon(era, 16, 'accent')}<span>${esc(L.eraLabel(era))}</span></h3>
          ${rows}
        </div>`;
    }).join('');

    return `<div class="page page--settings">
      <div class="topbar">${backButton()}</div>
      ${screenTitle(t('settingsTitle'))}
      <div class="settings-grid">
        <section class="settings-col" aria-labelledby="progress-title">
          <h2 class="section-label" id="progress-title">${esc(t('progressTitle'))}</h2>
          <div class="card progress-card">${eras}</div>
        </section>
        <section class="settings-col">
          <h2 class="section-label">${esc(t('language'))}</h2>
          <div class="settings-lang">${languageToggle()}</div>
          <h2 class="section-label">${esc(t('appSection'))}</h2>
          <ul class="card list-card" role="list">
            <li>${externalLink(LINKS.play, t('getOnPlay'), 'phone', 'list-item', true)}</li>
            <li>${externalLink(LINKS.studio, t('aboutGame'), 'info', 'list-item', true)}</li>
            <li>${externalLink(LINKS.privacy, t('privacyPolicy'), 'privacy', 'list-item', true)}</li>
            <li><button type="button" class="list-item is-danger" data-action="reset">${icon('reset', 22, 'lead')}<span class="link-label">${esc(
              t('resetProgress'),
            )}</span></button></li>
          </ul>
          <p class="version" data-version></p>
        </section>
      </div>
    </div>`;
  }

  async function resetProgress() {
    const ok = await confirmDialog({
      title: t('confirmResetTitle'),
      message: t('confirmResetBody'),
      cancel: t('cancel'),
      confirm: t('confirm'),
    });
    if (!ok) return;
    progress.reset();
    render({ animate: false, focus: false });
    showToast(t('resetSuccess'));
  }

  // ---- Notices -----------------------------------------------------------------

  const spinnerBlock = () => `<div class="quiz-status" aria-busy="true"><span class="spinner" aria-hidden="true"></span></div>`;

  function renderNoticeList() {
    let body;
    if (!noticesLoaded) body = spinnerBlock();
    else if (!notices.length) body = `<p class="empty">${esc(t('noticeEmpty'))}</p>`;
    else {
      body = `<ul class="notice-list" role="list">${notices
        .map((n) => {
          const unread = progress.isNoticeUnread(n.id);
          return `<li><a class="card notice-card${unread ? ' is-unread' : ''}" href="#/notices/${encodeURIComponent(n.id)}" data-nav>
              <span class="notice-title">${esc(noticeTitle(n))}</span>
              <span class="notice-meta"><time datetime="${esc(n.date)}">${esc(L.formatNoticeDate(n.date))}</time>${
                unread ? `<span class="dot" aria-hidden="true"></span><span class="visually-hidden">, ${esc(t('unread'))}</span>` : ''
              }</span>
            </a></li>`;
        })
        .join('')}</ul>`;
    }
    return `<div class="page page--notices">
      <div class="topbar">${backButton()}</div>
      ${screenTitle(t('noticesTitle'))}
      ${body}
    </div>`;
  }

  function renderNoticeDetail({ id }) {
    const notice = notices.find((n) => n.id === id);
    let body;
    if (!noticesLoaded) body = spinnerBlock();
    else if (!notice) {
      body = `<h1 class="empty" tabindex="-1" data-autofocus>${esc(t('noticeNotFound'))}</h1>`;
    } else {
      body = `<article class="notice-article">
          <header class="screen-title"><h1 class="display notice-heading" tabindex="-1" data-autofocus>${esc(noticeTitle(notice))}</h1></header>
          <p class="notice-date"><time datetime="${esc(notice.date)}">${esc(L.formatNoticeDate(notice.date))}</time></p>
          <div class="notice-body">${esc(noticeBody(notice))}</div>
        </article>`;
    }
    return `<div class="page page--notice">
      <div class="topbar">${backButton()}</div>
      ${body}
    </div>`;
  }

  function maybeShowNoticePopup() {
    if (popupChecked || !noticesLoaded) return;
    popupChecked = true;
    const notice = latestUnreadNotice();
    if (!notice || progress.dismissedPopupIds().includes(notice.id)) return;
    noticeDialog(notice).then((readMore) => {
      progress.markPopupDismissed(notice.id);
      if (readMore) navigate(`#/notices/${encodeURIComponent(notice.id)}`);
    });
  }

  // ---------------------------------------------------------------------------
  // Dialogs, toast, live region
  // ---------------------------------------------------------------------------

  const dialogStack = [];

  function openDialog(html, { dismissible, describedBy }) {
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'dialog';
      dialog.setAttribute('aria-labelledby', 'dlg-title');
      if (describedBy) dialog.setAttribute('aria-describedby', describedBy);
      dialog.innerHTML = html;
      const opener = document.activeElement;
      let result = false;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        const i = dialogStack.indexOf(dialog);
        if (i >= 0) dialogStack.splice(i, 1);
        if (dialog.open) dialog.close();
        dialog.remove();
        if (opener && opener !== document.body && document.contains(opener)) opener.focus({ preventScroll: true });
        resolve(result);
      };
      // Clean up synchronously rather than waiting for the 'close' event,
      // which Chrome does not always fire when Esc closed the dialog.
      const close = (value) => {
        result = value;
        finish();
      };
      dialog.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-result]');
        if (btn) close(btn.dataset.result === 'true');
        else if (dismissible && event.target === dialog) {
          // A click on the dialog element itself is either its padding or the
          // backdrop; only the backdrop (outside the box) dismisses.
          const box = dialog.getBoundingClientRect();
          const inside =
            event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
          if (!inside) close(false);
        }
      });
      // Esc means "cancel" for every dialog, including the confirm dialogs.
      dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        close(false);
      });
      dialog.addEventListener('close', finish);
      dialog.closeWith = close;
      document.body.appendChild(dialog);
      dialogStack.push(dialog);
      dialog.showModal();
      const initial = dialog.querySelector('[data-initial]');
      if (initial) initial.focus();
    });
  }

  function closeTopDialog() {
    const top = dialogStack[dialogStack.length - 1];
    if (top) top.closeWith(false);
  }

  function closeAllDialogs() {
    [...dialogStack].reverse().forEach((d) => d.closeWith(false));
  }

  function confirmDialog({ title, message, cancel, confirm }) {
    return openDialog(
      `<h2 class="dialog-title" id="dlg-title">${esc(title)}</h2>
       <p class="dialog-text" id="dlg-text">${esc(message)}</p>
       <div class="dialog-actions">
         <button type="button" class="btn-text" data-result="false" data-initial>${esc(cancel)}</button>
         <button type="button" class="btn-fill" data-result="true">${esc(confirm)}</button>
       </div>`,
      { dismissible: false, describedBy: 'dlg-text' },
    );
  }

  function noticeDialog(notice) {
    return openDialog(
      `<p class="tag">${esc(t('noticePopupTag'))}</p>
       <h2 class="dialog-title notice-pop-title" id="dlg-title">${esc(noticeTitle(notice))}</h2>
       <p class="notice-pop-date"><time datetime="${esc(notice.date)}">${esc(L.formatNoticeDate(notice.date))}</time></p>
       <div class="notice-pop-body" tabindex="0">${esc(noticeBody(notice))}</div>
       <div class="dialog-actions">
         <button type="button" class="btn-text" data-result="false">${esc(t('noticeClose'))}</button>
         <button type="button" class="btn-fill" data-result="true" data-initial>${esc(t('noticeReadMore'))}</button>
       </div>`,
      { dismissible: true },
    );
  }

  let toastTimer = null;
  function showToast(message) {
    const el = document.getElementById('toast');
    clearTimeout(toastTimer);
    el.textContent = message;
    el.hidden = false;
    el.classList.remove('show');
    void el.offsetWidth; // restart the entrance animation
    el.classList.add('show');
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
      el.hidden = true;
    }, 2000);
  }

  function announce(message) {
    live.textContent = '';
    setTimeout(() => {
      live.textContent = message;
    }, 60);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  function handleBackAction() {
    const route = parseRoute();
    if (route.name === 'quiz' && quizHasProgress()) confirmQuit();
    else if (route.name !== 'home') goBack();
  }

  function setLanguage(next) {
    const value = next === 'ko' ? 'ko' : 'en';
    store.set(KEYS.language, value);
    if (value === lang) return;
    lang = value;
    const active = document.activeElement;
    const langFocus = active && active.dataset && active.dataset.action === 'lang' ? active.dataset.lang : null;
    render({ animate: false, focus: false });
    if (langFocus) {
      const again = view.querySelector(`[data-action="lang"][data-lang="${langFocus}"]`);
      if (again) again.focus({ preventScroll: true });
    }
  }

  const actions = {
    back: handleBackAction,
    lang: (el) => setLanguage(el.dataset.lang),
    answer: (el) => selectAnswer(Number(el.dataset.index)),
    continue: onContinue,
    hint: useHint,
    'reload-quiz': () => {
      if (!quiz) return;
      quiz.error = false;
      rerenderQuiz({ focus: false });
      startQuizIfNeeded(parseRoute());
    },
    'next-stage': () => lastResult && retryOrNext(lastResult.stage + 1),
    retry: () => lastResult && retryOrNext(lastResult.stage),
    'stage-select': goBack,
    home: goHome,
    reset: resetProgress,
  };

  view.addEventListener('click', (event) => {
    const nav = event.target.closest('a[data-nav]');
    if (nav) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(nav.getAttribute('href'));
      return;
    }
    const el = event.target.closest('[data-action]');
    if (el) {
      if (!el.disabled && el.getAttribute('aria-disabled') !== 'true') {
        actions[el.dataset.action]?.(el, event);
        return;
      }
      // An already-answered choice falls through to the skip below.
      if (el.dataset.action !== 'answer') return;
    }
    // Tap anywhere to skip the auto-advance delay (questions without an
    // explanation), like the app's GestureDetector.
    if (view.dataset.screen === 'quiz' && event.target.closest('.quiz-layout')) trySkipAdvance();
  });

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (dialogStack.length) return; // the <dialog> handles its own keys
    const route = parseRoute();
    const target = event.target;
    const onControl = target instanceof Element && !!target.closest('button, a, input, select, textarea, [contenteditable]');

    if (event.key === 'Escape') {
      if (route.name !== 'home') {
        event.preventDefault();
        handleBackAction();
      }
      return;
    }
    if (route.name !== 'quiz' || !quiz || !quiz.items) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (!quiz.answered) {
      let n = -1;
      if (key >= '1' && key <= '4') n = Number(key) - 1;
      else if (key >= 'a' && key <= 'd') n = key.charCodeAt(0) - 97;
      if (n >= 0) {
        const visible = visibleChoices();
        if (n < visible.length) {
          event.preventDefault();
          selectAnswer(visible[n]);
        }
      } else if (key === 'h') {
        event.preventDefault();
        useHint();
      }
      return;
    }
    if ((key === 'Enter' || key === ' ') && !onControl) {
      event.preventDefault();
      if (quiz.awaitingContinue) onContinue();
      else trySkipAdvance();
    }
  });

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------

  function boot() {
    migrateStorage();
    const stored = store.get(KEYS.language);
    if (stored === 'ko' || stored === 'en') lang = stored;
    else lang = (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';

    const known = location.hash && parseRoute().name !== 'unknown';
    history.replaceState({ depth: currentDepth() }, '', known ? location.hash : homeUrl());
    render({ animate: false });

    loadNotices().then(() => {
      const route = parseRoute();
      if (route.name === 'home') {
        const btn = view.querySelector('[data-notice-btn]');
        if (btn) btn.outerHTML = noticeButton();
        maybeShowNoticePopup();
      } else if (route.name === 'notices' || route.name === 'notice') {
        render({ animate: false });
      }
    });
  }

  boot();
})();
