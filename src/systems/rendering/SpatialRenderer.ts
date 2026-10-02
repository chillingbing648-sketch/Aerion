import { Hand } from '../gesture/Hand';
import { spatialState } from '../spatial/SpatialState';
import { ParticleEngine } from '../physics/ParticleEngine';
import { SpriteFactory } from './SpriteFactory';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const HAND_CHAINS = [
  [0, 1, 2, 3, 4],     // Thumb
  [0, 5, 6, 7, 8],     // Index
  [0, 9, 10, 11, 12],  // Middle
  [0, 13, 14, 15, 16], // Ring
  [0, 17, 18, 19, 20], // Pinky
];

export class SpatialRenderer {
  private mainCtx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private videoEl: HTMLVideoElement | null = null;
  private isMobile: boolean;
  private prefersReducedMotion: boolean;

  private projResult = { x: 0, y: 0, z: 0 };

  constructor(
    mainCanvas: HTMLCanvasElement,
    isMobile: boolean,
    prefersReducedMotion: boolean
  ) {
    this.mainCtx = mainCanvas.getContext('2d')!;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.isMobile = isMobile;
    this.prefersReducedMotion = prefersReducedMotion;
  }

  public setVideo(video: HTMLVideoElement | null): void {
    this.videoEl = video;
  }

  public resize(width: number, height: number, _dpr: number): void {
    this.offscreenCanvas.width = Math.ceil(width / 2);
    this.offscreenCanvas.height = Math.ceil(height / 2);
    this.offscreenCtx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  }

  private proj(
    X: number,
    Y: number,
    Z: number,
    x0: number,
    y0: number,
    rx: number,
    ry: number,
    rz: number,
    f: number
  ): void {
    let c = Math.cos(rx);
    let s = Math.sin(rx);
    const y1 = Y * c - Z * s;
    const z1 = Y * s + Z * c;

    c = Math.cos(ry);
    s = Math.sin(ry);
    const x2 = X * c + z1 * s;
    const z2 = -X * s + z1 * c;
    const p = f / (f - z2);

    c = Math.cos(rz);
    s = Math.sin(rz);
    this.projResult.x = x0 + (x2 * c - y1 * s) * p;
    this.projResult.y = y0 + (x2 * s + y1 * c) * p;
    this.projResult.z = z2;
  }

