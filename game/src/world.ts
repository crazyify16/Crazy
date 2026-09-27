import * as THREE from 'three'
import { Perlin2D } from './noise'
import { TILE, TILE_COUNT } from './textures'

export const CHUNK_SIZE = 16
export const CHUNK_HEIGHT = 64

export const Block = {
  Air: 0,
  Grass: 1,
} as const

const key = (cx: number, cz: number) => `${cx},${cz}`

class Chunk {
  readonly blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT)
  mesh: THREE.Mesh | null = null
  readonly cx: number
  readonly cz: number

  constructor(cx: number, cz: number) {
    this.cx = cx
    this.cz = cz
  }

  static index(x: number, y: number, z: number): number {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x
  }

  get(x: number, y: number, z: number): number {
    return this.blocks[Chunk.index(x, y, z)]
  }
}

// Face shading so the sun seems to come from above, slightly to the side.
const FACE_SHADE = [0.8, 1.0, 0.65] // by normal axis: x, y, z
const BOTTOM_SHADE = 0.5
// Ambient-occlusion brightness by number of free neighbours (0..3).
const AO_LEVELS = [0.45, 0.65, 0.82, 1.0]

export class World {
  private readonly chunks = new Map<string, Chunk>()
  private readonly terrain: Perlin2D
  private readonly hills: Perlin2D
  private readonly scene: THREE.Scene
  private readonly material: THREE.Material

  constructor(scene: THREE.Scene, material: THREE.Material, seed: number) {
    this.scene = scene
    this.material = material
    this.terrain = new Perlin2D(seed)
    this.hills = new Perlin2D(seed + 1)
  }

  get loadedChunks(): number {
    return this.chunks.size
  }

  /** Height of the topmost solid block in a column (deterministic from the seed). */
  heightAt(wx: number, wz: number): number {
    // A slow "hilliness" mask decides whether an area is plains or rolling hills.
    const hilliness = (this.hills.noise(wx / 320, wz / 320) + 1) / 2
    const base = this.terrain.fbm(wx / 140, wz / 140, 5)
    const h = 22 + base * (6 + 30 * hilliness * hilliness)
    return Math.max(1, Math.min(CHUNK_HEIGHT - 4, Math.floor(h)))
  }

  isSolid(wx: number, wy: number, wz: number): boolean {
    if (wy < 0) return true
    if (wy >= CHUNK_HEIGHT) return false
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(key(cx, cz))
    if (chunk) {
      return chunk.get(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE) !== Block.Air
    }
    // Chunk not loaded yet: generation is deterministic, so ask the generator.
    return wy <= this.heightAt(wx, wz)
  }

