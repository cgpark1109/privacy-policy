// Link check for the two games against a local server of the repository root.
//   python -m http.server 8931          (from the repository root, in another terminal)
//   node _src/webgames/linkcheck.mjs [http://localhost:8931]
// Fetches every page, every asset referenced by the HTML and JS (all flag SVGs listed in data.js), checks
// the page head (AdSense account tag, canonical, og:image) and fails on any 404 or on root-absolute paths
// other than the allowed links to the studio site.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASE = (process.argv[2] || 'http://localhost:8931').replace(/\/$/, '');
const SITE = 'https://kysystemstudio.com';
const ALLOWED_ROOT = new Set(['/', '/play/', '/privacy.html']);
const ADSENSE_TAG = '<meta name="google-adsense-account" content="ca-pub-4148553154486992">';
const GAMES = [['flag-quiz', 'all-flags.html'], ['capital-quiz', 'all-capitals.html']];

let failures = 0;
let fetched = 0;
const seen = new Map();
function fail(msg) { failures++; console.log('FAIL ' + msg); }

async function get(url) {
  if (seen.has(url)) return seen.get(url);
  const p = fetch(url).then(async (r) => ({ status: r.status, type: r.headers.get('content-type') || '', body: r.ok ? Buffer.from(await r.arrayBuffer()) : null }));
  seen.set(url, p);
  fetched++;
  return p;
}
async function mustGet(url, from) {
  const r = await get(url);
  if (r.status !== 200) fail(`${r.status} ${url.replace(BASE, '')} (from ${from})`);
  return r;
}

function htmlRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) refs.push(m[1]);
  return refs;
}
function jsRootPaths(js) {
  // string literals that start with "/" (paths on this site), including inside HTML snippets
  const out = [];
  for (const m of js.matchAll(/(?:href|src)="(\/[^"]*)"/g)) out.push(m[1]);
  for (const m of js.matchAll(/['"](\/[A-Za-z0-9_\-./]*)['"]/g)) out.push(m[1]);
  return out;
}
function jsRelPaths(js) {
  const out = [];
  for (const m of js.matchAll(/(?:href|src)="((?![a-z]+:|\/|#|'|\$)[^"']+)"/g)) out.push(m[1]);
  for (const m of js.matchAll(/['"]((?:[\w-]+\/)*[\w-]+\.(?:svg|png|html|txt|css|js))['"]/g)) out.push(m[1]);
  return out;
}

for (const [slug, listPage] of GAMES) {
  const gameBase = `${BASE}/play/${slug}/`;
  const pages = ['', listPage];
  const local = path.join(ROOT, 'play', slug);
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(local, 'data.js'), 'utf8'), ctx);
  vm.runInNewContext(fs.readFileSync(path.join(local, 'game.js'), 'utf8'), ctx);
  const data = ctx.window.COUNTRIES;
  const assets = new Set();
  for (const page of pages) {
    const url = gameBase + page;
    const r = await mustGet(url, 'start');
    if (!r.body) continue;
    const html = r.body.toString('utf8');
    const name = `${slug}/${page || 'index.html'}`;
    // head checks
    const count = html.split(ADSENSE_TAG).length - 1;
    if (count !== 1) fail(`${name}: AdSense account tag found ${count} times`);
    if (/adsbygoogle|pagead2|googlesyndication/.test(html)) fail(`${name}: contains ad script code`);
    if (/<script[^>]+src="(https?:)?\/\//.test(html)) fail(`${name}: loads JS from another origin`);
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    const expectCanon = `${SITE}/play/${slug}/${page}`;
    if (canonical !== expectCanon) fail(`${name}: canonical ${canonical} (expected ${expectCanon})`);
    const og = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || '';
    if (!og.startsWith(`${SITE}/play/${slug}/`)) fail(`${name}: og:image ${og}`);
    else await mustGet(BASE + og.slice(SITE.length), `${name} og:image`);
    for (const k of ['og:title', 'og:description', 'og:url', 'twitter:card', 'twitter:image']) {
      if (!new RegExp(`(property|name)="${k}"`).test(html)) fail(`${name}: missing ${k}`);
    }
    if (!/<title>[^<]+<\/title>/.test(html) || !/<meta name="description" content="[^"]+">/.test(html)) fail(`${name}: title/description`);
    if (!/<link rel="icon" href="favicon\.svg"/.test(html)) fail(`${name}: favicon`);
    // references
    for (const ref of htmlRefs(html)) {
      if (/^https?:\/\//.test(ref)) {
        if (ref === canonical) { await mustGet(BASE + ref.slice(SITE.length), `${name} canonical`); continue; }
        if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(ref)) fail(`${name}: external reference ${ref}`);
        continue;
      }
      if (ref.startsWith('#') || ref.startsWith('mailto:')) continue;
      if (ref.startsWith('/')) {
        if (!ALLOWED_ROOT.has(ref)) fail(`${name}: root-absolute path ${ref}`);
        await mustGet(BASE + ref, name);
        continue;
      }
      const abs = new URL(ref, url).href;
      if (!abs.startsWith(gameBase)) fail(`${name}: relative path leaves the game folder: ${ref}`);
      assets.add(abs.split('?')[0]);
      await mustGet(abs, name);
    }
    // in-page anchors on the list page point at existing ids
    for (const m of html.matchAll(/href="#([a-z]{2})"/g)) {
      if (!html.includes(`id="${m[1]}"`)) fail(`${name}: anchor #${m[1]} has no target`);
    }
  }
  // JS and CSS
  for (const f of ['app.js', 'logic.js', 'game.js', 'data.js', 'style.css']) {
    const r = await mustGet(gameBase + f, 'index.html');
    const text = r.body ? r.body.toString('utf8') : '';
    for (const p of jsRootPaths(text)) if (!ALLOWED_ROOT.has(p)) fail(`${slug}/${f}: root-absolute path ${p}`);
    for (const p of jsRelPaths(text)) {
      if (p.includes('{') || p.includes('+')) continue;
      await mustGet(new URL(p, gameBase).href, `${slug}/${f}`);
    }
    for (const m of text.matchAll(/url\(([^)]+)\)/g)) {
      const u = m[1].replace(/['"]/g, '');
      if (!u.startsWith('data:')) await mustGet(new URL(u, gameBase + f).href, `${slug}/${f}`);
    }
  }
  // every flag the game can show (app.js builds 'flags/' + code + '.svg')
  let flags = 0;
  for (const c of data) {
    await mustGet(`${gameBase}flags/${c.c.toLowerCase()}.svg`, `${slug}/data.js`);
    flags++;
  }
  const r = await get(`${gameBase}flags/${data[0].c.toLowerCase()}.svg`);
  if (!/svg/.test(r.type)) fail(`${slug}: flags served as ${r.type}`);
  console.log(`  ${slug}: 2 pages, ${assets.size} assets referenced by HTML, ${flags} flags`);
}
// files on disk that nothing could reach are fine, but names must not start with _ or . (Jekyll drops them)
for (const [slug] of GAMES) {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(ROOT, 'play', slug))) {
    if (path.relative(ROOT, f).split(path.sep).some((p) => /^[_.]/.test(p))) fail(`${f}: name starts with _ or .`);
  }
}
console.log(`${failures ? 'FAILED' : 'OK'}: ${fetched} URLs fetched, ${failures} failures`);
process.exit(failures ? 1 : 0);