  private ring(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    R: number,
    rx: number,
    ry: number,
    rz: number,
    amp: number,
    t: number,
    seg: number,
    al: number,
    lw: number,
    k?: number
  ): void {
    ctx.strokeStyle = spatialState.accentColor;
    ctx.lineWidth = lw;
    const f = R * 3.2 + 300;
    let px = 0;
    let py = 0;

    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * 6.2832;
      const r = R * (1 + amp * Math.sin(a * (k || 3) + t * 2.4));
      this.proj(Math.cos(a) * r, Math.sin(a) * r, 0, x, y, rx, ry, rz, f);

      if (i > 0) {
        ctx.globalAlpha = al * (0.35 + 0.65 * clamp((this.projResult.z / R) * 0.5 + 0.5, 0, 1));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(this.projResult.x, this.projResult.y);
        ctx.stroke();
      }
      px = this.projResult.x;
      py = this.projResult.y;
    }
    ctx.globalAlpha = 1;
  }

  private glow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    a: number,
    kind: number,
    level: number
  ): void {
    const sprites = SpriteFactory.getSprites(spatialState.paletteIndex);
    ctx.globalAlpha = a;
    ctx.drawImage(sprites[kind || 0][level || 1], x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    particles: ParticleEngine,
    z0: number,
    z1: number
  ): void {
    const sprites = SpriteFactory.getSprites(spatialState.paletteIndex);
    const count = particles.getEffectiveParticleCount();
    const par = spatialState.parallax;
    const focusZ = spatialState.focusZ;
    const energy = spatialState.energy;

    for (let i = 0; i < count; i++) {
      const z = particles.z[i];
      if (z < z0 || z >= z1) continue;

      const u = particles.l[i] / particles.ml[i];
      const fade = Math.min(1, u * 4, (1 - u) * 6);
      if (fade <= 0) continue;

      const dz = Math.abs(z - focusZ);
      const lv = dz < 0.18 ? 0 : dz < 0.4 ? 1 : 2;
      const sc = 0.35 + z * 1.15;

      let a =
        particles.al[i] *
        fade *
        (lv === 0 ? 0.9 : lv === 1 ? 0.65 : 0.4) *
        (0.45 + 0.65 * z) *
        (particles.kd[i] ? 0.9 : 0.35 + 0.5 * energy);

      const x = particles.x[i] - par.x * (z - 0.5) * 2;
      const y = particles.y[i] - par.y * (z - 0.5) * 2;

      const emphasis = lv === 0 ? 1.48 : particles.kd[i] ? 1.44 : 1.4;
      const s = (5 + 6 * particles.sz[i]) * sc * (1 + lv * 0.35) * emphasis;

      const spd2 = particles.vx[i] * particles.vx[i] + particles.vy[i] * particles.vy[i];
      if (spd2 > 30000) {
        ctx.strokeStyle = spatialState.accentColor;
        ctx.lineWidth = Math.max(0.8, s * 0.08);
        ctx.globalAlpha = Math.min(0.35, a * 0.4);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - particles.vx[i] * 0.03, y - particles.vy[i] * 0.03);
        ctx.stroke();
      }

      ctx.globalAlpha = Math.min(0.9, a);
      ctx.drawImage(sprites[particles.kd[i]][lv], x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  private maskHands(hands: Hand[]): void {
    const lcx = this.offscreenCtx;
    lcx.globalCompositeOperation = 'destination-out';
    lcx.fillStyle = lcx.strokeStyle = '#000';
    lcx.lineCap = lcx.lineJoin = 'round';

    for (const h of hands) {
      if (h.vis < 0.3 || !h.pts || !h.f) continue;
      const p = h.pts;
      const w = h.f.size;
      lcx.globalAlpha = Math.min(1, h.vis * 1.4);

      // Palm polygon
      lcx.beginPath();
      [0, 1, 5, 9, 13, 17].forEach((idx, k) => {
        if (k === 0) lcx.moveTo(p[idx].x, p[idx].y);
        else lcx.lineTo(p[idx].x, p[idx].y);
      });
      lcx.closePath();
      lcx.fill();

      // Finger segments
      for (const chain of HAND_CHAINS) {
        lcx.lineWidth = w * (chain[1] === 1 ? 0.32 : 0.24);
        lcx.beginPath();
        chain.forEach((idx, k) => {
          if (k === 0) lcx.moveTo(p[idx].x, p[idx].y);
          else lcx.lineTo(p[idx].x, p[idx].y);
        });
        lcx.stroke();
      }
    }

    lcx.globalAlpha = 1;
    lcx.globalCompositeOperation = 'source-over';
  }

  private refract(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    x: number,
    y: number,
    r: number,
    m: number,
    innerRadius: number
  ): void {
    if (!this.videoEl || !this.videoEl.videoWidth) return;
    const vw = this.videoEl.videoWidth;
    const vh = this.videoEl.videoHeight;
    const s = Math.max(W / vw, H / vh);
    const px = (1 - ((x - W / 2) / (vw * s) + 0.5)) * vw;
    const py = ((y - H / 2) / (vh * s) + 0.5) * vh;
    const h = r / (s * m);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (innerRadius > 0) {
      ctx.moveTo(x + innerRadius, y);
      ctx.arc(x, y, innerRadius, 0, Math.PI * 2, true);
    }
    ctx.clip();

    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoEl, px - h, py - h, h * 2, h * 2, -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // Refined optical glass lens: piece of glass floating in air
  private drawLens(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const lens = spatialState.lens;
    if (lens.a < 0.03) return;

    const { x, y, a, str, shimmer } = lens;
    const r = lens.r * (0.88 + 0.12 * a);
    const m = 1 + str * 0.42;

    // Soft glass ambient shadow
    const gShadow = ctx.createRadialGradient(x, y + r * 0.1, r * 0.8, x, y + r * 0.1, r * 1.35);
    gShadow.addColorStop(0, `rgba(0,0,0,${0.2 * a})`);
    gShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gShadow;
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // Pure optical magnification through camera
    ctx.globalAlpha = a;
    this.refract(ctx, W, H, x, y, r, m * 1.15, 0);
    if (!this.isMobile) {
      this.refract(ctx, W, H, x, y, r * 0.65, m * 1.08, 0);
    }
    ctx.globalAlpha = 1;

    // Ultra-soft glass surface sheen
    const gGlass = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    gGlass.addColorStop(0, `rgba(255,255,255,${0.08 * a})`);
    gGlass.addColorStop(0.7, `rgba(255,255,255,${0.02 * a})`);
    gGlass.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = gGlass;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Delicate refractive bevel rim
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle optical chromatic separation (barely perceptible dispersion)
    ctx.strokeStyle = 'rgba(160, 205, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, r - 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // Delicate specular reflection highlight
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = (0.35 + 0.15 * Math.sin(shimmer)) * a;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.88, 3.4, 4.3);
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  // Air trails: fine filament for precision, soft wake for speed
  private drawTrail(ctx: CanvasRenderingContext2D, t: number): void {
    const trail = spatialState.trail;
    if (trail.length < 2) return;

    const par = spatialState.parallax;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = ctx.lineJoin = 'round';

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 1; i < trail.length; i++) {
        const b = trail[i];
        const a = trail[i - 1];
        if (b.brk || a.dead || b.dead) continue;

        const f = clamp(1 - (t - b.t) / 2400, 0, 1);
        const dp = 0.6 + 0.8 * b.z;
        const wb = clamp((t - b.t) / 400, 0, 1);
        const wa = clamp((t - a.t) / 400, 0, 1);

        // Pass 0: delicate ambient glow; Pass 1: crisp hairline core
        ctx.strokeStyle = pass === 1 ? '#fff' : spatialState.accentColor;
        ctx.lineWidth = pass === 0 ? (b.w * 1.2 + 0.8) * dp * f : 0.8 * dp * f + 0.2;
        ctx.globalAlpha = (pass === 0 ? 0.12 : 0.85) * f * f * (0.6 + 0.5 * b.z);

        ctx.beginPath();
        ctx.moveTo(a.x - par.x * (a.z - 0.5) * 2 * wa, a.y - par.y * (a.z - 0.5) * 2 * wa);
        ctx.lineTo(b.x - par.x * (b.z - 0.5) * 2 * wb, b.y - par.y * (b.z - 0.5) * 2 * wb);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawPortal(ctx: CanvasRenderingContext2D, hands: Hand[], t: number): void {
    const portal = spatialState.portal;
    if (portal.k < 0.02) return;

    const { x, y, R, k, tight } = portal;
    const sp = Math.min(
      1,
      Math.hypot(hands[0]?.vel.x || 0, hands[0]?.vel.y || 0) / (portal.sz * 8 || 1)
    );
    const amp = 0.03 + 0.09 * sp + 0.08 * clamp(portal.rate / ((portal.sz || 1) * 10), 0, 1);

    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, x, y, R * (0.85 + tight * 0.3), (0.22 + 0.3 * tight) * k, 0, 2);
    this.glow(ctx, x, y, R * 0.28, 0.75 * k, 1, 1);

    this.ring(ctx, x, y, R, portal.rx, portal.ry, portal.rz, amp, t, 72, 0.75 * k, 1.1, 3);
    this.ring(ctx, x, y, R * 0.72, portal.rx + 1.1, portal.ry + 0.5, portal.rz, amp * 1.2, t, 64, 0.45 * k, 0.8, 4);

    // Minimal orbital nodes
    ctx.fillStyle = '#fff';
    for (let j = 0; j < 4; j++) {
      this.proj(
        Math.cos(t * (0.8 + tight) + j * 1.57) * R,
        Math.sin(t * (0.8 + tight) + j * 1.57) * R,
        0,
        x,
        y,
        portal.rx,
        portal.ry,
        portal.rz,
        R * 3.2 + 300
      );
      ctx.globalAlpha = 0.75 * k;
      ctx.beginPath();
      ctx.arc(this.projResult.x, this.projResult.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  public drawHolographicObject(ctx: CanvasRenderingContext2D, t: number): void {
    const obj = spatialState.obj;
    if (obj.a < 0.02) return;

    const R = obj.R * obj.s;
    const a = obj.a;
    const held = !!obj.hold;
    const x = obj.x;
    const y = obj.y;
    const focus = obj.focus || (held ? 1 : 0.3);

    // Soft depth shadow
    const shadowAlpha = (held ? 0.24 : 0.1) * a;
    const sh = ctx.createRadialGradient(x + R * 0.15, y + R * 0.25, R * 0.15, x + R * 0.15, y + R * 0.25, R * 1.1);
    sh.addColorStop(0, `rgba(0,0,0,${shadowAlpha})`);
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(x + R * 0.15, y + R * 0.25, R * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Frosted glass body
    const bodyAlpha = (held ? 0.12 : 0.06) * a;
    const g = ctx.createRadialGradient(x - R * 0.25, y - R * 0.3, R * 0.08, x, y, R);
    g.addColorStop(0, `rgba(255,255,255,${bodyAlpha})`);
    g.addColorStop(1, `rgba(255,255,255,${0.01 * a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R * 0.92, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = (0.15 + 0.2 * focus) * a;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, R * 0.92, -2.5, -1.2);
    ctx.stroke();

    // 3D projected gimbal rings (hairline)
    ctx.globalCompositeOperation = 'lighter';
    this.glow(ctx, x, y, R * 0.8, (held ? 0.38 : 0.18) * a, 0, 2);
    this.glow(ctx, x, y, R * 0.18, (0.7 + 0.2 * focus) * a, 1, 1);

    const ringAl = (held ? 0.85 : 0.45) * a;
    this.ring(ctx, x, y, R, obj.rx, obj.ry, obj.rz, 0, t, 64, ringAl, 1.0);
    this.ring(ctx, x, y, R * 0.78, obj.rx + 1.1, obj.ry + 0.4, obj.rz, 0, t, 56, ringAl * 0.75, 0.8);
    this.ring(ctx, x, y, R * 0.55, obj.rx - 0.8, obj.ry + 1.2, obj.rz, 0, t, 48, ringAl * 0.5, 0.7);

    // Orbiting nodes
    ctx.fillStyle = '#fff';
    for (let j = 0; j < 4; j++) {
      const an = t * 0.9 + j * 1.57;
      this.proj(Math.cos(an) * R, Math.sin(an) * R, 0, x, y, obj.rx, obj.ry, obj.rz, R * 3.2 + 300);
      ctx.globalAlpha = (0.6 + 0.3 * focus) * a;
      ctx.beginPath();
      ctx.arc(this.projResult.x, this.projResult.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Minimal magnetic snap brackets when actively held
    if (held) {
      ctx.strokeStyle = spatialState.accentColor;
      ctx.globalAlpha = 0.5 * a;
      ctx.lineWidth = 0.8;
      const rReticle = R * 1.15;
      for (let q = 0; q < 4; q++) {
        ctx.beginPath();
        ctx.arc(x, y, rReticle, q * 1.5708 + 0.25, q * 1.5708 + 0.65);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Refined, quiet hand visualization:
  // Instead of a full mechanical skeleton, draw delicate fingertip anchor dots
  // and subtle contour only during active interaction.
  private drawHandGraphics(ctx: CanvasRenderingContext2D, h: Hand, t: number): void {
    const v = h.vis;
    if (v < 0.03 || !h.pts || !h.f) return;
    const p = h.pts;
    const f = h.f;
    const lock = h.lockProgress;

    // Fingertip luminous beads (tips 4, 8, 12, 16, 20)
    for (const tipIdx of [4, 8, 12, 16, 20]) {
      const pt = p[tipIdx];
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.65 * v * lock;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, tipIdx === 8 ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Palm quiet center point
    ctx.fillStyle = spatialState.accentColor;
    ctx.globalAlpha = 0.45 * v * lock;
    ctx.beginPath();
    ctx.arc(f.palm.x, f.palm.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // During active interaction (fist / open palm), show minimal contour
    if (h.halo > 0.02) {
      const a = h.halo * v;
      const r1 = f.size * 1.5;
      const r2 = f.size * 2.0;
      ctx.strokeStyle = spatialState.accentColor;
      ctx.lineWidth = 0.8;

      ctx.globalAlpha = 0.35 * a;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, r1, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.15 * a;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, r2, 0, Math.PI * 2);
      ctx.stroke();

      // Openness arc
      ctx.globalAlpha = 0.7 * a;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, r1, -Math.PI / 2, -Math.PI / 2 + f.open * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Palm Hold: Local Time Dilation quiet ripple
    if (h.held) {
      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.4 * v;
      ctx.lineWidth = 0.8;
      const u = (t % 1.6) / 1.6;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, f.size * (2.6 - u), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Point: Minimal spatial cursor reticle at index tip
    if (h.pose === 'point') {
      const tp = p[8];
      const r = 8 + Math.min(10, h.speed() * 2);
      ctx.strokeStyle = spatialState.accentColor;
      ctx.globalAlpha = 0.7 * v;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.glow(ctx, tp.x, tp.y, 14, 0.8 * v, 1, 0);
    }

    // Fist: Gravitational collapse with dark core, photon ring & tilted accretion rings
    if (h.fistT > 0.04) {
      const k = h.fistT * v;
      const r0 = f.size * (0.28 + 0.35 * h.fistT) + h.mass * f.size * 0.4;

      const gCore = ctx.createRadialGradient(f.palm.x, f.palm.y, 0, f.palm.x, f.palm.y, r0 * 1.4);
      gCore.addColorStop(0, `rgba(0,0,0,${0.75 * k})`);
      gCore.addColorStop(0.7, `rgba(0,0,0,${0.4 * k})`);
      gCore.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gCore;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, r0 * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      this.ring(ctx, f.palm.x, f.palm.y, r0 * 1.8, 1.25, 0.15 * Math.sin(t), t * 0.8, 0.03, t, 64, 0.5 * k, 1.0, 4);
      this.ring(ctx, f.palm.x, f.palm.y, r0 * 2.5, 1.3, -0.2, -t * 0.5, 0.05, t, 64, 0.25 * k, 0.8, 3);

      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.75 * k;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(f.palm.x, f.palm.y, r0 * 1.04, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const shocks = spatialState.shocks;
    const now = performance.now();

    for (let i = shocks.length - 1; i >= 0; i--) {
      const s = shocks[i];
      const uu = (now - s.t0) / (s.dur || 1100);
      if (uu >= 1) {
        shocks.splice(i, 1);
        continue;
      }

      const e = 1 - Math.pow(1 - uu, 3);
      const r = e * (s.max || Math.max(W, H) * 1.1);
      const a = 1 - uu;

      if (s.soft) {
        ctx.globalAlpha = Math.min(0.85, a * 1.2);
        this.refract(ctx, W, H, s.x, s.y, r + 10 * a, 1 + 0.12 * a, Math.max(0, r - 10 * a));
      }

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.0;
      [
        ['rgba(160, 205, 255, 0.4)', -2],
        ['rgba(255, 255, 255, 0.5)', 0],
        ['rgba(255, 206, 160, 0.3)', 2],
      ].forEach(([c, o]) => {
        ctx.strokeStyle = c as string;
        ctx.globalAlpha = 0.45 * a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(1, r + (o as number)), 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Swipe chromatic sweep wave
    const wipe = spatialState.wipe;
    if (wipe.u < 1) {
      const u = wipe.u;
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      const x = wipe.dir > 0 ? (1 - e) * -80 + e * (W + 80) : (1 - e) * (W + 80) + e * -80;
      const a = Math.sin(u * Math.PI);

      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(x - 70, 0, x + 70, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(
        0.5,
        spatialState.accentColor.replace('rgb', 'rgba').replace(')', `,${0.18 * a})`)
      );
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = g;
      ctx.fillRect(x - 70, 0, 140, H);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.globalAlpha = 0.4 * a;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // Master frame render pass
  public render(
    particles: ParticleEngine,
    hands: Hand[],
    W: number,
    H: number,
    t: number
  ): void {
    const main = this.mainCtx;
    const off = this.offscreenCtx;

    off.clearRect(0, 0, W, H);
    main.clearRect(0, 0, W, H);

    // 1. BEHIND HAND LAYER (rendered into offscreen buffer)
    off.globalCompositeOperation = 'lighter';
    this.drawParticles(off, particles, 0, 0.5);
    off.globalCompositeOperation = 'source-over';
    if (!spatialState.obj.hold) {
      this.drawHolographicObject(off, t);
    }

    // 2. OCCLUSION MASK (cuts hand silhouette out of offscreen buffer)
    this.maskHands(hands);

    // Transfer masked behind-layer onto main canvas
    main.drawImage(this.offscreenCanvas, 0, 0, W, H);

    // 3. ON HAND LAYER
    this.drawLens(main, W, H);
    this.drawTrail(main, t * 1000);
    this.drawPortal(main, hands, t);
    for (const h of hands) {
      this.drawHandGraphics(main, h, t);
    }

    // 4. IN FRONT OF HAND LAYER
    main.globalCompositeOperation = 'lighter';
    this.drawParticles(main, particles, 0.5, 1.01);
    main.globalCompositeOperation = 'source-over';
    if (spatialState.obj.hold) {
      this.drawHolographicObject(main, t);
    }

    // 5. ATMOSPHERIC & REFRACTIVE EFFECTS
    this.drawEffects(main, W, H);
  }
}
