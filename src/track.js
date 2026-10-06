import { MAX_SEGMENTS } from './config.js';

export function segmentIndexAt(segments, distance) {
  return Math.floor(distance) % segments.length;
}

export function checkpointPositions(segments) {
  const positions = [];
  segments.forEach((segment, index) => {
    if (segment.type === 'checkpoint') {
      positions.push(index + 0.5);
    }
  });
  return positions;
}

export function canAddSegment(segments, type) {
  if (segments.length >= MAX_SEGMENTS) {
    return { ok: false, reason: 'max_segments' };
  }

  if (type === 'checkpoint') {
    const checkpointCount = segments.filter(seg => seg.type === 'checkpoint').length;
    const nonCheckpointCount = segments.length - checkpointCount;
    if (checkpointCount + 1 > nonCheckpointCount) {
      return { ok: false, reason: 'need_track' };
    }
  }

  return { ok: true };
}
