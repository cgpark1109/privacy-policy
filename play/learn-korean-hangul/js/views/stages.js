// Quiz tab (lib/screens/quiz/stage_map_screen.dart): 8 stages, stars, unlocks.

import { esc, icon, html, starRow } from '../ui.js';
import { PASS_COUNT, QUESTION_COUNT } from '../quiz-engine.js';

export default function stagesView(ctx) {
  const { repo, storage } = ctx;

  const el = html(`<div class="page page--wide">
    <header class="tab-header">
      <h1 class="tab-header__title" tabindex="-1">Quiz Stages</h1>
      <p class="tab-header__subtitle">Get ${PASS_COUNT}+ of ${QUESTION_COUNT} right to unlock the next stage</p>
    </header>
    <ol class="stage-list" role="list" data-list></ol>
  </div>`);
  const listEl = el.querySelector('[data-list]');

  function render() {
    listEl.innerHTML = repo.stages.map((stage) => {
      const unlocked = storage.isStageUnlocked(stage.id);
      const result = storage.resultFor(stage.id);
      const stars = result?.stars ?? 0;
      const cleared = stars > 0;
      const badge = unlocked ? `<span>${stage.id}</span>` : icon('lock');
      const best = result && result.score > 0 ? `<span class="stage-tile__best">Best ${result.score}</span>` : '';
      const state = cleared ? 'cleared' : unlocked ? 'open' : 'locked';
      const label = `Stage ${stage.id}: ${stage.title}. ${
        unlocked ? `${stars} of 3 stars${result?.score ? `, best score ${result.score}` : ''}` : `Locked. Clear stage ${stage.id - 1} to unlock`}`;
      const inner = `
        <span class="stage-tile__badge" aria-hidden="true">${badge}</span>
        <span class="stage-tile__body" aria-hidden="true">
          <span class="stage-tile__title">${esc(stage.title)}</span>
          <span class="stage-tile__subtitle" lang="${/[ㄱ-힣]/.test(stage.subtitle) ? 'ko' : 'en'}">${esc(stage.subtitle)}</span>
        </span>
        <span class="stage-tile__score" aria-hidden="true">${starRow(stars)}${best}</span>`;
      return `<li>${unlocked
        ? `<a class="card card--interactive stage-tile stage-tile--${state}" href="#/quiz/${stage.id}" aria-label="${esc(label)}">${inner}</a>`
        : `<button type="button" class="card stage-tile stage-tile--locked" data-locked="${stage.id}" aria-disabled="true" aria-label="${esc(label)}">${inner}</button>`}</li>`;
    }).join('');
  }

  listEl.addEventListener('click', (e) => {
    const locked = e.target.closest('[data-locked]');
    if (locked) ctx.toast(`Clear stage ${Number(locked.dataset.locked) - 1} to unlock`);
  });

  render();
  const off = storage.onChange(render);

  return { el, title: 'Quiz Stages', tab: 'quiz', destroy: off };
}
