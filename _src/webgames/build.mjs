// Builds the Flag Quiz and Capital Quiz browser games from countries.json.
// Run from the repository root:   node _src/webgames/build.mjs [--flags-from <dir>]
//
// Writes play/flag-quiz/ and play/capital-quiz/: index.html, the list page, game.js, data.js,
// the shared engine (app.js, logic.js, style.css copied from shared/), favicon.svg, LICENSE-flags.txt and flags/*.svg.
// og-image.png and apple-touch-icon.png come from make_images.mjs (run it after this when the look changes).
//
// Flags: the 4:3 SVGs of the MIT-licensed flag-icons set, as bundled by the Dart package country_flags 4.1.2
// (the Flutter apps use it). Default source: the local pub cache. Without it, the flags already in
// play/flag-quiz/flags/ are reused.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GAMES, SITE, ADSENSE, VERSION, REGIONS } from './games.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PUB = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Pub', 'Cache', 'hosted', 'pub.dev');
const argFlags = process.argv.indexOf('--flags-from');
const FLAG_SRC = argFlags > 0 ? process.argv[argFlags + 1] : path.join(PUB, 'country_flags-4.1.2', 'res', 'svg');
// The same flag-icons set, older release (flag 7.0.2, flag-icons 4.1.4). Used where its file is much smaller
// and the design is the same (see FLAG_PKG_PREFERRED).
const FLAG_SRC_OLD = path.join(PUB, 'flag-7.0.2', 'res', '4x3');
const FLAG_PKG_PREFERRED = new Set(['rs']);

const dataset = JSON.parse(fs.readFileSync(path.join(HERE, 'countries.json'), 'utf8')).countries;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = (buf) => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

function fill(s, vars) {
  return String(s).replace(/\{(count|levels|rest)\}/g, (m, k) => vars[k]);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/* ---------- flags ---------- */
function syria43() {
  // country_flags ships the 2025 flag of Syria at 3:2 without a viewBox; this is the same design at 4:3,
  // like the rest of the set: green, white and black bands with three red five-pointed stars.
  const star = (cx, cy, R) => {
    const r = R * 0.381966;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 ? r : R;
      pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(' ');
  };
  const R = 66.3; // star height 120 = 0.8 x 150 in the 600-high original
  const cy = 240 + 6.3; // centre the star's bounding box on the white band
  return '<svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-sy" viewBox="0 0 640 480">' +
    '<path fill="#000" d="M0 0h640v480H0z"/><path fill="#fff" d="M0 0h640v320H0z"/><path fill="#007a3d" d="M0 0h640v160H0z"/>' +
    `<path fill="#ce1126" d="M${star(160, cy, R)}zM${star(320, cy, R)}zM${star(480, cy, R)}z"/></svg>\n`;
}

function minifySvg(s) {
  s = s.replace(/<\?xml[^>]*\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/>\s+</g, '><').replace(/[ \t\r\n]{2,}/g, ' ').trim();
  if (s.length > 100000) {
    // large files exported with absolute coordinates only (e.g. coats of arms): one decimal is plenty at 640x480
    s = s.replace(/ d="([^"]*)"/g, (m, d) => (/[mlhvcsqta]/.test(d) ? m : ' d="' + d.replace(/-?\d*\.\d+/g, (x) => String(Math.round(parseFloat(x) * 10) / 10)) + '"'));
  }
  return s + '\n';
}

function flagSvg(code) {
  const lc = code.toLowerCase();
  if (lc === 'sy') return syria43();
  const old = path.join(FLAG_SRC_OLD, lc + '.svg');
  if (FLAG_PKG_PREFERRED.has(lc) && fs.existsSync(old)) return minifySvg(fs.readFileSync(old, 'utf8'));
  return minifySvg(fs.readFileSync(path.join(FLAG_SRC, lc + '.svg'), 'utf8'));
}

function writeFlags(dir, codes, cache) {
  const flagDir = path.join(dir, 'flags');
  fs.mkdirSync(flagDir, { recursive: true });
  const want = new Set(codes.map((c) => c.toLowerCase() + '.svg'));
  for (const f of fs.readdirSync(flagDir)) if (!want.has(f)) fs.rmSync(path.join(flagDir, f));
  for (const code of codes) fs.writeFileSync(path.join(flagDir, code.toLowerCase() + '.svg'), cache(code));
}

