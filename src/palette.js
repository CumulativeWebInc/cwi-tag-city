/* TAG CITY art-bible v1.0 — §1 PALETTE (locked hexes). §9: this module cites §1.
   Rule 3: gold is earned, not decor (§1-A: hero gold vents/zippers + HEIR
   bronze are the only identity exceptions). Rule 4: red is threat-only. */
export const PAL = {
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
export const PAL_LOCKED = [
  ["cyan","#00E5FF"],["cyanDeep","#0E5F73"],
  ["mag","#FF2FB3"],["magDeep","#8A2360"],
  ["gold","#FFD166"],["goldDeep","#8A5F1C"],
  ["red","#FF3B4E"],["redDeep","#7A1620"],
  ["void","#0A0A12"],["panel","#12121E"],["asphalt","#23232E"],
  ["bone","#EEF0FF"],["dim","#9AA0C3"],["paintWhite","#F5F7FA"],
  ["goldWhite","#FFF3D6"],
];
