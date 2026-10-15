import { describe, it, expect } from 'vitest';
import { Race, TRACK_M } from './race';

function run(count: number, seed: number, limitSec = 400): Race {
  const race = new Race(count, seed);
  while (!race.done && race.time < limitSec) race.step();
  return race;
}

describe('Race 완주', () => {
  for (const n of [2, 3, 6, 9, 12]) {
    it(`말 ${n}마리, 시드 20개: 전원 완주하고 순위가 중복 없이 확정된다`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const race = run(n, seed);
        expect(race.done, `n=${n} seed=${seed}`).toBe(true);
        expect(race.finishOrder.length).toBe(n);
        expect(new Set(race.finishOrder).size).toBe(n);
        expect(race.horses.map((h) => h.rank).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
        race.horses.forEach((h) => expect(h.finished).toBe(true));
      }
    });
  }

  it('말 수는 2~12로 보정된다', () => {
    expect(new Race(0, 1).horses.length).toBe(2);
    expect(new Race(99, 1).horses.length).toBe(12);
    expect(new Race(NaN, 1).horses.length).toBe(6);
  });

  it('말마다 색이 다르고 번호는 1부터 순서대로다', () => {
    const race = new Race(12, 1);
    expect(new Set(race.horses.map((h) => h.color)).size).toBe(12);
    expect(race.horses.map((h) => h.number)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
  });
});

describe('Race 재현성', () => {
  it('같은 시드는 같은 순위와 해설을 낸다', () => {
    const a = run(6, 7);
    const b = run(6, 7);
    expect(a.finishOrder).toEqual(b.finishOrder);
    expect(a.commentary).toEqual(b.commentary);
  });
  it('다른 시드는 다른 순위를 낼 수 있다', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) orders.add(run(6, seed).finishOrder.join(','));
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('Race 복불복 특성', () => {
  it('시드 100개에서 사건 10종과 난투극이 모두 발생한다', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) run(6, seed).commentary.forEach((c) => seen.add(c.kind));
    expect(seen.size).toBe(11);
    expect(seen.has('brawl')).toBe(true);
  });

  it('경주 시간 평균은 35~65초이고 모든 경주가 25~110초 안에 끝난다', () => {
    let sum = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const t = run(6, seed).time;
      expect(t).toBeGreaterThan(25);
      expect(t).toBeLessThan(110);
      sum += t;
    }
    const avg = sum / 40;
    expect(avg).toBeGreaterThan(35);
    expect(avg).toBeLessThan(65);
  });

  it('말 한 마리당 사건 횟수는 평균 2~12회다', () => {
    let events = 0;
    let horses = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const r = run(6, seed);
      events += r.horses.reduce((s, h) => s + h.events, 0);
      horses += r.horses.length;
    }
    expect(events / horses).toBeGreaterThan(2);
    expect(events / horses).toBeLessThan(12);
  });

  it('우승이 한 말에 쏠리지 않는다(6마리, 300경주)', () => {
    const wins = new Array(6).fill(0);
    for (let seed = 1; seed <= 300; seed++) wins[run(6, seed).finishOrder[0]]++;
    wins.forEach((w) => {
      expect(w / 300).toBeGreaterThan(0.05);
      expect(w / 300).toBeLessThan(0.32);
    });
  });
});

