import type { Pose } from '../game/race';

export interface HorseDrawOpts {
  x: number;
  y: number;
  size: number;
  color: string;
  number: number;
  pose: Pose;
  poseT: number;
  poseDur: number;
  phase: number;
  time: number;
  variant?: number;
}

type LegMode = 'gallop' | 'still' | 'flail' | 'tuck';

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number): number => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function ease(p: number): number {
  return p * p * (3 - 2 * p);
}

function line(ctx: CanvasRenderingContext2D, pts: number[], width: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  color: string,
  mode: LegMode,
  phase: number,
  time: number,
  frontMode: LegMode = mode,
): void {
  const legs = [
    { x: -0.42, off: 0, front: false, far: true },
    { x: 0.3, off: Math.PI * 0.5, front: true, far: true },
    { x: -0.3, off: Math.PI, front: false, far: false },
    { x: 0.4, off: Math.PI * 1.5, front: true, far: false },
  ];
  for (const leg of legs) {
    const m = leg.front ? frontMode : mode;
    const ang = phase * Math.PI * 2 + leg.off;
    let fx = leg.x;
    let fy = 0;
    if (m === 'gallop') {
      fx = leg.x + Math.sin(ang) * 0.2;
      fy = -Math.max(0, Math.cos(ang)) * 0.14;
    } else if (m === 'flail') {
      const a = time * 14 + leg.off;
      fx = leg.x + 0.12 + Math.sin(a) * 0.22;
      fy = -0.34 - 0.18 * Math.cos(a);
    } else if (m === 'tuck') {
      fx = leg.x + 0.12;
      fy = -0.3;
    }
    const ay = -0.46;
    const kx = (leg.x + fx) / 2 - 0.05;
    const ky = (ay + fy) / 2;
    const col = leg.far ? shade(color, 0.62) : shade(color, 0.85);
    line(ctx, [leg.x, ay, kx, ky, fx, fy], 0.075, col);
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.arc(fx, fy, 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  o: HorseDrawOpts,
  flip: number,
  headDown: boolean,
  shades: boolean,
  tailWag: number,
): void {
  const { color } = o;
  ctx.strokeStyle = shade(color, 0.55);
  ctx.lineWidth = 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-0.46, -0.72);
  ctx.quadraticCurveTo(-0.7, -0.72 + tailWag, -0.8, -0.46 + tailWag * 1.5);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -0.62, 0.5, 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(0.05, -0.7, 0.38, 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const hx = headDown ? 0.66 : 0.74;
  const hy = headDown ? -0.52 : -1.08;
  const ha = headDown ? 1.15 : 0.5;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0.28, -0.8);
  ctx.lineTo(hx - 0.1, hy - 0.12);
  ctx.lineTo(hx + 0.02, hy + 0.04);
  ctx.lineTo(0.44, -0.54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(color, 0.5);
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const mx = 0.28 + (hx - 0.14 - 0.28) * t;
    const my = -0.8 + (hy - 0.12 + 0.8) * t;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx - 0.09, my + 0.06);
    ctx.lineTo(mx - 0.02, my - 0.08);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(hx, hy, 0.17, 0.09, ha, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, 0.6);
  ctx.beginPath();
  ctx.moveTo(hx - 0.08, hy - 0.1);
  ctx.lineTo(hx - 0.02, hy - 0.2);
  ctx.lineTo(hx + 0.02, hy - 0.08);
  ctx.fill();

  ctx.save();
  ctx.translate(hx - 0.02, hy - 0.03);
  if (shades) {
    ctx.fillStyle = '#111';
    ctx.fillRect(-0.07, -0.04, 0.2, 0.07);
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0.02, 0, 0.035, 0, Math.PI * 2);
    ctx.arc(0.1, 0.01, 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0.03, 0, 0.015, 0, Math.PI * 2);
    ctx.arc(0.09, 0.012, 0.014, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = shade(color, 0.45);
  ctx.beginPath();
  ctx.arc(hx + 0.13 * Math.cos(ha), hy + 0.13 * Math.sin(ha), 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.strokeStyle = shade(color, 0.4);
  ctx.lineWidth = 0.02;
  ctx.fillRect(-0.16, -0.86, 0.3, 0.2);
  ctx.strokeRect(-0.16, -0.86, 0.3, 0.2);
  ctx.save();
  ctx.translate(-0.01, -0.76);
  ctx.scale(flip * 0.01, 0.01);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(o.number), 0, 0.5);
  ctx.restore();
}

function floater(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawHorse(ctx: CanvasRenderingContext2D, o: HorseDrawOpts): void {
  const L = o.size;
  const prog = o.poseDur > 0 ? Math.min(1, Math.max(0, o.poseT / o.poseDur)) : 0;
  const bob = Math.sin(o.phase * Math.PI * 2) * 0.025;
  let lift = 0;
  let rot = 0;
  let pivotX = 0;
  let pivotY = -0.6;
  let flip = 1;
  let alpha = 1;
  let scale = 1;
  let legs: LegMode = 'gallop';
  let frontLegs: LegMode | undefined;
  let headDown = false;
  let shades = false;
  let tail = Math.sin(o.time * 9) * 0.06;

  switch (o.pose) {
    case 'run':
      lift = bob;
      rot = Math.sin(o.phase * Math.PI * 2) * 0.03;
      break;
    case 'trip': {
      const amt = ease(Math.min(1, o.poseT / 0.45, (o.poseDur - o.poseT) / 0.45));
      rot = amt * Math.PI;
      lift = -0.3 * amt;
      legs = amt > 0.6 ? 'flail' : 'gallop';
      break;
    }
    case 'moonwalk':
      rot = 0.08;
      shades = true;
      lift = Math.abs(Math.sin(o.time * 8)) * 0.03;
      break;
    case 'biped':
      pivotX = -0.38;
      pivotY = 0;
      rot = -(1.0 + 0.12 * Math.sin(o.time * 9));
      frontLegs = 'flail';
      break;
    case 'rocket':
      rot = -0.14;
      lift = 0.05;
      break;
    case 'nap':
      legs = 'still';
      headDown = true;
      lift = Math.sin(o.time * 2.5) * 0.012;
      tail = 0.02;
      break;
    case 'uturn':
      flip = -1;
      break;
    case 'backflip': {
      const p = ease(prog);
      rot = -Math.PI * 2 * p;
      lift = Math.sin(Math.PI * prog) * 0.9;
      legs = 'tuck';
      break;
    }
    case 'banana':
      rot = prog * Math.PI * 6;
      lift = Math.sin(Math.PI * prog) * 0.2;
      legs = 'flail';
      break;
    case 'wings':
      lift = 0.5 + Math.sin(o.time * 6) * 0.05;
      break;
    case 'brawl':
      pivotX = -0.38;
      pivotY = 0;
      rot = -0.55 + 0.12 * Math.sin(o.time * 16 + (o.variant ?? 0) * 2);
      frontLegs = 'flail';
      lift = Math.abs(Math.sin(o.time * 8 + (o.variant ?? 0))) * 0.06;
      break;
    case 'ko': {
      const amt = ease(Math.max(0, Math.min(1, (o.poseT - 0.15) / 0.4, (o.poseDur - o.poseT) / 0.5)));
      rot = amt * Math.PI;
      lift = -0.3 * amt;
      legs = amt > 0.6 ? 'flail' : 'gallop';
      break;
    }
    case 'victory':
      pivotX = -0.38;
      pivotY = 0;
      rot = -(0.95 + 0.1 * Math.sin(o.time * 12));
      frontLegs = 'flail';
      break;
    case 'warp':
      alpha = 0.3 + 0.7 * Math.abs(Math.sin(o.time * 30));
      scale = 1 + 0.12 * Math.sin(o.time * 20);
      break;
  }

  if (o.pose === 'wings' || o.pose === 'backflip' || o.pose === 'banana') {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, L * 0.5 * (1 - Math.min(0.5, lift * 0.4)), L * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, L * 0.5, L * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (o.pose === 'banana' && prog < 0.7) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(-0.2);
    ctx.fillStyle = '#ffe135';
    ctx.strokeStyle = '#a07a00';
    ctx.lineWidth = L * 0.015;
    ctx.beginPath();
    ctx.ellipse(0, -L * 0.04, L * 0.14, L * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(o.x, o.y - lift * L);
  ctx.scale(L * scale * flip, L * scale);
  ctx.translate(pivotX, pivotY);
  ctx.rotate(rot);
  ctx.translate(-pivotX, -pivotY);

  if (o.pose === 'rocket') {
    const f = 0.18 + 0.08 * Math.sin(o.time * 50);
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(-0.46, -0.66);
    ctx.lineTo(-0.46 - 0.5 - f, -0.62);
    ctx.lineTo(-0.46, -0.52);
    ctx.fill();
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.moveTo(-0.46, -0.64);
    ctx.lineTo(-0.46 - 0.3 - f / 2, -0.62);
    ctx.lineTo(-0.46, -0.56);
    ctx.fill();
  }
  if (o.pose === 'wings') {
    const flap = Math.sin(o.time * 14);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(-0.02 + side * 0.08, -0.82);
      ctx.rotate(-0.9 + flap * 0.5 * (side === 1 ? 1 : 0.8));
      ctx.fillStyle = side === 1 ? '#fff' : '#e3f2fd';
      ctx.strokeStyle = '#90a4ae';
      ctx.lineWidth = 0.015;
      ctx.beginPath();
      ctx.ellipse(0, -0.28, 0.12, 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  drawLegs(ctx, o.color, legs, o.phase, o.time, frontLegs);
  drawBody(ctx, o, flip, headDown, shades, tail);
  ctx.restore();

  const fy = o.y - (lift + 1.35) * L;
  const fx = o.x;
  switch (o.pose) {
    case 'ko':
      for (let i = 0; i < 3; i++) {
        const a = o.time * 5 + (i * Math.PI * 2) / 3;
        floater(ctx, '★', fx + Math.cos(a) * L * 0.3, fy + L * 0.55 + Math.sin(a) * L * 0.08, L * 0.2);
      }
      floater(ctx, 'K.O.', fx, fy - L * 0.1, L * 0.3);
      break;
    case 'victory':
      floater(ctx, 'WIN!', fx - L * 0.1, fy - L * 0.1, L * 0.3);
      break;
    case 'trip':
      for (let i = 0; i < 3; i++) {
        const a = o.time * 5 + (i * Math.PI * 2) / 3;
        floater(ctx, '★', fx + Math.cos(a) * L * 0.3, fy + L * 0.5 + Math.sin(a) * L * 0.08, L * 0.2);
      }
      break;
    case 'moonwalk':
      floater(ctx, '♪', fx + Math.sin(o.time * 3) * L * 0.2, fy - ((o.time * 0.5) % 0.4) * L, L * 0.3);
      break;
    case 'nap':
      floater(ctx, 'Z', fx + L * 0.2, fy + L * 0.1 - ((o.time * 0.4) % 0.5) * L, L * 0.28);
      floater(ctx, 'z', fx + L * 0.4, fy - ((o.time * 0.4 + 0.25) % 0.5) * L, L * 0.2);
      break;
    case 'uturn':
      floater(ctx, '?', fx - L * 0.2, fy, L * 0.4);
      break;
    case 'warp':
      for (let i = 0; i < 5; i++) {
        const a = o.time * 8 + (i * Math.PI * 2) / 5;
        floater(ctx, '✦', fx + Math.cos(a) * L * 0.55, o.y - L * 0.6 + Math.sin(a) * L * 0.45, L * 0.2, 0.9);
      }
      break;
    case 'biped':
      floater(ctx, '!', fx - L * 0.15, fy - L * 0.1, L * 0.35);
      break;
    case 'banana':
      floater(ctx, '@', fx, fy + L * 0.3, L * 0.25);
      break;
  }
}

const BRAWL_WORDS = ['퍽!', '쾅!', '꽈당!', '빡!'];

export function drawBrawlCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, time: number): void {
  ctx.save();
  const puffs = 7;
  for (let i = 0; i < puffs; i++) {
    const a = time * 3 + i * ((Math.PI * 2) / puffs);
    const r = size * (0.16 + 0.04 * Math.sin(time * 9 + i));
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.92)' : 'rgba(215,215,215,0.92)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * size * 0.28, cy + Math.sin(a) * size * 0.16, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const spikes = 8;
  const outer = size * 0.3 * (0.9 + 0.2 * Math.sin(time * 14));
  const inner = outer * 0.5;
  ctx.fillStyle = '#ffeb3b';
  ctx.strokeStyle = '#e65100';
  ctx.lineWidth = Math.max(1.5, size * 0.02);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 ? inner : outer;
    const ang = (i * Math.PI) / spikes + time * 2;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  floater(ctx, BRAWL_WORDS[Math.floor(time * 4) % BRAWL_WORDS.length], cx, cy - size * 0.4, size * 0.26);
  ctx.restore();
}
