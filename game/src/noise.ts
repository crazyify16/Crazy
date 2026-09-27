// Seeded 2D Perlin noise, used for terrain height.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRADIENTS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2],
]

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export class Perlin2D {
  private perm = new Uint8Array(512)

  constructor(seed: number) {
    const rand = mulberry32(seed)
    const p = Array.from({ length: 256 }, (_, i) => i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }

  private grad(ix: number, iy: number, x: number, y: number): number {
    const g = GRADIENTS[this.perm[(ix & 255) + this.perm[iy & 255]] & 7]
    return g[0] * x + g[1] * y
  }

  /** Returns noise in roughly [-1, 1]. */
  noise(x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const u = fade(fx)
    const v = fade(fy)
    const n00 = this.grad(ix, iy, fx, fy)
    const n10 = this.grad(ix + 1, iy, fx - 1, fy)
    const n01 = this.grad(ix, iy + 1, fx, fy - 1)
    const n11 = this.grad(ix + 1, iy + 1, fx - 1, fy - 1)
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v) * 1.414
  }

  /** Fractal Brownian motion: several octaves layered together. */
  fbm(x: number, y: number, octaves: number): number {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += this.noise(x * freq, y * freq) * amp
      norm += amp
      amp *= 0.5
      freq *= 2
    }
    return sum / norm
  }
}
