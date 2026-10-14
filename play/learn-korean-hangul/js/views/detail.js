// Item detail (lib/screens/learn/item_detail_screen.dart): big letter, sound,
// stroke practice, example words. Swipe, arrow keys or the pager buttons move
// through the list without adding history entries (like the app's PageView).

import { esc, icon, html, glyphClass } from '../ui.js';
import { describe, isJamoItem, Kind } from '../data.js';
import { strokesFor } from '../strokes.js';
import { appBar, bindBack, resolveList } from './shared.js';

export default async function detailView(ctx) {
  const { repo, params, query } = ctx;
  let list = resolveList(repo, params.list, query);
  if (list?.needsWords && !repo.hasWords) {
    await ctx.loadWords();
    list = resolveList(repo, params.list, query);
  }
  if (!list || list.items.length === 0) return { redirect: list?.parent ?? '/learn' };
  const items = list.items;
  let index = Number(params.index);
  if (!(index >= 0 && index < items.length)) return { redirect: list.parent };

  const isWords = params.list === 'words';
  const el = html(`<div class="screen">
    ${appBar('')}
    <div class="page page--detail">
      <div class="detail" data-detail></div>
    </div>
    <nav class="pager" aria-label="Browse ${esc(list.title.replace(/^[^A-Za-z]+/, ''))}">
      <button type="button" class="icon-btn icon-btn--lg" data-prev aria-label="Previous">${icon('chevron-left')}</button>
      <span class="pager__hint"><span class="hint-touch">Swipe to see more</span><span class="hint-keys">Use <kbd>←</kbd> <kbd>→</kbd> to see more</span></span>
      <button type="button" class="icon-btn icon-btn--lg" data-next aria-label="Next">${icon('chevron-right')}</button>
    </nav>
  </div>`);

  const titleEl = el.querySelector('.appbar__title');
  const body = el.querySelector('[data-detail]');
  const prevBtn = el.querySelector('[data-prev]');
  const nextBtn = el.querySelector('[data-next]');

  const pathFor = (i) => {
    const q = list.q ? `?q=${encodeURIComponent(list.q)}` : '';
    return `#/item/${params.list}/${i}${q}`;
  };

  function renderItem() {
    const item = items[index];
    titleEl.textContent = `${index + 1} / ${items.length}`;
    titleEl.setAttribute('aria-label', `${item.char}, ${index + 1} of ${items.length}`);
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === items.length - 1;
    document.title = `${item.char} (${item.roman}) · Learn Korean - Hangul`;

    const description = describe(item);
    const canWrite = item.kind !== Kind.word && strokesFor(repo.strokes, item.char) != null;
    body.innerHTML = `
      <div class="detail__main">
        <button type="button" class="card card--raised detail-card" data-listen aria-label="Listen to ${esc(item.char)}">
          <span class="detail-card__char ${glyphClass(item.char)}" lang="ko" style="--len:${item.char.length}">${esc(item.char)}</span>
          <span class="detail-card__roman">${esc(item.roman)}</span>
          ${description ? `<span class="detail-card__desc">${esc(description)}</span>` : ''}
          ${isJamoItem(item) ? `<span class="detail-card__name">Name: <span lang="ko">${esc(repo.jamoName(item))}</span></span>` : ''}
        </button>
        <div class="btn-row">
          <button type="button" class="btn btn--filled" data-listen>${icon('volume')}<span>Listen</span></button>
          <button type="button" class="btn btn--outlined" data-slow>${icon('slow')}<span>Slow</span></button>
        </div>
        ${canWrite ? `<a class="btn btn--outlined" href="#/stroke/${encodeURIComponent(item.char)}">${icon('draw')}<span>Practice writing</span></a>` : ''}
      </div>
      <div class="detail__side" data-examples></div>`;
    renderExamples(item);
  }

  function renderExamples(item) {
    const slot = body.querySelector('[data-examples]');
    if (item.kind === Kind.word) return;
    if (!repo.hasWords) {
      slot.innerHTML = '';
      ctx.loadWords().then(() => {
        if (items[index] === item) renderExamples(item);
      }).catch(() => {});
      return;
    }
    const examples = repo.exampleWords(item);
    if (examples.length === 0) return;
    const label = item.kind === Kind.syllable ? 'Words with' : 'Words using';
    slot.innerHTML = `
      <h2 class="section-label">${label} <span lang="ko">${esc(item.char)}</span></h2>
      <ul class="card example-list" role="list">
        ${examples.map((w, i) => `<li><button type="button" class="example-row" data-example="${i}"
            aria-label="${esc(w.char)}, ${esc(w.roman)}, ${esc(w.meaning ?? '')}. Listen">
          <span class="example-row__char" lang="ko">${esc(w.char)}</span>
          <span class="example-row__meta">${esc(w.roman)} · ${esc(w.meaning ?? '')}</span>
          ${icon('volume', 'example-row__icon')}
        </button></li>`).join('')}
      </ul>`;
    slot.querySelectorAll('[data-example]').forEach((btn) => {
      btn.addEventListener('click', () => ctx.speakItem(examples[Number(btn.dataset.example)]));
    });
  }

  function goTo(i, { focus = false } = {}) {
    if (i < 0 || i >= items.length || i === index) return;
    index = i;
    history.replaceState(history.state, '', pathFor(index));
    renderItem();
    ctx.speakItem(items[index]);
    if (focus) body.querySelector('.detail-card')?.focus({ preventScroll: true });
  }

  body.addEventListener('click', (e) => {
    if (e.target.closest('[data-listen]')) ctx.speakItem(items[index]);
    else if (e.target.closest('[data-slow]')) ctx.speakItem(items[index], { slow: true });
  });
  prevBtn.addEventListener('click', () => goTo(index - 1));
  nextBtn.addEventListener('click', () => goTo(index + 1));

  // Swipe (touch and pen; mouse users have the buttons and arrow keys).
  let start = null;
  body.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    start = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  });
  body.addEventListener('pointerup', (e) => {
    if (!start || e.pointerType === 'mouse') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < Math.abs(dx) * 0.6) {
      goTo(index + (dx < 0 ? 1 : -1));
    }
  });
  body.addEventListener('pointercancel', () => { start = null; });

  bindBack(el, () => ctx.router.back(list.parent));
  renderItem();

  return {
    el,
    title: `${items[index].char}`,
    tab: isWords ? 'words' : 'learn',
    sub: true,
    parent: list.parent,
    onMount() {
      document.title = `${items[index].char} (${items[index].roman}) · Learn Korean - Hangul`;
      ctx.speakItem(items[index]);
    },
    onKey(e) {
      if (e.target.closest?.('input, textarea')) return false;
      if (e.altKey || e.ctrlKey || e.metaKey) return false;
      if (e.key === 'ArrowLeft') { goTo(index - 1, { focus: true }); return true; }
      if (e.key === 'ArrowRight') { goTo(index + 1, { focus: true }); return true; }
      return false;
    },
  };
}
