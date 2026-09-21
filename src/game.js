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
