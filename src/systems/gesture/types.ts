export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  z?: number;
}

export interface GestureFeatures {
  palm: ScreenPoint;
  size: number;
  ext: number[];
  pd: number;
  open: number;
  pinch: number;
  roll: number;
  pitch: number;
  tip: ScreenPoint;
}

export type PoseType = 'none' | 'open' | 'pinch' | 'fist' | 'point';

export interface GestureEvent {
  hand: any;
  from: PoseType;
  to: PoseType;
}

export interface SwipeEvent {
  dir: number; // -1 for left, +1 for right
}

export interface ExpandEvent {
  x: number;
  y: number;
}

export interface BurstEvent {
  x: number;
  y: number;
  p: number; // power factor
}
