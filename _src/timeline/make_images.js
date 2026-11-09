// Renders play/history-timeline/og-image.png (1200×630) and apple-touch-icon.png (180×180).
// Not part of the normal build: run `node _src/timeline/make_images.js` from the repository root after changing the look.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const out = path.join(root, 'play', 'history-timeline');
const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(__dirname, 'favicon.svg')).toString('base64');
const rows = [['c. 2560 BC', 'The Great Pyramid of Giza'], ['1443', 'King Sejong creates Hangul'], ['?', 'The Berlin Wall falls'], ['2002', 'The Korea–Japan World Cup']];
const og = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Noto+Sans+KR:wght@500;700&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Poppins','Noto Sans KR',sans-serif;color:#2B3155;word-break:keep-all;
background:linear-gradient(160deg,#7FA6E6 0%,#C9C7F0 55%,#FDE3EC 100%);display:flex;align-items:center;justify-content:center}
.card{width:1080px;height:510px;background:rgba(255,255,255,.94);border-radius:44px;box-shadow:0 20px 50px rgba(43,49,85,.18);
padding:56px 64px;display:flex;gap:56px;align-items:center}
.left{flex:1}
.left img{width:110px;height:110px;border-radius:28px}
h1{font-size:68px;line-height:1.1;margin-top:26px}
h2{font-size:40px;font-weight:700;color:#B4492A;margin-top:6px}
p{font-size:28px;color:#565D80;margin-top:18px}
ol{list-style:none;width:440px;display:grid;gap:14px;position:relative;padding-left:34px}
ol:before{content:"";position:absolute;left:10px;top:10px;bottom:10px;width:5px;border-radius:5px;background:#E7A88C}
li{position:relative;background:#F2F4FA;border-radius:20px;padding:14px 20px;border:3px solid transparent}
li:before{content:"";position:absolute;left:-32px;top:50%;margin-top:-9px;width:18px;height:18px;border-radius:50%;background:#B4492A}
li.q{border:3px dashed #B4492A;background:#FBE6DC}
li b{display:block;font-size:20px;color:#9A3F1E}
li span{font-size:23px;font-weight:600}
</style></head><body><div class="card"><div class="left"><img src="${icon}" alt=""><h1>History Timeline</h1><h2>연표 맞추기</h2>
<p>Put world history in order<br>세계사 사건을 순서대로 놓아 보세요</p></div>
<ol>${rows.map(([y, t]) => `<li class="${y === '?' ? 'q' : ''}"><b>${y}</b><span>${t}</span></li>`).join('')}</ol></div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(og, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, 'og-image.png') });
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<html><body style="margin:0;background:#B4492A"><img src="${icon}" style="width:180px;height:180px;display:block"></body></html>`);
  await page.screenshot({ path: path.join(out, 'apple-touch-icon.png') });
  await browser.close();
})();
