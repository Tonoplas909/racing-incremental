export const WORLD = { width: 1600, height: 1000 };
export const TRACK_WIDTH = 70;
export const TRACK_STEP = 4;
export const LAPS = 3;
export const BASE_CAR = { topSpeed: 260, accel: 140, brake: 260, grip: 300 };
export const CAR_LENGTH = 26;
export const CAR_WIDTH = 13;
export const NITRO = { speedMult: 1.4, accelMult: 1.6, baseDuration: 1.5, durationPerLevel: 0.3, baseCooldown: 8, cooldownFactor: 0.93 };
export const UPGRADES = {
  engine: { base: 50, growth: 1.6 },
  tires:  { base: 50, growth: 1.6 },
  brakes: { base: 40, growth: 1.55 },
  nitro:  { base: 80, growth: 1.7 },
};
export const UPGRADE_EFFECT = { engineSpeed: 1.06, engineAccel: 1.08, tires: 1.07, brakes: 1.1 };
export const CAR_COSTS = [300, 2000, 12000];
export const MAX_CARS = 4;
export const PRIZES = [120, 80, 60, 40, 30, 20, 15, 10, 10];
export const LAP_REWARD = 5;
export const OVERTAKE_REWARD = 3;
export const REPUTATION = [5, 3, 2, 1];
export const RIVAL_BASE = 0.98;
export const RIVAL_GROWTH = 1.25;
export const PLAYER_TEAM = { id: 'player', name: 'Ton écurie', color: '#ff8c1a' };
export const RIVALS = [
  { id: 'rouge',    name: 'Bolide Rouge', color: '#e63946', skill: 1.0 },
  { id: 'azur',     name: 'Azur Racing',  color: '#3a86ff', skill: 0.97 },
  { id: 'citron',   name: 'Team Citron',  color: '#ffd60a', skill: 0.95 },
  { id: 'vertigo',  name: 'Vertigo',      color: '#2ec4b6', skill: 0.93 },
  { id: 'nocturne', name: 'Nocturne',     color: '#9d4edd', skill: 0.9 },
];
export const RACE = { countdown: 3, finishGrace: 20, gridGap: 30, overtakeGrace: 3 };
export const AUTOSAVE_MS = 5000;
export const SAVE_KEY = 'pitwall.v2';
export const TRACKS = [
  { id: 'vallon',   name: 'Anneau de Vallon',  repRequired: 0,   reward: 1,
    points: [[300,500],[350,250],[600,150],[1000,150],[1300,250],[1350,500],[1300,750],[1000,850],[600,850],[350,750]] },
  { id: 'collines', name: 'Les Collines',      repRequired: 15,  reward: 2.5,
    points: [[250,600],[250,300],[450,180],[680,230],[860,500],[1080,340],[1260,190],[1420,400],[1350,700],[1100,850],[700,820],[450,820]] },
  { id: 'lac',      name: 'Épingle du Lac',    repRequired: 45,  reward: 6,
    points: [[200,500],[300,200],[600,150],[680,420],[880,450],[960,150],[1300,150],[1400,450],[1250,560],[1280,820],[900,870],[500,780]] },
  { id: 'mirebeau', name: 'Grand Prix de Mirebeau', repRequired: 110, reward: 15,
    points: [[200,800],[200,250],[400,150],[565,355],[560,495],[740,615],[905,370],[1100,150],[1400,250],[1400,550],[1300,700],[1150,850],[800,890]] },
  { id: 'lumiere',  name: 'Ville Lumière',     repRequired: 250, reward: 40,
    points: [[260,870],[235,570],[150,350],[300,150],[650,150],[700,400],[950,400],[1000,150],[1400,180],[1450,500],[1250,560],[1200,800],[800,880],[640,750],[455,865]] },
];
