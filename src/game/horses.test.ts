import { describe, it, expect } from 'vitest';
import { COLORS, MAX_HORSES, MIN_HORSES, DEFAULT_HORSES, clampCount } from './horses';

describe('horses', () => {
  it('색은 12종이며 이름과 값이 모두 고유하다', () => {
    expect(COLORS.length).toBe(12);
    expect(new Set(COLORS.map((c) => c.name)).size).toBe(12);
    expect(new Set(COLORS.map((c) => c.hex)).size).toBe(12);
    COLORS.forEach((c) => expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i));
  });
  it('말 수 범위는 2~12, 기본 6', () => {
    expect(MIN_HORSES).toBe(2);
    expect(MAX_HORSES).toBe(12);
    expect(DEFAULT_HORSES).toBe(6);
  });
  it('clampCount는 범위로 보정하고 정수로 내림한다', () => {
    expect(clampCount(0)).toBe(2);
    expect(clampCount(-5)).toBe(2);
    expect(clampCount(99)).toBe(12);
    expect(clampCount(5.9)).toBe(5);
    expect(clampCount(NaN)).toBe(DEFAULT_HORSES);
    expect(clampCount(Infinity)).toBe(DEFAULT_HORSES);
  });
});
