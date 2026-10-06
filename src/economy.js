import {
  BASE_CAR, NITRO, UPGRADES, UPGRADE_EFFECT, CAR_COSTS, MAX_CARS,
  PRIZES, LAP_REWARD, OVERTAKE_REWARD, REPUTATION, TRACKS
} from './config.js';

export function createProfile() {
  return {
    version: 2,
    money: 0,
    reputation: 0,
    levels: { engine: 0, tires: 0, brakes: 0, nitro: 0 },
    cars: 1,
    trackIndex: 0,
    stats: { races: 0, wins: 0, earned: 0 }
  };
}

export function upgradeCost(profile, key) {
  if (!UPGRADES[key]) return Infinity;
  const { base, growth } = UPGRADES[key];
  const level = profile.levels[key];
  return Math.ceil(base * Math.pow(growth, level) - 1e-9);
}

export function carCost(profile) {
  if (profile.cars >= MAX_CARS) return Infinity;
  return CAR_COSTS[profile.cars - 1];
}

export function buyUpgrade(profile, key) {
  if (!UPGRADES[key]) return false;
  const cost = upgradeCost(profile, key);
  if (profile.money < cost) return false;
  profile.money -= cost;
  profile.levels[key]++;
  return true;
}

export function buyCar(profile) {
  const cost = carCost(profile);
  if (profile.money < cost) return false;
  profile.money -= cost;
  profile.cars++;
  return true;
}

export function playerParams(profile) {
  const result = { ...BASE_CAR };
  const engineLevel = profile.levels.engine;
  const tiresLevel = profile.levels.tires;
  const brakesLevel = profile.levels.brakes;

  result.topSpeed *= Math.pow(UPGRADE_EFFECT.engineSpeed, engineLevel);
  result.accel *= Math.pow(UPGRADE_EFFECT.engineAccel, engineLevel);
  result.grip *= Math.pow(UPGRADE_EFFECT.tires, tiresLevel);
  result.brake *= Math.pow(UPGRADE_EFFECT.brakes, brakesLevel);

  return result;
}

export function nitroStats(profile) {
  const n = profile.levels.nitro;
  return {
    duration: NITRO.baseDuration + NITRO.durationPerLevel * n,
    cooldown: NITRO.baseCooldown * Math.pow(NITRO.cooldownFactor, n)
  };
}

export function rivalParams(trackIndex, skill) {
  const multiplier = (0.92 + 0.1 * trackIndex) * skill;
  return {
    topSpeed: BASE_CAR.topSpeed * multiplier,
    accel: BASE_CAR.accel * multiplier,
    brake: BASE_CAR.brake * multiplier,
    grip: BASE_CAR.grip * multiplier
  };
}

export function lapReward(trackIndex) {
  return LAP_REWARD * TRACKS[trackIndex].reward;
}

export function overtakeReward(trackIndex, count) {
  return OVERTAKE_REWARD * TRACKS[trackIndex].reward * count;
}

export function earn(profile, amount) {
  profile.money += amount;
  profile.stats.earned += amount;
}

export function unlockedCount(profile) {
  return TRACKS.filter(track => track.repRequired <= profile.reputation).length;
}

export function settleRace(profile, carIds, ownIds, trackIndex) {
  const track = TRACKS[trackIndex];
  const reward = track.reward;

  // Calculate prize and find best own position
  let prize = 0;
  let bestOwnPosition = Infinity;

  ownIds.forEach(ownId => {
    const position = carIds.indexOf(ownId) + 1; // 1-indexed
    if (position > 0) {
      if (position <= PRIZES.length) {
        prize += PRIZES[position - 1] * reward;
      }
      if (position < bestOwnPosition) {
        bestOwnPosition = position;
      }
    }
  });

  // Earn the prize
  earn(profile, prize);

  // Get reputation from best position
  const reputationGain = bestOwnPosition > 0 && bestOwnPosition <= REPUTATION.length
    ? REPUTATION[bestOwnPosition - 1]
    : 0;

  // Update stats
  profile.stats.races++;
  if (bestOwnPosition === 1) {
    profile.stats.wins++;
  }

  // Check if track was unlocked
  const oldUnlockedCount = unlockedCount(profile);
  profile.reputation += reputationGain;
  const newUnlockedCount = unlockedCount(profile);

  let unlocked = null;
  if (newUnlockedCount > oldUnlockedCount) {
    // Find the new highest unlocked track index
    for (let i = TRACKS.length - 1; i >= 0; i--) {
      if (TRACKS[i].repRequired <= profile.reputation) {
        unlocked = i;
        profile.trackIndex = i;
        break;
      }
    }
  }

  return {
    prize,
    reputation: reputationGain,
    unlocked
  };
}
