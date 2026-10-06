import { START, UPGRADE_EFFECT, SEGMENT_BASE_COST, SEGMENT_COST_GROWTH } from './config.js';
import { canAddSegment } from './track.js';

export function laneFor(index) {
  return ((index * 0.6180339887) % 1) * 2 - 1;
}

export function createInitialState() {
  const segments = START.segments.map(type => ({ type }));
  const cars = [];
  for (let i = 0; i < START.cars; i++) {
    const distance = i * segments.length / START.cars;
    cars.push({
      distance,
      lane: laneFor(i),
    });
  }

  return {
    version: 1,
    money: 0,
    segments,
    cars,
    levels: { speed: 0, payout: 0 },
    bought: { straight: 0, curve_left: 0, curve_right: 0, checkpoint: 0 },
    stats: { totalEarned: 0, checkpointsHit: 0 },
  };
}

export function carSpeed(state) {
  return START.speed * UPGRADE_EFFECT ** state.levels.speed;
}

export function checkpointPayout(state) {
  return START.payout * UPGRADE_EFFECT ** state.levels.payout;
}

export function upgradeCost(state, kind) {
  if (kind === 'car') {
    return 100 * (state.cars.length + 1);
  }
  if (kind === 'speed') {
    return 50 * (state.levels.speed + 1);
  }
  if (kind === 'payout') {
    return 75 * (state.levels.payout + 1);
  }
}

export function buyUpgrade(state, kind) {
  const cost = upgradeCost(state, kind);
  if (state.money < cost) {
    return false;
  }

  state.money -= cost;

  if (kind === 'car') {
    state.cars.push({
      distance: 0,
      lane: laneFor(state.cars.length),
    });
  } else if (kind === 'speed') {
    state.levels.speed += 1;
  } else if (kind === 'payout') {
    state.levels.payout += 1;
  }

  return true;
}

export function segmentCost(state, type) {
  return Math.ceil(SEGMENT_BASE_COST[type] * SEGMENT_COST_GROWTH ** state.bought[type] - 1e-9);
}

export function buySegment(state, type) {
  const canAdd = canAddSegment(state.segments, type);
  if (!canAdd.ok) {
    return false;
  }

  const cost = segmentCost(state, type);
  if (state.money < cost) {
    return false;
  }

  state.segments.push({ type });
  state.bought[type] += 1;
  state.money -= cost;

  return true;
}
