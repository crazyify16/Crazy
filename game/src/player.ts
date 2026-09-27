import * as THREE from 'three'
import type { World } from './world'

const HALF_WIDTH = 0.3
const HEIGHT = 1.8
export const EYE_HEIGHT = 1.62
const GRAVITY = 28
const JUMP_SPEED = 8.6
const WALK_SPEED = 4.3
const SPRINT_SPEED = 6.2
const MAX_FALL = 50

export interface MoveInput {
  /** Strafe (-1 left .. 1 right) and forward (-1 back .. 1 forward), magnitude <= 1. */
  x: number
  z: number
  jump: boolean
  sprint: boolean
  autoJump: boolean
}

export class Player {
  /** Feet position (centre of the bottom of the bounding box). */
  readonly position = new THREE.Vector3()
  readonly velocity = new THREE.Vector3()
  yaw = 0
  pitch = 0
  onGround = false
  private readonly world: World

  constructor(world: World) {
    this.world = world
  }

  spawnAt(x: number, z: number): void {
    const bx = Math.floor(x)
    const bz = Math.floor(z)
    this.position.set(bx + 0.5, this.world.heightAt(bx, bz) + 1, bz + 0.5)
    this.velocity.set(0, 0, 0)
  }

  update(dt: number, input: MoveInput): void {
    if (dt <= 0) return
    // Horizontal velocity follows input directly (snappy, Minecraft-like).
    const speed = input.sprint ? SPRINT_SPEED : WALK_SPEED
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    // Camera looks down -Z at yaw 0.
    this.velocity.x = (input.x * cos - input.z * sin) * speed
    this.velocity.z = (-input.x * sin - input.z * cos) * speed

    if (input.jump && this.onGround) this.velocity.y = JUMP_SPEED
    this.velocity.y = Math.max(this.velocity.y - GRAVITY * dt, -MAX_FALL)

    // Sub-step so fast movement can never tunnel through a block.
    const steps = Math.ceil((this.velocity.length() * dt) / 0.4) || 1
    const h = dt / steps
    this.onGround = false
    let blockedHorizontally = false
    for (let i = 0; i < steps; i++) {
      blockedHorizontally = this.moveAxis(0, this.velocity.x * h) || blockedHorizontally
      blockedHorizontally = this.moveAxis(2, this.velocity.z * h) || blockedHorizontally
      this.moveAxis(1, this.velocity.y * h)
    }

    // Auto-jump: walking into a one-block step hops up it (great for touch play).
    if (input.autoJump && blockedHorizontally && this.onGround && (input.x || input.z)) {
      const dir = new THREE.Vector3(this.velocity.x, 0, this.velocity.z)
      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(0.35)
        const probe = this.position.clone().add(dir)
        probe.y += 1.05
        if (!this.collidesAt(probe)) this.velocity.y = JUMP_SPEED
      }
    }
  }

  /** Moves along one axis, resolving collisions. Returns true if blocked. */
  private moveAxis(axis: 0 | 1 | 2, delta: number): boolean {
    if (delta === 0) return false
    const pos = this.position
    pos.setComponent(axis, pos.getComponent(axis) + delta)

    const minX = Math.floor(pos.x - HALF_WIDTH)
    const maxX = Math.floor(pos.x + HALF_WIDTH - 1e-6)
    const minY = Math.floor(pos.y)
    const maxY = Math.floor(pos.y + HEIGHT - 1e-6)
    const minZ = Math.floor(pos.z - HALF_WIDTH)
    const maxZ = Math.floor(pos.z + HALF_WIDTH - 1e-6)

    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          if (!this.world.isSolid(x, y, z)) continue
          if (axis === 0) pos.x = delta > 0 ? x - HALF_WIDTH : x + 1 + HALF_WIDTH
          else if (axis === 2) pos.z = delta > 0 ? z - HALF_WIDTH : z + 1 + HALF_WIDTH
          else {
            pos.y = delta > 0 ? y - HEIGHT : y + 1
            if (delta < 0) this.onGround = true
          }
          this.velocity.setComponent(axis, 0)
          return true
        }
      }
    }
    return false
  }

  private collidesAt(p: THREE.Vector3): boolean {
    for (let y = Math.floor(p.y); y <= Math.floor(p.y + HEIGHT - 1e-6); y++) {
      for (let z = Math.floor(p.z - HALF_WIDTH); z <= Math.floor(p.z + HALF_WIDTH - 1e-6); z++) {
        for (let x = Math.floor(p.x - HALF_WIDTH); x <= Math.floor(p.x + HALF_WIDTH - 1e-6); x++) {
          if (this.world.isSolid(x, y, z)) return true
        }
      }
    }
    return false
  }
}
