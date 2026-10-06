import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serialize, deserialize, saveGame, loadGame } from '../src/save.js';
import { createInitialState } from '../src/economy.js';

const memoryStorage = () => ({
  data: {},
  getItem(k) {
    return this.data[k] ?? null;
  },
  setItem(k, v) {
    this.data[k] = v;
  },
});

const throwingStorage = {
  getItem() {
    throw new Error('denied');
  },
  setItem() {
    throw new Error('quota');
  },
};

test('round trip', () => {
  const s = createInitialState();
  s.money = 123;
  assert.deepEqual(deserialize(serialize(s)), s);
});

test('deserialize rejects bad JSON', () =>
  assert.equal(deserialize('{bad'), null));

test('deserialize rejects other versions', () => {
  assert.equal(
    deserialize(
      JSON.stringify({ ...createInitialState(), version: 2 })
    ),
    null
  );
});

test('deserialize rejects unknown segment types', () => {
  assert.equal(
    deserialize(
      JSON.stringify({ ...createInitialState(), segments: [{ type: 'banana' }] })
    ),
    null
  );
});

test('deserialize rejects negative money', () => {
  assert.equal(
    deserialize(JSON.stringify({ ...createInitialState(), money: -5 })),
    null
  );
});

test('deserialize fills missing fields and normalizes distance', () => {
  const raw = createInitialState();
  delete raw.stats;
  raw.cars = [{ distance: 9 }, { distance: 'x' }];
  const s = deserialize(JSON.stringify(raw));
  assert.deepEqual(s.stats, { totalEarned: 0, checkpointsHit: 0 });
  assert.deepEqual(s.cars, [{ distance: 1, lane: 0 }]);
});

test('saveGame/loadGame use the racingGame key', () => {
  const st = memoryStorage();
  const s = createInitialState();
  s.money = 42;
  assert.equal(saveGame(st, s), true);
  assert.ok('racingGame' in st.data);
  assert.equal(loadGame(st).money, 42);
});

test('loadGame on empty storage gives a fresh game', () => {
  assert.deepEqual(loadGame(memoryStorage()), createInitialState());
});

test('saveGame/loadGame survive throwing storage', () => {
  assert.equal(saveGame(throwingStorage, createInitialState()), false);
  assert.deepEqual(loadGame(throwingStorage), createInitialState());
});
