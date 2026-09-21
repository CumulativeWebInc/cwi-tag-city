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
export const HERO_W = 200, HERO_H = 300, GROUND_Y = 272;

export const ROSTER = [
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

export function bakeFighter(spec, glow) {
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
