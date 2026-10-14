// Pieces shared by several screens.

import { esc, icon, ko, glyphClass } from '../ui.js';

/** Lists that the item detail screen can page through, by URL key. */
export function resolveList(repo, key, query) {
  switch (key) {
    case 'consonants':
      return { items: repo.basicConsonants, title: '자음 Consonants', parent: '/learn/consonants' };
    case 'double-consonants':
      return { items: repo.doubleConsonants, title: '쌍자음 Double Consonants', parent: '/learn/double-consonants' };
    case 'vowels':
      return { items: repo.vowels, title: '모음 Vowels', parent: '/learn/vowels' };
    case 'compound-vowels':
      return { items: repo.compoundVowels, title: '복합 모음 Compound Vowels', parent: '/learn/compound-vowels' };
    case 'words': {
      const q = query?.get('q') ?? '';
      return { items: filterWords(repo, q), title: '기본 단어 Basic Words', parent: '/words', needsWords: true, q };
    }
    default: {
      const m = /^syllables-(\d+)$/.exec(key);
      const group = m ? repo.syllableGroups[Number(m[1])] : null;
      if (!group) return null;
      return { items: group.items, title: '가나다라 Syllables', parent: `/learn/syllables/${m[1]}` };
    }
  }
}

/** Same search as the app's Words tab: Korean, romanization or meaning. */
export function filterWords(repo, query) {
  const all = repo.wordsSorted ?? [];
  const trimmed = query.trim();
  if (!trimmed) return all;
  const lower = trimmed.toLowerCase();
  return all.filter((w) =>
    w.char.includes(trimmed) ||
    w.roman.toLowerCase().includes(lower) ||
    (w.meaning ?? '').toLowerCase().includes(lower));
}

/** Sub-screen app bar: back arrow, centered title, optional action. */
export function appBar(title, { action = '', backLabel = 'Back', titleHtml = null } = {}) {
  return `<header class="appbar">
    <button type="button" class="icon-btn appbar__back" data-back aria-label="${esc(backLabel)}">${icon('back')}</button>
    <h1 class="appbar__title" tabindex="-1">${titleHtml ?? esc(title)}</h1>
    <div class="appbar__action">${action}</div>
  </header>`;
}

/** Wires the app bar's back arrow. */
export function bindBack(el, onBack) {
  el.querySelector('[data-back]')?.addEventListener('click', onBack);
}

/** The app's ItemGrid / ItemCell: big letter, romanization, speak button. */
export function itemGrid(items, listKey, { label } = {}) {
  return `<ul class="item-grid" role="list"${label ? ` aria-label="${esc(label)}"` : ''}>
    ${items.map((item, i) => `<li class="card item-cell">
      <a class="item-cell__link" href="#/item/${listKey}/${i}">
        <span class="item-cell__char ${glyphClass(item.char)}" lang="ko">${esc(item.char)}</span>
        <span class="item-cell__roman">${esc(item.roman)}</span>
      </a>
      <button type="button" class="speak-btn" data-speak="${i}" aria-label="Listen to ${esc(item.char)}">${icon('volume')}</button>
    </li>`).join('')}
  </ul>`;
}

/** Delegated click handler for [data-speak] buttons in a grid/list. */
export function bindSpeak(el, ctx, getItems) {
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-speak]');
    if (!btn || !el.contains(btn)) return;
    const item = getItems()[Number(btn.dataset.speak)];
    if (item) ctx.speakItem(item);
  });
}

export const koTitle = (title) => {
  // "자음 Consonants" → Korean part marked as Korean.
  const m = /^([가-힣ㄱ-ㆎ ]+) (.+)$/.exec(title);
  return m ? `${ko(m[1])} ${esc(m[2])}` : esc(title);
};

export function loadingBlock(text = 'Loading…') {
  return `<div class="loading" role="status"><span class="spinner" aria-hidden="true"></span>${esc(text)}</div>`;
}
