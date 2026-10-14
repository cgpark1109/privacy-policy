// Small DOM helpers shared by the views.

import { isJamo } from './hangul.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML (content and attribute values). */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Inline SVG icon from the sprite in index.html (decorative). */
export const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** Korean text, marked up so screen readers and fonts treat it as Korean. */
export const ko = (text, cls = '') =>
  `<span lang="ko"${cls ? ` class="${cls}"` : ''}>${esc(text)}</span>`;

/** Compatibility jamo (ㄱ, ㅏ …) render small in most fonts; size them up. */
export const glyphClass = (char) => (isJamo(char) ? 'glyph glyph--jamo' : 'glyph');

/** 2400 → "2,400" (same as the app's _formatCount). */
export const formatCount = (n) => n.toLocaleString('en-US');

export function starRow(stars, { max = 3, cls = '' } = {}) {
  let html = '';
  for (let i = 0; i < max; i++) {
    html += icon(i < stars ? 'star' : 'star-outline', i < stars ? 'star star--on' : 'star');
  }
  return `<span class="stars ${cls}" role="img" aria-label="${stars} of ${max} stars">${html}</span>`;
}

export const qs = (root, sel) => root.querySelector(sel);
export const qsa = (root, sel) => [...root.querySelectorAll(sel)];

/** Creates an element from an HTML string (single root). */
export function html(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// ── Toast (the app's SnackBar) ─────────────────────────────

let toastTimer = null;
let toastShowTimer = null;
export function toast(message, duration = 3200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = '';
  clearTimeout(toastShowTimer);
  clearTimeout(toastTimer);
  // Set the text a moment later so screen readers announce repeats. (Timers,
  // not requestAnimationFrame: rAF pauses in background tabs.)
  toastShowTimer = setTimeout(() => {
    el.textContent = message;
    el.classList.add('is-visible');
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), duration);
  }, 50);
}

// ── Dialog (the app's AlertDialog) ─────────────────────────

let dialogResolve = null;

/**
 * Modal dialog. `actions` = [{label, value, primary?, danger?}], rendered in
 * order (the last one is the default focus unless one is `autofocus`).
 * Resolves with the chosen action's value, or `null` on Esc / backdrop click.
 */
export function showDialog({ title, message, actions, centered = false }) {
  const dialog = document.getElementById('dialog');
  if (dialog.open) closeDialog(null);
  dialog.className = `dialog${centered ? ' dialog--centered' : ''}`;
  dialog.innerHTML = `
    <form method="dialog" class="dialog__body">
      <h2 class="dialog__title" id="dialog-title">${esc(title)}</h2>
      <p class="dialog__message" id="dialog-message">${esc(message)}</p>
      <div class="dialog__actions">
        ${actions.map((a, i) => `<button type="button" data-i="${i}" class="btn ${
          a.primary ? 'btn--filled' : a.danger ? 'btn--text btn--danger' : 'btn--text'}"${
          a.autofocus ? ' autofocus' : ''}>${esc(a.label)}</button>`).join('')}
      </div>
    </form>`;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  dialog.setAttribute('aria-describedby', 'dialog-message');

  return new Promise((resolve) => {
    dialogResolve = resolve;
    dialog.querySelectorAll('button[data-i]').forEach((btn) => {
      btn.addEventListener('click', () => closeDialog(actions[Number(btn.dataset.i)].value));
    });
    dialog.onclick = (e) => {
      if (e.target === dialog) closeDialog(null); // backdrop
    };
    dialog.oncancel = (e) => {
      e.preventDefault();
      closeDialog(null);
    };
    dialog.showModal();
    if (!dialog.querySelector('[autofocus]')) dialog.querySelector('.dialog__actions button:last-child')?.focus();
  });
}

export function closeDialog(value) {
  const dialog = document.getElementById('dialog');
  if (dialog.open) dialog.close();
  const resolve = dialogResolve;
  dialogResolve = null;
  resolve?.(value);
}

export const isDialogOpen = () => document.getElementById('dialog')?.open ?? false;

/** Two-button confirmation; resolves true when confirmed. */
export async function confirmDialog({ title, message, confirm, cancel = 'Cancel', danger = false }) {
  const value = await showDialog({
    title,
    message,
    actions: [
      // The safe choice gets focus, so Enter never confirms by accident.
      { label: cancel, value: false, autofocus: true },
      { label: confirm, value: true, danger },
    ],
  });
  return value === true;
}
