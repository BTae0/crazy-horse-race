import { COLORS, clampCount, sanitizeName } from './horses';
import { EVENT_BY_KIND, pickEvent, type EventKind } from './events';
import { mulberry32 } from './rng';

export const TRACK_M = 700;
export const DT = 1 / 60;

const BASE_SPEED = 16;
const SPEED_JITTER = 0.015;
const EVENT_RATE = 0.14;
const COOLDOWN_SEC = 2;
const GAIT_PER_M = 0.55;
const COAST_DECAY = 0.975;
const FINISH_OVERSHOOT_M = 5;

const BRAWL_SHARE = 0.3;
const BRAWL_RANGE_M = 18;
const BRAWL_APPROACH_SEC = 0.5;
const BRAWL_MIN_SEC = 2;
const BRAWL_VAR_SEC = 0.6;
const BRAWL_DRIFT = 0.6;
const BRAWL_SAFE_M = 60;
const ATTACKER_LANE_SHIFT = 0.7;
const LANE_RETURN_PER_SEC = 2.5;
const KO_FLING_SEC = 0.4;
const KO_FLING_SPEED = -0.8;
const KO_MIN_SEC = 1.6;
const KO_VAR_SEC = 0.6;
const VICTORY_SEC = 1.2;
const VICTORY_SPEED = 1.8;

const POS_SCALE_M = 50;
const SPRINT_START_M = 400;
const SPRINT_BOOST = 0.14;
const SPRINT_GAP_M = 10;
const LATE_RACE_M = 550;

export type Pose = 'run' | EventKind | 'brawl' | 'ko' | 'victory';
export type CommentaryKind = EventKind | 'brawl';

export interface Horse {
  id: number;
  number: number;
  color: string;
  colorName: string;
  name: string;
  label: string;
  x: number;
  speed: number;
  baseSpeed: number;
  pose: Pose;
  poseT: number;
  poseDur: number;
  param: number;
  cooldown: number;
  phase: number;
  events: number;
  finished: boolean;
  finishTime: number;
  rank: number;
  partner: number;
  role: 0 | 1;
  dir: number;
  lateral: number;
  brawlStart: number;
  fightX0: number;
  fightX: number;
}

export interface Commentary {
  time: number;
  horseId: number;
  kind: CommentaryKind;
  text: string;
}

function ease(p: number): number {
  return p * p * (3 - 2 * p);
}

export class Race {
  readonly horses: Horse[] = [];
  readonly finishOrder: number[] = [];
  readonly commentary: Commentary[] = [];
  time = 0;
  done = false;

  private rand: () => number;
  private liveAvg = 0;
  private liveLead = 0;

  constructor(count: number, seed: number, names: string[] = []) {
    this.rand = mulberry32(seed);
    const n = clampCount(count);
    for (let id = 0; id < n; id++) {
      const color = COLORS[id];
      const name = sanitizeName(names[id] ?? '') || color.name;
      this.horses.push({
        id,
        number: id + 1,
        color: color.hex,
        colorName: color.name,
        name,
        label: `${id + 1}번 ${name} 말`,
        x: 0,
        speed: 0,
        baseSpeed: BASE_SPEED * (1 + (this.rand() - 0.5) * 2 * SPEED_JITTER),
        pose: 'run',
        poseT: 0,
        poseDur: 0,
        param: 0,
        cooldown: 1 + this.rand() * 2,
        phase: 0,
        events: 0,
        finished: false,
        finishTime: 0,
        rank: -1,
        partner: -1,
        role: 0,
        dir: 0,
        lateral: 0,
        brawlStart: 0,
        fightX0: 0,
        fightX: 0,
      });
    }
  }

  step(): void {
    if (this.done) {
      this.coast();
      return;
    }
    this.time += DT;
    this.updatePack();
    const crossing: { horse: Horse; at: number }[] = [];
    for (const h of this.horses) {
      if (h.finished) {
        this.coastOne(h);
        continue;
      }
      if (h.pose === 'run') {
        h.speed = h.baseSpeed * (1 + this.sprintBoost(h));
        h.cooldown -= DT;
        if (h.cooldown <= 0 && this.rand() < EVENT_RATE * DT) this.startEvent(h);
      } else if (h.pose === 'brawl') {
        this.updateBrawl(h);
      } else if (h.pose === 'ko' || h.pose === 'victory') {
        this.updateAftermath(h);
      } else {
        const def = EVENT_BY_KIND[h.pose];
        h.poseT += DT;
        h.speed = def.speed(h.baseSpeed, h.poseT, h.poseDur, h.param);
        if (h.poseT >= h.poseDur) this.backToRun(h);
      }
      h.x = Math.max(0, h.x + h.speed * DT);
      h.phase += Math.abs(h.speed) * DT * GAIT_PER_M;
      if (h.x >= TRACK_M) {
        const over = h.x - TRACK_M;
        const interpolated = h.speed > 0.1 ? this.time - over / h.speed : this.time;
        crossing.push({ horse: h, at: Math.max(this.time - DT, interpolated) });
      }
    }
    crossing.sort((a, b) => a.at - b.at || b.horse.x - a.horse.x);
    for (const { horse, at } of crossing) {
      horse.finished = true;
      horse.x = Math.min(horse.x, TRACK_M + FINISH_OVERSHOOT_M);
      horse.speed = Math.max(0, Math.min(horse.speed, horse.baseSpeed));
      horse.finishTime = at;
      horse.pose = 'run';
      horse.poseT = 0;
      horse.lateral = 0;
      horse.partner = -1;
      horse.rank = this.finishOrder.length;
      this.finishOrder.push(horse.id);
    }
    if (this.finishOrder.length === this.horses.length) this.done = true;
  }

