import { describe, it, expect } from 'vitest';
import { COLORS, MAX_HORSES, MIN_HORSES, DEFAULT_HORSES, MAX_NAME_LEN, clampCount, sanitizeName } from './horses';

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

describe('sanitizeName', () => {
  it('앞뒤 공백을 제거하고 연속 공백을 하나로 줄인다', () => {
    expect(sanitizeName('  번개   하나 ')).toBe('번개 하나');
  });
  it('빈 문자열과 공백만 있는 문자열은 빈 문자열이다', () => {
    expect(sanitizeName('')).toBe('');
    expect(sanitizeName('   \t\n ')).toBe('');
  });
  it(`최대 ${MAX_NAME_LEN}자로 자른다(이모지 같은 서로게이트 쌍은 깨지지 않는다)`, () => {
    expect(MAX_NAME_LEN).toBe(10);
    expect(sanitizeName('가나다라마바사아자차카타')).toBe('가나다라마바사아자차');
    const emoji = '🐴'.repeat(12);
    expect(Array.from(sanitizeName(emoji)).length).toBe(10);
    expect(sanitizeName(emoji)).toBe('🐴'.repeat(10));
  });
  it('제어 문자는 제거한다', () => {
    expect(sanitizeName('번\u0000개\u0007')).toBe('번개');
  });
  it('문자열이 아닌 값은 빈 문자열이다', () => {
    expect(sanitizeName(undefined as unknown as string)).toBe('');
    expect(sanitizeName(null as unknown as string)).toBe('');
    expect(sanitizeName(5 as unknown as string)).toBe('');
  });
});
