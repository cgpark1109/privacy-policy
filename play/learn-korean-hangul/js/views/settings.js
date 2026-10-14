// Settings tab (lib/screens/settings/settings_screen.dart).

import { esc, icon, html, confirmDialog } from '../ui.js';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.kysystemstudio.learnkorean&referrer=utm_source%3Dkysystemstudio%26utm_medium%3Dwebapp%26utm_campaign%3Dweb_version';
const STUDIO_URL = 'https://kysystemstudio.com/games/learn-korean-hangul/';
const PRIVACY_URL = 'https://kysystemstudio.com/privacy.html';

const segmented = (name, legend, options, value) => `
  <fieldset class="segmented">
    <legend class="sr-only">${esc(legend)}</legend>
    ${options.map((o) => `<label class="segmented__option">
      <input type="radio" name="${name}" value="${o.value}"${o.value === value ? ' checked' : ''}>
      <span class="segmented__label">${o.icon ? icon(o.icon) : ''}<span>${esc(o.label)}</span></span>
    </label>`).join('')}
  </fieldset>`;

const newTab = '<span class="sr-only"> (opens in a new tab)</span>';

export default function settingsView(ctx) {
  const { storage, tts, repo } = ctx;

  const el = html(`<div class="page">
    <header class="tab-header"><h1 class="tab-header__title" tabindex="-1">Settings</h1></header>

    <h2 class="section-label" id="appearance-label">Appearance</h2>
    <div class="card card--pad" role="group" aria-labelledby="appearance-label">
      ${segmented('theme', 'Theme', [
        { value: 'system', label: 'System', icon: 'auto' },
        { value: 'light', label: 'Light', icon: 'light' },
        { value: 'dark', label: 'Dark', icon: 'dark' },
      ], storage.themeMode())}
    </div>

    <h2 class="section-label" id="sound-label">Sound</h2>
    <div class="card" role="group" aria-labelledby="sound-label">
      <div class="setting-row">
        <span class="setting-row__label" id="speed-label">Speech speed</span>
        ${segmented('speed', 'Speech speed', [
          { value: 'normal', label: 'Normal' },
          { value: 'slow', label: 'Slow' },
        ], storage.ttsSlow() ? 'slow' : 'normal')}
      </div>
      <div class="divider"></div>
      <p class="setting-note" data-voice aria-live="polite"></p>
    </div>

    <h2 class="section-label">Progress</h2>
    <div class="card">
      <button type="button" class="list-btn list-btn--danger" data-reset>${icon('restart')}<span>Reset quiz progress</span></button>
    </div>

    <h2 class="section-label">About</h2>
    <div class="card">
      <div class="info-row"><span>Version</span><span>${esc(repo.appVersion)} (web)</span></div>
      <div class="divider"></div>
      <div class="info-row"><span>Developer</span><span>GGOOK's Studio</span></div>
      <div class="divider"></div>
      <a class="list-btn list-btn--link" href="${PRIVACY_URL}" target="_blank" rel="noopener"><span>Privacy Policy</span>${newTab}${icon('open', 'list-btn__trail')}</a>
      <div class="divider"></div>
      <a class="list-btn list-btn--link" href="${STUDIO_URL}" target="_blank" rel="noopener"><span>GGOOK's Studio website</span>${newTab}${icon('open', 'list-btn__trail')}</a>
    </div>

    <div class="card get-app-inline get-app-inline--settings">
      <img src="img/icon-192.png" width="48" height="48" alt="" class="get-app-inline__icon">
      <div class="get-app-inline__body">
        <p class="get-app-inline__title">Learn Korean - Hangul for Android</p>
        <p class="get-app-inline__text">Works offline. Your quiz stars on this site stay in this browser.</p>
      </div>
      <a class="btn btn--outlined btn--small" href="${PLAY_URL}" target="_blank" rel="noopener">${icon('shop')}<span>Get it on Google Play</span>${newTab}</a>
    </div>
  </div>`);

  const voiceEl = el.querySelector('[data-voice]');
  let settled = false;
  function renderVoice() {
    let s = tts.status();
    if (s === 'checking' && settled) s = 'unknown';
    const text = {
      ok: `Korean voice: ${tts.voiceName()}`,
      bridge: 'Audio uses the app’s Korean voice.',
      checking: 'Checking for a Korean voice…',
      unknown: 'If you hear no sound, add a Korean text-to-speech voice in your system or browser settings.',
      'no-korean': 'No Korean voice found on this device. Add a Korean text-to-speech voice in your system or browser settings to hear audio.',
      unsupported: 'This browser can’t play speech. Try Chrome, Edge or Safari.',
    }[s];
    voiceEl.textContent = text;
    voiceEl.classList.toggle('setting-note--warn', s === 'no-korean' || s === 'unsupported');
  }
  renderVoice();
  const offVoice = tts.onStatusChange(renderVoice);
  // Voices may never "change" in some browsers; settle the message.
  const settle = setTimeout(() => {
    settled = true;
    renderVoice();
  }, 1500);

  el.addEventListener('change', (e) => {
    const input = e.target;
    if (input.name === 'theme') storage.setThemeMode(input.value);
    if (input.name === 'speed') {
      storage.setTtsSlow(input.value === 'slow');
      tts.speak('안녕하세요');
    }
  });

  el.querySelector('[data-reset]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Reset quiz progress?',
      message: 'All stars and best scores will be erased. This cannot be undone.',
      confirm: 'Reset',
      danger: true,
    });
    if (!ok) return;
    storage.resetProgress();
    ctx.toast('Progress reset');
  });

  return {
    el,
    title: 'Settings',
    tab: 'settings',
    destroy() {
      offVoice();
      clearTimeout(settle);
    },
  };
}