describe('Race 위치와 도착 판정', () => {
  it('위치는 항상 0 이상이고 유한하며, 도착한 말은 결승선 이상이다', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const race = new Race(8, seed);
      let bad = 0;
      while (!race.done && race.time < 400) {
        race.step();
        for (const h of race.horses) if (!Number.isFinite(h.x) || h.x < 0) bad++;
      }
      expect(bad, `seed ${seed}`).toBe(0);
      race.horses.forEach((h) => expect(h.x).toBeGreaterThanOrEqual(TRACK_M));
    }
  }, 30000);

  it('먼저 도착해도 나머지 말은 계속 달려 모두 도착한다', () => {
    const race = new Race(6, 3);
    while (race.finishOrder.length < 1) race.step();
    expect(race.done).toBe(false);
    while (!race.done && race.time < 400) race.step();
    expect(race.finishOrder.length).toBe(6);
  });

  it('도착 순위는 finishTime 순서와 일치한다', () => {
    const race = run(10, 11);
    const times = race.finishOrder.map((id) => race.horses[id].finishTime);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
  });

  it('ranking()은 도착한 말이 먼저, 나머지는 앞선 순서다', () => {
    const race = new Race(6, 4);
    for (let i = 0; i < 60 * 20; i++) race.step();
    const xs = race.ranking().map((h) => h.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThanOrEqual(xs[i - 1]);
    while (!race.done) race.step();
    expect(race.ranking().map((h) => h.id)).toEqual(race.finishOrder);
  });

  it('해설은 시간 순서이고 말과 종류 정보를 가진다', () => {
    const race = run(6, 5);
    for (let i = 1; i < race.commentary.length; i++) {
      expect(race.commentary[i].time).toBeGreaterThanOrEqual(race.commentary[i - 1].time);
    }
    race.commentary.forEach((c) => {
      expect(c.text.length).toBeGreaterThan(3);
      expect(c.horseId).toBeGreaterThanOrEqual(0);
    });
  });

  it('도착한 말은 결승선을 지나 서서히 감속하고 일정 거리 안에서 멈춘다', () => {
    const race = new Race(6, 8);
    while (race.finishOrder.length < 1) race.step();
    const first = race.horses[race.finishOrder[0]];
    const xAtFinish = first.x;
    for (let i = 0; i < 60 * 10; i++) race.step();
    expect(first.pose).toBe('run');
    expect(first.x).toBeGreaterThan(xAtFinish);
    expect(first.x).toBeLessThan(TRACK_M + 30);
    expect(Math.abs(first.speed)).toBeLessThan(0.1);
  });

  it('여러 시드에서 도착 순위와 기록 순서가 항상 일치한다(순간이동 포함, 12마리)', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const race = run(12, seed);
      const times = race.finishOrder.map((id) => race.horses[id].finishTime);
      for (let i = 1; i < times.length; i++) {
        expect(times[i], `seed ${seed} rank ${i + 1}`).toBeGreaterThanOrEqual(times[i - 1]);
      }
    }
  });

  it('순간이동으로 도착해도 결승선 너머 30 m를 넘지 않는다', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const race = run(12, seed);
      race.horses.forEach((h) => {
        expect(h.x, `seed ${seed} horse ${h.number}`).toBeGreaterThanOrEqual(TRACK_M);
        expect(h.x, `seed ${seed} horse ${h.number}`).toBeLessThan(TRACK_M + 30);
      });
    }
  });
});

