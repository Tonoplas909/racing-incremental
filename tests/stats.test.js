import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateMeter } from '../src/stats.js';

test('rate meter averages over the window', () => {
  const m = createRateMeter(5000);
  assert.equal(m.rate(), 0);
  m.push(0, 0);
  m.push(1000, 10);
  m.push(2000, 30);
  assert.equal(m.rate(), 15);           // (30 - 0) / 2 s
  m.push(8000, 90);                     // entries older than 8000-5000 dropped
  assert.equal(m.rate(), 10);           // (90 - 30) / 6 s, oldest kept entry is the last one before the window
});
