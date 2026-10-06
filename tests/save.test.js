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
