import { SAVE_KEY, SEGMENT_TYPES } from './config.js';
import { createInitialState } from './economy.js';

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(text) {
  if (text === null) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  if (parsed.version !== 1) {
    return null;
  }

  if (!Number.isFinite(parsed.money) || parsed.money < 0) {
    return null;
  }

  if (
    !Array.isArray(parsed.segments) ||
    parsed.segments.length === 0 ||
    !parsed.segments.every(seg => typeof seg === 'object' && seg !== null && SEGMENT_TYPES.includes(seg.type))
  ) {
    return null;
  }

  // Get default state for filling missing fields
  const defaults = createInitialState();
  const trackLength = parsed.segments.length;

  // Helper to validate and merge numeric object fields
  const mergeNumericFields = (defaultObj, parsedObj) => {
    const result = {};
    for (const key in defaultObj) {
      const parsedValue = parsedObj?.[key];
      if (Number.isFinite(parsedValue) && parsedValue >= 0) {
        result[key] = parsedValue;
      } else {
        result[key] = defaultObj[key];
      }
    }
    return result;
  };

  // Normalize segments to only include type field
  const normalizedSegments = parsed.segments.map(s => ({ type: s.type }));

  // Build the result state with exact keys from defaults
  const result = {
    version: parsed.version,
    money: parsed.money,
    segments: normalizedSegments,
    cars: [],
    levels: mergeNumericFields(defaults.levels, parsed.levels),
    bought: mergeNumericFields(defaults.bought, parsed.bought),
    stats: mergeNumericFields(defaults.stats, parsed.stats),
  };

  // Process cars: drop those without finite distance, normalize distance, default lane
  if (Array.isArray(parsed.cars)) {
    for (const car of parsed.cars) {
      if (typeof car === 'object' && car !== null && Number.isFinite(car.distance)) {
        const distance = car.distance;
        const normalizedDistance = ((distance % trackLength) + trackLength) % trackLength;
        const lane = Number.isFinite(car.lane) ? car.lane : 0;
        result.cars.push({
          distance: normalizedDistance,
          lane,
        });
      }
    }
  }

  return result;
}

export function saveGame(storage, state) {
  try {
    storage.setItem(SAVE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage) {
  try {
    const text = storage.getItem(SAVE_KEY);
    const state = deserialize(text);
    if (state !== null) {
      return state;
    }
  } catch {
    // Ignore error, fall back to fresh game
  }
  return createInitialState();
}
