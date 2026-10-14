// Unicode Hangul composition helpers (port of lib/data/hangul_compose.dart).

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

/** Initial consonants (초성) in Unicode order. */
export const CHOSEONG = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

/** Medial vowels (중성) in Unicode order. */
export const JUNGSEONG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];

export const choIndex = (jamo) => CHOSEONG.indexOf(jamo);
export const jungIndex = (jamo) => JUNGSEONG.indexOf(jamo);

/** Open syllable (no final consonant), e.g. ㄱ + ㅏ → 가. */
export function compose(cho, jung) {
  const c = choIndex(cho);
  const j = jungIndex(jung);
  if (c < 0 || j < 0) return null;
  return String.fromCharCode(SYLLABLE_BASE + (c * JUNG_COUNT + j) * JONG_COUNT);
}

/** Single Hangul Compatibility Jamo (ㄱ … ㅣ). */
export function isJamo(text) {
  if (text.length !== 1) return false;
  const code = text.charCodeAt(0);
  return code >= 0x3131 && code <= 0x318e;
}

export const isSyllable = (code) => code >= SYLLABLE_BASE && code <= SYLLABLE_LAST;

/** Splits a syllable into {cho, jung, jong index}; null for anything else. */
export function decompose(syllable) {
  if (!syllable) return null;
  const code = syllable.charCodeAt(0);
  if (!isSyllable(code)) return null;
  const index = code - SYLLABLE_BASE;
  return {
    cho: CHOSEONG[Math.floor(index / (JUNG_COUNT * JONG_COUNT))],
    jung: JUNGSEONG[Math.floor((index % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT)],
    jong: index % JONG_COUNT,
  };
}

/** Dart's String.compareTo: UTF-16 code unit order (not locale order). */
export const compareCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
