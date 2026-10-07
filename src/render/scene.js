import { WORLD, CAR_LENGTH, CAR_WIDTH, PLAYER_TEAM, RIVALS, RACE } from '../config.js';
import { pointAt, curvAt } from '../track.js';

const TAU = Math.PI * 2;

const SKID_MAX = 3000;
const SKID_INTERVAL = 1 / 30;
const SKID_LIFE = 8;
const SKID_MIN_SPEED = 120;
const SKID_GRIP_RATIO = 0.85;

const PARTICLE_MAX = 240;
const FLAME_PER_FRAME = 3;
const FLAME_LIFE = 0.35;
const FLAME_SHADES = 8;

const FLOAT_MAX = 48;
const FLOAT_LIFE = 1.2;
const FLOAT_RISE = 30;

const LIGHT_STEP = 0.6;
const LIGHT_COUNT = 5;
const GO_DURATION = 1;

const TEAM_COLORS = new Map();
TEAM_COLORS.set(PLAYER_TEAM.id, PLAYER_TEAM.color);
for (const r of RIVALS) TEAM_COLORS.set(r.id, r.color);

const darkCache = new Map();
function darken(hex, factor) {
  const key = hex + factor;
  let out = darkCache.get(key);
  if (out === undefined) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const g = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    out = `rgb(${r}, ${g}, ${b})`;
    darkCache.set(key, out);
  }
  return out;
}

