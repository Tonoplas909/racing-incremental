import { buildTrackPath } from './geometry.js';
import { stepCars } from './simulation.js';
import { loadGame } from './save.js';
import { createRenderer, TRACK_INSET } from './render.js';

const canvas = document.getElementById('track');
const renderer = createRenderer(canvas);
const state = loadGame(localStorage);

let path = null;

function rebuildPath() {
  const { width, height } = renderer.resize();
  path = buildTrackPath(state.segments, width - 2 * TRACK_INSET, height - 2 * TRACK_INSET);
}

rebuildPath();
window.addEventListener('resize', rebuildPath);

let last = 0;

function frame(now) {
  stepCars(state, (now - last) / 1000);
  last = now;
  renderer.draw(state, path);
  requestAnimationFrame(frame);
}

// The first callback only seeds the timestamp so dt is never negative or NaN.
requestAnimationFrame((now) => {
  last = now;
  requestAnimationFrame(frame);
});
