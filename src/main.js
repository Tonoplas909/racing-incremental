import { WORLD, TRACKS, RIVALS, AUTOSAVE_MS } from './config.js';
import { formatMoney } from './format.js';
import { buildTrack, pointAt } from './track.js';
import { createRace, stepRace, tryNitro, standings } from './race.js';
import {
  playerParams, rivalParams, nitroStats, lapReward, overtakeReward,
  earn, settleRace, buyUpgrade, buyCar,
} from './economy.js';
import { loadGame, saveGame } from './save.js';
import { fitView, screenToWorld } from './view.js';
import { renderBackground } from './render/background.js';
import { createScene } from './render/scene.js';
import { createUI } from './ui.js';

const STEP = 1 / 120;
const MAX_FRAME = 0.25;
const UI_INTERVAL = 0.2;
const RACE_END_DELAY = 4;
const PICK_RADIUS = 26;

// Storage: fall back to memory when localStorage is unavailable.
let storage;
try {
  localStorage.getItem('x');
  storage = localStorage;
} catch {
  const mem = new Map();
  storage = {
    getItem: key => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => { mem.set(key, String(value)); },
  };
}
const profile = loadGame(storage);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const stage = canvas.parentElement;
const scene = createScene();

let race = null;
let raceTrackIndex = 0;
let ownIds = [];
let order = [];
let view = null;
let dpr = 1;
let bg = null;
let endTimer = null;

const ui = createUI(document.getElementById('panel'), {
  onUpgrade(key) {
    if (!buyUpgrade(profile, key)) return;
    if (key !== 'nitro' && race) {
      for (const car of race.cars) {
        if (car.own) car.params = playerParams(profile);
      }
    }
    refreshUI();
    persist();
  },
  onBuyCar() {
    if (!buyCar(profile)) return;
    refreshUI();
    persist();
  },
  onSelectTrack(index) {
    const def = TRACKS[index];
    if (!def || def.repRequired > profile.reputation) return;
    profile.trackIndex = index;
    refreshUI();
    persist();
  },
});

function persist() {
  saveGame(storage, profile);
}

function refreshUI() {
  ui.update({ profile, race, ownIds, standings: order, trackIndex: raceTrackIndex });
}

function rebuildBackground() {
  bg = view && race ? renderBackground(race.track, view, dpr) : null;
}

function startRace() {
  raceTrackIndex = profile.trackIndex;
  const entrants = [];
  ownIds = [];
  for (let i = 0; i < profile.cars; i++) {
    const id = 'p' + (i + 1);
    ownIds.push(id);
    entrants.push({
      id,
      own: true,
      teamId: 'player',
      label: 'Ton écurie #' + (i + 1),
      params: playerParams(profile),
    });
  }
  for (const rival of RIVALS) {
    entrants.push({
      id: rival.id,
      own: false,
      teamId: rival.id,
      label: rival.name,
      params: rivalParams(raceTrackIndex, rival.skill),
    });
  }
  race = createRace(buildTrack(TRACKS[raceTrackIndex]), entrants);
  order = standings(race);
  endTimer = null;
  rebuildBackground();
  refreshUI();
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (w === 0 || h === 0) return;
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  view = fitView(w, h, WORLD);
  rebuildBackground();
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'lap') {
      const car = race.cars.find(c => c.id === ev.carId);
      if (!car || !car.own) continue;
      const amount = lapReward(raceTrackIndex);
      earn(profile, amount);
      const p = pointAt(race.track, car.s, car.lateral);
      scene.addFloat(p.x, p.y - 20, '+' + formatMoney(amount) + ' $', '#ffd60a');
    } else if (ev.type === 'overtake') {
      const car = race.cars.find(c => c.id === ev.carId);
      if (!car || !car.own) continue;
      const amount = overtakeReward(raceTrackIndex, ev.count);
      earn(profile, amount);
      const p = pointAt(race.track, car.s, car.lateral);
      scene.addFloat(p.x, p.y - 20, 'Dépassement +' + formatMoney(amount) + ' $', '#4cc9f0');
    } else if (ev.type === 'raceEnd') {
      const result = settleRace(profile, ev.results, ownIds, raceTrackIndex);
      if (result.prize > 0) {
        scene.addFloat(WORLD.width / 2, WORLD.height / 2, 'Prix +' + formatMoney(result.prize) + ' $', '#37e873');
      }
      endTimer = RACE_END_DELAY;
      persist();
      refreshUI();
    }
  }
}

function buildOwnInfo() {
  const cooldown = nitroStats(profile).cooldown;
  const info = new Map();
  order.forEach((car, i) => {
    if (!car.own) return;
    const ready = race.time >= car.nitroReadyAt
      ? 1
      : Math.max(0, Math.min(1, (race.time - (car.nitroReadyAt - cooldown)) / cooldown));
    info.set(car.id, { rank: i + 1, nitroReady: ready, label: car.label });
  });
  return info;
}

let last = null;
let acc = 0;
let uiAcc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (last === null) {
    last = now;
    return;
  }
  const frameDt = Math.min(MAX_FRAME, (now - last) / 1000);
  last = now;

  acc += frameDt;
  while (acc >= STEP) {
    handleEvents(stepRace(race, STEP));
    acc -= STEP;
  }
  scene.update(race, frameDt);
  order = standings(race);

  if (endTimer !== null) {
    endTimer -= frameDt;
    if (endTimer <= 0) startRace();
  }

  if (view && bg) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    scene.draw(ctx, race, view, dpr, buildOwnInfo());
  }

  uiAcc += frameDt;
  if (uiAcc >= UI_INTERVAL) {
    uiAcc = 0;
    refreshUI();
  }
}

canvas.addEventListener('pointerdown', e => {
  if (!view || !race) return;
  const rect = canvas.getBoundingClientRect();
  const w = screenToWorld(view, e.clientX - rect.left, e.clientY - rect.top);
  let bestId = null;
  let bestDist = PICK_RADIUS;
  for (const car of race.cars) {
    if (!car.own) continue;
    const p = pointAt(race.track, car.s, car.lateral);
    const d = Math.hypot(p.x - w.x, p.y - w.y);
    if (d <= bestDist) {
      bestDist = d;
      bestId = car.id;
    }
  }
  if (bestId !== null) tryNitro(race, bestId, nitroStats(profile));
});

new ResizeObserver(resize).observe(stage);

// Autosave.
setInterval(persist, AUTOSAVE_MS);
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});

startRace();
resize();
requestAnimationFrame(frame);
