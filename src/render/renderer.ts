import { TRACK_M, type Race } from '../game/race';
import { drawBrawlCloud, drawHorse } from './horse';
import { drawBackground, drawTrack, layoutFor, sx, type View } from './track';

const MIN_VIEW_M = 55;
const MAX_VIEW_M = 240;
const NO_CAMERA = -1e9;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private camX = NO_CAMERA;
  private viewM = MIN_VIEW_M;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D를 사용할 수 없습니다.');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  reset(): void {
    this.camX = NO_CAMERA;
    this.viewM = MIN_VIEW_M;
  }

  draw(race: Race, time: number): void {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const horses = race.horses;
    const lead = Math.max(...horses.map((x) => x.x));
    const live = horses.filter((x) => !x.finished);
    const tail = live.length > 0 ? Math.min(...live.map((x) => x.x)) : lead;
    const targetView = Math.min(MAX_VIEW_M, Math.max(MIN_VIEW_M, lead - tail + 45));
    let targetCam = Math.max((lead + tail) / 2, lead - targetView * 0.35);
    targetCam = Math.max(targetCam, targetView * 0.5 - 12);
    targetCam = Math.min(targetCam, TRACK_M + 40 - targetView * 0.5 + 25);
    if (this.camX === NO_CAMERA) {
      this.camX = targetCam;
      this.viewM = targetView;
    } else {
      this.camX += (targetCam - this.camX) * 0.08;
      this.viewM += (targetView - this.viewM) * 0.05;
    }

    const view: View = { w, h, camX: this.camX, ppm: w / this.viewM, time };
    const lay = layoutFor(w, h, horses.length);
    drawBackground(ctx, view, lay);
    drawTrack(ctx, view, lay);

    const size = Math.min(lay.laneH * 1.6, w * 0.2, 240);
    const placed = horses
      .map((horse) => ({ horse, y: lay.laneTop + lay.laneH * (horse.id + 0.92 + horse.lateral) }))
      .sort((a, b) => a.y - b.y);
    for (const { horse, y } of placed) {
      const px = sx(view, horse.x);
      if (px < -size || px > w + size) {
        this.drawOffscreen(px < 0, y - lay.laneH * 0.45, horse.color, horse.number);
        continue;
      }
      drawHorse(ctx, {
        x: px,
        y,
        size,
        color: horse.color,
        number: horse.number,
        pose: horse.pose,
        poseT: horse.poseT,
        poseDur: horse.poseDur,
        phase: horse.phase,
        time: time + horse.id * 0.37,
        variant: horse.id,
      });
    }
    for (const { horse, y } of placed) {
      if (horse.pose !== 'brawl' || horse.role !== 1) continue;
      const mate = placed.find((p) => p.horse.id === horse.partner);
      if (!mate) continue;
      const cx = (sx(view, horse.x) + sx(view, mate.horse.x)) / 2;
      const cy = (y + mate.y) / 2 - size * 0.55;
      if (cx > -size && cx < w + size) drawBrawlCloud(ctx, cx, cy, size, time);
    }
    this.drawProgress(race);
  }

  private drawOffscreen(left: boolean, y: number, color: string, num: number): void {
    const { ctx, w } = this;
    const x = left ? 14 : w - 14;
    ctx.fillStyle = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + (left ? -8 : 8), y);
    ctx.lineTo(x + (left ? 10 : -10), y - 10);
    ctx.lineTo(x + (left ? 10 : -10), y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(num), x + (left ? 22 : -22), y + 4);
  }

  private drawProgress(race: Race): void {
    const { ctx, w } = this;
    const pad = Math.min(160, w * 0.18);
    const x0 = pad;
    const x1 = w - pad;
    const y = 22;
    if (x1 - x0 < 80) return;
    ctx.fillStyle = 'rgba(10,18,32,0.55)';
    ctx.beginPath();
    ctx.roundRect(x0 - 10, y - 12, x1 - x0 + 20, 24, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x0, y - 1, x1 - x0, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x1 - 2, y - 8, 3, 16);
    for (const horse of race.horses) {
      const p = Math.min(1, Math.max(0, horse.x / TRACK_M));
      ctx.fillStyle = horse.color;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x0 + (x1 - x0) * p, y + ((horse.id % 2) - 0.5) * 3, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
