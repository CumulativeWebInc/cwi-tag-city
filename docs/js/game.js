/* TAG CITY 3D — game core: state machine, rear chase camera, spray/tag loop,
   drone chase, Neon Credits economy, HUD glue, quality ladder. 3D-first.
   Economy + drone-behavior DESIGN carried from src/economy.js + src/droneAI.js. */
import * as THREE from "three";
import { PAL, ROSTER, EARN, WALLET_KEY, TUNE, DISTRICTS, QUALITY } from "./config.js";
import { World } from "./world.js";
import { Hero } from "./hero.js";
import { Drone } from "./drone.js";
import { ParticlePool } from "./particles.js";
import { makeInput } from "./input.js";
import { makeAudio } from "./audio.js";

const $ = (id) => document.getElementById(id);

/* ---------- wallet (design carried from src/economy.js) ---------- */
function createWallet() {
  return { v: 3, credits: 0, unlocked: { artist: true, prism: true, ghost: false, heir: false, pixel: false },
    featsPaid: {}, totals: { tags: 0, runs: 0, nearMisses: 0, evasions: 0 } };
}
function loadWallet() {
  try {
    const w = JSON.parse(localStorage.getItem(WALLET_KEY));
    if (w && w.v === 3 && typeof w.credits === "number") return Object.assign(createWallet(), w);
  } catch (e) {}
  return createWallet();
}
function saveWallet(w) { try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch (e) {} }

