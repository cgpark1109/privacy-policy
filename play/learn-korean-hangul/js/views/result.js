// Quiz result (lib/screens/quiz/result_screen.dart): stars, score, streak,
// mistakes to review, next stage / try again.

import { esc, icon, html } from '../ui.js';
import { describe, isJamoItem } from '../data.js';
import { starsFor, PASS_COUNT } from '../quiz-engine.js';

export default function resultView(ctx) {
  const { repo, storage, router } = ctx;
  const result = ctx.session.result;
  const stage = repo.stageById(ctx.params.stage);
  if (!stage || !result || result.stageId !== stage.id) return { redirect: '/quiz' };

  const stars = starsFor(result.correct);
  const cleared = stars > 0;
  if (!result.saved) {
    storage.saveStageResult(stage.id, stars, result.score);
    result.saved = true;
  }
  const i = repo.stages.findIndex((s) => s.id === stage.id);
  const next = i >= 0 && i + 1 < repo.stages.length ? repo.stages[i + 1] : null;

  const starHtml = [0, 1, 2].map((n) =>
    `<span class="result-star${n === 1 ? ' result-star--big' : ''}${n < stars ? ' is-on' : ''}" style="--i:${n}">${icon(n < stars ? 'star' : 'star-outline')}</span>`).join('');

  const missed = result.missed;
  const buttons = cleared && next
    ? `<button type="button" class="btn btn--filled" data-next data-primary aria-describedby="result-summary">${icon('forward')}<span>Next: ${esc(next.title)}</span></button>
       <button type="button" class="btn btn--outlined" data-retry>${icon('replay')}<span>Try Again</span></button>`
    : `<button type="button" class="btn btn--filled" data-retry data-primary aria-describedby="result-summary">${icon('replay')}<span>Try Again</span></button>`;

  const el = html(`<div class="screen">
    <header class="appbar appbar--plain"><h1 class="appbar__title" tabindex="-1">${esc(stage.title)}</h1></header>
    <div class="page result">
      <div class="result__stars" role="img" aria-label="${stars} of 3 stars">${starHtml}</div>
      <p class="sr-only" id="result-summary">${cleared ? 'Stage clear.' : 'Not cleared yet.'} ${stars} of 3 stars. Score ${result.score}, ${result.correct} of ${result.total} correct.</p>
      <p class="result__headline" aria-hidden="true">${cleared ? 'Stage Clear! 🎉' : 'Keep practicing!'}</p>
      ${cleared ? '' : `<p class="result__hint">Get ${PASS_COUNT} or more right to unlock the next stage.</p>`}
      <dl class="result__stats">
        <div class="card stat stat--highlight"><dt>Score</dt><dd>${result.score}</dd></div>
        <div class="card stat"><dt>Correct</dt><dd>${result.correct} / ${result.total}</dd></div>
        <div class="card stat"><dt>Best Streak</dt><dd>${result.bestStreak} in a row</dd></div>
      </dl>
      ${missed.length ? `<h2 class="section-label">Review your mistakes</h2>
        <ul class="card missed-list" role="list">
          ${missed.map((m, k) => `<li><button type="button" class="missed-row" data-missed="${k}"
              aria-label="${esc(m.char)}, ${esc([m.roman, describe(m)].filter(Boolean).join(', '))}. Listen">
            <span class="missed-row__char${isJamoItem(m) ? ' missed-row__char--jamo' : ''}" lang="ko">${esc(m.char)}</span>
            <span class="missed-row__meta">${esc([m.roman, describe(m)].filter(Boolean).join(' · '))}</span>
            ${icon('volume', 'missed-row__icon')}
          </button></li>`).join('')}
        </ul>` : ''}
      <div class="result__actions">
        ${buttons}
        <button type="button" class="btn btn--outlined" data-stages>Back to Stages</button>
      </div>
    </div>
  </div>`);

  const backToStages = () => {
    if (router.previousPath() === '/quiz') router.back('/quiz');
    else router.replace('/quiz');
  };

  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-next]')) router.replace(`/quiz/${next.id}`);
    else if (e.target.closest('[data-retry]')) router.replace(`/quiz/${stage.id}`);
    else if (e.target.closest('[data-stages]')) backToStages();
    else {
      const row = e.target.closest('[data-missed]');
      if (row) ctx.speakItem(missed[Number(row.dataset.missed)]);
    }
  });

  return {
    el,
    title: `${stage.title} result`,
    tab: 'quiz',
    sub: true,
    parent: '/quiz',
    manageFocus: true,
    onBack: backToStages,
    onMount() {
      el.querySelector('[data-primary]')?.focus({ preventScroll: true });
      if (stars >= 2) setTimeout(() => ctx.tts.speak('축하합니다'), 300);
    },
  };
}
