// 가나다라 table (lib/screens/learn/syllables_screen.dart): pick an initial
// consonant, see its 21 syllables.

import { esc, html } from '../ui.js';
import { appBar, bindBack, itemGrid, bindSpeak } from './shared.js';

export default function syllablesView(ctx) {
  const { repo } = ctx;
  const groups = repo.syllableGroups;
  let selected = Math.min(Math.max(Number(ctx.params.group ?? 0) || 0, 0), groups.length - 1);

  const el = html(`<div class="screen">
    ${appBar('가나다라 Syllables', { titleHtml: '<span lang="ko">가나다라</span> Syllables' })}
    <div class="chip-bar" role="group" aria-label="Initial consonant">
      <div class="chip-bar__inner">
        ${groups.map((g, i) => `<button type="button" class="chip" data-group="${i}"
            aria-pressed="${i === selected}" aria-label="${esc(g.consonant.char)} (${esc(g.consonant.roman)})"><span lang="ko">${esc(g.consonant.char)}</span></button>`).join('')}
      </div>
    </div>
    <div class="page page--grid">
      <p class="caption" data-caption aria-live="polite"></p>
      <div data-grid></div>
    </div>
  </div>`);

  const caption = el.querySelector('[data-caption]');
  const gridSlot = el.querySelector('[data-grid]');

  function renderGroup() {
    const group = groups[selected];
    caption.innerHTML = `<span lang="ko">${esc(group.consonant.char)}</span> (${esc(group.consonant.roman)}) + vowels`;
    gridSlot.innerHTML = itemGrid(group.items, `syllables-${selected}`, {
      label: `Syllables starting with ${group.consonant.char}`,
    });
    for (const chip of el.querySelectorAll('[data-group]')) {
      chip.setAttribute('aria-pressed', String(Number(chip.dataset.group) === selected));
    }
  }

  el.querySelector('.chip-bar').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-group]');
    if (!chip) return;
    selected = Number(chip.dataset.group);
    renderGroup();
    // Keep the choice in the URL (no new history entry), so going back from
    // a syllable returns to this consonant.
    history.replaceState(history.state, '', `#/learn/syllables/${selected}`);
  });

  bindBack(el, () => ctx.router.back('/learn'));
  bindSpeak(gridSlot, ctx, () => groups[selected].items);
  renderGroup();

  return {
    el,
    title: 'Syllables',
    tab: 'learn',
    sub: true,
    parent: '/learn',
    onMount() {
      el.querySelector(`[data-group="${selected}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  };
}
