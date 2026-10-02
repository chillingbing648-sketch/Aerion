import { ScreenPoint } from './types';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class Smoother {
  private p: ScreenPoint[] | null = null;

  public step(pts: ScreenPoint[]): ScreenPoint[] {
    if (!this.p) {
      this.p = pts.map(q => ({ ...q }));
      return this.p;
    }

    this.p.forEach((o, i) => {
      const q = pts[i];
      // Adaptive alpha: higher distance means fast hand motion, so higher alpha (less lag)
      const a = clamp(0.22 + Math.hypot(q.x - o.x, q.y - o.y) / 70, 0.22, 0.92);
      o.x += (q.x - o.x) * a;
      o.y += (q.y - o.y) * a;
      if (q.z !== undefined && o.z !== undefined) {
        o.z += (q.z - o.z) * a;
      }
    });

    return this.p;
  }

  public reset(): void {
    this.p = null;
  }
}
