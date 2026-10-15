import { TRACK_M } from '../game/race';

export interface View {
  w: number;
  h: number;
  camX: number;
  ppm: number;
  time: number;
}

export interface Layout {
  horizonY: number;
  laneTop: number;
  laneH: number;
  lanes: number;
}

export function layoutFor(w: number, h: number, lanes: number): Layout {
  const horizonY = Math.round(h * 0.22);
  const laneTop = horizonY + Math.round(h * 0.03);
  const laneH = Math.max(10, (h * 0.975 - laneTop) / lanes);
  return { horizonY, laneTop, laneH, lanes };
}

export const sx = (v: View, xm: number): number => (xm - v.camX) * v.ppm + v.w / 2;

function hash(n: number): number {
  let x = (n | 0) * 374761393;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const CROWD = ['#ef5350', '#42a5f5', '#66bb6a', '#ffee58', '#ab47bc', '#ffa726', '#ec407a', '#26c6da'];

export function drawBackground(ctx: CanvasRenderingContext2D, v: View, lay: Layout): void {
  const { w, h, time } = v;
  const sky = ctx.createLinearGradient(0, 0, 0, lay.horizonY);
  sky.addColorStop(0, '#5aa9e6');
  sky.addColorStop(1, '#cfeefc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, lay.horizonY + 2);

  ctx.fillStyle = '#ffe57f';
  ctx.beginPath();
  ctx.arc(w * 0.82, lay.horizonY * 0.28, Math.max(14, h * 0.045), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const cloudShift = v.camX * v.ppm * 0.05 + time * 6;
  for (let i = 0; i < 7; i++) {
    const cx = ((i * 260 + hash(i) * 120 - cloudShift) % (w + 300) + (w + 300)) % (w + 300) - 150;
    const cy = lay.horizonY * (0.1 + hash(i + 9) * 0.25);
    ctx.beginPath();
    ctx.ellipse(cx, cy, 46, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 26, cy - 8, 32, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 24, cy - 4, 28, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const hillShift = v.camX * v.ppm * 0.1;
  ctx.fillStyle = '#7cb87a';
  ctx.beginPath();
  ctx.moveTo(0, lay.horizonY);
  for (let x = 0; x <= w; x += 12) {
    const wx = x + hillShift;
    ctx.lineTo(x, lay.horizonY - 18 - Math.sin(wx * 0.006) * 12 - Math.sin(wx * 0.017) * 5);
  }
  ctx.lineTo(w, lay.horizonY);
  ctx.fill();

  const standTop = lay.horizonY * 0.42;
  ctx.fillStyle = '#6d5a4b';
  ctx.fillRect(0, standTop, w, lay.horizonY - standTop);
  ctx.fillStyle = '#85705e';
  for (let r = 0; r < 4; r++) ctx.fillRect(0, standTop + ((lay.horizonY - standTop) / 4) * r, w, 3);
  const crowdShift = v.camX * v.ppm * 0.4;
  const rows = 4;
  const rowH = (lay.horizonY - standTop) / rows;
  const gap = 16;
  for (let r = 0; r < rows; r++) {
    const first = Math.floor((crowdShift - w) / gap) - 1;
    for (let i = first; i < first + (w * 2) / gap + 3; i++) {
      const px = i * gap - crowdShift + ((r % 2) * gap) / 2;
      if (px < -gap || px > w + gap) continue;
      const seed = i * 7 + r * 131;
      const jump = Math.abs(Math.sin(time * (2 + hash(seed) * 3) + hash(seed + 1) * 6)) * 3 * (hash(seed + 2) > 0.5 ? 1 : 0);
      const py = standTop + rowH * (r + 0.7) - jump;
      ctx.fillStyle = CROWD[Math.floor(hash(seed) * CROWD.length)];
      ctx.fillRect(px - 4, py - 2, 8, 10);
      ctx.fillStyle = '#ffcc99';
      ctx.beginPath();
      ctx.arc(px, py - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTrack(ctx: CanvasRenderingContext2D, v: View, lay: Layout): void {
  const { w, h } = v;
  const trackBottom = lay.laneTop + lay.laneH * lay.lanes;
  ctx.fillStyle = '#4e9a4a';
  ctx.fillRect(0, lay.horizonY, w, h - lay.horizonY);

  const x0 = sx(v, 0);
  const x1 = sx(v, TRACK_M + 60);
  const dirtL = Math.max(0, x0 - 50 * v.ppm);
  ctx.fillStyle = '#c79a63';
  ctx.fillRect(dirtL, lay.laneTop - 6, Math.min(w, x1) - dirtL, trackBottom - lay.laneTop + 12);

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 12]);
  for (let i = 1; i < lay.lanes; i++) {
    const y = lay.laneTop + lay.laneH * i;
    ctx.beginPath();
    ctx.moveTo(dirtL, y);
    ctx.lineTo(Math.min(w, x1), y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = '#fff';
  const railY = lay.laneTop - 8;
  ctx.fillRect(dirtL, railY, Math.min(w, x1) - dirtL, 4);
  ctx.fillRect(dirtL, trackBottom + 6, Math.min(w, x1) - dirtL, 4);
  const firstPost = Math.floor((v.camX - w / 2 / v.ppm) / 10) * 10;
  for (let m = firstPost; m <= v.camX + w / 2 / v.ppm; m += 10) {
    if (m < -50 || m > TRACK_M + 60) continue;
    const px = sx(v, m);
    ctx.fillRect(px - 1.5, railY - 10, 3, 14);
  }

  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let m = 100; m < TRACK_M; m += 100) {
    const px = sx(v, m);
    if (px < -40 || px > w + 40) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(px - 1, lay.laneTop - 6, 2, trackBottom - lay.laneTop + 12);
    ctx.fillStyle = '#263238';
    ctx.fillRect(px - 26, railY - 30, 52, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${m}m`, px, railY - 15);
  }

  const startX = sx(v, 0);
  if (startX > -10 && startX < w + 10) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(startX - 2, lay.laneTop - 6, 4, trackBottom - lay.laneTop + 12);
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#263238';
    ctx.fillText('START', startX, railY - 14);
  }

  const fx = sx(v, TRACK_M);
  if (fx > -80 && fx < w + 80) {
    const cell = Math.max(6, lay.laneH / 4);
    const top = lay.laneTop - 6;
    const bottom = trackBottom + 6;
    for (let y = top, r = 0; y < bottom; y += cell, r++) {
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#111';
        ctx.fillRect(fx - cell + c * cell, y, cell, Math.min(cell, bottom - y));
      }
    }
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(fx - 90, railY - 34, 180, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('FINISH', fx, railY - 12);
    ctx.fillStyle = '#eee';
    ctx.fillRect(fx - 92, railY - 34, 4, trackBottom - railY + 34);
    ctx.fillRect(fx + 88, railY - 34, 4, trackBottom - railY + 34);
  }
}
