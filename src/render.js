// Canvas renderer: reads state and path, draws the frame. No game rules here.
import { pointAt } from './geometry.js';

export const TRACK_INSET = 20;

const BACKGROUND = '#14161c';
const ACCENT = '#ffb547';
const LANE_SPACING = 9;

function tracePath(ctx, samples) {
  ctx.beginPath();
  ctx.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) ctx.lineTo(samples[i].x, samples[i].y);
  ctx.closePath();
}

function strokeTrack(ctx, samples) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  tracePath(ctx, samples);
  ctx.setLineDash([]);
  ctx.strokeStyle = '#3a3f4d';
  ctx.lineWidth = 36;
  ctx.stroke();
  ctx.strokeStyle = '#2a2e38';
  ctx.lineWidth = 30;
  ctx.stroke();
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#4a5060';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBand(ctx, path, distance, color, thickness) {
  const p = pointAt(path, distance);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-thickness / 2, -15, thickness, 30, 2);
  ctx.fill();
  ctx.restore();
}

function drawCar(ctx, path, car, index) {
  const p = pointAt(path, car.distance);
  const offset = car.lane * LANE_SPACING;
  const x = p.x - Math.sin(p.angle) * offset;
  const y = p.y + Math.cos(p.angle) * offset;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle);
  ctx.fillStyle = `hsl(${(index * 137.5) % 360}, 70%, 62%)`;
  ctx.beginPath();
  ctx.roundRect(-7, -4, 14, 8, 3);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let width = 0;
  let height = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    return { width, height };
  }

  function draw(state, path) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(TRACK_INSET, TRACK_INSET);
    strokeTrack(ctx, path.samples);
    drawBand(ctx, path, 0, '#ffffff', 4);
    for (const position of path.checkpoints) {
      drawBand(ctx, path, position, ACCENT, 6);
    }
    state.cars.forEach((car, index) => drawCar(ctx, path, car, index));
    ctx.restore();
  }

  return { resize, draw };
}
