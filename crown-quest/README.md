# Crown Quest

A Royal Match-style match-3 prototype in a single HTML file (no build step, no dependencies).

Open `index.html` in any browser, or serve the folder (`npx serve crown-quest`) and open it on a phone.

## What's in it

- Swap or tap to match rubies, towers, crowns, clovers and potions
- Power-ups: 4 in a row → rocket, L/T → TNT, 2×2 → propeller, 5 in a row → light ball, and power-up + power-up combos
- Obstacles: crates (1 and 2 hits), stones, board holes
- 60 levels (1–10 hand-made, 11–60 generated from a seed) with goals, a move limit and 1–3 stars
- King's Bonus: leftover moves become rockets when you win
- Level map, coins, boosters (hammer, arrow, cannon, shuffle), +5 moves on a loss
- Castle meta: spend stars to rebuild the Throne Room, Royal Garden and Castle Gate
- Progress saves to `localStorage`

## Where to tweak

- Levels: `HAND` (hand-made layouts) and `genLevel()` in `index.html`
  Layout legend: `.` tile, `#` hole, `C` crate, `D` double crate, `S` stone
- Castle tasks and star costs: `AREAS`
- Refill behaviour (how often free cascades happen): `pickRefillKind()`
