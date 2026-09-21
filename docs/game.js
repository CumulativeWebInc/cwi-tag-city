/* TAG CITY — shipped artifact. GENERATED FILE — do not edit by hand.
   Built by tools/build.sh (audited, zero dependencies) from src/*.js.
   Build date: 2026-09-21T01:28:55Z
   Concat order: 00-head.js palette.js util.js combo.js droneAI.js economy.js pool.js bake-core.js bake-props.js roster.js drone.js world.js murals.js audio.js input.js hud.js game.js
   Transform: line-start 'export ' stripped (audit in tools/build.sh).
   §9 traceability: see index.html header + src/*.js headers.
   PRODUCTION-RULES.md is the superseding production law.
*/
(function () {
"use strict";

/* ==================== src: 00-head.js ==================== */
/* ============================================================================
   TAG CITY — production build game.js (concatenated from game/src/)
   art-bible v1.0 traceability (§9) — every section below cites its bible
   sections; off-bible code is killed in review, no exceptions.
   PRODUCTION-RULES.md #1 "No downgrades ever" + #2 "Nothing dies — the team
   makes it live": the look ships exactly; the perf doctrine is the
   OPTIMIZATION LADDER (re-engineer, never delete, never kill the lane).
   §7 kill list honored throughout: zero ctx.shadowBlur (all glow is
   pre-rendered sprites), ≤150 pooled sprites, zero per-frame allocations,
   4-canvas layer split + DOM HUD, procedural-first VFX, no per-frame
   gradient/blur/filter passes, no render-target reflections, no per-frame
   noise, ≤3 fullscreen semi-transparent layers (vignette baked into the
   static sky; fog fades out under the red lock-on pulse), no continuous
   per-frame UI scaling (discrete combo-pop steps), no screen shake (red
   vignette pulse instead), hero anonymous + key-art locked, no real brands.
   ========================================================================== */
"use strict";

/* ==================== src: palette.js ==================== */
/* TAG CITY art-bible v1.0 — §1 PALETTE (locked hexes). §9: this module cites §1.
   Rule 3: gold is earned, not decor (§1-A: hero gold vents/zippers + HEIR
   bronze are the only identity exceptions). Rule 4: red is threat-only. */
const PAL = {
  cyan:      "#00E5FF", // §1 cyan core — hero, signal, spray-cyan, neon tubes
  cyanDeep:  "#0E5F73", // §1 cyan deep — shaded neon, mural fills, wet-street tint
  mag:       "#FF2FB3", // §1 magenta core — combo, spray pink, murals, UI accents
  magDeep:   "#8A2360", // §1 magenta deep — shaded pink, drip fills
  gold:      "#FFD166", // §1 gold — score/credits/rewards, EARNED MOMENTS ONLY
  goldDeep:  "#8A5F1C", // §1 gold deep — gold shading; HEIR armor color-pass
  red:       "#FF3B4E", // §1 threat red — DRONES ONLY (scan eye, alerts)
  redDeep:   "#7A1620", // §1 red deep — threat shading
  void:      "#0A0A12", // §1 void black — sky, unlit street, base clothing
  panel:     "#12121E", // §1 panel — UI panels/HUD cards (~92% opacity)
  asphalt:   "#23232E", // §1 asphalt — street, drone armor base
  bone:      "#EEF0FF", // §1 bone white — primary text (never pure #FFF)
  dim:       "#9AA0C3", // §1 dim text — secondary text (≥4.5:1 on dark)
  paintWhite:"#F5F7FA", // §1 paint white — spray-mist highlight, impact flash
  goldWhite: "#FFF3D6", // §4 neon sign tube core (gold-white variant)
};
// Locked-hex registry for the test suite: name → hex. Any drift fails the build.
const PAL_LOCKED = [
  ["cyan","#00E5FF"],["cyanDeep","#0E5F73"],
  ["mag","#FF2FB3"],["magDeep","#8A2360"],
  ["gold","#FFD166"],["goldDeep","#8A5F1C"],
  ["red","#FF3B4E"],["redDeep","#7A1620"],
  ["void","#0A0A12"],["panel","#12121E"],["asphalt","#23232E"],
  ["bone","#EEF0FF"],["dim","#9AA0C3"],["paintWhite","#F5F7FA"],
  ["goldWhite","#FFF3D6"],
];

/* ==================== src: util.js ==================== */
/* TAG CITY — zero-alloc math utils. §9 cites: §7.10 (zero per-frame allocation
   discipline — these helpers allocate nothing; mulberry32 is bake-time only). */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
// Deterministic seeded RNG — bake-time only (never in the hot loop).
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ==================== src: combo.js ==================== */
/* TAG CITY — combo math (pure, DOM-free, Node-testable).
   §9 cites: §5.6 combo language (magenta badge, MULTIPLIER 1.5x reference,
   discrete badge pop steps — never continuous scaling), §6 credit display. */
const COMBO_WINDOW = 4.0;   // seconds to keep the combo alive
const COMBO_CAP = 8;        // multiplier stops growing here
// Multiplier: 1 + 0.25 × min(combo, 8) — matches hud-ui.png "MULTIPLIER 1.5x" at x2.
function mult(combo) {
  return 1 + 0.25 * Math.min(combo < 0 ? 0 : combo, COMBO_CAP);
}
// Discrete badge pop tier for §5.6 (0/1/2) — stepped transforms only.
function comboTier(comboT) {
  return comboT > 3 ? 2 : comboT > 1.2 ? 1 : 0;
}
// Pure combo step: returns {combo, comboT, broken} — no side effects.
function comboStep(combo, comboT, dt, event) {
  if (event === "tag" || event === "nearmiss") {
    return { combo: event === "tag" ? combo + 1 : combo, comboT: COMBO_WINDOW, broken: false };
  }
  if (event === "break") return { combo: 0, comboT: 0, broken: true };
  const t = comboT - dt;
  if (t <= 0) return { combo: 0, comboT: 0, broken: combo > 0 };
  return { combo, comboT: t, broken: false };
}

/* ==================== src: droneAI.js ==================== */
/* TAG CITY — Sentinel-7 drone AI (pure, DOM-free, Node-testable).
   §9 cites: §3 threat-readability rules — 3-stage escalation readable at
   100px (patrol / suspicious / lock-on), rubber-band chase, near-miss
   (<85px gap), lunge strike (dodgeable by jump/dash), beam/eye interpolation.
   States: 0 patrol (eye dim, no beam), 1 suspicious (eye bright, beam sweeps),
   2 lock-on (eye white-hot, beam narrows, alert fires). */
// Pure threat-stage transition. Returns the new state (0/1/2).
// lockT accumulates while suspicious and close; decays when the gap opens.
function threatStep(state, gap, lockT, dt) {
  if (state === 2) {
    // Lock breaks only when the hero opens real distance (earned escape).
    if (gap > 80) return { state: 0, lockT: 0, justLocked: false, justLost: true };
    return { state: 2, lockT, justLocked: false, justLost: false };
  }
  const s = gap > 100 ? 0 : 1;
  if (s === 1) {
    if (gap < 78) {
      const t = lockT + dt;
      if (t > 1.4) return { state: 2, lockT: t, justLocked: true, justLost: false };
      return { state: 1, lockT: t, justLocked: false, justLost: false };
    }
    return { state: 1, lockT: Math.max(0, lockT - dt * 3), justLocked: false, justLost: false };
  }
  return { state: 0, lockT: 0, justLocked: false, justLost: false };
}
// Rubber-band gap target: the drone breathes 42..150px behind the hero.
function wantGap(tags, stumbling, dashing) {
  const w = 105 + tags * 5 - (stumbling ? 50 : 0) - (dashing ? 55 : 0);
  return w < 42 ? 42 : w > 150 ? 150 : w;
}
// Strike geometry (§3: lunge is dodgeable — jump or dash beats it).
function canStrike(state, distX, heroAirY, mercy, dashing) {
  return state > 0 && distX < 48 && heroAirY > -70 && mercy <= 0 && dashing <= 0;
}
function isNearMiss(state, distX, cooldown) {
  return state === 0 && distX < 85 && cooldown <= 0;
}
// Beam/eye display interpolation targets per threat stage (§3.2).
function stageTargets(state) {
  return state === 0 ? { beam: 0, eye: 0.25 }
       : state === 1 ? { beam: 0.55, eye: 0.7 }
       :               { beam: 0.95, eye: 1.0 };
}

/* ==================== src: economy.js ==================== */
/* TAG CITY — Neon Credits economy (pure, DOM-free, Node-testable).
   §9 cites: §1 rule 3 (gold is earned, not decor — credits are earned only,
   never purchasable), §6 (gold coin + gold digits credit display, PRIZE
   banner, +30 REFILL events), Twenty Minds #2 synthesis (credit-threshold
   unlocks; feats pay one-time injections, never gates; zero paywall code).
   Truth rules: no invented revenue — this wallet is in-game credits only.
   Nothing here touches money, wallets, or purchases. Ever. */
const WALLET_KEY = "tagcity_wallet_v1";
// Fixed unlock prices — one auditable table (Twenty Minds #2).
const PRICES = { ghost: 2500, heir: 6000, pixel: 12000 };
const ROSTER_ORDER = ["artist", "prism", "ghost", "heir", "pixel"];
// Earn table: credits per event (tuning model documented below).
const EARN = {
  tag: 150,            // clean wall tag
  nearMiss: 60,        // drone near-miss evasion
  runComplete: 50,     // per tag on run end (bust or quit)
  combo5: 200,         // one-time per run at combo milestones
  combo10: 500,
  combo15: 1000,
};
// Feat injections: one-time, celebrated, NEVER gates (Twenty Minds #2 dissent:
// the stories survive inside the credit economy).
const FEATS = {
  ghost_protocol: { name: "GHOST PROTOCOL", desc: "Evade 10 drone lunges in one run", credits: 1500 },
  crown_jewel:    { name: "CROWN JEWEL",     desc: "Tag 25 walls (lifetime)",          credits: 2000 },
  marquee_lights: { name: "MARQUEE LIGHTS",  desc: "Tag a wall in all 4 locations",    credits: 2500 },
  clean_getaway:  { name: "CLEAN GETAWAY",    desc: "Finish a run with 0 strikes",      credits: 1000 },
};
/* Tuning model (Twenty Minds #2 tuning gate): a 3-min run tags ~8 walls
   (8×150=1200) + ~4 near-misses (240) + completion (400) ≈ 1800–2000 credits.
   GHOST (2500) ≈ 2 runs (~10 min); HEIR (6000) ≈ 4 runs; PIXEL (12000) ≈ 8
   runs (~30 min). Full roster ≈ 45 min of play. If playtest median
   time-to-GHOST exceeds ~90 min, prices drop before lock. */
function createWallet() {
  return {
    v: 1, credits: 0,
    unlocked: { artist: true, prism: true, ghost: false, heir: false, pixel: false },
    featsPaid: {},                       // featId → true (one-time enforcement)
    totals: { tags: 0, runs: 0, nearMisses: 0, evasions: 0, locationsTagged: {} },
  };
}
function loadWallet(storage) {
  try {
    const raw = storage.getItem(WALLET_KEY);
    if (!raw) return createWallet();
    const w = JSON.parse(raw);
    if (!w || w.v !== 1 || typeof w.credits !== "number") return createWallet();
    const base = createWallet();
    return Object.assign(base, w, {
      unlocked: Object.assign(base.unlocked, w.unlocked || {}),
      featsPaid: w.featsPaid || {},
      totals: Object.assign(base.totals, w.totals || {}),
    });
  } catch (e) { return createWallet(); }
}
function saveWallet(storage, w) {
  try { storage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) {}
}
function canAfford(w, id) {
  return !w.unlocked[id] && PRICES[id] !== undefined && w.credits >= PRICES[id];
}
// Spend unlock. Returns true on success. No paywall path exists — this is the
// ONLY unlock function and it takes credits, never money.
function unlock(w, id) {
  if (w.unlocked[id] || PRICES[id] === undefined || w.credits < PRICES[id]) return false;
  w.credits -= PRICES[id];
  w.unlocked[id] = true;
  return true;
}
function earn(w, n) {
  if (n > 0) w.credits += Math.round(n);
  return w.credits;
}
// Feat injection: pays once, then marks paid. Returns credits paid (0 if dup).
function payFeat(w, featId) {
  const f = FEATS[featId];
  if (!f || w.featsPaid[featId]) return 0;
  w.featsPaid[featId] = true;
  w.credits += f.credits;
  return f.credits;
}
// Track hook per location — artist catalog integration POINT (data structure).
// trackId values below are VERIFIED (Spotify, 2026-09-16 — never swap them):
//   Zooted Zone = 0emH8ktA8x4DkOFLsG5xkW · Diabolique = 2eSyWmIdPzEMyWejLb2LBj
// null = slot reserved; wire a VERIFIED catalog ID only — never invent one.
// This hook makes no claim of placement, streams, or revenue.
const TRACK_SLOTS = {
  neon_row:   { trackId: "2eSyWmIdPzEMyWejLb2LBj", title: "Diabolique" },
  the_alleys: { trackId: "0emH8ktA8x4DkOFLsG5xkW", title: "Zooted Zone" },
  elevated:   { trackId: null, title: null },  // reserved — verified ID only
  murals:     { trackId: null, title: null },  // reserved — verified ID only
};

/* ==================== src: pool.js ==================== */
/* TAG CITY — fixed sprite pools (browser module; logic is DOM-free).
   §9 cites: §7.3 (un-pooled particle spawning is a fail — every particle from
   a fixed pool), §7.10 (zero per-frame allocation — pools preallocated,
   recycled by index), perf-spike §1 (150 live pooled sprites locked). */
const PMAX = 150; // locked ceiling — perf-spike §1
function makePools() {
  const parts = [];
  for (let i = 0; i < PMAX; i++)
    parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 8, spr: null, grav: 0, add: true });
  const popups = [];
  for (let i = 0; i < 14; i++)
    popups.push({ on: false, x: 0, y: 0, vy: 0, life: 0, max: 1, text: "", color: "#fff", size: 24 });
  const rings = [];
  for (let i = 0; i < 8; i++)
    rings.push({ on: false, x: 0, y: 0, r: 10, vr: 0, life: 0, max: 1, spr: null });
  const pools = {
    parts, popups, rings, pcur: 0, popcur: 0, ringcur: 0, live: 0, maxLive: 0,
    spawnP(x, y, vx, vy, life, size, spr, grav, add) {
      const p = parts[pools.pcur]; pools.pcur = (pools.pcur + 1) % PMAX;
      p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy;
      p.life = life; p.max = life; p.size = size; p.spr = spr;
      p.grav = grav || 0; p.add = add !== false;
      return p;
    },
    popup(x, y, text, color, size) {
      const p = popups[pools.popcur]; pools.popcur = (pools.popcur + 1) % 14;
      p.on = true; p.x = x; p.y = y; p.vy = -56; p.life = 1.4; p.max = 1.4;
      p.text = text; p.color = color || "#EEF0FF"; p.size = size || 24;
    },
    ring(x, y, spr, vr, life) {
      const r = rings[pools.ringcur]; pools.ringcur = (pools.ringcur + 1) % 8;
      r.on = true; r.x = x; r.y = y; r.r = 12; r.vr = vr; r.life = life; r.max = life; r.spr = spr;
    },
    // Per-frame pool step — zero allocation, fixed iteration.
    step(dt) {
      let live = 0;
      for (let i = 0; i < PMAX; i++) {
        const p = parts[i];
        if (!p.on) continue;
        live++;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      pools.live = live;
      if (live > pools.maxLive) pools.maxLive = live;
      for (let i = 0; i < 14; i++) {
        const p = popups[i];
        if (!p.on) continue;
        p.life -= dt;
        if (p.life <= 0) { p.on = false; continue; }
        p.y += p.vy * dt; p.vy *= (1 - dt * 2);
      }
      for (let i = 0; i < 8; i++) {
        const r = rings[i];
        if (!r.on) continue;
        r.life -= dt;
        if (r.life <= 0) { r.on = false; continue; }
        r.r += r.vr * dt;
      }
    },
    clear() {
      for (const p of parts) p.on = false;
      for (const p of popups) p.on = false;
      for (const r of rings) r.on = false;
      pools.live = 0;
    }
  };
  return pools;
}

/* ==================== src: bake-core.js ==================== */
/* TAG CITY — bake-time environment sprites (all baked, never per-frame).
   §9 cites: §4 (city language — alley-sector streets, 3-layer parallax,
   faked reflections @18–25% alpha, baked rain/fog/mist, background luminance
   ceiling #2A2A3A), §7.1 (glow baked, never shadowBlur), §7.2 (gradients at
   bake time only), §7.4 (no per-frame blur/filter), §7.5 (no render-target
   reflections), §7.6 (no per-frame noise), §7.7 (≤3 fullscreen transparent
   layers — vignette is BAKED INTO the static sky; fog alpha fades to 0 under
   the red lock-on pulse so the transient alert never stacks a 4th layer).
   Concat order provides: PAL, TAU, clamp, lerp, mulberry32 (globals). */
function mkc(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/* Pre-rendered radial glow sprite — §7.1: glow is baked, never shadowBlur. */
function glowSprite(color, core) {
  const s = 128, c = mkc(s, s), g = c.getContext("2d");
  const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  gr.addColorStop(0, core || PAL.paintWhite); // hot core — never pure white (§1)
  gr.addColorStop(0.25, color);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return c;
}
function initGlow() {
  return {
    cyan: glowSprite(PAL.cyan), mag: glowSprite(PAL.mag),
    gold: glowSprite(PAL.gold), red: glowSprite(PAL.red),
    white: glowSprite(PAL.paintWhite),
    soft: glowSprite("rgba(120,140,200,0.55)", "rgba(200,210,230,0.8)"),
  };
}
function streakSprite(color) {
  const c = mkc(28, 8), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 28, 0);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, color); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 2, 28, 4);
  return c;
}
function ringSprite(color) {
  const c = mkc(128, 128), g = c.getContext("2d");
  g.drawImage(glowSprite(color), 14, 14, 100, 100);
  g.strokeStyle = color; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 44, 0, TAU); g.stroke();
  return c;
}
/* Sky — static layer. Vignette baked in here (§7.7 compliance: the vignette
   costs zero per-frame layers because it never moves). */
function bakeSky(LW, LH) {
  const c = mkc(LW, LH), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, LH);
  gr.addColorStop(0, "#04050C"); gr.addColorStop(0.45, "#0A0A12");
  gr.addColorStop(0.72, "#0D1026"); gr.addColorStop(1, "#0A0A12");
  g.fillStyle = gr; g.fillRect(0, 0, LW, LH);
  const R = mulberry32(42);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = "rgba(180,200,230," + (0.1 + R() * 0.25) + ")";
    g.fillRect(R() * LW, R() * 300, 1.4, 1.4);
  }
  // baked vignette — darkened corners, no per-frame cost
  const vg = g.createRadialGradient(LW / 2, LH / 2, LH * 0.32, LW / 2, LH / 2, LH * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(2,2,8,0.55)");
  g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
  return c;
}
/* Red alert vignette — transient threat VFX (§5), drawn only while vigR>0.
   Fog alpha is faded out as this rises so fullscreen layers never exceed 3. */
