import { ParticleEngine } from './physics/ParticleEngine';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class QualityEngine {
  public isMobile: boolean;
  public prefersReducedMotion: boolean;
  private frameDurationAvg: number = 0.016;
  private lastAdjustmentTime: number = 0;

  constructor() {
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer:coarse)').matches || window.innerWidth < 700);
  }

  public step(dt: number, now: number, particles: ParticleEngine): void {
    this.frameDurationAvg = lerp(this.frameDurationAvg, dt, 0.02);

    if (now - this.lastAdjustmentTime > 2000) {
      if (this.frameDurationAvg > 0.026 && particles.activeCount > 180) {
        // Frame drop detected: adaptively reduce particle count
        const reduced = Math.max(180, Math.floor(particles.activeCount * 0.85));
        particles.setQualityParticleCount(reduced);
        this.lastAdjustmentTime = now;
      } else if (this.frameDurationAvg < 0.019 && particles.activeCount < particles.maxParticles) {
        // Healthy frame rate: recover particle count
        const recovered = Math.min(
          particles.maxParticles,
          Math.ceil(particles.activeCount * 1.1)
        );
        particles.setQualityParticleCount(recovered);
        this.lastAdjustmentTime = now;
      }
    }
  }
}
