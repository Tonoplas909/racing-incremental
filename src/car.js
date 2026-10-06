import { NITRO, TRACK_STEP } from './config.js';
import { curvAt } from './track.js';

// curvAt is piecewise constant per track cell, so sample every cell (brief: 8) and credit the
// braking distance only from where each cell starts; otherwise the car overshoots at cell jumps.
const LOOKAHEAD_STEP = TRACK_STEP;
const LOOKAHEAD_MARGIN = 16;
const MIN_CURVATURE = 1e-6;

export function cornerSpeed(curvature, grip) {
  const c = Math.abs(curvature);
  if (c < MIN_CURVATURE) return Infinity;
  return Math.sqrt(grip / c);
}

export function targetSpeed(track, s, params) {
  const { topSpeed, brake, grip } = params;
  const lookahead = (topSpeed * topSpeed) / (2 * brake) + LOOKAHEAD_MARGIN;
  // Compare squared speeds, take a single sqrt at the end.
  const { step, length } = track;
  let best2 = topSpeed * topSpeed;
  for (let d = 0; d <= lookahead; d += LOOKAHEAD_STEP) {
    const c = Math.abs(curvAt(track, s + d));
    if (c < MIN_CURVATURE) continue;
    // Distance from the sample point back to the start of its curvature cell (cells are centred on samples).
    let w = (s + d) % length;
    if (w < 0) w += length;
    const x = w / step + 0.5;
    const dEff = Math.max(0, d - (x - Math.floor(x)) * step);
    const v2 = grip / c + 2 * brake * dEff;
    if (v2 < best2) best2 = v2;
  }
  return Math.sqrt(best2);
}

export function nextSpeed(v, target, params, dt) {
  const { topSpeed, accel, brake } = params;
  if (v < target) {
    return Math.min(target, v + accel * (1 - 0.6 * v / topSpeed) * dt);
  }
  return Math.max(target, v - brake * dt);
}

export function effectiveParams(params, nitroActive) {
  return {
    topSpeed: nitroActive ? params.topSpeed * NITRO.speedMult : params.topSpeed,
    accel: nitroActive ? params.accel * NITRO.accelMult : params.accel,
    brake: params.brake,
    grip: params.grip,
  };
}
