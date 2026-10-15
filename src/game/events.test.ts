import { describe, it, expect } from 'vitest';
import { EVENTS, EVENT_BY_KIND, EVENT_TONE, pickEvent, weightFactor, type EventKind } from './events';
import { mulberry32 } from './rng';

const KINDS: EventKind[] = ['trip', 'moonwalk', 'biped', 'rocket', 'nap', 'uturn', 'backflip', 'banana', 'wings', 'warp'];

describe('events', () => {
  it('사건 10종이 모두 정의되어 있다', () => {
    expect(EVENTS.map((e) => e.kind).sort()).toEqual([...KINDS].sort());
    KINDS.forEach((k) => expect(EVENT_BY_KIND[k].kind).toBe(k));
  });
  it('지속시간과 가중치가 유효하다', () => {
    for (const e of EVENTS) {
      expect(e.weight).toBeGreaterThan(0);
      expect(e.minDur).toBeGreaterThan(0);
      expect(e.maxDur).toBeGreaterThanOrEqual(e.minDur);
      expect(e.maxDur).toBeLessThanOrEqual(4);
    }
  });
  it('속도 함수는 모든 시점에서 유한한 값을 낸다', () => {
    const rand = mulberry32(1);
    for (const e of EVENTS) {
      for (let i = 0; i < 50; i++) {
        const param = e.roll(rand);
        const dur = e.minDur + rand() * (e.maxDur - e.minDur);
        for (let t = 0; t <= dur; t += dur / 10) {
          expect(Number.isFinite(e.speed(16, t, dur, param)), e.kind).toBe(true);
        }
      }
    }
  });
  it('해설 문구는 말 이름을 포함한다', () => {
    for (const e of EVENTS) expect(e.say('3번 빨강 말')).toContain('3번 빨강 말');
  });
  it('후진 사건은 속도가 음수, 정지 사건은 0이다', () => {
    expect(EVENT_BY_KIND.moonwalk.speed(16, 1, 2, 0)).toBeLessThan(0);
    expect(EVENT_BY_KIND.uturn.speed(16, 1, 2, 0)).toBeLessThan(0);
    expect(EVENT_BY_KIND.nap.speed(16, 1, 2, 0)).toBe(0);
    expect(EVENT_BY_KIND.rocket.speed(16, 1, 1.5, 0)).toBeGreaterThan(16);
  });
  it('백플립은 지속시간 동안 param(m)만큼 이동한다', () => {
    const e = EVENT_BY_KIND.backflip;
    expect(e.speed(16, 0.5, 1.0, 40) * 1.0).toBeCloseTo(40);
  });
  it('pickEvent는 시드가 같으면 같은 결과이고 모든 종류가 나온다', () => {
    const a = mulberry32(5);
    const b = mulberry32(5);
    for (let i = 0; i < 20; i++) expect(pickEvent(a).kind).toBe(pickEvent(b).kind);
    const r = mulberry32(2);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(pickEvent(r).kind);
    expect(seen.size).toBe(10);
  });
});

describe('위치별 사건 가중치', () => {
  const GOOD: EventKind[] = ['rocket', 'wings', 'backflip'];
  const BAD: EventKind[] = ['trip', 'moonwalk', 'nap', 'uturn'];

  it('사건 성격 분류: 좋은 3종, 나쁜 4종, 나머지 중립', () => {
    GOOD.forEach((k) => expect(EVENT_TONE[k]).toBe('good'));
    BAD.forEach((k) => expect(EVENT_TONE[k]).toBe('bad'));
    EVENTS.filter((x) => !GOOD.includes(x.kind) && !BAD.includes(x.kind)).forEach((x) => expect(EVENT_TONE[x.kind]).toBe('neutral'));
  });

  it('위치 점수 0이면 모든 사건의 배율이 1이다', () => {
    (['good', 'bad', 'neutral'] as const).forEach((tone) => expect(weightFactor(tone, 0)).toBe(1));
  });

  it('뒤처진 말(p=-1)은 좋은 사건 3.5배, 나쁜 사건 0.2배다', () => {
    expect(weightFactor('good', -1)).toBeCloseTo(3.5);
    expect(weightFactor('bad', -1)).toBeCloseTo(0.2);
  });

  it('앞선 말(p=1)은 나쁜 사건 3배, 좋은 사건 0.2배다', () => {
    expect(weightFactor('bad', 1)).toBeCloseTo(3);
    expect(weightFactor('good', 1)).toBeCloseTo(0.2);
  });

  it('중립 사건은 위치와 무관하게 1배다', () => {
    [-1, -0.5, 0.5, 1].forEach((p) => expect(weightFactor('neutral', p)).toBe(1));
  });

  it('범위 밖 점수는 -1~1로 보정된다', () => {
    expect(weightFactor('good', -5)).toBeCloseTo(weightFactor('good', -1));
    expect(weightFactor('bad', 9)).toBeCloseTo(weightFactor('bad', 1));
  });

  it('뒤처진 말은 앞선 말보다 좋은 사건을 더 자주 고른다', () => {
    const count = (p: number): number => {
      const rand = mulberry32(11);
      let good = 0;
      for (let i = 0; i < 6000; i++) if (EVENT_TONE[pickEvent(rand, p).kind] === 'good') good++;
      return good;
    };
    expect(count(-1)).toBeGreaterThan(count(0) * 1.3);
    expect(count(0)).toBeGreaterThan(count(1) * 1.3);
  });

  it('막판(late=true)에는 나쁜 사건과 순간이동이 절대 나오지 않지만 나머지는 나온다', () => {
    const rand = mulberry32(3);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const kind = pickEvent(rand, 1, true).kind;
      expect(EVENT_TONE[kind]).not.toBe('bad');
      expect(kind).not.toBe('warp');
      seen.add(kind);
    }
    expect([...seen].sort()).toEqual(['backflip', 'banana', 'biped', 'rocket', 'wings']);
  });

  it('막판이 아니면(late=false, 기본) 순간이동도 나온다', () => {
    const rand = mulberry32(4);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) seen.add(pickEvent(rand, 0).kind);
    expect(seen.has('warp')).toBe(true);
  });
});
