import { PALETTES } from '../spatial/SpatialState';

export type SpriteAtlas = HTMLCanvasElement[][][];

export class SpriteFactory {
  private static cache: Map<number, HTMLCanvasElement[][]> = new Map();

  public static getSprites(paletteIndex: number): HTMLCanvasElement[][] {
    if (this.cache.has(paletteIndex)) {
      return this.cache.get(paletteIndex)!;
    }

    const col = PALETTES[paletteIndex] || PALETTES[0];
    const colStr = col.join(',');
    const whiteStr = '225,240,255';

    // 3 depth levels of radial gradients
    const stops: Array<Array<[number, string, number]>> = [
      [
        [0, '255,255,255', 1],
        [0.12, '', 0.95],
        [0.4, '', 0.22],
        [1, '', 0],
      ],
      [
        [0, '255,255,255', 0.8],
        [0.2, '', 0.55],
        [0.55, '', 0.14],
        [1, '', 0],
      ],
      [
        [0, '255,255,255', 0.35],
        [0.3, '', 0.25],
        [1, '', 0],
      ],
    ];

    const kinds = [colStr, whiteStr];
    const generated: HTMLCanvasElement[][] = kinds.map(currentColor => {
      return stops.map(stopList => {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        if (!ctx) return c;

        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        stopList.forEach(([offset, cVal, alpha]) => {
          const color = cVal || currentColor;
          grad.addColorStop(offset, `rgba(${color},${alpha})`);
        });

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return c;
      });
    });

    this.cache.set(paletteIndex, generated);
    return generated;
  }
}
