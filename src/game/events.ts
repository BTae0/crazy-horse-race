export type EventKind =
  | 'trip'
  | 'moonwalk'
  | 'biped'
  | 'rocket'
  | 'nap'
  | 'uturn'
  | 'backflip'
  | 'banana'
  | 'wings'
  | 'warp';

export interface EventDef {
  kind: EventKind;
  weight: number;
  minDur: number;
  maxDur: number;
  roll: (rand: () => number) => number;
  speed: (base: number, t: number, dur: number, param: number) => number;
  jump?: (param: number) => number;
  say: (who: string) => string;
}

const none = (): number => 0;

export const EVENTS: EventDef[] = [
  {
    kind: 'trip',
    weight: 10,
    minDur: 1.8,
    maxDur: 2.8,
    roll: none,
    speed: (b, t) => b * 0.6 * Math.max(0, 1 - t / 0.7),
    say: (who) => `${who}이 발이 꼬여 대자로 넘어졌다!`,
  },
  {
    kind: 'moonwalk',
    weight: 8,
    minDur: 2,
    maxDur: 3,
    roll: none,
    speed: (b) => -b * 0.7,
    say: (who) => `${who}이 갑자기 뒤로 문워크를 시작했다!`,
  },
  {
    kind: 'biped',
    weight: 9,
    minDur: 2,
    maxDur: 3.5,
    roll: (rand) => 0.6 + rand() * 0.8,
    speed: (b, _t, _d, p) => b * p,
    say: (who) => `${who}이 두 발로 벌떡 일어서서 달린다!`,
  },
  {
    kind: 'rocket',
    weight: 10,
    minDur: 1.3,
    maxDur: 1.8,
    roll: none,
    speed: (b) => b * 1.8,
    say: (who) => `${who} 엉덩이에서 로켓이 발사됐다!`,
  },
  {
    kind: 'nap',
    weight: 7,
    minDur: 1.8,
    maxDur: 3,
    roll: none,
    speed: () => 0,
    say: (who) => `${who}이 갑자기 꾸벅꾸벅 졸기 시작했다…`,
  },
  {
    kind: 'uturn',
    weight: 8,
    minDur: 1.2,
    maxDur: 2,
    roll: none,
    speed: (b) => -b * 0.9,
    say: (who) => `${who}이 방향을 착각해 거꾸로 달린다!`,
  },
  {
    kind: 'backflip',
    weight: 8,
    minDur: 1,
    maxDur: 1.2,
    roll: (rand) => 16 + rand() * 14,
    speed: (_b, _t, dur, p) => p / dur,
    say: (who) => `${who}이 공중제비를 돌며 도약했다!`,
  },
  {
    kind: 'banana',
    weight: 9,
    minDur: 1.2,
    maxDur: 2,
    roll: (rand) => -1 + rand() * 2.8,
    speed: (b, _t, _d, p) => b * p,
    say: (who) => `${who}이 바나나 껍질을 밟고 빙글빙글 미끄러진다!`,
  },
  {
    kind: 'wings',
    weight: 9,
    minDur: 2,
    maxDur: 3,
    roll: none,
    speed: (b) => b * 1.4,
    say: (who) => `${who}에게 날개가 돋았다! 날아간다!`,
  },
  {
    kind: 'warp',
    weight: 6,
    minDur: 0.8,
    maxDur: 0.8,
    roll: (rand) => (rand() < 0.5 ? -1 : 1) * (12 + rand() * 18),
    speed: () => 0,
    jump: (p) => p,
    say: (who) => `${who}이 순간이동했다!`,
  },
];

export const EVENT_BY_KIND = Object.fromEntries(EVENTS.map((e) => [e.kind, e])) as Record<EventKind, EventDef>;

export type EventTone = 'good' | 'bad' | 'neutral';

export const EVENT_TONE: Record<EventKind, EventTone> = {
  rocket: 'good',
  wings: 'good',
  backflip: 'good',
  trip: 'bad',
  moonwalk: 'bad',
  nap: 'bad',
  uturn: 'bad',
  biped: 'neutral',
  banana: 'neutral',
  warp: 'neutral',
};

const TRAILING_GOOD_UP = 2.5;
const TRAILING_BAD_DOWN = 0.8;
const LEADING_BAD_UP = 2;
const LEADING_GOOD_DOWN = 0.8;

export function weightFactor(tone: EventTone, score: number): number {
  const p = Math.max(-1, Math.min(1, score));
  if (tone === 'neutral') return 1;
  if (p < 0) return tone === 'good' ? 1 + TRAILING_GOOD_UP * -p : 1 - TRAILING_BAD_DOWN * -p;
  return tone === 'bad' ? 1 + LEADING_BAD_UP * p : 1 - LEADING_GOOD_DOWN * p;
}

export function pickEvent(rand: () => number, score = 0, late = false): EventDef {
  let total = 0;
  const weights = EVENTS.map((e) => {
    const tone = EVENT_TONE[e.kind];
    const blocked = late && (tone === 'bad' || e.kind === 'warp');
    const w = blocked ? 0 : e.weight * weightFactor(tone, score);
    total += w;
    return w;
  });
  let r = rand() * total;
  for (let i = 0; i < EVENTS.length; i++) {
    r -= weights[i];
    if (r < 0 && weights[i] > 0) return EVENTS[i];
  }
  for (let i = EVENTS.length - 1; i >= 0; i--) if (weights[i] > 0) return EVENTS[i];
  return EVENTS[EVENTS.length - 1];
}