// Flame palette: bright yellow at birth, deep orange at death.
const FLAME_PALETTE = [];
for (let i = 0; i < FLAME_SHADES; i++) {
  const t = i / (FLAME_SHADES - 1);
  FLAME_PALETTE.push(`hsl(${Math.round(52 - 30 * t)}, 100%, ${Math.round(62 - 8 * t)}%)`);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function createScene() {
  // Skid marks: ring buffer, oldest points live at (head - count).
  const skidX = new Float32Array(SKID_MAX);
  const skidY = new Float32Array(SKID_MAX);
  const skidAge = new Float32Array(SKID_MAX);
  let skidHead = 0;
  let skidCount = 0;
  const skidTimers = new Map();

  // Flame particles: fixed pool, swap-remove.
  const px = new Float32Array(PARTICLE_MAX);
  const py = new Float32Array(PARTICLE_MAX);
  const pvx = new Float32Array(PARTICLE_MAX);
  const pvy = new Float32Array(PARTICLE_MAX);
  const page = new Float32Array(PARTICLE_MAX);
  const pr = new Float32Array(PARTICLE_MAX);
  let pCount = 0;

  const floats = [];
  let lastRace = null;
  let clock = 0;

  function pushSkid(x, y) {
    skidX[skidHead] = x;
    skidY[skidHead] = y;
    skidAge[skidHead] = 0;
    skidHead = (skidHead + 1) % SKID_MAX;
    if (skidCount < SKID_MAX) skidCount++;
  }

  function spawnFlame(x, y, heading) {
    if (pCount >= PARTICLE_MAX) return;
    const i = pCount++;
    const back = heading + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 40 + Math.random() * 50;
    px[i] = x + (Math.random() - 0.5) * 3;
    py[i] = y + (Math.random() - 0.5) * 3;
    pvx[i] = Math.cos(back) * speed;
    pvy[i] = Math.sin(back) * speed;
    page[i] = 0;
    pr[i] = 3 + Math.random() * 3;
  }

  function update(race, dt) {
    if (race !== lastRace) {
      lastRace = race;
      skidHead = 0;
      skidCount = 0;
      skidTimers.clear();
      pCount = 0;
    }
    clock += dt;
    const { track, cars } = race;

    // Age and drop skid marks (oldest first).
    for (let k = 0; k < skidCount; k++) {
      skidAge[(skidHead - skidCount + k + SKID_MAX) % SKID_MAX] += dt;
    }
    while (skidCount > 0 && skidAge[(skidHead - skidCount + SKID_MAX) % SKID_MAX] >= SKID_LIFE) skidCount--;

    // Age flames.
    for (let i = 0; i < pCount;) {
      page[i] += dt;
      if (page[i] >= FLAME_LIFE) {
        const last = --pCount;
        if (i !== last) {
          px[i] = px[last]; py[i] = py[last]; pvx[i] = pvx[last]; pvy[i] = pvy[last];
          page[i] = page[last]; pr[i] = pr[last];
        }
        continue;
      }
      px[i] += pvx[i] * dt;
      py[i] += pvy[i] * dt;
      i++;
    }

    // Floating texts.
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      f.age += dt;
      if (f.age >= FLOAT_LIFE) {
        floats[i] = floats[floats.length - 1];
        floats.pop();
      }
    }

    for (const car of cars) {
      if (race.phase === 'racing' && !car.finished) {
        const slide = (car.braking && car.v > SKID_MIN_SPEED) ||
          Math.abs(curvAt(track, car.s)) * car.v * car.v > SKID_GRIP_RATIO * car.params.grip;
        let acc = (skidTimers.get(car.id) || 0) + dt;
        if (acc > SKID_INTERVAL * 2) acc = SKID_INTERVAL * 2;
        if (acc >= SKID_INTERVAL) {
          acc -= SKID_INTERVAL;
          if (slide) {
            const rs = car.s - CAR_LENGTH * 0.35;
            const a = pointAt(track, rs, car.lateral + CAR_WIDTH * 0.4);
            const b = pointAt(track, rs, car.lateral - CAR_WIDTH * 0.4);
            pushSkid(a.x, a.y);
            pushSkid(b.x, b.y);
          }
        }
        skidTimers.set(car.id, acc);
      }

      if (race.time < car.nitroUntil) {
        const p = pointAt(track, car.s - CAR_LENGTH * 0.55, car.lateral);
        for (let n = 0; n < FLAME_PER_FRAME; n++) spawnFlame(p.x, p.y, p.heading);
      }
    }
  }

  function addFloat(x, y, text, color) {
    if (floats.length >= FLOAT_MAX) floats.shift();
    floats.push({ x, y, text, color, age: 0 });
  }

  function drawSkids(ctx) {
    ctx.fillStyle = '#111';
    for (let k = 0; k < skidCount; k++) {
      const i = (skidHead - skidCount + k + SKID_MAX) % SKID_MAX;
      const a = skidAge[i];
      if (a >= SKID_LIFE) continue;
      ctx.globalAlpha = 0.35 * (1 - a / SKID_LIFE);
      ctx.fillRect(skidX[i] - 1, skidY[i] - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawFlames(ctx) {
    if (pCount === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pCount; i++) {
      const t = page[i] / FLAME_LIFE;
      ctx.globalAlpha = 0.9 * (1 - t);
      ctx.fillStyle = FLAME_PALETTE[Math.min(FLAME_SHADES - 1, (t * FLAME_SHADES) | 0)];
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i] * (1 - 0.5 * t), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCar(ctx, car, p, color, own) {
    const hl = CAR_LENGTH / 2;
    const hw = CAR_WIDTH / 2;

    // Shadow, offset in world space.
    ctx.save();
    ctx.translate(p.x + 3, p.y + 3);
    ctx.rotate(p.heading);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    roundRectPath(ctx, -hl, -hw, CAR_LENGTH, CAR_WIDTH, 4);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.heading);

    // Wheels sticking out at the corners.
    ctx.fillStyle = '#0c0c0e';
    const wx = hl - 7;
    ctx.fillRect(wx - 3, -hw - 2, 6, 4);
    ctx.fillRect(wx - 3, hw - 2, 6, 4);
    ctx.fillRect(-wx - 3, -hw - 2, 6, 4);
    ctx.fillRect(-wx - 3, hw - 2, 6, 4);

    // Body.
    roundRectPath(ctx, -hl, -hw, CAR_LENGTH, CAR_WIDTH, 4);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = darken(color, 0.55);
    ctx.stroke();

    // Wings.
    ctx.fillStyle = '#17171c';
    ctx.fillRect(hl - 1, -hw - 1, 3, CAR_WIDTH + 2);
    ctx.fillRect(-hl - 2, -hw, 3, CAR_WIDTH);

    // Center stripe for own cars.
    if (own) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-hl + 3, -1, CAR_LENGTH - 8, 2);
    }

    // Cockpit and helmet.
    ctx.fillStyle = '#14141a';
    ctx.beginPath();
    ctx.ellipse(-1.5, 0, 4.5, 3.2, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = own ? '#ffffff' : '#e8e8e8';
    ctx.beginPath();
    ctx.arc(-1.5, 0, 1.8, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawOwnRings(ctx, p, color, info) {
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.25 + 0.2 * pulse;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 19 + pulse * 1.5, 0, TAU);
    ctx.stroke();

    const ready = Math.max(0, Math.min(1, info.nitroReady));
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 25, 0, TAU);
    ctx.stroke();
    if (ready > 0) {
      ctx.strokeStyle = ready >= 1 ? '#ffe066' : '#4cc9f0';
      ctx.globalAlpha = ready >= 1 ? 0.7 + 0.3 * pulse : 0.95;
      ctx.beginPath();
      if (ready >= 1) ctx.arc(p.x, p.y, 25, 0, TAU);
      else ctx.arc(p.x, p.y, 25, -Math.PI / 2, -Math.PI / 2 + ready * TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  function drawBadge(ctx, p, color, info) {
    const text = 'P' + info.rank;
    const w = 24, h = 14;
    const bx = p.x - w / 2, by = p.y - 40;
    roundRectPath(ctx, bx, by, w, h, 5);
    ctx.fillStyle = 'rgba(12, 12, 18, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, p.x, by + h / 2 + 0.5);
  }

  function drawFloats(ctx) {
    if (floats.length === 0) return;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(10, 10, 14, 0.9)';
    for (const f of floats) {
      const t = f.age / FLOAT_LIFE;
      const rise = FLOAT_RISE * (1 - (1 - t) * (1 - t));
      const pop = 1 + 0.35 * Math.max(0, 1 - f.age / 0.18);
      ctx.globalAlpha = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
      ctx.save();
      ctx.translate(f.x, f.y - rise);
      ctx.scale(pop, pop);
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawStartLights(ctx, race, view, dpr) {
    const t = race.time;
    if (t >= GO_DURATION) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssW = ctx.canvas && ctx.canvas.width ? ctx.canvas.width / dpr : view.offsetX * 2 + WORLD.width * view.scale;
    const spacing = 34;
    const radius = 12;
    const panelW = spacing * LIGHT_COUNT + 12;
    const panelH = radius * 2 + 20;
    const px0 = cssW / 2 - panelW / 2;
    const py0 = 14;
    const go = t >= 0;
    const lit = go ? LIGHT_COUNT : Math.max(0, Math.min(LIGHT_COUNT, Math.floor((t + RACE.countdown) / LIGHT_STEP) + 1));
    const fade = go ? Math.min(1, (GO_DURATION - t) / 0.3) : 1;

    ctx.globalAlpha = fade;
    roundRectPath(ctx, px0, py0, panelW, panelH, 10);
    ctx.fillStyle = 'rgba(14, 14, 20, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    const cy = py0 + panelH / 2;
    for (let i = 0; i < LIGHT_COUNT; i++) {
      const cx = px0 + 6 + spacing * (i + 0.5);
      const on = i < lit;
      if (on) {
        ctx.fillStyle = go ? 'rgba(60, 255, 120, 0.28)' : 'rgba(255, 40, 40, 0.28)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 5, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = on ? (go ? '#37e873' : '#ff2d2d') : '#3a1414';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(cx - 3.5, cy - 4, 3.5, 0, TAU);
        ctx.fill();
      }
    }

    if (go) {
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(10, 10, 14, 0.9)';
      ctx.strokeText('GO', cssW / 2, py0 + panelH + 28);
      ctx.fillStyle = '#37e873';
      ctx.fillText('GO', cssW / 2, py0 + panelH + 28);
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, race, view, dpr, ownInfo) {
    const { track, cars } = race;
    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);

    drawSkids(ctx);
    drawFlames(ctx);

    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rivals first, own cars on top.
    for (let pass = 0; pass < 2; pass++) {
      for (const car of cars) {
        const own = !!ownInfo && ownInfo.has(car.id);
        if (own !== (pass === 1)) continue;
        const p = pointAt(track, car.s, car.lateral);
        const color = TEAM_COLORS.get(car.teamId) || '#cccccc';
        const info = own ? ownInfo.get(car.id) : null;
        if (own) drawOwnRings(ctx, p, color, info);
        drawCar(ctx, car, p, color, own);
        if (own) drawBadge(ctx, p, color, info);
      }
    }

    drawFloats(ctx);
    drawStartLights(ctx, race, view, dpr);

    ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.offsetX, dpr * view.offsetY);
  }

  return { update, addFloat, draw };
}