describe('Race 난투극', () => {
  it('6마리 경주 100개 중 90개 이상에서 난투극이 발생한다', () => {
    let races = 0;
    for (let seed = 1; seed <= 100; seed++) if (run(6, seed).commentary.some((c) => c.kind === 'brawl')) races++;
    expect(races).toBeGreaterThanOrEqual(90);
  });

  it('2마리 경주에서도 난투극이 발생한다', () => {
    let races = 0;
    for (let seed = 1; seed <= 80; seed++) if (run(2, seed).commentary.some((c) => c.kind === 'brawl')) races++;
    expect(races).toBeGreaterThan(10);
  });

  it('난투극은 인접 레인의 가까운 두 말 사이에서, 결승선 60 m 전에 시작되고 서로를 가리킨다', () => {
    let starts = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const race = new Race(6, seed);
      const prev = race.horses.map(() => 'run');
      while (!race.done && race.time < 400) {
        race.step();
        for (const h of race.horses) {
          if (h.pose === 'brawl' && prev[h.id] !== 'brawl') {
            const p = race.horses[h.partner];
            starts++;
            expect(p.pose, `seed ${seed}`).toBe('brawl');
            expect(Math.abs(h.id - p.id)).toBe(1);
            expect(p.partner).toBe(h.id);
            expect(Math.abs(h.x - p.x)).toBeLessThan(20);
            expect(h.x).toBeLessThan(TRACK_M - 50);
          }
        }
        race.horses.forEach((h) => (prev[h.id] = h.pose));
      }
    }
    expect(starts).toBeGreaterThan(100);
  }, 60000);

  it('난투극이 끝나면 한 마리는 K.O., 다른 한 마리는 승리 자세가 되고 K.O.는 1.6~2.2초다', () => {
    let ends = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const race = new Race(6, seed);
      const prev = race.horses.map(() => ({ pose: 'run', partner: -1 }));
      while (!race.done && race.time < 400) {
        race.step();
        for (const h of race.horses) {
          const before = prev[h.id];
          if (before.pose === 'brawl' && h.pose !== 'brawl') {
            const p = race.horses[before.partner];
            ends++;
            expect([h.pose, p.pose].sort(), `seed ${seed}`).toEqual(['ko', 'victory']);
            if (h.pose === 'ko') {
              expect(h.poseDur).toBeGreaterThanOrEqual(1.6);
              expect(h.poseDur).toBeLessThanOrEqual(2.21);
            }
          }
        }
        race.horses.forEach((h) => (prev[h.id] = { pose: h.pose, partner: h.partner }));
      }
    }
    expect(ends).toBeGreaterThan(100);
  }, 60000);

  it('평소(run) 상태의 말은 항상 자기 레인에 있다', () => {
    let bad = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const race = new Race(6, seed);
      while (!race.done && race.time < 400) {
        race.step();
        for (const h of race.horses) if (h.pose === 'run' && Math.abs(h.lateral) > 1e-6) bad++;
      }
    }
    expect(bad).toBe(0);
  }, 60000);

  it('K.O.와 승자 모두 이후 정상적으로 완주한다', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const race = run(6, seed);
      expect(race.done, `seed ${seed}`).toBe(true);
    }
  });
});

describe('Race 레인 중립성', () => {
  it('난투극이 있어도 6마리 경주의 레인별 우승률은 11~22 %로 고르다(1200경주)', () => {
    const wins = new Array(6).fill(0);
    const races = 1200;
    for (let seed = 1; seed <= races; seed++) wins[run(6, seed * 7 + 1).finishOrder[0]]++;
    wins.forEach((w, lane) => {
      expect(w / races, `lane ${lane + 1}`).toBeGreaterThan(0.11);
      expect(w / races, `lane ${lane + 1}`).toBeLessThan(0.22);
    });
  }, 120000);
});

