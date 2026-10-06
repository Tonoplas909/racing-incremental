// Track geometry: turns a segment list into a closed Catmull-Rom spline around a rounded rectangle.
// Pure module (no DOM). Cars drive clockwise on screen; curve_left bulges outward.

export const MARGIN = 40;
export const BUMP = 40;
export const SAMPLES_PER_SPAN = 8;
export const SHAPE_EXP = 4;

const PERIMETER_STEPS = 64;
const MAX_BUMP_RATIO = 0.35;

function basePoint(theta, cx, cy, rx, ry) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const e = 2 / SHAPE_EXP;
  return {
    x: cx + rx * Math.sign(c) * Math.abs(c) ** e,
    y: cy + ry * Math.sign(s) * Math.abs(s) ** e,
  };
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (2 * p1.x + (p2.x - p0.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * (2 * p1.y + (p2.y - p0.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * t3),
  };
}

export function buildTrackPath(segments, width, height) {
  const n = segments.length;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - MARGIN;
  const ry = height / 2 - MARGIN;

  let perimeter = 0;
  let prev = basePoint(0, cx, cy, rx, ry);
  for (let k = 1; k <= PERIMETER_STEPS; k++) {
    const cur = basePoint((2 * Math.PI * k) / PERIMETER_STEPS, cx, cy, rx, ry);
    perimeter += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    prev = cur;
  }
  const amplitude = Math.min(BUMP, (MAX_BUMP_RATIO * perimeter) / n);

  const controls = [];
  const controlU = [];
  const addControl = (u, offset) => {
    const theta = (2 * Math.PI * u) / n;
    const b = basePoint(theta, cx, cy, rx, ry);
    const dx = b.x - cx;
    const dy = b.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    controls.push({ x: b.x + (offset * dx) / len, y: b.y + (offset * dy) / len });
    controlU.push(u);
  };
  for (let i = 0; i < n; i++) {
    const type = segments[i].type;
    addControl(i, 0);
    addControl(i + 0.5, type === 'curve_left' ? amplitude : type === 'curve_right' ? -amplitude : 0);
  }

  const m = controls.length;
  const samples = [];
  for (let i = 0; i < m; i++) {
    const p0 = controls[(i - 1 + m) % m];
    const p1 = controls[i];
    const p2 = controls[(i + 1) % m];
    const p3 = controls[(i + 2) % m];
    const u0 = controlU[i];
    const u1 = i + 1 < m ? controlU[i + 1] : n;
    for (let k = 0; k < SAMPLES_PER_SPAN; k++) {
      const t = k / SAMPLES_PER_SPAN;
      const p = catmullRom(p0, p1, p2, p3, t);
      samples.push({ x: p.x, y: p.y, u: u0 + (u1 - u0) * t });
    }
  }
  samples.push({ x: samples[0].x, y: samples[0].y, u: n });

  return { samples, center: { x: cx, y: cy } };
}

export function pointAt(path, distance) {
  const s = path.samples;
  const last = s.length - 1;
  const u = Math.min(Math.max(distance, 0), s[last].u);
  // largest index lo in [0, last - 1] with s[lo].u <= u
  let lo = 0;
  let hi = last - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (s[mid].u <= u) lo = mid;
    else hi = mid - 1;
  }
  const a = s[lo];
  const b = s[lo + 1];
  const span = b.u - a.u;
  const f = span > 0 ? Math.min(Math.max((u - a.u) / span, 0), 1) : 0;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}