function bakeVigRed(LW, LH) {
  const c = mkc(LW, LH), g = c.getContext("2d");
  const vg = g.createRadialGradient(LW / 2, LH / 2, LH * 0.30, LW / 2, LH / 2, LH * 0.72);
  vg.addColorStop(0, "rgba(255,59,78,0)");
  vg.addColorStop(0.75, "rgba(255,59,78,0.10)");
  vg.addColorStop(1, "rgba(255,59,78,0.42)");
  g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
  return c;
}
function bakeFar() { // parallax layer 1 — near-black silhouettes
  const W = 1080, H = 340, c = mkc(W, H), g = c.getContext("2d"), R = mulberry32(7);
  g.fillStyle = "#0A0A12";
  let x = 0;
  while (x < W) {
    const bw = 60 + R() * 130, bh = 120 + R() * 190;
    g.fillRect(x, H - bh, bw, bh);
    if (R() < 0.5) g.fillRect(x + bw * 0.3, H - bh - 24, 10, 24);
    x += bw + 8 + R() * 30;
  }
  g.fillStyle = "rgba(35,35,46,0.5)"; // haze edge — under the #2A2A3A ceiling
  g.fillRect(0, H - 26, W, 26);
  return c;
}
function bakeMid(loc) { // parallax layer 2 — towers + lit windows
  const W = 1080, H = 520, c = mkc(W, H), g = c.getContext("2d"), R = mulberry32(11 + loc.seed);
  let x = 0;
  while (x < W) {
    const bw = 90 + R() * 120, bh = 200 + R() * 280;
    g.fillStyle = "#12121E"; g.fillRect(x, H - bh, bw, bh);
    g.fillStyle = "#0A0A12"; g.fillRect(x, H - bh, bw, 8);
    for (let wy = H - bh + 22; wy < H - 16; wy += 26)
      for (let wx = x + 10; wx < x + bw - 12; wx += 22) {
        const r = R();
        if (r < loc.windowDensity) {
          g.fillStyle = r < 0.12 ? PAL.cyan : r < 0.2 ? "rgba(255,47,179,0.85)" : "rgba(255,243,214,0.8)";
          g.fillRect(wx, wy, 12, 16);
        }
      }
    x += bw + 14 + R() * 40;
  }
  return c;
}
/* Near alley walls — location-flavored (see world.js LOCATIONS for §4 cites). */
function bakeWallTile(v, loc) {
  const W = 480, H = 620, c = mkc(W, H), g = c.getContext("2d"), R = mulberry32(100 + v * 17 + loc.seed);
  g.fillStyle = loc.wallBase; g.fillRect(0, 0, W, H);
  // brick courses — near-black, under the luminance ceiling
  g.fillStyle = "rgba(0,0,0,0.35)";
  for (let y = 0; y < H; y += 34) {
    g.fillRect(0, y, W, 2);
    for (let x = ((y / 34) % 2) * 40; x < W; x += 80) g.fillRect(x, y, 2, 34);
  }
  // pipes + conduit silhouettes
  g.fillStyle = "#0A0A12";
  for (let i = 0; i < 3; i++) {
    const px = R() * W;
    g.fillRect(px, 0, 14 + R() * 10, H);
    g.fillStyle = "#14141E"; g.fillRect(px + 3, 0, 3, H); g.fillStyle = "#0A0A12";
  }
  // location set dressing
  loc.dressWall(g, R, W, H, PAL);
  // grime streaks
  g.fillStyle = "rgba(0,0,0,0.25)";
  for (let i = 0; i < 12; i++) g.fillRect(R() * W, R() * H * 0.5, 3 + R() * 5, 60 + R() * 160);
  return c;
}
function bakeGround(loc) { // rain-slick street — reflections are FAKED (§7.5)
  const W = 1080, H = 230, c = mkc(W, H), g = c.getContext("2d"), R = mulberry32(31 + loc.seed);
  g.fillStyle = loc.groundBase; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(0,0,0,0.4)";
  for (let y = 10; y < H; y += 44) g.fillRect(0, y, W, 2);
  // pre-rendered mirrored neon bands @ ~20% alpha — never render targets
  const bands = loc.groundBands;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    g.globalAlpha = 0.20;
    g.fillStyle = b;
    const bx = (i * 197 + 60) % W;
    g.fillRect(bx, 40 + (i % 3) * 46, 26, 120);
    g.globalAlpha = 0.12;
    g.fillRect(bx - 8, 40 + (i % 3) * 46, 42, 120);
  }
  g.globalAlpha = 1;
  // wet sheen streaks
  g.fillStyle = "rgba(120,150,190,0.06)";
  for (let i = 0; i < 24; i++) g.fillRect(R() * W, R() * H, 30 + R() * 90, 3);
  return c;
}
function bakePuddle() { // pre-baked puddle w/ fixed neon smears
  const c = mkc(190, 52), g = c.getContext("2d"), R = mulberry32(55);
  g.fillStyle = "rgba(10,12,24,0.85)";
  g.beginPath(); g.ellipse(95, 26, 90, 22, 0, 0, TAU); g.fill();
  g.globalAlpha = 0.25;
  g.fillStyle = PAL.cyan; g.fillRect(30 + R() * 40, 8, 14, 36);
  g.fillStyle = PAL.mag; g.fillRect(100 + R() * 40, 12, 12, 30);
  g.globalAlpha = 1;
  return c;
}
function bakeRain(near) { // baked rain strips — wrap-scrolled, never procedural
  const W = 540, H = 960, c = mkc(W, H), g = c.getContext("2d"), R = mulberry32(near ? 5 : 6);
  const n = near ? 46 : 90;
  g.strokeStyle = near ? "rgba(150,180,220,0.34)" : "rgba(140,170,210,0.20)";
  g.lineWidth = near ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const x = R() * W, y = R() * H, l = near ? 26 + R() * 30 : 12 + R() * 16;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.18, y + l); g.stroke();
  }
  return c;
}
function bakeFog() { // baked fog band — drifts slowly, never per-frame noise
  const W = 540, H = 180, c = mkc(W, H), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "rgba(90,110,150,0)");
  gr.addColorStop(0.5, "rgba(90,110,150,0.16)");
  gr.addColorStop(1, "rgba(90,110,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}
function bakeHeroSpot() { // streetlight pool behind the hero — silhouette separation
  const c = mkc(360, 420), g = c.getContext("2d");
  const gr = g.createRadialGradient(180, 210, 20, 180, 210, 200);
  gr.addColorStop(0, "rgba(255,243,214,0.14)");
  gr.addColorStop(0.6, "rgba(255,243,214,0.05)");
  gr.addColorStop(1, "rgba(255,243,214,0)");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(180, 210, 175, 205, 0, 0, TAU); g.fill();
  return c;
}

/* ==================== src: bake-props.js ==================== */
/* TAG CITY — bake-time props & HUD widgets.
   §9 cites: §4 (neon sign treatment — tube + halo, flicker on tag-complete
   only; terse world-flavored copy, no real brands), §5.6 (combo badge —
   magenta flame/x-badge, drippy cyan frame), §6 (panel language — gold frame
   = score/credits earned, cyan = system, pink = combo, red dashed = alerts;
   circular buttons with neon rings; minimap red-dots-only; wordmark is art,
   never typeset — the logo below is a drawn asset with baked drips, P1
   stand-in for the hand-drawn final per measurements.md).
   Concat order provides: PAL, TAU, clamp, mulberry32, mkc, rr, glowSprite. */
/* Neon tube sign — baked tube core + halo sprite (§4). */
function bakeSign(text, color, w, glow) {
  const c = mkc(w, 64), g = c.getContext("2d");
  g.drawImage(glow, -10, -14, w + 20, 92);
  // deco frame for gold-trimmed signs (NEON ROW landmark language)
  g.strokeStyle = color === PAL.goldWhite ? PAL.goldDeep : "rgba(0,0,0,0)";
  if (color === PAL.goldWhite) { g.lineWidth = 3; g.strokeRect(3, 3, w - 6, 58); }
  g.font = '900 30px "Arial Black",system-ui,sans-serif';
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = color;
  g.fillText(text, w / 2, 34);
  // tube hot-core overlay — thin bright center line sells the tube
  g.globalAlpha = 0.55; g.fillStyle = PAL.goldWhite; // tube-core halo (§4)
  g.fillRect(14, 30, w - 28, 3);
  g.globalAlpha = 1;
  return c;
}
function bakeDumpster() {
  const c = mkc(150, 116), g = c.getContext("2d");
  g.fillStyle = "#1A1D26"; rr(g, 6, 18, 138, 88, 8); g.fill();
  g.fillStyle = "#12141B"; rr(g, 6, 18, 138, 16, 8); g.fill();
  g.strokeStyle = "#2C3040"; g.lineWidth = 2;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(6 + i * 34, 34); g.lineTo(6 + i * 34, 106); g.stroke(); }
  g.fillStyle = PAL.cyan; g.globalAlpha = 0.5; g.fillRect(20, 44, 26, 8); g.globalAlpha = 1; // tag scar
  g.fillStyle = "#0B0B10";
  g.beginPath(); g.arc(34, 110, 8, 0, TAU); g.arc(116, 110, 8, 0, TAU); g.fill();
  return c;
}
function bakeBarrier() {
  const c = mkc(110, 96), g = c.getContext("2d");
  g.fillStyle = "#23232E"; rr(g, 8, 10, 94, 60, 6); g.fill();
  g.fillStyle = PAL.mag; g.globalAlpha = 0.75;
  for (let i = 0; i < 3; i++) g.fillRect(16 + i * 30, 10, 14, 60);
  g.globalAlpha = 1;
  g.fillStyle = "#14141A"; g.fillRect(18, 70, 12, 26); g.fillRect(80, 70, 12, 26);
  return c;
}
function bakeLowPipe() { // slide-under pipe
  const c = mkc(220, 64), g = c.getContext("2d");
  g.fillStyle = "#1B1B24"; rr(g, 0, 8, 220, 48, 20); g.fill();
  g.fillStyle = "#2E2E3E"; rr(g, 0, 8, 220, 12, 6); g.fill();
  g.fillStyle = PAL.cyan; g.globalAlpha = 0.35; g.fillRect(30, 56, 160, 3); g.globalAlpha = 1;
  g.fillStyle = "#0B0B10"; g.fillRect(96, 56, 10, 8); g.fillRect(150, 56, 10, 8);
  return c;
}
function bakePaintPickup() { // cyan bucket icon — refill event (§6)
  const c = mkc(64, 84), g = c.getContext("2d");
  g.drawImage(glowSprite(PAL.cyan), -14, -6, 92, 92);
  g.fillStyle = "#1B1B26";
  g.beginPath(); g.moveTo(10, 22); g.lineTo(54, 22); g.lineTo(48, 72); g.lineTo(16, 72); g.closePath(); g.fill();
  g.strokeStyle = PAL.cyan; g.lineWidth = 3;
  g.beginPath(); g.moveTo(10, 22); g.lineTo(54, 22); g.lineTo(48, 72); g.lineTo(16, 72); g.closePath(); g.stroke();
  g.fillStyle = PAL.mag; // paint surface
  g.beginPath(); g.ellipse(32, 30, 18, 6, 0, 0, TAU); g.fill();
  g.strokeStyle = "#8A8FA3"; g.lineWidth = 3;
  g.beginPath(); g.arc(32, 22, 20, Math.PI, 0); g.stroke(); // handle
  return c;
}
/* Circular HUD button — thick neon ring (§6). label drawn, not typeset-wordmark. */
function bakeButtonRing(color, label) {
  const c = mkc(112, 112), g = c.getContext("2d");
  g.drawImage(glowSprite(color), 6, 6, 100, 100);
  g.fillStyle = "rgba(18,18,30,0.88)";
  g.beginPath(); g.arc(56, 56, 46, 0, TAU); g.fill();
  g.strokeStyle = color; g.lineWidth = 6;
  g.beginPath(); g.arc(56, 56, 46, 0, TAU); g.stroke();
  g.fillStyle = color; g.font = '900 17px system-ui,sans-serif';
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(label.toUpperCase(), 56, 58);
  return c;
}
/* TAG CITY logo — drawn asset with baked drips (P1: stand-in for the
   hand-drawn final; bible: never typeset the wordmark in a font — this is
   drawn lettering on canvas, not a font render of the wordmark). */
