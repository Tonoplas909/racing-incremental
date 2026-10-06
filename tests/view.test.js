import test from 'node:test';
import assert from 'node:assert/strict';
import { fitView, worldToScreen, screenToWorld } from '../src/view.js';

test('fitView', () => {
  assert.deepEqual(fitView(800, 500, { width: 1600, height: 1000 }), { scale: 0.5, offsetX: 0, offsetY: 0 });
  assert.deepEqual(fitView(800, 800, { width: 1600, height: 1000 }), { scale: 0.5, offsetX: 0, offsetY: 150 });
  const v = fitView(1000, 700, { width: 1600, height: 1000 });
  const s = worldToScreen(v, 321, 654), w = screenToWorld(v, s.x, s.y);
  assert.ok(Math.abs(w.x - 321) < 1e-9 && Math.abs(w.y - 654) < 1e-9);
});
