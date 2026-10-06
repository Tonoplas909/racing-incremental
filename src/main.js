import { buildTrackPath } from './geometry.js';
import { stepCars } from './simulation.js';
import { loadGame, saveGame } from './save.js';
import { createRenderer, TRACK_INSET } from './render.js';
import { buySegment, buyUpgrade } from './economy.js';
import { checkpointPositions } from './track.js';
import { createRateMeter } from './stats.js';
import { createUI } from './ui.js';
import { AUTOSAVE_MS } from './config.js';

// Merely reading window.localStorage can throw in some browsers: fall back to memory.
function resolveStorage() {
  try {
    const storage = window.localStorage;
    storage.getItem('racingGame');
    return storage;
  } catch {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => { memory.set(key, String(value)); },
    };
  }
}

const storage = resolveStorage();
const canvas = document.getElementById('track');
const renderer = createRenderer(canvas);
const state = loadGame(storage);

let path = null;

function rebuildPath() {
  const { width, height } = renderer.resize();
  path = buildTrackPath(state.segments, width - 2 * TRACK_INSET, height - 2 * TRACK_INSET);
  path.checkpoints = checkpointPositions(state.segments);
}

rebuildPath();
new ResizeObserver(rebuildPath).observe(canvas);

function save() {
  saveGame(storage, state);
}

const ui = createUI(document.getElementById('panel'), {
  onBuySegment(type) {
    if (buySegment(state, type)) {
      rebuildPath();
      save();
      ui.update(state, rateMeter.rate());
    }
  },
  onBuyUpgrade(kind) {
    if (buyUpgrade(state, kind)) {
      save();
      ui.update(state, rateMeter.rate());
    }
  },
});

const rateMeter = createRateMeter(5000);
const UI_INTERVAL_MS = 250;
const RATE_INTERVAL_MS = 1000;
let lastUi = -Infinity;
let lastRate = -Infinity;
let last = 0;

function frame(now) {
  stepCars(state, (now - last) / 1000);
  last = now;

  if (now - lastRate >= RATE_INTERVAL_MS) {
    rateMeter.push(now, state.stats.totalEarned);
    lastRate = now;
  }
  if (now - lastUi >= UI_INTERVAL_MS) {
    ui.update(state, rateMeter.rate());
    lastUi = now;
  }

  renderer.draw(state, path);
  requestAnimationFrame(frame);
}

// The first callback only seeds the timestamp so dt is never negative or NaN.
requestAnimationFrame((now) => {
  last = now;
  requestAnimationFrame(frame);
});

setInterval(save, AUTOSAVE_MS);
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
