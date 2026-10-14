// Renders og-image.png (1200x630) and apple-touch-icon.png (180x180) for both games with headless
// Microsoft Edge or Google Chrome. Run after build.mjs, from the repository root:
//   node _src/webgames/make_images.mjs
// Set BROWSER=<path to msedge.exe/chrome.exe> if neither is found. The PNGs are committed, so this only
// needs to run again when the look or the counts change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const candidates = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const BROWSER = candidates.find((p) => fs.existsSync(p));
if (!BROWSER) { console.error('No Edge/Chrome found; set BROWSER=...'); process.exit(1); }

const C = JSON.parse(fs.readFileSync(path.join(HERE, 'countries.json'), 'utf8')).countries;
const by = Object.fromEntries(C.map((c) => [c.code, c]));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webgames-img-'));

function shot(html, out, w, h) {
  const file = path.join(tmp, path.basename(out) + '.html');
  fs.writeFileSync(file, html);
  execFileSync(BROWSER, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${path.join(tmp, 'profile')}`, `--window-size=${w},${h}`, '--virtual-time-budget=4000',
    `--screenshot=${out}`, pathToFileURL(file).href], { stdio: 'ignore' });
  console.log('wrote', path.relative(ROOT, out), fs.statSync(out).size, 'bytes');
}

const FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Noto+Sans+KR:wght@700&display=block">';
const base = `*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:Poppins,'Noto Sans KR','Segoe UI',sans-serif;color:#2B3155;
background:linear-gradient(160deg,#7FA6E6 0%,#C9C7F0 50%,#FDE3EC 100%);display:flex;align-items:center;padding:0 70px;gap:50px}
.l{flex:1;min-width:0}.icon{width:110px;height:110px;border-radius:28px;box-shadow:0 10px 30px rgba(43,49,85,.3)}
h1{font-size:78px;line-height:1.05;margin-top:26px;letter-spacing:-1px}.sub{font-size:31px;font-weight:600;margin-top:12px}
.ko{font-family:'Noto Sans KR',sans-serif;font-size:26px;opacity:.85;margin-top:6px}.pill{display:inline-block;margin-top:30px;padding:12px 24px;border-radius:999px;font-size:22px;font-weight:700}
.studio{font-size:20px;font-weight:600;margin-top:18px;opacity:.8}`;

for (const slug of ['flag-quiz', 'capital-quiz']) {
  const dir = path.join(ROOT, 'play', slug);
  const flag = (code) => pathToFileURL(path.join(dir, 'flags', code.toLowerCase() + '.svg')).href;
  const icon = pathToFileURL(path.join(dir, 'favicon.svg')).href;
  const game = JSON.parse(fs.readFileSync(path.join(dir, 'game.js'), 'utf8').replace(/^[\s\S]*?window\.GAME=/, '').replace(/;\s*$/, ''));
  const en = game.str.en;
  const ko = game.str.ko;
  let right;
  if (slug === 'flag-quiz') {
    const codes = ['TD', 'RO', 'JP', 'BR', 'KR', 'NZ', 'AU', 'CA', 'ID', 'MC', 'IE', 'CI'];
    right = `<div style="display:grid;grid-template-columns:repeat(3,150px);gap:16px;transform:rotate(-4deg)">${codes.slice(0, 9).map((c) =>
      `<div style="width:150px;height:112px;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(43,49,85,.25);background:#fff"><img src="${flag(c)}" style="width:100%;height:100%;object-fit:cover"></div>`).join('')}</div>`;
  } else {
    const rows = ['ZA', 'BO', 'AU', 'KR'].map((c) => by[c]);
    right = `<div style="display:grid;gap:14px;width:470px">${rows.map((c) =>
      `<div style="display:flex;align-items:center;gap:18px;background:rgba(255,255,255,.95);border-radius:20px;padding:14px 20px;box-shadow:0 8px 20px rgba(43,49,85,.18)">
      <img src="${flag(c.code)}" style="width:76px;height:57px;border-radius:8px;object-fit:cover;box-shadow:0 0 0 1px rgba(43,49,85,.15)">
      <div style="min-width:0"><div style="font-size:19px;opacity:.7;font-weight:600">${c.name.en}</div><div style="font-size:30px;font-weight:700;line-height:1.15">${c.capital.en}</div></div>
      <div style="margin-left:auto;width:38px;height:38px;border-radius:50%;background:#EBA918;display:grid;place-items:center;font-size:22px;font-weight:700">★</div></div>`).join('')}</div>`;
  }
  const accent = slug === 'flag-quiz' ? 'background:#1F5FC4;color:#fff' : 'background:#EBA918;color:#1F2547';
  const html = `<!doctype html><html><head><meta charset="utf-8">${FONT}<style>${base}</style></head><body>
<div class="l"><img class="icon" src="${icon}"><h1>${en.title}</h1><div class="sub">${en.tagline}</div><div class="ko">${ko.title} · ${ko.tagline}</div>
<div class="pill" style="${accent}">Free in your browser · EN / 한국어</div><div class="studio">ggook's studio · kysystemstudio.com</div></div>${right}</body></html>`;
  shot(html, path.join(dir, 'og-image.png'), 1200, 630);
  const svg = fs.readFileSync(path.join(dir, 'favicon.svg'), 'utf8').replace(/ rx="16"/, '');
  const iconHtml = `<!doctype html><html><head><style>*{margin:0}body{width:180px;height:180px;overflow:hidden}svg{width:180px;height:180px;display:block}</style></head><body>${svg}</body></html>`;
  shot(iconHtml, path.join(dir, 'apple-touch-icon.png'), 180, 180);
}
fs.rmSync(tmp, { recursive: true, force: true });
