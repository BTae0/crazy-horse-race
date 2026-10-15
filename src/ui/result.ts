import type { Race } from '../game/race';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function swatch(color: string): HTMLSpanElement {
  const s = el('span', 'sw');
  s.style.background = color;
  return s;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function renderResult(race: Race): void {
  const ranking = race.ranking();
  const winner = ranking[0];
  const winnerEl = document.getElementById('winner')!;
  winnerEl.replaceChildren(swatch(winner.color), el('span', undefined, winner.label));
  document.getElementById('ranking')!.replaceChildren(
    ...ranking.map((h, i) => {
      const li = el('li');
      li.append(
        el('span', 'no', i < 3 ? MEDALS[i] : String(i + 1)),
        swatch(h.color),
        el('span', undefined, h.label),
        el('span', 'meta', `사건 ${h.events}회 · ${h.finishTime.toFixed(1)}초`),
      );
      return li;
    }),
  );
}

export function runConfetti(canvas: HTMLCanvasElement): () => void {
  let reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    reduced = false;
  }
  const ctx = canvas.getContext('2d');
  if (reduced || !ctx) return () => undefined;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = (canvas.width = Math.round(canvas.clientWidth * dpr));
  const h = (canvas.height = Math.round(canvas.clientHeight * dpr));
  const colors = ['#ffca28', '#ff5c8a', '#42a5f5', '#66bb6a', '#ab47bc', '#ff9f43'];
  const parts = Array.from({ length: 130 }, () => ({
    x: Math.random() * w,
    y: -Math.random() * h * 0.7,
    vx: (Math.random() - 0.5) * 3 * dpr,
    vy: (2 + Math.random() * 4) * dpr,
    s: (4 + Math.random() * 7) * dpr,
    c: colors[Math.floor(Math.random() * colors.length)],
    r: Math.random() * 6,
  }));
  let raf = 0;
  let stopped = false;
  const tick = (): void => {
    if (stopped) return;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.12;
      if (p.y < h + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
  };
}
