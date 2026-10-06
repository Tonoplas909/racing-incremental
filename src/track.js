import { TRACK_STEP, TRACK_WIDTH } from './config.js';

const TWO_PI = Math.PI * 2;
const SUB_STEPS = 40;
const SMOOTH = 7;

function wrapAngle(a) {
  a = (a + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

// Centripetal Catmull-Rom (Barry-Goldman pyramid) point between p1 and p2.
function catmull(p0, p1, p2, p3, u) {
  const d01 = Math.max(Math.pow(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 0.5), 1e-6);
  const d12 = Math.max(Math.pow(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), 0.5), 1e-6);
  const d23 = Math.max(Math.pow(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]), 0.5), 1e-6);
  const t0 = 0, t1 = d01, t2 = d01 + d12, t3 = d01 + d12 + d23;
  const t = t1 + (t2 - t1) * u;
  const out = [0, 0];
  for (let k = 0; k < 2; k++) {
    const a1 = ((t1 - t) * p0[k] + (t - t0) * p1[k]) / (t1 - t0);
    const a2 = ((t2 - t) * p1[k] + (t - t1) * p2[k]) / (t2 - t1);
    const a3 = ((t3 - t) * p2[k] + (t - t2) * p3[k]) / (t3 - t2);
    const b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0);
    const b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1);
    out[k] = ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1);
  }
  return out;
}

export function buildTrack(def) {
  const pts = def.points;
  const n = pts.length;

  // 1. Dense closed polyline (last vertex coincides with the first).
  const dx = [], dy = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < SUB_STEPS; k++) {
      const p = catmull(p0, p1, p2, p3, k / SUB_STEPS);
      dx.push(p[0]); dy.push(p[1]);
    }
  }
  dx.push(dx[0]); dy.push(dy[0]);

  // 2. Cumulative length, then resample at uniform spacing so the loop closes exactly.
  const m = dx.length;
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(dx[i] - dx[i - 1], dy[i] - dy[i - 1]);
  const length = cum[m - 1];
  const count = Math.floor(length / TRACK_STEP);
  const step = length / count;

  const xs = new Float64Array(count), ys = new Float64Array(count);
  let seg = 1;
  for (let i = 0; i < count; i++) {
    const target = i * step;
    while (seg < m - 1 && cum[seg] < target) seg++;
    const span = cum[seg] - cum[seg - 1];
    const f = span > 0 ? (target - cum[seg - 1]) / span : 0;
    xs[i] = dx[seg - 1] + (dx[seg] - dx[seg - 1]) * f;
    ys[i] = dy[seg - 1] + (dy[seg] - dy[seg - 1]) * f;
  }

  // 3. Headings from central differences.
  const headings = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const a = (i + 1) % count, b = (i - 1 + count) % count;
    headings[i] = Math.atan2(ys[a] - ys[b], xs[a] - xs[b]);
  }

  // 4. Raw curvature, then circular moving average.
  const raw = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    raw[i] = wrapAngle(headings[(i + 1) % count] - headings[(i - 1 + count) % count]) / (2 * step);
  }
  const curvs = new Float64Array(count);
  const half = (SMOOTH - 1) / 2;
  for (let i = 0; i < count; i++) {
    let sum = 0;
    for (let k = -half; k <= half; k++) sum += raw[((i + k) % count + count) % count];
    curvs[i] = sum / SMOOTH;
  }

  return { def, width: TRACK_WIDTH, step, length, count, xs, ys, headings, curvs };
}

export function sampleAt(track, s) {
  const { count, step, length } = track;
  let w = s % length;
  if (w < 0) w += length;
  const f = w / step;
  let i = Math.floor(f);
  const u = f - i;
  if (i >= count) i -= count;
  const j = i + 1 === count ? 0 : i + 1;
  const h0 = track.headings[i];
  return {
    x: track.xs[i] + (track.xs[j] - track.xs[i]) * u,
    y: track.ys[i] + (track.ys[j] - track.ys[i]) * u,
    heading: h0 + wrapAngle(track.headings[j] - h0) * u,
  };
}

export function curvAt(track, s) {
  const { count, step, length } = track;
  let w = s % length;
  if (w < 0) w += length;
  let i = Math.round(w / step);
  if (i >= count) i -= count;
  return track.curvs[i];
}

export function pointAt(track, s, lateral) {
  const c = sampleAt(track, s);
  return {
    x: c.x - Math.sin(c.heading) * lateral,
    y: c.y + Math.cos(c.heading) * lateral,
    heading: c.heading,
  };
}
