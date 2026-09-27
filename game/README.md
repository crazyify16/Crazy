# Crazy Craft

A Minecraft-like voxel game prototype built with three.js + TypeScript + Vite.

Current features:
- Infinite, procedurally generated terrain (seeded Perlin noise), streamed in 16×16×64 chunks
- One block type: grass
- First-person walking with gravity, jumping and block collision
- Desktop controls: click to play, WASD / arrows move, mouse look, Space jump, Shift sprint, Esc pause
- Phone controls: left side virtual joystick (push fully forward to sprint), drag right side to look,
  ▲ button to jump, auto-jump up one-block steps

## Run

```bash
cd game
npm install
npm run dev      # served on your LAN too (--host), so you can open it from your phone
npm run build    # static build in game/dist
```

URL options: `?seed=123` picks a different world, `?rd=6` sets the render distance in chunks
(default 7 on desktop, 4 on phones).

## Code map

- `src/world.ts` – terrain generation, chunk storage, meshing (face culling + ambient occlusion), chunk streaming
- `src/player.ts` – player physics and AABB-vs-voxel collision
- `src/input.ts` – keyboard/mouse and touch controls
- `src/textures.ts` – procedurally painted pixel-art texture atlas
- `src/noise.ts` – seeded Perlin noise
- `src/main.ts` – renderer, scene, game loop, HUD
