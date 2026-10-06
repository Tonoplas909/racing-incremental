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
  // Check max_segments first (as per brief)
  if (segments.length >= MAX_SEGMENTS) {
    return { ok: false, reason: 'max_segments' };
  }

  // Check need_track: if adding a checkpoint, last segment must not be checkpoint
  if (type === 'checkpoint' && segments.length > 0 && segments[segments.length - 1].type === 'checkpoint') {
    return { ok: false, reason: 'need_track' };
  }

  return { ok: true };
}
