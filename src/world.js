/* TAG CITY — 4 locations (world config + location-flavored bakes).
   §9 cites: §4 (shared neon-noir city at street level in the alleys;
   art-deco neon sign language borrowed from signal-run location-1; rain +
   wet-street atmosphere from all four; location-4's cyan cable ribbons =
   rooftop/elevated set dressing ONLY; location-2 voxel-decay is KILLED —
   never a biome, never a backdrop; building language — dark slab towers,
   gold-trimmed deco frames, fire escapes, pink-lit storefronts; walls are
   canvas), §1 (background luminance ceiling #2A2A3A; gold earned-only).
   Every landmark below names its bible section (see LOCATIONS.md). */
export const LOCATIONS = [
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
export function locationById(id) {
  for (const l of LOCATIONS) if (l.id === id) return l;
  return LOCATIONS[0];
}
