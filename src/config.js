export const SEGMENT_TYPES = ['straight', 'curve_left', 'curve_right', 'checkpoint'];

export const SEGMENT_SPEED_MULT = {
  straight: 1,
  curve_left: 0.7,
  curve_right: 0.7,
  checkpoint: 1,
};

export const SEGMENT_BASE_COST = {
  straight: 30,
  curve_left: 20,
  curve_right: 20,
  checkpoint: 120,
};

export const SEGMENT_COST_GROWTH = 1.15;
export const MAX_SEGMENTS = 48;

export const UPGRADE_BASE_COST = {
  car: 100,
  speed: 50,
  payout: 75,
};

export const UPGRADE_EFFECT = 1.1;

export const START = {
  money: 0,
  cars: 2,
  speed: 1.0,
  payout: 10,
  segments: ['straight', 'checkpoint', 'straight', 'checkpoint'],
};

export const MAX_DT = 0.1;
export const AUTOSAVE_MS = 5000;
export const SAVE_KEY = 'racingGame';
