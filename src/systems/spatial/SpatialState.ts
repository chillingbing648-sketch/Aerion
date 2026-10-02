import { Hand } from '../gesture/Hand';
import { spatialBus } from './SpatialBus';

export type UXPhase =
  | 'BOOT'
  | 'ACQUIRING'
  | 'TRACKING'
  | 'READY'
  | 'INTERACTING'
  | 'HIGH_ENERGY'
  | 'RESTING';

export interface Shockwave {
  x: number;
  y: number;
  t0: number;
  dur?: number;
  max?: number;
  soft?: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  t: number;
  w: number;
  wk: number;
  z: number;
  vx: number;
  vy: number;
  brk: boolean;
  dead?: number;
  ab?: { x: number; y: number };
}

export interface PortalState {
  on: boolean;
  k: number;
  x: number;
  y: number;
  R: number;
  d: number;
  rate: number;
  tight: number;
  rx: number;
  ry: number;
  rz: number;
  born: number;
  sz: number;
}

export interface HolographicObjectState {
  on: boolean;
  a: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  rx: number;
  ry: number;
  rz: number;
  spin: number;
  R: number;
  hold: Hand | null;
  ox: number;
  oy: number;
  anchored: boolean;
  focus: number; // [0..1] Spatial focus emphasis
}

export interface SpatialLensState {
  a: number;
  x: number;
  y: number;
  r: number;
  str: number;
  hand: Hand | null;
  vx: number;
  vy: number;
  det: number;
  shimmer: number;
}

export interface WipeState {
  u: number;
  dir: number;
  flip: boolean;
}

export interface CoreState {
  formed: boolean;
  intensity: number;
  pulse: number;
  x: number;
  y: number;
}

export const PALETTES = [
  [160, 205, 255], // Ice Blue
  [255, 206, 160], // Amber Warmth
  [160, 255, 218], // Auroral Cyan
] as const;

export class SpatialState {
  public paletteIndex = 0;
  public accentColor = `rgb(${PALETTES[0].join(',')})`;
  public timeScale = 1.0;
  public focusZ = 0.5;
  public energy = 0.0;
  public parallax = { x: 0, y: 0 };
  public lastSeenHandTime = 0;
  public lastExpandTime = -1e5;
  public lastBurstTime = 0;

  // Global UX state & progressive wake
  public uxPhase: UXPhase = 'BOOT';
  public wakeProgress: number = 0; // [0..1]
  public microHint: string | null = null;
  public microHintTimer: number = 0;
  public hasCompletedFirstPinch = false;
  public hasCompletedFirstDraw = false;

  public portal: PortalState = {
    on: false,
    k: 0,
    x: 0,
    y: 0,
    R: 0,
    d: 0,
    rate: 0,
    tight: 0,
    rx: 0.9,
    ry: 0,
    rz: 0,
    born: 0,
    sz: 100,
  };

  public obj: HolographicObjectState = {
    on: false,
    a: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    s: 1,
    rx: 0.7,
    ry: 0.4,
    rz: 0,
    spin: 0,
    R: 100,
    hold: null,
    ox: 0,
    oy: 0,
    anchored: false,
    focus: 0,
  };

  public lens: SpatialLensState = {
    a: 0,
    x: 0,
    y: 0,
    r: 60,
    str: 0,
    hand: null,
    vx: 0,
    vy: 0,
    det: 0,
    shimmer: 0,
  };

  public wipe: WipeState = {
    u: 1,
    dir: 1,
    flip: true,
  };

  public core: CoreState = {
    formed: false,
    intensity: 0,
    pulse: 0,
    x: 0,
    y: 0,
  };

