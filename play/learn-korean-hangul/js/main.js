// App bootstrap: data, settings, theme, notice, router.

import { loadRepository, loadWords } from './data.js';
import * as storage from './storage.js';
import * as tts from './tts.js';
import * as router from './router.js';
import { toast, showDialog } from './ui.js';

// ── Theme (System / Light / Dark, like the app) ─────────────

const darkQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

function applyTheme() {
  const mode = storage.themeMode();
  const dark = mode === 'dark' || (mode === 'system' && darkQuery?.matches);
  const root = document.documentElement;
  const theme = dark ? 'dark' : 'light';
  if (root.dataset.theme !== theme) {
    root.dataset.theme = theme;
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#1C1814' : '#F5F0E8');
}

// ── Notice (notice.json, same file and rules as the app) ────
// The file is shared with the Android app; this code only reads it.

const notice = {
  banner: null, // {message, link}
  dismissed: false,
  listeners: new Set(),
  dismissBanner() {
    this.dismissed = true;
    this.listeners.forEach((fn) => fn());
  },
  get activeBanner() {
    return this.dismissed ? null : this.banner;
  },
};

/** Banner links name a tab (`words`) or an old page (`words.html`). */
export function noticeLinkToPath(link) {
  if (!link) return null;
  const name = String(link).replace(/^\.?\//, '').replace(/\.html$/, '').split(/[?#]/)[0];
  const map = {
    learn: '/learn', index: '/learn', quiz: '/quiz', words: '/words', settings: '/settings',
    consonants: '/learn/consonants', 'double-consonants': '/learn/double-consonants',
    vowels: '/learn/vowels', syllables: '/learn/syllables', 'free-study': '/learn/compound-vowels',
  };
  return map[name] ?? null;
}

async function loadNotice() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`notice.json?t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return;
    const json = await res.json();
    const banner = json?.banner;
    if (banner?.active === true) {
      notice.banner = { message: String(banner.message ?? ''), link: banner.link ?? null };
      notice.listeners.forEach((fn) => fn());
    }
    const popup = json?.popup;
    if (popup?.active === true) {
      const version = String(popup.version ?? '');
      if (!storage.isNoticeSeen(version)) {
        await showDialog({
          title: String(popup.title ?? ''),
          message: String(popup.message ?? ''),
          actions: [{ label: String(popup.button ?? 'OK'), value: true, primary: true }],
          centered: true,
        });
        storage.markNoticeSeen(version);
      }
    }
  } catch {
    /* offline etc.: no notice */
  }
}

// ── Old app WebView: open external links with the app's handler ──

function routeExternalLinksThroughLegacyApp() {
  document.addEventListener('click', (e) => {
    if (!storage.hasLegacyBridge()) return;
    const a = e.target.closest?.('a[href^="http"]');
    if (!a || a.origin === location.origin) return;
    e.preventDefault();
    storage.legacyBridge('openExternalUrl', a.href);
  });
}

// ── Boot ─────────────────────────────────────────────────────

async function boot() {
  storage.migrateLegacy();
  applyTheme();
  darkQuery?.addEventListener?.('change', applyTheme);
  storage.onChange(applyTheme);
  tts.initTts({ onWarning: (msg) => toast(msg, 6000) });
  routeExternalLinksThroughLegacyApp();

  let repo;
  try {
    repo = await loadRepository();
  } catch (e) {
    console.error(e);
    document.getElementById('main').innerHTML = `<div class="page"><div class="empty-state">
      <h1 class="tab-header__title">Couldn’t load the lessons</h1>
      <p>Check your internet connection and reload the page.</p>
      <p><button type="button" class="btn btn--filled" onclick="location.reload()">Reload</button></p>
    </div></div>`;
    return;
  }

  storage.importLegacyAppProgress();

  const ctx = {
    repo,
    storage,
    tts,
    toast,
    notice,
    noticeLinkToPath,
    loadWords,
    router,
    session: {}, // e.g. the last quiz result, handed to the result screen
    speakItem: (item, opts) => tts.speakItem(repo, item, opts),
  };
  router.start(ctx);

  loadNotice();

  // Words are needed by the Words tab, example words and word quizzes;
  // fetch them once the first screen is up.
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200));
  idle(() => loadWords().catch(() => {}));
}

boot();
