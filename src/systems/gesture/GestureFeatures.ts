import { ScreenPoint, GestureFeatures, PoseType } from './types';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const dist = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export function calculateFeatures(p: ScreenPoint[]): GestureFeatures {
  const palm: ScreenPoint = {
    x: (p[0].x + p[5].x + p[9].x + p[17].x) / 4,
    y: (p[0].y + p[5].y + p[9].y + p[17].y) / 4,
  };

  const size = dist(p[0], p[9]) || 1;

  // Extension ratio of each finger tip to wrist relative to its PIP joint
  const ext = [[8, 6], [12, 10], [16, 14], [20, 18]].map(([t, j]) =>
    dist(p[t], p[0]) / (dist(p[j], p[0]) || 1)
  );

  // Normalized pinch distance between thumb tip (4) and index tip (8)
  const pd = dist(p[4], p[8]) / size;

  // Open hand score
  const avgExt = ext.reduce((a, b) => a + b, 0) / 4;
  const open = clamp((avgExt - 0.85) / 0.45, 0, 1);

  // Pinch score
  const pinch = clamp((0.7 - pd) / 0.5, 0, 1);

  // Wrist roll angle
  const roll = Math.atan2(p[17].y - p[5].y, p[17].x - p[5].x);

  // Pitch angle
  const z9 = p[9].z ?? 0;
  const z0 = p[0].z ?? 0;
  const pitch = clamp((z9 - z0) * 5, -1, 1);

  // Finger midpoint for pinch interaction
  const tip: ScreenPoint = {
    x: (p[4].x + p[8].x) / 2,
    y: (p[4].y + p[8].y) / 2,
  };

  return {
    palm,
    size,
    ext,
    pd,
    open,
    pinch,
    roll,
    pitch,
    tip,
  };
}

export function classifyGesture(f: GestureFeatures, prevPose: PoseType): PoseType {
  const e = f.ext.map(v => v > 1.12);

  // Pinch threshold with hysteresis
  const pinchThreshold = prevPose === 'pinch' ? 0.42 : 0.24;
  if (f.pd < pinchThreshold) {
    return 'pinch';
  }

  // Fist: fingers curled in
  if (f.open < 0.28) {
    return 'fist';
  }

  // Point: index extended, other fingers folded
  if (e[0] && !e[1] && !e[2] && !e[3]) {
    return 'point';
  }

  // Open palm
  if (f.open > 0.62) {
    return 'open';
  }

  return 'none';
}