/* ---------- icons ---------- */
function favicon(game) {
  if (game.id === 'flag') {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="16" fill="#1F5FC4"/>' +
      '<rect x="15" y="12" width="4.5" height="42" rx="2.2" fill="#fff"/>' +
      '<path d="M19.5 14c7-4 12 3 19 0s9-2 11-1v20c-2-1-5-2-11 1s-12-4-19 0z" fill="#FF6B5B"/>' +
      '<path d="M19.5 14c7-4 12 3 19 0s9-2 11-1v6.7c-2-1-5-2-11 1s-12-4-19 0z" fill="#fff" opacity=".9"/>' +
      '<circle cx="17.2" cy="11" r="3.2" fill="#FFC93D"/></svg>\n';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" rx="16" fill="#2B3155"/>' +
    '<path d="M32 9c-9.4 0-17 7.4-17 16.6C15 38 32 55 32 55s17-17 17-29.4C49 16.4 41.4 9 32 9z" fill="#EBA918"/>' +
    '<circle cx="32" cy="25.5" r="11" fill="#fff"/>' +
    '<path d="m32 17.6 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" fill="#FF6B5B"/></svg>\n';
}

const FLAG_LICENSE = `Flag images
===========

The flag images in flags/ come from flag-icons (https://github.com/lipis/flag-icons),
as bundled by the Dart package country_flags 4.1.2 (MIT, Copyright (c) Arturo Grau)
and, for Serbia, by the Dart package flag 7.0.2 (flag-icons 4.1.4).

Changes made here: whitespace removed; in files over 100 kB with absolute path
coordinates, numbers rounded to one decimal place; the 2025 flag of Syria redrawn at
4:3 (the bundled file is 3:2), with the same colours and three red stars.

The MIT License (MIT)

Copyright (c) 2013 Panayiotis Lipiridis

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
`;

/* ---------- page parts ---------- */
const ICON_GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"/></svg>';
const ICON_GAMES = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';

function head(game, en, v, page) {
  const isList = page === 'list';
  const url = `${SITE}/play/${game.slug}/${isList ? game.listPage : ''}`;
  const title = isList ? `${en.list_title} – ${en.title}` : en.doc_title;
  const desc = isList ? en.list_desc : en.description;
  const ogImage = `${SITE}/play/${game.slug}/og-image.png`;
  const ld = isList ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebApplication', name: en.title, url: `${SITE}/play/${game.slug}/`,
    description: en.og_desc, applicationCategory: 'GameApplication', operatingSystem: 'Any', inLanguage: ['en', 'ko'],
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: "ggook's studio", url: `${SITE}/` },
  }).replace(/</g, '\\u003c')}</script>\n`;
  return `<!doctype html>
<html lang="en" data-game="${game.id}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="google-adsense-account" content="${ADSENSE}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="${game.themeColor}">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ggook's studio">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(isList ? en.list_desc : en.og_desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(en.title)}: ${esc(en.tagline)}">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(isList ? en.list_desc : en.og_desc)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Noto+Sans+KR:wght@500;600;700&display=swap">
<link rel="stylesheet" href="style.css?v=${v['style.css']}">
<script>(function(){try{var s=JSON.parse(localStorage.getItem('${game.prefix}settings')||'{}');var d=document.documentElement;if(s.theme==='light'||s.theme==='dark')d.setAttribute('data-theme',s.theme);var l=s.lang||((navigator.languages&&navigator.languages[0])||navigator.language||'');if(String(l).toLowerCase().indexOf('ko')===0)d.lang='ko';}catch(e){}})();</script>
<script src="logic.js?v=${v['logic.js']}" defer></script>
<script src="data.js?v=${v['data.js']}" defer></script>
<script src="game.js?v=${v['game.js']}" defer></script>
<script src="app.js?v=${v['app.js']}" defer></script>
${ld}</head>`;
}

function header(game, en, page) {
  const home = page === 'list'
    ? `<a class="top-link" href="./">${ICON_PLAY}<span data-t="play">Play</span></a>`
    : `<a class="top-link hide-sm" href="/play/">${ICON_GAMES}<span data-t="games">Browser games</span></a>`;
  return `<a class="skip-link" href="#main" data-t="skip">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="./#/"><img src="favicon.svg" alt="" width="32" height="32"><span data-t="title">${esc(en.title)}</span></a>
    <nav class="top-links" aria-label="Game">
      ${home}
      <button class="top-link lang" data-action="lang-toggle" data-t-attr="aria-label:lang_switch_label" aria-label="한국어로 보기"><span data-t="lang_switch">한국어</span></button>
      ${page === 'list' ? '' : `<a class="top-link icon-only" href="#/settings" data-t-attr="aria-label:settings" aria-label="Settings">${ICON_GEAR}</a>`}
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="foot">
  <div class="wrap">
    <nav aria-label="Site">
      <a href="/" data-t="studio">ggook's studio</a>
      <a href="/play/" data-t="games">Browser games</a>
      <a href="/privacy.html" data-t="privacy">Privacy Policy</a>
      <a href="LICENSE-flags.txt"><span data-t="flag_credit">Flag images</span>: flag-icons (MIT)</a>
    </nav>
    <p>© 2026 ggook's studio</p>
  </div>
