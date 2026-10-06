import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, unlockedCount } from '../src/economy.js';
import { deserialize, saveGame, loadGame } from '../src/save.js';

function memoryStorage() {
  return {
    data: {},
    getItem(k) { return this.data[k] ?? null; },
    setItem(k, v) { this.data[k] = v; }
  };
}

const throwingStorage = {
  getItem() { throw new Error('Storage error'); },
  setItem() { throw new Error('Storage error'); }
};

test('round trip', () => {
  const p = createProfile();
  p.money = 42;
  p.levels.tires = 3;
  assert.deepEqual(deserialize(JSON.stringify(p)), p);
});

test('rejects bad input', () => {
  for (const t of [
    null,
    '{bad',
    '7',
    JSON.stringify({ ...createProfile(), version: 1 }),
    JSON.stringify({ ...createProfile(), money: -1 })
  ]) {
    assert.equal(deserialize(t), null);
  }
});

test('sanitizes fields', () => {
  const raw = {
    ...createProfile(),
    levels: { engine: 'x', tires: 2.5, brakes: 3 },
    cars: 9,
    trackIndex: 4,
    reputation: 20,
    hacked: true
  };
  const p = deserialize(JSON.stringify(raw));
  assert.deepEqual(p.levels, { engine: 0, tires: 0, brakes: 3, nitro: 0 });
  assert.equal(p.cars, 1);
  assert.equal(p.trackIndex, 0);
  assert.equal('hacked' in p, false);
});

test('round trip keeps a fractional earned', () => {
  const p = createProfile();
  p.stats.earned = 12.5;
  p.stats.races = 3;
  const deserialized = deserialize(JSON.stringify(p));
  assert.deepEqual(deserialized.stats, { races: 3, wins: 0, earned: 12.5 });
});

test('levels { engine: 101, tires: 100 }', () => {
  const p = createProfile();
  p.levels.engine = 101;
  p.levels.tires = 100;
  const raw = { ...p };
  const deserialized = deserialize(JSON.stringify(raw));
  assert.equal(deserialized.levels.engine, 0);
  assert.equal(deserialized.levels.tires, 100);
});

test('a valid trackIndex survives', () => {
  const p = createProfile();
  p.reputation = 20;
  p.trackIndex = 1;
  p.cars = 3;
  const deserialized = deserialize(JSON.stringify(p));
  assert.equal(deserialized.trackIndex, 1);
  assert.equal(deserialized.cars, 3);
});

test('storage wrappers', () => {
  const st = memoryStorage();
  const p = createProfile();
  p.money = 5;
  assert.equal(saveGame(st, p), true);
  assert.equal(loadGame(st).money, 5);
  p.money = NaN;
  assert.equal(saveGame(st, p), false);
  assert.equal(loadGame(st).money, 5);
  assert.equal(saveGame(throwingStorage, createProfile()), false);
  assert.deepEqual(loadGame(throwingStorage), createProfile());
  assert.deepEqual(loadGame(memoryStorage()), createProfile());
});