  private updatePack(): void {
    let sum = 0;
    let count = 0;
    let lead = 0;
    for (const h of this.horses) {
      if (h.finished) continue;
      sum += h.x;
      count++;
      if (h.x > lead) lead = h.x;
    }
    this.liveAvg = count > 0 ? sum / count : 0;
    this.liveLead = lead;
  }

  private sprintBoost(h: Horse): number {
    if (h.x < SPRINT_START_M) return 0;
    const ramp = Math.min(1, (h.x - SPRINT_START_M) / (TRACK_M - SPRINT_START_M));
    const gap = Math.min(1, Math.max(0, (this.liveLead - h.x) / SPRINT_GAP_M));
    return SPRINT_BOOST * ramp * gap;
  }

  private backToRun(h: Horse): void {
    h.pose = 'run';
    h.poseT = 0;
    h.cooldown = COOLDOWN_SEC;
  }

  private coast(): void {
    for (const h of this.horses) this.coastOne(h);
  }

  private coastOne(h: Horse): void {
    h.speed *= COAST_DECAY;
    if (Math.abs(h.speed) < 0.05) h.speed = 0;
    h.x += h.speed * DT;
    h.phase += Math.abs(h.speed) * DT * GAIT_PER_M;
  }

  private startEvent(h: Horse): void {
    if (this.rand() < BRAWL_SHARE && this.tryBrawl(h)) return;
    const score = Math.max(-1, Math.min(1, (h.x - this.liveAvg) / POS_SCALE_M));
    const def = pickEvent(this.rand, score, h.x >= LATE_RACE_M);
    h.pose = def.kind;
    h.poseT = 0;
    h.poseDur = def.minDur + this.rand() * (def.maxDur - def.minDur);
    h.param = def.roll(this.rand);
    h.events++;
    if (def.jump) h.x = Math.max(0, h.x + def.jump(h.param));
    this.commentary.push({ time: this.time, horseId: h.id, kind: def.kind, text: def.say(h.label) });
  }

  private tryBrawl(a: Horse): boolean {
    if (a.x > TRACK_M - BRAWL_SAFE_M) return false;
    const candidates = [a.id - 1, a.id + 1]
      .map((i) => this.horses[i])
      .filter(
        (p) =>
          p !== undefined &&
          !p.finished &&
          p.pose === 'run' &&
          p.x < TRACK_M - BRAWL_SAFE_M &&
          Math.abs(p.x - a.x) <= BRAWL_RANGE_M,
      );
    if (candidates.length === 0) return false;
    const d = candidates[Math.floor(this.rand() * candidates.length)];
    const dur = BRAWL_MIN_SEC + this.rand() * BRAWL_VAR_SEC;
    const attackerLoses = this.rand() < 0.5;
    const meet = (a.x + d.x) / 2;
    const sides: [Horse, Horse, 0 | 1][] = [
      [a, d, 1],
      [d, a, 0],
    ];
    for (const [h, other, role] of sides) {
      h.pose = 'brawl';
      h.poseT = 0;
      h.poseDur = dur;
      h.brawlStart = this.time;
      h.partner = other.id;
      h.role = role;
      h.dir = other.id - h.id;
      h.fightX0 = h.x;
      h.fightX = meet;
      h.param = (role === 1) === attackerLoses ? 1 : 0;
      h.events++;
    }
    this.commentary.push({
      time: this.time,
      horseId: a.id,
      kind: 'brawl',
      text: `${a.label}이 옆 레인으로 넘어가 ${d.label}에게 싸움을 걸었다!`,
    });
    return true;
  }

  private updateBrawl(h: Horse): void {
    const t = this.time - h.brawlStart;
    h.poseT = t;
    const ap = ease(Math.min(1, t / BRAWL_APPROACH_SEC));
    const drift = t > BRAWL_APPROACH_SEC ? BRAWL_DRIFT * h.baseSpeed * (t - BRAWL_APPROACH_SEC) : 0;
    const target = h.fightX0 + (h.fightX - h.fightX0) * ap + drift;
    h.speed = (target - h.x) / DT;
    h.lateral = h.role === 1 ? h.dir * ATTACKER_LANE_SHIFT * ap : 0;
    if (t >= h.poseDur) {
      const loser = h.param === 1;
      h.pose = loser ? 'ko' : 'victory';
      h.poseT = 0;
      h.poseDur = loser ? KO_MIN_SEC + this.rand() * KO_VAR_SEC : VICTORY_SEC;
      h.partner = -1;
    }
  }

  private updateAftermath(h: Horse): void {
    h.poseT += DT;
    if (h.pose === 'ko') h.speed = h.poseT < KO_FLING_SEC ? KO_FLING_SPEED * h.baseSpeed : 0;
    else h.speed = VICTORY_SPEED * h.baseSpeed;
    const back = LANE_RETURN_PER_SEC * DT;
    h.lateral += Math.max(-back, Math.min(back, -h.lateral));
    if (h.poseT >= h.poseDur) {
      h.lateral = 0;
      this.backToRun(h);
    }
  }

  ranking(): Horse[] {
    const arrived = this.finishOrder.map((id) => this.horses[id]);
    const rest = this.horses.filter((h) => !h.finished).sort((a, b) => b.x - a.x);
    return [...arrived, ...rest];
  }
}
