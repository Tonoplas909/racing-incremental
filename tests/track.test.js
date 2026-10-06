import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_WIDTH, WORLD } from '../src/config.js';
import { buildTrack, sampleAt, curvAt, pointAt } from '../src/track.js';

const circle = (r, n = 16) => ({ points: Array.from({ length: n }, (_, i) => [800 + r * Math.cos(2 * Math.PI * i / n), 500 + r * Math.sin(2 * Math.PI * i / n)]) });

test('circle length and curvature', () => {
  const t = buildTrack(circle(200));
  assert.ok(Math.abs(t.length - 2 * Math.PI * 200) / (2 * Math.PI * 200) < 0.02);
  for (let i = 0; i < t.count; i++) assert.ok(Math.abs(Math.abs(t.curvs[i]) - 1 / 200) < 0.1 / 200);
});
test('sampleAt wraps', () => {
  const t = buildTrack(circle(200));
  const a = sampleAt(t, 10), b = sampleAt(t, 10 + t.length), c = sampleAt(t, 10 - t.length);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6 && Math.hypot(a.x - c.x, a.y - c.y) < 1e-6);
});
test('pointAt offsets along the normal', () => {
  const t = buildTrack(circle(200));
  const c = sampleAt(t, 50), p = pointAt(t, 50, 20);
  assert.ok(Math.abs(Math.hypot(p.x - c.x, p.y - c.y) - 20) < 1e-6);
  assert.ok(Math.abs((p.x - c.x) * Math.cos(c.heading) + (p.y - c.y) * Math.sin(c.heading)) < 1e-6);
});
test('curvAt returns the nearest sample curvature, with wrapping', () => {
  const t = buildTrack(circle(200));
  assert.equal(curvAt(t, 0), t.curvs[0]);
  assert.equal(curvAt(t, t.length + 0.1), t.curvs[0]);
  assert.equal(curvAt(t, -0.1), t.curvs[0]);
});
test('heading interpolates along the shortest angle across the +-pi seam', () => {
  const t = buildTrack(circle(200));
  for (let s = 0; s < t.length; s += 3.7) {
    const a = sampleAt(t, s), b = sampleAt(t, s + 0.5);
    const d = Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading));
    assert.ok(Math.abs(d) < 0.05, 'heading jump at ' + s);
  }
});
test('all circuits are valid', () => {
  for (const def of TRACKS) {
    const t = buildTrack(def);
    assert.ok(t.length > 2000, def.id + ' too short');
    for (let i = 0; i < t.count; i++) {
      assert.ok(Math.abs(t.curvs[i]) <= 1 / 45, `${def.id}: corner tighter than r=45 at ${i}`);
      const m = TRACK_WIDTH / 2 + 10;
      assert.ok(t.xs[i] >= m && t.xs[i] <= WORLD.width - m && t.ys[i] >= m && t.ys[i] <= WORLD.height - m, `${def.id}: off world at ${i}`);
    }
    const sep = Math.ceil(3 * TRACK_WIDTH / t.step);
    for (let i = 0; i < t.count; i += 2) for (let j = i + sep; j < t.count; j += 2) {
      const along = Math.min(j - i, t.count - (j - i));
      if (along < sep) continue;
      assert.ok(Math.hypot(t.xs[i] - t.xs[j], t.ys[i] - t.ys[j]) > 1.3 * TRACK_WIDTH, `${def.id}: self-intersection near ${i}/${j}`);
    }
  }
});
