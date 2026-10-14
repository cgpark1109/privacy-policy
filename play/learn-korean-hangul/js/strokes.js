// Stroke-order guides (port of StrokeData.forChar in lib/logic/stroke_data.dart).
// The per-jamo strokes come from data/core.json (generated from the Dart table
// by tools/sync_from_app.py); this file holds the syllable layout rules.

import { decompose } from './hangul.js';

const VERTICAL_VOWELS = new Set(['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅣ']);
const HORIZONTAL_VOWELS = new Set(['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ']);

/** Maps unit-box strokes into the rectangle (left, top, width, height). */
const fit = (strokes, [l, t, w, h]) =>
  strokes.map((s) => s.map(([x, y]) => [l + x * w, t + y * h]));

/**
 * Strokes (arrays of [x, y] in a 0..1 box) for `char` in writing order, or
 * null when there is no guide (words, syllables with a final consonant).
 */
export function strokesFor(table, char) {
  const jamo = table[char];
  if (jamo) return jamo;

  const parts = decompose(char);
  if (!parts || parts.jong !== 0 || char.length !== 1) return null;
  const cho = table[parts.cho];
  const jung = table[parts.jung];
  if (!cho || !jung) return null;

  if (VERTICAL_VOWELS.has(parts.jung)) {
    return [...fit(cho, [0.04, 0.18, 0.46, 0.64]), ...fit(jung, [0.36, 0, 0.64, 1])];
  }
  if (HORIZONTAL_VOWELS.has(parts.jung)) {
    return [...fit(cho, [0.2, 0.02, 0.6, 0.5]), ...fit(jung, [0, 0.32, 1, 0.68])];
  }
  return [...fit(cho, [0.06, 0.04, 0.48, 0.34]), ...jung];
}