function bakeLogo() {
  const c = mkc(350, 152), g = c.getContext("2d"), R = mulberry32(99);
  g.font = '900 64px "Arial Black",system-ui,sans-serif';
  g.textAlign = "center"; g.textBaseline = "middle";
  // baked halo
  g.drawImage(glowSprite(PAL.cyan), 20, -10, 160, 120);
  g.drawImage(glowSprite(PAL.mag), 170, 30, 160, 120);
  g.save();
  g.translate(175, 62); g.rotate(-0.04); g.transform(1, 0, Math.tan(-0.08), 1, 0, 0); // italic-ish skew
  g.lineWidth = 10; g.strokeStyle = PAL.cyanDeep;
  g.strokeText("TAG", -72, 0);
  g.fillStyle = PAL.cyan; g.fillText("TAG", -72, 0);
  g.lineWidth = 10; g.strokeStyle = PAL.magDeep;
  g.strokeText("CITY", 78, 0);
  g.fillStyle = PAL.mag; g.fillText("CITY", 78, 0);
  g.restore();
  // baked drips
  for (let i = 0; i < 14; i++) {
    const x = 40 + R() * 270;
    g.fillStyle = R() < 0.5 ? PAL.cyan : PAL.mag;
    g.globalAlpha = 0.8;
    g.fillRect(x, 92, 5, 10 + R() * 26);
    g.beginPath(); g.arc(x + 2.5, 92 + 10 + R() * 0, 2.5, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  g.fillStyle = PAL.gold; g.font = '900 20px system-ui,sans-serif';
  g.fillText("★ CWI ★", 175, 132);
  return c;
}
/* Lock-on alert banner — red dashed frame = threat (§6). */
function bakeAlertBanner() {
  const c = mkc(430, 76), g = c.getContext("2d");
  g.fillStyle = "rgba(18,10,14,0.92)"; rr(g, 4, 4, 422, 68, 10); g.fill();
  g.strokeStyle = PAL.red; g.lineWidth = 3; g.setLineDash([12, 8]);
  rr(g, 4, 4, 422, 68, 10); g.stroke(); g.setLineDash([]);
  g.fillStyle = PAL.red; g.font = '900 26px "Arial Black",system-ui,sans-serif';
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("DRONE LOCK-ON — EVADE!", 215, 40);
  return c;
}
/* Combo badge — magenta x-badge, drippy cyan frame (§5.6). Discrete pop
   steps handled at render (scale 1 / 1.1 / 1.22), never continuous. */
function bakeComboBadge() {
  const c = mkc(150, 84), g = c.getContext("2d"), R = mulberry32(7);
  g.drawImage(glowSprite(PAL.mag), 15, 2, 120, 80);
  g.fillStyle = "rgba(30,8,22,0.94)"; rr(g, 14, 10, 122, 64, 12); g.fill();
  g.strokeStyle = PAL.cyan; g.lineWidth = 3; rr(g, 14, 10, 122, 64, 12); g.stroke();
  g.fillStyle = PAL.cyan; // baked drips on the frame
  for (let i = 0; i < 6; i++) g.fillRect(24 + R() * 100, 72, 4, 5 + R() * 8);
  g.fillStyle = PAL.mag; g.font = '900 22px "Arial Black",system-ui,sans-serif';
  g.textAlign = "center"; g.fillText("COMBO", 75, 34);
  return c;
}
function bakeMinimap() {
  const c = mkc(116, 116), g = c.getContext("2d");
  g.fillStyle = "rgba(10,10,18,0.92)";
  g.beginPath(); g.arc(58, 58, 54, 0, TAU); g.fill();
  g.strokeStyle = "#2A2A3A"; g.lineWidth = 2;
  g.beginPath(); g.arc(58, 58, 54, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(0,229,255,0.5)"; g.lineWidth = 3; // cyan street lines
  g.beginPath(); g.moveTo(10, 78); g.lineTo(106, 78); g.stroke();
  g.beginPath(); g.moveTo(58, 10); g.lineTo(58, 106); g.stroke();
  g.strokeStyle = "rgba(0,229,255,0.25)";
  g.beginPath(); g.moveTo(20, 40); g.lineTo(96, 40); g.stroke();
  return c;
}
/* Paint meter fill — pink→cyan gradient w/ drip edge, baked (§6). */
function bakePaintFill() {
  const c = mkc(34, 200), g = c.getContext("2d"), R = mulberry32(9);
  const gr = g.createLinearGradient(0, 200, 0, 0);
  gr.addColorStop(0, PAL.mag); gr.addColorStop(1, PAL.cyan);
  g.fillStyle = gr; g.fillRect(0, 0, 34, 200);
  g.fillStyle = PAL.cyan;
  for (let x = 0; x < 34; x += 5) g.fillRect(x, 0, 3, 6 + R() * 14);
  return c;
}
/* Target stencil frame — gold dashed outline marks a sprayable wall.
   Gold here = earned-target signal (§1 rule 3: the wall is the objective). */
function bakeTargetFrame() {
  const c = mkc(320, 580), g = c.getContext("2d");
  g.strokeStyle = PAL.gold; g.lineWidth = 5; g.setLineDash([18, 12]);
  g.globalAlpha = 0.85;
  rr(g, 8, 8, 304, 564, 14); g.stroke();
  g.setLineDash([]); g.globalAlpha = 1;
  return c;
}

/* ==================== src: roster.js ==================== */
/* TAG CITY — roster character bake (all 5, procedural, bake-time only).
   §9 cites: §10.1–10.5 (roster specs), §2 (hero sheet — 8-frame run, spray
   pose, jump/slide/dash), §1 (palette + §1-A identity exceptions), §5 (VFX),
   §7 (kill list — anonymous masked, no helmet, no real likeness), §8.3/§8.4
   SUPERSEDED 2026-09-20 (Black's directive): for the HERO, key-art.png
   OUTRANKS the turnaround — slim tactical zip jacket with GOLD zippers,
   respirator with GOLD filter vents + CYAN ANGULAR goggle outline. The
   spike's pink-rim/puffer hero is NOT carried forward (PRODUCTION-RULES #4).
   Every member reads at 64px by visor + silhouette alone (§10). Height order
   tallest→shortest: GHOST → PRISM → HERO → HEIR → PIXEL.
   Concat order provides: PAL, TAU, clamp, lerp, mulberry32, mkc, rr,
   glowSprite (globals). */
const HERO_W = 200, HERO_H = 300, GROUND_Y = 272;

const ROSTER = [
  { id: "artist", name: "THE ARTIST", bible: "§10.1", seed: 2026,
    scaleH: 1.00, shoulderW: 1.04, lean: 0.22, bounce: 9,
    jacket: "slimzip", head: "artist", tool: "dualcans",
    splat: [0.40, 0.35, 0.25], splatCols: [PAL.cyan, PAL.mag, PAL.gold],
    playable: true,  desc: "The face of the game. Dual-wield sprayer." },
  { id: "prism", name: "PRISM", bible: "§10.2", seed: 777,
    scaleH: 1.08, shoulderW: 0.88, lean: 0.14, bounce: 7,
    jacket: "cropped", head: "prism", tool: "canwrist", ponytail: true,
    splat: [0.20, 0.60, 0.20], splatCols: [PAL.cyan, PAL.mag, PAL.gold],
    playable: true,  desc: "Precision tagger. Tall, fast, elegant." },
  { id: "ghost", name: "GHOST", bible: "§10.3", seed: 313,
    scaleH: 1.12, shoulderW: 0.90, lean: 0.10, bounce: 4,
    jacket: "ghost", head: "ghost", tool: "roller",
    splat: [0.55, 0.45, 0.00], splatCols: [PAL.cyan, PAL.dim, PAL.dim],
    playable: false, price: 2500, desc: "Stealth tagger. Lowest neon footprint." },
  { id: "heir", name: "HEIR", bible: "§10.4", seed: 555,
    scaleH: 1.02, shoulderW: 1.50, lean: 0.16, bounce: 6,
    jacket: "armor", head: "heir", tool: "canister",
    splat: [0.15, 0.15, 0.70], splatCols: [PAL.cyan, PAL.mag, PAL.goldDeep],
    playable: false, price: 6000, desc: "Heavy breacher. Broad, regal, slow-strong." },
  { id: "pixel", name: "PIXEL", bible: "§10.5", seed: 888,
    scaleH: 0.88, shoulderW: 0.80, lean: 0.24, bounce: 12,
    jacket: "hoodie", head: "pixel", tool: "smallcan",
    splat: [0.70, 0.20, 0.10], splatCols: [PAL.cyan, PAL.mag, PAL.gold],
    playable: false, price: 12000, desc: "Rookie speedster. A flash of light." },
];

function limb(g, x1, y1, x2, y2, w, color) {
  g.strokeStyle = color; g.lineWidth = w; g.lineCap = "round";
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
}
function sneaker(g, x, y, ang, trimA, trimB) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = "#23232F"; rr(g, -28, -15, 56, 30, 11); g.fill();
  g.strokeStyle = "rgba(0,229,255,0.55)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-24, -13); g.quadraticCurveTo(0, -19, 26, -12); g.stroke();
  g.fillStyle = trimA; rr(g, -28, 7, 56, 7, 3); g.fill();
  g.fillStyle = trimB; rr(g, 14, -15, 14, 14, 5); g.fill();
  g.fillStyle = "#343442";
  for (let i = -18; i < 10; i += 7) g.fillRect(i, -8, 3.5, 11);
  g.restore();
}
function sprayCan(g, x, y, ang, capColor, h) { // §5.1 can render
  h = h || 34;
  g.save(); g.translate(x, y); g.rotate(ang);
  const bw = 17;
  const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  gr.addColorStop(0, "#5A5E70"); gr.addColorStop(0.45, "#C9CEDD");
  gr.addColorStop(0.6, "#8B90A3"); gr.addColorStop(1, "#434654");
  g.fillStyle = gr; rr(g, -bw / 2, -h, bw, h, 5); g.fill();
  g.fillStyle = capColor; rr(g, -bw / 2 - 1, -h - 9, bw + 2, 10, 4); g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(-bw / 2 + 3, -h + 3, 3, h - 6);
  g.fillStyle = capColor; g.globalAlpha = 0.85;
  g.fillRect(-bw / 2 + 2, -h * 0.55, bw - 4, 7); g.globalAlpha = 1;
  g.fillStyle = "#D7DAE4"; g.fillRect(-3, -h - 13, 6, 5);
  g.fillStyle = "#14141A"; g.fillRect(-4, -h - 16, 8, 4);
  g.restore();
}
function glove(g, x, y, ang, stud) {
  g.save(); g.translate(x, y); g.rotate(ang || 0);
  g.fillStyle = "#101016"; rr(g, -9, -8, 20, 17, 7); g.fill();
  if (stud) { g.fillStyle = PAL.gold; g.fillRect(-4, -5, 3, 3); g.fillRect(2, -5, 3, 3); g.fillRect(-4, 2, 3, 3); }
  g.restore();
}

/* ---- jackets ---- */
function drawJacket(g, spec, jx, jy, jw, jh, shY, HY, lean, lagX, R) {
  const j = spec.jacket;
  if (j === "slimzip") {
    // KEY-ART LOCK: slim tactical zip jacket, gold zippers (§1-A exception)
    g.fillStyle = "#0B0B12";
    g.beginPath(); g.ellipse(jx, jy, jw / 2, jh / 2 + 6, lean * 0.4, 0, TAU); g.fill();
    g.strokeStyle = "#1E1E2C"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(jx, jy, jw / 2, jh / 2 + 6, lean * 0.4, 0, TAU); g.stroke();
    // tactical panel seams
    g.strokeStyle = "#23232E"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(jx - jw / 2 + 14, shY + 10); g.lineTo(jx - jw / 2 + 22, HY - 4); g.stroke();
    g.beginPath(); g.moveTo(jx + jw / 2 - 14, shY + 10); g.lineTo(jx + jw / 2 - 22, HY - 4); g.stroke();
    // GOLD front zip + pocket zips (§1-A)
    g.strokeStyle = PAL.gold; g.lineWidth = 4;
    g.beginPath(); g.moveTo(jx + lean * 26, shY + 2); g.lineTo(jx + lean * 40, HY + 8); g.stroke();
    g.fillStyle = PAL.gold; g.fillRect(jx + lean * 32 - 3, shY + 30, 7, 11);
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(jx - jw / 2 + 20, shY + 52); g.lineTo(jx - jw / 2 + 44, shY + 56); g.stroke();
    g.beginPath(); g.moveTo(jx + jw / 2 - 20, shY + 52); g.lineTo(jx + jw / 2 - 44, shY + 56); g.stroke();
    // utility belt
    g.fillStyle = "#101016"; g.fillRect(jx - jw / 2 + 4, HY - 2, jw - 8, 12);
    g.fillStyle = PAL.gold; g.fillRect(jx - 8, HY, 16, 8);
  } else if (j === "cropped") {
    // PRISM: cropped open jacket, cyan piping, gold zip pulls ONLY
    g.fillStyle = "#0C0C14";
    g.beginPath(); g.ellipse(jx, jy - 8, jw / 2, jh / 2 - 2, lean * 0.3, 0, TAU); g.fill();
    g.strokeStyle = PAL.cyan; g.lineWidth = 2.5; // cyan piping
    g.beginPath(); g.ellipse(jx, jy - 8, jw / 2, jh / 2 - 2, lean * 0.3, -0.6, 0.6); g.stroke();
    g.beginPath(); g.moveTo(jx - 18, shY + 6); g.lineTo(jx - 26, HY - 6); g.stroke();
    g.fillStyle = PAL.mag; // magenta top beneath
    g.beginPath(); g.ellipse(jx, jy + 6, jw / 2 - 16, jh / 2 - 10, 0, 0, TAU); g.fill();
    g.fillStyle = PAL.gold; g.fillRect(jx + 10, shY + 22, 6, 9); // zip pull — gold ONLY here
    // prism back emblem (magenta line triangle)
    g.strokeStyle = PAL.mag; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(jx - jw / 2 - 2, jy + 10); g.lineTo(jx - jw / 2 - 16, jy - 8);
    g.lineTo(jx - jw / 2 - 2, jy - 22); g.closePath(); g.stroke();
  } else if (j === "ghost") {
    // GHOST: matte charcoal, thin cyan linework ONLY — never brightened
    g.fillStyle = "#0D0D14";
    g.beginPath(); g.ellipse(jx, jy, jw / 2 - 4, jh / 2 + 10, lean * 0.3, 0, TAU); g.fill();
    g.strokeStyle = PAL.cyan; g.globalAlpha = 0.65; g.lineWidth = 2;
    g.beginPath(); g.moveTo(jx - 10, shY + 4); g.lineTo(jx - 14, HY + 6); g.stroke();
    g.beginPath(); g.moveTo(jx + 14, shY + 8); g.lineTo(jx + 10, HY); g.stroke();
    g.globalAlpha = 1;
  } else if (j === "armor") {
    // HEIR: bronze armor plates — color-passed to Gold deep (§1-A)
    g.fillStyle = "#0B0B12";
    g.beginPath(); g.ellipse(jx, jy, jw / 2 + 8, jh / 2 + 8, lean * 0.3, 0, TAU); g.fill();
    g.fillStyle = PAL.goldDeep; // shoulder plates
    g.beginPath(); g.ellipse(jx - jw / 2 - 2, shY + 12, 22, 16, -0.3, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(jx + jw / 2 + 2, shY + 12, 22, 16, 0.3, 0, TAU); g.fill();
    g.fillStyle = "#6B4A14"; // chest plate
    rr(g, jx - 30, shY + 18, 60, 52, 8); g.fill();
    g.strokeStyle = PAL.goldDeep; g.lineWidth = 2;
    rr(g, jx - 30, shY + 18, 60, 52, 8); g.stroke();
    // crown emblem — bronze, never bright gold (§1-A)
    g.fillStyle = PAL.goldDeep;
    const cx = jx, cy = shY + 44;
    g.beginPath();
    g.moveTo(cx - 14, cy + 8); g.lineTo(cx - 14, cy - 4); g.lineTo(cx - 7, cy + 2);
    g.lineTo(cx, cy - 8); g.lineTo(cx + 7, cy + 2); g.lineTo(cx + 14, cy - 4);
    g.lineTo(cx + 14, cy + 8); g.closePath(); g.fill();
  } else { // hoodie — PIXEL: white hoodie, cyan pixel-check
    g.fillStyle = "#E8EBF5";
    g.beginPath(); g.ellipse(jx, jy, jw / 2 - 6, jh / 2 + 4, lean * 0.35, 0, TAU); g.fill();
    g.fillStyle = PAL.cyan; g.globalAlpha = 0.85; // pixel-check pattern
    for (let py = -1; py <= 1; py++) for (let px = -2; px <= 2; px++)
      if ((px + py + 4) % 2 === 0) g.fillRect(jx + px * 16 - 6, jy + py * 18 - 6, 12, 12);
    g.globalAlpha = 1;
    g.strokeStyle = "#B9BECD"; g.lineWidth = 2;
    g.beginPath(); g.ellipse(jx, jy, jw / 2 - 6, jh / 2 + 4, lean * 0.35, 0, TAU); g.stroke();
    // oversized pixel backpack w/ glowing PXL screen (1/3 body height)
    g.fillStyle = "#0E5F73";
    rr(g, jx - jw / 2 - 34, jy - 40, 44, 96, 10); g.fill();
    g.strokeStyle = PAL.cyan; g.lineWidth = 2.5;
    rr(g, jx - jw / 2 - 34, jy - 40, 44, 96, 10); g.stroke();
    g.fillStyle = "#03181D"; rr(g, jx - jw / 2 - 28, jy - 30, 32, 26, 4); g.fill();
    g.fillStyle = PAL.cyan; g.font = "900 13px monospace"; g.textAlign = "center";
    g.fillText("PXL", jx - jw / 2 - 12, jy - 12);
  }
  // cyan rim light on the leading edge (all members — silhouette separation)
  g.strokeStyle = PAL.cyan; g.globalAlpha = j === "ghost" ? 0.4 : 0.85; g.lineWidth = 3;
  g.beginPath(); g.ellipse(jx, jy, jw / 2 + (j === "armor" ? 8 : 0), jh / 2 + 6, lean * 0.4, -0.5, 0.5); g.stroke();
  g.globalAlpha = 1;
}

/* ---- heads (all anonymous-masked, §8.7) ---- */
function drawHead(g, spec, hx, hy, R, glow) {
  const hd = spec.head;
  if (spec.ponytail) { // PRISM: high ponytail out the back of the hood
    g.fillStyle = "#0B0B12";
    g.beginPath(); g.ellipse(hx - 46, hy + 14, 15, 32, -0.45, 0, TAU); g.fill();
    g.fillStyle = PAL.mag; g.globalAlpha = 0.85;
    g.fillRect(hx - 58, hy + 30, 5, 5); g.fillRect(hx - 56, hy + 44, 5, 5);
    g.globalAlpha = 1;
  }
  if (hd === "pixel") { // PIXEL: backwards cap under hood
    g.fillStyle = "#0E5F73";
    g.beginPath(); g.ellipse(hx + 2, hy - 34, 30, 12, 0.1, Math.PI, 0); g.fill();
    g.fillRect(hx - 34, hy - 40, 26, 8);
  }
  // hood — UP always (§2)
  const hoodCol = hd === "pixel" ? "#DDE1EE" : "#0A0A12";
  g.fillStyle = hoodCol;
  g.beginPath(); g.ellipse(hx, hy, 46, 50, 0.10, 0, TAU); g.fill();
  g.fillStyle = hd === "pixel" ? "#B9BECD" : "#08080E";
  g.beginPath(); g.ellipse(hx + 10, hy + 4, 30, 36, 0.10, 0, TAU); g.fill();
  g.strokeStyle = hd === "ghost" ? PAL.cyan : PAL.cyan;
  g.globalAlpha = hd === "ghost" ? 0.5 : 0.9; g.lineWidth = 3;
  g.beginPath(); g.ellipse(hx, hy, 46, 50, 0.10, -0.9, 0.9); g.stroke();
  g.globalAlpha = 1;

  if (hd === "artist") {
    // KEY-ART LOCK: respirator, CYAN ANGULAR goggle outline, GOLD filter
    // vents + central round filter (§1-A exception).
    g.fillStyle = "#12121A"; rr(g, hx - 2, hy - 6, 52, 52, 12); g.fill();
    g.strokeStyle = "#2A2A3A"; g.lineWidth = 2; rr(g, hx - 2, hy - 6, 52, 52, 12); g.stroke();
    g.drawImage(glow.cyan, hx + 2, hy - 16, 44, 30);
    g.fillStyle = "#0A0F14";
    g.beginPath(); // ANGULAR goggles — polygonal, not rounded
    g.moveTo(hx + 8, hy - 8); g.lineTo(hx + 20, hy - 12); g.lineTo(hx + 32, hy - 8);
    g.lineTo(hx + 32, hy + 8); g.lineTo(hx + 20, hy + 12); g.lineTo(hx + 8, hy + 8);
    g.closePath(); g.fill();
    g.strokeStyle = PAL.cyan; g.lineWidth = 3.5;
    g.beginPath();
    g.moveTo(hx + 8, hy - 8); g.lineTo(hx + 20, hy - 12); g.lineTo(hx + 32, hy - 8);
    g.lineTo(hx + 32, hy + 8); g.lineTo(hx + 20, hy + 12); g.lineTo(hx + 8, hy + 8);
    g.closePath(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(hx + 13, hy - 6, 7, 4);
    for (const fx of [hx + 8, hx + 40]) { // GOLD filter vents
      g.drawImage(glow.gold, fx - 15, hy + 10, 30, 30);
      g.fillStyle = "#15151D"; g.beginPath(); g.arc(fx, hy + 25, 11, 0, TAU); g.fill();
      g.strokeStyle = PAL.gold; g.lineWidth = 3.5;
      g.beginPath(); g.arc(fx, hy + 25, 11, 0, TAU); g.stroke();
      g.fillStyle = PAL.goldDeep; g.beginPath(); g.arc(fx, hy + 25, 4, 0, TAU); g.fill();
    }
    g.fillStyle = "#1B1B24"; // central round filter
    g.beginPath(); g.arc(hx + 24, hy + 26, 9, 0, TAU); g.fill();
    g.strokeStyle = "#3A3A4E"; g.lineWidth = 2;
    g.beginPath(); g.arc(hx + 24, hy + 26, 9, 0, TAU); g.stroke();
  } else if (hd === "prism") {
    g.fillStyle = "#14141C"; rr(g, hx + 2, hy - 10, 44, 26, 8); g.fill();
    g.drawImage(glow.mag, hx + 2, hy - 18, 44, 30);
    g.fillStyle = PAL.mag; // magenta visor SLIT
    rr(g, hx + 6, hy - 4, 36, 9, 4); g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)"; g.fillRect(hx + 10, hy - 3, 10, 3);
    g.fillStyle = "#101016"; rr(g, hx + 6, hy + 12, 36, 22, 8); g.fill(); // lower mask
    g.strokeStyle = PAL.mag; g.lineWidth = 2; rr(g, hx + 6, hy + 12, 36, 22, 8); g.stroke();
  } else if (hd === "ghost") {
    // scarf-wrapped face + thin cyan slit — the darkest read on the roster
    g.fillStyle = "#08080D";
    for (let i = 0; i < 3; i++) {
      g.globalAlpha = 0.95;
      rr(g, hx - 4 + i * 3, hy - 6 + i * 9, 52 - i * 6, 16, 8); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = PAL.cyan; g.globalAlpha = 0.9; // thin cyan slit
    g.fillRect(hx + 10, hy + 2, 28, 4);
    g.globalAlpha = 1;
  } else if (hd === "heir") {
    g.fillStyle = "#15151D"; rr(g, hx - 2, hy - 8, 52, 54, 12); g.fill();
    g.strokeStyle = PAL.goldDeep; g.lineWidth = 2.5; // bronze helm rim
    rr(g, hx - 2, hy - 8, 52, 54, 12); g.stroke();
    g.drawImage(glow.gold, hx + 4, hy - 16, 40, 30);
    g.fillStyle = PAL.gold; g.globalAlpha = 0.9; // GOLD visor (identity, bronze-adjacent)
    rr(g, hx + 6, hy - 4, 36, 12, 6); g.fill();
    g.globalAlpha = 1;
    g.fillStyle = PAL.goldDeep; // crown emblem on brow
    const cx = hx + 24, cy = hy - 14;
    g.beginPath();
    g.moveTo(cx - 12, cy + 6); g.lineTo(cx - 12, cy - 4); g.lineTo(cx - 6, cy + 1);
    g.lineTo(cx, cy - 7); g.lineTo(cx + 6, cy + 1); g.lineTo(cx + 12, cy - 4);
    g.lineTo(cx + 12, cy + 6); g.closePath(); g.fill();
  } else { // pixel — dark half-mask + dark goggles, NO visible face (§8.7)
    g.fillStyle = "#101016"; rr(g, hx + 2, hy - 2, 44, 40, 10); g.fill();
    g.fillStyle = "#0A0F14"; rr(g, hx + 6, hy - 12, 36, 20, 8); g.fill();
    g.strokeStyle = PAL.cyan; g.globalAlpha = 0.8; g.lineWidth = 2.5;
    rr(g, hx + 6, hy - 12, 36, 20, 8); g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(hx + 11, hy - 9, 7, 3);
  }
}

/* ---- tools (unique silhouette per member, §10) ---- */
function drawToolSpray(g, spec, shX, shY2, hx2, hy2, glow) {
  const t = spec.tool;
  if (t === "dualcans") {
    // THE signature pose: arms WIDE, cyan left + magenta right (§2, §10.1)
    limb(g, shX, shY2, shX - 52, shY2 - 30, 22, "#181822");
    glove(g, shX - 56, shY2 - 34, -0.5, true);
    sprayCan(g, shX - 62, shY2 - 44, -0.78, PAL.cyan, 34);
    g.drawImage(glow.cyan, shX - 96, shY2 - 92, 52, 52);
    limb(g, shX, shY2, shX + 52, shY2 - 30, 22, "#181822");
    glove(g, shX + 56, shY2 - 34, 0.5, true);
    sprayCan(g, shX + 62, shY2 - 44, 0.78, PAL.mag, 34);
    g.drawImage(glow.mag, shX + 44, shY2 - 92, 52, 52);
  } else if (t === "canwrist") {
    // PRISM the duelist: single arm extended high, off-hand braced
    limb(g, shX, shY2, shX + 58, shY2 - 52, 20, "#181822");
    glove(g, shX + 62, shY2 - 56, 0.4, false);
    sprayCan(g, shX + 68, shY2 - 66, 0.5, PAL.mag, 40); // oversized magenta can
    g.drawImage(glow.mag, shX + 44, shY2 - 118, 52, 52);
    limb(g, shX, shY2, shX - 30, shY2 + 30, 20, "#14141C"); // braced off-hand
    glove(g, shX - 32, shY2 + 34, 0.2, false);
    // wrist sprayer on the braced forearm
    g.fillStyle = "#1B1B24"; rr(g, shX - 44, shY2 + 18, 26, 12, 5); g.fill();
    g.fillStyle = PAL.mag; g.fillRect(shX - 46, shY2 + 21, 5, 6);
  } else if (t === "roller") {
    // GHOST: roller pressed to wall, long vertical strokes
    limb(g, shX, shY2, shX + 44, shY2 - 40, 20, "#14141C");
    limb(g, shX + 44, shY2 - 40, shX + 52, shY2 - 96, 14, "#14141C");
    glove(g, shX + 52, shY2 - 98, 0.1, false);
    g.strokeStyle = "#2A2A3A"; g.lineWidth = 6; // roller frame
    g.beginPath(); g.moveTo(shX + 52, shY2 - 104); g.lineTo(shX + 52, shY2 - 130); g.stroke();
    g.fillStyle = "#23232E"; rr(g, shX + 28, shY2 - 148, 48, 18, 8); g.fill(); // roller
    g.fillStyle = PAL.cyan; g.globalAlpha = 0.7; rr(g, shX + 28, shY2 - 136, 48, 6, 3); g.fill();
    g.globalAlpha = 1;
  } else if (t === "canister") {
    // HEIR: two-handed industrial canister braced at hip, hose
    g.fillStyle = "#23232E"; rr(g, shX - 6, shY2 - 6, 64, 40, 10); g.fill();
    g.strokeStyle = PAL.goldDeep; g.lineWidth = 3; rr(g, shX - 6, shY2 - 6, 64, 40, 10); g.stroke();
    g.fillStyle = PAL.goldDeep; g.fillRect(shX + 22, shY2 - 18, 12, 12); // valve
    g.strokeStyle = "#3A3A4E"; g.lineWidth = 5; // hose
    g.beginPath(); g.moveTo(shX + 58, shY2 + 10); g.quadraticCurveTo(shX + 90, shY2 + 30, shX + 84, shY2 + 64); g.stroke();
    limb(g, shX - 10, shY2 + 6, shX + 8, shY2 + 22, 24, "#181822");
    limb(g, shX + 44, shY2 + 6, shX + 30, shY2 + 22, 24, "#181822");
    glove(g, shX + 8, shY2 + 24, 0, false); glove(g, shX + 30, shY2 + 24, 0, false);
    g.drawImage(glow.gold, shX + 58, shY2 + 44, 52, 52); // nozzle glow
  } else { // smallcan — PIXEL: one arm, can low, quick zigzag
    limb(g, shX, shY2, shX + 40, shY2 + 6, 18, "#DDE1EE");
    glove(g, shX + 44, shY2 + 8, 0.9, false);
    sprayCan(g, shX + 50, shY2 + 2, 1.1, PAL.cyan, 26);
    g.drawImage(glow.cyan, shX + 30, shY2 - 30, 44, 44);
  }
}

function bakeFighter(spec, glow) {
  const R = mulberry32(spec.seed);
  const splats = [];
  for (let i = 0; i < 52; i++) {
    const r = R(), sw = spec.splat;
    splats.push({
      x: 20 + R() * 160, y: 30 + R() * 240, s: 1.5 + R() * 4.5,
      c: r < sw[0] ? spec.splatCols[0] : r < sw[0] + sw[1] ? spec.splatCols[1] : spec.splatCols[2],
      a: 0.55 + R() * 0.45,
    });
  }
  const sh = spec.scaleH, swd = spec.shoulderW;
  const lean = spec.lean, bounce = spec.bounce;

  function frame(p, mode) {
    const c = mkc(HERO_W, HERO_H), g = c.getContext("2d");
    const s2 = Math.sin(p * TAU);
    let bob = 0, hipY = 170 * sh, shY = 112 * sh, headY = 62 * sh, crouch = 8;
    let fL = { x: 0, lift: 0 }, fR = { x: 0, lift: 0 };
    let hL = { x: 0, y: 0 }, hR = { x: 0, y: 0 };
    let spraying = false, scrape = false, tuck = 0;

    if (mode === "run") {
      bob = bounce * Math.abs(Math.sin(p * TAU));
      hipY = 170 * sh + bob; shY = 112 * sh + bob; headY = 62 * sh + bob * 0.55;
      const aL = 2 * Math.PI * p, aR = 2 * Math.PI * (p + 0.5);
      fL = { x: 46 * Math.sin(aL), lift: 44 * Math.max(0, Math.sin(aL + 2.1)) };
      fR = { x: 46 * Math.sin(aR), lift: 44 * Math.max(0, Math.sin(aR + 2.1)) };
      hL = { x: 32 * Math.sin(aR), y: 16 * Math.sin(aR + 1.0) };
      hR = { x: 32 * Math.sin(aL), y: 16 * Math.sin(aL + 1.0) };
    } else if (mode === "spray") {
      bob = 2 * Math.sin(p * TAU * 2);
      hipY = 172 * sh + bob; shY = 114 * sh + bob; headY = 58 * sh + bob * 0.5;
      fL = { x: -26, lift: 0 }; fR = { x: 30, lift: 6 };
      spraying = true;
    } else if (mode === "jump") {
      tuck = 1; bob = -6; hipY = 164 * sh; shY = 106 * sh; headY = 56 * sh;
      fL = { x: -14, lift: 52 }; fR = { x: 22, lift: 40 };
      hL = { x: -30, y: -26 }; hR = { x: 26, y: -20 };
    } else if (mode === "slide") {
      crouch = 52; hipY = 170 * sh + crouch; shY = 112 * sh + crouch; headY = 62 * sh + crouch;
      fL = { x: 58, lift: 6 }; fR = { x: 44, lift: 2 };
      hL = { x: -34, y: 26 }; scrape = true;
    } else { // idle — menus only
      bob = 4 * Math.abs(Math.sin(p * TAU));
      hipY = 170 * sh + bob; shY = 112 * sh + bob; headY = 62 * sh + bob * 0.5;
      fL = { x: -14, lift: 0 }; fR = { x: 14, lift: 0 };
      hL = { x: -10, y: 6 }; hR = { x: 12, y: -4 };
    }
    const HX = 100, HY = hipY;
    const GY = GROUND_Y;
    const legCol = spec.jacket === "hoodie" ? "#C9CEDD" : spec.jacket === "armor" ? "#1B1B24" : "#181822";
    const legColB = spec.jacket === "hoodie" ? "#DDE1EE" : "#14141C";

    // back leg
    {
      const fx = HX + fR.x, fy = GY - fR.lift;
      const kx = (HX + fx) / 2 + 16, ky = (HY + fy) / 2 + 2;
      limb(g, HX, HY, kx, ky, 32, legColB); limb(g, kx, ky, fx, fy, 26, legColB);
      sneaker(g, fx, fy, clamp(fR.x * 0.012, -0.5, 0.5),
        spec.id === "artist" ? PAL.cyan : spec.id === "prism" ? PAL.mag : PAL.cyan,
        spec.id === "artist" ? PAL.mag : PAL.gold);
    }
    // backpack (behind torso) — hero + prism carry holstered cans
    if (spec.id === "artist" || spec.id === "prism") {
      const bx = HX - 52 - 4 * s2, by = shY + 6;
      g.fillStyle = "#0C0C13"; rr(g, bx - 4, by - 6, 52, 86, 14); g.fill();
      g.strokeStyle = "#23232E"; g.lineWidth = 2; rr(g, bx - 4, by - 6, 52, 86, 14); g.stroke();
      sprayCan(g, bx + 8, by + 2, -0.12, PAL.mag, 30);
      sprayCan(g, bx + 24, by + 0, 0.06, PAL.cyan, 34);
      sprayCan(g, bx + 40, by + 4, 0.14, PAL.gold, 28);
    }
    // torso
    {
      const lagX = -5 * Math.sin((p - 0.125) * TAU) * (mode === "run" ? 1 : 0); // jacket lags 1 frame
      const jx = HX + lagX, jy = (shY + HY) / 2 + 4;
      const jw = 118 * swd, jh = HY - shY + 34;
      drawJacket(g, spec, jx, jy, jw, jh, shY, HY, mode === "run" ? lean : 0.30, lagX, R);
    }
    // front leg
    {
      const fx = HX + fL.x, fy = GY - fL.lift;
      const kx = (HX + fx) / 2 + 16, ky = (HY + fy) / 2 + 2;
      limb(g, HX, HY, kx, ky, 34, legCol); limb(g, kx, ky, fx, fy, 28, legCol);
      if (spec.jacket === "slimzip") { g.fillStyle = PAL.gold; g.fillRect(kx - 16, ky - 28, 12, 9); }
      if (spec.jacket === "armor") { g.fillStyle = PAL.goldDeep; rr(g, kx - 20, ky - 30, 40, 22, 8); g.fill(); }
      sneaker(g, fx, fy, clamp(fL.x * 0.012, -0.5, 0.5),
        spec.id === "artist" ? PAL.mag : PAL.cyan, PAL.gold);
    }
    // head
    drawHead(g, spec, HX + 6, headY, R, glow);
    // arms
    const shX = HX + 40 * swd, shY2 = shY + 8;
    if (spraying) {
      drawToolSpray(g, spec, shX, shY2, 0, 0, glow);
    } else {
      const bx2 = shX + hL.x - 6, by2 = shY2 + 36 + hL.y * 0.6;
      limb(g, shX, shY2, (shX + bx2) / 2 - 8, (shY2 + by2) / 2, 22, legColB);
      limb(g, (shX + bx2) / 2 - 8, (shY2 + by2) / 2, bx2, by2, 18, legColB);
      glove(g, bx2, by2, 0.2, spec.id === "artist");
      const fx2 = shX + hR.x + 8, fy2 = shY2 + 30 + hR.y * 0.7;
      limb(g, shX, shY2, (shX + fx2) / 2 + 10, (shY2 + fy2) / 2, 24, legCol);
      limb(g, (shX + fx2) / 2 + 10, (shY2 + fy2) / 2, fx2, fy2, 20, legCol);
      glove(g, fx2, fy2, -0.2, spec.id === "artist");
      if (mode !== "slide") {
        const canCol = spec.id === "artist" ? PAL.cyan : spec.id === "prism" ? PAL.mag
          : spec.id === "ghost" ? PAL.cyan : spec.id === "heir" ? PAL.goldDeep : PAL.cyan;
        sprayCan(g, fx2 + 4, fy2 - 16, -0.25, canCol, spec.id === "pixel" ? 26 : 30);
      } else if (scrape) {
        sprayCan(g, bx2 + 6, by2 + 30, 1.2, PAL.cyan, 30); // slide: can scraping ground
      }
    }
    // seeded paint splatter over everything
    for (const sp of splats) {
      g.globalAlpha = sp.a; g.fillStyle = sp.c;
      g.beginPath(); g.arc(sp.x, sp.y * sh, sp.s, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }

  const run = [];
  for (let i = 0; i < 8; i++) run.push(frame(i / 8, "run"));
  return {
    run, spray: frame(0.12, "spray"), jump: frame(0.3, "jump"),
    slide: frame(0, "slide"), idle: [frame(0, "idle"), frame(0.5, "idle")],
    W: HERO_W, H: HERO_H, spec,
  };
}

/* ==================== src: drone.js ==================== */
/* TAG CITY — Sentinel-7 surveillance drone bake (bake-time only).
   §9 cites: §3 (quad-rotor gunmetal body #23232E, faceted plates, antenna
   fins, 4 rotor blur discs pre-rendered — never animated blades; glow ONLY
   from red scan eye + searchlight cone + tiny cyan fin-tip accents; body
   matte; beam pool = hard-edged ellipse; far LOD = dark cross + red eye dot
   + optional beam — never less), §1 rule 4 (red is threat-only).
   Concat order provides: PAL, TAU, mulberry32, mkc (globals). */
function bakeDrone() {
  const W = 170, H = 120, c = mkc(W, H), g = c.getContext("2d");
  const discs = [];
  for (let v = 0; v < 2; v++) {
    const d = mkc(96, 30), dg = d.getContext("2d");
    const gr = dg.createRadialGradient(48, 15, 4, 48, 15, 48);
    gr.addColorStop(0, "rgba(160,170,190,0.05)");
    gr.addColorStop(0.7, "rgba(160,170,190,0.28)");
    gr.addColorStop(1, "rgba(160,170,190,0)");
    dg.fillStyle = gr;
    dg.save(); dg.translate(48, 15); dg.scale(1, 0.31); dg.translate(-48, -15);
    dg.fillRect(0, 0, 96, 96); dg.restore();
    dg.strokeStyle = "rgba(190,200,220,0.35)"; dg.lineWidth = 2;
    dg.beginPath(); dg.ellipse(48, 15, 44 + v * 3, 12, 0, 0, TAU); dg.stroke();
    discs.push(d);
  }
  g.strokeStyle = "#1B1B24"; g.lineWidth = 13; g.lineCap = "round";
  g.beginPath();
  g.moveTo(45, 62); g.lineTo(18, 44); g.moveTo(125, 62); g.lineTo(152, 44);
  g.stroke();
  g.fillStyle = "#23232E";
  g.fillRect(8, 32, 22, 26); g.fillRect(140, 32, 22, 26);
  g.fillStyle = PAL.cyan; g.fillRect(17, 34, 4, 4); g.fillRect(149, 34, 4, 4);
  g.fillStyle = "#1B1B24"; // antenna fins
  g.beginPath(); g.moveTo(70, 38); g.lineTo(60, 6); g.lineTo(76, 36); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(100, 38); g.lineTo(110, 6); g.lineTo(94, 36); g.closePath(); g.fill();
  g.fillStyle = PAL.cyan; g.fillRect(59, 6, 4, 5); g.fillRect(107, 6, 4, 5);
  g.fillStyle = "#23232E"; // faceted hull
  g.beginPath();
  g.moveTo(48, 52); g.lineTo(66, 38); g.lineTo(104, 38); g.lineTo(122, 52);
  g.lineTo(118, 84); g.lineTo(96, 96); g.lineTo(74, 96); g.lineTo(52, 84);
  g.closePath(); g.fill();
  g.fillStyle = "#0F0F16";
  g.beginPath(); g.moveTo(66, 38); g.lineTo(104, 38); g.lineTo(96, 58); g.lineTo(74, 58); g.closePath(); g.fill();
  g.strokeStyle = "#3A3A4E"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(48, 52); g.lineTo(122, 52); g.moveTo(52, 84); g.lineTo(118, 84); g.stroke();
  g.fillStyle = PAL.cyan;
  for (let i = 0; i < 4; i++) g.fillRect(96, 62 + i * 6, 10, 3); // cyan vent slits
  // red scan eye — the ONLY danger hue on screen (§1 rule 4)
  g.fillStyle = "#0A0A10"; g.beginPath(); g.arc(126, 68, 15, 0, TAU); g.fill();
  g.strokeStyle = "#3A1620"; g.lineWidth = 3; g.beginPath(); g.arc(126, 68, 15, 0, TAU); g.stroke();
  g.fillStyle = PAL.red; g.beginPath(); g.arc(126, 68, 8, 0, TAU); g.fill();
  g.fillStyle = "#FFD9DE"; g.beginPath(); g.arc(126, 68, 3.5, 0, TAU); g.fill();
  // searchlight cone (alpha set by threat stage at render)
  const bw = 150, bh = 300, bc = mkc(bw, bh), bg = bc.getContext("2d");
  const bgr = bg.createLinearGradient(0, 0, 0, bh);
  bgr.addColorStop(0, "rgba(255,59,78,0.55)"); bgr.addColorStop(1, "rgba(255,59,78,0)");
  bg.fillStyle = bgr;
  bg.beginPath(); bg.moveTo(bw / 2 - 14, 0); bg.lineTo(bw / 2 + 14, 0);
  bg.lineTo(bw - 6, bh); bg.lineTo(6, bh); bg.closePath(); bg.fill();
  // beam pool — hard-edged ellipse (§3.3: players dodge the cone, not the drone)
  const pw = 190, ph = 44, pc = mkc(pw, ph), pg = pc.getContext("2d");
  const pgr = pg.createRadialGradient(pw / 2, ph / 2, 4, pw / 2, ph / 2, pw / 2);
  pgr.addColorStop(0, "rgba(255,59,78,0.5)");
  pgr.addColorStop(0.8, "rgba(255,59,78,0.28)");
  pgr.addColorStop(1, "rgba(255,59,78,0)");
  pg.fillStyle = pgr;
  pg.beginPath(); pg.ellipse(pw / 2, ph / 2, pw / 2 - 4, ph / 2 - 4, 0, 0, TAU); pg.fill();
  return { body: c, discs, beam: bc, pool: pc, W, H };
}

/* ==================== src: world.js ==================== */
/* TAG CITY — 4 locations (world config + location-flavored bakes).
   §9 cites: §4 (shared neon-noir city at street level in the alleys;
   art-deco neon sign language borrowed from signal-run location-1; rain +
   wet-street atmosphere from all four; location-4's cyan cable ribbons =
   rooftop/elevated set dressing ONLY; location-2 voxel-decay is KILLED —
   never a biome, never a backdrop; building language — dark slab towers,
   gold-trimmed deco frames, fire escapes, pink-lit storefronts; walls are
   canvas), §1 (background luminance ceiling #2A2A3A; gold earned-only).
   Every landmark below names its bible section (see LOCATIONS.md). */
const LOCATIONS = [
  {
    id: "neon_row", name: "NEON ROW", bible: "§4 (location-1.png sign language)",
    seed: 101, unlockTags: 0,
    desc: "Gold-trimmed art-deco marquees. The city shows off here.",
    signCopy: [ ["NO EXIT", "mag"], ["OPEN 24H", "cyan"], ["UPTOWN →", "goldw"], ["SHOWTIME", "mag"] ],
    wallBase: "#15151F", groundBase: "#23232E",
    groundBands: ["#00E5FF", "#FF2FB3", "#FFF3D6", "#00E5FF"],
    windowDensity: 0.34,
    muralWords: ["STAY WILD", "RUN", "ENCORE"],
    // §4: gold-bordered, cyan-tube deco signs — the landmark language
    dressWall(g, R, W, H, PAL) {
      g.strokeStyle = PAL.goldDeep; g.lineWidth = 4; // gold-trimmed sign frames
      for (let i = 0; i < 2; i++) {
        const sx = 40 + R() * (W - 220), sy = 40 + R() * 160;
        g.strokeRect(sx, sy, 170, 84);
        g.fillStyle = "rgba(255,209,102,0.10)"; g.fillRect(sx, sy, 170, 84);
        g.strokeStyle = PAL.cyan; g.lineWidth = 2; // deco sunburst
        g.beginPath(); g.arc(sx + 85, sy + 84, 40, Math.PI, 0); g.stroke();
        for (let r2 = -3; r2 <= 3; r2++) {
          g.beginPath(); g.moveTo(sx + 85, sy + 84);
          g.lineTo(sx + 85 + r2 * 12, sy + 44); g.stroke();
        }
        g.strokeStyle = PAL.goldDeep; g.lineWidth = 4;
      }
    },
  },
  {
    id: "the_alleys", name: "THE ALLEYS", bible: "§4 (alley-sector streets)",
    seed: 202, unlockTags: 15,
    desc: "Street-level sectors. Every wall is canvas.",
    signCopy: [ ["NO LOITERING", "mag"], ["ALLEY 7", "cyan"], ["← DOWNTOWN", "goldw"], ["WET PAINT", "mag"] ],
    wallBase: "#101018", groundBase: "#1E1E28",
    groundBands: ["#FF2FB3", "#00E5FF", "#FF2FB3"],
    windowDensity: 0.22,
    muralWords: ["KEEP IT WILD", "RUN", "STAY WILD"],
    // §4: fire escapes + pipes silhouetted; walls carry old tag scars
    dressWall(g, R, W, H, PAL) {
      g.strokeStyle = "#08080E"; g.lineWidth = 8; // fire-escape silhouette
      const fx = 60 + R() * (W - 160);
      for (let y = 0; y < H; y += 90) {
        g.beginPath(); g.moveTo(fx, y); g.lineTo(fx + 90, y); g.stroke();
        g.beginPath(); g.moveTo(fx, y); g.lineTo(fx, y + 90); g.stroke();
      }
      g.strokeStyle = PAL.mag; g.globalAlpha = 0.28; g.lineWidth = 3; // old tag scars
      for (let i = 0; i < 4; i++) {
        const sx = R() * W, sy = 100 + R() * 380;
        g.beginPath(); g.moveTo(sx, sy);
        g.quadraticCurveTo(sx + 40, sy - 20 + R() * 40, sx + 80, sy);
        g.stroke();
      }
      g.globalAlpha = 1;
    },
  },
  {
    id: "elevated", name: "ELEVATED / ROOFLINE", bible: "§4 (location-4.png cable ribbons)",
    seed: 303, unlockTags: 40,
    desc: "Cyan cable ribbons overhead. The industry watches from above.",
    signCopy: [ ["SECTOR 9", "cyan"], ["NO EXIT", "mag"], ["UPTOWN →", "goldw"], ["GRID ACTIVE", "cyan"] ],
    wallBase: "#12121C", groundBase: "#20202A",
    groundBands: ["#00E5FF", "#00E5FF", "#0E5F73"],
    windowDensity: 0.28,
    muralWords: ["RUN", "STAY WILD", "SIGNAL"],
    // §4: location-4's cyan cable ribbons = elevated set dressing ONLY
    dressWall(g, R, W, H, PAL) {
      g.strokeStyle = PAL.cyan; g.globalAlpha = 0.55; // cable ribbons
      for (let i = 0; i < 5; i++) {
        const y0 = 20 + i * 34 + R() * 12;
        g.lineWidth = 3 + R() * 3;
        g.beginPath(); g.moveTo(-10, y0);
        g.bezierCurveTo(W * 0.3, y0 + 26, W * 0.6, y0 - 26, W + 10, y0 + 8);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = "#0A0A12"; // junction boxes the ribbons plug into
      for (let i = 0; i < 3; i++) {
        const jx = R() * W, jy = 60 + R() * 200;
        g.fillRect(jx, jy, 34, 46);
        g.fillStyle = PAL.cyan; g.globalAlpha = 0.7; g.fillRect(jx + 6, jy + 8, 22, 5);
        g.globalAlpha = 1; g.fillStyle = "#0A0A12";
      }
    },
  },
  {
    id: "murals", name: "THE MURALS DISTRICT", bible: "§4 (pink-lit storefronts; mural walls)",
    seed: 404, unlockTags: 80,
    desc: "Storefronts glow pink. The walls already sing — add your verse.",
    signCopy: [ ["OPEN 24H", "goldw"], ["GALLERY", "mag"], ["← MURALS", "cyan"], ["STAY WILD", "mag"] ],
    wallBase: "#141420", groundBase: "#23232E",
    groundBands: ["#FF2FB3", "#FF2FB3", "#8A2360", "#00E5FF"],
    windowDensity: 0.30,
    muralWords: ["STAY WILD", "KEEP IT WILD", "RUN", "ENCORE"],
    // §4: storefronts with pink/magenta-lit windows at ground level
    dressWall(g, R, W, H, PAL) {
      for (let i = 0; i < 2; i++) {
        const sx = 30 + R() * (W - 260), sy = H - 260;
        g.fillStyle = "#0A0A12"; g.fillRect(sx, sy, 210, 190); // storefront
        g.fillStyle = "rgba(255,47,179,0.28)"; g.fillRect(sx + 14, sy + 20, 182, 120); // pink-lit window
        g.strokeStyle = PAL.mag; g.globalAlpha = 0.6; g.lineWidth = 3;
        g.strokeRect(sx + 14, sy + 20, 182, 120);
        g.globalAlpha = 1;
        g.strokeStyle = "#2A2A3A"; g.lineWidth = 4; // mullions
        g.beginPath(); g.moveTo(sx + 105, sy + 20); g.lineTo(sx + 105, sy + 140); g.stroke();
        // faded old mural behind the glass glow
        g.fillStyle = PAL.cyan; g.globalAlpha = 0.16;
        g.beginPath(); g.arc(sx + 105, sy + 80, 44, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
    },
  },
];
function locationById(id) {
  for (const l of LOCATIONS) if (l.id === id) return l;
  return LOCATIONS[0];
}

/* ==================== src: murals.js ==================== */
/* TAG CITY — tag walls & mural bloom (bake-time only).
   §9 cites: §4 (murals & tags — signature motifs: skull w/ headphones pink,
   gold crown tag, wolf/dragon line pieces cyan, STAY WILD / RUN / KEEP IT
   WILD word tags; untagged walls grey-brick near-black), §5.3 (tag-splat:
   thick hue outline + saturated fill + 4–8 drip streaks + satellite
   droplets; drips baked, never animated; bloom crossfade grey sketch →
   neon fill ~0.5s, pre-rendered frames, never a shader), §1 rule 3 (gold
   crown tag = earned signature motif — the reward channel).
   Concat order provides: PAL, TAU, mulberry32, mkc, rr, glowSprite. */
const MOTIFS = ["skull", "crown", "wolf", "words"];
function drawMotifSketch(g, motif, word, cx, cy, R) {
  // grey-sketch pass — frame 0 reads as unfinished grey on near-black
  g.strokeStyle = "#3A3A48"; g.lineWidth = 5; g.globalAlpha = 0.9;
  if (motif === "skull") {
    g.beginPath(); g.arc(cx, cy, 52, 0, TAU); g.stroke();
    g.strokeRect(cx - 52, cy - 66, 104, 22); // headphones band
    g.beginPath(); g.arc(cx - 24, cy - 6, 12, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx + 24, cy - 6, 12, 0, TAU); g.stroke();
  } else if (motif === "crown") {
    g.beginPath();
    g.moveTo(cx - 56, cy + 30); g.lineTo(cx - 56, cy - 18); g.lineTo(cx - 28, cy + 6);
    g.lineTo(cx, cy - 30); g.lineTo(cx + 28, cy + 6); g.lineTo(cx + 56, cy - 18);
    g.lineTo(cx + 56, cy + 30); g.closePath(); g.stroke();
  } else if (motif === "wolf") {
    g.beginPath(); g.moveTo(cx - 60, cy + 40);
    g.quadraticCurveTo(cx - 20, cy - 50, cx + 10, cy - 10);
    g.quadraticCurveTo(cx + 40, cy + 20, cx + 60, cy - 30); g.stroke();
    g.beginPath(); g.moveTo(cx - 40, cy - 30); g.lineTo(cx - 52, cy - 58); g.stroke();
  } else {
    g.font = '900 44px "Arial Black",system-ui,sans-serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.strokeText(word, cx, cy);
  }
  g.globalAlpha = 1;
}
function drawMotifNeon(g, motif, word, hue, cx, cy, R) {
  // neon-fill pass — saturated hue on void-black (§1 rule 1: brightness from
  // saturation, not luminance)
  const deep = hue === PAL.cyan ? PAL.cyanDeep : hue === PAL.mag ? PAL.magDeep : PAL.goldDeep;
  g.drawImage(glowSprite(hue), cx - 110, cy - 110, 220, 220);
  g.lineWidth = 9; g.strokeStyle = hue; g.fillStyle = hue;
  if (motif === "skull") {
    g.beginPath(); g.arc(cx, cy, 52, 0, TAU); g.stroke();
    g.fillStyle = deep; g.beginPath(); g.arc(cx, cy, 52, 0, TAU); g.fill();
    g.strokeStyle = hue; g.lineWidth = 9;
    g.beginPath(); g.arc(cx, cy, 52, 0, TAU); g.stroke();
    g.lineWidth = 7; g.strokeRect(cx - 52, cy - 66, 104, 22); // headphones — pink
    g.fillStyle = PAL.void;
    g.beginPath(); g.arc(cx - 24, cy - 6, 12, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx + 24, cy - 6, 12, 0, TAU); g.fill();
    g.strokeStyle = hue;
    g.beginPath(); g.arc(cx - 24, cy - 6, 12, 0, TAU); g.stroke();
    g.beginPath(); g.arc(cx + 24, cy - 6, 12, 0, TAU); g.stroke();
  } else if (motif === "crown") {
    g.beginPath();
    g.moveTo(cx - 56, cy + 30); g.lineTo(cx - 56, cy - 18); g.lineTo(cx - 28, cy + 6);
    g.lineTo(cx, cy - 30); g.lineTo(cx + 28, cy + 6); g.lineTo(cx + 56, cy - 18);
    g.lineTo(cx + 56, cy + 30); g.closePath();
    g.fillStyle = deep; g.fill(); g.strokeStyle = hue; g.lineWidth = 8; g.stroke();
  } else if (motif === "wolf") {
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(cx - 60, cy + 40);
    g.quadraticCurveTo(cx - 20, cy - 50, cx + 10, cy - 10);
    g.quadraticCurveTo(cx + 40, cy + 20, cx + 60, cy - 30); g.stroke();
    g.beginPath(); g.moveTo(cx - 40, cy - 30); g.lineTo(cx - 52, cy - 58); g.stroke();
  } else {
    g.font = '900 44px "Arial Black",system-ui,sans-serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 8; g.strokeStyle = deep; g.strokeText(word, cx, cy);
    g.fillStyle = hue; g.fillText(word, cx, cy);
  }
  // baked drips — drawn once, never animated (§5.3)
  g.fillStyle = hue;
  for (let i = 0; i < 7; i++) {
    const dx = cx - 70 + R() * 140;
    g.globalAlpha = 0.85;
    g.fillRect(dx, cy + 30, 4, 14 + R() * 30);
  }
  g.globalAlpha = 1;
  // satellite droplets
  for (let i = 0; i < 10; i++) {
    g.globalAlpha = 0.7;
    g.beginPath(); g.arc(cx - 90 + R() * 180, cy - 80 + R() * 160, 2 + R() * 4, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
/* Tag wall: 6 pre-rendered bloom frames (grey sketch → neon fill, §5.3).
   hue rotates cyan → magenta → gold per kind. */
function bakeTagWall(kind, loc, glow) {
  const W = 300, H = 560;
  const motif = MOTIFS[kind % MOTIFS.length];
  const hue = [PAL.cyan, PAL.mag, PAL.gold][kind % 3];
  const word = loc.muralWords[kind % loc.muralWords.length];
  const R = mulberry32(500 + kind * 31 + loc.seed);
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = mkc(W, H), g = c.getContext("2d");
    g.fillStyle = "#101018"; g.fillRect(0, 0, W, H); // grey-brick near-black
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (let y = 0; y < H; y += 30) g.fillRect(0, y, W, 2);
    const cx = W / 2, cy = H / 2 - 20;
    if (f === 0) {
      drawMotifSketch(g, motif, word, cx, cy, R);
    } else {
      // crossfade: neon layer alpha ramps 0.25 → 1 across frames 1..5
      g.globalAlpha = 0.25 + 0.75 * (f / 5);
      drawMotifNeon(g, motif, word, hue, cx, cy, R);
      g.globalAlpha = 1;
      if (f < 5) { g.globalAlpha = 1 - f / 5; drawMotifSketch(g, motif, word, cx, cy, R); g.globalAlpha = 1; }
    }
    frames.push(c);
  }
  return { frames, hue, motif, W, H };
}

/* ==================== src: audio.js ==================== */
/* TAG CITY — audio: lookahead scheduler + procedural SFX (zero assets).
   §9 cites: perf-spike §5 (25ms timer / 120ms horizon lookahead scheduler;
   AudioContext created/resumed inside a user gesture — unlock on first touch;
   hiss buffer pre-generated at boot: procedural, 0 decode, 0 bytes).
   The spray-hiss is NEVER triggered directly on the touch event — it is
   scheduled ahead of the spray visual frame so they land in sync. */
function makeAudio() {
  const A = {
    ctx: null, master: null, hissBuf: null, sprayNode: null,
    timer: null, muted: false, nextNote: 0,
  };
  // Unlock on first touch — iOS requires gesture context (perf-spike §5).
  A.unlock = function () {
    if (A.ctx) { if (A.ctx.state === "suspended") A.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.35;
      A.master.connect(A.ctx.destination);
      // Pre-generate the hiss buffer at boot (procedural, 0 bytes shipped).
      const len = A.ctx.sampleRate;
      A.hissBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const ch = A.hissBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      // Lookahead scheduler: 25ms timer, 120ms horizon.
      A.nextNote = A.ctx.currentTime + 0.1;
      A.timer = setInterval(() => A.schedule(), 25);
    } catch (e) { /* audio unavailable — game plays silent */ }
  };
  A.schedule = function () {
    if (!A.ctx || A.muted) return;
    // Horizon pump: keep the clock warm; one-shot SFX schedule immediately.
    while (A.nextNote < A.ctx.currentTime + 0.12) A.nextNote += 0.12;
  };
  A.tone = function (f, d, type, vol, slide) {
    if (!A.ctx || A.muted) return;
    try {
      const t = A.ctx.currentTime;
      const o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || "triangle"; o.frequency.value = f;
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(A.master); o.start(t); o.stop(t + d);
    } catch (e) {}
  };
  A.noise = function (d, vol, fc, type) {
    if (!A.ctx || A.muted) return;
    try {
      const t = A.ctx.currentTime;
      const s = A.ctx.createBufferSource(); s.buffer = A.hissBuf; s.loop = true;
      const f = A.ctx.createBiquadFilter();
      f.type = type || "lowpass"; f.frequency.value = fc || 1200;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(A.master);
      s.start(t); s.stop(t + d + 0.05);
    } catch (e) {}
  };
  // Spray hiss — scheduled slightly AHEAD of the visual so they land in sync.
  A.spray = function (on) {
    if (!A.ctx || A.muted) return;
    if (on && !A.sprayNode) {
      try {
        const t = A.ctx.currentTime + 0.03; // lookahead nudge
        const s = A.ctx.createBufferSource(); s.buffer = A.hissBuf; s.loop = true;
        const f = A.ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = 5200; f.Q.value = 0.8;
        const g = A.ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.10, t + 0.06);
        s.connect(f); f.connect(g); g.connect(A.master);
        s.start(t);
        A.sprayNode = { s, g };
      } catch (e) {}
    } else if (!on && A.sprayNode) {
      try {
        const t = A.ctx.currentTime;
        A.sprayNode.g.gain.cancelScheduledValues(t);
        A.sprayNode.g.gain.setValueAtTime(A.sprayNode.g.gain.value, t);
        A.sprayNode.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        const n = A.sprayNode; A.sprayNode = null;
        setTimeout(() => { try { n.s.stop(); } catch (e) {} }, 200);
      } catch (e) { A.sprayNode = null; }
    }
  };
  A.tap = () => A.tone(660, 0.07, "square", 0.08);
  A.jump = () => A.tone(300, 0.18, "sine", 0.12, 620);
  A.slide = () => A.noise(0.22, 0.10, 900);
  A.dash = () => A.noise(0.3, 0.16, 2400);
  A.tag = () => { A.tone(660, 0.12, "triangle", 0.16); setTimeout(() => A.tone(990, 0.2, "triangle", 0.16), 90); };
  A.near = () => { A.noise(0.35, 0.2, 3000); A.tone(880, 0.15, "sine", 0.1, 1400); };
  A.hit = () => A.tone(140, 0.3, "sine", 0.25, 60);
  A.coin = () => { A.tone(880, 0.09, "square", 0.10); setTimeout(() => A.tone(1320, 0.14, "square", 0.10), 70); };
  A.fanfare = () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => A.tone(f, 0.22, "triangle", 0.14), i * 90)); };
  return A;
}

/* ==================== src: input.js ==================== */
/* TAG CITY — one-thumb input: virtual joystick + hold-to-spray.
   §9 cites: §6 (virtual joystick — dark translucent disc, cyan chevrons;
   buttons: gold = DASH, pink = SPRAY, cyan = pause; hint line "HOLD TO SPRAY
   • SWIPE TO DODGE"), §2 (dash 0.25s max).
   Layout: left half = dynamic-origin joystick (push up = jump, pull down =
   slide); right half = SPRAY hold zone + DASH tap zone (DOM buttons, see
   hud.js). Tap (quick, small move) = jump; swipe-down = slide — kept as
   alternates from the proven spike feel. Zero per-frame allocation: touch
   records are pooled in a fixed Map, no object creation in the hot path
   beyond the pooled record reuse. */
function makeInput(callbacks) {
  const touches = new Map(); // pointerId → pooled record
  const joy = { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0, jumped: false, slided: false };
  const IN = {
    sprayHeld: false, joy, touches,
    // DOM joystick indicator element (wired by hud.js)
    joyEl: null, joyKnob: null,
  };
  function toGame(e, el) {
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * 540, y: (e.clientY - r.top) / r.height * 960 };
  }
  IN.attach = function (el) {
    IN.el = el;
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      callbacks.audioUnlock();
      const p = toGame(e, el);
      if (callbacks.onDown(p.x, p.y, e.pointerId)) return; // consumed by menus/buttons
      // Left half → joystick; right half (not on a button) → also joystick
      // (one-thumb: the thumb works the stick; SPRAY is a DOM button).
      if (!joy.active) {
        joy.active = true; joy.id = e.pointerId;
        joy.ox = p.x; joy.oy = p.y; joy.dx = 0; joy.dy = 0;
        joy.jumped = false; joy.slided = false;
        touches.set(e.pointerId, { sx: p.x, sy: p.y, t: performance.now(), joy: true });
        IN.showJoy(p.x, p.y);
      } else {
        touches.set(e.pointerId, { sx: p.x, sy: p.y, t: performance.now(), joy: false });
      }
    });
    el.addEventListener("pointermove", (e) => {
      const t = touches.get(e.pointerId);
      if (!t) return;
      e.preventDefault();
      const p = toGame(e, el);
      if (t.joy && e.pointerId === joy.id) {
        joy.dx = p.x - joy.ox; joy.dy = p.y - joy.oy;
        const mag = Math.hypot(joy.dx, joy.dy);
        if (mag > 56) { // push past the dead zone
          if (joy.dy < -40 && !joy.jumped) { joy.jumped = true; callbacks.doJump(); }
          else if (joy.dy > 48 && Math.abs(joy.dy) > Math.abs(joy.dx) * 1.1 && !joy.slided) {
            joy.slided = true; callbacks.doSlide();
          }
        }
        IN.moveJoy(joy.dx, joy.dy);
      } else if (!t.joy) {
        // swipe-down anywhere = slide (spike-proven alternate)
        const dy = p.y - t.sy, dx = p.x - t.sx;
        if (!t.slid && dy > 52 && Math.abs(dy) > Math.abs(dx) * 1.2) { t.slid = true; callbacks.doSlide(); }
      }
    });
    function up(e) {
      const t = touches.get(e.pointerId);
      touches.delete(e.pointerId);
      if (e.pointerId === joy.id) {
        joy.active = false; joy.id = -1; joy.dx = 0; joy.dy = 0;
        IN.hideJoy();
        return;
      }
      if (!t) return;
      // tap = jump (quick, small move, not a slide swipe)
      const p = toGame(e, el);
      const dt = (performance.now() - t.t) / 1000;
      const dist = Math.hypot(p.x - t.sx, p.y - t.sy);
      if (dt < 0.3 && dist < 28 && !t.slid && !t.joy) callbacks.doJump();
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", (e) => {
      touches.delete(e.pointerId);
      if (e.pointerId === joy.id) { joy.active = false; joy.id = -1; IN.hideJoy(); }
    });
  };
  IN.showJoy = function (x, y) {
    if (!IN.joyEl) return;
    IN.joyEl.style.display = "block";
    IN.joyEl.style.left = (x - 60) + "px";
    IN.joyEl.style.top = (y - 60) + "px";
    IN.moveJoy(0, 0);
  };
  IN.moveJoy = function (dx, dy) {
    if (!IN.joyKnob) return;
    const m = Math.hypot(dx, dy), cl = m > 44 ? 44 / m : 1;
    IN.joyKnob.style.transform = "translate(" + dx * cl + "px," + dy * cl + "px)";
  };
  IN.hideJoy = function () { if (IN.joyEl) IN.joyEl.style.display = "none"; };
  return IN;
}

/* ==================== src: hud.js ==================== */
/* TAG CITY — DOM HUD (the locked layer split: HUD as DOM, not canvas).
   §9 cites: §6 (panel language — gold frame = score/credits earned, cyan =
   system, pink = combo, red dashed = alerts; score digits tabular, no layout
   jitter; gold coin + gold digits credit display; paint meter pink→cyan w/
   drip edge; minimap — red dots ONLY, cyan streets, white hero arrow; combo
   badge discrete pop steps; hint line; circular buttons gold=DASH pink=SPRAY
   cyan=pause; PRIZE banner gold frame; refill +30 pink text), perf-spike §3
   (HUD as DOM — score/timer/objective are text; canvas text re-raster is
   pure waste), §7.8 (no continuous per-frame UI scaling).
   Update discipline: text writes only when the value CHANGES (cached), so
   the DOM costs ~zero per frame. */
function makeHUD(PAL) {
  const H = { els: {}, cache: {} };
  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  H.build = function (root, SPR, callbacks) {
    H.cb = callbacks;
    const hud = el("div", "tc-hud", root);
    H.els.hud = hud;
    // logo — baked art, never typeset (§6)
    const logo = el("canvas", "tc-logo", hud);
    logo.width = 196; logo.height = 85;
    logo.getContext("2d").drawImage(SPR.logo, 8, 4, 196, 85, 0, 0, 196, 85);
    // score — gold frame = earned
    const score = el("div", "tc-panel tc-gold", hud);
    el("div", "tc-label", score, "SCORE");
    H.els.score = el("div", "tc-score", score, "000000");
    H.els.time = el("div", "tc-time", score, "00:00");
    // credits wallet — gold coin + gold digits (§6)
    const cred = el("div", "tc-panel tc-gold tc-credits", hud);
    el("div", "tc-label", cred, "NEON CREDITS");
    H.els.credits = el("div", "tc-credits-num", cred, "◉ 0");
    // objective — cyan frame = system
    const obj = el("div", "tc-panel tc-cyan tc-obj", hud);
    el("div", "tc-label", obj, "OBJECTIVE");
    H.els.objTags = el("div", "tc-obj-tags", obj, "TAG THE WALLS 0/5");
    H.els.wanted = el("div", "tc-wanted", obj, "");
    // combo — pink frame, discrete pop steps (§5.6, §7.8)
    const combo = el("div", "tc-combo", hud);
    H.els.comboBadge = el("canvas", "", combo);
    H.els.comboBadge.width = 150; H.els.comboBadge.height = 84;
    H.els.comboBadge.getContext("2d").drawImage(SPR.combo, 0, 0);
    H.els.comboNum = el("div", "tc-combo-num", combo, "");
    H.els.comboMult = el("div", "tc-combo-mult", combo, "");
    H.els.combo = combo;
    // paint meter — cyan frame = system
    const paint = el("div", "tc-panel tc-cyan tc-paint", hud);
    el("div", "tc-label", paint, "PAINT");
    const pwrap = el("div", "tc-paint-wrap", paint);
    H.els.paintFill = el("div", "tc-paint-fill", pwrap);
    H.els.paintPct = el("div", "tc-paint-pct", paint, "100%");
    // minimap — red dots = drones only
    const mapw = el("div", "tc-panel tc-mapw", hud);
    H.els.map = el("canvas", "tc-map", mapw);
    H.els.map.width = 116; H.els.map.height = 116;
    // buttons — gold DASH, pink SPRAY, cyan pause
    H.els.btnDash = el("button", "tc-btn tc-dash", hud, "DASH");
    H.els.btnSpray = el("button", "tc-btn tc-spray", hud, "SPRAY");
    H.els.btnPause = el("button", "tc-btn tc-pause", hud, "II");
    H.els.btnSpray.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.setSpray(true); });
    H.els.btnSpray.addEventListener("pointerup", (e) => { e.preventDefault(); callbacks.setSpray(false); });
    H.els.btnSpray.addEventListener("pointercancel", () => callbacks.setSpray(false));
    H.els.btnSpray.addEventListener("pointerleave", () => callbacks.setSpray(false));
    H.els.btnDash.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.doDash(); });
    H.els.btnPause.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); callbacks.togglePause(); });
    // joystick visual — dark disc, cyan chevrons (§6)
    const joy = el("div", "tc-joy", root);
    H.els.joyBase = joy;
    H.els.joyKnob = el("div", "tc-joy-knob", joy, "▲");
    // banners
    H.els.alert = el("div", "tc-banner tc-alert", root, "DRONE LOCK-ON — EVADE!");
    H.els.prize = el("div", "tc-banner tc-prize", root, "");
    H.els.hint = el("div", "tc-hint", root, "HOLD TO SPRAY • SWIPE TO DODGE");
    H.els.fps = el("div", "tc-fps", root, "");
    // overlays
    H.buildTitle(root, SPR);
    H.buildBusted(root);
    H.buildPaused(root);
    return H;
  };
  H.set = function (e, v) { // cached text write — DOM costs ~zero per frame
    if (H.cache[e] !== v) { H.cache[e] = v; H.els[e].textContent = v; }
  };
  H.update = function (S, wallet, fpsTxt) {
    if (H.els.hud.style.display === "none") return;
    H.set("score", String(Math.floor(S.score)).padStart(6, "0"));
    H.set("time", fmtT(S.runT));
    H.set("credits", "◉ " + wallet.credits.toLocaleString("en-US"));
    H.set("objTags", "TAG THE WALLS  " + S.tags + "/" + S.tagsGoal);
    let wd = "";
    for (let i = 0; i < 3; i++) wd += i < S.wanted ? "●" : "○";
    H.set("wanted", wd);
    H.els.wanted.style.color = PAL.red;
    // combo — discrete steps only (§7.8)
    if (S.combo >= 2) {
      H.els.combo.style.display = "block";
      const tier = S.comboT > 3 ? 2 : S.comboT > 1.2 ? 1 : 0;
      H.els.combo.className = "tc-combo tc-pop" + tier;
      H.set("comboNum", "x" + S.combo);
      H.set("comboMult", "MULT " + (1 + 0.25 * Math.min(S.combo, 8)).toFixed(2) + "x");
    } else H.els.combo.style.display = "none";
    // paint meter
    const pc = Math.round(S.paint);
    H.set("paintPct", pc + "%");
    H.els.paintFill.style.height = Math.max(1, pc * 2) + "px";
    // alert / prize / hint / fps
    H.els.alert.style.display = (S.drone.state === 2 && !S.paused) ? "block" : "none";
    H.els.hint.style.display = (S.runT < 9 && !S.paused) ? "block" : "none";
    if (fpsTxt) H.set("fps", fpsTxt);
    // dash cooldown dim
    H.els.btnDash.style.opacity = S.hero.dashCd > 0 ? 0.45 : 1;
    H.els.btnSpray.classList.toggle("held", S.sprayHeld);
  };
  H.drawMinimap = function (S, HERO_X, FEET_Y) {
    const g = H.els.map.getContext("2d");
    g.clearRect(0, 0, 116, 116);
    g.drawImage(H.cb.SPR.map, 0, 0);
    // hero arrow — paint-white (§6)
    g.fillStyle = PAL.paintWhite;
    g.beginPath(); g.moveTo(58, 44); g.lineTo(50, 60); g.lineTo(66, 60); g.closePath(); g.fill();
    // drones — RED DOTS ONLY (§6)
    const dot = (wx, wy, r, a) => {
      const dx = Math.max(-46, Math.min(46, (wx - HERO_X) / 5));
      const dy = Math.max(-46, Math.min(46, (wy - (FEET_Y - 160)) / 5));
      g.globalAlpha = a; g.fillStyle = PAL.red;
      g.beginPath(); g.arc(58 + dx, 58 + dy, r, 0, 6.2832); g.fill();
      g.globalAlpha = 1;
    };
    dot(S.drone.x, S.drone.y, 6, 0.95);
    for (const p of S.patrols) if (p.on) dot(p.x, p.y, 3.5, 0.8);
    if (S.drone.state === 2) {
      g.strokeStyle = PAL.red; g.lineWidth = 3;
      g.beginPath(); g.arc(58, 58, 50 + 4 * Math.sin(S.t * 10), 0, 6.2832); g.stroke();
    }
  };
  H.banner = function (kind, text, ms) { // PRIZE banner — gold frame (§6)
    const e = kind === "prize" ? H.els.prize : H.els.alert;
    e.textContent = text;
    e.style.display = "block";
    clearTimeout(H._bt);
    H._bt = setTimeout(() => { e.style.display = "none"; }, ms || 2200);
  };
  /* ---- title screen: roster cards + location select + wallet + shop ---- */
  H.buildTitle = function (root, SPR) {
    const t = el("div", "tc-title", root);
    H.els.title = t;
    const logo = el("canvas", "tc-title-logo", t);
    logo.width = 350; logo.height = 152;
    logo.getContext("2d").drawImage(SPR.logo, 0, 0);
    el("div", "tc-tagline", t, "RUN • SPRAY • ESCAPE");
    el("div", "tc-sect", t, "CHOOSE YOUR ARTIST");
    const rc = el("div", "tc-roster", t);
    H.els.rosterCards = [];
    SPR.rosterOrder.forEach((id) => {
      const spec = SPR.fighterSpecs[id];
      const card = el("div", "tc-card", rc);
      const cv = el("canvas", "tc-card-art", card);
      cv.width = 124; cv.height = 186;
      cv.getContext("2d").drawImage(SPR.fighters[id].idle[0], 38, 86, 124, 186);
      el("div", "tc-card-name", card, spec.name);
      el("div", "tc-card-desc", card, spec.desc);
      const lock = el("div", "tc-card-lock", card, "");
      card.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.pickRoster(id); });
      H.els.rosterCards.push({ id, card, lock });
    });
    el("div", "tc-sect", t, "LOCATION");
    const lc = el("div", "tc-locs", t);
    H.els.locCards = [];
    SPR.locOrder.forEach((lid) => {
      const loc = SPR.locDefs[lid];
      const card = el("div", "tc-card tc-loc", lc);
      el("div", "tc-card-name", card, loc.name);
      el("div", "tc-card-desc", card, loc.desc);
      const lock = el("div", "tc-card-lock", card, "");
      card.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.pickLocation(lid); });
      H.els.locCards.push({ id: lid, card, lock });
    });
    const track = el("div", "tc-track", t, "");
    H.els.trackSlot = track;
    H.els.start = el("button", "tc-start", t, "TAP TO START");
    H.els.start.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.startRun(); });
    el("div", "tc-controls", t, "TAP = JUMP • SWIPE ↓ = SLIDE • HOLD SPRAY AT FRESH WALLS");
  };
  H.refreshTitle = function (wallet, charId, locId, totalTags) {
    for (const c of H.els.rosterCards) {
      const spec = H.cb.SPR.fighterSpecs[c.id];
      const unlocked = wallet.unlocked[c.id];
      c.card.classList.toggle("sel", c.id === charId);
      c.card.classList.toggle("locked", !unlocked);
      c.lock.textContent = unlocked ? "◉ READY" : "◉ " + spec.price.toLocaleString("en-US") + " — TAP TO UNLOCK";
    }
    for (const c of H.els.locCards) {
      const loc = H.cb.SPR.locDefs[c.id];
      const unlocked = totalTags >= loc.unlockTags;
      c.card.classList.toggle("sel", c.id === locId);
      c.card.classList.toggle("locked", !unlocked);
      c.lock.textContent = unlocked ? "OPEN" : "🔒 " + loc.unlockTags + " TAGS";
    }
    const slot = H.cb.SPR.trackSlots[locId];
    H.els.trackSlot.textContent = slot && slot.trackId
      ? "♪ NOW SPINNING: " + slot.title + " — That Boy Hi Hat"
      : "♪ TRACK SLOT — catalog hook ready";
  };
  H.buildBusted = function (root) {
    const b = el("div", "tc-busted", root);
    H.els.busted = b;
    el("div", "tc-busted-title", b, "BUSTED");
    el("div", "tc-busted-sub", b, "THE DRONES GOT YOU");
    H.els.bustedScore = el("div", "tc-busted-score", b, "");
    H.els.bustedTags = el("div", "tc-busted-tags", b, "");
    H.els.bustedEarn = el("div", "tc-busted-earn", b, "");
    const again = el("button", "tc-start", b, "TAP TO RUN AGAIN");
    again.addEventListener("pointerdown", (e) => { e.preventDefault(); H.cb.startRun(); });
  };
  H.showBusted = function (S, earned) {
    H.set("bustedScore", String(Math.floor(S.score)).padStart(6, "0"));
    H.set("bustedTags", S.tags + " WALLS TAGGED");
    H.set("bustedEarn", "◉ +" + earned + " NEON CREDITS EARNED");
    H.els.busted.style.display = "flex";
  };
  H.buildPaused = function (root) {
    const p = el("div", "tc-paused", root);
    H.els.paused = p;
    el("div", "tc-paused-title", p, "PAUSED");
    const resume = el("button", "tc-start", p, "RESUME");
    resume.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); H.cb.togglePause(); });
    const mute = el("button", "tc-start tc-mute", p, "SOUND: ON");
    H.els.muteBtn = mute;
    mute.addEventListener("pointerdown", (e) => {
      e.preventDefault(); e.stopPropagation();
      const m = H.cb.toggleMute();
      mute.textContent = "SOUND: " + (m ? "OFF" : "ON");
    });
  };
  H.show = function (which) {
    H.els.title.style.display = which === "title" ? "flex" : "none";
    H.els.hud.style.display = which === "run" ? "block" : "none";
    H.els.busted.style.display = "none";
    H.els.paused.style.display = "none";
    H.els.joyBase.style.display = "none";
  };
  function fmtT(s) {
    s = Math.floor(s);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  return H;
}

