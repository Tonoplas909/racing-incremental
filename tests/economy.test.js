import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, laneFor, carSpeed, checkpointPayout, upgradeCost, buyUpgrade, segmentCost, buySegment } from '../src/economy.js';

test('initial state', () => {
  const s = createInitialState();
  assert.equal(s.version, 1);
  assert.equal(s.money, 0);
  assert.deepEqual(s.cars.map(c => c.distance), [0, 2]);
  assert.equal(carSpeed(s), 1);
  assert.equal(checkpointPayout(s), 10);
  assert.deepEqual(s.levels, { speed: 0, payout: 0 });
  assert.deepEqual(s.stats, { totalEarned: 0, checkpointsHit: 0 });
});

test('upgrade costs', () => {
  const s = createInitialState();
  assert.equal(upgradeCost(s, 'car'), 300);
  assert.equal(upgradeCost(s, 'speed'), 50);
  assert.equal(upgradeCost(s, 'payout'), 75);
});

test('buying a car', () => {
  const s = createInitialState();
  assert.equal(buyUpgrade(s, 'car'), false);
  assert.equal(s.money, 0);
  s.money = 300;
  assert.equal(buyUpgrade(s, 'car'), true);
  assert.equal(s.money, 0);
  assert.equal(s.cars.length, 3);
  assert.equal(s.cars[2].distance, 0);
  assert.equal(upgradeCost(s, 'car'), 400);
});

test('speed upgrade compounds', () => {
  const s = createInitialState();
  s.money = 50;
  assert.equal(buyUpgrade(s, 'speed'), true);
  assert.ok(Math.abs(carSpeed(s) - 1.1) < 1e-9);
  assert.equal(upgradeCost(s, 'speed'), 100);
});

test('segment costs grow per type', () => {
  const s = createInitialState();
  assert.equal(segmentCost(s, 'straight'), 30);
  s.bought.straight = 1;
  assert.equal(segmentCost(s, 'straight'), 35);
  s.bought.checkpoint = 1;
  assert.equal(segmentCost(s, 'checkpoint'), 138);
});

test('checkpoint blocked by track rule even when rich', () => {
  const s = createInitialState();
  s.money = 1000;
  assert.equal(buySegment(s, 'checkpoint'), false);
  assert.equal(s.money, 1000);
});

test('buying a straight appends it', () => {
  const s = createInitialState();
  s.money = 30;
  assert.equal(buySegment(s, 'straight'), true);
  assert.equal(s.money, 0);
  assert.equal(s.segments.length, 5);
  assert.equal(s.segments.at(-1).type, 'straight');
});

test('second purchase fails when broke', () => {
  const s = createInitialState();
  s.money = 40;
  assert.equal(buySegment(s, 'straight'), true);
  assert.equal(buySegment(s, 'straight'), false);
  assert.equal(s.money, 10);
});
