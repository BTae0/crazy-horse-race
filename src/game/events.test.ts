import { describe, it, expect } from 'vitest';
import { EVENTS, EVENT_BY_KIND, pickEvent, type EventKind } from './events';
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