</footer>
<div id="live" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
<div id="toast" class="toast" role="status" hidden></div>`;
}

function indexHtml(game, en, v) {
  return `${head(game, en, v, 'index')}
<body data-page="game">
${header(game, en, 'index')}
<main id="main">
  <div id="view" class="view" tabindex="-1">
    <div class="wrap"><div class="card" style="text-align:center">
      <h1>${esc(en.title)}</h1>
      <p class="muted">${esc(en.tagline)}</p>
      <noscript><p>This game needs JavaScript. You can still <a href="${game.listPage}">browse the list</a>.</p></noscript>
    </div></div>
  </div>
  <div class="wrap"><section id="about" class="card about">${en.about_html}</section></div>
</main>
${footer()}
</body>
</html>
`;
}

function listHtml(game, en, ko, entries, v) {
  const regionName = Object.fromEntries(REGIONS.map((r) => [r[0], r]));
  const byCode = Object.fromEntries(entries.map((e) => [e.code, e]));
  const items = [...entries].sort((a, b) => a.name.en.localeCompare(b.name.en, 'en')).map((e) => {
    const lc = e.code.toLowerCase();
    const r = regionName[e.region];
    const search = [e.code, e.name.en, e.name.ko, ...e.aliases.en, ...e.aliases.ko];
    if (game.id === 'capital') search.push(e.capital.en, e.capital.ko, ...(e.capitalNote ? [e.capitalNote.en, e.capitalNote.ko] : []));
    let extra = '';
    if (game.id === 'capital') {
      extra += `<p class="cap"><span class="lbl"><span class="lang-en">Capital</span><span class="lang-ko">수도</span></span><span class="n-en" lang="en">${esc(e.capital.en)}</span><span class="n-ko" lang="ko">${esc(e.capital.ko)}</span></p>`;
      if (e.capitalNote) {
        extra += `<p class="note${e.capitalNote.en ? '' : ' lang-ko'}">${e.capitalNote.en ? `<span class="lang-en">${esc(e.capitalNote.en)}</span>` : ''}${e.capitalNote.ko ? `<span class="lang-ko">${esc(e.capitalNote.ko)}</span>` : ''}</p>`;
      }
    } else if (e.lookalikes.length) {
      const looks = e.lookalikes.filter((c) => byCode[c]);
      const link = (c, l) => `<a href="#${c.toLowerCase()}">${esc(byCode[c].name[l])}</a>`;
      extra += `<p class="look"><span class="lang-en">Looks like: ${looks.map((c) => link(c, 'en')).join(', ')}</span><span class="lang-ko">비슷한 국기: ${looks.map((c) => link(c, 'ko')).join(', ')}</span></p>`;
    }
    const lvl = e[game.levelField];
    return `<li id="${lc}" data-en="${esc(e.name.en)}" data-ko="${esc(e.name.ko)}" data-region="${e.region}" data-search="${esc(search.join(' '))}"><article class="entry">
<div class="eflag"><img src="flags/${lc}.svg" alt="Flag of ${esc(e.name.en)}" loading="lazy" width="84" height="63"></div>
<div class="ebody"><h2><span class="n-en" lang="en">${esc(e.name.en)}</span><span class="n-ko" lang="ko">${esc(e.name.ko)}</span></h2>${extra}
<p class="meta"><span class="lang-en">${r[1]} · Level ${lvl}</span><span class="lang-ko">${r[2]} · 레벨 ${lvl}</span></p></div>
</article></li>`;
  }).join('\n');
  const chips = [['all', 'All', '전체'], ...REGIONS].map((r, i) =>
    `<button type="button" data-region="${r[0]}" aria-pressed="${i === 0}"><span class="lang-en">${r[1]}</span><span class="lang-ko">${r[2]}</span></button>`).join('');
  return `${head(game, en, v, 'list')}
