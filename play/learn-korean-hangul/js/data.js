// Learning content (port of lib/data/hangul_repository.dart).
//
// data/core.json (letters, names, strokes; small) is loaded at startup.
// data/words.json (2,400 words) is loaded lazily: the Words tab, example words,
// word quiz stages and the idle prefetch after the first screen.

import { compose, choIndex, decompose, isSyllable, compareCodeUnits } from './hangul.js';
import { dartSort } from './dart-sort.js';

export const Kind = Object.freeze({
  consonant: 'consonant',
  doubleConsonant: 'doubleConsonant',
  vowel: 'vowel',
  compoundVowel: 'compoundVowel',
  syllable: 'syllable',
  word: 'word',
});

export const BASIC_CONSONANT_COUNT = 14;

const JAMO_KINDS = new Set([Kind.consonant, Kind.doubleConsonant, Kind.vowel, Kind.compoundVowel]);
export const isJamoItem = (item) => JAMO_KINDS.has(item.kind);
export const isWordItem = (item) => item.kind === Kind.word;

/** Secondary line under the romanization: meaning (words) or sound hint. */
export const describe = (item) => item.meaning ?? item.sound ?? '';

const INITIAL_ROMAN = {
  c_g: 'g', c_n: 'n', c_d: 'd', c_r: 'r', c_m: 'm',
  c_b: 'b', c_s: 's', c_ng: '', c_j: 'j', c_ch: 'ch',
  c_k: 'k', c_t: 't', c_p: 'p', c_h: 'h', c_gg: 'kk',
  c_dd: 'tt', c_bb: 'pp', c_ss: 'ss', c_jj: 'jj',
};

/**
 * Stage ids are persisted as `stage_<id>` (same keys as the app and the old
 * web version); keep them stable.
 */
const STAGE_DEFS = [
  { id: 1, title: 'Consonants I', subtitle: 'ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ', words: false,
    items: (r) => r.consonants.slice(0, 7) },
  { id: 2, title: 'Consonants II', subtitle: 'ㅇ ~ ㅎ, ㄲ ~ ㅉ', words: false,
    items: (r) => r.consonants.slice(7) },
  { id: 3, title: 'Vowels', subtitle: 'ㅏ ㅑ ㅓ ㅕ ㅗ ㅛ ㅜ ㅠ ㅡ ㅣ', words: false,
    items: (r) => r.vowels },
  { id: 4, title: 'Syllables I', subtitle: '가 갸 거 겨 고 …', words: false,
    items: (r) => r.syllables.slice(0, 10) },
  { id: 5, title: 'Words I', subtitle: 'First 8 words', words: true,
    items: (r) => r.words.slice(0, 8) },
  { id: 6, title: 'Words II', subtitle: 'All basic words', words: true,
    items: (r) => r.words.slice(8) },
  { id: 7, title: 'Syllables II', subtitle: 'Basic consonants × vowels', words: false,
    items: (r) => r.basicSyllables },
  { id: 8, title: 'Final Quiz', subtitle: 'Syllables + words', words: true,
    items: (r) => [...r.syllables, ...r.words.slice(0, 5)] },
];

export class Repository {
  constructor(core) {
    const consonants = core.consonants.map((c, i) => ({
      ...c,
      kind: i < BASIC_CONSONANT_COUNT ? Kind.consonant : Kind.doubleConsonant,
    }));
    this.appVersion = core.appVersion;
    this.wordCount = core.wordCount;
    this.basicConsonants = consonants.slice(0, BASIC_CONSONANT_COUNT);
    this.doubleConsonants = consonants.slice(BASIC_CONSONANT_COUNT);
    this.consonants = consonants;
    this.vowels = core.vowels.map((v) => ({ ...v, kind: Kind.vowel }));
    this.compoundVowels = core.compoundVowels.map((v) => ({ ...v, kind: Kind.compoundVowel }));
    this.jamoSpeak = core.jamoSpeak;
    this.jamoNames = core.jamoName ?? {};
    this.strokes = core.strokes ?? {};

    this.syllableGroups = this.#buildSyllableGroups();
    this.syllables = this.syllableGroups.flatMap((g) => g.items);
    const vowelChars = new Set(this.vowels.map((v) => v.char));
    this.basicSyllables = this.syllableGroups
      .filter((g) => g.consonant.kind === Kind.consonant)
      .flatMap((g) => g.items.filter((s) => vowelChars.has(decompose(s.char)?.jung)));

    this.stages = STAGE_DEFS.map(({ items, ...stage }) => ({ ...stage, itemsOf: items }));

    this.words = null;
    this.wordsSorted = null;
    this.byChar = new Map();
    this.#index([...this.syllables, ...consonants, ...this.vowels, ...this.compoundVowels]);
  }

