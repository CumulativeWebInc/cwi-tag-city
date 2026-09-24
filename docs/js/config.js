/* TAG CITY 3D — config: palette (art-bible §§1,4), tuning, roster schemes.
   3D-first from zero. Palette carries the neon-noir bible: background luminance
   ceiling #2A2A3A; gold is earned-only (§1 rule 3); red is threat-only (§1 rule 4). */
export const PAL = {
  mag: 0xFF2FB3, magCss: "#FF2FB3",
  cyan: 0x00E5FF, cyanCss: "#00E5FF",
  gold: 0xFFC93C, goldCss: "#FFC93C",
  goldWhite: 0xFFF3D6, goldWhiteCss: "#FFF3D6",
  red: 0xFF3B4E, redCss: "#FF3B4E",
  paintWhite: 0xF4F6FF, paintWhiteCss: "#F4F6FF",
  bg: 0x0A0A12, bgCss: "#0A0A12",
  ceil: 0x2A2A3A, ceilCss: "#2A2A3A",       // §1: background luminance ceiling
  wallBase: 0x15151F, wallBaseCss: "#15151F",
  groundBase: 0x23232E, groundBaseCss: "#23232E",
  tower: 0x111118, towerCss: "#111118",
  gunmetal: 0x23232E,
  pink: 0xFF7AD9, pinkCss: "#FF7AD9",       // pink-lit storefronts
};

/* Black's six signs — §4 location-1 sign language + TAG CITY marquee. */
export const SIGNS = [
  { text: "NO EXIT",   color: "mag",  css: PAL.magCss },
  { text: "OPEN 24H",  color: "cyan", css: PAL.cyanCss },
  { text: "UPTOWN \u2192", color: "goldw", css: PAL.goldWhiteCss },
  { text: "SHOWTIME",  color: "mag",  css: PAL.magCss },
  { text: "TAG CITY",  color: "cyan", css: PAL.cyanCss },
  { text: "STAY WILD", color: "mag",  css: PAL.magCss },
];

/* Mural words carried from the 2D design (src/world.js LOCATIONS). */
export const MURAL_WORDS = ["STAY WILD", "RUN", "ENCORE"];

/* Roster → 3D hoodie schemes (design carried from src/roster.js). */
export const ROSTER = [
  { id: "artist", name: "THE ARTIST", hoodie: 0x1B1B24, trim: 0x00E5FF, price: 0 },
  { id: "prism",  name: "PRISM",      hoodie: 0xE8ECF4, trim: 0xFF2FB3, price: 0 },
  { id: "ghost",  name: "GHOST",      hoodie: 0x9AA0B4, trim: 0xF4F6FF, price: 2500 },
  { id: "heir",   name: "HEIR",       hoodie: 0x14141C, trim: 0xFFC93C, price: 6000 },
  { id: "pixel",  name: "PIXEL",      hoodie: 0x101018, trim: 0xFF2FB3, price: 12000 },
];

/* Neon Credits economy — earn table carried from src/economy.js (design). */
export const EARN = { tag: 150, nearMiss: 60, runComplete: 50, combo5: 200, combo10: 500, combo15: 1000 };
export const WALLET_KEY = "tagcity3d_wallet_v1";

/* Runner tuning. */
export const TUNE = {
  lanes: [-2.4, 0, 2.4],
  speed: 12, dashSpeed: 23, dashTime: 0.25, dashCd: 2.6,
  gravity: 30, jumpV: 10.5,
  segLen: 40, segCount: 7,
  sprayRange: 7.5, tagTime: 1.25,
  px2m: 1 / 18,               // 2D design units → meters (drone AI thresholds)
  camFov: 62, camY: 4.6, camZ: 8.4, camLookY: 1.5, camLookZ: -8, camXFollow: 0.55,
};

/* Districts — unlock thresholds carried from docs/LOCATIONS.md (design). */
export const DISTRICTS = [
  { id: "neon_row", name: "NEON ROW",        unlock: 0,  seed: 101 },
  { id: "alleys",   name: "THE ALLEYS",      unlock: 15, seed: 202 },
  { id: "elevated", name: "ELEVATED",        unlock: 40, seed: 303 },
  { id: "murals",   name: "THE MURALS DISTRICT", unlock: 80, seed: 404 },
];

/* Quality ladder — auto-degrade on sustained low fps (mobile GPU budget). */
export const QUALITY = {
  pixelCap: 1.5, pixelCapMobile: 1.25,
  rainFull: 700, rainLow: 320,
  sprayFull: 90, sprayLow: 40,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