<body data-page="list">
${header(game, en, 'list')}
<main id="main">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/" data-t="studio">ggook's studio</a><span aria-hidden="true">›</span><a href="/play/" data-t="games">Browser games</a><span aria-hidden="true">›</span><a href="./" data-t="title">${esc(en.title)}</a></nav>
    <div class="list-head">
      <h1 data-t="list_title">${esc(en.list_title)}</h1>
      <p class="lang-en">${esc(en.list_lead)}</p><p class="lang-ko">${esc(ko.list_lead)}</p>
      <p style="margin-top:12px"><a class="btn primary" href="./">${ICON_PLAY}<span data-t="list_play">${esc(en.list_play)}</span></a></p>
    </div>
    <div class="card filters" role="search">
      <label class="search"><span class="visually-hidden" data-t="search">Search</span>${ICON_SEARCH}<input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="${esc(en.search_ph)}" data-t-attr="placeholder:search_ph"></label>
      <div class="chips" id="regions" role="group" data-t-attr="aria-label:region" aria-label="Region">${chips}</div>
      <p class="count" id="count" aria-live="polite">${entries.length} countries</p>
    </div>
    <ul class="grid" id="list">
${items}
    </ul>
    <p class="empty card" id="empty" hidden data-t="none">No countries match your search.</p>
  </div>
</main>
${footer()}
</body>
</html>
`;
}

/* ---------- build ---------- */
const flagCache = new Map();
const flagFromCache = (code) => {
  if (!flagCache.has(code)) flagCache.set(code, flagSvg(code));
  return flagCache.get(code);
};
const haveSrc = fs.existsSync(FLAG_SRC);
if (!haveSrc) console.warn(`! flag source not found (${FLAG_SRC}); reusing play/flag-quiz/flags/`);
const reuseDir = path.join(ROOT, 'play', 'flag-quiz', 'flags');
const reuse = (code) => fs.readFileSync(path.join(reuseDir, code.toLowerCase() + '.svg'), 'utf8');

for (const game of GAMES) {
  const dir = path.join(ROOT, 'play', game.slug);
  const entries = dataset.filter((c) => game.includeNoCapital || c.capital);
  const levels = Math.max(...entries.map((e) => e[game.levelField]));
  const vars = { count: entries.length, levels, rest: entries.filter((e) => e[game.levelField] > game.appLevels).length };
  const str = {};
  for (const lang of ['en', 'ko']) {
    str[lang] = {};
    for (const [k, s] of Object.entries(game.str[lang])) str[lang][k] = fill(s, vars);
  }
  // data.js: what the game needs, nothing more
  const data = entries.map((e) => {
    const d = { c: e.code, lv: e[game.levelField], g: e[game.groupField], r: e.region, n: [e.name.en, e.name.ko] };
    if (e.the) d.the = 1; // English: "the United States"
    if (game.id === 'capital') {
      d.cap = [e.capital.en, e.capital.ko];
      if (e.capitalNote) d.note = [e.capitalNote.en, e.capitalNote.ko || e.capitalNote.en];
    } else if (e.lookalikes.length) {
      d.look = e.lookalikes;
    }
    return d;
  });
  const files = {};
  files['data.js'] = '/* Generated by _src/webgames/build.mjs from countries.json. Do not edit. */\nwindow.COUNTRIES=[\n' + data.map((d) => JSON.stringify(d)).join(',\n') + '\n];\n';
  const cfg = {
    id: game.id, slug: game.slug, prefix: game.prefix, listPage: game.listPage, lookalikes: game.lookalikes,
    appLevels: game.appLevels, version: VERSION, str,
  };
  files['game.js'] = '/* Generated by _src/webgames/build.mjs (settings and text from games.mjs). Do not edit. */\nwindow.GAME=' + JSON.stringify(cfg, null, 1) + ';\n';
  for (const f of ['app.js', 'logic.js', 'style.css']) files[f] = fs.readFileSync(path.join(HERE, 'shared', f), 'utf8');
  const v = Object.fromEntries(Object.entries(files).map(([k, s]) => [k, hash(s)]));
  files['index.html'] = indexHtml(game, str.en, v);
  files[game.listPage] = listHtml(game, str.en, str.ko, entries, v);
  files['favicon.svg'] = favicon(game);
  files['LICENSE-flags.txt'] = FLAG_LICENSE;
  for (const [f, s] of Object.entries(files)) write(path.join(dir, f), s);
  // remove list pages / files from an older build that are no longer produced
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.html') && !files[f]) fs.rmSync(path.join(dir, f));
  }
  const codes = entries.map((e) => e.code);
  if (haveSrc) writeFlags(dir, codes, flagFromCache);
  else if (game.slug !== 'flag-quiz') writeFlags(dir, codes, reuse);
  for (const img of ['og-image.png', 'apple-touch-icon.png']) {
    if (!fs.existsSync(path.join(dir, img))) console.warn(`! play/${game.slug}/${img} missing: run node _src/webgames/make_images.mjs`);
  }
  console.log(`play/${game.slug}/: ${entries.length} countries, ${levels} levels, ${codes.length} flags`);
}
