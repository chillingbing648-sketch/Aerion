import { ScreenPoint, GestureFeatures, PoseType } from './types';
import { Smoother } from './Smoother';
import { calculateFeatures, classifyGesture } from './GestureFeatures';
import { spatialBus } from '../spatial/SpatialBus';

let handIdCounter = 0;
let lastSwipeTime = -1e5;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ez = (dt: number, k: number) => 1 - Math.exp(-k * dt);

export class Hand {
  public id: number;
  public sm: Smoother;
  public pts: ScreenPoint[] | null = null;
  public f: GestureFeatures | null = null;
  public pose: PoseType = 'none';
  public cand: PoseType = 'none';
  public n: number = 0;
  public vel = { x: 0, y: 0 };
  public seen: number = 0;
  public vis: number = 0;
  public fistT: number = 0;
  public holdT: number = 0;
  public held: boolean = false;
  public halo: number = 0;
  public mass: number = 0;
  public z: number = 0.5;
  public pinchT: number = 0;
  public pdv: number = 0;
  public pdPeak: number = 0;

  // Progressive acquisition hierarchy:
  // 1. Initial point detect -> 2. Reticle Lock -> 3. Contour emergence -> 4. Full interaction
  public lockProgress: number = 0;
  public firstSeenTime: number = 0;

  constructor() {
    this.id = ++handIdCounter;
    this.sm = new Smoother();
  }

  public detect(raw: ScreenPoint[], t: number, screenW: number, screenH: number, isObjectHeld: boolean): void {
    if (!this.firstSeenTime) {
      this.firstSeenTime = t;
    }
    const dt = clamp((t - this.seen) / 1000, 0.008, 0.1);
    const isFirst = !this.f;
    this.pts = this.sm.step(raw);
    const f = calculateFeatures(this.pts);

    if (!isFirst && this.f) {
      // Unified inertia motion
      this.vel.x = lerp(this.vel.x, (f.palm.x - this.f.palm.x) / dt, 0.45);
      this.vel.y = lerp(this.vel.y, (f.palm.y - this.f.palm.y) / dt, 0.45);
      this.pdv = lerp(this.pdv, (f.pd - this.f.pd) / dt, 0.5);
      this.pdPeak = Math.max(this.pdPeak * 0.8, this.pdv);
    }

    this.f = f;
    this.seen = t;

    // Depth approximation based on palm-to-MCP span relative to viewport
    const refDim = Math.min(screenW, screenH);
    this.z = lerp(this.z, clamp((f.size / refDim - 0.07) / 0.2, 0, 1), 0.2);

    // Debounce: pose must persist consecutive frames before switching
    const nextPose = classifyGesture(f, this.pose);
    if (nextPose === this.pose) {
      this.n = 0;
      this.cand = nextPose;
    } else if (nextPose === this.cand) {
      const requiredFrames = nextPose === 'pinch' ? 2 : 3;
      if (++this.n >= requiredFrames) {
        this.setPose(nextPose);
      }
    } else {
      this.cand = nextPose;
      this.n = 1;
    }

    // Swipe: fast lateral palm travel in hand-size units/second
    const sp = this.speed();
    if (
      (this.pose === 'open' || this.pose === 'none') &&
      Math.abs(this.vel.x) / f.size > 9 &&
      Math.abs(this.vel.x) > 2.2 * Math.abs(this.vel.y) &&
      t - lastSwipeTime > 1000 &&
      !isObjectHeld
    ) {
      lastSwipeTime = t;
      spatialBus.emit('swipe', { dir: Math.sign(this.vel.x) });
    }
  }

  public speed(): number {
    return Math.hypot(this.vel.x, this.vel.y) / (this.f?.size || 1);
  }

  public setPose(to: PoseType): void {
    const from = this.pose;
    this.pose = to;
    this.n = 0;
    spatialBus.emit('gesture', { hand: this, from, to });
  }

  public tick(dt: number, t: number): void {
    // Visibility fade out if not seen recently
    this.vis = lerp(this.vis, t - this.seen < 140 ? 1 : 0, ez(dt, 14));
    if (t - this.seen > 140 && this.pose !== 'none') {
      this.setPose('none');
    }

    // Progressive lock transition (smoother spring ramp over ~250ms)
    this.lockProgress = lerp(this.lockProgress, this.vis > 0.4 ? 1 : 0, ez(dt, 8));

    // Fist intensity continuous ramping
    this.fistT = this.pose === 'fist' ? Math.min(1, this.fistT + dt * 1.1) : Math.max(0, this.fistT - dt * 2.5);

    // Palm hold: stationary open palm triggers local time dilation
    const isSlow = this.pose === 'open' && this.speed() < (this.held ? 3.2 : 1.4);
    this.holdT = isSlow ? this.holdT + dt : 0;
    const shouldHold = this.holdT > 0.6;
    if (shouldHold !== this.held) {
      this.held = shouldHold;
      spatialBus.emit(shouldHold ? 'hold:start' : 'hold:end', this);
    }

    this.halo = lerp(this.halo, this.pose === 'open' ? 1 : 0, ez(dt, 6));
    this.pinchT = this.pose === 'pinch' ? this.pinchT + dt : 0;
    this.mass *= Math.exp(-0.8 * dt);
  }
}
