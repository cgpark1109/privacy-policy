// Quiz rules (port of lib/logic/quiz_engine.dart).

export const QuestionType = Object.freeze({
  /** Show the letter/word, pick its romanization. */
  charToRoman: 'charToRoman',
  /** Play the sound, pick the letter/word. */
  soundToChar: 'soundToChar',
  /** Show the English meaning, pick the word. */
  meaningToChar: 'meaningToChar',
});

export const QUESTION_COUNT = 10;
export const OPTION_COUNT = 4;
export const PASS_COUNT = 6;

export const valueOf = (item, type) =>
  type === QuestionType.charToRoman ? item.roman : item.char;

/** Fisher–Yates, like Dart's List.shuffle. `rng()` returns [0, 1). */
export function shuffle(list, rng = Math.random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuiz(pool, { count = QUESTION_COUNT, rng = Math.random } = {}) {
  const shuffled = shuffle(pool, rng);
  return Array.from({ length: count }, (_, i) =>
    makeQuestion(shuffled[i % shuffled.length], pool, rng));
}

function makeQuestion(item, pool, rng) {
  const types = [QuestionType.charToRoman, QuestionType.soundToChar];
  if (item.meaning != null) types.push(QuestionType.meaningToChar);
  const type = types[Math.floor(rng() * types.length)];

  // Distractors must have a different visible label than the answer and
  // each other, otherwise two buttons could both be "correct".
  const seen = new Set([valueOf(item, type)]);
  const distractors = [];
  for (const other of shuffle(pool, rng)) {
    if (distractors.length === OPTION_COUNT - 1) break;
    const label = valueOf(other, type);
    if (!seen.has(label)) {
      seen.add(label);
      distractors.push(other);
    }
  }

  return {
    item,
    type,
    options: shuffle([item, ...distractors], rng),
  };
}

export const labelOf = (question, option) => valueOf(option, question.type);

export const isCorrect = (question, option) =>
  valueOf(option, question.type) === valueOf(question.item, question.type);

/** 100 per correct answer, +20 on a 2-streak, +50 from a 3-streak on. */
export function pointsFor(streak) {
  if (streak >= 3) return 150;
  if (streak === 2) return 120;
  return 100;
}

/** 0 stars means the stage was not cleared (and the next stays locked). */
export function starsFor(correct) {
  if (correct >= 9) return 3;
  if (correct >= 7) return 2;
  if (correct >= PASS_COUNT) return 1;
  return 0;
}
