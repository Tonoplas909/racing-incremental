import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentIndexAt, checkpointPositions, canAddSegment } from '../src/track.js';

const seg = (...types) => types.map(type => ({ type }));
const DEFAULT = seg('straight', 'checkpoint', 'straight', 'checkpoint');

test('checkpointPositions', () => {
  assert.deepEqual(checkpointPositions(DEFAULT), [1.5, 3.5]);
});

test('segmentIndexAt', () => {
  assert.equal(segmentIndexAt(DEFAULT, 0), 0);
  assert.equal(segmentIndexAt(DEFAULT, 1.99), 1);
  assert.equal(segmentIndexAt(DEFAULT, 3.5), 3);
});

test('checkpoint needs a track segment per checkpoint', () => {
  assert.deepEqual(canAddSegment(DEFAULT, 'checkpoint'), { ok: false, reason: 'need_track' });
  assert.deepEqual(canAddSegment([...DEFAULT, { type: 'straight' }], 'checkpoint'), { ok: true });
  assert.deepEqual(canAddSegment(DEFAULT, 'curve_left'), { ok: true });
});

test('circuit is capped at 48 segments', () => {
  const full = Array.from({ length: 48 }, () => ({ type: 'straight' }));
  assert.deepEqual(canAddSegment(full, 'straight'), { ok: false, reason: 'max_segments' });
});
