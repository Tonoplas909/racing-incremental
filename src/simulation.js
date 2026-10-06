import { MAX_DT, SEGMENT_SPEED_MULT } from './config.js';
import { segmentIndexAt, checkpointPositions } from './track.js';
import { carSpeed, checkpointPayout } from './economy.js';

export function countCrossings(positions, from, to, total) {
  let count = 0;
  for (const p of positions) {
    count += Math.floor((to - p) / total) - Math.floor((from - p) / total);
  }
  return count;
}

export function stepCars(state, dt) {
  dt = Math.min(dt, MAX_DT);

  const speed = carSpeed(state);
  const payout = checkpointPayout(state);
  const checkpoints = checkpointPositions(state.segments);
  const trackLength = state.segments.length;

  let totalEarned = 0;

  for (const car of state.cars) {
    const segmentIndex = segmentIndexAt(state.segments, car.distance);
    const segmentType = state.segments[segmentIndex].type;
    const speedMult = SEGMENT_SPEED_MULT[segmentType];

    const oldDistance = car.distance;
    const newDistance = oldDistance + speed * speedMult * dt;

    const hits = countCrossings(checkpoints, oldDistance, newDistance, trackLength);
    totalEarned += hits * payout;

    state.stats.checkpointsHit += hits;

    car.distance = newDistance % trackLength;
  }

  state.money += totalEarned;
  state.stats.totalEarned += totalEarned;

  return totalEarned;
}
