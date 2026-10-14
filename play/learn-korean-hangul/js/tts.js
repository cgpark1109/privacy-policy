// Korean pronunciation with the Web Speech API (speechSynthesis, ko-KR).
// Port of lib/services/tts_service.dart + speakItem() in widgets/common.dart.

import { ttsSlow, hasLegacyBridge, legacyBridge } from './storage.js';

// The app uses flutter_tts rates 0.5 (normal) / 0.3 (slow) and caps consonant
// names at 0.35, i.e. 1.0x / 0.6x / 0.7x of the Android engine's normal speed.
// Web voices speak a little faster, so the scale starts at 0.9.
const RATE_NORMAL = 0.9;
const RATE_SLOW = 0.55;
const RATE_CLEAR = 0.65;

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let koreanVoice = null;
let voicesKnown = false; // the voice list has loaded (it may load late)
let warned = false;
let warn = () => {};
const statusListeners = new Set();

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (voices.length === 0) return;
  voicesKnown = true;
  const ko = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  koreanVoice =
    ko.find((v) => v.lang === 'ko-KR' && v.localService) ||
    ko.find((v) => v.lang === 'ko-KR') ||
    ko[0] ||
    null;
  statusListeners.forEach((fn) => fn(status()));
}

if (synth) {
  pickVoice();
  synth.addEventListener?.('voiceschanged', pickVoice);
}

/** `onWarning(message)` is called (once per session) when audio can't play. */
export function initTts({ onWarning }) {
  warn = onWarning;
}

/**
 * 'bridge' (old app WebView), 'ok', 'checking' (voice list not loaded yet),
 * 'no-korean' (voices loaded, none Korean) or 'unsupported'.
 */
export function status() {
  if (hasLegacyBridge()) return 'bridge';
  if (!synth) return 'unsupported';
  if (koreanVoice) return 'ok';
  return voicesKnown ? 'no-korean' : 'checking';
}

export const voiceName = () => (koreanVoice ? `${koreanVoice.name} (${koreanVoice.lang})` : null);

export function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

const MESSAGES = {
  unsupported: 'Audio isn’t supported in this browser. Try Chrome, Edge or Safari.',
  'no-korean':
    'No Korean voice found. Add a Korean text-to-speech voice in your device or browser settings to hear audio.',
};

function warnOnce(kind) {
  if (warned) return;
  warned = true;
  warn(MESSAGES[kind] ?? MESSAGES['no-korean']);
}

/**
 * Speaks `text`. Uses the slow rate when `slow` is set or the user chose
 * "Slow" in Settings; `clear` caps the rate so consonant names (미음, 기역)
 * don't run together.
 */
export function speak(text, { slow = false, clear = false } = {}) {
  if (!text) return;
  const useSlow = slow || ttsSlow();

  if (hasLegacyBridge()) {
    legacyBridge(useSlow ? 'speakSlow' : 'speakText', text);
    return;
  }
  if (!synth) {
    warnOnce('unsupported');
    return;
  }
  if (voicesKnown && !koreanVoice) {
    // Still try: some browsers pick a Korean voice by `lang` alone.
    warnOnce('no-korean');
  }

  let rate = useSlow ? RATE_SLOW : RATE_NORMAL;
  if (clear && rate > RATE_CLEAR) rate = RATE_CLEAR;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ko-KR';
  if (koreanVoice) utterance.voice = koreanVoice;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onerror = (e) => {
    // 'interrupted'/'canceled' = a newer utterance replaced this one;
    // 'not-allowed' = no user gesture yet (e.g. a deep link auto-speaking).
    if (['language-unavailable', 'voice-unavailable', 'synthesis-unavailable'].includes(e.error)) {
      warnOnce('no-korean');
    }
  };
  synth.cancel();
  // Chrome sometimes stays paused after a tab switch.
  if (synth.paused) synth.resume();
  synth.speak(utterance);
}

export function stop() {
  if (hasLegacyBridge()) {
    legacyBridge('stopTts');
    return;
  }
  synth?.cancel();
}

/** Speaks a letter/syllable/word the way the app does (letter names for consonants). */
export function speakItem(repo, item, { slow = false } = {}) {
  speak(repo.speakText(item), {
    slow,
    clear: item.kind === 'consonant' || item.kind === 'doubleConsonant',
  });
}
