import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_CAR, TRACKS } from '../src/config.js';
import { buildTrack, curvAt } from '../src/track.js';
import { cornerSpeed, targetSpeed, nextSpeed, effectiveParams } from '../src/car.js';

test('cornerSpeed', () => {
  assert.equal(cornerSpeed(0, 300), Infinity);
  assert.ok(Math.abs(cornerSpeed(1 / 100, 300) - Math.sqrt(30000)) < 1e-9);
  assert.equal(cornerSpeed(-1 / 100, 300), cornerSpeed(1 / 100, 300));
});
test('nextSpeed', () => {
  assert.ok(Math.abs(nextSpeed(0, Infinity, BASE_CAR, 0.1) - 14) < 1e-9);
  assert.ok(Math.abs(nextSpeed(200, 100, BASE_CAR, 0.1) - 174) < 1e-9);
  assert.equal(nextSpeed(99, 100, BASE_CAR, 0.1), 100);
  assert.equal(nextSpeed(101, 100, BASE_CAR, 0.1), 100);
});
test('effectiveParams nitro', () => {
  const p = effectiveParams(BASE_CAR, true);
  assert.ok(Math.abs(p.topSpeed - 364) < 1e-9 && Math.abs(p.accel - 224) < 1e-9 && p.grip === 300);
  assert.deepEqual(effectiveParams(BASE_CAR, false), BASE_CAR);
});
test('lone car respects corner speeds and laps', () => {
  for (const def of TRACKS) {
    const t = buildTrack(def);
    let s = 0, v = 0;
    const dt = 1 / 120;
    for (let i = 0; i < 120 * 60; i++) {
      v = nextSpeed(v, targetSpeed(t, s, BASE_CAR), BASE_CAR, dt);
      s += v * dt;
      assert.ok(v <= cornerSpeed(curvAt(t, s), BASE_CAR.grip) * 1.03 + 2, `${def.id}: too fast at s=${s.toFixed(0)}`);
    }
    assert.ok(s > t.length, `${def.id}: no lap in 60 s`);
  }
});
