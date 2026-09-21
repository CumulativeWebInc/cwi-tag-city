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
export function bakeSign(text, color, w, glow) {
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
export function bakeDumpster() {
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
export function bakeBarrier() {
  const c = mkc(110, 96), g = c.getContext("2d");
  g.fillStyle = "#23232E"; rr(g, 8, 10, 94, 60, 6); g.fill();
  g.fillStyle = PAL.mag; g.globalAlpha = 0.75;
  for (let i = 0; i < 3; i++) g.fillRect(16 + i * 30, 10, 14, 60);
  g.globalAlpha = 1;
  g.fillStyle = "#14141A"; g.fillRect(18, 70, 12, 26); g.fillRect(80, 70, 12, 26);
  return c;
}
export function bakeLowPipe() { // slide-under pipe
  const c = mkc(220, 64), g = c.getContext("2d");
  g.fillStyle = "#1B1B24"; rr(g, 0, 8, 220, 48, 20); g.fill();
  g.fillStyle = "#2E2E3E"; rr(g, 0, 8, 220, 12, 6); g.fill();
  g.fillStyle = PAL.cyan; g.globalAlpha = 0.35; g.fillRect(30, 56, 160, 3); g.globalAlpha = 1;
  g.fillStyle = "#0B0B10"; g.fillRect(96, 56, 10, 8); g.fillRect(150, 56, 10, 8);
  return c;
}
export function bakePaintPickup() { // cyan bucket icon — refill event (§6)
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
export function bakeButtonRing(color, label) {
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
export function bakeLogo() {
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
export function bakeAlertBanner() {
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
export function bakeComboBadge() {
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
export function bakeMinimap() {
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
export function bakePaintFill() {
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
export function bakeTargetFrame() {
  const c = mkc(320, 580), g = c.getContext("2d");
  g.strokeStyle = PAL.gold; g.lineWidth = 5; g.setLineDash([18, 12]);
  g.globalAlpha = 0.85;
  rr(g, 8, 8, 304, 564, 14); g.stroke();
  g.setLineDash([]); g.globalAlpha = 1;
  return c;
}
