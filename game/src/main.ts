import * as THREE from 'three'
import './style.css'
import { Input } from './input'
import { EYE_HEIGHT, Player } from './player'
import { createAtlas } from './textures'
import { CHUNK_SIZE, World } from './world'

const params = new URLSearchParams(location.search)
const canvas = document.getElementById('game') as HTMLCanvasElement
const input = new Input(canvas)

// Phones get a shorter view distance and lower resolution to stay smooth.
const renderDistance = Number(params.get('rd')) || (input.isTouch ? 4 : 7)
const seed = Number(params.get('seed')) || 20260927

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !input.isTouch })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, input.isTouch ? 1.5 : 2))

const SKY = new THREE.Color(0x87c5ff)
const scene = new THREE.Scene()
scene.background = SKY
const fogFar = renderDistance * CHUNK_SIZE
scene.fog = new THREE.Fog(SKY, fogFar * 0.55, fogFar * 0.95)

const camera = new THREE.PerspectiveCamera(75, 1, 0.1, fogFar + CHUNK_SIZE)
camera.rotation.order = 'YXZ'

const material = new THREE.MeshBasicMaterial({ map: createAtlas(), vertexColors: true })
const world = new World(scene, material, seed)
const player = new Player(world)

// Build the area around spawn before the first frame so we don't start in the void.
world.update(0, 0, 2, Infinity)
player.spawnAt(0, 0)

function resize(): void {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

// --- UI --------------------------------------------------------------------
const overlay = document.getElementById('overlay')!
const hud = document.getElementById('hud')!
document.body.classList.toggle('touch', input.isTouch)

if (input.isTouch) {
  overlay.querySelector('.desktop-help')!.remove()
  overlay.addEventListener('click', () => {
    overlay.classList.add('hidden')
    document.documentElement.requestFullscreen?.().catch(() => {})
  })
} else {
  overlay.querySelector('.touch-help')!.remove()
  overlay.addEventListener('click', () => canvas.requestPointerLock())
  canvas.addEventListener('click', () => canvas.requestPointerLock())
  document.addEventListener('pointerlockchange', () => {
    overlay.classList.toggle('hidden', input.pointerLocked)
  })
}

// --- Game loop ---------------------------------------------------------------
let last = performance.now()
let fpsFrames = 0
let fpsTime = 0
let fps = 0

function frame(now: number): void {
  requestAnimationFrame(frame)
  // rAF timestamps can precede the performance.now() taken at startup, so clamp
  // to >= 0 (a negative step would invert gravity); cap it to survive hitches.
  const dt = Math.max(0, Math.min((now - last) / 1000, 0.05))
  last = now

  input.poll()
  const look = input.consumeLook()
  player.yaw -= look.dx
  player.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, player.pitch - look.dy))

  const playing = input.isTouch ? overlay.classList.contains('hidden') : input.pointerLocked
  player.update(dt, {
    x: playing ? input.moveX : 0,
    z: playing ? input.moveZ : 0,
    jump: playing && input.jump,
    sprint: input.sprint,
    autoJump: input.isTouch,
  })

  world.update(player.position.x, player.position.z, renderDistance, input.isTouch ? 4 : 8)

  camera.position.set(player.position.x, player.position.y + EYE_HEIGHT, player.position.z)
  camera.rotation.set(player.pitch, player.yaw, 0)
  renderer.render(scene, camera)

  fpsFrames++
  fpsTime += dt
  if (fpsTime >= 0.5) {
    fps = Math.round(fpsFrames / fpsTime)
    fpsFrames = 0
    fpsTime = 0
    const p = player.position
    hud.textContent =
      `${fps} fps · XYZ ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)} · chunks ${world.loadedChunks}`
  }
}
requestAnimationFrame(frame)
