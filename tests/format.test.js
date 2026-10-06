import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney } from '../src/format.js';

test('formatMoney', () => {
  assert.equal(formatMoney(0), '0');
  assert.equal(formatMoney(999.9), '999');
  assert.equal(formatMoney(1500), '1.50K');
  assert.equal(formatMoney(2_340_000), '2.34M');
  assert.equal(formatMoney(1e9), '1.00B');
  assert.equal(formatMoney(1e12), '1.00T');
  assert.equal(formatMoney(1e15), '1.00Qa');
  assert.equal(formatMoney(1e18), '1.00e+18');
});
