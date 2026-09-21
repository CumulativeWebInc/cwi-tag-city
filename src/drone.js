/* TAG CITY — Sentinel-7 surveillance drone bake (bake-time only).
   §9 cites: §3 (quad-rotor gunmetal body #23232E, faceted plates, antenna
   fins, 4 rotor blur discs pre-rendered — never animated blades; glow ONLY
   from red scan eye + searchlight cone + tiny cyan fin-tip accents; body
   matte; beam pool = hard-edged ellipse; far LOD = dark cross + red eye dot
   + optional beam — never less), §1 rule 4 (red is threat-only).
   Concat order provides: PAL, TAU, mulberry32, mkc (globals). */
export function bakeDrone() {
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
