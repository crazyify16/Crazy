// Desktop (keyboard + pointer-lock mouse) and phone (virtual joystick,
// drag-to-look, jump button) controls, merged into one move/look state.

const MOUSE_SENSITIVITY = 0.0022
const TOUCH_SENSITIVITY = 0.0055
const JOYSTICK_RADIUS = 55

export class Input {
  moveX = 0
  moveZ = 0
  jump = false
  sprint = false
  /** Accumulated look delta (radians) since the last `consumeLook()`. */
  private lookDX = 0
  private lookDY = 0

  readonly isTouch: boolean
  pointerLocked = false

  private readonly keys = new Set<string>()
  private joystickId: number | null = null
  private joyOrigin = { x: 0, y: 0 }
  private joyVec = { x: 0, y: 0 }
  private lookId: number | null = null
  private lookLast = { x: 0, y: 0 }
  private jumpTouches = new Set<number>()

  private readonly canvas: HTMLCanvasElement
  private readonly joyBase: HTMLElement
  private readonly joyKnob: HTMLElement
  private readonly jumpBtn: HTMLElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.joyBase = document.getElementById('joystick')!
    this.joyKnob = document.getElementById('joystick-knob')!
    this.jumpBtn = document.getElementById('jump-btn')!
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window

    this.bindKeyboardMouse()
    this.bindTouch()
  }

  consumeLook(): { dx: number; dy: number } {
    const out = { dx: this.lookDX, dy: this.lookDY }
    this.lookDX = 0
    this.lookDY = 0
    return out
  }

  /** Recomputes movement from whichever device is active. Call once per frame. */
  poll(): void {
    let x = 0
    let z = 0
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z += 1
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z -= 1
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1
    if (x && z) {
      x *= Math.SQRT1_2
      z *= Math.SQRT1_2
    }
    let sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')

    if (this.joystickId !== null) {
      x = this.joyVec.x
      z = -this.joyVec.y
      // Pushing the stick all the way forward sprints, like mobile Minecraft.
      sprint = z > 0.95
    }

    this.moveX = x
    this.moveZ = z
    this.sprint = sprint && z > 0
    this.jump = this.keys.has('Space') || this.jumpTouches.size > 0
  }

  private bindKeyboardMouse(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (e.code === 'Space') e.preventDefault()
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas
      if (!this.pointerLocked) this.keys.clear()
    })
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return
      this.lookDX += e.movementX * MOUSE_SENSITIVITY
      this.lookDY += e.movementY * MOUSE_SENSITIVITY
    })
  }

  private bindTouch(): void {
    const opts = { passive: false } as const

    this.jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault()
      e.stopPropagation()
      for (const t of Array.from(e.changedTouches)) this.jumpTouches.add(t.identifier)
      this.jumpBtn.classList.add('pressed')
    }, opts)
    const releaseJump = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) this.jumpTouches.delete(t.identifier)
      if (this.jumpTouches.size === 0) this.jumpBtn.classList.remove('pressed')
    }
    this.jumpBtn.addEventListener('touchend', releaseJump)
    this.jumpBtn.addEventListener('touchcancel', releaseJump)

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        // Left ~40% of the screen spawns the joystick where you touch; the rest looks around.
        if (t.clientX < window.innerWidth * 0.4 && this.joystickId === null) {
          this.joystickId = t.identifier
          this.joyOrigin = { x: t.clientX, y: t.clientY }
          this.joyVec = { x: 0, y: 0 }
          this.joyBase.style.left = `${t.clientX}px`
          this.joyBase.style.top = `${t.clientY}px`
          this.joyBase.classList.add('active')
          this.setKnob(0, 0)
        } else if (this.lookId === null) {
          this.lookId = t.identifier
          this.lookLast = { x: t.clientX, y: t.clientY }
        }
      }
    }, opts)

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joystickId) {
          let dx = t.clientX - this.joyOrigin.x
          let dy = t.clientY - this.joyOrigin.y
          const len = Math.hypot(dx, dy)
          if (len > JOYSTICK_RADIUS) {
            dx = (dx / len) * JOYSTICK_RADIUS
            dy = (dy / len) * JOYSTICK_RADIUS
          }
          this.joyVec = { x: dx / JOYSTICK_RADIUS, y: dy / JOYSTICK_RADIUS }
          this.setKnob(dx, dy)
        } else if (t.identifier === this.lookId) {
          this.lookDX += (t.clientX - this.lookLast.x) * TOUCH_SENSITIVITY
          this.lookDY += (t.clientY - this.lookLast.y) * TOUCH_SENSITIVITY
          this.lookLast = { x: t.clientX, y: t.clientY }
        }
      }
    }, opts)

    const end = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joystickId) {
          this.joystickId = null
          this.joyVec = { x: 0, y: 0 }
          this.joyBase.classList.remove('active')
        } else if (t.identifier === this.lookId) {
          this.lookId = null
        }
      }
    }
    this.canvas.addEventListener('touchend', end)
    this.canvas.addEventListener('touchcancel', end)
  }

  private setKnob(dx: number, dy: number): void {
    this.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
  }
}
