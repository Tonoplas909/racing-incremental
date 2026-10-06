import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrackPath, pointAt, MARGIN, SAMPLES_PER_SPAN } from '../src/geometry.js';

const seg = (...t) => t.map(type => ({ type }));
const W = 800, H = 600;
const finite = p => Number.isFinite(p.x) && Number.isFinite(p.y);
const inside = p => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('default circuit path is closed and sampled', () => {
  const path = buildTrackPath(seg('straight', 'checkpoint', 'straight', 'checkpoint'), W, H);
  assert.equal(path.samples.length, 4 * 2 * SAMPLES_PER_SPAN + 1);
  assert.equal(path.samples.at(-1).u, 4);
  assert.ok(dist(path.samples[0], path.samples.at(-1)) < 1e-9);
  assert.ok(path.samples.every(p => finite(p) && inside(p)));
});
test('boundary points sit on the base shape', () => {
  const path = buildTrackPath(seg('straight', 'straight', 'straight', 'straight'), W, H);
  const p = pointAt(path, 2);            // u = n/2 → angle π → leftmost point
  assert.ok(Math.abs(p.x - MARGIN) < 1e-3);
  assert.ok(Math.abs(p.y - H / 2) < 1e-3);   // sin(π) is not exactly 0, and |sin|^0.5 amplifies it
});
test('curve_right bends inward, curve_left outward', () => {
  const flat = buildTrackPath(seg('straight', 'straight', 'straight', 'straight'), W, H);
  const right = buildTrackPath(seg('curve_right', 'straight', 'straight', 'straight'), W, H);
  const left = buildTrackPath(seg('curve_left', 'straight', 'straight', 'straight'), W, H);
  const c = flat.center;
  assert.ok(dist(pointAt(right, 0.5), c) < dist(pointAt(flat, 0.5), c) - 10);
  assert.ok(dist(pointAt(left, 0.5), c) > dist(pointAt(flat, 0.5), c) + 10);
});
test('48 curves stay finite and on canvas', () => {
  const path = buildTrackPath(Array.from({ length: 48 }, () => ({ type: 'curve_left' })), W, H);
  assert.ok(path.samples.every(p => finite(p) && inside(p)));
});
