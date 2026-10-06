import { LAPS, RACE, CAR_LENGTH, CAR_WIDTH, TRACK_WIDTH } from './config.js';
import { targetSpeed, nextSpeed, effectiveParams } from './car.js';

const LATERAL_SPEED = 45;
const LOOK_AHEAD_GAP = 60;
const CLEAR_GAP = 80;
const SLIPSTREAM_MARGIN = 5;

// Scratch buffer reused by stepRace to order cars without allocating each step.
const scratch = [];

export function trackGap(from, to, length) {
  let d = (((to.s - from.s) % length) + length) % length;
  if (d > length / 2) d -= length;
  return d;
}

export function standings(race) {
  const finished = race.finishOrder.map(id => race.cars.find(c => c.id === id));
  const rest = race.cars.filter(c => !c.finished).sort((a, b) => b.s - a.s);
  return finished.concat(rest);
}

export function createRace(track, entrants, rng = Math.random) {
  const shuffled = entrants.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const cars = shuffled.map((e, i) => {
    const lateral = (i % 2 ? 1 : -1) * 0.3 * TRACK_WIDTH / 2;
    return {
      ...e,
      s: -RACE.gridGap * (i + 1),
      lateral,
      latTarget: lateral,
      v: 0,
      laps: 0,
      finished: false,
      nitroUntil: -Infinity,
      nitroReadyAt: 0,
      bestRank: i + 1,
      braking: false,
    };
  });
  return {
    track,
    time: -RACE.countdown,
    phase: 'countdown',
    cars,
    finishOrder: [],
    firstFinishTime: null,
    results: null,
  };
}

export function tryNitro(race, carId, nitro) {
  if (race.phase !== 'racing') return false;
  const car = race.cars.find(c => c.id === carId);
  if (!car || race.time < car.nitroReadyAt) return false;
  car.nitroUntil = race.time + nitro.duration;
  car.nitroReadyAt = race.time + nitro.cooldown;
  return true;
}

export function overtakeGains(cars, order) {
  const gains = [];
  for (const car of cars) {
    if (!car.own || car.finished) continue;
    const rank = order.indexOf(car) + 1;
    if (rank > 0 && rank < car.bestRank) {
      gains.push({ carId: car.id, count: car.bestRank - rank });
      car.bestRank = rank;
    }
  }
  return gains;
}

export function stepRace(race, dt) {
  if (race.phase === 'finished') return [];
  race.time += dt;
  if (race.phase === 'countdown') {
    if (race.time >= 0) race.phase = 'racing';
    return [];
  }

  const events = [];
  const { track, cars } = race;
  const half = TRACK_WIDTH / 2;
  const L = track.length;
  const maxLat = half - CAR_WIDTH / 2 - 3;

  scratch.length = 0;
  for (const c of cars) scratch.push(c);
  scratch.sort((a, b) => b.s - a.s);

  for (const car of scratch) {
    const p = effectiveParams(car.params, race.time < car.nitroUntil);
    const free = targetSpeed(track, car.s, p);
    let target = free;

    let ahead = null;
    let aheadGap = Infinity;
    let anyClose = false;
    for (const other of cars) {
      if (other === car) continue;
      const g = trackGap(car, other, L);
      if (Math.abs(g) < CLEAR_GAP) anyClose = true;
      if (g > 0 && g < LOOK_AHEAD_GAP && g < aheadGap && Math.abs(other.lateral - car.lateral) < CAR_WIDTH + 4) {
        ahead = other;
        aheadGap = g;
      }
    }

    if (ahead) {
      if (aheadGap < CAR_LENGTH + 8) target = Math.min(target, ahead.v);
      if (free > ahead.v + SLIPSTREAM_MARGIN) car.latTarget = (ahead.lateral > 0 ? -0.55 : 0.55) * half;
    } else if (!anyClose) {
      car.latTarget = 0;
    }

    car.braking = target < car.v - 1;
    car.v = nextSpeed(car.v, target, p, dt);
    car.s += car.v * dt;

    if (ahead) {
      const gap = trackGap(car, ahead, L);
      if (gap < CAR_LENGTH + 2) {
        car.s -= CAR_LENGTH + 2 - gap;
        car.v = Math.min(car.v, ahead.v);
      }
    }

    // Lateral move toward latTarget, refusing to close on a car we are alongside.
    const diff = car.latTarget - car.lateral;
    if (diff !== 0) {
      const step = Math.min(Math.abs(diff), LATERAL_SPEED * dt);
      const newLat = car.lateral + Math.sign(diff) * step;
      let blocked = false;
      for (const other of cars) {
        if (other === car) continue;
        if (Math.abs(trackGap(car, other, L)) >= CAR_LENGTH + 4) continue;
        const before = Math.abs(other.lateral - car.lateral);
        const after = Math.abs(other.lateral - newLat);
        if (after < before && after < CAR_WIDTH + 2) { blocked = true; break; }
      }
      if (!blocked) car.lateral = newLat;
    }
    car.lateral = Math.max(-maxLat, Math.min(maxLat, car.lateral));

    const laps = Math.max(0, Math.floor(car.s / L));
    if (laps > car.laps && !car.finished) {
      car.laps = laps;
      events.push({ type: 'lap', carId: car.id, lap: laps });
      if (laps >= LAPS) {
        car.finished = true;
        race.finishOrder.push(car.id);
        if (race.firstFinishTime === null) race.firstFinishTime = race.time;
        events.push({ type: 'finish', carId: car.id, position: race.finishOrder.length });
      }
    }
  }

  const order = standings(race);
  if (race.time > RACE.overtakeGrace) {
    for (const g of overtakeGains(cars, order)) events.push({ type: 'overtake', carId: g.carId, count: g.count });
  }

  if (cars.every(c => c.finished) ||
      (race.firstFinishTime !== null && race.time - race.firstFinishTime >= RACE.finishGrace)) {
    race.phase = 'finished';
    race.results = order.map(c => c.id);
    events.push({ type: 'raceEnd', results: race.results });
  }
  return events;
}
