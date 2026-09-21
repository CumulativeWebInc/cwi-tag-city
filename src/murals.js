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
export function bakeTagWall(kind, loc, glow) {
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
