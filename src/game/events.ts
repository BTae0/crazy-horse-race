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
    roll: (rand) => 0.6 + rand() * 1,
    speed: (b, _t, _d, p) => b * p,
    say: (who) => `${who}이 두 발로 벌떡 일어서서 달린다!`,
  },
  {
    kind: 'rocket',
    weight: 10,
    minDur: 1.3,
    maxDur: 1.8,
    roll: none,
    speed: (b) => b * 2.4,
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
    roll: (rand) => 25 + rand() * 25,
    speed: (_b, _t, dur, p) => p / dur,
    say: (who) => `${who}이 공중제비를 돌며 도약했다!`,
  },
  {
    kind: 'banana',
    weight: 9,
    minDur: 1.2,
    maxDur: 2,
    roll: (rand) => -1.2 + rand() * 3.8,
    speed: (b, _t, _d, p) => b * p,
    say: (who) => `${who}이 바나나 껍질을 밟고 빙글빙글 미끄러진다!`,
  },
  {
    kind: 'wings',
    weight: 9,
    minDur: 2,
    maxDur: 3,
    roll: none,
    speed: (b) => b * 1.7,
    say: (who) => `${who}에게 날개가 돋았다! 날아간다!`,
  },
  {
    kind: 'warp',
    weight: 6,
    minDur: 0.8,
    maxDur: 0.8,
    roll: (rand) => (rand() < 0.5 ? -1 : 1) * (30 + rand() * 50),
    speed: () => 0,
    jump: (p) => p,
    say: (who) => `${who}이 순간이동했다!`,
  },
];

export const EVENT_BY_KIND = Object.fromEntries(EVENTS.map((e) => [e.kind, e])) as Record<EventKind, EventDef>;

const TOTAL_WEIGHT = EVENTS.reduce((sum, e) => sum + e.weight, 0);

export function pickEvent(rand: () => number): EventDef {
  let r = rand() * TOTAL_WEIGHT;
  for (const e of EVENTS) {
    r -= e.weight;
    if (r < 0) return e;
  }
  return EVENTS[EVENTS.length - 1];
}
