// Crown Quest balance tool. Plays every level many times with a greedy "decent player" bot,
// animations disabled, and reports how many moves the bot needed.
//
//   node calibrate.cjs index.html 50 150   # moves needed per level (50 games, 150-move budget)
//   node calibrate.cjs index.html 50 0     # budget 0 = use each level's real move count; reports win rate
//
// Needs Playwright with Chromium installed (npm i -D playwright && npx playwright install chromium).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const SRC = process.argv[2], RUNS = +(process.argv[3] || 24), BUDGET = +(process.argv[4] || 150);
const ONLY = process.argv[5] ? process.argv[5].split(',').map(Number) : null; // optional: just these levels, e.g. 5,13,22
function rep(s, a, b) { if (!s.includes(a)) throw new Error('hook miss: ' + a.slice(0, 50)); return s.replace(a, b); }
let s = fs.readFileSync(SRC, 'utf8');
s = rep(s, 'function tween(o, to, dur, ease = easeOut) {', 'function tween(o, to, dur, ease = easeOut) {\n  if (window.__FAST) { for (const k in to) o[k] = to[k]; return Promise.resolve(); }');
s = rep(s, 'const delay = ms => {', 'const delay = ms => { if (window.__FAST) return Promise.resolve();');
s = rep(s, 'function ac() {', 'function ac() {\n  if (window.__FAST) return null; // no audio while simulating');
s = rep(s, 'function flyPropFx(r, c, tr, tc, carry) {', 'function flyPropFx(r, c, tr, tc, carry) {\n  if (window.__FAST) return Promise.resolve();');
s = rep(s, 'requestAnimationFrame(frame);\nif (S.unlocked', 'window.__T = { get G() { return G; }, startLevel, trySwap, tapSpecial, findMatches, decideSpecial, LEVEL_COUNT };\nrequestAnimationFrame(frame);\nif (S.unlocked');
const COPY = require('path').join(require('os').tmpdir(), 'crown-quest-calib.html');
fs.writeFileSync(COPY, s);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 400, height: 800 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + COPY);
  await p.waitForTimeout(500);
  const out = await p.evaluate(async ({ RUNS, BUDGET, ONLY }) => {
    window.__FAST = true; const T = window.__T;
    const BON = { ball: 40, tnt: 22, rh: 14, rv: 14, prop: 12 };
    function botMove() {
      const G = T.G, need = new Set(G.goals.filter(g => g.type === 'color' && g.left > 0).map(g => g.c));
      const bgoal = new Set(G.goals.filter(g => g.type !== 'color' && g.left > 0).map(g => g.type));
      const at = (r, c) => r >= 0 && c >= 0 && r < G.rows && c < G.cols ? G.grid[r][c] : null;
      let best = null, bs = -1;
      const rockTop = {}; // rescue levels: matches under a boulder open its road
      for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) { const t = G.grid[r][c].tile; if (t && t.rock && rockTop[c] === undefined) rockTop[c] = r; }
      const consider = (sc, mv) => { sc += Math.random() * .5; if (sc > bs) { bs = sc; best = mv; } };
      for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
        const A = at(r, c); if (!A || A.hole || !A.tile || A.b) continue;
        if (A.tile.rock) { /* boulders can still be swapped, handled below */ }
        if (A.tile.sp) consider(A.tile.sp === 'ball' ? 34 : 26, ['tap', r, c]);
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const B = at(r + dr, c + dc); if (!B || B.hole || !B.tile || B.b || A.ice || B.ice) continue;
          const sa = A.tile.sp, sb = B.tile.sp;
          if (sa && sb) { consider(90, ['swap', r, c, r + dr, c + dc]); continue; }
          if (sa || sb) { const sp = sa || sb, other = sa ? B.tile : A.tile; consider(sp === 'ball' ? 36 + (need.has(other.k) ? 12 : 0) : 25, ['swap', r, c, r + dr, c + dc]); continue; }
          [A.tile, B.tile] = [B.tile, A.tile];
          const groups = T.findMatches();
          if (groups.length) {
            let sc = 0; const hit = new Set();
            for (const g of groups) {
              const sp = T.decideSpecial(g); if (sp) sc += BON[sp];
              for (const [y, x] of g.cells.values()) {
                sc += 1; const t = G.grid[y][x];
                if (need.has(t.tile.k)) sc += 2;
                if (t.ice && bgoal.has('ice')) sc += 3;
                sc += y / G.rows * .4;
                if (rockTop[x] !== undefined && rockTop[x] < y) sc += 6;
                for (const [a, bb] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const n = at(y + a, x + bb); if (n && n.b && bgoal.has(n.b.t) && !hit.has((y + a) * 99 + x + bb)) { hit.add((y + a) * 99 + x + bb); sc += 3; } }
              }
            }
            consider(sc, ['swap', r, c, r + dr, c + dc]);
          }
          [A.tile, B.tile] = [B.tile, A.tile];
        }
      }
      return best;
    }
    const res = {};
    for (let n = 1; n <= T.LEVEL_COUNT; n++) {
      if (ONLY && !ONLY.includes(n)) continue;
      const t0 = performance.now();
      const used = []; let fails = 0;
      for (let k = 0; k < RUNS; k++) {
        T.startLevel(n); await new Promise(r => setTimeout(r, 0)); const G = T.G; if (BUDGET) G.moves = BUDGET;
        let acts = 0;
        while (!G.over && acts < 999) {
          const m = botMove(); if (!m) break;
          acts++;
          if (m[0] === 'tap') await T.tapSpecial(m[1], m[2]); else await T.trySwap(m[1], m[2], m[3], m[4]);
        }
        if (G.goals.every(g => g.left <= 0)) used.push(acts); else fails++;
      }
      used.sort((a, b) => a - b);
      const q = f => used.length ? used[Math.min(used.length - 1, Math.floor(f * used.length))] : null;
      res[n] = { ms: Math.round(performance.now() - t0), p50: q(.5), p75: q(.75), p90: q(.9), fails, win: Math.round(used.length / RUNS * 100), cur: T.G.def.m, hard: !!T.G.def.hard, used };
    }
    return res;
  }, { RUNS, BUDGET, ONLY });
  fs.writeFileSync(require('path').join(require('os').tmpdir(), 'crown-quest-calib.json'), JSON.stringify(out, null, 1));
  for (const [n, r] of Object.entries(out)) console.log(BUDGET
    ? `${n.padStart(2)}  (${r.ms} ms)  moves ${String(r.cur).padStart(2)}  | needed p50 ${r.p50} p75 ${r.p75} p90 ${r.p90}${r.fails ? '  NOT WON ' + r.fails : ''}`
    : `${n.padStart(2)}  moves ${String(r.cur).padStart(2)}  win ${String(r.win).padStart(3)}%${r.hard ? '  HARD' : ''}`);
  await b.close();
})();
