import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, RIVALS, CAR_COSTS, MAX_CARS } from '../src/config.js';

test('config sanity', () => {
  assert.equal(TRACKS.length, 5);
  assert.deepEqual(TRACKS.map(t => t.repRequired), [0, 15, 45, 110, 250]);
  assert.equal(RIVALS.length, 5);
  assert.equal(CAR_COSTS.length, MAX_CARS - 1);
});
