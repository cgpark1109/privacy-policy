// Renders the social sharing images (assets/og-*.png, 1200×630) for the history reading and the Hangul guides.
// Not part of the normal build: run `node _src/make_og.js` from the repository root after changing the text.
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');
const logo = 'data:image/png;base64,' + require('fs').readFileSync(path.join(root, 'assets', 'logo-256.png')).toString('base64');
const images = [
  { file: 'og-history.png', lang: 'ko', kicker: '세계사 읽을거리', title: '세계사의 흐름을 바꾼 순간들', sub: '고대부터 현대까지, 한 편씩 차근차근 읽는 연재' },
  { file: 'og-learn.png', lang: 'en', kicker: 'Learn Hangul', title: 'Free guides to Korean', sub: 'From your first letter to real conversations' },
];
const html = (o) => `<!DOCTYPE html><html lang="${o.lang}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Noto+Sans+KR:wght@500;700&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:'Poppins','Noto Sans KR',sans-serif;color:#2B3155;word-break:keep-all;
background:linear-gradient(160deg,#7FA6E6 0%,#C9C7F0 55%,#FDE3EC 100%);display:flex;align-items:center;justify-content:center}
.card{width:1060px;height:490px;background:rgba(255,255,255,.93);border-radius:44px;box-shadow:0 20px 50px rgba(43,49,85,.18);
padding:70px 80px;display:flex;flex-direction:column;justify-content:space-between}
.kicker{display:inline-block;align-self:flex-start;background:#FF6B5B;color:#fff;font-weight:700;font-size:30px;padding:10px 26px;border-radius:999px}
h1{font-size:72px;line-height:1.2;font-weight:700;margin-top:30px}
p{font-size:34px;color:#3B4270;margin-top:18px}
.brand{display:flex;align-items:center;gap:18px;font-size:30px;font-weight:600;color:#6B7192}
.brand img{width:56px;height:56px;border-radius:14px}
</style></head><body><div class="card"><div><span class="kicker">${o.kicker}</span><h1>${o.title}</h1><p>${o.sub}</p></div>
<div class="brand"><img src="${logo}" alt="">ggook's studio · kysystemstudio.com</div></div></body></html>`;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const o of images) {
    await page.setContent(html(o), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, 'assets', o.file) });
  }
  await browser.close();
})();
