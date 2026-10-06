import test from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, CAR_LENGTH, CAR_WIDTH } from '../src/config.js';
import { buildTrack } from '../src/track.js';
import { createRace, stepRace, trackGap, tryNitro, overtakeGains } from '../src/race.js';

const track = buildTrack(TRACKS[0]);
const entrant = (id, mult = 1, own = false) => ({
  id, teamId: id, own, label: id,
  params: { topSpeed: 260 * mult, accel: 140 * mult, brake: 260 * mult, grip: 300 * mult },
});
function run(race, seconds) {
  const events = [];
  const n = Math.round(seconds * 120);
  for (let i = 0; i < n; i++) events.push(...stepRace(race, 1 / 120));
  return events;
}

test('grid and countdown', () => {
  const r = createRace(track, ['a', 'b', 'c', 'd'].map(id => entrant(id)), () => 0.5);
  assert.equal(r.phase, 'countdown');
  assert.ok(r.cars.every(c => c.s < 0));
  assert.equal(new Set(r.cars.map(c => c.s)).size, 4);
  run(r, 2.9); assert.ok(r.cars.every(c => c.v === 0)); assert.equal(r.phase, 'countdown');
  run(r, 0.2); assert.equal(r.phase, 'racing');
});
test('lone car: 3 laps, finish, raceEnd', () => {
  const r = createRace(track, [entrant('a', 1, true)]);
  const ev = run(r, 200);
  assert.equal(ev.filter(e => e.type === 'lap').length, 3);
  assert.deepEqual(ev.filter(e => e.type === 'finish').map(e => e.position), [1]);
  assert.deepEqual(ev.find(e => e.type === 'raceEnd').results, ['a']);
  assert.equal(r.phase, 'finished');
});
test('no pass-through while overtaking', () => {
  const r = createRace(track, [entrant('slow', 0.7), entrant('fast', 1)]);
  r.phase = 'racing'; r.time = 0;
  const [slow, fast] = ['slow', 'fast'].map(id => r.cars.find(c => c.id === id));
  Object.assign(slow, { s: 200, lateral: 0, latTarget: 0 }); Object.assign(fast, { s: 150, lateral: 0, latTarget: 0 });
  for (let i = 0; i < 120 * 60; i++) {
    stepRace(r, 1 / 120);
    const gap = trackGap(fast, slow, track.length);
    if (Math.abs(gap) < CAR_LENGTH) assert.ok(Math.abs(fast.lateral - slow.lateral) >= CAR_WIDTH - 1, `overlap at step ${i}`);
  }
  assert.ok(fast.s > slow.s, 'fast car never overtook');
});
test('lapping a backmarker uses the modulo gap', () => {
  const r = createRace(track, [entrant('back', 0.5), entrant('lead', 1)]);
  r.phase = 'racing'; r.time = 0;
  const back = r.cars.find(c => c.id === 'back'), lead = r.cars.find(c => c.id === 'lead');
  Object.assign(back, { s: 300, lateral: 0, latTarget: 0 }); Object.assign(lead, { s: 250 + track.length, lateral: 0, latTarget: 0 });
  for (let i = 0; i < 120 * 20; i++) {
    stepRace(r, 1 / 120);
    if (Math.abs(trackGap(lead, back, track.length)) < CAR_LENGTH) assert.ok(Math.abs(lead.lateral - back.lateral) >= CAR_WIDTH - 1);
  }
});
test('overtakes pay only for new best ranks', () => {
  const cars = [{ id: 'me', own: true, finished: false, bestRank: 5 }];
  const order = rank => Array.from({ length: 6 }, (_, i) => (i === rank - 1 ? cars[0] : { id: 'x' + i }));
  assert.deepEqual(overtakeGains(cars, order(3)), [{ carId: 'me', count: 2 }]);
  assert.deepEqual(overtakeGains(cars, order(4)), []);
  assert.deepEqual(overtakeGains(cars, order(3)), []);
  assert.deepEqual(overtakeGains(cars, order(2)), [{ carId: 'me', count: 1 }]);
});
test('race ends 20 s after the winner', () => {
  const r = createRace(track, [entrant('fast', 1), entrant('snail', 0.08)]);
  const ev = run(r, 400);
  const end = ev.find(e => e.type === 'raceEnd');
  assert.deepEqual(end.results, ['fast', 'snail']);
  assert.ok(Math.abs(r.time - (r.firstFinishTime + 20)) < 0.02);
});
test('tryNitro respects cooldown', () => {
  const r = createRace(track, [entrant('a', 1, true)]);
  assert.equal(tryNitro(r, 'a', { duration: 1.5, cooldown: 8 }), false);
  r.phase = 'racing'; r.time = 1;
  assert.equal(tryNitro(r, 'a', { duration: 1.5, cooldown: 8 }), true);
  assert.equal(r.cars[0].nitroUntil, 2.5);
  assert.equal(tryNitro(r, 'a', { duration: 1.5, cooldown: 8 }), false);
  r.time = 9; assert.equal(tryNitro(r, 'a', { duration: 1.5, cooldown: 8 }), true);
});
