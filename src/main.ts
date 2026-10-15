import './styles.css';
import { DT, Race } from './game/race';
import { Renderer } from './render/renderer';
import { initSetup } from './ui/setup';
import { renderResult, runConfetti } from './ui/result';

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} 요소가 없습니다.`);
  return el as T;
}

const setupScreen = $('setup');
const raceScreen = $('race');
const resultEl = $('result');
const stage = $<HTMLCanvasElement>('stage');
const boardEl = $('board');
const countdownEl = $('countdown');
const speedBtn = $<HTMLButtonElement>('speed');
const pauseBtn = $<HTMLButtonElement>('pause');
const skipBtn = $<HTMLButtonElement>('skip');

const COUNTDOWN_SEC = 3.6;
const RESULT_DELAY_MS = 1800;
const MAX_STEPS_PER_FRAME = 8;
const SKIP_STEP_LIMIT = 60 * 600;

let renderer: Renderer | null = null;
let race: Race | null = null;
let count = 6;
let raf = 0;
let last = 0;
let acc = 0;
let speed = 1;
let paused = false;
let ended = false;
let countdownLeft = 0;
let boardTick = 0;
let clock = 0;
let resultTimer = 0;
let stopConfetti: () => void = () => undefined;

const setup = initSetup(startRace);

function newSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

function showScreen(name: 'setup' | 'race'): void {
  setupScreen.classList.toggle('hidden', name !== 'setup');
  raceScreen.classList.toggle('hidden', name !== 'race');
}

function startRace(n: number): void {
  count = n;
  hideResult();
  showScreen('race');
  $('back').focus();
  renderer ??= new Renderer(stage);
  renderer.resize();
  renderer.reset();
  race = new Race(n, newSeed());
  speed = 1;
  paused = false;
  ended = false;
  acc = 0;
  boardTick = 0;
  countdownLeft = COUNTDOWN_SEC;
  speedBtn.textContent = '1x';
  pauseBtn.textContent = '일시정지';
  skipBtn.classList.add('hidden');
  boardEl.replaceChildren();
  cancelAnimationFrame(raf);
  last = performance.now();
  raf = requestAnimationFrame(frame);
}

function frame(now: number): void {
  raf = requestAnimationFrame(frame);
  if (!race || !renderer) return;
  const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  clock += dt;

  if (countdownLeft > 0) {
    if (!paused) countdownLeft -= dt;
    updateCountdown();
  } else if (!paused) {
    acc += dt * speed;
    let n = 0;
    while (acc >= DT && n < MAX_STEPS_PER_FRAME) {
      race.step();
      acc -= DT;
      n++;
    }
    if (acc > DT * MAX_STEPS_PER_FRAME) acc = 0;
  }

  renderer.draw(race, clock);
  if (boardTick++ % 6 === 0) updateBoard();
  skipBtn.classList.toggle('hidden', !(race.finishOrder.length > 0 && !race.done));
  if (!ended && race.done) {
    ended = true;
    resultTimer = window.setTimeout(showResult, RESULT_DELAY_MS);
  }
}

function updateCountdown(): void {
  const remaining = Math.ceil(countdownLeft - (COUNTDOWN_SEC - 3));
  const text = remaining >= 1 ? String(remaining) : countdownLeft > 0 ? '출발!' : '';
  if (countdownEl.dataset.text !== text) {
    countdownEl.dataset.text = text;
    countdownEl.replaceChildren();
    if (text) {
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = text;
      countdownEl.append(n);
    }
  }
  countdownEl.classList.toggle('hidden', countdownLeft <= 0);
}

function updateBoard(): void {
  if (!race) return;
  const ol = document.createElement('ol');
  race.ranking().forEach((h, i) => {
    const li = document.createElement('li');
    const no = document.createElement('span');
    no.className = 'no';
    no.textContent = String(i + 1);
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = h.color;
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = `${h.number}번 ${h.colorName}`;
    li.append(no, sw, nm);
    if (h.finished) {
      const fin = document.createElement('span');
      fin.className = 'fin';
      fin.textContent = '도착';
      li.append(fin);
    }
    ol.append(li);
  });
  const title = document.createElement('h2');
  title.textContent = '실시간 순위';
  boardEl.replaceChildren(title, ol);
}

function showResult(): void {
  if (!race) return;
  paused = true;
  pauseBtn.textContent = '재개';
  renderResult(race);
  resultEl.classList.remove('hidden');
  raceScreen.inert = true;
  $('again').focus();
  stopConfetti();
  stopConfetti = runConfetti($<HTMLCanvasElement>('confetti'));
}

function hideResult(): void {
  window.clearTimeout(resultTimer);
  stopConfetti();
  resultEl.classList.add('hidden');
  raceScreen.inert = false;
}

function backToSetup(): void {
  hideResult();
  cancelAnimationFrame(raf);
  race = null;
  showScreen('setup');
  $('start').focus();
}

$('back').addEventListener('click', backToSetup);
$('toSetup').addEventListener('click', backToSetup);
$('again').addEventListener('click', () => startRace(count || setup.count()));
speedBtn.addEventListener('click', () => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  speedBtn.textContent = `${speed}x`;
});
pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? '재개' : '일시정지';
});
$('boardToggle').addEventListener('click', () => {
  const open = boardEl.classList.toggle('open');
  $('boardToggle').setAttribute('aria-expanded', String(open));
});
skipBtn.addEventListener('click', () => {
  if (!race || ended) return;
  for (let i = 0; i < SKIP_STEP_LIMIT && !race.done; i++) race.step();
  ended = true;
  window.clearTimeout(resultTimer);
  showResult();
});
window.addEventListener('resize', () => renderer?.resize());
