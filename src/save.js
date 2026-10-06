import { SAVE_KEY, MAX_CARS } from './config.js';
import { createProfile, unlockedCount } from './economy.js';

export function deserialize(text) {
  // Return null for null text
  if (text === null) return null;

  // Parse JSON, return null if invalid
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  // Return null if not an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  // Return null if version is not 2
  if (data.version !== 2) {
    return null;
  }

  // Return null if money or reputation are not finite >= 0
  if (!Number.isFinite(data.money) || data.money < 0) {
    return null;
  }
  if (!Number.isFinite(data.reputation) || data.reputation < 0) {
    return null;
  }

  // Rebuild from createProfile() keys
  const profile = createProfile();

  // Assign money and reputation once (before unlockedCount)
  profile.money = data.money;
  profile.reputation = data.reputation;

  // Sanitize levels: take parsed value if integer in [0, 100], else default
  for (const key of Object.keys(profile.levels)) {
    const value = data.levels?.[key];
    if (Number.isInteger(value) && value >= 0 && value <= 100) {
      profile.levels[key] = value;
    }
  }

  // Sanitize stats: races and wins are integers >= 0, earned is any finite number >= 0
  const racesValue = data.stats?.races;
  if (Number.isInteger(racesValue) && racesValue >= 0) {
    profile.stats.races = racesValue;
  }
  const winsValue = data.stats?.wins;
  if (Number.isInteger(winsValue) && winsValue >= 0) {
    profile.stats.wins = winsValue;
  }
  const earnedValue = data.stats?.earned;
  if (Number.isFinite(earnedValue) && earnedValue >= 0) {
    profile.stats.earned = earnedValue;
  }

  // Sanitize cars: integer in [1, MAX_CARS], else 1
  if (Number.isInteger(data.cars) && data.cars >= 1 && data.cars <= MAX_CARS) {
    profile.cars = data.cars;
  }

  // Sanitize trackIndex: integer in [0, unlockedCount - 1], else 0
  const unlocked = unlockedCount(profile);
  if (Number.isInteger(data.trackIndex) && data.trackIndex >= 0 && data.trackIndex < unlocked) {
    profile.trackIndex = data.trackIndex;
  }

  return profile;
}

export function saveGame(storage, profile) {
  // Return false without writing if money is not finite
  if (!Number.isFinite(profile.money)) {
    return false;
  }

  // Try to save, return false on error
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage) {
  // Try to load, fallback to createProfile()
  try {
    const text = storage.getItem(SAVE_KEY);
    const profile = deserialize(text);
    if (profile !== null) {
      return profile;
    }
  } catch {
    // Fall through to default
  }

  return createProfile();
}