  /**
   * Streams chunks around the player: loads the nearest missing ones within
   * `radius` (until the time budget runs out) and unloads far-away ones.
   */
  update(px: number, pz: number, radius: number, budgetMs: number): void {
    const pcx = Math.floor(px / CHUNK_SIZE)
    const pcz = Math.floor(pz / CHUNK_SIZE)

    const missing: Array<[number, number, number]> = []
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d2 = dx * dx + dz * dz
        if (d2 > radius * radius) continue
        if (!this.chunks.has(key(pcx + dx, pcz + dz))) missing.push([pcx + dx, pcz + dz, d2])
      }
    }
    missing.sort((a, b) => a[2] - b[2])

    const start = performance.now()
    for (const [cx, cz] of missing) {
      this.loadChunk(cx, cz)
      if (performance.now() - start > budgetMs) break
    }

    const unloadR = radius + 2
    for (const [k, chunk] of this.chunks) {
      const dx = chunk.cx - pcx
      const dz = chunk.cz - pcz
      if (dx * dx + dz * dz > unloadR * unloadR) {
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh)
          chunk.mesh.geometry.dispose()
        }
        this.chunks.delete(k)
      }
    }
  }

  private loadChunk(cx: number, cz: number): void {
    const chunk = new Chunk(cx, cz)
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const h = this.heightAt(cx * CHUNK_SIZE + x, cz * CHUNK_SIZE + z)
        for (let y = 0; y <= h; y++) chunk.blocks[Chunk.index(x, y, z)] = Block.Grass
      }
    }
    this.chunks.set(key(cx, cz), chunk)
    chunk.mesh = this.buildMesh(chunk)
    if (chunk.mesh) this.scene.add(chunk.mesh)
  }

  private buildMesh(chunk: Chunk): THREE.Mesh | null {
    const ox = chunk.cx * CHUNK_SIZE
    const oz = chunk.cz * CHUNK_SIZE
    const solidAt = (x: number, y: number, z: number): boolean => {
      if (x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT) {
        return chunk.get(x, y, z) !== Block.Air
      }
      return this.isSolid(ox + x, y, oz + z)
    }

    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []
    const tileW = 1 / TILE_COUNT
    const eps = 0.0005 // keep samples inside the tile so neighbours don't bleed

    const v = [0, 0, 0]
    const n = [0, 0, 0]
    const p = [0, 0, 0]
    const ao = [0, 0, 0, 0]

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          if (chunk.get(x, y, z) === Block.Air) continue
          v[0] = x; v[1] = y; v[2] = z

          for (let a = 0; a < 3; a++) {
            for (const s of [1, -1]) {
              n[0] = x; n[1] = y; n[2] = z
              n[a] += s
              if (n[1] < 0) continue // never visible from inside the world
              if (solidAt(n[0], n[1], n[2])) continue

              // Tangent axes of this face; corners walk (b,c) in CCW order seen from outside.
              const b = (a + 1) % 3
              const c = (a + 2) % 3
              const corners = s > 0 ? CORNERS_POS : CORNERS_NEG
              const tile = a === 1 ? (s > 0 ? TILE.GRASS_TOP : TILE.DIRT) : TILE.GRASS_SIDE
              const shade = a === 1 && s < 0 ? BOTTOM_SHADE : FACE_SHADE[a]
              const base = positions.length / 3

              for (let i = 0; i < 4; i++) {
                const [cb, cc] = corners[i]
                p[a] = v[a] + (s > 0 ? 1 : 0)
                p[b] = v[b] + cb
                p[c] = v[c] + cc
                positions.push(p[0], p[1], p[2])

                // Sides get u horizontal / v vertical so the grass fringe sits on top.
                const u = a === 2 ? cb : cc
                const w = a === 2 ? cc : cb
                uvs.push(
                  (tile + eps) * tileW + u * (tileW - 2 * eps * tileW),
                  eps + w * (1 - 2 * eps),
                )

                // Ambient occlusion from the three blocks touching this corner.
                const db = cb ? 1 : -1
                const dc = cc ? 1 : -1
                const at = (ob: number, oc: number) => {
                  p[a] = n[a]; p[b] = n[b] + ob; p[c] = n[c] + oc
                  return solidAt(p[0], p[1], p[2]) ? 1 : 0
                }
                const side1 = at(db, 0)
                const side2 = at(0, dc)
                const corner = at(db, dc)
                ao[i] = side1 && side2 ? 0 : 3 - (side1 + side2 + corner)
                const lum = shade * AO_LEVELS[ao[i]]
                colors.push(lum, lum, lum)
              }

              // Split the quad along the diagonal that keeps AO gradients smooth.
              if (ao[0] + ao[2] >= ao[1] + ao[3]) {
                indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
              } else {
                indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base)
              }
            }
          }
        }
      }
    }

    if (indices.length === 0) return null
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geometry.setIndex(indices)
    geometry.computeBoundingSphere()

    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.position.set(ox, 0, oz)
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    return mesh
  }
}

const CORNERS_POS: ReadonlyArray<readonly [number, number]> = [[0, 0], [1, 0], [1, 1], [0, 1]]
const CORNERS_NEG: ReadonlyArray<readonly [number, number]> = [[0, 0], [0, 1], [1, 1], [1, 0]]
