import test from 'node:test';
import assert from 'node:assert/strict';
import { fitView, worldToScreen, screenToWorld } from '../src/view.js';

const W = { x: 0, y: 0, width: 1600, height: 1000 };
test('fitView', () => {
  assert.deepEqual(fitView(800, 500, W), { scale: 0.5, offsetX: 0, offsetY: 0 });
  assert.deepEqual(fitView(800, 800, W), { scale: 0.5, offsetX: 0, offsetY: 150 });
  const v = fitView(1000, 700, W);
  const s = worldToScreen(v, 321, 654), w = screenToWorld(v, s.x, s.y);
  assert.ok(Math.abs(w.x - 321) < 1e-9 && Math.abs(w.y - 654) < 1e-9);
});

test('fitView frames a bounds rect with a non-zero origin', () => {
  const b = { x: 200, y: 100, width: 800, height: 400 };
  const v = fitView(800, 600, b);
  assert.equal(v.scale, 1);
  assert.deepEqual(worldToScreen(v, 200, 100), { x: 0, y: 100 });
  assert.deepEqual(worldToScreen(v, 1000, 500), { x: 800, y: 500 });
  const s = worldToScreen(v, 321, 254), w = screenToWorld(v, s.x, s.y);
  assert.ok(Math.abs(w.x - 321) < 1e-9 && Math.abs(w.y - 254) < 1e-9);
});