export async function boot() {
  const container = $("scene");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    $("glfail").style.display = "flex";
    throw e;
  }
  const isMobile = matchMedia("(pointer: coarse)").matches;
  let pixelCap = isMobile ? QUALITY.pixelCapMobile : QUALITY.pixelCap;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, pixelCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.bg);
  scene.fog = new THREE.Fog(PAL.bg, 34, 150);
  const camera = new THREE.PerspectiveCamera(TUNE.camFov, innerWidth / innerHeight, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0x1E3A52, 0x0A1018, 0.6));
  scene.add(new THREE.AmbientLight(0x1A2A3A, 0.22));
  // key neon wash so the hero reads against the dark
  const key = new THREE.DirectionalLight(0x8899FF, 0.5); key.position.set(-6, 12, 8); scene.add(key);
  // hero fill — warm wash from the camera side so the hooded figure,
  // gold crown emblem and magenta/cyan cans read clearly from the rear cam
  const heroFill = new THREE.DirectionalLight(0xFFF3D6, 0.55);
  heroFill.position.set(0, 7, 12); scene.add(heroFill);

  const logoTex = new THREE.TextureLoader().load("textures/cwi-logo.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; });
  const world = new World(scene, logoTex);
  const particles = new ParticlePool(scene, 700);
  const AU = makeAudio();
  const IN = makeInput({
    audioUnlock: () => AU.unlock(),
    doLane: (d) => { if (S.mode === "run") { hero.lane = Math.max(-1, Math.min(1, hero.lane + d)); } },
    doJump: () => { if (S.mode === "run" && hero.grounded) { hero.vy = TUNE.jumpV; hero.grounded = false; AU.jump(); } },
    doSlide: () => { if (S.mode === "run") { hero.slide = 0.55; } },
  });

  const wallet = loadWallet();
  let rosterIdx = 0;
  const hero = new Hero(scene, ROSTER[0]);
  const drone = new Drone(scene);

  const S = {
    mode: "menu", paused: false,
    speed: 0, distance: 0, runT: 0,
    tags: 0, combo: 0, bestCombo: 0, strikes: 0, credits: 0,
    sprayHeld: false, stumble: 0, mercy: 2,
    fpsEMA: 60, qStep: 0, qT: 0,
  };
  window.__S = S; // debug handle

  function unlockedDistricts() {
    const t = wallet.totals.tags;
    return DISTRICTS.filter(d => t >= d.unlock).map(d => d.id);
  }
  world.setUnlocked(unlockedDistricts());

  /* ---------- HUD ---------- */
  function hud() {
    $("hud-credits").textContent = (wallet.credits + S.credits).toLocaleString();
    $("hud-combo").textContent = S.combo > 1 ? `COMBO ×${S.combo}` : "";
    $("hud-tags").textContent = S.tags;
    const th = $("hud-threat");
    th.className = "threat t" + drone.state;
    th.textContent = drone.state === 2 ? "⚠ LOCK-ON" : drone.state === 1 ? "◉ SUSPICIOUS" : "○ PATROL";
    const di = Math.floor(S.distance / 500) % unlockedDistricts().length;
    const d = DISTRICTS.find(x => x.id === unlockedDistricts()[di]);
    $("hud-district").textContent = d ? d.name : "NEON ROW";
    $("hud-strikes").textContent = "●".repeat(S.strikes) + "○".repeat(Math.max(0, 3 - S.strikes));
  }
  function popup(text, css, big) {
    const el = document.createElement("div");
    el.className = "popup" + (big ? " big" : ""); el.textContent = text;
    el.style.color = css || "#fff";
    el.style.left = (42 + Math.random() * 16) + "%";
    $("popups").appendChild(el);
    setTimeout(() => el.remove(), 1400);
  }

  /* ---------- run control ---------- */
  function startRun() {
    Object.assign(S, { mode: "run", paused: false, speed: TUNE.speed, distance: 0, runT: 0,
      tags: 0, combo: 0, bestCombo: 0, strikes: 0, credits: 0, stumble: 0, mercy: 2 });
    hero.lane = 0; hero.x = 0; hero.y = 0; hero.vy = 0; hero.grounded = true;
    drone.state = 0; drone.lockT = 0; drone.mercy = 2;
    wallet.totals.runs++;
    $("menu").style.display = "none"; $("over").style.display = "none";
    $("hud").style.display = "block"; $("controls").style.display = "block";
    hud();
  }
  function endRun(busted) {
    S.mode = "over";
    const bonus = S.tags * EARN.runComplete;
    S.credits += bonus;
    wallet.credits += S.credits;
    wallet.totals.tags += S.tags;
    saveWallet(wallet);
    world.setUnlocked(unlockedDistricts());
    $("hud").style.display = "none"; $("controls").style.display = "none";
    $("over-title").textContent = busted ? "BUSTED" : "RUN COMPLETE";
    $("over-stats").innerHTML =
      `TAGS <b>${S.tags}</b> · BEST COMBO <b>×${S.bestCombo}</b><br>` +
      `CREDITS EARNED <b class="gold">+${S.credits.toLocaleString()}</b> (incl. +${bonus} run bonus)<br>` +
      `WALLET <b class="gold">${wallet.credits.toLocaleString()}</b> · LIFETIME TAGS <b>${wallet.totals.tags}</b>`;
    $("over").style.display = "flex";
    hud();
  }

  function addTag() {
    S.tags++; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo);
    const gain = EARN.tag + (S.combo >= 15 ? EARN.combo15 : S.combo >= 10 ? EARN.combo10 : S.combo >= 5 ? EARN.combo5 : 0);
    S.credits += gain;
    popup(`CLEAN TAG +${gain}`, PAL.goldCss, true); AU.tag(); AU.coin();
    hud();
  }

  /* ---------- spray / tag walls ---------- */
  function nearestWall() {
    let best = null, bd = 1e9;
    for (const w of world.tagWalls) {
      if (w.done) continue;
      const dz = w.worldZ; // wall z in world (hero at 0, ahead is -Z)
      if (dz < -TUNE.sprayRange || dz > 2.5) continue;
      const needLane = w.side < 0 ? -1 : 1;
      if (hero.lane !== needLane) continue;
      const d = Math.abs(dz);
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  function sprayTick(dt) {
    const wall = nearestWall();
    const want = IN.sprayHeld && wall && S.mode === "run";
    hero.spraying = !!want;
    AU.spray(!!want);
    if (!want) return;
    world.paintWall(wall, dt, 1, 1);
    // streams from both cans — magenta LEFT, cyan RIGHT — arcing to the wall
    for (const side of [-1, 1]) {
      const tip = hero.canTip(side);
      const tx = wall.worldX, ty = 2.4, tz = wall.worldZ;
      const n = 3;
      for (let i = 0; i < n; i++) {
        const t = 0.25 + Math.random() * 0.2; // seconds to target
        particles.spawn(tip.x, tip.y, tip.z,
          (tx - tip.x) / t + (Math.random() - 0.5), (ty - tip.y) / t + Math.random() * 2, (tz - tip.z) / t,
          t, 1, side < 0 ? PAL.mag : PAL.cyan, 2);
      }
    }
    if (wall.done && !wall.painted) {
      wall.painted = true;
      particles.burst(wall.worldX, 2.6, wall.worldZ, 40, PAL.gold, 5, 0.9, 1.2, 3);
      particles.burst(wall.worldX, 2.6, wall.worldZ, 30, PAL.mag, 4, 0.7, 1, 2);
      addTag();
    }
  }

  /* ---------- main loop ---------- */
  const clock = new THREE.Clock();
  let fpsShow = new URLSearchParams(location.search).get("fps") === "1";

  function frame() {
    requestAnimationFrame(frame);
    let dt = Math.min(clock.getDelta(), 0.05);
    // fps meter + quality ladder
    S.fpsEMA += ((1 / Math.max(dt, 1e-4)) - S.fpsEMA) * 0.05;
    S.qT += dt;
    if (S.qT > 3) {
      S.qT = 0;
      if (S.fpsEMA < 45 && S.qStep < 2) { S.qStep++; applyQuality(); }
      else if (S.fpsEMA > 57 && S.qStep > 0) { S.qStep--; applyQuality(); }
    }
    if (fpsShow) $("fps").textContent = `${S.fpsEMA.toFixed(0)} fps · q${S.qStep}`;

    if (S.mode === "run" && !S.paused) {
      S.runT += dt;
      if (S.mercy > 0) S.mercy -= dt;
      // speed: dash burst / stumble slow / spray slow
      let spd = TUNE.speed;
      if (hero.dash > 0) { hero.dash -= dt; spd = TUNE.dashSpeed; }
      if (S.stumble > 0) { S.stumble -= dt; spd *= 0.55; }
      if (hero.spraying) spd = Math.min(spd, 6);
      S.speed += (spd - S.speed) * Math.min(1, dt * 4);
      S.distance += S.speed * dt;
      if (hero.dashCd > 0) hero.dashCd -= dt;
      if (hero.slide > 0) hero.slide -= dt;
      // hero physics
      if (!hero.grounded) {
        hero.vy -= TUNE.gravity * dt; hero.y += hero.vy * dt;
        if (hero.y <= 0) { hero.y = 0; hero.vy = 0; hero.grounded = true; }
      }
      hero.update(dt, S.speed);
      // drone
      const dr = drone.update(dt, hero, S.tags, S.speed);
      if (dr.justLost) popup("ESCAPED", "#F4F6FF");
      const hit = drone.tryStrike(hero);
      if (hit === "strike") {
        S.strikes++; S.combo = 0; S.stumble = 0.9;
        popup("HIT!", PAL.redCss, true); AU.strike();
        particles.burst(hero.x, 1.6, 0, 34, PAL.red, 5, 0.6, 1.2, 3);
        if (S.strikes >= 3) { endRun(true); }
      } else if (hit === "nearmiss") {
        S.credits += EARN.nearMiss; wallet.totals.nearMisses++;
        popup(`NEAR MISS +${EARN.nearMiss}`, "#F4F6FF"); AU.coin();
        particles.burst(hero.x, 1.8, -1, 16, 0xF4F6FF, 3, 0.5, 1, 2);
      }
      if (dr.state === 2 && !S.alertPlayed) { AU.alert(); S.alertPlayed = true; }
      if (dr.state !== 2) S.alertPlayed = false;
      sprayTick(dt);
      world.update(dt, S.speed);
      hud();
    } else if (S.mode === "menu") {
      // idle attract: slow drift so the city breathes behind the menu
      world.update(dt * 0.25, 3);
      hero.update(dt, 3);
      drone.update(dt, hero, 0, 3);
    }
    particles.update(dt);
    // rear chase camera — recomputed from scratch every frame. No persistent
    // orientation state (no damped vectors, no incremental rotations), so
    // pitch/roll can never accumulate: position = hero + rear offset,
    // lookAt = fixed point ahead at hero height, up = +Y always.
    camera.up.set(0, 1, 0);
    camera.position.set(hero.x * TUNE.camXFollow, TUNE.camY + hero.y * 0.35, TUNE.camZ);
    camera.lookAt(hero.x * 0.7, TUNE.camLookY, TUNE.camLookZ);
    renderer.render(scene, camera);
  }

  function applyQuality() {
    const pr = [pixelCap, Math.min(pixelCap, 1.0), 0.85][S.qStep];
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, pr));
    world.setRainDensity([1, 0.6, 0.35][S.qStep]);
    particles.setBudget([700, 420, 220][S.qStep]);
  }

  /* ---------- UI wiring ---------- */
  function buildRoster() {
    const el = $("roster"); el.innerHTML = "";
    ROSTER.forEach((r, i) => {
      const unlocked = wallet.unlocked[r.id];
      const b = document.createElement("button");
      b.className = "roster-btn" + (i === rosterIdx ? " sel" : "") + (unlocked ? "" : " locked");
      b.innerHTML = `<span class="swatch" style="background:#${r.hoodie.toString(16).padStart(6, "0")};border-color:#${r.trim.toString(16).padStart(6, "0")}"></span>${r.name}${unlocked ? "" : ` · ${r.price.toLocaleString()}◉`}`;
      b.onclick = () => {
        if (wallet.unlocked[r.id]) { rosterIdx = i; hero.setScheme(r); buildRoster(); AU.coin(); }
        else if (wallet.credits >= r.price) {
          wallet.credits -= r.price; wallet.unlocked[r.id] = true; saveWallet(wallet);
          rosterIdx = i; hero.setScheme(r); buildRoster(); popup(`${r.name} UNLOCKED`, PAL.goldCss, true); AU.tag();
        } else popup(`NEED ${(r.price - wallet.credits).toLocaleString()} MORE ◉`, PAL.redCss);
      };
      el.appendChild(b);
    });
  }
  buildRoster();
  $("btn-run").onclick = () => { AU.unlock(); startRun(); };
  $("btn-again").onclick = () => { startRun(); };
  $("btn-pause").onclick = () => {
    if (S.mode !== "run") return;
    S.paused = !S.paused;
    $("btn-pause").textContent = S.paused ? "▶" : "II";
    AU.spray(false);
  };
  $("btn-spray").addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); IN.setSpray(true, $("btn-spray")); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
    $("btn-spray").addEventListener(ev, (e) => { e.stopPropagation(); IN.setSpray(false, $("btn-spray")); }));
  $("btn-dash").addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (S.mode === "run" && hero.dashCd <= 0 && hero.dash <= 0) {
      hero.dash = TUNE.dashTime; hero.dashCd = TUNE.dashCd; AU.dash();
      particles.burst(hero.x, 1.2, 0.6, 22, PAL.cyan, 6, 0.4, 1.1, 1);
    }
  });
  IN.joyEl = $("joy"); IN.joyKnob = $("joy-knob");
  IN.attach($("touchzone"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && S.mode === "run" && !S.paused) $("btn-pause").click();
  });
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  $("wallet-line").textContent = `◉ ${wallet.credits.toLocaleString()} · ${wallet.totals.tags} lifetime tags`;
  frame();
}