  get hasWords() {
    return this.words != null;
  }

  /** Called once words.json is loaded. */
  setWords(rawWords) {
    this.words = rawWords.map((w) => ({ ...w, kind: Kind.word }));
    // 가나다 order; words starting with Latin letters (e.g. QR코드) go last.
    this.wordsSorted = [...this.words].sort((a, b) => {
      const aHangul = isSyllable(a.char.charCodeAt(0));
      const bHangul = isSyllable(b.char.charCodeAt(0));
      if (aHangul !== bHangul) return aHangul ? -1 : 1;
      return compareCodeUnits(a.char, b.char);
    });
  }

  #index(items) {
    for (const item of items) this.byChar.set(item.char, item);
  }

  /** Letter or open syllable for `char` (letters win), else a word. */
  findByChar(char) {
    return this.byChar.get(char) ?? this.words?.find((w) => w.char === char) ?? null;
  }

  stageById(id) {
    return this.stages.find((s) => s.id === Number(id)) ?? null;
  }

  /** Quiz pool for a stage; word stages need words loaded first. */
  stageItems(stage) {
    if (stage.words && !this.hasWords) throw new Error('words not loaded');
    return stage.itemsOf(this);
  }

  /** Text sent to TTS: consonant names (기역), vowel sounds (아), else as written. */
  speakText(item) {
    return this.jamoSpeak[item.char] ?? item.char;
  }

  /** Letter name shown to the learner (지읒, not the spoken 지읃). */
  jamoName(item) {
    return this.jamoNames[item.char] ?? this.speakText(item);
  }

  /** Words that use `item` (a letter or syllable), best matches first. */
  exampleWords(item, limit = 6) {
    if (!this.hasWords) return [];
    let matchSyllable;
    switch (item.kind) {
      case Kind.consonant:
      case Kind.doubleConsonant:
        matchSyllable = (s) => decompose(s)?.cho === item.char;
        break;
      case Kind.vowel:
      case Kind.compoundVowel:
        matchSyllable = (s) => decompose(s)?.jung === item.char;
        break;
      case Kind.syllable: {
        const target = decompose(item.char);
        matchSyllable = (s) => {
          const d = decompose(s);
          return d != null && d.cho === target?.cho && d.jung === target?.jung;
        };
        break;
      }
      default:
        return [];
    }

    // Prefer words that start with the target, then exact syllable matches.
    const rank = (w) => {
      const first = w.char ? w.char[0] : '';
      let r = w.char.length * 4;
      if (matchSyllable(first)) r -= 20;
      if (w.char.includes(item.char)) r -= 10;
      return r;
    };

    const matches = this.words.filter((w) => w.char.split('').some(matchSyllable));
    const ranks = new Map(matches.map((w) => [w, rank(w)]));
    dartSort(matches, (a, b) => Math.sign(ranks.get(a) - ranks.get(b)));
    return matches.slice(0, limit);
  }

  #buildSyllableGroups() {
    const allVowels = [...this.vowels, ...this.compoundVowels];
    const sortedConsonants = [...this.consonants].sort(
      (a, b) => choIndex(a.char) - choIndex(b.char),
    );
    return sortedConsonants.map((c) => ({
      consonant: c,
      items: allVowels
        .map((v) => {
          const char = compose(c.char, v.char);
          if (!char) return null;
          return {
            id: `s_${c.id}_${v.id}`,
            char,
            roman: `${INITIAL_ROMAN[c.id] ?? ''}${v.roman}`,
            sound: `${c.char} + ${v.char}`,
            kind: Kind.syllable,
          };
        })
        .filter(Boolean),
    }));
  }
}

// ── Loading ─────────────────────────────────────────────────

const dataUrl = (name) => new URL(`../data/${name}`, import.meta.url);

async function fetchJson(name) {
  const res = await fetch(dataUrl(name));
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json();
}

let repo = null;
let wordsPromise = null;

export async function loadRepository() {
  if (!repo) repo = new Repository(await fetchJson('core.json'));
  return repo;
}

export const getRepository = () => repo;

/** Loads words.json once; resolves with the repository. */
export function loadWords() {
  if (!wordsPromise) {
    wordsPromise = fetchJson('words.json')
      .then((data) => {
        repo.setWords(data.words);
        return repo;
      })
      .catch((e) => {
        wordsPromise = null; // allow a retry (e.g. after going back online)
        throw e;
      });
  }
  return wordsPromise;
}
