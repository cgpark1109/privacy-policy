// Quiz (lib/screens/quiz/quiz_screen.dart): 10 questions, 4 options,
// streak bonus, auto-advance after 1.4 s.
// Keyboard: 1–4 answer · Enter/Space continue (Space replays the sound
// before answering) · Esc leave.

import { esc, icon, html, confirmDialog, glyphClass } from '../ui.js';
import { isJamo } from '../hangul.js';
import { describe } from '../data.js';
import * as Quiz from '../quiz-engine.js';
import { appBar, bindBack } from './shared.js';

const ADVANCE_DELAY = 1400;
const OPTION_KEYS = ['1', '2', '3', '4'];

export default async function quizView(ctx) {
  const { repo, storage, router } = ctx;
  const stage = repo.stageById(ctx.params.stage);
  if (!stage) return { redirect: '/quiz' };
  if (!storage.isStageUnlocked(stage.id)) {
    return { redirect: '/quiz', message: `Clear stage ${stage.id - 1} to unlock` };
  }
  if (stage.words && !repo.hasWords) await ctx.loadWords();

  const questions = Quiz.buildQuiz(repo.stageItems(stage));
  const total = questions.length;
  let index = 0;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let correct = 0;
  const missed = [];
  let picked = null;
  let advanceTimer = null;
  let finished = false;

  const el = html(`<div class="screen screen--quiz">
    ${appBar(stage.title, { action: '<span class="quiz-score" data-score>0 pts</span>', backLabel: 'Leave quiz' })}
    <div class="quiz">
      <div class="quiz__progress">
        <span class="progress-bar" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${total}" data-bar><span></span></span>
        <span class="quiz__count" data-count></span>
      </div>
      <p class="quiz__streak" data-streak></p>
      <section class="card card--raised quiz__prompt" data-prompt></section>
      <div class="quiz__options" role="group" aria-label="Answers" data-options></div>
      <div class="quiz__feedback" data-feedback aria-live="assertive" aria-atomic="true"></div>
      <p class="quiz__keys" aria-hidden="true"><kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>Enter</kbd> next · <kbd>Esc</kbd> leave</p>
    </div>
  </div>`);

  const scoreEl = el.querySelector('[data-score]');
  const bar = el.querySelector('[data-bar]');
  const countEl = el.querySelector('[data-count]');
  const streakEl = el.querySelector('[data-streak]');
  const promptEl = el.querySelector('[data-prompt]');
  const optionsEl = el.querySelector('[data-options]');
  const feedbackEl = el.querySelector('[data-feedback]');

  const q = () => questions[index];
  const answered = () => picked != null;

  function renderProgress() {
    const done = index + (answered() ? 1 : 0);
    bar.firstElementChild.style.width = `${(done / total) * 100}%`;
    bar.setAttribute('aria-valuenow', String(done));
    countEl.textContent = `${index + 1} / ${total}`;
    scoreEl.textContent = `${score} pts`;
    streakEl.textContent = streak >= 2 ? `🔥 ${streak} in a row` : '';
  }

  function renderQuestion() {
    const question = q();
    const item = question.item;
    let hint;
    let content;
    let spoken;
    switch (question.type) {
      case Quiz.QuestionType.charToRoman:
        hint = 'How do you read this?';
        content = `<span class="quiz__glyph ${glyphClass(item.char)}" lang="ko" style="--len:${item.char.length}" aria-hidden="true">${esc(item.char)}</span>`;
        spoken = `<span lang="ko">${esc(item.char)}</span>`;
        break;
      case Quiz.QuestionType.soundToChar:
        hint = item.kind === 'word' ? 'Which word do you hear?' : 'Which one makes this sound?';
        content = `<button type="button" class="sound-btn" data-play aria-label="Play the sound again">${icon('volume')}</button>`;
        spoken = 'Press Space to play it again.';
        break;
      default:
        hint = 'Which word means…';
        content = `<span class="quiz__meaning" aria-hidden="true">${esc(item.meaning ?? '')}</span>`;
        spoken = esc(item.meaning ?? '');
    }
    promptEl.innerHTML = `
      <h2 class="quiz__hint" tabindex="-1">${esc(hint)}<span class="sr-only"> Question ${index + 1} of ${total}. ${spoken}</span></h2>
      <div class="quiz__content">${content}</div>`;

    const valueIsKorean = question.type !== Quiz.QuestionType.charToRoman;
    optionsEl.innerHTML = question.options.map((option, i) => {
      const label = Quiz.labelOf(question, option);
      return `<button type="button" class="option" data-option="${i}" aria-keyshortcuts="${i + 1}">
        <span class="option__key" aria-hidden="true">${i + 1}</span>
        <span class="option__label${isJamo(label) ? ' option__label--jamo' : ''}"${valueIsKorean ? ' lang="ko"' : ''}>${esc(label)}</span>
        <span class="option__mark" aria-hidden="true"></span>
      </button>`;
    }).join('');
    feedbackEl.className = 'quiz__feedback';
    feedbackEl.textContent = '';
    renderProgress();
  }

  function onQuestionShown({ focus = true } = {}) {
    if (focus) promptEl.querySelector('h2')?.focus({ preventScroll: true });
    if (q().type === Quiz.QuestionType.soundToChar) ctx.speakItem(q().item);
  }

  function answer(optionIndex) {
    if (answered() || finished) return;
    const question = q();
    const option = question.options[optionIndex];
    if (!option) return;
    picked = option;
    const ok = Quiz.isCorrect(question, option);
    if (ok) {
      streak++;
      correct++;
      if (streak > bestStreak) bestStreak = streak;
      score += Quiz.pointsFor(streak);
    } else {
      streak = 0;
      missed.push(question.item);
    }

    optionsEl.querySelectorAll('[data-option]').forEach((btn, i) => {
      const opt = question.options[i];
      const state = Quiz.isCorrect(question, opt) ? 'correct' : opt === picked ? 'wrong' : 'dimmed';
      btn.classList.add(`option--${state}`);
      btn.setAttribute('aria-disabled', 'true');
      if (state === 'correct') btn.querySelector('.option__mark').innerHTML = icon('check');
      if (state === 'wrong') btn.querySelector('.option__mark').innerHTML = icon('close');
    });

    const item = question.item;
    const detail = [item.char, item.roman, describe(item)].filter(Boolean).join(' · ');
    feedbackEl.className = `quiz__feedback quiz__feedback--${ok ? 'correct' : 'wrong'}`;
    feedbackEl.textContent = `${ok ? 'Correct!' : 'Answer:'} ${detail}`;
    renderProgress();
    navigator.vibrate?.(ok ? 10 : [30, 40, 30]);
    ctx.speakItem(item);
    advanceTimer = setTimeout(next, ADVANCE_DELAY);
  }

  function next() {
    clearTimeout(advanceTimer);
    advanceTimer = null;
    if (finished || !answered()) return;
    if (index + 1 >= total) {
      finish();
      return;
    }
    index++;
    picked = null;
    renderQuestion();
    onQuestionShown();
  }

  function finish() {
    finished = true;
    // De-duplicate repeated misses (a small pool can repeat questions).
    const seen = new Set();
    const uniqueMissed = missed.filter((m) => !seen.has(m.id) && seen.add(m.id));
    ctx.session.result = {
      stageId: stage.id,
      score,
      correct,
      total,
      bestStreak,
      missed: uniqueMissed,
    };
    router.allowLeave();
    router.replace(`/quiz/${stage.id}/result`);
  }

  async function confirmLeave() {
    if (finished) return true;
    const paused = advanceTimer != null;
    clearTimeout(advanceTimer);
    advanceTimer = null;
    const leave = await confirmDialog({
      title: 'Leave quiz?',
      message: 'Your progress in this round will be lost.',
      cancel: 'Keep going',
      confirm: 'Leave',
    });
    if (!leave && paused && answered()) advanceTimer = setTimeout(next, ADVANCE_DELAY / 2);
    return leave;
  }

  async function leave() {
    if (await confirmLeave()) {
      router.allowLeave();
      router.back('/quiz');
    }
  }

  optionsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-option]');
    if (!btn) return;
    if (answered()) {
      // Keyboard activation of a focused option after answering = continue.
      if (e.detail === 0) next();
      return;
    }
    answer(Number(btn.dataset.option));
  });
  promptEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-play]')) ctx.speakItem(q().item);
  });
  bindBack(el, leave);

  renderQuestion();

  return {
    el,
    title: stage.title,
    tab: 'quiz',
    sub: true,
    parent: '/quiz',
    manageFocus: true,
    onMount() {
      onQuestionShown({ focus: true });
    },
    onBack: leave,
    beforeLeave: confirmLeave,
    onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return false;
      const digit = OPTION_KEYS.indexOf(e.key);
      if (digit >= 0) {
        if (!answered()) answer(digit);
        return true;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (answered()) {
          next();
          return true;
        }
        if (e.key === ' ' && !e.target.closest?.('button, a')) {
          if (q().type === Quiz.QuestionType.soundToChar) ctx.speakItem(q().item);
          return true;
        }
      }
      return false;
    },
    destroy() {
      finished = true;
      clearTimeout(advanceTimer);
    },
  };
}
