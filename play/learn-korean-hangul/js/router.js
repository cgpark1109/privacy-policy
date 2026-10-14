// Hash router: #/learn, #/quiz/3, … Works under any sub-path (GitHub Pages
// project site, a copy in another folder) because nothing depends on the
// path part of the URL.
//
// History entries are tagged with their depth so the in-app back arrow can
// use history.back() when there is an in-app page behind it, and otherwise
// go to the screen's parent (e.g. after opening a deep link).

import { isDialogOpen } from './ui.js';

const ROUTES = [
  { re: /^\/learn$/, view: 'learn' },
  { re: /^\/learn\/(consonants|double-consonants|vowels|compound-vowels)$/, view: 'category', keys: ['list'] },
  { re: /^\/learn\/syllables(?:\/(\d+))?$/, view: 'syllables', keys: ['group'] },
  { re: /^\/item\/(consonants|double-consonants|vowels|compound-vowels|syllables-\d+|words)\/(\d+)$/, view: 'detail', keys: ['list', 'index'] },
  { re: /^\/stroke\/(.+)$/, view: 'stroke', keys: ['char'] },
  { re: /^\/quiz$/, view: 'stages' },
  { re: /^\/quiz\/(\d+)$/, view: 'quiz', keys: ['stage'] },
  { re: /^\/quiz\/(\d+)\/result$/, view: 'result', keys: ['stage'] },
  { re: /^\/words$/, view: 'words' },
  { re: /^\/settings$/, view: 'settings' },
];

const DEFAULT_PATH = '/learn';
const APP_NAME = 'Learn Korean - Hangul';

let ctx = null;
let current = null; // { path, view, name }
let depth = 0;
let pendingReplace = false;
let renderToken = 0;
let firstRender = true;
const keepAlive = new Map();
const scrollPositions = new Map();

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  let path = pathPart || DEFAULT_PATH;
  if (!path.startsWith('/')) path = `/${path}`;
  return { path, query: new URLSearchParams(queryPart), full: raw || DEFAULT_PATH };
}

function match(path) {
  for (const route of ROUTES) {
    const m = route.re.exec(path);
    if (!m) continue;
    const params = {};
    (route.keys ?? []).forEach((k, i) => {
      if (m[i + 1] !== undefined) params[k] = decodeURIComponent(m[i + 1]);
    });
    return { name: route.view, params };
  }
  return null;
}

export const currentPath = () => current?.full ?? parseHash().full;

/** Navigates to `path` (e.g. '/quiz/3'), adding a history entry. */
export function go(path) {
  if (`#${path}` === location.hash) return;
  location.hash = path;
}

/** Navigates without adding a history entry. */
export function replace(path) {
  if (`#${path}` === location.hash) {
    render(); // same URL: re-render (e.g. "Try again")
    return;
  }
  pendingReplace = true;
  location.replace(`#${path}`);
}

/** In-app back: history.back() if an in-app entry is behind us, else `fallback`. */
export function back(fallback = DEFAULT_PATH) {
  if (depth > 0) history.back();
  else replace(fallback);
}

/** Path of the in-app page this entry was opened from (or null). */
export const previousPath = () => history.state?.prev ?? null;

export function start(context) {
  ctx = context;
  if (!location.hash || location.hash === '#' || location.hash === '#/') {
    history.replaceState({ depth: 0, prev: null }, '', `#${DEFAULT_PATH}`);
  } else if (typeof history.state?.depth !== 'number') {
    history.replaceState({ depth: 0, prev: null }, '');
  }
  depth = history.state?.depth ?? 0;
  window.addEventListener('hashchange', onHashChange);
  document.addEventListener('keydown', onKeyDown);
  render();
}

