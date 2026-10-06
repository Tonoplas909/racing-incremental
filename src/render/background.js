import { WORLD, TRACK_WIDTH, RACE, CAR_LENGTH, CAR_WIDTH } from '../config.js';
import { pointAt } from '../track.js';

const KERB_CURV = 1 / 220;
const KERB_WIDTH = 9;
const KERB_RUN = 3;
const TREE_COUNT = 40;
const TREE_ATTEMPTS = 4000;
const STRIPE_WIDTH = 60;
const STRIPE_ANGLE = Math.PI / 6;
const GRID_SLOTS = 10;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrass(ctx) {
  ctx.fillStyle = '#4a8a3c';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, WORLD.width, WORLD.height);
  ctx.clip();
  ctx.translate(WORLD.width / 2, WORLD.height / 2);
  ctx.rotate(STRIPE_ANGLE);
  const reach = Math.hypot(WORLD.width, WORLD.height) / 2;
  ctx.fillStyle = '#4f913f';
  for (let x = -reach; x < reach; x += STRIPE_WIDTH * 2) {
    ctx.fillRect(x, -reach, STRIPE_WIDTH, reach * 2);
  }
  ctx.restore();
}

function drawTrees(ctx, track) {
  const seed = [...track.def.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const rand = mulberry32(seed);
  const minDist2 = TRACK_WIDTH * TRACK_WIDTH;
  const { xs, ys, count } = track;
  let placed = 0;
  for (let attempt = 0; attempt < TREE_ATTEMPTS && placed < TREE_COUNT; attempt++) {
    const r = 14 + rand() * 10;
    const x = r + rand() * (WORLD.width - 2 * r);
    const y = r + rand() * (WORLD.height - 2 * r);
    let clear = true;
    for (let i = 0; i < count; i++) {
      const dx = xs[i] - x, dy = ys[i] - y;
      if (dx * dx + dy * dy <= minDist2) { clear = false; break; }
    }
    if (!clear) continue;
    placed++;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath(); ctx.arc(x + 4, y + 4, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d6a2e';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f8f3a';
    ctx.beginPath(); ctx.arc(x - 4, y - 4, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
}

function tracePath(ctx, track) {
  const { xs, ys, count } = track;
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let i = 1; i < count; i++) ctx.lineTo(xs[i], ys[i]);
  ctx.closePath();
}

function drawAsphalt(ctx, track) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  tracePath(ctx, track);
  ctx.lineWidth = TRACK_WIDTH + 8;
  ctx.strokeStyle = '#f2f2f2';
  ctx.stroke();
  ctx.lineWidth = TRACK_WIDTH;
  ctx.strokeStyle = '#3a3c41';
  ctx.stroke();
  ctx.lineWidth = TRACK_WIDTH - 18;
  ctx.strokeStyle = '#3f4146';
  ctx.stroke();
}

function drawKerbs(ctx, track) {
  const { xs, ys, headings, curvs, count } = track;
  const half = TRACK_WIDTH / 2;
  ctx.lineWidth = 0.6;
  ctx.lineJoin = 'round';
  for (let i = 0; i < count; i++) {
    const curv = curvs[i];
    if (Math.abs(curv) <= KERB_CURV) continue;
    const side = Math.sign(curv);
    const j = (i + 1) % count;
    const inner = side * half, outer = side * (half + KERB_WIDTH);
    const nix = -Math.sin(headings[i]), niy = Math.cos(headings[i]);
    const njx = -Math.sin(headings[j]), njy = Math.cos(headings[j]);
    const color = Math.floor(i / KERB_RUN) % 2 === 0 ? '#d62828' : '#ffffff';
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(xs[i] + nix * inner, ys[i] + niy * inner);
    ctx.lineTo(xs[i] + nix * outer, ys[i] + niy * outer);
    ctx.lineTo(xs[j] + njx * outer, ys[j] + njy * outer);
    ctx.lineTo(xs[j] + njx * inner, ys[j] + njy * inner);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawFinishLine(ctx, track) {
  const p = pointAt(track, 0, 0);
  const sq = 7;
  const cols = Math.round(TRACK_WIDTH / sq);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.heading);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111111';
      ctx.fillRect(-sq + row * sq, -TRACK_WIDTH / 2 + col * sq, sq, sq);
    }
  }
  ctx.restore();
}

function drawGridBoxes(ctx, track) {
  const markBack = CAR_LENGTH / 2 + 7;
  const markFront = CAR_LENGTH / 2 + 1;
  const halfW = CAR_WIDTH / 2 + 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'butt';
  for (let i = 0; i < GRID_SLOTS; i++) {
    const lateral = (i % 2 ? 1 : -1) * 0.3 * TRACK_WIDTH / 2;
    const p = pointAt(track, -RACE.gridGap * (i + 1), lateral);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.heading);
    // "⊐" mark behind the car: bar across the track, arms pointing toward the car.
    ctx.beginPath();
    ctx.moveTo(-markFront, -halfW);
    ctx.lineTo(-markBack, -halfW);
    ctx.lineTo(-markBack, halfW);
    ctx.lineTo(-markFront, halfW);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderBackground(track, view, dpr) {
  // The view is centered, so the CSS size follows from the world size, scale and offsets.
  const cssWidth = WORLD.width * view.scale + 2 * view.offsetX;
  const cssHeight = WORLD.height * view.scale + 2 * view.offsetY;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cssWidth * dpr));
  canvas.height = Math.max(1, Math.round(cssHeight * dpr));
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2f5e2b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);
  drawGrass(ctx);
  drawTrees(ctx, track);
  drawAsphalt(ctx, track);
  drawKerbs(ctx, track);
  drawFinishLine(ctx, track);
  drawGridBoxes(ctx, track);
  return canvas;
}
