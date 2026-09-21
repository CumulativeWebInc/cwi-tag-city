/* TAG CITY — bake-time environment sprites (all baked, never per-frame).
   §9 cites: §4 (city language — alley-sector streets, 3-layer parallax,
   faked reflections @18–25% alpha, baked rain/fog/mist, background luminance
   ceiling #2A2A3A), §7.1 (glow baked, never shadowBlur), §7.2 (gradients at
   bake time only), §7.4 (no per-frame blur/filter), §7.5 (no render-target
   reflections), §7.6 (no per-frame noise), §7.7 (≤3 fullscreen transparent
   layers — vignette is BAKED INTO the static sky; fog alpha fades to 0 under
   the red lock-on pulse so the transient alert never stacks a 4th layer).
   Concat order provides: PAL, TAU, clamp, lerp, mulberry32 (globals). */
export function mkc(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/* Pre-rendered radial glow sprite — §7.1: glow is baked, never shadowBlur. */
export function glowSprite(color, core) {
  const s = 128, c = mkc(s, s), g = c.getContext("2d");
  const gr = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  gr.addColorStop(0, core || PAL.paintWhite); // hot core — never pure white (§1)
  gr.addColorStop(0.25, color);
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return c;
}
export function initGlow() {
  return {
    cyan: glowSprite(PAL.cyan), mag: glowSprite(PAL.mag),
    gold: glowSprite(PAL.gold), red: glowSprite(PAL.red),
    white: glowSprite(PAL.paintWhite),
    soft: glowSprite("rgba(120,140,200,0.55)", "rgba(200,210,230,0.8)"),
  };
}
export function streakSprite(color) {
  const c = mkc(28, 8), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 28, 0);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, color); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 2, 28, 4);
  return c;
}
export function ringSprite(color) {
  const c = mkc(128, 128), g = c.getContext("2d");
  g.drawImage(glowSprite(color), 14, 14, 100, 100);
  g.strokeStyle = color; g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 44, 0, TAU); g.stroke();
  return c;
}
/* Sky — static layer. Vignette baked in here (§7.7 compliance: the vignette
   costs zero per-frame layers because it never moves). */
export function bakeSky(LW, LH) {
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
export function bakeVigRed(LW, LH) {
  const c = mkc(LW, LH), g = c.getContext("2d");
  const vg = g.createRadialGradient(LW / 2, LH / 2, LH * 0.30, LW / 2, LH / 2, LH * 0.72);
  vg.addColorStop(0, "rgba(255,59,78,0)");
  vg.addColorStop(0.75, "rgba(255,59,78,0.10)");
  vg.addColorStop(1, "rgba(255,59,78,0.42)");
  g.fillStyle = vg; g.fillRect(0, 0, LW, LH);
  return c;
}
export function bakeFar() { // parallax layer 1 — near-black silhouettes
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
export function bakeMid(loc) { // parallax layer 2 — towers + lit windows
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
export function bakeWallTile(v, loc) {
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
export function bakeGround(loc) { // rain-slick street — reflections are FAKED (§7.5)
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
export function bakePuddle() { // pre-baked puddle w/ fixed neon smears
  const c = mkc(190, 52), g = c.getContext("2d"), R = mulberry32(55);
  g.fillStyle = "rgba(10,12,24,0.85)";
  g.beginPath(); g.ellipse(95, 26, 90, 22, 0, 0, TAU); g.fill();
  g.globalAlpha = 0.25;
  g.fillStyle = PAL.cyan; g.fillRect(30 + R() * 40, 8, 14, 36);
  g.fillStyle = PAL.mag; g.fillRect(100 + R() * 40, 12, 12, 30);
  g.globalAlpha = 1;
  return c;
}
export function bakeRain(near) { // baked rain strips — wrap-scrolled, never procedural
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
export function bakeFog() { // baked fog band — drifts slowly, never per-frame noise
  const W = 540, H = 180, c = mkc(W, H), g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "rgba(90,110,150,0)");
  gr.addColorStop(0.5, "rgba(90,110,150,0.16)");
  gr.addColorStop(1, "rgba(90,110,150,0)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}
export function bakeHeroSpot() { // streetlight pool behind the hero — silhouette separation
  const c = mkc(360, 420), g = c.getContext("2d");
  const gr = g.createRadialGradient(180, 210, 20, 180, 210, 200);
  gr.addColorStop(0, "rgba(255,243,214,0.14)");
  gr.addColorStop(0.6, "rgba(255,243,214,0.05)");
  gr.addColorStop(1, "rgba(255,243,214,0)");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(180, 210, 175, 205, 0, 0, TAU); g.fill();
  return c;
}