describe('Race 접전 보정(위치별 사건 + 막판 스퍼트)', () => {
  const BAD = new Set(['trip', 'moonwalk', 'nap', 'uturn', 'warp']);

  it('550 m 이후에는 큰 손실 사건과 순간이동이 새로 시작되지 않는다', () => {
    let seen = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const race = new Race(6, seed);
      const prev = race.horses.map(() => 'run');
      while (!race.done && race.time < 400) {
        const xBefore = race.horses.map((h) => h.x);
        race.step();
        for (const h of race.horses) {
          if (BAD.has(h.pose) && !BAD.has(prev[h.id])) {
            seen++;
            expect(xBefore[h.id], `seed ${seed} horse ${h.number}`).toBeLessThan(551);
          }
          prev[h.id] = h.pose;
        }
      }
    }
    expect(seen).toBeGreaterThan(200);
  }, 60000);

  it('400 m 전에는 평소 속도 그대로이고, 막판에는 뒤처진 말만 빨라진다', () => {
    let boosted = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const race = new Race(6, seed);
      while (!race.done && race.time < 400) {
        const live = race.horses.filter((h) => !h.finished);
        const lead = Math.max(...live.map((h) => h.x));
        const before = live.map((h) => h.pose);
        const preGap = live.map((h) => lead - h.x);
        race.step();
        for (const [i, h] of live.entries()) {
          if (h.finished || h.pose !== 'run' || before[i] !== 'run') continue;
          if (h.x < 395) expect(h.speed, `seed ${seed}`).toBeCloseTo(h.baseSpeed, 6);
          const gap = preGap[i];
          if (h.x > 650 && h.x < 690 && gap > 40) {
            boosted++;
            expect(h.speed, `seed ${seed}`).toBeGreaterThan(h.baseSpeed * 1.03);
          }
          if (gap === 0 && h.x < 690) expect(h.speed).toBeLessThanOrEqual(h.baseSpeed * 1.0001);
        }
      }
    }
    expect(boosted).toBeGreaterThan(50);
  }, 60000);

  it('6마리 300경주: 1·2위 평균 간격 1.5초 이하, 1초 미만 비율 45 % 이상', () => {
    const gaps: number[] = [];
    for (let seed = 1; seed <= 300; seed++) {
      const race = run(6, seed * 11 + 3);
      const t = race.finishOrder.map((id) => race.horses[id].finishTime);
      gaps.push(t[1] - t[0]);
    }
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const close = gaps.filter((g) => g < 1).length / gaps.length;
    expect(avg).toBeLessThanOrEqual(1.5);
    expect(close).toBeGreaterThanOrEqual(0.45);
  }, 120000);

  it('접전 보정이 있어도 선두 교체가 평균 3회 이상 일어난다(6마리 200경주)', () => {
    let changes = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const race = new Race(6, seed * 11 + 3);
      let lead = -1;
      while (!race.done && race.time < 400) {
        race.step();
        const l = race.ranking()[0].id;
        if (lead !== -1 && l !== lead && race.time > 5) changes++;
        lead = l;
      }
    }
    expect(changes / 200).toBeGreaterThanOrEqual(3);
  }, 120000);
});

describe('Race 말 이름', () => {
  it('이름을 주면 말 이름과 라벨에 반영되고, 비어 있으면 색 이름을 쓴다', () => {
    const race = new Race(3, 1, ['번개', '   ', '']);
    expect(race.horses[0].name).toBe('번개');
    expect(race.horses[0].label).toBe('1번 번개 말');
    expect(race.horses[1].name).toBe('파랑');
    expect(race.horses[1].label).toBe('2번 파랑 말');
    expect(race.horses[2].name).toBe('초록');
  });

  it('이름을 안 주거나 말 수보다 많이 줘도 안전하다', () => {
    expect(new Race(2, 1).horses.map((h) => h.name)).toEqual(['빨강', '파랑']);
    const race = new Race(2, 1, ['가', '나', '다', '라']);
    expect(race.horses.map((h) => h.name)).toEqual(['가', '나']);
  });

  it('긴 이름은 10자로 자르고 앞뒤 공백은 지운다', () => {
    const race = new Race(2, 1, ['  가나다라마바사아자차카타  ', '번개']);
    expect(race.horses[0].name).toBe('가나다라마바사아자차');
  });

  it('이름은 경주 결과에 영향을 주지 않는다(같은 시드는 같은 순위)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const plain = run(6, seed);
      const named = new Race(6, seed, ['하나', '둘', '셋', '넷', '다섯', '여섯']);
      while (!named.done && named.time < 400) named.step();
      expect(named.finishOrder, `seed ${seed}`).toEqual(plain.finishOrder);
      expect(named.time).toBe(plain.time);
    }
  });

  it('해설 문구에도 사용자 이름이 들어간다', () => {
    const race = run(2, 3);
    race.commentary.forEach((c) => expect(c.text).toMatch(/번 .* 말/));
    const named = new Race(2, 3, ['번개', '천둥']);
    while (!named.done && named.time < 400) named.step();
    expect(named.commentary.some((c) => c.text.includes('번개') || c.text.includes('천둥'))).toBe(true);
  });
});
