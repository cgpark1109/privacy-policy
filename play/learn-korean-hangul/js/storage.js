// Progress + settings in localStorage (port of lib/services/storage_service.dart).
//
// Keys:
//   stage_<id>             {"stars","score"}  same key/format as the app and the
//                          old web version, so existing stars carry over as-is.
//   notice_seen_<version>  "true"             same as the old web version.
//   lkh_tts_slow           "1" | "0"          was `ttsSpeed` ("slow"/"normal").
//   lkh_theme_mode         system|light|dark  new (the app's `theme_mode`).
//
// New keys are prefixed `lkh_` because every *.github.io project of the same
// owner shares one localStorage.

const STAGE_PREFIX = 'stage_';
const STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const TTS_SLOW_KEY = 'lkh_tts_slow';
const THEME_KEY = 'lkh_theme_mode';
const NOTICE_PREFIX = 'notice_seen_';
const LEGACY_TTS_KEY = 'ttsSpeed';

export const THEME_MODES = ['system', 'light', 'dark'];

// localStorage can throw (privacy mode, disabled storage); fall back to memory
// so the site still works for the session.
const memory = new Map();
const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memory.has(key) ? memory.get(key) : null;
    }
  },
  set(key, value) {
    memory.set(key, String(value));
    try {
      localStorage.setItem(key, String(value));
    } catch {
      /* memory only */
    }
  },
  remove(key) {
    memory.delete(key);
    try {
      localStorage.removeItem(key);
    } catch {
      /* memory only */
    }
  },
};

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Subscribe to progress/settings changes; returns an unsubscribe function. */
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** One-time migration of old web keys. Safe to call on every start. */
export function migrateLegacy() {
  const legacySpeed = store.get(LEGACY_TTS_KEY);
  if (legacySpeed != null) {
    if (store.get(TTS_SLOW_KEY) == null) store.set(TTS_SLOW_KEY, legacySpeed === 'slow' ? '1' : '0');
    store.remove(LEGACY_TTS_KEY);
  }
}

// ── Progress ───────────────────────────────────────────────

const toInt = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : 0);

/** {stars, score} for a stage, or null if never played. */
export function resultFor(stageId) {
  const raw = store.get(`${STAGE_PREFIX}${stageId}`);
  if (raw == null) return null;
  try {
    const json = JSON.parse(raw);
    return { stars: Math.min(3, toInt(json?.stars)), score: toInt(json?.score) };
  } catch {
    return null;
  }
}

export const starsFor = (stageId) => resultFor(stageId)?.stars ?? 0;

export const totalStars = () => STAGE_IDS.reduce((sum, id) => sum + starsFor(id), 0);

export const isStageUnlocked = (stageId) => stageId <= 1 || starsFor(stageId - 1) > 0;

/** Keeps the best stars and best score independently (a weak retry never re-locks). */
export function saveStageResult(stageId, stars, score) {
  const prev = resultFor(stageId);
  const best = {
    stars: prev == null || stars > prev.stars ? stars : prev.stars,
    score: prev == null || score > prev.score ? score : prev.score,
  };
  store.set(`${STAGE_PREFIX}${stageId}`, JSON.stringify(best));
  legacyBridge('saveProgress', stageId, best.stars, best.score);
  notify();
  return best;
}

export function resetProgress() {
  for (const id of STAGE_IDS) store.remove(`${STAGE_PREFIX}${id}`);
  notify();
}

// ── Settings ───────────────────────────────────────────────

export const ttsSlow = () => store.get(TTS_SLOW_KEY) === '1';

export function setTtsSlow(value) {
  store.set(TTS_SLOW_KEY, value ? '1' : '0');
  notify();
}

export function themeMode() {
  const mode = store.get(THEME_KEY);
  return THEME_MODES.includes(mode) ? mode : 'system';
}

export function setThemeMode(mode) {
  store.set(THEME_KEY, THEME_MODES.includes(mode) ? mode : 'system');
  notify();
}

// ── Notice ─────────────────────────────────────────────────

export const isNoticeSeen = (version) => store.get(`${NOTICE_PREFIX}${version}`) === 'true';

export const markNoticeSeen = (version) => store.set(`${NOTICE_PREFIX}${version}`, 'true');

// ── Old Android app (1.x WebView) ──────────────────────────
// Version 1.x of the app showed these pages in a WebView with a
// `flutter_inappwebview` bridge. If an old install still opens the site,
// keep saving stars to the app and use its native TTS / browser handlers.

export const hasLegacyBridge = () =>
  typeof window !== 'undefined' && typeof window.flutter_inappwebview?.callHandler === 'function';

export function legacyBridge(handler, ...args) {
  if (!hasLegacyBridge()) return Promise.resolve(undefined);
  try {
    return Promise.resolve(window.flutter_inappwebview.callHandler(handler, ...args)).catch(() => undefined);
  } catch {
    return Promise.resolve(undefined);
  }
}

/** Merges stars kept by an old app install (best of both). */
export async function importLegacyAppProgress() {
  if (!hasLegacyBridge()) return;
  let data = await legacyBridge('getProgress');
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return;
    }
  }
  if (!data || typeof data !== 'object') return;
  let changed = false;
  for (const id of STAGE_IDS) {
    const entry = data[id] ?? data[String(id)];
    if (!entry) continue;
    const prev = resultFor(id);
    const stars = Math.min(3, toInt(entry.stars));
    const score = toInt(entry.score);
    if (!prev || stars > prev.stars || score > prev.score) {
      store.set(`${STAGE_PREFIX}${id}`, JSON.stringify({
        stars: Math.max(stars, prev?.stars ?? 0),
        score: Math.max(score, prev?.score ?? 0),
      }));
      changed = true;
    }
  }
  if (changed) notify();
}
