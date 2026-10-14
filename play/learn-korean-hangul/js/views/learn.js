// Learn tab (lib/screens/learn/learn_screen.dart): progress card + categories.

import { esc, icon, ko, html, formatCount } from '../ui.js';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.kysystemstudio.learnkorean&referrer=utm_source%3Dkysystemstudio%26utm_medium%3Dwebapp%26utm_campaign%3Dweb_version';

export default function learnView(ctx) {
  const { repo, storage, notice } = ctx;

  const categories = [
    { glyph: 'ㄱ', korean: '자음', english: 'Consonants',
      count: `${repo.basicConsonants.length} letters`, href: '#/learn/consonants' },
    { glyph: 'ㄲ', korean: '쌍자음', english: 'Double Consonants',
      count: `${repo.doubleConsonants.length} letters`, href: '#/learn/double-consonants' },
    { glyph: 'ㅏ', korean: '모음', english: 'Vowels',
      count: `${repo.vowels.length} letters`, href: '#/learn/vowels' },
    { glyph: 'ㅐ', korean: '복합 모음', english: 'Compound Vowels',
      count: `${repo.compoundVowels.length} letters`, href: '#/learn/compound-vowels' },
    { glyph: '가', korean: '가나다라', english: 'Syllables',
      count: `${repo.syllables.length} syllables`, href: '#/learn/syllables' },
    { glyph: '안녕', korean: '기본 단어', english: 'Basic Words',
      count: `${formatCount(repo.wordCount)} words`, href: '#/words' },
  ];

  const el = html(`<div class="page page--wide learn">
    <header class="tab-header">
      <h1 class="tab-header__title" tabindex="-1">Learn Korean - Hangul</h1>
      <p class="tab-header__subtitle">Learn Hangul step by step</p>
    </header>
    <div class="notice-slot" data-notice></div>
    <div data-progress></div>
    <h2 class="section-label">Study</h2>
    <ul class="category-list" role="list">
      ${categories.map((c) => `<li>
        <a class="card card--interactive category-card" href="${c.href}">
          <span class="category-card__glyph" aria-hidden="true">${ko(c.glyph)}</span>
          <span class="category-card__body">
            <span class="category-card__title">${esc(c.english)}</span>
            <span class="category-card__meta">${ko(c.korean)} · ${esc(c.count)}</span>
          </span>
          ${icon('chevron-right', 'category-card__chevron')}
        </a>
      </li>`).join('')}
    </ul>
    <aside class="card get-app-inline" aria-label="Android app">
      <img src="img/icon-192.png" width="48" height="48" alt="" class="get-app-inline__icon">
      <div class="get-app-inline__body">
        <p class="get-app-inline__title">Learn Korean - Hangul for Android</p>
        <p class="get-app-inline__text">Same lessons, works offline.</p>
      </div>
      <a class="btn btn--outlined btn--small" href="${esc(PLAY_URL)}" target="_blank" rel="noopener">
        ${icon('shop')}<span>Get it on Google Play</span><span class="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  </div>`);

  const progressSlot = el.querySelector('[data-progress]');
  const noticeSlot = el.querySelector('[data-notice]');

  function renderProgress() {
    const stages = repo.stages;
    const maxStars = stages.length * 3;
    const cleared = stages.filter((s) => storage.starsFor(s.id) > 0).length;
    const next = stages.find((s) => storage.starsFor(s.id) === 0) ?? stages[stages.length - 1];
    const allDone = cleared === stages.length;
    const total = storage.totalStars();
    const title = allDone ? 'All stages cleared!' : `Next: ${next.title}`;
    const href = allDone ? '#/quiz' : `#/quiz/${next.id}`;
    progressSlot.innerHTML = `
      <a class="card progress-card" href="${href}"
         aria-label="${esc(title)}. ${cleared} of ${stages.length} stages cleared, ${total} of ${maxStars} stars. ${allDone ? 'Open quiz stages' : 'Start quiz'}">
        <span class="progress-card__body">
          <span class="progress-card__title">${esc(title)}</span>
          <span class="progress-bar progress-bar--ink" aria-hidden="true"><span style="width:${(cleared / stages.length) * 100}%"></span></span>
          <span class="progress-card__meta" aria-hidden="true">${cleared} / ${stages.length} stages · ${total} / ${maxStars} ★</span>
        </span>
        <span class="progress-card__play" aria-hidden="true">${icon('play')}</span>
      </a>`;
  }

  function renderNotice() {
    const banner = notice.activeBanner;
    if (!banner) {
      noticeSlot.replaceChildren();
      return;
    }
    const path = ctx.noticeLinkToPath(banner.link);
    noticeSlot.innerHTML = `<div class="card notice-banner">
        ${path
          ? `<a class="notice-banner__text" href="#${esc(path)}">${esc(banner.message)}</a>`
          : `<p class="notice-banner__text">${esc(banner.message)}</p>`}
        <button type="button" class="icon-btn notice-banner__close" aria-label="Close notice">${icon('close')}</button>
      </div>`;
    noticeSlot.querySelector('button').addEventListener('click', () => {
      notice.dismissBanner();
      el.querySelector('h1')?.focus?.();
    });
  }

  renderProgress();
  renderNotice();
  const offStorage = storage.onChange(renderProgress);
  notice.listeners.add(renderNotice);

  return {
    el,
    title: null,
    tab: 'learn',
    destroy() {
      offStorage();
      notice.listeners.delete(renderNotice);
    },
  };
}
