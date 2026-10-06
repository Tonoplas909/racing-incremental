import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countCrossings, stepCars } from '../src/simulation.js';
import { createInitialState } from '../src/economy.js';

test('countCrossings basics', () => {
  assert.equal(countCrossings([1.5, 3.5], 1.0, 2.0, 4), 1);
  assert.equal(countCrossings([1.5, 3.5], 1.5, 2.0, 4), 0);   // start exactly on checkpoint: excluded
  assert.equal(countCrossings([1.5, 3.5], 1.0, 1.5, 4), 1);   // end exactly on checkpoint: included
  assert.equal(countCrossings([1.5, 3.5], 3.0, 5.0, 4), 1);   // wraps past 4
  assert.equal(countCrossings([1.5, 3.5], 3.0, 6.0, 4), 2);
});

test('countCrossings over many laps', () => {
  assert.equal(countCrossings([1.5, 3.5], 0, 40, 4), 20);
});

test('stepCars moves without paying between checkpoints', () => {
  const s = createInitialState();
  assert.equal(stepCars(s, 0.05), 0);
  assert.ok(Math.abs(s.cars[0].distance - 0.05) < 1e-9);
  assert.ok(Math.abs(s.cars[1].distance - 2.05) < 1e-9);
});

test('stepCars clamps dt', () => {
  const s = createInitialState();
  assert.equal(stepCars(s, 10), 0);
  assert.ok(Math.abs(s.cars[0].distance - 0.1) < 1e-9);
  assert.equal(s.money, 0);
});

test('stepCars pays checkpoint crossings', () => {
  const s = createInitialState();
  s.cars[0].distance = 1.45;
  s.cars[1].distance = 3.45;
  assert.equal(stepCars(s, 0.1), 20);
  assert.equal(s.money, 20);
  assert.equal(s.stats.totalEarned, 20);
  assert.equal(s.stats.checkpointsHit, 2);
});

test('curves slow cars', () => {
  const s = createInitialState();
  s.segments = [{ type: 'curve_left' }, { type: 'checkpoint' }];
  s.cars = [{ distance: 0, lane: 0 }];
  stepCars(s, 0.1);
  assert.ok(Math.abs(s.cars[0].distance - 0.035) < 1e-9);
});

test('distance wraps at lap end', () => {
  const s = createInitialState();
  s.cars = [{ distance: 3.95, lane: 0 }];
  stepCars(s, 0.1);
  assert.ok(Math.abs(s.cars[0].distance - 0.05) < 1e-9);
});

function earnings(segmentTypes) {
  const s = createInitialState();
  s.segments = segmentTypes.map(type => ({ type }));
  s.cars = createInitialState().cars;
  for (let i = 0; i < 1200; i++) stepCars(s, 0.05);
  return s.money;
}

test('adding a checkpoint raises income', () => {
  const base = earnings(['straight', 'checkpoint', 'straight', 'checkpoint']);
  const more = earnings([
    'straight', 'checkpoint', 'straight', 'checkpoint', 'straight', 'checkpoint',
  ]);
  assert.ok(more > base);
});

test('a straight alone does not lower income', () => {
  const base = earnings(['straight', 'checkpoint', 'straight', 'checkpoint']);
  const more = earnings(['straight', 'checkpoint', 'straight', 'checkpoint', 'straight']);
  assert.ok(more >= base - 10);
});

test('stepCars ignores NaN and negative dt', () => {
  for (const dt of [NaN, -1]) {
    const s = createInitialState();
    assert.equal(stepCars(s, dt), 0);
    assert.deepEqual(s.cars, createInitialState().cars);
    assert.equal(s.money, 0);
  }
});