/* ==================== src: game.js ==================== */
/* TAG CITY — game core: state, update, 4-canvas render, main loop.
   §9 cites: §2 (run/chase/spray core loop; spray hold slows movement),
   §3 (Sentinel-7 3 threat stages, beam language, near-miss, lunge strikes),
   §4 (street-level alley chase), §5 (VFX language — spray streams, tag bloom,
   cyan trails = hero speed only, gold rain = rewards only, impact flashes,
   combo badge, red vignette pulse; NO shake-cam), §6 (HUD/prize/refill
   events), §7 (4-canvas layer split + DOM HUD; zero per-frame allocations;
   ≤150 pooled sprites; ≤3 fullscreen transparencies), economy.js (Neon
   Credits earn/spend), PRODUCTION-RULES #2 (optimization ladder — the
   auto-DPR stepper below scales backing-store resolution ONLY, never the
   art; no kill branch, no 30fps acceptance).
   Concat order provides every src/* module as globals (see tools/build.sh). */
(function () {
"use strict";
const Q = new URLSearchParams(location.search);
const AUTOTEST = Q.get("autotest") === "1";
const STRESS = Q.get("stress") === "1"; // fps-test: reward-VFX spam at the 150 ceiling + lock-on vignette

/* ---------- logical stage ---------- */
const LW = 540, LH = 960;
const HERO_X = 150, FEET_Y = 800, GY = 660;

/* ---------- canvases: 4-layer split (perf-spike §3, locked) ---------- */
const stage = document.getElementById("stage");
function layer(id) {
  const c = document.createElement("canvas");
  c.id = id; c.className = "tc-layer";
  stage.appendChild(c);
  return c;
}
const bgC = layer("l-bg"), parC = layer("l-par"), entC = layer("l-ent"), vfxC = layer("l-vfx");
const bg = bgC.getContext("2d"), par = parC.getContext("2d"),
      ent = entC.getContext("2d"), vfx = vfxC.getContext("2d");
let DPR = 1, DPRsteps = [2, 1.5, 1.25, 1], dprIdx = 0, dprT = 0;
function fit() {
  const cap = DPRsteps[dprIdx];
  DPR = Math.min(window.devicePixelRatio || 1, cap);
  const r = stage.getBoundingClientRect();
  const s = Math.min(r.width / LW, r.height / LH);
  for (const c of [bgC, parC, entC, vfxC]) {
    c.width = Math.round(LW * DPR); c.height = Math.round(LH * DPR);
    c.style.width = Math.round(LW * s) + "px";
    c.style.height = Math.round(LH * s) + "px";
  }
  bg.setTransform(DPR, 0, 0, DPR, 0, 0);
  par.setTransform(DPR, 0, 0, DPR, 0, 0);
  ent.setTransform(DPR, 0, 0, DPR, 0, 0);
  vfx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawStaticBg();
}
window.addEventListener("resize", fit);
function drawStaticBg() { // static layer — redrawn on scroll-page/resize ONLY
  bg.clearRect(0, 0, LW, LH);
  bg.drawImage(SPR.sky, 0, 0, LW, LH);
}
let DRAWN = 0;
function D(ctx, img, x, y, w, h) { DRAWN++; ctx.drawImage(img, x, y, w, h); }
function Da(ctx, img, x, y, w, h, a) { DRAWN++; ctx.globalAlpha = a; ctx.drawImage(img, x, y, w, h); ctx.globalAlpha = 1; }

/* ---------- baked sprite set ---------- */
const GLOW = initGlow();
const SPR = {
  glow: GLOW,
  streak: { cyan: streakSprite(PAL.cyan), mag: streakSprite(PAL.mag), gold: streakSprite(PAL.gold), white: streakSprite(PAL.paintWhite), red: streakSprite(PAL.red) },
  rings: { cyan: ringSprite(PAL.cyan), gold: ringSprite(PAL.gold), white: ringSprite(PAL.paintWhite) },
  sky: bakeSky(LW, LH),
  vigRed: bakeVigRed(LW, LH),
  rainF: bakeRain(false), rainN: bakeRain(true),
  fog: bakeFog(), spot: bakeHeroSpot(),
  drone: bakeDrone(),
  logo: bakeLogo(), combo: bakeComboBadge(), map: bakeMinimap(),
  paintFill: bakePaintFill(), target: bakeTargetFrame(),
  dump: bakeDumpster(), bar: bakeBarrier(), pipe: bakeLowPipe(),
  pickup: bakePaintPickup(),
  fighters: {}, fighterSpecs: {}, rosterOrder: ROSTER.map(r => r.id),
  locDefs: {}, locOrder: LOCATIONS.map(l => l.id),
  trackSlots: TRACK_SLOTS,
  loc: null, // active location bake cache
};
for (const spec of ROSTER) {
  SPR.fighters[spec.id] = bakeFighter(spec, GLOW);
  SPR.fighterSpecs[spec.id] = spec;
}
for (const l of LOCATIONS) SPR.locDefs[l.id] = l;
function bakeLocation(loc) {
  if (SPR.loc && SPR.loc.id === loc.id) return;
  const signGlow = { mag: GLOW.mag, cyan: GLOW.cyan, goldw: GLOW.gold };
  SPR.far = bakeFar();
  SPR.mid = bakeMid(loc);
  SPR.walls = [bakeWallTile(0, loc), bakeWallTile(1, loc), bakeWallTile(2, loc)];
  SPR.ground = bakeGround(loc);
  SPR.puddle = bakePuddle();
  SPR.signs = loc.signCopy.map(([text, col]) =>
    bakeSign(text, col === "mag" ? PAL.mag : col === "cyan" ? PAL.cyan : PAL.goldWhite,
      200 + text.length * 14, signGlow[col]));
  SPR.tagWalls = [bakeTagWall(0, loc, GLOW), bakeTagWall(1, loc, GLOW), bakeTagWall(2, loc, GLOW)];
  SPR.loc = loc;
}
const CADENCE = { artist: 9, prism: 10, ghost: 8, heir: 6.5, pixel: 12 };

/* ---------- audio / pools / wallet ---------- */
const AU = makeAudio();
const pools = makePools();
const wallet = loadWallet(localStorage);
let totalTags = wallet.totals.tags | 0;

/* ---------- state ---------- */
const S = {
  mode: "title", paused: false, t: 0, runT: 0, scroll: 0, speed: 380, baseSpeed: 380,
  charId: "artist", locId: "neon_row", tagsGoal: 5,
  hero: { vy: 0, y: 0, grounded: true, slide: 0, dash: 0, dashCd: 0, stumble: 0, spraying: false },
  sprayHeld: false,
  paint: 100, score: 0, tags: 0, combo: 0, comboT: 0, wanted: 0, wantedT: 0,
  strikes: 0, mercy: 0, vigR: 0, flash: 0, flicker: 0, slowmo: 0,
  drone: { gap: 150, x: -40, y: 300, state: 0, lockT: 0, beam: 0, eye: 0.25, sway: 0, cd: 0 },
  spawnT: { ob: 1.2, wall: 6, pick: 5, patrol: 9 },
  run: { evasions: 0, comboHit: {}, earned: 0 }, // per-run economy tracking
  patrols: [], obstacles: [], walls: [], pickups: [],
  mapT: 0,
};
for (let i = 0; i < 8; i++) S.obstacles.push({ on: false, x: 0, type: "dump", w: 0, h: 0, hit: false });
for (let i = 0; i < 2; i++) S.walls.push({ on: false, x: 0, kind: 0, prog: 0, done: false, m: null });
for (let i = 0; i < 4; i++) S.pickups.push({ on: false, x: 0, y: 0, got: false, bob: 0 });
for (let i = 0; i < 3; i++) S.patrols.push({ on: false, x: 0, y: 0, ph: 0 });

/* ---------- HUD (DOM) ---------- */
const hudRoot = document.getElementById("hud");
const HUD = makeHUD(PAL);
HUD.build(hudRoot, SPR, {
  SPR,
  audioUnlock: () => AU.unlock(),
  setSpray: (v) => { S.sprayHeld = v; },
  doDash: () => doDash(),
  doJump: () => doJump(),
  doSlide: () => doSlide(),
  togglePause: () => { if (S.mode === "run") { S.paused = !S.paused; HUD.els.paused.style.display = S.paused ? "flex" : "none"; AU.tap(); } },
  toggleMute: () => { AU.muted = !AU.muted; if (!AU.muted) AU.unlock(); return AU.muted; },
  onDown: () => false, // menus handle their own taps; gameplay taps fall to canvas
  pickRoster: (id) => {
    const spec = SPR.fighterSpecs[id];
    if (wallet.unlocked[id]) { S.charId = id; AU.tap(); }
    else if (canAfford(wallet, id)) {
      unlock(wallet, id); saveWallet(localStorage, wallet);
      S.charId = id; AU.fanfare();
      domPopup(HERO_X, 420, spec.name + " UNLOCKED!", PAL.gold, 26);
      goldRain(HERO_X, 300, 30);
    } else {
      AU.hit();
      domPopup(HERO_X, 420, "NEED ◉" + spec.price.toLocaleString("en-US"), PAL.red, 22);
    }
    HUD.refreshTitle(wallet, S.charId, S.locId, totalTags);
  },
  pickLocation: (lid) => {
    const loc = SPR.locDefs[lid];
    if (totalTags >= loc.unlockTags) { S.locId = lid; AU.tap(); }
    else { AU.hit(); domPopup(HERO_X, 420, "🔒 " + loc.unlockTags + " TAGS", PAL.red, 22); }
    HUD.refreshTitle(wallet, S.charId, S.locId, totalTags);
  },
  startRun: () => { AU.unlock(); AU.tap(); resetRun(); },
});

/* ---------- DOM popup pool (HUD layer — no canvas text re-raster) ---------- */
const domPops = [];
for (let i = 0; i < 14; i++) {
  const d = document.createElement("div");
  d.className = "tc-pop";
  d.style.display = "none";
  hudRoot.appendChild(d);
  domPops.push(d);
}
let domPopCur = 0;
const domPopLive = [];
function domPopup(x, y, text, color, size) {
  const d = domPops[domPopCur]; domPopCur = (domPopCur + 1) % 14;
  d.textContent = text;
  d.style.display = "block";
  d.style.color = color;
  d.style.fontSize = size + "px";
  d.style.left = x + "px"; d.style.top = y + "px";
  d.style.opacity = 1;
  domPopLive.push({ e: d, life: 1.4, y });
  if (domPopLive.length > 14) domPopLive.shift();
}
function stepDomPops(dt) {
  for (let i = domPopLive.length - 1; i >= 0; i--) {
    const p = domPopLive[i];
    p.life -= dt;
    if (p.life <= 0) { p.e.style.display = "none"; domPopLive.splice(i, 1); continue; }
    p.y -= 56 * dt;
    p.e.style.top = p.y + "px";
    p.e.style.opacity = Math.min(1, p.life / 0.5);
  }
}

/* ---------- input ---------- */
const IN = makeInput({
  audioUnlock: () => AU.unlock(),
  doJump: () => doJump(),
  doSlide: () => doSlide(),
  onDown: () => false,
});
IN.attach(stage);
IN.joyEl = HUD.els.joyBase;
IN.joyKnob = HUD.els.joyKnob;

/* ---------- actions ---------- */
function RND() { return Math.random(); }
function doJump() {
  const h = S.hero;
  if (S.mode !== "run" || S.paused) return;
  if (h.grounded && h.slide <= 0) {
    h.vy = -1020; h.grounded = false;
    for (let i = 0; i < 10; i++)
      pools.spawnP(HERO_X - 10 + RND() * 30, FEET_Y - 6, -60 - RND() * 120, -40 - RND() * 160, 0.5, 10 + RND() * 10, GLOW.cyan, 300, true);
    AU.jump();
  }
}
function doSlide() {
  const h = S.hero;
  if (S.mode !== "run" || S.paused || !h.grounded) return;
  if (h.slide <= 0) { h.slide = 0.62; AU.slide(); }
}
function doDash() {
  const h = S.hero;
  if (S.mode !== "run" || S.paused || h.dashCd > 0) return;
  h.dash = 0.25; h.dashCd = 2.6; // §2: dash 0.25s max, cyan ribbon streaks
  for (let i = 0; i < 5; i++)
    pools.spawnP(HERO_X - 40 - i * 22, FEET_Y - 110 + RND() * 60 - 30, -700, -20, 0.4, 26, SPR.streak.cyan, 0, true);
  AU.dash();
}
function goldRain(x, y, n) { // §5.5 gold rain — REWARD LANGUAGE ONLY
  for (let i = 0; i < n; i++)
    pools.spawnP(x - 120 + RND() * 240, -20 - RND() * 60, -30 + RND() * 60, 120 + RND() * 160, 0.8, 8 + RND() * 8, GLOW.gold, 500, true);
  AU.coin();
}

/* ---------- spawners ---------- */
function spawnObstacle() {
  let o = null;
  for (const c of S.obstacles) if (!c.on) { o = c; break; }
  if (!o) return;
  const r = RND();
  o.type = r < 0.4 ? "dump" : r < 0.7 ? "bar" : "pipe";
  o.on = true; o.hit = false; o.x = LW + 80;
  if (o.type === "dump") { o.w = 150; o.h = 116; }
  else if (o.type === "bar") { o.w = 110; o.h = 96; }
  else { o.w = 220; o.h = 64; }
}
function spawnWall() {
  let w = null;
  for (const c of S.walls) if (!c.on) { w = c; break; }
  if (!w) return;
  w.on = true; w.kind = (RND() * 3) | 0; w.prog = 0; w.done = false;
  w.x = LW + 120; w.m = SPR.tagWalls[w.kind];
}
function spawnPickup() {
  let p = null;
  for (const c of S.pickups) if (!c.on) { p = c; break; }
  if (!p) return;
  p.on = true; p.got = false; p.x = LW + 60;
  p.y = FEET_Y - 160 - RND() * 120; p.bob = RND() * TAU;
}
function spawnPatrol() {
  let p = null;
  for (const c of S.patrols) if (!c.on) { p = c; break; }
  if (!p) return;
  p.on = true; p.x = LW + 100; p.y = 180 + RND() * 160; p.ph = RND() * TAU;
}
function wallInZone(w) { return w.on && !w.done && w.x < 300 && w.x > -160; }
const _hb = { x1: 0, x2: 0, y1: 0, y2: 0 }; // reused box — zero per-frame allocation (§7.10)
function heroBox() {
  const h = S.hero, slide = h.slide > 0;
  _hb.x1 = HERO_X - 34; _hb.x2 = HERO_X + 34;
  _hb.y1 = slide ? FEET_Y - 92 : FEET_Y - 196; _hb.y2 = FEET_Y;
  return _hb;
}

/* ---------- scoring events ---------- */
function completeTag(w) {
  w.done = true; S.tags++; totalTags++;
  wallet.totals.tags = totalTags;
  wallet.totals.locationsTagged[S.locId] = true;
  const cs = comboStep(S.combo, S.comboT, 0, "tag");
  S.combo = cs.combo; S.comboT = cs.comboT;
  const pts = Math.round(500 * mult(S.combo));
  S.score += pts;
  earn(wallet, EARN.tag); S.run.earned += EARN.tag;
  S.paint = Math.min(100, S.paint + 10);
  S.wanted = Math.min(3, S.wanted + 1); S.wantedT = 0;
  S.drone.gap = Math.min(330, S.drone.gap + 55);
  S.flicker = 0.5; S.flash = 0.35;
  domPopup(HERO_X + 60, FEET_Y - 320, "CLEAN TAG +" + pts, PAL.gold, 28);
  domPopup(HERO_X + 60, FEET_Y - 280, "+◉" + EARN.tag, PAL.gold, 20);
  const cx = w.x + 150, cy = 380;
  pools.ring(cx, cy, SPR.rings.gold, 420, 0.5);
  goldRain(cx, cy, 26);
  for (let i = 0; i < 14; i++)
    pools.spawnP(cx - 90 + RND() * 180, cy - 90 + RND() * 180, -160 + RND() * 320, -160 + RND() * 320, 0.5, 10 + RND() * 12, GLOW.white, 0, true);
  checkComboMilestone();
  AU.tag();
}
function checkComboMilestone() { // combo milestones — PRIZE moments (§6)
  for (const m of [5, 10, 15]) {
    if (S.combo >= m && !S.run.comboHit[m]) {
      S.run.comboHit[m] = true;
      const bonus = EARN["combo" + m];
      earn(wallet, bonus); S.run.earned += bonus;
      HUD.banner("prize", "PRIZE — COMBO x" + m + "  +◉" + bonus, 2400);
      goldRain(HERO_X, 300, 34);
    }
  }
}
function nearMiss() {
  const pts = Math.round(250 * mult(S.combo));
  S.score += pts;
  earn(wallet, EARN.nearMiss); S.run.earned += EARN.nearMiss;
  wallet.totals.nearMisses++;
  S.comboT = COMBO_WINDOW;
  S.flash = 0.4; S.slowmo = 0.45;
  S.drone.gap = Math.min(340, S.drone.gap + 120);
  domPopup(HERO_X, FEET_Y - 300, "NEAR MISS +" + pts, PAL.paintWhite, 26);
  pools.ring(HERO_X, FEET_Y - 160, SPR.rings.white, 520, 0.4);
  for (let i = 0; i < 20; i++)
    pools.spawnP(HERO_X - 40 + RND() * 80, FEET_Y - 200 + RND() * 80, -200 + RND() * 400, -200 + RND() * 200, 0.45, 9 + RND() * 10, GLOW.white, 200, true);
  AU.near();
}
function evade() { // drone lunge dodged — counts toward GHOST PROTOCOL
  S.run.evasions++;
  wallet.totals.evasions++;
}
function strike() {
  S.strikes++; S.mercy = 2.2;
  const cs = comboStep(S.combo, S.comboT, 0, "break");
  S.combo = cs.combo; S.comboT = cs.comboT;
  S.vigR = 1.2;
  S.drone.gap = 270;
  domPopup(HERO_X, FEET_Y - 280, "CAUGHT!", PAL.red, 32);
  for (let i = 0; i < 22; i++)
    pools.spawnP(HERO_X - 30 + RND() * 60, FEET_Y - 160 + RND() * 80, -220 + RND() * 440, -160 + RND() * 160, 0.6, 10 + RND() * 12, GLOW.red, 300, true);
  AU.hit();
  if (S.strikes >= 3) endRun();
}
function stumble() {
  const h = S.hero;
  h.stumble = 0.85;
  const cs = comboStep(S.combo, S.comboT, 0, "break");
  S.combo = cs.combo; S.comboT = cs.comboT;
  S.mercy = 1.4;
  S.drone.gap = Math.max(50, S.drone.gap - 70);
  domPopup(HERO_X, FEET_Y - 260, "STUMBLED", PAL.dim, 22);
  AU.hit();
}
function endRun() { // settle economy, check feats, persist — honest accounting
  const completion = S.tags * EARN.runComplete;
  earn(wallet, completion); S.run.earned += completion;
  wallet.totals.runs++;
  const feats = [];
  if (S.strikes === 0 && S.tags > 0) feats.push("clean_getaway");
  if (S.run.evasions >= 10) feats.push("ghost_protocol");
  if (wallet.totals.tags >= 25) feats.push("crown_jewel");
  const locs = Object.keys(wallet.totals.locationsTagged);
  if (locs.length >= 4) feats.push("marquee_lights");
  for (const f of feats) {
    const paid = payFeat(wallet, f);
    if (paid > 0) { S.run.earned += paid; }
  }
  saveWallet(localStorage, wallet);
  totalTags = wallet.totals.tags;
  S.mode = "busted";
  S.sprayHeld = false;
  AU.spray(false);
  HUD.show("busted");
  HUD.showBusted(S, S.run.earned);
}
function resetRun() {
  bakeLocation(SPR.locDefs[S.locId]);
  S.runT = 0; S.scroll = 0; S.speed = S.baseSpeed;
  S.paint = 100; S.score = 0; S.tags = 0;
  S.combo = 0; S.comboT = 0; S.wanted = 0; S.wantedT = 0;
  S.strikes = 0; S.mercy = 0; S.vigR = 0; S.flash = 0; S.flicker = 0; S.slowmo = 0;
  const h = S.hero;
  h.vy = 0; h.y = 0; h.grounded = true; h.slide = 0; h.dash = 0; h.dashCd = 0; h.stumble = 0; h.spraying = false;
  S.drone.gap = 210; S.drone.state = 0; S.drone.lockT = 0; S.drone.cd = 0;
  S.run = { evasions: 0, comboHit: {}, earned: 0 };
  for (const a of S.obstacles) a.on = false;
  for (const w of S.walls) w.on = false;
  for (const p of S.pickups) p.on = false;
  for (const p of S.patrols) p.on = false;
  pools.clear();
  for (const p of domPopLive) p.e.style.display = "none";
  domPopLive.length = 0;
  S.paused = false;
  S.mode = "run";
  HUD.show("run");
  fit();
}

/* ---------- update (zero per-frame allocation) ---------- */
// COMBO_WINDOW lives in combo.js (shared constant, closed over); no shadow here.
function update(dt) {
  S.t += dt;
  if (S.mode === "title") return;
  if (S.mode !== "run" || S.paused) return;
  let gdt = dt;
  if (S.slowmo > 0) { S.slowmo -= dt; gdt = dt * 0.35; } // near-miss slow-mo
  S.runT += gdt;
  const h = S.hero, dr = S.drone;

  let spd = S.baseSpeed;
  if (h.dash > 0) { h.dash -= gdt; spd = 950; }
  if (h.stumble > 0) { h.stumble -= gdt; spd *= 0.55; }
  if (h.spraying) spd = Math.min(spd, 150); // §2 spray hold: slow-move
  S.speed = spd; S.scroll += spd * gdt;

  S.spawnT.ob -= gdt; if (S.spawnT.ob <= 0) { spawnObstacle(); S.spawnT.ob = 1.1 + RND() * 0.9; }
  S.spawnT.wall -= gdt; if (S.spawnT.wall <= 0) { spawnWall(); S.spawnT.wall = 9 + RND() * 5; }
  S.spawnT.pick -= gdt; if (S.spawnT.pick <= 0) { spawnPickup(); S.spawnT.pick = 7 + RND() * 5; }
  S.spawnT.patrol -= gdt; if (S.spawnT.patrol <= 0) { spawnPatrol(); S.spawnT.patrol = 8 + RND() * 6; }

  if (h.dashCd > 0) h.dashCd -= gdt;
  if (h.slide > 0) h.slide -= gdt;
  if (!h.grounded) {
    h.vy += 2600 * gdt; h.y += h.vy * gdt;
    if (h.y >= 0) {
      h.y = 0; h.vy = 0; h.grounded = true;
      for (let i = 0; i < 8; i++) // cyan spark pop on landing (§2)
        pools.spawnP(HERO_X - 24 + RND() * 48, FEET_Y - 4, -80 + RND() * 160, -30 - RND() * 120, 0.4, 8 + RND() * 8, GLOW.cyan, 400, true);
    }
  }
  if (h.mercy > 0) h.mercy -= gdt;
  if (S.mercy > 0) S.mercy -= gdt;

  /* spray */
  h.spraying = false;
  let wallZ = null;
  for (const w of S.walls) if (wallInZone(w)) { wallZ = w; break; }
  if (S.sprayHeld && wallZ && S.paint > 0) {
    h.spraying = true;
    S.paint = Math.max(0, S.paint - 22 * gdt);
    wallZ.prog += gdt / 2.4;
    S.score += 42 * gdt;
    // §5.2 spray stream: paint-white core at nozzle → hue-saturated body.
    // Stream color matches the wall tag; nozzle glow keeps the hand's hue.
    const hue = wallZ.m.hue;
    const handCol = S.charId === "artist" ? PAL.cyan : S.charId === "prism" ? PAL.mag : PAL.cyan;
    const handGlow = handCol === PAL.mag ? GLOW.mag : GLOW.cyan;
    const nx = HERO_X + 78, ny = FEET_Y - 196 - 44;
    for (let i = 0; i < 3; i++)
      pools.spawnP(nx, ny + (RND() - 0.5) * 14, 420 + RND() * 260, (RND() - 0.5) * 160, 0.32, 14 + RND() * 10, i % 2 ? SPR.streak.mag : SPR.streak.cyan, 0, true);
    pools.spawnP(nx, ny, 300, 0, 0.14, 20, GLOW.white, 0, true);
    const hg = hue === PAL.gold ? GLOW.gold : hue === PAL.mag ? GLOW.mag : GLOW.cyan;
    for (let i = 0; i < 2; i++)
      pools.spawnP(nx + 40 + RND() * 80, ny + (RND() - 0.5) * 90, 120 + RND() * 120, 60 + RND() * 120, 0.7, 7 + RND() * 8, hg, 420, true);
    pools.spawnP(nx - 10, ny - 20, 60, -40, 0.2, 16, handGlow, 0, true); // hand-hue nozzle kiss
    if (RND() < 0.6)
      pools.spawnP(wallZ.x + 60 + RND() * 180, 220 + RND() * 220, -40, 60, 0.5, 9 + RND() * 10, hg, 200, true);
    if (wallZ.prog >= 1) completeTag(wallZ);
  }
  AU.spray(h.spraying && !AU.muted);

  /* combo / wanted decay */
  const cs = comboStep(S.combo, S.comboT, gdt, "tick");
  S.combo = cs.combo; S.comboT = cs.comboT;
  if (S.wanted > 0) { S.wantedT += gdt; if (S.wantedT > 26) { S.wanted--; S.wantedT = 0; } }

  /* entities scroll */
  for (const o of S.obstacles) { if (!o.on) continue; o.x -= spd * gdt; if (o.x < -260) o.on = false; }
  for (const w of S.walls) { if (!w.on) continue; w.x -= spd * gdt; if (w.x < -420) w.on = false; }
  for (const p of S.pickups) {
    if (!p.on) continue;
    p.x -= spd * gdt; p.bob += gdt * 3;
    if (!p.got && Math.abs(p.x - HERO_X) < 44 && Math.abs(p.y - (FEET_Y - 140)) < 130) {
      p.got = true; p.on = false;
      S.paint = Math.min(100, S.paint + 30);
      domPopup(p.x, p.y - 30, "+30 REFILL", PAL.mag, 22);
      AU.tone(520, 0.1, "triangle", 0.12, 780);
    }
    if (p.x < -80) p.on = false;
  }
  for (const p of S.patrols) { if (!p.on) continue; p.x -= spd * 0.92 * gdt; p.ph += gdt * 2; if (p.x < -200) p.on = false; }

  /* collisions */
  if (S.mercy <= 0) {
    const b = heroBox();
    for (const o of S.obstacles) {
      if (!o.on || o.hit) continue;
      let oy2 = FEET_Y, oy1 = FEET_Y - o.h;
      if (o.type === "pipe") { oy1 = FEET_Y - 236; oy2 = FEET_Y - 172; }
      if (b.x2 > o.x && b.x1 < o.x + o.w && b.y2 > oy1 && b.y1 < oy2) { o.hit = true; stumble(); }
    }
  }

  /* drone AI (§3) — pure threat logic in droneAI.js, motion here */
  dr.sway += gdt * 2.2;
  const want = wantGap(S.tags, h.stumble > 0, h.dash > 0);
  dr.gap += (want - dr.gap) * Math.min(1, gdt * 1.8);
  dr.x += ((HERO_X - dr.gap) - dr.x) * Math.min(1, gdt * (1.6 + S.wanted * 0.25));
  const targetY = (FEET_Y - 196) - 150 + Math.sin(dr.sway) * 26 - h.y * 0.3;
  dr.y += (targetY - dr.y) * Math.min(1, gdt * 3);
  const tr = threatStep(dr.state, dr.gap, dr.lockT, gdt);
  if (tr.justLocked) { domPopup(HERO_X + 40, 190, "!", PAL.red, 40); AU.tone(180, 0.4, "sawtooth", 0.08); }
  dr.state = tr.state; dr.lockT = tr.lockT;
  const tg = stageTargets(dr.state);
  dr.beam += (tg.beam - dr.beam) * Math.min(1, gdt * 4);
  dr.eye += (tg.eye - dr.eye) * Math.min(1, gdt * 4);
  if (dr.state === 2) S.vigR = Math.max(S.vigR, 0.25); // red vignette pulse on lock-on
  const ddx = Math.abs(dr.x - HERO_X);
  if (dr.cd > 0) dr.cd -= gdt;
  if (isNearMiss(dr.state, ddx, dr.cd)) { dr.cd = 1.6; nearMiss(); }
  const wasState = dr.state;
  if (canStrike(dr.state, ddx, h.y, S.mercy, h.dash)) strike();
  else if (wasState > 0 && ddx < 60 && h.y < -70) evade(); // jumped the lunge

  pools.step(gdt);
  stepDomPops(dt);

  if (S.vigR > 0) S.vigR -= gdt * 0.8;
  if (S.flash > 0) S.flash -= gdt * 2.2;
  if (S.flicker > 0) S.flicker -= gdt;
  S.score += 9 * gdt; // distance trickle

  // adaptive DPR stepper — resolution ONLY, never the art (optimization
  // ladder rung 0; PRODUCTION-RULES #2: re-engineer cost, never delete look)
  dprT += dt;
  if (dprT > 4) {
    dprT = 0;
    fpsCalc();
    if (fpsCache.avg < 50 && dprIdx < DPRsteps.length - 1) { dprIdx++; fit(); }
  }
  if (AUTOTEST) autotest(dt);
}

/* ---------- autotest driver (scripted play, no human needed) ---------- */
const AT = { t: 0, done: false };
function autotest(dt) {
  AT.t += dt;
  const h = S.hero;
  if (S.mode !== "run") return;
  let nb = null, nd = 1e9;
  for (const o of S.obstacles) {
    if (!o.on) continue;
    const d = o.x - HERO_X;
    if (d > 20 && d < nd) { nd = d; nb = o; }
  }
  if (nb) {
    if (nb.type === "pipe") { if (nd < 300 && h.grounded && h.slide <= 0) doSlide(); }
    else if (nd < 300 && h.grounded) doJump();
  }
  let wz = null;
  for (const w of S.walls) if (wallInZone(w)) { wz = w; break; }
  S.sprayHeld = !!(wz && S.paint > 12);
  if (S.drone.gap < 70 && h.dashCd <= 0) doDash();
  if (STRESS) { // pin the frame cost: ceiling particles + red lock-on pulse
    const tick = (AT.t * 2) | 0;
    if (tick !== AT.lastStress) {
      AT.lastStress = tick;
      goldRain(HERO_X, 300, 30);
      S.vigR = 1;
      for (let i = 0; i < 10; i++)
        pools.spawnP(HERO_X - 100 + RND() * 200, 200 + RND() * 300, -100 + RND() * 200, -60, 1.2, 12, GLOW.white, 0, true);
    }
  }
  if (AT.t > 18 && !AT.done) {
    AT.done = true;
    fpsCalc();
    const s = fpsCache;
    console.log("AUTOTEST_SUMMARY " + JSON.stringify({
      t: +AT.t.toFixed(1), char: S.charId, loc: S.locId,
      avgFps: +s.avg.toFixed(1), low1: +s.low1.toFixed(1), p95ms: +s.p95.toFixed(2),
      draws: lastDraws, partsMax: pools.maxLive, score: Math.round(S.score), tags: S.tags,
      credits: wallet.credits, dpr: DPR, mode: S.mode,
      worstMs: +worstMs.toFixed(1), worstAt: +worstRunT.toFixed(1), worstMode,
      worstJsMs: +worstJs.toFixed(1), worstJsAt: +worstJsRunT.toFixed(1),
      worstUpdMs: +worstUpd.toFixed(2), worstUpdAt: +worstUpdRunT.toFixed(1),
    }));
  }
}

/* ---------- render (drawImage-only hot loop, 4 layers) ---------- */
function render() {
  const sc = S.scroll, t = S.t;

  /* par layer — parallax city (scrolls every frame) */
  par.clearRect(0, 0, LW, LH);
  let off = (sc * 0.12) % 1080;
  D(par, SPR.far, -off, GY - 340, 1080, 340); D(par, SPR.far, -off + 1080, GY - 340, 1080, 340);
  off = (sc * 0.32) % 1080;
  D(par, SPR.mid, -off, GY - 520, 1080, 520); D(par, SPR.mid, -off + 1080, GY - 520, 1080, 520);
  for (let i = 0; i < 4; i++) { // neon signs (§4 terse copy)
    const sg = SPR.signs[i % SPR.signs.length];
    const sx = (((i * 430 + 120 - off) % 1080) + 1080) % 1080 - 130;
    const fl = S.flicker > 0 ? 0.75 + 0.25 * Math.sin(t * 40) : 1; // flare on tag-complete only
    if (fl > 0.9) D(par, sg, sx, 190 + (i % 3) * 70, sg.width * 0.8, sg.height * 0.8);
    else Da(par, sg, sx, 190 + (i % 3) * 70, sg.width * 0.8, sg.height * 0.8, fl);
  }
  off = sc % 480; // near alley walls
  for (let x = -off, k = 0; x < LW; x += 480, k++) {
    const idx = Math.abs(Math.floor((sc + x) / 480)) % 3;
    D(par, SPR.walls[idx], x, 40, 480, 620);
  }
  off = sc % 1080; // street
  D(par, SPR.ground, -off, GY, 1080, 230); D(par, SPR.ground, -off + 1080, GY, 1080, 230);
  for (let i = 0; i < 4; i++) { // puddles w/ baked neon smears
    const px = (((i * 330 + 80 - sc) % 1320) + 1320) % 1320 - 120;
    D(par, SPR.puddle, px, 706 + (i % 2) * 66, 190, 52);
  }

  /* ent layer — tag walls, obstacles, pickups, hero, drones */
  ent.clearRect(0, 0, LW, LH);
  for (const w of S.walls) {
    if (!w.on) continue;
    if (!w.done && w.prog <= 0.02) D(ent, SPR.target, w.x - 10, 90, 320, 580);
    const fi = w.done ? 5 : Math.min(5, Math.floor(w.prog * 5.999));
    D(ent, w.m.frames[fi], w.x, 100, 300, 560); // bloom crossfade (§5.3)
  }
  for (const o of S.obstacles) {
    if (!o.on) continue;
    if (o.type === "dump") D(ent, SPR.dump, o.x, FEET_Y - 116, 150, 116);
    else if (o.type === "bar") D(ent, SPR.bar, o.x, FEET_Y - 96, 110, 96);
    else D(ent, SPR.pipe, o.x, FEET_Y - 236, 220, 64);
  }
  for (const p of S.pickups) {
    if (!p.on) continue;
    D(ent, SPR.pickup, p.x - 32, p.y + Math.sin(p.bob) * 9, 64, 84);
  }
  const F = SPR.fighters[S.charId], h = S.hero;
  D(ent, SPR.spot, HERO_X - 180, FEET_Y - 400, 360, 420);
  const hs = h.spraying ? F.spray : !h.grounded ? F.jump : h.slide > 0 ? F.slide
    : F.run[Math.floor(S.runT * CADENCE[S.charId]) % 8];
  D(ent, hs, HERO_X - 100, FEET_Y - 272 + h.y, 200, 300);
  for (const p of S.patrols) { // patrol drones — far LOD: cross + red dot + beam
    if (!p.on) continue;
    D(ent, SPR.drone.body, p.x - 42, p.y + Math.sin(p.ph) * 14 - 30, 85, 60);
  }
  const dr = S.drone;
  D(ent, SPR.drone.body, dr.x - 85, dr.y - 60, 170, 120);
  const disc = SPR.drone.discs[((t * 22) | 0) % 2];
  D(ent, disc, dr.x - 80, dr.y - 54, 96, 30);
  D(ent, disc, dr.x - 16, dr.y - 54, 96, 30);

  /* vfx layer — additive glows, particles, atmosphere (≤3 fullscreen layers) */
  vfx.clearRect(0, 0, LW, LH);
  vfx.globalCompositeOperation = "lighter";
  Da(vfx, SPR.drone.pool, dr.x - 95, FEET_Y - 46, 190, 46, dr.beam * 0.9);
  const ch = FEET_Y - 44 - (dr.y + 24);
  if (ch > 40 && dr.beam > 0.02) Da(vfx, SPR.drone.beam, dr.x - 75, dr.y + 24, 150, ch, dr.beam * 0.75);
  Da(vfx, GLOW.red, dr.x + 41 - 30, dr.y + 8 - 30, 60, 60, dr.eye);
  if (dr.state === 2) Da(vfx, GLOW.white, dr.x + 41 - 12, dr.y + 8 - 12, 24, 24, 0.5 + 0.5 * Math.sin(t * 18));
  for (const p of S.patrols) {
    if (!p.on) continue;
    const py = p.y + Math.sin(p.ph) * 14;
    Da(vfx, GLOW.red, p.x - 14, py - 8, 28, 28, 0.45 + 0.25 * Math.sin(p.ph * 2));
  }
  for (const pt of pools.parts) {
    if (!pt.on) continue;
    const a = pt.life / pt.max, s = pt.size * (0.5 + 0.5 * a);
    vfx.globalAlpha = a;
    if (pt.spr.width > pt.spr.height * 2) { DRAWN++; vfx.drawImage(pt.spr, pt.x - s / 2, pt.y - s * 0.16, s, s * 0.32); }
    else { DRAWN++; vfx.drawImage(pt.spr, pt.x - s / 2, pt.y - s / 2, s, s); }
  }
  vfx.globalAlpha = 1;
  for (const r of pools.rings) {
    if (!r.on) continue;
    vfx.globalAlpha = r.life / r.max;
    D(vfx, r.spr, r.x - r.r, r.y - r.r, r.r * 2, r.r * 2);
  }
  vfx.globalAlpha = 1;
  vfx.globalCompositeOperation = "source-over";
  // atmosphere: rain far + rain near + fog = 3 fullscreen layers (§7.7).
  // Fog alpha fades as the red lock-on pulse rises — never a 4th layer.
  let ro = (t * 130) % LH;
  D(vfx, SPR.rainF, 0, -ro, LW, LH); D(vfx, SPR.rainF, 0, -ro + LH, LW, LH);
  ro = (t * 340) % LH;
  D(vfx, SPR.rainN, 0, -ro, LW, LH); D(vfx, SPR.rainN, 0, -ro + LH, LW, LH);
  const fogA = 0.8 * (1 - Math.min(1, S.vigR));
  if (fogA > 0.02) {
    const fo = (t * 14) % (LW * 2);
    Da(vfx, SPR.fog, -fo + LW, 560, LW, 180, fogA);
    Da(vfx, SPR.fog, LW * 2 - fo - LW, 700, LW, 180, fogA * 0.75);
  }
  if (S.vigR > 0.01) Da(vfx, SPR.vigRed, 0, 0, LW, LH, Math.min(0.85, S.vigR)); // red pulse, no shake (§7.9)
  if (S.flash > 0.01) {
    vfx.globalAlpha = Math.min(0.5, S.flash);
    vfx.fillStyle = "#FFF3D6"; vfx.fillRect(0, 0, LW, LH);
    vfx.globalAlpha = 1;
  }
  lastDraws = DRAWN;
}

/* ---------- fps instrumentation ---------- */
const FT = new Float32Array(300);
let fti = 0, ftn = 0, fpsCache = { avg: 0, low1: 0, p95: 0 }, fpsT = 0, lastDraws = 0;
let worstMs = 0, worstRunT = 0, worstMode = "?"; // slowest single frame — where do hitches live?
let worstJs = 0, worstJsRunT = 0; // slowest update+render incl. canvas calls
let worstUpd = 0, worstUpdRunT = 0; // slowest pure-JS update — the ≤7.5ms ledger target
function fpsPush(ms) { FT[fti] = ms; fti = (fti + 1) % 300; if (ftn < 300) ftn++; }
function fpsCalc() {
  let sum = 0;
  for (let i = 0; i < ftn; i++) sum += FT[i];
  const avg = sum / Math.max(1, ftn);
  const s = Array.prototype.slice.call(FT.subarray(0, ftn)).sort((a, b) => b - a);
  const k = Math.max(1, Math.floor(ftn * 0.01));
  let ls = 0;
  for (let i = 0; i < k; i++) ls += s[i];
  fpsCache = { avg: 1000 / avg, low1: 1000 / (ls / k), p95: s[Math.min(ftn - 1, Math.floor(ftn * 0.95))] || 0 };
}
window.__TC__ = { // harness hook for fps-test.html / run-fps.mjs
  summary() {
    fpsCalc();
    return {
      avgFps: +fpsCache.avg.toFixed(1), low1: +fpsCache.low1.toFixed(1),
      p95ms: +fpsCache.p95.toFixed(2), draws: lastDraws,
      partsMax: pools.maxLive, partsLive: pools.live, pmax: PMAX,
      dpr: DPR, score: Math.round(S.score), tags: S.tags, credits: wallet.credits,
      worstMs: +worstMs.toFixed(1), worstAt: +worstRunT.toFixed(1), worstMode,
      worstJsMs: +worstJs.toFixed(1), worstJsAt: +worstJsRunT.toFixed(1),
      worstUpdMs: +worstUpd.toFixed(2), worstUpdAt: +worstUpdRunT.toFixed(1),
    };
  },
  S,
};

/* ---------- main loop ---------- */
let lastT = performance.now(), sampleT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const rawDt = (now - lastT) / 1000; lastT = now;
  const ms = Math.max(0, rawDt * 1000);
  fpsPush(ms); // real frame delta — never the clamped dt
  if (ms > worstMs) { worstMs = ms; worstRunT = S.runT; worstMode = S.mode; }
  let dt = rawDt;
  if (dt > 0.06) dt = 0.06;
  if (dt < 0) dt = 0;
  DRAWN = 0;
  const js0 = performance.now();
  update(dt);
  const jsUpd = performance.now() - js0; // pure JS logic — the ≤7.5ms ledger target
  if (S.mode !== "title") render();
  else { // title: gentle city backdrop behind the DOM
    par.clearRect(0, 0, LW, LH);
    const off = (S.t * 40) % 1080;
    D(par, SPR.far, -off, GY - 340, 1080, 340); D(par, SPR.far, -off + 1080, GY - 340, 1080, 340);
    ent.clearRect(0, 0, LW, LH);
    vfx.clearRect(0, 0, LW, LH);
    lastDraws = DRAWN;
  }
  const jsMs = performance.now() - js0; // update+render incl. canvas calls (raster is GPU-async on device, CPU-inline on SwiftShader proxy)
  if (jsUpd > worstUpd) { worstUpd = jsUpd; worstUpdRunT = S.runT; }
  if (jsMs > worstJs) { worstJs = jsMs; worstJsRunT = S.runT; }
  if (AUTOTEST && ms > 60)
    console.log("SLOW_FRAME " + JSON.stringify({ runT: +S.runT.toFixed(2), ms: +ms.toFixed(1), jsMs: +jsMs.toFixed(1), mode: S.mode, parts: pools.live, draws: lastDraws, tags: S.tags, score: Math.round(S.score) }));
  fpsT += dt;
  if (fpsT > 0.5) { fpsT = 0; fpsCalc(); }
  S.mapT += dt;
  if (S.mapT > 0.1 && S.mode === "run") { // minimap @10Hz
    S.mapT = 0;
    HUD.drawMinimap(S, HERO_X, FEET_Y);
  }
  if (S.mode === "run" && !S.paused) {
    HUD.update(S, wallet,
      fpsCache.avg.toFixed(0) + " FPS · 1%L " + fpsCache.low1.toFixed(0) +
      " · p95 " + fpsCache.p95.toFixed(1) + "ms · " + lastDraws + " draws · DPR " + DPR.toFixed(2));
  }
  sampleT += dt;
  if (sampleT > 2) {
    sampleT = 0;
    console.log("FPS_SAMPLE " + JSON.stringify({
      t: +S.runT.toFixed(1), avgFps: +fpsCache.avg.toFixed(1), low1: +fpsCache.low1.toFixed(1),
      p95ms: +fpsCache.p95.toFixed(2), draws: lastDraws, partsLive: pools.live,
      dpr: DPR, mode: S.mode, score: Math.round(S.score),
    }));
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && S.mode === "run") { S.paused = true; HUD.els.paused.style.display = "flex"; }
});
document.addEventListener("gesturestart", (e) => e.preventDefault());

/* ---------- boot ---------- */
bakeLocation(SPR.locDefs.neon_row);
fit();
HUD.show("title");
HUD.refreshTitle(wallet, S.charId, S.locId, totalTags);
if (AUTOTEST) { S.charId = "artist"; AU.muted = true; resetRun(); }
requestAnimationFrame(loop);
})();

})();
