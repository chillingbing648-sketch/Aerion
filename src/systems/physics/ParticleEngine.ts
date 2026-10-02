import { Hand } from '../gesture/Hand';
import { spatialState } from '../spatial/SpatialState';
import { spatialBus } from '../spatial/SpatialBus';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class ParticleEngine {
  public maxParticles: number;
  public activeCount: number;

  public x: Float32Array;
  public y: Float32Array;
  public z: Float32Array;
  public vx: Float32Array;
  public vy: Float32Array;
  public vz: Float32Array;
  public l: Float32Array;
  public ml: Float32Array;
  public sz: Float32Array;
  public al: Float32Array;
  public kd: Float32Array;

  constructor(isMobile: boolean, prefersReducedMotion: boolean) {
    this.maxParticles = prefersReducedMotion ? 280 : isMobile ? 420 : 800;
    this.activeCount = this.maxParticles;

    const N = this.maxParticles;
    this.x = new Float32Array(N);
    this.y = new Float32Array(N);
    this.z = new Float32Array(N);
    this.vx = new Float32Array(N);
    this.vy = new Float32Array(N);
    this.vz = new Float32Array(N);
    this.l = new Float32Array(N);
    this.ml = new Float32Array(N);
    this.sz = new Float32Array(N);
    this.al = new Float32Array(N);
    this.kd = new Float32Array(N);

    this.initParticles();
    this.setupListeners();
  }

  private initParticles(): void {
    const W = window.innerWidth || 1200;
    const H = window.innerHeight || 800;
    for (let i = 0; i < this.maxParticles; i++) {
      this.spawn(i, true, W, H, []);
    }
  }

  private setupListeners(): void {
    spatialBus.on('swipe', ({ dir }) => {
      const count = Math.min(this.activeCount, this.getEffectiveParticleCount());
      for (let i = 0; i < count; i++) {
        this.vx[i] += dir * (300 + Math.random() * 500) * (0.4 + this.z[i]);
      }
    });

    spatialBus.on('expand', e => {
      const count = Math.min(this.activeCount, this.getEffectiveParticleCount());
      for (let i = 0; i < count; i++) {
        const dx = this.x[i] - e.x;
        const dy = this.y[i] - e.y;
        const r = Math.hypot(dx, dy) + 1;
        const k = 900 / (1 + r / 260);
        this.vx[i] += (dx / r) * k;
        this.vy[i] += (dy / r) * k;
      }
    });

    spatialBus.on('burst', e => {
      const count = Math.min(this.activeCount, this.getEffectiveParticleCount());
      for (let i = 0; i < count; i++) {
        const dx = this.x[i] - e.x;
        const dy = this.y[i] - e.y;
        const r = Math.hypot(dx, dy) + 1;
        const k = (480 * e.p) / (1 + r / 180);
        this.vx[i] += (dx / r) * k;
        this.vy[i] += (dy / r) * k;
      }
    });
  }

  public getEffectiveParticleCount(): number {
    const wp = spatialState.wakeProgress;
    if (wp >= 1) return this.activeCount;
    // Progressive startup: starts with 35 particles, softly ramping to activeCount
    const minParticles = 35;
    return Math.floor(minParticles + (this.activeCount - minParticles) * Math.pow(wp, 1.8));
  }

  public spawn(i: number, init: boolean, W: number, H: number, hands: Hand[]): void {
    const R = Math.random;
    const r = R();
    const live = hands.filter(h => h.vis > 0.5 && h.f);
    const op = live.find(h => h.pose === 'open');
    const pt = live.find(h => h.pose === 'point');

    let x: number, y: number, z: number;
    let a = 0.35;
    let ml = 4 + R() * 5;

    const portal = spatialState.portal;
    if (portal.k > 0.3 && r < 0.6) {
      const an = R() * 6.283;
      const rr = portal.R * (0.6 + R() * 0.9);
      x = portal.x + Math.cos(an) * rr;
      y = portal.y + Math.sin(an) * rr;
      z = 0.5 + (R() - 0.5) * 0.5;
      a = 0.9;
      ml = 1.8 + R() * 2;
    } else if (op && op.f && r < 0.55) {
      const an = R() * 6.283;
      const rr = op.f.size * (0.9 + R() * 1.6);
      x = op.f.palm.x + Math.cos(an) * rr;
      y = op.f.palm.y + Math.sin(an) * rr;
      z = clamp(op.z + (R() - 0.5) * 0.5, 0, 1);
      a = 0.95;
      ml = 1.5 + R() * 2;
    } else if (pt && pt.pts && r < 0.7) {
      const t = pt.pts[8];
      x = t.x + (R() - 0.5) * 40;
      y = t.y + (R() - 0.5) * 40;
      z = clamp(pt.z + (R() - 0.5) * 0.3, 0, 1);
      a = 0.9;
      ml = 1 + R();
    } else {
      x = R() * W;
      y = R() * H;
      z = R();
    }

    this.x[i] = x;
    this.y[i] = y;
    this.z[i] = z;
    this.vx[i] = 0;
    this.vy[i] = 0;
    this.vz[i] = 0;
    this.ml[i] = ml;
    this.l[i] = init ? ml * R() : ml;
    this.sz[i] = R();
    this.al[i] = a;
    this.kd[i] = R() < 0.6 ? 1 : 0;
  }

  public update(dt: number, t: number, W: number, H: number, hands: Hand[]): void {
    const d = dt * spatialState.timeScale;
    const damp = Math.exp(-1.5 * d);
    const vh = hands.filter(h => h.vis > 0.3 && h.f);
    const portal = spatialState.portal;
    const lens = spatialState.lens;
    const effectiveCount = this.getEffectiveParticleCount();

    // Idle dynamics: tranquil micro-floating at rest, responsive during interaction
    const isResting = vh.length === 0 && portal.k < 0.05 && lens.a < 0.05;
    const driftIntensity = isResting ? 1.8 : 4.2;

    for (let i = 0; i < effectiveCount; i++) {
      this.l[i] -= d;
      if (this.l[i] <= 0) {
        this.spawn(i, false, W, H, hands);
        continue;
      }

      let x = this.x[i];
      let y = this.y[i];
      let vx = this.vx[i];
      let vy = this.vy[i];
      let z = this.z[i];
      const s = this.sz[i];

      // Subtle atmospheric breathing motion
      vx += Math.sin(t * 0.2 + s * 30) * driftIntensity * d;
      vy += Math.cos(t * 0.18 + s * 25) * driftIntensity * d;

      // Hand physical fields
      for (const h of vh) {
        if (!h.f) continue;
        const dx = h.f.palm.x - x;
        const dy = h.f.palm.y - y;
        const r = Math.hypot(dx, dy) + 1;
        const w = Math.max(0, 1 - r / 300);

        // Hand velocity wind
        vx += h.vel.x * 0.42 * w * w * d;
        vy += h.vel.y * 0.42 * w * w * d;

        // Fist: gravity well collapse
        if (h.fistT > 0.04) {
          const a = (2400 * h.fistT) / (1 + r / 165);
          vx += ((dx / r) * a - (dy / r) * a * 0.55) * d;
          vy += ((dy / r) * a + (dx / r) * a * 0.55) * d;
          z += (h.z - z) * d * 2 * h.fistT;

          // Mass absorption
          if (r < 18 + 26 * h.fistT) {
            h.mass = Math.min(1, h.mass + 0.012);
            this.l[i] = 0;
          }
        } else if (h.pose === 'open' && r < h.f.size * 4.2) {
          // Open palm: orbital celestial halo
          const R0 = h.f.size * (1.45 + s * 0.8);
          const a = (R0 - r) * 3.3;
          const motion = clamp(h.speed() / 8, 0, 1);
          const push = motion * 180 * w;
          vx += ((-dx / r) * (a + push) - (dy / r) * 82 * h.halo) * d;
          vy += ((-dy / r) * (a + push) + (dx / r) * 82 * h.halo) * d;
        } else if (h.pose === 'point' && r < 200 && h.pts) {
          // Point: cursor magnetic attraction
          const tp = h.pts[8];
          const tx = tp.x - x;
          const ty = tp.y - y;
          const tr = Math.hypot(tx, ty) + 1;
          vx += (tx / tr) * 160 * d;
          vy += (ty / tr) * 160 * d;
        }
      }

      // Two-Hand Portal vortex
      if (portal.k > 0.05) {
        const dx = portal.x - x;
        const dy = portal.y - y;
        const r = Math.hypot(dx, dy) + 1;
        const tg = portal.R * (0.6 + s * 0.9);
        if (r < portal.R * 3) {
          const a = (r - tg) * 5;
          const o = 260 * (0.5 + portal.tight) * portal.k;
          vx += ((dx / r) * a - ((dy / r) * o) / Math.max(0.5, r / portal.R)) * d;
          vy += ((dy / r) * a + ((dx / r) * o) / Math.max(0.5, r / portal.R)) * d;
          z += (0.5 - z) * d;
        } else {
          vx += (dx / r) * 140 * d;
          vy += (dy / r) * 140 * d;
        }
      }

      // Spatial Lens refraction rim bending
      if (lens.a > 0.05) {
        const dx = x - lens.x;
        const dy = y - lens.y;
        const r = Math.hypot(dx, dy) + 1;
        if (r < lens.r * 2.4) {
          const ux = dx / r;
          const uy = dy / r;
          const o = (lens.r * 1.08 - r) * 4 * lens.a;
          const tg = 140 * lens.a * (0.4 + lens.str);
          vx += (ux * o - uy * tg) * d;
          vy += (uy * o + ux * tg) * d;
        }
      }

      vx *= damp;
      vy *= damp;
      x += vx * d;
      y += vy * d;

      // Recycle boundary
      if (x < -200 || x > W + 200 || y < -200 || y > H + 200) {
        this.l[i] = 0;
      }

      this.x[i] = x;
      this.y[i] = y;
      this.vx[i] = vx;
      this.vy[i] = vy;
      this.z[i] = clamp(z, 0, 1);
    }
  }

  public setQualityParticleCount(count: number): void {
    const target = clamp(count, 160, this.maxParticles);
    if (target > this.activeCount) {
      for (let i = this.activeCount; i < target; i++) {
        this.l[i] = 0;
      }
    }
    this.activeCount = target;
  }
}
