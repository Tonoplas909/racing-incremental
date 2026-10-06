# Racing Incremental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A playable top-down incremental racing game in the browser: cars lap a closed circuit on their own, the player buys track segments and upgrades, progress persists in localStorage, hosted on GitHub Pages.

**Architecture:** Pure logic modules (`config`, `format`, `stats`, `track`, `economy`, `simulation`, `save`, `geometry`) hold all rules and are unit-tested in Node. Three browser modules (`render`, `ui`, `main`) draw the state on a Canvas 2D, wire DOM buttons, and run the `requestAnimationFrame` loop. The circuit is a list of segments; geometry turns that list into a closed smooth spline around a rounded-rectangle base shape, so adding a segment can never break the loop.

**Tech Stack:** Vanilla JavaScript ES modules, HTML5 Canvas 2D, localStorage, Node 20 built-in test runner (`node:test`, `node:assert/strict`).

**Spec:** `docs/design.md`

## Global Constraints

- No build step, no runtime or dev dependencies: `package.json` exists only for `"type": "module"` and the `test` script.
- Tests: `node:test` + `node:assert/strict`, run with `npm test` (`node --test`, auto-discovers `tests/*.test.js`). Node 20.
- Browser code loads via `<script type="module">`; every path is relative (Pages serves the site under `/racing-incremental/`).
- Pure logic modules never touch `document`, `window` or `localStorage`; storage is passed in as a parameter.
- No backend. Persistence only in localStorage, key `"racingGame"` (spec §7).
- Visual style: smooth rounded geometric shapes, no pixel art (spec §2).
- No offline progression: frame delta is clamped, so a backgrounded tab earns nothing extra (spec §2 out of scope).
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions Beyond the Spec

The spec leaves these open; the plan fixes them. Values live in `src/config.js` so they are easy to tune.