async function onHashChange() {
  const st = history.state;
  const isNewEntry = typeof st?.depth !== 'number';
  const replaced = pendingReplace;
  pendingReplace = false;

  // Leaving a screen that asks first (an unfinished quiz)?
  if (current?.view?.beforeLeave && !current.leaving) {
    const ok = await current.view.beforeLeave();
    if (!ok) {
      // Put the screen's URL back without re-rendering it.
      const entryDepth = isNewEntry ? depth + (replaced ? 0 : 1) : st.depth;
      depth = entryDepth + 1;
      history.pushState({ depth, prev: current.prev }, '', `#${current.full}`);
      return;
    }
  }

  if (isNewEntry) {
    const prev = replaced ? current?.prev ?? null : current?.path ?? null;
    if (!replaced) depth += 1;
    history.replaceState({ depth, prev }, '');
  } else {
    depth = st.depth;
  }
  render({ restoreScroll: !isNewEntry });
}

/** Lets a view leave without its beforeLeave check (after it confirmed). */
export function allowLeave() {
  if (current) current.leaving = true;
}

function onKeyDown(e) {
  if (isDialogOpen() || !current?.view) return;
  if (e.defaultPrevented || e.isComposing) return;
  const view = current.view;
  if (view.onKey?.(e)) {
    e.preventDefault();
    return;
  }
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if (e.key === 'Escape' && view.sub && !typing) {
    e.preventDefault();
    if (view.onBack) view.onBack();
    else back(view.parent);
  }
}

async function render({ restoreScroll = false } = {}) {
  const token = ++renderToken;
  const { path, query, full } = parseHash();
  const matched = match(path);
  if (!matched) {
    replace(DEFAULT_PATH);
    return;
  }

  if (current) {
    scrollPositions.set(`${current.depth}|${current.full}`, window.scrollY);
    current.view?.onHide?.();
    if (!current.view?.keepAlive) current.view?.destroy?.();
  }

  let view;
  try {
    const cached = keepAlive.get(matched.name);
    if (cached) {
      view = cached;
      await view.onShow?.(matched.params, query);
    } else {
      const mod = await import(`./views/${matched.name}.js`);
      if (token !== renderToken) return;
      view = await mod.default({ ...ctx, params: matched.params, query });
      if (view?.keepAlive) keepAlive.set(matched.name, view);
    }
  } catch (err) {
    console.error(err);
    if (token !== renderToken) return;
    view = errorView(err);
  }
  if (token !== renderToken) {
    if (!view?.keepAlive) view?.destroy?.();
    return;
  }
  if (view?.redirect) {
    if (view.message) ctx.toast(view.message);
    replace(view.redirect);
    return;
  }

  current = { path, full, name: matched.name, view, depth, prev: history.state?.prev ?? null };

  const main = document.getElementById('main');
  main.replaceChildren(view.el);
  document.body.classList.toggle('is-sub', Boolean(view.sub));
  document.body.dataset.view = matched.name;
  document.title = view.title ? `${view.title} · ${APP_NAME}` : `${APP_NAME}: learn the Korean alphabet`;
  for (const link of document.querySelectorAll('.tabbar__item')) {
    if (link.dataset.tab === view.tab) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  const saved = scrollPositions.get(`${depth}|${full}`);
  window.scrollTo(0, restoreScroll && saved != null ? saved : 0);

  view.onMount?.();

  // Move focus to the new screen's heading so screen readers announce it
  // (not on first load, so "Skip to content" stays the first tab stop).
  if (!firstRender && !view.manageFocus) {
    const heading = view.el.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  firstRender = false;
}

function errorView(err) {
  const el = document.createElement('div');
  el.className = 'page';
  el.innerHTML = `<div class="empty-state">
      <h1 class="tab-header__title">Something went wrong</h1>
      <p>Couldn’t load this screen. Check your connection and try again.</p>
      <p><button type="button" class="btn btn--filled" data-retry>Try again</button></p>
    </div>`;
  el.querySelector('[data-retry]').addEventListener('click', () => location.reload());
  return { el, title: 'Error', sub: false, error: err };
}
