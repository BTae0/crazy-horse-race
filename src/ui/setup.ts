import { COLORS, DEFAULT_HORSES, MAX_HORSES, MIN_HORSES, clampCount } from '../game/horses';

const STORAGE_KEY = 'crazy-horse-race:v1';

function load(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    const n = typeof data === 'object' && data !== null ? (data as { count?: unknown }).count : undefined;
    return typeof n === 'number' ? clampCount(n) : DEFAULT_HORSES;
  } catch {
    return DEFAULT_HORSES;
  }
}

function save(count: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count }));
  } catch {
    /* 저장소를 쓸 수 없어도 동작에는 영향이 없다 */
  }
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 요소가 없습니다.`);
  return el as T;
}

export function initSetup(onStart: (count: number) => void): { count(): number } {
  const range = $<HTMLInputElement>('count');
  const label = $('countLabel');
  const preview = $('preview');
  let count = load();

  function render(): void {
    range.min = String(MIN_HORSES);
    range.max = String(MAX_HORSES);
    range.value = String(count);
    label.textContent = `${count}마리`;
    preview.replaceChildren(
      ...COLORS.slice(0, count).map((c, i) => {
        const li = document.createElement('li');
        const sw = document.createElement('span');
        sw.className = 'sw';
        sw.style.background = c.hex;
        sw.textContent = String(i + 1);
        const name = document.createElement('span');
        name.textContent = c.name;
        li.append(sw, name);
        return li;
      }),
    );
    save(count);
  }

  function set(n: number): void {
    count = clampCount(n);
    render();
  }

  range.addEventListener('input', () => set(Number(range.value)));
  $('minus').addEventListener('click', () => set(count - 1));
  $('plus').addEventListener('click', () => set(count + 1));
  $('start').addEventListener('click', () => onStart(count));

  render();
  return { count: () => count };
}
