// Renders play/hangul-quiz/og-image.png (1200×630) and apple-touch-icon.png (180×180).
// Not part of the normal build: run `node _src/hangul_quiz/make_images.js` from the repository root after changing the look.
const { chromium } = require('playwright');
const path = require('path');
const out = path.join(__dirname, '..', '..', 'play', 'hangul-quiz');
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Noto+Sans+KR:wght@500;700&display=block" rel="stylesheet">';
const icon = (size) => `<div style="width:${size}px;height:${size}px;background:#FF6B5B;display:grid;place-items:center;border-radius:${size * 0.25}px;font-family:'Noto Sans KR';font-weight:700;color:#fff;font-size:${size * 0.56}px;line-height:1">한</div>`;
const og = `<!DOCTYPE html><html><head><meta charset="utf-8">${FONT}<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Poppins','Noto Sans KR',sans-serif;color:#2B3155;
background:linear-gradient(160deg,#7FA6E6 0%,#C9C7F0 55%,#FDE3EC 100%);display:flex;align-items:center;justify-content:center}
.card{width:1080px;height:510px;background:rgba(255,255,255,.94);border-radius:44px;box-shadow:0 20px 50px rgba(43,49,85,.18);padding:56px 64px;display:flex;gap:56px;align-items:center}
.left{flex:1} h1{font-size:72px;line-height:1.1;margin-top:26px} h2{font-size:40px;color:#FF6B5B;margin-top:6px;font-weight:700}
p{font-size:28px;color:#565D80;margin-top:18px}
.grid{display:grid;grid-template-columns:repeat(2,190px);gap:16px}
.tile{height:150px;border-radius:28px;background:#F4F5FB;display:grid;place-items:center;font-family:'Noto Sans KR';font-size:84px;font-weight:700}
.tile.hi{background:#FFF1EF;border:4px solid #FF6B5B}
</style></head><body><div class="card"><div class="left">${icon(110)}<h1>Hangul Quiz</h1><h2>한글 퀴즈</h2>
<p>Learn to read Korean,<br>from letters to words</p></div>
<div class="grid"><div class="tile">ㄱ</div><div class="tile">ㅏ</div><div class="tile hi">가</div><div class="tile">한국</div></div></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(og, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, 'og-image.png') });
  await p.setViewportSize({ width: 180, height: 180 });
  await p.setContent(`<html><head>${FONT}</head><body style="margin:0;background:#FF6B5B">${icon(180).replace('border-radius:45px', 'border-radius:0')}</body></html>`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, 'apple-touch-icon.png') });
  await b.close();
})();
