export interface HorseColor {
  name: string;
  hex: string;
}

export const COLORS: HorseColor[] = [
  { name: '빨강', hex: '#e53935' },
  { name: '파랑', hex: '#1e88e5' },
  { name: '초록', hex: '#43a047' },
  { name: '노랑', hex: '#fdd835' },
  { name: '보라', hex: '#8e24aa' },
  { name: '주황', hex: '#fb8c00' },
  { name: '분홍', hex: '#ec407a' },
  { name: '하늘', hex: '#29b6f6' },
  { name: '갈색', hex: '#8d6e63' },
  { name: '회색', hex: '#9e9e9e' },
  { name: '연두', hex: '#9ccc65' },
  { name: '청록', hex: '#00897b' },
];

export const MIN_HORSES = 2;
export const MAX_HORSES = 12;
export const DEFAULT_HORSES = 6;

export function clampCount(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_HORSES;
  return Math.min(MAX_HORSES, Math.max(MIN_HORSES, Math.floor(n)));
}
