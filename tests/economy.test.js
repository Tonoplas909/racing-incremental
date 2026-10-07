import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_CAR, RIVAL_BASE, RIVAL_GROWTH } from '../src/config.js';
import {
  createProfile, upgradeCost, carCost, buyUpgrade, buyCar,
  playerParams, nitroStats, rivalParams, lapReward, overtakeReward,
  unlockedCount, settleRace
} from '../src/economy.js';

test('costs', () => {
  const p = createProfile();
  assert.equal(upgradeCost(p, 'engine'), 50);
  p.levels.engine = 1; assert.equal(upgradeCost(p, 'engine'), 80);
  p.levels.engine = 2; assert.equal(upgradeCost(p, 'engine'), 128);
  p.levels.brakes = 1; assert.equal(upgradeCost(p, 'brakes'), 62);
  p.levels.nitro = 1; assert.equal(upgradeCost(p, 'nitro'), 136);
  assert.equal(carCost(p), 300); p.cars = 4; assert.equal(carCost(p), Infinity);
});

test('buying', () => {
  const p = createProfile();
  assert.equal(buyUpgrade(p, 'engine'), false);
  assert.equal(buyUpgrade(p, 'banana'), false);
  p.money = 60; assert.equal(buyUpgrade(p, 'engine'), true);
  assert.equal(p.money, 10); assert.equal(p.levels.engine, 1);
  p.money = 300; assert.equal(buyCar(p), true); assert.equal(p.cars, 2); assert.equal(p.money, 0);
});

test('params', () => {
  const p = createProfile();
  assert.deepEqual(playerParams(p), BASE_CAR);
  p.levels.engine = 1;
  assert.ok(Math.abs(playerParams(p).topSpeed - 275.6) < 1e-9 && Math.abs(playerParams(p).accel - 151.2) < 1e-9);
  assert.deepEqual(nitroStats(createProfile()), { duration: 1.5, cooldown: 8 });
  const r = rivalParams(4, 0.9);
  assert.ok(Math.abs(r.topSpeed - 260 * RIVAL_BASE * Math.pow(RIVAL_GROWTH, 4) * 0.9) < 1e-9);
  assert.deepEqual(Object.keys(r), Object.keys(BASE_CAR));
});

test('rewards', () => {
  assert.equal(lapReward(1), 12.5);
  assert.equal(overtakeReward(2, 2), 36);
});

test('settleRace', () => {
  const p = createProfile();
  assert.deepEqual(settleRace(p, ['r1', 'me1', 'r2'], ['me1'], 0), { prize: 80, reputation: 3, unlocked: null });
  assert.equal(p.money, 80); assert.equal(p.stats.races, 1); assert.equal(p.stats.wins, 0);
  const q = createProfile(); q.reputation = 14;
  assert.deepEqual(settleRace(q, ['me1', 'r1', 'me2'], ['me1', 'me2'], 0), { prize: 180, reputation: 5, unlocked: 1 });
  assert.equal(q.trackIndex, 1); assert.equal(q.stats.wins, 1); assert.equal(unlockedCount(q), 2);
  const r = createProfile();
  assert.deepEqual(settleRace(r, ['r1', 'me1'], ['me1'], 1), { prize: 200, reputation: 6, unlocked: null });
  assert.equal(r.money, 200);
});

test('reputation scales with the circuit', () => {
  assert.equal(settleRace(createProfile(), ['me1'], ['me1'], 2).reputation, 15);
});
