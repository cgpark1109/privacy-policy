// Words tab (lib/screens/words/words_screen.dart): 2,400 words in 가나다
// order, search (Korean / roman / meaning) and a ㄱ ㄴ ㄷ jump bar.

import { esc, icon, html, formatCount } from '../ui.js';
import { decompose } from '../hangul.js';
import { filterWords, loadingBlock } from './shared.js';

const rowHtml = (w, i, q) => `<li class="word-row">
  <a class="word-row__link" href="#/item/words/${i}${q ? `?q=${encodeURIComponent(q)}` : ''}">
    <span class="word-row__top"><span class="word-row__char" lang="ko">${esc(w.char)}</span><span class="word-row__roman">${esc(w.roman)}</span></span>
    <span class="word-row__meaning">${esc(w.meaning ?? '')}</span>
  </a>
  <button type="button" class="speak-btn" data-speak="${i}" aria-label="Listen to ${esc(w.char)}">${icon('volume')}</button>
</li>`;

export default function wordsView(ctx) {
  const { repo } = ctx;
  let filtered = [];
  let query = '';
  let sections = []; // [{cho, start, count}]
  let current = null;
  let searchTimer = null;

  const el = html(`<div class="page page--words">
    <header class="tab-header">
      <h1 class="tab-header__title" tabindex="-1"><span lang="ko">기본 단어</span> Basic Words</h1>
    </header>
    <div class="words-toolbar" data-toolbar>
      <div class="search">
        <label class="sr-only" for="word-search">Search words</label>
        ${icon('search', 'search__icon')}
        <input id="word-search" class="search__input" type="search" placeholder="Search Korean, roman, or meaning"
               autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
        <button type="button" class="icon-btn search__clear" data-clear aria-label="Clear search" hidden>${icon('close')}</button>
      </div>
      <nav class="jump-bar" aria-label="Jump to consonant" data-jump></nav>
      <p class="words-count" data-count aria-live="polite"></p>
    </div>
    <div class="words-list" data-list>${loadingBlock('Loading words…')}</div>
  </div>`);

  const input = el.querySelector('#word-search');
  const clearBtn = el.querySelector('[data-clear]');
  const jumpBar = el.querySelector('[data-jump]');
  const countEl = el.querySelector('[data-count]');
  const listEl = el.querySelector('[data-list]');
  const toolbar = el.querySelector('[data-toolbar]');

  function buildSections() {
    sections = [];
    repo.wordsSorted.forEach((w, i) => {
      const cho = decompose(w.char[0])?.cho ?? null;
      const last = sections[sections.length - 1];
      if (cho && (!last || last.cho !== cho)) sections.push({ cho, start: i, count: 0 });
      else if (!cho && (!last || last.cho !== null)) sections.push({ cho: null, start: i, count: 0 });
      sections[sections.length - 1].count++;
    });
  }

  function renderJumpBar() {
    jumpBar.innerHTML = sections.filter((s) => s.cho)
      .map((s) => `<button type="button" class="chip chip--sm" data-cho="${esc(s.cho)}" aria-label="Jump to ${esc(s.cho)}"><span lang="ko">${esc(s.cho)}</span></button>`)
      .join('');
  }

  function renderList() {
    const total = repo.words.length;
    countEl.textContent = `${formatCount(filtered.length)} / ${formatCount(total)}`;
    const searching = query.trim() !== '';
    jumpBar.hidden = searching;
    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No words found</p>';
      return;
    }
    if (searching) {
      listEl.innerHTML = `<ul class="word-list" role="list">${filtered.map((w, i) => rowHtml(w, i, query.trim())).join('')}</ul>`;
      return;
    }
    listEl.innerHTML = sections.map((s, n) => {
      const rows = filtered.slice(s.start, s.start + s.count).map((w, k) => rowHtml(w, s.start + k, '')).join('');
      const label = s.cho ?? 'A–Z';
      return `<section class="word-section" id="words-${n}" data-section="${n}" style="--rows:${s.count}" aria-labelledby="words-h-${n}">
        <h2 class="word-section__label" id="words-h-${n}" tabindex="-1"><span lang="ko">${esc(label)}</span></h2>
        <ul class="word-list" role="list">${rows}</ul>
      </section>`;
    }).join('');
    updateCurrent();
  }

  function applySearch() {
    query = input.value;
    clearBtn.hidden = query === '';
    filtered = filterWords(repo, query);
    renderList();
    window.scrollTo(0, Math.min(window.scrollY, el.querySelector('.tab-header').offsetHeight));
  }

  function updateCurrent() {
    if (query.trim() || !sections.length) return;
    const offset = toolbar.getBoundingClientRect().bottom + 4;
    let found = null;
    for (const sec of listEl.querySelectorAll('[data-section]')) {
      if (sec.getBoundingClientRect().top <= offset) found = Number(sec.dataset.section);
      else break;
    }
    const cho = sections[found ?? 0]?.cho ?? null;
    if (cho === current) return;
    current = cho;
    for (const chip of jumpBar.querySelectorAll('[data-cho]')) {
      const on = chip.dataset.cho === cho;
      chip.classList.toggle('is-current', on);
      if (on) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    }
    jumpBar.querySelector('.is-current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  let scrollRaf = 0;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      updateCurrent();
    });
  };

  function syncStickyOffset() {
    el.style.setProperty('--toolbar-h', `${toolbar.offsetHeight}px`);
  }
  const resizeObserver = new ResizeObserver(syncStickyOffset);

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applySearch, 120);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) {
      e.preventDefault();
      e.stopPropagation();
      input.value = '';
      applySearch();
    }
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    applySearch();
    input.focus();
  });
  jumpBar.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-cho]');
    if (!chip) return;
    const n = sections.findIndex((s) => s.cho === chip.dataset.cho);
    const sec = listEl.querySelector(`[data-section="${n}"]`);
    if (!sec) return;
    sec.scrollIntoView({ block: 'start' });
    sec.querySelector('h2')?.focus({ preventScroll: true });
  });
  listEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-speak]');
    if (btn) ctx.speakItem(filtered[Number(btn.dataset.speak)]);
  });

  async function init() {
    try {
      await ctx.loadWords();
    } catch {
      listEl.innerHTML = `<div class="empty-state"><p>Couldn’t load the word list.</p>
        <button type="button" class="btn btn--outlined" data-retry>Try again</button></div>`;
      listEl.querySelector('[data-retry]').addEventListener('click', () => {
        listEl.innerHTML = loadingBlock('Loading words…');
        init();
      });
      return;
    }
    buildSections();
    renderJumpBar();
    filtered = filterWords(repo, input.value);
    query = input.value;
    renderList();
  }
  init();

  return {
    el,
    title: 'Basic Words',
    tab: 'words',
    keepAlive: true,
    onMount() {
      window.addEventListener('scroll', onScroll, { passive: true });
      resizeObserver.observe(toolbar);
      syncStickyOffset();
      updateCurrent();
    },
    onShow() {},
    onHide() {
      window.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    },
  };
}