1. **Car position is a distance in track units, not 0–1 progress.** Every segment is exactly 1 unit long. A longer circuit means a longer lap; appending a segment never moves existing cars.
2. **Adding a segment costs money** (spec §6 has no segment cost; free checkpoints would make money infinite). Base costs: straight 30, curve 20, checkpoint 120, each ×1.15 per segment of that type already bought.
3. **Checkpoint limit:** number of checkpoints ≤ number of non-checkpoint segments. Max circuit size 48 segments.
4. **Curves slow cars to 0.7× speed**, straights and checkpoints run at 1.0×. Curves are cheaper; straights are faster.
5. **Upgrade cost uses `level + 1`** (spec's `base_cost * speedLevel` would be free at level 0). Speed and payout effects compound: ×1.1 per level.
6. **UI copy is in French.**
7. **Stats shown:** money, number of cars, money per second (5-second rolling window). Reset button stays out (spec Phase 2).

## Review Focus

1. Tab hidden then shown (huge frame delta) → no money burst, cars move at most one clamped step. Test: Task 4 `stepCars clamps dt`.
2. Very high speed (several laps in one step) → every checkpoint crossing is paid. Test: Task 4 `countCrossings over many laps`.
3. Corrupt, foreign or older save in localStorage → game starts fresh instead of crashing. Test: Task 5 `deserialize rejects ...`.
4. Rapid clicks with too little money → money never goes negative, nothing is bought. Test: Task 3 `second purchase fails when broke`.
5. localStorage unavailable (private mode, quota) → game still runs, save just reports failure. Test: Task 5 `saveGame/loadGame survive throwing storage`.

---

## File Structure

```
index.html            page shell: canvas + control panel, loads src/main.js
style.css             layout and theme
package.json          {"type":"module","scripts":{"test":"node --test"}}
src/config.js         every tunable constant
src/format.js         formatMoney
src/stats.js          createRateMeter (money/sec)
src/track.js          segment-list queries and add rules
src/economy.js        initial state, derived values, costs, purchases
src/simulation.js     car movement and checkpoint payouts
src/save.js           (de)serialization + localStorage wrappers
src/geometry.js       segments → closed smooth path, pointAt
src/render.js         canvas drawing (browser only)
src/ui.js             buttons and stat labels (browser only)
src/main.js           boot, game loop, autosave (browser only)
tests/*.test.js       one file per pure module
```

**State shape** (produced by Task 3, used everywhere):

```js
{
  version: 1,
  money: number,
  segments: [{ type: 'straight' | 'curve_left' | 'curve_right' | 'checkpoint' }],
  cars: [{ distance: number /* [0, segments.length) */, lane: number /* [-1, 1] */ }],
  levels: { speed: number, payout: number },
  bought: { straight: number, curve_left: number, curve_right: number, checkpoint: number },
  stats: { totalEarned: number, checkpointsHit: number }
}
```

---

### Task 1: Scaffold, config, formatting, rate meter

**Files:**
- Create: `package.json`, `src/config.js`, `src/format.js`, `src/stats.js`
- Test: `tests/format.test.js`, `tests/stats.test.js`

**Interfaces:**
- Produces (`src/config.js`, all named exports):
  - `SEGMENT_TYPES = ['straight', 'curve_left', 'curve_right', 'checkpoint']`
  - `SEGMENT_SPEED_MULT = { straight: 1, curve_left: 0.7, curve_right: 0.7, checkpoint: 1 }`
  - `SEGMENT_BASE_COST = { straight: 30, curve_left: 20, curve_right: 20, checkpoint: 120 }`
  - `SEGMENT_COST_GROWTH = 1.15`, `MAX_SEGMENTS = 48`
  - `UPGRADE_BASE_COST = { car: 100, speed: 50, payout: 75 }`, `UPGRADE_EFFECT = 1.1`
  - `START = { money: 0, cars: 2, speed: 1.0, payout: 10, segments: ['straight', 'checkpoint', 'straight', 'checkpoint'] }`
  - `MAX_DT = 0.1` (seconds), `AUTOSAVE_MS = 5000`, `SAVE_KEY = 'racingGame'`
- Produces: `formatMoney(n: number) -> string`, `createRateMeter(windowMs: number) -> { push(timeMs: number, total: number): void, rate(): number }`

- [ ] **Step 1: Write `package.json`** with exactly `{"name":"racing-incremental","private":true,"type":"module","scripts":{"test":"node --test"}}` (pretty-printed).

- [ ] **Step 2: Write the failing tests**

```js
// tests/format.test.js
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
```

```js
// tests/stats.test.js
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
```

- [ ] **Step 3: Run `npm test`** — expected: FAIL, modules not found.

- [ ] **Step 4: Implement** `src/config.js` (values above), `formatMoney` (below 1000: `Math.floor(n)`; suffixes K, M, B, T, Qa with `toFixed(2)`; ≥ 1e18: `n.toExponential(2)`), and `createRateMeter`: keep `[time, total]` pairs; on push drop entries older than `time - windowMs` but keep the newest dropped one as the baseline; `rate()` = (last.total − first.total) / ((last.time − first.time) / 1000), 0 when fewer than 2 entries.

- [ ] **Step 5: Run `npm test`** — expected: all PASS.

- [ ] **Step 6: Commit** `package.json src/ tests/` — `feat: add config, money formatting and rate meter`.

---

### Task 2: Track rules

**Files:**
- Create: `src/track.js`
- Test: `tests/track.test.js`

**Interfaces:**
- Consumes: `MAX_SEGMENTS` from config.
- Produces:
  - `segmentIndexAt(segments, distance: number) -> number` — `Math.floor(distance) % segments.length`
  - `checkpointPositions(segments) -> number[]` — `i + 0.5` for each checkpoint index `i`, ascending
  - `canAddSegment(segments, type) -> { ok: true } | { ok: false, reason: 'max_segments' | 'need_track' }`

- [ ] **Step 1: Write the failing tests**

```js
// tests/track.test.js
const seg = (...types) => types.map(type => ({ type }));
const DEFAULT = seg('straight', 'checkpoint', 'straight', 'checkpoint');

test('checkpointPositions', () => {
  assert.deepEqual(checkpointPositions(DEFAULT), [1.5, 3.5]);
});
test('segmentIndexAt', () => {
  assert.equal(segmentIndexAt(DEFAULT, 0), 0);
  assert.equal(segmentIndexAt(DEFAULT, 1.99), 1);
  assert.equal(segmentIndexAt(DEFAULT, 3.5), 3);
});
test('checkpoint needs a track segment per checkpoint', () => {
  assert.deepEqual(canAddSegment(DEFAULT, 'checkpoint'), { ok: false, reason: 'need_track' });
  assert.deepEqual(canAddSegment([...DEFAULT, { type: 'straight' }], 'checkpoint'), { ok: true });
  assert.deepEqual(canAddSegment(DEFAULT, 'curve_left'), { ok: true });
});
test('circuit is capped at 48 segments', () => {
  const full = Array.from({ length: 48 }, () => ({ type: 'straight' }));
  assert.deepEqual(canAddSegment(full, 'straight'), { ok: false, reason: 'max_segments' });
});
```

- [ ] **Step 2: Run `node --test tests/track.test.js`** — expected: FAIL.
- [ ] **Step 3: Implement the three functions in `src/track.js`.** `max_segments` is checked before `need_track`.
- [ ] **Step 4: Run `npm test`** — expected: PASS.
- [ ] **Step 5: Commit** — `feat: add track segment rules`.

---

### Task 3: Economy

**Files:**
- Create: `src/economy.js`
- Test: `tests/economy.test.js`

**Interfaces:**
- Consumes: config constants; `canAddSegment` from track.
- Produces:
  - `createInitialState() -> State` — cars spaced evenly: car `i` at `i * segments.length / START.cars` (so `[0, 2]`), `lane: laneFor(i)`
  - `laneFor(index) -> number` — `((index * 0.6180339887) % 1) * 2 - 1`
  - `carSpeed(state) -> number` — `START.speed * UPGRADE_EFFECT ** levels.speed`
  - `checkpointPayout(state) -> number` — `START.payout * UPGRADE_EFFECT ** levels.payout`
  - `upgradeCost(state, kind: 'car' | 'speed' | 'payout') -> number` — car: `100 * (cars.length + 1)`; speed: `50 * (levels.speed + 1)`; payout: `75 * (levels.payout + 1)`
  - `buyUpgrade(state, kind) -> boolean` — mutates state; new car goes at distance 0 with `laneFor(cars.length)`
  - `segmentCost(state, type) -> number` — `Math.ceil(SEGMENT_BASE_COST[type] * SEGMENT_COST_GROWTH ** bought[type] - 1e-9)`
  - `buySegment(state, type) -> boolean` — fails if `canAddSegment` fails or money short; else appends `{ type }` at the end, increments `bought[type]`, deducts cost

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run `node --test tests/economy.test.js`** — expected: FAIL.
- [ ] **Step 3: Implement `src/economy.js`** with the signatures above.
- [ ] **Step 4: Run `npm test`** — expected: PASS.
- [ ] **Step 5: Commit** — `feat: add economy (state, costs, purchases)`.

---

### Task 4: Simulation

**Files:**
- Create: `src/simulation.js`
- Test: `tests/simulation.test.js`

**Interfaces:**
- Consumes: `MAX_DT`, `SEGMENT_SPEED_MULT`; `segmentIndexAt`, `checkpointPositions`; `carSpeed`, `checkpointPayout`, `createInitialState`.
- Produces:
  - `countCrossings(positions: number[], from: number, to: number, total: number) -> number` — count of `p + k·total` in `(from, to]`, summed over positions: `Σ floor((to − p) / total) − floor((from − p) / total)`
  - `stepCars(state, dt: number) -> number` — clamps `dt` to `MAX_DT`; per car: `to = distance + carSpeed × SEGMENT_SPEED_MULT[type at distance] × dt`, add `countCrossings`, store `to % n`; pays `hits × checkpointPayout` into `money`, `stats.totalEarned`, `stats.checkpointsHit`; returns money earned

- [ ] **Step 1: Write the failing tests**

```js
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
  assert.ok(Math.abs(s.cars[0].distance - 0.07) < 1e-9);
});
test('distance wraps at lap end', () => {
  const s = createInitialState();
  s.cars = [{ distance: 3.95, lane: 0 }];
  stepCars(s, 0.1);
  assert.ok(Math.abs(s.cars[0].distance - 0.05) < 1e-9);
});
```

- [ ] **Step 2: Run `node --test tests/simulation.test.js`** — expected: FAIL.
- [ ] **Step 3: Implement `src/simulation.js`.** Compute `checkpointPositions`, `carSpeed` and `checkpointPayout` once per call, not per car.
- [ ] **Step 4: Run `npm test`** — expected: PASS.
- [ ] **Step 5: Commit** — `feat: add car simulation and checkpoint payouts`.

---

### Task 5: Save and load

**Files:**
- Create: `src/save.js`
- Test: `tests/save.test.js`

**Interfaces:**
- Consumes: `SAVE_KEY`, `SEGMENT_TYPES`; `createInitialState`.
- Produces:
  - `serialize(state) -> string` — `JSON.stringify`
  - `deserialize(text: string) -> State | null` — null when `text` is null, JSON is invalid, the parsed value is not an object, `version !== 1`, `money` is not a finite number ≥ 0, or `segments` is not a non-empty array of `{ type }` with known types. Otherwise: missing `levels` / `bought` / `stats` fields are filled from `createInitialState()`; cars without a finite `distance` are dropped; `distance` is normalized into `[0, n)` with `((d % n) + n) % n`; missing `lane` → 0.
  - `saveGame(storage, state) -> boolean` — `storage.setItem(SAVE_KEY, serialize(state))` in try/catch
  - `loadGame(storage) -> State` — `deserialize(storage.getItem(SAVE_KEY))` in try/catch; falls back to `createInitialState()`

- [ ] **Step 1: Write the failing tests**

```js
const memoryStorage = () => ({ data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } });
const throwingStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };

test('round trip', () => {
  const s = createInitialState();
  s.money = 123;
  assert.deepEqual(deserialize(serialize(s)), s);
});
test('deserialize rejects bad JSON', () => assert.equal(deserialize('{bad'), null));
test('deserialize rejects other versions', () => {
  assert.equal(deserialize(JSON.stringify({ ...createInitialState(), version: 2 })), null);
});
test('deserialize rejects unknown segment types', () => {
  assert.equal(deserialize(JSON.stringify({ ...createInitialState(), segments: [{ type: 'banana' }] })), null);
});
test('deserialize rejects negative money', () => {
  assert.equal(deserialize(JSON.stringify({ ...createInitialState(), money: -5 })), null);
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
```

- [ ] **Step 2: Run `node --test tests/save.test.js`** — expected: FAIL.
- [ ] **Step 3: Implement `src/save.js`.**
- [ ] **Step 4: Run `npm test`** — expected: PASS.
- [ ] **Step 5: Commit** — `feat: add localStorage save and load`.

---

### Task 6: Track geometry

**Files:**
- Create: `src/geometry.js`
- Test: `tests/geometry.test.js`

**Interfaces:**
- Produces:
  - Exported constants `MARGIN = 40`, `BUMP = 40`, `SAMPLES_PER_SPAN = 8`, `SHAPE_EXP = 4`
  - `buildTrackPath(segments, width: number, height: number) -> { samples: Array<{ x, y, u }>, center: { x, y } }` — `u` is the track-unit position of each sample, from 0 to `n` inclusive; the last sample repeats the first point with `u = n`
  - `pointAt(path, distance: number) -> { x, y, angle }` — binary search on `u`, linear interpolation, `angle = atan2` of the span direction

- [ ] **Step 1: Write the failing tests**

```js
const seg = (...t) => t.map(type => ({ type }));
const W = 800, H = 600;
const finite = p => Number.isFinite(p.x) && Number.isFinite(p.y);
const inside = p => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

test('default circuit path is closed and sampled', () => {
  const path = buildTrackPath(seg('straight', 'checkpoint', 'straight', 'checkpoint'), W, H);
  assert.equal(path.samples.length, 4 * 2 * SAMPLES_PER_SPAN + 1);
  assert.equal(path.samples.at(-1).u, 4);
  assert.ok(dist(path.samples[0], path.samples.at(-1)) < 1e-9);
  assert.ok(path.samples.every(p => finite(p) && inside(p)));
});
test('boundary points sit on the base shape', () => {
  const path = buildTrackPath(seg('straight', 'straight', 'straight', 'straight'), W, H);
  const p = pointAt(path, 2);            // u = n/2 → angle π → leftmost point
  assert.ok(Math.abs(p.x - MARGIN) < 1e-3);
  assert.ok(Math.abs(p.y - H / 2) < 1e-3);   // sin(π) is not exactly 0, and |sin|^0.5 amplifies it
});
test('curve_right bends inward, curve_left outward', () => {
  const flat = buildTrackPath(seg('straight', 'straight', 'straight', 'straight'), W, H);
  const right = buildTrackPath(seg('curve_right', 'straight', 'straight', 'straight'), W, H);
  const left = buildTrackPath(seg('curve_left', 'straight', 'straight', 'straight'), W, H);
  const c = flat.center;
  assert.ok(dist(pointAt(right, 0.5), c) < dist(pointAt(flat, 0.5), c) - 10);
  assert.ok(dist(pointAt(left, 0.5), c) > dist(pointAt(flat, 0.5), c) + 10);
});
test('48 curves stay finite and on canvas', () => {
  const path = buildTrackPath(Array.from({ length: 48 }, () => ({ type: 'curve_left' })), W, H);
  assert.ok(path.samples.every(p => finite(p) && inside(p)));
});
```

- [ ] **Step 2: Run `node --test tests/geometry.test.js`** — expected: FAIL.

- [ ] **Step 3: Implement `buildTrackPath` and `pointAt`** with this algorithm:

```
center = (W/2, H/2); rx = W/2 − MARGIN; ry = H/2 − MARGIN
base(θ) = (cx + rx·sgn(cosθ)·|cosθ|^(2/SHAPE_EXP),  cy + ry·sgn(sinθ)·|sinθ|^(2/SHAPE_EXP))   // rounded rectangle
outward(θ) = normalize(base(θ) − center)
perimeter ≈ sum of distances between base() at 64 evenly spaced θ
A = min(BUMP, 0.35 · perimeter / n)
control points, for i in 0..n−1:
  (u = i,       offset 0)
  (u = i + 0.5, offset +A if curve_left, −A if curve_right, else 0)
  each at θ = 2π·u/n, position = base(θ) + offset·outward(θ)
closed uniform Catmull-Rom through the 2n control points (indices wrap);
SAMPLES_PER_SPAN samples per span at t = k/SAMPLES_PER_SPAN, u interpolated linearly between the span's two control u values;
append a copy of the first sample with u = n.
```

On screen θ grows clockwise (canvas y points down), so cars drive clockwise and `curve_left` (outward) is a left turn from the driver's view.

- [ ] **Step 4: Run `npm test`** — expected: PASS.
- [ ] **Step 5: Commit** — `feat: add closed spline track geometry`.

---

### Task 7: Page, renderer, game loop

**Files:**
- Create: `index.html`, `style.css`, `src/render.js`, `src/main.js`

**Interfaces:**
- Consumes: `buildTrackPath`, `pointAt` (geometry); `stepCars` (simulation); `loadGame` (save); `checkpointPositions` (track).
- Produces:
  - `createRenderer(canvas) -> { resize(): { width, height }, draw(state, path): void }` — `resize` sizes the canvas to its CSS box × `devicePixelRatio` and returns the CSS size
  - `index.html` contains `<canvas id="track">` inside `<main>` and an empty `<aside id="panel">` that Task 8 fills; `main.js` exports nothing

- [ ] **Step 1: Write `index.html` and `style.css`.** `lang="fr"`, title "Racing Incremental", viewport meta. Layout: canvas fills the left area, panel on the right (stacks under the canvas below 800 px width). Dark theme: background `#14161c`, panel `#1d2029`, text `#e6e8ee`, accent `#ffb547`, rounded corners 12 px, system-ui font.

- [ ] **Step 2: Implement `src/render.js`.** Draw order each frame: clear to background; track as a closed path through `path.samples` with `lineJoin = lineCap = 'round'` — outer edge stroke `#3a3f4d` width 36, asphalt `#2a2e38` width 30, dashed center line `#4a5060` width 2; start line at distance 0 (white band across the track); each checkpoint at its position as an accent-colored rounded band perpendicular to the track (use `pointAt(...).angle`); each car as a 14×8 rounded rectangle (`ctx.roundRect`, radius 3) rotated to `angle`, shifted sideways by `lane × 9` px, color `hsl((index × 137.5) % 360, 70%, 62%)`.

- [ ] **Step 3: Implement `src/main.js`.** Boot: `state = loadGame(localStorage)`; `renderer.resize()` then `path = buildTrackPath(state.segments, w, h)`; rebuild the path on `resize` events. Loop with `requestAnimationFrame`: `dt = (now − last) / 1000`, `stepCars(state, dt)`, `renderer.draw(state, path)`.

- [ ] **Step 4: Verify in the browser.** Run `python -m http.server 8000` in the repo root and open `http://localhost:8000`. Expected: rounded circuit with 2 checkpoint bands and a start line, 2 cars lapping clockwise at about 4 s per lap, no console errors, the track resizes with the window.

- [ ] **Step 5: Run `npm test`** — expected: still PASS.
- [ ] **Step 6: Commit** — `feat: render circuit and cars with game loop`.

---

### Task 8: Controls, stats, autosave, README

**Files:**
- Create: `src/ui.js`
- Modify: `src/main.js`, `index.html` (panel content only if built statically), `README.md`

**Interfaces:**
- Consumes: `segmentCost`, `buySegment`, `upgradeCost`, `buyUpgrade` (economy); `canAddSegment` (track); `formatMoney` (format); `createRateMeter` (stats); `saveGame` (save); `AUTOSAVE_MS`.
- Produces: `createUI(panel, { onBuySegment(type), onBuyUpgrade(kind) }) -> { update(state, moneyPerSecond): void }`

- [ ] **Step 1: Implement `src/ui.js`.** Panel sections and French labels:
  - Stats: "Argent" (`formatMoney(money)` + " $"), "Voitures" (count), "Revenu" (`formatMoney(rate)` + " $/s")
  - "Circuit": buttons "Ligne droite", "Virage gauche", "Virage droite", "Checkpoint", each showing its `segmentCost`
  - "Améliorations": "Nouvelle voiture", "Vitesse +10 %", "Gain +10 %", each showing its `upgradeCost`
  - A button is `disabled` when it cannot be bought, with `title` set to the reason: `need_track` → "Il faut un segment de piste par checkpoint", `max_segments` → "Circuit complet (48 segments max)", money short → "Pas assez d'argent"
  - Build the DOM once; `update` only changes text, `disabled` and `title`.

- [ ] **Step 2: Wire it in `src/main.js`.** Purchase handlers call the economy function; on success call `saveGame(localStorage, state)`, and after a segment purchase rebuild `path`. Call `ui.update` at most every 250 ms with `rateMeter.rate()`, pushing `(now, state.stats.totalEarned)` into a `createRateMeter(5000)` once per second. Autosave with `setInterval(..., AUTOSAVE_MS)` and on `pagehide` and on `visibilitychange` when hidden.

- [ ] **Step 3: Update `README.md`.** Replace the "Jouer" section with: local play needs a small server because ES modules do not load from `file://` (`python -m http.server 8000`, then `http://localhost:8000`); tests with `npm test` (Node 20+); online version at `https://tonoplas909.github.io/racing-incremental/` once Pages is enabled on `main` / root.

- [ ] **Step 4: Verify in the browser** (same server as Task 7):
  - Money rises by 10 each time a car crosses a checkpoint; "Revenu" settles near 10 $/s at the start
  - "Checkpoint" is disabled at start with the `need_track` tooltip; after buying a "Ligne droite" (30 $) it becomes buyable at 120 $
  - Buying a curve adds a visible rounded bump; cars do not jump when a segment is added
  - "Nouvelle voiture" at 300 $ adds a car at the start line
  - Reload the page: money, circuit, cars and levels are restored
  - DevTools → Application → Local Storage → set `racingGame` to `{bad` and reload: a fresh game starts, no console error
  - Switch tabs for 30 s and come back: no money burst

- [ ] **Step 5: Run `npm test`** — expected: PASS.
- [ ] **Step 6: Commit** — `feat: add controls, stats and autosave`.
