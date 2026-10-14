// Stroke-order practice (lib/screens/stroke/stroke_screen.dart + stroke_pad.dart).
// Canvas with the faint model letter, animated stroke order ("Show me") and
// free drawing with mouse, touch or pen (Pointer Events).

import { esc, icon, html, prefersReducedMotion } from '../ui.js';
import { describe } from '../data.js';
import { strokesFor } from '../strokes.js';
import { appBar, bindBack } from './shared.js';

const MS_PER_STROKE = 650;

export default async function strokeView(ctx) {
  const { repo } = ctx;
  const char = ctx.params.char;
  let item = repo.findByChar(char);
  if (!item && !repo.hasWords) {
    await ctx.loadWords().catch(() => {});
    item = repo.findByChar(char);
  }
  if (!item) return { redirect: '/learn' };

  const guide = item.kind === 'word' ? null : strokesFor(repo.strokes, item.char);
  const total = guide?.length ?? 0;
  const description = describe(item);

  const el = html(`<div class="screen">
    ${appBar(`Write ${item.char}`, { titleHtml: `Write <span lang="ko">${esc(item.char)}</span>` })}
    <div class="page page--narrow stroke">
      <p class="stroke__roman">${esc(item.roman)}</p>
      ${description ? `<p class="stroke__desc">${esc(description)}</p>` : ''}
      <div class="stroke-pad">
        <canvas class="stroke-pad__canvas" role="img"
          aria-label="Writing pad for ${esc(item.char)}${total ? `, ${total} ${total === 1 ? 'stroke' : 'strokes'}` : ''}. Draw with a mouse, finger or pen."></canvas>
      </div>
      <p class="stroke__status" data-status aria-live="polite"></p>
      <div class="btn-row btn-row--3">
        <button type="button" class="btn btn--outlined btn--compact" data-clear>${icon('delete')}<span>Clear</span></button>
        <button type="button" class="btn btn--outlined btn--compact" data-show>${icon('play-circle')}<span>Show me</span></button>
        <button type="button" class="btn btn--outlined btn--compact" data-listen>${icon('volume')}<span>Listen</span></button>
      </div>
      <button type="button" class="btn btn--filled" data-done>${icon('check')}<span>Done</span></button>
    </div>
  </div>`);

  const canvas = el.querySelector('canvas');
  const g = canvas.getContext('2d');
  const statusEl = el.querySelector('[data-status]');

  const userStrokes = [];
  let current = null; // stroke being drawn
  let activePointer = null;
  let progress = 0; // 0..total; integer part = finished strokes
  let showNumbers = false;
  let animFrame = 0;
  let size = 0;
  let dpr = 1;

  // Cumulative lengths for partial stroke drawing (scale-invariant).
  const lengths = (guide ?? []).map((stroke) => {
    const acc = [0];
    for (let i = 1; i < stroke.length; i++) {
      const [x0, y0] = stroke[i - 1];
      const [x1, y1] = stroke[i];
      acc.push(acc[i - 1] + Math.hypot(x1 - x0, y1 - y0));
    }
    return acc;
  });

  function colors() {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    return {
      paper: v('--card-raised'),
      border: v('--border'),
      gold: v('--gold'),
      red: v('--red-badge'),
      ink: v('--text'),
    };
  }

  function updateStatus() {
    const drawn = userStrokes.length;
    const word = total === 1 ? 'stroke' : 'strokes';
    statusEl.textContent = total === 0
      ? 'Trace the letter'
      : drawn === 0
        ? `${total} ${word} · tap "Show me" to see the order`
        : `You drew ${drawn} of ${total} ${word}`;
    statusEl.classList.toggle('is-done', total > 0 && drawn === total);
  }

  function pathOf(stroke, upTo = 1, strokeIndex = -1) {
    g.beginPath();
    if (!stroke.length) return;
    const s = size;
    g.moveTo(stroke[0][0] * s, stroke[0][1] * s);
    if (upTo >= 1 || strokeIndex < 0) {
      for (let i = 1; i < stroke.length; i++) g.lineTo(stroke[i][0] * s, stroke[i][1] * s);
      if (stroke.length === 1) g.lineTo(stroke[0][0] * s + 0.1, stroke[0][1] * s);
      return;
    }
    const acc = lengths[strokeIndex];
    const target = acc[acc.length - 1] * upTo;
    for (let i = 1; i < stroke.length; i++) {
      if (acc[i] <= target) {
        g.lineTo(stroke[i][0] * s, stroke[i][1] * s);
      } else {
        const seg = acc[i] - acc[i - 1];
        const t = seg > 0 ? (target - acc[i - 1]) / seg : 0;
        const [x0, y0] = stroke[i - 1];
        const [x1, y1] = stroke[i];
        g.lineTo((x0 + (x1 - x0) * t) * s, (y0 + (y1 - y0) * t) * s);
        break;
      }
    }
  }

  function strokeStyle(color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
  }

  function draw() {
    if (!size) return;
    const c = colors();
    const s = size;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, s, s);
    g.fillStyle = c.paper;
    g.fillRect(0, 0, s, s);

    // Dashed guide lines through the middle.
    g.save();
    g.globalAlpha = 0.5;
    g.strokeStyle = c.border;
    g.lineWidth = 1;
    g.setLineDash([6, 6]);
    g.beginPath();
    g.moveTo(0, s / 2); g.lineTo(s, s / 2);
    g.moveTo(s / 2, 0); g.lineTo(s / 2, s);
    g.stroke();
    g.restore();

    const guideWidth = s * 0.075;
    if (guide) {
      g.save();
      g.globalAlpha = 0.55;
      strokeStyle(c.border, guideWidth);
      for (const stroke of guide) {
        pathOf(stroke);
        g.stroke();
      }
      g.restore();

      strokeStyle(c.gold, guideWidth);
      for (let i = 0; i < guide.length; i++) {
        const t = Math.min(Math.max(progress - i, 0), 1);
        if (t <= 0) break;
        pathOf(guide[i], t, i);
        g.stroke();
      }

      if (showNumbers) {
        for (let i = 0; i < guide.length; i++) {
          if (progress <= i) break;
          const [x, y] = guide[i][0];
          const r = s * 0.045;
          const cx = x * s - r * 0.9;
          const cy = y * s - r * 0.9;
          g.fillStyle = c.red;
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#ffffff';
          g.font = `700 ${Math.round(r * 1.2)}px system-ui, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(i + 1), cx, cy + r * 0.05);
        }
      }
    } else {
      // No stroke data (e.g. a word): trace over the font glyph instead.
      g.save();
      g.globalAlpha = 0.6;
      g.fillStyle = c.border;
      let fontSize = s * 0.62;
      g.font = `600 ${fontSize}px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;
      const w = g.measureText(item.char).width;
      if (w > s * 0.92) {
        fontSize *= (s * 0.92) / w;
        g.font = `600 ${fontSize}px "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif`;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(item.char, s / 2, s / 2);
      g.restore();
    }

    strokeStyle(c.ink, s * 0.035);
    for (const stroke of current ? [...userStrokes, current] : userStrokes) {
      pathOf(stroke);
      g.stroke();
    }
  }

  function showMe() {
    if (!guide || guide.length === 0) return;
    cancelAnimationFrame(animFrame);
    showNumbers = true;
    if (prefersReducedMotion()) {
      progress = guide.length;
      draw();
      return;
    }
    const duration = MS_PER_STROKE * guide.length;
    const startTime = performance.now();
    const step = (now) => {
      progress = Math.min(((now - startTime) / duration) * guide.length, guide.length);
      draw();
      if (progress < guide.length) animFrame = requestAnimationFrame(step);
    };
    progress = 0;
    animFrame = requestAnimationFrame(step);
  }

  // ── Drawing (mouse, touch, pen) ──
  const point = (e) => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1),
      Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1),
    ];
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (activePointer != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    activePointer = e.pointerId;
    canvas.setPointerCapture?.(e.pointerId);
    cancelAnimationFrame(animFrame);
    showNumbers = false;
    progress = 0;
    current = [point(e)];
    draw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer || !current) return;
    e.preventDefault();
    const events = e.getCoalescedEvents?.() ?? [];
    for (const ce of events.length ? events : [e]) current.push(point(ce));
    draw();
  });
  const endStroke = (e) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null;
    const stroke = current;
    current = null;
    if (stroke && stroke.length > 1) userStrokes.push(stroke);
    updateStatus();
    draw();
  };
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', (e) => {
    if (e.pointerId === activePointer) endStroke(e);
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const next = Math.round(rect.width);
    if (!next) return;
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    size = next;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    draw();
  }
  const ro = new ResizeObserver(resize);
  const onTheme = () => draw();

  el.querySelector('[data-clear]').addEventListener('click', () => {
    userStrokes.length = 0;
    updateStatus();
    draw();
  });
  el.querySelector('[data-show]').addEventListener('click', showMe);
  el.querySelector('[data-listen]').addEventListener('click', () => ctx.speakItem(item));
  const done = () => ctx.router.back('/learn');
  el.querySelector('[data-done]').addEventListener('click', done);
  bindBack(el, done);
  updateStatus();

  return {
    el,
    title: `Write ${item.char}`,
    tab: 'learn',
    sub: true,
    parent: '/learn',
    onMount() {
      ro.observe(canvas);
      resize();
      window.addEventListener('themechange', onTheme);
      ctx.speakItem(item);
      showMe();
    },
    destroy() {
      cancelAnimationFrame(animFrame);
      ro.disconnect();
      window.removeEventListener('themechange', onTheme);
    },
  };
}