  public shocks: Shockwave[] = [];
  public trail: TrailPoint[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    spatialBus.on('swipe', ({ dir }) => {
      this.trail.forEach(p => {
        p.vx += dir * (500 + Math.random() * 600);
        p.vy += (Math.random() - 0.5) * 300;
        p.t -= 700;
      });

      this.wipe.u = 0;
      this.wipe.dir = dir;
      this.wipe.flip = false;
      this.obj.on = false;
      this.obj.hold = null;
      this.setMicroHint('PALETTE SHIFTED', 1800);
    });

    spatialBus.on('expand', e => {
      if (this.shocks.length < 3) {
        this.shocks.push({ x: e.x, y: e.y, t0: performance.now() });
      }
      this.setMicroHint('DIMENSIONAL EXPANSION', 2000);
    });

    spatialBus.on('burst', e => {
      const now = performance.now();
      if (now - this.lastBurstTime < 700) return;
      this.lastBurstTime = now;

      if (this.shocks.length < 4) {
        const screenMin = Math.min(window.innerWidth, window.innerHeight);
        this.shocks.push({
          x: e.x,
          y: e.y,
          t0: now,
          dur: 650,
          max: screenMin * 0.6,
          soft: 1,
        });
      }

      if (!this.obj.hold && this.obj.a > 0.05) {
        const dx = this.obj.x - e.x;
        const dy = this.obj.y - e.y;
        const r = Math.hypot(dx, dy) + 1;
        const k = (900 * e.p) / (1 + r / 200);
        this.obj.vx += (dx / r) * k;
        this.obj.vy += (dy / r) * k;
      }

      this.trail.forEach(p => {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const r = Math.hypot(dx, dy) + 1;
        const k = (700 * e.p) / (1 + r / 180);
        p.vx += (dx / r) * k;
        p.vy += (dy / r) * k;
      });

      this.setMicroHint('REALITY BURST', 2000);
    });

    spatialBus.on('gesture', ({ hand, to }) => {
      if (to === 'pinch') {
        this.convertTrailToObject(hand);
        if (!this.hasCompletedFirstPinch) {
          this.hasCompletedFirstPinch = true;
          this.setMicroHint('OBJECT ACQUIRED · MOVE OR THROW', 2800);
        }
      }
      if (to === 'point' && !this.hasCompletedFirstDraw) {
        this.hasCompletedFirstDraw = true;
        this.setMicroHint('DRAWING AIR TRAILS · PINCH TO CONDENSE', 2800);
      }
      if (to === 'open' && !this.obj.on && !hand.held && hand.f) {
        this.obj.on = true;
        this.obj.R = Math.min(window.innerWidth, window.innerHeight) * 0.1;
        this.obj.x = hand.f.palm.x;
        this.obj.y = hand.f.palm.y - hand.f.size * 2.6;
        this.obj.vx = 0;
        this.obj.vy = 0;
        this.obj.s = 1;
        this.core.formed = true;
      }
    });

    spatialBus.on('hold:start', () => {
      this.setMicroHint('LOCAL TIME DILATION', 2200);
    });
  }

  public setMicroHint(text: string, durationMs: number = 2200): void {
    this.microHint = text;
    this.microHintTimer = performance.now() + durationMs;
  }

  public updateMicroHints(now: number): void {
    if (this.microHint && now > this.microHintTimer) {
      this.microHint = null;
    }
  }

  public convertTrailToObject(hand: Hand): void {
    if (!hand.f) return;
    const tip = hand.f.tip;
    const near = this.trail.filter(p => !p.dead && Math.hypot(p.x - tip.x, p.y - tip.y) < 90);

    if (
      near.length < 5 ||
      (this.obj.on && Math.hypot(this.obj.x - tip.x, this.obj.y - tip.y) < this.obj.R * this.obj.s * 1.2 + 30)
    ) {
      return;
    }

    let mx = 0;
    let my = 0;
    near.forEach(p => {
      mx += p.x;
      my += p.y;
    });
    mx /= near.length;
    my /= near.length;

    const sp = Math.max(...near.map(p => Math.hypot(p.x - mx, p.y - my)));
    near.forEach(p => {
      p.ab = { x: mx, y: my };
    });

    const screenMin = Math.min(window.innerWidth, window.innerHeight);
    this.obj.on = true;
    this.obj.R = Math.min(screenMin * 0.14, Math.max(screenMin * 0.06, sp * 0.5));
    this.obj.s = 1;
    this.obj.x = mx;
    this.obj.y = my;
    this.obj.vx = 0;
    this.obj.vy = 0;
    this.obj.hold = hand;
    this.obj.ox = mx - tip.x;
    this.obj.oy = my - tip.y;
    this.obj.focus = 1;
  }
}

export const spatialState = new SpatialState();
