import { Hand } from './Hand';
import { ScreenPoint, Point3D } from './types';
import { spatialState, PALETTES, UXPhase } from '../spatial/SpatialState';
import { spatialBus } from '../spatial/SpatialBus';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const dist = (a: ScreenPoint, b: ScreenPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const ez = (dt: number, k: number) => 1 - Math.exp(-k * dt);

export class HandTracker {
  public hands: Hand[] = [];

  public toScreen(p: Point3D, vid: HTMLVideoElement, W: number, H: number): ScreenPoint {
    const vw = vid.videoWidth || 1;
    const vh = vid.videoHeight || 1;
    const s = Math.max(W / vw, H / vh);
    return {
      x: W / 2 + (1 - p.x - 0.5) * vw * s,
      y: H / 2 + (p.y - 0.5) * vh * s,
      z: p.z,
    };
  }

  public ingest(
    landmarksResult: { landmarks?: Point3D[][] },
    now: number,
    vid: HTMLVideoElement,
    W: number,
    H: number
  ): void {
    const used = new Set<Hand>();
    const landmarks = landmarksResult.landmarks || [];

    landmarks.forEach(rawLandmarks => {
      const pts = rawLandmarks.map(q => this.toScreen(q, vid, W, H));
      const c = {
        x: (pts[0].x + pts[9].x) / 2,
        y: (pts[0].y + pts[9].y) / 2,
      };

      let best: Hand | null = null;
      let bd = 1e9;
      for (const h of this.hands) {
        if (used.has(h) || !h.f) continue;
        const d = dist(h.f.palm, c);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }

      if (!best || bd > Math.min(W, H) * 0.45) {
        best = new Hand();
        this.hands.push(best);
      }

      used.add(best);
      best.detect(pts, now, W, H, !!spatialState.obj.hold);
    });
  }

  public injectSimulatedHand(
    sim: {
      x: number;
      y: number;
      isPinching: boolean;
      isFist: boolean;
      isOpen?: boolean;
      isSecondHand?: boolean;
      secondX?: number;
      secondY?: number;
    },
    now: number,
    W: number,
    H: number
  ): void {
    const generateHandPoints = (
      cx: number,
      cy: number,
      isPinch: boolean,
      isFistState: boolean,
      isOpenState: boolean
    ): ScreenPoint[] => {
      const wrist: ScreenPoint = { x: cx, y: cy + 75, z: 0.5 };
      const mcp5: ScreenPoint = { x: cx - 12, y: cy + 40, z: 0.5 };
      const mcp9: ScreenPoint = { x: cx, y: cy + 35, z: 0.5 };
      const mcp13: ScreenPoint = { x: cx + 12, y: cy + 38, z: 0.5 };
      const mcp17: ScreenPoint = { x: cx + 22, y: cy + 45, z: 0.5 };

      // Thumb
      const t1: ScreenPoint = { x: cx - 22, y: cy + 60, z: 0.5 };
      const t2: ScreenPoint = { x: cx - 30, y: cy + 45, z: 0.5 };
      const t3: ScreenPoint = { x: cx - 25, y: cy + 28, z: 0.5 };
      const t4: ScreenPoint = isPinch
        ? { x: cx + 2, y: cy + 2, z: 0.5 }
        : isFistState
        ? { x: cx - 5, y: cy + 30, z: 0.5 }
        : { x: cx - 28, y: cy + 15, z: 0.5 };

      // Index
      const i6: ScreenPoint = { x: cx - 8, y: cy + 25, z: 0.5 };
      const i7: ScreenPoint = { x: cx - 4, y: cy + 12, z: 0.5 };
      const i8: ScreenPoint = isFistState
        ? { x: cx - 5, y: cy + 38, z: 0.5 }
        : { x: cx, y: cy, z: 0.5 };

      // Middle
      const m10: ScreenPoint = { x: cx, y: cy + 22, z: 0.5 };
      const m11: ScreenPoint = { x: cx, y: cy + 10, z: 0.5 };
      const m12: ScreenPoint = isFistState
        ? { x: cx, y: cy + 38, z: 0.5 }
        : isOpenState
        ? { x: cx, y: cy - 2, z: 0.5 }
        : { x: cx, y: cy + 36, z: 0.5 };

      // Ring
      const r14: ScreenPoint = { x: cx + 10, y: cy + 24, z: 0.5 };
      const r15: ScreenPoint = { x: cx + 10, y: cy + 14, z: 0.5 };
      const r16: ScreenPoint = isFistState
        ? { x: cx + 10, y: cy + 40, z: 0.5 }
        : isOpenState
        ? { x: cx + 12, y: cy + 5, z: 0.5 }
        : { x: cx + 10, y: cy + 38, z: 0.5 };

      // Pinky
      const p18: ScreenPoint = { x: cx + 18, y: cy + 30, z: 0.5 };
      const p19: ScreenPoint = { x: cx + 20, y: cy + 20, z: 0.5 };
      const p20: ScreenPoint = isFistState
        ? { x: cx + 18, y: cy + 42, z: 0.5 }
        : isOpenState
        ? { x: cx + 22, y: cy + 12, z: 0.5 }
        : { x: cx + 18, y: cy + 40, z: 0.5 };

      return [
        wrist,
        t1, t2, t3, t4,
        mcp5, i6, i7, i8,
        mcp9, m10, m11, m12,
        mcp13, r14, r15, r16,
        mcp17, p18, p19, p20,
      ];
    };

    const simHands = [
      generateHandPoints(sim.x, sim.y, sim.isPinching, sim.isFist, !!sim.isOpen),
    ];

    if (sim.isSecondHand && sim.secondX !== undefined && sim.secondY !== undefined) {
      simHands.push(generateHandPoints(sim.secondX, sim.secondY, false, false, true));
    }

    const used = new Set<Hand>();
    simHands.forEach(pts => {
      const c = {
        x: (pts[0].x + pts[9].x) / 2,
        y: (pts[0].y + pts[9].y) / 2,
      };

      let best: Hand | null = null;
      let bd = 1e9;
      for (const h of this.hands) {
        if (used.has(h) || !h.f) continue;
        const d = dist(h.f.palm, c);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }

      if (!best || bd > Math.min(W, H) * 0.45) {
        best = new Hand();
        this.hands.push(best);
      }

      used.add(best);
      best.detect(pts, now, W, H, !!spatialState.obj.hold);
    });
  }

  public update(dt: number, now: number, W: number, H: number, prefersReducedMotion: boolean): void {
    // Tick hands and cull inactive
    for (let i = this.hands.length - 1; i >= 0; i--) {
      this.hands[i].tick(dt, now);
      if (now - this.hands[i].seen > 400) {
        this.hands.splice(i, 1);
      }
    }

    const live = this.hands
      .filter(h => h.vis > 0.5 && h.f)
      .sort((a, b) => (a.f && b.f ? a.f.palm.x - b.f.palm.x : 0));

    if (this.hands.length > 0) {
      spatialState.lastSeenHandTime = now;
    }

    // Wake progress ramp (smooth startup over ~2.4s)
    spatialState.wakeProgress = lerp(spatialState.wakeProgress, 1.0, ez(dt, 1.8));

    // Determine UX Phase
    let nextPhase: UXPhase = 'RESTING';
    if (spatialState.wakeProgress < 0.6) {
      nextPhase = 'BOOT';
    } else if (live.length === 0) {
      nextPhase = now - spatialState.lastSeenHandTime < 3000 ? 'READY' : 'RESTING';
    } else {
      const anyAcquiring = live.some(h => h.lockProgress < 0.65);
      const isInteracting =
        !!spatialState.obj.hold ||
        spatialState.portal.k > 0.2 ||
        spatialState.lens.a > 0.2 ||
        live.some(h => h.fistT > 0.3 || h.pose === 'point');

      const maxSpeed = Math.max(...live.map(h => h.speed()));

      if (maxSpeed > 10 || spatialState.energy > 0.8) {
        nextPhase = 'HIGH_ENERGY';
      } else if (isInteracting) {
        nextPhase = 'INTERACTING';
      } else if (anyAcquiring) {
        nextPhase = 'ACQUIRING';
      } else {
        nextPhase = 'TRACKING';
      }
    }
    spatialState.uxPhase = nextPhase;
    spatialState.updateMicroHints(now);

    // Initial micro-hints for guidance
    if (!spatialState.microHint) {
      if (live.length === 0 && now - spatialState.lastSeenHandTime > 4000) {
        spatialState.setMicroHint('RAISE HAND TO ENGAGE', 3000);
      } else if (live.length > 0 && !spatialState.hasCompletedFirstDraw && !spatialState.hasCompletedFirstPinch) {
        const lead = live[0];
        if (lead.pose === 'open') {
          spatialState.setMicroHint('POINT TO DRAW AIR TRAILS', 2400);
        }
      }
    }

    // Time Dilation: open palm hold dilates time near hands
    const anyHeld = this.hands.some(h => h.held);
    const targetTimeScale = anyHeld ? 0.04 : prefersReducedMotion ? 0.6 : 1.0;
    spatialState.timeScale = lerp(spatialState.timeScale, targetTimeScale, ez(dt, 8));

    // Depth focus and subtle camera parallax
    const lead = live[0];
    spatialState.focusZ = lerp(spatialState.focusZ, lead ? lead.z : 0.5, ez(dt, 4));
    spatialState.parallax.x = lerp(
      spatialState.parallax.x,
      lead && lead.f ? (lead.f.palm.x / W - 0.5) * 60 : 0,
      ez(dt, 3)
    );
    spatialState.parallax.y = lerp(
      spatialState.parallax.y,
      lead && lead.f ? (lead.f.palm.y / H - 0.5) * 60 : 0,
      ez(dt, 3)
    );

    // Global Energy state
    const portal = spatialState.portal;
    const lens = spatialState.lens;
    const maxHandEnergy = Math.max(
      0,
      ...this.hands.map(h => (h.pose === 'none' ? 0 : 0.55 + 0.4 * Math.max(h.fistT, h.f ? h.f.pinch : 0)))
    );
    const targetEnergy = Math.max(lens.a * 0.9, portal.k, maxHandEnergy);
    spatialState.energy = lerp(spatialState.energy, targetEnergy, ez(dt, 3));

    // Two-Hand Spatial Portal
    const twoHands = live.length >= 2;
    if (twoHands && live[0].f && live[1].f) {
      const a = live[0];
      const b = live[1];
      const d = dist(a.f!.palm, b.f!.palm);
      const sz = (a.f!.size + b.f!.size) / 2;
      const tx = (a.f!.palm.x + b.f!.palm.x) / 2;
      const ty = (a.f!.palm.y + b.f!.palm.y) / 2;

      if (!portal.on) {
        portal.on = true;
        portal.x = tx;
        portal.y = ty;
        portal.R = sz * 0.5;
        portal.d = d;
        portal.rate = 0;
        portal.born = now;
      }

      portal.x = lerp(portal.x, tx, ez(dt, 16));
      portal.y = lerp(portal.y, ty, ez(dt, 16));
      const dn = lerp(portal.d, d, ez(dt, 10));
      portal.rate = lerp(portal.rate, (dn - portal.d) / dt, ez(dt, 8));
      portal.d = dn;
      portal.R = lerp(portal.R, clamp(dn * 0.42, sz * 0.4, Math.min(W, H) * 0.45), ez(dt, 10));
      portal.tight = clamp(1 - dn / (sz * 6), 0, 1);
      portal.rz = Math.atan2(b.f!.palm.y - a.f!.palm.y, b.f!.palm.x - a.f!.palm.x);
      portal.ry = lerp(portal.ry, ((a.f!.size - b.f!.size) / (a.f!.size + b.f!.size)) * 1.4, ez(dt, 6));
      portal.rx += dt * (0.35 + portal.tight * 1.2);
      portal.sz = sz;

      // Rapid hand separation triggers dimensional expansion shockwave
      if (
        portal.rate > sz * 10 &&
        dn > sz * 3 &&
        now - spatialState.lastExpandTime > 1800 &&
        now - portal.born > 500
      ) {
        spatialState.lastExpandTime = now;
        spatialBus.emit('expand', { x: portal.x, y: portal.y });
      }
    }

    portal.k = lerp(portal.k, twoHands ? 1 : 0, ez(dt, 5));
    if (portal.k < 0.01) {
      portal.on = false;
    }

    // Holographic Object / Digital Matter
    const obj = spatialState.obj;
    const isObjectVisible =
      obj.on && (this.hands.length > 0 || now - spatialState.lastSeenHandTime < 6000);
    obj.a = lerp(obj.a, isObjectVisible ? 1 : 0, ez(dt, 4));

    if (obj.a > 0.05) {
      if (!obj.hold) {
        for (const h of live) {
          if (
            h.pose === 'pinch' &&
            obj.on &&
            h.f &&
            dist(h.f.tip, obj) < obj.R * obj.s * 1.2 + 30
          ) {
            obj.hold = h;
            obj.ox = obj.x - h.f.tip.x;
            obj.oy = obj.y - h.f.tip.y;
            obj.focus = 1;
            break;
          }
        }
      }

      const h = obj.hold;
      if (h && (h.pose !== 'pinch' || h.vis < 0.3)) {
        // Release with throwing momentum (inertia + damping)
        obj.vx = h.vel.x * 0.6;
        obj.vy = h.vel.y * 0.6;
        obj.hold = null;
        obj.focus = 0.5;
      } else if (h && h.f) {
        const k = ez(dt, 18);
        obj.x = lerp(obj.x, h.f.tip.x + obj.ox, k);
        obj.y = lerp(obj.y, h.f.tip.y + obj.oy, k);
        obj.s = lerp(
          obj.s,
          clamp(0.5 + h.z * 2.2, 0.45, 2.4) * (1.2 - 0.35 * h.f.pinch),
          ez(dt, 10)
        );
        obj.rz = lerp(obj.rz, h.f.roll, ez(dt, 8));
        obj.rx = lerp(obj.rx, 0.7 + h.f.pitch * 0.9, ez(dt, 8));
        obj.spin += h.vel.x * 0.0006 * dt * 60;
        obj.focus = lerp(obj.focus, 1.0, ez(dt, 12));
      } else {
        // Floating object settling with damping
        obj.x += obj.vx * dt;
        obj.y += obj.vy * dt;
        obj.vx *= Math.exp(-1.6 * dt);
        obj.vy *= Math.exp(-1.6 * dt);
        obj.x = clamp(obj.x, obj.R, W - obj.R);
        obj.y = clamp(obj.y, obj.R, H - obj.R);
        obj.s = lerp(obj.s, 1, ez(dt, 2));
        obj.focus = lerp(obj.focus, 0.2, ez(dt, 3));
      }
      obj.ry += (0.25 + obj.spin) * dt;
      obj.spin *= Math.exp(-1.2 * dt);
    }

    // Spatial Lens
    const lh = live.find(h => h.pose === 'pinch' && h.pinchT > 0.25 && obj.hold !== h);
    if (lh && lh.f) {
      const f = lh.f;
      const k = ez(dt, 14);
      if (lens.a < 0.05) {
        lens.x = f.tip.x;
        lens.y = f.tip.y;
      }
      lens.x = lerp(lens.x, f.tip.x, k);
      lens.y = lerp(lens.y, f.tip.y, k);
      lens.r = lerp(lens.r, Math.min(W, H) * (0.05 + 0.17 * lh.z), ez(dt, 8));
      lens.str = lerp(lens.str, f.pinch, ez(dt, 10));
      lens.hand = lh;
      lens.a = lerp(lens.a, 1, ez(dt, 9));
      lens.vx = lh.vel.x;
      lens.vy = lh.vel.y;
      lens.det = 0;
      lens.shimmer = (lens.shimmer + dt * 4) % (Math.PI * 2);
    } else {
      if (lens.hand) {
        const h = lens.hand;
        lens.hand = null;
        if (lens.a > 0.6 && h.pdPeak > 3.5) {
          // Fast release -> REALITY BURST
          spatialBus.emit('burst', {
            x: lens.x,
            y: lens.y,
            p: clamp(h.pdPeak / 6, 0.6, 1.2),
          });
        } else {
          lens.det = 0.5;
        }
      }
      lens.x += lens.vx * dt * 0.3;
      lens.y += lens.vy * dt * 0.3;
      lens.vx *= Math.exp(-4 * dt);
      lens.vy *= Math.exp(-4 * dt);
      lens.str = lerp(lens.str, 0, ez(dt, 6));
      lens.a = lerp(lens.a, 0, ez(dt, lens.det > 0 ? 2.5 : 10));
      lens.det = Math.max(0, lens.det - dt);
    }

    // Air Trails
    const pt = live.find(h => h.pose === 'point');
    const trail = spatialState.trail;
    if (pt && pt.pts) {
      const tp = pt.pts[8];
      const lastPoint = trail[trail.length - 1];
      const sp = pt.speed();
      if (!lastPoint || dist(lastPoint, tp) > 3) {
        trail.push({
          x: tp.x,
          y: tp.y,
          t: now,
          w: clamp(0.8 + sp * 0.12, 0.8, 3.5),
          wk: clamp((sp - 3) * 1.6, 0, 22),
          z: pt.z,
          vx: 0,
          vy: 0,
          brk: !lastPoint || now - lastPoint.t > 140,
        });
        if (trail.length > 160) {
          trail.shift();
        }
      }
    }

    const fistHands = live.filter(h => h.fistT > 0.05);
    for (const p of trail) {
      if (p.dead) continue;
      for (const h of fistHands) {
        if (!h.f) continue;
        const dx = h.f.palm.x - p.x;
        const dy = h.f.palm.y - p.y;
        const r = Math.hypot(dx, dy) + 1;
        if (r < 480) {
          const a = (1600 * h.fistT) / (1 + r / 120);
          p.vx += (dx / r) * a * dt;
          p.vy += (dy / r) * a * dt;
          if (r < 22) {
            p.dead = 1;
            h.mass = Math.min(1, h.mass + 0.01);
          }
        }
      }
      if (p.ab) {
        p.vx += (p.ab.x - p.x) * 30 * dt;
        p.vy += (p.ab.y - p.y) * 30 * dt;
        if (dist(p, p.ab) < 8) p.dead = 1;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const dm = Math.exp(-(p.ab ? 9 : 2.2) * dt);
      p.vx *= dm;
      p.vy *= dm;
    }

    while (trail.length && (trail[0].dead || now - trail[0].t > 2400)) {
      trail.shift();
    }

    // Chromatic Swipe Wipe progress & Palette Flip
    const wipe = spatialState.wipe;
    if (wipe.u < 1) {
      wipe.u = Math.min(1, wipe.u + dt / 0.9);
      if (!wipe.flip && wipe.u > 0.45) {
        wipe.flip = true;
        spatialState.paletteIndex = (spatialState.paletteIndex + 1) % PALETTES.length;
        const col = PALETTES[spatialState.paletteIndex];
        spatialState.accentColor = `rgb(${col.join(',')})`;
        document.documentElement.style.setProperty('--ac', spatialState.accentColor);
      }
    }
  }
}
