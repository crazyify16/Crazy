import * as THREE from 'three'
import { mulberry32 } from './noise'

// Procedurally painted 16x16 pixel-art tiles packed side by side in one atlas.
export const TILE = { GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2 } as const
export const TILE_COUNT = 3
const PX = 16

type RGB = [number, number, number]

function jitter(rand: () => number, [r, g, b]: RGB, amount: number): string {
  const k = 1 + (rand() - 0.5) * amount
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${c(r)},${c(g)},${c(b)})`
}

export function createAtlas(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = PX * TILE_COUNT
  canvas.height = PX
  const ctx = canvas.getContext('2d')!
  const rand = mulberry32(1337)

  const grass: RGB = [95, 159, 53]
  const dirt: RGB = [134, 96, 67]

  const paint = (tile: number, pick: (x: number, y: number) => string) => {
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        ctx.fillStyle = pick(x, y)
        ctx.fillRect(tile * PX + x, y, 1, 1)
      }
    }
  }

  paint(TILE.GRASS_TOP, () => jitter(rand, grass, 0.35))
  paint(TILE.DIRT, () => jitter(rand, dirt, 0.4))

  // Grass hangs a ragged 3-5 pixels down over the dirt on the side tile.
  const fringe = Array.from({ length: PX }, () => 3 + Math.floor(rand() * 3))
  paint(TILE.GRASS_SIDE, (x, y) =>
    y < fringe[x] ? jitter(rand, grass, 0.35) : jitter(rand, dirt, 0.4),
  )

  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
